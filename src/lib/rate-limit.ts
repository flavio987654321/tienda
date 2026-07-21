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
  const r = getRedis();
  const redisKey = `rl:${key}`;
  const count = await r.incr(redisKey);
  if (count === 1) await r.pexpire(redisKey, windowMs);
  return count <= limit;
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
