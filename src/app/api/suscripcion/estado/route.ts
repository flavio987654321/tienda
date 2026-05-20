import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, getSubscriptionStatus, daysRemaining } from "@/lib/subscription";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const sub = await getUserSubscription(user.id);
  if (!sub) return NextResponse.json({ subscription: null });

  const status = getSubscriptionStatus(sub);
  const relevantDate =
    status === "TRIAL" ? sub.trialEndsAt :
    status === "GRACE" ? (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd!) :
    sub.currentPeriodEnd ?? sub.trialEndsAt;

  return NextResponse.json({
    subscription: {
      status,
      role: sub.role,
      plan: sub.plan,
      daysLeft: daysRemaining(relevantDate),
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    },
  });
}
