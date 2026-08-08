import { prisma } from "@/lib/prisma";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/stockMovements";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import { RUIDO_PCT } from "@/lib/resumen-mes";
import {
  getArgentinaDayKey, diaArgentino, inicioDiaArgentino, sumarDiasCalendario,
} from "@/lib/fechas-comerciales";
import { resumirCupones, resumirPromos } from "@/lib/metricas-marketing";
import { parseOrderPromoSummary } from "@/lib/email";
import { aggregateProfitability } from "@/lib/margin";
import {
  PRO_MAX_ACTIVE_COUPONS, PRO_MAX_LIVE_PROMOTIONS,
  myActiveCouponsWhere, livePromotionsWhere,
} from "@/lib/planLimits";

/**
 * Tipos de tienda "de consultas" (sin pedidos/carrito, ej. autos) — debe coincidir
 * con LEADS_STORE_TYPES en src/components/DashboardLayout.tsx.
 */
const LEADS_STORE_TYPES = ["AUTOS"];

/** Para las tiendas de consultas, que no tienen cupones ni promociones. */
const MARKETING_VACIO: StoreSnapshot["marketing"] = {
  cuponesActivos: 0, cuponesTope: null, cuponesVencidosActivos: 0,
  cuponesSinUsoViejos: 0, cuponMasUsado: null,
  promosVivas: 0, promosTope: null, promoMasUsada: null,
  margenPromedio: null, productosSinCosto: 0,
};

/**
 * Cuántos días tiene que llevar un pedido sin confirmar para que Sasha lo
 * nombre. La campanita ya avisó en el momento en que entró; uno de hace diez
 * minutos no es un problema, uno de anteayer sí.
 */
export const DIAS_PEDIDO_ESTANCADO = 1;

/** Ídem para un pedido cobrado y sin despachar. Mismo umbral que Métricas. */
export const DIAS_SIN_DESPACHAR = 5;

/**
 * Cuántos días tiene que llevar agotado un producto para que Sasha lo nombre.
 * El aviso de agotado ya salió por campanita y por email el día que pasó.
 */
export const DIAS_AGOTADO_ESTANCADO = 3;

export type StoreSnapshot = {
  esTipoConsultas: boolean;
  pedidosPendientes: number;
  productosStockBajo: number;
  productosSinStock: number;
  ventasUltimos30Dias: number;
  ventasPrevios30Dias: number;
  tendenciaVentas: "subiendo" | "bajando" | "estable" | "sin_datos";
  productoTop: string | null;
  diasDesdeUltimaVenta: number | null;
  carritosAbandonadosPendientes: number;

  // ── Lo que la campanita NO puede decir ──
  // Todo lo de abajo mide que el TIEMPO PASÓ y nadie hizo nada. La campanita
  // reporta el evento en el momento; si Sasha repitiera lo mismo a la mañana, su
  // contador sería un resumen de cosas que el dueño ya vio ayer, y a la tercera
  // vez deja de mirarse. Éste es el reparto: la campanita avisa que algo pasó,
  // Sasha avisa que algo sigue sin resolverse.

  /** Pedidos sin confirmar de hace más de `DIAS_PEDIDO_ESTANCADO` días. */
  pedidosEstancados: number;
  /** La plata que hay ahí parada. */
  montoPedidosEstancados: number;
  /** Cobrados y todavía sin marcar como enviados, hace más de `DIAS_SIN_DESPACHAR`. */
  confirmadosSinDespachar: number;
  /** Agotados hace más de `DIAS_AGOTADO_ESTANCADO` días. */
  agotadosHaceDias: number;
  /**
   * Nombre de un producto que está agotado Y entre los más vendidos del mes.
   * Es el dato que la campanita no tiene: avisa que se agotó algo, no que se
   * agotó justo lo que más se vendía.
   */
  agotadoQueMasVendias: string | null;

  // ── Cupones, promociones y margen ──
  // Sin esto, preguntarle "¿qué cupones me recomendás?" daba consejos genéricos de
  // manual: podía sugerir armar un 20% OFF que ya estaba armado, o recomendar
  // descuentos sobre productos que se venden casi sin margen. Los números salen de
  // las mismas funciones que Métricas, así que Sasha y la pantalla no pueden
  // discrepar.
  marketing: {
    cuponesActivos: number;
    /** null = plan sin límite. */
    cuponesTope: number | null;
    /** Vencidos pero todavía marcados como activos: ocupan lugar y no sirven. */
    cuponesVencidosActivos: number;
    /** Activos hace más de 30 días y sin un solo uso. */
    cuponesSinUsoViejos: number;
    /** `facturado` = lo que entró en esos pedidos. Sin él, "descontó $38.000" no
     *  se puede juzgar: puede ser el mejor cupón del mes o el peor. */
    cuponMasUsado: { code: string; usos: number; descuento: number; facturado: number } | null;

    promosVivas: number;
    promosTope: number | null;
    promoMasUsada: { nombre: string; pedidos: number; ahorro: number; facturado: number } | null;

    /**
     * Margen promedio del período, en %. null = ningún producto vendido tiene el
     * costo cargado, así que no se puede saber si un descuento entra o no.
     */
    margenPromedio: number | null;
    productosSinCosto: number;
  };
};

