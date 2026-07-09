"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Plus, Loader2, Settings, Palette, Gift, X, AlertCircle,
  ToggleLeft, ToggleRight, Copy, Check, Search, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { GAMIFICATION_EXCLUDED_TEMPLATES } from "@/lib/gamification";

// ─── Types ────────────────────────────────────────────────────────────────────

type Prize = {
  id?: string;
  couponId?: string | null;
  couponCode?: string | null;
  label: string;
  probability: number;
  isNoPrize: boolean;
  order: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses: number | null;
  expiresAt: string | null;
  winHours: number;
};

type WidgetStyles = {
  popupBg: string; hubBg: string; textColor: string; buttonBg: string;
  buttonText: string; couponBg: string; couponText: string;
  spinnerColors: string[]; spinnerBorder: string;
  centerBg: string; centerBorder: string; centerText: string;
};

type Widget = {
  id?: string; type: string; isActive: boolean;
  title: string; subtitle: string; buttonText: string; reclaimText: string;
  legalText: string; centerType: string; centerText: string;
  triggerType: string; triggerDelay: number | null; showFrequency: string;
  emailRequired: boolean; styles: WidgetStyles; prizes: Prize[];
};

const DEFAULT_STYLES: WidgetStyles = {
  popupBg: "#191B1B", hubBg: "#d77095", textColor: "#ffffff",
  buttonBg: "#d77095", buttonText: "#ffffff",
  couponBg: "#191B1B", couponText: "#d77095",
  spinnerColors: ["#f472b6","#ec4899","#db2777","#be185d","#9d174d","#831843"],
  spinnerBorder: "#3A9A22",
  centerBg: "#191B1B", centerBorder: "#3A9A22", centerText: "#d77095",
};

const DEFAULT_WIDGET: Widget = {
  type: "SPIN", isActive: false,
  title: "¡Girá y ganá!", subtitle: "Probá tu suerte y ganá un premio",
  buttonText: "¡Girá y ganá!", reclaimText: "Reclamar premio",
  legalText: "", centerType: "text", centerText: "Tu marca",
  triggerType: "FIRST_CLICK", triggerDelay: null, showFrequency: "ONCE_SESSION",
  emailRequired: true, styles: DEFAULT_STYLES, prizes: [],
};

function probSum(prizes: Prize[]) {
  return prizes.reduce((s, p) => s + (p.probability || 0), 0);
}

// ─── Coupon History ───────────────────────────────────────────────────────────

type CouponRow = {
  id: string; code: string; label: string | null;
  discountType: "percentage" | "fixed"; discountValue: number;
  usedCount: number; maxUses: number | null;
  expiresAt: string | null; isActive: boolean; winnerEmail: string | null;
  isActivePrizeTemplate: boolean;
};

type UseRow = {
  id: string; total: number; discountAmount: number;
  createdAt: string; buyerName: string; buyerEmail: string;
};

type HistoryStats = { total: number; active: number; expired: number; exhausted: number; gamification: number; whatsapp: number; totalDiscount: number };

const HISTORY_PAGE = 20;

function couponStatus(c: CouponRow, now: Date) {
  if (c.expiresAt && new Date(c.expiresAt) <= now) return "expired" as const;
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return "exhausted" as const;
  if (!c.isActive) return "inactive" as const;
  return "active" as const;
}

