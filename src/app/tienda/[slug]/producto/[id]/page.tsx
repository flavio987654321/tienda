import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { mapProduct, type RawProduct } from "@/lib/productoStorefront";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { isDemoProductId } from "@/lib/demoProducts";
import ComingSoonPage from "../../ComingSoonPage";
import ProductDetailClient from "./ProductDetailClient";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import type { StoreConfig } from "@/types/store-config";
import { documentosPublicados } from "@/lib/politicas-tienda";
import { getCurrentUser } from "@/lib/auth-session";
import { isSubscriptionActive } from "@/lib/subscription";
import { PushBellProvider } from "@/contexts/PushBellContext";
import StorePushBanner from "@/components/store/StorePushBanner";
import {
  construirProductSchema,
  construirBreadcrumbSchema,
  serializarSchema,
  aTextoPlano,
} from "@/lib/structured-data";

type ProductoPageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
};

// Resuelve el producto siempre filtrado por la tienda del slug + activo + no borrado,
// para que no se pueda ver (ni indexar) un producto de otra tienda cambiando el id en la URL.
const findProduct = cache(async (slug: string, id: string) => {
  return prisma.product.findFirst({
    where: { id, isActive: true, deletedAt: null, store: { slug, isActive: true } },
    select: {
      id: true, name: true, description: true, price: true, images: true,
      // ── Lo de estas dos líneas es para el HTML, no para Google ──────────────
      // La ficha se arma ahora también en el servidor, así que hacen falta los
      // mismos campos que usa el navegador para dibujarla. Antes esta consulta
      // traía sólo lo justo para los datos estructurados: el producto se leía de
      // la base, se usaba para el bloque invisible de Google, y se tiraba — el
      // navegador tenía que volver a pedirlo.
      comparePrice: true, precioMayorista: true, cantMinMayorista: true,
      preciosEscalonados: true, soloMayorista: true, cuotas: true,
      subcategory: true, gender: true, reelUrls: true, attributes: true,
      offerBadge: true, offerNote: true,
      // Lo de acá abajo lo usan los datos estructurados (ver `structured-data.ts`).
      // La categoría y la fecha de fin de oferta salen del producto; el precio y
      // el stock por variante deciden si se declara un precio o un rango, y si
      // figura como disponible o agotado.
      category: true, offerEndsAt: true,
      seoTitle: true, seoDescription: true,
      // `id`, `name` y `value` los agrega la ficha, no los datos estructurados:
      // son los que arman los chips de talle y color.
      variants: { select: { id: true, name: true, value: true, price: true, stock: true, sku: true } },
      store: { select: { name: true } },
    },
  });
});

/* ── Qué texto ve Google ─────────────────────────────────────────────────────
   Si la dueña escribió el suyo, manda el suyo. Si no, se arma solo como siempre.
   Las dos funciones están acá arriba y las usan TANTO `generateMetadata` como
   los datos estructurados: si cada uno lo resolviera por su cuenta, un día el
   título de la pestaña y el del bloque de Google dirían cosas distintas —y
   declararle a Google algo que no está en la página es justo lo que penaliza. */
type ProductoConSeo = {
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  store: { name: string };
};

const tituloParaGoogle = (p: ProductoConSeo) =>
  p.seoTitle?.trim() || `${p.name} — ${p.store.name}`;

// La descripción del producto es HTML (editor de texto enriquecido), así que hay
// que aplanarla ANTES de recortar: si no, entraba con las etiquetas puestas —
// "<p style=..."— y encima el corte a 160 caracteres partía una etiqueta al medio.
// La escrita a mano ya es texto plano, pero pasa por lo mismo por las dudas.
const descripcionParaGoogle = (p: ProductoConSeo) =>
  p.seoDescription?.trim() ||
  (p.description ? aTextoPlano(p.description).slice(0, 160).trim() : "") ||
  `Comprá ${p.name} en ${p.store.name}`;

/** Promedio y total de reseñas PUBLICADAS del producto — el mismo cálculo que hace
 *  la API que alimenta la ficha, para que el puntaje que se le declara a Google
 *  sea idéntico al que ve el comprador en pantalla. */
