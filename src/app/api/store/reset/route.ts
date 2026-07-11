import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotificationMany } from "@/lib/notifications";
import { fetchStoreOrdersForArchive, fetchStoreCouponsForArchive, fetchStoreWalletsForArchive } from "@/lib/storeArchive";
import { STORE_TYPES } from "@/lib/storeTypes";
import { checkRateLimit } from "@/lib/rate-limit";

// Bloqueo de negocio detectado dentro de la transacción → se traduce a 409.
// El code le permite al modal ofrecer el botón de acción correcto.
class ResetBlockedError extends Error {
  constructor(readonly code: "UNRESOLVED_ORDERS" | "UNCLAIMED_PRIZES" | "PENDING_COMMISSIONS", message: string) {
    super(message);
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  // Operación pesada (transacción de hasta 20s + snapshot completo): 3 por hora sobra
  if (!(await checkRateLimit(`store-reset:${user.id}`, 3, 60 * 60_000))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos y probá de nuevo." }, { status: 429 });
  }

  let newType: unknown;
  try {
    ({ newType } = await req.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }
  if (!newType) return NextResponse.json({ error: "Falta el nuevo tipo de tienda" }, { status: 400 });
  // La UI ya lo impide, pero un POST manual podría disparar el borrado total
  // con un tipo inexistente/comingSoon o sin cambiar nada
  if (typeof newType !== "string" || !STORE_TYPES.some((t) => t.id === newType && !t.comingSoon)) {
    return NextResponse.json({ error: "Tipo de tienda inválido" }, { status: 400 });
  }
  if (newType === store.tipoTienda) {
    return NextResponse.json({ error: "La tienda ya es de ese tipo" }, { status: 400 });
  }
  // const: el narrowing a string de arriba no sobrevive dentro del closure de la transacción
  const tipoNuevo = newType;

  const activeAffiliates = await prisma.affiliate.findMany({
    where: { storeId: store.id, status: "APPROVED" },
    select: { userId: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
    // ── Lock de la fila de la tienda ──
    // FOR UPDATE conflictúa con el FOR KEY SHARE que toma cualquier INSERT
    // con FK a Store (nuevos pedidos del checkout), así que mientras dura la
    // transacción no puede entrar un pedido nuevo que se borraría sin quedar
    // archivado. También serializa dos resets concurrentes (doble click/tabs).
    await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${store.id} FOR UPDATE`;

    // ── Bloqueos: dentro de la transacción y después del lock, para que el
    // estado que validamos sea exactamente el que se archiva y borra ──
    const unresolvedOrders = await tx.order.count({
      where: { storeId: store.id, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    });
    if (unresolvedOrders > 0) {
      throw new ResetBlockedError(
        "UNRESOLVED_ORDERS",
        `Tenés ${unresolvedOrders} pedido${unresolvedOrders > 1 ? "s" : ""} sin entregar o cancelar. Resolvelos antes de cambiar de rubro.`
      );
    }

    const unclaimedPrizes = await tx.coupon.count({
      where: {
        storeId: store.id,
        winnerEmail: { not: null },
        usedCount: 0,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (unclaimedPrizes > 0) {
      throw new ResetBlockedError(
        "UNCLAIMED_PRIZES",
        `Hay ${unclaimedPrizes} premio${unclaimedPrizes > 1 ? "s" : ""} de la ruleta ganado${unclaimedPrizes > 1 ? "s" : ""} y sin reclamar todavía. Esperá a que se usen o venzan antes de cambiar de rubro.`
      );
    }

    // Comisiones acreditadas y retiros solicitados son deuda con las afiliadas:
    // los términos garantizan ese pago, no se puede borrar sin liquidar antes.
    const walletsWithBalance = await tx.wallet.count({
      where: { affiliate: { storeId: store.id }, balance: { gt: 0 } },
    });
    const pendingWithdrawals = await tx.walletWithdrawal.count({
      where: { wallet: { affiliate: { storeId: store.id } }, status: "PENDING" },
    });
    if (walletsWithBalance > 0 || pendingWithdrawals > 0) {
      throw new ResetBlockedError(
        "PENDING_COMMISSIONS",
        "Tenés afiliadas con comisiones acreditadas sin retirar o retiros pendientes de aprobar. Liquidá esos pagos desde la sección Pagos antes de cambiar de rubro."
      );
    }

    // ── Respaldo: antes de borrar nada, guardar copia completa de pedidos
    // (con items/pago/envío/comisión/cupón), cupones y saldos/retiros de
    // afiliadas del ciclo anterior. Son registros de plata real ya cobrada —
    // se archivan por obligaciones contables del dueño y como respaldo ante
    // reclamos/contracargos de MP o disputas de comisiones.
    const ordersToArchive = await fetchStoreOrdersForArchive(tx, store.id);
    const couponsToArchive = await fetchStoreCouponsForArchive(tx, store.id);
    const walletsToArchive = await fetchStoreWalletsForArchive(tx, store.id);

    const totalFacturado = ordersToArchive
      .filter((o) => o.payment?.status === "APPROVED")
      .reduce((sum, o) => sum + o.total, 0);

    await tx.storeArchive.create({
      data: {
        storeId: store.id,
        tipoTiendaAnterior: store.tipoTienda,
        ordersCount: ordersToArchive.length,
        totalFacturado,
        data: JSON.stringify({ orders: ordersToArchive, coupons: couponsToArchive, wallets: walletsToArchive }),
      },
    });

    // ── Comisiones y panel de comisiones de afiliadas ──
    // Commission.orderId es RESTRICT: si queda una comisión viva, el delete
    // de Order de abajo falla — estas van primero sí o sí.
    await tx.commission.deleteMany({ where: { affiliate: { storeId: store.id } } });
    await tx.walletWithdrawal.deleteMany({ where: { wallet: { affiliate: { storeId: store.id } } } });
    await tx.wallet.deleteMany({ where: { affiliate: { storeId: store.id } } });

    // ── Pedidos y sus dependientes ──
    await tx.orderStatusLog.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.orderItem.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.payment.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.shipping.deleteMany({ where: { order: { storeId: store.id } } });
    await tx.order.deleteMany({ where: { storeId: store.id } });

    // ── Productos y sus dependientes ──
    await tx.review.deleteMany({ where: { product: { storeId: store.id } } });
    await tx.publicReview.deleteMany({ where: { storeId: store.id } });
    await tx.favorite.deleteMany({ where: { product: { storeId: store.id } } });
    await tx.product.deleteMany({ where: { storeId: store.id } });

    // ── Consultas y cupones ──
    await tx.lead.deleteMany({ where: { storeId: store.id } });
    await tx.coupon.deleteMany({ where: { storeId: store.id } });

    // ── Carritos abandonados (ya quedaron archivados los pedidos reales; esto
    // es solo el email/carrito capturado en checkout, sin transacción) ──
    await tx.abandonedCart.deleteMany({ where: { storeId: store.id } });

    // ── Campañas push y visitas ──
    await tx.pushCampaign.deleteMany({ where: { storeId: store.id } });
    await tx.storeView.deleteMany({ where: { storeId: store.id } });

    // ── Ruleta: sus premios apuntaban a cupones que acabamos de borrar
    // (couponId queda en null por SetNull) — si el widget siguiera activo,
    // al republicar giraría siempre "sin premio". Se desactiva para que el
    // dueño la reconfigure con premios del nuevo rubro.
    await tx.gamificationWidget.updateMany({
      where: { storeId: store.id },
      data: { isActive: false },
    });

    // ── Feed de actividad y milestones: referencian pedidos/reseñas del
    // ciclo anterior; sin esto el dashboard muestra actividad fantasma ──
    await tx.storeActivityEvent.deleteMany({ where: { storeId: store.id } });
    await tx.storeMilestone.deleteMany({ where: { storeId: store.id } });

    // ── Notificaciones del owner relacionadas al contenido anterior ──
    await tx.notification.deleteMany({
      where: {
        userId: user.id,
        type: { in: ["NEW_ORDER", "ORDER_CONFIRMED", "ORDER_SHIPPED", "ORDER_DELIVERED", "ORDER_CANCELLED", "OUT_OF_STOCK", "LOW_STOCK", "NEW_REVIEW"] },
      },
    });

    // ── Afiliados: goals y clicks (comisiones y saldos ya se borraron arriba) ──
    await tx.affiliateGoal.deleteMany({ where: { storeId: store.id } });
    await tx.affiliateClick.deleteMany({ where: { storeId: store.id } });
    // ── Actualizar tipo + resetear template y contenido visual ──
    // Se conservan: logo, colores, fuente, redes sociales, MercadoPago, verificación
    await tx.store.update({
      where: { id: store.id },
      data: {
        tipoTienda: tipoNuevo,
        tipoTiendaConfigurado: true,
        // Template y config del editor → arrancar de cero (los templates son tipo-específicos)
        templateId: "default",
        storeConfig: "{}",
        previewImage: null,
        // Bloques de página y nav → limpiar (estaban pensados para el tipo anterior)
        pageBlocks: "[]",
        navLinks: "[]",
        // Anuncio → limpiar
        announcementBar: null,
        // Layout de productos → volver al default
        productLayout: "grid3",
        heroStyle: "full",
        // No publicar hasta que el nuevo tipo esté configurado
        isPublished: false,
        // El flag de mayorista se reconfigura desde cero en el nuevo rubro
        // (el nuevo tipo puede no soportarlo; dejar el valor viejo causaría que
        // campos y lógica de mayorista aparezcan en rubros que no corresponden)
        tieneVentaMayorista: false,
      },
    });
    }, { timeout: 20000 });
  } catch (err) {
    if (err instanceof ResetBlockedError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    throw err;
  }

  if (activeAffiliates.length > 0) {
    await createNotificationMany(
      activeAffiliates.map(({ userId }) => ({
        userId,
        type: "STORE_RESET",
        title: "La tienda cambió de rubro",
        body: "El catálogo y el historial de ventas se reiniciaron. Tus comisiones fueron liquidadas antes del cambio y tu link de afiliada sigue activo, pero la tienda va a estar offline hasta que publique su nuevo catálogo.",
        link: "/afiliados",
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
