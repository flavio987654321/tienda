import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import StoreShell from "@/components/store/StoreShell";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { StoreConfig } from "@/types/store-config";
import { DEFAULT_CONFIG } from "@/types/store-config";
import { generosDanFiltro } from "@/lib/generos";
import ComingSoonPage from "./ComingSoonPage";
import ClosedStorePage from "./ClosedStorePage";
import OwnerPreviewBadge from "./OwnerPreviewBadge";
import VisitorBackButton from "./VisitorBackButton";
import PwaInstallBanner from "@/components/store/PwaInstallBanner";
import PwaFadeIn from "@/components/store/PwaFadeIn";
import PWAManager from "@/components/PWAManager";
import { StoreTrackingScripts } from "@/components/store/StoreTrackingScripts";
import { STORE_VERSION } from "@/lib/app-versions";
import { getCurrentUser } from "@/lib/auth-session";
import { isSubscriptionActive } from "@/lib/subscription";
import { documentosPublicados } from "@/lib/politicas-tienda";

export const dynamic = "force-dynamic";

type TiendaPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pago?: string; orden?: string }>;
};

export async function generateMetadata({ params }: TiendaPageProps): Promise<Metadata> {
  const { slug } = await params;

  const store = await prisma.store.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true, description: true, logo: true, tagline: true, storeConfig: true, isPublished: true,
      owner: { select: { subscription: { select: { tier: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true } } } },
    },
  });

  if (!store) return {};

  let seo: StoreConfig["seo"] | undefined;
  try {
    seo = (JSON.parse(store.storeConfig || "{}") as Partial<StoreConfig>).seo;
  } catch { /* config inválida, seguir con los valores de la base */ }

  const baseName = store.name ?? "Tienda";
  const customTitle = seo?.enabled ? seo.title?.trim() : "";
  const customDescription = seo?.enabled ? seo.description?.trim() : "";
  const title = !store.isPublished ? `${baseName} — Próximamente` : (customTitle || baseName);
  const description = !store.isPublished
    ? `${baseName} está preparando algo especial. ¡Volvé pronto!`
    : (customDescription || store.description || store.tagline || `Comprá en ${baseName}`);

  const sub = store.owner?.subscription;
  const isPremium = sub?.tier === "PREMIUM" && sub.status != null && isSubscriptionActive(sub as Parameters<typeof isSubscriptionActive>[0]);

  return {
    title,
    description,
    /* iOS no lee el manifest para esto: el ícono de "Agregar a pantalla de inicio"
       lo saca del `apple-touch-icon` del HTML, y si no hay ninguno usa una captura
       de la página. O sea que hasta acá, en iPhone, la tienda se instalaba con una
       foto borrosa del sitio en vez del logo del comerciante — que es todo lo que
       se vende con esto. 180x180 es la medida que pide iOS.
       `appleWebApp.capable` es lo que hace que arranque en pantalla completa y no
       como un atajo que abre Safari. */
    ...(isPremium
      ? {
          manifest: `/api/manifest/${slug}`,
          icons: {
            apple: [{ url: `/api/icons/tienda/${slug}?size=180&purpose=any`, sizes: "180x180" }],
          },
          appleWebApp: { capable: true, title: baseName, statusBarStyle: "default" as const },
          /* `appleWebApp.capable` emite `mobile-web-app-capable`, que es el nombre
             estándar de hoy —está así en la doc de esta versión de Next, no es un
             descuido—. Lo entiende Safari 17.4+, y de `display: standalone` del
             manifest se encarga iOS 16.4+.
             El prefijado de Apple va igual, a mano, para los iPhone por debajo de
             esas versiones: ahí ninguno de los otros dos aplica y la tienda se
             abriría como un simple marcador de Safari en vez de a pantalla
             completa. Es una línea y cubre los teléfonos viejos, que en Argentina
             no son un caso raro. */
          other: { "apple-mobile-web-app-capable": "yes" },
        }
      : {}),
    openGraph: { title, description, type: "website", siteName: baseName },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TiendaPage({ params, searchParams }: TiendaPageProps) {
  noStore();
  const { slug } = await params;
  const { pago, orden } = await searchParams;

  const [store, currentUser] = await Promise.all([
    prisma.store.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        storeConfig: true,
        isPublished: true,
        closedAt: true,
        name: true,
        logo: true,
        logoColor: true,
        primaryColor: true,
        tagline: true,
        tipoTienda: true,
        tieneVentaMayorista: true,
        mpAccessToken: true,
        ownerId: true,
        isVerified: true,
        policyReturns: true,
        policyShipping: true,
        policyTerms: true,
        policyPrivacy: true,
        policyReturnsActive: true,
        policyShippingActive: true,
        policyTermsActive: true,
        policyPrivacyActive: true,
        verifiedShowName: true,
        verifiedShowCity: true,
        verifiedShowPhone: true,
        verifiedShowSince: true,
        owner: {
          select: {
            name: true,
            city: true,
            phone: true,
            createdAt: true,
            banned: true,
            // El estado, no solo el tier: con `tier` solo, esta query no podía
            // saber si la suscripción estaba viva ni aunque quisiera.
            subscription: {
              select: { tier: true, status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true },
            },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!store) notFound();

  const isOwner = !!currentUser && currentUser.id === store.ownerId;

  // Misma regla que generateMetadata (arriba, en este mismo archivo) y que el
  // manifest y el push: premium es tier + suscripción viva. Antes acá se miraba
  // solo el tier, así que este archivo tenía DOS definiciones de "es premium" con
  // reglas distintas: una vencida seguía mostrando flyers y la campanita de
  // novedades, esta última vacía porque su API sí chequea el estado.
  // `isSubscriptionActive` incluye TRIAL y GRACE, así que durante la gracia sigue
  // andando todo — que es lo que corresponde.
  const sub = store.owner?.subscription;
  const ownerIsPremium =
    sub?.tier === "PREMIUM" && sub.status != null && isSubscriptionActive(sub as Parameters<typeof isSubscriptionActive>[0]);

  // Dueño baneado: la tienda sale de línea para el público, igual que una cerrada.
  // Banear corta el login del dueño pero no tocaba el storefront, así que la tienda
  // de alguien suspendido seguía online y vendiendo. Se muestra la misma pantalla
  // neutra de "no disponible" —al visitante no le incumbe el motivo—. El dueño
  // baneado tampoco puede verla porque `banned` lo deja sin sesión (isOwner = false).
  if (store.owner?.banned) {
    return (
      <ClosedStorePage
        name={store.name}
        logo={store.logo ?? null}
        color={store.logoColor || store.primaryColor || "#6366f1"}
      />
    );
  }

  // Antes que el chequeo de isPublished: cerrar también despublica, así que sin
  // esto una tienda cerrada mostraría "Próximamente" y le mentiría al comprador.
  // La dueña sí puede seguir viéndola, para revisarla antes de reactivar.
  if (store.closedAt && !isOwner) {
    return (
      <ClosedStorePage
        name={store.name}
        logo={store.logo ?? null}
        color={store.logoColor || store.primaryColor || "#6366f1"}
      />
    );
  }

  /* "Próximamente" NO se muestra corriendo en local.
   *
   * Esta puerta existe para que a un comerciante no le vean la tienda a medio
   * armar EN INTERNET. En `npm run dev` no protege de nada: es la misma persona,
   * mirando su propia base, en `localhost`.
   *
   * Lo que sí hacía era dejar los templates sin forma de probarse. Para ver uno
   * como lo ve un cliente hay que estar en una tienda publicada o entrar como
   * dueño, y ninguna tienda publicada usa un template recién hecho — así que un
   * template nuevo sólo se podía mirar en la vista previa. Y la vista previa
   * MIENTE: corre con `editMode`, que apaga todos los clics a propósito para
   * poder editar sin que la pantalla se escape, y varias pantallas se comportan
   * distinto ahí que en la tienda de verdad. Se terminaba probando en producción,
   * que es exactamente lo que no queremos.
   *
   * `NODE_ENV` lo pone Next, no nosotros: en `build` y `start` vale "production"
   * y esta condición se apaga sola. No es una variable que alguien se pueda
   * olvidar prendida en el servidor. */
  const enDesarrollo = process.env.NODE_ENV !== "production";

  if (!store.isPublished && !isOwner && !enDesarrollo) {
    return (
      <ComingSoonPage
        name={store.name}
        logo={store.logo ?? null}
        color={store.logoColor || store.primaryColor || "#6366f1"}
        tagline={store.tagline ?? null}
      />
    );
  }

  const memberSince = store.owner?.createdAt
    ? new Date(store.owner.createdAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    : null;

  /* ── ¿El menú lleva Mujer y Hombre? ─────────────────────────────────────────
   *
   * Se contesta ACÁ, en el servidor, y no en el template. El template lo sabe
   * calcular solo, pero con los productos, y los productos llegan por `fetch`
   * después del primer dibujado. O sea que durante ese rato la respuesta es
   * "no" en todas las tiendas — y tres templates acomodan el menú según esa
   * respuesta. Medido en Amaranta, que sí tiene mujer y hombre: el botón
   * "Categorías" se dibujaba contra la derecha y se corría **382 píxeles** al
   * centro cuando llegaban los productos. Un salto de esos, en la barra de
   * arriba, es lo primero que ve el que entra.
   *
   * Es una consulta más, pero de las baratas: pide la lista de géneros
   * DISTINTOS, o sea a lo sumo tres filas, no el catálogo.
   *
   * El `where` es el mismo que usa `/api/public/[slug]` para decidir qué
   * productos salen —activos, no borrados, y sin los de sólo-mayorista cuando la
   * tienda no vende mayorista—. Tiene que ser el mismo: si el servidor contara
   * productos que el navegador no va a recibir, reservaría lugar para dos
   * botones que después no aparecen.
   *
   * La regla de cuándo el filtro sirve —hace falta mujer Y hombre— no se
   * reescribe acá: sale de `generosDanFiltro`, la misma que usa el template. */
  const generosVisibles = await prisma.product.groupBy({
    by: ["gender"],
    where: {
      storeId: store.id,
      isActive: true,
      deletedAt: null,
      ...(store.tieneVentaMayorista ? {} : { soloMayorista: false }),
    },
  });
  const tieneGeneros = generosDanFiltro(generosVisibles.map(g => g.gender));

  // El try/catch solo protege el parseo del JSON — el JSX de ComingSoonPage
  // se construye después, afuera, para que un eventual error de render no
  // quede (falsamente) capturado por este catch.
  let parsed;
  try {
    parsed = JSON.parse(store.storeConfig || "{}");
  } catch {
    notFound();
  }

  if (!parsed?.template) {
    return (
      <ComingSoonPage
        name={store.name}
        logo={store.logo ?? null}
        color={store.logoColor || store.primaryColor || "#6366f1"}
        tagline={store.tagline ?? null}
      />
    );
  }

  const config: StoreConfig = {
    ...DEFAULT_CONFIG,
    ...parsed,
    storeName: store.name,
    storeId: store.id,
    slug,
    tipoTienda: store.tipoTienda ?? "GENERAL",
    tieneVentaMayorista: store.tieneVentaMayorista ?? false,
    tieneGeneros,
    hasMercadoPago: !!store.mpAccessToken,
    isOwner,
    // Solo las que tienen texto y están en Visible: el pie de página linkea
    // esto y nada más, así que una política vacía o apagada no genera un link
    // que lleva a "esta tienda todavía no publicó sus políticas".
    legales: documentosPublicados(store),
    isVerified: store.isVerified,
    verifiedInfo: {
      showName: store.verifiedShowName, name: store.owner?.name ?? null,
      showCity: store.verifiedShowCity, city: store.owner?.city ?? null,
      showPhone: store.verifiedShowPhone, phone: store.owner?.phone ?? null,
      showSince: store.verifiedShowSince, memberSince,
    },
    // Solo mostrar el flyer si el dueño tiene Premium
    flyerConfig: ownerIsPremium ? parsed.flyerConfig : undefined,
  };

  const splashColor = store.logoColor || store.primaryColor || "#6366f1";

  // Compra recién confirmada (vuelta de MercadoPago o transferencia con
  // donación) — se recalcula acá el monto y el email del comprador desde la
  // base (nunca se confía en datos de la URL), y se verifica que la orden sea
  // de ESTA tienda, para que no se pueda inflar el Pixel de otra tienda
  // pasando cualquier "orden" ajena en la URL.
  let purchase: { eventId: string; value: number; currency: string; emHash?: string } | undefined;
  if (pago === "ok" && orden) {
    const order = await prisma.order.findFirst({
      where: { id: orden, storeId: store.id },
      select: { total: true, buyer: { select: { email: true } } },
    });
    if (order) {
      const emHash = order.buyer.email
        ? createHash("sha256").update(order.buyer.email.trim().toLowerCase()).digest("hex")
        : undefined;
      purchase = { eventId: orden, value: order.total, currency: config.currency, emHash };
    }
  }

  return (
    <>
      {/* Dónde queda la página al entrar desde otra pantalla.

          Al navegar, el router busca a qué elemento llevar el scroll: agarra el
          primero de la pantalla nueva y va probando hermanos hasta encontrar uno
          que sirva. Saltea a propósito los `fixed` y los `sticky` —para no
          quedarse con un nav pegado arriba y creer que ya está viendo el
          contenido— y también los de tamaño cero.

          En una tienda eso descarta TODO lo de arriba: los scripts de
          seguimiento no ocupan lugar, la tapa de la PWA y el banner de instalar
          son `fixed`, y el encabezado del template es `sticky`. Sin ningún
          candidato válido, el router sigue caminando hermanos hasta el final del
          documento y termina eligiendo la barrita de progreso de carga, que vive
          abajo de todo. Resultado: entrabas a una tienda desde el listado y
          aparecías en la mitad de la página.

          Esto le da un candidato de verdad, arriba de todo: 1px absoluto, fuera
          del flujo —no mueve nada ni se ve— y con posición 0. El router lo
          encuentra, ve que ya está a la vista y no scrollea a ningún lado. */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1 }}
      />
      <StoreTrackingScripts
        googleAnalyticsId={config.analytics?.googleAnalyticsId}
        facebookPixelId={config.analytics?.facebookPixelId}
        purchase={purchase}
      />
      <PWAManager appVersion={STORE_VERSION} versionKey="pwa_store_version" disableNotifPrompt />
      <PwaFadeIn />
      {ownerIsPremium && !isOwner && (
        <>
          {/* Chrome dispara beforeinstallprompt apenas considera instalable la
              página, que puede ser antes de que hidrate el banner y enganche su
              listener. Este script corre al parsearse y lo deja guardado para
              que el banner lo encuentre al montar. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaInstallPrompt=e;});",
            }}
          />
          <PwaInstallBanner
            logo={store.logo ?? null}
            name={store.name ?? "Tienda"}
            color={splashColor}
            slug={slug}
          />
        </>
      )}
      <StoreShell
        config={{ ...config, showPushBell: ownerIsPremium && !isOwner }}
        storeId={store.id}
        storeName={store.name ?? "la tienda"}
        storeSlug={slug}
        showPushBell={ownerIsPremium && !isOwner}
      />
      {!isOwner && <VisitorBackButton />}
      {!store.isPublished && isOwner && (
        <OwnerPreviewBadge
          name={store.name}
          logo={store.logo ?? null}
          color={store.logoColor || store.primaryColor || "#6366f1"}
          tagline={store.tagline ?? null}
        />
      )}
    </>
  );
}
