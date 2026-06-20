/**
 * Rate limiter centralizado, respaldado por Upstash Redis (ver KV_REST_API_URL / KV_REST_API_TOKEN).
 * Funciona de forma consistente entre instancias serverless de Vercel.
 *
 * @param key      Identificador único (userId, IP, etc.)
 * @param limit    Máximo de requests permitidos en la ventana
 * @param windowMs Tamaño de la ventana en milisegundos
 * @returns true si la request está dentro del límite, false si debe bloquearse
 */
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redisKey = `rl:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.pexpire(redisKey, windowMs);
  return count <= limit;
}
