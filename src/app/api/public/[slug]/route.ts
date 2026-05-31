import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [store, currentUser] = await Promise.all([
    prisma.store.findFirst({
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
            gender: true,
            variants: {
              select: { id: true, name: true, value: true, stock: true, price: true },
              orderBy: { id: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        },
      },
    }),
    getCurrentUser(),
  ]);
  if (!store) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const isOwner = !!currentUser && currentUser.id === store.ownerId;
  return NextResponse.json({ store, isOwner });
}
