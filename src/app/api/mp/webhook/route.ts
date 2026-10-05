import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { createNotification } from "@/lib/notifications";
import { runOrderAction, reactivarPorPagoTardio, PedidoEnOtroEstado } from "@/lib/orderActions";
import { despues } from "@/lib/despues";
import { sendPushToUser } from "@/lib/push";
/* La verificación de firma vive en su propia pieza: la comparten los dos
   webhooks de pago. Ver el comentario largo en `lib/mp-firma`. */
import { firmaDeMercadoPagoValida } from "@/lib/mp-firma";

/* ══════════════════════════════════════════════════════════════════════════
   EL AVISO DE PAGO DE LAS TIENDAS (reescrito el 05/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Lo que cambió, y por qué (ver AUDITORIA-MODA-OCT26.md, 1.1 y 2.x):

   - Un pago RECHAZADO ya no cancela el pedido. En Checkout Pro, si la tarjeta
     rebota, el comprador prueba con otra en la misma pantalla. Antes el rechazo
     cancelaba el pedido (stock devuelto, mail de "cancelado") y el pago bueno
     que llegaba después encontraba el pedido cancelado y se ignoraba: el
     cliente pagaba y la tienda no se enteraba. Ahora el pedido sigue pendiente
     hasta que se pague o venza (el vencimiento lo hace el cron diario).
   - Un pago aprobado sobre un pedido ya cancelado intenta reactivarlo
     (`reactivarPorPagoTardio`): si el stock alcanza, se confirma; si no, se le
     avisa fuerte al dueño.
   - Confirmar pasa por `runOrderAction`, el mismo camino que el panel. Antes
     había una copia acá con diferencias (no miraba si el comprador era el mismo
     afiliado) y sin candado: dos avisos juntos confirmaban dos veces.
   - Se verifica que la plata haya ido a la cuenta de ESA tienda (`collector_id`
     contra `mpSellerId`).
   - Se procesa ANTES de contestar, y un error inesperado devuelve 500 para que
     MercadoPago reintente. Antes se contestaba 200 de entrada y el error se
     tragaba: un corte de la base durante un `approved` dejaba el pedido
     pendiente con la plata cobrada, para siempre. Todo lo de acá es idempotente,
     así que el reintento no duplica nada.
   - Una devolución (`refunded`) sobre un pedido ya cobrado revierte la comisión
     del afiliado, igual que un contracargo, y le avisa al dueño. Antes no hacía
     nada. */

/** Errores que se esperan y no tiene sentido reintentar. */
class AvisoIgnorado extends Error {}

/** El SDK de MercadoPago tira el cuerpo de la respuesta: `{ status, message }`. */
const statusDeMp = (err: unknown) => (err as { status?: number })?.status;

