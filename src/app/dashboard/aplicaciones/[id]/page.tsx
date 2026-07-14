import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowDown, CheckCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getApp, CATEGORY_LABELS } from "@/lib/apps/registry";
import AppIcon from "@/components/apps/AppIcon";
import MetaCatalogoWizard from "./MetaCatalogoWizard";
import FacebookConnectButton from "./FacebookConnectButton";
import FacebookPixelWizard from "./FacebookPixelWizard";
import FacebookWhatsAppWizard from "./FacebookWhatsAppWizard";
import GoogleAnalyticsWizard from "./GoogleAnalyticsWizard";
import GoogleConnectButton from "./GoogleConnectButton";

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
      storeConfig: true,
      fbConnectedAt: true,
      fbBusinessId: true,
      fbCatalogId: true,
      fbFeedId: true,
      fbWabaId: true,
      gaConnectedAt: true,
    },
  });

  const [pendingAffiliateCount, lowStockCount] = store
    ? await Promise.all([
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.product.count({ where: { storeId: store.id, deletedAt: null, variants: { every: { stock: 0 } } } }),
      ])
    : [0, 0];

  let analytics: { googleAnalyticsId?: string; facebookPixelId?: string } = {};
  try {
    analytics = JSON.parse(store?.storeConfig ?? "{}").analytics ?? {};
  } catch { /* config inválido, se trata como vacío */ }

  const installedById: Record<string, boolean> = {
    "meta-catalogo": !!store?.fbConnectedAt,
    "google-analytics": !!analytics.googleAnalyticsId?.trim(),
    "facebook-pixel": !!analytics.facebookPixelId?.trim(),
    "whatsapp-catalogo": !!store?.fbWabaId,
  };
  const installed = installedById[app.id] ?? false;
  const fbConfigured = !!process.env.FB_APP_ID && !!process.env.FB_APP_SECRET;

  return (
    <DashboardLayout
      userName={user.name}
      userEmail={user.email}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
      initialLowStockCount={lowStockCount}
    >
      <div className="-m-4 -mt-2 bg-slate-50 min-h-screen">

        {/* Hero de la app */}
        <div className="border-b border-slate-200 bg-white px-6 pt-6 pb-8">
          <Link href="/dashboard/aplicaciones" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 mb-6 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a Aplicaciones
          </Link>

          <div className="flex items-start gap-5 max-w-3xl">
            <div className="h-20 w-20 shrink-0 rounded-2xl border border-slate-100 bg-white shadow-md flex items-center justify-center">
              <AppIcon id={app.id} className="h-11 w-11" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{app.name}</h1>
              <p className="text-sm font-semibold text-indigo-600 mt-0.5">{app.providerName}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-bold text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 bg-slate-50">
                  {app.price === "gratis" ? "Gratis" : "Pago"}
                </span>
                <span className="text-[11px] font-bold text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 bg-slate-50">
                  {CATEGORY_LABELS[app.category]}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                {app.comingSoon ? (
                  <span className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold px-6 py-2.5 rounded-lg text-sm">
                    Próximamente
                  </span>
                ) : installed ? (
                  <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-6 py-2.5 rounded-lg text-sm">
                    <CheckCircle className="h-4 w-4" /> Instalada
                  </span>
                ) : app.id === "meta-catalogo" ? (
                  <FacebookConnectButton configured={fbConfigured} />
                ) : app.id === "google-analytics" && !store?.gaConnectedAt ? (
                  <GoogleConnectButton />
                ) : (
                  <a
                    href="#instalacion"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Instalar <ArrowDown className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Proporcionado por {app.providerName} · Integración oficial de TiendaApps
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-8">
          <div className="max-w-3xl space-y-6">

            {/* Descripción */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Descripción</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-slate-600 leading-relaxed">{app.description}</p>
                <ul className="mt-4 space-y-2.5">
                  {app.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-600">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Instalación / Configuración.
                Para el catálogo de Meta y Google Analytics, los pasos recién
                aparecen una vez conectada la cuenta (el botón Instalar del
                hero abre el popup directo) — así no hay dos botones que
                hacen lo mismo. Para Google Analytics también se muestra si
                ya quedó instalado un ID aunque la cuenta esté desconectada,
                para poder ver el estado y volver a conectar. */}
            {!app.comingSoon && (app.id !== "meta-catalogo" || !!store?.fbConnectedAt) &&
              (app.id !== "google-analytics" || !!store?.gaConnectedAt || installed) && (
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
                  />
                )}
                {app.id === "google-analytics" && (
                  <GoogleAnalyticsWizard
                    gaConnected={!!store?.gaConnectedAt}
                    measurementId={analytics.googleAnalyticsId?.trim() || null}
                  />
                )}
                {app.id === "facebook-pixel" && (
                  <FacebookPixelWizard
                    fbConnected={!!store?.fbConnectedAt}
                    fbBusinessId={store?.fbBusinessId ?? null}
                    pixelId={analytics.facebookPixelId?.trim() || null}
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

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
