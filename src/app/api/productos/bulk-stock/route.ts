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
  // El tope existe también acá, no sólo en la pantalla: la validación del navegador
  // se saltea con un fetch a mano, y sin techo un `set` con 9.999.999.999 entraba
  // derecho a la base. El número tiene que coincidir con MAX_STOCK_BULK de
  // `ProductsTable.tsx` — si se cambia uno, cambiar el otro.
  const MAX_STOCK_BULK = 100_000;
  const numValue = Number(value);
  if (!Number.isFinite(numValue) || !Number.isInteger(numValue) || numValue < 0) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }
  if (numValue > MAX_STOCK_BULK) {
    return NextResponse.json(
      { error: `El máximo es ${MAX_STOCK_BULK.toLocaleString("es-AR")} unidades por variante` },
      { status: 400 }
    );
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
  // Distinto de `skipped`: acá la variante SÍ se pudo tocar, pero el número le daba
  // igual —restarle 10 a una que ya está en 0, o fijar en 5 una que ya tenía 5—.
  // Iban contadas como actualizadas, así que "restar 10" con todo en cero informaba
  // "6 variantes actualizadas" sin haber cambiado una sola unidad.
  let unchanged = 0;

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
        if (result.stockAfter === result.stockBefore) {
          unchanged++;
          continue;
        }
        updated++;
        if (result.lowStockItem)   lowStockItems.push(result.lowStockItem);
        // Un "fijar todo en 0" puede dejar la tienda entera sin stock sin que
        // llegara un solo aviso. Ahora entra en la misma tanda.
        if (result.outOfStockItem) lowStockItems.push(result.outOfStockItem);
      }
    },
    { timeout: 30_000 }
  );

  // Sin email: éste es el caso más claro de todos. Un "fijar todo en 0" de fin de
  // temporada puede vaciar la tienda entera, y mandarle un mail por una decisión
  // que acaba de tomar en esta misma pantalla sería puro ruido.
  if (lowStockItems.length > 0) {
    dispatchLowStockAlerts(auth.ownerId, auth.storeId, lowStockItems, { email: false }).catch((err) =>
      console.error("[stock] dispatchLowStockAlerts failed:", err)
    );
  }

  return NextResponse.json({ updated, skipped, unchanged, lowStockTriggered: lowStockItems.length });
}
