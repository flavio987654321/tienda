import { prisma } from "@/lib/prisma";
import { runOrderAction, PedidoEnOtroEstado } from "@/lib/orderActions";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";
import { despues } from "@/lib/despues";
import { PROVEEDORES_MP, PROVEEDORES_MANUALES } from "@/lib/proveedoresPago";

/* ══════════════════════════════════════════════════════════════════════════
   PEDIDOS QUE NUNCA SE PAGARON (05/10/26)
   ══════════════════════════════════════════════════════════════════════════

   El checkout descuenta el stock al crear el pedido, con el pago todavía
   pendiente. Hasta acá un pedido PENDING de tienda no vencía nunca: quien
   abandonaba MercadoPago dejaba el talle reservado para siempre, y la tienda lo
   veía "agotado" sin estarlo. Además, desde que un pago rechazado ya no cancela
   (ver el webhook de MP), los rechazados sin reintento también quedan acá.

   Lo corre el cron diario. Dos reglas distintas según cómo se iba a pagar:

   - MERCADOPAGO: se cancela solo (stock y cupón vuelven, al comprador le llega
     un mail de "venció sin pago" con un botón para volver a la tienda).
       · 48 h si no hay ningún pago en curso;
       · 7 días si hay uno (`payment.externalId`: un cupón de Rapipago/Pago
         Fácil se puede pagar días después; el webhook lo anota al llegar el
         `pending`).
     Si el pago llega igual después de vencido, el webhook reactiva el pedido
     (o avisa si ya no hay stock): vencer nunca hace perder una venta pagada.

   - TRANSFERENCIA / EFECTIVO: NO se cancelan solos. La plata llega por afuera
     del sistema y sólo la dueña sabe si la cobró; cancelar uno que ya cobró y
     no marcó sería peor que dejarlo. A los 3 días se le recuerda, una vez,
     que lo confirme o lo cancele. */

const HORA = 60 * 60 * 1000;
const VENCE_MP_SIN_PAGO = 48 * HORA;
const VENCE_MP_PAGO_EN_CURSO = 7 * 24 * HORA;
const RECORDAR_MANUAL = 3 * 24 * HORA;
/** Techo por corrida: el cron tiene 60 s en total (ver `maxDuration`). */
const TOPE = 40;

export const RECORDATORIO_MANUAL = "sistema:recordatorio";

export async function vencerPedidosImpagos(now = new Date()) {
  const tiendas = { owner: { role: { not: "DIGITAL" } } } as const;

  const vencidos = await prisma.order.findMany({
    where: {
      status: "PENDING",
      store: tiendas,
      payment: { is: { provider: { in: [...PROVEEDORES_MP] } } },
      OR: [
        { createdAt: { lt: new Date(now.getTime() - VENCE_MP_SIN_PAGO) }, payment: { is: { externalId: null } } },
        { createdAt: { lt: new Date(now.getTime() - VENCE_MP_PAGO_EN_CURSO) } },
      ],
    },
    select: { id: true, store: { select: { ownerId: true } } },
    orderBy: { createdAt: "asc" },
    take: TOPE,
  });

  let cancelados = 0;
  for (const o of vencidos) {
    try {
      await runOrderAction({ orderId: o.id, ownerId: o.store.ownerId, action: "cancel", origen: "vencimiento", changedBy: "sistema:vencimiento" });
      cancelados++;
    } catch (err) {
      // Se pagó o lo tocó la dueña justo ahora: el candado lo frenó. Está bien.
      if (!(err instanceof PedidoEnOtroEstado)) console.error("[pedidos impagos] no se pudo vencer", o.id, err);
    }
  }

  const sinConfirmar = await prisma.order.findMany({
    where: {
      status: "PENDING",
      store: tiendas,
      payment: { is: { provider: { in: [...PROVEEDORES_MANUALES] } } },
      createdAt: { lt: new Date(now.getTime() - RECORDAR_MANUAL) },
      statusLogs: { none: { changedBy: RECORDATORIO_MANUAL } },
    },
    select: { id: true, total: true, payment: { select: { provider: true } }, store: { select: { ownerId: true } } },
    orderBy: { createdAt: "asc" },
    take: TOPE,
  });

  let recordados = 0;
  for (const o of sinConfirmar) {
    // El renglón en el historial es lo que hace que se recuerde UNA sola vez.
    await prisma.orderStatusLog.create({
      data: { orderId: o.id, fromStatus: "PENDING", toStatus: "PENDING", changedBy: RECORDATORIO_MANUAL },
    });
    const medio = o.payment?.provider === "efectivo" ? "en efectivo" : "por transferencia";
    const aviso = {
      title: "Tenés un pedido sin confirmar",
      body: `Un pedido de $${o.total.toLocaleString("es-AR")} ${medio} lleva 3 días pendiente y tiene el stock reservado. Si ya cobraste, confirmalo; si no va a llegar el pago, cancelalo para liberar el stock.`,
    };
    const link = `/dashboard/pedidos/${o.id}`;
    await createNotification({ userId: o.store.ownerId, type: "ORDER_PENDING_REMINDER", ...aviso, link });
    despues(() => sendPushToUser(o.store.ownerId, { ...aviso, url: link }), "pedidos impagos: push de recordatorio");
    recordados++;
  }

  return { cancelados, recordados };
}
