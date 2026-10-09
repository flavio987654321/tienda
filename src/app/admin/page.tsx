import { prisma } from "@/lib/prisma";
import { hasSupabaseServerConfig } from "@/lib/supabase/server";
import { CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import AdminStatsRealtime from "./AdminStatsRealtime";

export const dynamic = "force-dynamic";

async function getSystemStatus() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    Promise.resolve(hasSupabaseServerConfig()),
    process.env.MP_ACCESS_TOKEN
      ? fetch("https://api.mercadopago.com/v1/payment_methods", {
          headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
          cache: "no-store",
        }).then(r => { if (!r.ok) throw new Error(); })
      : Promise.resolve(null),
  ]);
  const [db, auth, mp] = checks;
  return {
    db: db.status === "fulfilled",
    authConfigured: auth.status === "fulfilled" && auth.value,
    mp: process.env.MP_ACCESS_TOKEN ? mp.status === "fulfilled" : null,
  };
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
    pendingVerifications, pendingRetiros,
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
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.walletWithdrawal.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalUsers, totalOwners, totalAffiliates, totalBuyers,
    totalStores, activeStores,
    totalOrders, pendingOrders,
    totalTestimonials, pendingTestimonials,
    activeSubscriptions,
    totalBanned, totalDeleted,
    pendingVerifications, pendingRetiros,
  };
}

export default async function AdminPage() {
  const [initialStats, sys] = await Promise.all([getStats(), getSystemStatus()]);
  const comprobacionesOk = sys.db && sys.authConfigured && sys.mp === true;
  const hayError = !sys.db || !sys.authConfigured || sys.mp === false;
  const estadoGeneral = comprobacionesOk
    ? "Comprobaciones OK"
    : hayError ? "Revisar servicios" : "Configurar servicios";

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Dashboard</h1>
        <p className="text-gray-400 text-sm">Resumen general de la plataforma</p>
      </div>

      {/* Stats con Realtime */}
      <AdminStatsRealtime initial={initialStats} />

      {/* Estado del sistema — sección secundaria al pie */}
      <details className="mt-8 group">
        <summary className="flex items-center gap-2 cursor-pointer list-none text-gray-500 hover:text-gray-300 transition-colors text-sm select-none">
          {comprobacionesOk ? (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className={`h-4 w-4 ${hayError ? "text-red-400" : "text-amber-400"}`} />
          )}
          <span className="font-medium">Estado del sistema</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            comprobacionesOk
              ? "bg-emerald-500/10 text-emerald-400"
              : hayError ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
          }`}>
            {estadoGeneral}
          </span>
          <ChevronDown className="h-4 w-4 ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            { label: "Base de datos",     desc: "Almacenamiento de datos",               ok: sys.db },
            { label: "Config. de acceso", desc: "URL y clave de Supabase disponibles",   ok: sys.authConfigured },
            { label: "Pagos",             desc: "Procesamiento con MercadoPago",         ok: sys.mp },
          ].map(({ label, desc, ok }) => {
            const noConfigurado = ok === null;
            const operativo = ok === true;
            return (
            <div key={label} className={`flex items-center gap-3 rounded-xl p-4 border ${
              operativo
                ? "bg-emerald-500/5 border-emerald-500/10"
                : noConfigurado ? "bg-amber-500/5 border-amber-500/10" : "bg-red-500/5 border-red-500/10"
            }`}>
              {operativo ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : noConfigurado ? (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-gray-500 text-xs truncate">{desc}</p>
              </div>
              <span className={`ml-auto text-xs font-bold flex-shrink-0 ${
                operativo ? "text-emerald-400" : noConfigurado ? "text-amber-400" : "text-red-400"
              }`}>
                {operativo ? "OK" : noConfigurado ? "No configurado" : "Error"}
              </span>
            </div>
          )})}
        </div>
      </details>
    </div>
  );
}
