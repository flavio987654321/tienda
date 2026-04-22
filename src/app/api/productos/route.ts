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
  const { name, description, price, comparePrice, category, tags, images, variants } = body;

  if (!name || !price) {
    return NextResponse.json({ error: "Nombre y precio son requeridos" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : null,
      category: category || "general",
      tags: JSON.stringify(tags || []),
      images: JSON.stringify(images || []),
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
