import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const ago30d  = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
  const ago90d  = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000);
  const ago6m   = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const ago1y   = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const [
    sessions,
    clicks,
    notifications,
    adminLogs,
    coupons,
    storeViews,
    abandonedCarts,
  ] = await Promise.all([
    // Sesiones de NextAuth ya expiradas
    prisma.session.deleteMany({
      where: { expires: { lt: now } },
    }),
    // Clicks de afiliados con más de 90 días (ya no aportan a métricas útiles)
    prisma.affiliateClick.deleteMany({
      where: { createdAt: { lt: ago90d } },
    }),
    // Notificaciones ya leídas con más de 30 días
    prisma.notification.deleteMany({
      where: { read: true, createdAt: { lt: ago30d } },
    }),
    // Logs de acciones admin con más de 1 año
    prisma.adminActionLog.deleteMany({
      where: { createdAt: { lt: ago1y } },
    }),
    // Cupones de premio ya expirados hace más de 6 meses
    prisma.affiliateRewardCoupon.deleteMany({
      where: { status: "EXPIRED", expiresAt: { lt: ago6m } },
    }),
    // Visitas diarias a tiendas con más de 1 año (conservamos 12 meses para gráficos)
    prisma.storeView.deleteMany({
      where: { date: { lt: ago1y.toISOString().slice(0, 10) } },
    }),
    // Carritos abandonados de hace más de 45 días sin recuperar — ya no
    // tiene sentido mandarles recordatorio ni dejarlos acumulados en el panel
    prisma.abandonedCart.deleteMany({
      where: { recoveredAt: null, lastActivityAt: { lt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return NextResponse.json({
    cleaned: {
      sessions:      sessions.count,
      affiliateClicks: clicks.count,
      notifications: notifications.count,
      adminLogs:     adminLogs.count,
      rewardCoupons: coupons.count,
      storeViews:    storeViews.count,
      abandonedCarts: abandonedCarts.count,
    },
    total: sessions.count + clicks.count + notifications.count +
           adminLogs.count + coupons.count + storeViews.count + abandonedCarts.count,
    ranAt: now.toISOString(),
  });
}
