"use client";

import { useState } from "react";
import { useIsPwa } from "@/hooks/useIsPwa";
import { CheckCircle, Clock, AlertTriangle, CreditCard, ArrowRight, RefreshCw, Zap, Crown, Star, Bell, Globe } from "lucide-react";
import { getSubscriptionStatus, daysRemaining, getPriceForRole } from "@/lib/subscription";
import { PRO_MAX_ACTIVE_COUPONS, PRO_MAX_LIVE_PROMOTIONS, PRO_MAX_AFFILIATES, PRO_MAX_PRODUCTS, MAX_PRODUCTS_POR_TIENDA, PUSH_CAMPAIGNS_PER_WEEK } from "@/lib/planLimits";
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

type Props = {
  sub: Sub;
  userRole: "OWNER" | "SELLER";
  /** Llega con ?upgrade=premium desde los avisos de tope: abre el pago sin un click más. */
  autoUpgrade?: boolean;
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

// Esta pantalla sólo se renderiza para OWNER — los afiliados (SELLER) salen antes por el early-return de arriba
const PLAN_CONFIG = {
  OWNER: {
    BASIC: {
      name: "Tienda Pro",
      gradient: "from-indigo-600 to-violet-600",
      lightGradient: "from-indigo-50 to-violet-50",
      border: "border-indigo-200",
      icon: Store,
      // Con los números adentro: sin ellos, la dueña se enteraba del tope recién
      // cuando el sistema la frenaba. Y salen de las constantes que los aplican,
      // así que no pueden decir un número distinto al que se hace cumplir.
      features: [
        "Tienda con subdominio incluido",
        // Decía "Productos y variantes ilimitados" y dejó de ser cierto el día que
        // los productos pasaron a tener tope. Las variantes siguen sin tope.
        `Hasta ${PRO_MAX_PRODUCTS.toLocaleString("es-AR")} productos, con variantes ilimitadas`,
        "Panel de pedidos y estadísticas",
        `Hasta ${PRO_MAX_AFFILIATES} afiliados`,
        `Hasta ${PRO_MAX_ACTIVE_COUPONS} cupones activos`,
        `Hasta ${PRO_MAX_LIVE_PROMOTIONS} promociones a la vez`,
      ],
    },
    PREMIUM: {
      name: "Tienda Premium",
      gradient: "from-violet-600 to-fuchsia-600",
      lightGradient: "from-violet-50 to-fuchsia-50",
      border: "border-violet-200",
      icon: Crown,
      // Antes prometía tres cosas que NO son exclusivas —métricas, diseños y el
      // badge de verificación son idénticos en los dos planes— y no nombraba
      // ninguna de las cuatro que sí lo son. Vender lo que no se cumple no suma:
      // el que se pasa por el badge después descubre que ya lo tenía.
      features: [
        // "Sin topes" a secas dejó de ser exacto: los de plan sí desaparecen, pero
        // el techo de productos por tienda corre igual para Premium (es técnico,
        // no comercial — está explicado en los Términos). Se dice el número acá y
        // en /precios para que las dos pantallas cuenten lo mismo.
        `Todo lo de Tienda Pro, sin topes de plan (hasta ${MAX_PRODUCTS_POR_TIENDA.toLocaleString("es-AR")} productos)`,
        "Tu tienda instalable como app en el celular",
        `Avisales novedades por notificación (${PUSH_CAMPAIGNS_PER_WEEK} por semana)`,
        "Conectá tu propio dominio",
        "Flyer de promoción al entrar a tu tienda",
        "Soporte prioritario",
      ],
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

export default function MiPlanClient({ sub, userRole, autoUpgrade = false }: Props) {
  const inPwa = useIsPwa();
  // Inicializador perezoso en vez de un efecto: el modal tiene que estar abierto
  // en el primer render, no aparecer después de un parpadeo. Se ignora si ya es
  // Premium (no hay nada que comprar) o si la cuenta es de afiliado (es gratis).
  const [payModal, setPayModal] = useState<{ plan: "OWNER_BASIC" | "OWNER_PREMIUM"; billing: "MONTHLY" | "ANNUAL" } | null>(() => {
    if (!autoUpgrade || userRole !== "OWNER" || !sub) return null;
    if ((sub.tier ?? "BASIC") === "PREMIUM") return null;
    const billing = sub.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY";
    return { plan: "OWNER_PREMIUM", billing };
  });

  // Al cerrar se saca ?upgrade=premium de la URL: si queda, cerrar el pago y
  // refrescar lo vuelve a abrir, y la persona no puede mirar su plan tranquila.
  // replaceState y no router.replace para no re-renderizar la página entera.
  function cerrarPago() {
    setPayModal(null);
    if (typeof window !== "undefined" && window.location.search.includes("upgrade=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  // El plan de afiliados es gratuito — nunca se le pide pagar, sin importar si tiene
  // una suscripción vieja en la base (de antes de este cambio).
  if (userRole === "SELLER") {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-10 text-center shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <p className="text-gray-900 font-bold text-lg mb-1">Tu cuenta de afiliado es gratis</p>
        <p className="text-gray-500 text-sm">Acceso completo al panel de afiliados, sin costo y sin límite de tiempo.</p>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="h-8 w-8 text-indigo-400" />
        </div>
        <p className="text-gray-700 font-semibold mb-1">Sin suscripción activa</p>
        <p className="text-gray-400 text-sm mb-6">Elegí un plan para empezar a usar la plataforma.</p>
        <button
          onClick={() => setPayModal({ plan: "OWNER_BASIC", billing: "MONTHLY" })}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-200"
        >
          <CreditCard className="h-4 w-4" /> Suscribirme
        </button>
        {payModal && <PaymentModal {...payModal} onClose={() => setPayModal(null)} onSuccess={() => window.location.reload()} />}
      </div>
    );
  }

  const status = getSubscriptionStatus(sub);
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXPIRED;
  const StatusIcon = statusCfg.icon;

  const planTier = (sub.tier ?? "BASIC") as "BASIC" | "PREMIUM";
  const planBilling = sub.plan as "MONTHLY" | "ANNUAL";
  const planPrice = getPriceForRole("OWNER", planTier, planBilling);

  const planCfg = PLAN_CONFIG.OWNER[planTier] ?? PLAN_CONFIG.OWNER.BASIC;
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

      {/* Features exclusivas Premium */}
      {planTier === "PREMIUM" ? (
          <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-4 w-4 text-violet-500" />
              <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Tus beneficios exclusivos</p>
            </div>
            <div className="space-y-3">
              <a
                href="/dashboard/ajustes"
                className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-violet-100 hover:border-violet-300 transition-colors group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800">Tu tienda como app (PWA)</p>
                    <p className="text-xs text-gray-500">Los clientes pueden instalarla en su celular</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href="/dashboard/configuracion"
                className="flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-violet-100 hover:border-violet-300 transition-colors group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center shrink-0">
                    <Star className="h-5 w-5 text-fuchsia-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800">Flyers publicitarios</p>
                    <p className="text-xs text-gray-500">Popup automático al entrar a tu tienda</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-fuchsia-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-violet-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Solo en Premium</p>
            </div>
            <p className="text-sm text-gray-500 mb-4">Desbloqueá estas funciones mejorando tu plan.</p>
            <div className="space-y-3">
              {/* Faltaban las notificaciones y el dominio: la lista mostraba 2 de
                  las 4 funciones exclusivas, o sea que escondía media diferencia
                  entre los planes justo en la pantalla donde se decide pagar.
                  Los colores van literales y no armados con `bg-${color}-100`:
                  Tailwind solo genera las clases que encuentra escritas enteras,
                  así que las armadas en tiempo de ejecución dependen de que otra
                  pantalla las use por casualidad. El violeta zafaba (ProductsTable
                  lo usa literal); el fucsia no existía en ningún lado y el círculo
                  salía sin color. */}
              {[
                { icon: Zap, tile: "bg-violet-100", ink: "text-violet-400", label: "Tu tienda como app (PWA)", desc: "Los clientes la instalan en su celular" },
                { icon: Bell, tile: "bg-indigo-100", ink: "text-indigo-400", label: "Notificaciones push", desc: `Avisales novedades, hasta ${PUSH_CAMPAIGNS_PER_WEEK} por semana` },
                { icon: Globe, tile: "bg-sky-100", ink: "text-sky-400", label: "Dominio propio", desc: "Tu tienda en tudominio.com, lo configuramos nosotros" },
                { icon: Star, tile: "bg-fuchsia-100", ink: "text-fuchsia-400", label: "Flyers publicitarios", desc: "Aviso automático al entrar a tu tienda" },
              ].map(({ icon: Icon, tile, ink, label, desc }) => (
                <div key={label} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-70">
                  <div className={`w-10 h-10 ${tile} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${ink}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-600">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-violet-500 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full shrink-0">Premium</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Acciones */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Opciones</p>
        <div className="space-y-2.5">

          {showRenewButton && (
            <button
              onClick={() => {
                const planKey = planTier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC";
                setPayModal({ plan: planKey, billing: planBilling });
              }}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors group"
            >
              <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-indigo-700">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                  <RefreshCw className="h-4 w-4 text-indigo-600" />
                </div>
                {status === "EXPIRED" || status === "CANCELLED" ? "Reactivar suscripción" : "Renovar ahora"}
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-indigo-400" />
            </button>
          )}

          {isActive && planBilling === "MONTHLY" && (
            <button
              onClick={() => {
                const planKey = planTier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC";
                setPayModal({ plan: planKey, billing: "ANNUAL" });
              }}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
            >
              <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-emerald-700">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                  <Zap className="h-4 w-4 text-emerald-600" />
                </div>
                Cambiar a plan anual · 3 meses gratis
              </div>
              <span className="shrink-0 text-right text-xs font-bold text-emerald-600">{money(getPriceForRole("OWNER", planTier, "ANNUAL"))}/año</span>
            </button>
          )}

          {isActive && planTier === "BASIC" && (
            <button
              onClick={() => setPayModal({ plan: "OWNER_PREMIUM", billing: planBilling })}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors group"
            >
              <div className="flex min-w-0 items-center gap-3 text-left text-sm font-semibold text-violet-700">
                <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-violet-200 transition-colors">
                  <Crown className="h-4 w-4 text-violet-600" />
                </div>
                Mejorar a Premium
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-violet-400" />
            </button>
          )}

          {/* `/precios` es de la web comercial, fuera del panel: desde la app
              instalada se abre en el navegador. Sin esto reemplazaba la pantalla
              y dejaba a la persona navegando tiendaapps.com adentro de la app,
              sin barra de direcciones ni forma de volver. */}
          <a
            href="/precios"
            {...(inPwa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex min-w-0 items-center gap-3 text-left text-sm font-medium text-gray-600">
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                <Star className="h-4 w-4 text-gray-500" />
              </div>
              Ver todos los planes
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
          </a>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          billing={payModal.billing}
          onClose={cerrarPago}
          onSuccess={() => { setPayModal(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
