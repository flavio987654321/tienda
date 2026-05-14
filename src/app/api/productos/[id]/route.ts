import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateProductBody, normalizeVariants, MAX_PRODUCT_REELS, getOwnerStore } from "@/lib/products";
import { createNotificationMany } from "@/lib/notifications";

type ProductRouteContext = RouteContext<"/api/productos/[id]">;

export async function GET(_req: NextRequest, ctx: ProductRouteContext) {
  const auth = await getOwnerStore();
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId },
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
    where: { id, storeId: auth.storeId },
    select: { id: true, name: true, price: true, variants: { select: { stock: true } } },
  });

  if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json();
  const { description, category, subcategory, tags, images, reelUrls, attributes } = body;

  const validated = validateProductBody(body);
  if ("error" in validated) return validated.error;
  const { name, parsedPrice, parsedComparePrice, parsedPrecioMayorista, parsedCantMinMayorista, normalizedVariants } = validated;

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

    // Verificar cuáles tienen pedidos asociados — esas no se pueden borrar
    for (const variant of toRemove) {
      const usedInOrder = await tx.orderItem.findFirst({ where: { variantId: variant.id } });
      if (usedInOrder) {
        // Tiene pedidos: solo zeramos el stock para que no aparezca como disponible
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: 0 } });
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
      const variantData = {
        name: v.name,
        value: v.value,
        stock: parseInt(v.stock) || 0,
        price: v.price ? parseFloat(v.price) : null,
        sku: v.sku || null,
      };
      if (existing) {
        await tx.productVariant.update({ where: { id: existing.id }, data: variantData });
      } else {
        await tx.productVariant.create({ data: { ...variantData, productId: id } });
      }
    }

    return tx.product.update({
      where: { id },
      data: {
        name,
        description,
        price: parsedPrice,
        comparePrice: parsedComparePrice,
        category: category || "general",
        subcategory: subcategory || null,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        images: JSON.stringify(Array.isArray(images) ? images : []),
        reelUrls: JSON.stringify(Array.isArray(reelUrls) ? reelUrls.slice(0, MAX_PRODUCT_REELS) : []),
        attributes: JSON.stringify(Array.isArray(attributes) ? attributes : []),
        precioMayorista: parsedPrecioMayorista,
        cantMinMayorista: parsedCantMinMayorista,
      } as any,
      include: { variants: true },
    });
  });

  // Notificar a afiliados activos si cambió el precio o quedó sin stock
  const priceChanged = existing.price !== parsedPrice;
  const oldTotalStock = existing.variants.reduce((s, v) => s + v.stock, 0);
  const newTotalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const wentOutOfStock = oldTotalStock > 0 && newTotalStock === 0;

  if (priceChanged || wentOutOfStock) {
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
          link: "/vendedoras",
        });
      }
      if (wentOutOfStock) {
        result.push({
          userId,
          type: "OUT_OF_STOCK",
          title: `Sin stock: ${product.name}`,
          body: "Este producto ya no tiene stock disponible.",
          link: "/vendedoras",
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
