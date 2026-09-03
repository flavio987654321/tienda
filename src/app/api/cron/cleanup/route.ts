import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DIAS_RETENCION_VISITAS } from "@/lib/retencion";
import { rechazoDeCron } from "@/lib/cron-auth";
import { rutaDeRef } from "@/lib/subida-digital";
import {
  configDeposito, borrarDelDeposito, DIAS_CUARENTENA_ARCHIVO, TOPE_BARRIDO,
} from "@/lib/deposito-digital";

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

  // Va al final y aparte del `Promise.all`: es lo único acá que sale a internet.
  // Si tarda o falla, lo de arriba ya se hizo.
  const archivosDigitales = await barrerArchivosDeBorrados(now);

  return NextResponse.json({
    archivosDigitales,
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

/**
 * Saca del depósito los PDF de los productos digitales borrados.
 *
 * ── Por qué hacía falta ─────────────────────────────────────────────────────
 *
 * Borrar un producto digital lo marca como borrado, no lo borra: `OrderItem`
 * apunta a él, así que sacarlo de verdad dejaría a quien ya pagó sin poder bajar
 * lo que compró. Bien. Pero **el archivo nunca lo tocaba nadie**, y borrar el
 * principal se lleva de arrastre a sus bonos y upsells, que tienen PDF propio.
 * O sea que cambiar de embudo dejaba cuatro o cinco archivos muertos en el
 * bucket, sin forma de alcanzarlos y pagándolos igual. A 50 MB de tope cada uno,
 * contra el gigabyte de depósito del plan gratis, unas pocas pasadas lo llenan.
 *
 * No era un agujero de seguridad —el bucket es privado y el enlace firmado sale
 * sólo de una compra— era plata.
 *
 * ── Las dos condiciones ─────────────────────────────────────────────────────
 *
 * 1. Borrado hace más de `DIAS_CUARENTENA_ARCHIVO`.
 * 2. Sin ningún permiso de descarga vivo.
 *
 * La segunda parece sobrar: un producto borrado no se puede comprar, así que su
 * última venta es anterior al borrado y el permiso vence, como mucho, 30 días
 * después. Pero hay un caso donde no cierra — un pago que se acredita DESPUÉS
 * del borrado (Mercado Pago avisa cuando avisa) emite el permiso tarde, y ese
 * vence después del barrido. Cuesta una condición más en la consulta y evita el
 * único caso en que alguien paga y se queda sin nada.
 *
 * Hoy `DigitalDownload` está vacía —el checkout todavía no existe— así que la
 * condición no filtra nada. Está escrita igual para que el día que el checkout
 * exista esto ya lo respete, en vez de tener que acordarse.
 */
async function barrerArchivosDeBorrados(now: Date) {
  const config = configDeposito();
  if (!config) return { barridos: 0, motivo: "sin configurar" };

  const corte = new Date(now.getTime() - DIAS_CUARENTENA_ARCHIVO * 24 * 60 * 60 * 1000);

  const muertos = await prisma.product.findMany({
    where: {
      deletedAt: { lt: corte },
      archivoPath: { not: null },
      orderItems: { none: { descargas: { some: { expiresAt: { gt: now } } } } },
    },
    select: { id: true, archivoPath: true },
    // El cron entero tiene 60 segundos (el techo del plan gratis de Vercel) y
    // esto va último. Con un tope no se drena de una noche, se drena en varias
    // — y lo que importa es que se drene, no que sea hoy.
    take: TOPE_BARRIDO,
  });

  let barridos = 0;
  let fallados = 0;

  for (const p of muertos) {
    // Si alguna vez `archivoPath` guardara algo con otra forma, `rutaDeRef`
    // devuelve null y NO se le pega a Supabase con una ruta a medias.
    const ruta = rutaDeRef(p.archivoPath);
    if (!ruta) {
      console.error("[barrido-digital] referencia ilegible, producto", p.id);
      fallados++;
      continue;
    }

    const res = await borrarDelDeposito(config, ruta);
    if (res === "fallo") {
      // Se deja `archivoPath` como está: mañana se vuelve a intentar.
      console.error("[barrido-digital] no se pudo borrar", ruta);
      fallados++;
      continue;
    }

    /* Y acá se suelta la referencia. Es lo que hace que esto no se repita todas
       las noches: sin el `null`, el producto vuelve a caer en la consulta para
       siempre. `noEstaba` cuenta como hecho por lo mismo — si el objeto ya no
       está, insistir no lo va a traer de vuelta.

       Va DESPUÉS de borrar y no antes: al revés, un `update` que anda seguido de
       un borrado que falla deja el archivo en el depósito sin nadie que lo
       nombre, que es exactamente lo que esto vino a arreglar. */
    await prisma.product.update({
      where: { id: p.id },
      data: { archivoPath: null, archivoNombre: null, archivoPeso: null },
    });
    barridos++;
  }

  return { barridos, fallados, encontrados: muertos.length };
}