async function findResenas(storeSlug: string, productId: string) {
  const store = await prisma.store.findFirst({ where: { slug: storeSlug }, select: { id: true } });
  if (!store) return { promedio: 0, total: 0 };

  const agregado = await prisma.publicReview.aggregate({
    where: { storeId: store.id, productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return { promedio: agregado._avg.rating ?? 0, total: agregado._count._all };
}

/** Las imágenes vienen como JSON y con dos formas históricas: string suelto o
 *  `{url}`. Se normalizan a URLs absolutas, que es lo único que Google acepta. */
function imagenesAbsolutas(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]") as (string | { url?: string })[];
    return parsed
      .map((img) => (typeof img === "string" ? img : img?.url ?? ""))
      .filter((u) => u.startsWith("http"));
  } catch {
    return [];
  }
}

/* ── ¿Esta tienda está tapada para quien mira? ────────────────────────────────
 *
 * Es la MISMA regla que aplica la portada, y está acá porque esta pantalla no la
 * aplicaba: en una tienda sin publicar, la portada, el catálogo, `/contacto` y
 * `/nosotros` mostraban "PRÓXIMAMENTE" y la ficha de producto se veía ENTERA —
 * con el precio, y con el bloque de datos estructurados para Google.
 *
 * O sea que la dueña que todavía no abrió tenía igual su mercadería a la vista
 * para cualquiera con el link. Medido el 25/08/26 sobre la base de producción,
 * eran 4 fichas en 2 tiendas, las dos de prueba nuestras — pero el flujo normal
 * es cargar los productos y DESPUÉS publicar, así que se arma sola en cuanto
 * entre gente de verdad.
 *
 * Los tres pedazos de la regla, y por qué cada uno:
 *   · `isPublished`  — lo que la dueña decidió.
 *   · `isOwner`      — ella tiene que poder ver su propia tienda antes de abrir.
 *   · `enDesarrollo` — en local se ve todo, que es como se prueban los templates
 *                      sin tener que publicar una tienda. `NODE_ENV` lo pone
 *                      Next: en `build`/`start` vale "production" y esto se
 *                      apaga solo, no es una variable que alguien se olvide.
 *
 * Escrita una vez y usada por `generateMetadata` y por la página: si cada una
 * decidiera por su cuenta, la etiqueta y el contenido podrían contestar cosas
 * distintas — y la etiqueta es justo la que se ve en la previa de WhatsApp.
 */
const tiendaTapada = cache(async (slug: string) => {
  const [store, currentUser] = await Promise.all([
    prisma.store.findFirst({
      where: { slug, isActive: true },
      select: {
        ownerId: true, isPublished: true,
        name: true, logo: true, logoColor: true, primaryColor: true, tagline: true,
      },
    }),
    getCurrentUser(),
  ]);
  if (!store) return { tapada: false, isOwner: false, store: null };
  const isOwner = !!currentUser && currentUser.id === store.ownerId;
  const enDesarrollo = process.env.NODE_ENV !== "production";
  /* `isOwner` sale de acá y no se vuelve a calcular en ningún otro lado de este
     archivo: `getCurrentUser()` es una llamada a Supabase MÁS una consulta a la
     base, y calculándolo dos veces se paga dos veces por visita — en la página
     que más se comparte, y para gente que en su mayoría ni sesión tiene. */
  return { tapada: !store.isPublished && !isOwner && !enDesarrollo, isOwner, store };
});

export async function generateMetadata({ params, searchParams }: ProductoPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const { from } = await searchParams;
  // Los productos demo del editor no existen en la base — no hay metadata real que generar.
  if (from === "editor" && isDemoProductId(id)) return {};

  /* Tienda sin abrir: la etiqueta no puede contar el producto.
     Sin esto, la página decía "Próximamente" pero la etiqueta seguía mandando el
     nombre, la descripción y la FOTO — así que pegando el link en un chat, la
     previa mostraba la mercadería igual. El arreglo de la página sin éste queda
     a medias, porque la previa es lo que la gente ve primero.
     Va con `noindex`, que la portada no necesita —"Próximamente" con el nombre de
     la marca es una página razonable— pero una dirección de producto que todavía
     no existe para nadie no tiene ningún motivo para estar en Google. */
  const { tapada, store: tienda } = await tiendaTapada(slug);
  if (tapada) {
    const nombre = tienda?.name ?? "Tienda";
    return {
      title: `${nombre} — Próximamente`,
      description: `${nombre} está preparando algo especial. ¡Volvé pronto!`,
      robots: { index: false, follow: false },
      openGraph: { title: `${nombre} — Próximamente`, type: "website", siteName: nombre },
    };
  }

  const product = await findProduct(slug, id);
  if (!product) return {};

  const title = tituloParaGoogle(product);
  const description = descripcionParaGoogle(product);
  let image: string | undefined;
  try {
    const images = JSON.parse(product.images || "[]");
    const first = images[0];
    image = typeof first === "string" ? first : first?.url;
  } catch {}

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

async function findStoreConfig(slug: string) {
  /* Las dos JUNTAS y no una después de la otra: quién está mirando no depende de
     qué tienda es, así que esperar la primera para recién arrancar la segunda le
     suma el tiempo de una a la otra. Y ésta es la página que más se comparte —la
     que abre alguien desde WhatsApp, muchas veces con datos móviles— así que cada
     viaje de ida y vuelta que se ahorra se nota.

     La segunda no vuelve a preguntar quién mira: `tiendaTapada` ya lo resolvió y
     va con `cache`, así que esto es la MISMA respuesta y no un pedido nuevo. */
  const [store, { isOwner }] = await Promise.all([
    prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      storeConfig: true, tipoTienda: true,
      // Los links legales del pie: si sólo los resolviera el pedido del
      // navegador, el pie saldría sin ellos en el HTML inicial y aparecerían
      // recién al hidratar — invisibles para Google, igual que le pasaba a la
      // ficha entera antes de que el producto se resolviera también acá.
      policyReturns: true, policyShipping: true, policyTerms: true, policyPrivacy: true,
      policyReturnsActive: true, policyShippingActive: true,
      policyTermsActive: true, policyPrivacyActive: true,
      /* ── Lo de acá abajo es para la BARRA de arriba ─────────────────────────
         Esta pantalla dibujaba una barra recortada: la marca, "Catálogo" y el
         carrito, y nada más. Se justificaba con que "quien está mirando un
         producto ya eligió", y es al revés: ésta es justo la dirección que la
         dueña comparte por WhatsApp y la que devuelve Google, o sea la primera
         que ve alguien que todavía no le compró nunca. Medido en el navegador,
         entrando por el link se perdían la barra de anuncios, Categorías,
         Nosotros, Contacto, el buscador, favoritos, "Entrar", el sello de
         verificada y la bajada del logo — todo lo que sí ve quien entró por la
         portada, aunque la dirección sea idéntica.
         Nada de esto viajaba hasta acá, por eso la barra no podía dibujarlo. */
      id: true, ownerId: true,
      isVerified: true,
      verifiedShowName: true, verifiedShowCity: true,
      verifiedShowPhone: true, verifiedShowSince: true,
      owner: {
        select: {
          name: true, city: true, phone: true, createdAt: true,
          subscription: { select: { tier: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true } },
        },
      },
    },
    }),
    tiendaTapada(slug),
  ]);
  const legales = documentosPublicados(store);
  const tipoTienda = store?.tipoTienda ?? null;

  /* La MISMA regla de "es premium" que la portada: tier + suscripción viva.
     Escrita distinta, la campanita aparecería en una pantalla y no en la otra
     para la misma tienda — que es exactamente el bug que este archivo viene a
     cerrar, sólo que al revés. */
  const sub = store?.owner?.subscription;
  const ownerIsPremium =
    sub?.tier === "PREMIUM" && sub.status != null && isSubscriptionActive(sub as Parameters<typeof isSubscriptionActive>[0]);

  const memberSince = store?.owner?.createdAt
    ? new Date(store.owner.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : null;

  const barra = {
    storeId: store?.id ?? null,
    isOwnerInicial: isOwner,
    showPushBell: ownerIsPremium && !isOwner,
    isVerified: store?.isVerified ?? false,
    verifiedInfo: {
      showName: store?.verifiedShowName ?? false, name: store?.owner?.name ?? null,
      showCity: store?.verifiedShowCity ?? false, city: store?.owner?.city ?? null,
      showPhone: store?.verifiedShowPhone ?? false, phone: store?.owner?.phone ?? null,
      showSince: store?.verifiedShowSince ?? false, memberSince,
    },
  };

  try {
    const parsed: Partial<StoreConfig> = JSON.parse(store?.storeConfig || "{}");
    return {
      analytics: parsed.analytics, currency: parsed.currency || "ARS",
      template: parsed.template ?? null, legales, tipoTienda, ...barra,
      promoBanner: parsed.promoBanner ?? null,
      /* La bajada del logo ("TIENDA ONLINE") es un texto que la dueña puede
         cambiar, y vive en los overrides como cualquier otro. Se lee sólo el
         TEXTO: el resto del override (color, tamaño, tipografía) lo aplica
         `EditableZone`, que necesita el contexto del editor y en esta ruta no
         existe. Si lo apagó, no se dibuja. */
      navTagline: parsed.textOverrides?.navTagline?.hidden
        ? "" : (parsed.textOverrides?.navTagline?.text ?? null),
      storeNameOverride: parsed.textOverrides?.storeName?.text ?? null,
    };
  } catch {
    return {
      analytics: undefined, currency: "ARS" as const,
      template: null, legales, tipoTienda, ...barra,
      promoBanner: null, navTagline: null, storeNameOverride: null,
    };
  }
}

