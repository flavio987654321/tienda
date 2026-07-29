import { prisma } from "@/lib/prisma";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/stockMovements";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import { RUIDO_PCT } from "@/lib/resumen-mes";
import {
  getArgentinaDayKey, inicioDiaArgentino, sumarDiasCalendario,
} from "@/lib/fechas-comerciales";

/**
 * Tipos de tienda "de consultas" (sin pedidos/carrito, ej. autos) — debe coincidir
 * con LEADS_STORE_TYPES en src/components/DashboardLayout.tsx.
 */
const LEADS_STORE_TYPES = ["AUTOS"];

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

export async function getStoreSnapshot(storeId: string, tipoTienda: string): Promise<StoreSnapshot> {
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

      prisma.productVariant.findMany({
        where: { stock: 0, product: { storeId, deletedAt: null, isActive: true } },
        select: { productId: true },
        distinct: ["productId"],
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
        take: 1,
      }),

      esTipoConsultas
        ? Promise.resolve(0)
        : prisma.abandonedCart.count({ where: { storeId, recoveredAt: null } }),
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

  let productoTop: string | null = null;
  if (itemsTop.length > 0) {
    const top = await prisma.product.findUnique({
      where: { id: itemsTop[0].productId },
      select: { name: true },
    });
    productoTop = top?.name ?? null;
  }

  const diasDesdeUltimaVenta = ultimaVenta
    ? Math.floor((now.getTime() - ultimaVenta.createdAt.getTime()) / 86_400_000)
    : null;

  return {
    esTipoConsultas,
    pedidosPendientes,
    productosStockBajo: productIdsStockBajo.size,
    productosSinStock: variantesSinStock.length,
    ventasUltimos30Dias,
    ventasPrevios30Dias,
    tendenciaVentas,
    productoTop,
    diasDesdeUltimaVenta,
    carritosAbandonadosPendientes,
  };
}
