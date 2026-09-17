import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
/* La verificación de firma vive en `lib/mp-firma`, con los otros tres
   webhooks de pago. Acá había una copia a mano —idéntica, pero suelta—, que
   es exactamente lo que esa pieza se escribió para evitar. */
import { firmaDeMercadoPagoValida } from "@/lib/mp-firma";
import { periodFor } from "@/lib/subscription";
import { planDe, ecosistemaDeRol, planCerrado } from "@/lib/planLimits";
import { sendSubscriptionConfirmationEmail } from "@/lib/resend";
import { despues } from "@/lib/despues";

// Valores aceptados en metadata — cualquier otra cosa se rechaza.
// Los planes ya no van en una lista escrita a mano: salen del registro, que es
// el mismo que usa la ruta que creó la preferencia.
const VALID_BILLINGS = new Set(["MONTHLY", "ANNUAL"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envía distintos tipos de notificaciones — solo nos interesan pagos
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Verificar firma HMAC-SHA256 antes de hacer cualquier cosa
    if (!firmaDeMercadoPagoValida(req, String(paymentId))) {
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
      select: { role: true, mpPaymentId: true },
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
    const idDelPago = String(payment.id);

    /* ── Un pago se aplica UNA vez ────────────────────────────────────────────
     *
     * Mercado Pago manda el mismo aviso más de una vez con toda normalidad: uno
     * cuando el pago se crea y otro cuando cambia de estado, más los reintentos
     * de los que no pudo entregar. Los tres son avisos legítimos, con firma
     * válida, y todos traen `status: "approved"`.
     *
     * Hasta el 16/09/26 esto era un `upsert` pelado. Cada aviso volvía a correr
     * `periodFor(billing, now)`, o sea que **le movía el vencimiento a la fecha
     * del último aviso**. Dos avisos con cinco segundos de diferencia no hacen
     * daño; uno que llega tres meses después de un pago anual regala tres meses,
     * y nadie se entera nunca — no hay ningún error, la cuenta simplemente vence
     * más tarde de lo que se pagó.
     *
     * Era el único de los cuatro webhooks de pago del proyecto sin este freno:
     * `canasta` lo hace con un compare-and-swap sobre el estado, `mp/webhook`
     * con un índice único que le hace tirar P2002, y `digitales/cobro` lo dice
     * en su encabezado. Guardábamos `mpPaymentId` desde siempre y nunca lo
     * mirábamos.
     *
     * ── Por qué no alcanza con un índice único en `mpPaymentId` ──────────────
     *
     * Porque el `upsert` es por `userId`, y `Subscription.userId` es único: una
     * cuenta tiene UNA suscripción. Reaplicar el mismo pago escribe el mismo
     * `mpPaymentId` en LA MISMA FILA, y eso no viola ninguna unicidad. El índice
     * no se enteraría.
     *
     * Por eso el freno es el `where` de abajo, que es además un compare-and-swap
     * de verdad: si dos avisos entran a la vez, los dos leyeron `subActual`
     * antes de que ninguno escribiera, pero sólo uno encuentra la fila con un
     * `mpPaymentId` distinto del suyo. El otro cuenta cero y se va.
     *
     * El `OR` con `null` no es adorno: en SQL `mpPaymentId <> 'x'` sobre un
     * valor nulo no da verdadero, da nulo. Sin esa rama, la primera suscripción
     * que paga —la que todavía tiene la columna vacía— no la tomaría el `where`
     * y el pago no se aplicaría nunca. */
    if (subActual) {
      const aplicado = await prisma.subscription.updateMany({
        where: {
          userId,
          OR: [{ mpPaymentId: null }, { mpPaymentId: { not: idDelPago } }],
        },
        data: {
          role: safeRole,
          tier: safeTier,
          plan: billing,
          status: "ACTIVE",
          ...period,
          mpPaymentId: idDelPago,
        },
      });
      if (aplicado.count === 0) {
        console.warn("WEBHOOK suscripcion: aviso repetido — este pago ya estaba aplicado", {
          paymentId: idDelPago,
          userId,
        });
        return NextResponse.json({ ok: true });
      }
    } else {
      /* Sin suscripción previa. El `create` puede chocar con el de un aviso
         gemelo que entró primero (`userId` es único): eso es P2002, y significa
         que el pago ya se aplicó. Se contesta 200 igual que arriba. */
      try {
        await prisma.subscription.create({
          data: {
            userId,
            role: safeRole,
            tier: safeTier,
            plan: billing,
            status: "ACTIVE",
            trialEndsAt: now,
            ...period,
            mpPaymentId: idDelPago,
          },
        });
      } catch (e) {
        if ((e as { code?: string })?.code === "P2002") {
          console.warn("WEBHOOK suscripcion: aviso repetido — la suscripción la creó el aviso gemelo", {
            paymentId: idDelPago,
            userId,
          });
          return NextResponse.json({ ok: true });
        }
        throw e;
      }
    }

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
