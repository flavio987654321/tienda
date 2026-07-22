"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { getEventNames, getEventRange } from "@/lib/fechas-comerciales";
import {
  Percent, Tag, Gift, Truck, Store, Folder, ListChecks, Check, Plus, X,
  Info, AlertTriangle, Loader2, Search, Archive, Trash2, RotateCcw, Smile, Pencil, Shuffle,
} from "lucide-react";
import {
  costFloorCheck, fixedImpact, DEEP_DISCOUNT_PCT, type FixedImpactResult,
  MAX_PROMO_PERCENT as MAX_PCT, MAX_EVENT_LABEL,
} from "@/lib/promotions";
import LimitePlanBanner from "@/components/dashboard/LimitePlanBanner";

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
  eventLabel: string | null;
  isActive: boolean; archivedAt: string | null; status: string;
};
type Category = { name: string; count: number };
type Product = { id: string; name: string; price: number; category: string; costPrice: number | null };

// ── Metadatos de cada tipo (ícono, color, textos, explicación) ───────────────
const TYPE_META: Record<string, {
  Icon: typeof Percent; tile: string; label: string; short: string; et: string; ed: string;
}> = {
  // Los ejemplos NO nombran una categoría a propósito (F6-C1): este paso responde
  // QUÉ tipo de descuento es, y el DÓNDE se elige en el paso 2. Decir "20% off en
  // las remeras" hacía pensar que el tipo servía solo para categorías.
  PERCENT: { Icon: Percent, tile: "bg-indigo-50 text-indigo-600", label: "Porcentaje de descuento", short: "Ej. 20% de descuento",
    et: "Un porcentaje menos en el precio",
    ed: "El cliente ve el precio original tachado y el nuevo debajo. Se aplica solo con entrar a tu tienda: no tiene que escribir ningún cupón." },
  FIXED: { Icon: Tag, tile: "bg-rose-50 text-rose-600", label: "Monto fijo de descuento", short: "Ej. $5.000 de descuento",
    et: "Un monto fijo menos, no un porcentaje",
    ed: "Se resta la misma plata a cada producto, cueste lo que cueste. Ideal para liquidar: en uno de $30.000 son $5.000 menos, y en uno de $8.000 también." },
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
  if (p.scope === "CATEGORY") return (p.categories.length === 1 ? "Categoría · " : "Categorías · ") + (p.categories.join(", ") || "—");
  const names = p.productIds.map((id) => products.find((pr) => pr.id === id)?.name).filter((n): n is string => !!n);
  if (names.length === 0) return p.productIds.length === 1 ? "1 producto" : `${p.productIds.length} productos`;
  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} y ${names.length - 2} más`;
}
// Subtítulo de cada categoría en el selector: cuántos productos y entre qué
// precios (F6-C3). El selector de productos ya mostraba el precio de cada uno;
// el de categorías decía solo "5 productos", y con un monto fijo eso es elegir a
// ciegas — el riesgo es `monto ÷ el más barato del alcance`, así que "$5.000" es
// un 23% en una categoría que arranca en $22.000 y un 80% en una que arranca en
// $6.000. Mismo dato, decisión completamente distinta.
function catSub(c: Category, products: Product[]) {
  const cant = `${c.count} producto${c.count === 1 ? "" : "s"}`;
  const precios = products.filter((p) => p.category === c.name).map((p) => p.price)
    .filter((n) => n > 0).sort((a, b) => a - b);
  if (!precios.length) return cant;
  const min = precios[0], max = precios[precios.length - 1];
  return min === max ? `${cant} · ${money(min)}` : `${cant} · ${money(min)} a ${money(max)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export default function PromocionesClient({
  initialPromotions, categories, products, activeCount, maxPromotions,
  ventasConPromo, ahorroDelMes,
}: {
  initialPromotions: Promotion[]; categories: Category[]; products: Product[]; activeCount: number;
  maxPromotions: number | null;
  ventasConPromo: number; ahorroDelMes: number;
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

  // Cupo del plan. `isLive` es exactamente el criterio del servidor (no archivada
  // y no vencida), así que el número de acá es el que el POST va a aplicar.
  const slotsUsed = promos.filter(isLive).length;
  const atLimit = maxPromotions !== null && slotsUsed >= maxPromotions;

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
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={() => { setEditing(null); setWizOpen(true); }}
            disabled={atLimit}
            title={atLimit ? `Llegaste a las ${maxPromotions} promociones del plan Tienda Pro` : undefined}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva promoción
          </button>
          {/* El cupo se muestra siempre, no solo al llegar al tope: la idea es que
              nadie se entere del límite recién cuando le rebotan el formulario. */}
          {maxPromotions !== null && (
            <p className={`text-xs font-medium ${atLimit ? "text-amber-600" : "text-gray-400"}`}>
              {slotsUsed} de {maxPromotions} · plan Tienda Pro
            </p>
          )}
        </div>
      </div>

      {atLimit && (
        <LimitePlanBanner
          titulo={`Llegaste a las ${maxPromotions} promociones del plan Tienda Pro`}
          queGanas="promociones sin límite"
          comoLiberar={
            <>
              Para crear otra, archivá alguna que ya no uses desde el botón{" "}
              <Archive className="h-3 w-3 inline-block -mt-0.5" /> de la lista — las archivadas y las
              vencidas no ocupan lugar, y podés restaurarlas cuando quieras.
            </>
          }
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard tile="bg-indigo-50 text-indigo-600" Icon={Tag} value={String(liveCount || activeCount)} label="Promociones activas" />
        <StatCard tile="bg-green-50 text-green-600" Icon={Check} value={String(ventasConPromo)} label="Ventas con promo este mes" />
        <StatCard tile="bg-amber-50 text-amber-600" Icon={Gift} value={`$${Math.round(ahorroDelMes).toLocaleString("es-AR")}`} label="Ahorro dado este mes" />
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
  // Varias categorías, no una. El modelo, la validación del server, el motor y los
  // textos de la tienda ya soportaban una lista: el selector era el único eslabón
  // corto (B-09). Antes precargaba `categories[0]`, así que abrir y guardar una
  // promo de 2 categorías borraba la segunda sin avisar.
  const [cats, setCats] = useState<string[]>(editPromo?.scope === "CATEGORY" ? editPromo.categories : []);
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

  // Evento comercial. `eventMode` separa "ninguno" / "una del calendario" / "el mío",
  // porque con un solo string no se distingue "todavía no elegí" de "escribí vacío".
  const eventosCalendario = useMemo(() => getEventNames(), []);
  const eventoInicial = editPromo?.eventLabel ?? "";
  const [eventMode, setEventMode] = useState<"none" | "cal" | "custom">(
    !eventoInicial ? "none" : eventosCalendario.includes(eventoInicial) ? "cal" : "custom"
  );
  const [eventLabel, setEventLabel] = useState(eventoInicial);
  // True cuando elegir un evento del calendario completó alguna fecha vacía, para
  // decirlo en pantalla en vez de que las fechas cambien solas sin explicación.
  const [fechasAuto, setFechasAuto] = useState(false);

  // Al elegir una fecha del calendario, se proponen las fechas de la promo si
  // están vacías: Black Friday cae distinto cada año y nadie se lo acuerda.
  // Solo se completan si no había nada — no se pisa lo que la dueña ya puso.
  function elegirEventoDelCalendario(nombre: string) {
    setEventMode("cal");
    setEventLabel(nombre);
    const rango = getEventRange(nombre);
    if (!rango) return;
    // Solo completa lo que esté vacío: no pisa fechas que ya cargaste. Se avisa
    // cuando lo hace (F6-C12) — antes las fechas cambiaban solas sin decir nada,
    // y como a veces no cambiaban (porque ya estaban puestas), no se entendía.
    const lleno = !endsAt || !startsAt;
    if (!endsAt) setEndsAt(rango.hasta.toISOString().slice(0, 10));
    if (!startsAt) setStartsAt(rango.desde.toISOString().slice(0, 10));
    setFechasAuto(lleno);
  }

  const meta = type ? TYPE_META[type] : null;

  // F6-C4 — qué le hace este monto al catálogo REAL, recalculado mientras se
  // tipea. Solo en `FIXED`: un porcentaje descuenta lo mismo en un producto de
  // $8.000 que en uno de $130.000, así que no hay nada que descubrir; un monto
  // fijo, en cambio, es un 23% o un 83% según a quién le caiga.
  //
  // ⚠️ Mira el catálogo de HOY. Con alcance "toda la tienda", un producto que se
  // cargue mañana puede caer bajo esta promo sin que nadie revise nada (F6-C9).
  const impacto = useMemo(
    () => fixedImpact(
      {
        type: type ?? "",
        value: type === "FIXED" ? parseNum(value) : null,
        scope: scope ?? "ALL",
        categories: scope === "CATEGORY" ? cats : [],
        productIds: scope === "PRODUCTS" ? prodIds : [],
      },
      products
    ),
    [type, value, scope, cats, prodIds, products]
  );

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
    if (step === 2) { if (!scope) return false; if (scope === "CATEGORY") return cats.length > 0; if (scope === "PRODUCTS") return prodIds.length > 0; return true; }
    if (step === 3) {
      // % entre 1 y 90 EN VIVO (antes solo pedía >0 y el server rechazaba al final).
      if (type === "PERCENT") { const n = parseFloat(value); return n >= 1 && n <= MAX_PCT; }
      // El único freno de la sección (todo lo demás avisa): un producto en $0.
      // Es la misma regla que el tope de 90 del porcentaje, y frenar acá y no
      // recién al guardar evita que se completen dos pasos más para nada.
      if (type === "FIXED") return parseNum(value) > 0 && impacto.free.length === 0;
      if (isNxM(type)) return parseInt(minQty) >= 2 && parseInt(payQty) >= 1 && parseInt(payQty) < parseInt(minQty);
      return true;
    }
    if (step === 5) return name.trim().length >= 2;
    return true;
  }

  async function save() {
    // Guard síncrono anti doble-click: el `disabled` del botón depende del
    // re-render de React, así que dos clicks rápidos entraban los dos y creaban
    // la promoción dos veces (y podían pasarse del tope del plan).
    if (saving) return;
    setErr(""); setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(), type, scope,
        categories: scope === "CATEGORY" ? cats : [],
        productIds: scope === "PRODUCTS" ? prodIds : [],
        minOrderAmount: parseNum(minOrder),
        startsAt: startsAt || null, endsAt: endsAt || null,
        combinesWithCoupons: combines,
        // "" cuando no hay evento — el servidor lo normaliza a null.
        eventLabel: eventMode === "none" ? "" : eventLabel.trim(),
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

  // Con varias categorías el alcance es la suma de todas, no el conteo de una.
  const affected = scope === "ALL" ? products.length
    : scope === "CATEGORY" ? categories.filter((c) => cats.includes(c.name)).reduce((s, c) => s + c.count, 0)
    : prodIds.length;
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
              {/* La aclaración del alcance va acá y no en cada tipo (F6-C1): vale
                  para los cinco, y repetirla cinco veces era ruido. Responde la
                  duda que antes disparaban los ejemplos ("¿esto es solo para
                  categorías?"). */}
              <StepTitle t="¿Qué tipo de promoción?" d="Elegí cómo querés que se descuente — abajo te explico cada una. En el paso siguiente elegís dónde se aplica: toda la tienda, categorías o productos sueltos." />
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
              {/* F6-C10: el alcance SIGNIFICA distinto según el tipo y la pantalla
                  era idéntica en los cinco. Para % y monto fijo es "dónde se
                  aplica el descuento"; para el N×M es "qué productos pueden armar
                  su propio grupo"; para el combo es "qué se puede mezclar entre
                  sí". Misma pregunta para tres cosas distintas confundía. */}
              <StepTitle
                t={type === "N_PAY_M" ? `¿En qué productos vale el ${minQty}×${payQty}?`
                  : type === "MIX_N_PAY_M" ? "¿Qué productos se pueden mezclar?"
                  : "¿A qué se aplica?"}
                d={type === "N_PAY_M" ? "Elegís una vez y vale para todos esos productos."
                  : type === "MIX_N_PAY_M" ? "El cliente combina entre estos productos para llegar a la cantidad."
                  : "Elegís una vez y vale para todos esos productos. Esto es lo que hoy no podés hacer."}
              />
              {/* El recordatorio va acá y no solo en el paso 1: el texto del tipo
                  ya aclara "del MISMO producto", pero se lee una pantalla antes de
                  tomar esta decisión, y al elegir una categoría la lectura natural
                  vuelve a ser "3 remeras cualesquiera". Es un problema de momento,
                  no de redacción. */}
              {type === "N_PAY_M" && (
                <InfoNote>
                  Cada producto arma su propio grupo de {minQty} — los talles y colores del mismo
                  producto cuentan juntos. Si querés que el cliente pueda mezclar productos
                  distintos, volvé atrás y elegí “Combo: llevá N mezclando”.
                </InfoNote>
              )}
              <div className="space-y-2.5">
                <OptCard sel={scope === "ALL"} onClick={() => setScope("ALL")} tile="bg-indigo-50 text-indigo-600" Icon={Store} title="Toda la tienda" desc="Cada producto de tu catálogo" />
                <OptCard sel={scope === "CATEGORY"} onClick={() => setScope("CATEGORY")} tile="bg-indigo-50 text-indigo-600" Icon={Folder} title="Categorías" desc="Todos los productos de uno o varios rubros" />
                <OptCard sel={scope === "PRODUCTS"} onClick={() => setScope("PRODUCTS")} tile="bg-indigo-50 text-indigo-600" Icon={ListChecks} title="Productos elegidos" desc="Los seleccionás uno por uno" />
              </div>
              {scope === "CATEGORY" && (
                <Picker label="Elegí las categorías" right={cats.length ? `${cats.length} elegidas` : undefined}>
                  {categories.length === 0 ? <Empty>No tenés categorías cargadas todavía.</Empty> : categories.map((c) => (
                    <PkRow
                      key={c.name}
                      on={cats.includes(c.name)}
                      onClick={() => setCats((prev) => prev.includes(c.name) ? prev.filter((x) => x !== c.name) : [...prev, c.name])}
                      name={c.name}
                      sub={catSub(c, products)}
                    />
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
              {/* F6-C11: el combo con UN solo producto no puede mezclar nada y
                  termina comportándose igual que un "llevá N, pagá M". No está
                  roto, pero no hace lo que la persona cree. Avisa, no bloquea. */}
              {type === "MIX_N_PAY_M" && scope === "PRODUCTS" && prodIds.length === 1 && (
                <WarnNote>
                  Elegiste un solo producto. El combo sirve para que el cliente mezcle varios —
                  con uno solo funciona igual que “Llevá N, pagá M”.
                </WarnNote>
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
                  {/* F6-C5: los campos decían solo "Monto de descuento" y un signo
                      de pesos en el placeholder. Nadie aclaraba que el monto se
                      resta a CADA unidad — Flavio, conociendo el sistema por
                      dentro, entendió que descontaba del total del pedido. */}
                  <Field
                    label={type === "FIXED" ? "Monto de descuento por producto" : `Porcentaje de descuento (1 a ${MAX_PCT})`}
                    hint={type === "FIXED"
                      ? "En pesos, y se resta a cada unidad: en un carrito con 3 productos descuenta 3 veces."
                      : "Se calcula sobre el precio de venta de cada producto."}
                  >
                    <input value={value} onChange={(e) => setValue(type === "PERCENT" ? onlyDigits(e.target.value) : digitsMoney(e.target.value))} inputMode="numeric" placeholder={type === "FIXED" ? "$ 5.000" : "20"} className={inputCls} />
                    {type === "PERCENT" && value !== "" && (parseFloat(value) < 1 || parseFloat(value) > MAX_PCT) && (
                      <p className="text-[12px] text-red-600 mt-1.5">El porcentaje tiene que estar entre 1 y {MAX_PCT}.</p>
                    )}
                    {/* F6-C4: la consecuencia del monto, con sus propios productos,
                        antes de guardar. */}
                    {type === "FIXED" && <ImpactoFijo imp={impacto} />}
                  </Field>
                  {/* F6-C8: el mínimo se mide sobre el subtotal de TODO el carrito,
                      no sobre lo que está en promoción. Quien arma "20% en remeras
                      desde $50.000" suele pensar "$50.000 de remeras". */}
                  <Field label="Compra mínima del pedido (opcional)" hint="Cuenta el total del carrito, no solo los productos en promoción.">
                    <input value={minOrder} onChange={(e) => setMinOrder(digitsMoney(e.target.value))} inputMode="numeric" placeholder="Sin mínimo" className={inputCls} />
                  </Field>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <StepTitle t="Vigencia y combinación" d="Cuándo corre, y si se puede sumar con cupones. Cuando pasa la fecha de fin, se apaga sola." />

              {/* Evento comercial — opcional. Cambia cómo se ve en la tienda,
                  no cuánto se descuenta. */}
              {/* F6-C12: antes eran 19 chips apilados, media pantalla para un campo
                  OPCIONAL que la mayoría de las promos no usa — el que solo quiere
                  poner fechas se comía todo eso. Ahora arranca apagado y, al
                  prenderlo, aparece un desplegable: escala si se suman fechas, y
                  quien pone un evento ya sabe cuál, no necesita explorar. Los
                  ejemplos del subtítulo cubren el descubrimiento que daban los chips. */}
              <div className="flex justify-between items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 mb-3.5">
                <div>
                  <div className="font-semibold text-[13.5px] text-gray-900">¿Es parte de un evento?</div>
                  <div className="text-xs text-gray-500 mt-0.5 max-w-[34ch]">Black Friday, Día de la Madre, Hot Sale… Cambia cómo se ve en la tienda, no cuánto descuenta.</div>
                </div>
                <Toggle
                  on={eventMode !== "none"}
                  onClick={() => {
                    if (eventMode === "none") { setEventMode("cal"); setEventLabel(""); }
                    else { setEventMode("none"); setEventLabel(""); setFechasAuto(false); }
                  }}
                />
              </div>

              <Field label="">
                {eventMode !== "none" && (
                  <select
                    value={eventMode === "custom" ? "__otro__" : eventLabel}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__otro__") { setEventMode("custom"); setEventLabel(""); setFechasAuto(false); }
                      else if (v) elegirEventoDelCalendario(v);
                    }}
                    className={inputCls}
                  >
                    <option value="">Elegí el evento…</option>
                    {eventosCalendario.map((n) => <option key={n} value={n}>{n}</option>)}
                    <option value="__otro__">Otro… (le pongo el nombre yo)</option>
                  </select>
                )}
                {eventMode === "custom" && (
                  <input
                    value={eventLabel}
                    onChange={(e) => setEventLabel(e.target.value.slice(0, MAX_EVENT_LABEL))}
                    maxLength={MAX_EVENT_LABEL}
                    placeholder="Ej. Aniversario de la tienda"
                    autoFocus
                    className={inputCls + " mt-2"}
                  />
                )}
                {eventMode !== "none" && eventLabel.trim() && (
                  <p className="text-[11.5px] text-gray-500 mt-2 leading-relaxed">
                    En tu tienda va a aparecer un cartel de <b>{eventLabel.trim()}</b> arriba de todo, el nombre
                    en la etiqueta de cada producto, y un filtro para ver solo estos.
                    {endsAt && <> Con la fecha de fin puesta, se muestra además una cuenta regresiva.</>}
                  </p>
                )}
              </Field>

              {fechasAuto && eventLabel.trim() && (
                <p className="text-[11.5px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-2.5">
                  Elegiste <b>{eventLabel.trim()}</b> y completamos las fechas. Podés cambiarlas.
                </p>
              )}
              <div className="flex gap-3">
                <Field label="Desde"><input type="date" value={startsAt} onChange={(e) => { setStartsAt(e.target.value); setFechasAuto(false); }} className={inputCls} /></Field>
                <Field label="Hasta (opcional)"><input type="date" value={endsAt} onChange={(e) => { setEndsAt(e.target.value); setFechasAuto(false); }} className={inputCls} /></Field>
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
                <ReviewRow k="Se aplica a" v={scopeDetail({ scope: scope ?? "ALL", categories: cats, productIds: prodIds }, products)} />
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
                  categories: scope === "CATEGORY" ? cats : [],
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
              {(() => {
                // F6-C4 (b) — descuentos muy profundos, mismo molde que el piso de
                // costo. Va también acá y no solo en el paso 3 porque al EDITAR el
                // asistente abre directo en este paso: si un producto barato se
                // cargó después de crear la promo, este cartel es el único lugar
                // donde aparece el aviso.
                if (type !== "FIXED") return null;
                if (impacto.free.length > 0) {
                  const w = impacto.free[0];
                  return (
                    <div className="flex gap-2.5 items-start bg-red-50 border border-red-200 rounded-xl p-3 mt-3.5 text-[12.5px] text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <b>“{w.name}” ({money(w.price)}) quedaría gratis</b> con {money(parseNum(value))} de descuento
                        {impacto.free.length > 1 && <>, igual que otro{impacto.free.length > 2 ? "s" : ""} {impacto.free.length - 1}</>}.
                        {" "}No se puede guardar así: bajá el monto o sacalo del alcance.
                      </div>
                    </div>
                  );
                }
                if (impacto.deep.length === 0) return null;
                return (
                  <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3.5 text-[12.5px] text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <b>{impacto.deep.length} producto{impacto.deep.length !== 1 ? "s" : ""} queda{impacto.deep.length !== 1 ? "n" : ""} con más de la mitad de descuento.</b>{" "}
                      Podés crearla igual — fijate que sea lo que querías.
                      <ul className="mt-1.5 space-y-0.5">
                        {impacto.deep.slice(0, 4).map((d) => (
                          <li key={d.id}>· <b>{d.name}</b>: {money(d.price)} → {money(d.effective)} ({d.pct}%)</li>
                        ))}
                        {impacto.deep.length > 4 && <li>· y {impacto.deep.length - 4} más…</li>}
                      </ul>
                    </div>
                  </div>
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
// Aviso ámbar: algo que conviene saber pero NO impide seguir. Mismo criterio que
// el cartel de piso de costo — el panel avisa, no traba (el único bloqueo de la
// sección es el monto fijo que dejaría un producto en $0).
function WarnNote({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-[12.5px] text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>{children}</span></div>;
}
// F6-C4 — una línea que responde "¿y esto qué le hace a mis productos?" mientras
// se escribe el monto. El riesgo de un monto fijo es siempre el mismo número —
// monto ÷ el más barato del alcance — y nadie lo tiene en la cabeza al tipear.
// El color es el aviso: gris normal, ámbar si pasa la mitad del precio, rojo si
// algo queda gratis (único caso que además frena).
function ImpactoFijo({ imp }: { imp: FixedImpactResult }) {
  const w = imp.worst;
  if (!w) return null; // sin monto todavía, o sin productos con precio en alcance
  const gratis = w.effective <= 0;
  const hondo = w.pct >= DEEP_DISCOUNT_PCT;
  const cls = gratis ? "text-red-600" : hondo ? "text-amber-700" : "text-gray-500";
  return (
    <p className={`text-[12px] mt-1.5 ${cls}`}>
      {gratis ? (
        <>
          <b>“{w.name}” ({money(w.price)}) quedaría gratis.</b>{" "}
          {imp.free.length > 1 && <>Y {imp.free.length - 1} producto{imp.free.length - 1 !== 1 ? "s" : ""} más. </>}
          Bajá el monto o cambiá el alcance para seguir.
        </>
      ) : (
        <>
          El más barato en alcance, <b>{w.name}</b> ({money(w.price)}), queda en <b>{money(w.effective)}</b> — {w.pct}% de descuento.
        </>
      )}
    </p>
  );
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