async function processPaymentWebhook(paymentId: string) {
  /* Con el token de LA PLATAFORMA: la preferencia se crea como pago de
     marketplace (`marketplace: MP_APP_ID`, ver lib/mp), así que la aplicación
     puede leerlo. Igual que en digitales (api/digitales/cobro). */
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN ?? "" });
  let payment;
  try {
    payment = await new Payment(client).get({ id: paymentId });
  } catch (err) {
    /* 404/401/403: ese pago no existe o no es de esta aplicación. No se va a
       arreglar reintentando, así que no se pide reintento. Cualquier otro error
       (MP caído, timeout) sí sube y termina en 500. */
    const st = statusDeMp(err);
    if (st === 404 || st === 401 || st === 403) {
      console.warn("[mp/webhook] MercadoPago no devolvió el pago — se ignora", { paymentId, status: st });
      throw new AvisoIgnorado();
    }
    throw err;
  }

  const orderId = payment.external_reference;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, total: true,
      store: { select: { ownerId: true, mpSellerId: true } },
      commission: { select: { amount: true, status: true, affiliateId: true } },
    },
  });
  // Puede ser un pago de digitales, de la canasta o de suscripción que llegó acá
  // por error: no es un pedido de tienda, no hay nada que hacer.
  if (!order) return;

  /* ── ¿La plata fue a esta tienda? ─────────────────────────────────────────
     Sin esto, un comerciante de la plataforma podía cobrarse a sí mismo con el
     id de un pedido de OTRA tienda en `external_reference`, y ese pedido
     quedaba "pagado" sin que la otra tienda cobrara un peso. Si la tienda no
     tiene `mpSellerId` (conexiones viejas), no hay contra qué comparar: se deja
     pasar y se anota, para no frenar ventas legítimas. */
  const collector = (payment as { collector_id?: number | string }).collector_id;
  if (order.store.mpSellerId && collector != null && String(collector) !== order.store.mpSellerId) {
    console.error("[mp/webhook] el pago no es de la cuenta de esta tienda — se ignora", {
      paymentId, orderId, collector, esperado: order.store.mpSellerId,
    });
    return;
  }
  if (!order.store.mpSellerId) {
    console.warn("[mp/webhook] tienda sin mpSellerId: no se pudo verificar el destino del pago", { paymentId, orderId });
  }

  const estado = payment.status;

  /* ── Rechazado o cancelado: NO se cancela el pedido ────────────────────────
     El comprador puede reintentar con otro medio en la misma preferencia. Si
     no vuelve, el pedido vence solo (cron diario) y ahí se devuelve el stock. */
  if (estado === "rejected" || estado === "cancelled") {
    console.log(`[mp/webhook] pago ${estado} — el pedido sigue pendiente para reintentar`, { paymentId, orderId });
    return;
  }

  /* ── En curso (efectivo en Rapipago/Pago Fácil, acreditación demorada) ─────
     Se anota el id del pago: el vencimiento de pedidos impagos respeta los que
     tienen un pago en curso, que pueden tardar días en acreditarse. */
  if (estado === "pending" || estado === "in_process" || estado === "authorized") {
    await prisma.payment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { externalId: String(paymentId) },
    }).catch((err) => {
      // P2002: ese id ya estaba anotado (aviso repetido). No pasa nada.
      if ((err as { code?: string })?.code !== "P2002") throw err;
    });
    return;
  }

  /* ── La plata se devolvió o está en disputa ────────────────────────────────
     Sobre un pedido ya cobrado: se revierte la comisión del afiliado (si la
     hay) y se le avisa al dueño. El pedido NO se cancela solo: puede estar ya
     enviado, y qué hacer con eso lo decide el dueño. */
  if (estado === "refunded" || estado === "charged_back" || estado === "in_mediation") {
    if (order.status === "PENDING" || order.status === "CANCELLED") return;

    if (order.commission?.status === "PAID") {
      const commission = order.commission;
      const revertida = await prisma.$transaction(async (tx) => {
        // Condicionado al estado: un aviso repetido no descuenta dos veces.
        const r = await tx.commission.updateMany({ where: { orderId, status: "PAID" }, data: { status: "REVERSED" } });
        if (r.count === 0) return null;
        const wallet = await tx.wallet.update({
          where: { affiliateId: commission.affiliateId },
          data: { balance: { decrement: commission.amount } },
          select: { balance: true, affiliate: { select: { userId: true } } },
        });
        return wallet;
      });
      if (revertida) {
        const saldo = revertida.balance;
        const motivo = estado === "refunded" ? "una devolución del pago" : "una devolución de cargo";
        await createNotification({
          userId: revertida.affiliate.userId,
          type: "COMMISSION_REVERSED",
          title: "Comisión revertida",
          body: saldo < 0
            ? `Se descontó $${commission.amount.toLocaleString("es-AR")} de tu panel por ${motivo}. Tu saldo quedó en -$${Math.abs(saldo).toLocaleString("es-AR")} — regularizá dentro de los 30 días.`
            : `Se descontó $${commission.amount.toLocaleString("es-AR")} de tu panel por ${motivo}. Saldo actual: $${saldo.toLocaleString("es-AR")}.`,
          link: "/afiliados/billetera",
        });
      }
    }

    // Aviso al dueño, una sola vez por pago y estado.
    const yaAvisado = await prisma.orderStatusLog.findFirst({
      where: { orderId, changedBy: `mp_webhook:${estado}` },
      select: { id: true },
    });
    if (!yaAvisado) {
      await prisma.orderStatusLog.create({
        data: { orderId, fromStatus: order.status, toStatus: order.status, changedBy: `mp_webhook:${estado}` },
      });
      const aviso = {
        title: estado === "in_mediation" ? "Un comprador abrió un reclamo en MercadoPago" : "MercadoPago devolvió un pago",
        body: estado === "in_mediation"
          ? `El pago de $${order.total.toLocaleString("es-AR")} está en disputa. Revisalo en MercadoPago antes de enviar.`
          : `Se devolvió el pago de $${order.total.toLocaleString("es-AR")}. Si el pedido no se envió, cancelalo desde el panel.`,
      };
      const link = `/dashboard/pedidos/${orderId}`;
      await createNotification({ userId: order.store.ownerId, type: "PAYMENT_REFUNDED", ...aviso, link });
      despues(() => sendPushToUser(order.store.ownerId, { ...aviso, url: link }), "MP: push de devolución");
    }
    return;
  }

  if (estado !== "approved") return;

  /* ── Validar que lo pagado sea lo que el pedido dice (A-03) ────────────────
     Tolerancia del 5% hacia abajo, por redondeos y por cuotas con recargo que
     MP liquida distinto. Un pago de MÁS no frena nada (puede ser un ajuste de
     MP), pero se registra: si aparece seguido, hay algo que revisar. */
  const pagado = payment.transaction_amount;
  if (typeof pagado === "number" && order.total > 0) {
    if (pagado < order.total * 0.95) {
      console.error("[mp/webhook] monto pagado MENOR al del pedido — no se confirma", {
        paymentId, orderId, recibido: pagado, esperado: order.total,
      });
      return;
    }
    if (pagado > order.total * 1.05) {
      console.warn("[mp/webhook] monto pagado MAYOR al del pedido — se confirma igual", {
        paymentId, orderId, recibido: pagado, esperado: order.total,
      });
    }
  }

  if (order.status === "PENDING") {
    try {
      await runOrderAction({
        orderId, ownerId: order.store.ownerId, action: "confirmPayment",
        origen: "mercadopago", changedBy: "mp_webhook", externalPaymentId: String(paymentId),
      });
      console.log(`[mp/webhook] pago confirmado — paymentId=${paymentId} orderId=${orderId}`);
      return;
    } catch (err) {
      /* Otro aviso (o el dueño) lo cambió en el medio: el candado de
         `runOrderAction` lo frenó. Se vuelve a leer y se sigue con el estado
         nuevo: si quedó CANCELLED, es un pago tardío. */
      if (!(err instanceof PedidoEnOtroEstado)) throw err;
      const ahora = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
      if (ahora?.status !== "CANCELLED") return;
    }
  } else if (order.status !== "CANCELLED") {
    /* Ya confirmado, enviado o entregado. Si es el MISMO pago, es un aviso
       repetido y no hay nada que hacer. Si es OTRO pago aprobado, el comprador
       pagó dos veces (dos pestañas, o reintentó con un link viejo): antes se
       ignoraba en silencio y el cliente quedaba cobrado dos veces. Ahora se le
       avisa a la dueña, una vez, para que devuelva el segundo. */
    const pagoRegistrado = await prisma.payment.findUnique({ where: { orderId }, select: { externalId: true } });
    if (pagoRegistrado?.externalId && pagoRegistrado.externalId !== String(paymentId)) {
      const yaAvisado = await prisma.orderStatusLog.findFirst({
        where: { orderId, changedBy: "mp_webhook:pago_duplicado" }, select: { id: true },
      });
      if (!yaAvisado) {
        await prisma.orderStatusLog.create({
          data: { orderId, fromStatus: order.status, toStatus: order.status, changedBy: "mp_webhook:pago_duplicado" },
        });
        const aviso = {
          title: "⚠️ Un comprador pagó dos veces",
          body: `Llegó un segundo pago aprobado de $${(pagado ?? order.total).toLocaleString("es-AR")} para un pedido que ya estaba pago (pago N° ${paymentId}). Devolvelo desde MercadoPago.`,
        };
        const link = `/dashboard/pedidos/${orderId}`;
        await createNotification({ userId: order.store.ownerId, type: "PAYMENT_DUPLICATED", ...aviso, link });
        despues(() => sendPushToUser(order.store.ownerId, { ...aviso, url: link }), "MP: push de pago duplicado");
        console.error("[mp/webhook] pago duplicado", { paymentId, orderId, registrado: pagoRegistrado.externalId });
      }
    }
    return;
  }

  /* ── Pago aprobado de un pedido cancelado ─────────────────────────────── */
  const r = await reactivarPorPagoTardio({ orderId, externalPaymentId: String(paymentId) });
  const link = `/dashboard/pedidos/${orderId}`;
  if (r.reactivado) {
    const aviso = {
      title: "Llegó el pago de un pedido cancelado",
      body: `MercadoPago acreditó $${order.total.toLocaleString("es-AR")}. Había stock, así que el pedido se reactivó y quedó confirmado.`,
    };
    await createNotification({ userId: order.store.ownerId, type: "ORDER_CONFIRMED", ...aviso, link });
    despues(() => sendPushToUser(order.store.ownerId, { ...aviso, url: link }), "MP: push de pago tardío");
    return;
  }
  if (r.motivo === "stock") {
    /* La plata entró y no hay con qué cumplir. Se deja anotado en el pago
       (pedido CANCELLED + pago APPROVED: el panel lo muestra) y se avisa fuerte. */
    await prisma.payment.updateMany({ where: { orderId }, data: { status: "APPROVED", externalId: String(paymentId) } })
      .catch((err) => console.error("[mp/webhook] no se pudo anotar el pago tardío", orderId, err));
    await prisma.orderStatusLog.create({
      data: { orderId, fromStatus: "CANCELLED", toStatus: "CANCELLED", changedBy: "mp_webhook:pago_sin_stock" },
    });
    const aviso = {
      title: "⚠️ Te pagaron un pedido cancelado",
      body: `MercadoPago acreditó $${order.total.toLocaleString("es-AR")}, pero ya no hay stock de: ${r.faltantes.join(", ")}. Devolvé el pago desde MercadoPago o contactá al comprador.`,
    };
    await createNotification({ userId: order.store.ownerId, type: "PAYMENT_WITHOUT_STOCK", ...aviso, link });
    despues(() => sendPushToUser(order.store.ownerId, { ...aviso, url: link }), "MP: push de pago sin stock");
    console.error("[mp/webhook] pago aprobado sobre pedido cancelado sin stock", { paymentId, orderId, faltantes: r.faltantes });
  }
  // motivo "estado": otro aviso ya lo reactivó en paralelo. Nada que hacer.
}

export async function POST(req: NextRequest) {
  let paymentId: string | undefined;
  try {
    const body = await req.json();
    if (body.type !== "payment") return NextResponse.json({ ok: true });

    paymentId = body.data?.id ? String(body.data.id) : undefined;
    if (!paymentId) return NextResponse.json({ ok: true });

    if (!firmaDeMercadoPagoValida(req, paymentId)) {
      console.warn("MP webhook: firma inválida — request ignorada", { paymentId });
      return NextResponse.json({ ok: true });
    }
  } catch {
    return NextResponse.json({ ok: true });
  }

  /* Se procesa ANTES de contestar (ver arriba). Un error inesperado devuelve
     500: MercadoPago reintenta durante días con espera creciente, que es
     justo lo que hace falta ante un corte momentáneo. */
  try {
    await processPaymentWebhook(paymentId);
  } catch (err) {
    if (err instanceof AvisoIgnorado) return NextResponse.json({ ok: true });
    console.error("[mp/webhook] error procesando pago — se pide reintento:", paymentId, err);
    return NextResponse.json({ error: "Error procesando el pago" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
