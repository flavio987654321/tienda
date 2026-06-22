export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import type { LucideIcon } from "lucide-react";
import { statusLabel } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Star,
  Users,
  Eye,
  MousePointerClick,
  Bell,
  MessageSquare,
} from "lucide-react";

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

function BarChart({
  data,
  color = "#6366f1",
  lightColor = "#c7d2fe",
}: {
  data: { label: string; value: number }[];
  color?: string;
  lightColor?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 600;
  const H = 140;
  const padL = 4;
  const barW = Math.floor((W - padL * 2) / data.length) - 2;
  const highlightFrom = Math.max(0, data.length - 7);
  const labelStep = Math.max(1, Math.ceil(data.length / 12));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-[340px]">
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d.value / max) * H));
          const x = padL + i * ((W - padL * 2) / data.length);
          const y = H - barH;
          const isRecent = i >= highlightFrom;
          return (
            <g key={i}>
              <rect
                x={x + 1}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={isRecent ? color : lightColor}
              />
              {i % labelStep === 0 && (
                <text
                  x={x + barW / 2}
                  y={H + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9ca3af"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
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
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

  // ── Queries compartidas ──
  const [affiliateCount, pushSubscribers, pushCampaigns7d, pushCampaignsTotal] = await Promise.all([
    prisma.affiliate.count({ where: { storeId: store.id, isActive: true } }),
    prisma.storeSubscription.count({ where: { storeId: store.id } }),
    prisma.pushCampaign.count({ where: { storeId: store.id, createdAt: { gte: weekAgo } } }),
    prisma.pushCampaign.count({ where: { storeId: store.id } }),
  ]);

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
  let reviewStats: { _avg: { rating: number | null }; _count: number } = { _avg: { rating: null }, _count: 0 };
  let ordersByStatus: { status: string; _count: number }[] = [];

  if (!isAutos) {
    [ordersPeriod, revenuePrevAgg, ordersPrevCount, topProducts, reviewStats, ordersByStatus] = await Promise.all([
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
      prisma.review.aggregate({ where: { product: { storeId: store.id } }, _avg: { rating: true }, _count: true }),
      prisma.order.groupBy({ by: ["status"], where: { storeId: store.id }, _count: true }),
    ]);
  }

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

  // ── Nombres de productos para el top ──
  const productIds = topProducts.map((p) => p.productId);
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

  // ── Métricas calculadas — AUTOS ──
  const totalLeadsPeriod = leadsPeriodRaw.length;
  const leadsDiff = pctDiff(totalLeadsPeriod, leadsPrevCount);
  const leadsConfirmedDiff = pctDiff(leadsConfirmedCurrent, leadsConfirmedPrev);
  const leadsConversionRate =
    leadsTotal > 0 ? Math.round((leadsConfirmedTotal / leadsTotal) * 100) : null;
  const avgSoldPrice = soldPriceAvg._avg.soldPrice ?? 0;

  // ── Render ──
  return (
    <DashboardLayout userName={user.name} userEmail={user.email} userId={user.id}>
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Rendimiento de <strong>{store.name}</strong> — comparado contra el período anterior de igual duración
            </p>
          </div>
          <RangeSelector active={rangeDays} />
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
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-gray-900">Consultas diarias</h2>
                <p className="text-lg font-black text-indigo-600">{totalLeadsPeriod}</p>
              </div>
              <p className="text-xs text-gray-400 mb-5">Últimos {rangeDays} días · morado oscuro = últimos 7 días</p>
              {totalLeadsPeriod > 0 ? (
                <BarChart data={leadsChartData} color="#6366f1" lightColor="#c7d2fe" />
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  Sin consultas en este período
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-gray-900">Ingresos diarios</h2>
                <p className="text-lg font-black text-green-600">{money(totalRevenuePeriod)}</p>
              </div>
              <p className="text-xs text-gray-400 mb-5">Últimos {rangeDays} días · verde oscuro = últimos 7 días</p>
              {totalRevenuePeriod > 0 ? (
                <BarChart data={revenueChartData} color="#16a34a" lightColor="#bbf7d0" />
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  Sin ventas en este período
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900">Visitas diarias</h2>
              <p className="text-lg font-black text-blue-600">{totalViewsPeriod.toLocaleString("es-AR")}</p>
            </div>
            <p className="text-xs text-gray-400 mb-5">Últimos {rangeDays} días · azul oscuro = últimos 7 días</p>
            {totalViewsPeriod > 0 ? (
              <BarChart data={visitsChartData} color="#2563eb" lightColor="#bfdbfe" />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-gray-400">
                <Eye className="h-8 w-8 opacity-20" />
                <p className="text-sm">El registro de visitas acaba de activarse</p>
                <p className="text-xs text-gray-300">Las visitas del propio dueño no se cuentan</p>
              </div>
            )}
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
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Package className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">Sin ventas confirmadas aún</p>
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
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <ShoppingBag className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">Sin pedidos aún</p>
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

        {/* ── Push · Reseñas · Afiliados ── */}
        <div className={`grid gap-6 ${isAutos ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
          {/* Push Notifications */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="h-4 w-4 text-indigo-500" />
              <h2 className="font-bold text-gray-900">Push Notifications</h2>
            </div>
            <div className="mb-4">
              <p className="text-3xl font-black text-gray-900">{pushSubscribers}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {pushSubscribers === 1 ? "suscriptor activo" : "suscriptores activos"}
              </p>
            </div>
            <div className="space-y-3 border-t border-gray-50 pt-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Esta semana</span>
                  <span className="font-bold text-gray-900">{pushCampaigns7d} / 3</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      pushCampaigns7d >= 3 ? "bg-red-400" : "bg-indigo-500"
                    }`}
                    style={{ width: `${Math.min(100, (pushCampaigns7d / 3) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Historial total</span>
                <span className="font-bold text-gray-900">
                  {pushCampaignsTotal} campaña{pushCampaignsTotal !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Reseñas — solo para tiendas con carrito */}
          {!isAutos && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-2 mb-5">
                <Star className="h-4 w-4 text-yellow-500" />
                <h2 className="font-bold text-gray-900">Reseñas</h2>
              </div>
              {reviewStats._count > 0 ? (
                <div>
                  <div className="flex items-end gap-2 mb-1">
                    <p className="text-3xl font-black text-gray-900">
                      {(reviewStats._avg.rating ?? 0).toFixed(1)}
                    </p>
                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(reviewStats._avg.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{reviewStats._count} opinión{reviewStats._count !== 1 ? "es" : ""}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Star className="h-8 w-8 opacity-20 mb-2" />
                  <p className="text-sm">Sin reseñas aún</p>
                </div>
              )}
            </div>
          )}

          {/* Afiliados + Leads */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center gap-2 mb-5">
              <Users className="h-4 w-4 text-purple-500" />
              <h2 className="font-bold text-gray-900">Afiliados</h2>
            </div>
            <div className="mb-4">
              <p className="text-3xl font-black text-gray-900">{affiliateCount}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                afiliado{affiliateCount !== 1 ? "s" : ""} activo{affiliateCount !== 1 ? "s" : ""}
              </p>
            </div>

            {leadsTotal > 0 && (
              <div className="border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-3.5 w-3.5 text-orange-500" />
                  <p className="text-sm font-semibold text-gray-700">Consultas</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{RANGE_LABELS[rangeDays]}</span>
                    <span className="font-bold text-gray-900">{totalLeadsPeriod}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Confirmadas (histórico)</span>
                    <span className="font-bold text-green-600">
                      {leadsConfirmedTotal}
                      {leadsConversionRate !== null && (
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          ({leadsConversionRate}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
