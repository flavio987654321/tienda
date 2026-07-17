import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`seguimiento:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas consultas. Esperá un momento." }, { status: 429 });
  }

  const codigo = req.nextUrl.searchParams.get("codigo")?.trim().toUpperCase();
  if (!codigo || codigo.length < 6) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { id: { endsWith: codigo.toLowerCase() } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      trackingCode: true,
      shippingMethod: true,
      shippingAddress: true,
      total: true,
      subtotal: true,
      discountAmount: true,
      shippingCost: true,
      coupon: { select: { code: true } },
      payment: { select: { provider: true, status: true } },
      store: { select: { name: true, slug: true, logo: true, storeConfig: true } },
      items: {
        select: {
          quantity: true,
          price: true,
          lineTotal: true,
          product: { select: { name: true } },
          variant: { select: { value: true, name: true } },
        },
      },
      statusLogs: {
        orderBy: { changedAt: "asc" },
        select: { toStatus: true, changedAt: true },
      },
    },
    take: 1,
  });

  const order = orders[0];
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let whatsapp: string | null = null;
  try {
    const cfg = JSON.parse(order.store.storeConfig || "{}");
    if (cfg.whatsapp?.enabled && cfg.whatsapp?.number) whatsapp = cfg.whatsapp.number;
  } catch { /* noop */ }

  const { name, slug, logo } = order.store;
  return NextResponse.json({ order: { ...order, store: { name, slug, logo, whatsapp } } });
}
