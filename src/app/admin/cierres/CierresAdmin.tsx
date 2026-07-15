"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CLOSURE_REASONS, CLOSURE_REASON_KEYS, type ClosureReason } from "@/lib/store-closure";

type Closure = {
  id: string;
  storeName: string;
  ownerEmail: string;
  ownerName: string | null;
  reason: string;
  comment: string | null;
  status: string;
  createdAt: string;
  store: { slug: string; closedAt: string | null } | null;
};

// Color por motivo: los accionables (algo que podemos resolver) en ámbar, los
// que no dependen de nosotros en gris. Es para leer la lista de un vistazo.
const REASON_STYLE: Record<ClosureReason, string> = {
  PRICE:         "bg-amber-500/20 text-amber-300 border-amber-500/30",
  NO_SALES:      "bg-amber-500/20 text-amber-300 border-amber-500/30",
  TOO_HARD:      "bg-red-500/20 text-red-300 border-red-500/30",
  SHUTTING_DOWN: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  COMPETITOR:    "bg-purple-500/20 text-purple-300 border-purple-500/30",
  OTHER:         "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function CierresAdmin() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // No setea loading=true acá: el spinner del montaje sale de useState(true) y el
  // del cambio de filtro lo enciende el botón. Mismo criterio que DenunciasAdmin,
  // para que el efecto no haga setState sincrónico.
  const load = useCallback(async (status: string, reason: string) => {
    try {
      const qs = new URLSearchParams({ status });
      if (reason) qs.set("reason", reason);
      const res = await fetch(`/api/admin/cierres?${qs}`);
      const data = await res.json();
      setClosures(data.closures ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter, reasonFilter);
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-cierres-rt")
      .on(
        "postgres_changes" as Parameters<ReturnType<typeof supabase.channel>["on"]>[0],
        { event: "*", schema: "public", table: "StoreClosure" },
        () => load(filter, reasonFilter)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter, reasonFilter, load]);

  async function marcarLeido(id: string, status: string) {
    if (updating) return;
    setUpdating(id);
    try {
      await fetch("/api/admin/cierres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setClosures((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {["PENDING", "REVIEWED", "ALL"].map((s) => (
          <button
            key={s}
            onClick={() => { setLoading(true); setFilter(s); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === s ? "bg-indigo-600 text-white border-indigo-500" : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
            }`}
          >
            {s === "PENDING" ? "Sin leer" : s === "REVIEWED" ? "Leídos" : "Todos"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => { setLoading(true); setReasonFilter(""); }}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            reasonFilter === "" ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-gray-500 border-white/10 hover:text-gray-300"
          }`}
        >
          Todos los motivos
        </button>
        {CLOSURE_REASON_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => { setLoading(true); setReasonFilter(k); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              reasonFilter === k ? "bg-white/15 text-white border-white/20" : "bg-white/5 text-gray-500 border-white/10 hover:text-gray-300"
            }`}
          >
            {CLOSURE_REASONS[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm py-12 text-center">Cargando...</div>
      ) : closures.length === 0 ? (
        <div className="text-gray-500 text-sm py-12 text-center">
          {filter === "PENDING" && !reasonFilter
            ? "Nadie cerró su tienda. Buena señal."
            : "No hay cierres con ese filtro."}
        </div>
      ) : (
        <div className="space-y-4">
          {closures.map((c) => {
            const reasonKey = c.reason as ClosureReason;
            const sigueCerrada = !!c.store?.closedAt;
            return (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${REASON_STYLE[reasonKey] ?? REASON_STYLE.OTHER}`}>
                        {CLOSURE_REASONS[reasonKey] ?? c.reason}
                      </span>
                      {c.status === "PENDING" && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">Sin leer</span>
                      )}
                      {!sigueCerrada && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">Volvió a abrir</span>
                      )}
                      <span className="text-gray-500 text-xs">
                        {new Date(c.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Nombre y email salen del snapshot: si eliminó la cuenta, la
                        relación ya devuelve "Tienda eliminada" y un mail anonimizado. */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">{c.storeName}</span>
                      {c.store?.slug && (
                        <Link href={`/tienda/${c.store.slug}`} target="_blank" className="text-indigo-400 text-xs hover:underline">
                          ver tienda ↗
                        </Link>
                      )}
                    </div>

                    {c.comment ? (
                      <p className="text-gray-300 text-sm mb-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 whitespace-pre-wrap">{c.comment}</p>
                    ) : (
                      <p className="text-gray-600 text-xs italic mb-2">Sin comentario</p>
                    )}

                    <p className="text-gray-500 text-xs">
                      {c.ownerName ? `${c.ownerName} · ` : ""}
                      <a href={`mailto:${c.ownerEmail}`} className="hover:text-gray-300 underline underline-offset-2">{c.ownerEmail}</a>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => marcarLeido(c.id, c.status === "PENDING" ? "REVIEWED" : "PENDING")}
                      disabled={updating === c.id}
                      className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-600/30 transition-all disabled:opacity-50"
                    >
                      {c.status === "PENDING" ? "Marcar leído" : "Marcar sin leer"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
