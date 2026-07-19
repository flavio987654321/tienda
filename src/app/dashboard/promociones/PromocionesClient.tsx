"use client";

import { useState, useCallback, useRef } from "react";
import {
  Percent, Tag, Gift, Truck, Store, Folder, ListChecks, Check, Plus, X,
  Info, AlertTriangle, Loader2, Search, Archive, Trash2, RotateCcw, Smile, Pencil, Shuffle,
} from "lucide-react";
import { costFloorCheck, MAX_PROMO_PERCENT as MAX_PCT } from "@/lib/promotions";

// Emojis para el nombre de la promo (lo ve solo el dueño; le ayuda a reconocerla de un vistazo).
const PROMO_EMOJIS = [
  "🔥", "💥", "🎉", "🎁", "🏷️", "⚡", "💸", "🛍️", "✨", "⭐", "❤️", "😍",
  "👑", "🎯", "🚀", "💯", "🥳", "🏆", "💎", "🤑", "☀️", "🍂", "❄️", "🌸",
  "👗", "👟", "👜", "💄", "🏠", "📦", "🛒", "🎊",
];

// Solo dígitos (para el %). Bloquea letras/símbolos apenas se tipean.
const onlyDigits = (s: string) => s.replace(/\D/g, "");
// Dígitos + separadores de miles/decimal (para montos en pesos; parseNum los normaliza).
const digitsMoney = (s: string) => s.replace(/[^\d.,]/g, "");

// ── Tipos ────────────────────────────────────────────────────────────────────
type Promotion = {
  id: string; name: string; type: string; value: number | null;
  minQty: number | null; payQty: number | null; minOrderAmount: number;
  scope: string; categories: string[]; productIds: string[];
  startsAt: string | null; endsAt: string | null;
  combinesWithCoupons: boolean; combinesWithPromotions: boolean;
  isActive: boolean; archivedAt: string | null; status: string;
};
type Category = { name: string; count: number };
type Product = { id: string; name: string; price: number; category: string; costPrice: number | null };

// ── Metadatos de cada tipo (ícono, color, textos, explicación) ───────────────
const TYPE_META: Record<string, {
  Icon: typeof Percent; tile: string; label: string; short: string; et: string; ed: string;
}> = {
  PERCENT: { Icon: Percent, tile: "bg-indigo-50 text-indigo-600", label: "Porcentaje de descuento", short: "Ej. 20% off en las remeras",
    et: "Un porcentaje menos en el precio",
    ed: "El cliente ve el precio original tachado y el nuevo debajo. Se aplica solo en la tienda, sin escribir ningún código." },
  FIXED: { Icon: Tag, tile: "bg-rose-50 text-rose-600", label: "Monto fijo de descuento", short: "Ej. $5.000 off en camperas",
    et: "Un monto fijo menos, no un porcentaje",
    ed: "Se resta la misma plata a cada producto elegido. Ideal para liquidar: “$5.000 menos en toda campera”, cueste lo que cueste." },
  N_PAY_M: { Icon: Gift, tile: "bg-amber-50 text-amber-600", label: "Llevá N, pagá M", short: "Ej. llevá 3 iguales, pagá 2",
    et: "Comprando varios del MISMO producto, uno va sin cargo",
    ed: "Se arma solo en el carrito. En un 3×2, llevando 3 unidades del mismo producto, paga 2. Si querés que pueda combinar productos distintos, usá “Combo: llevá N mezclando”." },
  MIX_N_PAY_M: { Icon: Shuffle, tile: "bg-violet-50 text-violet-600", label: "Combo: llevá N mezclando", short: "Ej. llevá 3 cualesquiera, el más barato gratis",
    et: "Comprando varios productos DISTINTOS, el más barato va sin cargo",
    ed: "Como el 3×2 pero sin obligar a llevar el mismo producto: el cliente combina lo que quiera de lo que elijas (una remera + un pantalón + una campera) y el más barato de cada 3 le sale gratis. Es el que más sube el ticket promedio." },
  FREE_SHIPPING: { Icon: Truck, tile: "bg-teal-50 text-teal-600", label: "Envío gratis", short: "Ej. desde $50.000",
    et: "El envío pasa a costar cero",
    ed: "Si la compra supera el monto que pongas, el envío se bonifica en el checkout. Por debajo, paga envío normal." },
};

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

