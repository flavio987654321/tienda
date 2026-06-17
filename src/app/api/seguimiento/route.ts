import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
      store: { select: { name: true, slug: true, logo: true } },
      items: {
        select: {
          quantity: true,
          price: true,
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

  return NextResponse.json({ order });
}
