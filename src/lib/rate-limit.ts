/**
 * Rate limiter centralizado.
 *
 * En desarrollo y ambientes sin Redis usa un Map en memoria (una sola instancia).
 * En producción con múltiples instancias serverless esto NO es compartido entre instancias.
 *
 * Para producción real con Vercel: activar Vercel KV en el dashboard y descomentar
 * la implementación con @vercel/kv de abajo. No requiere cambios en los llamadores.
 *
 * Alternativa: Upstash Redis con @upstash/ratelimit.
 */

type RateLimitEntry = { count: number; resetAt: number };
const store = new Map<string, RateLimitEntry>();

// Limpieza periódica para evitar memory leak en runtimes de larga vida (dev/contenedor)
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * @param key     Identificador único (userId, IP, etc.)
 * @param limit   Máximo de requests permitidos en la ventana
 * @param windowMs Tamaño de la ventana en milisegundos
 * @returns true si la request está dentro del límite, false si debe bloquearse
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/* ── Implementación con Vercel KV (descomentar cuando esté disponible) ──────────
import { kv } from "@vercel/kv";

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redisKey = `rl:${key}`;
  const count = await kv.incr(redisKey);
  if (count === 1) await kv.pexpire(redisKey, windowMs);
  return count <= limit;
}
── ──────────────────────────────────────────────────────────────────────────── */
