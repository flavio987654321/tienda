import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/lib/prisma";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { createNotification } from "@/lib/notifications";
import { sendOrderPaymentConfirmedEmail, sendCommissionEarnedEmail } from "@/lib/email";

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
      const orderId = payment.external_reference;
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, couponId: true },
        });
        if (order?.status === "PENDING") {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
            await tx.orderStatusLog.create({ data: { orderId, fromStatus: "PENDING", toStatus: "CANCELLED", changedBy: "mp_webhook" } });
            // Devolver el uso del cupón para que el ganador pueda intentar pagar de nuevo
            if (order.couponId) {
              await tx.coupon.updateMany({
                where: { id: order.couponId, usedCount: { gt: 0 } },
                data: { usedCount: { decrement: 1 } },
              });
            }
          });
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

      // Acreditar comisión en billetera si hay afiliada y rate bloqueado
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

    // Post-transacción: notificar a la afiliada que ganó comisión
    if (commissionResult !== null) {
      const affUserId = order.affiliate?.userId;
      const affEmail = order.affiliate?.user?.email;
      const affName = order.affiliate?.user?.name || "afiliada";

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
        sendCommissionEarnedEmail({
          affiliateEmail: affEmail,
          affiliateName: affName,
          storeName: order.store.name,
          commissionAmount: commissionResult.amount,
          orderTotal: order.total,
          commissionRate: commissionResult.rate,
          newBalance: commissionResult.newBalance,
        }).catch((err) => console.error("[email] sendCommissionEarnedEmail failed:", err));
      }
    }

    // Notificar al comprador que el pago fue procesado por MP
    if (order.buyer?.email) {
      sendOrderPaymentConfirmedEmail({
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
      }).catch((err) => console.error("[email] sendOrderPaymentConfirmedEmail (mp webhook) failed:", err));
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
