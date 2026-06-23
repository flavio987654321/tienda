"use client";

import { useState } from "react";
import { ChevronDown, History, Loader2 } from "lucide-react";

interface MovementItem {
  id: string;
  createdAt: string;
  variantLabel: string;
  type: string;
  typeLabel: string;
  delta: number;
  stockAfter: number;
  reason: string | null;
  changedBy: string;
}

export default function StockHistoryPanel({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MovementItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load(initial: boolean) {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`/api/productos/${productId}/movimientos`, window.location.origin);
      if (!initial && cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el historial");
      setItems((prev) => (initial ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load(true);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <History className="h-4 w-4 text-indigo-500" />
        Historial de movimientos de stock
        <ChevronDown className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 py-4">
          {loading && items.length === 0 && (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && items.length === 0 && !error && (
            <p className="text-sm text-gray-400">Todavía no hay movimientos registrados.</p>
          )}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">Fecha</th>
                    <th className="text-left py-2 pr-4">Variante</th>
                    <th className="text-left py-2 pr-4">Tipo</th>
                    <th className="text-left py-2 pr-4">Cambio</th>
                    <th className="text-left py-2 pr-4">Stock</th>
                    <th className="text-left py-2 pr-4">Motivo</th>
                    <th className="text-left py-2">Quién</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{m.variantLabel}</td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{m.typeLabel}</span>
                      </td>
                      <td className={`py-2 pr-4 font-semibold ${m.delta > 0 ? "text-emerald-600" : m.delta < 0 ? "text-red-500" : "text-gray-400"}`}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </td>
                      <td className="py-2 pr-4 text-gray-700">{m.stockAfter} u.</td>
                      <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{m.reason || "—"}</td>
                      <td className="py-2 text-gray-500">{m.changedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {cursor && (
            <button
              type="button"
              onClick={() => load(false)}
              disabled={loading}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Ver más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
