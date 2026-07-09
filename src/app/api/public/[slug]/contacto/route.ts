import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendContactFormEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const ip = getClientIp(req);
  const { slug } = await params;

  // 5 mensajes por hora por IP + tienda
  if (!(await checkRateLimit(`contact:${ip}:${slug}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Demasiados mensajes enviados. Esperá un momento antes de volver a intentarlo." },
      { status: 429 }
    );
  }

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    include: { owner: { select: { email: true, name: true } } },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json();

  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: "No pudimos verificar que sos una persona. Recargá la página e intentá de nuevo." }, { status: 400 });
  }

  const name = String(body.name || "").trim().slice(0, 100);
  const email = String(body.email || "").trim().slice(0, 200);
  const phone = String(body.phone || "").trim().slice(0, 30);
  const message = String(body.message || "").trim().slice(0, 2000);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Nombre, email y mensaje son requeridos" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  await sendContactFormEmail({
    ownerEmail: store.owner.email,
    storeName: store.name,
    name,
    email,
    phone: phone || undefined,
    message,
  });

  return NextResponse.json({ ok: true });
}
