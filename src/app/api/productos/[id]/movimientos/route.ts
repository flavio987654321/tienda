import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";

type RouteContext = { params: Promise<{ id: string }> };

const TYPE_LABELS: Record<string, string> = {
  MANUAL: "Ajuste manual",
  SALE: "Venta",
  CANCELLATION: "Cancelación",
  BULK_ADJUST: "Ajuste masivo",
  PRODUCT_EDIT: "Edición de producto",
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const limit = Math.min(Math.max(1, limitParam || 50), 100);
  const cursor = req.nextUrl.searchParams.get("cursor");

  const movements = await prisma.stockMovement.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { variant: { select: { name: true, value: true } } },
  });

  const hasMore = movements.length > limit;
  const items = movements.slice(0, limit).map((m) => ({
    id: m.id,
    createdAt: m.createdAt,
    variantLabel: m.variant.value,
    type: m.type,
    typeLabel: TYPE_LABELS[m.type] || m.type,
    delta: m.delta,
    stockAfter: m.stockAfter,
    reason: m.reason,
    changedBy: m.changedBy === auth.ownerId ? "Vos" : m.changedBy === "system" ? "Sistema" : m.changedBy,
  }));

  return NextResponse.json({
    items,
    nextCursor: hasMore ? movements[limit].id : null,
  });
}
