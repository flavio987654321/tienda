"use client";

import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, CreditCard, ArrowRight, RefreshCw } from "lucide-react";
import { getSubscriptionStatus, daysRemaining, PRICES } from "@/lib/subscription";
import PaymentModal from "@/components/subscription/PaymentModal";

type Sub = {
  role: string;
  plan: string;
  status: string;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
} | null;

type Props = { sub: Sub; userRole: "OWNER" | "SELLER" };

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  TRIAL:     { label: "Período de prueba", color: "text-amber-600 bg-amber-50 border-amber-200",     icon: Clock },
  ACTIVE:    { label: "Activa",            color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle },
  GRACE:     { label: "Período de gracia", color: "text-orange-600 bg-orange-50 border-orange-200",   icon: AlertTriangle },
  EXPIRED:   { label: "Vencida",           color: "text-red-600 bg-red-50 border-red-200",             icon: AlertTriangle },
  CANCELLED: { label: "Cancelada",         color: "text-gray-600 bg-gray-100 border-gray-200",         icon: AlertTriangle },
};

export default function MiPlanClient({ sub, userRole }: Props) {
  const [payModal, setPayModal] = useState<{ plan: "OWNER" | "AFFILIATE"; billing: "MONTHLY" | "ANNUAL"; amount: number } | null>(null);

  const role: "OWNER" | "AFFILIATE" = userRole === "OWNER" ? "OWNER" : "AFFILIATE";

  if (!sub) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500 text-sm mb-4">No tenés una suscripción activa.</p>
        <button
          onClick={() => setPayModal({ plan: role, billing: "MONTHLY", amount: PRICES[role].MONTHLY })}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors"
        >
          <CreditCard className="h-4 w-4" /> Suscribirme
        </button>
        {payModal && (
          <PaymentModal {...payModal} onClose={() => setPayModal(null)} onSuccess={() => window.location.reload()} />
        )}
      </div>
    );
  }

  const status = getSubscriptionStatus(sub as any);
  const statusMeta = STATUS_LABELS[status] ?? STATUS_LABELS.EXPIRED;
  const StatusIcon = statusMeta.icon;

  const relevantDate =
    status === "TRIAL" ? sub.trialEndsAt :
    status === "GRACE" ? (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd!) :
    sub.currentPeriodEnd ?? sub.trialEndsAt;

  const days = daysRemaining(relevantDate);
  const planRole = (sub.role as "OWNER" | "AFFILIATE");
  const planBilling = (sub.plan as "MONTHLY" | "ANNUAL");
  const planPrice = PRICES[planRole]?.[planBilling] ?? 0;

  const planNames: Record<string, string> = {
    OWNER: "Dueño de tienda", AFFILIATE: "Afiliado",
  };
  const billingNames: Record<string, string> = {
    MONTHLY: "Mensual", ANNUAL: "Anual",
  };

  const isActive = status === "TRIAL" || status === "ACTIVE" || status === "GRACE";

  return (
    <div className="space-y-4">

      {/* Card principal */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Plan actual</p>
            <h2 className="text-xl font-black text-gray-900">{planNames[planRole] ?? planRole}</h2>
            <p className="text-gray-500 text-sm">{billingNames[planBilling] ?? planBilling} · {money(planPrice)}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${statusMeta.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusMeta.label}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100">
          {/* Barra de progreso de días */}
          {(status === "TRIAL" || status === "GRACE") && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>{status === "TRIAL" ? "Días de prueba restantes" : "Días de gracia restantes"}</span>
                <span className="font-bold text-gray-700">{days} día{days !== 1 ? "s" : ""}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${status === "GRACE" ? "bg-red-400" : "bg-amber-400"}`}
                  style={{ width: `${Math.min(100, (days / (status === "TRIAL" ? 7 : 4)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {status === "ACTIVE" && sub.currentPeriodEnd && (
            <p className="text-sm text-gray-500">
              Próxima renovación: <span className="font-semibold text-gray-700">
                {new Date(sub.currentPeriodEnd).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {days <= 5 && <span className="ml-2 text-amber-600 font-semibold">({days} días)</span>}
            </p>
          )}

          {(status === "EXPIRED" || status === "CANCELLED") && (
            <p className="text-sm text-red-500 font-medium">Tu acceso está limitado. Renovar para continuar.</p>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Opciones de plan</h3>
        <div className="space-y-3">

          {/* Renovar / Suscribirme */}
          {(!isActive || status === "GRACE" || (status === "ACTIVE" && days <= 5)) && (
            <button
              onClick={() => setPayModal({ plan: planRole, billing: planBilling, amount: planPrice })}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-sm font-semibold text-indigo-700">
                <RefreshCw className="h-4 w-4" />
                {status === "EXPIRED" || status === "CANCELLED" ? "Reactivar suscripción" : "Renovar ahora"}
              </div>
              <ArrowRight className="h-4 w-4 text-indigo-400" />
            </button>
          )}

          {/* Cambiar a anual si es mensual */}
          {isActive && planBilling === "MONTHLY" && (
            <button
              onClick={() => setPayModal({ plan: planRole, billing: "ANNUAL", amount: PRICES[planRole].ANNUAL })}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-700">
                <CreditCard className="h-4 w-4" />
                Cambiar a plan anual (3 meses gratis)
              </div>
              <span className="text-xs font-bold text-emerald-600">{money(PRICES[planRole].ANNUAL)}/año</span>
            </button>
          )}

          {/* Ver todos los planes */}
          <a
            href="/precios"
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-600">Ver todos los planes</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </a>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          billing={payModal.billing}
          amount={payModal.amount}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
