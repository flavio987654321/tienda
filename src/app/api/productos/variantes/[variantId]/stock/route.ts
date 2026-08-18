import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerStore } from "@/lib/products";
import { applyVariantStockChange, dispatchLowStockAlerts } from "@/lib/stockMovements";

type RouteContext = { params: Promise<{ variantId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { variantId } = await ctx.params;
  const body = await req.json();
  const { mode, value, reason } = body as { mode?: string; value?: unknown; reason?: string };

  if (mode !== "delta" && mode !== "set") {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
  }
  const numValue = Number(value);
  if (!Number.isFinite(numValue) || !Number.isInteger(numValue)) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }
  if (mode === "set" && numValue < 0) {
    return NextResponse.json({ error: "El stock no puede ser negativo" }, { status: 400 });
  }

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { storeId: auth.storeId } },
    select: { id: true, value: true, productId: true, product: { select: { name: true } } },
  });
  if (!variant) return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });

  const result = await prisma.$transaction((tx) =>
    applyVariantStockChange(tx, {
      variantId,
      productId: variant.productId,
      productName: variant.product.name,
      variantValue: variant.value,
      mode,
      value: numValue,
      type: "MANUAL",
      changedBy: auth.ownerId,
      reason: reason || null,
    })
  );

  if (!result) {
    return NextResponse.json(
      { error: "El stock de esta variante cambió justo ahora. Volvé a intentar." },
      { status: 409 }
    );
  }

  // Los dos avisos, no sólo el de stock bajo: ajustar una variante a 0 desde el
  // modal dejaba el producto fuera de venta sin notificar a nadie.
  const alertas = [result.lowStockItem, result.outOfStockItem].filter(
    (i): i is NonNullable<typeof i> => i !== null
  );
  // Sin email: lo puso en cero la dueña misma, desde el modal, recién.
  if (alertas.length > 0) {
    dispatchLowStockAlerts(auth.ownerId, auth.storeId, alertas, { loHizoElDueno: true }).catch((err) =>
      console.error("[stock] dispatchLowStockAlerts failed:", err)
    );
  }

  return NextResponse.json({ variant: { id: variantId, stock: result.stockAfter } });
}
