"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, CreditCard, Lock, CheckCircle } from "lucide-react";

type Props = {
  plan: "OWNER" | "AFFILIATE";
  billing: "MONTHLY" | "ANNUAL";
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
};

declare global {
  interface Window {
    MercadoPago: any;
  }
}

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export default function PaymentModal({ plan, billing, amount, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [mpReady, setMpReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const mpRef = useRef<any>(null);
  const cardFormRef = useRef<any>(null);

  useEffect(() => {
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
  }, []);

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
            body: JSON.stringify({ plan, billing, cardToken: token, paymentMethodId }),
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

  const planLabel = plan === "OWNER" ? "Dueño de tienda" : "Afiliado";
  const billingLabel = billing === "MONTHLY" ? "mensual" : "anual";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-3xl border border-white/10 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-black text-white">Suscripción {planLabel}</h2>
            <p className="text-sm text-gray-400">Plan {billingLabel} · {money(amount)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6">
          {!mpReady && (
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

          <form id="mp-card-form" className={`space-y-4 ${!mpReady ? "hidden" : ""}`}>
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
              {loading ? "Procesando..." : `Pagar ${money(amount)}`}
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
