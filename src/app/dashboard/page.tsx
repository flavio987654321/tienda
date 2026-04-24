import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CopyLinkButton from "@/components/CopyLinkButton";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ShoppingBag, Package, Users, TrendingUp,
  Plus, Store, ArrowRight, Share2, Star
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    include: {
      _count: { select: { products: true, orders: true, affiliates: true } },
    },
  });

  if (!store && user.role === "SELLER") redirect("/vendedoras");

  const recentOrders = await prisma.order.findMany({
    where: { storeId: store?.id },
    include: { buyer: { select: { name: true, email: true } }, items: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalRevenue = await prisma.order.aggregate({
    where: { storeId: store?.id, status: { in: ["CONFIRMED", "DELIVERED"] } },
    _sum: { total: true },
  });
  const pendingAffiliateCount = store
    ? await prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } })
    : 0;
  const initialLowStockCount = store
    ? await prisma.product.count({
        where: {
          storeId: store.id,
          variants: {
            every: { stock: 0 },
          },
        },
      })
    : 0;

  const recentReviews = store
    ? await prisma.review.findMany({
        where: { product: { storeId: store.id } },
        include: {
          user: { select: { name: true } },
          product: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <DashboardLayout
      userName={user.name}
      userEmail={user.email}
      initialPendingAffiliateCount={pendingAffiliateCount}
      initialLowStockCount={initialLowStockCount}
    >
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenida, {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Resumen de tu tienda <strong>{store?.name}</strong></p>
        </div>

        {store && (
          <div className="mb-8 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Link publico de tu tienda</p>
                  <p className="mt-1 break-all text-sm text-gray-500">/tienda/{store.slug}</p>
                  <p className="mt-1 text-xs text-gray-400">Este es el link que ve cualquier cliente. No necesita login.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton
                  value={`/tienda/${store.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                />
                <Link
                  href={`/tienda/${store.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Ver tienda
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Ingresos totales",
              value: `$${(totalRevenue._sum.total ?? 0).toLocaleString("es-AR")}`,
              icon: TrendingUp,
              color: "text-green-600 bg-green-50",
            },
            {
              label: "Productos",
              value: store?._count.products ?? 0,
              icon: Package,
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "Pedidos",
              value: store?._count.orders ?? 0,
              icon: ShoppingBag,
              color: "text-indigo-600 bg-indigo-50",
            },
            {
              label: "Afiliados",
              value: store?._count.affiliates ?? 0,
              icon: Users,
              color: "text-purple-600 bg-purple-50",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { href: "/dashboard/productos/nuevo", label: "Agregar producto", icon: Plus, desc: "Sumá un nuevo producto a tu catálogo" },
            { href: `/tienda/${store?.slug}`, label: "Ver mi tienda", icon: Store, desc: "Mirá cómo ven tu tienda los clientes" },
            { href: "/dashboard/vendedoras", label: "Gestionar afiliados", icon: Users, desc: "Activa solicitudes y aproba a quienes pueden vender" },
          ].map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="bg-indigo-50 text-indigo-600 inline-flex p-2 rounded-lg mb-3">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors mt-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent reviews */}
        {recentReviews.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Reseñas recientes</h2>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-bold text-gray-700">
                  {(recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {recentReviews.map((r) => (
                <div key={r.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {r.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.user.name || "Comprador"}</p>
                      <div className="flex shrink-0 gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{r.product.name}</p>
                    {r.comment && <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{r.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Últimos pedidos</h2>
            <Link href="/dashboard/pedidos" className="text-sm text-indigo-600 hover:underline">
              Ver todos →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Todavía no tenés pedidos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{order.buyer.name || order.buyer.email}</p>
                    <p className="text-xs text-gray-400">{order.items.length} producto(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-sm">${order.total.toLocaleString("es-AR")}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                      order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
