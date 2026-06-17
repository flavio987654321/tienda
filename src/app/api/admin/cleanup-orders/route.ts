import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "cleanup-laura-2026";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: "laura.tbenitez1996@gmail.com" },
    select: { id: true, name: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  const orders = store
    ? await prisma.order.findMany({
        where: { storeId: store.id },
        select: { id: true, status: true, total: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return NextResponse.json({
    user: { name: user.name, role: user.role },
    store: store?.name ?? "sin tienda",
    orderCount: orders.length,
    orders: orders.map(o => ({
      code: o.id.slice(-8).toUpperCase(),
      status: o.status,
      total: o.total,
      date: o.createdAt,
    })),
    nextStep: `Para borrar: GET /api/admin/cleanup-orders?secret=${SECRET}&confirm=yes`,
  });
}

export async function DELETE(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: "laura.tbenitez1996@gmail.com" },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!store) return NextResponse.json({ error: "Sin tienda" });

  const orderIds = (
    await prisma.order.findMany({
      where: { storeId: store.id },
      select: { id: true },
    })
  ).map(o => o.id);

  if (orderIds.length === 0) {
    return NextResponse.json({ deleted: 0, message: "No había pedidos." });
  }

  await prisma.$transaction([
    prisma.orderStatusLog.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.commission.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.shipping.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.review.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
  ]);

  return NextResponse.json({
    deleted: orderIds.length,
    store: store.name,
    message: `Se eliminaron ${orderIds.length} pedido(s) de la tienda "${store.name}".`,
  });
}
