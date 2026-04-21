import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CheckoutItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

type CheckoutBody = {
  storeId: string;
  affiliateId?: string | null;
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

const SHIPPING_COSTS: Record<string, { label: string; cost: number }> = {
  pickup: { label: "Retiro en local / acordar", cost: 0 },
  standard: { label: "Envio estandar", cost: 3500 },
  national: { label: "Envio nacional", cost: 6500 },
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CheckoutBody;
  const { storeId, affiliateId, items, customer, shippingMethod, paymentProvider } = body;

  if (!storeId || !items?.length) {
    return NextResponse.json({ error: "El carrito esta vacio" }, { status: 400 });
  }

  if (!customer?.name || !customer?.email) {
    return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 });
  }

  const shipping = SHIPPING_COSTS[shippingMethod] ?? SHIPPING_COSTS.pickup;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const store = await tx.store.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          ownerId: true,
          affiliatesEnabled: true,
          commissionRate: true,
        },
      });

      if (!store) throw new Error("Tienda no encontrada");

      let validAffiliateId: string | null = null;
      if (affiliateId && store.affiliatesEnabled) {
        const affiliate = await tx.affiliate.findFirst({
          where: { id: affiliateId, storeId, isActive: true },
          select: { id: true },
        });
        validAffiliateId = affiliate?.id ?? null;
      }

      const normalizedItems = items
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        }))
        .filter((item) => item.productId);

      const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, storeId, isActive: true },
        include: { variants: true },
      });

      const orderItems = normalizedItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error("Producto no disponible");

        const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null;
        if (item.variantId && !variant) throw new Error("Variante no disponible");
        if (variant && variant.stock < item.quantity) throw new Error(`No hay stock suficiente de ${product.name}`);

        return {
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: item.quantity,
          price: variant?.price ?? product.price,
        };
      });

      const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const total = subtotal + shipping.cost;

      const buyer = await tx.user.upsert({
        where: { email: customer.email.toLowerCase().trim() },
        update: {
          name: customer.name,
        },
        create: {
          email: customer.email.toLowerCase().trim(),
          name: customer.name,
          role: "BUYER",
        },
      });

      return tx.order.create({
        data: {
          status: "PENDING",
          total,
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
    });

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el pedido" },
      { status: 400 }
    );
  }
}