const STATUS_BADGE = {
  active:    { label: "Vigente",  cls: "bg-green-50 text-green-700 border border-green-200" },
  expired:   { label: "Vencido",  cls: "bg-red-50 text-red-600 border border-red-200" },
  exhausted: { label: "Agotado",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  inactive:  { label: "Inactivo", cls: "bg-gray-100 text-gray-500 border border-gray-200" },
} as const;

function fmtDate(iso: string | null) {
  if (!iso) return "Sin vencimiento";
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtARS(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

function CouponHistory() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uses, setUses] = useState<UseRow[]>([]);
  const [usesLoading, setUsesLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const expandRef = useRef<string | null>(null);
  const now = new Date();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(prev => prev.size === coupons.length ? new Set() : new Set(coupons.map(c => c.id)));
  }

  async function deleteCoupons(ids: string[]) {
    const targets = coupons.filter(c => ids.includes(c.id));
    const usedCount = targets.filter(c => c.usedCount > 0).length;
    const legalRisk = targets.filter(c => c.winnerEmail && couponStatus(c, now) === "active");
    const activeTemplates = targets.filter(c => c.isActivePrizeTemplate);

    let msg = `¿Eliminar ${ids.length} cupón${ids.length > 1 ? "es" : ""}? Esta acción no se puede deshacer.`;
    if (usedCount > 0) {
      msg += `\n\n${usedCount} ya se usaron en pedidos — esos pedidos van a dejar de mostrar qué código fue (el monto del descuento no se toca).`;
    }
    if (activeTemplates.length > 0) {
      msg += `\n\n🎯 ${activeTemplates.length} de estos cupones ${activeTemplates.length > 1 ? "son las plantillas" : "es la plantilla"} de un premio activo en tu ruleta. Si lo eliminás, ese premio va a seguir apareciendo en la ruleta pero sin código para entregar — el próximo que lo gane va a ver "ganaste" sin ningún cupón. ¿Continuar igual?`;
    }
    if (legalRisk.length > 0) {
      msg += `\n\n⚠️ ${legalRisk.length} de estos cupones todavía son válidos y ya fueron entregados a alguien que ganó un premio. Apagarlos antes de que venzan podría generar un reclamo del cliente (Ley de Defensa del Consumidor). ¿Continuar igual?`;
    }
    if (!confirm(msg)) return;

    setDeleting(true);
    try {
      await Promise.all(ids.map(id => fetch(`/api/cupones/${encodeURIComponent(id)}`, { method: "DELETE" })));
      showToast(ids.length > 1 ? "Cupones eliminados" : "Cupón eliminado");
      setSelected(new Set());
      await load();
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      take: String(HISTORY_PAGE),
      skip: String(page * HISTORY_PAGE),
      status: statusFilter,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    });
    try {
      const res = await fetch(`/api/cupones?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons ?? []);
        setTotal(data.total ?? 0);
        if (data.stats) setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  async function handleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setUses([]);
    setUsesLoading(true);
    expandRef.current = id;
    try {
      const res = await fetch(`/api/cupones/${encodeURIComponent(id)}/usos`);
      if (expandRef.current !== id) return;
      if (res.ok) setUses((await res.json()).orders ?? []);
    } finally {
      if (expandRef.current === id) setUsesLoading(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  const totalPages = Math.ceil(total / HISTORY_PAGE);

  const TABS = [
    { id: "all",          label: "Todos",         count: stats?.total },
    { id: "active",       label: "Vigentes",       count: stats?.active },
    { id: "exhausted",    label: "Agotados",       count: stats?.exhausted },
    { id: "expired",      label: "Vencidos",       count: stats?.expired },
    { id: "gamification", label: "Gamificación",   count: stats?.gamification },
    { id: "whatsapp",     label: "WhatsApp",       count: stats?.whatsapp },
  ];

  return (
    <div className="mt-12">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Historial de cupones</h2>
        <p className="text-sm text-gray-500">Todos los cupones de tu tienda, sus usos y estadísticas</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {([
            { label: "Vigentes",       value: String(stats.active),                icon: "✅" },
            { label: "Agotados",       value: String(stats.exhausted),             icon: "🎯" },
            { label: "Vencidos",       value: String(stats.expired),               icon: "⏰" },
            { label: "Gamificación",   value: String(stats.gamification),          icon: "🎡" },
            { label: "Descuento total otorgado", value: fmtARS(stats.totalDiscount), icon: "💰" },
          ] as const).map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xl mb-1">{icon}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-0.5 w-max min-w-full sm:w-auto sm:min-w-0">
          {TABS.map(tab => (
            <button key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(0); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                  statusFilter === tab.id ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-400"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por código o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 mb-3">
          <span className="text-xs font-semibold text-indigo-700">{selected.size} seleccionado{selected.size > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
            <button onClick={() => deleteCoupons([...selected])} disabled={deleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🏷️</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {search || statusFilter !== "all" ? "Sin resultados para ese filtro" : "Todavía no hay cupones"}
            </p>
            {(search || statusFilter !== "all") && (
              <button onClick={() => { setSearch(""); setStatusFilter("all"); setPage(0); }}
                className="mt-2 text-xs text-indigo-500 hover:underline font-semibold">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selected.size > 0 && selected.size === coupons.length}
                      onChange={toggleSelectAll} className="rounded border-gray-300" aria-label="Seleccionar todos" />
                  </th>
                  {(["Código", "Descuento", "Usos", "Vence", "Estado", ""] as const).map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide ${h === "Vence" ? "hidden sm:table-cell" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => {
                  const st = couponStatus(coupon, now);
                  const badge = STATUS_BADGE[st];
                  const isExp = expandedId === coupon.id;
                  return (
                    <Fragment key={coupon.id}>
                      <tr className={`border-b border-gray-50 transition-colors ${isExp ? "bg-indigo-50/30" : "hover:bg-gray-50/60"}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.has(coupon.id)}
                            onChange={() => toggleSelected(coupon.id)} className="rounded border-gray-300" aria-label={`Seleccionar ${coupon.code}`} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-gray-900 text-xs tracking-wider">{coupon.code}</code>
                            {coupon.winnerEmail && (
                              <span title={`Personal de: ${coupon.winnerEmail}`}
                                className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-600 font-semibold cursor-default">🎡</span>
                            )}
                            {coupon.isActivePrizeTemplate && (
                              <span title="Es la plantilla de un premio activo en la ruleta — si lo borrás, ese premio deja de entregarse a los próximos ganadores"
                                className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 font-semibold cursor-default">🎯 Premio activo</span>
                            )}
                            {coupon.label?.includes("WhatsApp") && (
                              <span title="Cupón creado para recuperación por WhatsApp"
                                className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs text-green-700 font-semibold cursor-default">💬 WA</span>
                            )}
                            <button onClick={() => copyCode(coupon.code)}
                              className="text-gray-300 hover:text-gray-500 transition-colors" aria-label="Copiar código">
                              {copied === coupon.code
                                ? <Check className="h-3.5 w-3.5 text-green-500" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {coupon.label && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{coupon.label}</p>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : fmtARS(coupon.discountValue)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={coupon.usedCount > 0 ? "font-bold text-gray-900" : "text-gray-400"}>
                            {coupon.usedCount}
                          </span>
                          <span className="text-gray-400">/{coupon.maxUses ?? "∞"}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{fmtDate(coupon.expiresAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {coupon.usedCount > 0 && (
                              <button onClick={() => handleExpand(coupon.id)}
                                className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                aria-label={isExp ? "Ocultar usos" : "Ver usos"}>
                                {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            <button onClick={() => deleteCoupons([coupon.id])} disabled={deleting}
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
                              aria-label="Eliminar cupón">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr className="bg-indigo-50/20 border-b border-gray-50">
                          <td colSpan={7} className="px-4 pt-1 pb-4">
                            {usesLoading ? (
                              <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando usos…
                              </div>
                            ) : uses.length === 0 ? (
                              <p className="py-3 text-xs text-gray-400">Sin pedidos registrados con este cupón</p>
                            ) : (
                              <div className="rounded-xl border border-indigo-100 overflow-hidden mt-2">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-indigo-50 border-b border-indigo-100">
                                      <th className="px-3 py-2 text-left font-semibold text-indigo-400 uppercase tracking-wide">Comprador</th>
                                      <th className="px-3 py-2 text-left font-semibold text-indigo-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                                      <th className="px-3 py-2 text-right font-semibold text-indigo-400 uppercase tracking-wide">Pedido</th>
                                      <th className="px-3 py-2 text-right font-semibold text-indigo-400 uppercase tracking-wide">Descuento</th>
                                      <th className="px-3 py-2 text-right font-semibold text-indigo-400 uppercase tracking-wide hidden sm:table-cell">Fecha</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {uses.map(u => (
                                      <tr key={u.id} className="border-b border-indigo-50 last:border-0 hover:bg-indigo-50/40 transition-colors">
                                        <td className="px-3 py-2 font-medium text-gray-700">{u.buyerName}</td>
                                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{u.buyerEmail}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">{fmtARS(u.total)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-green-600 tabular-nums">−{fmtARS(u.discountAmount)}</td>
                                        <td className="px-3 py-2 text-right text-gray-400 hidden sm:table-cell">{fmtDate(u.createdAt)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="text-xs font-semibold text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400 tabular-nums">Página {page + 1} de {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="text-xs font-semibold text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors">
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-slide pointer-events-none">
          <div className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />{toast}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Spin Wheel Preview ───────────────────────────────────────────────────────

function SpinWheelPreview({ prizes, styles, centerType, centerText, size = 200 }: {
  prizes: Prize[]; styles: WidgetStyles; centerType: string; centerText: string; size?: number;
}) {
  const cx = size / 2; const cy = size / 2; const r = size / 2 - 4;
  const items = prizes.length > 0 ? prizes : [
    { label: "20% OFF", isNoPrize: false }, { label: "10% OFF", isNoPrize: false },
    { label: "Envío gratis", isNoPrize: false }, { label: "15% OFF", isNoPrize: false },
    { label: "$500 OFF", isNoPrize: false }, { label: "Sin premio", isNoPrize: true },
  ];
  const angleStep = (2 * Math.PI) / items.length;
  const centerR = Math.round(size * 0.14);
  const fontSize = Math.round(size * 0.045);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {items.map((p, i) => {
          const sa = i * angleStep - Math.PI / 2;
          const ea = sa + angleStep;
          const x1 = cx + r * Math.cos(sa); const y1 = cy + r * Math.sin(sa);
          const x2 = cx + r * Math.cos(ea); const y2 = cy + r * Math.sin(ea);
          const mid = sa + angleStep / 2;
          const tx = cx + r * 0.65 * Math.cos(mid); const ty = cy + r * 0.65 * Math.sin(mid);
          const color = styles.spinnerColors[i % styles.spinnerColors.length];
          return (
            <g key={i}>
              <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${angleStep > Math.PI ? 1 : 0},1 ${x2},${y2} Z`}
                fill={color} stroke={styles.spinnerBorder} strokeWidth="1.5" />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                fontSize={fontSize} fontWeight="700" fill="#fff"
                transform={`rotate(${(mid * 180) / Math.PI + 90}, ${tx}, ${ty})`}>
                {p.label.length > 10 ? p.label.slice(0, 10) + "…" : p.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={centerR} fill={styles.centerBg} stroke={styles.centerBorder} strokeWidth="3" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize - 1} fontWeight="700" fill={styles.centerText}>
          {(centerType === "text" ? centerText : "Logo").slice(0, 8)}
        </text>
      </svg>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1"
        style={{ width: 0, height: 0, borderLeft: `${Math.round(size * 0.04)}px solid transparent`, borderRight: `${Math.round(size * 0.04)}px solid transparent`, borderTop: `${Math.round(size * 0.09)}px solid ${styles.spinnerBorder}` }} />
    </div>
  );
}

// ─── Scratch Preview ──────────────────────────────────────────────────────────

function ScratchPreview({ styles }: { styles: WidgetStyles }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Gold scratch surface */}
      <div className="relative w-36 h-20 rounded-2xl overflow-hidden shadow-inner"
        style={{ background: "linear-gradient(135deg, #D4A836 0%, #E8C05A 50%, #B89030 100%)" }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-white/70 text-xs font-black tracking-widest uppercase">Raspá</span>
          <span className="text-white/70 text-xs font-black tracking-widest uppercase">y Ganá</span>
        </div>
        {/* scratch lines texture */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute w-full" style={{ top: `${12 + i * 14}px`, height: "3px", background: "rgba(255,255,255,0.12)", transform: `rotate(${(i % 2 === 0 ? 2 : -1)}deg)` }} />
        ))}
      </div>
      {/* Prize reveal example */}
      <div className="w-36 rounded-xl flex items-center justify-center py-2 px-3"
        style={{ background: styles.couponBg }}>
        <span className="text-xs font-black tracking-widest" style={{ color: styles.couponText }}>WIN-XXXXXX</span>
      </div>
    </div>
  );
}

// ─── Scratch Demo Canvas (animated loop for editor preview) ──────────────────

function ScratchDemoCanvas({ styles }: { styles: WidgetStyles }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    const SCRATCH_MS = 2200;
    const PAUSE_MS = 1000;
    const TOTAL = SCRATCH_MS + PAUSE_MS;
    let start = performance.now();

    function fillGold() {
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#C8921A"); g.addColorStop(0.45, "#F0C84A"); g.addColorStop(1, "#A87820");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(0, i * 18, W, 7);
      }
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `bold 11px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("RASPÁ Y GANÁ", W / 2, H / 2);
    }

    function frame(now: number) {
      const elapsed = (now - start) % TOTAL;
      const t = Math.min(elapsed / SCRATCH_MS, 1);

      // Redraw entire canvas each frame (stateless)
      ctx.clearRect(0, 0, W, H);
      fillGold();

      if (t > 0) {
        ctx.globalCompositeOperation = "destination-out";
        const rows = 3;
        for (let row = 0; row < rows; row++) {
          const rowDelay = (row / rows) * 0.35;
          const rowT = Math.max(0, Math.min((t - rowDelay) / (1 - rowDelay), 1));
          if (rowT <= 0) continue;
          const yCenter = (H / (rows + 1)) * (row + 1);
          const xEnd = W * rowT;
          for (let x = 0; x <= xEnd; x += 3) {
            const wobble = Math.sin(x * 0.13 + row * 1.8) * 9;
            ctx.beginPath();
            ctx.arc(x, yCenter + wobble, 14, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        ctx.globalCompositeOperation = "source-over";
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    fillGold();
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative" style={{ width: "100%", height: 90 }}>
      {/* Prize behind */}
      <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1"
        style={{ background: styles.couponBg }}>
        <span className="text-[10px] opacity-50 uppercase tracking-widest" style={{ color: styles.couponText }}>Tu premio</span>
        <span className="font-black text-sm tracking-widest font-mono" style={{ color: styles.couponText }}>WIN-A3X9KZ</span>
        <span className="text-[10px] opacity-60" style={{ color: styles.couponText }}>20% de descuento</span>
      </div>
      {/* Gold layer on top — gets scratched away */}
      <canvas ref={canvasRef} width={200} height={90}
        className="absolute inset-0 w-full h-full rounded-xl" />
    </div>
  );
}

// ─── Widget Editor ────────────────────────────────────────────────────────────

function WidgetEditor({ widget, onSave, onClose, saving, defaultTab = "general" }: {
  widget: Widget; onSave: (w: Widget) => void; onClose: () => void; saving: boolean; defaultTab?: "general" | "styles" | "prizes";
}) {
  const [form, setForm] = useState<Widget>(widget);
  const [tab, setTab] = useState<"general" | "styles" | "prizes">(defaultTab);
  const [probError, setProbError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function set<K extends keyof Widget>(k: K, v: Widget[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function setStyle<K extends keyof WidgetStyles>(k: K, v: WidgetStyles[K]) {
    setForm((f) => ({ ...f, styles: { ...f.styles, [k]: v } }));
  }

  function addPrize() {
    setForm((f) => ({
      ...f,
      prizes: [...f.prizes, {
        label: "", probability: 0, isNoPrize: false, order: f.prizes.length,
        discountType: "percentage", discountValue: 0, maxUses: null, expiresAt: null, winHours: 48,
      }],
    }));
  }

  function addNoPrize() {
    if (form.prizes.some((p) => p.isNoPrize)) return;
    setForm((f) => ({
      ...f,
      prizes: [...f.prizes, {
        label: "Sin premio", probability: 0, isNoPrize: true, order: f.prizes.length,
        discountType: "percentage", discountValue: 0, maxUses: null, expiresAt: null, winHours: 48,
      }],
    }));
  }

  function removePrize(idx: number) {
    setForm((f) => ({ ...f, prizes: f.prizes.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i })) }));
  }

  function distributeEvenly() {
    setForm((f) => {
      const n = f.prizes.length;
      if (n === 0) return f;
      const base = Math.floor(100 / n);
      const remainder = 100 - base * n;
      // El resto (si 100 no es divisible exacto) se reparte de a 1% entre los primeros premios
      return { ...f, prizes: f.prizes.map((p, i) => ({ ...p, probability: base + (i < remainder ? 1 : 0) })) };
    });
  }

  function updatePrize(idx: number, upd: Partial<Prize>) {
    setForm((f) => ({ ...f, prizes: f.prizes.map((p, i) => i === idx ? { ...p, ...upd } : p) }));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleSave() {
    // Campos obligatorios en General
    if (!form.title.trim()) {
      setGeneralError("El título es obligatorio.");
      setTab("general");
      return;
    }
    if (!form.buttonText.trim()) {
      setGeneralError("El texto del botón de girar es obligatorio.");
      setTab("general");
      return;
    }
    setGeneralError("");

    // Validaciones de premios
    if (form.prizes.length > 0) {
      for (let i = 0; i < form.prizes.length; i++) {
        const p = form.prizes[i];
        if (!p.label.trim()) {
          setProbError(`El premio ${i + 1} no tiene etiqueta — completá todos los nombres.`);
          setTab("prizes");
          return;
        }
        if (!p.isNoPrize && p.discountValue <= 0) {
          setProbError(`El descuento de "${p.label}" debe ser mayor a 0.`);
          setTab("prizes");
          return;
        }
        if (!p.isNoPrize && (!p.winHours || p.winHours <= 0)) {
          setProbError(`Completá cuántas horas de validez tiene el cupón de "${p.label || `premio ${i + 1}`}" para el ganador.`);
          setTab("prizes");
          return;
        }
      }
      const sum = probSum(form.prizes);
      if (sum !== 100) {
        setProbError(`Las probabilidades suman ${sum}% — deben sumar exactamente 100%.`);
        setTab("prizes");
        return;
      }
    }
    setProbError("");
    onSave(form);
  }

  function handleClose() {
    const dirty = JSON.stringify(form) !== JSON.stringify(widget);
    if (dirty && !confirm("Tenés cambios sin guardar. ¿Salir de todos modos?")) return;
    onClose();
  }

  const sum = probSum(form.prizes);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-none sm:rounded-2xl bg-white shadow-2xl flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex gap-2">
            {(["SPIN", "SCRATCH"] as const).map((t) => (
              <button key={t} onClick={() => set("type", t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${form.type === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t === "SPIN" ? "🎡 Ruleta" : "🪙 Raspadita"}
              </button>
            ))}
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 overflow-x-auto">
          {([
            { id: "general", label: "General", icon: Settings },
            { id: "styles",  label: "Estilos",  icon: Palette },
            { id: "prizes",  label: "Premios y probabilidades", icon: Gift },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ── GENERAL ── */}
            {tab === "general" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {([["title","Título"],["subtitle","Subtítulo"],["buttonText","Texto del botón de girar"],["reclaimText","Texto del botón de reclamar"]] as const).map(([k,l]) => (
                    <div key={k}>
                      <label className="mb-1 block text-xs font-semibold text-gray-500">{l}</label>
                      <input value={form[k]} onChange={(e) => set(k, e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Texto legal (opcional)</label>
                    <input value={form.legalText} onChange={(e) => set("legalText", e.target.value)}
                      placeholder="Válido por tiempo limitado. No acumulable con otras promociones."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
                <hr className="border-gray-100" />
                {form.type === "SPIN" && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-500">Centro de la ruleta</label>
                    <div className="flex gap-3 mb-3">
                      {(["text","logo"] as const).map((t) => (
                        <button key={t} onClick={() => set("centerType", t)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${form.centerType === t ? "bg-indigo-50 border border-indigo-400 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                          {t === "text" ? "Texto" : "Logo"}
                        </button>
                      ))}
                    </div>
                    {form.centerType === "text" && (
                      <input value={form.centerText} onChange={(e) => set("centerText", e.target.value)} placeholder="Tu marca"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    )}
                  </div>
                )}
                <hr className="border-gray-100" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">¿Cuándo aparece?</label>
                    <select value={form.triggerType} onChange={(e) => set("triggerType", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="FIRST_CLICK">Luego del primer click</option>
                      <option value="ON_ENTER">Al entrar a la tienda</option>
                      <option value="DELAY">Después de X segundos</option>
                    </select>
                  </div>
                  {form.triggerType === "DELAY" && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-500">Segundos</label>
                      <input type="number" min={1} max={60} value={form.triggerDelay ?? ""}
                        onChange={(e) => set("triggerDelay", parseInt(e.target.value) || null)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">¿Cuántas veces se muestra?</label>
                    <select value={form.showFrequency} onChange={(e) => set("showFrequency", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="ONCE_EVER">Una vez por dispositivo</option>
                      <option value="ONCE_SESSION">Una vez por sesión</option>
                      <option value="ALWAYS">Siempre que ingresa</option>
                    </select>
                  </div>
                  <div className="flex items-start gap-3 pt-1 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2.5 sm:col-span-2">
                    <ToggleRight className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Requerir email para girar — siempre activo</p>
                      <p className="text-xs text-gray-500 mt-0.5">Sin el email del visitante no hay forma de avisarle si gana, ni de identificarlo si te escribe reclamando su premio — por eso no se puede desactivar.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ESTILOS ── */}
            {tab === "styles" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ["popupBg","Fondo del popup"],["textColor","Color de textos"],
                    ["buttonBg","Color del botón"],["buttonText","Texto del botón"],
                    ["couponBg","Fondo del cupón ganado"],["couponText","Texto del cupón"],
                    ["spinnerBorder","Borde de la ruleta"],
                    ["centerBg","Fondo del centro"],["centerBorder","Borde del centro"],["centerText","Texto central"],
                  ] as [keyof WidgetStyles, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs font-semibold text-gray-500">{label}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.styles[key] as string}
                          onChange={(e) => setStyle(key, e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 p-0.5" />
                        <input value={form.styles[key] as string} onChange={(e) => setStyle(key, e.target.value)}
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-400" />
                      </div>
                    </div>
                  ))}
                </div>
                {form.type === "SPIN" && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-500">Colores de los sectores</label>
                    <div className="flex flex-wrap gap-2">
                      {form.styles.spinnerColors.map((c, i) => (
                        <input key={i} type="color" value={c}
                          onChange={(e) => { const cols = [...form.styles.spinnerColors]; cols[i] = e.target.value; setStyle("spinnerColors", cols); }}
                          className="h-8 w-10 cursor-pointer rounded-lg border border-gray-200 p-0.5" />
                      ))}
                      <button onClick={() => setStyle("spinnerColors", [...form.styles.spinnerColors, "#6366f1"])}
                        className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-500">
                        <Plus className="h-3 w-3" /> Color
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PREMIOS ── */}
            {tab === "prizes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">Configurá los premios y sus chances. Las probabilidades deben sumar 100.</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {form.prizes.length > 1 && (
                      <button type="button" onClick={distributeEvenly}
                        className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100">
                        Repartir en partes iguales
                      </button>
                    )}
                    <div className={`text-sm font-bold rounded-full px-3 py-1 ${sum === 100 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {sum}/100
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {form.prizes.map((p, idx) => (
                    <div key={idx} className={`rounded-2xl border p-4 ${p.isNoPrize ? "border-gray-200 bg-gray-50" : "border-indigo-100 bg-white"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid gap-3 sm:grid-cols-2">

                          {/* Label */}
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-500">Etiqueta (se muestra en la ruleta)</label>
                            <input value={p.label} onChange={(e) => updatePrize(idx, { label: e.target.value })}
                              placeholder={p.isNoPrize ? "Sin premio" : "Ej: 20% OFF"}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                          </div>

                          {/* Probabilidad */}
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-500">Probabilidad (%)</label>
                            <input type="number" min={0} max={100} value={p.probability}
                              onChange={(e) => updatePrize(idx, { probability: parseInt(e.target.value) || 0 })}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                          </div>

                          {!p.isNoPrize && (<>
                            {/* Tipo y valor */}
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">Tipo de descuento</label>
                              <div className="flex gap-2">
                                <select value={p.discountType} onChange={(e) => updatePrize(idx, { discountType: e.target.value as "percentage" | "fixed" })}
                                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                                  <option value="percentage">Porcentaje (%)</option>
                                  <option value="fixed">Monto fijo ($)</option>
                                </select>
                                <input type="number" min={1} value={p.discountValue || ""}
                                  onChange={(e) => updatePrize(idx, { discountValue: parseFloat(e.target.value) || 0 })}
                                  placeholder={p.discountType === "percentage" ? "20" : "5000"}
                                  className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                              </div>
                            </div>

                            {/* Validez para el ganador */}
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">⏱️ Validez del cupón para el ganador (horas) *</label>
                              <input type="number" min={1} value={p.winHours ?? ""}
                                onChange={(e) => updatePrize(idx, { winHours: parseInt(e.target.value) || 0 })}
                                placeholder="48"
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                              <p className="mt-1 text-xs text-gray-400">Cuánto tiempo tiene cada ganador para usar su cupón desde que lo gana.</p>
                            </div>

                            {/* Usos y fecha límite de la promo */}
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-gray-500">🏆 Cantidad de ganadores / 📅 Fecha límite de esta promo (opcional)</label>
                              <div className="flex gap-2">
                                <input type="number" min={1} value={p.maxUses ?? ""}
                                  onChange={(e) => updatePrize(idx, { maxUses: parseInt(e.target.value) || null })}
                                  placeholder="∞"
                                  className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                                <input type="date" value={p.expiresAt ?? ""}
                                  onChange={(e) => updatePrize(idx, { expiresAt: e.target.value || null })}
                                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                              </div>
                              <p className="mt-1 text-xs text-gray-400">El número es cuántas personas en total pueden ganar este premio (después pasa a "sin premio" en la ruleta, aunque toque ese sector). La fecha corta la promo entera antes de esa cantidad si llega primero — no afecta el plazo del ganador de arriba.</p>
                            </div>

                            {/* Código auto-generado */}
                            {p.couponCode && (
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-gray-500">Código generado (lo recibe el cliente al ganar)</label>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-black tracking-widest text-indigo-700">{p.couponCode}</code>
                                  <button onClick={() => copyCode(p.couponCode!)} className="text-gray-400 hover:text-gray-600">
                                    {copied === p.couponCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {!p.couponCode && (
                              <div className="sm:col-span-2">
                                <p className="text-xs text-gray-400 italic">El código se genera automáticamente al guardar.</p>
                              </div>
                            )}
                          </>)}
                        </div>

                        <button onClick={() => removePrize(idx)} className="mt-1 text-red-400 hover:text-red-600 shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {probError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />{probError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={addPrize}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
                    <Plus className="h-4 w-4" /> Agregar premio
                  </button>
                  {!form.prizes.some((p) => p.isNoPrize) && (
                    <button onClick={addNoPrize}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50">
                      <Plus className="h-4 w-4" /> Sin premio
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview — oculto en pantallas pequeñas */}
          <div className="hidden lg:flex w-52 shrink-0 border-l border-gray-100 bg-gray-50 px-4 py-4 flex-col items-center gap-3 overflow-y-auto">
            <style>{`@keyframes preview-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vista previa</p>
            <div className="w-full rounded-2xl shadow-lg overflow-hidden" style={{ background: form.styles.popupBg }}>
              <div className="px-3 pt-3 pb-4 flex flex-col items-center gap-2">
                {form.type === "SPIN"
                  ? (
                    <div style={{ animation: "preview-spin 9s linear infinite", transformOrigin: "center" }}>
                      <SpinWheelPreview prizes={form.prizes} styles={form.styles} centerType={form.centerType} centerText={form.centerText} size={148} />
                    </div>
                  )
                  : <ScratchDemoCanvas styles={form.styles} />
                }
                <p className="text-center font-bold text-xs" style={{ color: form.styles.textColor }}>{form.title}</p>
                <p className="text-center text-xs opacity-70 leading-tight" style={{ color: form.styles.textColor }}>{form.subtitle}</p>
                <button className="w-full rounded-xl py-2 text-xs font-bold mt-1" style={{ background: form.styles.buttonBg, color: form.styles.buttonText }}>
                  {form.buttonText}
                </button>
                {form.legalText && <p className="text-center text-xs opacity-50" style={{ color: form.styles.textColor }}>{form.legalText}</p>}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">Demo animado — así lo ve tu cliente</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 shrink-0">
          {(generalError || probError) && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 mb-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {generalError || probError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Los códigos se generan automáticamente al guardar.</p>
            <div className="flex gap-3">
              <button onClick={handleClose} className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : "Guardar widget"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CuponesPage() {
  const [widget, setWidget] = useState<Widget | null>(null);
  const [storeTemplateId, setStoreTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editorDefaultTab, setEditorDefaultTab] = useState<"general" | "styles" | "prizes">("general");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500); }

  const loadWidget = useCallback(async () => {
    try {
      const res = await fetch("/api/gamification/widget").then((r) => r.json());
      setStoreTemplateId(res.storeTemplateId ?? null);
      if (res.widget) {
        const w = res.widget;
        setWidget({
          ...w,
          styles: typeof w.styles === "string" ? JSON.parse(w.styles) : w.styles,
          prizes: (w.prizes || []).map((p: Prize & { coupon?: { code: string; discountType: string; discountValue: number; maxUses: number | null; expiresAt: string | null } | null }) => ({
            ...p,
            discountType: p.coupon?.discountType ?? "percentage",
            discountValue: p.coupon?.discountValue ?? 0,
            maxUses: p.coupon?.maxUses ?? null,
            expiresAt: p.coupon?.expiresAt ? new Date(p.coupon.expiresAt).toISOString().split("T")[0] : null,
            winHours: p.winHours ?? 48,
            couponCode: p.coupon?.code ?? null,
          })),
        });
      }
    } catch {
      // Error de red o API — mostrar empty state igual
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWidget(); }, [loadWidget]);

  async function saveWidget(w: Widget) {
    setSaving(true);
    const res = await fetch("/api/gamification/widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(w),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      const saved = data.widget;
      setWidget({
        ...saved,
        styles: typeof saved.styles === "string" ? JSON.parse(saved.styles) : saved.styles,
        prizes: (saved.prizes || []).map((p: Prize & { coupon?: { code: string; discountType: string; discountValue: number; maxUses: number | null; expiresAt: string | null } | null }) => ({
          ...p,
          discountType: p.coupon?.discountType ?? "percentage",
          discountValue: p.coupon?.discountValue ?? 0,
          maxUses: p.coupon?.maxUses ?? null,
          expiresAt: p.coupon?.expiresAt ? new Date(p.coupon.expiresAt).toISOString().split("T")[0] : null,
          winHours: p.winHours ?? 48,
          couponCode: p.coupon?.code ?? null,
        })),
      });
      setShowEditor(false);
      showToast("Widget guardado correctamente");
    }
  }

  async function deleteWidget() {
    if (!widget?.id) return;
    if (!confirm("¿Eliminar el widget? Los códigos generados quedarán desactivados.")) return;
    setDeleting(true);
    const res = await fetch("/api/gamification/widget", { method: "DELETE" });
    if (res.ok) {
      setWidget(null);
      showToast("Widget eliminado");
    }
    setDeleting(false);
  }

  async function toggleWidget() {
    if (!widget) return;
    if (!widget.isActive) {
      const realPrizes = widget.prizes.filter(p => !p.isNoPrize);
      if (realPrizes.length === 0) {
        showToast("Agregá al menos un premio antes de activar el widget");
        return;
      }
      if (widget.prizes.reduce((s, p) => s + p.probability, 0) !== 100) {
        showToast("Las probabilidades de los premios deben sumar 100% antes de activar");
        return;
      }
    }
    setToggling(true);
    const res = await fetch("/api/gamification/widget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !widget.isActive }),
    });
    if (res.ok) {
      setWidget((w) => w ? { ...w, isActive: !w.isActive } : null);
      showToast(widget.isActive ? "Widget desactivado" : "Widget activado en tu tienda ✓");
    }
    setToggling(false);
  }

  return (
    <DashboardLayout>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-slide pointer-events-none">
          <div className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />{toast}
          </div>
        </div>
      )}

      {showEditor && (
        <WidgetEditor
          widget={widget ?? DEFAULT_WIDGET}
          onSave={saveWidget}
          onClose={() => {
            setShowEditor(false);
            // Si nunca se guardó (sin id), volver al empty state
            if (widget && !widget.id) setWidget(null);
          }}
          saving={saving}
          defaultTab={editorDefaultTab}
        />
      )}

      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Cupones y premios</h1>
          <p className="mt-1 text-sm text-gray-500">Ruleta o raspadita que entrega descuentos automáticamente a tus clientes</p>
        </div>

        {!loading && storeTemplateId && GAMIFICATION_EXCLUDED_TEMPLATES.has(storeTemplateId) ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center">
            <p className="text-3xl mb-3">🚗</p>
            <p className="text-sm font-semibold text-gray-700 mb-1">La ruleta no está disponible para este tipo de tienda</p>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">Los diseños de Auto Motor y Auto Drive no incluyen este juego. Podés seguir usando cupones manuales y de recuperación por WhatsApp más abajo.</p>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-16 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : !widget ? (
          // Sin widget — elegir tipo
          <div>
            <style>{`
              @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              .wheel-spin { animation: spin-slow 10s linear infinite; }
              @keyframes scratch-shimmer { 0%,100% { opacity:.55 } 50% { opacity:.85 } }
              .scratch-shine { animation: scratch-shimmer 2.5s ease-in-out infinite; }
            `}</style>

            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-2xl font-bold text-gray-900 mb-2">Convertí visitas en ventas con un juego</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Un descuento aburrido se ignora. Un premio ganado se usa. Elegí cómo querés que tus clientes lo descubran.
              </p>
            </div>

            {/* Por qué funciona — strip de valor */}
            <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto mb-8">
              {[
                { icon: "🎯", title: "Más conversión", desc: "El cliente que ganó algo tiene mucho más incentivo para comprar" },
                { icon: "📧", title: "Captura emails", desc: "Requerís el email antes de jugar — crecés tu lista de forma orgánica" },
                { icon: "🔒", title: "Sin trampas", desc: "El premio se determina en el servidor, nadie puede manipularlo" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-center">
                  <span className="text-2xl block mb-2">{icon}</span>
                  <p className="text-xs font-bold text-gray-800 mb-1">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-10">

              {/* ── RULETA ── */}
              <button
                onClick={() => { setWidget({ ...DEFAULT_WIDGET, type: "SPIN" }); setEditorDefaultTab("general"); setShowEditor(true); }}
                className="group text-left rounded-3xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              >
                <div className="flex flex-col h-full p-6" style={{ background: "linear-gradient(150deg, #1c0a2e 0%, #2d0f50 60%, #1a0630 100%)" }}>
                  {/* Wheel preview */}
                  <div className="flex justify-center mb-4">
                    <div className="wheel-spin">
                      <SpinWheelPreview prizes={[]} styles={DEFAULT_STYLES} centerType="text" centerText="WIN" size={104} />
                    </div>
                  </div>

                  {/* Badge + title */}
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-400 border border-pink-500/20 mb-2">
                      ⭐ Más popular
                    </span>
                    <h3 className="text-white font-black text-2xl leading-tight">Ruleta</h3>
                    <p className="text-white/50 text-sm mt-1 leading-relaxed">El cliente gira y descubre al instante si ganó</p>
                  </div>

                  {/* Para qué sirve */}
                  <div className="rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs font-semibold text-pink-400 mb-1 uppercase tracking-wide">¿Para qué lo uso?</p>
                    <p className="text-xs text-white/60 leading-relaxed">Ideal para atrapar la atención de clientes nuevos que todavía no decidieron comprar. La emoción del giro los engancha.</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {[
                      "Animación real que gira en pantalla",
                      "Probabilidades configurables por premio",
                      "Código único generado automáticamente",
                      "Aparece sola en tu tienda sin código",
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/65">
                        <span className="text-pink-400 font-bold shrink-0 mt-px">✓</span>{f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="w-full rounded-2xl py-3 text-center font-bold text-sm text-white transition-all group-hover:brightness-110"
                    style={{ background: "linear-gradient(135deg, #E8186D, #c4105b)" }}>
                    Crear Ruleta →
                  </div>
                </div>
              </button>

              {/* ── RASPADITA ── */}
              <button
                onClick={() => { setWidget({ ...DEFAULT_WIDGET, type: "SCRATCH" }); setEditorDefaultTab("general"); setShowEditor(true); }}
                className="group text-left rounded-3xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
              >
                <div className="flex flex-col h-full p-6" style={{ background: "linear-gradient(150deg, #1a1100 0%, #2d1e00 60%, #1a1000 100%)" }}>
                  {/* Scratch card illustration */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-32 h-[76px] rounded-2xl overflow-hidden shadow-xl">
                      <div className="absolute inset-0 scratch-shine" style={{ background: "linear-gradient(135deg, #C8921A 0%, #F0C84A 40%, #E8B830 65%, #A87820 100%)" }} />
                      {[8,22,36,50,64].map(y => (
                        <div key={y} className="absolute w-full h-px" style={{ top: y, background: "rgba(255,255,255,0.12)", transform: "rotate(-2deg)" }} />
                      ))}
                      <div className="absolute right-0 top-0 bottom-0 w-[45%] flex flex-col items-center justify-center gap-0.5"
                        style={{ background: "rgba(0,0,0,0.55)" }}>
                        <span className="text-yellow-300 font-black text-xl leading-none">20%</span>
                        <span className="text-yellow-400/70 text-[9px] font-bold tracking-wider uppercase">OFF</span>
                      </div>
                      <div className="absolute" style={{ right: "45%", top: 0, bottom: 0, width: 8, background: "linear-gradient(to right, rgba(200,146,26,0.9), transparent)" }} />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-3">
                    <h3 className="text-white font-black text-2xl leading-tight">Raspadita</h3>
                    <p className="text-white/50 text-sm mt-1 leading-relaxed">El cliente raspa con el dedo y revela su premio</p>
                  </div>

                  {/* Para qué sirve */}
                  <div className="rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p className="text-xs font-semibold text-yellow-400 mb-1 uppercase tracking-wide">¿Para qué lo uso?</p>
                    <p className="text-xs text-white/60 leading-relaxed">Ideal para tiendas con mucho tráfico mobile. La acción física de rascar crea una experiencia memorable que el cliente recuerda.</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {[
                      "Raspar con dedo en celular y tablet",
                      "Funciona con mouse en escritorio",
                      "Premio oculto hasta que el cliente raspe",
                      "Revela automáticamente al 50% raspado",
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/65">
                        <span className="text-yellow-400 font-bold shrink-0 mt-px">✓</span>{f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="w-full rounded-2xl py-3 text-center font-bold text-sm text-white transition-all group-hover:brightness-110"
                    style={{ background: "linear-gradient(135deg, #C8A84B, #a8882e)" }}>
                    Crear Raspadita →
                  </div>
                </div>
              </button>

            </div>

            {/* Cómo funciona — barra inferior */}
            <div className="border-t border-gray-100 pt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-4">Cómo funciona</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { n: "1", text: "Configurás los premios y probabilidades" },
                  { n: "2", text: "El widget aparece solo en tu tienda" },
                  { n: "3", text: "El cliente juega y gana un código" },
                  { n: "4", text: "Lo aplica en el checkout" },
                ].map(({ n, text }) => (
                  <div key={n} className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-3 py-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white mt-0.5">{n}</span>
                    <span className="text-xs text-gray-600 leading-snug">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Widget configurado
          <div className="space-y-4">
            {/* Card principal — dos columnas */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row">

                {/* Columna izquierda: info + premios */}
                <div className="flex-1 p-6">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                        {widget.type === "SPIN" ? "🎡" : "🪙"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-gray-900">{widget.type === "SPIN" ? "Ruleta" : "Raspadita"}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${widget.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {widget.isActive ? "● Activo en tu tienda" : "Inactivo"}
                          </span>
                        </div>
                        {/* Behavior chips */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            {widget.triggerType === "FIRST_CLICK" ? "Al primer click" : widget.triggerType === "ON_ENTER" ? "Al entrar" : `Tras ${widget.triggerDelay}s`}
                          </span>
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            {widget.showFrequency === "ONCE_EVER" ? "1 vez por dispositivo" : widget.showFrequency === "ONCE_SESSION" ? "1 vez por sesión" : "Siempre"}
                          </span>
                          {widget.emailRequired && (
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">📧 Email requerido</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setEditorDefaultTab("general"); setShowEditor(true); }}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <Settings className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button onClick={toggleWidget} disabled={toggling} className="disabled:opacity-50">
                        {toggling
                          ? <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                          : widget.isActive
                            ? <ToggleRight className="h-8 w-8 text-indigo-600" />
                            : <ToggleLeft className="h-8 w-8 text-gray-300" />}
                      </button>
                    </div>
                  </div>

                  {/* Premios configurados */}
                  {widget.prizes.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {widget.prizes.filter(p => !p.isNoPrize).length} premio{widget.prizes.filter(p => !p.isNoPrize).length !== 1 ? "s" : ""} activos
                        </p>
                        <button onClick={() => { setEditorDefaultTab("prizes"); setShowEditor(true); }}
                          className="text-xs text-indigo-500 hover:underline font-semibold">Gestionar premios →</button>
                      </div>
                      <div className="space-y-2">
                        {widget.prizes.map((p, i) => (
                          <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${p.isNoPrize ? "bg-gray-50" : "bg-indigo-50"}`}>
                            <span className="text-base shrink-0">{p.isNoPrize ? "😔" : "🎁"}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-800 text-sm">{p.label}</span>
                              {!p.isNoPrize && (
                                <span className="ml-2 text-xs text-gray-500">
                                  {p.discountType === "percentage" ? `${p.discountValue}%` : `$${p.discountValue?.toLocaleString("es-AR")}`} off
                                  {p.maxUses ? ` · ${p.maxUses} usos` : ""}
                                </span>
                              )}
                              {!p.isNoPrize && p.couponCode && (
                                <code className="ml-2 text-xs text-indigo-600 font-mono tracking-wider">{p.couponCode}</code>
                              )}
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold shrink-0 ${p.isNoPrize ? "bg-gray-200 text-gray-600" : "bg-indigo-100 text-indigo-700"}`}>
                              {p.probability}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Empty prizes — CTA visual */
                    <div className="rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 p-6 text-center">
                      <div className="text-3xl mb-2">🎁</div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Todavía no hay premios configurados</p>
                      <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">Agregá los descuentos que querés sortear y el sistema generará los códigos automáticamente.</p>
                      <button
                        onClick={() => { setEditorDefaultTab("prizes"); setShowEditor(true); }}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors">
                        <Plus className="h-4 w-4" /> Agregar premios
                      </button>
                    </div>
                  )}
                </div>

                {/* Columna derecha: preview oscura */}
                <div className="md:w-52 shrink-0 flex flex-col items-center justify-start gap-3 p-4 overflow-y-auto"
                  style={{ background: "#111118" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest pt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Vista del cliente
                  </p>
                  {widget.type === "SPIN"
                    ? <SpinWheelPreview prizes={widget.prizes} styles={widget.styles} centerType={widget.centerType} centerText={widget.centerText} size={140} />
                    : <ScratchPreview styles={widget.styles} />
                  }
                  <div className="text-center">
                    <p className="text-white text-xs font-bold mb-0.5">{widget.title}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{widget.subtitle}</p>
                  </div>
                  <button
                    className="w-full rounded-xl py-2 text-xs font-bold"
                    style={{ background: widget.styles.buttonBg, color: widget.styles.buttonText }}>
                    {widget.buttonText}
                  </button>
                </div>

              </div>
            </div>

            {/* Cambiar tipo / Eliminar */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span>¿Preferís otro estilo?</span>
                <button
                  onClick={() => { setWidget({ ...widget, type: widget.type === "SPIN" ? "SCRATCH" : "SPIN" }); setEditorDefaultTab("general"); setShowEditor(true); }}
                  className="text-indigo-500 hover:underline font-semibold">
                  Cambiar a {widget.type === "SPIN" ? "Raspadita 🪙" : "Ruleta 🎡"}
                </button>
              </div>
              <button
                onClick={deleteWidget}
                disabled={deleting}
                className="text-red-400 hover:text-red-600 hover:underline disabled:opacity-50 text-xs">
                {deleting ? "Eliminando…" : "Eliminar widget"}
              </button>
            </div>
          </div>
        )}

        <CouponHistory />
      </div>
    </DashboardLayout>
  );
}
