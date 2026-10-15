import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth-session";
import { factoresDe, codigosLibres, crearCodigosRespaldo, registrarEvento } from "@/lib/seguridad-cuenta";
import { describirDispositivo } from "@/lib/seguridad-cuenta-reglas";
import { sendSeguridadEmail } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { otpTokenVigente, quemarOtpToken } from "@/lib/otp-token";

/**
 * El navegador activó una huella o la app de códigos directo con Supabase (es
 * quien guarda los factores). Esto es lo de después, del lado nuestro:
 *   · comprobar contra Supabase que el factor existe y está verificado — no se
 *     le cree al navegador;
 *   · si es el primero, generar los códigos de respaldo y devolverlos UNA vez;
 *   · cerrar las sesiones de los otros dispositivos: una sesión vieja abierta
 *     antes de activar no pasó nunca el segundo paso;
 *   · avisar por mail y anotarlo.
 * Se puede llamar dos veces con el mismo factor sin repetir nada.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tu sesión se cerró. Volvé a entrar." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const factorId = typeof body?.factorId === "string" ? body.factorId : "";

  let factores;
  try {
    factores = await factoresDe(user.id);
  } catch {
    return NextResponse.json({ error: "No pudimos confirmar la activación. Recargá la página." }, { status: 503 });
  }
  const factor = factores.find((f) => f.id === factorId);
  if (!factor) return NextResponse.json({ error: "No encontramos esa activación. Probá de nuevo." }, { status: 404 });

  const yaAnotado = await prisma.eventoCuenta.findFirst({ where: { userId: user.id, detalle: factorId } });
  if (yaAnotado) return NextResponse.json({ ok: true, codigos: null });

  /* El PRIMER factor pide antes el código por mail. Sin esto, alguien sentado en
     una compu con la sesión abierta activaba SU huella en la cuenta de otro y lo
     dejaba afuera. Los siguientes no: Supabase ya exige haber pasado el segundo
     paso para sumar otro. Si el código no está, la activación se deshace. */
  if (factores.length === 1) {
    const token = req.headers.get("x-otp-token");
    if (!token || !(await otpTokenVigente(token, user.id))) {
      await createSupabaseAdminClient().auth.admin.mfa.deleteFactor({ id: factorId, userId: user.id }).catch(() => {});
      return NextResponse.json({ error: "Para activarla primero hay que verificar tu mail. Probá de nuevo.", code: "VERIFICAR" }, { status: 403 });
    }
    await quemarOtpToken(user.id, token);
  }

  const dispositivo = describirDispositivo(req.headers.get("user-agent"));
  await registrarEvento(user.id, factor.tipo === "huella" ? "huella_activada" : "app_activada", { detalle: factorId, dispositivo });

  // Los códigos se dan con el primer factor. Si ya tenía, no se tocan.
  const codigos = (await codigosLibres(user.id)) === 0 ? await crearCodigosRespaldo(user.id) : null;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "others" }).catch((e) =>
    console.error("[seguridad] no se pudieron cerrar las otras sesiones:", e instanceof Error ? e.message : e));

  await sendSeguridadEmail({
    to: user.email,
    name: user.name,
    asunto: "Activaste la verificación en dos pasos",
    titulo: factor.tipo === "huella" ? "Activaste la huella o la cara" : "Activaste la app de códigos",
    parrafos: [
      `Desde ${dispositivo} se activó ${factor.tipo === "huella" ? "la huella o la cara" : "la app de códigos"} como segundo paso para entrar a tu cuenta.`,
      "Desde ahora, además de tu contraseña o tu mail, te lo vamos a pedir al entrar y antes de cambiar tus datos de cobro.",
      "Cerramos las sesiones abiertas en otros dispositivos: ahí vas a tener que volver a entrar.",
      "Si no fuiste vos, escribinos ya.",
    ],
    boton: { texto: "Ver la seguridad de mi cuenta", url: siteUrl("/panel?seguridad=1") },
  }).catch((e) => console.error("[seguridad] mail de activación:", e instanceof Error ? e.message : e));

  return NextResponse.json({ ok: true, codigos });
}
