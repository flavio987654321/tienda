"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, CreditCard, X } from "lucide-react";
import PaymentModal from "./PaymentModal";

type Props = {
  status: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  daysLeft: number;
  role: "OWNER" | "AFFILIATE";
  tier: "BASIC" | "PREMIUM";
  plan: "MONTHLY" | "ANNUAL";
};

export default function SubscriptionGate({ status, daysLeft, role, tier, plan }: Props) {
  const planKey = role === "OWNER" ? (tier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC") : "AFFILIATE";
  const [payModal, setPayModal] = useState(false);

  // Suscripción activa y no está por vencer — no mostrar nada
  if (status === "ACTIVE" && daysLeft > 5) return null;

  // Trial o gracia con días restantes — mostrar banner
  if ((status === "TRIAL" || status === "GRACE") && daysLeft > 0) {
    const isGrace = status === "GRACE";
    return (
      <>
        <div className={`mx-4 mt-4 rounded-2xl border px-4 py-3 flex items-center gap-3 text-sm ${
          isGrace
            ? "border-red-500/30 bg-red-500/10 text-red-400"
            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
        }`}>
          <Clock className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {isGrace
              ? `Tu suscripción venció. Tenés ${daysLeft} día${daysLeft !== 1 ? "s" : ""} de gracia para renovar.`
              : `Tu período de prueba vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}.`}
          </span>
          <button
            onClick={() => setPayModal(true)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
              isGrace
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300"
                : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
            }`}
          >
            Suscribirme
          </button>
        </div>

        {payModal && (
          <PaymentModal
            plan={planKey}
            billing={plan}
            amount={planKey === "OWNER_PREMIUM" ? (plan === "MONTHLY" ? 25000 : 225000) : planKey === "OWNER_BASIC" ? (plan === "MONTHLY" ? 20000 : 180000) : (plan === "MONTHLY" ? 15000 : 135000)}
            onClose={() => setPayModal(false)}
            onSuccess={() => { setPayModal(false); window.location.reload(); }}
          />
        )}
      </>
    );
  }

  // Expirada — bloquear con modal (como ChatGPT)
  if (status === "EXPIRED" || status === "CANCELLED" || daysLeft === 0) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-3xl border border-white/10 p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Tu suscripción venció</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Para seguir usando la plataforma necesitás renovar tu suscripción.
              Tus datos y configuración están guardados.
            </p>

            <button
              onClick={() => setPayModal(true)}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all mb-3"
            >
              <CreditCard className="h-4 w-4" />
              Renovar suscripción
            </button>

            <Link href="/" className="block text-sm text-gray-600 hover:text-gray-400 transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>

        {payModal && (
          <PaymentModal
            plan={planKey}
            billing={plan}
            amount={planKey === "OWNER_PREMIUM" ? (plan === "MONTHLY" ? 25000 : 225000) : planKey === "OWNER_BASIC" ? (plan === "MONTHLY" ? 20000 : 180000) : (plan === "MONTHLY" ? 15000 : 135000)}
            onClose={() => setPayModal(false)}
            onSuccess={() => { setPayModal(false); window.location.reload(); }}
          />
        )}
      </>
    );
  }

  return null;
}