// Los dos tipos "llevá N pagá M" (mismo producto y mix & match) comparten los campos
// minQty/payQty y toda la UI de reglas — lo único que cambia es si se puede mezclar.
const isNxM = (t: string | null | undefined) => t === "N_PAY_M" || t === "MIX_N_PAY_M";

function statusPill(s: string) {
  const map: Record<string, [string, string]> = {
    active: ["text-green-600 bg-green-50", "Activa"],
    scheduled: ["text-indigo-600 bg-indigo-50", "Programada"],
    paused: ["text-slate-400 bg-slate-100", "Pausada"],
    expired: ["text-slate-500 bg-slate-100", "Vencida"],
    archived: ["text-slate-500 bg-slate-100", "Archivada"],
  };
  const [cls, label] = map[s] ?? map.paused;
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${cls}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{label}</span>;
}

// Texto corto del descuento para el chip y el resumen.
function discountLabel(p: Pick<Promotion, "type" | "value" | "minQty" | "payQty">) {
  if (p.type === "PERCENT") return `${p.value ?? 0}% OFF`;
  if (p.type === "FIXED") return `${money(p.value ?? 0)} OFF`;
  if (isNxM(p.type)) return `${p.minQty ?? 0} × ${p.payQty ?? 0}`;
  return "Envío gratis";
}
// Detalle de a QUÉ se aplica. Para "productos elegidos" muestra los nombres (no un
// número suelto): si son pocos, todos; si son muchos, los primeros + "y N más".
function scopeDetail(p: Pick<Promotion, "scope" | "categories" | "productIds">, products: Product[]) {
  if (p.scope === "ALL") return "Toda la tienda";
  if (p.scope === "CATEGORY") return "Categoría · " + (p.categories.join(", ") || "—");
  const names = p.productIds.map((id) => products.find((pr) => pr.id === id)?.name).filter((n): n is string => !!n);
  if (names.length === 0) return p.productIds.length === 1 ? "1 producto" : `${p.productIds.length} productos`;
  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} y ${names.length - 2} más`;
}
function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export default function PromocionesClient({
  initialPromotions, categories, products, activeCount,
}: {
  initialPromotions: Promotion[]; categories: Category[]; products: Product[]; activeCount: number;
}) {
  const [promos, setPromos] = useState<Promotion[]>(initialPromotions);
  const [tab, setTab] = useState<"act" | "hist">("act");
  const [wizOpen, setWizOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const isLive = (p: Promotion) => p.status === "active" || p.status === "scheduled" || p.status === "paused";
  const shown = promos.filter((p) => (tab === "act" ? isLive(p) : !isLive(p)));
  const liveCount = promos.filter((p) => p.status === "active" || p.status === "scheduled").length;

  async function refresh() {
    // El endpoint devuelve un tab por vez; traemos los dos y unimos, para que
    // Activas e Historial queden frescos sin importar en cuál estás parado.
    const [a, h] = await Promise.all([
      fetch("/api/dashboard/promociones?tab=act&take=50").then((r) => r.json()).catch(() => null),
      fetch("/api/dashboard/promociones?tab=hist&take=50").then((r) => r.json()).catch(() => null),
    ]);
    if (a?.promotions && h?.promotions) setPromos([...a.promotions, ...h.promotions]);
  }

  async function toggle(p: Promotion) {
    if (busyId) return;
    setBusyId(p.id);
    setPromos((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: !x.isActive, status: !x.isActive ? liveStatus(x) : "paused" } : x));
    try {
      await fetch(`/api/dashboard/promociones/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !p.isActive }) });
    } catch { showToast("No se pudo actualizar", false); await refresh(); }
    finally { setBusyId(null); }
  }
  async function archive(p: Promotion) {
    if (busyId) return;
    if (!confirm(`¿Archivar “${p.name}”? Deja de aplicarse y va al historial. No se borra.`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/dashboard/promociones/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archive: true }) });
      if (res.ok) { await refresh(); showToast("Promoción archivada"); }
    } finally { setBusyId(null); }
  }
  async function unarchive(p: Promotion) {
    if (busyId) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/dashboard/promociones/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archive: false }) });
      if (res.ok) { await refresh(); showToast("Promoción restaurada"); }
    } finally { setBusyId(null); }
  }
  async function remove(p: Promotion) {
    if (busyId) return;
    if (!confirm(`¿Eliminar “${p.name}” para siempre? Esto no se puede deshacer.`)) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/dashboard/promociones/${p.id}`, { method: "DELETE" });
      if (res.ok) { setPromos((prev) => prev.filter((x) => x.id !== p.id)); showToast("Promoción eliminada"); }
    } finally { setBusyId(null); }
  }

  function liveStatus(p: Promotion) {
    if (p.startsAt && new Date(p.startsAt) > new Date()) return "scheduled";
    return "active";
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-gray-500 mt-1 text-sm max-w-2xl">
            Descuentos que se aplican solos en la tienda. Definís una vez a qué productos van y desde cuándo — no producto por producto.
          </p>
        </div>
        <button onClick={() => { setEditing(null); setWizOpen(true); }} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="h-4 w-4" /> Nueva promoción
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard tile="bg-indigo-50 text-indigo-600" Icon={Tag} value={String(liveCount || activeCount)} label="Promociones activas" />
        <StatCard tile="bg-green-50 text-green-600" Icon={Check} value="0" label="Ventas con promo este mes" />
        <StatCard tile="bg-amber-50 text-amber-600" Icon={Gift} value="$0" label="Ahorro dado a clientes" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        <TabBtn on={tab === "act"} onClick={() => setTab("act")}>Activas {liveCount > 0 && <span className="ml-1.5 text-[11px] bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 font-bold">{liveCount}</span>}</TabBtn>
        <TabBtn on={tab === "hist"} onClick={() => setTab("hist")}>Historial</TabBtn>
      </div>

      {/* Lista */}
      {shown.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl py-14 text-center text-gray-500 text-sm">
          {tab === "act" ? (
            <>
              <BadgeEmpty />
              <p className="mt-3 font-medium text-gray-700">Todavía no tenés promociones activas</p>
              <p className="mt-1">Creá la primera y se aplica sola en tu tienda.</p>
              <button onClick={() => { setEditing(null); setWizOpen(true); }} className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Plus className="h-4 w-4" /> Nueva promoción
              </button>
            </>
          ) : <p>No hay promociones en el historial todavía.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => {
            const meta = TYPE_META[p.type] ?? TYPE_META.PERCENT;
            const archived = !isLive(p);
            // Piso de costo: ¿esta promo deja algún producto bajo su costo? Solo se
            // señala en promos vivas (una archivada ya no aplica).
            const belowCost = archived ? 0 : costFloorCheck(p, products).below.length;
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${meta.tile}`}><meta.Icon className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-[15px]">{p.name}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.tile}`}>{discountLabel(p)}</span>
                  </div>
                  <div className="text-[12.5px] text-gray-500 flex gap-2 flex-wrap items-center mt-0.5">
                    <span className="text-gray-700 font-medium">{scopeDetail(p, products)}</span>
                    {p.minOrderAmount > 0 && <><span className="text-gray-300">/</span><span>mín. {money(p.minOrderAmount)}</span></>}
                    {p.endsAt && <><span className="text-gray-300">/</span><span>hasta {fmtDate(p.endsAt)}</span></>}
                    {p.startsAt && p.status === "scheduled" && <><span className="text-gray-300">/</span><span>desde {fmtDate(p.startsAt)}</span></>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {statusPill(p.status)}
                  {belowCost > 0 && (
                    <span title={`${belowCost} producto${belowCost !== 1 ? "s" : ""} por debajo de su costo`}
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> bajo costo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!archived ? (
                    <>
                      <IconBtn title="Ver / editar" onClick={() => { setEditing(p); setWizOpen(true); }} disabled={busyId === p.id}><Pencil className="h-4 w-4" /></IconBtn>
                      <Toggle on={p.isActive && p.status !== "paused" ? true : p.isActive} disabled={busyId === p.id} onClick={() => toggle(p)} />
                      <IconBtn title="Archivar" onClick={() => archive(p)} disabled={busyId === p.id}><Archive className="h-4 w-4" /></IconBtn>
                    </>
                  ) : (
                    <>
                      <IconBtn title="Restaurar" onClick={() => unarchive(p)} disabled={busyId === p.id}><RotateCcw className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Eliminar" onClick={() => remove(p)} disabled={busyId === p.id} danger><Trash2 className="h-4 w-4" /></IconBtn>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {wizOpen && (
        <Wizard
          key={editing?.id ?? "new"}
          categories={categories}
          products={products}
          editPromo={editing}
          onClose={() => { setWizOpen(false); setEditing(null); }}
          onCreated={async () => { const wasEdit = !!editing; setWizOpen(false); setEditing(null); await refresh(); if (!wasEdit) setTab("act"); showToast(wasEdit ? "Promoción actualizada" : "Promoción creada"); }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-[60] ${toast.ok ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}>{toast.msg}</div>
      )}
    </div>
  );
}

// ── Subcomponentes de la lista ───────────────────────────────────────────────
function StatCard({ tile, Icon, value, label }: { tile: string; Icon: typeof Percent; value: string; label: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl grid place-items-center mb-3 ${tile}`}><Icon className="h-4.5 w-4.5" /></div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors ${on ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-500 hover:bg-gray-100"}`}>{children}</button>;
}
function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={on}
      className={`relative w-10 h-[23px] rounded-full transition-colors disabled:opacity-50 ${on ? "bg-indigo-600" : "bg-gray-300"}`}>
      <span className={`absolute top-[2.5px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${on ? "left-[19px]" : "left-[2.5px]"}`} />
    </button>
  );
}
function IconBtn({ children, title, onClick, disabled, danger }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button title={title} onClick={onClick} disabled={disabled} className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${danger ? "text-gray-400 hover:text-red-600 hover:bg-red-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}>{children}</button>;
}
function BadgeEmpty() {
  return <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 grid place-items-center mx-auto"><Percent className="h-5 w-5" /></div>;
}

// ── Wizard de creación ───────────────────────────────────────────────────────
const STEP_NAMES = ["Tipo", "Alcance", "Reglas", "Vigencia", "Confirmar"];

function Wizard({ categories, products, onClose, onCreated, editPromo }: {
  categories: Category[]; products: Product[]; onClose: () => void; onCreated: () => void; editPromo?: Promotion | null;
}) {
  const isEdit = !!editPromo;
  // En edición se abre directo en el paso 5 (Revisá): funciona como DETALLE de lo elegido,
  // y desde ahí "Atrás" para cambiar cualquier paso. En creación arranca en el paso 1.
  const [step, setStep] = useState(isEdit ? 5 : 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [type, setType] = useState<string | null>(editPromo?.type ?? null);
  const [scope, setScope] = useState<string | null>(editPromo?.scope ?? null);
  const [cat, setCat] = useState<string | null>(editPromo?.scope === "CATEGORY" ? (editPromo.categories[0] ?? null) : null);
  const [prodIds, setProdIds] = useState<string[]>(editPromo?.scope === "PRODUCTS" ? editPromo.productIds : []);
  const [prodSearch, setProdSearch] = useState("");
  const [name, setName] = useState(editPromo?.name ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [value, setValue] = useState(editPromo && (editPromo.type === "PERCENT" || editPromo.type === "FIXED") && editPromo.value != null ? String(editPromo.value) : "");
  const [minQty, setMinQty] = useState(isNxM(editPromo?.type) && editPromo?.minQty != null ? String(editPromo.minQty) : "3");
  const [payQty, setPayQty] = useState(isNxM(editPromo?.type) && editPromo?.payQty != null ? String(editPromo.payQty) : "2");
  const [minOrder, setMinOrder] = useState(editPromo && editPromo.minOrderAmount > 0 ? String(editPromo.minOrderAmount) : "");
  const [startsAt, setStartsAt] = useState(editPromo?.startsAt ? editPromo.startsAt.slice(0, 10) : "");
  const [endsAt, setEndsAt] = useState(editPromo?.endsAt ? editPromo.endsAt.slice(0, 10) : "");
  const [combines, setCombines] = useState(editPromo?.combinesWithCoupons ?? false);

  const meta = type ? TYPE_META[type] : null;

  // Inserta el emoji en la posición del cursor (o al final) y deja el caret después.
  function insertEmoji(emoji: string) {
    const el = nameRef.current;
    const start = el?.selectionStart ?? name.length;
    const end = el?.selectionEnd ?? name.length;
    const next = name.slice(0, start) + emoji + name.slice(end);
    setName(next.slice(0, 60));
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = Math.min(start + emoji.length, 60);
      el.setSelectionRange(pos, pos);
    });
  }

  function canNext() {
    if (step === 1) return !!type;
    if (step === 2) { if (!scope) return false; if (scope === "CATEGORY") return !!cat; if (scope === "PRODUCTS") return prodIds.length > 0; return true; }
    if (step === 3) {
      // % entre 1 y 90 EN VIVO (antes solo pedía >0 y el server rechazaba al final).
      if (type === "PERCENT") { const n = parseFloat(value); return n >= 1 && n <= MAX_PCT; }
      if (type === "FIXED") return parseFloat(value) > 0;
      if (isNxM(type)) return parseInt(minQty) >= 2 && parseInt(payQty) >= 1 && parseInt(payQty) < parseInt(minQty);
      return true;
    }
    if (step === 5) return name.trim().length >= 2;
    return true;
  }

  async function save() {
    setErr(""); setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(), type, scope,
        categories: scope === "CATEGORY" && cat ? [cat] : [],
        productIds: scope === "PRODUCTS" ? prodIds : [],
        minOrderAmount: parseNum(minOrder),
        startsAt: startsAt || null, endsAt: endsAt || null,
        combinesWithCoupons: combines,
      };
      if (type === "PERCENT" || type === "FIXED") body.value = parseNum(value);
      if (isNxM(type)) { body.minQty = parseInt(minQty); body.payQty = parseInt(payQty); }
      const res = await fetch(
        isEdit ? `/api/dashboard/promociones/${editPromo!.id}` : "/api/dashboard/promociones",
        { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || (isEdit ? "No se pudo guardar la promoción" : "No se pudo crear la promoción")); setSaving(false); return; }
      onCreated();
    } catch { setErr("Error de conexión"); setSaving(false); }
  }

  function next() { if (!canNext()) return; if (step < 5) setStep(step + 1); else save(); }

  const affected = scope === "ALL" ? products.length : scope === "CATEGORY" ? (categories.find((c) => c.name === cat)?.count ?? 0) : prodIds.length;
  const filteredProds = products.filter((p) => p.name.toLowerCase().includes(prodSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-[2px] flex items-start justify-center p-4 sm:p-7 overflow-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-[540px] overflow-hidden shadow-2xl">
        {/* Head + stepper */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 relative">
          <button onClick={onClose} className="absolute right-4 top-4 w-7 h-7 grid place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>
          <div className="flex items-center">
            {STEP_NAMES.map((nm, i) => {
              const n = i + 1; const st = n < step ? "done" : n === step ? "now" : "";
              return (
                <div key={nm} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-[26px] h-[26px] rounded-full grid place-items-center text-[12px] font-bold shrink-0 ${st === "now" ? "bg-indigo-600 text-white" : st === "done" ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400"}`}>
                      {n < step ? <Check className="h-3.5 w-3.5" /> : n}
                    </span>
                    <span className={`text-xs font-semibold hidden sm:block ${st === "now" ? "text-gray-900" : st === "done" ? "text-gray-500" : "text-gray-400"}`}>{nm}</span>
                  </div>
                  {n < 5 && <span className="w-5 h-0.5 bg-gray-200 mx-1.5 rounded" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[250px]">
          {step === 1 && (
            <>
              <StepTitle t="¿Qué tipo de promoción?" d="Elegí cómo querés que se descuente. Abajo te explico cómo funciona cada una." />
              <div className="space-y-2.5">
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <OptCard key={k} sel={type === k} onClick={() => setType(k)} tile={m.tile} Icon={m.Icon} title={m.label} desc={m.short} />
                ))}
              </div>
              {meta && (
                <div className="flex gap-3 bg-indigo-50 rounded-xl p-3.5 mt-4">
                  <div className="w-8 h-8 rounded-lg bg-white text-indigo-600 grid place-items-center shrink-0"><meta.Icon className="h-4 w-4" /></div>
                  <div><div className="font-bold text-[13px] text-gray-900">{meta.et}</div><div className="text-[12.5px] text-indigo-900/70 leading-snug mt-0.5">{meta.ed}</div></div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <StepTitle t="¿A qué se aplica?" d="Elegís una vez y vale para todos esos productos. Esto es lo que hoy no podés hacer." />
              <div className="space-y-2.5">
                <OptCard sel={scope === "ALL"} onClick={() => setScope("ALL")} tile="bg-indigo-50 text-indigo-600" Icon={Store} title="Toda la tienda" desc="Cada producto de tu catálogo" />
                <OptCard sel={scope === "CATEGORY"} onClick={() => setScope("CATEGORY")} tile="bg-indigo-50 text-indigo-600" Icon={Folder} title="Una categoría" desc="Todos los productos de un rubro" />
                <OptCard sel={scope === "PRODUCTS"} onClick={() => setScope("PRODUCTS")} tile="bg-indigo-50 text-indigo-600" Icon={ListChecks} title="Productos elegidos" desc="Los seleccionás uno por uno" />
              </div>
              {scope === "CATEGORY" && (
                <Picker label="Elegí la categoría" right={cat ?? undefined}>
                  {categories.length === 0 ? <Empty>No tenés categorías cargadas todavía.</Empty> : categories.map((c) => (
                    <PkRow key={c.name} on={cat === c.name} onClick={() => setCat(c.name)} radio name={c.name} sub={`${c.count} productos`} />
                  ))}
                </Picker>
              )}
              {scope === "PRODUCTS" && (
                <Picker label="Elegí los productos" right={`${prodIds.length} seleccionados`}>
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} placeholder="Buscar producto…" className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  </div>
                  <div className="max-h-[180px] overflow-auto">
                    {filteredProds.length === 0 ? <Empty>Sin resultados.</Empty> : filteredProds.map((p) => (
                      <PkRow key={p.id} on={prodIds.includes(p.id)} onClick={() => setProdIds((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])} name={p.name} sub={money(p.price)} />
                    ))}
                  </div>
                </Picker>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <StepTitle t="Las reglas" d={type === "FREE_SHIPPING" ? "¿Desde qué monto el envío es gratis?" : isNxM(type) ? "Definí el “llevá N, pagá M”." : "Cuánto se descuenta, y desde qué monto."} />
              {isNxM(type) ? (
                <>
                  <div className="flex gap-3">
                    <Field label="Llevando"><input value={minQty} onChange={(e) => setMinQty(onlyDigits(e.target.value))} inputMode="numeric" className={inputCls} /></Field>
                    <Field label="Paga"><input value={payQty} onChange={(e) => setPayQty(onlyDigits(e.target.value))} inputMode="numeric" className={inputCls} /></Field>
                  </div>
                  {type === "MIX_N_PAY_M" ? (
                    <InfoNote>
                      El cliente puede <b>combinar productos distintos</b> (una remera + un pantalón + una campera).
                      Juntando {minQty || "N"} unidades de lo que elijas, {parseInt(payQty) > 0 && parseInt(minQty) - parseInt(payQty) === 1
                        ? <>la <b>más barata sale gratis</b></>
                        : <>las <b>más baratas salen gratis</b></>}.
                    </InfoNote>
                  ) : (
                    <InfoNote>Aplica juntando la cantidad del <b>mismo producto</b> (ej. 3 remeras iguales). Si querés que pueda mezclar productos distintos, usá <b>“Combo: llevá N mezclando”</b>.</InfoNote>
                  )}
                </>
              ) : type === "FREE_SHIPPING" ? (
                <Field label="Compra mínima" hint="Vacío = siempre gratis"><input value={minOrder} onChange={(e) => setMinOrder(digitsMoney(e.target.value))} inputMode="numeric" placeholder="$ 50.000" className={inputCls} /></Field>
              ) : (
                <>
                  <Field label={type === "FIXED" ? "Monto de descuento" : `Porcentaje de descuento (1 a ${MAX_PCT})`}>
                    <input value={value} onChange={(e) => setValue(type === "PERCENT" ? onlyDigits(e.target.value) : digitsMoney(e.target.value))} inputMode="numeric" placeholder={type === "FIXED" ? "$ 5.000" : "20"} className={inputCls} />
                    {type === "PERCENT" && value !== "" && (parseFloat(value) < 1 || parseFloat(value) > MAX_PCT) && (
                      <p className="text-[12px] text-red-600 mt-1.5">El porcentaje tiene que estar entre 1 y {MAX_PCT}.</p>
                    )}
                  </Field>
                  <Field label="Compra mínima (opcional)"><input value={minOrder} onChange={(e) => setMinOrder(digitsMoney(e.target.value))} inputMode="numeric" placeholder="Sin mínimo" className={inputCls} /></Field>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <StepTitle t="Vigencia y combinación" d="Cuándo corre, y si se puede sumar con cupones. Cuando pasa la fecha de fin, se apaga sola." />
              <div className="flex gap-3">
                <Field label="Desde"><input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} /></Field>
                <Field label="Hasta (opcional)"><input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} /></Field>
              </div>
              <div className="flex justify-between items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                <div><div className="font-semibold text-[13.5px] text-gray-900">¿Se combina con cupones?</div><div className="text-xs text-gray-500 mt-0.5 max-w-[34ch]">En “No”, quien tenga esta promo no puede usar un cupón encima.</div></div>
                <Toggle on={combines} onClick={() => setCombines(!combines)} />
              </div>
              <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3.5 text-[12.5px] text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Si algún producto afectado no tiene <b>costo cargado</b>, no vamos a poder avisarte si la promo lo deja abajo del costo. Cargá los costos para quedar cubierto.</span>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <StepTitle t={isEdit ? "Detalle de la promoción" : "Revisá y creá"} d={isEdit ? "Editá lo que quieras con “Atrás”. Guardá para aplicar los cambios al instante." : "Ponele un nombre (lo ves solo vos) y confirmá."} />
              <Field label="Nombre de la promoción">
                <div className="relative">
                  <input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 60))}
                    maxLength={60}
                    placeholder="Ej. 🔥 Verano en remeras"
                    autoFocus
                    className={inputCls + " pr-11"}
                  />
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((o) => !o)}
                    aria-label="Agregar emoji"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {emojiOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                      <div className="absolute right-0 z-20 mt-1.5 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                        <div className="grid grid-cols-8 gap-0.5">
                          {PROMO_EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => insertEmoji(e)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-gray-100"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Field>
              <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden mt-2">
                <ReviewRow k="Tipo" v={meta?.label ?? "—"} />
                <ReviewRow k="Se aplica a" v={scopeDetail({ scope: scope ?? "ALL", categories: cat ? [cat] : [], productIds: prodIds }, products)} />
                <ReviewRow k="Descuento" v={reviewDiscount(type, value, minQty, payQty)} />
                <ReviewRow k="Vigencia" v={`${startsAt ? fmtDate(startsAt + "T00:00") : "desde hoy"} · ${endsAt ? "hasta " + fmtDate(endsAt + "T00:00") : "sin fin"}`} />
                <ReviewRow k="Con cupones" v={combines ? "Se combinan" : "No combina"} last />
              </div>
              {(() => {
                // Piso de costo (aviso, NO bloquea): ¿la promo deja algún producto bajo costo?
                const cf = costFloorCheck({
                  type: type ?? "",
                  value: (type === "PERCENT" || type === "FIXED") ? parseNum(value) : null,
                  minQty: isNxM(type) ? parseInt(minQty) : null,
                  payQty: isNxM(type) ? parseInt(payQty) : null,
                  scope: scope ?? "ALL",
                  categories: scope === "CATEGORY" && cat ? [cat] : [],
                  productIds: scope === "PRODUCTS" ? prodIds : [],
                }, products);
                if (cf.below.length === 0 && cf.missingCost === 0) return null;
                return (
                  <>
                    {cf.below.length > 0 && (
                      <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3.5 text-[12.5px] text-amber-800">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <b>Ojo: {cf.below.length} producto{cf.below.length !== 1 ? "s" : ""} quedaría{cf.below.length !== 1 ? "n" : ""} bajo su costo.</b>{" "}
                          Podés crearla igual (gancho o liquidación) o ajustar el descuento.
                          <ul className="mt-1.5 space-y-0.5">
                            {cf.below.slice(0, 4).map((b) => (
                              <li key={b.name}>· <b>{b.name}</b>: queda {money(b.effective)}, te cuesta {money(b.cost)}</li>
                            ))}
                            {cf.below.length > 4 && <li>· y {cf.below.length - 4} más…</li>}
                          </ul>
                        </div>
                      </div>
                    )}
                    {cf.missingCost > 0 && (
                      <p className="text-[11.5px] text-gray-400 mt-2">
                        {cf.missingCost} producto{cf.missingCost !== 1 ? "s" : ""} sin costo cargado — no {cf.missingCost !== 1 ? "los" : "lo"} pudimos chequear.
                      </p>
                    )}
                  </>
                );
              })()}
              <div className="flex gap-2.5 items-start bg-green-50 border border-green-200 rounded-xl p-3 mt-3.5 text-[12.5px] text-green-800">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{isEdit ? "Al guardar" : "Al crearla"}, esos {affected} producto{affected !== 1 ? "s" : ""} muestran el precio con descuento en la tienda al instante.</span>
              </div>
              {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="text-sm font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-xl px-4 py-2.5 transition-colors">
            {step === 1 ? "Cancelar" : "Atrás"}
          </button>
          <button onClick={next} disabled={!canNext() || saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 5 ? (isEdit ? "Guardar cambios" : "Crear promoción") : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function StepTitle({ t, d }: { t: string; d: string }) {
  return <><h2 className="text-lg font-bold text-gray-900">{t}</h2><p className="text-sm text-gray-500 mt-0.5 mb-4 max-w-[46ch]">{d}</p></>;
}
function OptCard({ sel, onClick, tile, Icon, title, desc }: { sel: boolean; onClick: () => void; tile: string; Icon: typeof Percent; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3.5 border-[1.5px] rounded-xl p-3.5 text-left transition-all ${sel ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30"}`}>
      <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tile}`}><Icon className="h-5 w-5" /></span>
      <span className="flex-1"><span className="block font-semibold text-sm text-gray-900">{title}</span><span className="block text-[12.5px] text-gray-500 mt-0.5">{desc}</span></span>
      <span className={`w-5 h-5 rounded-full border-2 shrink-0 transition-all ${sel ? "border-indigo-600 shadow-[inset_0_0_0_4px_#4f46e5]" : "border-gray-300"}`} />
    </button>
  );
}
function Picker({ label, right, children }: { label: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2"><span>{label}</span>{right && <span className="text-indigo-600">{right}</span>}</div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">{children}</div>
    </div>
  );
}
function PkRow({ on, onClick, name, sub, radio }: { on: boolean; onClick: () => void; name: string; sub: string; radio?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3.5 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-indigo-50/40 transition-colors text-left">
      {radio
        ? <span className={`w-5 h-5 rounded-full border-2 shrink-0 ${on ? "border-indigo-600 shadow-[inset_0_0_0_4px_#4f46e5]" : "border-gray-300"}`} />
        : <span className={`w-5 h-5 rounded-md border-2 shrink-0 grid place-items-center ${on ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"}`}>{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>}
      <span className="flex-1 text-[13.5px] font-medium text-gray-900">{name}</span>
      <span className={`text-xs ${on ? "text-indigo-600" : "text-gray-400"}`}>{sub}</span>
    </button>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="mb-3.5 flex-1"><label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">{label}</label>{children}{hint && <p className="text-[11.5px] text-gray-400 mt-1.5">{hint}</p>}</div>;
}
function InfoNote({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2.5 items-start bg-green-50 border border-green-200 rounded-xl p-3 mt-1 text-[12.5px] text-green-800"><Info className="h-4 w-4 shrink-0 mt-0.5" /><span>{children}</span></div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-4 text-[12.5px] text-gray-400">{children}</div>;
}
function ReviewRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return <div className={`flex justify-between gap-4 px-4 py-2.5 text-[13px] ${last ? "" : "border-b border-gray-100"}`}><span className="text-gray-500">{k}</span><span className="font-semibold text-gray-900 text-right">{v}</span></div>;
}

function parseNum(s: string): number { const n = parseFloat(String(s).replace(/[^\d.,]/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; }
function reviewDiscount(type: string | null, value: string, minQty: string, payQty: string) {
  if (type === "PERCENT") return `${parseNum(value)}% OFF`;
  if (type === "FIXED") return `${money(parseNum(value))} OFF`;
  if (type === "MIX_N_PAY_M") return `Llevá ${minQty} mezclando, pagá ${payQty}`;
  if (type === "N_PAY_M") return `Llevá ${minQty} pagá ${payQty}`;
  return "Envío gratis";
}
