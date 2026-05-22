/**
 * Rate limiter centralizado.
 *
 * ADVERTENCIA: La implementación en memoria NO funciona correctamente en Vercel
 * porque cada instancia serverless tiene su propio Map independiente.
 *
 * PARA ACTIVAR EL RATE LIMIT REAL EN PRODUCCIÓN:
 * 1. Instalar: npm install @vercel/kv
 * 2. Activar Vercel KV en el dashboard de Vercel y vincular al proyecto
 * 3. Reemplazar la exportación de abajo por la implementación KV comentada
 *
 * Alternativa con Upstash: npm install @upstash/ratelimit @upstash/redis
 */

// ── Implementación en memoria (solo válida en dev / instancia única) ────────────

type RateLimitEntry = { count: number; resetAt: number };
const store = new Map<string, RateLimitEntry>();

let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

function checkRateLimitInMemory(key: string, limit: number, windowMs: number): boolean {
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

// En producción con múltiples instancias, loguear advertencia una sola vez
let warnedAboutMemoryLimiter = false;

/**
 * @param key     Identificador único (userId, IP, etc.)
 * @param limit   Máximo de requests permitidos en la ventana
 * @param windowMs Tamaño de la ventana en milisegundos
 * @returns true si la request está dentro del límite, false si debe bloquearse
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  if (process.env.NODE_ENV === "production" && !warnedAboutMemoryLimiter) {
    console.warn(
      "[rate-limit] ADVERTENCIA: usando rate limiter en memoria. " +
      "No es efectivo en Vercel multi-instancia. Configurar @vercel/kv."
    );
    warnedAboutMemoryLimiter = true;
  }
  return checkRateLimitInMemory(key, limit, windowMs);
}

// ── Implementación con Vercel KV — reemplazar la exportación de arriba ─────────
// Instalar: npm install @vercel/kv  +  activar KV en dashboard de Vercel
//
// import { kv } from "@vercel/kv";
//
// export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
//   const redisKey = `rl:${key}`;
//   const count = await kv.incr(redisKey);
//   if (count === 1) await kv.pexpire(redisKey, windowMs);
//   return count <= limit;
// }
// ────────────────────────────────────────────────────────────────────────────────