export type ChecklistEstado = {
  isPublished: boolean;
  hasLogo: boolean;
  hasTemplate: boolean;
  hasProducts: boolean;
  hasMercadoPago: boolean;
  hasPaymentData: boolean;
  hasShipping: boolean;
  isVerified: boolean;
};

/**
 * Misma lógica que el checklist de onboarding de /dashboard (src/app/dashboard/page.tsx),
 * para que Sasha vea exactamente lo mismo que ya ve el dueño en pantalla.
 */
export function getChecklistEstado(args: {
  isPublished: boolean;
  logo: string | null;
  storeConfig: string | null;
  mpConnectedAt: Date | null;
  productCount: number;
  isVerified: boolean;
}): ChecklistEstado {
  let hasTemplate = false;
  let hasShipping = false;
  let hasPaymentData = false;
  try {
    const cfg = JSON.parse(args.storeConfig || "{}");
    hasTemplate = !!cfg.template;
    hasShipping = Array.isArray(cfg.shippingMethods);
    const pi = cfg.paymentInfo;
    hasPaymentData = !!(
      (pi?.transferencia?.enabled && (pi.transferencia.cbu?.length > 0 || pi.transferencia.alias?.length > 0)) ||
      pi?.efectivo?.enabled
    );
  } catch {
    /* storeConfig vacío o inválido todavía */
  }

  return {
    isPublished: args.isPublished,
    hasLogo: !!args.logo,
    hasTemplate,
    hasProducts: args.productCount > 0,
    hasMercadoPago: !!args.mpConnectedAt,
    hasPaymentData,
    hasShipping,
    isVerified: args.isVerified,
  };
}

/**
 * Los datos de cupones, promociones y margen. Va aparte de `getStoreSnapshot`
 * porque son cinco consultas más que sólo hacen falta para las preguntas de
 * marketing, y porque así se puede leer de un tirón qué mira cada cosa.
 */
