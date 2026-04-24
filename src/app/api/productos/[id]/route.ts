import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

type ProductRouteContext = RouteContext<"/api/productos/[id]">;
const SINGLE_VARIANT_FALLBACK_VALUE = "Unico";

function normalizeVariants(input: unknown) {
  if (!Array.isArray(input)) return [];

  const variants = input
    .map((variant) => ({
      name: typeof variant?.name === "string" ? variant.name.trim() : "",
      value: typeof variant?.value === "string" ? variant.value.trim() : "",
      stock: typeof variant?.stock === "string" ? variant.stock.trim() : String(variant?.stock ?? ""),
      price: typeof variant?.price === "string" ? variant.price.trim() : String(variant?.price ?? ""),
      sku: typeof variant?.sku === "string" ? variant.sku.trim() : "",
    }))
    .filter((variant) => variant.name || variant.value || variant.stock || variant.price || variant.sku);

  if (variants.length === 1 && !variants[0].value) {
    variants[0].value = SINGLE_VARIANT_FALLBACK_VALUE;
  }

  return variants;
}

async function getOwnerStoreId() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (!store) return { error: NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 }) };
  return { storeId: store.id };
}

export async function GET(_req: NextRequest, ctx: ProductRouteContext) {
  const auth = await getOwnerStoreId();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId },
    include: { variants: true },
  });

  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, ctx: ProductRouteContext) {
  const auth = await getOwnerStoreId();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = await prisma.product.findFirst({
    where: { id, storeId: auth.storeId },
    select: { id: true },
  });

  if (!existing) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json();
  const { name, description, price, comparePrice, category, subcategory, tags, images, variants, attributes } = body;
  const normalizedVariants = normalizeVariants(variants);

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre requerido (mínimo 2 caracteres)" }, { status: 400 });
  }
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return NextResponse.json({ error: "El precio debe ser un número mayor a 0" }, { status: 400 });
  }
  const parsedComparePrice = comparePrice ? parseFloat(comparePrice) : null;
  if (comparePrice && (isNaN(parsedComparePrice!) || parsedComparePrice! <= 0)) {
    return NextResponse.json({ error: "El precio tachado debe ser un número mayor a 0" }, { status: 400 });
  }
  if (normalizedVariants.length > 0) {
    for (const v of normalizedVariants) {
      if (!v.name || !v.value) {
        return NextResponse.json({ error: "Cada variante debe tener nombre y valor" }, { status: 400 });
      }
      const stock = parseInt(v.stock);
      if (isNaN(stock) || stock < 0) {
        return NextResponse.json({ error: "El stock de variantes debe ser un número >= 0" }, { status: 400 });
      }
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    await tx.productVariant.deleteMany({ where: { productId: id } });

    return tx.product.update({
      where: { id },
      data: {
        name: name.trim(),
        description,
        price: parsedPrice,
        comparePrice: parsedComparePrice,
        category: category || "general",
        subcategory: subcategory || null,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        images: JSON.stringify(Array.isArray(images) ? images : []),
        attributes: JSON.stringify(Array.isArray(attributes) ? attributes : []),
        variants: {
          create: normalizedVariants.map((v) => ({
            name: v.name,
            value: v.value,
            stock: parseInt(v.stock) || 0,
            price: v.price ? parseFloat(v.price) : null,
            sku: v.sku || null,
          })),
        },
      },
      include: { variants: true },
    });
  });

  return NextResponse.json({ product });
}
