import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { TrendingUp, ShoppingBag, Package, Star, Users } from "lucide-react";

function money(value: number) {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "Pendiente",
    CONFIRMED: "Confirmado",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
  };
  return map[status] ?? status;
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

function BarChart({ data }: { data: { label: string; value: number }[] }) {
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
              <rect x={x + 1} y={y} width={barW} height={barH} rx={3}
                fill={isLast7 ? "#6366f1" : "#c7d2fe"} />
              {i % 5 === 0 && (
                <text x={x + barW / 2} y={H + 16} textAnchor="middle"
                  fontSize={9} fill="#9ca3af">
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

export default async function MetricasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true },
  });
  if (!store) redirect("/dashboard");

  const now = new Date();
  const startOf30 = new Date(now);
  startOf30.setDate(now.getDate() - 29);
  startOf30.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    orders30,
    ordersThisMonth,
    ordersLastMonth,
    topProducts,
    reviewStats,
    affiliateCount,
    ordersByStatus,
  ] = await Promise.all([
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
      _count: true,
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.review.aggregate({
      where: { product: { storeId: store.id } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.affiliate.count({ where: { storeId: store.id, isActive: true } }),
    prisma.order.groupBy({
      by: ["status"],
      where: { storeId: store.id },
      _count: true,
    }),
  ]);

  // Build product names for top products
  const productIds = topProducts.map((p) => p.productId);
  const productNames = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const nameMap = Object.fromEntries(productNames.map((p) => [p.id, p.name]));

  // Build 30-day chart data
  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(startOf30);
    d.setDate(startOf30.getDate() + i);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    dayMap.set(key, 0);
  }
  for (const order of orders30) {
    const d = new Date(order.createdAt);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    dayMap.set(key, (dayMap.get(key) ?? 0) + order.total);
  }
  const chartData = [...dayMap.entries()].map(([label, value]) => ({ label, value }));

  const thisMonthRevenue = ordersThisMonth._sum.total ?? 0;
  const lastMonthRevenue = ordersLastMonth._sum.total ?? 0;
  const revDiff = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null;

  const totalOrders30 = orders30.length;
  const totalRevenue30 = orders30.reduce((s, o) => s + o.total, 0);
  const avgTicket = totalOrders30 > 0 ? totalRevenue30 / totalOrders30 : 0;

  const totalOrdersAllStatuses = ordersByStatus.reduce((s, o) => s + o._count, 0);

  return (
    <DashboardLayout userName={user.name} userEmail={user.email}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
          <p className="mt-1 text-sm text-gray-500">Resumen de rendimiento de <strong>{store.name}</strong></p>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Ingresos este mes",
              value: money(thisMonthRevenue),
              sub: revDiff !== null
                ? `${revDiff >= 0 ? "+" : ""}${revDiff}% vs mes anterior`
                : "Primer mes",
              subColor: revDiff !== null && revDiff >= 0 ? "text-green-600" : "text-red-500",
              icon: TrendingUp,
              iconBg: "bg-green-50 text-green-600",
            },
            {
              label: "Pedidos (30 días)",
              value: totalOrders30,
              sub: `${money(totalRevenue30)} total`,
              subColor: "text-gray-400",
              icon: ShoppingBag,
              iconBg: "bg-indigo-50 text-indigo-600",
            },
            {
              label: "Ticket promedio",
              value: money(avgTicket),
              sub: "últimos 30 días",
              subColor: "text-gray-400",
              icon: Package,
              iconBg: "bg-blue-50 text-blue-600",
            },
            {
              label: "Reseñas",
              value: reviewStats._count > 0
                ? `${(reviewStats._avg.rating ?? 0).toFixed(1)} ⭐`
                : "Sin reseñas",
              sub: reviewStats._count > 0
                ? `${reviewStats._count} opinión${reviewStats._count !== 1 ? "es" : ""}`
                : "",
              subColor: "text-gray-400",
              icon: Star,
              iconBg: "bg-yellow-50 text-yellow-500",
            },
          ].map(({ label, value, sub, subColor, icon: Icon, iconBg }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-5">
              <div className={`mb-3 inline-flex rounded-lg p-2 ${iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{label}</p>
              {sub && <p className={`mt-1 text-xs font-semibold ${subColor}`}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Ingresos diarios</h2>
              <p className="text-xs text-gray-400">Últimos 30 días · azul oscuro = última semana</p>
            </div>
            <p className="text-lg font-black text-indigo-600">{money(totalRevenue30)}</p>
          </div>
          {totalRevenue30 > 0 ? (
            <BarChart data={chartData} />
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              Sin ventas en los últimos 30 días
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top productos */}
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <h2 className="mb-4 font-bold text-gray-900">Productos más vendidos</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin ventas confirmadas aún</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0]._sum.quantity ?? 1;
                  const qty = p._sum.quantity ?? 0;
                  const pct = Math.round((qty / maxQty) * 100);
                  return (
                    <div key={p.productId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                          <span className="font-medium text-gray-800 truncate max-w-[180px]">
                            {nameMap[p.productId] ?? "Producto"}
                          </span>
                        </div>
                        <span className="font-bold text-gray-700 shrink-0">{qty} u.</span>
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

          {/* Pedidos por estado */}
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Pedidos por estado</h2>
              <span className="text-sm text-gray-400">{totalOrdersAllStatuses} total</span>
            </div>
            {ordersByStatus.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin pedidos aún</p>
            ) : (
              <div className="space-y-3">
                {ordersByStatus
                  .sort((a, b) => b._count - a._count)
                  .map((s) => {
                    const pct = totalOrdersAllStatuses > 0
                      ? Math.round((s._count / totalOrdersAllStatuses) * 100)
                      : 0;
                    return (
                      <div key={s.status}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor(s.status)}`} />
                            <span className="text-gray-700">{statusLabel(s.status)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{s._count}</span>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className={`h-2 rounded-full transition-all ${statusColor(s.status)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-xl bg-purple-50 p-3">
              <Users className="h-4 w-4 text-purple-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-purple-800">{affiliateCount} afiliado{affiliateCount !== 1 ? "s" : ""} activo{affiliateCount !== 1 ? "s" : ""}</p>
                <p className="text-xs text-purple-500">vendiendo en tu tienda</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
