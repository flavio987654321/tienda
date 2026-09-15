import { prisma } from "@/lib/prisma";
import { getUserSubscription } from "@/lib/subscription";
import type { TierDigital } from "@/lib/planes-digitales";
import { MAX_PRODUCTOS_DIGITALES_CREADOS } from "@/lib/planLimits";
import { getArgentinaDayKey, diaArgentino, inicioDiaArgentino, sumarDiasCalendario } from "@/lib/fechas-comerciales";
import { resolverRango, armarEstadisticas, type OrdenCruda, type VisitaCruda, type Rango, type Estadisticas, type PrincipalCrudo } from "@/lib/estadisticas-digitales";
import type { PasoDigital, Dispositivo } from "@/lib/visitas-digitales";
import { MADURACION_MS } from "@/lib/carritos-digitales";

/**
 * Trae de la base todo lo que Estadísticas cuenta, y lo cuenta.
 *
 * Vive acá y no en la página porque lo usan DOS salidas: la pantalla y la
 * exportación. Copiada en las dos, un día una dice un número y la otra otro.
 * La cuenta en sí la hace `armarEstadisticas`, que es pura y está probada;
 * acá sólo se traen las filas, con techo en cada lista.
 *
 * Importa Prisma, así que **no lo puede importar ningún componente de
 * navegador**. Lo pura vive en `estadisticas-digitales`.
 */

export type EstadisticasCargadas = {
  tier: TierDigital;
  rango: Rango;
  principales: PrincipalCrudo[];
  elegido: string | null;
  datos: Estadisticas;
  /** Se llegó al techo de órdenes: los números del rango están incompletos. */
  recortado: boolean;
};

/**
 * Cuántas órdenes se traen como mucho. Una cuenta que vende 20 por día
 * durante los dos años de "Todo" llega a 15.000; el techo está arriba de eso
 * y existe por lo de siempre: una consulta sin límite contra una tabla que
 * crece. Si algún día se alcanza, la pantalla lo dice.
 */
const TECHO_DE_ORDENES = 20_000;
/** Y de filas de visitas: 730 días × 5 productos × 2 pasos son 7.300. */
const TECHO_DE_VISITAS = 20_000;
/** De orígenes: 730 × 5 × 11 etiquetas, si todas aparecieran todos los días. */
const TECHO_DE_ORIGENES = 50_000;
/** De campañas: 730 × 5 × 50 combinaciones, el techo por día de `utm-digital`. */
const TECHO_DE_CAMPANIAS = 200_000;

/**
 * Día de la semana (0 domingo … 6 sábado) y hora (0–23) en la Argentina. Con
 * el reloj del servidor —UTC— una venta de las 22:00 del sábado caería en el
 * domingo a la 1, y "cuándo se vende" diría el día equivocado.
 */
const AR_TZ = "America/Argentina/Buenos_Aires";
const DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const relojAR = new Intl.DateTimeFormat("en-US", { timeZone: AR_TZ, weekday: "short", hour: "numeric", hourCycle: "h23" });
function cuandoEnArgentina(fecha: Date): { diaSemana: number; hora: number } {
  const partes = relojAR.formatToParts(fecha);
  const dia = partes.find((p) => p.type === "weekday")?.value ?? "";
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? -1);
  return { diaSemana: DIAS_EN.indexOf(dia), hora: hora % 24 };
}

/** Cómo quedó anotada cada devolución en la historia de la orden. */
const MOTIVOS = { digital_devolucion: "arrepentimiento", digital_contracargo: "contracargo" } as const;

