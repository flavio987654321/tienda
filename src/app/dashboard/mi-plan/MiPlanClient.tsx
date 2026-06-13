"use client";

import { useState } from "react";
import { CheckCircle, Clock, AlertTriangle, CreditCard, ArrowRight, RefreshCw, Zap, Crown, Star, Shield, TrendingUp, Users, Package, BarChart2 } from "lucide-react";
import { getSubscriptionStatus, daysRemaining, getPriceForRole } from "@/lib/subscription";
import PaymentModal from "@/components/subscription/PaymentModal";

type Sub = {
  role: string;
  tier?: string;
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

const PLAN_CONFIG = {
  OWNER: {
    BASIC: {
      name: "Dueño Básico",
      gradient: "from-indigo-600 to-violet-600",
      lightGradient: "from-indigo-50 to-violet-50",
      border: "border-indigo-200",
      icon: Store,
      features: ["Tienda personalizada", "Productos ilimitados", "Panel de pedidos", "Afiliados", "Cupones de descuento"],
    },
    PREMIUM: {
      name: "Dueño Premium",
      gradient: "from-violet-600 to-fuchsia-600",
      lightGradient: "from-violet-50 to-fuchsia-50",
      border: "border-violet-200",
      icon: Crown,
      features: ["Todo lo de Básico", "Métricas avanzadas", "Múltiples plantillas premium", "Soporte prioritario", "Badge verificado"],
    },
  },
  AFFILIATE: {
    BASIC: {
      name: "Afiliado",
      gradient: "from-emerald-500 to-teal-600",
      lightGradient: "from-emerald-50 to-teal-50",
      border: "border-emerald-200",
      icon: TrendingUp,
      features: ["Catálogo de tiendas", "Links de afiliado", "Panel de comisiones", "Historial de ventas", "Ranking de afiliados"],
    },
  },
};

function Store(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l1-5h16l1 5" /><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" /><path d="M5 9v11h14V9" /><rect x="9" y="14" width="6" height="6" />
    </svg>
  );
}

