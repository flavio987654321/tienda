import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { periodFor, cotizarCambioDePlan } from "@/lib/subscription";
import { planDe, ecosistemaDeRol } from "@/lib/planLimits";
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

  if (billing !== "MONTHLY" && billing !== "ANNUAL") {
    return NextResponse.json({ error: "Ciclo de facturación inválido" }, { status: 400 });
  }

  // El plan sale del registro y nunca de un cast: `plan` llega del navegador y va
  // directo a buscar un precio. Una clave que no existe —inventada o heredada del
  // prototipo, como "constructor"— devuelve null y corta acá.
  const defPlan = planDe(plan);
  if (!defPlan) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  // Los planes gratis (Afiliado, y el Free de digitales) no se cobran nunca.
  // Sin este freno llegarían a `cotizarCambioDePlan`, que los devuelve en cero, y
  // la rama de "activar sin pasar por Mercado Pago" de más abajo los daría por
  // pagados. Vigilado por PAGO-O en subscription.check.ts.
  if (!defPlan.precios) {
    return NextResponse.json(
      { error: `El plan ${defPlan.label} es gratuito, no requiere pago` },
      { status: 400 }
    );
  }

  const role = defPlan.role;
  const tier = defPlan.tier;

  // El monto lo decide el servidor con los datos de la base, SIEMPRE. El
  // navegador no manda ningún importe: la pantalla de precios mostraba un total
  // con descuento que este endpoint no aplicaba, y MercadoPago terminaba
  // cobrando el precio de lista. Ahora la pantalla pregunta y acá se recalcula.
  const subActual = await prisma.subscription.findUnique({ where: { userId: user.id } });

  /* ⚠️ EL CANDADO DE ECOSISTEMA — lo más importante de esta ruta.
   *
   * `Subscription.userId` es único: una cuenta tiene UNA suscripción. Y las dos
   * escrituras que la activan (la de acá abajo y la del webhook) son un
   * `upsert` por `userId`.
   *
   * O sea que sin este freno, una dueña de tienda que tocara un plan digital
   * **le pisaba la suscripción de su propia tienda**: el rol pasaba de OWNER a
   * DIGITAL, su tienda quedaba sin suscripción viva, y el cron diario se la
   * cerraba sola. Destruye el negocio de alguien que ya está pagando, y no hay
   * ninguna pantalla donde eso se vea venir.
   *
   * La regla del proyecto es que una cuenta es una sola cosa —tienda, afiliado,
   * cliente o digital— y no se cruzan. Para vender productos digitales teniendo
   * una tienda hay que registrarse con otro correo.
   *
   * Se acota al borde de DIGITAL a propósito: el pasaje entre Afiliado y Tienda
   * existe desde antes y no se toca acá. */
  const ecoActual = ecosistemaDeRol(subActual?.role);
  const cruzaDigital =
    ecoActual !== null &&
    ecoActual !== defPlan.ecosistema &&
    (ecoActual === "DIGITAL" || defPlan.ecosistema === "DIGITAL");

  if (cruzaDigital) {
    return NextResponse.json(
      {
        error:
          defPlan.ecosistema === "DIGITAL"
            ? "Tu cuenta ya tiene una suscripción de tienda. Para vender productos digitales registrate con otro correo: cada cuenta es un solo producto."
            : "Tu cuenta es de Productos Digitales. Para tener una tienda registrate con otro correo: cada cuenta es un solo producto.",
      },
      { status: 409 }
    );
  }

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
  const planLabel = defPlan.label;
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
