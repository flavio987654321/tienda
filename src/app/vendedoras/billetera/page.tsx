"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ArrowDownLeft, Clock, CheckCircle, Loader2,
  ArrowLeft, ShieldAlert, AlertTriangle, Pencil, X, Info,
  Copy, Check, Share2, TrendingUp, ShoppingBag, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface WalletData {
  id: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  hasBankData: boolean;
  bankLocked: boolean;
  bankLockedUntil: string | null;
  alias: string | null;
  cbu: string | null;
  cuil: string | null;
  bankHolder: string | null;
  withdrawals: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    notes: string | null;
  }[];
}

interface AffiliateData {
  id: string;
  status: string;
  isActive: boolean;
  totalCommissions: number;
  totalOrders: number;
  store: { name: string; slug: string };
  wallet: WalletData | null;
  commissions: {
    id: string;
    amount: number;
    rate: number;
    status: string;
    createdAt: string;
    order: { total: number; createdAt: string };
  }[];
}

interface PageData {
  affiliates: AffiliateData[];
  totalBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function affiliateUrl(slug: string, id: string) {
  if (typeof window === "undefined") return `/tienda/${slug}?ref=${id}`;
  return `${window.location.origin}/tienda/${slug}?ref=${id}`;
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        copied
          ? "bg-green-100 text-green-700"
          : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "¡Copiado!" : "Copiar link"}
    </button>
  );
}

