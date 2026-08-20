import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCheckoutPreference, decryptToken } from "@/lib/mp";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// Mismo formato de id que valida /api/checkout: cuid de Prisma o UUID.
const ID_RE = /^(c[a-z0-9]{20,30}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

// POST /api/mp/checkout
// Crea una preferencia de pago en MercadoPago para una orden ya existente.
// La orden debe estar PENDING y la tienda debe tener MP conectado.
//
// No pide sesión a propósito: lo llama el comprador de una tienda pública, que
// no tiene cuenta (ver useCartLogic, se dispara apenas /api/checkout devuelve la
// orden). Lo que lo protege es que el orderId es un cuid que no se adivina, que
// la orden tiene que seguir PENDING, y el límite por IP de acá abajo.
export async function POST(req: NextRequest) {
  // Era el único endpoint público de la cadena de pagos sin límite por IP
  // (/api/checkout y /api/canasta/donation-checkout ya tenían el suyo). Sin esto,
  // el endpoint le pide una preferencia a MercadoPago por cada request, con el
  // token del comerciante y sin techo.
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`mp-checkout:${ip}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  let payload: { orderId?: unknown; donationId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }
  const { orderId, donationId } = payload;

  if (typeof orderId !== "string" || !ID_RE.test(orderId)) {
    return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
  }

  // donationId es opcional: si la compra incluyó una donación a la Canasta
  // Solidaria, lo llevamos a través de la ida y vuelta de MP para poder
  // ofrecer pagarla aparte apenas vuelva de pagar la compra.
  //
  // Se valida el formato antes de pegarlo en las back_urls. Antes entraba crudo:
  // cualquier texto que mandara el cliente terminaba dentro de la URL de retorno
  // que se le pasa a MercadoPago, así que quien llamara a este endpoint elegía
  // parte de la dirección a la que vuelve el comprador después de pagar.
  const donationParam = typeof donationId === "string" && ID_RE.test(donationId)
    ? `&donacionId=${encodeURIComponent(donationId)}`
    : "";

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
