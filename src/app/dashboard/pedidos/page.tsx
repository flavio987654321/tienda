import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import OrderActions from "@/components/orders/OrderActions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, ShoppingBag, Truck, UserRound } from "lucide-react";

function money(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

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
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const store = await prisma.store.findUnique({
    where: { ownerId: userId },
    select: { id: true, name: true },
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
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const totalPending = orders.filter((order) => order.status === "PENDING").length;
  const totalConfirmed = orders.filter((order) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status)).length;
  const revenue = orders
    .filter((order) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(order.status))
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <DashboardLayout userName={session.user.name} userEmail={session.user.email}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="mt-1 text-gray-500">Gestiona pagos, stock, comisiones y envios de {store?.name ?? "tu tienda"}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
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
          <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-gray-200" />
          <h2 className="text-lg font-semibold text-gray-900">Todavia no hay pedidos</h2>
          <p className="mt-1 text-sm text-gray-400">Cuando alguien compre desde la tienda, aparece aca.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const address = parseAddress(order.shippingAddress);
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-4">
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
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
