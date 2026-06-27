export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import OrderActions from "@/components/orders/OrderActions";
import OrderCheckbox from "@/components/orders/OrderCheckbox";
import BulkActionsBar from "@/components/orders/BulkActionsBar";
import { BulkOrdersProvider, BulkModeToggle } from "@/components/orders/BulkOrdersContext";
import { prisma } from "@/lib/prisma";
import { ArrowUpRight, ChevronLeft, ChevronRight, Clock, Download, MessageSquare, Package, ShoppingBag, Star, Truck, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { money } from "@/lib/utils";
import { statusLabel, statusClass, statusBorderClass, parseAddress } from "@/lib/orders";

const PAGE_SIZE = 15;
const FILTERABLE_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

type Props = { searchParams: Promise<{ page?: string; status?: string }> };

export default async function PedidosPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const { page: pageParam, status: statusParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const statusFilter = FILTERABLE_STATUSES.includes(statusParam ?? "") ? statusParam : undefined;

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true },
  });

  const where = store ? { storeId: store.id, ...(statusFilter ? { status: statusFilter } : {}) } : null;

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
            statusLogs: { orderBy: { changedAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
        }),
        prisma.order.count({ where: where! }),
        prisma.order.count({ where: { storeId: store.id } }),
        prisma.order.count({ where: { storeId: store.id, status: "PENDING" } }),
        prisma.order.count({ where: { storeId: store.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } } }),
        prisma.order.aggregate({
          where: { storeId: store.id, status: { in: ["CONFIRMED", "SHIPPED", "DELIVERED"] } },
          _sum: { total: true },
        }),
        prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } }),
      ])
    : [[], 0, 0, 0, 0, { _sum: { total: null } }, 0];

  const revenue = revenueAgg._sum.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  function pageHref(targetPage: number, targetStatus = statusFilter) {
    const params = new URLSearchParams();
    if (targetStatus) params.set("status", targetStatus);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/dashboard/pedidos?${qs}` : "/dashboard/pedidos";
  }

  return (
    <DashboardLayout userName={user.name} userEmail={user.email} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
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
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className={`mb-3 inline-flex rounded-xl p-2 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-400">{label}</p>
          </div>
        ))}
      </div>

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

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <ShoppingBag className="h-8 w-8 text-indigo-300" />
          </div>
          {totalAll === 0 ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900">Todavía no hay pedidos</h2>
              <p className="mt-1 text-sm text-gray-400">Cuando alguien compre desde tu tienda, los pedidos aparecen acá.</p>
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-gray-50 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      <OrderCheckbox orderId={order.id} />
                    </div>
                    <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                      <span className="text-xs text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{order.createdAt.toLocaleString("es-AR")}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{money(order.total)}</p>
                    <p className="text-sm text-gray-400">{itemCount} producto(s) - pago {order.payment?.provider ?? "manual"} / {order.payment?.status ?? "PENDING"}</p>
                    </div>
                  </div>
                  <OrderActions
                    orderId={order.id}
                    status={order.status}
                    paymentProvider={order.payment?.provider}
                    paymentStatus={order.payment?.status}
                  />
                </div>

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
                      {order.statusLogs.map((log) => (
                        <li key={log.id} className="mb-2 ml-4">
                          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-300" />
                          <p className="text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">{log.fromStatus} → {log.toStatus}</span>
                            {" · "}
                            {new Date(log.changedAt).toLocaleString("es-AR")}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
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
