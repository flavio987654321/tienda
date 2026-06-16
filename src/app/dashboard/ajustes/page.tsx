import { getCurrentUser } from "@/lib/auth-session";
import { getUserSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import DangerZone from "@/app/dashboard/configuracion/DangerZone";
import AjustesClient from "./AjustesClient";
import MpConnectButton from "./MpConnectButton";
import LogoUploadCard from "@/components/LogoUploadCard";

export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ mp?: string }> }) {
  const { mp } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const [sub, store] = await Promise.all([
    getUserSubscription(user.id),
    prisma.store.findUnique({
      where: { ownerId: user.id },
      select: {
        id: true, slug: true, customDomain: true, mpConnectedAt: true, mpSellerId: true,
        name: true, logo: true, logoColor: true, primaryColor: true, description: true,
      },
    }),
  ]);

  const [pendingAffiliateCount, lowStockCount] = store
    ? await Promise.all([
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.product.count({ where: { storeId: store.id, deletedAt: null, variants: { every: { stock: 0 } } } }),
      ])
    : [0, 0];

  const tier = sub?.tier ?? "BASIC";
  const isPremium = tier === "PREMIUM";

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración</h1>
          <p className="text-slate-500 text-sm mt-1.5">Logo, dominio, pagos y opciones de cuenta.</p>
        </div>

        {/* Content */}
        <div className="px-6 py-10 space-y-12">

          {store && (
            <section>
              <SectionLabel>Identidad</SectionLabel>
              <LogoUploadCard
                storeName={store.name}
                initialLogo={store.logo}
                initialLogoColor={store.logoColor}
                primaryColor={store.primaryColor}
                isPremium={isPremium}
              />
            </section>
          )}

          <section>
            <SectionLabel>Presencia y funciones</SectionLabel>
            <AjustesClient
              slug={store?.slug ?? ""}
              customDomain={store?.customDomain ?? null}
              isPremium={isPremium}
              description={store?.description ?? ""}
            />
          </section>

          <section>
            <SectionLabel>Pagos</SectionLabel>
            <MpConnectButton
              connected={!!store?.mpConnectedAt}
              connectedAt={store?.mpConnectedAt?.toISOString() ?? null}
              mpSellerId={store?.mpSellerId ?? null}
              mpStatus={mp === "connected" ? "connected" : mp === "error" ? "error" : undefined}
            />
          </section>

          <section>
            <SectionLabel>Zona de peligro</SectionLabel>
            <DangerZone />
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 whitespace-nowrap">{children}</p>
      <div className="h-px bg-slate-200 flex-1" />
    </div>
  );
}
