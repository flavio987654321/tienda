import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export type RewardLevel    = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";
export type StoreCategoria = "RETAIL" | "MAYORISTA" | "ALTO_VALOR";

// ─── Umbrales mensuales por categoría ────────────────────────────────────────

export const LEVEL_THRESHOLDS: Record<StoreCategoria, { DIAMOND: number; GOLD: number; SILVER: number; BRONZE: number }> = {
  // Tiendas comunes: ropa, accesorios, consumo masivo, etc.
  RETAIL: {
    DIAMOND: 150_000,
    GOLD:     50_000,
    SILVER:   15_000,
    BRONZE:        1,
  },
  // Tiendas que venden al por mayor a otras empresas (toggle activado por el dueño)
  MAYORISTA: {
    DIAMOND: 750_000,
    GOLD:    250_000,
    SILVER:   75_000,
    BRONZE:        1,
  },
  // Auto-detectado: autos, inmuebles, maquinaria, electrónica de alto valor, etc.
  // El sistema lo determina solo mirando el promedio de comisión por venta.
  ALTO_VALOR: {
    DIAMOND: 5_000_000,
    GOLD:    1_500_000,
    SILVER:    500_000,
    BRONZE:          1,
  },
};

// ─── Cupones de tienda según plan ────────────────────────────────────────────

const STORE_DISCOUNT: Record<string, Record<string, number>> = {
  MONTHLY: { SILVER: 10, GOLD: 15, DIAMOND: 20 },
  ANNUAL:  { SILVER: 15, GOLD: 20, DIAMOND: 25 },
};

// ─── Cupones de suscripción (solo plan mensual) ───────────────────────────────

const SUBSCRIPTION_DISCOUNT: Record<string, number> = {
  SILVER:  10,
  GOLD:    20,
  DIAMOND: 100, // mes gratis
};

// ─── Bonus por racha de 3 meses consecutivos en Diamante ─────────────────────

const DIAMOND_STREAK_BONUS: Record<string, number> = {
  MONTHLY: 30,
  ANNUAL:  40,
};

// ─── Helpers públicos ─────────────────────────────────────────────────────────

export function calcularNivelConCategoria(comisionDelMes: number, categoria: StoreCategoria): RewardLevel {
  const t = LEVEL_THRESHOLDS[categoria];
  if (comisionDelMes >= t.DIAMOND) return "DIAMOND";
  if (comisionDelMes >= t.GOLD)    return "GOLD";
  if (comisionDelMes >= t.SILVER)  return "SILVER";
  return "BRONZE";
}

/** @deprecated usar calcularNivelConCategoria */
export function calcularNivel(comisionDelMes: number, esMayorista = false): RewardLevel {
  return calcularNivelConCategoria(comisionDelMes, esMayorista ? "MAYORISTA" : "RETAIL");
}

export function getNivelLabel(level: RewardLevel): string {
  return { BRONZE: "Bronce", SILVER: "Plata", GOLD: "Oro", DIAMOND: "Diamante" }[level];
}

export function getNivelColor(level: RewardLevel): string {
  return { BRONZE: "#cd7f32", SILVER: "#9ca3af", GOLD: "#f59e0b", DIAMOND: "#6366f1" }[level];
}

export function getCategoriaLabel(categoria: StoreCategoria): string {
  return { RETAIL: "Tienda minorista", MAYORISTA: "Tienda mayorista", ALTO_VALOR: "Tienda de alto valor" }[categoria];
}

// ─── Auto-detección de categoría ─────────────────────────────────────────────
//
// El sistema mira el historial real de comisiones para determinar si el
// negocio es de alto valor (autos, inmuebles, maquinaria, etc.) sin que
// nadie tenga que configurar nada manualmente.
//
// Reglas:
//   1. Si la tienda tiene tieneVentaMayorista → MAYORISTA (flag explícito del dueño)
//   2. Si hay < 3 comisiones en los últimos 3 meses → RETAIL (sin datos suficientes)
//   3. Si el promedio de comisión por transacción ≥ $50.000 → ALTO_VALOR
//   4. Si no → RETAIL
//
// Esto permite que el sistema aprenda solo: a medida que acumula ventas de
// alto ticket, auto-ajusta los umbrales sin intervención manual.

