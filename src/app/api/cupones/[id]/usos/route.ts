import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // Verificar que el cupón pertenece a la tienda
  const coupon = await prisma.coupon.findFirst({
    where: { id, storeId: store.id },
    select: { id: true },
  });
  if (!coupon) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });

  const rawOrders = await prisma.order.findMany({
    where: { couponId: id },
    select: {
      id: true,
      total: true,
      discountAmount: true,
      createdAt: true,
      buyer: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const orders = rawOrders.map((o) => ({
    id: o.id,
    total: o.total,
    discountAmount: o.discountAmount,
    createdAt: o.createdAt,
    buyerName: o.buyer.name ?? "—",
    buyerEmail: o.buyer.email ?? "—",
  }));

  return NextResponse.json({ orders });
}
