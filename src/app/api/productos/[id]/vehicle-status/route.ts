import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json();
  const { vehicleStatus, soldPrice, soldBuyerName, soldBuyerPhone, soldNotes } = body;

  const VALID = ["AVAILABLE", "RESERVED", "SOLD"];
  if (!VALID.includes(vehicleStatus)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      vehicleStatus,
      soldAt:         vehicleStatus === "SOLD" ? new Date() : null,
      soldPrice:      vehicleStatus === "SOLD" ? (soldPrice ?? null) : null,
      soldBuyerName:  vehicleStatus === "SOLD" ? (soldBuyerName ?? null) : null,
      soldBuyerPhone: vehicleStatus === "SOLD" ? (soldBuyerPhone ?? null) : null,
      soldNotes:      vehicleStatus === "SOLD" ? (soldNotes ?? null) : null,
      isActive:       vehicleStatus === "AVAILABLE",
    },
    select: {
      id: true, vehicleStatus: true, soldAt: true,
      soldPrice: true, soldBuyerName: true, soldBuyerPhone: true, soldNotes: true, isActive: true,
    },
  });

  return NextResponse.json({ product: updated });
}
