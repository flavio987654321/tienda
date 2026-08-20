import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import { documentosPublicados } from "@/lib/politicas-tienda";

/**
 * Lo único que sale de acá.
 *
 * ── Por qué una lista blanca y no una de exclusiones ─────────────────────────
 * Antes esto era un `include` con un destructuring que sacaba lo sensible. El
 * problema no era la lista —estaba bien escrita— sino la dirección: con
 * exclusiones, **el default de una columna nueva es ser pública**. Cualquiera
 * que agregue un campo a `Store` lo publica sin querer, y solo no pasa si se
 * acuerda de venir a este archivo. Ya falló una vez: la lista tenía los tokens
 * de Mercado Pago porque eran los que existían cuando se escribió, y los de Meta
 * y Google, que llegaron después, salieron a la calle.
 *
 * Dado vuelta, agregar una columna no publica nada. Para que se vea hay que
 * escribirla acá, que es justo el momento en que uno se pregunta si debería.
 *
 * ── Por qué la lista es generosa y no mínima ─────────────────────────────────
 * La tienda pública consume seis campos: `id`, `name`, `products`, `promotions`,
 * `storeConfig` y `tipoTienda`. Todo lo demás que muestra —colores, tipografía,
 * banner, redes— lo saca del JSON de `storeConfig`, no de estas columnas.
 *
 * Aun así quedan acá todas las columnas de presentación. Recortar a seis sería
 * apostar a que el grep encontró todos los usos, y el precio de equivocarse es
 * un template que se rompe sin avisar. Estas son públicas por naturaleza: son lo
 * que la tienda le muestra a cualquiera que la abra. Lo que se gana no es
 * esconderlas, es que la puerta esté cerrada por defecto.
 */
const CAMPOS_PUBLICOS = {
  id: true, slug: true, name: true, description: true, tagline: true,

  // Identidad visual
  logo: true, logoColor: true, banner: true, previewImage: true,
  primaryColor: true, secondaryColor: true, accentColor: true, fontFamily: true,
  backgroundStyle: true, buttonStyle: true, cardHover: true, cardRadius: true,
  cardShadow: true, heroStyle: true, navbarStyle: true, productLayout: true,

  // Estructura de la página
  announcementBar: true, announcementBarColor: true, navLinks: true,
  pageBlocks: true, storeConfig: true,
  footerText: true, footerDescription: true, footerShowLegal: true,

  // Contacto y redes
  facebookUrl: true, instagramUrl: true, tiktokUrl: true,
  whatsappNumber: true, showWhatsappButton: true,

  // Buscadores
  seoTitle: true, seoDescription: true, customDomain: true,

  // Cómo se muestran los precios
  currency: true, showPrices: true, showRatings: true, showStock: true,
  tieneVentaMayorista: true, acceptsRewardCoupons: true, affiliatesEnabled: true,

  // Qué tipo de tienda es y en qué estado está
  templateId: true, tipoTienda: true, tipoTiendaConfigurado: true,
  isActive: true, isPublished: true, closedAt: true,

  // El sello de verificación y qué eligió mostrar el dueño
  isVerified: true, verifiedShowName: true, verifiedShowCity: true,
  verifiedShowPhone: true, verifiedShowSince: true,

  // Las políticas legales y cuándo se tocaron por última vez
  policyReturns: true, policyShipping: true, policyTerms: true, policyPrivacy: true,
  policyReturnsActive: true, policyShippingActive: true,
  policyTermsActive: true, policyPrivacyActive: true,
  policiesUpdatedAt: true,

  createdAt: true, updatedAt: true,
} as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const withSales = searchParams.get("withSales") === "1";
  const now = new Date();

  const [store, currentUser] = await Promise.all([
    prisma.store.findFirst({
      where: { slug, isActive: true },
      select: {
        ...CAMPOS_PUBLICOS,

        // Los dos que se usan acá adentro y NO se devuelven: `ownerId` para saber
        // si el que mira es el dueño, y `mpAccessToken` para decir si la tienda
        // cobra con Mercado Pago. Al navegador van como `isOwner` y
        // `hasMercadoPago`, que es todo lo que necesita.
        ownerId: true,
        mpAccessToken: true,

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

  // Los dos internos se sacan de la respuesta. El resto ya está filtrado por
  // `CAMPOS_PUBLICOS`: lo que no está ahí arriba nunca se leyó de la base.
  const { ownerId: _ownerId, mpAccessToken: _mpAccessToken, ...safeStore } = store;
  void _ownerId; void _mpAccessToken;

  /* ── Tienda que su dueño todavía no publicó ────────────────────────────────
     El mismo corte que ya hace la página en `/tienda/[slug]` ("Próximamente"
     salvo que mire el dueño), que acá faltaba: `isPublished` se devolvía como
     dato pero no filtraba nada. O sea que la pantalla tapaba la tienda y esta
     API la entregaba entera igual — catálogo, precios y promociones — a
     cualquiera que supiera el slug, que se deduce del nombre del comercio.

     Se devuelve la tienda igual, no un 404: la portada de "Próximamente" usa el
     nombre, el logo y los colores para verse como la tienda. Lo que se vacía es
     lo que todavía no salió a la venta. */
  if (!safeStore.isPublished && !isOwner) {
    return NextResponse.json({
      store: { ...safeStore, products: [], promotions: [] },
      isOwner: false,
      hasMercadoPago,
      legales: documentosPublicados(store),
    });
  }

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

  // Ranking de ventas — solo se calcula cuando se pide explícitamente (ej: panel de afiliados)
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
