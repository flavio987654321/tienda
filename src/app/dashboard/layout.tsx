import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, getSubscriptionStatus, daysRemaining } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import SubscriptionGate from "@/components/subscription/SubscriptionGate";
import SubscriptionRealtimeRefresher from "@/components/subscription/SubscriptionRealtimeRefresher";
import SubscriptionSuccessBanner from "@/components/subscription/SubscriptionSuccessBanner";
import StoreTypeModal from "./productos/StoreTypeModal";
import { Suspense } from "react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  let gate = null;
  if (user && (user.role === "OWNER" || user.role === "SELLER")) {
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
          role={sub.role as "OWNER" | "AFFILIATE"}
          tier={(sub.tier ?? "BASIC") as "BASIC" | "PREMIUM"}
          plan={sub.plan as "MONTHLY" | "ANNUAL"}
        />
      );
    }
  }

  // Gate de tipo de tienda: solo para dueños que aún no configuraron su tipo
  let storeTypeGate = null;
  if (user?.role === "OWNER") {
    const store = await prisma.store.findUnique({
      where: { ownerId: user.id },
      select: { tipoTiendaConfigurado: true },
    });
    if (store && !store.tipoTiendaConfigurado) {
      storeTypeGate = <StoreTypeModal />;
    }
  }

  return (
    <>
      {user && <SubscriptionRealtimeRefresher userId={user.id} />}
      <Suspense><SubscriptionSuccessBanner /></Suspense>
      {gate}
      {storeTypeGate}
      {children}
    </>
  );
}
