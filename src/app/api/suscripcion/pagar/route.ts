import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { PRICES } from "@/lib/subscription";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Max 5 intentos de pago por usuario cada 10 minutos
  try {
    const allowed = await checkRateLimit(`sub-pay:${user.id}`, 5, 10 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos de pago. Esperá 10 minutos e intentá de nuevo." },
        { status: 429 }
      );
    }
  } catch {
    // Si Redis no está disponible, permitir el pago pero loguear
    console.error("[rate-limit] Redis no disponible en /suscripcion/pagar");
  }

  const { plan, billing, cardToken, paymentMethodId, rewardCouponCode, prorated } = await req.json();
  // plan: "OWNER_BASIC" | "OWNER_PREMIUM" | "AFFILIATE"
  // billing: "MONTHLY" | "ANNUAL"
  // prorated: true → cobrar solo la diferencia al pasar de mensual a anual

  if (!plan || !billing) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  // El plan de afiliadas es gratuito — nunca debería llegar un pago para él
  if (plan === "AFFILIATE") {
    return NextResponse.json({ error: "El plan de afiliadas es gratuito, no requiere pago" }, { status: 400 });
  }

  const baseAmount = PRICES[plan as keyof typeof PRICES]?.[billing as "MONTHLY" | "ANNUAL"];
  if (!baseAmount) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  const role = plan.startsWith("OWNER") ? "OWNER" : "AFFILIATE";
  const tier = plan === "OWNER_PREMIUM" ? "PREMIUM" : "BASIC";

  // Prorrateo: si viene de mensual activo y está cambiando a anual
  let proratedCredit = 0;
  if (prorated && billing === "ANNUAL") {
    const currentSub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (currentSub?.plan === "MONTHLY" && currentSub.status === "ACTIVE" && currentSub.currentPeriodEnd) {
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((currentSub.currentPeriodEnd.getTime() - now.getTime()) / 86400000));
      const monthlyPrice = PRICES[plan as keyof typeof PRICES]?.["MONTHLY"] ?? 0;
      proratedCredit = Math.round((daysLeft / 30) * monthlyPrice);
    }
  }

  // Validar y aplicar cupón de suscripción si viene
  let finalAmount = Math.max(0, baseAmount - proratedCredit);
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
      update: { role, tier, plan: billing, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt },
      create: { userId: user.id, role, tier, plan: billing, status: "ACTIVE", trialEndsAt: now, currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt },
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
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        // Clave determinista por minuto: previene doble cobro por doble-click
        // pero permite reintentar luego de un minuto si el anterior falló
        "X-Idempotency-Key": `sub-${user.id}-${plan}-${billing}-${Math.floor(Date.now() / 60000)}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        token: cardToken,
        description: `Suscripción ${role === "OWNER" ? (tier === "PREMIUM" ? "Dueño Premium" : "Dueño Básico") : "Afiliado"} - ${billing === "MONTHLY" ? "Mensual" : "Anual"}`,
        installments: 1,
        payment_method_id: paymentMethodId || "visa",
        payer: { email: user.email },
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/suscripcion/webhook`,
        metadata: { userId: user.id, plan, billing, role, tier, expectedAmount: amount },
      }),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok || mpData.status === "rejected") {
      return NextResponse.json(
        { error: mpData.status_detail || "Pago rechazado. Verificá los datos de tu tarjeta." },
        { status: 400 }
      );
    }

    if (mpData.status === "approved") {
      const now = new Date();
      const periodEnd = billing === "MONTHLY"
        ? new Date(now.getTime() + 30 * 86400000)
        : new Date(now.getTime() + 365 * 86400000);
      const gracePeriodEndsAt = new Date(periodEnd.getTime() + 4 * 86400000);

      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { role, tier, plan: billing, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt, mpPaymentId: String(mpData.id) },
        create: { userId: user.id, role, tier, plan: billing, status: "ACTIVE", trialEndsAt: now, currentPeriodStart: now, currentPeriodEnd: periodEnd, gracePeriodEndsAt, mpPaymentId: String(mpData.id) },
      });

      if (couponToMark) {
        await prisma.affiliateRewardCoupon.update({
          where: { id: couponToMark },
          data: { status: "USED", usedAt: now },
        });
      }

      return NextResponse.json({ success: true, status: "approved" });
    }

    if (mpData.status === "pending" || mpData.status === "in_process") {
      return NextResponse.json({ success: false, status: "pending", error: "Tu pago está siendo procesado. Te avisaremos por email cuando se confirme." }, { status: 202 });
    }

    return NextResponse.json({ error: "Estado de pago desconocido. Contactá soporte." }, { status: 400 });
  } catch (e) {
    console.error("SUSCRIPCION PAGO ERROR:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 });
  }
}
