import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { validateProductBody, MAX_PRODUCT_REELS } from "@/lib/products";

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
      where: { storeId: store.id },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.product.count({ where: { storeId: store.id } }),
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
  const { description, category, subcategory, tags, images, reelUrls, attributes } = body;

  const validated = validateProductBody(body);
  if ("error" in validated) return validated.error;
  const { name, parsedPrice, parsedComparePrice, parsedPrecioMayorista, parsedCantMinMayorista, normalizedVariants } = validated;

  const product = await prisma.product.create({
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
      storeId: store.id,
      variants: {
        create: normalizedVariants.map((v) => ({
          name: v.name,
          value: v.value,
          stock: parseInt(v.stock) || 0,
          price: v.price ? parseFloat(v.price) : null,
          sku: v.sku || null,
        })),
      },
    } as any,
    include: { variants: true },
  });

  return NextResponse.json({ product });
}
