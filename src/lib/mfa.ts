import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ¿La sesión tiene el 2FA pendiente de pasar? True solo cuando el usuario tiene
 * un factor VERIFICADO (nextLevel = aal2) pero esta sesión todavía está en aal1
 * (entró con contraseña y no verificó el segundo factor).
 *
 * Es local: `getAuthenticatorAssuranceLevel()` sin argumentos lee la sesión de las
 * cookies y saca los factores de `session.user.factors`, sin llamada de red. Por
 * eso se puede usar hasta en el middleware, en cada request, sin costo.
 *
 * Lo usan DOS lugares y por eso vive acá —para que no se desincronicen—: el layout
 * de /admin (gatea las páginas) y el middleware (gatea /api/admin). Sin lo segundo,
 * el 2FA tapaba la UI pero no los endpoints: un atacante con la contraseña (aal1)
 * no veía el panel pero podía llamar las rutas de admin directas.
 *
 * Falla abierto a propósito: si el chequeo tira error, deja pasar. El acceso
 * nunca depende SOLO de esto —las páginas igual piden rol ADMIN y cada endpoint
 * también—, así que un fallo del MFA degrada a "contraseña sola", no bloquea ni
 * abre de par en par. Fallar cerrado arriesga dejar al admin afuera por un blip.
 */
export async function needsMfaChallenge(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
  } catch {
    return false;
  }
}

/**
 * Lo mismo que `needsMfaChallenge`, pero para las cuentas de tiendas, digitales
 * y afiliados (ver `lib/seguridad-cuenta`). Dos diferencias, las dos a propósito:
 *
 * 1. Los factores salen del usuario que devolvió `getUser()` —recién leído de
 *    Supabase— y no de la sesión guardada en la cookie. La cookie se arma al
 *    entrar: si la persona activó la huella en el celular, la sesión vieja de la
 *    compu seguía diciendo "sin factores" hasta renovarse, hasta una hora.
 *
 * 2. Falla CERRADO: si no se puede leer el nivel de la sesión, cuenta como que
 *    falta. El admin falla abierto para no quedar afuera de su panel; acá lo
 *    peor que pasa es reintentar.
 */
export async function faltaSegundoPaso(
  supabase: SupabaseClient,
  user: { factors?: { status: string }[] | null } | null | undefined,
): Promise<boolean> {
  if (!user) return false;
  if (!(user.factors ?? []).some((f) => f.status === "verified")) return false;
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return true;
    return data.currentLevel !== "aal2";
  } catch {
    return true;
  }
}

/**
 * ¿Esta cuenta ya tiene el segundo factor configurado?
 *
 * Distinto de `needsMfaChallenge`, que responde "¿falta pasarlo en ESTA sesión?".
 * Sin factor, aquella devuelve false y deja entrar — por eso el 2FA era opcional
 * de hecho: quien nunca lo activaba entraba con la contraseña sola. Esta es la
 * que permite exigirlo.
 *
 * `listFactors()` sí va a la red (a diferencia del otro chequeo), así que se usa
 * solo en el layout del admin, una vez por navegación, y no en el middleware.
 *
 * Falla ABIERTO, igual que el resto del MFA acá: si la consulta se cae, devuelve
 * true (deja pasar) en vez de trabar el panel. Un problema de red no puede dejar
 * al admin afuera de su propio sistema; el próximo request vuelve a exigirlo.
 */
export async function hasVerifiedMfaFactor(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.error("[mfa] no se pudo leer los factores; se deja pasar:", error.message);
      return true;
    }
    return (data?.totp?.length ?? 0) > 0;
  } catch (e) {
    console.error("[mfa] error leyendo los factores; se deja pasar:", e);
    return true;
  }
}
