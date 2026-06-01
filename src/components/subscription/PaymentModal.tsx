"use client";

import { useEffect, useState } from "react";
import { Loader2, X, CheckCircle, Ticket, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  plan: "OWNER_BASIC" | "OWNER_PREMIUM" | "AFFILIATE";
  billing: "MONTHLY" | "ANNUAL";
  amount: number;
  prorated?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

interface SubscriptionCoupon {
  id: string;
  code: string;
  discountValue: number;
  level: string;
  earnedMonth: string;
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export default function PaymentModal({ plan, billing, amount, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [availableCoupon, setAvailableCoupon] = useState<SubscriptionCoupon | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<SubscriptionCoupon | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const discount = appliedCoupon ? Math.round(amount * appliedCoupon.discountValue / 100) : 0;
  const finalAmount = amount - discount;
  const isFreeMonth = finalAmount === 0;

  useEffect(() => {
    fetch("/api/vendedoras/premios")
      .then((r) => r.json())
      .then((data) => {
        const sub = (data.cupones ?? []).find(
          (c: any) => c.type === "SUBSCRIPTION" && c.status === "AVAILABLE"
        );
        if (sub) setAvailableCoupon(sub);
      })
      .catch(() => {});
  }, []);

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suscripcion/preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing, rewardCouponCode: appliedCoupon?.code ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al iniciar el pago"); return; }
      if (data.free) { setSuccess(true); setTimeout(onSuccess, 2000); return; }
      setCheckoutUrl(data.checkoutUrl);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const planLabel = plan === "OWNER_PREMIUM" ? "Dueño Premium" : plan === "OWNER_BASIC" ? "Dueño Básico" : "Afiliado";
  const billingLabel = billing === "MONTHLY" ? "mensual" : "anual";

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-xs w-full text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">¡Suscripción activa!</h2>
          <p className="text-gray-500 text-sm">Redirigiendo al panel...</p>
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // Pantalla QR
  if (checkoutUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button onClick={() => setCheckoutUrl(null)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
            <span className="text-sm font-bold text-gray-900">{money(finalAmount)}</span>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 pt-5 pb-2 text-center">
            <p className="text-sm font-semibold text-gray-800 mb-1">Escaneá para pagar desde tu celular</p>
            <p className="text-xs text-gray-400 mb-5">O continuá desde esta pantalla</p>
            <div className="flex justify-center mb-5">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 inline-block">
                <QRCodeSVG value={checkoutUrl} size={160} bgColor="#f9fafb" fgColor="#1e293b" level="M" />
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <a
              href={checkoutUrl}
              className="flex items-center justify-center w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
            >
              Pagar en esta ventana
            </a>
            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" /> Mercado Pago
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/90 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Suscripción</p>
            <h2 className="text-base font-bold text-gray-900">{planLabel} · {billingLabel}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Cupón disponible */}
          {availableCoupon && !appliedCoupon && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">
                    {availableCoupon.discountValue === 100 ? "Mes gratis disponible" : `${availableCoupon.discountValue}% off disponible`}
                  </p>
                  <p className="text-xs text-amber-600">Premio {availableCoupon.level === "SILVER" ? "Plata" : availableCoupon.level === "GOLD" ? "Oro" : "Diamante"}</p>
                </div>
              </div>
              <button
                onClick={() => setAppliedCoupon(availableCoupon)}
                className="text-xs font-semibold text-amber-700 bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded-lg transition-colors"
              >
                Aplicar
              </button>
            </div>
          )}

          {appliedCoupon && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-800">
                  {isFreeMonth ? "Este mes es gratis" : `Descuento de ${money(discount)} aplicado`}
                </p>
              </div>
              <button onClick={() => setAppliedCoupon(null)} className="text-xs text-gray-400 hover:text-gray-600">Quitar</button>
            </div>
          )}

          {/* Resumen */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-gray-500">{planLabel} {billingLabel}</span>
              <span className="text-gray-900 font-medium">{money(amount)}</span>
            </div>
            {appliedCoupon && !isFreeMonth && (
              <div className="px-4 py-3 flex justify-between text-sm border-t border-gray-100">
                <span className="text-emerald-600">Descuento</span>
                <span className="text-emerald-600 font-medium">−{money(discount)}</span>
              </div>
            )}
            <div className="px-4 py-3 flex justify-between border-t border-gray-200 bg-gray-50">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-bold text-gray-900">{isFreeMonth ? "Gratis" : money(finalAmount)}</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handlePay}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Procesando..." : isFreeMonth ? "Activar mes gratis" : `Continuar — ${money(finalAmount)}`}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pago seguro vía Mercado Pago
          </div>
        </div>
      </div>
    </div>
  );
}
