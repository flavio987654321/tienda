"use client";

import { useEffect, useState } from "react";
import { Loader2, X, CheckCircle, Ticket, Lock, Smartphone, Monitor, ArrowLeft } from "lucide-react";
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

  // Pantalla de éxito (cupón gratis)
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">¡Suscripción activa!</h2>
          <p className="text-gray-500 text-sm">Redirigiendo al panel...</p>
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // Pantalla de QR + botón de pago
  if (checkoutUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <button onClick={() => setCheckoutUrl(null)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <p className="text-sm font-semibold text-gray-700">{money(finalAmount)}</p>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 text-center">
            <p className="text-base font-bold text-gray-900 mb-1">Escaneá con tu celular</p>
            <p className="text-sm text-gray-500 mb-5">O pagá desde esta pantalla con el botón de abajo</p>

            <div className="flex justify-center mb-5">
              <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50 inline-block">
                <QRCodeSVG
                  value={checkoutUrl}
                  size={180}
                  bgColor="#eef2ff"
                  fgColor="#1e1b4b"
                  level="M"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <a
              href={checkoutUrl}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors"
            >
              <Monitor className="h-4 w-4" />
              Pagar en esta ventana
            </a>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Abrí la cámara o app de QR de tu celular</span>
            </div>
          </div>

          <div className="px-6 pb-5 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock className="h-3 w-3" />
            Pago seguro procesado por Mercado Pago
          </div>
        </div>
      </div>
    );
  }

  // Pantalla inicial — resumen + cupón + botón
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Suscripción {planLabel}</h2>
            <p className="text-sm text-gray-500">
              Plan {billingLabel} ·{" "}
              {appliedCoupon ? (
                <>
                  <span className="line-through text-gray-400">{money(amount)}</span>{" "}
                  <span className="text-emerald-600 font-semibold">{isFreeMonth ? "Gratis" : money(finalAmount)}</span>
                </>
              ) : money(amount)}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Cupón disponible */}
          {availableCoupon && !appliedCoupon && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700">Tenés un cupón disponible</p>
                  <p className="text-xs text-amber-600">
                    {availableCoupon.discountValue === 100 ? "Mes gratis" : `${availableCoupon.discountValue}% off`} · Premio {availableCoupon.level === "SILVER" ? "Plata" : availableCoupon.level === "GOLD" ? "Oro" : "Diamante"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppliedCoupon(availableCoupon)}
                className="text-xs font-bold text-amber-700 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Aplicar
              </button>
            </div>
          )}

          {/* Cupón aplicado */}
          {appliedCoupon && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-700">Cupón aplicado</p>
                  <p className="text-xs text-emerald-600">
                    -{money(discount)} · {isFreeMonth ? "Este mes es gratis 🎉" : `Total: ${money(finalAmount)}`}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setAppliedCoupon(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Quitar
              </button>
            </div>
          )}

          {/* Resumen del pago */}
          {!isFreeMonth && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan {planLabel} {billingLabel}</span>
                <span className="text-gray-900 font-medium">{money(amount)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Descuento cupón</span>
                  <span className="text-emerald-600 font-medium">-{money(discount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-bold text-gray-900">Total a pagar</span>
                <span className="font-bold text-gray-900 text-lg">{money(finalAmount)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handlePay}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
            ) : isFreeMonth ? (
              <><CheckCircle className="h-4 w-4" /> Activar mes gratis</>
            ) : (
              <>Continuar al pago — {money(finalAmount)}</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3" />
            {isFreeMonth ? "Sin cobro — cupón 100% off" : "Pago seguro vía Mercado Pago"}
          </p>
        </div>
      </div>
    </div>
  );
}
