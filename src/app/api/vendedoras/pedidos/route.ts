import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

const PAGE_SIZE = 15;

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PROCESSING: "Procesando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const storeId = searchParams.get("storeId") ?? undefined;

  const affiliateWhere = { userId: user.id, isActive: true, ...(storeId ? { storeId } : {}) };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { affiliate: affiliateWhere },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
            variant: { select: { name: true, value: true } },
          },
        },
        commission: { select: { id: true, amount: true, rate: true, status: true } },
        store: { select: { id: true, name: true, slug: true } },
        affiliate: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where: { affiliate: affiliateWhere } }),
  ]);

  const ordersFormatted = orders.map((o) => ({
    id: o.id,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
    total: o.total,
    subtotal: o.subtotal,
    discountAmount: o.discountAmount,
    shippingCost: o.shippingCost,
    createdAt: o.createdAt,
    store: o.store,
    affiliateId: o.affiliate?.id,
    commission: o.commission,
    items: o.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product: {
        id: item.product.id,
        name: item.product.name,
        image: (() => {
          try {
            const imgs = JSON.parse(item.product.images);
            return Array.isArray(imgs) && imgs.length > 0
              ? typeof imgs[0] === "string"
                ? imgs[0]
                : imgs[0]?.url ?? null
              : null;
          } catch {
            return null;
          }
        })(),
      },
      variant: item.variant,
    })),
  }));

  return NextResponse.json({
    orders: ordersFormatted,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
