import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, getSubscriptionStatus, daysRemaining } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import SubscriptionGate from "@/components/subscription/SubscriptionGate";
import StoreClosedGate from "@/components/dashboard/StoreClosedGate";
import SubscriptionRealtimeRefresher from "@/components/subscription/SubscriptionRealtimeRefresher";
import SubscriptionSuccessBanner from "@/components/subscription/SubscriptionSuccessBanner";
import StoreTypeModal from "./productos/StoreTypeModal";
import PWAManager from "@/components/PWAManager";
import { DASHBOARD_VERSION } from "@/lib/app-versions";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/api/manifest/dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const isOwner = user?.role === "OWNER";

  // Una sola query de tienda para los dos gates de abajo — antes eran dos
  // findUnique separados sobre la misma fila.
  const store = isOwner
    ? await prisma.store.findUnique({
        where: { ownerId: user.id },
        select: { tipoTiendaConfigurado: true, closedAt: true },
      })
    : null;

  // El plan de afiliadas (SELLER) es gratuito — el gate de suscripción es solo para OWNER
  let gate = null;
  if (isOwner) {
    if (store?.closedAt) {
      // El cierre le gana al estado de la suscripción. Cerrar deja la suscripción
      // en CANCELLED, así que SubscriptionGate mostraría el modal bloqueante de
      // "tu suscripción venció — renová": un mensaje falso (la cerró ella a
      // propósito) que además taparía el botón de reactivar.
      gate = <StoreClosedGate closedAt={store.closedAt.toISOString()} />;
    } else {
      const sub = await getUserSubscription(user.id);
      if (sub) {
        const status = getSubscriptionStatus(sub);
        const relevantDate =
          status === "TRIAL" ? sub.trialEndsAt :
          status === "GRACE" ? (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd!) :
          sub.currentPeriodEnd ?? sub.trialEndsAt;
        const days = daysRemaining(relevantDate);

        gate = (
          <SubscriptionGate
            status={status}
            daysLeft={days}
            role="OWNER"
            tier={(sub.tier ?? "BASIC") as "BASIC" | "PREMIUM"}
            plan={sub.plan as "MONTHLY" | "ANNUAL"}
          />
        );
      }
    }
  }

  // Gate de tipo de tienda: solo para dueños que aún no configuraron su tipo.
  // Con la tienda cerrada no tiene sentido pedirle que elija rubro.
  const storeTypeGate =
    store && !store.tipoTiendaConfigurado && !store.closedAt ? <StoreTypeModal /> : null;

  return (
    <>
      <PWAManager appVersion={DASHBOARD_VERSION} versionKey="pwa_dashboard_version" />
      {user && <SubscriptionRealtimeRefresher userId={user.id} />}
      <Suspense><SubscriptionSuccessBanner /></Suspense>
      {gate && <div className="pt-14 lg:pt-0 lg:pl-14 bg-gray-50 [color-scheme:light]">{gate}</div>}
      {storeTypeGate}
      {children}
    </>
  );
}
