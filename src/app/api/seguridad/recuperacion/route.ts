import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser, getUsuarioConSegundoPaso } from "@/lib/auth-session";
import { pedirRecuperacion, cancelarRecuperacionesDe } from "@/lib/seguridad-cuenta";
import { describirDispositivo, diasDeEspera } from "@/lib/seguridad-cuenta-reglas";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";

/**
 * POST — "Perdí mi celular", desde la pantalla de verificación. Sólo quien ya
 * pasó el primer paso y le falta el segundo. Ver `pedirRecuperacion`.
 *
 * La espera depende de CÓMO entró a esta sesión: con la contraseña, 7 días; con
 * Google o el código por mail, 14. Lo dice el `amr` de la sesión, que firma
 * Supabase. Quien robó el mail entra con el código por mail pero no sabe la
 * contraseña, y no la puede cambiar: Supabase no deja cambiarla sin aal2.
 */
export async function POST(req: NextRequest) {
  const sesion = await getUsuarioConSegundoPaso();
  if (!sesion) return NextResponse.json({ error: "Tu sesión se cerró. Volvé a entrar." }, { status: 401 });
  if (!sesion.faltaSegundoPaso) return NextResponse.json({ error: "Ya entraste: no hace falta recuperar nada." }, { status: 400 });
  const { user } = sesion;

  const { permitido } = await checkRateLimitConRespaldo(`seg-recuperar:${user.id}`, 3, 60 * 60_000, { limiteFallback: 3, limiteFallbackGlobal: 30 });
  if (!permitido) return NextResponse.json({ error: "Ya lo pediste varias veces. Revisá tu mail o probá en una hora." }, { status: 429 });

  const supabase = await createSupabaseServerClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const conContrasena = (aal?.currentAuthenticationMethods ?? []).some(
    (m) => (typeof m === "string" ? m : m.method) === "password",
  );

  const r = await pedirRecuperacion(user, conContrasena, describirDispositivo(req.headers.get("user-agent")));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json({ ok: true, dias: diasDeEspera(conContrasena), conContrasena });
}

/** DELETE — "No fui yo", desde Seguridad, con la sesión completa. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const n = await cancelarRecuperacionesDe(user.id, "la canceló desde Seguridad");
  return NextResponse.json({ ok: true, canceladas: n });
}
