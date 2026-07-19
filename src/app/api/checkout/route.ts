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
import { priceCart, resolveBasePrice, parseEscalones, type PricingItem, type ActivePromotion } from "@/lib/pricing";
import { parseStringArray } from "@/lib/promotions";
import { getClientIp } from "@/lib/request-ip";
import { isSubscriptionActive } from "@/lib/subscription";

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

// Los ids de este proyecto son cuid de Prisma (`c` + ~24 alfanuméricos), no UUID.
//
// Acá había un `UUID_RE` que ningún id de la base podía pasar, así que desde el
// 5/7 (commit ad9dafb, "security hardening") el checkout rechazaba TODOS los
// pedidos con 400 "Tienda inválida". El único pedido real de la plataforma es del
// 26/6 — nueve días antes de ese commit — así que la falla no la vio nadie: la
// única tienda con tráfico no tuvo ventas desde entonces.
//
// Se aceptan los dos formatos: hoy todo es cuid, pero si algún id migra a UUID
// esto no vuelve a romperse en silencio.
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
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

  // Validar el formato de los ids para descartar basura temprano
  if (!ID_RE.test(String(storeId))) {
    return NextResponse.json({ error: "Tienda inválida" }, { status: 400 });
  }
  if (items.length > 20) {
    return NextResponse.json({ error: "El carrito no puede tener más de 20 líneas" }, { status: 400 });
  }
  if (items.some(i => !ID_RE.test(String(i.productId ?? "")))) {
    return NextResponse.json({ error: "Formato de producto inválido" }, { status: 400 });
  }
  if (couponId && !ID_RE.test(String(couponId))) {
    return NextResponse.json({ error: "Cupón inválido" }, { status: 400 });
  }
  if (affiliateId && !ID_RE.test(String(affiliateId))) {
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

  // La tienda tiene que existir Y estar habilitada para vender.
  //
  // Hasta acá el checkout no miraba NADA de esto: ni el cierre, ni la suscripción.
  // O sea que aceptaba pedidos —y cobraba por MercadoPago— de tiendas cerradas y
  // de suscripciones vencidas, incluido el trial de 7 días: alguien se registraba,
  // no pagaba nunca, y su tienda seguía vendiendo para siempre. Peor todavía para
  // el comprador, porque la dueña tiene el panel bloqueado y no puede despachar
  // lo que le compraron.
  //
  // El cron cierra las tiendas vencidas, pero esto va igual: si el cron no corrió
  // o falló, no queremos seguir tomando plata.
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      storeConfig: true,
      isActive: true,
      closedAt: true,
      owner: {
        select: {
          banned: true,
          subscription: {
            select: { status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true, cancelAtPeriodEnd: true },
          },
        },
      },
    },
  });

  // El ban del dueño también corta la venta: si no, banearlo por estafa le
  // bloqueaba el panel pero la tienda seguía cobrando por MercadoPago pedidos que
  // no iba a poder despachar. `banned` corta el login (auth-session), no el checkout.
  if (!store || !store.isActive || store.closedAt || store.owner?.banned) {
    return NextResponse.json({ error: "Esta tienda no está disponible" }, { status: 409 });
  }

  // isSubscriptionActive incluye TRIAL y GRACE a propósito: durante la prueba y
  // durante los días de gracia la tienda vende normal. Recién al vencer del todo
  // deja de aceptar pedidos.
  //
  // Sin cast: el `as` que había acá tapaba que al select le faltara un campo, y
  // eso es justo lo que no se puede permitir en el camino que cobra. Si mañana
  // el select se olvida de traer algo, tiene que romper la compilación y no
  // rechazar pedidos en silencio.
  const sub = store.owner?.subscription;
  if (!sub || !isSubscriptionActive(sub)) {
    return NextResponse.json(
      { error: "Esta tienda no está aceptando pedidos en este momento" },
      { status: 409 }
    );
  }

  // Resolve shipping from store's config (dynamic per-store pricing)
  let storeShippingMethods: ShippingMethod[] = DEFAULT_SHIPPING_METHODS;
  try {
    const cfg = JSON.parse(store.storeConfig || "{}");
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
    const { createdOrder: order, promoSavings, appliedCouponCode } = await prisma.$transaction(async (tx) => {
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

      const orderItems: { productId: string; variantId: string | null; quantity: number; price: number; lineTotal: number; costAtSale: number | null }[] = [];
      // El loop decrementa stock y resuelve el precio base (variante/mayorista);
      // la cuenta de la promo la hace priceCart DESPUÉS, una sola vez, con la misma
      // función que usa el carrito. Costo congelado en paralelo, mismo orden.
      const pricingInputs: PricingItem[] = [];
      const costAtSaleByIndex: (number | null)[] = [];
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

        const retailPrice = variant?.price ?? product.price;
        // B-04 resuelto: el mínimo mayorista es un umbral de descuento, NO un
        // candado. Bajo el mínimo se vende al precio retail (antes el checkout
        // rechazaba la compra aunque el carrito ya había mostrado ese precio).
        // Precio base con mayorista + escalones, mismo resolvedor que el carrito
        // (antes el checkout ignoraba los escalones y cobraba de más — B-01).
        const wholesaleOrBasePrice = resolveBasePrice({
          retailPrice,
          precioMayorista: product.precioMayorista,
          cantMinMayorista: product.cantMinMayorista,
          preciosEscalonados: parseEscalones(product.preciosEscalonados),
        }, item.quantity);

        pricingInputs.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: item.quantity,
          basePrice: wholesaleOrBasePrice,
          // Categoría para el alcance por categoría de las StorePromotion.
          category: product.category,
        });
        // "Congelado" al momento de la venta — si después se edita el costo del
        // producto, este pedido ya vendido no debe cambiar de ganancia.
        costAtSaleByIndex.push(product.costPrice ?? null);
      }

      // StorePromotion vigentes de esta tienda — leídas de la base acá adentro
      // (el cliente nunca es la autoridad del precio). Vigencia = activa, sin
      // archivar y dentro de [startsAt, endsAt]. El motor decide alcance, mínimo y tipo.
      const nowTs = new Date();
      const promoRows = await tx.storePromotion.findMany({
        where: {
          storeId,
          isActive: true,
          archivedAt: null,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: nowTs } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: nowTs } }] },
          ],
        },
      });
      const activePromos: ActivePromotion[] = promoRows.map((p) => ({
        type: p.type,
        value: p.value,
        minQty: p.minQty,
        payQty: p.payQty,
        minOrderAmount: p.minOrderAmount,
        scope: p.scope,
        categories: parseStringArray(p.categories),
        productIds: parseStringArray(p.productIds),
        combinesWithCoupons: p.combinesWithCoupons,
      }));

      // La cuenta de la promo, una sola vez, con la misma función que el carrito.
      const pricing = priceCart(pricingInputs, { promotions: activePromos });
      pricing.lines.forEach((line, i) => {
        orderItems.push({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          price: line.unitPrice,
          // El total exacto de la línea — para el N×M no coincide con price × qty.
          lineTotal: line.lineTotal,
          costAtSale: costAtSaleByIndex[i],
        });
      });

      const promoSavings = pricing.promoSavings;
      // El subtotal sale del total por línea (no de precio×cantidad): en un N×M el
      // total de la línea es exacto, mientras que reconstruirlo desde el unitario
      // redondeado metería el centavo que este motor justamente elimina.
      const subtotal = pricing.subtotal;

      // Envío gratis: si una StorePromotion de envío aplica, el envío pasa a 0.
      const effectiveShippingCost = pricing.freeShipping ? 0 : shipping.cost;

      let discountAmount = 0;
      let validCouponId: string | null = null;
      let appliedCouponCode: string | null = null;
      // Si hay una promo activa que no combina con cupones, el cupón no entra
      // (lo que el wizard le promete a la dueña con "no combina con cupones").
      if (couponId && pricing.couponsAllowed) {
        const coupon = await tx.coupon.findFirst({
          where: { id: couponId, storeId, isActive: true },
        });
        if (coupon) {
          const now = new Date();
          const expired = coupon.expiresAt && coupon.expiresAt < now;
          // Cupón de gamificación: solo lo puede usar el email ganador
          const wrongOwner = coupon.winnerEmail && coupon.winnerEmail !== emailNorm;
          if (!expired && !wrongOwner && subtotal >= coupon.minOrderAmount) {
            // Incremento atómico: el WHERE previene race condition si dos checkouts llegan juntos
            const updated = await tx.coupon.updateMany({
              where: {
                id: coupon.id,
                storeId,
                isActive: true,
                OR: [{ maxUses: null }, { usedCount: { lt: coupon.maxUses ?? Number.MAX_SAFE_INTEGER } }],
              },
              data: { usedCount: { increment: 1 } },
            });
            if (updated.count > 0) {
              const MAX_COUPON_DISCOUNT = 50_000;
              discountAmount = coupon.discountType === "percentage"
                ? Math.min(Math.round((subtotal * coupon.discountValue) / 100), MAX_COUPON_DISCOUNT)
                : Math.min(coupon.discountValue, subtotal);
              validCouponId = coupon.id;
              appliedCouponCode = coupon.code;
            }
          }
        }
      }

      // Cupón de premio (AffiliateRewardCoupon) — solo si no hay cupón normal ya
      // aplicado y si la promo activa (si hay) permite combinar con cupones.
      if (!validCouponId && rewardCouponCode && pricing.couponsAllowed) {
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

      const total = Math.max(0, subtotal - discountAmount + effectiveShippingCost);

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
          shippingCost: effectiveShippingCost,
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
              cost: effectiveShippingCost,
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

      return { createdOrder, promoSavings, appliedCouponCode };
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

    // Actividad, recuperación de carrito y milestones — fire-and-forget
    ;(async () => {
      try {
        await prisma.storeActivityEvent.create({
          data: {
            storeId: order.storeId,
            type: "NEW_ORDER",
            data: JSON.stringify({
              total: order.total,
              buyerName: customer.name.trim().slice(0, 50),
            }),
          },
        });

        const recovered = await prisma.abandonedCart.updateMany({
          where: { storeId: order.storeId, customerEmail: emailNorm, recoveredAt: null },
          data: { recoveredAt: new Date() },
        });
        if (recovered.count > 0) {
          await prisma.storeActivityEvent.create({
            data: {
              storeId: order.storeId,
              type: "CART_RECOVERED",
              data: JSON.stringify({ buyerName: customer.name.trim().slice(0, 50) }),
            },
          });
        }

        const orderCount = await prisma.order.count({ where: { storeId: order.storeId } });
        if (orderCount === 1) {
          await prisma.storeMilestone.upsert({
            where: { storeId_type: { storeId: order.storeId, type: "FIRST_ORDER" } },
            create: { storeId: order.storeId, type: "FIRST_ORDER" },
            update: {},
          });
        }

        const revAgg = await prisma.order.aggregate({
          where: { storeId: order.storeId, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } },
          _sum: { total: true },
        });
        const totalRev = revAgg._sum.total ?? 0;
        for (const [threshold, type] of [
          [1000, "REVENUE_1K"],
          [10000, "REVENUE_10K"],
          [50000, "REVENUE_50K"],
        ] as [number, string][]) {
          if (totalRev >= threshold) {
            await prisma.storeMilestone.upsert({
              where: { storeId_type: { storeId: order.storeId, type } },
              create: { storeId: order.storeId, type },
              update: {},
            });
          }
        }
      } catch (e) {
        console.error("[activity/milestone] checkout:", e);
      }
    })();

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
          select: { id: true, name: true, price: true, comparePrice: true },
        }),
        variantIds.length > 0
          ? prisma.productVariant.findMany({
              where: { id: { in: variantIds } },
              select: { id: true, name: true, value: true },
            })
          : Promise.resolve([]),
      ]);

      const nameMap = Object.fromEntries(productNames.map((p) => [p.id, p.name]));
      const comparePriceMap = Object.fromEntries(productNames.map((p) => [p.id, p.comparePrice]));
      const offerPriceMap = Object.fromEntries(productNames.map((p) => [p.id, p.price]));
      const variantMap = Object.fromEntries(variantData.map((v) => [v.id, `${v.name}: ${v.value}`]));

      const emailItems = order.items.map((item) => ({
        name: nameMap[item.productId] ?? "Producto",
        variant: item.variantId ? (variantMap[item.variantId] ?? null) : null,
        quantity: item.quantity,
        price: item.price,
        lineTotal: item.lineTotal,
        offerPrice: offerPriceMap[item.productId] ?? null,
        comparePrice: comparePriceMap[item.productId] ?? null,
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
        discountAmount: order.discountAmount,
        couponCode: appliedCouponCode ?? undefined,
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
