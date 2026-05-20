import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envía distintos tipos de notificaciones
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Consultar el pago a la API de MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) return NextResponse.json({ ok: true });

    const payment = await mpRes.json();
    const { userId, plan, billing } = payment.metadata ?? {};

    if (!userId || !plan || !billing) return NextResponse.json({ ok: true });

    if (payment.status === "approved") {
      const now = new Date();
      const periodEnd = billing === "MONTHLY"
        ? new Date(now.getTime() + 30 * 86400000)
        : new Date(now.getTime() + 365 * 86400000);

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          plan: billing,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodEndsAt: null,
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
