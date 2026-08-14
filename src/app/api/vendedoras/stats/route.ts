import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import { checkRateLimitConRespaldo } from "@/lib/rate-limit";

const MAX_CONSULTAS = 20;
const VENTANA_MS = 60_000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  /* Esta pantalla es la más cara del panel: unas diez consultas POR TIENDA en la
     que la persona esté afiliada, y una de ellas es SQL crudo agrupando por día.
     No es un agujero de seguridad —cada quien ve lo suyo— pero es la puerta más
     ancha que hay para hacerle doler la base a la aplicación entera, y la abre
     cualquiera con una cuenta gratis y un `while (true)`.

     Va por cuenta y no por IP: el costo lo genera la afiliación, no la red.

     Con respaldo, porque acá no se paga nada por uso y quedarse sin la pantalla
     de estadísticas durante una caída de Redis sería peor que dejar pasar de
     más. Veinte por minuto es holgado para una persona —la pantalla hace una
     sola consulta al abrirse— y corta en seco cualquier bucle. */
  const { permitido } = await checkRateLimitConRespaldo(
    `stats-afiliado:${user.id}`,
    MAX_CONSULTAS,
    VENTANA_MS,
    { limiteFallback: MAX_CONSULTAS, limiteFallbackGlobal: 400 }
  );
  if (!permitido) {
    return NextResponse.json(
      { error: "Demasiadas consultas seguidas. Esperá un momento." },
      { status: 429 }
    );
  }

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
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const statsPerAffiliate = await Promise.all(
    affiliates.map(async (aff) => {
      const [
        clicksLast30, ordersLast30, topProducts, clicksByDay, clicksByChannel,
        commissionsByStatus, commissionsThisMonth, ticketData,
        clicksThisWeek, clicksLastWeek,
      ] = await Promise.all([
        prisma.affiliateClick.count({
          where: { affiliateId: aff.id, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.order.count({
          where: { affiliateId: aff.id, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: { order: { affiliateId: aff.id, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA } } },
          _count: { productId: true },
          _sum: { price: true },
          orderBy: { _count: { productId: "desc" } },
          take: 5,
        }),
        // agrupado en DB — evita cargar miles de filas en memoria
        prisma.$queryRaw<{ day: Date; clicks: bigint }[]>`
          SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS clicks
          FROM "AffiliateClick"
          WHERE "affiliateId" = ${aff.id}
            AND "createdAt" >= ${new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)}
          GROUP BY day
          ORDER BY day ASC
        `,
        prisma.affiliateClick.groupBy({
          by: ["utmSource"],
          where: { affiliateId: aff.id, createdAt: { gte: thirtyDaysAgo } },
          _count: { utmSource: true },
        }),
        // comisiones agrupadas por status para mostrar desglose real
        prisma.commission.groupBy({
          by: ["status"],
          where: { affiliateId: aff.id },
          _sum: { amount: true },
        }),
        // comisiones confirmadas en el mes actual (excluye PENDING que pueden revertirse)
        prisma.commission.aggregate({
          where: { affiliateId: aff.id, createdAt: { gte: startOfMonth }, status: { in: ["PAID", "DISBURSED"] } },
          _sum: { amount: true },
        }),
        // revenue total generado + ticket promedio (órdenes confirmadas)
        prisma.order.aggregate({
          where: { affiliateId: aff.id, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA } },
          _sum: { total: true },
          _count: { id: true },
        }),
        prisma.affiliateClick.count({
          where: { affiliateId: aff.id, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.affiliateClick.count({
          where: { affiliateId: aff.id, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
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

      // desglose por status
      const statusMap = Object.fromEntries(
        commissionsByStatus.map((c) => [c.status, c._sum.amount ?? 0])
      );
      const commissionsPending = statusMap["PENDING"] ?? 0;
      const commissionsToCollect = statusMap["PAID"] ?? 0;
      const commissionsDisbursed = statusMap["DISBURSED"] ?? 0;
      const totalCommissionsAmount = commissionsPending + commissionsToCollect + commissionsDisbursed;

      const commissionsThisMonthAmount = commissionsThisMonth._sum.amount ?? 0;

      const confirmedOrdersCount = ticketData._count.id ?? 0;
      const confirmedOrdersTotal = ticketData._sum.total ?? 0;
      const avgTicket = confirmedOrdersCount > 0
        ? Math.round(confirmedOrdersTotal / confirmedOrdersCount)
        : 0;
      const revenueGenerated = confirmedOrdersTotal;

      const weekTrend = clicksLastWeek > 0
        ? Math.round(((clicksThisWeek - clicksLastWeek) / clicksLastWeek) * 100)
        : clicksThisWeek > 0 ? 100 : 0;

      const dayMap: Record<string, number> = {};
      for (const row of clicksByDay) {
        const key = row.day.toISOString().slice(0, 10);
        dayMap[key] = Number(row.clicks);
      }
      const clicksTimeline = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        return { date: key, clicks: dayMap[key] ?? 0 };
      });

      const channelBreakdown = clicksByChannel
        .map((c) => ({ channel: c.utmSource ?? "directo", clicks: c._count.utmSource }))
        .sort((a, b) => b.clicks - a.clicks);

      return {
        affiliateId: aff.id,
        storeId: aff.storeId,
        storeName: aff.store.name,
        storeSlug: aff.store.slug,
        totalClicks: aff._count.clicks,
        totalOrders: aff._count.orders,
        totalCommissionsAmount,
        commissionsPending,
        commissionsToCollect,
        commissionsDisbursed,
        commissionsThisMonth: commissionsThisMonthAmount,
        revenueGenerated,
        avgTicket,
        clicksLast30,
        clicksThisWeek,
        weekTrend,
        ordersLast30,
        conversionRate,
        clicksTimeline,
        channelBreakdown,
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
