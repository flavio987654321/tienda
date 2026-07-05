import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { sendOrderConfirmationEmail, sendNewOrderToOwnerEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import type { ShippingMethod } from "@/types/store-config";
import { DEFAULT_SHIPPING_METHODS, LIVE_QUOTE_DOMICILIO_ID } from "@/types/store-config";
import { cotizarEnvio } from "@/lib/enviopack";
import { calculateGoalAmount, MIN_DONATION, MAX_DONATION_PCT_OF_GOAL } from "@/lib/canasta";
import { recordStockMovement } from "@/lib/stockMovements";

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
  donationAmount?: number;
};

// Backward compat: old frontend sent "pickup"/"standard"/"national"
const SHIPPING_LEGACY_ID_MAP: Record<string, string> = { pickup: "retiro", standard: "estandar", national: "nacional" };

function findShippingMethod(shippingMethodId: string, methods: ShippingMethod[]): ShippingMethod | undefined {
  const normalizedId = SHIPPING_LEGACY_ID_MAP[shippingMethodId] ?? shippingMethodId;
  return methods.find(m => m.id === normalizedId && m.enabled);
}

async function resolveShipping(
  found: ShippingMethod | undefined,
  methods: ShippingMethod[],
  storeId: string,
  destinationPostalCode: string,
  destinationProvince: string,
  items: { productId: string; quantity: number }[]
): Promise<{ label: string; cost: number }> {
  if (found) {
    if (found.liveQuote) {
      // La cotización en vivo necesita destino real del comprador — si falta,
      // no es un fallo del servicio de Envíopack, es un dato obligatorio que
      // no se completó (el caller valida esto antes y rechaza el pedido).
      // Acá solo nos queda el caso de que cotizarEnvio falle (Envíopack caído,
      // tienda sin dirección de origen, etc.): ahí sí cae a "a coordinar" en
      // vez de bloquear la venta.
      try {
        const quote = await cotizarEnvio({ storeId, destinationPostalCode, destinationProvince, items });
        if (quote.available) {
          const price = found.id === LIVE_QUOTE_DOMICILIO_ID ? quote.domicilio : null;
          if (price != null) return { label: found.label, cost: price };
        }
      } catch { /* fallback a coordinar abajo */ }
      return { label: `${found.label} (a coordinar)`, cost: 0 };
    }
    return { label: found.label, cost: found.coordinar ? 0 : found.price };
  }
  // fallback to pickup
  const pickup = methods.find(m => m.isPickup) ?? DEFAULT_SHIPPING_METHODS[0];
  return { label: pickup.label, cost: 0 };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  // Límite estricto por IP: 5 intentos por minuto
  if (!(await checkRateLimit(`checkout:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiados pedidos. Esperá un momento." }, { status: 429 });
  }

  // Leer el body como texto para medir el tamaño real — no confiar en Content-Length
  // (un cliente puede omitirlo o falsificarlo para eludir el guard)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }
  if (rawBody.length > 32_768) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  let body: CheckoutBody;
  try {
    body = JSON.parse(rawBody) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const { storeId, affiliateId, couponId, rewardCouponCode, items, customer, shippingMethod } = body;
  // Whitelist para evitar que el frontend inyecte un proveedor falso (ej: "mp" en pedido manual)
  const VALID_PROVIDERS = ["mp", "mercadopago", "transferencia", "efectivo", "transfer"] as const;
  const rawProvider = VALID_PROVIDERS.includes(body.paymentProvider as typeof VALID_PROVIDERS[number])
    ? body.paymentProvider
    : "transfer";
  // Normalizar "mercadopago" → "mp" para que el template de email use la rama correcta
  const paymentProvider = rawProvider === "mercadopago" ? "mp" : rawProvider;

  if (!storeId || !items?.length) {
    return NextResponse.json({ error: "El carrito esta vacio" }, { status: 400 });
  }

  // Validar formato UUID para prevenir inyecciones
  if (!UUID_RE.test(String(storeId))) {
    return NextResponse.json({ error: "Tienda inválida" }, { status: 400 });
  }
  if (items.length > 20) {
    return NextResponse.json({ error: "El carrito no puede tener más de 20 líneas" }, { status: 400 });
  }
  if (items.some(i => !UUID_RE.test(String(i.productId ?? "")))) {
    return NextResponse.json({ error: "Formato de producto inválido" }, { status: 400 });
  }
  if (couponId && !UUID_RE.test(String(couponId))) {
    return NextResponse.json({ error: "Cupón inválido" }, { status: 400 });
  }
  if (affiliateId && !UUID_RE.test(String(affiliateId))) {
    return NextResponse.json({ error: "Afiliado inválido" }, { status: 400 });
  }

  if (affiliateId && paymentProvider !== "mp") {
    return NextResponse.json(
      { error: "Los pedidos con link de afiliado solo pueden pagarse con MercadoPago." },
      { status: 400 }
    );
  }

  if (!customer?.name || typeof customer.name !== "string" || customer.name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre requerido (mínimo 2 caracteres)" }, { status: 400 });
  }
  const emailNorm = customer?.email?.toLowerCase().trim() ?? "";
  if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  // Límite por email: 3 pedidos cada 5 minutos (protege contra bots que rotan IPs)
  if (!(await checkRateLimit(`checkout:email:${emailNorm}`, 3, 300_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo." }, { status: 429 });
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

  const foundShippingMethod = findShippingMethod(shippingMethod, storeShippingMethods);
  if (foundShippingMethod?.liveQuote && (!customer?.postalCode?.trim() || !customer?.province?.trim())) {
    return NextResponse.json(
      { error: "Ingresá tu código postal y provincia para cotizar el envío" },
      { status: 400 }
    );
  }

  const shipping = await resolveShipping(
    foundShippingMethod,
    storeShippingMethods,
    storeId,
    customer?.postalCode ?? "",
    customer?.province ?? "",
    items.map((i) => ({ productId: i.productId, quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)) }))
  );

  try {
    let usedRewardCouponId: string | null = null;
    const { createdOrder: order, promoSavings, promoProductInfo } = await prisma.$transaction(async (tx) => {
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

      // Pre-calcular cantidad total por producto para validar promos de cantidad
      const totalQtyByProduct = new Map<string, number>();
      for (const item of normalizedItems) {
        totalQtyByProduct.set(item.productId, (totalQtyByProduct.get(item.productId) ?? 0) + item.quantity);
      }

      const orderItems: { productId: string; variantId: string | null; quantity: number; price: number }[] = [];
      let promoSavingsAcc = 0;
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

          // Releemos el stock real ya decrementado (en vez de confiar en el valor
          // leído antes del decremento atómico) para que el historial sea exacto
          // incluso si otra venta concurrente tocó la misma variante mientras tanto.
          const postDecrement = await tx.productVariant.findUnique({
            where: { id: variant.id },
            select: { stock: true },
          });
          const stockAfterDecrement = postDecrement?.stock ?? variant.stock - item.quantity;
          await recordStockMovement(tx, {
            variantId: variant.id,
            productId: product.id,
            delta: -item.quantity,
            stockBefore: stockAfterDecrement + item.quantity,
            stockAfter: stockAfterDecrement,
            type: "SALE",
            changedBy: "system",
          });
        }

        const basePrice = variant?.price ?? product.price;
        const wholesale = product.precioMayorista;
        const minQty = product.cantMinMayorista;
        if (minQty && item.quantity < minQty) {
          throw new Error(`${product.name} requiere un mínimo de ${minQty} unidades`);
        }
        const wholesaleOrBasePrice = (wholesale && minQty && item.quantity >= minQty) ? wholesale : basePrice;

        // Promo por cantidad: validada server-side desde la DB, nunca desde el cliente
        const totalQtyForProduct = totalQtyByProduct.get(product.id) ?? item.quantity;
        const promoApplies =
          product.promoQtyMin != null &&
          product.promoQtyMin >= 2 &&
          totalQtyForProduct >= product.promoQtyMin &&
          (product.promoType === "N_PAY_M"
            ? product.promoPayQty != null && product.promoPayQty >= 1 && product.promoPayQty < product.promoQtyMin
            : product.promoQtyDiscount != null && product.promoQtyDiscount > 0 && product.promoQtyDiscount <= 80);
        const effectiveDiscountPct = promoApplies
          ? (product.promoType === "N_PAY_M" && product.promoQtyMin && product.promoPayQty
              ? (() => {
                  const N = product.promoQtyMin!;
                  const M = product.promoPayQty!;
                  const paidQty = Math.floor(totalQtyForProduct / N) * M + totalQtyForProduct % N;
                  return (1 - paidQty / totalQtyForProduct) * 100;
                })()
              : product.promoQtyDiscount ?? 0)
          : 0;
        // Redondear a centavos para evitar punto flotante en totales
        const unitPrice = promoApplies
          ? Math.round(wholesaleOrBasePrice * (1 - effectiveDiscountPct / 100) * 100) / 100
          : wholesaleOrBasePrice;

        orderItems.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: item.quantity,
          price: unitPrice,
        });
        promoSavingsAcc += promoApplies ? Math.round((wholesaleOrBasePrice - unitPrice) * item.quantity * 100) / 100 : 0;
      }

      const promoSavings = Math.round(promoSavingsAcc * 100) / 100;
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

      // Capturar info del producto con promo para el email
      const promoProduct = products.find(p => p.promoQtyMin && totalQtyByProduct.get(p.id) != null && totalQtyByProduct.get(p.id)! >= p.promoQtyMin);
      const promoProductInfo = promoProduct ? { type: promoProduct.promoType, min: promoProduct.promoQtyMin!, payQty: promoProduct.promoPayQty } : null;

      return { createdOrder, promoSavings, promoProductInfo };
    }, { timeout: 15_000 });

    // Donación opcional a la Canasta Solidaria (toggle del carrito) — un
    // agregado totalmente aparte de la compra, nunca debe romper ni
    // revertir la orden ya creada. Va a la cuenta de la plataforma, no a
    // la de esta tienda, por eso vive fuera de la transacción de la orden.
    let donationId: string | null = null;
    const phone = customer.phone?.trim() || "";
    if (
      phone &&
      typeof body.donationAmount === "number" &&
      Number.isFinite(body.donationAmount) &&
      body.donationAmount >= MIN_DONATION
    ) {
      try {
        const campaign = await prisma.donationCampaign.findFirst({
          where: { status: "ACTIVE" },
          include: { products: { orderBy: { sortOrder: "asc" } } },
          orderBy: { createdAt: "desc" },
        });
        if (campaign) {
          const goalAmount = calculateGoalAmount(campaign.products, campaign.reservePct);
          const maxDonation = Math.floor(goalAmount * MAX_DONATION_PCT_OF_GOAL);
          const donationAmount = Math.min(body.donationAmount, maxDonation);

          const existingConfirmed = await prisma.donation.findFirst({
            where: { campaignId: campaign.id, status: "CONFIRMED", donorEmail: emailNorm, donorPhone: phone },
          });
          if (!existingConfirmed && donationAmount >= MIN_DONATION) {
            const donation = await prisma.donation.create({
              data: {
                campaignId: campaign.id,
                userId: order.buyerId,
                amount: donationAmount,
                status: "PENDING",
                donorName: customer.name.trim(),
                donorPhone: phone,
                donorEmail: emailNorm,
                donorLocalidad: customer.city?.trim() || "Sin especificar",
              },
            });
            donationId = donation.id;
          }
        }
      } catch (e) {
        console.error("[checkout] error creando donación opcional:", e);
      }
    }

    // Si este comprador tenía un carrito marcado como abandonado, ya se recuperó
    prisma.abandonedCart.updateMany({
      where: { storeId: order.storeId, customerEmail: emailNorm, recoveredAt: null },
      data: { recoveredAt: new Date() },
    }).catch((e) => console.error("[abandonedCart] recovered:", e));

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
        promoSavings: promoSavings > 0 ? promoSavings : undefined,
        promoType: promoProductInfo?.type,
        promoQtyMin: promoProductInfo?.min,
        promoPayQty: promoProductInfo?.payQty,
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

    return NextResponse.json({ order, donationId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el pedido" },
      { status: 400 }
    );
  }
}