const STATUS_CONFIG: Record<string, { label: string; textColor: string; bgColor: string; borderColor: string; icon: typeof CheckCircle }> = {
  TRIAL:     { label: "Período de prueba", textColor: "text-amber-700",   bgColor: "bg-amber-50",   borderColor: "border-amber-200",   icon: Clock },
  ACTIVE:    { label: "Activa",            textColor: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", icon: CheckCircle },
  GRACE:     { label: "Período de gracia", textColor: "text-orange-700",  bgColor: "bg-orange-50",  borderColor: "border-orange-200",  icon: AlertTriangle },
  EXPIRED:   { label: "Vencida",           textColor: "text-red-700",     bgColor: "bg-red-50",     borderColor: "border-red-200",     icon: AlertTriangle },
  CANCELLED: { label: "Cancelada",         textColor: "text-gray-600",    bgColor: "bg-gray-100",   borderColor: "border-gray-200",    icon: AlertTriangle },
};

export default function MiPlanClient({ sub, userRole }: Props) {
  const [payModal, setPayModal] = useState<{ plan: "OWNER_BASIC" | "OWNER_PREMIUM" | "AFFILIATE"; billing: "MONTHLY" | "ANNUAL"; amount: number } | null>(null);

  const role: "OWNER" | "AFFILIATE" = userRole === "OWNER" ? "OWNER" : "AFFILIATE";

  if (!sub) {
    const defaultPlan = role === "OWNER" ? "OWNER_BASIC" : "AFFILIATE";
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="h-8 w-8 text-indigo-400" />
        </div>
        <p className="text-gray-700 font-semibold mb-1">Sin suscripción activa</p>
        <p className="text-gray-400 text-sm mb-6">Elegí un plan para empezar a usar la plataforma.</p>
        <button
          onClick={() => setPayModal({ plan: defaultPlan, billing: "MONTHLY", amount: getPriceForRole(role, "BASIC", "MONTHLY") })}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-200"
        >
          <CreditCard className="h-4 w-4" /> Suscribirme
        </button>
        {payModal && <PaymentModal {...payModal} onClose={() => setPayModal(null)} onSuccess={() => window.location.reload()} />}
      </div>
    );
  }

  const status = getSubscriptionStatus(sub as any);
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXPIRED;
  const StatusIcon = statusCfg.icon;

  const planRole = sub.role as "OWNER" | "AFFILIATE";
  const planTier = (sub.tier ?? "BASIC") as "BASIC" | "PREMIUM";
  const planBilling = sub.plan as "MONTHLY" | "ANNUAL";
  const planPrice = getPriceForRole(planRole, planTier, planBilling);

  const planCfg =
    planRole === "AFFILIATE"
      ? PLAN_CONFIG.AFFILIATE.BASIC
      : (PLAN_CONFIG.OWNER[planTier] ?? PLAN_CONFIG.OWNER.BASIC);
  const PlanIcon = planCfg.icon;

  const relevantDate =
    status === "TRIAL" ? sub.trialEndsAt :
    status === "GRACE" ? (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd!) :
    sub.currentPeriodEnd ?? sub.trialEndsAt;

  const days = daysRemaining(relevantDate);
  const totalDays = status === "TRIAL" ? 7 : status === "GRACE" ? 4 : 30;
  const isActive = status === "TRIAL" || status === "ACTIVE" || status === "GRACE";
  const showRenewButton = !isActive || status === "GRACE" || (status === "ACTIVE" && days <= 5);

  const billingLabel = planBilling === "MONTHLY" ? "Mensual" : "Anual";

  return (
    <div className="space-y-4">

      {/* Hero card del plan */}
      <div className={`rounded-3xl bg-gradient-to-br ${planCfg.gradient} p-6 text-white shadow-xl shadow-violet-200/50 relative overflow-hidden`}>
        {/* Círculos decorativos */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 -left-6 w-32 h-32 bg-white/10 rounded-full" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <PlanIcon className="h-6 w-6 text-white" />
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${statusCfg.bgColor} ${statusCfg.textColor} ${statusCfg.borderColor}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusCfg.label}
            </div>
          </div>

          <div className="mb-1">
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Plan actual</p>
            <h2 className="text-3xl font-black text-white mt-0.5">{planCfg.name}</h2>
          </div>
          <p className="text-white/80 text-sm font-medium">{billingLabel} · {money(planPrice)}</p>

          {/* Barra de días para trial/gracia */}
          {(status === "TRIAL" || status === "GRACE") && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
                <span>{status === "TRIAL" ? "Días de prueba restantes" : "Días de gracia restantes"}</span>
                <span className="font-black text-white text-sm">{days} día{days !== 1 ? "s" : ""}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, (days / totalDays) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Fecha de renovación para activos */}
          {status === "ACTIVE" && sub.currentPeriodEnd && (
            <div className="mt-5 bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
              <p className="text-white/70 text-xs mb-0.5">Próxima renovación</p>
              <p className="text-white font-bold text-sm">
                {new Date(sub.currentPeriodEnd).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                {days <= 5 && <span className="ml-2 text-yellow-300">· {days} días</span>}
              </p>
            </div>
          )}

          {(status === "EXPIRED" || status === "CANCELLED") && (
            <div className="mt-5 bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm">
              <p className="text-white font-semibold text-sm">Tu acceso está limitado. Renovar para continuar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Qué incluye */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Incluido en tu plan</p>
        <div className="grid grid-cols-1 gap-2.5">
          {planCfg.features.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${planCfg.gradient} flex items-center justify-center shrink-0`}>
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Opciones</p>
        <div className="space-y-2.5">

          {showRenewButton && (
            <button
              onClick={() => {
                const planKey = planRole === "OWNER" ? (planTier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC") : "AFFILIATE";
                setPayModal({ plan: planKey, billing: planBilling, amount: planPrice });
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors group"
            >
              <div className="flex items-center gap-3 text-sm font-semibold text-indigo-700">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <RefreshCw className="h-4 w-4 text-indigo-600" />
                </div>
                {status === "EXPIRED" || status === "CANCELLED" ? "Reactivar suscripción" : "Renovar ahora"}
              </div>
              <ArrowRight className="h-4 w-4 text-indigo-400" />
            </button>
          )}

          {isActive && planBilling === "MONTHLY" && (
            <button
              onClick={() => {
                const planKey = planRole === "OWNER" ? (planTier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC") : "AFFILIATE";
                setPayModal({ plan: planKey, billing: "ANNUAL", amount: getPriceForRole(planRole, planTier, "ANNUAL") });
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
            >
              <div className="flex items-center gap-3 text-sm font-semibold text-emerald-700">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <Zap className="h-4 w-4 text-emerald-600" />
                </div>
                Cambiar a plan anual · 3 meses gratis
              </div>
              <span className="text-xs font-bold text-emerald-600">{money(getPriceForRole(planRole, planTier, "ANNUAL"))}/año</span>
            </button>
          )}

          {isActive && planRole === "OWNER" && planTier === "BASIC" && (
            <button
              onClick={() => setPayModal({ plan: "OWNER_PREMIUM", billing: planBilling, amount: getPriceForRole("OWNER", "PREMIUM", planBilling) })}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors group"
            >
              <div className="flex items-center gap-3 text-sm font-semibold text-violet-700">
                <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                  <Crown className="h-4 w-4 text-violet-600" />
                </div>
                Mejorar a Premium
              </div>
              <ArrowRight className="h-4 w-4 text-violet-400" />
            </button>
          )}

          <a
            href="/precios"
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <Star className="h-4 w-4 text-gray-500" />
              </div>
              Ver todos los planes
            </div>
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
