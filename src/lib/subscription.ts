import { prisma } from "@/lib/prisma";

export const PRICES = {
  OWNER:     { MONTHLY: 25000, ANNUAL: 225000 },
  AFFILIATE: { MONTHLY: 15000, ANNUAL: 135000 },
};

export const TRIAL_DAYS = 7;
export const GRACE_DAYS = 4;

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";

export function getSubscriptionStatus(sub: {
  status: string;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
}): SubscriptionStatus {
  const now = new Date();

  if (sub.status === "CANCELLED") return "CANCELLED";
  if (sub.status === "TRIAL") {
    return now <= sub.trialEndsAt ? "TRIAL" : "EXPIRED";
  }
  if (sub.status === "ACTIVE" && sub.currentPeriodEnd) {
    if (now <= sub.currentPeriodEnd) return "ACTIVE";
    const graceEnd = sub.gracePeriodEndsAt ?? new Date(sub.currentPeriodEnd.getTime() + GRACE_DAYS * 86400000);
    return now <= graceEnd ? "GRACE" : "EXPIRED";
  }
  return sub.status as SubscriptionStatus;
}

export function isSubscriptionActive(sub: Parameters<typeof getSubscriptionStatus>[0]): boolean {
  const status = getSubscriptionStatus(sub);
  return status === "TRIAL" || status === "ACTIVE" || status === "GRACE";
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

export function daysRemaining(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}