async function detectarCategoria(affiliateId: string): Promise<StoreCategoria> {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { store: { select: { tieneVentaMayorista: true } } },
  });

  if (affiliate?.store.tieneVentaMayorista) return "MAYORISTA";

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const commissions = await prisma.commission.findMany({
    where: {
      affiliateId,
      createdAt: { gte: threeMonthsAgo },
      status: { in: ["PENDING", "PAID"] },
    },
    select: { amount: true },
  });

  if (commissions.length < 3) return "RETAIL";

  const avg = commissions.reduce((s, c) => s + c.amount, 0) / commissions.length;
  return avg >= 50_000 ? "ALTO_VALOR" : "RETAIL";
}

// ─── Comisiones de un mes ─────────────────────────────────────────────────────

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

// ─── Nivel actual del afiliado (mes en curso) ─────────────────────────────────

export async function getNivelActual(affiliateId: string): Promise<{
  nivel:      RewardLevel;
  categoria:  StoreCategoria;
  esMayorista: boolean; // legacy, equivalente a categoria === "MAYORISTA"
}> {
  const now      = new Date();
  const categoria = await detectarCategoria(affiliateId);
  const total    = await getComisionesDelMes(affiliateId, now.getFullYear(), now.getMonth() + 1);
  return {
    nivel:       calcularNivelConCategoria(total, categoria),
    categoria,
    esMayorista: categoria === "MAYORISTA",
  };
}

// ─── Racha Diamante ───────────────────────────────────────────────────────────

export async function calcularRachaDiamante(userId: string): Promise<number> {
  const now = new Date();
  let streak = 0;

  for (let i = 1; i <= 6; i++) {
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const coupon = await prisma.affiliateRewardCoupon.findFirst({
      where: { userId, earnedMonth: ym, level: "DIAMOND" },
    });
    if (coupon) streak++;
    else break;
  }

  return streak;
}

// ─── Generación de cupones al cierre del mes ──────────────────────────────────

export async function generarCuponesMensuales(
  affiliateId: string,
  year:        number,
  month:       number,
): Promise<void> {
  const affiliate = await prisma.affiliate.findUnique({
    where:   { id: affiliateId },
    include: {
      user:  { include: { subscription: true } },
      store: { select: { tieneVentaMayorista: true } },
    },
  });

  if (!affiliate || !affiliate.isActive) return;

  const subscription = affiliate.user.subscription;
  if (!subscription || !["ACTIVE", "TRIAL"].includes(subscription.status)) return;

  const plan      = subscription.plan as "MONTHLY" | "ANNUAL";
  const categoria = await detectarCategoria(affiliateId);
  const comisiones = await getComisionesDelMes(affiliateId, year, month);
  const nivel      = calcularNivelConCategoria(comisiones, categoria);

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

  if (nivel === "DIAMOND") {
    const racha = await calcularRachaDiamante(affiliate.userId);
    if (racha > 0 && racha % 3 === 0) {
      cupones.push({
        code:          `RACHA-DI-${nanoid(8).toUpperCase()}`,
        userId:        affiliate.userId,
        type:          "STORE",
        level:         "DIAMOND",
        plan,
        discountValue: DIAMOND_STREAK_BONUS[plan],
        earnedMonth,
        expiresAt,
      });
    }
  }

  await prisma.affiliateRewardCoupon.createMany({ data: cupones });
}

// ─── Expirar cupones vencidos ─────────────────────────────────────────────────

export async function expirarCuponesVencidos(): Promise<void> {
  await prisma.affiliateRewardCoupon.updateMany({
    where: { status: "AVAILABLE", expiresAt: { lt: new Date() } },
    data:  { status: "EXPIRED" },
  });
}
