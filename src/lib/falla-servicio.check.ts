/**
 * Chequeos de `falla-servicio`. Se corre a mano:
 *
 *   npx tsx src/lib/falla-servicio.check.ts
 *
 * Usa las clases de error reales de supabase-js, no objetos armados a mano: lo
 * que importa es cómo llega el error de verdad, y supabase-js no tira excepción
 * sin red — devuelve un AuthRetryableFetchError con status 0.
 */

import { AuthApiError, AuthRetryableFetchError, AuthUnknownError } from "@supabase/supabase-js";
import { esFallaDelServicio } from "./falla-servicio";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`); }
};

/* ── Culpa del servicio: no puede decir "contraseña incorrecta" ─────────── */
chequear("402 (sin cuota) es del servicio", esFallaDelServicio(new AuthApiError("restricted", 402, undefined)));
chequear("500 es del servicio", esFallaDelServicio(new AuthApiError("boom", 500, undefined)));
chequear("sin red (status 0) es del servicio", esFallaDelServicio(new AuthRetryableFetchError("Failed to fetch", 0)));
chequear("503 de la puerta de entrada es del servicio", esFallaDelServicio(new AuthRetryableFetchError("unavailable", 503)));
chequear("respuesta que no es JSON es del servicio", esFallaDelServicio(new AuthUnknownError("bad json", null)));
chequear("un Error cualquiera es del servicio", esFallaDelServicio(new Error("x")));

/* ── Culpa de quien escribe: se sigue contestando como siempre ──────────── */
chequear("400 credenciales es de la persona", !esFallaDelServicio(new AuthApiError("Invalid login credentials", 400, "invalid_credentials")));
chequear("400 captcha es de la persona", !esFallaDelServicio(new AuthApiError("captcha verification process failed", 400, "captcha_failed")));
chequear("403 código vencido es de la persona", !esFallaDelServicio(new AuthApiError("Token has expired or is invalid", 403, "otp_expired")));
chequear("404 correo sin cuenta NO es del servicio (si no, reset-password revelaría cuentas)", !esFallaDelServicio(new AuthApiError("User not found", 404, "user_not_found")));
chequear("429 tiene su propio mensaje", !esFallaDelServicio(new AuthApiError("rate limit", 429, "over_request_rate_limit")));
chequear("sin error no es falla", !esFallaDelServicio(null));

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
