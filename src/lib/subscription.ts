import { prisma } from "@/lib/prisma";

// El plan de afiliadas (AFFILIATE) es gratuito — se deja en 0 en vez de borrar la clave
// para no romper el resto del código que ya destructura PRICES.AFFILIATE.
export const PRICES = {
  OWNER_BASIC:   { MONTHLY: 20000, ANNUAL: 180000 },
  OWNER_PREMIUM: { MONTHLY: 25000, ANNUAL: 225000 },
  AFFILIATE:     { MONTHLY: 0, ANNUAL: 0 },
};

// Compatibilidad con código existente que usa PRICES["OWNER"] o PRICES["AFFILIATE"]
export function getPriceForRole(role: string, tier: string, billing: "MONTHLY" | "ANNUAL"): number {
  if (role === "OWNER") {
    const key = tier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC";
    return PRICES[key][billing];
  }
  return PRICES.AFFILIATE[billing];
}

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
