import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { createNotification } from "@/lib/notifications";

function verifyMPSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // en dev sin secret configurado, permitir

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

// Webhook de MercadoPago — confirma pagos automáticamente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type !== "payment") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Verificar firma criptográfica para prevenir requests falsas
    if (!verifyMPSignature(req, String(paymentId))) {
      console.warn("MP webhook: firma inválida — request ignorada", { paymentId });
      return NextResponse.json({ ok: true }); // 200 para que MP no reintente
    }

    // Obtener detalles del pago desde MP
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN ?? "",
    });
    const mpPayment = new Payment(client);
    const payment = await mpPayment.get({ id: paymentId });

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
        affiliate: { include: { wallet: true, user: { select: { email: true, name: true } } } },
        commission: true,
      },
    });

    if (!order || order.status !== "PENDING") return NextResponse.json({ ok: true });

    // Confirmar pago y acreditar comisión si hay afiliada
    await prisma.$transaction(async (tx) => {
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

      // Acreditar comisión si hay afiliada y rate bloqueado
      if (order.affiliateId && order.lockedCommissionRate !== null && !order.commission) {
        const rate = order.lockedCommissionRate ?? order.store.commissionRate;
        const commissionBase = Math.max(0, (order.subtotal ?? order.total) - (order.discountAmount ?? 0));
        const amount = Math.round((commissionBase * rate) / 100);

        await tx.commission.create({
          data: {
            orderId: order.id,
            affiliateId: order.affiliateId,
            amount,
            rate,
            status: "PAID",
            paidAt: new Date(),
          },
        });

        await tx.wallet.upsert({
          where: { affiliateId: order.affiliateId },
          update: { balance: { increment: amount }, totalEarned: { increment: amount } },
          create: { affiliateId: order.affiliateId, balance: amount, totalEarned: amount, totalWithdrawn: 0 },
        });

        const affUserId = order.affiliate?.userId;
        if (affUserId) {
          await createNotification({
            userId: affUserId,
            type: "COMMISSION_EARNED",
            title: "¡Ganaste una comisión!",
            body: `Tu comisión de $${amount.toLocaleString("es-AR")} fue acreditada automáticamente.`,
            link: "/afiliados/billetera",
          });
        }
      }

      await createNotification({
        userId: order.store.ownerId,
        type: "ORDER_CONFIRMED",
        title: "Pago confirmado por MercadoPago",
        body: `Pedido $${order.total.toLocaleString("es-AR")} — pago procesado automáticamente.`,
        link: `/dashboard/pedidos/${order.id}`,
      });
    });

    console.log(`[mp/webhook] pago confirmado — paymentId=${paymentId} orderId=${orderId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}
