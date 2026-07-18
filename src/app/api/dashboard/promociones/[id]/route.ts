import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { validatePromotionBody } from "@/lib/promotions";

// Confirma que la promo existe Y es de la tienda del usuario. Sin esto, cualquiera
// con el id editaría promos de otra tienda.
async function getOwnedPromotion(userId: string, id: string) {
  const store = await prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (!store) return null;
  const promo = await prisma.storePromotion.findFirst({ where: { id, storeId: store.id } });
  return promo;
}

// PATCH — editar campos, pausar/activar (isActive), o archivar (archive:true).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const promo = await getOwnedPromotion(user.id, id);
  if (!promo) return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Acciones simples (toggle / archivar / desarchivar) — no revalidan todo el cuerpo.
  if (typeof body.isActive === "boolean" && Object.keys(body).length === 1) {
    const updated = await prisma.storePromotion.update({ where: { id }, data: { isActive: body.isActive } });
    return NextResponse.json({ promotion: updated });
  }
  if (body.archive === true) {
    const updated = await prisma.storePromotion.update({ where: { id }, data: { archivedAt: new Date(), isActive: false } });
    return NextResponse.json({ promotion: updated });
  }
  if (body.archive === false) {
    const updated = await prisma.storePromotion.update({ where: { id }, data: { archivedAt: null } });
    return NextResponse.json({ promotion: updated });
  }

  // Edición completa — revalida con las mismas reglas de coherencia que la creación.
  const result = validatePromotionBody(body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const d = result.data;

  const updated = await prisma.storePromotion.update({
    where: { id },
    data: {
      name: d.name,
      type: d.type,
      value: d.value,
      minQty: d.minQty,
      payQty: d.payQty,
      minOrderAmount: d.minOrderAmount,
      scope: d.scope,
      categories: JSON.stringify(d.categories),
      productIds: JSON.stringify(d.productIds),
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      combinesWithCoupons: d.combinesWithCoupons,
      combinesWithPromotions: d.combinesWithPromotions,
    },
  });

  return NextResponse.json({ promotion: updated });
}

// DELETE — solo permitido si la promo NUNCA se usó (cero ventas). Si ya vendió, se
// archiva (PATCH archive:true), no se borra: los pedidos guardan por qué tuvieron
// ese precio. Como todavía no hay vínculo Order↔promoción, hoy toda promo se puede
// borrar; el guard queda listo para cuando el checkout registre la promo aplicada.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const promo = await getOwnedPromotion(user.id, id);
  if (!promo) return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });

  await prisma.storePromotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
