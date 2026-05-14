import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotificationMany } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = await req.json();
  const { percentage, category } = body;

  const pct = parseFloat(percentage);
  if (isNaN(pct) || pct === 0 || pct < -99 || pct > 1000) {
    return NextResponse.json({ error: "Porcentaje inválido (entre -99% y 1000%)" }, { status: 400 });
  }

  const where = {
    storeId: store.id,
    ...(category && category !== "all" ? { category } : {}),
  };

  const products = await prisma.product.findMany({ where, select: { id: true, price: true, comparePrice: true } });

  const factor = 1 + pct / 100;
  const updates = products.map((p) =>
    prisma.product.update({
      where: { id: p.id },
      data: {
        price: Math.max(1, Math.round(p.price * factor)),
        ...(p.comparePrice ? { comparePrice: Math.max(1, Math.round(p.comparePrice * factor)) } : {}),
      },
    })
  );

  await prisma.$transaction(updates);

  // Notificar a afiliados activos que hubo un cambio masivo de precios
  if (products.length > 0) {
    const activeAffiliates = await prisma.affiliate.findMany({
      where: { storeId: store.id, isActive: true },
      select: { userId: true },
    });
    if (activeAffiliates.length > 0) {
      const sign = pct > 0 ? "+" : "";
      createNotificationMany(
        activeAffiliates.map(({ userId }) => ({
          userId,
          type: "PRICE_CHANGED",
          title: "Precios actualizados",
          body: `${products.length} producto${products.length !== 1 ? "s" : ""} cambiaron de precio (${sign}${pct}%).`,
          link: "/vendedoras",
        }))
      );
    }
  }

  return NextResponse.json({ updated: products.length });
}
