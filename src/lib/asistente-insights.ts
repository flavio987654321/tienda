import { prisma } from "@/lib/prisma";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/stockMovements";

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
 * para que Sacha vea exactamente lo mismo que ya ve el dueño en pantalla.
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
  const hace30 = new Date(now.getTime() - 30 * 86_400_000);
  const hace60 = new Date(now.getTime() - 60 * 86_400_000);

  const [
    pedidosPendientes,
    variantesConUmbralPropio,
    variantesSinUmbral,
    variantesSinStock,
    ventasRecientes,
    ventasAnteriores,
    ultimaVenta,
    itemsTop,
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
        where: { storeId, status: { not: "CANCELLED" }, createdAt: { gte: hace30 } },
        _sum: { total: true },
      }),

      prisma.order.aggregate({
        where: { storeId, status: { not: "CANCELLED" }, createdAt: { gte: hace60, lt: hace30 } },
        _sum: { total: true },
      }),

      prisma.order.findFirst({
        where: { storeId, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),

      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { storeId, status: { not: "CANCELLED" }, createdAt: { gte: hace30 } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 1,
      }),
    ]);

  const productIdsStockBajo = new Set(variantesSinUmbral.map((v) => v.productId));
  for (const v of variantesConUmbralPropio) {
    if (v.stock <= (v.lowStockThreshold as number)) productIdsStockBajo.add(v.productId);
  }

  const ventasUltimos30Dias = ventasRecientes._sum.total ?? 0;
  const ventasPrevios30Dias = ventasAnteriores._sum.total ?? 0;

  let tendenciaVentas: StoreSnapshot["tendenciaVentas"] = "sin_datos";
  if (ventasUltimos30Dias === 0 && ventasPrevios30Dias === 0) {
    tendenciaVentas = "sin_datos";
  } else if (ventasUltimos30Dias > ventasPrevios30Dias * 1.1) {
    tendenciaVentas = "subiendo";
  } else if (ventasUltimos30Dias < ventasPrevios30Dias * 0.9) {
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
  };
}
