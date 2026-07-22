"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Check, ShoppingBag, Zap, Store, Star, ArrowRight, PartyPopper, ShoppingCart, Crown, Mail, X, BadgeCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import PaymentModal from "@/components/subscription/PaymentModal";
import { PRICES, PRO_MAX_ACTIVE_COUPONS, PRO_MAX_LIVE_PROMOTIONS, PRO_MAX_AFFILIATES, PUSH_CAMPAIGNS_PER_WEEK } from "@/lib/planLimits";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function money(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
}

type Cotizacion = {
  destino: { plan: string; billing: string };
  precioLista: number;
  credito: number;
  aPagar: number;
  diasRestantes: number;
};

type UserSub = {
  status: string;
  role: string;
  plan: "MONTHLY" | "ANNUAL";
  tier: string;
  daysLeft: number;
  currentPeriodEnd: string | null;
};

export default function PreciosPage() {
  return (
    <Suspense>
      <PreciosContent />
    </Suspense>
  );
}

function PreciosContent() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [ownerTier, setOwnerTier] = useState<"BASIC" | "PREMIUM">("BASIC");
  const [payModal, setPayModal] = useState<{ plan: "OWNER_BASIC" | "OWNER_PREMIUM" | "AFFILIATE"; billing: "MONTHLY" | "ANNUAL" } | null>(null);
  // Precios ya calculados por el servidor, con el descuento por días no usados
  // aplicado. Vacío mientras carga o si no hay sesión: ahí se muestra el de lista.
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [userSub, setUserSub] = useState<UserSub | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMetaRole, setUserMetaRole] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isRegistered = searchParams.get("registered") === "true";
  const role = searchParams.get("role");

  function fetchSub() {
    fetch("/api/suscripcion/estado")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const sub: UserSub | null = data?.subscription ?? null;
        setUserSub(sub);
        if (sub) {
          if (sub.plan === "ANNUAL") setIsAnnual(true);
          if (sub.role === "OWNER") setOwnerTier(sub.tier === "PREMIUM" ? "PREMIUM" : "BASIC");
        }
      })
      .catch(() => {});

    // Va con el estado de la suscripción porque se refrescan juntos: después de
    // pagar, el plan cambia y los descuentos que quedaban dejan de aplicar.
    fetch("/api/suscripcion/cotizar")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCotizaciones(data?.cotizaciones ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    fetchSub();
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.name ?? data.user?.user_metadata?.full_name ?? null;
      const metaRole = data.user?.user_metadata?.role ?? null;
      setUserName(name);
      setUserMetaRole(metaRole);
    });
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      channel = supabase.channel("precios-sub-" + userId);
      channel.on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        { event: "*", schema: "public", table: "Subscription", filter: `userId=eq.${userId}` },
        () => fetchSub()
      );
      channel.subscribe();
    });

    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // De la misma constante que usa el cobro. Estaban copiados acá con otro formato
  // de claves, así que un cambio de precio se aplicaba en el checkout pero no en
  // la pantalla que lo anuncia.
  const selectedOwner = ownerTier === "PREMIUM" ? PRICES.OWNER_PREMIUM : PRICES.OWNER_BASIC;
  const ownerMonthlyEquiv = isAnnual ? Math.round(selectedOwner.ANNUAL / 12) : selectedOwner.MONTHLY;
  const ownerPrice = isAnnual ? selectedOwner.ANNUAL : selectedOwner.MONTHLY;

  // Helpers para saber si el plan mostrado es el plan actual del usuario
  const viewingBilling: "MONTHLY" | "ANNUAL" = isAnnual ? "ANNUAL" : "MONTHLY";
  const isOnAnnual = userSub?.plan === "ANNUAL";

  // El plan de afiliadas es gratuito — estas funciones de precio sólo se usan para la tarjeta de OWNER
  function isCurrentPlan(cardRole: "OWNER", cardTier?: "BASIC" | "PREMIUM") {
    if (!userSub) return false;
    if (userSub.role !== cardRole) return false;
    if (userSub.tier !== (cardTier ?? "BASIC")) return false;
    return userSub.plan === viewingBilling;
  }

  function isUpgradeToAnnual(cardRole: "OWNER", cardTier?: "BASIC" | "PREMIUM") {
    if (!userSub) return false;
    if (userSub.role !== cardRole) return false;
    if (userSub.tier !== (cardTier ?? "BASIC")) return false;
    return userSub.plan === "MONTHLY" && viewingBilling === "ANNUAL" && userSub.status === "ACTIVE";
  }

  /**
   * El precio real del servidor, no una estimación de esta pantalla.
   *
   * Antes acá se calculaba el descuento a mano y se mostraba "pagás $200.000",
   * pero el endpoint de cobro no sabía nada de eso y MercadoPago cobraba los
   * $225.000 de lista. Además la cuenta dividía por 30 días fijos, así que a
   * alguien en plan anual le prometía un descuento enorme que tampoco existía.
   * Ahora el número lo da el mismo lugar que después cobra.
   */
  function getAnnualQuote(plan: "OWNER_BASIC" | "OWNER_PREMIUM") {
    const q = cotizaciones.find((c) => c.destino.plan === plan && c.destino.billing === "ANNUAL");
    // Sin cotización todavía (cargando, o sin sesión) se muestra el precio de
    // lista sin descuento: nunca un número menor al que se va a cobrar.
    return q ?? { aPagar: ownerPrice, credito: 0 };
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <SiteNav active="precios" fixed />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Banner post-registro */}
          {isRegistered && (
            <div className="mb-10 rounded-2xl border border-teal-200 bg-teal-50 px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <PartyPopper className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-teal-700 font-bold text-sm">¡Cuenta creada con éxito!</p>
                <p className="text-teal-600/80 text-xs mt-0.5">
                  Tu período de prueba de <strong>7 días gratis</strong> ya está activo.
                  Elegí un plan o empezá a explorar la plataforma.
                </p>
              </div>
              <Link
                href={role === "owner" ? "/login?registered=true" : "/login?registered=seller"}
                className="ml-auto shrink-0 text-xs text-teal-700 hover:text-teal-800 underline whitespace-nowrap"
              >
                Ir al panel →
              </Link>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 text-orange-700 text-sm font-medium mb-6">
              <Star className="h-3.5 w-3.5" />
              7 días de prueba gratis, sin tarjeta
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-4 text-gray-950">
              Planes simples,<br />
              <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">resultados reales</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Empezá gratis 7 días. Sin tarjeta de crédito. Cancelá cuando quieras.
            </p>
          </div>

          {/* Toggle mensual/anual */}
          <div className="flex flex-col items-center gap-3 mb-12">
            <div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1 gap-1">
              <button
                onClick={() => !isOnAnnual && setIsAnnual(false)}
                disabled={isOnAnnual}
                title={isOnAnnual ? "Estás en un plan anual. Al vencer podés elegir mensual." : undefined}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isOnAnnual
                    ? "text-gray-400 cursor-not-allowed"
                    : !isAnnual ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"}`}
              >
                Anual
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isAnnual ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700"}`}>
                  -25%
                </span>
              </button>
            </div>
            {isOnAnnual ? (
              <span className="text-gray-400 text-xs">Estás en plan anual · Al vencer podés cambiarte a mensual</span>
            ) : (
              <span className="text-teal-700 text-xs font-semibold">3 meses gratis pagando anual</span>
            )}
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* ── AFILIADO ── */}
            <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-8 flex flex-col">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Para vendedores independientes</div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-950 mb-1">Afiliado</h2>
              <p className="text-gray-500 text-sm mb-6">Vendé productos de otras tiendas y ganá comisiones sin tener stock.</p>

              <div className="mb-2">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-gray-950">Gratis</span>
                </div>
                <p className="text-xs text-teal-600 font-semibold mt-1">Sin costo, sin límite de tiempo</p>
              </div>

              <div className="h-px bg-amber-100 my-6" />

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  { icon: Store, text: "Acceso a todas las tiendas" },
                  { icon: Zap, text: "Link de afiliado con tracking en tiempo real" },
                  { icon: ShoppingBag, text: "Panel de comisiones para cobrar" },
                  { icon: Star, text: "Panel de ventas y estadísticas" },
                  { icon: Crown, text: "Premios por volumen de ventas" },
                  { icon: Mail, text: "Soporte por email" },
                ].map(({ text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>

              {userSub?.role === "OWNER" ? null : userName ? (
                <Link
                  href="/afiliados"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-white hover:scale-[1.02] transition-all shadow-lg shadow-amber-500/25"
                >
                  Ir a mi panel <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/registro?plan=seller"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-white hover:scale-[1.02] transition-all shadow-lg shadow-amber-500/25"
                >
                  Empezar gratis <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <p className="text-center text-xs text-gray-400 mt-3">Sin costo · Sin tarjeta · Acceso inmediato</p>
            </div>

            {/* ── DUEÑO DE TIENDA (con selector interno) ── */}
            <div className="rounded-3xl border border-orange-200 bg-orange-50/40 p-8 flex flex-col ring-1 ring-orange-300 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/30">
                  Más popular
                </span>
              </div>

              <div className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-3">Para dueños de tienda</div>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-5">
                <Store className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-950 mb-1">Dueño de Tienda</h2>
              <p className="text-gray-500 text-sm mb-5">Creá tu tienda online y gestioná afiliados que vendan por vos.</p>

              {/* Selector de tier */}
              <div className="flex rounded-xl border border-gray-200 bg-white p-1 gap-1 mb-5">
                <button
                  onClick={() => setOwnerTier("BASIC")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${ownerTier === "BASIC" ? "bg-orange-600 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
                >
                  Tienda Pro
                </button>
                <button
                  onClick={() => setOwnerTier("PREMIUM")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${ownerTier === "PREMIUM" ? "bg-amber-500 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
                >
                  <Crown className="h-3.5 w-3.5" /> Tienda Premium
                </button>
              </div>

              <div className="mb-2">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-gray-950">{money(ownerMonthlyEquiv)}</span>
                  <span className="text-gray-500 text-sm mb-1.5">/mes</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-gray-500 mt-1">
                    {money(ownerPrice)} facturado anualmente
                    <span className="ml-2 text-teal-600 font-semibold">
                      Ahorrás {money(selectedOwner.MONTHLY * 12 - selectedOwner.ANNUAL)}
                    </span>
                  </p>
                )}
              </div>

              <div className="h-px bg-orange-100 my-5" />

              {/* Features dinámicas según tier */}
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  { text: "Tienda con subdominio incluido", both: true },
                  { text: "Productos y variantes ilimitados", both: true },
                  { text: "Panel de pedidos y estadísticas", both: true },
                  { text: `Hasta ${PRO_MAX_AFFILIATES} afiliados`, both: false, basic: true, premiumText: "Afiliados ilimitados" },
                  { text: `Hasta ${PRO_MAX_ACTIVE_COUPONS} cupones activos`, both: false, basic: true, premiumText: "Cupones ilimitados" },
                  { text: `Hasta ${PRO_MAX_LIVE_PROMOTIONS} promociones a la vez`, both: false, basic: true, premiumText: "Promociones ilimitadas" },
                  { text: "Tienda instalable como app (PWA)", both: false, basic: false, premiumOnly: true },
                  { text: `Notificaciones push a visitantes (${PUSH_CAMPAIGNS_PER_WEEK} por semana)`, both: false, basic: false, premiumOnly: true },
                  { text: "Conectá tu dominio propio (lo configuramos nosotros)", both: false, basic: false, premiumOnly: true },
                  { text: "Flyer de publicidad al entrar a la tienda", both: false, basic: false, premiumOnly: true },
                  { text: "Soporte por email", both: false, basic: true, premiumText: "Soporte prioritario" },
                ].map((f, i) => {
                  if (f.both) {
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        {f.text}
                      </li>
                    );
                  }
                  if (f.premiumOnly) {
                    return ownerTier === "PREMIUM" ? (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-amber-700">
                        <Check className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        {f.text}
                      </li>
                    ) : (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                        <X className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                        {f.text}
                      </li>
                    );
                  }
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${ownerTier === "PREMIUM" ? "text-amber-500" : "text-orange-500"}`} />
                      {ownerTier === "PREMIUM" && f.premiumText ? f.premiumText : f.text}
                    </li>
                  );
                })}
              </ul>

              {(() => {
                const planKey = ownerTier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC";
                const cardTier = ownerTier;
                const btnClass = ownerTier === "PREMIUM"
                  ? "bg-amber-500 hover:bg-amber-400"
                  : "bg-orange-600 hover:bg-orange-500";

                if (isCurrentPlan("OWNER", cardTier)) {
                  return (
                    <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-teal-50 border border-teal-200 text-teal-700">
                      <BadgeCheck className="h-4 w-4" /> Tu plan actual
                    </div>
                  );
                }
                // Los afiliados no ven opciones de pago para el plan de dueño.
                // userMetaRole cubre el caso de afiliados sin Subscription en DB (plan gratuito).
                const isAffiliate = userSub?.role === "AFFILIATE" || (!userSub && userMetaRole === "SELLER");
                if (isAffiliate) {
                  return (
                    <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-gray-100 border border-gray-200 text-gray-400 cursor-default">
                      <BadgeCheck className="h-4 w-4" /> Ya tenés cuenta activa
                    </div>
                  );
                }
                if (isUpgradeToAnnual("OWNER", cardTier)) {
                  // Los dos números salen de la misma cotización del servidor.
                  // Antes el descuento se sacaba restando (precio − a pagar):
                  // daba lo mismo, pero cualquier diferencia entre esa resta y
                  // lo que cobra el servidor se hubiera visto como un descuento
                  // que no es. Mejor que los dos vengan del mismo lugar.
                  const { aPagar: proratedAmt, credito: credit } = getAnnualQuote(planKey);
                  return (
                    <>
                      {credit > 0 && (
                        <p className="text-xs text-teal-600 text-center mb-2">
                          Pagás {money(proratedAmt)} (descontamos {money(credit)} por los días restantes del mes)
                        </p>
                      )}
                      <button
                        onClick={() => setPayModal({ plan: planKey, billing: "ANNUAL" })}
                        className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all text-white hover:opacity-90 hover:scale-[1.02] shadow-lg ${btnClass}`}
                      >
                        Cambiar a anual <ArrowRight className="h-4 w-4" />
                      </button>
                    </>
                  );
                }
                if (isRegistered || userSub) {
                  return (
                    <button
                      onClick={() => setPayModal({ plan: planKey, billing: isAnnual ? "ANNUAL" : "MONTHLY" })}
                      className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all text-white hover:opacity-90 hover:scale-[1.02] shadow-lg ${btnClass}`}
                    >
                      {userSub ? "Cambiar de plan" : "Suscribirme ahora"} <ArrowRight className="h-4 w-4" />
                    </button>
                  );
                }
                return (
                  <Link
                    href={`/registro?plan=owner&billing=${isAnnual ? "annual" : "monthly"}&tier=${ownerTier === "PREMIUM" ? "premium" : "basic"}`}
                    className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all text-white hover:opacity-90 hover:scale-[1.02] shadow-lg ${btnClass}`}
                  >
                    Empezar prueba gratis <ArrowRight className="h-4 w-4" />
                  </Link>
                );
              })()}
              <p className="text-center text-xs text-gray-400 mt-3">
                {isCurrentPlan("OWNER", ownerTier) ? `${userSub!.daysLeft} días restantes` : "7 días gratis · Sin tarjeta · Cancelá cuando quieras"}
              </p>
            </div>

            {/* ── CLIENTE ── */}
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-8 flex flex-col md:col-span-2 md:w-1/2 md:mx-auto lg:col-span-1 lg:w-auto lg:mx-0">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Para compradores</div>
              <div className="w-12 h-12 rounded-2xl bg-gray-200/60 flex items-center justify-center mb-5">
                <ShoppingCart className="h-6 w-6 text-gray-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-700 mb-1">Cliente</h2>
              <p className="text-gray-500 text-sm mb-6">Explorá tiendas, comprá y seguí tus pedidos sin costo.</p>

              <div className="mb-2">
                <span className="text-4xl font-black text-gray-700">Gratis</span>
                <p className="text-xs text-gray-400 mt-1">Sin suscripción · Siempre gratis</p>
              </div>

              <div className="h-px bg-gray-200 my-6" />

              <ul className="space-y-3 mb-8 flex-1">
                {["Acceso a todas las tiendas", "Historial de pedidos", "Favoritos sincronizados", "Checkout más rápido", "Seguimiento de envíos"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-500">
                    <Check className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {!userName && (
                <Link
                  href="/registro?plan=buyer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 transition-all"
                >
                  Crear cuenta gratis <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <p className="text-center text-xs text-gray-400 mt-3">Sin tarjeta · Sin límite de tiempo</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-8 text-gray-950">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {[
                { q: "¿Necesito tarjeta de crédito para el período de prueba?", a: "No. Los 7 días de prueba son completamente gratis y no te pedimos datos de pago hasta que decides suscribirte." },
                { q: "¿Qué es el subdominio incluido?", a: "Al crear tu tienda recibís automáticamente una URL del tipo tutienda.tiendaapps.com. Es gratis y funciona desde el primer día." },
                { q: "¿Cómo funciona el dominio propio en Tienda Premium?", a: "Comprás tu dominio donde quieras (ej: Namecheap, GoDaddy) y lo conectás desde tu panel. Nosotros hacemos toda la configuración técnica automáticamente. El dominio es tuyo y lo renovás vos directamente, cuesta aproximadamente $9 USD/año." },
                { q: "¿Puedo pasar de Tienda Pro a Tienda Premium?", a: "Sí, podés cambiar de plan en cualquier momento desde tu panel." },
                { q: "¿Qué pasa si supero los 6 afiliados en Tienda Pro?", a: "No podés agregar más afiliados hasta renovar a Tienda Premium. Los afiliados existentes siguen funcionando." },
                { q: "¿Qué pasa cuando vence mi suscripción?", a: "Te avisamos con anticipación. Tenés 4 días de gracia para renovar antes de que se limite el acceso." },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                  <p className="text-sm font-semibold text-gray-900 mb-2">{q}</p>
                  <p className="text-sm text-gray-500">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-12">
            Al suscribirte aceptás nuestros{" "}
            <Link href="/terminos" className="text-gray-500 hover:text-gray-700 underline">Términos y Condiciones</Link>
            {" "}y la{" "}
            <Link href="/privacidad" className="text-gray-500 hover:text-gray-700 underline">Política de Privacidad</Link>.
          </p>
        </div>
      </div>

      <SiteFooter />

      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          billing={payModal.billing}
          onClose={() => setPayModal(null)}
          onSuccess={() => {
            setPayModal(null);
            router.push(payModal.plan === "AFFILIATE" ? "/login?registered=seller" : "/login?registered=true");
          }}
        />
      )}
    </div>
  );
}
