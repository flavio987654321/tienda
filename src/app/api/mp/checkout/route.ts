import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCheckoutPreference, decryptToken } from "@/lib/mp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// POST /api/mp/checkout
// Crea una preferencia de pago en MercadoPago para una orden ya existente.
// La orden debe estar PENDING y la tienda debe tener MP conectado.
export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      store: { select: { id: true, slug: true, mpAccessToken: true, commissionRate: true, name: true } },
      affiliate: { select: { id: true } },
    },
  });

  if (!order || order.status !== "PENDING") {
    return NextResponse.json({ error: "Orden no encontrada o ya procesada" }, { status: 404 });
  }

  if (!order.store.mpAccessToken) {
    return NextResponse.json({ error: "Esta tienda no tiene MercadoPago conectado" }, { status: 400 });
  }

  const sellerToken = decryptToken(order.store.mpAccessToken);
  if (!sellerToken) {
    return NextResponse.json({ error: "Credenciales de MP inválidas" }, { status: 500 });
  }

  // Calcular marketplace_fee = comisión de la afiliada (si existe)
  const commissionBase = Math.max(0, (order.subtotal ?? order.total) - (order.discountAmount ?? 0));
  const marketplaceFee = order.affiliateId && order.lockedCommissionRate
    ? Math.round((commissionBase * order.lockedCommissionRate) / 100)
    : 0;

  const items = order.items.map((item) => ({
    id: item.id,
    title: item.product.name,
    unit_price: item.price,
    quantity: item.quantity,
  }));

  const MP_TIMEOUT_MS = 10_000;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("MercadoPago no respondió (timeout 10s)")), MP_TIMEOUT_MS)
  );

  let pref: Awaited<ReturnType<typeof createCheckoutPreference>>;
  try {
    pref = await Promise.race([
      createCheckoutPreference({
        sellerAccessToken: sellerToken,
        items,
        marketplaceFee,
        externalReference: order.id,
        backUrls: {
          success: `${APP_URL}/tienda/${order.store.slug}?pago=ok&orden=${order.id}`,
          failure: `${APP_URL}/tienda/${order.store.slug}?pago=error&orden=${order.id}`,
          pending: `${APP_URL}/tienda/${order.store.slug}?pago=pendiente&orden=${order.id}`,
        },
        notificationUrl: `${APP_URL}/api/mp/webhook`,
      }),
      timeout,
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al crear preferencia de pago";
    console.error("[mp/checkout] error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({
    preferenceId: pref.id,
    initPoint: pref.init_point,
  });
}