export default async function ProductoPage({ params, searchParams }: ProductoPageProps) {
  noStore();
  const { slug, id } = await params;
  const { from } = await searchParams;

  /* Tienda sin abrir: la misma pantalla que da la portada, y ANTES que nada.
     Va antes de buscar el producto y antes de armar los datos estructurados a
     propósito: lo que no se resuelve no se puede filtrar por accidente. Es
     también la razón de que el JSON-LD quede afuera — se armaba más abajo y se
     mandaba igual, o sea que se le declaraba a Google un producto de una tienda
     que todavía no abrió. */
  const { tapada, store: tienda } = await tiendaTapada(slug);
  if (tapada && tienda) {
    return (
      <ComingSoonPage
        name={tienda.name}
        logo={tienda.logo ?? null}
        color={tienda.logoColor || tienda.primaryColor || "#6366f1"}
        tagline={tienda.tagline ?? null}
      />
    );
  }

  // Los productos demo del editor (ej. "hogar-2") nunca existen en la base —
  // se resuelven en el cliente con datos de muestra en vez de buscarlos ahí.
  const isEditorDemo = from === "editor" && isDemoProductId(id);
  let product: Awaited<ReturnType<typeof findProduct>> = null;
  if (!isEditorDemo) {
    product = await findProduct(slug, id);
    if (!product) notFound();
  }

  const {
    analytics, currency, template, legales, tipoTienda,
    storeId, isOwnerInicial, showPushBell, isVerified, verifiedInfo,
    promoBanner, navTagline, storeNameOverride,
  } = await findStoreConfig(slug);

  // ── Datos estructurados ────────────────────────────────────────────────────
  // Sólo para productos REALES: los demo del editor no existen para nadie más y
  // marcarlos sería declararle a Google un producto que no se puede comprar.
  let schemas: string[] = [];
  if (product) {
    const resenas = await findResenas(slug, product.id);
    const tienda = { nombre: product.store.name, slug };
    schemas = [
      serializarSchema(
        construirProductSchema(
          {
            id: product.id,
            name: product.name,
            // La MISMA descripción que la metadata, resuelta con la misma
            // función. Si acá fuera la del producto y arriba la escrita a mano,
            // el bloque estructurado y la etiqueta <meta> dirían cosas distintas.
            description: descripcionParaGoogle(product),
            price: product.price,
            category: product.category,
            images: imagenesAbsolutas(product.images),
            offerEndsAt: product.offerEndsAt,
            variants: product.variants,
          },
          tienda,
          currency,
          resenas
        )
      ),
      serializarSchema(construirBreadcrumbSchema({ id: product.id, name: product.name }, tienda)),
    ];
  }

  return (
    <>
      {/* Va en el HTML del servidor, no desde el cliente: el robot de Google lee
          la respuesta inicial, y un bloque agregado después con JavaScript se lo
          puede perder. `dangerouslySetInnerHTML` es la forma que documenta React
          para JSON-LD — el contenido está escapado en `serializarSchema`. */}
      {schemas.map((json, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      ))}
      <StoreTrackingScripts
        googleAnalyticsId={analytics?.googleAnalyticsId}
        facebookPixelId={analytics?.facebookPixelId}
        viewContent={product ? { contentId: product.id, value: product.price, currency } : undefined}
      />
      {/* `productoInicial` es lo que arregla el SEO de esta pantalla.
          Antes acá iba sólo `slug` y `productId`: el HTML que salía del servidor
          no tenía ni el nombre ni el precio, y el navegador pedía todo después.
          Google leía esa página vacía —o el cartel de "Producto no disponible"
          si no llegaba a esperar el pedido— y eso fue lo que quedó indexado.
          El dato ya estaba acá: se usaba para el bloque de datos estructurados y
          se descartaba. */}
      {/* El MISMO envoltorio que la portada (ver `StoreShell`).
          Sin él, `usePushBell()` devuelve null en toda esta rama y los dos
          botones de la barra —seguir la tienda y la campanita— no se pueden
          dibujar. `StorePushBanner` va porque es quien dibuja el cajón de
          novedades: sin él la campanita abriría la nada.
          `enabled` decide si se conecta a nada: en una tienda sin Plan Plus el
          proveedor queda inerte, igual que en la portada. */}
      <PushBellProvider storeId={storeId ?? ""} storeSlug={slug} enabled={showPushBell}>
        {showPushBell && <StorePushBanner storeName={product?.store.name ?? "la tienda"} />}
        <ProductDetailClient
          slug={slug}
          productId={id}
          productoInicial={product ? mapProduct(product as RawProduct) : null}
          templateInicial={template}
          legalesInicial={legales}
          tipoTiendaInicial={tipoTienda}
          storeIdInicial={storeId}
          isOwnerInicial={isOwnerInicial}
          showPushBell={showPushBell}
          isVerified={isVerified}
          verifiedInfo={verifiedInfo}
          promoBanner={promoBanner}
          navTagline={navTagline}
          storeNameInicial={storeNameOverride || product?.store.name || null}
          esEditor={from === "editor"}
        />
      </PushBellProvider>
    </>
  );
}