async function getMarketingSnapshot(
  storeId: string,
  esPremium: boolean,
  desde: Date,
  hasta: Date,
  ahora: Date
): Promise<StoreSnapshot["marketing"]> {
  const [cuponesActivos, cupones, promosVivas, pedidosConCupon, promosRaw, itemsMargen] = await Promise.all([
    // El tope del plan se cuenta con el filtro CANÓNICO del proyecto, no con uno
    // escrito a mano acá. `myActiveCouponsWhere` deja afuera los vencidos y las
    // plantillas de premios de la ruleta — mi primera versión los contaba, así que
    // Sasha decía "5 de 10" mientras la pantalla de Cupones decía "3 de 10".
    prisma.coupon.count({ where: myActiveCouponsWhere(storeId, ahora) }),

    // Todos los cupones de la tienda, sin filtrar: es lo que recibe `resumirCupones`
    // en Métricas. Si acá se pasaran sólo los activos, un cupón que se usó en el
    // período y después se apagó desaparecería del "más usado" y ese dato no
    // coincidiría con el de la pantalla.
    prisma.coupon.findMany({
      where: { storeId },
      select: {
        id: true, code: true, label: true, discountType: true, discountValue: true,
        expiresAt: true, usedCount: true, createdAt: true, isActive: true, winnerEmail: true,
      },
    }),

    // Ídem para promociones: `livePromotionsWhere` cuenta las que OCUPAN LUGAR
    // —activas, programadas o pausadas— y deja afuera las archivadas y las
    // vencidas. Mi versión filtraba `isActive: true` (perdía las pausadas, que sí
    // ocupan) e ignoraba `endsAt` (contaba vencidas, que no ocupan).
    prisma.storePromotion.count({ where: livePromotionsWhere(storeId, ahora) }),
    prisma.order.findMany({
      where: {
        storeId, createdAt: { gte: desde, lt: hasta },
        status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA }, couponId: { not: null },
      },
      select: { couponId: true, discountAmount: true, total: true },
    }),
    prisma.order.findMany({
      where: {
        storeId, createdAt: { gte: desde, lt: hasta },
        status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA }, promoSummary: { not: null },
      },
      select: { promoSummary: true, total: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          storeId, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA },
          createdAt: { gte: desde, lt: hasta },
        },
      },
      select: {
        productId: true, quantity: true, price: true, lineTotal: true, costAtSale: true,
        order: { select: { subtotal: true, discountAmount: true, createdAt: true } },
      },
    }),
  ]);

  const resumenCupones = resumirCupones(cupones, pedidosConCupon, ahora);
  const resumenPromos = resumirPromos(
    promosRaw.map((o) => {
      const { appliedPromos, freeShippingPromo } = parseOrderPromoSummary(o.promoSummary);
      return { applied: appliedPromos, freeShipping: freeShippingPromo, total: o.total };
    })
  );

  const margen = aggregateProfitability(
    itemsMargen.map((it) => ({
      productId: it.productId, quantity: it.quantity, price: it.price,
      lineTotal: it.lineTotal, costAtSale: it.costAtSale,
      orderSubtotal: it.order.subtotal, orderDiscount: it.order.discountAmount,
      dateStr: diaArgentino(it.order.createdAt),
    }))
  );

  const filaTop = resumenCupones.filas[0] ?? null;
  const promoTop = resumenPromos.filas[0] ?? null;

  // Los propios de la dueña: los de la ruleta son personales del ganador y no se
  // "limpian", así que no tiene sentido señalarlos como abandonados.
  const cuponesPropios = cupones.filter((c) => c.winnerEmail === null);

  return {
    cuponesActivos,
    cuponesTope: esPremium ? null : PRO_MAX_ACTIVE_COUPONS,
    // Vencidos pero todavía marcados como activos. OJO: estos NO ocupan lugar del
    // tope —el filtro canónico ya los descuenta— así que el texto del prompt no
    // puede decir que liberan un lugar. Sólo ensucian la lista.
    cuponesVencidosActivos: cuponesPropios.filter(
      (c) => c.isActive && c.expiresAt !== null && c.expiresAt < ahora
    ).length,
    // Vigentes hace tiempo y sin un solo uso. Se mide contra el arranque del
    // período: los creados adentro de la ventana todavía no tuvieron oportunidad,
    // y contarlos como fracaso sería injusto.
    cuponesSinUsoViejos: cuponesPropios.filter(
      (c) =>
        c.isActive &&
        c.usedCount === 0 &&
        c.createdAt < desde &&
        (c.expiresAt === null || c.expiresAt > ahora)
    ).length,
    cuponMasUsado: filaTop
      ? { code: filaTop.code, usos: filaTop.usos, descuento: filaTop.descuento, facturado: filaTop.facturado }
      : null,

    promosVivas,
    promosTope: esPremium ? null : PRO_MAX_LIVE_PROMOTIONS,
    promoMasUsada: promoTop
      ? { nombre: promoTop.etiqueta, pedidos: promoTop.pedidos, ahorro: promoTop.ahorro, facturado: promoTop.facturado }
      : null,

    margenPromedio: margen.totalNetRevenueKnownCost > 0
      ? Math.round((margen.totalProfit / margen.totalNetRevenueKnownCost) * 100)
      : null,
    productosSinCosto: [...margen.byProduct.values()].filter((p) => p.profit === null).length,
  };
}

