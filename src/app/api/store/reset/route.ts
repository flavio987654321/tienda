import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { createNotificationMany } from "@/lib/notifications";
import { fetchStoreOrdersForArchive, fetchStoreCouponsForArchive, fetchStoreWalletsForArchive, fetchStorePromotionsForArchive } from "@/lib/storeArchive";
import { STORE_TYPES } from "@/lib/storeTypes";
import { checkRateLimit } from "@/lib/rate-limit";
import { stripDesignConfig } from "@/lib/store-config";

// Bloqueo de negocio detectado dentro de la transacción → se traduce a 409.
// El code le permite al modal ofrecer el botón de acción correcto.
class ResetBlockedError extends Error {
  constructor(
    readonly code:
      | "UNRESOLVED_ORDERS"
      | "UNCLAIMED_PRIZES"
      | "PENDING_COMMISSIONS"
      | "LIVE_COUPONS"
      | "LIVE_PROMOTIONS",
    message: string
  ) {
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

    // ── Ofertas vivas ──
    // Una promo o un cupón que un cliente puede usar AHORA es una oferta que ya
    // está en la calle: la ley obliga a quien la emite (art. 7, Ley 24.240).
    // Archivarla no le sirve de nada al comprador — el cupón deja de existir y
    // el reclamo sigue en pie. Peor si el rubro nuevo es AUTOS, donde Cupones y
    // Promociones ni aparecen en el panel: la dueña se quedaría sin la pantalla
    // para verlos. Así que en vez de borrarlas calladas, se frena el cambio y
    // ella decide darlas de baja.
    //
    // Solo bloquea lo que un cliente puede usar hoy: apagadas, vencidas,
    // agotadas y archivadas no frenan nada (igual se borran más abajo).
    const now = new Date();

    // winnerEmail: null → los premios ya ganados tienen su propio bloqueo arriba,
    // con otra salida (esos no los puede dar de baja ella sin sacarle algo a alguien).
    const ownCoupons = await tx.coupon.findMany({
      where: {
        storeId: store.id,
        winnerEmail: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { code: true, usedCount: true, maxUses: true },
    });
    // Agotado = ya nadie más lo puede usar. Se compara en JS porque son dos
    // columnas y Prisma no lo expresa en un where.
    const usableCoupons = ownCoupons.filter((c) => c.maxUses == null || c.usedCount < c.maxUses);
    if (usableCoupons.length > 0) {
      const muestra = usableCoupons.slice(0, 3).map((c) => c.code).join(", ");
      throw new ResetBlockedError(
        "LIVE_COUPONS",
        `Tenés ${usableCoupons.length} cupón${usableCoupons.length > 1 ? "es" : ""} que tus clientes todavía pueden usar (${muestra}${usableCoupons.length > 3 ? "…" : ""}). Si cambiás de rubro dejan de funcionar y quien los tenga te los va a reclamar igual. Desactivalos o eliminalos desde Cupones antes de seguir.`
      );
    }

    const livePromotions = await tx.storePromotion.count({
      where: {
        storeId: store.id,
        archivedAt: null,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
    });
    if (livePromotions > 0) {
      throw new ResetBlockedError(
        "LIVE_PROMOTIONS",
        `Tenés ${livePromotions} promoción${livePromotions > 1 ? "es" : ""} aplicándose en tu tienda ahora mismo. Si cambiás de rubro se dan de baja y quien la haya visto anunciada te la puede reclamar. Archivalas desde Promociones antes de seguir.`
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
    const promotionsToArchive = await fetchStorePromotionsForArchive(tx, store.id);

    const totalFacturado = ordersToArchive
      .filter((o) => o.payment?.status === "APPROVED")
      .reduce((sum, o) => sum + o.total, 0);

    await tx.storeArchive.create({
      data: {
        storeId: store.id,
        tipoTiendaAnterior: store.tipoTienda,
        ordersCount: ordersToArchive.length,
        totalFacturado,
        data: JSON.stringify({ orders: ordersToArchive, coupons: couponsToArchive, wallets: walletsToArchive, promotions: promotionsToArchive }),
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

    // ── Promociones de tienda ──
    // Sin esto sobreviven al cambio de rubro, y las de alcance ALL ("20% OFF en
    // todo") se aplican solas al catálogo nuevo: la dueña pasa de ropa a autos y
    // sus autos salen con descuento sin haber tocado nada. Las de alcance por
    // producto quedan además apuntando a ids que ya no existen.
    // No hay FK contra Product (productIds es un JSON string), así que el borrado
    // de productos de arriba no las arrastra: hay que borrarlas explícitamente.
    await tx.storePromotion.deleteMany({ where: { storeId: store.id } });

    // ── Carritos abandonados (ya quedaron archivados los pedidos reales; esto
    // es solo el email/carrito capturado en checkout, sin transacción) ──
    await tx.abandonedCart.deleteMany({ where: { storeId: store.id } });

    // ── Campañas push y visitas ──
    await tx.pushCampaign.deleteMany({ where: { storeId: store.id } });
    await tx.storeView.deleteMany({ where: { storeId: store.id } });
    // El origen de esas mismas visitas. Si quedara, la tienda arrancaría de cero
    // con un desglose de "de dónde vinieron" que ya no le corresponde a nadie.
    await tx.storeViewSource.deleteMany({ where: { storeId: store.id } });

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
        // `storeConfig` no es solo el diseño: acá adentro también viven el CBU,
        // los envíos y las integraciones. Escribir "{}" —como se hacía antes—
        // le borraba a la dueña sus datos de cobro y la conexión de Analytics
        // por cambiar de rubro, cosas que no dependen del rubro: su banco es el
        // mismo si pasa de ropa a autos. Se resetea solo el diseño.
        storeConfig: stripDesignConfig(store.storeConfig),
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