export async function cargarEstadisticas(userId: string, p: string | undefined, rangoPedido: string | undefined): Promise<EstadisticasCargadas> {
  const hoy = getArgentinaDayKey();
  const rango = resolverRango(rangoPedido, hoy);

  const [store, sub] = await Promise.all([
    prisma.store.findUnique({ where: { ownerId: userId }, select: { id: true } }),
    getUserSubscription(userId),
  ]);
  const tier = (sub?.tier ?? "FREE") as TierDigital;

  /* Sin espacio todavía —nunca guardó un producto— no hay nada que contar. Se
     dibuja el vacío sin salir a preguntar nada más. */
  if (!store) {
    const vacio = armarEstadisticas({ rango, ordenes: [], visitas: [], origenes: [], principales: [], elegido: null });
    return { tier, rango, principales: [], elegido: null, datos: vacio, recortado: false };
  }

  /* Todos los productos de la cuenta, borrados incluidos: hace falta saber a
     qué principal suma cada línea vendida, y una venta vieja de un producto que
     ya no está sigue siendo plata que entró. Los borrados se filtran después,
     al armar el selector y el ranking. */
  const productos = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "asc" },
    /* Borrados incluidos, así que el techo es el de creados en toda la vida de
       la cuenta, que la ruta de crear no deja pasar. */
    take: MAX_PRODUCTOS_DIGITALES_CREADOS,
    select: { id: true, name: true, isActive: true, rolDigital: true, padreId: true, deletedAt: true },
  });
  const suPrincipal = new Map<string, string>();
  for (const prod of productos) {
    suPrincipal.set(prod.id, prod.rolDigital === "PRINCIPAL" ? prod.id : (prod.padreId ?? prod.id));
  }
  const principales = productos
    .filter((prod) => prod.rolDigital === "PRINCIPAL" && prod.deletedAt === null)
    .map((prod) => ({ id: prod.id, name: prod.name, publicada: prod.isActive }));

  /* El elegido tiene que ser uno de los suyos: un id ajeno en la URL no puede
     filtrar nada, y se cae a "Todos". */
  const elegido = typeof p === "string" && principales.some((prod) => prod.id === p) ? p : null;

  /* Los límites del rango en instantes: desde las 00:00 del primer día hasta
     las 00:00 del día siguiente al último, en hora argentina. */
  const desde = inicioDiaArgentino(rango.desde);
  const hasta = inicioDiaArgentino(sumarDiasCalendario(rango.hasta, 1));
  const idsDePrincipales = principales.map((prod) => prod.id);

  /* Las dos tablas de visitas pueden no existir todavía: la migración la aplica
     el build de producción, y en local se mira la base de producción antes de
     ese build. Sin visitas la pantalla sigue sirviendo —las ventas están— y
     dice cero, en vez de caerse entera por el bloque que menos importa. */
  const sinTabla = <T,>(consulta: Promise<T[]>): Promise<T[]> => consulta.catch(() => []);

  const ahora = new Date();
  const [ordenes, visitas, origenes, campanias, pendientes] = await Promise.all([
    prisma.order.findMany({
      /* Las cobradas, y las que se cobraron y se deshicieron. ⚠️ Una devolución
         NO tiene estado propio en la base: la orden queda CANCELLED con el pago
         en REFUNDED (ver `/api/digitales/cobro`). Buscarla por un estado
         "REFUNDED" que no existe la contaba como cero. */
      where: {
        storeId: store.id,
        createdAt: { gte: desde, lt: hasta },
        OR: [
          { status: "CONFIRMED" },
          { status: "CANCELLED", payment: { status: "REFUNDED" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: TECHO_DE_ORDENES,
      select: {
        status: true, total: true, lockedCommissionRate: true, createdAt: true,
        buyerId: true, recordatorioAt: true, origenVisita: true,
        utmMedio: true, utmCampania: true, utmAnuncio: true,
        /* Todas las líneas: la primera dice de qué principal es la orden, las
           de rol UPSELL suman su plata, y los permisos dicen si bajó algo. */
        items: {
          select: {
            productId: true, price: true,
            descargas: { select: { descargas: true, expiresAt: true } },
          },
        },
        /* Por qué se deshizo: lo escribe el webhook en la historia de la orden. */
        statusLogs: {
          where: { changedBy: { in: Object.keys(MOTIVOS) } },
          orderBy: { changedAt: "desc" },
          take: 1,
          select: { changedBy: true },
        },
        /* El último intento del mail de entrega. */
        enviosDigitales: {
          where: { motivo: "ENTREGA" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { estado: true },
        },
      },
    }),
    sinTabla(prisma.digitalVisita.findMany({
      where: { productId: { in: idsDePrincipales }, date: { gte: rango.desde, lte: rango.hasta } },
      take: TECHO_DE_VISITAS,
      select: { productId: true, date: true, paso: true, dispositivo: true, count: true },
    })),
    sinTabla(prisma.digitalVisitaOrigen.findMany({
      where: { productId: { in: idsDePrincipales }, date: { gte: rango.desde, lte: rango.hasta } },
      take: TECHO_DE_ORIGENES,
      select: { productId: true, date: true, paso: true, source: true, count: true },
    })),
    sinTabla(prisma.digitalVisitaCampania.findMany({
      where: { productId: { in: idsDePrincipales }, date: { gte: rango.desde, lte: rango.hasta } },
      take: TECHO_DE_CAMPANIAS,
      select: { productId: true, date: true, medio: true, campania: true, anuncio: true, count: true },
    })),
    /* Las compras que quedaron en la puerta: PENDING con la misma maduración
       que la pantalla de Carritos, para que los dos números coincidan. Con su
       primera línea, para saber de qué página son: se filtran por producto
       como todo lo demás. */
    prisma.order.findMany({
      where: {
        storeId: store.id, status: "PENDING",
        createdAt: { gte: desde, lt: new Date(Math.min(hasta.getTime(), ahora.getTime() - MADURACION_MS)) },
      },
      orderBy: { createdAt: "desc" },
      take: TECHO_DE_ORDENES,
      select: { createdAt: true, recordatorioAt: true, items: { select: { productId: true }, take: 1 } },
    }),
  ]);

  const rolDe = new Map(productos.map((prod) => [prod.id, prod.rolDigital]));

  const ordenesCrudas: OrdenCruda[] = ordenes.map((o) => {
    const permisos = o.items.flatMap((i) => i.descargas);
    const motivo = o.statusLogs[0]?.changedBy as keyof typeof MOTIVOS | undefined;
    const mail = o.enviosDigitales[0]?.estado;
    return {
      estado: o.status === "CONFIRMED" ? "CONFIRMED" : "DEVUELTA",
      motivo: motivo ? MOTIVOS[motivo] : null,
      total: o.total,
      tasa: o.lockedCommissionRate,
      /* El día argentino, el mismo con el que se guardan las visitas: la
         conversión de un día divide lo uno por lo otro. */
      dia: diaArgentino(o.createdAt),
      ...cuandoEnArgentina(o.createdAt),
      /* La primera línea dice de qué principal es la orden: el checkout es de
         UN principal, y sus bonos y upsells cuelgan de él. */
      principal: o.items[0] ? (suPrincipal.get(o.items[0].productId) ?? null) : null,
      comprador: o.buyerId,
      upsell: o.items.filter((i) => rolDe.get(i.productId) === "UPSELL").reduce((s, i) => s + i.price, 0),
      bajo: permisos.length === 0 ? null : permisos.some((p) => p.descargas > 0),
      vencidoSinBajar: permisos.some((p) => p.descargas === 0 && p.expiresAt <= ahora),
      mail: mail === "ENVIADO" || mail === "FALLO" ? mail : null,
      recordada: o.recordatorioAt !== null,
      origen: o.origenVisita,
      campania: o.utmMedio && o.utmCampania
        ? { medio: o.utmMedio, campania: o.utmCampania, anuncio: o.utmAnuncio ?? "" }
        : null,
    };
  });

  const datos = armarEstadisticas({
    rango,
    ordenes: ordenesCrudas,
    visitas: visitas.map((v): VisitaCruda => ({ ...v, paso: v.paso as PasoDigital, dispositivo: v.dispositivo as Dispositivo })),
    origenes: origenes.map((o) => ({ ...o, paso: o.paso as PasoDigital })),
    campanias,
    principales,
    elegido,
    carritos: pendientes.map((c) => ({
      dia: diaArgentino(c.createdAt),
      principal: c.items[0] ? (suPrincipal.get(c.items[0].productId) ?? null) : null,
      recordado: c.recordatorioAt !== null,
    })),
  });

  return { tier, rango, principales, elegido, datos, recortado: ordenes.length >= TECHO_DE_ORDENES };
}
