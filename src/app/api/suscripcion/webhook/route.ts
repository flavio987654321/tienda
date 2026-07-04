import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionConfirmationEmail } from "@/lib/resend";

// Valores aceptados en metadata — cualquier otra cosa se rechaza
const VALID_PLANS = new Set(["OWNER_BASIC", "OWNER_PREMIUM"]);
const VALID_BILLINGS = new Set(["MONTHLY", "ANNUAL"]);

function verifyMPSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("WEBHOOK suscripcion: MP_WEBHOOK_SECRET no configurado en producción — bloqueando");
      return false;
    }
    console.warn("WEBHOOK suscripcion: MP_WEBHOOK_SECRET no configurado, saltando verificación (solo dev)");
    return true;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id") ?? "";
  if (!xSignature) return false;

  const ts = xSignature.match(/ts=([^,]+)/)?.[1];
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1) return false;

  // Firma canónica según spec de MP: id:{paymentId};request-id:{reqId};ts:{ts};
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envía distintos tipos de notificaciones — solo nos interesan pagos
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Verificar firma HMAC-SHA256 antes de hacer cualquier cosa
    if (!verifyMPSignature(req, String(paymentId))) {
      console.warn("WEBHOOK suscripcion: firma inválida — rechazando", {
        xSignature: req.headers.get("x-signature"),
        paymentId,
      });
      return NextResponse.json({ ok: true }); // 200 para que MP no reintente
    }

    // Re-consultar el pago directamente a la API de MP para no confiar en el body
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!mpRes.ok) return NextResponse.json({ ok: true });

    const payment = await mpRes.json();
    const { userId, plan, billing } = payment.metadata ?? {};

    // ── Validar whitelist de metadata ─────────────────────────────────────────
    if (!userId || typeof userId !== "string" || userId.length < 4 || userId.length > 64) {
      console.error("WEBHOOK suscripcion: userId inválido en metadata", { userId });
      return NextResponse.json({ ok: true });
    }
    if (!VALID_PLANS.has(plan)) {
      console.error("WEBHOOK suscripcion: plan inválido en metadata", { plan });
      return NextResponse.json({ ok: true });
    }
    if (!VALID_BILLINGS.has(billing)) {
      console.error("WEBHOOK suscripcion: billing inválido en metadata", { billing });
      return NextResponse.json({ ok: true });
    }

    // ── Validar monto contra el esperado guardado en metadata ────────────────
    // expectedAmount lo fijamos nosotros server-side en /pagar y /preferencia;
    // cubre descuentos por cupón y prorrateos. Tolerancia del 5% por redondeos.
    const { expectedAmount } = payment.metadata ?? {};
    const expectedAmt = typeof expectedAmount === "number" ? expectedAmount : null;
    if (expectedAmt !== null && payment.transaction_amount < expectedAmt * 0.95) {
      console.error("WEBHOOK suscripcion: monto no coincide con el esperado", {
        paymentId,
        plan,
        billing,
        received: payment.transaction_amount,
        expected: expectedAmt,
      });
      return NextResponse.json({ ok: true });
    }

    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    // ── Verificar que el usuario existe en la DB ──────────────────────────────
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!userRecord) {
      console.error("WEBHOOK suscripcion: userId no existe en DB", { userId });
      return NextResponse.json({ ok: true });
    }

    // ── Derivar role/tier desde el plan (nunca desde metadata sin verificar) ──
    const safeRole = plan.startsWith("OWNER") ? "OWNER" : "AFFILIATE";
    const safeTier = plan === "OWNER_PREMIUM" ? "PREMIUM" : "BASIC";
    const { couponId } = payment.metadata ?? {};

    const now = new Date();
    const periodEnd = billing === "MONTHLY"
      ? new Date(now.getTime() + 30 * 86400000)
      : new Date(now.getTime() + 365 * 86400000);
    const gracePeriodEndsAt = new Date(periodEnd.getTime() + 4 * 86400000);

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        role: safeRole,
        tier: safeTier,
        plan: billing,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        gracePeriodEndsAt,
        mpPaymentId: String(payment.id),
      },
      create: {
        userId,
        role: safeRole,
        tier: safeTier,
        plan: billing,
        status: "ACTIVE",
        trialEndsAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        gracePeriodEndsAt,
        mpPaymentId: String(payment.id),
      },
    });

    // Marcar cupón como usado si se aplicó uno
    if (couponId && typeof couponId === "string" && couponId.length > 0) {
      await prisma.affiliateRewardCoupon.update({
        where: { id: couponId },
        data: { status: "USED", usedAt: now },
      }).catch(() => {});
    }

    if (userRecord.email) {
      const planLabel = plan === "OWNER_PREMIUM" ? "Dueño Premium" : "Dueño Básico";
      const billingLabel = billing === "MONTHLY" ? "Mensual" : "Anual";
      sendSubscriptionConfirmationEmail({
        to: userRecord.email,
        userName: userRecord.name ?? "",
        planLabel,
        billingLabel,
        amount: payment.transaction_amount ?? 0,
        periodEnd,
        paymentId: String(payment.id),
        planKey: plan,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("WEBHOOK suscripcion ERROR:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente
  }
}
