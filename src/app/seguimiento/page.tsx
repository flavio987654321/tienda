"use client";

import { useState } from "react";
import { Search, Package, CheckCircle, Truck, ShoppingBag, XCircle, Loader2 } from "lucide-react";

type Step = {
  key: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  { key: "PENDING",   label: "Pedido recibido",    desc: "Tu pedido fue registrado correctamente.",          icon: <ShoppingBag className="h-5 w-5" /> },
  { key: "CONFIRMED", label: "Pago confirmado",     desc: "El vendedor confirmó el pago.",                    icon: <CheckCircle className="h-5 w-5" /> },
  { key: "SHIPPED",   label: "Enviado",             desc: "Tu pedido está en camino.",                        icon: <Truck className="h-5 w-5" /> },
  { key: "DELIVERED", label: "Entregado",           desc: "¡Tu pedido fue entregado con éxito!",              icon: <Package className="h-5 w-5" /> },
];

const STATUS_ORDER = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

type OrderData = {
  id: string;
  status: string;
  createdAt: string;
  trackingCode: string | null;
  shippingMethod: string | null;
  total: number;
  store: { name: string; slug: string };
  items: { quantity: number; product: { name: string }; variant: { value: string } | null }[];
  statusLogs: { toStatus: string; changedAt: string }[];
};

export default function SeguimientoPage() {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (c.length < 6) { setError("Ingresá el código de tu pedido (mínimo 6 caracteres)"); return; }
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`/api/seguimiento?codigo=${encodeURIComponent(c)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Pedido no encontrado"); return; }
      setOrder(data.order);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const currentStepIndex = order ? STATUS_ORDER.indexOf(order.status) : -1;
  const isCancelled = order?.status === "CANCELLED";
  const fmt = (n: number) => `$${n.toLocaleString("es-AR")}`;
  const shortId = order ? order.id.slice(-8).toUpperCase() : "";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4">
            <Package className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Seguimiento de pedido</h1>
          <p className="text-slate-500 text-sm mt-2">Ingresá el código que recibiste en tu email de confirmación.</p>
        </div>

        {/* Search form */}
        <form onSubmit={buscar} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Código de pedido
          </label>
          <div className="flex gap-3">
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: LRRVV6ZZ"
              maxLength={20}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-semibold tracking-wider outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>

        {/* Result */}
        {order && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Order header */}
            <div className="bg-slate-900 px-6 py-5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{order.store.name}</p>
              <p className="text-white font-black text-lg tracking-tight">Pedido #{shortId}</p>
              <p className="text-slate-400 text-xs mt-1">
                {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                {" · "}{fmt(order.total)}
              </p>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* Cancelled state */}
              {isCancelled ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Pedido cancelado</p>
                    <p className="text-xs text-red-600 mt-0.5">Este pedido fue cancelado. Contactá al vendedor si tenés dudas.</p>
                  </div>
                </div>
              ) : (
                /* Steps */
                <div className="space-y-1">
                  {STEPS.map((step, i) => {
                    const done = i <= currentStepIndex;
                    const active = i === currentStepIndex;
                    const logEntry = order.statusLogs.find(l => l.toStatus === step.key);
                    return (
                      <div key={step.key} className="flex gap-4">
                        {/* Icon + line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            done
                              ? active ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}>
                            {step.icon}
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className={`w-0.5 flex-1 my-1 ${i < currentStepIndex ? "bg-emerald-400" : "bg-slate-200"}`} style={{ minHeight: 24 }} />
                          )}
                        </div>
                        {/* Text */}
                        <div className="pb-5 pt-1.5 flex-1 min-w-0">
                          <p className={`text-sm font-bold ${done ? "text-slate-900" : "text-slate-400"}`}>{step.label}</p>
                          {done && (
                            <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                          )}
                          {logEntry && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(logEntry.changedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tracking code */}
              {order.trackingCode && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Número de seguimiento del envío</p>
                  <p className="text-lg font-black text-blue-800 font-mono tracking-wider">{order.trackingCode}</p>
                </div>
              )}

              {/* Products */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Productos</p>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-semibold text-slate-800">{item.product.name}</span>
                        {item.variant && <span className="text-slate-400 ml-1">— {item.variant.value}</span>}
                      </div>
                      <span className="text-slate-500 text-xs">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
