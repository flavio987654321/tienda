import { NextRequest, NextResponse } from "next/server";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { firmaDeMercadoPagoValida } from "@/lib/mp-firma";
import {
  nuevoTokenDeDescarga, vencimientoDelPermiso, lineasEntregables, MAX_DESCARGAS,
} from "@/lib/entrega-digital";

export const runtime = "nodejs";

/**
 * El aviso de pago de una compra digital.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES EL ÚNICO LUGAR DONDE "PAGÓ" SE CONVIERTE EN "PUEDE BAJARLO"
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── Por qué separado del webhook de tiendas ─────────────────────────────────
 *
 * Aquél hace stock, envíos, cupones, comisiones de afiliado y reversión de
 * contracargos. Nada de eso existe acá, y lo que sí existe —emitir permisos de
 * descarga— no existe allá. Mezclarlos daba una función con dos mitades que
 * nunca corren juntas, en la ruta donde menos conviene equivocarse. Lo que SÍ se
 * comparte es la verificación de firma, que vive en `lib/mp-firma`.
 *
 * ── Las tres reglas de un webhook de pagos ──────────────────────────────────
 *
 * 1. **Verificar la firma.** La dirección es pública —viaja en cada preferencia—
 *    así que sin firma cualquiera confirma la orden de otro sin pagar nada.
 * 2. **Devolver 200 SIEMPRE**, incluso cuando algo sale mal. Un error hace que
 *    Mercado Pago reintente el mismo aviso una y otra vez, y un fallo que no se
 *    va a arreglar solo se convierte en una repetición infinita.
 * 3. **Ser idempotente.** El mismo aviso llega dos veces con normalidad. Todo lo
 *    de acá se puede correr mil veces y el resultado es el mismo.
 */

/* Cuánto se tolera que el pago acreditado difiera del total de la orden.
   El 5% para abajo cubre redondeos y cuotas con recargo que MP liquida distinto.
   Es el mismo criterio que el webhook de tiendas, donde antes NO se miraba el
   monto: un pago por menos confirmaba el pedido igual y nadie se enteraba. */
const TOLERANCIA = 0.05;

export async function POST(req: NextRequest) {
  let cuerpo: { data?: { id?: unknown }; type?: unknown; action?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    /* Ni siquiera es JSON. 200 igual: reintentar no lo va a mejorar. */
    return NextResponse.json({ ok: true });
  }

  const paymentId = cuerpo?.data?.id;
  if (typeof paymentId !== "string" && typeof paymentId !== "number") {
    return NextResponse.json({ ok: true });
  }
  const idDelPago = String(paymentId);

  /* ⚠️ La firma va ANTES de tocar la base y antes de salir a preguntarle nada a
     nadie. Es lo único que separa un aviso real de un `POST` escrito a mano con
     el identificador de una orden ajena. */
  if (!firmaDeMercadoPagoValida(req, idDelPago)) {
    /* 401 y no 200, que es lo que contesta el webhook de tiendas. La diferencia
       es deliberada: los avisos de verdad de Mercado Pago siempre traen firma
       válida, así que MP nunca ve este código. Quien sí lo ve es cualquiera que
       esté probando la dirección a mano — y si algún día MP cambiara el formato
       de la firma, los reintentos hacen ruido en vez de perderse en silencio.
       Con 200, esos pagos desaparecerían sin que nada lo cuente. */
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    await acreditar(idDelPago);
  } catch (e) {
    /* Se loguea y se contesta 200. Ver la regla 2. */
    console.error("[digital-cobro] fallo procesando el pago", idDelPago, e);
  }
  return NextResponse.json({ ok: true });
}

