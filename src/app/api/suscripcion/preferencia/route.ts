import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { PRICES } from "@/lib/subscription";
import { platformClient } from "@/lib/mp";
import { Preference } from "mercadopago";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { plan, billing, rewardCouponCode } = await req.json();

  if (!plan || !billing) {
    return NextResponse.json({ error: "Faltan datos del plan" }, { status: 400 });
  }

  const baseAmount = PRICES[plan as keyof typeof PRICES]?.[billing as "MONTHLY" | "ANNUAL"];
  if (!baseAmount) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  const role = plan.startsWith("OWNER") ? "OWNER" : "AFFILIATE";
  const tier = plan === "OWNER_PREMIUM" ? "PREMIUM" : "BASIC";

  // Validar y aplicar cupón si viene
  let finalAmount = baseAmount;
  let couponId: string | null = null;

  if (rewardCouponCode) {
    const coupon = await prisma.affiliateRewardCoupon.findUnique({
      where: { code: String(rewardCouponCode).trim().toUpperCase() },
    });
    if (
      coupon &&
      coupon.userId === user.id &&
      coupon.type === "SUBSCRIPTION" &&
      coupon.status === "AVAILABLE" &&
      coupon.expiresAt > new Date()
    ) {
      finalAmount = Math.round(baseAmount * (1 - Math.min(coupon.discountValue, 100) / 100));
      couponId = coupon.id;
    }
  }

  // Mes gratis (100% off) — activar directamente sin pasar por MP
  if (finalAmount === 0) {
    const now = new Date();
    const periodEnd = billing === "MONTHLY"
      ? new Date(now.getTime() + 30 * 86400000)
      : new Date(now.getTime() + 365 * 86400000);
    const gracePeriodEndsAt = new Date(periodEnd.getTime() + 4 * 86400000);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { role, tier, plan: billing, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt },
      create: { userId: user.id, role, tier, plan: billing, status: "ACTIVE", trialEndsAt: now, currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt },
    });
    if (couponId) {
      await prisma.affiliateRewardCoupon.update({
        where: { id: couponId },
        data: { status: "USED", usedAt: now },
      });
    }
    return NextResponse.json({ free: true });
  }

  // Crear preferencia de Checkout Pro en MP
  const planLabel = plan === "OWNER_PREMIUM" ? "Dueño Premium" : plan === "OWNER_BASIC" ? "Dueño Básico" : "Afiliado";
  const billingLabel = billing === "MONTHLY" ? "Mensual" : "Anual";

  const client = platformClient();
  const preference = new Preference(client);

  const pref = await preference.create({
    body: {
      items: [{
        id: plan,
        title: `Suscripción ${planLabel} - ${billingLabel}`,
        unit_price: finalAmount,
        quantity: 1,
        currency_id: "ARS",
      }],
      external_reference: user.id,
      back_urls: {
        success: `${APP_URL}/dashboard?suscripcion=ok`,
        failure: `${APP_URL}/dashboard/mi-plan?suscripcion=error`,
        pending: `${APP_URL}/dashboard/mi-plan?suscripcion=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${APP_URL}/api/suscripcion/webhook`,
      metadata: { userId: user.id, plan, billing, role, tier, couponId },
    },
  });

  const checkoutUrl = process.env.NODE_ENV === "production"
    ? pref.init_point
    : pref.sandbox_init_point;

  return NextResponse.json({ checkoutUrl });
}
