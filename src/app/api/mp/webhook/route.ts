import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { createNotification } from "@/lib/notifications";

// Webhook de MercadoPago — confirma pagos automáticamente
// URL a configurar en MP: /api/mp/webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envía distintos tipos de notificaciones
    if (body.type !== "payment") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

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

        // Notificar a la afiliada
        const affUserId = order.affiliate?.userId;
        if (affUserId) {
          await createNotification({
            userId: affUserId,
            type: "COMMISSION_EARNED",
            title: "¡Ganaste una comisión!",
            body: `Tu comisión de $${amount.toLocaleString("es-AR")} fue acreditada automáticamente.`,
            link: "/vendedoras/billetera",
          });
        }
      }

      // Notificar al dueño
      await createNotification({
        userId: order.store.ownerId,
        type: "ORDER_CONFIRMED",
        title: "Pago confirmado por MercadoPago",
        body: `Pedido $${order.total.toLocaleString("es-AR")} — pago procesado automáticamente.`,
        link: `/dashboard/pedidos/${order.id}`,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}
