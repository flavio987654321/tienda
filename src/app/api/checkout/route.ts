import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { sendOrderConfirmationEmail, sendNewOrderToOwnerEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import type { ShippingMethod } from "@/types/store-config";
import { DEFAULT_SHIPPING_METHODS } from "@/types/store-config";

type CheckoutItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

type CheckoutBody = {
  storeId: string;
  affiliateId?: string | null;
  couponId?: string | null;
  rewardCouponCode?: string | null;
  items: CheckoutItem[];
  customer: {
    name: string;
    email: string;
    phone?: string;
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    notes?: string;
  };
  shippingMethod: string;
  paymentProvider: string;
};

function resolveShipping(shippingMethodId: string, methods: ShippingMethod[]): { label: string; cost: number } {
  // Backward compat: old frontend sent "pickup"/"standard"/"national"
  const legacyMap: Record<string, string> = { pickup: "retiro", standard: "estandar", national: "nacional" };
  const normalizedId = legacyMap[shippingMethodId] ?? shippingMethodId;
  const found = methods.find(m => m.id === normalizedId && m.enabled);
  if (found) return { label: found.label, cost: found.coordinar ? 0 : found.price };
  // fallback to pickup
  const pickup = methods.find(m => m.isPickup) ?? DEFAULT_SHIPPING_METHODS[0];
  return { label: pickup.label, cost: 0 };
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(`checkout:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiados pedidos. Esperá un momento." }, { status: 429 });
  }

  const body = (await req.json()) as CheckoutBody;
  const { storeId, affiliateId, couponId, rewardCouponCode, items, customer, shippingMethod, paymentProvider } = body;

  if (!storeId || !items?.length) {
    return NextResponse.json({ error: "El carrito esta vacio" }, { status: 400 });
  }

  if (!customer?.name || typeof customer.name !== "string" || customer.name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre requerido (mínimo 2 caracteres)" }, { status: 400 });
  }
  const emailNorm = customer?.email?.toLowerCase().trim() ?? "";
  if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  // Resolve shipping from store's config (dynamic per-store pricing)
  const storeForShipping = await prisma.store.findUnique({
    where: { id: storeId },
    select: { storeConfig: true },
  });
  let storeShippingMethods: ShippingMethod[] = DEFAULT_SHIPPING_METHODS;
  try {
    const cfg = JSON.parse(storeForShipping?.storeConfig || "{}");
    if (Array.isArray(cfg.shippingMethods) && cfg.shippingMethods.length > 0) {
      storeShippingMethods = cfg.shippingMethods;
    }
  } catch { /* noop */ }
  const shipping = resolveShipping(shippingMethod, storeShippingMethods);

  try {
    let usedRewardCouponId: string | null = null;
    const order = await prisma.$transaction(async (tx) => {
      const store = await tx.store.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          name: true,
          ownerId: true,
          affiliatesEnabled: true,
          commissionRate: true,
        },
      });

      if (!store) throw new Error("Tienda no encontrada");

      let validAffiliateId: string | null = null;
      let resolvedAffiliateUserId: string | null = null;
      if (affiliateId && store.affiliatesEnabled) {
        const affiliate = await tx.affiliate.findFirst({
          where: { id: affiliateId, storeId, isActive: true },
          select: { id: true, userId: true },
        });
        validAffiliateId = affiliate?.id ?? null;
        resolvedAffiliateUserId = affiliate?.userId ?? null;
      }

      const MAX_QUANTITY_PER_ITEM = 99;
      const normalizedItems = items
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: Math.min(Math.max(1, Math.floor(Number(item.quantity) || 1)), MAX_QUANTITY_PER_ITEM),
        }))
        .filter((item) => item.productId);

      const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, storeId, isActive: true, deletedAt: null },
        include: { variants: true },
      });

      const orderItems: { productId: string; variantId: string | null; quantity: number; price: number }[] = [];
      for (const item of normalizedItems) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error("Producto no disponible");

        const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null;
        if (item.variantId && !variant) throw new Error("Variante no disponible");

        if (variant) {
          // Decrementa stock atómicamente — si no hay suficiente, count=0 y lanzamos error
          const decremented = await tx.productVariant.updateMany({
            where: { id: variant.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (decremented.count === 0) {
            const fresh = await tx.productVariant.findUnique({ where: { id: variant.id } });
            throw new Error(
              `Sin stock suficiente de ${product.name}` +
              (fresh ? ` (disponible: ${fresh.stock}, pedido: ${item.quantity})` : "")
            );
          }
        }

        const basePrice = variant?.price ?? product.price;
        const wholesale = (product as any).precioMayorista as number | null;
        const minQty = (product as any).cantMinMayorista as number | null;
        if (minQty && item.quantity < minQty) {
          throw new Error(`${product.name} requiere un mínimo de ${minQty} unidades`);
        }
        const unitPrice = (wholesale && minQty && item.quantity >= minQty) ? wholesale : basePrice;

        orderItems.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: item.quantity,
          price: unitPrice,
        });
      }

      const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      let discountAmount = 0;
      let validCouponId: string | null = null;
      if (couponId) {
        const coupon = await tx.coupon.findFirst({
          where: { id: couponId, storeId, isActive: true },
        });
        if (coupon) {
          const now = new Date();
          const expired = coupon.expiresAt && coupon.expiresAt < now;
          const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
          if (!expired && !exhausted && subtotal >= coupon.minOrderAmount) {
            const MAX_COUPON_DISCOUNT = 50_000;
            discountAmount = coupon.discountType === "percentage"
              ? Math.min(Math.round((subtotal * coupon.discountValue) / 100), MAX_COUPON_DISCOUNT)
              : Math.min(coupon.discountValue, subtotal);
            validCouponId = coupon.id;
            await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
          }
        }
      }

      // Cupón de premio (AffiliateRewardCoupon) — solo si no hay cupón normal ya aplicado
      if (!validCouponId && rewardCouponCode) {
        const rewardCoupon = await tx.affiliateRewardCoupon.findUnique({
          where: { code: String(rewardCouponCode).trim().toUpperCase() },
        });
        if (
          rewardCoupon &&
          rewardCoupon.type === "STORE" &&
          rewardCoupon.status === "AVAILABLE" &&
          rewardCoupon.expiresAt > new Date()
        ) {
          const storeAccepts = await tx.store.findUnique({
            where: { id: storeId },
            select: { acceptsRewardCoupons: true },
          });
          if (storeAccepts?.acceptsRewardCoupons) {
            const MAX_REWARD_DISCOUNT = 100_000;
            discountAmount = Math.min(Math.round((subtotal * rewardCoupon.discountValue) / 100), MAX_REWARD_DISCOUNT);
            usedRewardCouponId = rewardCoupon.id;
          }
        }
      }

      const total = subtotal - discountAmount + shipping.cost;

      // Nunca actualizar un usuario existente desde checkout — podría sobreescribir datos de dueñas u otros roles
      const buyer =
        (await tx.user.findUnique({ where: { email: emailNorm } })) ??
        (await tx.user.create({ data: { email: emailNorm, name: customer.name.trim(), role: "BUYER" } }));

      // Un afiliado no puede ganar comisión comprándose a sí mismo
      if (validAffiliateId && resolvedAffiliateUserId && resolvedAffiliateUserId === buyer.id) {
        validAffiliateId = null;
      }

      const createdOrder = await tx.order.create({
        data: {
          status: "PENDING",
          total,
          subtotal,
          discountAmount,
          lockedCommissionRate: validAffiliateId ? store.commissionRate : null,
          couponId: validCouponId,
          shippingCost: shipping.cost,
          shippingMethod: shipping.label,
          notes: customer.notes || null,
          shippingAddress: JSON.stringify({
            name: customer.name,
            email: customer.email,
            phone: customer.phone || "",
            street: customer.street || "",
            city: customer.city || "",
            province: customer.province || "",
            postalCode: customer.postalCode || "",
          }),
          buyerId: buyer.id,
          storeId,
          affiliateId: validAffiliateId,
          items: { create: orderItems },
          payment: {
            create: {
              provider: paymentProvider || "transfer",
              status: "PENDING",
              amount: total,
              currency: "ARS",
            },
          },
          shipping: {
            create: {
              provider: "manual",
              service: shipping.label,
              status: "PENDING",
              cost: shipping.cost,
            },
          },
        },
        include: {
          items: true,
          payment: true,
          shipping: true,
          affiliate: { include: { user: { select: { name: true, email: true } } } },
        },
      });

      // Marcar cupón de premio como USADO dentro de la transacción
      // para que si algo falla, el cupón no quede consumido sin venta real
      if (usedRewardCouponId) {
        await tx.affiliateRewardCoupon.update({
          where: { id: usedRewardCouponId },
          data: {
            status: "USED",
            usedAt: new Date(),
            usedOrderId: createdOrder.id,
            usedStoreName: store.name,
          },
        });
      }

      return createdOrder;
    });

    // Notificar al dueño de la tienda en tiempo real
    const storeOwner = await prisma.store.findUnique({
      where: { id: order.storeId },
      select: { ownerId: true, name: true },
    });
    if (storeOwner) {
      const notifBody = `$${order.total.toLocaleString("es-AR")} — ${order.items.length} producto${order.items.length !== 1 ? "s" : ""}`;
      createNotification({
        userId: storeOwner.ownerId,
        type: "NEW_ORDER",
        title: "Nuevo pedido recibido",
        body: notifBody,
        link: `/dashboard/pedidos/${order.id}`,
      });
      sendPushToUser(storeOwner.ownerId, {
        title: "Nuevo pedido recibido",
        body: notifBody,
        url: `/dashboard/pedidos`,
      }).catch((err) => console.error("[push] new order:", err));
    }

    // Emails de confirmación — no bloquean la respuesta si fallan
    const storeForEmail = await prisma.store.findUnique({
      where: { id: order.storeId },
      select: {
        name: true,
        slug: true,
        storeConfig: true,
        policyReturns: true,
        policyShipping: true,
        policyTerms: true,
        policyReturnsActive: true,
        policyShippingActive: true,
        policyTermsActive: true,
        owner: { select: { email: true, name: true, phone: true } },
      },
    });
    if (storeForEmail) {
      const productIds = order.items.map((i) => i.productId);
      const variantIds = order.items.map((i) => i.variantId).filter((v): v is string => !!v);

      const [productNames, variantData] = await Promise.all([
        prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        }),
        variantIds.length > 0
          ? prisma.productVariant.findMany({
              where: { id: { in: variantIds } },
              select: { id: true, name: true, value: true },
            })
          : Promise.resolve([]),
      ]);

      const nameMap = Object.fromEntries(productNames.map((p) => [p.id, p.name]));
      const variantMap = Object.fromEntries(variantData.map((v) => [v.id, `${v.name}: ${v.value}`]));

      const emailItems = order.items.map((item) => ({
        name: nameMap[item.productId] ?? "Producto",
        variant: item.variantId ? (variantMap[item.variantId] ?? null) : null,
        quantity: item.quantity,
        price: item.price,
      }));

      let paymentInfo = null;
      let policies = null;
      try {
        const cfg = JSON.parse(storeForEmail.storeConfig || "{}");
        if (cfg.paymentInfo) paymentInfo = cfg.paymentInfo;
      } catch { /* noop */ }
      if (storeForEmail.policyReturnsActive || storeForEmail.policyShippingActive || storeForEmail.policyTermsActive) {
        policies = {
          returns: storeForEmail.policyReturnsActive ? (storeForEmail.policyReturns ?? undefined) : undefined,
          shipping: storeForEmail.policyShippingActive ? (storeForEmail.policyShipping ?? undefined) : undefined,
          terms: storeForEmail.policyTermsActive ? (storeForEmail.policyTerms ?? undefined) : undefined,
        };
      }

      const emailPayload = {
        orderId: order.id,
        storeName: storeForEmail.name ?? "",
        storeSlug: storeForEmail.slug ?? "",
        items: emailItems,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingCost: order.shippingCost,
        shippingMethod: shipping.label,
        total: order.total,
        paymentInfo,
        policies,
      };

      if (customer.email) {
        sendOrderConfirmationEmail({
          buyerEmail: customer.email,
          buyerName: customer.name,
          ownerContact: {
            name: storeForEmail.owner?.name ?? null,
            email: storeForEmail.owner?.email ?? null,
            phone: storeForEmail.owner?.phone ?? null,
          },
          paymentProvider,
          ...emailPayload,
        }).catch((e) => console.error("[email] buyer confirmation:", e));
      }

      const ownerEmail = storeForEmail.owner?.email;
      if (ownerEmail) {
        sendNewOrderToOwnerEmail({
          ownerEmail,
          ownerName: storeForEmail.owner?.name ?? "",
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            street: customer.street,
            city: customer.city,
            province: customer.province,
          },
          paymentProvider,
          ...emailPayload,
        }).catch((e) => console.error("[email] owner new order:", e));
      }
    }

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el pedido" },
      { status: 400 }
    );
  }
}
