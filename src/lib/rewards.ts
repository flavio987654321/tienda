import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export type RewardLevel = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

// Umbrales de comisión mensual para tiendas minoristas
export const LEVEL_THRESHOLDS = {
  DIAMOND: 150000,
  GOLD:     50000,
  SILVER:   15000,
  BRONZE:       1,
};

// Umbrales para tiendas mayoristas (ventas más grandes, comisiones más altas por transacción)
export const LEVEL_THRESHOLDS_MAYORISTA = {
  DIAMOND: 750000,
  GOLD:    250000,
  SILVER:   75000,
  BRONZE:       1,
};

// Descuentos para cupones de tienda según plan y nivel
const STORE_DISCOUNT: Record<string, Record<string, number>> = {
  MONTHLY: { SILVER: 10, GOLD: 15, DIAMOND: 20 },
  ANNUAL:  { SILVER: 15, GOLD: 20, DIAMOND: 25 },
};

// Descuentos para cupones de suscripción (solo plan mensual)
const SUBSCRIPTION_DISCOUNT: Record<string, number> = {
  SILVER:  10,
  GOLD:    20,
  DIAMOND: 100, // mes gratis
};

// Cupón bonus por racha de 3 meses consecutivos en Diamante
const DIAMOND_STREAK_BONUS: Record<string, number> = {
  MONTHLY: 30, // 30% off en tiendas
  ANNUAL:  40, // 40% off en tiendas
};

export function calcularNivel(comisionDelMes: number, esMayorista = false): RewardLevel {
  const t = esMayorista ? LEVEL_THRESHOLDS_MAYORISTA : LEVEL_THRESHOLDS;
  if (comisionDelMes >= t.DIAMOND) return "DIAMOND";
  if (comisionDelMes >= t.GOLD)    return "GOLD";
  if (comisionDelMes >= t.SILVER)  return "SILVER";
  if (comisionDelMes >= t.BRONZE)  return "BRONZE";
  return "BRONZE";
}

export function getNivelLabel(level: RewardLevel): string {
  const labels: Record<RewardLevel, string> = {
    BRONZE:  "Bronce",
    SILVER:  "Plata",
    GOLD:    "Oro",
    DIAMOND: "Diamante",
  };
  return labels[level];
}

export function getNivelColor(level: RewardLevel): string {
  const colors: Record<RewardLevel, string> = {
    BRONZE:  "#cd7f32",
    SILVER:  "#9ca3af",
    GOLD:    "#f59e0b",
    DIAMOND: "#6366f1",
  };
  return colors[level];
}

// Calcula comisiones de un afiliado en un mes dado
async function getComisionesDelMes(affiliateId: string, year: number, month: number): Promise<number> {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);

  const result = await prisma.commission.aggregate({
    where: {
      affiliateId,
      createdAt: { gte: start, lt: end },
      status: { in: ["PENDING", "PAID"] },
    },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

// Calcula cuántos meses consecutivos en Diamante tiene un usuario (máx 6 hacia atrás)
export async function calcularRachaDiamante(userId: string): Promise<number> {
  const now = new Date();
  let streak = 0;

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const coupon = await prisma.affiliateRewardCoupon.findFirst({
      where: { userId, earnedMonth: ym, level: "DIAMOND" },
    });
    if (coupon) streak++;
    else break;
  }

  return streak;
}

// Genera los cupones de premio para un afiliado al cierre del mes
export async function generarCuponesMensuales(
  affiliateId: string,
  year: number,
  month: number
): Promise<void> {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: {
      user: { include: { subscription: true } },
      store: { select: { tieneVentaMayorista: true } },
    },
  });

  if (!affiliate || !affiliate.isActive) return;

  const subscription = affiliate.user.subscription;
  if (!subscription || !["ACTIVE", "TRIAL"].includes(subscription.status)) return;

  const plan = subscription.plan as "MONTHLY" | "ANNUAL";
  const esMayorista = affiliate.store.tieneVentaMayorista;
  const comisiones = await getComisionesDelMes(affiliateId, year, month);
  const nivel = calcularNivel(comisiones, esMayorista);

  if (nivel === "BRONZE") return;

  const earnedMonth = `${year}-${String(month).padStart(2, "0")}`;
  const expiresAt   = new Date(year, month, 1);
  expiresAt.setDate(expiresAt.getDate() + 30);

  const yaGenerados = await prisma.affiliateRewardCoupon.findFirst({
    where: { userId: affiliate.userId, earnedMonth },
  });
  if (yaGenerados) return;

  type CuponData = {
    code: string; userId: string; type: string; level: string; plan: string;
    discountValue: number; earnedMonth: string; expiresAt: Date;
  };
  const cupones: CuponData[] = [];

  // Cupón de tienda
  const storeDiscount = STORE_DISCOUNT[plan]?.[nivel];
  if (storeDiscount) {
    cupones.push({
      code:          `PREMIO-${nivel.slice(0, 2)}-${nanoid(8).toUpperCase()}`,
      userId:        affiliate.userId,
      type:          "STORE",
      level:         nivel,
      plan,
      discountValue: storeDiscount,
      earnedMonth,
      expiresAt,
    });
  }

  // Cupón de suscripción (solo mensual)
  if (plan === "MONTHLY") {
    const subDiscount = SUBSCRIPTION_DISCOUNT[nivel];
    if (subDiscount) {
      cupones.push({
        code:          `SUB-${nivel.slice(0, 2)}-${nanoid(8).toUpperCase()}`,
        userId:        affiliate.userId,
        type:          "SUBSCRIPTION",
        level:         nivel,
        plan,
        discountValue: subDiscount,
        earnedMonth,
        expiresAt,
      });
    }
  }

  // Bonus por racha de 3 meses consecutivos en Diamante
  if (nivel === "DIAMOND") {
    const racha = await calcularRachaDiamante(affiliate.userId);
    if (racha > 0 && racha % 3 === 0) {
      const bonusDiscount = DIAMOND_STREAK_BONUS[plan];
      cupones.push({
        code:          `RACHA-DI-${nanoid(8).toUpperCase()}`,
        userId:        affiliate.userId,
        type:          "STORE",
        level:         "DIAMOND",
        plan,
        discountValue: bonusDiscount,
        earnedMonth,
        expiresAt,
      });
    }
  }

  await prisma.affiliateRewardCoupon.createMany({ data: cupones });
}

// Marcar cupones vencidos
export async function expirarCuponesVencidos(): Promise<void> {
  await prisma.affiliateRewardCoupon.updateMany({
    where: { status: "AVAILABLE", expiresAt: { lt: new Date() } },
    data:  { status: "EXPIRED" },
  });
}

// Obtener nivel actual de un afiliado (mes en curso)
export async function getNivelActual(affiliateId: string): Promise<{ nivel: RewardLevel; esMayorista: boolean }> {
  const now = new Date();
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { store: { select: { tieneVentaMayorista: true } } },
  });
  const esMayorista = affiliate?.store.tieneVentaMayorista ?? false;
  const total = await getComisionesDelMes(affiliateId, now.getFullYear(), now.getMonth() + 1);
  return { nivel: calcularNivel(total, esMayorista), esMayorista };
}
