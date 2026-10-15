import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUsuarioConSegundoPaso } from "@/lib/auth-session";
import { gastarCodigoRespaldo, entrarConCodigoRespaldo } from "@/lib/seguridad-cuenta";
import { describirDispositivo } from "@/lib/seguridad-cuenta-reglas";
import { revisarBloqueo, anotarFallo, limpiarFallos, mensajeBloqueo } from "@/lib/seguridad-intentos";

/**
 * Entrar con un código de respaldo. Supabase no tiene códigos de respaldo: el
 * código lo valida esta ruta, y lo que hace es APAGAR el doble paso (ver
 * `entrarConCodigoRespaldo`). Borrar un factor verificado cierra todas las
 * sesiones de la cuenta, incluida ésta; por eso al final se vuelve a abrir la de
 * esta persona con un código de un solo uso que nunca sale del servidor, como
 * hace `anularClaveYReabrir`.
 *
 * Comparte el tope de intentos con el código de la app.
 */
export async function POST(req: NextRequest) {
  const sesion = await getUsuarioConSegundoPaso();
  if (!sesion) return NextResponse.json({ error: "Tu sesión se cerró. Volvé a entrar." }, { status: 401 });
  if (!sesion.faltaSegundoPaso) return NextResponse.json({ ok: true });
  const { user } = sesion;

  const body = await req.json().catch(() => null);
  const bloqueo = await revisarBloqueo(user.id);
  if (bloqueo.bloqueado) return NextResponse.json({ error: mensajeBloqueo(bloqueo.minutos), bloqueado: true }, { status: 429 });

  if (!(await gastarCodigoRespaldo(user.id, body?.codigo))) {
    const restantes = bloqueo.contador ? await anotarFallo(user.id) : null;
    return NextResponse.json({ error: "Ese código no es válido o ya se usó.", restantes }, { status: 401 });
  }
  if (bloqueo.contador) await limpiarFallos(user.id);

  try {
    await entrarConCodigoRespaldo(user, describirDispositivo(req.headers.get("user-agent")));
  } catch (e) {
    console.error("[seguridad] código de respaldo bien, pero no se pudo apagar el doble paso:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "El código es correcto, pero no pudimos terminar. Probá de nuevo con OTRO de tus códigos." }, { status: 500 });
  }

  // Se reabre la sesión de esta persona (la cerró Supabase al borrar el factor).
  try {
    const supabase = await createSupabaseServerClient();
    const { data: link, error } = await createSupabaseAdminClient().auth.admin.generateLink({ type: "magiclink", email: user.email });
    const codigo = link?.properties?.email_otp;
    if (error || !codigo) throw new Error(error?.message ?? "sin código");
    let { error: e2 } = await supabase.auth.verifyOtp({ email: user.email, token: codigo, type: "email" });
    if (e2) ({ error: e2 } = await supabase.auth.verifyOtp({ email: user.email, token: codigo, type: "magiclink" }));
    if (e2) throw new Error(e2.message);
  } catch (e) {
    console.error("[seguridad] no se pudo reabrir la sesión tras el código de respaldo:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true, volverAEntrar: true });
  }
  return NextResponse.json({ ok: true });
}
