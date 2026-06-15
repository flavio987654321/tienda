export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full min-w-[340px]">
        {data.map((d, i) => {
          const barH = Math.max(2, Math.round((d.value / max) * H));
          const x = padL + i * ((W - padL * 2) / data.length);
          const y = H - barH;
          const isLast7 = i >= data.length - 7;
          return (
            <g key={i}>
              <rect
                x={x + 1}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={isLast7 ? color : lightColor}
              />
              {i % 5 === 0 && (
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MetricasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, tipoTienda: true },
  });
  if (!store) redirect("/dashboard");

  const isAutos = store.tipoTienda === "AUTOS";

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ── Boundaries para queries de Order (DateTime, Prisma convierte a UTC) ──
  const startOf30 = new Date(now);
  startOf30.setDate(now.getDate() - 29);
  startOf30.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ── Boundaries para queries de StoreView (String "YYYY-MM-DD" UTC) ──
  const startOf30Str = startOf30.toISOString().slice(0, 10);

  const utcY = now.getUTCFullYear();
  const utcM = now.getUTCMonth(); // 0-indexed
  const startOfMonthStr = `${utcY}-${String(utcM + 1).padStart(2, "0")}-01`;

  const prevY = utcM === 0 ? utcY - 1 : utcY;
  const prevM = utcM === 0 ? 11 : utcM - 1;
  const lastMonthStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-01`;
  const endOfLastMonthStr = new Date(Date.UTC(utcY, utcM, 0)).toISOString().slice(0, 10);

  // ── Queries compartidas ──
  const [affiliateCount, pushSubscribers, pushCampaigns7d, pushCampaignsTotal] = await Promise.all([
    prisma.affiliate.count({ where: { storeId: store.id, isActive: true } }),
    prisma.storeSubscription.count({ where: { storeId: store.id } }),
    prisma.pushCampaign.count({ where: { storeId: store.id, createdAt: { gte: weekAgo } } }),
    prisma.pushCampaign.count({ where: { storeId: store.id } }),
  ]);

  // ── Queries AUTOS ──
  let leadsThisMonth = 0, leadsTotal = 0, leadsConfirmed = 0;
  let vehiculosDisponibles = 0, vehiculosVendidos = 0, vehiculosReservados = 0;
  let soldPriceAvg: { _avg: { soldPrice: number | null } } = { _avg: { soldPrice: null } };
  let leads30raw: { createdAt: Date }[] = [];

  if (isAutos) {
    [leadsThisMonth, leadsTotal, leadsConfirmed, vehiculosDisponibles, vehiculosVendidos, vehiculosReservados, soldPriceAvg, leads30raw] = await Promise.all([
      prisma.lead.count({ where: { storeId: store.id, createdAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { storeId: store.id } }),
      prisma.lead.count({ where: { storeId: store.id, status: "CONFIRMED" } }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "AVAILABLE" } }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD" } }),
      prisma.product.count({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "RESERVED" } }),
      prisma.product.aggregate({ where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD" }, _avg: { soldPrice: true } }),
      prisma.lead.findMany({ where: { storeId: store.id, createdAt: { gte: startOf30 } }, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    ]);
  }

  // ── Queries tienda normal (no AUTOS) ──
  let orders30: { total: number; createdAt: Date }[] = [];
  let ordersThisMonth: { _sum: { total: number | null }; _count: number } = { _sum: { total: null }, _count: 0 };
  let ordersLastMonth: { _sum: { total: number | null }; _count: number } = { _sum: { total: null }, _count: 0 };
  let topProducts: { productId: string; _sum: { quantity: number | null } }[] = [];
  let reviewStats: { _avg: { rating: number | null }; _count: number } = { _avg: { rating: null }, _count: 0 };
  let ordersByStatus: { status: string; _count: number }[] = [];

  if (!isAutos) {
    [orders30, ordersThisMonth, ordersLastMonth, topProducts, reviewStats, ordersByStatus] = await Promise.all([
      prisma.order.findMany({
        where: { storeId: store.id, createdAt: { gte: startOf30 }, status: { not: "CANCELLED" } },
        select: { total: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.aggregate({
        where: { storeId: store.id, createdAt: { gte: startOfMonth }, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { storeId: store.id, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { storeId: store.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.review.aggregate({ where: { product: { storeId: store.id } }, _avg: { rating: true }, _count: true }),
      prisma.order.groupBy({ by: ["status"], where: { storeId: store.id }, _count: true }),
    ]);
  }

  // ── Queries de StoreView (requieren migración SQL — fallan silenciosamente si la tabla no existe) ──
  let viewsThisMonth: { _sum: { count: number | null } } = { _sum: { count: null } };
  let viewsLastMonth: { _sum: { count: number | null } } = { _sum: { count: null } };
  let views30raw: { date: string; count: number }[] = [];
  try {
    [viewsThisMonth, viewsLastMonth, views30raw] = await Promise.all([
      prisma.storeView.aggregate({
        where: { storeId: store.id, date: { gte: startOfMonthStr } },
        _sum: { count: true },
      }),
      prisma.storeView.aggregate({
        where: { storeId: store.id, date: { gte: lastMonthStr, lte: endOfLastMonthStr } },
        _sum: { count: true },
      }),
      prisma.storeView.findMany({
        where: { storeId: store.id, date: { gte: startOf30Str } },
        select: { date: true, count: true },
        orderBy: { date: "asc" },
      }),
    ]);
  } catch {
    // Tabla StoreView pendiente de migración — visitas aparecerán una vez creada
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

  // ── Datos para gráfico de ingresos (30 días) ──
  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOf30);
    d.setDate(startOf30.getDate() + i);
    dayMap.set(`${d.getDate()}/${d.getMonth() + 1}`, 0);
  }
  for (const order of orders30) {
    const d = new Date(order.createdAt);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    dayMap.set(key, (dayMap.get(key) ?? 0) + order.total);
  }
  const revenueChartData = [...dayMap.entries()].map(([label, value]) => ({ label, value }));

  // ── Datos para gráfico de visitas (30 días, alineado con el de ingresos) ──
  const visitMap = new Map<string, { label: string; count: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOf30);
    d.setDate(startOf30.getDate() + i);
    visitMap.set(d.toISOString().slice(0, 10), {
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      count: 0,
    });
  }
  for (const v of views30raw) {
    const entry = visitMap.get(v.date);
    if (entry) entry.count = v.count;
  }
  const visitsChartData = [...visitMap.values()].map(({ label, count }) => ({
    label,
    value: count,
  }));

  // ── Métricas calculadas — tienda normal ──
  const thisMonthRevenue = ordersThisMonth._sum.total ?? 0;
  const lastMonthRevenue = ordersLastMonth._sum.total ?? 0;
  const revDiff =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

  const totalOrders30 = orders30.length;
  const totalRevenue30 = orders30.reduce((s, o) => s + o.total, 0);
  const avgTicket = totalOrders30 > 0 ? totalRevenue30 / totalOrders30 : 0;

  const totalViews30 = visitsChartData.reduce((s, v) => s + v.value, 0);
  const totalViewsThisMonth = viewsThisMonth._sum.count ?? 0;
  const totalViewsLastMonth = viewsLastMonth._sum.count ?? 0;
  const viewsDiff =
    totalViewsLastMonth > 0
      ? Math.round(((totalViewsThisMonth - totalViewsLastMonth) / totalViewsLastMonth) * 100)
      : null;

  const conversionRate =
    totalViews30 > 0 ? ((totalOrders30 / totalViews30) * 100).toFixed(1) : null;

  const totalOrdersAllStatuses = ordersByStatus.reduce((s, o) => s + o._count, 0);

  // ── Métricas calculadas — AUTOS ──
  const leadsConversionRate =
    leadsTotal > 0 ? Math.round((leadsConfirmed / leadsTotal) * 100) : null;
  const avgSoldPrice = soldPriceAvg._avg.soldPrice ?? 0;

  // Gráfico de consultas diarias (30 días)
  const leadsDayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOf30);
    d.setDate(startOf30.getDate() + i);
    leadsDayMap.set(`${d.getDate()}/${d.getMonth() + 1}`, 0);
  }
  for (const lead of leads30raw) {
    const d = new Date(lead.createdAt);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    leadsDayMap.set(key, (leadsDayMap.get(key) ?? 0) + 1);
  }
  const leadsChartData = [...leadsDayMap.entries()].map(([label, value]) => ({ label, value }));
  const totalLeads30 = leads30raw.length;

  // ── Render ──
  return (
    <DashboardLayout userName={user.name} userEmail={user.email} userId={user.id}>
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Rendimiento de <strong>{store.name}</strong> — últimos 30 días
          </p>
        </div>

        {/* ── KPIs ── */}
        {isAutos ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label="Consultas este mes"
              value={leadsThisMonth}
              sub={`${leadsTotal} en total`}
              icon={MessageSquare}
              iconBg="bg-indigo-50 text-indigo-600"
            />
            <KPICard
              label="Ventas confirmadas"
              value={leadsConfirmed}
              sub={leadsConversionRate !== null ? `${leadsConversionRate}% de conversión` : "Sin datos"}
              trend={leadsConversionRate}
              icon={TrendingUp}
              iconBg="bg-green-50 text-green-600"
            />
            <KPICard
              label="Precio prom. de venta"
              value={avgSoldPrice > 0 ? money(avgSoldPrice) : "—"}
              sub={vehiculosVendidos > 0 ? `${vehiculosVendidos} vehículo${vehiculosVendidos !== 1 ? "s" : ""} vendido${vehiculosVendidos !== 1 ? "s" : ""}` : "Sin ventas aún"}
              icon={ShoppingBag}
              iconBg="bg-amber-50 text-amber-600"
            />
            <KPICard
              label="Visitas (30 días)"
              value={totalViews30.toLocaleString("es-AR")}
              sub={viewsDiff === null ? "Sin datos del mes anterior" : undefined}
              trend={viewsDiff}
              icon={Eye}
              iconBg="bg-blue-50 text-blue-600"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label="Ingresos este mes"
              value={money(thisMonthRevenue)}
              sub={revDiff === null ? "Primer mes registrado" : undefined}
              trend={revDiff}
              icon={TrendingUp}
              iconBg="bg-green-50 text-green-600"
            />
            <KPICard
              label="Pedidos (30 días)"
              value={totalOrders30}
              sub={`Ticket prom. ${money(avgTicket)}`}
              icon={ShoppingBag}
              iconBg="bg-indigo-50 text-indigo-600"
            />
            <KPICard
              label="Visitas (30 días)"
              value={totalViews30.toLocaleString("es-AR")}
              sub={viewsDiff === null ? "Sin datos del mes anterior" : undefined}
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
                <p className="text-lg font-black text-indigo-600">{totalLeads30}</p>
              </div>
              <p className="text-xs text-gray-400 mb-5">Últimos 30 días · morado oscuro = última semana</p>
              {totalLeads30 > 0 ? (
                <BarChart data={leadsChartData} color="#6366f1" lightColor="#c7d2fe" />
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  Sin consultas en los últimos 30 días
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-gray-900">Ingresos diarios</h2>
                <p className="text-lg font-black text-green-600">{money(totalRevenue30)}</p>
              </div>
              <p className="text-xs text-gray-400 mb-5">Últimos 30 días · verde oscuro = última semana</p>
              {totalRevenue30 > 0 ? (
                <BarChart data={revenueChartData} color="#16a34a" lightColor="#bbf7d0" />
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  Sin ventas en los últimos 30 días
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900">Visitas diarias</h2>
              <p className="text-lg font-black text-blue-600">{totalViews30.toLocaleString("es-AR")}</p>
            </div>
            <p className="text-xs text-gray-400 mb-5">Últimos 30 días · azul oscuro = última semana</p>
            {totalViews30 > 0 ? (
              <BarChart data={visitsChartData} color="#2563eb" lightColor="#bfdbfe" />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-gray-400">
                <Eye className="h-8 w-8 opacity-20" />
                <p className="text-sm">El registro de visitas acaba de activarse</p>
                <p className="text-xs text-gray-300">Los datos aparecerán en las próximas horas</p>
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
                  {topProducts.map((p, i) => {
                    const maxQty = topProducts[0]._sum.quantity ?? 1;
                    const qty = p._sum.quantity ?? 0;
                    const pct = Math.round((qty / maxQty) * 100);
                    return (
                      <div key={p.productId}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 shrink-0 text-xs font-bold text-gray-400">#{i + 1}</span>
                            <span className="font-medium text-gray-800 truncate">{nameMap[p.productId] ?? "Producto"}</span>
                          </div>
                          <span className="ml-2 shrink-0 font-bold text-gray-700">{qty} u.</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
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
                    <span className="text-gray-500">Este mes</span>
                    <span className="font-bold text-gray-900">{leadsThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Confirmadas</span>
                    <span className="font-bold text-green-600">
                      {leadsConfirmed}
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
