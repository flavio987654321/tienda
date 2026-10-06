export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { MessageCircle } from "lucide-react";
import LeadsClient from "./LeadsClient";
import { consultasDelPanel, totalesDeConsultas } from "@/lib/consultasPanel";
import { consultaGeneraComision } from "@/lib/storeTypes";

export default async function ConsultasPage() {
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true, tipoTienda: true },
  });
  if (!store) redirect("/dashboard");

  /* Los totales se cuentan en la base y la lista se pagina (06/10/26): antes
     se traían 50 y se contaba sobre esas 50 (ver `lib/consultasPanel`). */
  const [pendingAffiliateCount, totales, primera] = await Promise.all([
    prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
    totalesDeConsultas(store.id),
    consultasDelPanel(store.id, { page: 1 }),
  ]);
  // La comisión por consulta está apagada en todos los rubros de hoy: la
  // tarjeta de "Comisiones acreditadas" daba siempre $0 (ver `consultaGeneraComision`).
  const conComisiones = consultaGeneraComision(store.tipoTienda);
  const totalComisiones = conComisiones
    ? (await prisma.lead.aggregate({ where: { storeId: store.id, status: "CONFIRMED" }, _sum: { commissionAmount: true } }))._sum.commissionAmount ?? 0
    : 0;

  const tarjeta = "bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-5";
  const titulo = "text-xs font-semibold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500 mb-1";

  return (
    <DashboardLayout
      userName={user.name}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <MessageCircle className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 panel-oscuro:text-gray-100">Consultas</h1>
        </div>
        <p className="text-gray-500 panel-oscuro:text-gray-400 ml-9">Personas interesadas en tus vehículos. Contestá primero las nuevas.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className={tarjeta}>
          <p className={titulo}>Nuevas</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 panel-oscuro:text-amber-400">{totales.nuevas}</p>
        </div>
        <div className={tarjeta}>
          <p className={titulo}>Vendidas</p>
          <p className="text-2xl sm:text-3xl font-black text-green-600 panel-oscuro:text-green-400">{totales.vendidas}</p>
        </div>
        {conComisiones ? (
          <div className={tarjeta}>
            <p className={titulo}>Comisiones</p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 panel-oscuro:text-indigo-400">${totalComisiones.toLocaleString("es-AR")}</p>
          </div>
        ) : (
          <div className={tarjeta}>
            <p className={titulo}>Últimos 7 días</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 panel-oscuro:text-gray-100">{totales.semana}</p>
          </div>
        )}
      </div>

      <LeadsClient
        inicial={primera}
        totales={totales}
        slug={store.slug}
        conComisiones={conComisiones}
      />
    </DashboardLayout>
  );
}
