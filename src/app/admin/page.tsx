import { prisma } from "@/lib/prisma";
import { Users, Store, ShoppingBag, MessageSquare, TrendingUp, CheckCircle, AlertCircle, Ban, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

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
  const DELETED = { email: { endsWith: ".invalid" } };
  const ACTIVE_USER = { role: { not: "ADMIN" }, banned: false, NOT: DELETED };

  const [
    totalUsers, totalOwners, totalAffiliates, totalBuyers,
    totalStores, activeStores,
    totalOrders, pendingOrders,
    totalTestimonials, pendingTestimonials,
    activeSubscriptions,
    totalBanned, totalDeleted,
  ] = await Promise.all([
    prisma.user.count({ where: ACTIVE_USER }),
    prisma.user.count({ where: { role: "OWNER",  banned: false, NOT: DELETED } }),
    prisma.user.count({ where: { role: "SELLER", banned: false, NOT: DELETED } }),
    prisma.user.count({ where: { role: "BUYER",  banned: false, NOT: DELETED } }),
    prisma.store.count(),
    prisma.store.count({ where: { isActive: true, isPublished: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.testimonial.count(),
    prisma.testimonial.count({ where: { approved: false } }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.user.count({ where: { banned: true, NOT: DELETED } }),
    prisma.user.count({ where: DELETED }),
  ]);

  return {
    totalUsers, totalOwners, totalAffiliates, totalBuyers,
    totalStores, activeStores,
    totalOrders, pendingOrders,
    totalTestimonials, pendingTestimonials,
    activeSubscriptions,
    totalBanned, totalDeleted,
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

      {/* Baneados / Eliminados */}
      {(s.totalBanned > 0 || s.totalDeleted > 0) && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Ban className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{s.totalBanned}</p>
              <p className="text-xs text-red-400 font-medium mt-0.5">Usuarios baneados</p>
            </div>
          </div>
          <div className="bg-gray-500/5 border border-gray-500/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{s.totalDeleted}</p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Cuentas eliminadas</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-gray-900/30 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {sys.db && sys.auth && sys.mp ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <h2 className="text-white font-bold">Estado del sistema</h2>
              <p className="text-gray-500 text-xs mt-0.5">Servicios que sostienen la plataforma</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${sys.db && sys.auth && sys.mp ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {sys.db && sys.auth && sys.mp ? "Todo operativo" : "Revisar servicios"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: "Plataforma",      desc: "Rutas y páginas de la app",     ok: true      },
            { label: "Base de datos",   desc: "Almacenamiento de datos",        ok: sys.db    },
            { label: "Inicio de sesión",desc: "Autenticación de usuarios",      ok: sys.auth  },
            { label: "Pagos",           desc: "Procesamiento con MercadoPago",  ok: sys.mp    },
          ].map(({ label, desc, ok }) => (
            <div key={label} className={`flex items-center gap-3 rounded-xl p-4 border ${ok ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10"}`}>
              {ok ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-gray-500 text-xs truncate">{desc}</p>
              </div>
              <span className={`ml-auto text-xs font-bold flex-shrink-0 ${ok ? "text-emerald-400" : "text-red-400"}`}>
                {ok ? "OK" : "Error"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
