import { NextRequest, NextResponse } from "next/server";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { firmaDeMercadoPagoValida } from "@/lib/mp-firma";
import {
  nuevoTokenDeDescarga, vencimientoDelPermiso, lineasEntregables, armadoDelMail,
  MAX_DESCARGAS,
} from "@/lib/entrega-digital";
import { comisionCongelada } from "@/lib/compra-digital";
import { mandarLaEntrega } from "@/lib/envio-digital";
import { createNotification } from "@/lib/notifications";
import { despues } from "@/lib/despues";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/* Para el texto de los avisos. Sin decimales, igual que en el resto del
   ecosistema: los importes son pesos enteros y "12.000,00" en una campanita
   ocupa lugar sin decir nada más. */
const plata = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

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

  if (pago.status === "cancelled" || pago.status === "rejected") {
    /* Un pago que nunca se acreditó. Se cancela con la condición adentro del
       `where`: si dos avisos llegan juntos, o si la orden ya se confirmó por
       otro camino, esto no pisa nada. En digitales no hay stock que devolver ni
       cupón que reponer — por eso no pasa por `runOrderAction`. */
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

  /**
   * ── Se devolvió la plata DESPUÉS de acreditarse ──────────────────────────
   *
   * ⚠️ Esto no hacía nada, y era el agujero más serio del webhook. `refunded`
   * estaba metido arriba con `cancelled` y `rejected`, todos contra órdenes
   * `PENDING` — pero una devolución llega sobre una orden que YA está CONFIRMED,
   * así que el `updateMany` actualizaba cero filas y se iba en silencio. La
   * persona seguía bajando el archivo con la plata ya devuelta, para siempre.
   * Y un contracargo ni siquiera estaba contemplado. Encontrado releyendo el
   * webhook el 03/09/26.
   *
   * Pasar la orden a CANCELLED corta la descarga **sola**: la ruta de descarga
   * exige que la orden esté CONFIRMED. No hay nada más que apagar.
   *
   * ── `in_mediation` queda AFUERA, a propósito ────────────────────────────
   *
   * Una mediación no está resuelta: puede terminar a favor de cualquiera de los
   * dos. Cortarle el archivo a alguien mientras reclama es castigarlo por
   * reclamar, y si después gana, se quedó sin lo que pagó. Se corta cuando hay
   * una decisión, no cuando hay una discusión.
   *
   * ── Lo que NO recupera ──────────────────────────────────────────────────
   *
   * El PDF que ya se bajó. Es la asimetría que no tiene arreglo limpio y que ya
   * está escrita en el documento: un archivo descargado no vuelve. Lo que esto
   * corta son las descargas que faltan.
   */
  if (pago.status === "refunded" || pago.status === "charged_back") {
    const { count } = await prisma.order.updateMany({
      where: { id: ordenId, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "CANCELLED" },
    });
    await prisma.payment.updateMany({
      where: { orderId: ordenId },
      data: { status: "REFUNDED", externalId: idDelPago },
    });

    /* Sólo si de verdad cambió algo: el mismo aviso llega repetido y no tiene
       sentido escribir el mismo renglón de historia diez veces. */
    if (count > 0) {
      await prisma.orderStatusLog.create({
        data: {
          orderId: ordenId,
          fromStatus: "CONFIRMED",
          toStatus: "CANCELLED",
          changedBy: pago.status === "refunded" ? "digital_devolucion" : "digital_contracargo",
        },
      }).catch((e) => console.error("[digital-cobro] no se pudo registrar la devolución:", e));

      /* ⚠️ Y SE LE AVISA A QUIEN VENDIÓ. Esto no es un detalle de comodidad: la
         plata ya salió de su cuenta de Mercado Pago y el acceso ya se cortó, o
         sea que pasaron dos cosas graves sin que nadie las haya pedido. Sin este
         aviso se entera cuando abre el panel, si lo abre.
         Se lee el dueño recién acá, con `updateMany` ya hecho: la orden se
         cancela igual aunque esta consulta falle. */
      const deQuien = await prisma.order.findUnique({
        where: { id: ordenId },
        select: { total: true, store: { select: { ownerId: true } } },
      }).catch(() => null);

      if (deQuien) {
        const esContracargo = pago.status === "charged_back";
        await createNotification({
          userId: deQuien.store.ownerId,
          type: "DIGITAL_DEVOLUCION",
          title: esContracargo ? "Contracargo en una venta" : "Devolución en una venta",
          body: `Se ${esContracargo ? "reclamó" : "devolvió"} el pago de ${plata(deQuien.total)}. `
            + "Le cortamos el acceso al archivo, pero lo que ya se descargó no vuelve.",
          link: "/digitales/ventas",
        });
      }

      console.warn("[digital-cobro] devolución/contracargo: se cortó el acceso", {
        ordenId, estado: pago.status,
      });
    }
    return;
  }

  /* ── Lo que todavía no se acreditó, pero está en camino ──────────────────
   *
   * ⚠️ Esto antes salía por acá sin dejar rastro, y esa falta se nota en OTRA
   * pantalla: en nuestra base, "no quiso pagar" y "va a pagar en un kiosco"
   * quedaban idénticos, los dos como una orden PENDING a secas.
   *
   * Mercado Pago deja pagar en efectivo con un cupón que dura días. Esa compra
   * queda pendiente y **se va a pagar**. Contarla como carrito abandonado sería
   * escribirle "te olvidaste de pagar" a alguien que tiene el cupón en la mano
   * —y con nuestro dominio de envío de por medio—. Ver `lib/carritos-digitales`.
   *
   * Se anota en la FILA DE PAGO y nada más: **la orden no se toca**. Sigue
   * PENDING hasta que haya un pago aprobado de verdad, que es lo único que
   * entrega el archivo y cobra la comisión. Y la condición va adentro del
   * `where`, así que un aviso viejo que llega tarde no pisa una orden que
   * mientras tanto se pagó o se canceló. */
  if (pago.status !== "approved") {
    const enCamino: Record<string, string> = {
      pending: "PENDING_MP",
      in_process: "IN_PROCESS",
      authorized: "AUTHORIZED",
    };
    const anotar = enCamino[pago.status ?? ""];
    if (anotar) {
      await prisma.payment
        .updateMany({
          where: { orderId: ordenId, status: "PENDING", order: { status: "PENDING" } },
          data: { status: anotar, externalId: idDelPago },
        })
        .catch((e) => console.error("[digital-cobro] no se pudo anotar el pago en camino", { ordenId, e }));
    }
    return;
  }

  /* ── Lo que sí ─────────────────────────────────────────────────────────── */

  const orden = await prisma.order.findUnique({
    where: { id: ordenId },
    select: {
      id: true, status: true, total: true, lockedCommissionRate: true, cuponCodigo: true,
      buyer: { select: { email: true, name: true } },
      store: { select: { id: true, ownerId: true, owner: { select: { role: true, name: true } } } },
      items: {
        select: {
          id: true,
          product: {
            select: {
              id: true, name: true, archivoPath: true, archivoNombre: true,
              rolDigital: true, padreId: true,
            },
          },
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

    /* El cupón gasta un uso recién ACÁ, con la plata acreditada: un carrito
       abandonado con cupón no consume nada. `updateMany` por (tienda, código):
       si la dueña lo borró entre la compra y el pago, no hay nada que sumar y
       no es un error. */
    if (orden.cuponCodigo) {
      await tx.cuponDigital.updateMany({
        where: { storeId: orden.store.id, codigo: orden.cuponCodigo },
        data: { usos: { increment: 1 } },
      });
    }

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

  /* ── El mail de entrega ─────────────────────────────────────────────────
   *
   * Va con `despues`: la respuesta a Mercado Pago sale enseguida y la plataforma
   * se compromete a no matar la función hasta que el mail termine. Sin eso, en
   * serverless la promesa queda colgada y el mail llega tarde o no llega, en
   * silencio — le pasó al aviso de carrito abandonado.
   *
   * Y si el mail falla, la venta NO se cae: ya está confirmada y los permisos ya
   * están emitidos. La persona igual tiene sus archivos en la pantalla de
   * gracias. Un mail que no sale no puede voltear algo que ya se cobró.
   *
   * ⚠️ El enlace es la PANTALLA DE GRACIAS, nunca la dirección de descarga:
   * abrir ésa gasta una de las cinco, y los enlaces de un mail los visitan solos
   * los antivirus y los previsualizadores. Ver `sendEntregaDigitalEmail`.
   */
  /* ⚠️ En un AGREGADO —la oferta de después de pagar— la orden NO tiene
     principal: lleva sólo el upsell, porque el principal ya se pagó en la orden
     anterior. Buscar el principal y salir si no está dejaba a esas compras sin
     mail de entrega. Se toma el principal si está, y si no, el padre del upsell:
     la pantalla de gracias cuelga del producto del embudo, no de la línea. */
  /* ── El aviso a quien vendió ────────────────────────────────────────────
   *
   * La campanita del panel, no un push: una cuenta digital hoy no tiene permiso
   * de notificaciones pedido (ver el comentario largo en el layout del panel),
   * así que esto se lee al entrar. Es el primer aviso que digitales escribe por
   * algo que pasó bien, y es el que hace que Ventas valga la pena abrir.
   *
   * ⚠️ Dice lo que LE QUEDA, no lo que se vendió. El bruto ya lo va a ver en
   * Mercado Pago; el número que nadie le muestra es el de después de la
   * comisión, y sale del porcentaje congelado en la orden — no del plan de hoy.
   *
   * No va con `despues` como el mail: es una fila en nuestra propia base, tarda
   * milisegundos, y `createNotification` ya se traga su propio error sin voltear
   * nada. Un aviso que no se escribe no puede tumbar una venta cobrada.
   */
  const leQueda = orden.total - comisionCongelada(orden.total, orden.lockedCommissionRate);
  await createNotification({
    userId: orden.store.ownerId,
    type: "DIGITAL_VENTA",
    title: "¡Vendiste!",
    /* ⚠️ Dice "le estamos mandando", no "ya le mandamos". Este aviso se escribe
       ANTES de que el mail salga —a propósito: si esperara al mail, una entrega
       que falla dejaría a quien vende sin enterarse de que vendió—, así que no
       puede afirmar algo que todavía no pasó. Si el mail no sale, llega un
       segundo aviso diciéndolo. */
    body: `${plata(orden.total)} — te quedan ${plata(leQueda)} después de la comisión.`
      + " Le estamos mandando el archivo por mail.",
    link: "/digitales/ventas",
  });

  /* ── Y el push al teléfono ─────────────────────────────────────────────────
   *
   * ⚠️ ES EL ÚNICO PUSH DE TODO EL ECOSISTEMA, y es a propósito. La devolución,
   * la entrega que falló y la caída a Free se leen en la campanita al entrar. Un
   * push es una interrupción: gastarla en algo que la persona no puede resolver
   * en ese momento es la forma más rápida de que revoque el permiso, y entonces
   * la próxima —la que sí importa— no llega.
   *
   * Esto es lo que justifica interrumpir: entró plata.
   *
   * Va con `despues` y no bloqueando: `sendPushToUser` sale a la red, a veces a
   * un servicio que no contesta, y una venta ya cobrada no puede quedar
   * esperando por un aviso. Si falla, el aviso de la campanita ya está escrito
   * arriba — o sea que la persona se entera igual al entrar. */
  despues(
    () => sendPushToUser(orden.store.ownerId, {
      title: "¡Vendiste!",
      body: `${plata(orden.total)} — te quedan ${plata(leQueda)} después de la comisión.`,
      url: "/digitales/ventas",
      /* El `tag` hace que dos ventas seguidas no apilen dos globos idénticos en
         la pantalla de bloqueo. Lleva el id de la orden justamente para que dos
         ventas DISTINTAS sí se vean las dos. */
      tag: `digital-venta-${orden.id}`,
    }),
    "[digital-cobro] push de la venta",
  );

  /* ⚠️ Cómo se arma el mail vive en `entrega-digital` y no acá, porque ahora lo
     arman DOS lugares: este aviso de pago, que lo manda solo, y el botón de
     reenviar de la pantalla de Ventas, que lo manda a pedido. Escrita en los
     dos, la cuenta se separa sola — y el reenviado se prueba mucho menos. */
  const { idDeLaPagina, comoSeLlama, archivos } = armadoDelMail(orden.items);

  if (orden.buyer.email && idDeLaPagina) {
    const dondeVerlos = `${APP_URL}/p/${idDeLaPagina}/gracias?orden=${orden.id}`;
    const paraQuien = orden.buyer.email;
    despues(
      async () => {
        /* `mandarLaEntrega` anota el envío en `DigitalEnvioLog` salga o no
           salga. Hasta acá, un mail que fallaba terminaba en un `console.error`
           que nadie lee: la venta quedaba COBRADA, la persona sin nada, y sin un
           solo rastro en la base. */
        const envio = await mandarLaEntrega({
          ordenId: orden.id,
          motivo: "ENTREGA",
          to: paraQuien,
          nombre: orden.buyer.name,
          producto: comoSeLlama,
          archivos,
          enlace: dondeVerlos,
          vendedor: orden.store.owner.name,
        });

        /* ⚠️ Y si no salió, se le avisa a quien vendió — con el link a ESA venta,
           que es donde está el botón para reenviarlo. Un fallo anotado en una
           tabla que nadie mira no arregla nada: la persona que puede resolverlo
           tiene que enterarse el mismo día, no cuando le reclamen.
           No se reintenta solo: ver el comentario en `envio-digital`. */
        if (!envio.ok) {
          await createNotification({
            userId: orden.store.ownerId,
            type: "DIGITAL_ENTREGA_FALLIDA",
            title: "No pudimos entregarle el archivo",
            body: `El mail a ${paraQuien} no salió. Ya cobraste la venta, así que entrá`
              + " y reenviáselo — quien compró todavía no tiene nada.",
            link: `/digitales/ventas/${orden.id}`,
          });
        }
      },
      "digital-cobro: mail de entrega",
    );
  }
}
