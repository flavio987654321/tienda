import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { otpTokenVigente, quemarOtpToken } from "@/lib/otp-token";
import { dineroTrabado, mensajeDineroTrabado } from "@/lib/seguridad-cuenta";
import { MINUTOS_VERIFICACION_RECIENTE, segundoPasoDesde } from "@/lib/seguridad-cuenta-reglas";

/**
 * "Verificá que sos vos" para lo delicado: cambiar el CBU o el alias, cambiar o
 * desconectar Mercado Pago, pedir un retiro, apagar el doble paso. Aunque la
 * sesión esté abierta: lo que se cuida es la compu que alguien dejó prendida.
 *
 * Dos caminos, según la cuenta:
 *   · con verificación en dos pasos: haber pasado la huella o el código de la
 *     app en los últimos minutos. Lo dice la sesión misma (el `amr` que firma
 *     Supabase), así que no hay nada que mandar ni que guardar;
 *   · sin ella: el código por mail de siempre, que deja un token de un solo uso
 *     (`lib/otp-token`) y viaja en la cabecera `x-otp-token`.
 *
 * Con doble paso el mail NO alcanza: es justo lo que tiene quien robó la casilla.
 */

export { segundoPasoDesde };

export type Identidad =
  | { ok: true; conDosPasos: boolean; quemar: () => Promise<void> }
  | { ok: false; status: number; body: { error: string; code: "VERIFICAR" | "DINERO_TRABADO"; conDosPasos?: boolean } };

/**
 * ¿Puede hacer algo delicado ahora? Falla CERRADO: si algo no se puede leer, no.
 * `tocaDinero` suma la traba que deja una recuperación (ver `seguridad-cuenta`).
 */
export async function identidadReciente(
  req: NextRequest,
  userId: string,
  opciones: { tocaDinero?: boolean } = {},
): Promise<Identidad> {
  if (opciones.tocaDinero) {
    const hasta = await dineroTrabado(userId);
    if (hasta) return { ok: false, status: 403, body: { error: mensajeDineroTrabado(hasta), code: "DINERO_TRABADO" } };
  }

  let conDosPasos = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: u } = await supabase.auth.getUser();
    conDosPasos = (u?.user?.factors ?? []).some((f) => f.status === "verified");
    if (conDosPasos) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const desde = aal?.currentLevel === "aal2" ? segundoPasoDesde(aal.currentAuthenticationMethods) : null;
      if (desde !== null && Date.now() - desde <= MINUTOS_VERIFICACION_RECIENTE * 60_000) {
        return { ok: true, conDosPasos: true, quemar: async () => {} };
      }
      return { ok: false, status: 403, body: { error: "Verificá que sos vos para seguir.", code: "VERIFICAR", conDosPasos: true } };
    }
  } catch (e) {
    console.error("[identidad] no se pudo leer la sesión:", e instanceof Error ? e.message : e);
    return { ok: false, status: 403, body: { error: "No pudimos verificar tu identidad. Probá de nuevo.", code: "VERIFICAR" } };
  }

  const token = req.headers.get("x-otp-token");
  if (token && (await otpTokenVigente(token, userId))) {
    return { ok: true, conDosPasos: false, quemar: async () => { await quemarOtpToken(userId, token); } };
  }
  return { ok: false, status: 403, body: { error: "Verificá que sos vos para seguir.", code: "VERIFICAR", conDosPasos: false } };
}
