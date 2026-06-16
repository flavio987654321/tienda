"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Check, ShoppingBag, Zap, Store, Star, ArrowRight, PartyPopper, ShoppingCart, Crown, Mail, X, BadgeCheck, Menu } from "lucide-react";
import PaymentModal from "@/components/subscription/PaymentModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function money(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
}

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
  const [mobileMenu, setMobileMenu] = useState(false);
  const pathname = usePathname();
  const [isAnnual, setIsAnnual] = useState(false);
  const [ownerTier, setOwnerTier] = useState<"BASIC" | "PREMIUM">("BASIC");
  const [payModal, setPayModal] = useState<{ plan: "OWNER_BASIC" | "OWNER_PREMIUM" | "AFFILIATE"; billing: "MONTHLY" | "ANNUAL"; amount: number; prorated?: boolean } | null>(null);
  const [userSub, setUserSub] = useState<UserSub | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
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
  }

  useEffect(() => {
    fetchSub();
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.name ?? data.user?.user_metadata?.full_name ?? null;
      setUserName(name);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ownerPrices = {
    BASIC:   { monthly: 20000, annual: 180000 },
    PREMIUM: { monthly: 25000, annual: 225000 },
  };
  const selectedOwner = ownerPrices[ownerTier];
  const ownerMonthlyEquiv = isAnnual ? Math.round(selectedOwner.annual / 12) : selectedOwner.monthly;
  const ownerPrice = isAnnual ? selectedOwner.annual : selectedOwner.monthly;

  // Helpers para saber si el plan mostrado es el plan actual del usuario
  const viewingBilling: "MONTHLY" | "ANNUAL" = isAnnual ? "ANNUAL" : "MONTHLY";
  const isOnAnnual = userSub?.plan === "ANNUAL";

  function isCurrentPlan(cardRole: "OWNER" | "AFFILIATE", cardTier?: "BASIC" | "PREMIUM") {
    if (!userSub) return false;
    if (userSub.role !== cardRole) return false;
    if (cardRole === "OWNER" && userSub.tier !== (cardTier ?? "BASIC")) return false;
    return userSub.plan === viewingBilling;
  }

  function isUpgradeToAnnual(cardRole: "OWNER" | "AFFILIATE", cardTier?: "BASIC" | "PREMIUM") {
    if (!userSub) return false;
    if (userSub.role !== cardRole) return false;
    if (cardRole === "OWNER" && userSub.tier !== (cardTier ?? "BASIC")) return false;
    return userSub.plan === "MONTHLY" && viewingBilling === "ANNUAL" && userSub.status === "ACTIVE";
  }

  function getProratedAmount(plan: "OWNER_BASIC" | "OWNER_PREMIUM" | "AFFILIATE") {
    if (!userSub?.currentPeriodEnd) return ownerPrice;
    const now = Date.now();
    const periodEnd = new Date(userSub.currentPeriodEnd).getTime();
    const daysLeft = Math.max(0, Math.ceil((periodEnd - now) / 86400000));
    const monthlyPrice = plan === "OWNER_PREMIUM" ? 25000 : plan === "OWNER_BASIC" ? 20000 : 15000;
    const annualPrice = plan === "OWNER_PREMIUM" ? 225000 : plan === "OWNER_BASIC" ? 180000 : 135000;
    const credit = Math.round((daysLeft / 30) * monthlyPrice);
    return Math.max(0, annualPrice - credit);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">TiendaApps</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#tiendas" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Tiendas</Link>
            <Link href="/#como-funciona" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Cómo funciona</Link>
            <Link href="/quienes-somos" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Quiénes somos</Link>
            <Link href="/precios" className="text-white text-sm font-semibold transition-colors">Precios</Link>
            <Link href="/seguimiento" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Seguimiento</Link>
            <Link href="/#contacto" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Contacto</Link>
            <div className="flex items-center gap-3 ml-2">
              {userName || userSub ? (
                <>
                  <span className="text-gray-300 text-sm">Hola, {userName?.split(" ")[0] ?? "usuario"}</span>
                  <Link
                    href={userSub?.role === "AFFILIATE" ? "/afiliados" : "/dashboard"}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                  >
                    Mi panel
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/25 transition-all">
                    Iniciar sesión
                  </Link>
                  <Link href="/registro" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </div>

          <button onClick={() => setMobileMenu(true)} className="md:hidden text-gray-400 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}
      {/* Mobile menu drawer (slide from right) */}
      <div className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-gray-950 border-l border-white/10 transition-transform duration-300 ease-in-out md:hidden flex flex-col ${mobileMenu ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <span className="text-white font-bold">Menú</span>
          <button onClick={() => setMobileMenu(false)} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-1 px-4 py-4 flex-1">
          {[
            { href: "/", label: "Inicio" },
            { href: "/#como-funciona", label: "Cómo funciona" },
            { href: "/tiendas", label: "Tiendas" },
            { href: "/quienes-somos", label: "Quiénes somos" },
            { href: "/precios", label: "Precios" },
          ].map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href.replace("#", "").split("#")[0]) && href.includes("#") === false && href !== "/";
            const active = href === "/precios" ? pathname === "/precios" : href === "/quienes-somos" ? pathname === "/quienes-somos" : href === "/tiendas" ? pathname === "/tiendas" : false;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenu(false)}
                className={`flex items-center gap-2 py-3 px-3 rounded-xl transition-all text-sm font-medium ${active ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-gray-300 hover:text-white hover:bg-white/5"}`}
              >
                {active && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
                {label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2 mt-2">
            <Link href="/login" onClick={() => setMobileMenu(false)} className="block text-center border border-white/10 rounded-xl py-3 text-sm text-white hover:bg-white/5 transition-colors">Iniciar sesión</Link>
            <Link href="/registro" onClick={() => setMobileMenu(false)} className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-3 rounded-xl transition-colors">Crear cuenta</Link>
          </div>
        </div>
      </div>

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Banner post-registro */}
          {isRegistered && (
            <div className="mb-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <PartyPopper className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-400 font-bold text-sm">¡Cuenta creada con éxito!</p>
                <p className="text-emerald-300/70 text-xs mt-0.5">
                  Tu período de prueba de <strong>7 días gratis</strong> ya está activo.
                  Elegí un plan o empezá a explorar la plataforma.
                </p>
              </div>
              <Link
                href={role === "owner" ? "/login?registered=true" : "/login?registered=seller"}
                className="ml-auto shrink-0 text-xs text-emerald-400 hover:text-emerald-300 underline whitespace-nowrap"
              >
                Ir al panel →
              </Link>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-400 text-sm font-medium mb-6">
              <Star className="h-3.5 w-3.5" />
              7 días de prueba gratis, sin tarjeta
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-4">
              Planes simples,<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">resultados reales</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Empezá gratis 7 días. Sin tarjeta de crédito. Cancelá cuando quieras.
            </p>
          </div>

          {/* Toggle mensual/anual */}
          <div className="flex flex-col items-center gap-3 mb-12">
            <div className="inline-flex rounded-2xl border border-white/10 bg-gray-900/60 p-1 gap-1">
              <button
                onClick={() => !isOnAnnual && setIsAnnual(false)}
                disabled={isOnAnnual}
                title={isOnAnnual ? "Estás en un plan anual. Al vencer podés elegir mensual." : undefined}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isOnAnnual
                    ? "text-gray-700 cursor-not-allowed"
                    : !isAnnual ? "bg-white text-gray-900 shadow" : "text-gray-400 hover:text-white"
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? "bg-white text-gray-900 shadow" : "text-gray-400 hover:text-white"}`}
              >
                Anual
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isAnnual ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-400"}`}>
                  -25%
                </span>
              </button>
            </div>
            {isOnAnnual ? (
              <span className="text-gray-600 text-xs">Estás en plan anual · Al vencer podés cambiarte a mensual</span>
            ) : (
              <span className="text-emerald-400 text-xs font-semibold">3 meses gratis pagando anual</span>
            )}
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* ── AFILIADO ── */}
            <div className="rounded-3xl border border-violet-500/30 bg-gray-900/50 p-8 flex flex-col">
              <div className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Para vendedores independientes</div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-5 shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Afiliado</h2>
              <p className="text-gray-400 text-sm mb-6">Vendé productos de otras tiendas y ganá comisiones sin tener stock.</p>

              <div className="mb-2">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-white">{money(isAnnual ? Math.round(135000 / 12) : 15000)}</span>
                  <span className="text-gray-400 text-sm mb-1.5">/mes</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-gray-500 mt-1">
                    {money(135000)} facturado anualmente
                    <span className="ml-2 text-emerald-400 font-semibold">Ahorrás {money(15000 * 12 - 135000)}</span>
                  </p>
                )}
              </div>

              <div className="h-px bg-white/5 my-6" />

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  { icon: Store, text: "Acceso a todas las tiendas" },
                  { icon: Zap, text: "Link de afiliado con tracking en tiempo real" },
                  { icon: ShoppingBag, text: "Billetera digital para cobrar comisiones" },
                  { icon: Star, text: "Panel de ventas y estadísticas" },
                  { icon: Crown, text: "Premios por volumen de ventas" },
                  { icon: Mail, text: "Soporte por email" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>

              {isCurrentPlan("AFFILIATE") ? (
                <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <BadgeCheck className="h-4 w-4" /> Tu plan actual
                </div>
              ) : isUpgradeToAnnual("AFFILIATE") ? (
                <button
                  onClick={() => {
                    const proratedAmt = getProratedAmount("AFFILIATE");
                    setPayModal({ plan: "AFFILIATE", billing: "ANNUAL", amount: proratedAmt, prorated: true });
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg"
                >
                  Cambiar a anual <ArrowRight className="h-4 w-4" />
                </button>
              ) : isRegistered ? (
                <button
                  onClick={() => setPayModal({ plan: "AFFILIATE", billing: isAnnual ? "ANNUAL" : "MONTHLY", amount: isAnnual ? 135000 : 15000 })}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg"
                >
                  Suscribirme ahora <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  href={`/registro?plan=seller&billing=${isAnnual ? "annual" : "monthly"}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg"
                >
                  Empezar prueba gratis <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <p className="text-center text-xs text-gray-600 mt-3">
                {isCurrentPlan("AFFILIATE") ? `${userSub!.daysLeft} días restantes` : "7 días gratis · Sin tarjeta · Cancelá cuando quieras"}
              </p>
            </div>

            {/* ── DUEÑO DE TIENDA (con selector interno) ── */}
            <div className="rounded-3xl border border-indigo-500/30 bg-gray-900/50 p-8 flex flex-col ring-1 ring-indigo-500/40 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/30">
                  Más popular
                </span>
              </div>

              <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Para dueños de tienda</div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center mb-5 shadow-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Dueño de Tienda</h2>
              <p className="text-gray-400 text-sm mb-5">Creá tu tienda online y gestioná afiliados que vendan por vos.</p>

              {/* Selector de tier */}
              <div className="flex rounded-xl border border-white/10 bg-gray-800/60 p-1 gap-1 mb-5">
                <button
                  onClick={() => setOwnerTier("BASIC")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${ownerTier === "BASIC" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
                >
                  Tienda Pro
                </button>
                <button
                  onClick={() => setOwnerTier("PREMIUM")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${ownerTier === "PREMIUM" ? "bg-amber-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
                >
                  <Crown className="h-3.5 w-3.5" /> Tienda Premium
                </button>
              </div>

              <div className="mb-2">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-white">{money(ownerMonthlyEquiv)}</span>
                  <span className="text-gray-400 text-sm mb-1.5">/mes</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-gray-500 mt-1">
                    {money(ownerPrice)} facturado anualmente
                    <span className="ml-2 text-emerald-400 font-semibold">
                      Ahorrás {money(selectedOwner.monthly * 12 - selectedOwner.annual)}
                    </span>
                  </p>
                )}
              </div>

              <div className="h-px bg-white/5 my-5" />

              {/* Features dinámicas según tier */}
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  { text: "Tienda con subdominio incluido", both: true },
                  { text: "Productos y variantes ilimitados", both: true },
                  { text: "Panel de pedidos y estadísticas", both: true },
                  { text: `Hasta 6 afiliados`, both: false, basic: true, premiumText: "Afiliados ilimitados" },
                  { text: `Hasta 10 cupones activos`, both: false, basic: true, premiumText: "Cupones ilimitados" },
                  { text: "Tienda instalable como app (PWA)", both: false, basic: false, premiumOnly: true },
                  { text: "Notificaciones push a visitantes (2 por semana)", both: false, basic: false, premiumOnly: true },
                  { text: "Conectá tu dominio propio (lo configuramos nosotros)", both: false, basic: false, premiumOnly: true },
                  { text: "Flyer de publicidad al entrar a la tienda", both: false, basic: false, premiumOnly: true },
                  { text: "Soporte por email", both: false, basic: true, premiumText: "Soporte prioritario" },
                ].map((f, i) => {
                  if (f.both) {
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        {f.text}
                      </li>
                    );
                  }
                  if (f.premiumOnly) {
                    return ownerTier === "PREMIUM" ? (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-amber-300">
                        <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        {f.text}
                      </li>
                    ) : (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <X className="h-4 w-4 text-gray-700 shrink-0 mt-0.5" />
                        {f.text}
                      </li>
                    );
                  }
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${ownerTier === "PREMIUM" ? "text-amber-400" : "text-indigo-400"}`} />
                      {ownerTier === "PREMIUM" && f.premiumText ? f.premiumText : f.text}
                    </li>
                  );
                })}
              </ul>

              {(() => {
                const planKey = ownerTier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC";
                const cardTier = ownerTier;
                const btnClass = ownerTier === "PREMIUM"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600"
                  : "bg-gradient-to-r from-indigo-600 to-cyan-600";

                if (isCurrentPlan("OWNER", cardTier)) {
                  return (
                    <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <BadgeCheck className="h-4 w-4" /> Tu plan actual
                    </div>
                  );
                }
                if (isUpgradeToAnnual("OWNER", cardTier)) {
                  const proratedAmt = getProratedAmount(planKey);
                  const credit = ownerPrice - proratedAmt;
                  return (
                    <>
                      {credit > 0 && (
                        <p className="text-xs text-emerald-400 text-center mb-2">
                          Pagás {money(proratedAmt)} (descontamos {money(credit)} por los días restantes del mes)
                        </p>
                      )}
                      <button
                        onClick={() => setPayModal({ plan: planKey, billing: "ANNUAL", amount: proratedAmt, prorated: true })}
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
                      onClick={() => setPayModal({ plan: planKey, billing: isAnnual ? "ANNUAL" : "MONTHLY", amount: ownerPrice })}
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
              <p className="text-center text-xs text-gray-600 mt-3">
                {isCurrentPlan("OWNER", ownerTier) ? `${userSub!.daysLeft} días restantes` : "7 días gratis · Sin tarjeta · Cancelá cuando quieras"}
              </p>
            </div>

            {/* ── CLIENTE ── */}
            <div className="rounded-3xl border border-gray-700/40 bg-gray-900/20 p-8 flex flex-col opacity-80 md:col-span-2 md:w-1/2 md:mx-auto lg:col-span-1 lg:w-auto lg:mx-0">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Para compradores</div>
              <div className="w-12 h-12 rounded-2xl bg-gray-700/40 flex items-center justify-center mb-5">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <h2 className="text-2xl font-black text-gray-300 mb-1">Cliente</h2>
              <p className="text-gray-500 text-sm mb-6">Explorá tiendas, comprá y seguí tus pedidos sin costo.</p>

              <div className="mb-2">
                <span className="text-4xl font-black text-gray-300">Gratis</span>
                <p className="text-xs text-gray-600 mt-1">Sin suscripción · Siempre gratis</p>
              </div>

              <div className="h-px bg-white/5 my-6" />

              <ul className="space-y-3 mb-8 flex-1">
                {["Acceso a todas las tiendas", "Historial de pedidos", "Favoritos sincronizados", "Checkout más rápido", "Seguimiento de envíos"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-500">
                    <Check className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/registro?plan=buyer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-gray-700/50 hover:bg-gray-700/80 text-gray-300 border border-gray-600/40 transition-all"
              >
                Crear cuenta gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-center text-xs text-gray-700 mt-3">Sin tarjeta · Sin límite de tiempo</p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-8">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {[
                { q: "¿Necesito tarjeta de crédito para el período de prueba?", a: "No. Los 7 días de prueba son completamente gratis y no te pedimos datos de pago hasta que decides suscribirte." },
                { q: "¿Qué es el subdominio incluido?", a: "Al crear tu tienda recibís automáticamente una URL del tipo tutienda.tiendaapps.com. Es gratis y funciona desde el primer día." },
                { q: "¿Cómo funciona el dominio propio en Tienda Premium?", a: "Comprás tu dominio donde quieras (ej: Namecheap, GoDaddy) y lo conectás desde tu panel. Nosotros hacemos toda la configuración técnica automáticamente. El dominio es tuyo y lo renovás vos directamente, cuesta aproximadamente $9 USD/año." },
                { q: "¿Puedo pasar de Tienda Pro a Tienda Premium?", a: "Sí, podés cambiar de plan en cualquier momento desde tu panel." },
                { q: "¿Qué pasa si supero los 6 afiliados en Tienda Pro?", a: "No podés agregar más afiliados hasta renovar a Tienda Premium. Los afiliados existentes siguen funcionando." },
                { q: "¿Qué pasa cuando vence mi suscripción?", a: "Te avisamos con anticipación. Tenés 4 días de gracia para renovar antes de que se limite el acceso." },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-white/5 bg-gray-900/30 p-5">
                  <p className="text-sm font-semibold text-white mb-2">{q}</p>
                  <p className="text-sm text-gray-400">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-600 mt-12">
            Al suscribirte aceptás nuestros{" "}
            <Link href="/terminos" className="text-gray-500 hover:text-gray-400 underline">Términos y Condiciones</Link>
            {" "}y la{" "}
            <Link href="/privacidad" className="text-gray-500 hover:text-gray-400 underline">Política de Privacidad</Link>.
          </p>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          billing={payModal.billing}
          amount={payModal.amount}
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
