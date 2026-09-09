import { Redis } from "@upstash/redis";

/**
 * Un guardarropas de respuestas ajenas, para no volver a pedir lo mismo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PARA QUÉ EXISTE: EL TOPE DEL BANCO DE IMÁGENES ES DE TODOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La clave de Pexels es UNA para toda la plataforma, y su tope —200 pedidos por
 * hora— se reparte entre todas las cuentas. Con diez personas eligiendo fotos al
 * mismo tiempo, treinta búsquedas cada una, se llega al techo en una hora y el
 * resto se queda sin fotos.
 *
 * Y la mayoría de esos pedidos son **el mismo**: la misma frase devuelve
 * siempre la misma lista, alguien la busca tres veces mientras compara, y el
 * armado la vuelve a buscar en cada PDF que se rehace. Guardando la respuesta un
 * día, todo eso cuesta un pedido en vez de veinte.
 *
 * ── ⚠️ Nada de esto puede romper nada ──────────────────────────────────────
 *
 * Si Redis no está configurado, o está caído, o contesta cualquier cosa: se
 * devuelve `null` y quien llama sale a pedirlo como siempre. Un guardarropas
 * que se cae no puede llevarse puesta la función que estaba adentro.
 *
 * Por eso todo está en `try`, y por eso guardar no se espera: que la respuesta
 * llegue tarde al guardarropas no le importa a nadie.
 */

let redis: Redis | null = null;
let intentado = false;

function conseguirRedis(): Redis | null {
  if (intentado) return redis;
  intentado = true;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    redis = new Redis({ url, token });
  } catch {
    redis = null;
  }
  return redis;
}

/** Lo guardado, o `null` si no está, si venció o si el guardarropas no anda. */
export async function leerDelCache<T>(clave: string): Promise<T | null> {
  const r = conseguirRedis();
  if (!r) return null;
  try {
    return (await r.get<T>(clave)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Guardar, con vencimiento.
 *
 * ⚠️ No devuelve nada y no se espera: quien llama ya tiene su respuesta y no
 * tiene por qué esperar a que se guarde una copia.
 */
export function guardarEnCache(clave: string, valor: unknown, segundos: number): void {
  const r = conseguirRedis();
  if (!r) return;
  void r.set(clave, valor, { ex: segundos }).catch(() => {
    /* Que no se pueda guardar no es un error de nadie: la próxima se vuelve a
       pedir, que es exactamente lo que pasaba antes de que esto existiera. */
  });
}

/** Sólo para las pruebas: olvidarse de la conexión. */
export function _olvidarRedis(): void {
  redis = null;
  intentado = false;
}
