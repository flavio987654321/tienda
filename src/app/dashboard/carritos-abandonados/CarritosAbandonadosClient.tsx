"use client";

import { useState } from "react";
import { Loader2, Mail, Phone, ShoppingCart, Search } from "lucide-react";

type SnapshotItem = { name: string; price: number; qty: number; image?: string | null };

type CartRow = {
  id: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  items: SnapshotItem[];
  total: number;
  lastActivityAt: string;
  reminderSent: boolean;
};

function money(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "hace menos de 1h";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function CarritosAbandonadosClient({ carts, search }: { carts: CartRow[]; search?: string }) {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function resend(id: string, email: string) {
    // El botón ya se deshabilita mientras loadingId === id, pero esta guarda
    // extra evita una segunda request si el click llega antes del re-render.
    if (loadingId) return;
    setLoadingId(id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/dashboard/carritos-abandonados/${id}/recordar`, { method: "POST" });
      if (res.ok) {
        setSentIds((prev) => new Set(prev).add(id));
        showToast(`Recordatorio enviado a ${email}`);
      } else {
        setErrorId(id);
        showToast("No se pudo enviar el recordatorio");
      }
    } catch {
      setErrorId(id);
      showToast("No se pudo enviar el recordatorio");
    } finally {
      setLoadingId(null);
    }
  }

  if (carts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
        <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {search ? <Search className="h-8 w-8 text-indigo-400" /> : <ShoppingCart className="h-8 w-8 text-indigo-400" />}
        </div>
        {search ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin resultados para &quot;{search}&quot;</h3>
            <p className="text-gray-400">Probá buscar por otro nombre, email o teléfono.</p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Todavía no hay carritos abandonados</h3>
            <p className="text-gray-400">
              Cuando alguien escriba su email en el checkout y no termine la compra, va a aparecer acá.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {carts.map((cart) => {
          const justSent = sentIds.has(cart.id);
          const isLoading = loadingId === cart.id;
          return (
            <div key={cart.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{cart.customerName || "Sin nombre"}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      <a href={`mailto:${cart.customerEmail}`} className="hover:text-indigo-600">{cart.customerEmail}</a>
                    </span>
                    {cart.customerPhone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        <a href={`https://wa.me/${cart.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-indigo-600">
                          {cart.customerPhone}
                        </a>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Última actividad: {relativeTime(cart.lastActivityAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-gray-950">{money(cart.total)}</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cart.reminderSent || justSent ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {cart.reminderSent || justSent ? "Recordatorio enviado" : "Pendiente"}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Productos</p>
                <ul className="space-y-1">
                  {cart.items.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm text-gray-700">
                      <span>{item.name} {item.qty > 1 && <span className="text-gray-400">x{item.qty}</span>}</span>
                      <span className="font-semibold text-gray-900">{money(item.price * item.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {errorId === cart.id && (
                <p className="mt-3 text-xs text-red-600">No se pudo enviar el recordatorio. Intentá de nuevo.</p>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => resend(cart.id, cart.customerEmail)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  {isLoading ? "Enviando..." : "Reenviar recordatorio"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-slide">
          <div className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
