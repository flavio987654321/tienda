import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Agrupar leads por tienda + afiliado y contar confirmados/rechazados
  const leads = await prisma.lead.groupBy({
    by: ["storeId", "affiliateId"],
    where: { createdAt: { gte: since }, affiliateId: { not: null } },
    _count: { id: true },
  });

  // Para cada combinación, contar por status
  const details = await Promise.all(
    leads.map(async (g) => {
      const [confirmed, rejected, pending, store, affiliate] = await Promise.all([
        prisma.lead.count({ where: { storeId: g.storeId, affiliateId: g.affiliateId, status: "CONFIRMED" } }),
        prisma.lead.count({ where: { storeId: g.storeId, affiliateId: g.affiliateId, status: "REJECTED" } }),
        prisma.lead.count({ where: { storeId: g.storeId, affiliateId: g.affiliateId, status: "PENDING" } }),
        prisma.store.findUnique({ where: { id: g.storeId }, select: { name: true, slug: true } }),
        g.affiliateId ? prisma.affiliate.findUnique({
          where: { id: g.affiliateId! },
          select: { user: { select: { name: true, email: true } } },
        }) : null,
      ]);

      return {
        storeId: g.storeId,
        storeName: store?.name ?? "—",
        storeSlug: store?.slug ?? "",
        affiliateId: g.affiliateId,
        affiliateName: affiliate?.user?.name ?? "—",
        affiliateEmail: affiliate?.user?.email ?? "—",
        total: g._count.id,
        confirmed,
        rejected,
        pending,
        rejectionRate: g._count.id > 0 ? Math.round((rejected / g._count.id) * 100) : 0,
        suspicious: rejected >= 5 && confirmed === 0,
      };
    })
  );

  // Ordenar: sospechosos primero, luego por tasa de rechazo
  details.sort((a, b) => {
    if (a.suspicious && !b.suspicious) return -1;
    if (!a.suspicious && b.suspicious) return 1;
    return b.rejectionRate - a.rejectionRate;
  });

  return NextResponse.json({ leads: details });
}
