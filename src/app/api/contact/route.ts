import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendContactFormEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { NOMBRE_MAX, EMAIL_MAX, MENSAJE_MAX, recortar } from "@/lib/contacto-limites";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`contact:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiados mensajes. Esperá un momento." }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { storeId, nombre, email, mensaje, turnstileToken, website } = body as Record<string, unknown>;

  /* Honeypot: un campo escondido que una persona no ve y un bot llena solo.
     Lo tenia el alta de suscriptores y aca faltaba. Al bot se le contesta que
     salio bien, para que no aprenda cual es el campo que lo delata. */
  if (website) return NextResponse.json({ ok: true });

  if (
    typeof storeId !== "string" || storeId.length === 0 ||
    typeof nombre !== "string" || nombre.trim().length < 2 ||
    typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof mensaje !== "string" || mensaje.trim().length < 5
  ) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  /* Y el tope de ARRIBA, que no existia en ningun lado.
     Este mensaje se le manda por mail al comerciante tal cual llega. Sin tope,
     alguien podia pegar un archivo entero en el campo y mandarlo cinco veces por
     minuto —lo que deja pasar el limite por IP— hasta llenarle la casilla.
     Se recorta en vez de rechazar: ver contacto-limites.ts. */
  const nombreLimpio  = recortar(nombre, NOMBRE_MAX);
  const emailLimpio   = recortar(email, EMAIL_MAX).toLowerCase();
  const mensajeLimpio = recortar(mensaje, MENSAJE_MAX);

  // Captcha al final: un error de campos no consume el token (es de un solo uso)
  if (!(await verifyTurnstile(turnstileToken, ip, "contact"))) {
    return NextResponse.json({ error: "No pudimos verificar que sos una persona. Intentá de nuevo." }, { status: 400 });
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId, isActive: true, isPublished: true },
    select: { name: true, owner: { select: { email: true } } },
  });

  if (!store?.owner?.email) {
    return NextResponse.json({ error: "Tienda no disponible" }, { status: 404 });
  }

  await sendContactFormEmail({
    ownerEmail: store.owner.email,
    storeName: store.name,
    name: nombreLimpio,
    email: emailLimpio,
    message: mensajeLimpio,
  });

  return NextResponse.json({ ok: true });
}
