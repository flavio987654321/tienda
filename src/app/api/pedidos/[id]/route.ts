import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await context.params;
  const { action, trackingCode } = await req.json();
  const ownerId = user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, store: { ownerId } },
        include: {
          store: true,
          items: { include: { product: true, variant: true } },
          payment: true,
          shipping: true,
          affiliate: { include: { wallet: true } },
          commission: true,
        },
      });

      if (!order) throw new Error("Pedido no encontrado");

      if (action === "confirmPayment") {
        if (["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status)) {
          return order;
        }

        for (const item of order.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant || variant.stock < item.quantity) {
            throw new Error(`No hay stock suficiente para ${item.product.name}`);
          }
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        if (order.affiliateId && order.store.affiliatesEnabled && !order.commission) {
          const amount = Math.round((order.total * order.store.commissionRate) / 100);
          await tx.commission.create({
            data: {
              orderId: order.id,
              affiliateId: order.affiliateId,
              amount,
              rate: order.store.commissionRate,
              status: "PENDING",
            },
          });

          const wallet = await tx.wallet.findUnique({ where: { affiliateId: order.affiliateId } });
          if (wallet) {
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balance: { increment: amount },
                totalEarned: { increment: amount },
              },
            });
          }
        }

        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: "APPROVED" },
        });

        return tx.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
      }

      if (action === "markShipped") {
        await tx.shipping.updateMany({
          where: { orderId: order.id },
          data: { status: "SHIPPED", trackingCode: trackingCode || order.trackingCode },
        });
        return tx.order.update({
          where: { id: order.id },
          data: { status: "SHIPPED", trackingCode: trackingCode || order.trackingCode },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
      }

      if (action === "markDelivered") {
        await tx.shipping.updateMany({
          where: { orderId: order.id },
          data: { status: "DELIVERED" },
        });
        return tx.order.update({
          where: { id: order.id },
          data: { status: "DELIVERED" },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
      }

      if (action === "cancel") {
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: "CANCELLED" },
        });
        return tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
      }

      throw new Error("Accion no valida");
    });

    return NextResponse.json({ order: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el pedido" },
      { status: 400 }
    );
  }
}
