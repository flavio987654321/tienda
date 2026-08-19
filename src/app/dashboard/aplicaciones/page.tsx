import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MousePointerClick, Wand2, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { APPS_REGISTRY } from "@/lib/apps/registry";
import { whatsappVinculado } from "@/lib/apps/whatsapp-vinculo";
import AppsExplorer from "./AppsExplorer";

// Tres pasos, no cuatro: "podés desinstalarla" no es un paso del proceso, es una
// garantía — y como garantía tranquiliza más abajo, al lado del candado.
const HOW_IT_WORKS = [
  {
    icon: MousePointerClick,
    title: "Elegís la que necesitás",
    text: "Entrás a la aplicación y te contamos para qué sirve, con ejemplos, antes de que instales nada.",
  },
  {
    icon: Wand2,
    title: "Te guiamos paso a paso",
    text: "Tocás Instalar y te vamos pidiendo lo justo, una cosa por pantalla. No hay que copiar códigos ni tocar configuraciones.",
  },
  {
    icon: Rocket,
    title: "Queda trabajando sola",
    text: "Una vez conectada no tenés que volver a entrar. Se actualiza sola con lo que vas cargando en tu tienda.",
  },
];

export default async function AplicacionesPage() {
  // Sección oculta hasta el lanzamiento — ver NEXT_PUBLIC_APPS_ENABLED en .env
  if (process.env.NEXT_PUBLIC_APPS_ENABLED !== "1") redirect("/dashboard");
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;
  if (user.role !== "OWNER") redirect("/dashboard");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbConnectedAt: true, fbTokenExpiresAt: true, gsEnabledAt: true, storeConfig: true },
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
    // Declarado por la dueña, no comprobado contra Meta — ver lib/apps/whatsapp-vinculo.
    "whatsapp-catalogo": whatsappVinculado(store?.storeConfig),
    "google-shopping": !!store?.gsEnabledAt,
  };
  const instaladas = APPS_REGISTRY.filter((a) => installedById[a.id]).length;

  // La tarjeta decía "Instalada" en verde aunque el token de Meta estuviera
  // vencido hace semanas, porque ese cartel salía de `fbConnectedAt != null`.
  // Con esto la vidriera avisa sin que haya que entrar a la ficha.
  const ahora = new Date();
  const metaVencido =
    !!store?.fbConnectedAt &&
    !!store.fbTokenExpiresAt &&
    store.fbTokenExpiresAt <= ahora;
  const atencionById: Record<string, boolean> = {
    "meta-catalogo": metaVencido,
    // El catálogo que WhatsApp muestra es el mismo que sincroniza Catálogo de
    // Meta: si el token venció deja de actualizarse, y la clienta ve precios
    // viejos en el chat sin ningún aviso. Vale el mismo cartel que allá.
    "whatsapp-catalogo": metaVencido && installedById["whatsapp-catalogo"],
  };

  // Apps cuya marca la puso el dueño y nosotros no pudimos comprobar. Llevan un
  // cartel gris en vez del verde: ver el comentario largo en `[id]/page.tsx`.
  const declaradoById: Record<string, boolean> = {
    "whatsapp-catalogo": true,
  };

  return (
    <DashboardLayout
      userName={user.name}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
      initialLowStockCount={lowStockCount}
    >
      <div className="-m-4 -mt-2 bg-slate-50 min-h-screen">

        {/* Hero — es una vidriera, así que se ve como una vidriera y no como
            otra pantalla más del panel. */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 py-10 sm:py-12">
          {/* Resplandor decorativo */}
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200 backdrop-blur">
              <Sparkles className="h-3 w-3" /> Todas gratis
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">
              Aplicaciones
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Las aplicaciones conectan tu tienda con los lugares donde ya está tu gente: Facebook,
              Instagram, WhatsApp y Google. Tus productos aparecen ahí solos, sin que tengas que
              volver a cargarlos ni saber nada técnico.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {APPS_REGISTRY.length} aplicaciones disponibles
              </span>
              {instaladas > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  {instaladas} {instaladas === 1 ? "instalada" : "instaladas"} en tu tienda
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Integraciones oficiales
              </span>
            </div>
          </div>
        </div>

        {/* Cómo funciona */}
        <div className="border-b border-slate-200 bg-white px-6 py-9">
          <div className="max-w-3xl mx-auto">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-6">
              Cómo funciona
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <step.icon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">0{i + 1}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Podés desinstalar cualquier aplicación cuando quieras, sin costo y sin perder nada de
                tu tienda. Ninguna de estas aplicaciones puede ver tus ventas, tus clientes ni tus
                datos de cobro.
              </p>
            </div>
          </div>
        </div>

        {/* Librería */}
        <div className="px-6 py-8">
          <div className="max-w-3xl mx-auto">
            <AppsExplorer installedById={installedById} atencionById={atencionById} declaradoById={declaradoById} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
