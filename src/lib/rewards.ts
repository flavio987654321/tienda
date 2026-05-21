import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export type RewardLevel = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

// Umbrales de comisión mensual para cada nivel
const LEVEL_THRESHOLDS = {
  DIAMOND: 50000,
  GOLD:    20000,
  SILVER:  5000,
  BRONZE:  1,
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

export function calcularNivel(comisionDelMes: number): RewardLevel {
  if (comisionDelMes >= LEVEL_THRESHOLDS.DIAMOND) return "DIAMOND";
  if (comisionDelMes >= LEVEL_THRESHOLDS.GOLD)    return "GOLD";
  if (comisionDelMes >= LEVEL_THRESHOLDS.SILVER)  return "SILVER";
  if (comisionDelMes >= LEVEL_THRESHOLDS.BRONZE)  return "BRONZE";
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
    },
  });

  if (!affiliate || !affiliate.isActive) return;

  const subscription = affiliate.user.subscription;
  if (!subscription || !["ACTIVE", "TRIAL"].includes(subscription.status)) return;

  const plan = subscription.plan as "MONTHLY" | "ANNUAL";
  const comisiones = await getComisionesDelMes(affiliateId, year, month);
  const nivel = calcularNivel(comisiones);

  if (nivel === "BRONZE") return; // Bronce no genera cupones

  const earnedMonth = `${year}-${String(month).padStart(2, "0")}`;
  const expiresAt   = new Date(year, month, 1); // vence al inicio del mes siguiente
  expiresAt.setDate(expiresAt.getDate() + 30);  // 30 días para usarlo

  // Verificar que no se generaron cupones este mes ya
  const yaGenerados = await prisma.affiliateRewardCoupon.findFirst({
    where: { userId: affiliate.userId, earnedMonth },
  });
  if (yaGenerados) return;

  type CuponData = {
    code: string; userId: string; type: string; level: string; plan: string;
    discountValue: number; earnedMonth: string; expiresAt: Date;
  };
  const cupones: CuponData[] = [];

  // Cupón de tienda siempre (mensual y anual)
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

  // Cupón de suscripción solo para plan mensual
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

  await prisma.affiliateRewardCoupon.createMany({ data: cupones });
}

// Marcar cupones vencidos
export async function expirarCuponesVencidos(): Promise<void> {
  await prisma.affiliateRewardCoupon.updateMany({
    where: {
      status:    "AVAILABLE",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

// Obtener nivel actual de un afiliado (mes en curso)
export async function getNivelActual(affiliateId: string): Promise<RewardLevel> {
  const now   = new Date();
  const total = await getComisionesDelMes(affiliateId, now.getFullYear(), now.getMonth() + 1);
  return calcularNivel(total);
}
