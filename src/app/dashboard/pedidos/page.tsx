export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import OrderActions from "@/components/orders/OrderActions";
import { prisma } from "@/lib/prisma";
import { ArrowUpRight, Clock, Download, Package, ShoppingBag, Truck, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { money } from "@/lib/utils";

function statusClass(status: string) {
  if (status === "CONFIRMED") return "bg-green-100 text-green-700";
  if (status === "SHIPPED") return "bg-blue-100 text-blue-700";
  if (status === "DELIVERED") return "bg-gray-900 text-white";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

function parseAddress(value: string) {
  try {
    return JSON.parse(value) as {
      name?: string;
      email?: string;
      phone?: string;
      street?: string;
      city?: string;
      province?: string;
      postalCode?: string;
    };
  } catch {
    return {};
  }
}

export default async function PedidosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userId = user.id;

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true },
  });

  const orders = store
    ? await prisma.order.findMany({
        where: { storeId: store.id },
        include: {
          buyer: { select: { name: true, email: true } },
          items: { include: { product: true, variant: true } },
          payment: true,
          shipping: true,
          affiliate: { include: { user: { select: { name: true, email: true } } } },
          commission: true,
          statusLogs: { orderBy: { changedAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const pendingAffiliateCount = store
    ? await prisma.affiliate.count({ where: { storeId: store.id, status: "PENDING" } })
    : 0;

  const totalPending = orders.filter((order) => order.status === "PENDING").length;
  const totalConfirmed = orders.filter((order) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status)).length;
  const revenue = orders
    .filter((order) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <DashboardLayout userName={user.name} userEmail={user.email} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="mt-1 text-gray-500">Gestiona pagos, stock, comisiones y envios de {store?.name ?? "tu tienda"}</p>
        </div>
        {orders.length > 0 && (
          <a
            href="/api/pedidos/export"
            download
            className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
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

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <ShoppingBag className="h-8 w-8 text-indigo-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Todavía no hay pedidos</h2>
          <p className="mt-1 text-sm text-gray-400">Cuando alguien compre desde tu tienda, los pedidos aparecen acá.</p>
          {store && (
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
              <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-gray-50 pb-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>{order.status}</span>
                      <span className="text-xs text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className="text-xs text-gray-400">{order.createdAt.toLocaleString("es-AR")}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{money(order.total)}</p>
                    <p className="text-sm text-gray-400">{itemCount} producto(s) - pago {order.payment?.provider ?? "manual"} / {order.payment?.status ?? "PENDING"}</p>
                  </div>
                  <OrderActions orderId={order.id} status={order.status} />
                </div>

                <div className="grid gap-5 pt-4 lg:grid-cols-[1.1fr_1fr_1fr]">
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
                          <p>Comision: {order.commission ? money(order.commission.amount) : "se genera al confirmar pago"}</p>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg bg-gray-100 p-2 text-xs text-gray-500">Venta directa de la tienda, sin comision.</p>
                      )}
                    </div>
                  </div>
                </div>

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
        </div>
      )}
    </DashboardLayout>
  );
}
