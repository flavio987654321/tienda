import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendAbandonedCartEmail } from "@/lib/resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

type SnapshotItem = { name: string; price: number; qty: number; image?: string | null };

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  // Protección contra doble click/doble submit: si ya hay un envío en
  // curso para este carrito en los últimos 10s, se ignora el duplicado.
  if (!(await checkRateLimit(`cart-resend:${id}`, 1, 10_000))) {
    return NextResponse.json({ error: "Ya se está enviando, esperá un momento" }, { status: 429 });
  }

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const cart = await prisma.abandonedCart.findUnique({
    where: { id },
    include: { store: { select: { id: true, name: true, slug: true } } },
  });
  if (!cart || cart.storeId !== store.id) {
    return NextResponse.json({ error: "Carrito no encontrado" }, { status: 404 });
  }

  let items: SnapshotItem[] = [];
  try {
    items = JSON.parse(cart.items);
  } catch { /* noop */ }
  if (items.length === 0) {
    return NextResponse.json({ error: "El carrito no tiene productos" }, { status: 400 });
  }

  try {
    await sendAbandonedCartEmail({
      to: cart.customerEmail,
      customerName: cart.customerName,
      storeName: cart.store.name,
      items,
      total: cart.total,
      recoveryUrl: `${APP_URL}/tienda/${cart.store.slug}?recuperar=${cart.id}`,
    });
  } catch (e) {
    console.error("[abandonedCart] reenvío manual:", e);
    return NextResponse.json({ error: "No se pudo enviar el email" }, { status: 500 });
  }

  await prisma.abandonedCart.update({
    where: { id: cart.id },
    data: { reminderSentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
