import { prisma } from "@/lib/prisma";
import { sendReviewRequestEmail, sendCommissionEarnedEmail, sendOrderShippedEmail, sendOrderPaymentConfirmedEmail, sendOrderCancelledEmail, parseOrderPromoSummary } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { recordStockMovement, wentBackAboveThreshold, dispatchLowStockAlerts, DEFAULT_LOW_STOCK_THRESHOLD, type LowStockItem } from "@/lib/stockMovements";
import { ORDER_ACTION_TRANSITIONS } from "@/lib/orders";
import { despues } from "@/lib/despues";

type RunOrderActionInput = {
  orderId: string;
  ownerId: string;
  action: string;
  trackingCode?: string;
};

// Aplica una acción de cambio de estado a un pedido: valida la transición, corre la
// transacción de DB (stock, comisiones, pagos) y despacha emails/notificaciones después
// de que la transacción comprometa. La usan tanto el endpoint individual (/api/pedidos/[id])
// como el de lote (/api/pedidos/bulk) para no duplicar esta lógica en dos lugares.
export async function runOrderAction({ orderId: id, ownerId, action, trackingCode }: RunOrderActionInput) {
  // Se llenan dentro de la transacción y se despachan después de que comprometa —
  // así un rollback posterior (ej. error en comisión) no deja un aviso ya enviado
  // para un estado que en los hechos nunca se confirmó.
  let pendingStoreId: string | null = null;
  const pendingStockAlerts: LowStockItem[] = [];
  // Los mails van por la misma puerta, y hasta acá no lo hacían: se disparaban
  // sueltos DESDE ADENTRO de la transacción, o sea antes de que comprometiera.
  // Si después algo fallaba y se hacía rollback, al comprador ya le había
  // llegado "tu pedido se envió" de un envío que en los hechos nunca pasó. La
  // regla ya estaba escrita arriba para los avisos de stock; los mails quedaron
  // afuera de la regla.
  const mailsPendientes: { correr: () => Promise<unknown>; etiqueta: string }[] = [];

  // Timeout explícito (default de Prisma: 5000ms) — "confirmPayment" y "cancel" hacen varias
  // consultas secuenciales por ítem (stock, comisión, wallet); con pedidos de muchos ítems o
  // picos de tráfico el default puede no alcanzar y cortar la transacción a la mitad.
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, store: { ownerId } },
      include: {
        store: true,
        buyer: { select: { email: true, name: true } },
        items: { include: { product: true, variant: true } },
        payment: true,
        shipping: true,
        // Para que el mail de "pago acreditado" del pago manual (transferencia,
        // efectivo) sea el mismo comprobante que el de MercadoPago — A-02.
        coupon: { select: { code: true } },
        affiliate: { include: { wallet: true, user: { select: { email: true, name: true } } } },
        commission: true,
      },
    });

    if (!order) throw new Error("Pedido no encontrado");

    // Máquina de estados: validar que la transición sea legal
    if (!ORDER_ACTION_TRANSITIONS[action]) throw new Error("Accion no valida");
    if (!ORDER_ACTION_TRANSITIONS[action].includes(order.status)) {
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
        // Sólo "stock bajo": el cero ya lo avisa el checkout, en el momento exacto
        // en que se descuenta la última unidad. Sin el `> 0`, agotar vendiendo
        // disparaba dos veces el mismo aviso —uno al comprar y otro al confirmar
        // el pago—, porque acá `stock` ya viene decrementado y 0 <= umbral.
        if (variant.stock > 0 && variant.stock <= threshold && !variant.lowStockAlertSentAt) {
          pendingStockAlerts.push({
            productId: variant.productId,
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
          const destino = affiliateUser.email;
          mailsPendientes.push({
            etiqueta: "pedido: comisión ganada",
            correr: () => sendCommissionEarnedEmail({
              affiliateEmail: destino,
              affiliateName: affiliateUser.name || "afiliada",
              storeName: order.store.name,
              commissionAmount: amount,
              orderTotal: order.total,
              commissionRate: rate,
              newBalance: updatedWallet.balance,
            }),
          });
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

      // A-02 — el MISMO comprobante que manda el webhook de MercadoPago.
      // Antes acá solo viajaba el total: quien pagaba por transferencia recibía un
      // mail sin qué compró, sin el envío y sin la promo que lo convenció de
      // comprar. La plantilla acepta todos estos campos como opcionales, así que
      // no fallaba — degradaba en silencio, que es peor. Y transferencia es el
      // medio más usado en tiendas chicas.
      //
      // Nada de esto se recalcula: sale de la orden, tal como se cobró.
      mailsPendientes.push({
        etiqueta: "pedido: pago confirmado al comprador",
        correr: () => sendOrderPaymentConfirmedEmail({
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
          // Promos congeladas al momento de la venta: no se recalculan, la promo pudo
          // haber cambiado desde entonces y el comprobante tiene que ser fiel.
          ...parseOrderPromoSummary(order.promoSummary),
          promoSavings: order.promoSavings,
        }),
      });

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
      mailsPendientes.push({
        etiqueta: "pedido: enviado",
        correr: () => sendOrderShippedEmail({
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
        }),
      });
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
      mailsPendientes.push({
        etiqueta: "pedido: pedir reseña",
        correr: () => sendReviewRequestEmail({
          buyerEmail: order.buyer.email,
          buyerName: order.buyer.name || "",
          storeName: order.store.name,
          storeSlug: order.store.slug,
          products: order.items.map((i) => ({ id: i.product.id, name: i.product.name })),
        }),
      });
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
      mailsPendientes.push({
        etiqueta: "pedido: cancelado",
        correr: () => sendOrderCancelledEmail({
          buyerEmail: order.buyer.email,
          buyerName: order.buyer.name || "",
          orderId: order.id,
          storeName: order.store.name,
          ownerContact: { email: ownerForCancel?.email, phone: ownerForCancel?.phone },
        }),
      });

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
  }, { timeout: 15000 });

  // La transacción comprometió: recién ahora salen los mails que se juntaron
  // adentro. Si se hubiera caído, no sale ninguno — que es todo el punto.
  for (const mail of mailsPendientes) despues(mail.correr, mail.etiqueta);

  // Notificaciones en tiempo real (fuera de la transacción para no bloquearla)
  if (action === "confirmPayment") {
    // Notificar al afiliado si ganó comisión
    if (result.commission && result.affiliateId) {
      // El monto se copia acá afuera. Adentro del cierre TypeScript ya no puede
      // garantizar que `result.commission` siga sin ser null —el cierre corre
      // después—, y tiene razón en quejarse: el valor que se quiere avisar es el
      // de este momento, no el que haya cuando el aviso salga.
      const monto = result.commission.amount;
      const affiliateUser = await prisma.affiliate.findUnique({
        where: { id: result.affiliateId },
        select: { userId: true },
      });
      if (affiliateUser) {
        despues(() => createNotification({
          userId: affiliateUser.userId,
          type: "COMMISSION_EARNED",
          title: "¡Ganaste una comisión!",
          body: `Tu comisión de $${monto.toLocaleString("es-AR")} fue acreditada.`,
          link: "/afiliados/billetera",
        }), "pedido: campanita comision ganada");
      }
    }
    // Notificar al dueño
    despues(() => createNotification({
      userId: ownerId,
      type: "ORDER_CONFIRMED",
      title: "Pago confirmado",
      body: `El pedido fue confirmado por $${result.total.toLocaleString("es-AR")}.`,
      link: `/dashboard/pedidos/${result.id}`,
    }), "pedido: campanita pago confirmado");
  }

  if (action === "markShipped") {
    // Notificar al dueño
    despues(() => createNotification({
      userId: ownerId,
      type: "ORDER_SHIPPED",
      title: "Pedido marcado como enviado",
      body: trackingCode ? `Código de seguimiento: ${trackingCode}` : undefined,
      link: `/dashboard/pedidos/${result.id}`,
    }), "pedido: campanita enviado");
  }

  if (action === "markDelivered") {
    despues(() => createNotification({
      userId: ownerId,
      type: "ORDER_DELIVERED",
      title: "Pedido entregado",
      body: `El pedido fue marcado como entregado.`,
      link: `/dashboard/pedidos/${result.id}`,
    }), "pedido: campanita entregado");
  }

  if (action === "cancel") {
    despues(() => createNotification({
      userId: ownerId,
      type: "ORDER_CANCELLED",
      title: "Pedido cancelado",
      body: `El pedido fue cancelado y el stock fue restaurado.`,
      link: `/dashboard/pedidos/${result.id}`,
    }), "pedido: campanita cancelado");

    // Si se revirtió comisión, notificar a la afiliada
    if (result.commission && result.affiliateId) {
      const monto = result.commission.amount;
      const affUser = await prisma.affiliate.findUnique({
        where: { id: result.affiliateId },
        select: { userId: true },
      });
      if (affUser) {
        despues(() => createNotification({
          userId: affUser.userId,
          type: "COMMISSION_REVERSED",
          title: "Comisión revertida",
          body: `La comisión de $${monto.toLocaleString("es-AR")} fue revertida porque el dueño canceló el pedido.`,
          link: "/afiliados/billetera",
        }), "pedido: campanita comision revertida");
      }
    }
  }

  if (pendingStockAlerts.length > 0 && pendingStoreId) {
    const storeId = pendingStoreId;
    despues(
      () => dispatchLowStockAlerts(ownerId, storeId, pendingStockAlerts),
      "pedido: aviso de stock bajo"
    );
  }

  return result;
}
