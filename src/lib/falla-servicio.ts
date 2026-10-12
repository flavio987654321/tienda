/* Distinguir "te equivocaste" de "se nos cayó a nosotros".
 *
 * Existe por el corte de octubre de 2026: Supabase se pasó de cuota, empezó a
 * contestar 402 y el login le decía a todo el mundo "Email o contraseña
 * incorrectos". La gente se ponía a cambiar contraseñas que estaban perfectas y
 * nadie sabía que el problema era nuestro.
 *
 * La regla va al revés de lo intuitivo: en vez de listar las fallas del servicio
 * (402, 500, 503, red caída, Cloudflare 52x, respuesta que no es JSON...), se
 * lista lo que SÍ es culpa de la persona —un error 4xx bien formado de la API de
 * Auth— y todo lo demás se trata como falla nuestra. Una lista de fallas siempre
 * se queda corta; ésta no. Y supabase-js NO tira excepción cuando no hay red:
 * devuelve un `AuthRetryableFetchError` con status 0 adentro del `error`, así que
 * sin esto la falta de internet también salía como contraseña incorrecta.
 */
import { isAuthApiError } from "@supabase/supabase-js";

export const MENSAJE_SERVICIO_CAIDO =
  "Tenemos un problema técnico de nuestro lado. No es tu cuenta ni tu contraseña: probá de nuevo en unos minutos.";

export const MENSAJE_SIN_INTERNET = "No hay conexión a internet. Conectate y probá de nuevo.";

/** El error de Supabase Auth es del servicio (caído, sin cuota, sin red) y no de
 *  lo que escribió la persona. 429 queda afuera: es "demasiados intentos" y tiene
 *  su propio mensaje. */
export function esFallaDelServicio(error: unknown): boolean {
  if (!error) return false;
  if (!isAuthApiError(error)) return true;
  const status = error.status;
  return status === 402 || status >= 500 || status < 400;
}

/** Mensaje para cuando el servicio falló, visto desde el navegador: si el
 *  dispositivo dice que no tiene red, es eso; si no, es nuestro. */
export function mensajeFallaDelServicio(): string {
  return typeof navigator !== "undefined" && navigator.onLine === false ? MENSAJE_SIN_INTERNET : MENSAJE_SERVICIO_CAIDO;
}
