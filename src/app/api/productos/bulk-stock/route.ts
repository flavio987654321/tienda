import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";
import { applyVariantStockChange, dispatchLowStockAlerts, type LowStockItem } from "@/lib/stockMovements";

export async function POST(req: NextRequest) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { mode, value, category } = body as { mode?: string; value?: unknown; category?: string };

  if (mode !== "add" && mode !== "subtract" && mode !== "set") {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
  }
  const numValue = Number(value);
  if (!Number.isFinite(numValue) || !Number.isInteger(numValue) || numValue < 0) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  const where = {
    storeId: auth.storeId,
    deletedAt: null,
    ...(category && category !== "all" ? { category } : {}),
  };

  const variants = await prisma.productVariant.findMany({
    where: { product: where },
    select: { id: true, value: true, productId: true, product: { select: { name: true } } },
  });

  const lowStockItems: LowStockItem[] = [];
  let updated = 0;
  let skipped = 0;

  // Operaciones secuenciales dentro de la misma transacción interactiva: Prisma no
  // soporta llamadas concurrentes sobre el mismo `tx`, así que no se puede paralelizar.
  await prisma.$transaction(
    async (tx) => {
      for (const variant of variants) {
        const delta =
          mode === "add" ? numValue
          : mode === "subtract" ? -numValue
          : 0;
        const result = await applyVariantStockChange(tx, {
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.product.name,
          variantValue: variant.value,
          mode: mode === "set" ? "set" : "delta",
          value: mode === "set" ? numValue : delta,
          type: "BULK_ADJUST",
          changedBy: auth.ownerId,
        });
        if (!result) {
          skipped++;
          continue;
        }
        updated++;
        if (result.lowStockItem) lowStockItems.push(result.lowStockItem);
      }
    },
    { timeout: 30_000 }
  );

  if (lowStockItems.length > 0) {
    dispatchLowStockAlerts(auth.ownerId, auth.storeId, lowStockItems).catch((err) =>
      console.error("[stock] dispatchLowStockAlerts failed:", err)
    );
  }

  return NextResponse.json({ updated, skipped, lowStockTriggered: lowStockItems.length });
}
