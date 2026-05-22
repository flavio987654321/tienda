"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, CreditCard, Lock, CheckCircle, Ticket } from "lucide-react";

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

declare global {
  interface Window {
    MercadoPago: any;
  }
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export default function PaymentModal({ plan, billing, amount, prorated, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [mpReady, setMpReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [availableCoupon, setAvailableCoupon] = useState<SubscriptionCoupon | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<SubscriptionCoupon | null>(null);
  const mpRef = useRef<any>(null);
  const cardFormRef = useRef<any>(null);

  const discount = appliedCoupon ? Math.round(amount * appliedCoupon.discountValue / 100) : 0;
  const finalAmount = amount - discount;
  const isFreeMonth = finalAmount === 0;

  useEffect(() => {
    // Buscar cupón de suscripción disponible
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

  useEffect(() => {
    // No inicializar MP si el mes es gratis
    if (isFreeMonth) return;

    // Cargar SDK de MP
    if (document.getElementById("mp-sdk")) {
      initMP();
      return;
    }
    const script = document.createElement("script");
    script.id = "mp-sdk";
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = initMP;
    document.head.appendChild(script);
  }, [isFreeMonth]);

  function initMP() {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!;
    mpRef.current = new window.MercadoPago(publicKey, { locale: "es-AR" });

    cardFormRef.current = mpRef.current.cardForm({
      amount: String(amount),
      autoMount: true,
      form: {
        id: "mp-card-form",
        cardholderName: { id: "mp-cardholder-name", placeholder: "Nombre como aparece en la tarjeta" },
        cardNumber: { id: "mp-card-number", placeholder: "Número de tarjeta" },
        cardExpirationMonth: { id: "mp-card-exp-month", placeholder: "MM" },
        cardExpirationYear: { id: "mp-card-exp-year", placeholder: "AA" },
        securityCode: { id: "mp-security-code", placeholder: "CVV" },
        installments: { id: "mp-installments" },
      },
      callbacks: {
        onFormMounted: (err: any) => { if (!err) setMpReady(true); },
        onSubmit: async (event: any) => {
          event.preventDefault();
          const {
            paymentMethodId,
            issuerId,
            cardholderEmail,
            amount: amt,
            token,
            installments,
            identificationNumber,
            identificationType,
          } = cardFormRef.current.getCardFormData();

          if (!token) { setError("No se pudo tokenizar la tarjeta. Verificá los datos."); return; }

          setLoading(true);
          setError("");

          const res = await fetch("/api/suscripcion/pagar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan, billing, cardToken: token, paymentMethodId,
              rewardCouponCode: appliedCoupon?.code ?? null,
              prorated: prorated ?? false,
            }),
          });

          const data = await res.json();
          setLoading(false);

          if (res.status === 202) {
            // Pago pendiente — informar sin redirigir
            setError(data.error || "Tu pago está siendo procesado. Recibirás un email de confirmación.");
            return;
          }

          if (!res.ok) {
            setError(data.error || "Error al procesar el pago");
            return;
          }

          setSuccess(true);
          setTimeout(onSuccess, 2000);
        },
        onFetching: (resource: string) => {
          setLoading(true);
          return () => setLoading(false);
        },
      },
    });
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-gray-900 rounded-3xl border border-white/10 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">¡Pago confirmado!</h2>
          <p className="text-gray-400 text-sm">Tu suscripción está activa. Redirigiendo al panel...</p>
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

        {/* Formulario */}
        <div className="p-6">

          {/* Cupón de suscripción disponible */}
          {availableCoupon && !appliedCoupon && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3">
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
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Cupón aplicado</p>
                  <p className="text-xs text-emerald-400/80">
                    -{money(discount)} · {isFreeMonth ? "Este mes es gratis 🎉" : `Total: ${money(finalAmount)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppliedCoupon(null)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Quitar
              </button>
            </div>
          )}

          {/* Mes gratis — no necesita tarjeta */}
          {isFreeMonth && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-white font-bold text-lg">Este mes es gratis</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">Tu cupón cubre el 100% del costo de este mes.</p>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  const res = await fetch("/api/suscripcion/pagar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan, billing, rewardCouponCode: appliedCoupon?.code }),
                  });
                  setLoading(false);
                  if (res.ok) { setSuccess(true); setTimeout(onSuccess, 2000); }
                  else { const d = await res.json(); setError(d.error || "Error al aplicar el cupón"); }
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {loading ? "Aplicando..." : "Activar mes gratis"}
              </button>
            </div>
          )}

          {!isFreeMonth && !mpReady && (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando formulario de pago...</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form id="mp-card-form" className={`space-y-4 ${!mpReady || isFreeMonth ? "hidden" : ""}`}>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre en la tarjeta</label>
              <div id="mp-cardholder-name" className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 flex items-center" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Número de tarjeta</label>
              <div id="mp-card-number" className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 flex items-center" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mes</label>
                <div id="mp-card-exp-month" className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 flex items-center" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Año</label>
                <div id="mp-card-exp-year" className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 flex items-center" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">CVV</label>
                <div id="mp-security-code" className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 flex items-center" />
              </div>
            </div>

            <select id="mp-installments" className="hidden" />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {loading ? "Procesando..." : `Pagar ${money(finalAmount)}`}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-600">
            <Lock className="h-3 w-3" />
            Pago seguro procesado por Mercado Pago
          </div>
        </div>
      </div>
    </div>
  );
}
