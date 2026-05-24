import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const affiliates = await prisma.affiliate.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      storeId: true,
      store: { select: { name: true, slug: true } },
      _count: { select: { clicks: true, orders: true, commissions: true } },
    },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const statsPerAffiliate = await Promise.all(
    affiliates.map(async (aff) => {
      const [clicksLast30, ordersLast30, topProducts, clicksByDay] = await Promise.all([
        prisma.affiliateClick.count({
          where: { affiliateId: aff.id, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.order.count({
          where: { affiliateId: aff.id, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: { order: { affiliateId: aff.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } } },
          _count: { productId: true },
          _sum: { price: true },
          orderBy: { _count: { productId: "desc" } },
          take: 5,
        }),
        // clicks por día últimos 14 días (para mini gráfico)
        prisma.affiliateClick.findMany({
          where: { affiliateId: aff.id, createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
          select: { createdAt: true },
        }),
      ]);

      const productIds = topProducts.map((p) => p.productId);
      const products = productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, images: true, price: true },
          })
        : [];

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

      const conversionRate = clicksLast30 > 0
        ? Math.round((ordersLast30 / clicksLast30) * 100 * 10) / 10
        : 0;

      // Agrupar clicks por día
      const dayMap: Record<string, number> = {};
      for (const click of clicksByDay) {
        const day = click.createdAt.toISOString().slice(0, 10);
        dayMap[day] = (dayMap[day] ?? 0) + 1;
      }
      const clicksTimeline = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        return { date: key, clicks: dayMap[key] ?? 0 };
      });

      return {
        affiliateId: aff.id,
        storeId: aff.storeId,
        storeName: aff.store.name,
        storeSlug: aff.store.slug,
        totalClicks: aff._count.clicks,
        totalOrders: aff._count.orders,
        totalCommissions: aff._count.commissions,
        clicksLast30,
        ordersLast30,
        conversionRate,
        clicksTimeline,
        topProducts: topProducts.map((tp) => ({
          product: productMap[tp.productId] ?? null,
          orderCount: tp._count.productId,
          totalRevenue: tp._sum.price ?? 0,
        })),
      };
    })
  );

  return NextResponse.json({ stats: statsPerAffiliate });
}
