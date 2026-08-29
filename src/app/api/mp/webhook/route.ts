import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { createNotification } from "@/lib/notifications";
import { runOrderAction } from "@/lib/orderActions";
import { sendOrderPaymentConfirmedEmail, sendCommissionEarnedEmail, parseOrderPromoSummary, sendDigitalDownloadEmail } from "@/lib/email";
import { crearDescargasDigitales, MAX_DESCARGAS } from "@/lib/descargas";
import { despues } from "@/lib/despues";

type CommissionResult = { commissionId: string; amount: number; rate: number; newBalance: number };

function verifyMPSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRÍTICO: MP_WEBHOOK_SECRET no está configurado en producción — todas las solicitudes son rechazadas");
      return false;
    }
    return true; // solo en dev/test sin secret
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id") ?? "";
  if (!xSignature) return false;

  const ts = xSignature.match(/ts=([^,]+)/)?.[1];
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

async function processPaymentWebhook(paymentId: string) {
  try {

    // Obtener detalles del pago desde MP
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN ?? "",
    });

    const mpPayment = new Payment(client);
    const payment = await mpPayment.get({ id: paymentId });

    if (payment.status === "cancelled" || payment.status === "rejected" || payment.status === "refunded") {
      // Cancelar la orden si todavía está pendiente
      /* Acá había una cancelación propia, escrita a mano, y le faltaba lo más
         importante: NO DEVOLVÍA EL STOCK.
         El checkout descuenta el stock al crear el pedido, con el pago todavía
         pendiente. Cancelar desde el panel lo devuelve —`runOrderAction` lo hace
         unidad por unidad y deja su movimiento de CANCELLATION—. Este camino no.
         O sea que al primer pago rechazado el comerciante quedaba con menos
         inventario en el sistema del que tenía en la mano, para siempre y sin
         ninguna señal: acá tampoco se avisaba a nadie.
         Tampoco reponía el `lowStockAlertSentAt`, así que la variante quedaba
         además muda para el próximo aviso de stock bajo.
         Ahora se cancela por el MISMO camino que el panel. No es solo por el
         stock: ahí adentro está también la reversión de comisión al afiliado, el
         mail al comprador y los avisos, todo lo que una cancelación tiene que
         hacer. Tener dos formas de cancelar donde una está incompleta es la
         manera segura de que se sigan separando con cada cambio. */
      const orderId = payment.external_reference;
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, couponId: true, store: { select: { ownerId: true } } },
        });
        if (order?.status === "PENDING" && order.store?.ownerId) {
          try {
            await runOrderAction({
              orderId,
              ownerId: order.store.ownerId,
              action: "cancel",
              // Cambia el texto del aviso y hace que suene el teléfono: esto no
              // lo decidió el dueño, se le cayó una venta mientras hacía otra cosa.
              origen: "mercadopago",
            });

            /* El cupón se devuelve acá y no adentro de `runOrderAction`: es propio
               de este camino. El pago se rechazó pero la persona sigue queriendo
               comprar, así que su cupón tiene que servirle para reintentar. Cuando
               cancela el dueño, en cambio, la venta se termina ahí.

               Va DESPUÉS del await y adentro del try, no al lado. Si la
               cancelación falla, el pedido queda en PENDING y MercadoPago va a
               reintentar este mismo aviso: con el cupón devuelto afuera, cada
               reintento le restaba un uso más al cupón hasta dejarlo en cero
               —regalando descuentos que nadie usó—. Devolviéndolo solo cuando la
               cancelación salió bien, el reintento encuentra el pedido ya
               cancelado y no vuelve a entrar. */
            if (order.couponId) {
              await prisma.coupon.updateMany({
                where: { id: order.couponId, usedCount: { gt: 0 } },
                data: { usedCount: { decrement: 1 } },
              }).catch((err) => console.error("[mp/webhook] no se pudo devolver el cupón", err));
            }
          } catch (err) {
            /* Que MercadoPago reciba un 200 igual. Si esto devuelve un error, MP
               reintenta el mismo aviso una y otra vez, y un fallo que no se va a
               arreglar solo se convierte en una repetición infinita. El pedido
               queda en PENDING y se puede cancelar a mano desde el panel. */
            console.error("[mp/webhook] no se pudo cancelar el pedido", orderId, err);
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Chargeback: descontar comisión ya acreditada al afiliado
    if (payment.status === "charged_back" || payment.status === "in_mediation") {
      const orderId = payment.external_reference;
      if (orderId) {
        const commission = await prisma.commission.findUnique({
          where: { orderId },
          include: { affiliate: { select: { userId: true } } },
        });
        if (commission && commission.status === "PAID") {
          const updatedWallet = await prisma.$transaction(async (tx) => {
            await tx.commission.update({
              where: { orderId },
              data: { status: "REVERSED" },
            });
            return tx.wallet.update({
              where: { affiliateId: commission.affiliateId },
              data: { balance: { decrement: commission.amount } },
            });
          });

          const newBalance = updatedWallet.balance;
          await createNotification({
            userId: commission.affiliate.userId,
            type: "COMMISSION_REVERSED",
            title: "Comisión revertida por chargeback",
            body: newBalance < 0
              ? `Se descontó $${commission.amount.toLocaleString("es-AR")} de tu panel por una devolución de cargo. Tu saldo quedó en -$${Math.abs(newBalance).toLocaleString("es-AR")} — regularizá dentro de los 30 días.`
              : `Se descontó $${commission.amount.toLocaleString("es-AR")} de tu panel por una devolución de cargo aprobada por MercadoPago. Saldo actual: $${newBalance.toLocaleString("es-AR")}.`,
            link: "/afiliados/billetera",
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const orderId = payment.external_reference;
    if (!orderId) return NextResponse.json({ ok: true });

    // Buscar la orden y confirmar si está PENDING
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        buyer: { select: { email: true, name: true } },
        // Para que el mail de "pago acreditado" sea un comprobante de verdad
        // (qué compró y el desglose), no solo el total.
        items: {
          include: {
            product: { select: { name: true } },
            variant: { select: { name: true, value: true } },
          },
        },
        coupon: { select: { code: true } },
        affiliate: {
          select: {
            id: true,
            userId: true,
            wallet: true,
            user: { select: { email: true, name: true } },
          },
        },
        commission: true,
      },
    });

    if (!order || order.status !== "PENDING") return NextResponse.json({ ok: true });

    // ── Validar que lo pagado sea lo que el pedido dice (A-03) ────────────────
    // Antes se confirmaba solo con `status === "approved"`, sin mirar el monto: un
    // pago por menos de lo debido confirmaba el pedido igual y nadie se enteraba.
    // Mismo criterio que el webhook de suscripciones, que ya validaba así.
    //
    // Tolerancia del 5% hacia abajo, por redondeos y por cuotas con recargo que MP
    // liquida distinto. Un pago de MÁS no frena nada (puede ser un ajuste de MP),
    // pero se registra: si aparece seguido, hay algo que revisar.
    const pagado = payment.transaction_amount;
    if (typeof pagado === "number" && order.total > 0) {
      if (pagado < order.total * 0.95) {
        console.error("[mp/webhook] monto pagado MENOR al del pedido — no se confirma", {
          paymentId, orderId: order.id, recibido: pagado, esperado: order.total,
        });
        return NextResponse.json({ ok: true });
      }
      if (pagado > order.total * 1.05) {
        console.warn("[mp/webhook] monto pagado MAYOR al del pedido — se confirma igual", {
          paymentId, orderId: order.id, recibido: pagado, esperado: order.total,
        });
      }
    }

    // La transacción retorna el resultado de la comisión directamente
    // para que TypeScript pueda narrowar el tipo correctamente post-await
    const commissionResult: CommissionResult | null = await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status: "APPROVED",
          externalId: String(paymentId),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: "PENDING",
          toStatus: "CONFIRMED",
          changedBy: "mp_webhook",
        },
      });

      let result: CommissionResult | null = null;

      // Acreditar comisión en billetera si hay afiliado y rate bloqueado
      if (order.affiliateId && order.lockedCommissionRate !== null && !order.commission) {
        const rate = order.lockedCommissionRate ?? order.store.commissionRate;
        const commissionBase = Math.max(0, (order.subtotal ?? order.total) - (order.discountAmount ?? 0));
        const amount = Math.round((commissionBase * rate) / 100);

        if (amount > 0) {
          const newCommission = await tx.commission.create({
            data: {
              orderId: order.id,
              affiliateId: order.affiliateId,
              amount,
              rate,
              status: "PAID",
              paidAt: new Date(),
            },
          });

          const updatedWallet = await tx.wallet.upsert({
            where: { affiliateId: order.affiliateId },
            update: { balance: { increment: amount }, totalEarned: { increment: amount } },
            create: { affiliateId: order.affiliateId, balance: amount, totalEarned: amount, totalWithdrawn: 0 },
          });

          result = { commissionId: newCommission.id, amount, rate, newBalance: updatedWallet.balance };
        }
      }

      await createNotification({
        userId: order.store.ownerId,
        type: "ORDER_CONFIRMED",
        title: "Pago confirmado por MercadoPago",
        body: `Pedido $${order.total.toLocaleString("es-AR")} — pago procesado automáticamente.`,
        link: `/dashboard/pedidos/${order.id}`,
      });

      return result;
    });

    // Post-transacción: notificar al afiliado que ganó comisión
    if (commissionResult !== null) {
      const affUserId = order.affiliate?.userId;
      const affEmail = order.affiliate?.user?.email;
      const affName = order.affiliate?.user?.name || "afiliado";

      if (affUserId) {
        await createNotification({
          userId: affUserId,
          type: "COMMISSION_EARNED",
          title: "¡Ganaste una comisión!",
          body: `Tu comisión de $${commissionResult.amount.toLocaleString("es-AR")} fue acreditada en tu panel de comisiones.`,
          link: "/afiliados/billetera",
        });
      }

      if (affEmail) {
        despues(() => sendCommissionEarnedEmail({
          affiliateEmail: affEmail,
          affiliateName: affName,
          storeName: order.store.name,
          commissionAmount: commissionResult.amount,
          orderTotal: order.total,
          commissionRate: commissionResult.rate,
          newBalance: commissionResult.newBalance,
        }), "MP: mail de comisión ganada");
      }
    }

    // Notificar al comprador que el pago fue procesado por MP
    if (order.buyer?.email) {
      despues(() => sendOrderPaymentConfirmedEmail({
        buyerEmail: order.buyer.email,
        buyerName: order.buyer.name || "",
        orderId: order.id,
        storeName: order.store.name,
        storeSlug: order.store.slug,
        total: order.total,
        items: order.items.map((it) => ({
          name: it.product.name,
          variant: it.variant ? `${it.variant.name}: ${it.variant.value}` : null,
          quantity: it.quantity,
          // Las órdenes viejas no tienen lineTotal → se reconstruye con precio × cantidad.
          lineTotal: it.lineTotal ?? it.price * it.quantity,
        })),
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        couponCode: order.coupon?.code ?? null,
        shippingCost: order.shippingCost,
        shippingMethod: order.shippingMethod,
        // Promos congeladas al momento de la venta (no se recalculan: la promo pudo
        // haber cambiado desde entonces y el comprobante tiene que ser fiel).
        ...parseOrderPromoSummary(order.promoSummary),
        promoSavings: order.promoSavings,
      }), "MP: comprobante de pago al comprador");
    }

    /* Entrega de lo digital. Va acá y no en el checkout porque el disparador es
       el PAGO ACREDITADO, no el pedido creado: entregar antes sería regalar el
       archivo a quien abandonó el pago a mitad de camino.

       Fuera del `despues` de arriba a propósito: emitir los permisos es escribir
       en la base y tiene que pasar sí o sí. El que puede fallar sin romper nada
       es el mail, y ese sí va en segundo plano. */
    if (order.buyer?.email) {
      try {
        const { archivos, venceEl } = await crearDescargasDigitales(order.id);
        // `venceEl` sale de la base, no de "hoy + 30": en un reintento del
        // webhook se reusa el permiso original, y recalcular la fecha le
        // prometería al comprador una vigencia que el link no tiene.
        if (archivos.length > 0 && venceEl) {
          despues(() => sendDigitalDownloadEmail({
            buyerEmail: order.buyer.email,
            buyerName: order.buyer.name || "",
            storeName: order.store.name,
            archivos,
            venceEl,
            maxDescargas: MAX_DESCARGAS,
          }), "MP: links de descarga al comprador");
        }
      } catch (err) {
        // No se re-lanza: el pago YA está confirmado y el pedido cerrado. Que
        // falle la entrega no puede desarmar eso. Queda el error para reenviar
        // a mano desde el panel.
        console.error("[mp/webhook] no se pudieron emitir las descargas", orderId, err);
      }
    }

    console.log(`[mp/webhook] pago confirmado — paymentId=${paymentId} orderId=${orderId}`);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      console.warn("[mp/webhook] duplicate webhook ignored (P2002)");
      return;
    }
    console.error("[mp/webhook] error procesando pago:", err);
  }
}

// Webhook de MercadoPago — acepta inmediatamente y procesa en background
export async function POST(req: NextRequest) {
  let paymentId: string | undefined;
  try {
    const body = await req.json();
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    paymentId = body.data?.id ? String(body.data.id) : undefined;
    if (!paymentId) return NextResponse.json({ ok: true });

    if (!verifyMPSignature(req, paymentId)) {
      console.warn("MP webhook: firma inválida — request ignorada", { paymentId });
      return NextResponse.json({ ok: true });
    }
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Responder a MP inmediatamente (evita retries por timeout)
  // y procesar en background con waitUntil
  waitUntil(processPaymentWebhook(paymentId));
  return NextResponse.json({ ok: true });
}
