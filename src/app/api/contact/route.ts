import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendContactFormEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(`contact:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Demasiados mensajes. Esperá un momento." }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { storeId, nombre, email, mensaje } = body as Record<string, unknown>;

  if (
    typeof storeId !== "string" || storeId.length === 0 ||
    typeof nombre !== "string" || nombre.trim().length < 2 ||
    typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof mensaje !== "string" || mensaje.trim().length < 5
  ) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
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
    name: nombre.trim(),
    email: email.trim().toLowerCase(),
    message: mensaje.trim(),
  });

  return NextResponse.json({ ok: true });
}
