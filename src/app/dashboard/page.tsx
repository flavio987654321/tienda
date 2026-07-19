import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ShareStoreButton from "@/components/ShareStoreButton";
import PublishToggle from "@/components/PublishToggle";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import {
  ShoppingBag, Package, Users, TrendingUp,
  Store, Star, BadgeCheck, CheckCircle2, Circle,
  AlertTriangle, Eye,
} from "lucide-react";
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    include: {
      _count: { select: { products: true, orders: true, affiliates: true } },
      verificationRequest: { select: { status: true } },
    },
  });

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "SELLER") redirect("/afiliados");
  if (!store) redirect("/login");

  // Extra fields for onboarding checklist
  const storeExtra = await prisma.store.findUnique({
    where: { id: store.id },
    select: { logo: true, isPublished: true, mpConnectedAt: true, storeConfig: true, description: true },
  });

  const isAutos = store.tipoTienda === "AUTOS";

  const recentActivity = await prisma.storeActivityEvent.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { id: true, type: true, data: true, createdAt: true },
  });

  const recentOrders = !isAutos ? await prisma.order.findMany({
    where: { storeId: store.id },
    include: { buyer: { select: { name: true, email: true } }, items: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  }) : [];

  const totalRevenue = !isAutos ? await prisma.order.aggregate({
    where: { storeId: store.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } },
    _sum: { total: true },
  }) : { _sum: { total: null } };

  const pendingAffiliateCount = await prisma.affiliate.count({
    where: { storeId: store.id, status: "PENDING" },
  });
  // "every" da true (vacuosamente) en productos sin variantes — se excluyen explícitamente
  // para no marcarlos como "sin stock" cuando en realidad no usan control de stock por variante.
  const initialLowStockCount = !isAutos ? await prisma.product.count({
    where: { storeId: store.id, deletedAt: null, variants: { some: {}, every: { stock: 0 } } },
  }) : 0;

  const recentReviews = !isAutos ? await prisma.review.findMany({
    where: { product: { storeId: store.id } },
    include: {
      user: { select: { name: true } },
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  }) : [];

  // AUTOS: consultas y vehículos vendidos
  const recentLeads = isAutos ? await prisma.lead.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, customerName: true, customerPhone: true, customerMessage: true, createdAt: true, status: true, productName: true },
  }) : [];
  const pendingLeadsCount = isAutos ? await prisma.lead.count({
    where: { storeId: store.id, status: "PENDING" },
  }) : 0;
  const soldVehiclesCount = isAutos ? await prisma.product.count({
    where: { storeId: store.id, deletedAt: null, vehicleStatus: "SOLD" },
  }) : 0;

  // Onboarding checklist
  let hasTemplate = false;
  let hasShippingConfigured = false;
  let hasPaymentData = false;
  const hasDescription = !!(storeExtra?.description?.trim());
  try {
    const cfg = JSON.parse(storeExtra?.storeConfig || "{}");
    hasTemplate = !!cfg.template;
    hasShippingConfigured = Array.isArray(cfg.shippingMethods);
    const pi = cfg.paymentInfo;
    hasPaymentData = !!(
      (pi?.transferencia?.enabled && (pi.transferencia.cbu?.length > 0 || pi.transferencia.alias?.length > 0)) ||
      (pi?.efectivo?.enabled)
    );
  } catch { /* noop */ }

  const onboardingSteps = [
    {
      done: !!storeExtra?.logo,
      label: "Subí el logo de tu tienda",
      href: "/dashboard/ajustes",
      tip: "Aparece en el encabezado y en los emails a tus clientes.",
    },
    {
      done: hasTemplate,
      label: "Elegí el diseño de tu tienda",
      href: "/dashboard/configuracion",
      tip: "Seleccioná una plantilla y personalizá los colores.",
    },
    {
      done: store._count.products > 0,
      label: "Agregá tus primeros productos",
      href: "/dashboard/productos/nuevo",
      tip: "Con al menos un producto ya podés compartir tu tienda.",
    },
    ...(!isAutos ? [
      {
        done: !!storeExtra?.mpConnectedAt,
        label: "Conectá MercadoPago para cobrar",
        href: "/dashboard/pagos",
        tip: "Necesario para recibir pagos con tarjeta o débito.",
      },
      {
        done: hasPaymentData,
        label: "Completá tus datos de cobro",
        href: "/dashboard/pagos",
        tip: "CBU, alias o efectivo — para que los clientes sepan cómo pagarte.",
      },
    ] : []),
    ...(!isAutos ? [{
      done: hasShippingConfigured,
      label: "Configurá tus métodos de envío",
      href: "/dashboard/pagos",
      tip: "Definí si entregás en persona, con precio fijo o a coordinar.",
    }] : []),
    {
      done: hasDescription,
      label: "Escribí una descripción de tu tienda",
      href: "/dashboard/ajustes",
      tip: "Aparece en el listado público de tiendas. Máximo 150 caracteres.",
    },
    {
      done: !!storeExtra?.isPublished,
      label: "Publicá tu tienda",
      href: "/dashboard",
      tip: "Activá el switch de publicación para que sea visible.",
    },
  ];

  const doneCount = onboardingSteps.filter((s) => s.done).length;
  const allDone = doneCount === onboardingSteps.length;

  return (
    <DashboardLayout
      userName={user.name}
      userEmail={user.email}
      userId={user.id}
      storeId={store.id}
      initialPendingAffiliateCount={pendingAffiliateCount}
      initialLowStockCount={initialLowStockCount}
    >
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
            Resumen de tu tienda <strong>{store?.name}</strong>
            {store && (
              <span title={store.isVerified ? "Identidad verificada" : store.verificationRequest?.status === "PENDING" ? "Verificación en revisión" : "Sin verificar — ir a Perfil"}>
                <BadgeCheck className={`h-4 w-4 inline ${store.isVerified ? "text-blue-500" : store.verificationRequest?.status === "PENDING" ? "text-yellow-400" : "text-gray-300"}`} />
              </span>
            )}
          </p>
        </div>

        {/* ── Onboarding checklist ── */}
        {!allDone ? (
          <div className="mb-6 bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="font-bold text-gray-900 text-sm">Completá la configuración de tu tienda</h2>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {doneCount}/{onboardingSteps.length} pasos
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / onboardingSteps.length) * 100}%` }}
              />
            </div>
            <div className="space-y-2">
              {onboardingSteps.map((step) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${
                    step.done
                      ? "opacity-60 cursor-default pointer-events-none"
                      : "hover:bg-indigo-50 hover:border-indigo-100 border border-transparent"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 shrink-0 group-hover:text-indigo-400 transition-colors" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {step.label}
                    </p>
                    {!step.done && (
                      <p className="text-xs text-gray-400 mt-0.5">{step.tip}</p>
                    )}
                  </div>
                  {!step.done && (
                    <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Ir →
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">¡Tu tienda está lista! 🎉</p>
              <p className="text-xs text-emerald-600 mt-0.5">Todos los pasos de configuración completados.</p>
            </div>
          </div>
        )}

        {/* ── Store link & publish toggle ── */}
        {store && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            {/* Link row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 shrink-0">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Tu tienda</p>
                <p className="text-sm font-semibold text-gray-800 truncate">tiendaapps.com/tienda/{store.slug}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ShareStoreButton
                  storeName={store.name}
                  storeSlug={store.slug}
                  storeLogo={store.logo}
                  isPublished={store.isPublished}
                />
                <Link
                  href={`/tienda/${store.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Ver
                </Link>
              </div>
            </div>
            {/* Publish toggle */}
            <div className="px-3 py-3">
              <PublishToggle
                initialPublished={store.isPublished}
                hasProducts={store._count.products > 0}
                hasPayment={hasPaymentData || !!storeExtra?.mpConnectedAt}
                hasTemplate={hasTemplate}
              />
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(isAutos ? [
            {
              label: "Consultas nuevas",
              value: pendingLeadsCount,
              icon: ShoppingBag,
              color: "text-indigo-600 bg-indigo-50",
              href: "/dashboard/consultas",
            },
            {
              label: "Vehículos publicados",
              value: store?._count.products ?? 0,
              icon: Package,
              color: "text-blue-600 bg-blue-50",
              href: "/dashboard/productos",
            },
            {
              label: "Vendidos",
              value: soldVehiclesCount,
              icon: TrendingUp,
              color: "text-green-600 bg-green-50",
              href: "/dashboard/metricas",
            },
            {
              label: "Afiliados",
              value: store?._count.affiliates ?? 0,
              icon: Users,
              color: "text-purple-600 bg-purple-50",
              href: "/dashboard/vendedoras",
            },
          ] : [
            {
              label: "Ingresos totales",
              value: `$${(totalRevenue._sum.total ?? 0).toLocaleString("es-AR")}`,
              icon: TrendingUp,
              color: "text-green-600 bg-green-50",
              href: "/dashboard/metricas",
            },
            {
              label: "Productos",
              value: store?._count.products ?? 0,
              icon: Package,
              color: "text-blue-600 bg-blue-50",
              href: "/dashboard/productos",
            },
            {
              label: "Pedidos",
              value: store?._count.orders ?? 0,
              icon: ShoppingBag,
              color: "text-indigo-600 bg-indigo-50",
              href: "/dashboard/pedidos",
            },
            {
              label: "Afiliados",
              value: store?._count.affiliates ?? 0,
              icon: Users,
              color: "text-purple-600 bg-purple-50",
              href: "/dashboard/vendedoras",
            },
          ]).map(({ label, value, icon: Icon, color, href }) => (
            <Link
              key={label}
              href={href}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </Link>
          ))}
        </div>

        {/* ── Recent reviews ── */}
        {recentReviews.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Reseñas recientes</h2>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-bold text-gray-700">
                  {(recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1)}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {recentReviews.map((r) => (
                <div key={r.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {r.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.user.name || "Comprador"}</p>
                      <div className="flex shrink-0 gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{r.product.name}</p>
                    {r.comment && <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">{r.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent orders / leads ── */}
        {isAutos ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Últimas consultas</h2>
              <Link href="/dashboard/consultas" className="text-sm text-indigo-600 hover:underline">
                Ver todas →
              </Link>
            </div>
            {recentLeads.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Todavía no recibiste consultas</p>
                <Link href={`/tienda/${store?.slug}`} target="_blank" className="mt-3 inline-block text-sm text-indigo-500 hover:underline">
                  Compartí tu tienda para recibir la primera →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{lead.customerName || "Sin nombre"}</p>
                      {lead.productName && <p className="text-xs text-gray-400 truncate">{lead.productName}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        lead.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                        lead.status === "PENDING"   ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {lead.status === "PENDING" ? "Pendiente" : lead.status === "CONFIRMED" ? "Confirmado" : lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Últimos pedidos</h2>
              <Link href="/dashboard/pedidos" className="text-sm text-indigo-600 hover:underline">
                Ver todos →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Todavía no tenés pedidos</p>
                <Link href={`/tienda/${store?.slug}`} target="_blank" className="mt-3 inline-block text-sm text-indigo-500 hover:underline">
                  Compartí tu tienda para recibir el primero →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{order.buyer.name || order.buyer.email}</p>
                      <p className="text-xs text-gray-400">{order.items.length} producto(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">${order.total.toLocaleString("es-AR")}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                        order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <ActivityFeed
          storeId={store.id}
          initialEvents={recentActivity.map((e) => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
          }))}
        />
      </div>
    </DashboardLayout>
  );
}
