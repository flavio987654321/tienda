import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { periodFor } from "@/lib/subscription";
import { planDe, ecosistemaDeRol, planCerrado } from "@/lib/planLimits";
import { sendSubscriptionConfirmationEmail } from "@/lib/resend";
import { despues } from "@/lib/despues";

// Valores aceptados en metadata — cualquier otra cosa se rechaza.
// Los planes ya no van en una lista escrita a mano: salen del registro, que es
// el mismo que usa la ruta que creó la preferencia.
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
    // El plan sale del registro, no de una lista escrita a mano acá. Se exige
    // además que TENGA precio: un plan gratis nunca puede llegar por un pago.
    const defPlan = planDe(plan);
    if (!defPlan || !defPlan.precios) {
      console.error("WEBHOOK suscripcion: plan inválido o sin precio en metadata", { plan });
      return NextResponse.json({ ok: true });
    }
    /* Igual que en la ruta de la preferencia, y acá también porque ésta es la
       que escribe: entre que se crea un pago y se acredita puede haberse apagado
       el producto. Si pasa, no se aplica y se registra fuerte. */
    if (planCerrado(defPlan)) {
      console.error("WEBHOOK suscripcion: pago de un plan cerrado — no se aplica, revisar a mano", { plan });
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

    /* ── El candado de ecosistema, otra vez ───────────────────────────────────
     *
     * Ya está en la ruta que crea la preferencia, y acá va igual porque **esta
     * es la que escribe**. Entre que se crea una preferencia y se acredita el
     * pago pasa tiempo, y el estado de la cuenta puede haber cambiado: alguien
     * arranca un pago de un plan digital sin suscripción, se registra una tienda
     * mientras tanto, y el pago cae después. El upsert por `userId` le pisaría
     * la suscripción de la tienda y el cron se la cerraría.
     *
     * Si pasa, NO se aplica y se registra fuerte. Queda un pago cobrado sin
     * activar, que se resuelve a mano — mucho mejor que cerrarle la tienda a
     * alguien que está pagando. */
    const subActual = await prisma.subscription.findUnique({
      where: { userId },
      select: { role: true },
    });
    const ecoActual = ecosistemaDeRol(subActual?.role);
    if (
      ecoActual !== null &&
      ecoActual !== defPlan.ecosistema &&
      (ecoActual === "DIGITAL" || defPlan.ecosistema === "DIGITAL")
    ) {
      console.error(
        "WEBHOOK suscripcion: PAGO QUE CRUZA ECOSISTEMAS — no se aplica, revisar a mano",
        { paymentId, userId, plan, ecosistemaDelPago: defPlan.ecosistema, ecosistemaActual: ecoActual }
      );
      return NextResponse.json({ ok: true });
    }

    // ── Role y tier salen del registro, no de mirar el texto de la clave ──────
    // Antes eran `plan.startsWith("OWNER") ? "OWNER" : "AFFILIATE"` y
    // `plan === "OWNER_PREMIUM" ? "PREMIUM" : "BASIC"`. Con un tercer ecosistema
    // eso rompe en silencio: quien pagaba un plan digital quedaba registrado como
    // AFILIADO y con el tier del plan más chico.
    const safeRole = defPlan.role;
    const safeTier = defPlan.tier;
    const { couponId } = payment.metadata ?? {};

    const now = new Date();
    const period = periodFor(billing, now);

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        role: safeRole,
        tier: safeTier,
        plan: billing,
        status: "ACTIVE",
        ...period,
        mpPaymentId: String(payment.id),
      },
      create: {
        userId,
        role: safeRole,
        tier: safeTier,
        plan: billing,
        status: "ACTIVE",
        trialEndsAt: now,
        ...period,
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
      // El nombre que le llega por email tiene que coincidir con el del checkout
      // y con el de "Mi plan": son el mismo plan visto tres veces.
      const planLabel = defPlan.label;
      const billingLabel = billing === "MONTHLY" ? "Mensual" : "Anual";
      despues(() => sendSubscriptionConfirmationEmail({
        to: userRecord.email,
        userName: userRecord.name ?? "",
        planLabel,
        billingLabel,
        amount: payment.transaction_amount ?? 0,
        periodEnd: period.currentPeriodEnd,
        paymentId: String(payment.id),
        planKey: plan,
      }), "suscripción: mail de confirmación");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("WEBHOOK suscripcion ERROR:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente
  }
}
