import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

type TrackItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  image?: string | null;
  price: number;
  qty: number;
  size?: string;
  color?: string;
};

type TrackBody = {
  storeId: string;
  email: string;
  name?: string;
  phone?: string;
  items: TrackItem[];
  total: number;
};

// Snapshot de un carrito con email capturado durante el checkout que todavía
// no se completó en una compra — usado luego para el recordatorio de
// recuperación. No bloquea ni devuelve datos sensibles: el storefront lo
// llama en fire-and-forget y no necesita leer la respuesta.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`cart-track:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const body = (await req.json()) as TrackBody;
  const storeId = String(body.storeId ?? "");
  const email = String(body.email ?? "").toLowerCase().trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (!storeId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || items.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
  if (!store) return NextResponse.json({ ok: false }, { status: 404 });

  const data = {
    customerName: body.name?.trim() || null,
    customerPhone: body.phone?.trim() || null,
    items: JSON.stringify(items),
    total: Number(body.total) || 0,
    lastActivityAt: new Date(),
    reminderSentAt: null,
    recoveredAt: null,
  };

  await prisma.abandonedCart.upsert({
    where: { storeId_customerEmail: { storeId, customerEmail: email } },
    create: { storeId, customerEmail: email, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
}
