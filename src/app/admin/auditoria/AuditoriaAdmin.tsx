"use client";

import { useState, useMemo } from "react";
import { Download, Search, X, ShieldCheck, Calendar, Monitor, Activity, Clock, FileDown, Mail, User } from "lucide-react";

type AuditRow = {
  id: string;
  deletedAt: string;
  deletedByAdminId: string;
  originalUserId: string;
  originalEmail: string | null;
  originalName: string | null;
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

type ActionLog = {
  id: string;
  createdAt: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: string;
  details: string;
  ip: string | null;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:  { label: "Dueño",    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  SELLER: { label: "Afiliado", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  BUYER:  { label: "Cliente",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  BAN:             { label: "Baneó",         color: "text-red-400 bg-red-500/10 border-red-500/20" },
  UNBAN:           { label: "Desbaneó",      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  DELETE:          { label: "Eliminó",       color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  PUBLISH_STORE:   { label: "Publicó tienda",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  UNPUBLISH_STORE: { label: "Ocultó tienda",    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  ACTIVATE_STORE:  { label: "Activó tienda",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  DEACTIVATE_STORE:{ label: "Desactivó tienda", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

function getActionInfo(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Acciones compuestas con | (ej: CHANGE_STATUS:ACTIVE|CHANGE_PLAN:ANNUAL)
  const parts = action.split("|");
  const label = parts.map(p => {
    if (p.startsWith("CHANGE_STATUS:")) return `Estado → ${p.split(":")[1]}`;
    if (p.startsWith("CHANGE_TIER:")) return `Tier → ${p.split(":")[1]}`;
    if (p.startsWith("CHANGE_PLAN:")) return `Plan → ${p.split(":")[1]}`;
    if (p === "EXTEND_TRIAL") return "Extendió trial";
    return p;
  }).join(" · ");
  return { label, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtFull(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-AR");
}

function downloadSingleCSV(r: AuditRow) {
  const escape = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Campo", "Valor"],
    ["Nombre original", r.originalName],
    ["Email original", r.originalEmail],
    ["Tipo de cuenta", r.accountType],
    ["Fecha eliminación", fmtFull(r.deletedAt)],
    ["Cuenta creada", fmtFull(r.accountCreatedAt)],
    ["ID original (técnico)", r.originalUserId],
    ["T&C Dueño — Fecha", fmtFull(r.tcOwnerAcceptedAt)],
    ["T&C Dueño — Versión", r.tcOwnerVersion],
    ["T&C Dueño — IP", r.tcOwnerAcceptedIp],
    ["T&C Afiliado — Fecha", fmtFull(r.tcAffiliateAcceptedAt)],
    ["T&C Afiliado — Versión", r.tcAffiliateVersion],
    ["T&C Afiliado — IP", r.tcAffiliateAcceptedIp],
    ["Suscripción — Rol", r.subscriptionRole],
    ["Suscripción — Plan", r.subscriptionPlan],
    ["Suscripción — Estado", r.subscriptionStatus],
    ["Suscripción — Inicio", fmtFull(r.subscriptionCreatedAt)],
    ["Eliminado por (Admin ID)", r.deletedByAdminId],
  ];
  const csv = rows.map(([k, v]) => [escape(k), escape(v ?? null)].join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (r.originalName ?? r.originalUserId).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  a.download = `auditoria-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(rows: AuditRow[]) {
  const headers = [
    "Nombre original", "Email original", "Fecha eliminación", "ID original", "Tipo de cuenta", "Cuenta creada",
    "T&C Dueño — Fecha", "T&C Dueño — Versión", "T&C Dueño — IP",
    "T&C Afiliado — Fecha", "T&C Afiliado — Versión", "T&C Afiliado — IP",
    "Suscripción — Rol", "Suscripción — Plan", "Suscripción — Estado", "Suscripción — Inicio",
    "Eliminado por (Admin ID)",
  ];
  const escape = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map(r => [
    r.originalName,
    r.originalEmail,
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

function downloadLogsCSV(logs: ActionLog[]) {
  const headers = ["Fecha", "Admin", "Admin ID", "Acción", "Tipo objetivo", "ID objetivo", "IP", "Detalles"];
  const escape = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = logs.map(l => [
    fmtFull(l.createdAt),
    l.adminEmail,
    l.adminId,
    l.action,
    l.targetType,
    l.targetId,
    l.ip,
    l.details,
  ].map(escape).join(","));

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historial-admin-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CuentasTab({ records }: { records: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (typeFilter && r.accountType !== typeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return r.originalUserId.toLowerCase().includes(q) ||
          r.accountType.toLowerCase().includes(q) ||
          (r.originalName ?? "").toLowerCase().includes(q) ||
          (r.originalEmail ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [records, query, typeFilter]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",     value: records.length,                                       color: "border-white/10 bg-gray-900/50",           filter: "" },
          { label: "Dueños",    value: records.filter(r => r.accountType === "OWNER").length,  color: "border-indigo-500/20 bg-indigo-500/5",  filter: "OWNER" },
          { label: "Afiliados", value: records.filter(r => r.accountType === "SELLER").length, color: "border-purple-500/20 bg-purple-500/5",  filter: "SELLER" },
          { label: "Clientes",  value: records.filter(r => r.accountType === "BUYER").length,  color: "border-emerald-500/20 bg-emerald-500/5", filter: "BUYER" },
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

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, email o ID..."
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

      <div className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Eliminado</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">T&amp;C Dueño</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">T&amp;C Afiliado</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suscripción</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500 text-sm">
                    No hay registros{query ? ` para "${query}"` : ""}
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const type = TYPE_LABELS[r.accountType] ?? { label: r.accountType, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${type.color}`}>
                        <ShieldCheck className="h-3 w-3" />
                        {type.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {r.originalName || r.originalEmail ? (
                        <div className="space-y-0.5">
                          {r.originalName && (
                            <p className="text-white text-xs font-medium flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-500" /> {r.originalName}
                            </p>
                          )}
                          {r.originalEmail && (
                            <p className="text-gray-400 text-xs flex items-center gap-1">
                              <Mail className="h-3 w-3 text-gray-500" /> {r.originalEmail}
                            </p>
                          )}
                          <code className="text-gray-600 text-[10px] select-all">{r.originalUserId.slice(0, 16)}…</code>
                        </div>
                      ) : (
                        <code className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded select-all">
                          {r.originalUserId}
                        </code>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-white text-xs font-medium">{fmt(r.deletedAt)}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Creada: {fmt(r.accountCreatedAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      {r.tcOwnerAcceptedAt ? (
                        <div className="space-y-0.5">
                          <p className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Aceptado
                          </p>
                          <p className="text-gray-400 text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {fmt(r.tcOwnerAcceptedAt)}
                          </p>
                          {r.tcOwnerVersion && <p className="text-gray-500 text-xs">v{r.tcOwnerVersion}</p>}
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
                    <td className="px-5 py-4">
                      {r.tcAffiliateAcceptedAt ? (
                        <div className="space-y-0.5">
                          <p className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Aceptado
                          </p>
                          <p className="text-gray-400 text-xs flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {fmt(r.tcAffiliateAcceptedAt)}
                          </p>
                          {r.tcAffiliateVersion && <p className="text-gray-500 text-xs">v{r.tcAffiliateVersion}</p>}
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
                    <td className="px-5 py-4">
                      {r.subscriptionRole ? (
                        <div className="space-y-0.5">
                          <p className="text-white text-xs font-medium">
                            {r.subscriptionRole === "AFFILIATE" ? "Afiliado" : r.subscriptionRole === "OWNER" ? "Dueño" : r.subscriptionRole}
                          </p>
                          {r.subscriptionPlan && (
                            <p className="text-gray-400 text-xs">{r.subscriptionPlan === "ANNUAL" ? "Anual" : "Mensual"}</p>
                          )}
                          {r.subscriptionStatus && <p className="text-gray-500 text-xs">{r.subscriptionStatus}</p>}
                          {r.subscriptionCreatedAt && (
                            <p className="text-gray-500 text-xs">Desde {fmt(r.subscriptionCreatedAt)}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">Sin suscripción</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => downloadSingleCSV(r)}
                        title="Descargar ficha individual"
                        className="text-gray-500 hover:text-indigo-400 transition-colors"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
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

function HistorialTab({ logs }: { logs: ActionLog[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return logs;
    const q = query.toLowerCase();
    return logs.filter(l =>
      l.adminEmail.toLowerCase().includes(q) ||
      l.targetId.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.targetType.toLowerCase().includes(q)
    );
  }, [logs, query]);

  return (
    <>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por admin, acción, ID..."
            className="w-full bg-gray-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => downloadLogsCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
        >
          <Download className="h-4 w-4" />
          Descargar CSV
        </button>
      </div>

      <div className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Objetivo</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalles</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500 text-sm">
                    {query ? `No hay registros para "${query}"` : "Sin acciones registradas aún"}
                  </td>
                </tr>
              )}
              {filtered.map((l) => {
                const { label, color } = getActionInfo(l.action);
                let details: Record<string, unknown> = {};
                try { details = JSON.parse(l.details); } catch { /* noop */ }
                return (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-white text-xs font-medium">{fmt(l.createdAt)}</p>
                      <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(l.createdAt).toLocaleTimeString("es-AR")}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-white text-xs font-medium truncate max-w-[160px]">{l.adminEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-400 text-xs">{l.targetType}</p>
                      <code className="text-gray-500 text-xs bg-gray-800 px-1.5 py-0.5 rounded mt-0.5 block select-all truncate max-w-[140px]">
                        {l.targetId}
                      </code>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      {Object.keys(details).length > 0 ? (
                        <div className="space-y-0.5">
                          {Object.entries(details).slice(0, 3).map(([k, v]) => (
                            <p key={k} className="text-gray-500 text-xs truncate">
                              <span className="text-gray-400">{k}:</span>{" "}
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {l.ip ? (
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Monitor className="h-3 w-3" /> {l.ip}
                        </p>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
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
        {filtered.length} de {logs.length} acciones · Últimas 500
      </p>
    </>
  );
}

export default function AuditoriaAdmin({ records, actionLogs }: { records: AuditRow[]; actionLogs: ActionLog[] }) {
  const [tab, setTab] = useState<"cuentas" | "historial">("cuentas");

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("cuentas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "cuentas"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
              : "text-gray-500 hover:text-white border border-transparent"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Cuentas eliminadas
          <span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{records.length}</span>
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "historial"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
              : "text-gray-500 hover:text-white border border-transparent"
          }`}
        >
          <Activity className="h-4 w-4" />
          Historial de acciones
          <span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{actionLogs.length}</span>
        </button>
      </div>

      {tab === "cuentas" ? (
        <CuentasTab records={records} />
      ) : (
        <HistorialTab logs={actionLogs} />
      )}
    </>
  );
}
