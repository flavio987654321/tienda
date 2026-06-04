"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Report = {
  id: string;
  reason: string;
  description: string | null;
  reporterEmail: string | null;
  status: string;
  createdAt: string;
  store: { id: string; name: string; slug: string; isActive: boolean };
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Pendiente",  color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  REVIEWED: { label: "Revisada",   color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  RESOLVED: { label: "Resuelta",   color: "bg-green-500/20 text-green-300 border-green-500/30" },
};

export default function DenunciasAdmin() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadReports(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/denuncias?status=${status}`);
      const data = await res.json();
      setReports(data.reports ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReports(filter); }, [filter]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch("/api/admin/denuncias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {["PENDING", "REVIEWED", "RESOLVED", "ALL"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === s
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
            }`}
          >
            {s === "ALL" ? "Todas" : STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm py-12 text-center">Cargando...</div>
      ) : reports.length === 0 ? (
        <div className="text-gray-500 text-sm py-12 text-center">No hay denuncias {filter !== "ALL" ? STATUS_LABELS[filter]?.label?.toLowerCase() + "s" : ""}.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_LABELS[r.status]?.color ?? ""}`}>
                      {STATUS_LABELS[r.status]?.label ?? r.status}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(r.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold text-sm">{r.store.name}</span>
                    {!r.store.isActive && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">Suspendida</span>
                    )}
                    <Link
                      href={`/tienda/${r.store.slug}`}
                      target="_blank"
                      className="text-indigo-400 text-xs hover:underline"
                    >
                      ver tienda ↗
                    </Link>
                  </div>
                  <p className="text-red-400 text-sm font-medium mb-1">Motivo: {r.reason}</p>
                  {r.description && (
                    <p className="text-gray-400 text-sm mb-1">{r.description}</p>
                  )}
                  {r.reporterEmail && (
                    <p className="text-gray-500 text-xs">Reportado por: {r.reporterEmail}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {r.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(r.id, "REVIEWED")}
                      disabled={updating === r.id}
                      className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-600/30 transition-all disabled:opacity-50"
                    >
                      Marcar revisada
                    </button>
                  )}
                  {r.status !== "RESOLVED" && (
                    <button
                      onClick={() => updateStatus(r.id, "RESOLVED")}
                      disabled={updating === r.id}
                      className="px-3 py-1.5 bg-green-600/20 text-green-300 border border-green-500/30 rounded-lg text-xs font-semibold hover:bg-green-600/30 transition-all disabled:opacity-50"
                    >
                      Marcar resuelta
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
