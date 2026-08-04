"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ArrowDownLeft, Clock, CheckCircle, Loader2,
  ArrowLeft, ShieldAlert, AlertTriangle, Pencil, X, Info,
  CreditCard, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface WalletData {
  id: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
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
    order: { id: string; total: number; createdAt: string };
  }[];
}

interface PageData {
  affiliates: AffiliateData[];
  totalBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  hasBankData: boolean;
  bankAlias: string | null;
  bankCbu: string | null;
  bankHolder: string | null;
  bankLocked: boolean;
  bankLockedUntil: string | null;
  hasCuil: boolean;
}

type Movement =
  | {
      type: "commission";
      id: string;
      amount: number;
      rate: number;
      orderTotal: number;
      orderId: string;
      orderDate: string;
      status: string;
      createdAt: string;
      storeName: string;
    }
  | {
      type: "withdrawal";
      id: string;
      amount: number;
      status: string;
      createdAt: string;
      notes: string | null;
      storeName: string;
    };

// ── LockoutBanner ─────────────────────────────────────────────────────────────

function LockoutBanner({ until }: { until: string }) {
  const date = new Date(until);
  // Estimación de horas restantes para mostrar en UI. Tenía un `eslint-disable` de
  // `react-hooks/purity` que ya no tapaba nada —la regla no salta acá— así que el
  // disable quedaba como warning. El motivo se queda escrito, que es lo que valía.
  const hoursLeft = Math.ceil((date.getTime() - Date.now()) / 3600000);
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm mt-3">
      <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-amber-700">
        Retiros bloqueados{" "}
        <span className="font-bold">{hoursLeft}hs</span>{" "}
        por cambio de datos bancarios.
      </p>
    </div>
  );
}

// ── OtpModal ──────────────────────────────────────────────────────────────────

const OTP_SESSION_KEY = "otp_wallet_token";

function getStoredOtpToken(): string | null {
  try {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return null;
    // token format: userId:timestamp:sig — check expiry client-side (30 min)
    const parts = raw.split(":");
    if (parts.length !== 3) return null;
    const ts = parseInt(parts[1]);
    if (Date.now() - ts > 30 * 60 * 1000) { sessionStorage.removeItem(OTP_SESSION_KEY); return null; }
    return raw;
  } catch { return null; }
}

function saveOtpToken(token: string) {
  try { sessionStorage.setItem(OTP_SESSION_KEY, token); } catch { /* ignore */ }
}

function clearOtpToken() {
  try { sessionStorage.removeItem(OTP_SESSION_KEY); } catch { /* ignore */ }
}

