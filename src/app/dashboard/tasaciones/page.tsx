export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { Repeat } from "lucide-react";
import TasacionesClient from "./TasacionesClient";
import { tasacionesDelPanel, totalesDeTasaciones } from "@/lib/tasacionesPanel";

export default async function TasacionesPage() {
  const user = await getCurrentUser();
  // Sin sesión no se redirige a `/login` (ver `dashboard/layout.tsx`).
  if (!user) return null;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, slug: true, name: true, tipoTienda: true, storeConfig: true },
  });
  if (!store) redirect("/dashboard");
  // Sólo las concesionarias: el menú no la muestra en otros rubros, y entrar
  // con el link a mano tampoco tiene que dejar una pantalla vacía y sin sentido.
  if (store.tipoTienda !== "AUTOS") redirect("/dashboard");

  let moneda = "ARS";
  try { moneda = JSON.parse(store.storeConfig || "{}")?.currency === "USD" ? "USD" : "ARS"; } catch { /* config rota: pesos */ }

  const [pendingAffiliateCount, totales, primera] = await Promise.all([
    prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
    totalesDeTasaciones(store.id),
    tasacionesDelPanel(store.id, { page: 1 }),
  ]);

  const tarjeta = "bg-white panel-oscuro:bg-gray-900 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 p-5";
  const titulo = "text-xs font-semibold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500 mb-1";

  return (
    <DashboardLayout userName={user.name} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Repeat className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 panel-oscuro:text-gray-100">Tasaciones</h1>
        </div>
        <p className="text-gray-500 panel-oscuro:text-gray-400 ml-9">Gente que quiere entregar su usado. Pedile fotos, cargá cuánto se lo tomás y mandale la oferta.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className={tarjeta}>
          <p className={titulo}>Sin responder</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 panel-oscuro:text-amber-400">{totales.pendientes}</p>
        </div>
        <div className={tarjeta}>
          <p className={titulo}>Con oferta</p>
          <p className="text-2xl sm:text-3xl font-black text-indigo-600 panel-oscuro:text-indigo-400">{totales.ofertadas}</p>
        </div>
        <div className={tarjeta}>
          <p className={titulo}>Aceptaron</p>
          <p className="text-2xl sm:text-3xl font-black text-green-600 panel-oscuro:text-green-400">{totales.aceptadas}</p>
        </div>
      </div>

      <TasacionesClient inicial={primera} totales={totales} slug={store.slug} moneda={moneda} tienda={store.name} />
    </DashboardLayout>
  );
}
