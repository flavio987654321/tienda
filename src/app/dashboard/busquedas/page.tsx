export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { Target } from "lucide-react";
import BusquedasClient from "./BusquedasClient";
import { busquedasDelPanel } from "@/lib/busquedasServidor";

export default async function BusquedasPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true, slug: true, name: true, tipoTienda: true, storeConfig: true } });
  if (!store) redirect("/dashboard");
  if (store.tipoTienda !== "AUTOS") redirect("/dashboard");

  let moneda = "ARS";
  try { moneda = JSON.parse(store.storeConfig || "{}")?.currency === "USD" ? "USD" : "ARS"; } catch { /* pesos */ }
  const [{ busquedas, demanda }, pendingAffiliateCount] = await Promise.all([
    busquedasDelPanel(store.id),
    prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
  ]);
  const origen = (process.env.NEXT_PUBLIC_APP_URL || "https://www.tiendaapps.com").replace(/\/$/, "");

  return (
    <DashboardLayout userName={user.name} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Target className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900 panel-oscuro:text-gray-100">Búsquedas</h1>
        </div>
        <p className="text-gray-500 panel-oscuro:text-gray-400 ml-9">Gente que busca algo que no tenías. Cuando entra, avisales: ya están interesados.</p>
      </div>
      <BusquedasClient inicial={busquedas} demanda={demanda} slug={store.slug} tienda={store.name} moneda={moneda} origen={origen} />
    </DashboardLayout>
  );
}
