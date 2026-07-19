import { getCurrentUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/DashboardLayout";
import PagosClient from "./PagosClient";
import type { StorePaymentInfo, ShippingMethod } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO, DEFAULT_SHIPPING_METHODS } from "@/types/store-config";

// `mp` lo setea el callback de OAuth de MercadoPago (?mp=connected | ?mp=error)
// para poder mostrar el resultado de la conexión al volver.
export default async function PagosPage({ searchParams }: { searchParams: Promise<{ mp?: string }> }) {
  const { mp } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/dashboard");

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      tipoTienda: true,
      whatsappNumber: true,
      storeConfig: true,
      mpConnectedAt: true,
      mpSellerId: true,
      policyReturns: true,
      policyShipping: true,
      policyTerms: true,
      policyReturnsActive: true,
      policyShippingActive: true,
      policyTermsActive: true,
      originStreet: true,
      originCity: true,
      originProvince: true,
      originPostalCode: true,
    },
  });

  const [pendingAffiliateCount, lowStockCount, activeAffiliateCount] = store
    ? await Promise.all([
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.product.count({ where: { storeId: store.id, deletedAt: null, variants: { every: { stock: 0 } } } }),
        prisma.affiliate.count({ where: { storeId: store.id, status: "APPROVED", isActive: true } }),
      ])
    : [0, 0, 0];

  const isAutos = store?.tipoTienda === "AUTOS";

  let paymentInfo: StorePaymentInfo = DEFAULT_PAYMENT_INFO;
  let shippingMethods: ShippingMethod[] = DEFAULT_SHIPPING_METHODS;
  let shippingConfigured = false;
  try {
    const config = JSON.parse(store?.storeConfig || "{}");
    if (config.paymentInfo) paymentInfo = config.paymentInfo;
    if (Array.isArray(config.shippingMethods)) {
      shippingMethods = config.shippingMethods;
      shippingConfigured = true;
    }
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isAutos ? "Legal" : "Pagos y legales"}</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-xl">
            {isAutos
              ? "Acá redactás las políticas legales de tu tienda. Como vendés por consulta, el cobro y la entrega se coordinan directamente con cada comprador."
              : "Configurá cómo querés cobrar. Cuando un cliente hace un pedido, recibe un email automático con los datos que cargues acá para saber cómo pagarte."}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-10 space-y-12">

          <section>
            <SectionLabel>{isAutos ? "Información legal" : "Métodos de pago"}</SectionLabel>
            <PagosClient
              initial={{
                paymentInfo,
                shippingMethods,
                shippingConfigured,
                policyReturns: store?.policyReturns ?? "",
                policyShipping: store?.policyShipping ?? "",
                policyTerms: store?.policyTerms ?? "",
                policyReturnsActive: store?.policyReturnsActive ?? true,
                policyShippingActive: store?.policyShippingActive ?? true,
                policyTermsActive: store?.policyTermsActive ?? true,
                originStreet: store?.originStreet ?? "",
                originCity: store?.originCity ?? "",
                originProvince: store?.originProvince ?? "",
                originPostalCode: store?.originPostalCode ?? "",
                storeName: store?.name ?? "",
                contact: store?.whatsappNumber ?? "",
                isAutos,
                mpConnected: !!store?.mpConnectedAt,
                mpConnectedAt: store?.mpConnectedAt?.toISOString() ?? null,
                mpSellerId: store?.mpSellerId ?? null,
                mpStatus: mp === "connected" ? "connected" : mp === "error" ? "error" : undefined,
                activeAffiliatesCount: activeAffiliateCount,
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
