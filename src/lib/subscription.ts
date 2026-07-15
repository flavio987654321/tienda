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
/** Días con el panel accesible después de vencer. No es lo mismo que el cierre. */
export const GRACE_DAYS = 4;
export const MONTHLY_DAYS = 30;
export const ANNUAL_DAYS = 365;

// Días desde el vencimiento hasta que la tienda se cierra sola. Es una etapa
// posterior a GRACE_DAYS: primero se bloquea el panel (gracia) y la tienda sigue
// online, y recién después se cierra. Mismo esquema que Tiendanube, que da 2+8=10
// días a las tiendas nuevas y 10+10=20 a las que ya venían pagando.
//
// La diferencia es deliberada: quien viene pagando se ganó el beneficio de la
// duda; quien salió del trial sin pagar nunca, no.
export const TRIAL_CLOSURE_DAYS = 10;
export const PAID_CLOSURE_DAYS = 20;
/** Días antes del cierre en que se manda el último aviso. */
export const CLOSURE_WARNING_DAYS = 2;

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
    // Un período nuevo borra los avisos del anterior: si renovó, los "se te venció"
    // y "tu tienda cierra en 2 días" que ya recibió no aplican más, y cuando le
    // vuelva a vencer tiene que recibirlos de nuevo. Va acá y no en cada llamador
    // por lo mismo de siempre: son parte del mismo dato y separarlos los
    // desincroniza.
    expiredNotifiedAt: null,
    closingNotifiedAt: null,
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

/**
 * Cuándo se cierra sola la tienda por falta de pago, o `null` si no corresponde
 * (la suscripción está viva).
 *
 * El reloj arranca en el vencimiento real, no en el día que el cron la mira: si
 * el cron no corrió una semana, la fecha de cierre no se corre una semana.
 *
 * `currentPeriodEnd` distingue los dos casos sin necesidad de un campo nuevo:
 * existe solo si alguna vez tuvo un período de verdad (pagado o regalado por el
 * admin). Si es null, nunca pasó del trial.
 */
export function closureDeadline(sub: Parameters<typeof getSubscriptionStatus>[0]): Date | null {
  const status = getSubscriptionStatus(sub);
  if (status !== "GRACE" && status !== "EXPIRED") return null;

  const expiredAt = sub.currentPeriodEnd ?? sub.trialEndsAt;
  const days = sub.currentPeriodEnd ? PAID_CLOSURE_DAYS : TRIAL_CLOSURE_DAYS;
  return new Date(expiredAt.getTime() + days * 86400000);
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

export function daysRemaining(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}
