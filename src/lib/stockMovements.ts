import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotificationMany } from "@/lib/notifications";
import { sendLowStockEmail } from "@/lib/email";

type TxClient = Prisma.TransactionClient;

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StockMovementType =
  | "MANUAL"
  | "SALE"
  | "CANCELLATION"
  | "BULK_ADJUST"
  | "PRODUCT_EDIT";

export type LowStockItem = { name: string; variant: string; stock: number };

export async function recordStockMovement(
  tx: TxClient,
  params: {
    variantId: string;
    productId: string;
    delta: number;
    stockBefore: number;
    stockAfter: number;
    type: StockMovementType;
    changedBy: string;
    reason?: string | null;
  }
) {
  return tx.stockMovement.create({
    data: { ...params, reason: params.reason ?? null },
  });
}

export function crossedThresholdDownward(
  before: number,
  after: number,
  threshold: number
): boolean {
  return before > threshold && after <= threshold;
}

export function wentBackAboveThreshold(
  before: number,
  after: number,
  threshold: number
): boolean {
  return before <= threshold && after > threshold;
}

export async function notifyOwnerLowStock(ownerId: string, items: LowStockItem[]) {
  if (items.length === 0) return;
  const outOfStock = items.filter((i) => i.stock === 0);
  const title =
    outOfStock.length === items.length
      ? `Sin stock: ${items.length} producto${items.length !== 1 ? "s" : ""}`
      : `Stock bajo: ${items.length} producto${items.length !== 1 ? "s" : ""}`;
  const body = items
    .slice(0, 3)
    .map((i) => `${i.name} (${i.variant}): ${i.stock} u.`)
    .join(", ") + (items.length > 3 ? "…" : "");
  return createNotificationMany([
    { userId: ownerId, type: "LOW_STOCK", title, body, link: "/dashboard/productos" },
  ]);
}

/**
 * Punto único de salida para los avisos de stock bajo (notificación + email),
 * usado por los 4 endpoints que pueden disparar una alerta. Centralizarlo evita
 * que cada endpoint repita el fetch de owner/store y se desincronice del resto.
 */
export async function dispatchLowStockAlerts(
  ownerId: string,
  storeId: string,
  items: LowStockItem[]
) {
  if (items.length === 0) return;
  const [owner, store] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { email: true, name: true } }),
    prisma.store.findUnique({ where: { id: storeId }, select: { name: true } }),
  ]);

  await notifyOwnerLowStock(ownerId, items).catch((err) =>
    console.error("[notify] notifyOwnerLowStock failed:", err)
  );

  if (owner?.email) {
    await sendLowStockEmail({
      ownerEmail: owner.email,
      ownerName: owner.name || "vendedora",
      storeName: store?.name || "tu tienda",
      products: items,
    }).catch((err) => console.error("[email] sendLowStockEmail failed:", err));
  }
}

/**
 * Aplica un cambio de stock a una variante de forma atómica: lee el stock actual
 * DENTRO de la transacción y solo escribe si nadie lo cambió desde esa lectura
 * (optimistic concurrency control vía updateMany con guard sobre el valor leído).
 * Si otra operación concurrente ya modificó el stock, devuelve null — el caller
 * decide si reintenta o lo ignora, en vez de pisar silenciosamente el otro cambio.
 */
export async function applyVariantStockChange(
  tx: TxClient,
  params: {
    variantId: string;
    productId: string;
    productName: string;
    variantValue: string;
    mode: "set" | "delta";
    value: number;
    type: StockMovementType;
    changedBy: string;
    reason?: string | null;
  }
): Promise<{ stockBefore: number; stockAfter: number; lowStockItem: LowStockItem | null } | null> {
  const current = await tx.productVariant.findUnique({
    where: { id: params.variantId },
    select: { stock: true, lowStockThreshold: true, lowStockAlertSentAt: true },
  });
  if (!current) return null;

  const stockBefore = current.stock;
  const rawNewStock = params.mode === "set" ? params.value : stockBefore + params.value;
  const stockAfter = Math.max(0, rawNewStock);

  if (stockAfter === stockBefore) {
    return { stockBefore, stockAfter, lowStockItem: null };
  }

  const threshold = current.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  const crossedDown = crossedThresholdDownward(stockBefore, stockAfter, threshold);
  const crossedUp = wentBackAboveThreshold(stockBefore, stockAfter, threshold);

  // CAS: solo aplica si el stock sigue siendo el que acabamos de leer. Si otra
  // transacción ya lo cambió mientras tanto, count === 0 y no pisamos nada.
  const guarded = await tx.productVariant.updateMany({
    where: { id: params.variantId, stock: stockBefore },
    data: {
      stock: stockAfter,
      ...(crossedDown ? { lowStockAlertSentAt: new Date() } : {}),
      ...(crossedUp ? { lowStockAlertSentAt: null } : {}),
    },
  });
  if (guarded.count === 0) return null;

  await recordStockMovement(tx, {
    variantId: params.variantId,
    productId: params.productId,
    delta: stockAfter - stockBefore,
    stockBefore,
    stockAfter,
    type: params.type,
    changedBy: params.changedBy,
    reason: params.reason ?? null,
  });

  const lowStockItem: LowStockItem | null =
    crossedDown && !current.lowStockAlertSentAt
      ? { name: params.productName, variant: params.variantValue, stock: stockAfter }
      : null;

  return { stockBefore, stockAfter, lowStockItem };
}
