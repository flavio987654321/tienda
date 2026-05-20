import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, getSubscriptionStatus, daysRemaining } from "@/lib/subscription";
import SubscriptionGate from "@/components/subscription/SubscriptionGate";

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
          plan={sub.plan as "MONTHLY" | "ANNUAL"}
        />
      );
    }
  }

  return (
    <>
      {gate}
      {children}
    </>
  );
}
