"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Package, CheckCircle, Truck, ShoppingBag, XCircle, Loader2 } from "lucide-react";

type Step = { key: string; label: string; desc: string; icon: React.ReactNode };

const STEPS: Step[] = [
  { key: "PENDING",   label: "Pedido recibido",  desc: "Tu pedido fue registrado correctamente.", icon: <ShoppingBag className="h-5 w-5" /> },
  { key: "CONFIRMED", label: "Pago confirmado",   desc: "El vendedor confirmó el pago.",           icon: <CheckCircle className="h-5 w-5" /> },
  { key: "SHIPPED",   label: "En camino",         desc: "Tu pedido está en camino.",               icon: <Truck className="h-5 w-5" /> },
  { key: "DELIVERED", label: "Entregado",         desc: "¡Tu pedido fue entregado con éxito!",     icon: <Package className="h-5 w-5" /> },
];

const STATUS_ORDER = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

type OrderData = {
  id: string;
  status: string;
  createdAt: string;
  trackingCode: string | null;
  shippingMethod: string | null;
  total: number;
  store: { name: string };
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
    if (c.length < 6) { setError("Ingresá el código de tu pedido"); return; }
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`/api/seguimiento?codigo=${encodeURIComponent(c)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Pedido no encontrado. Verificá el código."); return; }
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
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-black text-lg tracking-tight">TiendaApps</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#tiendas" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Tiendas</Link>
            <Link href="/#como-funciona" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Cómo funciona</Link>
            <Link href="/precios" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Precios</Link>
            <Link href="/seguimiento" className="text-white text-sm font-semibold transition-colors">Seguimiento</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Iniciar sesión</Link>
            <Link href="/registro" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + form */}
      <div className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 py-16 grid md:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full mb-6">
              Seguimiento en tiempo real
            </span>
            <h1 className="text-5xl lg:text-6xl font-black text-white leading-none tracking-tight mb-6">
              Seguí tu pedido<br />
              <span className="text-indigo-400">en tiempo real.</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-8">
              Ingresá el código de 8 caracteres que recibiste en el email de confirmación y mirá el estado de tu pedido al instante.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Actualización instantánea", "Sin registro", "24/7"].map(tag => (
                <span key={tag} className="text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right — form + result */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-8">
              <h2 className="text-white font-bold text-xl mb-1">Ingresar código</h2>
              <p className="text-gray-500 text-sm mb-6">Te lo enviamos por email al confirmar el pedido.</p>

              <form onSubmit={buscar} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Código de pedido
                  </label>
                  <input
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: LRRVV6ZZ"
                    maxLength={20}
                    className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-3.5 text-white font-mono font-bold tracking-widest text-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-600 placeholder:font-normal placeholder:tracking-normal placeholder:text-base"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-base transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                  Ver seguimiento
                </button>
              </form>

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {!order && !error && (
                <div className="mt-5 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-gray-400 mb-0.5">Ejemplo rápido</p>
                  <p className="text-sm text-gray-500">El código aparece en el email como <span className="font-mono text-gray-300">Pedido #XXXXXXXX</span></p>
                </div>
              )}
            </div>

            {/* Result card */}
            {order && (
              <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-indigo-600 px-6 py-5">
                  <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">{order.store.name}</p>
                  <p className="text-white font-black text-xl">Pedido #{shortId}</p>
                  <p className="text-indigo-200 text-xs mt-1">
                    {new Date(order.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                    {" · "}{fmt(order.total)}
                  </p>
                </div>

                <div className="px-6 py-6 space-y-6">
                  {isCancelled ? (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-4">
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-red-400">Pedido cancelado</p>
                        <p className="text-xs text-gray-500 mt-0.5">Contactá al vendedor si tenés dudas.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {STEPS.map((step, i) => {
                        const done = i <= currentStepIndex;
                        const active = i === currentStepIndex;
                        const logEntry = order.statusLogs.find(l => l.toStatus === step.key);
                        return (
                          <div key={step.key} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                active ? "bg-indigo-600 text-white ring-4 ring-indigo-600/30"
                                : done ? "bg-emerald-500 text-white"
                                : "bg-white/5 text-gray-600"
                              }`}>
                                {step.icon}
                              </div>
                              {i < STEPS.length - 1 && (
                                <div className={`w-0.5 flex-1 my-1 ${i < currentStepIndex ? "bg-emerald-500/50" : "bg-white/10"}`} style={{ minHeight: 20 }} />
                              )}
                            </div>
                            <div className="pb-4 pt-2 flex-1">
                              <p className={`text-sm font-bold ${done ? "text-white" : "text-gray-600"}`}>{step.label}</p>
                              {done && <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>}
                              {logEntry && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {new Date(logEntry.changedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {order.trackingCode && (
                    <div className="bg-indigo-600/10 border border-indigo-600/30 rounded-xl px-4 py-4">
                      <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Número de seguimiento del envío</p>
                      <p className="text-xl font-black text-white font-mono tracking-wider">{order.trackingCode}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Productos</p>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-semibold text-gray-300">{item.product.name}</span>
                            {item.variant && <span className="text-gray-500 text-xs ml-1">— {item.variant.value}</span>}
                          </div>
                          <span className="text-gray-600 text-xs">×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
