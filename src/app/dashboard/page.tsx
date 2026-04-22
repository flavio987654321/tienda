import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import CopyLinkButton from "@/components/CopyLinkButton";
import {
  ShoppingBag, Package, Users, TrendingUp,
  Plus, Store, ArrowRight, Share2
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as { id: string; role?: string };
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <ShoppingBag className="h-7 w-7 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900">MiTienda</span>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { href: "/dashboard", label: "Inicio", icon: TrendingUp },
            { href: "/dashboard/productos", label: "Productos", icon: Package },
            { href: "/dashboard/pedidos", label: "Pedidos", icon: ShoppingBag },
            { href: "/dashboard/vendedoras", label: "Afiliados", icon: Users },
            { href: "/dashboard/configuracion", label: "Mi tienda", icon: Store },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={`${href}-${label}`}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors font-medium text-sm"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenida, {session.user?.name?.split(" ")[0]} 👋
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
    </div>
  );
}