function OtpModal({ onVerified, onClose }: { onVerified: (token: string) => void; onClose: () => void }) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function requestCode() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/vendedoras/wallet/otp", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Error al enviar el código"); return; }
    setExpiresAt(data.expiresAt);
    setStep("verify");
  }

  async function verifyCode() {
    setError("");
    if (!code.trim()) { setError("Ingresá el código"); return; }
    setLoading(true);
    const res = await fetch("/api/vendedoras/wallet/otp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Código incorrecto"); return; }
    saveOtpToken(data.token);
    onVerified(data.token);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-xl border border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-indigo-500" /> Verificá tu identidad
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {step === "request" ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Para acceder a tus datos bancarios necesitamos verificar tu identidad. Te enviaremos un código de 6 dígitos a tu email.
              </p>
              {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                <button onClick={requestCode} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar código"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Te enviamos el código a tu email. Ingresalo acá:
                {expiresAt && <span className="text-xs text-gray-400 block mt-1">Válido hasta las {new Date(expiresAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>}
              </p>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-4 text-2xl font-mono text-center tracking-widest text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
              <p className="text-xs text-gray-500 text-center">
                ¿No llegó?{" "}
                <button onClick={() => { setStep("request"); setCode(""); setError(""); }} className="text-indigo-600 hover:underline">Reenviar código</button>
              </p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                <button onClick={verifyCode} disabled={loading || code.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── BankForm modal ────────────────────────────────────────────────────────────

function BankForm({ otpToken, onClose, onSaved }: { otpToken: string; onClose: () => void; onSaved: () => void }) {
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
      headers: { "Content-Type": "application/json", "x-otp-token": otpToken },
      body: JSON.stringify({ cbu, alias, cuil, bankHolder }),
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
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl border border-gray-100 dark:border-white/10"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
          <h3 className="font-bold text-gray-900 dark:text-white">Datos bancarios</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-500/30 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Por seguridad, después de guardar nuevos datos bancarios los retiros quedan bloqueados 72hs.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre del titular <span className="text-red-500">*</span>
            </label>
            <input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)}
              placeholder="Nombre y apellido"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              CBU / CVU <span className="text-gray-400 font-normal">(22 dígitos)</span>
            </label>
            <input value={cbu} onChange={(e) => setCbu(e.target.value.replace(/\D/g, "").slice(0, 22))}
              placeholder="0000000000000000000000" inputMode="numeric"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" /><span className="text-xs text-gray-400">o</span><div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alias</label>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="tu.alias.aqui"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              CUIL <span className="text-gray-400 font-normal">(recomendado)</span>
            </label>
            <input value={cuil} onChange={(e) => setCuil(e.target.value)} placeholder="20-12345678-9" inputMode="numeric"
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancelar</button>
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

function WithdrawModal({ totalBalance, otpToken, onClose, onSuccess }: {
  totalBalance: number;
  otpToken: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const num = parseFloat(amount);
    if (!num || num < 100) { setError("El monto mínimo es $100"); return; }
    if (num > totalBalance) { setError("No tenés suficiente saldo"); return; }
    setSubmitting(true);
    const res = await fetch("/api/vendedoras/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-otp-token": otpToken },
      body: JSON.stringify({ amount: num }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error || "Error al solicitar"); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl border border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
          <h3 className="font-bold text-gray-900 dark:text-white">Solicitar retiro</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Monto <span className="text-gray-400 font-normal">(mín. $100)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                min="100" max={totalBalance} placeholder="0"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">Disponible: ${totalBalance.toLocaleString("es-AR")}</span>
              <button onClick={() => setAmount(String(totalBalance))} className="text-xs text-indigo-600 hover:underline">Retirar todo</button>
            </div>
          </div>
          <p className="text-xs text-gray-400">Se transfiere al CBU/alias cargado. Procesamos en 1-3 días hábiles.</p>
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting || !amount}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Solicitando..." : "Confirmar retiro"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── withdrawal status badge ────────────────────────────────────────────────────

const withdrawalStatus: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "text-yellow-600 bg-yellow-50" },
  PROCESSING: { label: "Procesando", color: "text-blue-600 bg-blue-50" },
  APPROVED: { label: "Acreditado", color: "text-green-600 bg-green-50" },
  PAID: { label: "Acreditado", color: "text-green-600 bg-green-50" },
  REJECTED: { label: "Rechazado", color: "text-red-600 bg-red-50" },
};

// ── page ──────────────────────────────────────────────────────────────────────

export default function BilleteraPage() {
  const { status: sessionStatus } = useAuth();
  const [data, setData] = useState<PageData | null>(null);

  /* "Cargando" se deduce: o todavía no se sabe quién entró, o se sabe y el pedido
     de la billetera no volvió. Antes era un `useState(true)` que el efecto tenía
     que apagar a mano en cada salida —sesión no iniciada, respuesta de error,
     excepción—, y apagarlo desde ahí es un setState sincrónico dentro del efecto,
     que es lo que el lint del repo marca como error. Con tres salidas a mano
     además alcanzaba con olvidarse de una para dejar la pantalla girando para
     siempre. */
  const [pedidoTerminado, setPedidoTerminado] = useState(false);
  const loading = sessionStatus === "loading" || (sessionStatus === "authenticated" && !pedidoTerminado);

  const [showBankForm, setShowBankForm] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  // OTP: "bankform" | "withdraw" | null — acción pendiente hasta que se verifique identidad
  const [pendingAction, setPendingAction] = useState<"bankform" | "withdraw" | null>(null);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  // "Ahora" capturado una vez al montar — evita llamar Date.now() durante el
  // render (impuro) al calcular la antigüedad de cada movimiento en la lista.
  const [now] = useState(() => Date.now());

  function requireOtp(action: "bankform" | "withdraw") {
    const stored = getStoredOtpToken();
    if (stored) {
      setOtpToken(stored);
      if (action === "bankform") setShowBankForm(true);
      else setShowWithdraw(true);
    } else {
      setPendingAction(action);
    }
  }

  function onOtpVerified(token: string) {
    setOtpToken(token);
    setPendingAction(null);
    if (pendingAction === "bankform") setShowBankForm(true);
    else if (pendingAction === "withdraw") setShowWithdraw(true);
  }

  function loadData() {
    fetch("/api/vendedoras/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d.affiliates) setData(d); // si no vienen, fue error (401, 500)
      })
      .catch(() => {})
      .finally(() => setPedidoTerminado(true));
  }

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    loadData();
  }, [sessionStatus]);

  // Movimientos unificados (comisiones + retiros) ordenados por fecha.
  // Los retiros se agrupan por timestamp (misma transacción = mismo segundo) para mostrar
  // una sola línea aunque internamente se hayan dividido entre billeteras de distintas tiendas.
  const movements = useMemo<Movement[]>(() => {
    if (!data) return [];
    const list: Movement[] = [];

    // Comisiones (una por tienda, se muestran con nombre de tienda si hay varias)
    for (const affiliate of data.affiliates) {
      for (const c of affiliate.commissions) {
        list.push({
          type: "commission",
          id: c.id,
          amount: c.amount,
          rate: c.rate,
          orderTotal: c.order.total,
          orderId: c.order.id,
          orderDate: c.order.createdAt,
          status: c.status,
          createdAt: c.createdAt,
          storeName: affiliate.store.name,
        });
      }
    }

    // Retiros: agrupar por segundo (todos los registros del mismo pedido tienen igual createdAt)
    const withdrawalMap = new Map<string, Movement & { type: "withdrawal" }>();
    for (const affiliate of data.affiliates) {
      for (const w of affiliate.wallet?.withdrawals ?? []) {
        const key = w.createdAt.slice(0, 19);
        const existing = withdrawalMap.get(key);
        if (existing) {
          existing.amount += w.amount;
          if (w.status === "PENDING") existing.status = "PENDING";
          else if (w.status === "PROCESSING" && existing.status !== "PENDING") existing.status = "PROCESSING";
        } else {
          withdrawalMap.set(key, {
            type: "withdrawal",
            id: w.id,
            amount: w.amount,
            status: w.status,
            createdAt: w.createdAt,
            notes: w.notes,
            storeName: "",
          });
        }
      }
    }
    list.push(...withdrawalMap.values());

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const canWithdraw = data?.hasBankData && !data?.bankLocked && (data?.totalBalance ?? 0) >= 100;
  const multiStore = (data?.affiliates.length ?? 0) > 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/afiliados" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">Mis comisiones</h1>
        </div>

        {/* Resumen total */}
        {(data?.totalBalance ?? 0) < 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl p-4 mb-4 text-sm text-red-700 dark:text-red-300">
            <p className="font-bold mb-1">Saldo deudor por chargeback</p>
            <p>Tenés un saldo negativo de ${Math.abs(data?.totalBalance ?? 0).toLocaleString("es-AR")} ARS por una devolución de cargo aprobada por MercadoPago. Debés regularizarlo dentro de los 30 días corridos o tu cuenta puede ser suspendida. Escribinos a marketplacemitienda@gmail.com.</p>

          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={(data?.totalBalance ?? 0) < 0
            ? "bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 text-white mb-4"
            : "bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white mb-4"}>
          <p className="text-indigo-200 text-sm mb-1">Saldo disponible</p>
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

        {/* Banner: sin datos bancarios */}
        {data && !data.hasBankData && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Necesitás cargar tu cuenta bancaria</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Para poder solicitar retiros tenés que agregar tu CBU/CVU o alias. Es un paso único y solo te lleva un minuto.</p>
            </div>
            <button
              onClick={() => requireOtp("bankform")}
              className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Agregar ahora
            </button>
          </div>
        )}

        <div className="flex flex-col items-end mb-6 gap-2">
          <button onClick={() => requireOtp("withdraw")} disabled={!canWithdraw}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm">
            <ArrowDownLeft className="h-4 w-4" />
            Solicitar retiro
          </button>
          {!canWithdraw && data && data.hasBankData && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {data.bankLocked
                ? "Retiros bloqueados 72hs tras cambiar datos bancarios"
                : "Necesitás al menos $100 en comisiones acreditadas"}
            </p>
          )}
        </div>

        {/* Configuración de cobro */}
        {(data?.affiliates.length ?? 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 mb-4 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Configuración de cobro</p>
            </div>

            <div className="px-6 py-4">
              {/* Cuenta bancaria */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <CreditCard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Cuenta bancaria</p>
                      <p className="text-xs text-gray-400">
                        {data!.hasBankData
                          ? (data!.bankAlias ?? (data!.bankCbu ? `CBU ···${data!.bankCbu.slice(-4)}` : "Datos cargados"))
                          : "Necesaria para solicitar retiros"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => requireOtp("bankform")}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors shrink-0">
                    <Pencil className="h-3 w-3" />
                    {data!.hasBankData ? "Editar" : "Agregar"}
                  </button>
                </div>
                {data!.bankLocked && data!.bankLockedUntil && (
                  <LockoutBanner until={data!.bankLockedUntil} />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Movimientos */}
        {movements.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Movimientos</p>
              <Link href="/afiliados/estadisticas"
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                Ver estadísticas <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {movements.slice(0, 20).map((m) => {
                if (m.type === "commission") {
                  const icon = m.status === "DISBURSED"
                    ? <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                    : m.status === "PAID"
                    ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    : m.status === "REVERSED"
                    ? <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    : <Clock className="h-4 w-4 text-yellow-400 shrink-0" />;
                  return (
                    <div key={`c-${m.id}`} className="flex items-center justify-between px-6 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {icon}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            Comisión {m.rate}% — venta ${m.orderTotal.toLocaleString("es-AR")}
                          </p>
                          <p className="text-xs text-gray-400 flex flex-wrap items-center gap-1.5">
                            <span>Venta: {new Date(m.orderDate).toLocaleDateString("es-AR")}</span>
                            <span>·</span>
                            <span>Acreditada: {new Date(m.createdAt).toLocaleDateString("es-AR")}</span>
                            {multiStore && <><span>·</span><span>{m.storeName}</span></>}
                            {m.status === "DISBURSED" && <span className="text-blue-500 font-medium">→ MP</span>}
                            {m.status === "REVERSED" && <span className="text-red-500 font-medium">Revertida</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <a
                          href={`/api/vendedoras/comision/${m.id}/comprobante`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                          title="Descargar comprobante"
                        >
                          Comprobante
                        </a>
                        <span className={`font-semibold text-sm ${m.status === "REVERSED" ? "text-red-500" : m.status === "DISBURSED" ? "text-blue-600" : "text-green-600 dark:text-green-400"}`}>
                          {m.status === "REVERSED" ? "-" : "+"}${m.amount.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Retiro
                const s = withdrawalStatus[m.status] ?? { label: m.status, color: "text-gray-600 bg-gray-50" };
                const daysOld = Math.floor((now - new Date(m.createdAt).getTime()) / 86_400_000);
                const withdrawalLabel: Record<string, string> = {
                  PENDING: "Retiro solicitado",
                  PROCESSING: "Retiro en proceso",
                  APPROVED: "Retiro acreditado",
                  PAID: "Retiro acreditado",
                  REJECTED: "Retiro rechazado",
                };
                return (
                  <div key={`w-${m.id}`} className="flex items-center justify-between px-6 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ArrowDownLeft className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{withdrawalLabel[m.status] ?? "Retiro"}</p>
                        <p className="text-xs text-gray-400 flex flex-wrap items-center gap-1.5">
                          {new Date(m.createdAt).toLocaleDateString("es-AR")}
                          {m.notes && <span className="text-gray-500">· {m.notes}</span>}
                          {m.status === "PENDING" && daysOld >= 3 && (
                            <a
                              href={`mailto:marketplacemitienda@gmail.com?subject=${encodeURIComponent(`Consulta retiro — $${m.amount.toLocaleString("es-AR")} del ${new Date(m.createdAt).toLocaleDateString("es-AR")}`)}`}
                              className={`font-semibold underline ${daysOld >= 15 ? "text-red-500" : daysOld >= 7 ? "text-amber-500" : "text-gray-500"}`}>
                              {daysOld}d · Consultar
                            </a>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>
                      <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                        -${m.amount.toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {data?.affiliates.length === 0 && (
          <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-white/10 p-12 text-center shadow-sm">
            <Wallet className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Aún no te uniste a ninguna tienda</p>
            <p className="text-gray-400 text-sm mb-4">Unite a una tienda para empezar a ganar comisiones.</p>
            <Link href="/afiliados"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
              Ver tiendas disponibles
            </Link>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pendingAction && (
          <OtpModal onVerified={onOtpVerified} onClose={() => setPendingAction(null)} />
        )}
        {showBankForm && otpToken && (
          <BankForm otpToken={otpToken} onClose={() => setShowBankForm(false)}
            onSaved={() => { setShowBankForm(false); setOtpToken(""); clearOtpToken(); loadData(); }} />
        )}
        {showWithdraw && data && otpToken && (
          <WithdrawModal totalBalance={data.totalBalance} otpToken={otpToken} onClose={() => setShowWithdraw(false)}
            onSuccess={() => { setShowWithdraw(false); setOtpToken(""); clearOtpToken(); loadData(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
