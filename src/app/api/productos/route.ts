import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { validateProductBody, MAX_PRODUCT_REELS, MAX_PRODUCT_IMAGES } from "@/lib/products";
import { createNotificationMany } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });
  if (!store) return NextResponse.json({ products: [], total: 0 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "100"), 100);
  const skip = Math.max(parseInt(searchParams.get("skip") ?? "0"), 0);

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.product.count({ where: { storeId: store.id, deletedAt: null } }),
  ]);

  return NextResponse.json({ products, total, take, skip });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json();
  const { description, category, subcategory, gender, tags, images, reelUrls, attributes, publishAt } = body;

  const validated = validateProductBody(body);
  if ("error" in validated) return validated.error;
  const {
    name, sanitizedDescription, parsedPrice, parsedComparePrice, parsedCostPrice, parsedFeatured, parsedPrecioMayorista, parsedCantMinMayorista,
    parsedPreciosEscalonados, parsedSoloMayorista, parsedCuotas, normalizedVariants,
    parsedWeightKg, parsedWidthCm, parsedHeightCm, parsedDepthCm,
    parsedOfferBadge, parsedOfferNote, parsedOfferEndsAt,
    parsedSeoTitle, parsedSeoDescription,
  } = validated;

  // Guard de seguridad: escalones y soloMayorista solo aplican a tiendas mayoristas
  // de rubros que lo soportan. Aunque el cliente mande estos campos, los descartamos
  // si la tienda no cumple los requisitos.
  const { getStoreType } = await import("@/lib/storeTypes");
  const storeTypeConfig = getStoreType(store.tipoTienda || "ROPA");
  const isWholesaleStore = store.tieneVentaMayorista && storeTypeConfig.supportsWholesale;
  const safeEscalonados = isWholesaleStore ? JSON.stringify(parsedPreciosEscalonados) : "[]";
  const safeSoloMayorista = isWholesaleStore ? parsedSoloMayorista : false;

  const parsedPublishAt = publishAt ? new Date(publishAt) : null;
  const scheduledInFuture = parsedPublishAt && parsedPublishAt > new Date();

  const product = await prisma.product.create({
    data: {
      name,
      description: sanitizedDescription,
      price: parsedPrice,
      comparePrice: parsedComparePrice,
      costPrice: parsedCostPrice,
      featured: parsedFeatured,
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
      publishAt: parsedPublishAt,
      isActive: scheduledInFuture ? false : true,
      storeId: store.id,
      variants: {
        create: normalizedVariants.map((v) => ({
          name: v.name,
          value: v.value,
          stock: parseInt(v.stock) || 0,
          price: v.price ? parseFloat(v.price) : null,
          sku: v.sku || null,
          lowStockThreshold: v.lowStockThreshold ? parseInt(v.lowStockThreshold) : null,
        })),
      },
    },
    include: { variants: true },
  });

  // Notificar a afiliadas activas sobre el nuevo producto (fire-and-forget)
  if (store.affiliatesEnabled) {
    prisma.affiliate.findMany({
      where: { storeId: store.id, isActive: true },
      select: { userId: true },
    }).then((affiliates) => {
      if (affiliates.length === 0) return;
      createNotificationMany(
        affiliates.map(({ userId }) => ({
          userId,
          type: "NEW_PRODUCT",
          title: `Nuevo producto en ${store.name}`,
          body: `${product.name} — $${parsedPrice.toLocaleString("es-AR")}. ¡Compartilo con tu link!`,
          link: "/afiliados",
        }))
      );
    }).catch((err) => console.error("[notify] new product affiliate notification failed:", err));
  }

  return NextResponse.json({ product });
}
