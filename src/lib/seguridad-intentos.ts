import { recordFailure, failureCooldown, clearFailures } from "@/lib/rate-limit";

/**
 * El tope de intentos del segundo paso: 5 errados y 15 minutos de espera. Va
 * atado a la CUENTA y no a la sesión ni a la IP, igual que el 2FA del admin
 * (ver `api/verificar-2fa`): quien tiene la contraseña podría cerrar sesión y
 * volver a entrar para conseguir intentos nuevos. Lo comparten el código de la
 * app y los códigos de respaldo, para que no sean dos bolsas de 5.
 *
 * Si Redis no contesta se sigue sin contador (con un log): quedarse sin poder
 * entrar por un problema nuestro es peor, y Supabase tiene sus propios límites
 * para el código de la app. Para los códigos de respaldo, que no pasan por
 * Supabase, el que llama decide (ver `respaldo/route.ts`).
 */
export const INTENTOS_MAX = 5;
export const BLOQUEO_MS = 15 * 60 * 1000;

const clave = (userId: string) => `seg-segundo-paso:${userId}`;

export type Bloqueo =
  | { bloqueado: true; minutos: number }
  | { bloqueado: false; contador: true; restantes: number }
  | { bloqueado: false; contador: false };

/**
 * Gasta un intento ANTES de probar el código, y al acertar se limpia. Mirar el
 * contador y anotar el error después dejaba una ventana: cien pedidos a la vez
 * leían todos "0 errores" antes de que el primero anotara el suyo, y eran cien
 * códigos probados en vez de cinco. Sumar primero es atómico en Redis: el sexto
 * pedido ve 6 aunque lleguen todos juntos.
 */
export async function reservarIntento(userId: string): Promise<Bloqueo> {
  try {
    const n = await recordFailure(clave(userId), BLOQUEO_MS);
    if (n > INTENTOS_MAX) {
      const minutos = Math.max(1, Math.ceil((await failureCooldown(clave(userId))) / 60));
      return { bloqueado: true, minutos };
    }
    return { bloqueado: false, contador: true, restantes: INTENTOS_MAX - n };
  } catch {
    console.error("[seguridad] Redis no disponible: se verifica sin contador de intentos");
    return { bloqueado: false, contador: false };
  }
}

/** Cuántos intentos le quedan después de un error (null si no se pudo contar). */
export function restantesTrasFallo(b: Bloqueo): number | null {
  return !b.bloqueado && b.contador ? b.restantes : null;
}

export async function limpiarFallos(userId: string): Promise<void> {
  await clearFailures(clave(userId)).catch(() => {});
}

export function mensajeBloqueo(minutos: number): string {
  return `Demasiados códigos incorrectos. Volvé a intentar en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
}
