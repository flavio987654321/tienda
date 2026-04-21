import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: (session.user as any).id },
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({
    where: { ownerId: (session.user as any).id },
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