function WhatsAppButton({ url, storeName }: { url: string; storeName: string }) {
  const text = encodeURIComponent(`¡Mirá los productos de ${storeName}! ${url}`);
  return (
    <a
      href={`https://wa.me/?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
    >
      <Share2 className="h-3.5 w-3.5" />
      WhatsApp
    </a>
  );
}

// ── LockoutBanner ─────────────────────────────────────────────────────────────

function LockoutBanner({ until }: { until: string }) {
  const date = new Date(until);
  const hoursLeft = Math.ceil((date.getTime() - Date.now()) / 3600000);
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
      <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-800">Retiros bloqueados por seguridad</p>
        <p className="text-amber-700 mt-0.5">
          Cambiaste los datos bancarios hace poco. Se habilitan en{" "}
          <span className="font-bold">{hoursLeft}hs</span>{" "}
          ({date.toLocaleDateString("es-AR", { weekday: "long", hour: "2-digit", minute: "2-digit" })}).
        </p>
      </div>
    </div>
  );
}

// ── BankForm modal ────────────────────────────────────────────────────────────

function BankForm({ walletId, onClose, onSaved }: { walletId: string; onClose: () => void; onSaved: () => void }) {
  const [cbu, setCbu] = useState("");
  const [alias, setAlias] = useState("");
  const [cuil, setCuil] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    if (!bankHolder.trim()) { setError("Ingresá el nombre del titular"); return; }
    if (!cbu.trim() && !alias.trim()) { setError("Ingresá un CBU/CVU o un alias"); return; }
    setSaving(true);
    const res = await fetch("/api/vendedoras/wallet", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletId, cbu, alias, cuil, bankHolder }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Error al guardar"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Datos bancarios</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Por seguridad, después de guardar nuevos datos bancarios los retiros quedan bloqueados 72hs.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre del titular <span className="text-red-500">*</span>
            </label>
            <input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)}
              placeholder="Nombre y apellido"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              CBU / CVU <span className="text-gray-400 font-normal">(22 dígitos)</span>
            </label>
            <input value={cbu} onChange={(e) => setCbu(e.target.value.replace(/\D/g, "").slice(0, 22))}
              placeholder="0000000000000000000000" inputMode="numeric"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">o</span><div className="flex-1 h-px bg-gray-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Alias</label>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="tu.alias.aqui"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              CUIL <span className="text-gray-400 font-normal">(recomendado)</span>
            </label>
            <input value={cuil} onChange={(e) => setCuil(e.target.value)} placeholder="20-12345678-9" inputMode="numeric"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Guardando..." : "Guardar datos"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── WithdrawModal ─────────────────────────────────────────────────────────────

function WithdrawModal({ affiliates, onClose, onSuccess }: { affiliates: AffiliateData[]; onClose: () => void; onSuccess: () => void }) {
  const eligible = affiliates.filter(
    (a) => a.wallet && a.wallet.hasBankData && !a.wallet.bankLocked && (a.wallet.balance ?? 0) >= 500
  );
  const [selectedWalletId, setSelectedWalletId] = useState(eligible[0]?.wallet?.id ?? "");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selected = affiliates.find((a) => a.wallet?.id === selectedWalletId);
  const maxAmount = selected?.wallet?.balance ?? 0;

  async function handleSubmit() {
    setError("");
    const num = parseFloat(amount);
    if (!num || num < 500) { setError("El monto mínimo es $500"); return; }
    if (num > maxAmount) { setError("No tenés suficiente saldo"); return; }
    setSubmitting(true);
    const res = await fetch("/api/vendedoras/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletId: selectedWalletId, amount: num }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error || "Error al solicitar"); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Solicitar retiro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {eligible.length === 0 ? (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No hay billeteras disponibles para retirar.</p>
              <p className="text-gray-400 text-xs mt-1">Asegurate de tener saldo, datos bancarios cargados y sin bloqueo de 72hs.</p>
            </div>
          ) : (
            <>
              {eligible.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tienda</label>
                  <select value={selectedWalletId} onChange={(e) => { setSelectedWalletId(e.target.value); setAmount(""); }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {eligible.map((a) => (
                      <option key={a.id} value={a.wallet!.id}>
                        {a.store.name} — ${(a.wallet!.balance).toLocaleString("es-AR")} disponible
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Monto <span className="text-gray-400 font-normal">(mín. $500)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    min="500" max={maxAmount} placeholder="0"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">Disponible: ${maxAmount.toLocaleString("es-AR")}</span>
                  <button onClick={() => setAmount(String(maxAmount))} className="text-xs text-indigo-600 hover:underline">Retirar todo</button>
                </div>
              </div>
              <p className="text-xs text-gray-400">Se transfiere al CBU/alias cargado. Procesamos en 1-3 días hábiles.</p>
            </>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
          {eligible.length > 0 && (
            <button onClick={handleSubmit} disabled={submitting || !amount}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Solicitando..." : "Confirmar retiro"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── status badge ──────────────────────────────────────────────────────────────

const statusLabel: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "text-yellow-600 bg-yellow-50" },
  PROCESSING: { label: "Procesando", color: "text-blue-600 bg-blue-50" },
  PAID: { label: "Acreditado", color: "text-green-600 bg-green-50" },
  REJECTED: { label: "Rechazado", color: "text-red-600 bg-red-50" },
};

// ── guía de 3 pasos ───────────────────────────────────────────────────────────

function StarterGuide({ url, storeName, walletId, onAddBank }: { url: string; storeName: string; walletId: string | null; onAddBank: () => void }) {
  const steps = [
    {
      n: "1",
      title: "Copiá tu link",
      desc: "Es tu link único de vendedora para esta tienda.",
      done: true,
      action: <CopyLinkButton url={url} />,
    },
    {
      n: "2",
      title: "Compartilo por WhatsApp, Instagram y TikTok",
      desc: "Cada compra que entre por tu link genera una comisión para vos.",
      done: false,
      action: <WhatsAppButton url={url} storeName={storeName} />,
    },
    {
      n: "3",
      title: "Cargá tu CBU para cobrar",
      desc: "Necesitás cargar tus datos bancarios antes de poder retirar tu saldo.",
      done: !walletId,
      action: walletId ? (
        <button onClick={onAddBank}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
          <Pencil className="h-3.5 w-3.5" />Agregar cuenta
        </button>
      ) : null,
    },
  ];

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Cómo empezar</p>
      {steps.map((s) => (
        <div key={s.n} className="flex items-start gap-3">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${s.done ? "bg-indigo-600 text-white" : "bg-indigo-200 text-indigo-600"}`}>
            {s.n}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-900">{s.title}</p>
            <p className="text-xs text-indigo-600 mt-0.5 mb-2">{s.desc}</p>
            {s.action}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function BilleteraPage() {
  const { status: sessionStatus } = useAuth();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBankForm, setShowBankForm] = useState<string | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);

  function loadData() {
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    loadData();
  }, [sessionStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const canWithdraw = data?.affiliates.some(
    (a) => a.wallet && a.wallet.hasBankData && !a.wallet.bankLocked && (a.wallet.balance ?? 0) >= 500
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/vendedoras" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mi billetera</h1>
        </div>

        {/* Resumen total */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white mb-4">
          <p className="text-indigo-200 text-sm mb-1">Saldo total disponible</p>
          <p className="text-4xl font-extrabold mb-4">${(data?.totalBalance ?? 0).toLocaleString("es-AR")}</p>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-indigo-200 text-xs">Total ganado</p>
              <p className="font-bold text-lg">${(data?.totalEarned ?? 0).toLocaleString("es-AR")}</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs">Total retirado</p>
              <p className="font-bold text-lg">${(data?.totalWithdrawn ?? 0).toLocaleString("es-AR")}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-end mb-6">
          <button onClick={() => setShowWithdraw(true)} disabled={!canWithdraw}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm">
            <ArrowDownLeft className="h-4 w-4" />
            Solicitar retiro
          </button>
        </div>

        {/* Tarjetas por afiliación */}
        {data?.affiliates.map((affiliate) => {
          const url = affiliateUrl(affiliate.store.slug, affiliate.id);
          const isActive = affiliate.status === "APPROVED" && affiliate.isActive;
          const hasActivity = affiliate.totalCommissions > 0 || affiliate.totalOrders > 0;

          return (
            <motion.div key={affiliate.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 space-y-4">

              {/* Cabecera tienda */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{affiliate.store.name}</h3>
                  <a href={`/tienda/${affiliate.store.slug}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors mt-0.5">
                    Ver tienda <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-indigo-600">
                    ${(affiliate.wallet?.balance ?? 0).toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-gray-400">disponible</p>
                </div>
              </div>

              {/* Stats de actividad */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ShoppingBag className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <p className="text-base font-bold text-gray-900">{affiliate.totalOrders}</p>
                  <p className="text-xs text-gray-400">ventas</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                  </div>
                  <p className="text-base font-bold text-gray-900">{affiliate.totalCommissions}</p>
                  <p className="text-xs text-gray-400">comisiones</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-base font-bold text-gray-900">
                    ${(affiliate.wallet?.totalEarned ?? 0).toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-gray-400">ganado total</p>
                </div>
              </div>

              {/* Link de venta */}
              {isActive ? (
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                  <p className="text-xs font-semibold text-indigo-700 mb-2">Tu link de venta</p>
                  <p className="break-all text-xs text-indigo-500 font-mono mb-3">
                    /tienda/{affiliate.store.slug}?ref={affiliate.id}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <CopyLinkButton url={url} />
                    <WhatsAppButton url={url} storeName={affiliate.store.name} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-3 text-xs text-yellow-700">
                  Solicitud pendiente de aprobación. El link de venta aparece cuando la dueña te da acceso.
                </div>
              )}

              {/* Guía de inicio si no tiene actividad */}
              {isActive && !hasActivity && (
                <StarterGuide
                  url={url}
                  storeName={affiliate.store.name}
                  walletId={affiliate.wallet?.id ?? null}
                  onAddBank={() => setShowBankForm(affiliate.wallet?.id ?? null)}
                />
              )}

              {/* Cuenta bancaria */}
              {affiliate.wallet && (
                <div className={`rounded-xl p-4 border ${affiliate.wallet.hasBankData ? "border-gray-100 bg-white" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${affiliate.wallet.hasBankData ? "text-gray-400" : "text-amber-700"}`}>
                      Cuenta bancaria para retiros
                    </p>
                    <button onClick={() => setShowBankForm(affiliate.wallet!.id)}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${affiliate.wallet.hasBankData ? "text-indigo-600 hover:text-indigo-800" : "text-amber-700 hover:text-amber-900"}`}>
                      <Pencil className="h-3 w-3" />
                      {affiliate.wallet.hasBankData ? "Editar" : "Agregar cuenta"}
                    </button>
                  </div>

                  {affiliate.wallet.hasBankData ? (
                    <div className="space-y-1 text-sm">
                      {affiliate.wallet.cbu && <p className="font-mono text-gray-700">CBU: {affiliate.wallet.cbu}</p>}
                      {affiliate.wallet.alias && <p className="text-gray-700">Alias: <span className="font-mono">{affiliate.wallet.alias}</span></p>}
                      {affiliate.wallet.bankHolder && <p className="text-gray-500 text-xs">Titular: {affiliate.wallet.bankHolder}</p>}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Sin cuenta bancaria cargada</p>
                        <p className="text-xs text-amber-600 mt-0.5">Necesitás agregarla para poder retirar tu saldo cuando ganes comisiones.</p>
                      </div>
                    </div>
                  )}

                  {affiliate.wallet.bankLocked && affiliate.wallet.bankLockedUntil && (
                    <div className="mt-3"><LockoutBanner until={affiliate.wallet.bankLockedUntil} /></div>
                  )}
                </div>
              )}

              {/* Últimas comisiones */}
              {affiliate.commissions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Últimas comisiones</p>
                  <div className="space-y-2">
                    {affiliate.commissions.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          {c.status === "PAID"
                            ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            : <Clock className="h-4 w-4 text-yellow-400 shrink-0" />}
                          <div>
                            <p className="text-sm text-gray-700">
                              Venta ${c.order.total.toLocaleString("es-AR")} — {c.rate}% comisión
                            </p>
                            <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString("es-AR")}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-green-600 text-sm">+${c.amount.toLocaleString("es-AR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial retiros */}
              {(affiliate.wallet?.withdrawals?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Retiros</p>
                  <div className="space-y-2">
                    {affiliate.wallet!.withdrawals.map((w) => {
                      const s = statusLabel[w.status] ?? { label: w.status, color: "text-gray-600 bg-gray-50" };
                      return (
                        <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm text-gray-700">${w.amount.toLocaleString("es-AR")}</p>
                            <p className="text-xs text-gray-400">{new Date(w.createdAt).toLocaleDateString("es-AR")}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Empty state */}
        {data?.affiliates.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Wallet className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Aún no te uniste a ninguna tienda</p>
            <p className="text-gray-400 text-sm mb-4">Unite a una tienda para empezar a ganar comisiones.</p>
            <Link href="/vendedoras"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
              Ver tiendas disponibles
            </Link>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showBankForm && (
          <BankForm walletId={showBankForm} onClose={() => setShowBankForm(null)}
            onSaved={() => { setShowBankForm(null); loadData(); }} />
        )}
        {showWithdraw && data && (
          <WithdrawModal affiliates={data.affiliates} onClose={() => setShowWithdraw(false)}
            onSuccess={() => { setShowWithdraw(false); loadData(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
