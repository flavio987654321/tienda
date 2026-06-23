"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ShoppingBag, Package, CheckCircle, Truck, MapPin,
  XCircle, Loader2, RefreshCw, Store, ArrowLeft, MessageCircle, Clock,
} from "lucide-react";

type OrderData = {
  id: string;
  status: string;
  createdAt: string;
  trackingCode: string | null;
  shippingMethod: string | null;
  shippingAddress: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  coupon: { code: string } | null;
  payment: { provider: string; status: string } | null;
  store: { name: string; slug: string; logo: string | null; whatsapp: string | null };
  items: {
    quantity: number;
    price: number;
    product: { name: string };
    variant: { value: string; name: string } | null;
  }[];
  statusLogs: { toStatus: string; changedAt: string }[];
};

type Address = {
  name?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

const STEPS = [
  { key: "PENDING",   label: "Pedido recibido",  desc: "Tu pedido fue registrado.", icon: ShoppingBag },
  { key: "CONFIRMED", label: "En preparación",   desc: "El vendedor está preparando tu pedido.", icon: CheckCircle },
  { key: "SHIPPED",   label: "Enviado",           desc: "Tu pedido está en camino.", icon: Truck },
  { key: "DELIVERED", label: "Entregado",         desc: "¡Tu pedido fue entregado!", icon: Package },
];
const STATUS_ORDER = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function parseAddress(s: string): Address {
  try { return JSON.parse(s); } catch { return {}; }
}

function whatsappLink(number: string, orderId: string) {
  const digits = number.replace(/[^\d]/g, "");
  const msg = encodeURIComponent(`Hola! Tengo una consulta sobre mi pedido #${orderId}.`);
  return `https://wa.me/${digits}?text=${msg}`;
}

export default function SeguimientoCodigoPage() {
  const params = useParams();
  const codigo = (params.codigo as string)?.toUpperCase();

  const [order, setOrder]       = useState<OrderData | null>(null);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/seguimiento?codigo=${encodeURIComponent(codigo)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Pedido no encontrado."); return; }
      setOrder(data.order);
      setLastUpdate(new Date());
      setError("");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [codigo]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => fetchOrder(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const currentIndex  = order ? STATUS_ORDER.indexOf(order.status) : -1;
  const isCancelled   = order?.status === "CANCELLED";
  const shortId       = order ? order.id.slice(-8).toUpperCase() : codigo;
  const address       = order ? parseAddress(order.shippingAddress) : {} as Address;
  const isPendingTransfer = order?.status === "PENDING" && order.payment && order.payment.provider !== "mp";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">TiendaApps</span>
          </Link>
          <Link href="/seguimiento" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Buscar otro pedido
          </Link>
        </div>
      </nav>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            <p className="text-gray-500 text-sm">Buscando pedido #{codigo}…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-gray-900 font-bold text-xl">Pedido no encontrado</h2>
            <p className="text-gray-500 text-sm max-w-xs">{error}</p>
            <Link href="/seguimiento" className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-semibold">
              ← Volver a buscar
            </Link>
          </div>
        )}

        {/* Content */}
        {!loading && order && (
          <div className="space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {order.store.logo ? (
                    <Image src={order.store.logo} alt={order.store.name} width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <Store className="h-4 w-4 text-indigo-600" />
                    </div>
                  )}
                  <span className="text-indigo-600 text-sm font-semibold">{order.store.name}</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900">Pedido #{shortId}</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                  {" · "}{fmt(order.total)}
                </p>
              </div>
              <button
                onClick={() => fetchOrder(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors mt-1 disabled:opacity-60"
                title="Actualizar estado"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : "Actualizar"}
              </button>
            </div>

            {/* Cancelled banner */}
            {isCancelled && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 flex items-center gap-4">
                <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-red-600 font-bold">Pedido cancelado</p>
                  <p className="text-gray-500 text-sm mt-0.5">Este pedido fue cancelado. Contactá al vendedor si tenés dudas.</p>
                </div>
              </div>
            )}

            {/* Pago pendiente (transferencia/efectivo) */}
            {isPendingTransfer && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 flex items-center gap-4">
                <Clock className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <p className="text-amber-700 font-bold">Esperando confirmación de pago</p>
                  <p className="text-gray-500 text-sm mt-0.5">
                    El vendedor todavía no confirmó haber recibido el pago. Revisá el email de tu pedido para ver los datos de pago.
                  </p>
                </div>
              </div>
            )}

            {/* Stepper */}
            {!isCancelled && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Estado del pedido</p>
                <div className="flex flex-col gap-0">
                  {STEPS.map((step, i) => {
                    const done   = i <= currentIndex;
                    const active = i === currentIndex;
                    const log    = order.statusLogs.find(l => l.toStatus === step.key);
                    const Icon   = step.icon;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            active ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                            : done  ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-400"
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`w-0.5 my-1 ${i < currentIndex ? "bg-emerald-300" : "bg-gray-100"}`} style={{ minHeight: 24 }} />
                          )}
                        </div>
                        <div className="pb-5 pt-2 flex-1">
                          <p className={`text-sm font-bold ${done ? "text-gray-900" : "text-gray-400"}`}>{step.label}</p>
                          {done && <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>}
                          {log && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(log.changedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking code del courier */}
            {order.trackingCode && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-6 py-5">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Número de seguimiento del envío</p>
                <p className="text-2xl font-black text-gray-900 font-mono tracking-wider">{order.trackingCode}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">

              {/* Productos */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Productos</p>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}: {item.variant.value}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{fmt(item.price * item.quantity)}</p>
                        <p className="text-xs text-gray-400">×{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                  {order.subtotal !== order.total && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-600">{fmt(order.subtotal)}</span>
                    </div>
                  )}
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Descuento{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                      <span className="text-emerald-600">− {fmt(order.discountAmount)}</span>
                    </div>
                  )}
                  {order.shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Envío</span>
                      <span className="text-gray-600">{fmt(order.shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="text-lg font-black text-gray-900">{fmt(order.total)}</span>
                  </div>
                </div>
              </div>

              {/* Comprador + envío */}
              <div className="space-y-4">
                {(address.name || address.city) && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Comprador</p>
                    {address.name && <p className="text-sm font-semibold text-gray-900">{address.name}</p>}
                    {(address.city || address.province) && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {[address.city, address.province].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Envío</p>
                  <p className="text-sm font-semibold text-gray-900">{order.shippingMethod || "A coordinar con el vendedor"}</p>
                  {order.shippingCost === 0
                    ? <p className="text-xs text-emerald-600 mt-0.5">Sin costo de envío</p>
                    : <p className="text-xs text-gray-500 mt-0.5">{fmt(order.shippingCost)}</p>
                  }
                </div>

                {!isCancelled && (
                  order.store.whatsapp ? (
                    <a
                      href={whatsappLink(order.store.whatsapp, shortId ?? "")}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-5 py-3 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      ¿Tenés dudas? Escribile a la tienda
                    </a>
                  ) : (
                    <div
                      title="La tienda no configuró un WhatsApp de contacto"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gray-100 text-gray-400 text-sm font-bold px-5 py-3 cursor-not-allowed"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Contacto por WhatsApp no disponible
                    </div>
                  )
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
