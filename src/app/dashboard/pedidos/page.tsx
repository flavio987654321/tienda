export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import AutoRefresh from "@/components/AutoRefresh";
import OrderActions from "@/components/orders/OrderActions";
import OrderCheckbox from "@/components/orders/OrderCheckbox";
import BulkActionsBar from "@/components/orders/BulkActionsBar";
import { BulkOrdersProvider, BulkModeToggle } from "@/components/orders/BulkOrdersContext";
import { prisma } from "@/lib/prisma";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Clock, Download, MessageSquare, Package, Search, ShoppingBag, Star, Truck, UserRound, X } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { money } from "@/lib/utils";
import { statusLabel, statusClass, statusBorderClass, parseAddress } from "@/lib/orders";
import { ESTADOS_VENTA_CONFIRMADA_LISTA } from "@/lib/order-status";

const PAGE_SIZE = 15;
const FILTERABLE_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

type Props = { searchParams: Promise<{ page?: string; status?: string; q?: string }> };

export default async function PedidosPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const { page: pageParam, status: statusParam, q: qParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const statusFilter = FILTERABLE_STATUSES.includes(statusParam ?? "") ? statusParam : undefined;
  const query = (qParam ?? "").trim();

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true },
  });

  /* Buscar mira los cuatro lugares donde alguien esperaría encontrar un pedido:
     el nombre y el mail de la cuenta que compró, los datos de envío —donde va el
     nombre real cuando compraron para otra persona, más el teléfono— y el número
     que se muestra en la tarjeta. Ese número son los últimos seis caracteres del
     id, en mayúscula: por eso se busca con `endsWith` sobre el id en minúscula,
     que es como lo guarda cuid. */
  const searchWhere = query
    ? {
        OR: [
          { buyer: { name:  { contains: query, mode: "insensitive" as const } } },
          { buyer: { email: { contains: query, mode: "insensitive" as const } } },
          { shippingAddress: { contains: query, mode: "insensitive" as const } },
          { id: { endsWith: query.toLowerCase() } },
        ],
      }
    : {};

  const where = store
    ? { storeId: store.id, ...(statusFilter ? { status: statusFilter } : {}), ...searchWhere }
    : null;

  const [orders, totalFiltered, totalAll, totalPending, totalConfirmed, revenueAgg, pendingAffiliateCount] = store
    ? await Promise.all([
        prisma.order.findMany({
          where: where!,
          include: {
            buyer: { select: { name: true, email: true } },
            items: { include: { product: true, variant: true } },
            payment: true,
            shipping: true,
            affiliate: { include: { user: { select: { name: true, email: true } } } },
            commission: true,
            coupon: { select: { code: true } },
            reviews: { include: { product: { select: { name: true } } } },
            /* Con tope y por los más nuevos. Sin `take` se traía el historial
               completo de cada pedido, por los 15 de la página: un pedido que
               rebotó mucho de estado se llevaba puesta la consulta entera. Se
               piden al revés para quedarse con los últimos, y se dan vuelta al
               dibujarlos para que la línea de tiempo siga leyéndose de vieja a
               nueva. */
            statusLogs: { orderBy: { changedAt: "desc" }, take: 20 },
          },
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
        }),
        prisma.order.count({ where: where! }),
        prisma.order.count({ where: { storeId: store.id } }),
        prisma.order.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.order.count({ where: { storeId: store.id, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA } } }),
        prisma.order.aggregate({
          where: { storeId: store.id, status: { in: ESTADOS_VENTA_CONFIRMADA_LISTA } },
          _sum: { total: true },
        }),
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
      ])
    : [[], 0, 0, 0, 0, { _sum: { total: null } }, 0];

  const revenue = revenueAgg._sum.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  function pageHref(targetPage: number, targetStatus = statusFilter, targetQuery = query) {
    const params = new URLSearchParams();
    if (targetStatus) params.set("status", targetStatus);
    if (targetQuery) params.set("q", targetQuery);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/dashboard/pedidos?${qs}` : "/dashboard/pedidos";
  }

  return (
    <DashboardLayout userName={user.name} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
      {/* Un pedido nuevo o un cambio de estado aparece solo, sin recargar */}
      <AutoRefresh tables={["Order"]} />
      <BulkOrdersProvider orders={orders.map((o) => ({ id: o.id, status: o.status }))}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="mt-1 text-gray-500">Gestiona pagos, stock, comisiones y envios de {store?.name ?? "tu tienda"}</p>
        </div>
        {totalAll > 0 && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {orders.length > 0 && <BulkModeToggle />}
            <a
              href="/api/pedidos/export"
              download
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Pendientes", value: totalPending, icon: ShoppingBag, color: "bg-yellow-50 text-yellow-700" },
          { label: "Confirmados", value: totalConfirmed, icon: Package, color: "bg-green-50 text-green-700" },
          { label: "Ingresos confirmados", value: money(revenue), icon: Truck, color: "bg-indigo-50 text-indigo-700" },
        ].map(({ label, value, icon: Icon, color }, i, todas) => (
          <div
            key={label}
            /* Son tres tarjetas en dos columnas: la última quedaba sola ocupando
               media fila, con un hueco al lado. Cuando la cantidad es impar, la
               última se lleva el ancho completo — y de paso "Ingresos
               confirmados" entra en un renglón en vez de partirse en dos. */
            className={`rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 ${
              i === todas.length - 1 && todas.length % 2 === 1 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <div className={`mb-3 inline-flex rounded-xl p-2 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate" title={String(value)}>{value}</p>
            <p className="text-sm text-gray-400 truncate">{label}</p>
          </div>
        ))}
      </div>

      {/* Buscador. Es un <form method="get"> pelado a propósito: manda a esta
          misma ruta con ?q=, así la página sigue siendo un Server Component y
          anda sin JavaScript. Como `page` no está en el form, cada búsqueda
          vuelve sola a la primera página. */}
      {totalAll > 0 && (
        <form method="get" action="/dashboard/pedidos" className="mb-4 flex gap-2">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre, email, teléfono o #pedido"
              aria-label="Buscar pedidos"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Buscar
          </button>
          {query && (
            <Link
              href={pageHref(1, statusFilter, "")}
              aria-label="Limpiar la búsqueda"
              className="flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </form>
      )}

      {query && (
        <p className="mb-4 text-sm text-gray-500">
          {totalFiltered === 0
            ? <>Sin resultados para <strong className="text-gray-700">{query}</strong>.</>
            : <>{totalFiltered} {totalFiltered === 1 ? "pedido" : "pedidos"} para <strong className="text-gray-700">{query}</strong>.</>}
          {" "}
          <Link href={pageHref(1, statusFilter, "")} className="text-indigo-600 hover:underline">Ver todos</Link>
        </p>
      )}

      {totalAll > 0 && (
        <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
          {[{ key: undefined, label: "Todos" }, ...FILTERABLE_STATUSES.map((s) => ({ key: s, label: statusLabel(s) }))].map(
            ({ key, label }) => (
              <Link
                key={label}
                href={pageHref(1, key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === key
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </Link>
            )
          )}
        </div>
      )}

      {/* El vacío va con `p-8` en angosto: con `p-16` a secas quedaban 200px de
          texto en una pantalla de 360 y el mensaje caía en tres renglones
          flaquitos. */}
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <ShoppingBag className="h-8 w-8 text-indigo-300" />
          </div>
          {totalAll === 0 ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Todavía no hay pedidos</h2>
              <p className="mt-1 text-sm text-gray-400">Cuando alguien compre desde tu tienda, los pedidos aparecen acá.</p>
            </>
          ) : query ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Sin resultados</h2>
              <p className="mt-1 text-sm text-gray-400">
                No encontramos pedidos que coincidan con <strong className="text-gray-600">{query}</strong>.
                Se busca por nombre, email, teléfono y número de pedido.
              </p>
              <Link href={pageHref(1, undefined, "")} className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline">
                Ver todos los pedidos
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900">No hay pedidos con este filtro</h2>
              <p className="mt-1 text-sm text-gray-400">Probá con otro estado o mirá todos los pedidos.</p>
            </>
          )}
          {store && totalAll === 0 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <a
                href={`/tienda/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                Ver mi tienda <ArrowUpRight className="h-4 w-4" />
              </a>
              <p className="text-xs text-gray-400">Compartí el link de tu tienda para empezar a recibir pedidos.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const address = parseAddress(order.shippingAddress);
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div
                key={order.id}
                className={`rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 ${statusBorderClass(order.status)} ${order.status === "CANCELLED" ? "opacity-60" : ""}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="pt-1">
                      <OrderCheckbox orderId={order.id} />
                    </div>
                    <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                      <span className="text-xs text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                      {/* Sin los segundos y con el año corto: la fecha larga
                          ("7/8/2026, 10:25:33") se comía un renglón entero en
                          360, y el segundo exacto de la compra no le sirve a
                          nadie acá. */}
                      <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {order.createdAt.toLocaleString("es-AR", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{money(order.total)}</p>
                    {/* Quién compró, plegado. Sin esto la tarjeta cerrada mostraba
                        plata y estado pero no de quién era el pedido, que es
                        justo lo que uno busca al recorrer la lista. */}
                    <p className="truncate text-sm font-medium text-gray-600">
                      {address.name || order.buyer.name || order.buyer.email}
                    </p>
                    <p className="text-xs text-gray-400">{itemCount} producto(s) - pago {order.payment?.provider ?? "manual"} / {order.payment?.status ?? "PENDING"}</p>
                    </div>
                  </div>
                  <OrderActions
                    orderId={order.id}
                    status={order.status}
                    paymentProvider={order.payment?.provider}
                    paymentStatus={order.payment?.status}
                  />
                </div>

                {/* Todo el detalle va plegado. Antes cada tarjeta desplegaba
                    productos, comprador, envío, comisión, reseñas e historial
                    completo — por 15 pedidos por página, eso era una pantalla
                    interminable, y en 360 directamente inusable. Es un <details>
                    nativo justamente para no tener que volver cliente a toda la
                    página por un abrir y cerrar. */}
                <details className="group mt-3 border-t border-gray-50 pt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 [&::-webkit-details-marker]:hidden">
                    Ver detalle
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                  </summary>

                <div className="grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr]">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Package className="h-4 w-4 text-gray-400" />
                      Productos
                    </p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{item.product.name}</p>
                              {item.variant && <p className="text-xs text-gray-400">{item.variant.name}: {item.variant.value}</p>}
                            </div>
                            <p className="font-bold text-gray-900">{item.quantity} x {money(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(order.discountAmount > 0 || order.shippingCost > 0) && (
                      <div className="mt-2 space-y-0.5 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                        <p className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></p>
                        {order.discountAmount > 0 && (
                          <p className="flex justify-between text-emerald-600">
                            <span>Descuento{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                            <span>− {money(order.discountAmount)}</span>
                          </p>
                        )}
                        {order.shippingCost > 0 && (
                          <p className="flex justify-between"><span>Envío</span><span>{money(order.shippingCost)}</span></p>
                        )}
                        <p className="flex justify-between font-bold text-gray-800"><span>Total</span><span>{money(order.total)}</span></p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                      <UserRound className="h-4 w-4 text-gray-400" />
                      Comprador
                    </p>
                    <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                      <p className="font-semibold text-gray-900">{address.name || order.buyer.name || "Sin nombre"}</p>
                      <p>{address.email || order.buyer.email}</p>
                      {address.phone && <p>{address.phone}</p>}
                      {(address.street || address.city) && (
                        <p className="mt-2 text-xs text-gray-400">
                          {[address.street, address.city, address.province, address.postalCode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    {order.notes && (
                      <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Nota del comprador
                        </p>
                        <p>{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Truck className="h-4 w-4 text-gray-400" />
                      Venta y envio
                    </p>
                    <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                      <p><strong>Envio:</strong> {order.shippingMethod || "A coordinar"} ({money(order.shippingCost)})</p>
                      <p><strong>Tracking:</strong> {order.trackingCode || order.shipping?.trackingCode || "Sin cargar"}</p>
                      {order.affiliate ? (
                        <div className="mt-3 rounded-lg bg-purple-50 p-2 text-purple-700">
                          <p className="font-semibold">Venta por afiliado</p>
                          <p>{order.affiliate.user.name || order.affiliate.user.email}</p>
                          <p>
                            Comision: {order.commission
                              ? `${money(order.commission.amount)} (${order.commission.rate}%)`
                              : order.lockedCommissionRate !== null
                                ? `se genera al confirmar pago (${order.lockedCommissionRate}%)`
                                : "se genera al confirmar pago"}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg bg-gray-100 p-2 text-xs text-gray-500">Venta directa de la tienda, sin comision.</p>
                      )}
                    </div>
                  </div>
                </div>

                {order.reviews.length > 0 && (
                  <div className="mt-4 border-t border-gray-50 pt-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                      <Star className="h-3.5 w-3.5" />
                      Reseñas del comprador
                    </p>
                    <div className="space-y-2">
                      {order.reviews.map((review) => (
                        <div key={review.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-gray-900">{review.product.name}</p>
                            <span className="text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                          </div>
                          {review.comment && <p className="mt-1 text-gray-600">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.statusLogs.length > 0 && (
                  <div className="mt-4 border-t border-gray-50 pt-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      Historial de cambios
                    </p>
                    <ol className="relative ml-2 border-l border-gray-100">
                      {[...order.statusLogs].reverse().map((log) => (
                        <li key={log.id} className="mb-2 ml-4">
                          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-300" />
                          {/* Los estados salían crudos de la base, en inglés
                              ("PENDING → CONFIRMED"), en la única parte del
                              archivo que no pasaba por `statusLabel`. */}
                          <p className="text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">{statusLabel(log.fromStatus)} → {statusLabel(log.toStatus)}</span>
                            {" · "}
                            {new Date(log.changedAt).toLocaleString("es-AR", {
                              day: "2-digit", month: "2-digit", year: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                  <Link
                    href={`/dashboard/pedidos/${order.id}`}
                    className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    Abrir la ficha completa →
                  </Link>
                </details>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Link>
              ) : <span />}
              <p className="text-sm text-gray-400">Página {page} de {totalPages}</p>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Link>
              ) : <span />}
            </div>
          )}
          <BulkActionsBar />
        </div>
      )}
      </BulkOrdersProvider>
    </DashboardLayout>
  );
}
