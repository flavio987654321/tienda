"use client";

import { useState, useMemo } from "react";
import { Download, Search, X, ShieldCheck, Calendar, Monitor } from "lucide-react";

type AuditRow = {
  id: string;
  deletedAt: string;
  deletedByAdminId: string;
  originalUserId: string;
  accountType: string;
  accountCreatedAt: string;
  tcAffiliateAcceptedAt: string | null;
  tcAffiliateVersion: string | null;
  tcAffiliateAcceptedIp: string | null;
  tcOwnerAcceptedAt: string | null;
  tcOwnerVersion: string | null;
  tcOwnerAcceptedIp: string | null;
  subscriptionRole: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  subscriptionCreatedAt: string | null;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:  { label: "Dueño",    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  SELLER: { label: "Afiliado", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  BUYER:  { label: "Cliente",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtFull(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-AR");
}

function downloadCSV(rows: AuditRow[]) {
  const headers = [
    "Fecha eliminación", "ID original", "Tipo de cuenta", "Cuenta creada",
    "T&C Dueño — Fecha", "T&C Dueño — Versión", "T&C Dueño — IP",
    "T&C Afiliado — Fecha", "T&C Afiliado — Versión", "T&C Afiliado — IP",
    "Suscripción — Rol", "Suscripción — Plan", "Suscripción — Estado", "Suscripción — Inicio",
    "Eliminado por (Admin ID)",
  ];
  const escape = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map(r => [
    fmtFull(r.deletedAt),
    r.originalUserId,
    r.accountType,
    fmtFull(r.accountCreatedAt),
    fmtFull(r.tcOwnerAcceptedAt),
    r.tcOwnerVersion,
    r.tcOwnerAcceptedIp,
    fmtFull(r.tcAffiliateAcceptedAt),
    r.tcAffiliateVersion,
    r.tcAffiliateAcceptedIp,
    r.subscriptionRole,
    r.subscriptionPlan,
    r.subscriptionStatus,
    fmtFull(r.subscriptionCreatedAt),
    r.deletedByAdminId,
  ].map(escape).join(","));

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditoria-cuentas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditoriaAdmin({ records }: { records: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (typeFilter && r.accountType !== typeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return r.originalUserId.toLowerCase().includes(q) ||
          r.accountType.toLowerCase().includes(q);
      }
      return true;
    });
  }, [records, query, typeFilter]);

  return (
    <>
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",     value: records.length,                                       color: "border-white/10 bg-gray-900/50",                    filter: "" },
          { label: "Dueños",    value: records.filter(r => r.accountType === "OWNER").length,  color: "border-indigo-500/20 bg-indigo-500/5",              filter: "OWNER" },
          { label: "Afiliados", value: records.filter(r => r.accountType === "SELLER").length, color: "border-purple-500/20 bg-purple-500/5",              filter: "SELLER" },
          { label: "Clientes",  value: records.filter(r => r.accountType === "BUYER").length,  color: "border-emerald-500/20 bg-emerald-500/5",            filter: "BUYER" },
        ].map(({ label, value, color, filter }) => (
          <button
            key={label}
            onClick={() => setTypeFilter(f => f === filter ? "" : filter)}
            className={`rounded-2xl border p-4 text-left transition-all hover:opacity-80 ${color} ${typeFilter === filter && filter !== "" ? "ring-2 ring-white/20" : ""}`}
          >
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Buscador + descarga */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por ID de usuario..."
            className="w-full bg-gray-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => downloadCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
        >
          <Download className="h-4 w-4" />
          Descargar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Eliminado</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID original</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">T&amp;C Dueño</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">T&amp;C Afiliado</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suscripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500 text-sm">
                    No hay registros{query ? ` para "${query}"` : ""}
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const type = TYPE_LABELS[r.accountType] ?? { label: r.accountType, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Tipo */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${type.color}`}>
                        <ShieldCheck className="h-3 w-3" />
                        {type.label}
                      </span>
                    </td>

                    {/* Eliminado */}
                    <td className="px-5 py-4">
                      <p className="text-white text-xs font-medium">{fmt(r.deletedAt)}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Creada: {fmt(r.accountCreatedAt)}</p>
                    </td>

                    {/* ID original */}
                    <td className="px-5 py-4">
                      <code className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded select-all">
                        {r.originalUserId}
                      </code>
                    </td>

                    {/* T&C Dueño */}
                    <td className="px-5 py-4">
                      {r.tcOwnerAcceptedAt ? (
                        <div className="space-y-0.5">
                          <p className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Aceptado
                          </p>
                          <p className="text-gray-400 text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {fmt(r.tcOwnerAcceptedAt)}
                          </p>
                          {r.tcOwnerVersion && (
                            <p className="text-gray-500 text-xs">v{r.tcOwnerVersion}</p>
                          )}
                          {r.tcOwnerAcceptedIp && (
                            <p className="text-gray-500 text-xs flex items-center gap-1">
                              <Monitor className="h-3 w-3" /> {r.tcOwnerAcceptedIp}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>

                    {/* T&C Afiliado */}
                    <td className="px-5 py-4">
                      {r.tcAffiliateAcceptedAt ? (
                        <div className="space-y-0.5">
                          <p className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Aceptado
                          </p>
                          <p className="text-gray-400 text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {fmt(r.tcAffiliateAcceptedAt)}
                          </p>
                          {r.tcAffiliateVersion && (
                            <p className="text-gray-500 text-xs">v{r.tcAffiliateVersion}</p>
                          )}
                          {r.tcAffiliateAcceptedIp && (
                            <p className="text-gray-500 text-xs flex items-center gap-1">
                              <Monitor className="h-3 w-3" /> {r.tcAffiliateAcceptedIp}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Suscripción */}
                    <td className="px-5 py-4">
                      {r.subscriptionRole ? (
                        <div className="space-y-0.5">
                          <p className="text-white text-xs font-medium">
                            {r.subscriptionRole === "AFFILIATE" ? "Afiliado" : r.subscriptionRole === "OWNER" ? "Dueño" : r.subscriptionRole}
                          </p>
                          {r.subscriptionPlan && (
                            <p className="text-gray-400 text-xs">{r.subscriptionPlan === "ANNUAL" ? "Anual" : "Mensual"}</p>
                          )}
                          {r.subscriptionStatus && (
                            <p className="text-gray-500 text-xs">{r.subscriptionStatus}</p>
                          )}
                          {r.subscriptionCreatedAt && (
                            <p className="text-gray-500 text-xs">Desde {fmt(r.subscriptionCreatedAt)}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">Sin suscripción</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-gray-600 text-xs mt-4 text-center">
        {filtered.length} de {records.length} registros · Estos datos se conservan permanentemente por cumplimiento legal
      </p>
    </>
  );
}
