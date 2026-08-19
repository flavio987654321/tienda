import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription, hasActivePremium } from "@/lib/subscription";
import { hasDesign } from "@/lib/store-config";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import DangerZone from "@/app/dashboard/configuracion/DangerZone";
import ConfiguracionShell, { type SeccionConfig } from "./ConfiguracionShell";
import { DescripcionCard, SubdominioCard, AppCard, DominioCard, FlyerCard, PushCard } from "./AjustesClient";
import { WhatsappCard, RedesCard, MonedaCard, SeoCard } from "./PreferenciasCards";
import LogoUploadCard from "@/components/LogoUploadCard";
import ArchiveDownloadCard from "./ArchiveDownloadCard";

// La conexión con MercadoPago vive en /dashboard/pagos, junto al resto de los
// medios de cobro (transferencia, efectivo). Acá quedan identidad, presencia y
// opciones de cuenta.
type Props = { searchParams: Promise<{ s?: string }> };

export default async function AjustesPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;
  if (user.role !== "OWNER") redirect("/dashboard");

  const [sub, store] = await Promise.all([
    getUserSubscription(user.id),
    prisma.store.findUnique({
      where: { ownerId: user.id },
      select: {
        id: true, slug: true, customDomain: true,
        name: true, logo: true, logoColor: true, primaryColor: true, description: true,
        tipoTienda: true, storeConfig: true, pageBlocks: true,
      },
    }),
  ]);

  const [pendingAffiliateCount, lowStockCount] = store
    ? await Promise.all([
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.product.count({ where: { storeId: store.id, deletedAt: null, variants: { every: { stock: 0 } } } }),
      ])
    : [0, 0];

  // Respaldos de ciclos anteriores (se crean al cambiar de rubro)
  const archives = store
    ? await prisma.storeArchive.findMany({
        where: { storeId: store.id },
        select: { id: true, createdAt: true, tipoTiendaAnterior: true, ordersCount: true, totalFacturado: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Vigente, no solo Premium: esta pantalla ofrece conectar el dominio propio, y
  // el endpoint que lo hace ahora exige la suscripción al día. Sin esto, el botón
  // se mostraba y después rebotaba.
  const isPremium = hasActivePremium(sub);

  /* Las preferencias viven en el mismo blob JSON que el diseño, así que se leen
     de ahí. Un config ilegible no puede dejar la pantalla en blanco: se cae a los
     valores de fábrica y el dueño puede volver a cargarlos. */
  const cfg = (() => {
    try {
      const parsed: unknown = JSON.parse(store?.storeConfig || "{}");
      return (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    } catch { return {} as Record<string, unknown>; }
  })();
  const whatsappInicial = {
    enabled: false, number: "", message: "",
    ...(cfg.whatsapp as object | undefined),
  } as { enabled: boolean; number: string; message?: string };
  const redesIniciales = (cfg.socialLinks ?? {}) as Record<string, string>;
  const monedaInicial = cfg.currency === "USD" ? "USD" as const : "ARS" as const;
  const seoInicial = {
    enabled: false, title: "", description: "",
    ...(cfg.seo as object | undefined),
  } as { enabled: boolean; title: string; description: string };

  /* Los ajustes ya no van en una sola tirada vertical. Eran nueve tarjetas
     seguidas —de "Logo" hasta "Eliminar mis datos permanentemente"— sin títulos
     que las separaran ni forma de saltar: para tocar el dominio había que pasar
     por delante de todo, y la zona de peligro caía al final del mismo scroll por
     el que venías bajando sin pensar. Cada sección es ahora una entrada del menú
     lateral, y las de un mismo `grupo` salen juntas y en este orden. */
  const secciones: SeccionConfig[] = [
    {
      id: "tienda",
      grupo: "Tu tienda",
      label: "Identidad",
      descripcion: "El logo y la descripción con los que tu tienda se presenta.",
      claves: ["logo", "imagen", "descripcion", "nombre", "marca", "flyer", "publicidad"],
      contenido: (
        <>
          {store && (
            <LogoUploadCard
              storeName={store.name}
              initialLogo={store.logo}
              initialLogoColor={store.logoColor}
              primaryColor={store.primaryColor}
              isPremium={isPremium}
            />
          )}
          <DescripcionCard description={store?.description ?? ""} tipoTienda={store?.tipoTienda} />
          <FlyerCard isPremium={isPremium} />
        </>
      ),
    },
    {
      id: "web",
      grupo: "Tu tienda",
      label: "Dirección web",
      descripcion: "Dónde encuentran tu tienda tus clientes y tus afiliados.",
      claves: ["url", "link", "dominio", "subdominio", "dns", "www", "direccion"],
      contenido: (
        <>
          <SubdominioCard slug={store?.slug ?? ""} />
          <DominioCard customDomain={store?.customDomain ?? null} isPremium={isPremium} />
        </>
      ),
    },
    {
      id: "contacto",
      grupo: "Tu tienda",
      label: "Contacto y redes",
      descripcion: "Por dónde te escriben tus clientes y dónde te siguen.",
      claves: ["whatsapp", "telefono", "numero", "instagram", "facebook", "tiktok", "youtube", "pinterest", "redes", "social"],
      contenido: (
        <>
          <WhatsappCard inicial={whatsappInicial} />
          <RedesCard inicial={redesIniciales} />
        </>
      ),
    },
    {
      id: "ventas",
      grupo: "Tu tienda",
      label: "Ventas",
      descripcion: "Cómo se muestran los precios en tu tienda.",
      claves: ["moneda", "peso", "dolar", "ars", "usd", "precio", "precios"],
      contenido: <MonedaCard inicial={monedaInicial} />,
    },
    {
      id: "seo",
      grupo: "Tu tienda",
      label: "Google y difusión",
      descripcion: "Con qué título y descripción aparece tu tienda en los buscadores.",
      claves: ["seo", "google", "buscador", "posicionamiento", "titulo", "descripcion", "meta"],
      contenido: <SeoCard inicial={seoInicial} />,
    },
    {
      id: "app",
      grupo: "Tu tienda",
      label: "App y avisos",
      descripcion: "Tu tienda instalada como app y las alertas que te llegan a este dispositivo.",
      claves: ["pwa", "instalar", "celular", "android", "iphone", "notificaciones", "push", "alertas"],
      contenido: (
        <>
          <AppCard isPremium={isPremium} tipoTienda={store?.tipoTienda} />
          <PushCard tipoTienda={store?.tipoTienda} />
        </>
      ),
    },
    ...(archives.length > 0
      ? [{
          id: "datos",
          grupo: "Cuenta",
          label: "Tus datos",
          descripcion: "Copias de tus ventas de ciclos anteriores, para tu contabilidad.",
          claves: ["respaldo", "backup", "descargar", "csv", "json", "historial", "rubro"],
          contenido: (
            <ArchiveDownloadCard
              archives={archives.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
            />
          ),
        } satisfies SeccionConfig]
      : []),
    {
      id: "peligro",
      grupo: "Cuenta",
      label: "Zona de peligro",
      descripcion: "Acciones que sacan tu tienda de línea o borran cosas. Leelas con calma.",
      claves: ["cerrar", "eliminar", "borrar", "resetear", "baja", "dar de baja"],
      contenido: (
        <DangerZone
          storeName={store?.name ?? ""}
          paidUntil={sub?.currentPeriodEnd?.toISOString() ?? null}
          hasDesign={hasDesign(store?.storeConfig, store?.pageBlocks)}
        />
      ),
    },
  ];

  /* `?s=contacto` abre esa sección. Se valida contra las secciones que existen
     de verdad: un `?s=cualquier-cosa` tiene que caer en la primera y no dejar la
     pantalla sin nada seleccionado. */
  const { s } = await searchParams;
  const seccionInicial = secciones.some((sec) => sec.id === s) ? s : undefined;

  return (
    <DashboardLayout
      userName={user.name}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
      initialLowStockCount={lowStockCount}
    >
      {/* Sin barra de encabezado: el título vive arriba del menú lateral, como en
          los ajustes de Instagram. */}
      <div className="-m-4 -mt-2 bg-slate-50 min-h-screen px-6 py-6">
        <ConfiguracionShell titulo="Configuración" secciones={secciones} seccionInicial={seccionInicial} />
      </div>
    </DashboardLayout>
  );
}
