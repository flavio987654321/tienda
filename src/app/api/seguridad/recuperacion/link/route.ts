import { NextRequest, NextResponse } from "next/server";
import { confirmarRecuperacion, cancelarRecuperacionPorLink } from "@/lib/seguridad-cuenta";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

/**
 * Los dos botones de los mails de "Perdí mi celular". POST y no GET a propósito:
 * los filtros de los correos (Outlook, antivirus) abren solos los links que
 * llegan, y un link que confirma con sólo abrirlo arrancaría la espera sin que
 * nadie lo haya tocado. La página `/seguridad/recuperacion` muestra el botón y
 * recién el botón llega acá.
 */
export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`seg-link:${getClientIp(req)}`, 20, 60_000).catch(() => true))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";

  if (body?.accion === "confirmar") {
    const r = await confirmarRecuperacion(token);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, venceAt: r.venceAt.toISOString() });
  }
  if (body?.accion === "cancelar") {
    const ok = await cancelarRecuperacionPorLink(token);
    if (!ok) return NextResponse.json({ error: "El link no es válido o ese pedido ya terminó." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Pedido mal formado" }, { status: 400 });
}
