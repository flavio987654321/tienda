"use client";

import { useEffect, useState } from "react";
import { Loader2, X, CreditCard, Lock, CheckCircle, Ticket, ExternalLink } from "lucide-react";

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
        body: JSON.stringify({
          plan,
          billing,
          rewardCouponCode: appliedCoupon?.code ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar el pago");
        return;
      }
      if (data.free) {
        setSuccess(true);
        setTimeout(onSuccess, 2000);
        return;
      }
      // Redirigir a Checkout Pro de MP
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-gray-900 rounded-3xl border border-white/10 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">¡Suscripción activa!</h2>
          <p className="text-gray-400 text-sm">Redirigiendo al panel...</p>
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  const planLabel = plan === "OWNER_PREMIUM" ? "Dueño Premium" : plan === "OWNER_BASIC" ? "Dueño Básico" : "Afiliado";
  const billingLabel = billing === "MONTHLY" ? "mensual" : "anual";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-3xl border border-white/10 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-black text-white">Suscripción {planLabel}</h2>
            <p className="text-sm text-gray-400">
              Plan {billingLabel} ·{" "}
              {appliedCoupon ? (
                <>
                  <span className="line-through text-gray-600">{money(amount)}</span>{" "}
                  <span className="text-emerald-400 font-semibold">{isFreeMonth ? "Gratis" : money(finalAmount)}</span>
                </>
              ) : money(amount)}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Cupón disponible */}
          {availableCoupon && !appliedCoupon && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-300">Tenés un cupón disponible</p>
                  <p className="text-xs text-amber-400/80">
                    {availableCoupon.discountValue === 100 ? "Mes gratis" : `${availableCoupon.discountValue}% off`} · Premio {availableCoupon.level === "SILVER" ? "Plata" : availableCoupon.level === "GOLD" ? "Oro" : "Diamante"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppliedCoupon(availableCoupon)}
                className="text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Aplicar
              </button>
            </div>
          )}

          {/* Cupón aplicado */}
          {appliedCoupon && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Cupón aplicado</p>
                  <p className="text-xs text-emerald-400/80">
                    -{money(discount)} · {isFreeMonth ? "Este mes es gratis 🎉" : `Total: ${money(finalAmount)}`}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setAppliedCoupon(null)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Quitar
              </button>
            </div>
          )}

          {/* Resumen */}
          {!isFreeMonth && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Plan {planLabel} {billingLabel}</span>
                <span className="text-white font-semibold">{money(amount)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400">Descuento cupón</span>
                  <span className="text-emerald-400 font-semibold">-{money(discount)}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-white font-bold text-lg">{money(finalAmount)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handlePay}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
            ) : isFreeMonth ? (
              <><CheckCircle className="h-4 w-4" /> Activar mes gratis</>
            ) : (
              <><ExternalLink className="h-4 w-4" /> Pagar con Mercado Pago</>
            )}
          </button>

          <p className="text-center text-xs text-gray-600 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            {isFreeMonth ? "Sin cobro — cupón 100% off" : "Te redirigimos a Mercado Pago para completar el pago de forma segura"}
          </p>
        </div>
      </div>
    </div>
  );
}
