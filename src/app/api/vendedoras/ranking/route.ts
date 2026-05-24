import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) return NextResponse.json({ error: "storeId requerido" }, { status: 400 });

  // Verificar que el usuario pertenece a esa tienda como afiliada
  const myAffiliate = await prisma.affiliate.findFirst({
    where: { userId: user.id, storeId, isActive: true, status: "APPROVED" },
    select: { id: true },
  });

  if (!myAffiliate) {
    return NextResponse.json({ error: "No pertenecés a esa tienda" }, { status: 403 });
  }

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const startOfMonth = new Date(`${monthStr}-01T00:00:00Z`);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  // Traer todos los afiliados activos de la tienda con sus comisiones del mes
  const affiliates = await prisma.affiliate.findMany({
    where: { storeId, isActive: true, status: "APPROVED" },
    include: {
      user: { select: { name: true, image: true, city: true } },
      commissions: {
        where: { status: "PAID", createdAt: { gte: startOfMonth, lt: endOfMonth } },
        select: { amount: true },
      },
      _count: { select: { orders: true } },
    },
  });

  type AffiliateWithData = (typeof affiliates)[number];

  const withEarnings = affiliates.map((aff: AffiliateWithData) => ({
    aff,
    isMe: aff.id === myAffiliate.id,
    monthlyEarned: aff.commissions.reduce((s, c) => s + c.amount, 0),
  }));

  withEarnings.sort((a, b) => b.monthlyEarned - a.monthlyEarned);
  const topEarned = withEarnings[0]?.monthlyEarned ?? 0;

  // A cada afiliada solo se le muestran sus propios números.
  // El resto solo ve su posición relativa y un nombre parcial sin datos financieros.
  const ranked = withEarnings.map(({ aff, isMe, monthlyEarned }, i) => ({
    affiliateId: aff.id,
    isMe,
    rank: i + 1,
    name: isMe ? aff.user.name ?? "Vos" : `Vendedora #${i + 1}`,
    image: isMe ? aff.user.image : null,
    // Datos financieros: solo para la propia afiliada
    monthlyEarned: isMe ? monthlyEarned : null,
    totalOrders: isMe ? aff._count.orders : null,
    // Barra relativa sin revelar monto exacto de terceros
    relativeScore: topEarned > 0 ? Math.round((monthlyEarned / topEarned) * 100) : 0,
  }));

  const myRank = ranked.find((r) => r.isMe);

  return NextResponse.json({ ranking: ranked, myRank, month: monthStr });
}
