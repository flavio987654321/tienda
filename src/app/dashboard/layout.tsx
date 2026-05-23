import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, getSubscriptionStatus, daysRemaining } from "@/lib/subscription";
import SubscriptionGate from "@/components/subscription/SubscriptionGate";
import SubscriptionRealtimeRefresher from "@/components/subscription/SubscriptionRealtimeRefresher";

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

  return (
    <>
      {user && <SubscriptionRealtimeRefresher userId={user.id} />}
      {gate}
      {children}
    </>
  );
}
