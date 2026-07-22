export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import AutoRefresh from "@/components/AutoRefresh";
import type { LucideIcon } from "lucide-react";
import { statusLabel } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Eye,
  MousePointerClick,
  MessageSquare,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { ExportButtons } from "./ExportButtons";
import ShareStatsButton from "./ShareStatsButton";
import { aggregateProfitability, calcVehicleProfit, type ProfitOrderItem } from "@/lib/margin";

// ─── Rango de fechas ──────────────────────────────────────────────────────────
// Todas las comparaciones usan ventanas de igual longitud (período actual vs.
// el período inmediatamente anterior de la misma cantidad de días). Así se evita
// comparar un mes a medias contra un mes anterior completo.

const RANGE_OPTIONS = [7, 30, 90] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];
const RANGE_LABELS: Record<RangeDays, string> = { 7: "7 días", 30: "30 días", 90: "90 días" };

function utcDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function utcDayLabel(dateStr: string) {
  const [, m, day] = dateStr.split("-");
  return `${parseInt(day, 10)}/${parseInt(m, 10)}`;
}

function addUtcDays(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

// Construye una serie diaria en UTC para cualquier colección con fecha + valor.
// Se usa para ingresos, consultas y visitas — así los tres gráficos quedan
// alineados al mismo eje de fechas (antes, visitas usaba UTC e ingresos/consultas
// usaban la hora local del servidor, y podían desalinearse un día).
function buildDailySeries(
  rangeStart: Date,
  rangeDays: number,
  entries: { dateStr: string; value: number }[]
) {
  const map = new Map<string, number>();
  for (let i = 0; i < rangeDays; i++) {
    map.set(utcDateStr(addUtcDays(rangeStart, i)), 0);
  }
  for (const { dateStr, value } of entries) {
    if (map.has(dateStr)) map.set(dateStr, (map.get(dateStr) ?? 0) + value);
  }
  return [...map.entries()].map(([dateStr, value]) => ({ label: utcDayLabel(dateStr), value }));
}

function pctDiff(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Helpers de presentación ──────────────────────────────────────────────────

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-400",
    CONFIRMED: "bg-green-500",
    SHIPPED: "bg-blue-500",
    DELIVERED: "bg-indigo-600",
    CANCELLED: "bg-red-400",
  };
  return map[status] ?? "bg-gray-400";
}

// ─── UI Components ────────────────────────────────────────────────────────────

function shortMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function shortNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function LineChart({
  data,
  color = "#6366f1",
  gradId,
  formatter = shortNum,
}: {
  data: { label: string; value: number }[];
  color?: string;
  gradId: string;
  formatter?: (n: number) => string;
}) {
  const W = 580, H = 180;
  const padL = 46, padR = 12, padT = 24, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...data.map((d) => d.value), 1);
  const GRID = 4;

  const xs = data.map((_, i) =>
    data.length === 1 ? padL + innerW / 2 : padL + (i / (data.length - 1)) * innerW
  );
  const ys = data.map((d) => padT + (1 - d.value / max) * innerH);

  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${(padT + innerH).toFixed(1)} L${xs[0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const labelStep = Math.max(1, Math.ceil(data.length / 9));
  const peakIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px]">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {Array.from({ length: GRID + 1 }, (_, i) => {
          const v = (max / GRID) * i;
          const y = padT + (1 - v / max) * innerH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y}
                stroke={i === 0 ? "#e5e7eb" : "#f3f4f6"} strokeWidth={i === 0 ? 1 : 0.5} />
              <text x={padL - 5} y={y + 3.5} textAnchor="end" fontSize={8.5} fill="#9ca3af">
                {formatter(v)}
              </text>
            </g>
          );
        })}

        {/* Área rellena */}
        {hasData && <path d={areaPath} fill={`url(#${gradId})`} />}

        {/* Línea */}
        <path d={linePath} fill="none" stroke={hasData ? color : "#e5e7eb"}
          strokeWidth={hasData ? 2 : 1} strokeLinejoin="round" strokeLinecap="round" />

        {/* Punto pico con etiqueta */}
        {hasData && (
          <g>
            <circle cx={xs[peakIdx]} cy={ys[peakIdx]} r={4} fill={color} />
            <text x={xs[peakIdx]} y={ys[peakIdx] - 9} textAnchor="middle"
              fontSize={9} fontWeight="700" fill={color}>
              {formatter(data[peakIdx].value)}
            </text>
          </g>
        )}

        {/* Etiquetas eje X */}
        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" fontSize={8.5} fill="#9ca3af">
              {d.label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number | null;
  icon: LucideIcon;
  iconBg: string;
}

