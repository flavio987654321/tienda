import { getCurrentUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/DashboardLayout";
import PagosClient from "./PagosClient";
import type { StorePaymentInfo } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO } from "@/types/store-config";

export default async function PagosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      storeConfig: true,
      policyReturns: true,
      policyShipping: true,
      policyTerms: true,
      policyReturnsActive: true,
      policyShippingActive: true,
      policyTermsActive: true,
    },
  });

  const [pendingAffiliateCount, lowStockCount] = store
    ? await Promise.all([
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.product.count({ where: { storeId: store.id, deletedAt: null, variants: { every: { stock: 0 } } } }),
      ])
    : [0, 0];

  let paymentInfo: StorePaymentInfo = DEFAULT_PAYMENT_INFO;
  try {
    const config = JSON.parse(store?.storeConfig || "{}");
    if (config.paymentInfo) paymentInfo = config.paymentInfo;
  } catch { /* noop */ }

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pagos y legales</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-xl">
            Configurá cómo querés cobrar. Cuando un cliente hace un pedido, recibe un email automático con los datos que cargues acá para saber cómo pagarte.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-10 space-y-12">

          <section>
            <SectionLabel>Métodos de pago</SectionLabel>
            <PagosClient
              initial={{
                paymentInfo,
                policyReturns: store?.policyReturns ?? "",
                policyShipping: store?.policyShipping ?? "",
                policyTerms: store?.policyTerms ?? "",
                policyReturnsActive: store?.policyReturnsActive ?? true,
                policyShippingActive: store?.policyShippingActive ?? true,
                policyTermsActive: store?.policyTermsActive ?? true,
              }}
            />
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
