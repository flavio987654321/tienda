import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

function verifyMPSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("WEBHOOK: MP_WEBHOOK_SECRET no configurado, saltando verificación");
    return true; // En dev sin secret configurado, permitir
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id") ?? "";
  if (!xSignature) return false;

  const ts = xSignature.match(/ts=([^,]+)/)?.[1];
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1) return false;

  // MP firma: id:{dataId};request-id:{xRequestId};ts:{ts};
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  // timingSafeEqual evita timing attacks
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envía distintos tipos de notificaciones
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Verificar firma criptográfica de MercadoPago
    if (!verifyMPSignature(req, String(paymentId))) {
      console.warn("WEBHOOK: firma inválida — request rechazada", {
        xSignature: req.headers.get("x-signature"),
        paymentId,
      });
      return NextResponse.json({ ok: true }); // 200 para que MP no reintente, pero no procesamos
    }

    // Consultar el pago con timeout para no colgar el serverless
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

    if (!userId || !plan || !billing) return NextResponse.json({ ok: true });

    if (payment.status === "approved") {
      const now = new Date();
      const periodEnd = billing === "MONTHLY"
        ? new Date(now.getTime() + 30 * 86400000)
        : new Date(now.getTime() + 365 * 86400000);
      const gracePeriodEndsAt = new Date(periodEnd.getTime() + 4 * 86400000);

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          plan: billing,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodEndsAt,
          mpPaymentId: String(payment.id),
        },
        create: {
          userId,
          role: plan,
          plan: billing,
          status: "ACTIVE",
          trialEndsAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodEndsAt,
          mpPaymentId: String(payment.id),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("WEBHOOK ERROR:", e?.message);
    return NextResponse.json({ ok: true }); // Siempre 200 para que MP no reintente
  }
}
