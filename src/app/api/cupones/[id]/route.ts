import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnerStore() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return { error: NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 }) };
  return { storeId: store.id };
}

// PATCH - activar/desactivar
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json();

  const coupon = await prisma.coupon.findFirst({ where: { id, storeId: auth.storeId } });
  if (!coupon) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });

  const updated = await prisma.coupon.update({
    where: { id },
    data: { isActive: body.isActive ?? !coupon.isActive },
  });
  return NextResponse.json({ coupon: updated });
}

// DELETE
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await getOwnerStore();
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  const coupon = await prisma.coupon.findFirst({ where: { id, storeId: auth.storeId } });
  if (!coupon) return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 });

  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
