import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendCodigoDeIngreso } from "@/lib/resend";
import { normalizarEmail, PEDIDOS_POR_MAIL, VENTANA_PEDIDOS_MS } from "@/lib/codigo-ingreso";
import { esElAdmin } from "@/lib/alta-google-servidor";

/**
 * Manda el código para entrar sin contraseña. Ver `lib/codigo-ingreso`.
 *
 * Contesta SIEMPRE lo mismo —exista o no la cuenta, esté o no bloqueada—, para
 * que no sirva de buscador de mails registrados. Lo único que distingue es el
 * captcha (que no revela nada) y un mail mal escrito.
 */
export async function POST(req: NextRequest) {
  const listo = NextResponse.json({ ok: true });
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => null);
    const email = normalizarEmail(body?.email);
    if (!email) return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });

    if (!(await verifyTurnstile(body?.turnstileToken, ip, "codigo", req.nextUrl.hostname))) {
      return NextResponse.json({ error: "No pudimos verificar que no seas un robot. Recargá e intentá de nuevo." }, { status: 400 });
    }

    // Por IP (alguien probando muchos mails) y por mail (llenarle la casilla a alguien).
    if (!(await checkRateLimit(`codigo-ip:${ip}`, 5, 60_000))) return listo;
    if (!(await checkRateLimit(`codigo-mail:${email}`, PEDIDOS_POR_MAIL, VENTANA_PEDIDOS_MS))) return listo;

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, banned: true } });
    // Sin cuenta, suspendida, o el admin (que entra solo con contraseña + código de la app).
    if (!user || user.banned || (await esElAdmin(user.id, email))) return listo;

    const { data, error } = await createSupabaseAdminClient().auth.admin.generateLink({ type: "magiclink", email });
    const codigo = data?.properties?.email_otp;
    if (error || !codigo) {
      console.error("[codigo] no se pudo generar:", error?.message);
      return listo;
    }

    await sendCodigoDeIngreso({ to: email, codigo });
    return listo;
  } catch (e) {
    // Mismo motivo: un error que contestara distinto diría "esta cuenta existe".
    console.error("[codigo] error al pedir:", e instanceof Error ? e.message : e);
    return listo;
  }
}
