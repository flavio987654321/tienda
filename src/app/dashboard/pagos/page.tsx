import { getCurrentUser } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/DashboardLayout";
import PagosClient from "./PagosClient";
import type { StorePaymentInfo, ShippingMethod, TemplateId } from "@/types/store-config";
import { DEFAULT_PAYMENT_INFO, DEFAULT_SHIPPING_METHODS, TEMPLATES_CON_NEWSLETTER } from "@/types/store-config";
import { GAMIFICATION_EXCLUDED_TEMPLATES } from "@/lib/gamification";
import { hasActivePremium, SUB_STATUS_SELECT } from "@/lib/subscription";
import AvisosDeSeccion from "@/components/dashboard/AvisosDeSeccion";
import { avisosParaSeccion } from "@/lib/avisos-tienda";

// `mp` lo setea el callback de OAuth de MercadoPago (?mp=connected | ?mp=error)
// para poder mostrar el resultado de la conexión al volver.
export default async function PagosPage({ searchParams }: { searchParams: Promise<{ mp?: string }> }) {
  const { mp } = await searchParams;
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;
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
      policyPrivacy: true,
      policyReturnsActive: true,
      policyShippingActive: true,
      policyTermsActive: true,
      policyPrivacyActive: true,
      // Para armar la política de privacidad con lo que la tienda de verdad
      // tiene prendido, en vez de preguntárselo al dueño.
      mpAccessToken: true,
      affiliatesEnabled: true,
      gamificationWidget: { select: { isActive: true, emailRequired: true, type: true } },
      owner: { select: { subscription: { select: SUB_STATUS_SELECT } } },
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

  /* Los avisos salen del mismo lugar que los del menú lateral (lib/avisos-tienda),
     no de un cálculo propio de esta pantalla: es justamente lo que hacía que el
     mismo pendiente se contara dos veces. */
  const avisos = await avisosParaSeccion(user.id, "/dashboard/pagos");

  let paymentInfo: StorePaymentInfo = DEFAULT_PAYMENT_INFO;
  let shippingMethods: ShippingMethod[] = DEFAULT_SHIPPING_METHODS;
  let shippingConfigured = false;
  // Los trackers viven en el JSON de configuración, no en columnas propias.
  let usaAnalytics = false;
  let usaPixel = false;
  let template: string | null = null;
  try {
    const config = JSON.parse(store?.storeConfig || "{}");
    if (config.paymentInfo) paymentInfo = config.paymentInfo;
    if (Array.isArray(config.shippingMethods)) {
      shippingMethods = config.shippingMethods;
      shippingConfigured = true;
    }
    usaAnalytics = !!config.analytics?.googleAnalyticsId?.trim();
    usaPixel = !!config.analytics?.facebookPixelId?.trim();
    template = typeof config.template === "string" ? config.template : null;
  } catch { /* noop */ }

  /* Lo que la tienda junta de gente que todavía no compró. Sale de lo que está
     prendido de verdad, no de preguntárselo al dueño: si se equivoca, la
     política declara algo falso, que es peor que no tenerla. */
  const juegoVisible =
    !!store?.gamificationWidget?.isActive &&
    !!store.gamificationWidget.emailRequired &&
    !!template &&
    // Autos no tiene ruleta: el renderer la excluye por template.
    !GAMIFICATION_EXCLUDED_TEMPLATES.has(template);
  const juegoConEmail: "ruleta" | "raspadita" | null = !juegoVisible
    ? null
    : store?.gamificationWidget?.type === "SCRATCH" ? "raspadita" : "ruleta";

  const tieneNewsletter = !!template && TEMPLATES_CON_NEWSLETTER.includes(template as TemplateId);
  // El seguimiento de la tienda y el push son exclusivos de Premium, y con la
  // suscripción vencida dejan de funcionar — declarar algo que no corre sería
  // igual de falso que callarlo.
  const tienePushDeSeguidores = hasActivePremium(store?.owner?.subscription ?? null);

  return (
    <DashboardLayout
      userName={user.name}
     
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

          {/* Los avisos de ESTA sección, arriba de todo y con el texto a la vista.
              El triángulo del menú lateral no puede decir más que "algo pasa acá";
              este cartel dice qué, por qué importa y a dónde ir. Y es el único
              lugar donde se ven los amarillos — ver lib/avisos-tienda. */}
          <AvisosDeSeccion avisos={avisos} />

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
                policyPrivacy: store?.policyPrivacy ?? "",
                policyReturnsActive: store?.policyReturnsActive ?? true,
                policyShippingActive: store?.policyShippingActive ?? true,
                policyTermsActive: store?.policyTermsActive ?? true,
                policyPrivacyActive: store?.policyPrivacyActive ?? true,
                hechosPrivacidad: {
                  usaAnalytics,
                  usaPixel,
                  usaMercadoPago: !!store?.mpAccessToken,
                  usaAfiliados: !!store?.affiliatesEnabled,
                  esAutos: isAutos,
                  juegoConEmail,
                  tieneNewsletter,
                  tienePushDeSeguidores,
                },
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
