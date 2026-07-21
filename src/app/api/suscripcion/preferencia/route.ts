import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { periodFor, cotizarCambioDePlan } from "@/lib/subscription";
import { platformClient } from "@/lib/mp";
import { Preference } from "mercadopago";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const _configuredUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  const APP_URL = (/^https?:\/\//.test(_configuredUrl) ? _configuredUrl : `https://${req.headers.get("host")}`).replace(/\/$/, "");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Max 10 creaciones de preferencia por usuario por hora
  try {
    const allowed = await checkRateLimit(`sub-pref:${user.id}`, 10, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá un momento e intentá de nuevo." },
        { status: 429 }
      );
    }
  } catch {
    console.error("[rate-limit] Redis no disponible en /suscripcion/preferencia");
  }

  const { plan, billing, rewardCouponCode } = await req.json();

  if (!plan || !billing) {
    return NextResponse.json({ error: "Faltan datos del plan" }, { status: 400 });
  }

  // El plan de afiliadas es gratuito — nunca debería llegar un pago para él
  if (plan === "AFFILIATE") {
    return NextResponse.json({ error: "El plan de afiliadas es gratuito, no requiere pago" }, { status: 400 });
  }

  // Se validan contra la lista de valores permitidos y no con un cast: `plan`
  // llega del navegador y va directo a buscar un precio.
  if (plan !== "OWNER_BASIC" && plan !== "OWNER_PREMIUM") {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }
  if (billing !== "MONTHLY" && billing !== "ANNUAL") {
    return NextResponse.json({ error: "Ciclo de facturación inválido" }, { status: 400 });
  }

  const role = "OWNER";
  const tier = plan === "OWNER_PREMIUM" ? "PREMIUM" : "BASIC";

  // El monto lo decide el servidor con los datos de la base, SIEMPRE. El
  // navegador no manda ningún importe: la pantalla de precios mostraba un total
  // con descuento que este endpoint no aplicaba, y MercadoPago terminaba
  // cobrando el precio de lista. Ahora la pantalla pregunta y acá se recalcula.
  const subActual = await prisma.subscription.findUnique({ where: { userId: user.id } });
  const cotizacion = cotizarCambioDePlan(subActual, { plan, billing });
  const baseAmount = cotizacion.aPagar;

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
      // El porcentaje se aplica sobre lo que quedó DESPUÉS del descuento por días
      // no usados, no sobre el precio de lista. Así los dos beneficios se suman
      // sin que el total pueda irse abajo de cero, y un cupón del 100% sigue
      // dejando la suscripción en cero.
      finalAmount = Math.round(baseAmount * (1 - Math.min(coupon.discountValue, 100) / 100));
      couponId = coupon.id;
    }
  }

  // Mes gratis (100% off) — activar directamente sin pasar por MP
  if (finalAmount === 0) {
    const now = new Date();
    const period = periodFor(billing, now);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { role, tier, plan: billing, status: "ACTIVE", ...period },
      create: { userId: user.id, role, tier, plan: billing, status: "ACTIVE", trialEndsAt: now, ...period },
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
  // Este texto es el que ve la persona en el checkout de MercadoPago y le queda
  // en el comprobante: tiene que ser el nombre real del plan. "Dueño Básico" no
  // existe en ninguna pantalla ni en los Términos.
  const planLabel = plan === "OWNER_PREMIUM" ? "Tienda Premium" : plan === "OWNER_BASIC" ? "Tienda Pro" : "Afiliado";
  const billingLabel = billing === "MONTHLY" ? "Mensual" : "Anual";

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[suscripcion/preferencia] MP_ACCESS_TOKEN no está configurado");
    return NextResponse.json({ error: "El sistema de pagos no está configurado. Contactá soporte." }, { status: 503 });
  }

  const client = platformClient();
  const preference = new Preference(client);

  const backUrls = {
    success: `${APP_URL}/dashboard/mi-plan`,
    failure: `${APP_URL}/dashboard/mi-plan`,
    pending: `${APP_URL}/dashboard/mi-plan`,
  };

  let pref;
  try {
    pref = await preference.create({
      body: {
        items: [{
          id: plan,
          title: `Suscripción ${planLabel} - ${billingLabel}`,
          unit_price: finalAmount,
          quantity: 1,
          currency_id: "ARS",
        }],
        external_reference: user.id,
        back_urls: backUrls,
        auto_return: "approved",
        notification_url: `${APP_URL}/api/suscripcion/webhook`,
        metadata: { userId: user.id, plan, billing, role, tier, couponId, expectedAmount: finalAmount },
      },
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
    const errObj = e as { cause?: unknown; response?: unknown } | null;
    const errCause = errObj?.cause ?? errObj?.response ?? null;
    console.error("[suscripcion/preferencia] Error al crear preferencia MP:", errMsg, errCause);
    return NextResponse.json({ error: "No se pudo conectar con Mercado Pago. Intentá de nuevo en unos minutos." }, { status: 502 });
  }

  const checkoutUrl = process.env.NODE_ENV === "production"
    ? pref.init_point
    : pref.sandbox_init_point;

  return NextResponse.json({ checkoutUrl });
}
