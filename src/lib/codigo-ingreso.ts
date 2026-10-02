/**
 * Entrar con un código por mail: las reglas, sin base ni red.
 *
 * Es la puerta que anda en todos lados: en la app instalada del iPhone (donde
 * Google no puede devolver la sesión a la app), para quien se registró con
 * Google y no tiene contraseña, y para quien se la olvidó y está apurado.
 *
 * El código lo genera Supabase (`generateLink` tipo magiclink → `email_otp`) y
 * lo verifica Supabase; nosotros ponemos el mail con nuestro diseño y los
 * frenos: captcha y tope por mail al pedirlo, y tope de intentos al usarlo.
 *
 * El admin NO entra así: su panel exige contraseña + código de la app.
 */

/** Pedidos de código por mail en la ventana. */
export const PEDIDOS_POR_MAIL = 3;
export const VENTANA_PEDIDOS_MS = 15 * 60 * 1000;
/** Códigos errados antes de bloquear ese mail. */
export const INTENTOS_MAX = 5;
export const BLOQUEO_MS = 15 * 60 * 1000;
/** Cuánto espera la pantalla antes de dejar pedir otro. */
export const ESPERA_REENVIO_S = 60;

export function normalizarEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  if (e.length < 3 || e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

/** Supabase lo manda de 8 dígitos (configurable allá entre 6 y 10): no se escribe el largo en ningún texto. */
export function normalizarCodigo(codigo: unknown): string | null {
  if (typeof codigo !== "string") return null;
  const c = codigo.replace(/\s+/g, "");
  return /^\d{6,10}$/.test(c) ? c : null;
}
