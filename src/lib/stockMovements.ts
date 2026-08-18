import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotificationMany } from "@/lib/notifications";
import { sendLowStockEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

type TxClient = Prisma.TransactionClient;

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StockMovementType =
  | "MANUAL"
  | "SALE"
  | "CANCELLATION"
  | "BULK_ADJUST"
  | "PRODUCT_EDIT";

// `productId` está para que la notificación pueda linkear al producto exacto. Sin
// él, el aviso mandaba a la lista filtrada por "sin stock" — y ese filtro mira el
// TOTAL del producto, no la variante. Un pantalón con Gris/32 en cero pero 10
// unidades entre los otros talles no entraba en el filtro: se avisaba de algo que
// después no aparecía en pantalla.
export type LowStockItem = { productId: string; name: string; variant: string; stock: number };

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

const resumenItems = (items: LowStockItem[]) =>
  items.slice(0, 3).map((i) => `${i.name} (${i.variant}): ${i.stock} u.`).join(", ") +
  (items.length > 3 ? "…" : "");

/**
 * El texto del aviso de "sin stock", en un solo lugar.
 *
 * Lo usan la campanita del panel y la notificación que suena en el teléfono. Si
 * cada una armara su frase, un día dirían cosas distintas para el mismo hecho.
 */
function avisoSinStock(items: LowStockItem[]) {
  return {
    title: `Sin stock: ${items.length} producto${items.length !== 1 ? "s" : ""}`,
    body: `${resumenItems(items)} — no se pueden vender hasta reponer.`,
    link: `/dashboard/productos?destacar=${[...new Set(items.map((i) => i.productId))].join(",")}`,
  };
}

/**
 * Quedarse SIN stock y tener stock BAJO son dos avisos distintos, no uno con dos
 * títulos. Antes iban juntos como `LOW_STOCK`, y encima el aviso de cero casi
 * nunca llegaba: sólo lo emitía el PUT de editar producto, así que agotarse
 * vendiendo, desde el modal de stock o desde el ajuste en masa no avisaba nada.
 *
 * Van separados porque no piden lo mismo: "bajo" es "reponé cuando puedas",
 * "sin stock" es "esto ya no se puede vender". Mezclarlos hacía que el segundo
 * se perdiera adentro del primero.
 */
export async function notifyOwnerLowStock(ownerId: string, items: LowStockItem[]) {
  if (items.length === 0) return;
  const sinStock = items.filter((i) => i.stock === 0);
  const bajos    = items.filter((i) => i.stock > 0);

  // El link señala los productos por id en vez de aplicar un filtro. El filtro
  // escondía justamente lo que se venía a mostrar (ver el comentario de
  // `LowStockItem`), y además, aunque acertara, dejaba una lista de productos todos
  // iguales sin marcar cuál era el del aviso.
  const linkA = (items: LowStockItem[]) =>
    `/dashboard/productos?destacar=${[...new Set(items.map((i) => i.productId))].join(",")}`;

  const notifs: { userId: string; type: string; title: string; body: string; link: string }[] = [];

  if (sinStock.length > 0) {
    notifs.push({ userId: ownerId, type: "OUT_OF_STOCK", ...avisoSinStock(sinStock) });
  }
  if (bajos.length > 0) {
    notifs.push({
      userId: ownerId,
      type: "LOW_STOCK",
      title: `Stock bajo: ${bajos.length} producto${bajos.length !== 1 ? "s" : ""}`,
      body: resumenItems(bajos),
      link: linkA(bajos),
    });
  }

  return createNotificationMany(notifs);
}

/**
 * Punto único de salida para los avisos de stock (campanita + email + teléfono),
 * usado por todos los endpoints que pueden disparar una alerta. Centralizarlo evita
 * que cada endpoint repita el fetch de owner/store y se desincronice del resto — y
 * es lo que hizo que sumar el aviso al teléfono fuera una sola línea acá en vez de
 * cinco parches repartidos.
 *
 * `loHizoElDueno` distingue quién provocó el cambio, que es lo que decide si vale
 * la pena salir del panel para avisar:
 *
 *   - Una VENTA la dueña no la ve venir → campanita + email + push si quedó en 0.
 *   - Un ajuste que hizo ELLA (el modal de stock, el ajuste en masa, editar el
 *     producto) lo acaba de hacer con la pantalla delante → sólo campanita. Sin
 *     esto, un "fijar todo en 0" de fin de temporada le mandaba un mail —y ahora
 *     le haría sonar el teléfono— avisándole de algo que decidió dos segundos antes.
 *
 * La campanita queda siempre: sirve de registro de qué se quedó sin stock y cuándo.
 */
export async function dispatchLowStockAlerts(
  ownerId: string,
  storeId: string,
  items: LowStockItem[],
  opciones: { loHizoElDueno?: boolean } = {}
) {
  if (items.length === 0) return;
  /* La opción se llamaba `email` y decidía solo si mandar el mail. Pero lo que
     en realidad distingue es OTRA cosa: si el cambio de stock lo hizo el dueño
     con sus propias manos —editando un producto, el ajuste en masa, el modal de
     stock— o si se lo causó una venta.
     Ahora que además suena el teléfono, esa diferencia pasó a importar mucho
     más: avisarle por push "te quedaste sin stock" a quien acaba de escribir un
     cero en la pantalla que está mirando es ruido puro, y el ruido termina en
     que silencia las notificaciones y se pierde también las de pedidos.
     El valor por defecto es "no lo hizo el dueño", que es el caso de las ventas:
     ahí sí hay que avisar por todos los canales. */
  const { loHizoElDueno = false } = opciones;
  const avisarPorFuera = !loHizoElDueno;

  const [owner, store] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { email: true, name: true } }),
    avisarPorFuera
      ? prisma.store.findUnique({ where: { id: storeId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  await notifyOwnerLowStock(ownerId, items).catch((err) =>
    console.error("[notify] notifyOwnerLowStock failed:", err)
  );

  /* Al teléfono va SOLO el agotado, y solo si lo causó una venta.
     "Stock bajo" queda en la campanita a propósito: es un "reponé cuando
     puedas", y si suena por cada producto que cruza el umbral, en dos semanas
     el comerciante silencia la app y deja de ver los avisos de pedidos, que son
     los que le hacen ganar plata. Agotado es otra cosa: cada minuto que pasa
     son ventas que no puede tomar. */
  const sinStock = items.filter((i) => i.stock === 0);
  if (avisarPorFuera && sinStock.length > 0) {
    const { title, body, link } = avisoSinStock(sinStock);
    await sendPushToUser(ownerId, { title, body, url: link }).catch((err) =>
      console.error("[push] aviso de sin stock falló:", err)
    );
  }

  if (avisarPorFuera && owner?.email) {
    await sendLowStockEmail({
      ownerEmail: owner.email,
      ownerName: owner.name || "vendedor",
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
): Promise<{
  stockBefore: number;
  stockAfter: number;
  lowStockItem: LowStockItem | null;
  outOfStockItem: LowStockItem | null;
} | null> {
  const current = await tx.productVariant.findUnique({
    where: { id: params.variantId },
    select: { stock: true, lowStockThreshold: true, lowStockAlertSentAt: true },
  });
  if (!current) return null;

  const stockBefore = current.stock;
  const rawNewStock = params.mode === "set" ? params.value : stockBefore + params.value;
  const stockAfter = Math.max(0, rawNewStock);

  // Sin cambio real no hay nada que avisar. También sirve de anti-repetición del
  // aviso de cero: si ya estaba en 0 y se vuelve a fijar en 0, se sale por acá.
  if (stockAfter === stockBefore) {
    return { stockBefore, stockAfter, lowStockItem: null, outOfStockItem: null };
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

  const item: LowStockItem = {
    productId: params.productId,
    name: params.productName,
    variant: params.variantValue,
    stock: stockAfter,
  };

  // Llegar a CERO se mide como transición (tenía algo → no tiene nada), no como
  // cruce de umbral. El cruce fallaba justo en el caso más común: una variante
  // parada en 5 —que es el umbral por defecto— puesta en 0 daba `5 > 5` = false y
  // no avisaba nunca. Y tampoco depende de `lowStockAlertSentAt`: haber avisado
  // "quedan 3" no puede tapar el aviso de que ya no queda ninguno.
  const outOfStockItem = stockBefore > 0 && stockAfter === 0 ? item : null;

  // "Bajo" es sólo mientras todavía queda algo. Sin el `stockAfter > 0`, una caída
  // de 10 a 0 emitía los dos avisos por la misma variante y el email la listaba
  // dos veces.
  const lowStockItem =
    crossedDown && stockAfter > 0 && !current.lowStockAlertSentAt ? item : null;

  return { stockBefore, stockAfter, lowStockItem, outOfStockItem };
}
