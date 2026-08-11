import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import { documentosPublicados } from "@/lib/politicas-tienda";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const withSales = searchParams.get("withSales") === "1";
  const now = new Date();

  const [store, currentUser] = await Promise.all([
    prisma.store.findFirst({
      where: { slug, isActive: true },
      include: {
        // Promociones vigentes de la tienda (StorePromotion). Solo los campos que
        // el motor de precios necesita; la vigencia (fecha/activa/archivada) se
        // filtra acá. El precio real lo recalcula el checkout releyendo la base.
        promotions: {
          where: {
            isActive: true,
            archivedAt: null,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
          select: {
            type: true, value: true, minQty: true, payQty: true, minOrderAmount: true,
            scope: true, categories: true, productIds: true, combinesWithCoupons: true,
            // `name` y `eventLabel` no los usa el motor de precios: van para que
            // la tienda pueda mostrar de qué promo/evento se trata (tag, banner,
            // filtro) sin pedir otra vez al servidor.
            name: true, eventLabel: true, endsAt: true,
          },
        },
        products: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            comparePrice: true,
            featured: true,
            viewCount: true,
            precioMayorista: true,
            cantMinMayorista: true,
            preciosEscalonados: true,
            soloMayorista: true,
            offerBadge: true,
            offerNote: true,
            offerEndsAt: true,
            cuotas: true,
            images: true,
            category: true,
            subcategory: true,
            reelUrls: true,
            gender: true,
            attributes: true,
            createdAt: true,
            variants: {
              select: { id: true, name: true, value: true, stock: true, price: true },
              orderBy: { id: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        },
      },
    }),
    getCurrentUser(),
  ]);
  if (!store) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const isOwner = !!currentUser && currentUser.id === store.ownerId;
  const hasMercadoPago = !!store.mpAccessToken;

  // ── Lo que NO puede salir de acá ────────────────────────────────────────────
  //
  // Este endpoint es público: no pide sesión y devuelve la fila entera de la
  // tienda con `include`, o sea que TODA columna nueva de `Store` sale al
  // navegador de cualquier visitante salvo que alguien se acuerde de agregarla
  // a esta lista. Así fue como pasó: la lista tenía los tokens de Mercado Pago
  // y la dirección de despacho —lo que existía cuando se escribió— y los de
  // Meta y Google, que llegaron después, nunca se agregaron.
  //
  // Verificado contra la base: había un `fbAccessToken`, un `gaRefreshToken` y
  // dos `tcOwnerAcceptedIp` viajando en respuestas públicas. Los dos tokens
  // salen cifrados (`encryptToken`), así que no servían para tomar la cuenta de
  // nadie; la IP no, esa es el domicilio de conexión del dueño en limpio.
  //
  // `campos-publicos.check.ts` recorre el schema y falla si aparece una columna
  // nueva que parezca sensible y no esté acá, para que la próxima no dependa de
  // que alguien se acuerde.
  const {
    // Credenciales de terceros (van cifradas, pero cifrado no es motivo para publicarlas).
    mpAccessToken, mpRefreshToken,
    fbAccessToken, gaRefreshToken,
    // Identificadores de las cuentas conectadas del dueño.
    mpSellerId, fbUserId, fbBusinessId, fbCatalogId, fbFeedId, fbWabaId, gaAccountId, gaPropertyId,
    // Dirección física de despacho: se usa server-side para cotizar el envío.
    originStreet, originCity, originProvince, originPostalCode,
    // La IP desde la que el dueño aceptó los términos. Dato personal suyo, y no
    // le sirve absolutamente para nada a quien está mirando la tienda.
    tcOwnerAcceptedIp,
    ...safeStore
  } = store;
  void mpAccessToken; void mpRefreshToken; void fbAccessToken; void gaRefreshToken;
  void mpSellerId; void fbUserId; void fbBusinessId; void fbCatalogId; void fbFeedId;
  void fbWabaId; void gaAccountId; void gaPropertyId;
  void originStreet; void originCity; void originProvince; void originPostalCode;
  void tcOwnerAcceptedIp;

  // Productos marcados como "solo mayorista" no deben enviarse al navegador de
  // visitantes de tiendas que no tienen venta mayorista habilitada.
  // El filtrado ocurre AQUÍ en el servidor, nunca en el cliente, para que el
  // dato nunca viaje al navegador de un comprador retail.
  const visibleProducts = store.tieneVentaMayorista
    ? store.products
    : store.products.filter((p) => !p.soloMayorista);

  // Qué políticas legales linkea el pie de la ficha de producto. Se calcula acá
  // —con la misma función que la tienda y el mail— para que el navegador no
  // tenga que repetir la regla de "texto y además activa".
  const legales = documentosPublicados(store);

  // Ranking de ventas — solo se calcula cuando se pide explícitamente (ej: panel de afiliadas)
  // para no sumar una consulta extra en cada visita normal de un comprador a la tienda.
  if (!withSales) return NextResponse.json({ store: { ...safeStore, products: visibleProducts }, isOwner, hasMercadoPago, legales });

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const visibleProductIds = visibleProducts.map((p) => p.id);
  const salesAgg = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: visibleProductIds },
      order: {
        storeId: store.id,
        status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA },
        createdAt: { gte: ninetyDaysAgo },
      },
    },
    _sum: { quantity: true },
  });
  const salesMap = Object.fromEntries(salesAgg.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const storeWithSales = {
    ...safeStore,
    products: visibleProducts
      .map((p) => ({ ...p, salesCount: salesMap[p.id] ?? 0 }))
      .sort((a, b) => b.salesCount - a.salesCount),
  };

  return NextResponse.json({ store: storeWithSales, isOwner, hasMercadoPago, legales });
}
