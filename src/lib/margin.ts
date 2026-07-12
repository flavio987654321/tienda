// Cálculos puros de margen de ganancia — sin acceso a base de datos, para
// poder testear los casos límite (sin costo, costo > precio) de forma aislada.

export type MarginResult =
  | { kind: "no-cost" }
  | { kind: "loss"; profit: number; marginPct: number }
  | { kind: "ok"; profit: number; marginPct: number };

export function calcMargin(price: number, cost: number | null | undefined): MarginResult {
  if (cost == null || !Number.isFinite(cost) || cost <= 0) return { kind: "no-cost" };
  if (!Number.isFinite(price) || price <= 0) return { kind: "no-cost" };

  const profit = price - cost;
  const marginPct = (profit / price) * 100;
  return { kind: profit < 0 ? "loss" : "ok", profit, marginPct };
}

export function calcVehicleCostTotal(gastos: { monto: number }[]): number {
  return gastos.reduce((sum, g) => sum + (Number.isFinite(g.monto) ? g.monto : 0), 0);
}

// Formatea una fecha "YYYY-MM-DD" (o un ISO datetime "YYYY-MM-DDTHH:mm:ss.sssZ",
// como llega desde la API tras serializar un DateTime de Prisma) a "D/M/YYYY" sin
// pasar por Date/UTC — new Date("YYYY-MM-DD") se interpreta como medianoche UTC, y
// toLocaleDateString() la vuelve a convertir a la zona horaria local, lo que puede
// mostrar el día anterior (ej. Argentina, UTC-3).
export function formatFechaGasto(fecha: string): string {
  const datePart = fecha.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

export function calcVehicleProfit(
  soldPrice: number | null | undefined,
  gastos: { monto: number }[]
): number | null {
  if (soldPrice == null || !Number.isFinite(soldPrice)) return null;
  return soldPrice - calcVehicleCostTotal(gastos);
}

// ── Rentabilidad por producto (tienda con carrito, no Autos) ──────────────────
//
// El cupón de un pedido se aplica una sola vez a nivel de TODO el pedido
// (Order.discountAmount), no por ítem. Para saber cuánto ganó realmente cada
// producto hay que repartir ese descuento proporcionalmente al peso de cada
// ítem dentro del subtotal del pedido. El total general (sumando todos los
// productos) siempre da exacto — el prorrateo solo afecta el desglose por
// producto individual cuando ese pedido puntual tuvo cupón.
export function calcItemNetRevenue(
  itemPrice: number,
  quantity: number,
  orderSubtotal: number,
  orderDiscount: number
): number {
  const itemRevenue = itemPrice * quantity;
  if (orderDiscount <= 0 || orderSubtotal <= 0) return itemRevenue;
  const share = itemRevenue / orderSubtotal;
  return Math.max(0, itemRevenue - orderDiscount * share);
}

export type ProfitOrderItem = {
  productId: string;
  quantity: number;
  price: number;
  costAtSale: number | null;
  orderSubtotal: number;
  orderDiscount: number;
  dateStr: string;
};

export type ProductProfitSummary = {
  quantity: number;
  netRevenue: number;
  // null = ningún ítem vendido de este producto en el rango tenía costo cargado —
  // "sin dato", nunca se muestra como 0 de ganancia.
  profit: number | null;
  hasCoupon: boolean;
};

export type ProfitabilityAggregate = {
  totalProfit: number;
  totalNetRevenueKnownCost: number;
  totalNetRevenueAll: number;
  byProduct: Map<string, ProductProfitSummary>;
  dailyProfit: Map<string, number>;
  dailyCost: Map<string, number>;
};

export function aggregateProfitability(items: ProfitOrderItem[]): ProfitabilityAggregate {
  let totalProfit = 0;
  let totalNetRevenueKnownCost = 0;
  let totalNetRevenueAll = 0;
  const internal = new Map<string, { quantity: number; netRevenue: number; profitSum: number; hasCost: boolean; hasCoupon: boolean }>();
  const dailyProfit = new Map<string, number>();
  const dailyCost = new Map<string, number>();

  for (const it of items) {
    const netRevenue = calcItemNetRevenue(it.price, it.quantity, it.orderSubtotal, it.orderDiscount);
    totalNetRevenueAll += netRevenue;

    const entry = internal.get(it.productId) ?? { quantity: 0, netRevenue: 0, profitSum: 0, hasCost: false, hasCoupon: false };
    entry.quantity += it.quantity;
    entry.netRevenue += netRevenue;
    if (it.orderDiscount > 0) entry.hasCoupon = true;

    if (it.costAtSale != null) {
      const cost = it.costAtSale * it.quantity;
      const profit = netRevenue - cost;
      entry.profitSum += profit;
      entry.hasCost = true;

      totalProfit += profit;
      totalNetRevenueKnownCost += netRevenue;
      dailyProfit.set(it.dateStr, (dailyProfit.get(it.dateStr) ?? 0) + profit);
      dailyCost.set(it.dateStr, (dailyCost.get(it.dateStr) ?? 0) + cost);
    }

    internal.set(it.productId, entry);
  }

  const byProduct = new Map<string, ProductProfitSummary>();
  for (const [productId, e] of internal) {
    byProduct.set(productId, {
      quantity: e.quantity,
      netRevenue: e.netRevenue,
      profit: e.hasCost ? e.profitSum : null,
      hasCoupon: e.hasCoupon,
    });
  }

  return { totalProfit, totalNetRevenueKnownCost, totalNetRevenueAll, byProduct, dailyProfit, dailyCost };
}
