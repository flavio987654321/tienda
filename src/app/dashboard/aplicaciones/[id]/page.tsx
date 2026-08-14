import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowDown, CheckCircle, Check, ChevronDown, ListChecks, ExternalLink,
  RefreshCw, Tag, Store, Megaphone, AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getApp, getAccent, CATEGORY_LABELS, type UsageIcon } from "@/lib/apps/registry";
import { parseFirstImage } from "@/lib/metaFeed";
import AppIcon from "@/components/apps/AppIcon";
import MetaCatalogPreview, { type PreviewProduct } from "@/components/apps/MetaCatalogPreview";
import MetaCatalogoWizard from "./MetaCatalogoWizard";
import FacebookConnectButton from "./FacebookConnectButton";
import FacebookPixelWizard from "./FacebookPixelWizard";
import FacebookWhatsAppWizard from "./FacebookWhatsAppWizard";
import GoogleAnalyticsWizard from "./GoogleAnalyticsWizard";
import GoogleConnectButton from "./GoogleConnectButton";
import GoogleShoppingWizard from "./GoogleShoppingWizard";
import GoogleShoppingInstallButton from "./GoogleShoppingInstallButton";

const USAGE_ICONS: Record<UsageIcon, React.ComponentType<{ className?: string }>> = {
  auto: RefreshCw,
  etiqueta: Tag,
  tienda: Store,
  anuncio: Megaphone,
};

