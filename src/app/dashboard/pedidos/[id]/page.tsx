export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import OrderActions from "@/components/orders/OrderActions";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Clock, MessageSquare, Package, Star, Truck, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-session";
import { money } from "@/lib/utils";
import { statusLabel, statusClass, parseAddress } from "@/lib/orders";
import { parseOrderPromoSummary } from "@/lib/email";

type Props = { params: Promise<{ id: string }> };

export default async function PedidoDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });

  if (!store) redirect("/dashboard");

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
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
  });

  if (!order) notFound();

  const pendingAffiliateCount = await prisma.affiliate.count({
    where: { storeId: store.id, status: "PENDING" },
  });

  const address = parseAddress(order.shippingAddress);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <DashboardLayout userName={user.name} userId={user.id} initialPendingAffiliateCount={pendingAffiliateCount}>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/pedidos"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pedidos
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>
              {statusLabel(order.status)}
            </span>
            <span className="text-sm font-mono text-gray-400">#{order.id.slice(-6).toUpperCase()}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{money(order.total)}</p>
          <p className="mt-1 text-sm text-gray-400">
            {itemCount} producto{itemCount !== 1 ? "s" : ""} · {order.createdAt.toLocaleString("es-AR")}
          </p>
        </div>
        <OrderActions
          orderId={order.id}
          status={order.status}
          trackingCode={order.trackingCode}
          paymentProvider={order.payment?.provider}
          paymentStatus={order.payment?.status}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Package className="h-4 w-4 text-gray-400" />
            Productos
          </p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.product.name}</p>
                    {item.variant && (
                      <p className="text-xs text-gray-400">{item.variant.name}: {item.variant.value}</p>
                    )}
                  </div>
                  <p className="font-bold text-gray-900 shrink-0">{item.quantity} x {money(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
          {(() => {
            // A-04 — QUÉ promoción se aplicó, no solo cuánto se ahorró.
            // `promoSummary` se guardaba en cada pedido y se usaba en los mails y en
            // el conteo de la sección Promociones, pero ninguna pantalla del panel
            // lo mostraba: el comprador veía la promo en su mail y la dueña no la
            // veía en su panel. Sale del JSON congelado en la venta, así que dice lo
            // que se cobró aunque la promo haya cambiado o se haya archivado.
            const { appliedPromos, freeShippingPromo } = parseOrderPromoSummary(order.promoSummary);
            const hayPromo = appliedPromos.length > 0 || !!freeShippingPromo;
            // El bloque también aparece con promo sin cupón ni envío pago — antes en
            // ese caso no se mostraba nada, ni siquiera el subtotal.
            if (!(order.discountAmount > 0 || order.shippingCost > 0 || hayPromo)) return null;
            return (
              <div className="mt-2 space-y-0.5 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                <p className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal)}</span></p>
                {appliedPromos.filter((p) => p.savings > 0).map((p, i) => (
                  <p key={i} className="flex justify-between gap-3 text-emerald-600">
                    <span>🎉 {p.name ? `${p.name} · ${p.label}` : p.label}</span>
                    <span className="shrink-0">− {money(p.savings)}</span>
                  </p>
                ))}
                {order.discountAmount > 0 && (
                  <p className="flex justify-between text-emerald-600">
                    <span>Descuento{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                    <span>− {money(order.discountAmount)}</span>
                  </p>
                )}
                {order.shippingCost > 0 && (
                  <p className="flex justify-between"><span>Envío</span><span>{money(order.shippingCost)}</span></p>
                )}
                {freeShippingPromo && (
                  <p className="flex justify-between gap-3 text-emerald-600">
                    <span>🚚 Envío gratis{freeShippingPromo.name ? ` · ${freeShippingPromo.name}` : ""}</span>
                    {/* Lo que costaba ese envío y la tienda no cobró (#7c). Sin esto
                        el "gratis" parece salir de la nada. */}
                    <span className="shrink-0">{order.shippingWaived > 0 ? `te costó ${money(order.shippingWaived)}` : "sin cargo"}</span>
                  </p>
                )}
                <p className="flex justify-between font-bold text-gray-800"><span>Total</span><span>{money(order.total)}</span></p>
              </div>
            );
          })()}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <UserRound className="h-4 w-4 text-gray-400" />
            Comprador
          </p>
          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 space-y-0.5">
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

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Truck className="h-4 w-4 text-gray-400" />
            Venta y envío
          </p>
          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 space-y-1">
            <p><strong>Pago:</strong> {order.payment?.provider ?? "manual"} / {order.payment?.status ?? "PENDING"}</p>
            <p><strong>Envío:</strong> {order.shippingMethod || "A coordinar"} ({money(order.shippingCost)})</p>
            <p><strong>Tracking:</strong> {order.trackingCode || order.shipping?.trackingCode || "Sin cargar"}</p>
            {order.affiliate ? (
              <div className="mt-3 rounded-lg bg-purple-50 p-2 text-purple-700">
                <p className="font-semibold">Venta por afiliado</p>
                <p>{order.affiliate.user.name || order.affiliate.user.email}</p>
                <p>
                  Comisión: {order.commission
                    ? `${money(order.commission.amount)} (${order.commission.rate}%)`
                    : order.lockedCommissionRate !== null
                      ? `se genera al confirmar pago (${order.lockedCommissionRate}%)`
                      : "se genera al confirmar pago"}
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-gray-100 p-2 text-xs text-gray-500">Venta directa, sin comisión.</p>
            )}
          </div>
        </div>
      </div>

      {order.reviews.length > 0 && (
        <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
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
        <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
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
    </DashboardLayout>
  );
}