function KPICard({ label, value, sub, trend, icon: Icon, iconBg }: KPICardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== null && trend !== undefined && (
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              trend >= 0
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-500"
            }`}
            title="vs. el período anterior de igual duración"
          >
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function RangeSelector({ active }: { active: RangeDays }) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
      {RANGE_OPTIONS.map((r) => (
        <Link
          key={r}
          href={r === 30 ? "/dashboard/metricas" : `/dashboard/metricas?range=${r}`}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            r === active ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          {RANGE_LABELS[r]}
        </Link>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, tipoTienda: true },
  });
  if (!store) redirect("/dashboard");

  const isAutos = store.tipoTienda === "AUTOS";

  const { range } = await searchParams;
  const parsedRange = Number(range);
  const rangeDays: RangeDays = (RANGE_OPTIONS as readonly number[]).includes(parsedRange)
    ? (parsedRange as RangeDays)
    : 30;

  const now = new Date();

  // ── Ventanas de comparación: período actual vs. período anterior de igual duración ──
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const periodStart = addUtcDays(todayUtc, -(rangeDays - 1));
  const periodEndExclusive = addUtcDays(todayUtc, 1);
  const prevPeriodStart = addUtcDays(periodStart, -rangeDays);
  const prevPeriodEndExclusive = periodStart;

  const periodStartStr = utcDateStr(periodStart);
  const prevPeriodStartStr = utcDateStr(prevPeriodStart);
  const prevPeriodEndStr = utcDateStr(addUtcDays(prevPeriodEndExclusive, -1));

  const CONFIRMED_ORDER_STATUSES = ["CONFIRMED", "SHIPPED", "DELIVERED"];

  // (queries compartidas eliminadas — Push/Reseñas/Afiliados tienen sus propios paneles)

  // ── Queries AUTOS ──
  let leadsPeriodRaw: { createdAt: Date }[] = [];
  let leadsTotal = 0, leadsConfirmedTotal = 0, leadsPrevCount = 0;
  let leadsConfirmedCurrent = 0, leadsConfirmedPrev = 0;
  let vehiculosDisponibles = 0, vehiculosVendidos = 0, vehiculosReservados = 0;
  let soldPriceAvg: { _avg: { soldPrice: number | null } } = { _avg: { soldPrice: null } };

  if (isAutos) {
    [
      leadsPeriodRaw,
      leadsTotal,
      leadsConfirmedTotal,
      leadsPrevCount,
      leadsConfirmedCurrent,
      leadsConfirmedPrev,
      vehiculosDisponibles,
      vehiculosVendidos,
      vehiculosReservados,
      soldPriceAvg,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: { storeId: store.id, createdAt: { gte: periodStart, lt: periodEndExclusive } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.lead.count({ where: { storeId: store.id } }),
      prisma.lead.count({ where: { storeId: store.id, status: "CONFIRMED" } }),
      prisma.lead.count({
        where: { storeId: store.id, createdAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive } },
      }),
      // "Confirmada" = se marcó como venta confirmada dentro del período (no cuándo se creó la consulta)
      prisma.lead.count({
        where: { storeId: store.id, confirmedAt: { gte: periodStart, lt: periodEndExclusive } },
      }),
      prisma.lead.count({
        where: { storeId: store.id, confirmedAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive } },
      }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "AVAILABLE" } }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD" } }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "RESERVED" } }),
      prisma.product.aggregate({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD" }, _avg: { soldPrice: true } }),
    ]);
  }

  // ── Queries tienda normal (no AUTOS) ──
  let ordersPeriod: { total: number; status: string; createdAt: Date }[] = [];
  let revenuePrevAgg: { _sum: { total: number | null } } = { _sum: { total: null } };
  let ordersPrevCount = 0;
  let topProducts: { productId: string; _sum: { quantity: number | null } }[] = [];
  let ordersByStatus: { status: string; _count: number }[] = [];

  if (!isAutos) {
    [ordersPeriod, revenuePrevAgg, ordersPrevCount, topProducts, ordersByStatus] = await Promise.all([
      prisma.order.findMany({
        where: { storeId: store.id, createdAt: { gte: periodStart, lt: periodEndExclusive }, status: { not: "CANCELLED" } },
        select: { total: true, status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.aggregate({
        where: {
          storeId: store.id,
          createdAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive },
          status: { in: CONFIRMED_ORDER_STATUSES },
        },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { storeId: store.id, createdAt: { gte: prevPeriodStart, lt: prevPeriodEndExclusive }, status: { not: "CANCELLED" } },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { storeId: store.id, status: { in: CONFIRMED_ORDER_STATUSES } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.groupBy({ by: ["status"], where: { storeId: store.id }, _count: true }),
    ]);
  }

  // ── Rentabilidad (no-AUTOS) ── Una sola query que cubre período actual + anterior
  // (misma ventana doble que ya usa el resto de la página) para no duplicar el pedido a la DB.
  let profitCurrentAgg = aggregateProfitability([]);
  let profitPrevTotalProfit = 0;
  if (!isAutos) {
    const rawProfitItems = await prisma.orderItem.findMany({
      where: {
        order: {
          storeId: store.id,
          status: { in: CONFIRMED_ORDER_STATUSES },
          createdAt: { gte: prevPeriodStart, lt: periodEndExclusive },
        },
      },
      select: {
        productId: true, quantity: true, price: true, lineTotal: true, costAtSale: true,
        order: { select: { subtotal: true, discountAmount: true, createdAt: true } },
      },
    });
    const currentItems: ProfitOrderItem[] = [];
    const prevItems: ProfitOrderItem[] = [];
    for (const it of rawProfitItems) {
      const dateStr = utcDateStr(it.order.createdAt);
      const mapped: ProfitOrderItem = {
        productId: it.productId, quantity: it.quantity, price: it.price, lineTotal: it.lineTotal, costAtSale: it.costAtSale,
        orderSubtotal: it.order.subtotal, orderDiscount: it.order.discountAmount, dateStr,
      };
      (dateStr >= periodStartStr ? currentItems : prevItems).push(mapped);
    }
    profitCurrentAgg = aggregateProfitability(currentItems);
    profitPrevTotalProfit = aggregateProfitability(prevItems).totalProfit;
  }

  // ── #7c — el envío que la tienda regaló en el período ──
  // Va APARTE de la ganancia por producto a propósito: es un costo por PEDIDO, y
  // repartirlo entre los productos del carrito sería inventar un número que
  // después aparecería en "Rentabilidad por producto" como si fuera real.
  // Hasta acá este costo no existía en ningún lado y esa plata se contaba como
  // ganancia — una promo de envío gratis mejoraba las métricas en vez de costar.
  let shippingWaivedPeriod = 0;
  if (!isAutos) {
    const waived = await prisma.order.aggregate({
      where: {
        storeId: store.id,
        status: { in: CONFIRMED_ORDER_STATUSES },
        createdAt: { gte: periodStart, lt: periodEndExclusive },
      },
      _sum: { shippingWaived: true },
    });
    shippingWaivedPeriod = waived._sum.shippingWaived ?? 0;
  }

  // ── Rentabilidad de vehículos vendidos en el período (AUTOS) ──
  // Un vehículo solo cuenta para la ganancia si tiene al menos un gasto cargado —
  // si nunca se cargó ni la "Compra", sumar soldPrice - 0 mostraría el 100% del
  // precio de venta como ganancia, lo cual sería falso.
  let soldVehiclesPeriod: { id: string; soldPrice: number | null; expenses: { monto: number }[] }[] = [];
  if (isAutos) {
    soldVehiclesPeriod = await prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD", soldAt: { gte: periodStart, lt: periodEndExclusive } },
      select: { id: true, soldPrice: true, expenses: { select: { monto: true } } },
    });
  }
  const soldVehiclesWithGastos = soldVehiclesPeriod.filter((v) => v.expenses.length > 0);
  const vehicleProfits = soldVehiclesWithGastos
    .map((v) => calcVehicleProfit(v.soldPrice, v.expenses))
    .filter((p): p is number => p != null);
  const totalVehicleProfit = vehicleProfits.reduce((s, p) => s + p, 0);
  const avgVehicleProfit = vehicleProfits.length > 0 ? totalVehicleProfit / vehicleProfits.length : null;

  // ── Queries de StoreView (requieren migración SQL — fallan silenciosamente si la tabla no existe) ──
  let viewsPrevAgg: { _sum: { count: number | null } } = { _sum: { count: null } };
  let viewsPeriodRaw: { date: string; count: number }[] = [];
  try {
    [viewsPrevAgg, viewsPeriodRaw] = await Promise.all([
      prisma.storeView.aggregate({
        where: { storeId: store.id, date: { gte: prevPeriodStartStr, lte: prevPeriodEndStr } },
        _sum: { count: true },
      }),
      prisma.storeView.findMany({
        where: { storeId: store.id, date: { gte: periodStartStr } },
        select: { date: true, count: true },
        orderBy: { date: "asc" },
      }),
    ]);
  } catch (err) {
    console.error("[metricas] StoreView aggregate falló — ¿falta la migración?", err);
  }

  // ── Nombres de productos para el top y para la tabla de rentabilidad ──
  const productIds = Array.from(new Set([...topProducts.map((p) => p.productId), ...profitCurrentAgg.byProduct.keys()]));
  const productNames = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameMap = Object.fromEntries(productNames.map((p) => [p.id, p.name]));

  // ── Series diarias (todas en UTC, mismo eje de fechas) ──
  const revenueChartData = buildDailySeries(
    periodStart,
    rangeDays,
    ordersPeriod.map((o) => ({ dateStr: utcDateStr(o.createdAt), value: o.total }))
  );
  const leadsChartData = buildDailySeries(
    periodStart,
    rangeDays,
    leadsPeriodRaw.map((l) => ({ dateStr: utcDateStr(l.createdAt), value: 1 }))
  );
  const visitsChartData = buildDailySeries(
    periodStart,
    rangeDays,
    viewsPeriodRaw.map((v) => ({ dateStr: v.date, value: v.count }))
  );

  // ── Métricas calculadas — tienda normal ──
  const totalOrdersPeriod = ordersPeriod.length;
  const totalRevenuePeriod = ordersPeriod
    .filter((o) => CONFIRMED_ORDER_STATUSES.includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const totalRevenuePrev = revenuePrevAgg._sum.total ?? 0;
  const revDiff = pctDiff(totalRevenuePeriod, totalRevenuePrev);
  const ordersDiff = pctDiff(totalOrdersPeriod, ordersPrevCount);
  const avgTicket = totalOrdersPeriod > 0 ? totalRevenuePeriod / totalOrdersPeriod : 0;

  const totalViewsPeriod = visitsChartData.reduce((s, v) => s + v.value, 0);
  const totalViewsPrev = viewsPrevAgg._sum.count ?? 0;
  const viewsDiff = pctDiff(totalViewsPeriod, totalViewsPrev);

  const conversionRate =
    totalViewsPeriod > 0 ? ((totalOrdersPeriod / totalViewsPeriod) * 100).toFixed(1) : null;

  const totalOrdersAllStatuses = ordersByStatus.reduce((s, o) => s + o._count, 0);

  // ── Rentabilidad — tienda normal ──
  const profitChartData = buildDailySeries(
    periodStart,
    rangeDays,
    [...profitCurrentAgg.dailyProfit.entries()].map(([dateStr, value]) => ({ dateStr, value }))
  );
  const profitDiff = pctDiff(profitCurrentAgg.totalProfit, profitPrevTotalProfit);
  const marginPctPeriod = profitCurrentAgg.totalNetRevenueKnownCost > 0
    ? (profitCurrentAgg.totalProfit / profitCurrentAgg.totalNetRevenueKnownCost) * 100
    : null;
  const costCoveragePct = profitCurrentAgg.totalNetRevenueAll > 0
    ? Math.round((profitCurrentAgg.totalNetRevenueKnownCost / profitCurrentAgg.totalNetRevenueAll) * 100)
    : 0;
  const profitByProductRanked = [...profitCurrentAgg.byProduct.entries()]
    .filter(([, p]) => p.profit !== null)
    .sort((a, b) => (b[1].profit ?? 0) - (a[1].profit ?? 0))
    .slice(0, 8);
  const productsWithoutCostCount = [...profitCurrentAgg.byProduct.values()].filter((p) => p.profit === null).length;

  // ── Métricas calculadas — AUTOS ──
  const totalLeadsPeriod = leadsPeriodRaw.length;
  const leadsDiff = pctDiff(totalLeadsPeriod, leadsPrevCount);
  const leadsConfirmedDiff = pctDiff(leadsConfirmedCurrent, leadsConfirmedPrev);
  const leadsConversionRate =
    leadsTotal > 0 ? Math.round((leadsConfirmedTotal / leadsTotal) * 100) : null;
  const avgSoldPrice = soldPriceAvg._avg.soldPrice ?? 0;

  // ── Render ──
  return (
    <DashboardLayout userName={user.name} userId={user.id}>
      {/* Las métricas salen de los pedidos: una venta nueva las recalcula sola */}
      <AutoRefresh tables={["Order"]} />
      {/* Estilos de impresión — oculta sidebar y nav al guardar como PDF */}
      <style>{`
        @media print {
          nav, aside, header, [data-sidebar], .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .rounded-2xl { border-radius: 8px !important; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
            <p className="mt-1 text-sm text-gray-500">
              <strong>{store.name}</strong> — últimos {rangeDays} días vs. período anterior de igual duración
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <RangeSelector active={rangeDays} />
            <div className="flex items-center gap-2">
              <ExportButtons range={rangeDays} storeSlug={store.slug} />
              <ShareStatsButton
                storeName={store.name}
                period={rangeDays}
                revenue={totalRevenuePeriod}
                orders={totalOrdersPeriod}
                visits={totalViewsPeriod}
                isAutos={isAutos}
                leads={totalLeadsPeriod}
                confirmedSales={leadsConfirmedCurrent}
              />
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        {isAutos ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label={`Consultas (${RANGE_LABELS[rangeDays]})`}
              value={totalLeadsPeriod}
              sub={`${leadsTotal} en total`}
              trend={leadsDiff}
              icon={MessageSquare}
              iconBg="bg-indigo-50 text-indigo-600"
            />
            <KPICard
              label={`Ventas confirmadas (${RANGE_LABELS[rangeDays]})`}
              value={leadsConfirmedCurrent}
              sub={leadsConversionRate !== null ? `${leadsConversionRate}% de conversión histórica` : "Sin datos"}
              trend={leadsConfirmedDiff}
              icon={TrendingUp}
              iconBg="bg-green-50 text-green-600"
            />
            <KPICard
              label="Precio prom. de venta"
              value={avgSoldPrice > 0 ? money(avgSoldPrice) : "—"}
              sub={vehiculosVendidos > 0 ? `${vehiculosVendidos} vehículo${vehiculosVendidos !== 1 ? "s" : ""} vendido${vehiculosVendidos !== 1 ? "s" : ""} en total` : "Sin ventas aún"}
              icon={ShoppingBag}
              iconBg="bg-amber-50 text-amber-600"
            />
            <KPICard
              label={`Visitas (${RANGE_LABELS[rangeDays]})`}
              value={totalViewsPeriod.toLocaleString("es-AR")}
              sub={viewsDiff === null ? "Sin datos del período anterior" : undefined}
              trend={viewsDiff}
              icon={Eye}
              iconBg="bg-blue-50 text-blue-600"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label={`Ingresos (${RANGE_LABELS[rangeDays]})`}
              value={money(totalRevenuePeriod)}
              sub={revDiff === null ? "Sin datos del período anterior" : undefined}
              trend={revDiff}
              icon={TrendingUp}
              iconBg="bg-green-50 text-green-600"
            />
            <KPICard
              label={`Pedidos (${RANGE_LABELS[rangeDays]})`}
              value={totalOrdersPeriod}
              sub={`Ticket prom. ${money(avgTicket)}`}
              trend={ordersDiff}
              icon={ShoppingBag}
              iconBg="bg-indigo-50 text-indigo-600"
            />
            <KPICard
              label={`Visitas (${RANGE_LABELS[rangeDays]})`}
              value={totalViewsPeriod.toLocaleString("es-AR")}
              sub={viewsDiff === null ? "Sin datos del período anterior" : undefined}
              trend={viewsDiff}
              icon={Eye}
              iconBg="bg-blue-50 text-blue-600"
            />
            <KPICard
              label="Conversión"
              value={conversionRate !== null ? `${conversionRate}%` : "—"}
              sub="visitas → pedidos"
              icon={MousePointerClick}
              iconBg="bg-emerald-50 text-emerald-600"
            />
          </div>
        )}

        {/* ── Gráficos ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {isAutos ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="font-bold text-gray-900">Consultas diarias</h2>
                <p className="text-xl font-black text-indigo-600">{totalLeadsPeriod}</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">Últimos {rangeDays} días</p>
              <LineChart data={leadsChartData} color="#6366f1" gradId="grad-indigo" formatter={shortNum} />
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="font-bold text-gray-900">Ingresos confirmados</h2>
                <p className="text-xl font-black text-green-600">{money(totalRevenuePeriod)}</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">Últimos {rangeDays} días</p>
              <LineChart data={revenueChartData} color="#16a34a" gradId="grad-green" formatter={shortMoney} />
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center justify-between mb-0.5">
              <h2 className="font-bold text-gray-900">Visitas a tu tienda</h2>
              <p className="text-xl font-black text-blue-600">{totalViewsPeriod.toLocaleString("es-AR")}</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {totalViewsPeriod === 0
                ? "Las visitas del propio dueño no se cuentan"
                : `Últimos ${rangeDays} días`}
            </p>
            <LineChart data={visitsChartData} color="#2563eb" gradId="grad-blue" formatter={shortNum} />
          </div>
        </div>

        {/* ── Sección central: AUTOS = estado de flota | resto = productos + pedidos ── */}
        {isAutos ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { label: "Disponibles", count: vehiculosDisponibles, color: "bg-emerald-500", dot: "bg-emerald-100 text-emerald-700" },
              { label: "Reservados",  count: vehiculosReservados,  color: "bg-amber-500",   dot: "bg-amber-100 text-amber-700"   },
              { label: "Vendidos",    count: vehiculosVendidos,    color: "bg-gray-400",    dot: "bg-gray-100 text-gray-600"     },
            ].map(({ label, count, color, dot }) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-white p-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">{count}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dot}`}>{label}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="mb-5 font-bold text-gray-900">Productos más vendidos</h2>
              {topProducts.length === 0 ? (
                <div className="py-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Sin ventas confirmadas aún</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Los productos aparecen acá cuando tenés pedidos en estado Confirmado, Enviado o Entregado. Confirmá tus primeros pedidos para ver el ranking.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const maxQty = topProducts[0]._sum.quantity ?? 1;
                    return topProducts.map((p, i) => {
                      const qty = p._sum.quantity ?? 0;
                      const pct = Math.round((qty / maxQty) * 100);
                      return (
                        <div key={p.productId}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 shrink-0 text-xs font-bold text-gray-400">#{i + 1}</span>
                              <span className="font-medium text-gray-800 truncate">{nameMap[p.productId] ?? "Producto eliminado"}</span>
                            </div>
                            <span className="ml-2 shrink-0 font-bold text-gray-700">{qty} u.</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900">Pedidos por estado</h2>
                <span className="text-sm font-semibold text-gray-400">{totalOrdersAllStatuses} total</span>
              </div>
              {ordersByStatus.length === 0 ? (
                <div className="py-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Sin pedidos aún</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Cuando lleguen pedidos vas a ver acá cómo se distribuyen por estado — cuántos están pendientes, confirmados, enviados y entregados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ordersByStatus.sort((a, b) => b._count - a._count).map((s) => {
                    const pct = totalOrdersAllStatuses > 0 ? Math.round((s._count / totalOrdersAllStatuses) * 100) : 0;
                    return (
                      <div key={s.status}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor(s.status)}`} />
                            <span className="text-gray-700">{statusLabel(s.status)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{s._count}</span>
                            <span className="w-8 text-right text-xs text-gray-400">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100">
                          <div className={`h-1.5 rounded-full transition-all ${statusColor(s.status)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Rentabilidad ── */}
        {isAutos ? (
          soldVehiclesPeriod.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="font-bold text-gray-900 mb-1">Rentabilidad</h2>
              <p className="text-sm text-gray-500">Sin vehículos vendidos en el período.</p>
            </div>
          ) : soldVehiclesWithGastos.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <h2 className="font-bold text-gray-900 mb-1">Rentabilidad</h2>
              <p className="text-sm text-gray-500">
                Cargá los gastos de tus vehículos vendidos para ver la ganancia acá.{" "}
                <Link href="/dashboard/productos" className="text-indigo-600 font-semibold hover:underline">Ir a Productos</Link>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <KPICard
                label="Ganancia total del período"
                value={money(totalVehicleProfit)}
                sub={`${soldVehiclesWithGastos.length} de ${soldVehiclesPeriod.length} vehículo${soldVehiclesPeriod.length !== 1 ? "s" : ""} vendido${soldVehiclesPeriod.length !== 1 ? "s" : ""} con gastos cargados`}
                icon={Wallet}
                iconBg="bg-emerald-50 text-emerald-600"
              />
              <KPICard
                label="Ganancia promedio por vehículo vendido"
                value={avgVehicleProfit !== null ? money(avgVehicleProfit) : "—"}
                icon={TrendingUp}
                iconBg="bg-indigo-50 text-indigo-600"
              />
            </div>
          )
        ) : profitCurrentAgg.totalNetRevenueKnownCost === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="font-bold text-gray-900 mb-1">Rentabilidad</h2>
            <p className="text-sm text-gray-500">
              Cargá el costo de tus productos para ver tu rentabilidad acá.{" "}
              <Link href="/dashboard/productos" className="text-indigo-600 font-semibold hover:underline">Ir a Productos</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <KPICard
                label={`Ganancia bruta (${RANGE_LABELS[rangeDays]})`}
                value={money(profitCurrentAgg.totalProfit)}
                sub={profitDiff === null ? "Sin datos del período anterior" : undefined}
                trend={profitDiff}
                icon={Wallet}
                iconBg="bg-emerald-50 text-emerald-600"
              />
              <KPICard
                label="Margen promedio"
                value={marginPctPeriod !== null ? `${marginPctPeriod.toFixed(0)}%` : "—"}
                sub={`${costCoveragePct}% de tus ventas del período tienen costo cargado`}
                icon={TrendingUp}
                iconBg="bg-indigo-50 text-indigo-600"
              />
            </div>

            {/* #7c — el envío bonificado, restado a la vista. Solo aparece si de
                verdad se regaló algún envío en el período: una tienda sin promos
                de envío no tiene por qué ver una fila en cero. */}
            {shippingWaivedPeriod > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-gray-900">Envíos que regalaste</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Lo que te costaron los envíos bonificados por tus promociones. No se lo cobraste al cliente, pero lo pagaste vos.
                    </p>
                  </div>
                  <p className="text-xl font-black text-rose-600">−{money(shippingWaivedPeriod)}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700">Ganancia después de los envíos</p>
                  <p className="text-xl font-black text-gray-900">{money(profitCurrentAgg.totalProfit - shippingWaivedPeriod)}</p>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <div className="flex items-center justify-between mb-0.5">
                  <h2 className="font-bold text-gray-900">Ganancia diaria</h2>
                  <p className="text-xl font-black text-violet-600">{money(profitCurrentAgg.totalProfit)}</p>
                </div>
                <p className="text-xs text-gray-400 mb-4">Últimos {rangeDays} días — solo ventas con costo cargado</p>
                <LineChart data={profitChartData} color="#7c3aed" gradId="grad-violet" formatter={shortMoney} />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h2 className="font-bold text-gray-900 mb-5">Rentabilidad por producto</h2>
                {profitByProductRanked.length === 0 ? (
                  <p className="text-sm text-gray-500">Ningún producto vendido en el período tiene costo cargado todavía.</p>
                ) : (
                  <div className="space-y-3">
                    {profitByProductRanked.map(([productId, p]) => (
                      <div key={productId} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-gray-800 truncate">{nameMap[productId] ?? "Producto eliminado"}</span>
                          {p.hasCoupon && (
                            <span title="Incluye pedidos con cupón — ganancia parcialmente estimada">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-emerald-600 shrink-0">{money(p.profit ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {productsWithoutCostCount > 0 && (
                  <p className="mt-4 text-xs text-gray-400">
                    {productsWithoutCostCount} producto{productsWithoutCostCount !== 1 ? "s" : ""} vendido{productsWithoutCostCount !== 1 ? "s" : ""} sin costo cargado no aparece{productsWithoutCostCount === 1 ? "" : "n"} en el ranking.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
