import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCheckoutPreference, decryptToken } from "@/lib/mp";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// POST /api/mp/checkout
// Crea una preferencia de pago en MercadoPago para una orden ya existente.
// La orden debe estar PENDING y la tienda debe tener MP conectado.
export async function POST(req: NextRequest) {
  const { orderId, donationId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
  // donationId es opcional: si la compra incluyó una donación a la Canasta
  // Solidaria, lo llevamos a través de la ida y vuelta de MP para poder
  // ofrecer pagarla aparte apenas vuelva de pagar la compra.
  const donationParam = typeof donationId === "string" && donationId ? `&donacionId=${donationId}` : "";

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

  // Calcular marketplace_fee = comisión del afiliado (si existe)
  const commissionBase = Math.max(0, (order.subtotal ?? order.total) - (order.discountAmount ?? 0));
  const marketplaceFee = order.affiliateId && order.lockedCommissionRate
    ? Math.round((commissionBase * order.lockedCommissionRate) / 100)
    : 0;

  // SIEMPRE un solo ítem con el total exacto de la orden (A-01).
  //
  // Antes esto se hacía solo cuando había cupón o envío pago; sin ellos se armaba
  // ítem por ítem con `price × quantity`. Esa reconstrucción NO da el total del
  // pedido cuando hay un N×M: el unitario está redondeado y el total exacto vive en
  // `lineTotal` — el propio checkout lo deja escrito ("para el N×M no coincide con
  // price × qty", checkout/route.ts). Con 3 unidades de $10.000 en un 3×2, la línea
  // vale $20.000 y la suma de unitarios da $20.001: MP cobraba un peso de más.
  //
  // Es el mismo error que B-11, en el otro extremo del sistema. La causa de fondo
  // es la misma de siempre: reconstruir un número que ya estaba calculado. Se
  // consolida siempre, y la clase entera de error desaparece.
  //
  // Se pierde el detalle por ítem en la pantalla de MP — pero eso ya pasaba en la
  // mayoría de los pedidos (cualquiera con cupón o envío pago), y el comprador
  // tiene el desglose completo en el mail de confirmación.
  const items = [{
    id: order.id,
    title: order.items.length === 1
      ? order.items[0].product.name
      : `${order.items.length} productos`,
    unit_price: order.total,
    quantity: 1,
  }];

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
          success: `${APP_URL}/tienda/${order.store.slug}?pago=ok&orden=${order.id}${donationParam}`,
          failure: `${APP_URL}/tienda/${order.store.slug}?pago=error&orden=${order.id}${donationParam}`,
          pending: `${APP_URL}/tienda/${order.store.slug}?pago=pendiente&orden=${order.id}${donationParam}`,
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
