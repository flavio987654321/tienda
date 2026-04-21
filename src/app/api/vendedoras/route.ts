import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - vendedora: ver tiendas disponibles / dueña: ver sus vendedoras
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  if (mode === "tiendas-disponibles") {
    const stores = await prisma.store.findMany({
      where: { affiliatesEnabled: true, isActive: true },
      include: {
        owner: { select: { name: true } },
        _count: { select: { products: true } },
      },
    });
    return NextResponse.json({ stores });
  }

  // Ver vendedoras de mi tienda
  const store = await prisma.store.findUnique({
    where: { ownerId: (session.user as any).id },
    include: {
      affiliates: {
        include: {
          user: { select: { name: true, email: true } },
          commissions: { orderBy: { createdAt: "desc" }, take: 5 },
          wallet: true,
        },
      },
    },
  });

  return NextResponse.json({ affiliates: store?.affiliates ?? [] });
}

// POST - vendedora se une a una tienda
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { storeId } = await req.json();
  const userId = (session.user as any).id;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || !store.affiliatesEnabled) {
    return NextResponse.json({ error: "Tienda no disponible" }, { status: 400 });
  }

  if (store.ownerId === userId) {
    return NextResponse.json({ error: "No podés ser vendedora de tu propia tienda" }, { status: 400 });
  }

  const existing = await prisma.affiliate.findFirst({
    where: { userId, storeId },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya sos vendedora de esta tienda" }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.create({
    data: {
      userId,
      storeId,
      ownerId: store.ownerId,
      wallet: { create: { balance: 0, totalEarned: 0, totalWithdrawn: 0 } },
    },
  });

  // Actualizar rol del usuario
  await prisma.user.update({
    where: { id: userId },
    data: { role: "SELLER" },
  });

  return NextResponse.json({ affiliate });
}
