import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { PRICES } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { plan, billing, cardToken, paymentMethodId, rewardCouponCode } = await req.json();
  // plan: "OWNER" | "AFFILIATE"
  // billing: "MONTHLY" | "ANNUAL"
  // cardToken: token generado por MP.js en el frontend (puede ser null si el cupón cubre el 100%)

  if (!plan || !billing) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  const baseAmount = PRICES[plan as keyof typeof PRICES]?.[billing as "MONTHLY" | "ANNUAL"];
  if (!baseAmount) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  // Validar y aplicar cupón de suscripción si viene
  let finalAmount = baseAmount;
  let couponToMark: string | null = null;

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
      const discountPct = Math.min(coupon.discountValue, 100);
      finalAmount = Math.round(baseAmount * (1 - discountPct / 100));
      couponToMark = coupon.id;
    }
  }

  // Mes gratis (100% off) — no pasar por MP
  if (finalAmount === 0) {
    const now = new Date();
    const periodEnd = billing === "MONTHLY"
      ? new Date(now.getTime() + 30 * 86400000)
      : new Date(now.getTime() + 365 * 86400000);
    const gracePeriodEndsAt = new Date(periodEnd.getTime() + 4 * 86400000);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { plan: billing, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt },
      create: { userId: user.id, role: plan, plan: billing, status: "ACTIVE", trialEndsAt: now, currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt },
    });

    if (couponToMark) {
      await prisma.affiliateRewardCoupon.update({
        where: { id: couponToMark },
        data: { status: "USED", usedAt: now },
      });
    }

    return NextResponse.json({ success: true, status: "approved" });
  }

  if (!cardToken) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  const amount = finalAmount;

  try {
    // Crear pago en Mercado Pago
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": `sub-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        token: cardToken,
        description: `Suscripción ${plan === "OWNER" ? "Dueño de tienda" : "Afiliado"} - ${billing === "MONTHLY" ? "Mensual" : "Anual"}`,
        installments: 1,
        payment_method_id: paymentMethodId || "visa",
        payer: { email: user.email },
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/suscripcion/webhook`,
        metadata: {
          userId: user.id,
          plan,
          billing,
        },
      }),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok || mpData.status === "rejected") {
      return NextResponse.json(
        { error: mpData.status_detail || "Pago rechazado. Verificá los datos de tu tarjeta." },
        { status: 400 }
      );
    }

    // Pago aprobado — activar suscripción
    if (mpData.status === "approved") {
      const now = new Date();
      const periodEnd = billing === "MONTHLY"
        ? new Date(now.getTime() + 30 * 86400000)
        : new Date(now.getTime() + 365 * 86400000);
      const gracePeriodEndsAt = new Date(periodEnd.getTime() + 4 * 86400000);

      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          plan: billing,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodEndsAt,
          mpPaymentId: String(mpData.id),
        },
        create: {
          userId: user.id,
          role: plan,
          plan: billing,
          status: "ACTIVE",
          trialEndsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodEndsAt,
          mpPaymentId: String(mpData.id),
        },
      });

      if (couponToMark) {
        await prisma.affiliateRewardCoupon.update({
          where: { id: couponToMark },
          data: { status: "USED", usedAt: now },
        });
      }

      return NextResponse.json({ success: true, status: "approved" });
    }

    // Pago pendiente (ej: transferencia bancaria) — no activar todavía
    if (mpData.status === "pending" || mpData.status === "in_process") {
      return NextResponse.json({ success: false, status: "pending", error: "Tu pago está siendo procesado. Te avisaremos por email cuando se confirme." }, { status: 202 });
    }

    return NextResponse.json({ error: "Estado de pago desconocido. Contactá soporte." }, { status: 400 });
  } catch (e: any) {
    console.error("SUSCRIPCION PAGO ERROR:", e?.message);
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 });
  }
}
