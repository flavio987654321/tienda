"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Mail, Phone, ShoppingCart, Search,
  MessageCircle, X, ChevronLeft, ChevronRight,
  Tag, Check, AlertCircle, ShoppingBag, TrendingUp, RefreshCw,
} from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

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

type Stats = { pending: number; recovered: number; recoveredRevenue: number };

type Props = {
  carts: CartRow[];
  search?: string;
  storeSlug: string;
  storeName: string;
  stats: Stats;
  page: number;
  totalPages: number;
  total: number;
};

type GeneratedCoupon = { code: string; discountType: string; discountValue: number };

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

function fmtDiscount(type: string, value: number) {
  return type === "percentage" ? `${value}% de descuento` : `${money(value)} de descuento`;
}

function autoCode(type: string, value: number) {
  const suffix = Math.floor(Math.random() * 90 + 10);
  if (type === "percentage") return `WA${Math.round(value)}OFF${suffix}`;
  return `WA${Math.round(value)}ARS${suffix}`;
}

// ─── WhatsApp Modal ───────────────────────────────────────────────────────────

function WhatsAppModal({
  cart,
  storeName,
  storeSlug,
  existingCoupon,
  onClose,
  onCouponGenerated,
  onWaOpened,
}: {
  cart: CartRow;
  storeName: string;
  storeSlug: string;
  existingCoupon: GeneratedCoupon | null;
  onClose: () => void;
  onCouponGenerated: (cartId: string, coupon: GeneratedCoupon) => void;
  onWaOpened: (cartId: string) => void;
}) {
  const recoveryUrl = `${APP_URL}/tienda/${storeSlug}?recuperar=${cart.id}`;
  const phone = cart.customerPhone?.replace(/\D/g, "") ?? "";

  const [withCoupon, setWithCoupon] = useState(existingCoupon !== null);
  const [couponType, setCouponType] = useState<"percentage" | "fixed">("percentage");
  const [couponValue, setCouponValue] = useState("10");
  const [couponCode, setCouponCode] = useState(() => autoCode("percentage", 10));
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [generated, setGenerated] = useState<GeneratedCoupon | null>(existingCoupon);

  const firstName = cart.customerName?.split(" ")[0] ?? "hola";

  function buildMessage(coupon: GeneratedCoupon | null) {
    const itemLines = cart.items
      .map((it) => `• ${it.name}${it.qty > 1 ? ` x${it.qty}` : ""} — ${money(it.price * it.qty)}`)
      .join("\n");

    const couponBlock = coupon
      ? `\n🎁 Te preparé un cupón especial:\n*${coupon.code}* — ${fmtDiscount(coupon.discountType, coupon.discountValue)}\n`
      : "";

    return `Hola ${firstName}! 👋\n\nVi que te quedaron cosas en el carrito en *${storeName}* 🛒\n\n${itemLines}\n\n💰 Total: ${money(cart.total)}${couponBlock}\nCuando quieras terminás tu compra acá:\n${recoveryUrl}\n\n¿Te puedo ayudar con algo? 😊`;
  }

  const [message, setMessage] = useState(() => buildMessage(existingCoupon));

  // Re-sync code suggestion when type/value changes (only before generating)
  useEffect(() => {
    if (!generated) {
      const val = parseFloat(couponValue) || 0;
      setCouponCode(autoCode(couponType, val));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponType, couponValue]);

  // Re-sync message when coupon state changes
  useEffect(() => {
    if (!withCoupon) setMessage(buildMessage(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCoupon]);

  async function handleGenerate() {
    setGenError("");
    const val = parseFloat(couponValue);
    if (!val || val <= 0) { setGenError("Ingresá un valor mayor a 0"); return; }
    if (couponType === "percentage" && val > 100) { setGenError("El porcentaje no puede superar 100%"); return; }
    if (!couponCode || couponCode.length < 3) { setGenError("El código debe tener al menos 3 caracteres"); return; }

    setGenerating(true);
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch("/api/cupones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          discountType: couponType,
          discountValue: val,
          maxUses: 1,
          expiresAt,
          label: "Recuperación WhatsApp",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "No se pudo crear el cupón");
        return;
      }
      const newCoupon: GeneratedCoupon = { code: data.coupon.code, discountType: couponType, discountValue: val };
      setGenerated(newCoupon);
      onCouponGenerated(cart.id, newCoupon);
      setMessage(buildMessage(newCoupon));
    } catch {
      setGenError("Error de conexión, intentá de nuevo");
    } finally {
      setGenerating(false);
    }
  }

  const [opened, setOpened] = useState(false);

  function openWhatsApp() {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpened(true);
    onWaOpened(cart.id);
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">{cart.customerName || cart.customerEmail}</p>
              <p className="text-xs text-gray-400">{phone ? `+${phone}` : cart.customerEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Cart summary */}
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Carrito</p>
            <ul className="space-y-1 mb-2">
              {cart.items.map((item, i) => (
                <li key={i} className="flex justify-between text-xs text-gray-700">
                  <span>{item.name}{item.qty > 1 && <span className="text-gray-400"> x{item.qty}</span>}</span>
                  <span className="font-semibold">{money(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total</span>
              <span>{money(cart.total)}</span>
            </div>
          </div>

          {/* Coupon section */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { if (!generated) setWithCoupon((v) => !v); }}
              disabled={!!generated}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-default"
            >
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                {generated ? "Cupón generado" : "Agregar cupón de descuento"}
              </span>
              {generated ? (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">✓ Activo</span>
              ) : (
                <span className={`text-xs font-medium ${withCoupon ? "text-indigo-500" : "text-gray-400"}`}>
                  {withCoupon ? "Activado" : "Opcional"}
                </span>
              )}
            </button>

            {generated ? (
              <div className="px-4 pb-4 pt-1 bg-green-50/50 border-t border-green-100">
                <p className="text-xs text-gray-500 mb-2">Este cupón ya fue creado para este contacto y no se puede reemplazar.</p>
                <div className="flex items-center gap-3">
                  <code className="font-mono font-bold text-green-700 text-base tracking-wider bg-green-100 px-3 py-1.5 rounded-lg">
                    {generated.code}
                  </code>
                  <span className="text-xs text-gray-500">{fmtDiscount(generated.discountType, generated.discountValue)} · 1 uso · vence en 7 días</span>
                </div>
              </div>
            ) : withCoupon ? (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                    <select
                      value={couponType}
                      onChange={(e) => setCouponType(e.target.value as "percentage" | "fixed")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">
                      {couponType === "percentage" ? "%" : "$"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={couponType === "percentage" ? 100 : undefined}
                      value={couponValue}
                      onChange={(e) => setCouponValue(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Código</label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                    maxLength={20}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono font-bold text-gray-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <p className="text-xs text-gray-400 mt-1">1 uso · vence en 7 días · solo letras, números, guiones</p>
                </div>
                {genError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {genError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
                  {generating ? "Generando…" : "Generar cupón"}
                </button>
              </div>
            ) : null}
          </div>

          {/* Message editor */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Mensaje</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-200 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Podés editar el mensaje antes de enviarlo.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          {!phone ? (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5 mb-3">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Este contacto no dejó número de teléfono. Solo podés contactarlo por email.
            </div>
          ) : null}
          <button
            type="button"
            onClick={openWhatsApp}
            disabled={!phone}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-40 transition-colors shadow-sm ${opened ? "bg-green-700 hover:bg-green-800" : "bg-green-500 hover:bg-green-600"}`}
          >
            {opened ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {opened ? "Abierto — volver a abrir" : "Abrir WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function pageHref(targetPage: number, search?: string) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (targetPage > 1) params.set("page", String(targetPage));
  const qs = params.toString();
  return qs ? `/dashboard/carritos-abandonados?${qs}` : "/dashboard/carritos-abandonados";
}

export default function CarritosAbandonadosClient({
  carts, search, storeSlug, storeName, stats, page, totalPages, total,
}: Props) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [waCart, setWaCart] = useState<CartRow | null>(null);
  const [generatedCoupons, setGeneratedCoupons] = useState<Record<string, GeneratedCoupon>>({});
  const [waOpenedIds, setWaOpenedIds] = useState<Set<string>>(new Set());

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleCouponGenerated(cartId: string, coupon: GeneratedCoupon) {
    setGeneratedCoupons((prev) => ({ ...prev, [cartId]: coupon }));
    showToast(`Cupón ${coupon.code} creado y listo para enviar`);
  }

  function handleWaOpened(cartId: string) {
    setWaOpenedIds((prev) => new Set(prev).add(cartId));
  }

  async function resend(id: string, email: string) {
    if (loadingId) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/dashboard/carritos-abandonados/${id}/recordar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSentIds((prev) => new Set(prev).add(id));
        showToast(`Recordatorio enviado a ${email}`);
      } else {
        showToast(data?.error || "No se pudo enviar el recordatorio", false);
      }
    } catch {
      showToast("No se pudo enviar el recordatorio", false);
    } finally {
      setLoadingId(null);
    }
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchRef.current?.value.trim() ?? "";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.push(`/dashboard/carritos-abandonados${params.toString() ? `?${params}` : ""}`);
  }

  const totalCarts = stats.pending + stats.recovered;
  const recoveryRate = totalCarts > 0 ? Math.round((stats.recovered / totalCarts) * 100) : 0;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([
          { icon: <ShoppingCart className="h-4 w-4 text-amber-500" />, bg: "bg-amber-50", label: "Pendientes", value: stats.pending.toString() },
          { icon: <Check className="h-4 w-4 text-green-500" />, bg: "bg-green-50", label: "Recuperados", value: stats.recovered.toString() },
          { icon: <TrendingUp className="h-4 w-4 text-indigo-500" />, bg: "bg-indigo-50", label: "Tasa de recupero", value: `${recoveryRate}%` },
          { icon: <ShoppingBag className="h-4 w-4 text-purple-500" />, bg: "bg-purple-50", label: "Revenue recuperado", value: money(stats.recoveredRevenue) },
        ] as const).map(({ icon, bg, label, value }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
            <p className="text-xl font-black text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4 mb-6">
        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">¿Cómo funciona?</p>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-indigo-800">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
            <p>Un visitante escribe su email en el checkout pero no termina la compra.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
            <p>Al cabo de 1 hora, le llega un recordatorio automático por email con sus productos.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
            <p>Si no reaccionó, podés contactarlo por email o WhatsApp y sumarle un cupón exclusivo.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-5 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Buscar por nombre, email o teléfono…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors">
          Buscar
        </button>
        {search && (
          <Link href="/dashboard/carritos-abandonados" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
            Limpiar
          </Link>
        )}
      </form>

      {/* List */}
      {carts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {search ? <Search className="h-8 w-8 text-indigo-400" /> : <ShoppingCart className="h-8 w-8 text-indigo-400" />}
          </div>
          {search ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin resultados para &quot;{search}&quot;</h3>
              <p className="text-gray-400 text-sm">Probá buscar por otro nombre, email o teléfono.</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Todavía no hay carritos abandonados</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Cuando alguien escriba su email en el checkout y no termine la compra, va a aparecer acá.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {total > 0 && (
            <p className="text-xs text-gray-400 font-medium">
              {total} carrito{total !== 1 ? "s" : ""} pendiente{total !== 1 ? "s" : ""}
              {search ? ` para "${search}"` : ""}
            </p>
          )}
          {carts.map((cart) => {
            const justSent = sentIds.has(cart.id);
            const isLoading = loadingId === cart.id;
            const hasPhone = Boolean(cart.customerPhone);
            const existingCoupon = generatedCoupons[cart.id] ?? null;
            const waOpened = waOpenedIds.has(cart.id);

            return (
              <div key={cart.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{cart.customerName || "Sin nombre"}</p>
                      {(cart.reminderSent || justSent) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          <Check className="h-3 w-3" /> Email enviado
                        </span>
                      )}
                      {existingCoupon && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                          <Tag className="h-3 w-3" /> {existingCoupon.code}
                        </span>
                      )}
                      {waOpened && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          <MessageCircle className="h-3 w-3" /> WA abierto
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <a href={`mailto:${cart.customerEmail}`} className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <Mail className="h-3.5 w-3.5" /> {cart.customerEmail}
                      </a>
                      {cart.customerPhone && (
                        <a href={`https://wa.me/${cart.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-green-600 transition-colors">
                          <Phone className="h-3.5 w-3.5" /> {cart.customerPhone}
                        </a>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> {relativeTime(cart.lastActivityAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xl font-black text-gray-950 shrink-0">{money(cart.total)}</p>
                </div>

                {/* Products */}
                <div className="mx-5 mb-4 rounded-xl bg-gray-50 px-3 py-2.5">
                  <ul className="space-y-0.5">
                    {cart.items.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm text-gray-700">
                        <span className="truncate mr-2">{item.name}{item.qty > 1 && <span className="text-gray-400 ml-1">x{item.qty}</span>}</span>
                        <span className="font-semibold text-gray-900 shrink-0">{money(item.price * item.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 px-5 pb-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => resend(cart.id, cart.customerEmail)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    {isLoading ? "Enviando…" : (cart.reminderSent || justSent) ? "Reenviar email" : "Enviar email"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaCart(cart)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                      hasPhone
                        ? waOpened
                          ? "bg-green-700 text-white hover:bg-green-800 shadow-sm"
                          : "bg-green-500 text-white hover:bg-green-600 shadow-sm"
                        : "border border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                    }`}
                    title={!hasPhone ? "Este contacto no dejó teléfono, pero podés ver el mensaje de igual forma" : undefined}
                  >
                    {waOpened ? <Check className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                    {hasPhone ? (waOpened ? "WA enviado" : "WhatsApp") : "WhatsApp (sin tel.)"}
                    {existingCoupon && !waOpened && <span className="ml-0.5 opacity-70">· cupón listo</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-6">
          {page > 1 ? (
            <Link href={pageHref(page - 1, search)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
          ) : <span />}
          <p className="text-sm text-gray-400 tabular-nums">Página {page} de {totalPages}</p>
          {page < totalPages ? (
            <Link href={pageHref(page + 1, search)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Link>
          ) : <span />}
        </div>
      )}

      {/* WhatsApp Modal */}
      {waCart && (
        <WhatsAppModal
          cart={waCart}
          storeName={storeName}
          storeSlug={storeSlug}
          existingCoupon={generatedCoupons[waCart.id] ?? null}
          onClose={() => setWaCart(null)}
          onCouponGenerated={handleCouponGenerated}
          onWaOpened={handleWaOpened}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
          <div className={`flex items-center gap-2 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl ${toast.ok ? "bg-gray-900" : "bg-red-600"}`}>
            <span className={`w-2 h-2 rounded-full ${toast.ok ? "bg-emerald-400 animate-pulse" : "bg-red-200"}`} />
            {toast.msg}
          </div>
        </div>
      )}
    </>
  );
}
