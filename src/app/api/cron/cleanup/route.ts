import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DIAS_RETENCION_VISITAS } from "@/lib/retencion";
import { rechazoDeCron } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  const rechazo = rechazoDeCron(req);
  if (rechazo) return rechazo;

  return NextResponse.json(await limpiar());
}

/**
 * La limpieza, aparte del handler.
 *
 * Está así para que el cron diario —que es el único registrado en `vercel.json`—
 * pueda llamarla sin pegarle por HTTP a su propio deploy. En el plan gratis hay
 * dos crons y no vale la pena gastar el segundo en esto: la limpieza no tiene
 * horario propio, sólo tiene que correr una vez por día.
 */
export async function limpiar() {
  const now = new Date();
  const ago30d  = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
  const ago90d  = new Date(now.getTime() - 90  * 24 * 60 * 60 * 1000);
  const ago6m   = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const ago1y   = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const corteVisitas = new Date(now.getTime() - DIAS_RETENCION_VISITAS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const [
    sessions,
    clicks,
    notifications,
    adminLogs,
    coupons,
    storeViews,
    storeViewSources,
    funnelSteps,
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
    // Visitas diarias más viejas que la retención. El número vive en
    // `lib/retencion` porque la pantalla y el pie del PDF prometen lo mismo, y
    // con la cuenta escrita a mano acá alcanzaba con tocar una para que las
    // otras siguieran prometiendo otra cosa.
    prisma.storeView.deleteMany({
      where: { date: { lt: corteVisitas } },
    }),
    // El origen de esas visitas, con el MISMO corte. Si se conservara más, el
    // desglose de un día sobreviviría al total de ese día y la pantalla tendría
    // que mostrar "de 0 visitas, 40 vinieron de Instagram".
    prisma.storeViewSource.deleteMany({
      where: { date: { lt: corteVisitas } },
    }),
    // Los escalones del embudo, con el mismo corte por el mismo motivo: el
    // primer escalón son las visitas de ese día.
    prisma.storeFunnelStep.deleteMany({
      where: { date: { lt: corteVisitas } },
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
      storeViewSources: storeViewSources.count,
      funnelSteps:   funnelSteps.count,
      abandonedCarts: abandonedCarts.count,
    },
    total: sessions.count + clicks.count + notifications.count +
           adminLogs.count + coupons.count + storeViews.count +
           storeViewSources.count + funnelSteps.count + abandonedCarts.count,
    ranAt: now.toISOString(),
  });
}
