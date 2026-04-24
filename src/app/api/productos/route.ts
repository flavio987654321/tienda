import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });
  if (!store) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
  });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json();
  const { name, description, price, comparePrice, category, subcategory, tags, images, variants, attributes } = body;

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
  if (variants && Array.isArray(variants)) {
    for (const v of variants) {
      if (!v.name || !v.value) {
        return NextResponse.json({ error: "Cada variante debe tener nombre y valor" }, { status: 400 });
      }
      const stock = parseInt(v.stock);
      if (isNaN(stock) || stock < 0) {
        return NextResponse.json({ error: "El stock de variantes debe ser un número >= 0" }, { status: 400 });
      }
    }
  }

  const product = await prisma.product.create({
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
      storeId: store.id,
      variants: {
        create: (variants || []).map((v: any) => ({
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

  return NextResponse.json({ product });
}
