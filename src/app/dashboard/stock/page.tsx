export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import { stockDelPanel } from "@/lib/stockPanel";
import { monedaDeTienda } from "@/lib/monedaVehiculo";
import StockVista, { esOrden } from "./StockVista";

/* "Stock y ganancia" (06/10/26). La carga acá; el dibujo en `StockVista`. */
export default async function StockPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true, tipoTienda: true, storeConfig: true } });
  if (!store) redirect("/dashboard");
  // Sólo concesionarias: en otro rubro no hay unidades ni gastos por vehículo.
  if (store.tipoTienda !== "AUTOS") redirect("/dashboard");

  const { orden } = await searchParams;
  const moneda = monedaDeTienda(store.storeConfig);
  const [{ enStock, vendidos }, pendingAffiliateCount] = await Promise.all([
    stockDelPanel(store.id, new Date(), moneda),
    prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
  ]);

  return (
    <DashboardLayout userName={user.name} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
      <StockVista enStock={enStock} vendidos={vendidos} moneda={moneda} orden={esOrden(orden) ? orden : "dias"} />
    </DashboardLayout>
  );
}
