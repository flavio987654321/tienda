import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) throw new Error("Redis no configurado (KV_REST_API_URL / KV_REST_API_TOKEN)");
    redis = new Redis({ url, token });
  }
  return redis;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  return (await contarConTope(key, limit, windowMs)).permitido;
}

/**
 * Igual que `checkRateLimit`, pero además devuelve en cuánto va el contador.
 *
 * La cuenta hace falta cuando el tope protege algo que se paga: un tope que
 * sólo dice sí o no se entera de que estaba corto el día que ya cortó, y ahí
 * el que se quedó afuera es un cliente. Con la cuenta se puede avisar ANTES,
 * cuando todavía se está a tiempo de subirlo.
 */
export async function contarConTope(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ permitido: boolean; cuenta: number }> {
  const r = getRedis();
  const redisKey = `rl:${key}`;
  const cuenta = await r.incr(redisKey);
  if (cuenta === 1) await r.pexpire(redisKey, windowMs);
  return { permitido: cuenta <= limit, cuenta };
}

/* ── Respaldo en memoria, para cuando Redis no contesta ────────────────────── */

/**
 * Contadores locales de ESTA instancia. Se pierden cuando la función se recicla,
 * y cada instancia tiene los suyos — por eso no reemplazan a Redis: sirven sólo
 * para que una caída del limitador no deje el endpoint sin ningún techo.
 */
const contadoresLocales = new Map<string, { cuenta: number; venceEn: number }>();

/** Cuántas claves distintas guardamos como mucho. Es un techo de memoria, no de uso. */
const MAX_CLAVES_LOCALES = 5_000;

function contarLocal(clave: string, limite: number, windowMs: number, ahora: number): boolean {
  const actual = contadoresLocales.get(clave);
  if (actual === undefined || actual.venceEn <= ahora) {
    contadoresLocales.set(clave, { cuenta: 1, venceEn: ahora + windowMs });
    return 1 <= limite;
  }
  actual.cuenta += 1;
  return actual.cuenta <= limite;
}

function limpiarVencidos(ahora: number): void {
  for (const [clave, v] of contadoresLocales) {
    if (v.venceEn <= ahora) contadoresLocales.delete(clave);
  }
  // Si igual quedó enorme (muchas claves vivas a la vez), se tira lo más viejo.
  // Perder un contador es dejar pasar algún pedido de más; no acotar la memoria
  // es tumbar la instancia, que es peor.
  if (contadoresLocales.size > MAX_CLAVES_LOCALES) {
    const sobran = contadoresLocales.size - MAX_CLAVES_LOCALES;
    let i = 0;
    for (const clave of contadoresLocales.keys()) {
      if (i++ >= sobran) break;
      contadoresLocales.delete(clave);
    }
  }
}

export type ResultadoLimite = {
  permitido: boolean;
  /** true si contestó Redis; false si se usó el respaldo local. */
  conRedis: boolean;
};

/**
 * Rate limit que NO se apaga cuando Redis se cae.
 *
 * El caso que resuelve: si `checkRateLimit` tira y el llamador devuelve `true`
 * ("dejamos pasar, es un instante"), el endpoint queda sin ningún techo justo
 * cuando más lo necesita. Upstash corta por cuota de comandos, así que se cae
 * bajo carga — exactamente cuando alguien está abusando.
 *
 * El respaldo es doble a propósito:
 *
 * 1. `limiteFallback` por clave (por usuario). Corta al de siempre.
 * 2. `limiteFallbackGlobal` para TODA la instancia. Es el que importa: un
 *    contador por usuario no frena a quien dispara en paralelo, porque cada
 *    instancia nueva arranca con los contadores en cero. Con un tope por
 *    instancia, el único multiplicador que le queda al atacante es cuántas
 *    instancias logre levantar.
 *
 * No es tan bueno como Redis y no pretende serlo: el objetivo es que el techo
 * pase de infinito a acotado sin apagar la función para todo el mundo.
 */
export async function checkRateLimitConRespaldo(
  key: string,
  limit: number,
  windowMs: number,
  opciones: { limiteFallback: number; limiteFallbackGlobal: number; ventanaFallbackMs?: number }
): Promise<ResultadoLimite> {
  try {
    return { permitido: await checkRateLimit(key, limit, windowMs), conRedis: true };
  } catch (err) {
    const ahora = Date.now();
    const ventana = opciones.ventanaFallbackMs ?? windowMs;
    limpiarVencidos(ahora);

    // El global se evalúa PRIMERO y siempre, incluso si el de la clave ya dijo
    // que no: si no contara los rechazados, un solo usuario bloqueado dejaría el
    // presupuesto de la instancia intacto para el resto del ataque.
    const globalOk = contarLocal("__global__", opciones.limiteFallbackGlobal, ventana, ahora);
    const claveOk = contarLocal(`k:${key}`, opciones.limiteFallback, ventana, ahora);

    console.error("[rate-limit] Redis no contesta, usando respaldo local", {
      key,
      globalOk,
      claveOk,
      error: err instanceof Error ? err.message : String(err),
    });

    return { permitido: globalOk && claveOk, conRedis: false };
  }
}

/** Sólo para los chequeos. Deja los contadores locales en cero. */
export function _resetContadoresLocales(): void {
  contadoresLocales.clear();
}

/**
 * Contador de intentos FALLIDOS, separado de checkRateLimit.
 *
 * La diferencia importa: checkRateLimit suma en cada llamada, sirvió o no. Para
 * un código de seguridad hace falta lo contrario — que acertar no gaste intentos
 * y que sea el error el que acerca al bloqueo.
 *
 * La clave la elige el llamador, y ahí está lo esencial: si se arma con el id de
 * la CUENTA (y no con la sesión), cerrar sesión y volver a entrar no reinicia
 * nada. Un contador por sesión no sirve contra quien ya tiene la contraseña:
 * saldría y entraría para conseguir intentos nuevos indefinidamente.
 */
export async function countFailures(key: string): Promise<number> {
  const r = getRedis();
  return (await r.get<number>(`fail:${key}`)) ?? 0;
}

/** Suma un fallo y devuelve el total. La ventana arranca con el primero. */
export async function recordFailure(key: string, windowMs: number): Promise<number> {
  const r = getRedis();
  const redisKey = `fail:${key}`;
  const count = await r.incr(redisKey);
  if (count === 1) await r.pexpire(redisKey, windowMs);
  return count;
}

/** Segundos que faltan para que se libere. 0 si ya no hay bloqueo. */
export async function failureCooldown(key: string): Promise<number> {
  const r = getRedis();
  const ttl = await r.pttl(`fail:${key}`);
  return ttl > 0 ? Math.ceil(ttl / 1000) : 0;
}

/** Borra el contador. Se llama al acertar: un acierto limpia la cuenta. */
export async function clearFailures(key: string): Promise<void> {
  const r = getRedis();
  await r.del(`fail:${key}`);
}
