import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const cart = await prisma.abandonedCart.findUnique({ where: { id }, select: { storeId: true } });
  if (!cart || cart.storeId !== store.id) {
    return NextResponse.json({ error: "Carrito no encontrado" }, { status: 404 });
  }

  await prisma.abandonedCart.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