async function acreditar(idDelPago: string) {
  /* Con el token de LA PLATAFORMA, no el del vendedor. El cobro se creó como
     pago de marketplace (`marketplace: MP_APP_ID`), así que la aplicación puede
     leerlo; y buscar el token del vendedor exigiría saber de qué orden es antes
     de haber leído el pago, que es justo lo que queremos averiguar. */
  const cliente = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN ?? "" });
  const pago = await new Payment(cliente).get({ id: idDelPago });

  const ordenId = pago.external_reference;
  if (!ordenId) return;

  /* ── Lo que NO se acreditó ─────────────────────────────────────────────── */

  if (pago.status === "cancelled" || pago.status === "rejected" || pago.status === "refunded") {
    /* Se cancela con la condición adentro del `where`: si dos avisos llegan
       juntos, o si la orden ya se confirmó, esto no pisa nada. En digitales no
       hay stock que devolver ni cupón que reponer — por eso no pasa por
       `runOrderAction`, que existe para eso. */
    await prisma.order.updateMany({
      where: { id: ordenId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    await prisma.payment.updateMany({
      where: { orderId: ordenId, status: "PENDING" },
      data: { status: "REJECTED", externalId: idDelPago },
    });
    return;
  }

  if (pago.status !== "approved") return;

  /* ── Lo que sí ─────────────────────────────────────────────────────────── */

  const orden = await prisma.order.findUnique({
    where: { id: ordenId },
    select: {
      id: true, status: true, total: true,
      store: { select: { owner: { select: { role: true } } } },
      items: {
        select: {
          id: true,
          product: { select: { id: true, name: true, archivoPath: true } },
        },
      },
    },
  });

  /* `PENDING` es la guarda de idempotencia: el segundo aviso encuentra CONFIRMED
     y se va sin hacer nada. */
  if (!orden || orden.status !== "PENDING") return;

  /* ⚠️ Esta ruta sólo acredita ventas DIGITALES. Sin esto, un aviso dirigido acá
     con el identificador de una orden de tienda la confirmaría sin correr nada
     de lo que una venta de tienda necesita: ni stock, ni envío, ni comisión de
     afiliado. Quedaría cobrada y a medio procesar. */
  if (orden.store.owner.role !== "DIGITAL") {
    console.error("[digital-cobro] orden que no es digital, no se toca:", ordenId);
    return;
  }

  /* ⚠️ Que lo pagado sea lo que la orden dice. Antes, en el webhook de tiendas,
     alcanzaba con `approved`: un pago por menos confirmaba igual y nadie se
     enteraba. Un pago de MÁS no frena nada —puede ser un ajuste de MP— pero se
     deja anotado. */
  const pagado = pago.transaction_amount;
  if (typeof pagado === "number" && orden.total > 0) {
    if (pagado < orden.total * (1 - TOLERANCIA)) {
      console.error("[digital-cobro] se pagó MENOS que la orden — no se entrega", {
        idDelPago, ordenId, recibido: pagado, esperado: orden.total,
      });
      return;
    }
    if (pagado > orden.total * (1 + TOLERANCIA)) {
      console.warn("[digital-cobro] se pagó MÁS que la orden — se entrega igual", {
        idDelPago, ordenId, recibido: pagado, esperado: orden.total,
      });
    }
  }

  const ahora = new Date();
  const vence = vencimientoDelPermiso(ahora);
  const entregables = lineasEntregables(orden.items);

  /* ⚠️ Si NADA es entregable, la venta no se confirma. Confirmarla dejaría a
     alguien que pagó sin un solo archivo y sin ninguna señal de que algo falló:
     preferimos que la orden quede pendiente y visible. No debería pasar
     —`loQueFalta` no deja publicar sin archivo, y la ruta de compra lo mira otra
     vez— pero entre publicar y cobrar pueden pasar días. */
  if (entregables.length === 0) {
    console.error("[digital-cobro] pago acreditado y NADA para entregar:", ordenId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orden.id }, data: { status: "CONFIRMED" } });

    await tx.payment.updateMany({
      where: { orderId: orden.id },
      data: { status: "APPROVED", externalId: idDelPago },
    });

    await tx.orderStatusLog.create({
      data: {
        orderId: orden.id,
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
        changedBy: "digital_cobro",
      },
    });

    /* ⚠️ EL PERMISO DE DESCARGA, uno por línea entregable.
     *
     * Va con `upsert` sobre `orderItemId`, que es único en la base, y no con un
     * "¿ya existe?" seguido de un `create`. Lo dice el propio modelo: dos avisos
     * de Mercado Pago en paralelo leen los dos "todavía no" y crean los dos,
     * dejando dos tokens vivos y un tope de diez descargas donde debía haber
     * cinco. La restricción de la base resuelve la carrera; el código no puede.
     *
     * Y el `update` va VACÍO a propósito: si el permiso ya existe, no se toca.
     * Renovarle el vencimiento o el contador a alguien porque llegó un aviso
     * repetido sería regalarle treinta días más cada vez que Mercado Pago
     * reintenta.
     */
    for (const linea of entregables) {
      await tx.digitalDownload.upsert({
        where: { orderItemId: linea.id },
        update: {},
        create: {
          orderItemId: linea.id,
          token: nuevoTokenDeDescarga(),
          expiresAt: vence,
          maxDescargas: MAX_DESCARGAS,
        },
      });
    }
  });

  /* 🔲 Falta el mail de entrega, que es lo que le avisa a la persona. Los
     permisos ya están emitidos, así que cuando exista sólo tiene que leerlos.
     Va en el mismo paso que la pantalla de gracias. */
  console.log("[digital-cobro] entregada la orden", orden.id, "—", entregables.length, "archivo(s)");
}
