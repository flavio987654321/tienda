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
