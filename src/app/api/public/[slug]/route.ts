import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    include: {
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          comparePrice: true,
          images: true,
          category: true,
          subcategory: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!store) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ store });
}
