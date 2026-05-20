import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { PRICES } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { plan, billing, cardToken } = await req.json();
  // plan: "OWNER" | "AFFILIATE"
  // billing: "MONTHLY" | "ANNUAL"
  // cardToken: token generado por MP.js en el frontend

  if (!plan || !billing || !cardToken) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  const amount = PRICES[plan as keyof typeof PRICES]?.[billing as "MONTHLY" | "ANNUAL"];
  if (!amount) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

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
        payment_method_id: "visa", // se sobreescribe con el token
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

      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          plan: billing,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodEndsAt: null,
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
          mpPaymentId: String(mpData.id),
        },
      });

      return NextResponse.json({ success: true, status: "approved" });
    }

    // Pago pendiente (ej: transferencia)
    return NextResponse.json({ success: true, status: mpData.status });
  } catch (e: any) {
    console.error("SUSCRIPCION PAGO ERROR:", e?.message);
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 });
  }
}