export async function getStoreSnapshot(
  storeId: string,
  tipoTienda: string,
  opciones: {
    esPremium?: boolean;
    /**
     * Los datos de cupones, promociones y margen son 5 consultas más, y sólo
     * hacen falta cuando el dueño está preguntando. El cron diario recorre TODAS
     * las tiendas y los avisos no los miran: pedirlos ahí serían 5 consultas por
     * tienda tiradas a la basura todos los días.
     */
    incluirMarketing?: boolean;
  } = {}
): Promise<StoreSnapshot> {
  const esTipoConsultas = LEADS_STORE_TYPES.includes(tipoTienda);
  const now = new Date();

  // Las mismas ventanas y los mismos cortes que la pantalla de Métricas.
  //
  // Antes esto eran 30×24 horas contadas desde este instante, y las ventas
  // sumaban todos los pedidos no cancelados —PENDING incluido—. Métricas cuenta
  // días argentinos y sólo lo confirmado. O sea que preguntarle a Sasha "¿cómo
  // vengo?" y abrir Métricas daba dos números distintos para el mismo período,
  // sacados de la misma base. Al que lo ve no le queda forma de saber cuál creer.
  const hoyDia = getArgentinaDayKey();
  const hace30 = inicioDiaArgentino(sumarDiasCalendario(hoyDia, -29));
  const hace60 = inicioDiaArgentino(sumarDiasCalendario(hoyDia, -59));
  const corteEstancado = inicioDiaArgentino(sumarDiasCalendario(hoyDia, -DIAS_PEDIDO_ESTANCADO));
  const corteSinDespachar = inicioDiaArgentino(sumarDiasCalendario(hoyDia, -DIAS_SIN_DESPACHAR));

  const [
    pedidosPendientes,
    variantesConUmbralPropio,
    variantesSinUmbral,
    variantesSinStock,
    ventasRecientes,
    ventasAnteriores,
    ultimaVenta,
    itemsTop,
    carritosAbandonadosPendientes,
    pedidosEstancadosAgg,
    sinDespacharAgg,
    marketing,
  ] = await Promise.all([
      esTipoConsultas
        ? Promise.resolve(0)
        : prisma.order.count({ where: { storeId, status: "PENDING" } }),

      // Variantes con umbral configurado: hay que comparar stock contra SU PROPIO umbral,
      // Prisma no compara dos columnas entre sí, así que se filtra en JS más abajo.
      prisma.productVariant.findMany({
        where: { lowStockThreshold: { not: null }, product: { storeId, deletedAt: null, isActive: true } },
        select: { productId: true, stock: true, lowStockThreshold: true },
      }),

      // Variantes sin umbral propio: usan el default global.
      prisma.productVariant.findMany({
        where: { lowStockThreshold: null, stock: { lte: DEFAULT_LOW_STOCK_THRESHOLD }, product: { storeId, deletedAt: null, isActive: true } },
        select: { productId: true },
        distinct: ["productId"],
      }),

      // Acá hace falta el variantId además del producto: para saber DESDE CUÁNDO
      // está agotado hay que buscar el movimiento de stock de esa variante.
      prisma.productVariant.findMany({
        where: { stock: 0, product: { storeId, deletedAt: null, isActive: true } },
        select: { id: true, productId: true },
      }),

      prisma.order.aggregate({
        where: { storeId, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA }, createdAt: { gte: hace30 } },
        _sum: { total: true },
      }),

      prisma.order.aggregate({
        where: {
          storeId,
          status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA },
          createdAt: { gte: hace60, lt: hace30 },
        },
        _sum: { total: true },
      }),

      prisma.order.findFirst({
        where: { storeId, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),

      // El más vendido también sale de ventas confirmadas: si no, un pedido
      // pendiente que después se cancela puede poner un producto en el podio.
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: { storeId, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA }, createdAt: { gte: hace30 } },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        // 5 y no 1: además del nombre del más vendido, hace falta saber si ALGUNO
        // de los que más se venden está agotado. Con uno solo, el cruce fallaría
        // siempre que el agotado fuera el segundo.
        take: 5,
      }),

      esTipoConsultas
        ? Promise.resolve(0)
        : prisma.abandonedCart.count({ where: { storeId, recoveredAt: null } }),

      // ── Lo estancado ──
      esTipoConsultas
        ? Promise.resolve({ _count: 0, _sum: { total: null } })
        : prisma.order.aggregate({
            where: { storeId, status: "PENDING", createdAt: { lt: corteEstancado } },
            _count: true,
            _sum: { total: true },
          }),

      esTipoConsultas
        ? Promise.resolve({ _count: 0, _sum: { total: null } })
        : prisma.order.aggregate({
            where: { storeId, status: "CONFIRMED", createdAt: { lt: corteSinDespachar } },
            _count: true,
            _sum: { total: true },
          }),

      // Las tiendas de consultas no tienen cupones ni promociones: la sección ni
      // aparece en su panel.
      esTipoConsultas || opciones.incluirMarketing === false
        ? Promise.resolve(MARKETING_VACIO)
        : getMarketingSnapshot(
            storeId,
            opciones.esPremium === true,
            hace30,
            inicioDiaArgentino(sumarDiasCalendario(hoyDia, 1)),
            now
          ),
    ]);

  const productIdsStockBajo = new Set(variantesSinUmbral.map((v) => v.productId));
  for (const v of variantesConUmbralPropio) {
    if (v.stock <= (v.lowStockThreshold as number)) productIdsStockBajo.add(v.productId);
  }

  const ventasUltimos30Dias = ventasRecientes._sum.total ?? 0;
  const ventasPrevios30Dias = ventasAnteriores._sum.total ?? 0;

  // El mismo umbral que el resumen de Métricas (`RUIDO_PCT`). Estaba en 10% acá y
  // en 5% allá: un mes que subía 7% le salía "estable" a Sasha y "7% arriba" a
  // Métricas, las dos al mismo tiempo y las dos convencidas.
  const margen = RUIDO_PCT / 100;
  let tendenciaVentas: StoreSnapshot["tendenciaVentas"] = "sin_datos";
  if (ventasUltimos30Dias === 0 && ventasPrevios30Dias === 0) {
    tendenciaVentas = "sin_datos";
  } else if (ventasUltimos30Dias > ventasPrevios30Dias * (1 + margen)) {
    tendenciaVentas = "subiendo";
  } else if (ventasUltimos30Dias < ventasPrevios30Dias * (1 - margen)) {
    tendenciaVentas = "bajando";
  } else {
    tendenciaVentas = "estable";
  }

  // ── Desde cuándo está agotado cada uno ──
  // `StockMovement` guarda `stockAfter`, así que el momento en que una variante
  // llegó a cero es el movimiento MÁS RECIENTE con `stockAfter = 0`. Tiene que ser
  // el más reciente y no el primero: una variante puede haberse agotado, repuesto
  // y vuelto a agotar, y el que importa es el último.
  const variantIdsSinStock = variantesSinStock.map((v) => v.id);
  const llegadaACero = variantIdsSinStock.length
    ? await prisma.stockMovement.groupBy({
        by: ["variantId"],
        where: { variantId: { in: variantIdsSinStock }, stockAfter: 0 },
        _max: { createdAt: true },
      })
    : [];

  const corteAgotado = inicioDiaArgentino(sumarDiasCalendario(hoyDia, -DIAS_AGOTADO_ESTANCADO));
  const variantesEstancadas = new Set(
    llegadaACero
      .filter((m) => m._max.createdAt !== null && m._max.createdAt < corteAgotado)
      .map((m) => m.variantId)
  );
  // Se cuenta por PRODUCTO y no por variante: al dueño "se te agotaron 3
  // productos" le dice algo; "se te agotaron 7 variantes" lo obliga a traducir.
  const productosAgotadosHaceDias = new Set(
    variantesSinStock.filter((v) => variantesEstancadas.has(v.id)).map((v) => v.productId)
  );

  // ── El agotado que además es de los que más se venden ──
  // Es el dato que la campanita no tiene: avisa que se agotó algo, no que se
  // agotó justo lo que más salía.
  const productIdsSinStock = new Set(variantesSinStock.map((v) => v.productId));
  const topAgotadoId = itemsTop.find((t) => productIdsSinStock.has(t.productId))?.productId ?? null;

  // Los nombres, en una sola consulta para las dos cosas.
  const idsANombrar = [...new Set([itemsTop[0]?.productId, topAgotadoId].filter(Boolean) as string[])];
  const nombres = idsANombrar.length
    ? await prisma.product.findMany({ where: { id: { in: idsANombrar } }, select: { id: true, name: true } })
    : [];
  const nombrePorId = new Map(nombres.map((p) => [p.id, p.name]));

  const diasDesdeUltimaVenta = ultimaVenta
    ? Math.floor((now.getTime() - ultimaVenta.createdAt.getTime()) / 86_400_000)
    : null;

  return {
    esTipoConsultas,
    pedidosPendientes,
    productosStockBajo: productIdsStockBajo.size,
    // Por producto, no por variante: la consulta trae variantes (necesita el id
    // para el cruce con los movimientos de stock) así que acá hay que deduplicar.
    // Antes la consulta tenía `distinct: ["productId"]` y contaba productos; sin
    // esta línea el número pasaría a ser otro sin que nada falle.
    productosSinStock: productIdsSinStock.size,
    ventasUltimos30Dias,
    ventasPrevios30Dias,
    tendenciaVentas,
    productoTop: itemsTop[0] ? nombrePorId.get(itemsTop[0].productId) ?? null : null,
    diasDesdeUltimaVenta,
    carritosAbandonadosPendientes,

    pedidosEstancados: pedidosEstancadosAgg._count,
    montoPedidosEstancados: pedidosEstancadosAgg._sum.total ?? 0,
    confirmadosSinDespachar: sinDespacharAgg._count,
    agotadosHaceDias: productosAgotadosHaceDias.size,
    agotadoQueMasVendias: topAgotadoId ? nombrePorId.get(topAgotadoId) ?? null : null,
    marketing,
  };
}
