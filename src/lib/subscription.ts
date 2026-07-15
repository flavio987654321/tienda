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
export const MONTHLY_DAYS = 30;
export const ANNUAL_DAYS = 365;

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";

/**
 * Fechas del período de una suscripción activa, derivadas de su facturación.
 *
 * `plan` y `currentPeriodEnd` son dos mitades del mismo dato: todo lo que active
 * una suscripción (webhook de MP, alta con cupón 100% off, panel de admin) tiene
 * que sacarlas de acá. Cuando el admin escribía `plan` sin la fecha quedaban
 * estados que un pago real no puede producir —ANNUAL venciendo mañana, o ACTIVE
 * sin vencimiento, que no expiraba nunca.
 */
export function periodFor(plan: string, from: Date = new Date()) {
  const days = plan === "ANNUAL" ? ANNUAL_DAYS : MONTHLY_DAYS;
  const currentPeriodEnd = new Date(from.getTime() + days * 86400000);
  return {
    currentPeriodStart: from,
    currentPeriodEnd,
    gracePeriodEndsAt: new Date(currentPeriodEnd.getTime() + GRACE_DAYS * 86400000),
  };
}

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
  if (sub.status === "ACTIVE") {
    // Una suscripción ACTIVE sin vencimiento no la puede producir ningún pago.
    // Antes esta rama pedía `&& sub.currentPeriodEnd`, así que esos casos caían
    // al `return sub.status` de abajo y quedaban ACTIVE para siempre: no
    // expiraban nunca y el banner del dashboard mostraba "vence en menos de
    // 24 hs" de forma permanente (usa `currentPeriodEnd ?? trialEndsAt`).
    // Se falla cerrado: sin fecha, vencida.
    if (!sub.currentPeriodEnd) return "EXPIRED";
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