export default async function AppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fb?: string }>;
}) {
  // Sección oculta hasta el lanzamiento — ver NEXT_PUBLIC_APPS_ENABLED en .env
  if (process.env.NEXT_PUBLIC_APPS_ENABLED !== "1") redirect("/dashboard");

  const { id } = await params;
  const { fb } = await searchParams;

  const app = getApp(id);
  if (!app) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      storeConfig: true,
      fbConnectedAt: true,
      fbBusinessId: true,
      fbCatalogId: true,
      fbFeedId: true,
      fbWabaId: true,
      fbTokenExpiresAt: true,
      gaConnectedAt: true,
      gsEnabledAt: true,
    },
  });

  // El token de Meta dura ~60 días. Si se pasó, todos los pasos del wizard van a
  // fallar con un error de permisos que no explica nada, así que hay que decirlo
  // de entrada — y sobre todo, dejar de mostrar "Instalada" en verde.
  const metaVencido =
    !!store?.fbConnectedAt &&
    !!store.fbTokenExpiresAt &&
    store.fbTokenExpiresAt <= new Date();

  const [pendingAffiliateCount, lowStockCount] = store
    ? await Promise.all([
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.product.count({ where: { storeId: store.id, deletedAt: null, variants: { every: { stock: 0 } } } }),
      ])
    : [0, 0];

  // Productos reales para la maqueta de "así se va a ver". Se piden de más
  // porque los que no tienen foto se descartan — Meta tampoco los acepta.
  let previewProducts: PreviewProduct[] = [];
  if (app.preview && store) {
    const filas = await prisma.product.findMany({
      where: { storeId: store.id, isActive: true, deletedAt: null, soloMayorista: false },
      select: { id: true, name: true, price: true, images: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    previewProducts = filas
      .map((p) => {
        const image = parseFirstImage(p.images);
        return image ? { id: p.id, name: p.name, price: p.price, image } : null;
      })
      .filter((p): p is PreviewProduct => p !== null)
      .slice(0, 4);
  }

  let analytics: { googleAnalyticsId?: string; facebookPixelId?: string } = {};
  try {
    analytics = JSON.parse(store?.storeConfig ?? "{}").analytics ?? {};
  } catch { /* config inválido, se trata como vacío */ }

  const installedById: Record<string, boolean> = {
    "meta-catalogo": !!store?.fbConnectedAt,
    "google-analytics": !!analytics.googleAnalyticsId?.trim(),
    "facebook-pixel": !!analytics.facebookPixelId?.trim(),
    "whatsapp-catalogo": !!store?.fbWabaId,
    "google-shopping": !!store?.gsEnabledAt,
  };
  const installed = installedById[app.id] ?? false;
  const fbConfigured = !!process.env.FB_APP_ID && !!process.env.FB_APP_SECRET;
  const accent = getAccent(app.id);

  // El bloque de instalación aparece recién cuando hay algo que configurar: para
  // Meta y Analytics los pasos viven detrás de la conexión de la cuenta, así que
  // antes de eso mostrarlos sería una caja vacía.
  const showInstall =
    !app.comingSoon &&
    (app.id !== "meta-catalogo" || !!store?.fbConnectedAt) &&
    (app.id !== "google-analytics" || !!store?.gaConnectedAt || installed) &&
    (app.id !== "google-shopping" || !!store?.gsEnabledAt);

  return (
    <DashboardLayout
      userName={user.name}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
      initialLowStockCount={lowStockCount}
    >
      <div className="-m-4 -mt-2 bg-slate-50 min-h-screen">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
          {/* Franja con el color de la marca, arriba de todo */}
          <div className={`h-1.5 bg-gradient-to-r ${accent.band}`} />
          <div className={`pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-gradient-to-br ${accent.band} opacity-20 blur-3xl`} />

          <div className="relative px-6 pt-6 pb-9">
            <div className="max-w-3xl mx-auto">
              <Link
                href="/dashboard/aplicaciones"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-7 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver a Aplicaciones
              </Link>

              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="h-20 w-20 shrink-0 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                  <AppIcon id={app.id} className="h-11 w-11" />
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-black text-white tracking-tight">{app.name}</h1>
                  <p className="text-sm font-semibold text-slate-400 mt-0.5">
                    Proporcionado por {app.providerName}
                  </p>

                  {app.tagline && (
                    <p className="text-sm text-slate-300 mt-3 leading-relaxed max-w-xl">{app.tagline}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Chip>{app.price === "gratis" ? "Gratis" : "Pago"}</Chip>
                    <Chip>{CATEGORY_LABELS[app.category]}</Chip>
                    <Chip>Integración oficial</Chip>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    {app.comingSoon ? (
                      <span className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold px-6 py-2.5 rounded-lg text-sm">
                        Próximamente
                      </span>
                    ) : metaVencido && app.id === "meta-catalogo" ? (
                      <span className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold px-6 py-2.5 rounded-lg text-sm">
                        <AlertTriangle className="h-4 w-4" /> Hay que reconectar
                      </span>
                    ) : installed ? (
                      <span className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 font-bold px-6 py-2.5 rounded-lg text-sm">
                        <CheckCircle className="h-4 w-4" /> Instalada
                      </span>
                    ) : app.id === "meta-catalogo" ? (
                      <FacebookConnectButton configured={fbConfigured} />
                    ) : app.id === "google-analytics" && !store?.gaConnectedAt ? (
                      <GoogleConnectButton />
                    ) : app.id === "google-shopping" ? (
                      <GoogleShoppingInstallButton />
                    ) : (
                      <a
                        href="#instalacion"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-lg text-sm transition-colors"
                      >
                        Instalar <ArrowDown className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cuerpo ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Maqueta: primero ver, después leer */}
            {app.preview === "meta-catalogo" && (
              <MetaCatalogPreview storeName={store?.name ?? "Tu tienda"} products={previewProducts} />
            )}

            {/* Para qué sirve */}
            <Seccion titulo="Para qué sirve">
              {app.about ? (
                <div className="space-y-3.5">
                  {app.about.map((p, i) => (
                    <p key={i} className="text-sm text-slate-600 leading-relaxed">{p}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed">{app.description}</p>
              )}

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {app.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 leading-relaxed">{b}</span>
                  </div>
                ))}
              </div>
            </Seccion>

            {/* Cómo se usa */}
            {app.usage && (
              <Seccion titulo="Cómo se usa">
                <div className="space-y-5">
                  {app.usage.map((u, i) => {
                    const Icono = USAGE_ICONS[u.icon];
                    return (
                      <div key={i} className="flex gap-4">
                        <span className="h-8 w-8 shrink-0 rounded-lg bg-slate-900 flex items-center justify-center">
                          <Icono className="h-4 w-4 text-white" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900">{u.title}</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{u.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Seccion>
            )}

            {/* Antes de empezar */}
            {app.requirements && !installed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="h-4 w-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-amber-900">Antes de empezar necesitás</h2>
                </div>
                <ul className="space-y-3">
                  {app.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        {/* El texto va en bloque para que el botón caiga siempre
                            en su propia línea y no se pegue al final del párrafo
                            solo cuando justo sobra lugar. */}
                        <p className="text-xs text-amber-900/80 leading-relaxed">{r.text}</p>
                        {r.link && (
                          <a
                            href={r.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                          >
                            {r.link.label} <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instalación / Configuración */}
            {showInstall && (
              <section id="instalacion" className="scroll-mt-6">
                <div className="flex items-center gap-4 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 whitespace-nowrap">
                    {installed ? "Configuración" : "Instalación"}
                  </p>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                {app.id === "meta-catalogo" && (
                  <MetaCatalogoWizard
                    fbConnected={!!store?.fbConnectedAt}
                    fbBusinessId={store?.fbBusinessId ?? null}
                    fbCatalogId={store?.fbCatalogId ?? null}
                    fbFeedId={store?.fbFeedId ?? null}
                    fbStatus={fb === "connected" ? "connected" : fb === "error" ? "error" : undefined}
                    fbVencido={metaVencido}
                  />
                )}
                {app.id === "google-analytics" && (
                  <GoogleAnalyticsWizard
                    gaConnected={!!store?.gaConnectedAt}
                    measurementId={analytics.googleAnalyticsId?.trim() || null}
                  />
                )}
                {app.id === "google-shopping" && <GoogleShoppingWizard />}
                {app.id === "facebook-pixel" && (
                  <FacebookPixelWizard
                    fbConnected={!!store?.fbConnectedAt}
                    fbBusinessId={store?.fbBusinessId ?? null}
                    pixelId={analytics.facebookPixelId?.trim() || null}
                    fbVencido={metaVencido}
                  />
                )}
                {app.id === "whatsapp-catalogo" && (
                  <FacebookWhatsAppWizard
                    fbConnected={!!store?.fbConnectedAt}
                    fbCatalogId={store?.fbCatalogId ?? null}
                    fbWabaId={store?.fbWabaId ?? null}
                  />
                )}
              </section>
            )}

            {/* Preguntas frecuentes — <details> nativo: funciona sin JS */}
            {app.faq && (
              <Seccion titulo="Preguntas frecuentes">
                <div className="divide-y divide-slate-100 -my-2">
                  {app.faq.map((f, i) => (
                    <details key={i} className="group py-2">
                      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none py-1.5">
                        <span className="text-sm font-semibold text-slate-800">{f.q}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="text-xs text-slate-500 leading-relaxed pb-2 pr-7">{f.a}</p>
                    </details>
                  ))}
                </div>
              </Seccion>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold text-slate-300 border border-white/15 bg-white/5 rounded-full px-2.5 py-0.5 backdrop-blur">
      {children}
    </span>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">{titulo}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
