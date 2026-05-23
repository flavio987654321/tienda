import { prisma } from "@/lib/prisma";
import { CheckCircle, AlertCircle } from "lucide-react";
import AdminStatsRealtime from "./AdminStatsRealtime";

export const dynamic = "force-dynamic";

async function getSystemStatus() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
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
  const REAL_STORE = { slug: { not: { startsWith: "deleted-" } } };

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
    prisma.store.count({ where: REAL_STORE }),
    prisma.store.count({ where: { ...REAL_STORE, isActive: true, isPublished: true } }),
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
  const [initialStats, sys] = await Promise.all([getStats(), getSystemStatus()]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Dashboard</h1>
        <p className="text-gray-400 text-sm">Resumen general de la plataforma</p>
      </div>

      {/* Stats con Realtime — se actualiza cuando hay cambios en la DB */}
      <AdminStatsRealtime initial={initialStats} />

      {/* Estado del sistema */}
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
            { label: "Plataforma",       desc: "Rutas y páginas de la app",    ok: true      },
            { label: "Base de datos",    desc: "Almacenamiento de datos",       ok: sys.db    },
            { label: "Inicio de sesión", desc: "Autenticación de usuarios",     ok: sys.auth  },
            { label: "Pagos",            desc: "Procesamiento con MercadoPago", ok: sys.mp    },
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
