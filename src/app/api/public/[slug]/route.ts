import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    include: {
      products: {
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          comparePrice: true,
          precioMayorista: true,
          cantMinMayorista: true,
          images: true,
          category: true,
          subcategory: true,
          reelUrls: true,
          variants: {
            select: { id: true, name: true, value: true, stock: true, price: true },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      },
    },
  });
  if (!store) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ store });
}
