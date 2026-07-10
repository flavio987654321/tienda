import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AppsExplorer from "./AppsExplorer";

const HOW_IT_WORKS = [
  "Buscá la aplicación que necesitás en la librería",
  "Entrá y tocá Instalar — te guiamos paso a paso",
  "La app queda conectada y trabajando para tu tienda",
  "Podés desinstalarla cuando quieras, sin costo",
];

export default async function AplicacionesPage() {
  // Sección oculta hasta el lanzamiento — ver NEXT_PUBLIC_APPS_ENABLED en .env
  if (process.env.NEXT_PUBLIC_APPS_ENABLED !== "1") redirect("/dashboard");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, fbConnectedAt: true, storeConfig: true },
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
  };

  return (
    <DashboardLayout
      userName={user.name}
      userEmail={user.email}
      userId={user.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
      initialLowStockCount={lowStockCount}
    >
      <div className="-m-4 -mt-2 bg-slate-50 min-h-screen">

        {/* Page header */}
        <div className="border-b border-slate-200 bg-white px-6 py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-2">Mi tienda</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Aplicaciones</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">
            Una librería de herramientas para potenciar tu tienda: vendé en las redes, medí tus visitas y hacé que tu publicidad rinda más. Todas se instalan en minutos y sin conocimientos técnicos.
          </p>
        </div>

        {/* Cómo funciona */}
        <div className="border-b border-slate-200 bg-white px-6 py-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-5">Cómo funciona</p>
          <div className="flex flex-col sm:flex-row sm:justify-center gap-4 sm:gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5 sm:max-w-[200px]">
                <span className="h-5 w-5 shrink-0 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Librería */}
        <div className="px-6 py-8">
          <div className="max-w-3xl mx-auto">
            <AppsExplorer installedById={installedById} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
