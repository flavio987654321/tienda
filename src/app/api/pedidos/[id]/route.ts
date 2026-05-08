import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendLowStockEmail, sendReviewRequestEmail } from "@/lib/email";

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
          buyer: { select: { email: true, name: true } },
          items: { include: { product: true, variant: true } },
          payment: true,
          shipping: true,
          affiliate: { include: { wallet: true } },
          commission: true,
        },
      });

      if (!order) throw new Error("Pedido no encontrado");

      // Máquina de estados: validar que la transición sea legal
      const VALID_TRANSITIONS: Record<string, string[]> = {
        confirmPayment: ["PENDING"],
        markShipped:    ["CONFIRMED"],
        markDelivered:  ["SHIPPED"],
        cancel:         ["PENDING", "CONFIRMED"],
      };
      if (!VALID_TRANSITIONS[action]) throw new Error("Accion no valida");
      if (!VALID_TRANSITIONS[action].includes(order.status)) {
        throw new Error(
          `No se puede ejecutar '${action}' sobre un pedido en estado ${order.status}`
        );
      }

      if (action === "confirmPayment") {
        if (["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status)) {
          return order;
        }

        // El stock ya fue decrementado al crear el pedido en checkout.
        // Aquí solo revisamos si alguna variante quedó con stock bajo para alertar.
        const stockAlerts: { name: string; variant: string; stock: number }[] = [];

        for (const item of order.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant && variant.stock <= 4) {
            stockAlerts.push({
              name: item.product.name,
              variant: `${variant.name}: ${variant.value}`,
              stock: variant.stock,
            });
          }
        }

        if (stockAlerts.length > 0) {
          const owner = await tx.user.findUnique({
            where: { id: ownerId },
            select: { email: true, name: true },
          });
          if (owner?.email) {
            sendLowStockEmail({
              ownerEmail: owner.email,
              ownerName: owner.name || "vendedora",
              storeName: order.store.name,
              products: stockAlerts,
            }).catch(() => {});
          }
        }

        if (order.affiliateId && order.store.affiliatesEnabled && !order.commission) {
          // Base = subtotal menos descuento (nunca sobre envío)
          const commissionBase = (order.subtotal ?? order.total) - (order.discountAmount ?? 0);
          const amount = Math.round((Math.max(0, commissionBase) * order.store.commissionRate) / 100);
          await tx.commission.create({
            data: {
              orderId: order.id,
              affiliateId: order.affiliateId,
              amount,
              rate: order.store.commissionRate,
              status: "PENDING",
            },
          });

          // upsert: si la wallet no existe la crea en lugar de silenciar el incremento
          await tx.wallet.upsert({
            where: { affiliateId: order.affiliateId! },
            update: {
              balance: { increment: amount },
              totalEarned: { increment: amount },
            },
            create: {
              affiliateId: order.affiliateId!,
              balance: amount,
              totalEarned: amount,
              totalWithdrawn: 0,
            },
          });
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
        const delivered = await tx.order.update({
          where: { id: order.id },
          data: { status: "DELIVERED" },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
        sendReviewRequestEmail({
          buyerEmail: order.buyer.email,
          buyerName: order.buyer.name || "",
          storeName: order.store.name,
          storeSlug: order.store.slug,
          products: order.items.map((i) => ({ id: i.product.id, name: i.product.name })),
        }).catch(() => {});
        return delivered;
      }

      if (action === "cancel") {
        // Devolver stock reservado al momento del checkout
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
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

      // No debería llegar acá — el guard de arriba cubre todos los casos
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
