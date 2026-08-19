import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ShareStoreButton from "@/components/ShareStoreButton";
import PublishToggle from "@/components/PublishToggle";
import { getCurrentUser } from "@/lib/auth-session";
import DashboardLayout from "@/components/DashboardLayout";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import {
  ShoppingBag, Package, Users, TrendingUp,
  Store, Star, BadgeCheck, CheckCircle2,
  Eye,
} from "lucide-react";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";
import { statusLabel, statusClass } from "@/lib/orders";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // Sin sesión NO se redirige a `/login`: esa ruta está fuera del `scope` del
  // manifiesto, y desde el panel instalado abría el sitio comercial entero. La
  // pantalla la dibuja el layout. El porqué largo está en `dashboard/layout.tsx`.
  if (!user) return null;

  const userId = user.id;

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    include: {
      // Productos: sin los borrados. Los pausados SÍ se cuentan: son de la dueña
      // y los ve en su lista de productos, así que el total tiene que coincidir.
      //
      // Afiliados: sólo los aprobados y activos, que es EXACTAMENTE lo que cuenta
      // la tarjeta "Activos" de la sección (ver dashboard/vendedoras/page.tsx).
      // Sin este filtro entraban también los pendientes, los rechazados, los
      // pausados y los dados de baja — así que dar de baja al único afiliado
      // dejaba el cuadradito en 1, y los dos números del panel se contradecían
      // entre sí. El que cuenta de menos se nota; el que cuenta de más, no.
      _count: {
        select: {
          products: { where: { deletedAt: null } },
          orders: true,
          affiliates: { where: { status: "APPROVED", isActive: true } },
        },
      },
      verificationRequest: { select: { status: true } },
    },
  });

  /* El reparto por rol se hace en el layout, que corre antes que esto — acá
     sólo llega un OWNER. Lo único que queda es el caso raro: un dueño sin
     tienda creada.
     No debería existir: el registro crea la cuenta y la tienda en la MISMA
     transacción, así que o están las dos o no está ninguna.

     Pero lo que hacía si pasaba era `redirect("/login")`, y eso estaba mal por
     dos motivos a la vez. Uno, `/login` está fuera del `scope`: en el panel
     instalado se abría el sitio comercial entero. Y dos —peor—, quien llega acá
     TIENE sesión, así que `/login` lo manda de vuelta al panel, que lo manda a
     `/login`… un rebote sin salida, en una pantalla donde ni siquiera hay barra
     de direcciones para escaparse.

     Ahora se dice lo que pasa y se ofrece el único camino que sirve, que es
     escribirnos. Y queda escrito en el log del servidor, porque un OWNER sin
     tienda significa que algo se rompió en el registro y eso hay que verlo. */
  if (!store) {
    console.error("[dashboard] OWNER sin tienda:", userId);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 [color-scheme:light] p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-black text-gray-900">No encontramos tu tienda</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tu cuenta está bien, pero la tienda asociada no aparece. Es un problema
            nuestro y lo podemos resolver: escribinos y lo revisamos.
          </p>
          {/* Un `mailto:` y no un link a `/contacto`, que es la página que
              usaría cualquiera para esto. `/contacto` está fuera del `scope` del
              manifiesto, así que desde el panel instalado sería exactamente la
              fuga que estamos cerrando en este mismo cambio. El correo abre la
              app de mail y no navega a ningún lado, así que sirve igual en la
              web y adentro de la app. */}
          <a
            href={`mailto:soporte@tiendaapps.com?subject=${encodeURIComponent(
              "No aparece mi tienda"
            )}&body=${encodeURIComponent(`Mi cuenta: ${userId}`)}`}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Escribirnos
          </a>
        </div>
      </div>
    );
  }

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
    where: { storeId: store.id, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA } },
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
     
      userId={user.id}
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

        {/* ── Onboarding checklist ──
            La tarjeta vive en `OnboardingChecklist` (cliente): los pasos ya hechos
            se pliegan detrás de una flecha, así lo que falta no queda enterrado
            abajo de una lista de cosas tachadas. Los pasos se siguen calculando
            acá, en el servidor. */}
        {!allDone ? (
          <OnboardingChecklist steps={onboardingSteps} />
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
            {/* Link row
                Se apila abajo de `sm`: "Compartir" y "Ver" no se encogen y suman
                unos 180px, así que en 360 al texto le quedaban ~76 y el rótulo
                —que además no truncaba— se partía en "TU TIE / NDA". Con los
                botones en su propio renglón el link tiene el ancho completo. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 shrink-0">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5 whitespace-nowrap">Tu tienda</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">tiendaapps.com/tienda/{store.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                <ShareStoreButton
                  storeName={store.name}
                  storeSlug={store.slug}
                  storeLogo={store.logo}
                  isPublished={store.isPublished}
                  className="flex-1 sm:flex-none justify-center"
                />
                <Link
                  href={`/tienda/${store.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
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
              className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              {/* En 360 cada tarjeta deja unos 116px útiles: un "Ingresos totales"
                  de siete cifras no entra en `text-2xl` y desbordaba la grilla.
                  Baja un punto en pantalla angosta, y el truncado es la red por
                  si aun así se pasa. */}
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate" title={String(value)}>{value}</p>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{label}</p>
            </Link>
          ))}
        </div>

        {/* ── Recent reviews ── */}
        {recentReviews.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 mb-6">
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
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
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
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6">
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
                  <div key={order.id} className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                    {/* `min-w-0` + `truncate`: sin eso un mail largo empujaba el
                        precio fuera de la tarjeta. La lista de consultas de acá
                        al lado ya lo hacía bien; esta se había quedado atrás. */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{order.buyer.name || order.buyer.email}</p>
                      <p className="text-xs text-gray-400">{order.items.length} producto(s)</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">${order.total.toLocaleString("es-AR")}</p>
                      {/* Los mismos rótulo y color que usa Pedidos: acá se
                          mostraba el estado crudo de la base, en inglés. */}
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(order.status)}`}>
                        {statusLabel(order.status)}
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
