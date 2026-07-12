import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";

type Ctx = { params: Promise<{ id: string; gastoId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id, gastoId } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const gasto = await prisma.vehicleExpense.findFirst({
    where: { id: gastoId, productId: id },
    select: { id: true },
  });
  if (!gasto) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });

  await prisma.vehicleExpense.delete({ where: { id: gastoId } });

  return NextResponse.json({ ok: true });
}
