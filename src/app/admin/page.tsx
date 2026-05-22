import { prisma } from "@/lib/prisma";
import { Users, Store, ShoppingBag, MessageSquare, TrendingUp, CheckCircle, Clock, AlertCircle } from "lucide-react";

async function getSystemStatus() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    // Si llegamos a esta página, Supabase Auth ya funcionó (el layout lo verifica)
    Promise.resolve(),
    process.env.MP_ACCESS_TOKEN
      ? fetch("https://api.mercadopago.com/v1/payment_methods", {
          headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
          cache: "no-store",
        }).then(r => { if (!r.ok) throw new Error(); })
      : Promise.resolve(),
  ]);

  const [db, auth, mp] = checks.map(r => r.status === "fulfilled");
  return { db, auth, mp };
}

async function getStats() {
  const [
    totalUsers, totalOwners, totalAffiliates, totalBuyers,
    totalStores, activeStores,
    totalOrders, pendingOrders,
    totalTestimonials, pendingTestimonials,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
    prisma.user.count({ where: { role: "OWNER" } }),
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.user.count({ where: { role: "BUYER" } }),
    prisma.store.count(),
    prisma.store.count({ where: { isActive: true, isPublished: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.testimonial.count(),
    prisma.testimonial.count({ where: { approved: false } }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
  ]);

  return {
    totalUsers, totalOwners, totalAffiliates, totalBuyers,
    totalStores, activeStores,
    totalOrders, pendingOrders,
    totalTestimonials, pendingTestimonials,
    activeSubscriptions,
  };
}

export default async function AdminPage() {
  const [s, sys] = await Promise.all([getStats(), getSystemStatus()]);

  const cards = [
    {
      label: "Usuarios totales", value: s.totalUsers, icon: Users, color: "indigo",
      sub: `${s.totalOwners} dueños · ${s.totalAffiliates} afiliados · ${s.totalBuyers} clientes`,
    },
    {
      label: "Tiendas", value: s.totalStores, icon: Store, color: "purple",
      sub: `${s.activeStores} publicadas y activas`,
    },
    {
      label: "Pedidos totales", value: s.totalOrders, icon: ShoppingBag, color: "emerald",
      sub: `${s.pendingOrders} pendientes de procesar`,
    },
    {
      label: "Suscripciones activas", value: s.activeSubscriptions, icon: TrendingUp, color: "amber",
      sub: "Trial + activas",
    },
    {
      label: "Testimonios", value: s.totalTestimonials, icon: MessageSquare, color: "pink",
      sub: `${s.pendingTestimonials} esperando aprobación`,
      alert: s.pendingTestimonials > 0,
      href: "/admin/testimonios",
    },
  ];

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    pink: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Dashboard</h1>
        <p className="text-gray-400 text-sm">Resumen general de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map(({ label, value, icon: Icon, color, sub, alert, href }) => {
          const Wrapper = href ? "a" : "div";
          return (
            <Wrapper
              key={label}
              {...(href ? { href } : {})}
              className={`relative bg-gray-900/50 border rounded-2xl p-6 ${
                alert ? "border-yellow-500/30" : "border-white/5"
              } ${href ? "hover:border-white/15 transition-colors cursor-pointer" : ""}`}
            >
              {alert && (
                <span className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full">
                  {value}
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${colorMap[color]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-4xl font-black text-white mb-1">{value.toLocaleString("es-AR")}</p>
              <p className="text-white font-semibold text-sm mb-1">{label}</p>
              <p className="text-gray-500 text-xs">{sub}</p>
            </Wrapper>
          );
        })}
      </div>

      <div className="mt-10 bg-gray-900/30 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          {sys.db && sys.auth && sys.mp ? (
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
          <h2 className="text-white font-bold">Estado del sistema</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "API", ok: true },
            { label: "Base de datos", ok: sys.db },
            { label: "Auth (Supabase)", ok: sys.auth },
            { label: "Pagos (MercadoPago)", ok: sys.mp },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-2">
              {ok ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span className="text-gray-400 text-sm">{label}</span>
              <span className={`text-xs font-semibold ml-auto ${ok ? "text-emerald-400" : "text-red-400"}`}>
                {ok ? "OK" : "Error"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
