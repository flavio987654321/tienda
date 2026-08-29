import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateProductBody, MAX_PRODUCT_REELS, MAX_PRODUCT_IMAGES, getOwnerStore } from "@/lib/products";
import { createNotificationMany } from "@/lib/notifications";
import {
  recordStockMovement,
  crossedThresholdDownward,
  wentBackAboveThreshold,
  dispatchLowStockAlerts,
  DEFAULT_LOW_STOCK_THRESHOLD,
  type LowStockItem,
} from "@/lib/stockMovements";

type ProductRouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: ProductRouteContext) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    include: { variants: true, expenses: { orderBy: { createdAt: "asc" } } },
  });

  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, ctx: ProductRouteContext) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const existing = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    select: { id: true, name: true, price: true, variants: { select: { stock: true } } },
  });

  if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json();
  // Sin `description`: lo que se guarda es `sanitizedDescription`, que sale de
  // `validateProductBody`. Igual que en el POST de `productos/route.ts`.
  const { category, subcategory, gender, tags, images, reelUrls, attributes, publishAt } = body;

  const validated = validateProductBody(body);
  if ("error" in validated) return validated.error;
  const {
    name, sanitizedDescription, parsedPrice, parsedComparePrice, parsedCostPrice, parsedPrecioMayorista, parsedCantMinMayorista,
    parsedPreciosEscalonados, parsedSoloMayorista, parsedCuotas, normalizedVariants,
    parsedWeightKg, parsedWidthCm, parsedHeightCm, parsedDepthCm,
    parsedOfferBadge, parsedOfferNote, parsedOfferEndsAt,
    parsedSeoTitle, parsedSeoDescription,
    parsedArchivoPath, parsedArchivoNombre, parsedArchivoPeso,
  } = validated;

  // Guard de seguridad: escalones y soloMayorista solo aplican a tiendas mayoristas.
  // Se consulta la tienda para verificar — getOwnerStore no devuelve estos campos.
  const ownerStore = await prisma.store.findUnique({
    where: { id: auth.storeId },
    select: { tieneVentaMayorista: true, tipoTienda: true },
  });
  const { getStoreType } = await import("@/lib/storeTypes");
  const storeTypeConfigPatch = getStoreType(ownerStore?.tipoTienda || "ROPA");
  const isWholesaleStorePatch = (ownerStore?.tieneVentaMayorista ?? false) && storeTypeConfigPatch.supportsWholesale;
  const safeEscalonados = isWholesaleStorePatch ? JSON.stringify(parsedPreciosEscalonados) : "[]";
  const safeSoloMayorista = isWholesaleStorePatch ? parsedSoloMayorista : false;

  /* Mismo freno que en el alta: editar tampoco puede dejar un producto digital
     sin archivo. Sin esto, se creaba con archivo y se le sacaba después. */
  if (storeTypeConfigPatch.requiereArchivo && !parsedArchivoPath) {
    return NextResponse.json(
      { error: "Subí el archivo que se va a descargar el comprador." },
      { status: 400 }
    );
  }

  const parsedPublishAt = publishAt !== undefined ? (publishAt ? new Date(publishAt) : null) : undefined;
  const scheduledInFuture = parsedPublishAt && parsedPublishAt > new Date();

  const lowStockItems: LowStockItem[] = [];

  const product = await prisma.$transaction(async (tx) => {
    // Cargar variantes existentes para hacer merge en lugar de borrar y recrear
    const existingVariants = await tx.productVariant.findMany({ where: { productId: id } });

    // Variantes que ya no están en la nueva lista
    const incomingKeys = new Set(
      normalizedVariants.map((v) => `${v.name.toLowerCase()}||${v.value.toLowerCase()}`)
    );
    const toRemove = existingVariants.filter(
      (ev) => !incomingKeys.has(`${ev.name.toLowerCase()}||${ev.value.toLowerCase()}`)
    );

    // Una sola query para saber cuáles de las variantes a remover tienen pedidos,
    // en vez de una consulta por variante dentro del loop.
    const variantIdsWithOrders = new Set(
      toRemove.length > 0
        ? (
            await tx.orderItem.findMany({
              where: { variantId: { in: toRemove.map((v) => v.id) } },
              select: { variantId: true },
              distinct: ["variantId"],
            })
          ).map((o) => o.variantId)
        : []
    );

    // Verificar cuáles tienen pedidos asociados — esas no se pueden borrar
    for (const variant of toRemove) {
      const usedInOrder = variantIdsWithOrders.has(variant.id);
      if (usedInOrder) {
        // Tiene pedidos: solo zeramos el stock para que no aparezca como disponible
        if (variant.stock !== 0) {
          const threshold = variant.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
          const crossedDown = crossedThresholdDownward(variant.stock, 0, threshold);
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: 0, ...(crossedDown && !variant.lowStockAlertSentAt ? { lowStockAlertSentAt: new Date() } : {}) },
          });
          await recordStockMovement(tx, {
            variantId: variant.id,
            productId: id,
            delta: -variant.stock,
            stockBefore: variant.stock,
            stockAfter: 0,
            type: "PRODUCT_EDIT",
            changedBy: auth.ownerId,
          });
          // Acá el stock SIEMPRE termina en 0 viniendo de más de 0 (lo garantiza el
          // `variant.stock !== 0` de arriba), así que es una transición a cero y se
          // avisa siempre. Con la regla del cruce, una variante parada justo en el
          // umbral —5, el valor por defecto— daba `5 > 5` = false y se apagaba en
          // silencio.
          lowStockItems.push({ productId: id, name, variant: variant.value, stock: 0 });
        }
      } else {
        await tx.productVariant.delete({ where: { id: variant.id } });
      }
    }

    // Upsert de las variantes entrantes: update si existe por name+value, create si es nueva
    for (const v of normalizedVariants) {
      const existing = existingVariants.find(
        (ev) =>
          ev.name.toLowerCase() === v.name.toLowerCase() &&
          ev.value.toLowerCase() === v.value.toLowerCase()
      );
      const newStock = parseInt(v.stock) || 0;
      const newThreshold = v.lowStockThreshold ? parseInt(v.lowStockThreshold) : null;
      const variantData = {
        name: v.name,
        value: v.value,
        stock: newStock,
        price: v.price ? parseFloat(v.price) : null,
        sku: v.sku || null,
        lowStockThreshold: newThreshold,
      };
      if (existing) {
        const threshold = newThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
        const crossedDown = crossedThresholdDownward(existing.stock, newStock, threshold);
        const crossedUp = wentBackAboveThreshold(existing.stock, newStock, threshold);
        await tx.productVariant.update({
          where: { id: existing.id },
          data: {
            ...variantData,
            ...(crossedDown && !existing.lowStockAlertSentAt ? { lowStockAlertSentAt: new Date() } : {}),
            ...(crossedUp ? { lowStockAlertSentAt: null } : {}),
          },
        });
        if (existing.stock !== newStock) {
          await recordStockMovement(tx, {
            variantId: existing.id,
            productId: id,
            delta: newStock - existing.stock,
            stockBefore: existing.stock,
            stockAfter: newStock,
            type: "PRODUCT_EDIT",
            changedBy: auth.ownerId,
          });
        }
        // Misma regla que el resto del sistema: llegar a CERO se mide como
        // transición (tenía algo → no tiene nada) y no depende de haber avisado
        // antes; "stock bajo" sigue midiéndose por cruce de umbral y sólo mientras
        // todavía quede algo. Sin el `newStock > 0` en la segunda, bajar de 10 a 0
        // metía la misma variante dos veces en la lista.
        const llegoACero = existing.stock > 0 && newStock === 0;
        if (llegoACero) {
          lowStockItems.push({ productId: id, name, variant: v.value, stock: 0 });
        } else if (crossedDown && newStock > 0 && !existing.lowStockAlertSentAt) {
          lowStockItems.push({ productId: id, name, variant: v.value, stock: newStock });
        }
      } else {
        // Variante recién creada: no hay un "antes" con el que comparar, así que
        // no corresponde alertar acá — si ya nace baja, se alertará en el próximo
        // movimiento real que la haga cruzar el umbral (ver crossedThresholdDownward).
        const created = await tx.productVariant.create({ data: { ...variantData, productId: id } });
        if (newStock > 0) {
          await recordStockMovement(tx, {
            variantId: created.id,
            productId: id,
            delta: newStock,
            stockBefore: 0,
            stockAfter: newStock,
            type: "PRODUCT_EDIT",
            changedBy: auth.ownerId,
          });
        }
      }
    }

    return tx.product.update({
      where: { id },
      data: {
        name,
        description: sanitizedDescription,
        price: parsedPrice,
        comparePrice: parsedComparePrice,
        costPrice: parsedCostPrice,
        category: category || "general",
        subcategory: subcategory || null,
        gender: gender || "unisex",
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        images: JSON.stringify(Array.isArray(images) ? images.slice(0, MAX_PRODUCT_IMAGES) : []),
        reelUrls: JSON.stringify(Array.isArray(reelUrls) ? reelUrls.slice(0, MAX_PRODUCT_REELS) : []),
        attributes: JSON.stringify(Array.isArray(attributes) ? attributes : []),
        precioMayorista: parsedPrecioMayorista,
        cantMinMayorista: parsedCantMinMayorista,
        preciosEscalonados: safeEscalonados,
        soloMayorista: safeSoloMayorista,
        offerBadge: parsedOfferBadge,
        offerNote: parsedOfferNote,
        offerEndsAt: parsedOfferEndsAt,
        cuotas: parsedCuotas,
        weightKg: parsedWeightKg,
        widthCm: parsedWidthCm,
        heightCm: parsedHeightCm,
        depthCm: parsedDepthCm,
        seoTitle: parsedSeoTitle,
        seoDescription: parsedSeoDescription,
        archivoPath: parsedArchivoPath,
        archivoNombre: parsedArchivoNombre,
        archivoPeso: parsedArchivoPeso,
        ...(parsedPublishAt !== undefined
          ? { publishAt: parsedPublishAt, ...(scheduledInFuture ? { isActive: false } : {}) }
          : {}),
      },
      include: { variants: true },
    });
  }, { timeout: 30000 });

  // Notificar a afiliados activos si cambió el precio o quedó sin stock
  const priceChanged = existing.price !== parsedPrice;
  const oldTotalStock = existing.variants.reduce((s, v) => s + v.stock, 0);
  const newTotalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const wentOutOfStock = oldTotalStock > 0 && newTotalStock === 0;
  const wentBackInStock = oldTotalStock === 0 && newTotalStock > 0;

  // Este endpoint es el único que ya tenía aviso propio de "sin stock", y es a
  // nivel PRODUCTO (más abajo, con el nombre adentro). Si además se dejara pasar
  // el aviso por VARIANTE en cero, agotar un producto de un solo talle mandaba dos
  // notificaciones por el mismo hecho. Cuando el producto entero se agota manda el
  // de abajo, que es más claro; las variantes en cero sólo se avisan si el producto
  // todavía tiene stock en otro talle o color —ahí sí es información nueva—.
  const avisosDeStock = wentOutOfStock
    ? lowStockItems.filter((i) => i.stock > 0)
    : lowStockItems;

  // Sin email: el stock lo cambió la dueña editando este producto.
  if (avisosDeStock.length > 0) {
    dispatchLowStockAlerts(auth.ownerId, auth.storeId, avisosDeStock, { loHizoElDueno: true }).catch((err) =>
      console.error("[stock] dispatchLowStockAlerts failed:", err)
    );
  }

  if (priceChanged || wentOutOfStock || wentBackInStock) {
    const activeAffiliates = await prisma.affiliate.findMany({
      where: { storeId: auth.storeId, isActive: true },
      select: { userId: true },
    });

    const notifs = activeAffiliates.flatMap(({ userId }) => {
      const result = [];
      if (priceChanged) {
        result.push({
          userId,
          type: "PRICE_CHANGED",
          title: `Precio actualizado: ${product.name}`,
          body: `Nuevo precio: $${parsedPrice.toLocaleString("es-AR")}`,
          link: "/afiliados",
        });
      }
      if (wentOutOfStock) {
        result.push({
          userId,
          type: "OUT_OF_STOCK",
          title: `Sin stock: ${product.name}`,
          body: "Este producto ya no tiene stock disponible.",
          link: "/afiliados",
        });
      }
      if (wentBackInStock) {
        result.push({
          userId,
          type: "RESTOCK",
          title: `¡Volvió el stock! ${product.name}`,
          body: `Ya hay ${newTotalStock} unidades disponibles. ¡Momento ideal para compartirlo!`,
          link: "/afiliados",
        });
      }
      return result;
    });

    if (notifs.length > 0) createNotificationMany(notifs);

    if (wentOutOfStock) {
      createNotificationMany([{
        userId: auth.ownerId,
        type: "OUT_OF_STOCK",
        title: `Sin stock: ${product.name}`,
        body: "Revisá el inventario y actualizá el stock.",
        link: "/dashboard/productos",
      }]);
    }
  }

  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, ctx: ProductRouteContext) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const exists = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId, deletedAt: null },
    select: { id: true },
  });

  if (!exists) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  return NextResponse.json({ ok: true });
}
