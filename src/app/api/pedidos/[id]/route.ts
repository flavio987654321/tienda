import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { sendReviewRequestEmail, sendCommissionEarnedEmail, sendAffiliateOrderNotificationEmail, sendOrderShippedEmail, sendOrderPaymentConfirmedEmail, sendOrderCancelledEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { recordStockMovement, wentBackAboveThreshold, dispatchLowStockAlerts, DEFAULT_LOW_STOCK_THRESHOLD, type LowStockItem } from "@/lib/stockMovements";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await context.params;
  const { action, trackingCode } = await req.json();
  const ownerId = user.id;

  // Se llenan dentro de la transacción y se despachan después de que comprometa —
  // así un rollback posterior (ej. error en comisión) no deja un aviso ya enviado
  // para un estado que en los hechos nunca se confirmó.
  let pendingStoreId: string | null = null;
  const pendingStockAlerts: LowStockItem[] = [];

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
          affiliate: { include: { wallet: true, user: { select: { email: true, name: true } } } },
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
        updateTracking: ["SHIPPED", "DELIVERED"],
      };
      if (!VALID_TRANSITIONS[action]) throw new Error("Accion no valida");
      if (!VALID_TRANSITIONS[action].includes(order.status)) {
        throw new Error(
          `No se puede ejecutar '${action}' sobre un pedido en estado ${order.status}`
        );
      }

      if (action === "confirmPayment") {
        // El stock ya fue decrementado al crear el pedido en checkout.
        // Aquí solo revisamos si alguna variante quedó con stock bajo para alertar.
        pendingStoreId = order.storeId;

        for (const item of order.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant) continue;
          const threshold = variant.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
          if (variant.stock <= threshold && !variant.lowStockAlertSentAt) {
            pendingStockAlerts.push({
              name: item.product.name,
              variant: variant.value,
              stock: variant.stock,
            });
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { lowStockAlertSentAt: new Date() },
            });
          }
        }

        // Verificar que el comprador no sea el mismo afiliado (bypass vía email diferente)
        const affiliateBuyerMatch =
          order.affiliate?.user?.email &&
          order.buyer.email.toLowerCase() === order.affiliate.user.email.toLowerCase();

        if (order.affiliateId && order.lockedCommissionRate !== null && !order.commission && !affiliateBuyerMatch) {
          // Usar el rate bloqueado al momento de la compra; si no existe (pedidos viejos), usar el actual
          const rate = order.lockedCommissionRate ?? order.store.commissionRate;
          const commissionBase = (order.subtotal ?? order.total) - (order.discountAmount ?? 0);
          const amount = Math.round((Math.max(0, commissionBase) * rate) / 100);
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

          // upsert: si la wallet no existe la crea en lugar de silenciar el incremento
          const updatedWallet = await tx.wallet.upsert({
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

          const affiliateUser = order.affiliate?.user;
          if (affiliateUser?.email) {
            sendCommissionEarnedEmail({
              affiliateEmail: affiliateUser.email,
              affiliateName: affiliateUser.name || "afiliada",
              storeName: order.store.name,
              commissionAmount: amount,
              orderTotal: order.total,
              commissionRate: rate,
              newBalance: updatedWallet.balance,
            }).catch((err) => console.error("[email] sendCommissionEarnedEmail failed:", err));
          }

          const owner = await tx.user.findUnique({
            where: { id: ownerId },
            select: { email: true, name: true },
          });
          if (owner?.email && affiliateUser) {
            sendAffiliateOrderNotificationEmail({
              ownerEmail: owner.email,
              ownerName: owner.name || "titular",
              storeName: order.store.name,
              affiliateName: affiliateUser.name || "afiliada",
              affiliateEmail: affiliateUser.email,
              orderTotal: order.total,
              commissionAmount: amount,
              commissionRate: rate,
              itemCount: order.items.length,
            }).catch((err) => console.error("[email] sendAffiliateOrderNotificationEmail failed:", err));
          }
        }

        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: "APPROVED" },
        });

        const confirmed = await tx.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
        await tx.orderStatusLog.create({
          data: { orderId: order.id, fromStatus: order.status, toStatus: "CONFIRMED", changedBy: ownerId },
        });

        sendOrderPaymentConfirmedEmail({
          buyerEmail: order.buyer.email,
          buyerName: order.buyer.name || "",
          orderId: order.id,
          storeName: order.store.name,
          storeSlug: order.store.slug,
          total: order.total,
        }).catch((err) => console.error("[email] sendOrderPaymentConfirmedEmail failed:", err));

        return confirmed;
      }

      if (action === "markShipped") {
        const resolvedTracking = trackingCode || order.trackingCode;
        await tx.shipping.updateMany({
          where: { orderId: order.id },
          data: { status: "SHIPPED", trackingCode: resolvedTracking },
        });
        const shipped = await tx.order.update({
          where: { id: order.id },
          data: { status: "SHIPPED", trackingCode: resolvedTracking },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
        await tx.orderStatusLog.create({
          data: { orderId: order.id, fromStatus: order.status, toStatus: "SHIPPED", changedBy: ownerId },
        });
        sendOrderShippedEmail({
          buyerEmail: order.buyer.email,
          buyerName: order.buyer.name || "",
          orderId: order.id,
          storeName: order.store.name,
          trackingCode: resolvedTracking ?? null,
          shippingMethod: order.shippingMethod ?? "Envío estándar",
          items: order.items.map((i) => ({
            name: i.product.name,
            variant: i.variant ? `${i.variant.name}: ${i.variant.value}` : null,
            quantity: i.quantity,
          })),
        }).catch((err) => console.error("[email] sendOrderShippedEmail failed:", err));
        return shipped;
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
        await tx.orderStatusLog.create({
          data: { orderId: order.id, fromStatus: order.status, toStatus: "DELIVERED", changedBy: ownerId },
        });
        sendReviewRequestEmail({
          buyerEmail: order.buyer.email,
          buyerName: order.buyer.name || "",
          storeName: order.store.name,
          storeSlug: order.store.slug,
          products: order.items.map((i) => ({ id: i.product.id, name: i.product.name })),
        }).catch((err) => console.error("[email] sendReviewRequestEmail failed:", err));
        return delivered;
      }

      if (action === "cancel") {
        // Devolver el uso del cupón (normal o de premio) consumido en el checkout
        if (order.couponId) {
          const freshCoupon = await tx.coupon.findUnique({
            where: { id: order.couponId },
            select: { usedCount: true },
          });
          if (freshCoupon) {
            await tx.coupon.update({
              where: { id: order.couponId },
              data: { usedCount: Math.max(0, freshCoupon.usedCount - 1) },
            });
          }
        }
        const usedRewardCoupon = await tx.affiliateRewardCoupon.findFirst({
          where: { usedOrderId: order.id, status: "USED" },
        });
        if (usedRewardCoupon) {
          await tx.affiliateRewardCoupon.update({
            where: { id: usedRewardCoupon.id },
            data: { status: "AVAILABLE", usedAt: null, usedOrderId: null, usedStoreName: null },
          });
        }

        // Devolver stock reservado al momento del checkout
        for (const item of order.items) {
          if (!item.variantId) continue;
          const before = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true, productId: true, lowStockThreshold: true },
          });
          if (!before) continue;
          const afterStock = before.stock + item.quantity;
          const threshold = before.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: { increment: item.quantity },
              ...(wentBackAboveThreshold(before.stock, afterStock, threshold) ? { lowStockAlertSentAt: null } : {}),
            },
          });
          await recordStockMovement(tx, {
            variantId: item.variantId,
            productId: before.productId,
            delta: item.quantity,
            stockBefore: before.stock,
            stockAfter: before.stock + item.quantity,
            type: "CANCELLATION",
            changedBy: "system",
          });
        }

        // Si la orden ya estaba CONFIRMED y tiene comisión acreditada, revertirla.
        // El dueño canceló una venta ya cobrada → la comisión no debería mantenerse.
        if (order.commission && order.affiliateId) {
          const freshWallet = await tx.wallet.findUnique({
            where: { affiliateId: order.affiliateId },
            select: { balance: true, totalEarned: true },
          });
          if (freshWallet) {
            await tx.wallet.update({
              where: { affiliateId: order.affiliateId },
              data: {
                balance: Math.max(0, freshWallet.balance - order.commission.amount),
                totalEarned: Math.max(0, freshWallet.totalEarned - order.commission.amount),
              },
            });
          }
          await tx.commission.update({
            where: { id: order.commission.id },
            data: { status: "REVERSED" },
          });
        }

        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: "CANCELLED" },
        });
        const cancelled = await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
        await tx.orderStatusLog.create({
          data: { orderId: order.id, fromStatus: order.status, toStatus: "CANCELLED", changedBy: ownerId },
        });

        const ownerForCancel = await tx.user.findUnique({
          where: { id: ownerId },
          select: { email: true, phone: true },
        });
        sendOrderCancelledEmail({
          buyerEmail: order.buyer.email,
          buyerName: order.buyer.name || "",
          orderId: order.id,
          storeName: order.store.name,
          ownerContact: { email: ownerForCancel?.email, phone: ownerForCancel?.phone },
        }).catch((err) => console.error("[email] sendOrderCancelledEmail failed:", err));

        return cancelled;
      }

      if (action === "updateTracking") {
        if (!trackingCode) throw new Error("Código de seguimiento requerido");
        await tx.shipping.updateMany({
          where: { orderId: order.id },
          data: { trackingCode },
        });
        const updated = await tx.order.update({
          where: { id: order.id },
          data: { trackingCode },
          include: { payment: true, shipping: true, items: true, commission: true },
        });
        return updated;
      }

      // No debería llegar acá — el guard de arriba cubre todos los casos
      throw new Error("Accion no valida");
    });

    // Notificaciones en tiempo real (fuera de la transacción para no bloquearla)
    if (action === "confirmPayment") {
      // Notificar al afiliado si ganó comisión
      if (result.commission && result.affiliateId) {
        const affiliateUser = await prisma.affiliate.findUnique({
          where: { id: result.affiliateId },
          select: { userId: true },
        });
        if (affiliateUser) {
          createNotification({
            userId: affiliateUser.userId,
            type: "COMMISSION_EARNED",
            title: "¡Ganaste una comisión!",
            body: `Tu comisión de $${result.commission.amount.toLocaleString("es-AR")} fue acreditada.`,
            link: "/afiliados/billetera",
          });
        }
      }
      // Notificar al dueño
      createNotification({
        userId: ownerId,
        type: "ORDER_CONFIRMED",
        title: "Pago confirmado",
        body: `El pedido fue confirmado por $${result.total.toLocaleString("es-AR")}.`,
        link: `/dashboard/pedidos/${result.id}`,
      });
    }

    if (action === "markShipped") {
      // Notificar al dueño
      createNotification({
        userId: ownerId,
        type: "ORDER_SHIPPED",
        title: "Pedido marcado como enviado",
        body: trackingCode ? `Código de seguimiento: ${trackingCode}` : undefined,
        link: `/dashboard/pedidos/${result.id}`,
      });
    }

    if (action === "markDelivered") {
      createNotification({
        userId: ownerId,
        type: "ORDER_DELIVERED",
        title: "Pedido entregado",
        body: `El pedido fue marcado como entregado.`,
        link: `/dashboard/pedidos/${result.id}`,
      });
    }

    if (action === "cancel") {
      createNotification({
        userId: ownerId,
        type: "ORDER_CANCELLED",
        title: "Pedido cancelado",
        body: `El pedido fue cancelado y el stock fue restaurado.`,
        link: `/dashboard/pedidos/${result.id}`,
      });

      // Si se revirtió comisión, notificar a la afiliada
      if (result.commission && result.affiliateId) {
        const affUser = await prisma.affiliate.findUnique({
          where: { id: result.affiliateId },
          select: { userId: true },
        });
        if (affUser) {
          createNotification({
            userId: affUser.userId,
            type: "COMMISSION_REVERSED",
            title: "Comisión revertida",
            body: `La comisión de $${result.commission.amount.toLocaleString("es-AR")} fue revertida porque el dueño canceló el pedido.`,
            link: "/afiliados/billetera",
          });
        }
      }
    }

    if (pendingStockAlerts.length > 0 && pendingStoreId) {
      dispatchLowStockAlerts(ownerId, pendingStoreId, pendingStockAlerts).catch((err) =>
        console.error("[stock] dispatchLowStockAlerts failed:", err)
      );
    }

    return NextResponse.json({ order: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el pedido" },
      { status: 400 }
    );
  }
}
