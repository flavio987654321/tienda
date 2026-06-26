import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateProductBody, MAX_PRODUCT_REELS, getOwnerStore } from "@/lib/products";
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
    include: { variants: true },
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
  const { description, category, subcategory, gender, tags, images, reelUrls, attributes, publishAt } = body;

  const validated = validateProductBody(body);
  if ("error" in validated) return validated.error;
  const {
    name, parsedPrice, parsedComparePrice, parsedFeatured, parsedPrecioMayorista, parsedCantMinMayorista, parsedCuotas, normalizedVariants,
    parsedWeightKg, parsedWidthCm, parsedHeightCm, parsedDepthCm,
  } = validated;

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
          if (crossedDown && !variant.lowStockAlertSentAt) {
            lowStockItems.push({ name, variant: variant.value, stock: 0 });
          }
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
        if (crossedDown && !existing.lowStockAlertSentAt) {
          lowStockItems.push({ name, variant: v.value, stock: newStock });
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
        description,
        price: parsedPrice,
        comparePrice: parsedComparePrice,
        featured: parsedFeatured,
        category: category || "general",
        subcategory: subcategory || null,
        gender: gender || "unisex",
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        images: JSON.stringify(Array.isArray(images) ? images : []),
        reelUrls: JSON.stringify(Array.isArray(reelUrls) ? reelUrls.slice(0, MAX_PRODUCT_REELS) : []),
        attributes: JSON.stringify(Array.isArray(attributes) ? attributes : []),
        precioMayorista: parsedPrecioMayorista,
        cantMinMayorista: parsedCantMinMayorista,
        cuotas: parsedCuotas,
        weightKg: parsedWeightKg,
        widthCm: parsedWidthCm,
        heightCm: parsedHeightCm,
        depthCm: parsedDepthCm,
        ...(parsedPublishAt !== undefined
          ? { publishAt: parsedPublishAt, ...(scheduledInFuture ? { isActive: false } : {}) }
          : {}),
      },
      include: { variants: true },
    });
  });

  if (lowStockItems.length > 0) {
    dispatchLowStockAlerts(auth.ownerId, auth.storeId, lowStockItems).catch((err) =>
      console.error("[stock] dispatchLowStockAlerts failed:", err)
    );
  }

  // Notificar a afiliados activos si cambió el precio o quedó sin stock
  const priceChanged = existing.price !== parsedPrice;
  const oldTotalStock = existing.variants.reduce((s, v) => s + v.stock, 0);
  const newTotalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const wentOutOfStock = oldTotalStock > 0 && newTotalStock === 0;
  const wentBackInStock = oldTotalStock === 0 && newTotalStock > 0;

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
