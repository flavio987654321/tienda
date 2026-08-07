"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { useTurnstile } from "@/components/Turnstile";
import { isPwa } from "@/lib/pwa";
import { PRICES as PLAN_PRICES, PRO_MAX_AFFILIATES, PRO_MAX_ACTIVE_COUPONS, PRO_MAX_PRODUCTS } from "@/lib/planLimits";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2, Eye, EyeOff, ArrowRight,
  Store, Users, CheckCircle, ShoppingCart, Zap,
} from "lucide-react";

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroContent />
    </Suspense>
  );
}

type AccountType = "owner" | "seller" | "buyer";

// El plan de vendedor/a (seller) es gratuito, por eso no tiene precios acá.
// Los números salen de lib/subscription, que es de donde los toma el cobro: acá
// estaban copiados, así que cambiar un precio obligaba a acordarse de este archivo.
const PRICES = {
  owner: {
    BASIC:   PLAN_PRICES.OWNER_BASIC,
    PREMIUM: PLAN_PRICES.OWNER_PREMIUM,
  },
};

const TYPES = [
  {
    key: "owner" as AccountType,
    icon: Store,
    color: "orange",
    title: "Tengo una tienda",
    desc: "Creá tu tienda online y gestioná afiliados que vendan por vos.",
    perks: [
      "Tienda con subdominio incluido",
      `Hasta ${PRO_MAX_PRODUCTS.toLocaleString("es-AR")} productos, con variantes ilimitadas`,
      "Panel de pedidos y estadísticas",
      "Cupones de descuento",
      "Sistema de afiliados y comisiones automáticas",
      "Soporte por email",
    ],
    premiumPerks: [
      "App instalable en el celular (PWA)",
      "Conectá tu dominio propio",
      "Afiliados y cupones ilimitados",
      "Flyer de publicidad al entrar a la tienda",
      "Soporte prioritario",
    ],
    cta: "Crear mi tienda",
  },
  {
    key: "seller" as AccountType,
    icon: Users,
    color: "amber",
    title: "Soy vendedor/a",
    desc: "Vendé productos de otras tiendas y ganá comisiones sin tener stock.",
    perks: [
      "Sin inversión inicial requerida",
      "Acceso a todas las tiendas activas",
      "Link de afiliado con tracking en tiempo real",
      "Panel de comisiones para cobrar",
      "Panel de ventas y estadísticas",
      "Premios por volumen de ventas",
    ],
    cta: "Postularme",
  },
  {
    key: "buyer" as AccountType,
    icon: ShoppingCart,
    color: "rose",
    title: "Soy cliente",
    desc: "Explorá tiendas, guardá tus favoritos y seguí el estado de tus pedidos.",
    perks: [
      "Acceso a todas las tiendas",
      "Historial de pedidos y seguimiento",
      "Favoritos sincronizados en todos tus dispositivos",
      "Checkout más rápido con datos guardados",
      "Calificá los productos que compraste",
    ],
    cta: "Crear mi cuenta",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; ring: string; text: string; btn: string; check: string; iconBg: string }> = {
  orange: {
    bg: "bg-orange-50 hover:bg-orange-100/70",
    border: "border-orange-200",
    ring: "ring-orange-500",
    text: "text-orange-600",
    btn: "bg-orange-600 hover:bg-orange-500 shadow-orange-500/25 hover:shadow-orange-500/40",
    check: "text-orange-500",
    iconBg: "bg-orange-100",
  },
  amber: {
    bg: "bg-amber-50 hover:bg-amber-100/70",
    border: "border-amber-200",
    ring: "ring-amber-500",
    text: "text-amber-600",
    btn: "bg-amber-500 hover:bg-amber-400 shadow-amber-500/25 hover:shadow-amber-500/40",
    check: "text-amber-500",
    iconBg: "bg-amber-100",
  },
  rose: {
    bg: "bg-rose-50 hover:bg-rose-100/70",
    border: "border-rose-200",
    ring: "ring-rose-500",
    text: "text-rose-600",
    btn: "bg-rose-600 hover:bg-rose-500 shadow-rose-500/25 hover:shadow-rose-500/40",
    check: "text-rose-500",
    iconBg: "bg-rose-100",
  },
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function validate(form: { name: string; email: string; password: string; storeName: string; phone: string }, accountType: AccountType) {
  if (!form.name.trim() || form.name.trim().length < 2)
    return "El nombre debe tener al menos 2 caracteres.";
  if (/\d/.test(form.name))
    return "El nombre no puede contener números.";
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    return "Ingresá un email válido.";
  if (!form.password || form.password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres.";
  if (accountType === "owner") {
    if (!form.storeName.trim() || form.storeName.trim().length < 3)
      return "El nombre de tu tienda debe tener al menos 3 caracteres.";
  }
  const phoneDigits = form.phone.replace(/\D/g, "");
  if (!form.phone.trim() || phoneDigits.length < 8 || phoneDigits.length > 15)
    return "Ingresá un teléfono válido (mínimo 8 dígitos).";
  return null;
}

function RegistroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isPwa()) router.replace("/login");
  }, [router]);

  // Pre-select from URL: /registro?plan=owner&billing=annual
  // Map "affiliate" → "seller" (used by /precios legacy param)
  const rawPlan = searchParams.get("plan");
  const planParam: AccountType | null =
    rawPlan === "affiliate" ? "seller" :
    rawPlan === "owner" ? "owner" :
    rawPlan === "buyer" ? "buyer" :
    rawPlan === "seller" ? "seller" :
    null;
  const billingParam = searchParams.get("billing");
  const rawRedirect = searchParams.get("redirect");
  const redirectParam = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : null;

  const rawTier = searchParams.get("tier");
  const tierParam: "BASIC" | "PREMIUM" = rawTier === "premium" || rawTier === "PREMIUM" ? "PREMIUM" : "BASIC";

  const [step, setStep] = useState<"type" | "form">(planParam ? "form" : "type");
  const [accountType, setAccountType] = useState<AccountType>(planParam ?? "owner");
  const [ownerTier, setOwnerTier] = useState<"BASIC" | "PREMIUM">(tierParam);
  const [billing, setBilling] = useState<"MONTHLY" | "ANNUAL">(
    billingParam === "annual" ? "ANNUAL" : "MONTHLY"
  );
  const [form, setForm] = useState({ name: "", email: "", password: "", storeName: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "", storeName: "", phone: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [step1Tier, setStep1Tier] = useState<"BASIC" | "PREMIUM">("BASIC");
  const captcha = useTurnstile("registro");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError("");
    if (fieldErrors[name as keyof typeof fieldErrors])
      setFieldErrors((p) => ({ ...p, [name]: "" }));
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    let err = "";
    if (name === "name" && value) {
      if (value.trim().length < 2) err = "Mínimo 2 caracteres.";
      else if (/\d/.test(value)) err = "No puede contener números.";
    }
    if (name === "email" && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = "Email inválido.";
    }
    if (name === "password" && value) {
      if (value.length < 6) err = "Mínimo 6 caracteres.";
    }
    if (name === "storeName" && value && accountType === "owner") {
      if (value.trim().length < 3) err = "Mínimo 3 caracteres.";
    }
    if (name === "phone" && value) {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 8) err = "Mínimo 8 dígitos.";
    }
    setFieldErrors((p) => ({ ...p, [name]: err }));
  }

  function selectType(t: AccountType) {
    setAccountType(t);
    if (t === "owner") setOwnerTier(step1Tier);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(form, accountType);
    if (err) { setError(err); return; }
    if (!ageConfirmed) {
      setError("Debés confirmar que tenés 18 años o más para registrarte.");
      return;
    }
    if (!termsAccepted) {
      setError("Debés aceptar los términos y condiciones para continuar.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, accountType, billing, tier: ownerTier, phone: form.phone.trim(), termsAccepted, ageConfirmed, turnstileToken: captcha.token }),
    });
    const data = await res.json();
    captcha.reset();
    if (!res.ok) {
      setError(data.error || "Error al registrarse");
      setLoading(false);
      return;
    }
    setRedirecting(true);
    if (accountType === "buyer") {
      router.push(`/login?registered=buyer${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ""}`);
    } else if (accountType === "seller") {
      router.push(`/login?registered=seller`);
    } else {
      router.push(`/login?registered=true`);
    }
  }

  if (redirecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const selected = TYPES.find((t) => t.key === accountType)!;
  const colors = COLOR_MAP[selected.color];
  const hasPlan = accountType === "owner"; // El plan de vendedor/a (seller) es gratuito, no tiene selector de precio
  const planPrices = hasPlan ? PRICES.owner[ownerTier] : null;

  const LEFT_PANEL: Record<AccountType, { gradient: string; headline: string; sub: string }> = {
    owner: {
      gradient: "from-orange-600 via-orange-600 to-rose-600",
      headline: "Tu tienda te\nestá esperando",
      sub: "Gestioná productos, pedidos y afiliados desde un panel simple y potente.",
    },
    seller: {
      gradient: "from-amber-500 via-orange-500 to-rose-500",
      headline: "Vendé sin\ninvertir nada",
      sub: "Elegí tiendas, compartí tu link y cobrá comisiones automáticas por cada venta.",
    },
    buyer: {
      gradient: "from-rose-500 via-orange-500 to-amber-500",
      headline: "Todo lo que\nquerés, en un lugar",
      sub: "Explorá tiendas, guardá favoritos y seguí tus pedidos desde cualquier dispositivo.",
    },
  };

  const panel = LEFT_PANEL[accountType];

  /* ── STEP 2: split layout ── */
  if (step === "form") {
    return (
      <div className="min-h-screen bg-white flex">
        <style>{`
          .grid-bg { background-image: linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px); background-size: 48px 48px; }
        `}</style>

        {/* LEFT PANEL */}
        <div className={`hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-gradient-to-br ${panel.gradient} p-12 relative overflow-hidden`}>
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-16 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <Link href="/" className="relative flex items-center gap-2.5">
            <AppLogo size={72} />
            <span className="text-xl font-bold text-white">TiendaApps</span>
          </Link>

          <div className="relative space-y-7">
            <div>
              <h2 className="text-4xl font-black text-white leading-tight mb-3 whitespace-pre-line">
                {panel.headline}
              </h2>
              <p className="text-white/80 leading-relaxed">{panel.sub}</p>
            </div>
            <ul className="space-y-3.5">
              {selected.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-sm text-white/85">
                  <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                  {perk}
                </li>
              ))}
              {"premiumPerks" in selected && selected.premiumPerks?.map((perk) => (
                <li key={perk} className={`flex items-center gap-3 text-sm transition-colors ${ownerTier === "PREMIUM" ? "text-amber-200" : "text-white/30"}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${ownerTier === "PREMIUM" ? "bg-amber-400/25" : "bg-white/10"}`}>
                    <CheckCircle className={`h-3.5 w-3.5 transition-colors ${ownerTier === "PREMIUM" ? "text-amber-200" : "text-white/25"}`} />
                  </div>
                  {perk}
                </li>
              ))}
            </ul>

            {/* Plan preview en panel lateral */}
            {hasPlan && planPrices && (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                <p className="text-xs text-white/70 font-medium mb-2">Plan seleccionado</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-white" />
                    <span className="text-white font-bold text-sm">
                      {accountType === "owner"
                        ? ownerTier === "PREMIUM" ? "Tienda Premium" : "Tienda Pro"
                        : billing === "ANNUAL" ? "Anual" : "Mensual"}
                    </span>
                  </div>
                  <span className="text-white font-black">
                    {billing === "ANNUAL"
                      ? `${money(Math.round(planPrices.ANNUAL / 12))}/mes`
                      : `${money(planPrices.MONTHLY)}/mes`}
                  </span>
                </div>
                {billing === "ANNUAL" && (
                  <p className="text-xs text-white/90 mt-1 font-medium">
                    {money(planPrices.ANNUAL)}/año · Ahorrás {money(planPrices.MONTHLY * 12 - planPrices.ANNUAL)}
                  </p>
                )}
                <p className="text-xs text-white/60 mt-1.5">7 días gratis · Sin tarjeta</p>
              </div>
            )}
          </div>

          <p className="relative text-white/50 text-xs">© 2026 TiendaApps · Argentina</p>
        </div>

        {/* RIGHT PANEL — form */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full max-w-md"
          >
            {/* Mobile logo */}
            <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
              <AppLogo size={72} />
              <span className="text-xl font-bold text-gray-950">TiendaApps</span>
            </Link>

            {/* Tipo + cambiar */}
            <div className="flex items-center justify-between mb-8">
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${colors.border} ${colors.bg}`}>
                <selected.icon className={`h-4 w-4 ${colors.text}`} />
                <span className={`text-sm font-semibold ${colors.text}`}>{selected.title}</span>
              </div>
              <button
                type="button"
                onClick={() => { setStep("type"); setError(""); }}
                className="text-xs text-gray-500 hover:text-gray-800 transition-colors underline underline-offset-2"
              >
                Cambiar
              </button>
            </div>

            <h1 className="text-4xl font-black text-gray-950 mb-2">Completá tus datos</h1>
            <p className="text-gray-600 mb-8 text-sm">
              {accountType === "owner"
                ? "Tu tienda estará lista en segundos."
                : accountType === "seller"
                ? "Te mandamos al panel de vendedor."
                : "Empezá a explorar tiendas ya."}
            </p>

            {/* Plan toggle — solo para owner y seller */}
            {hasPlan && planPrices && (
              <div className="mb-7 space-y-3">

                {/* Selector de tier — solo para dueños */}
                {accountType === "owner" && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-2">Elegí tu plan de tienda</p>
                    <div className="inline-flex w-full rounded-2xl border border-gray-200 bg-gray-50 p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setOwnerTier("BASIC")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          ownerTier === "BASIC"
                            ? "bg-white text-gray-900 shadow"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Tienda Pro
                      </button>
                      <button
                        type="button"
                        onClick={() => setOwnerTier("PREMIUM")}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                          ownerTier === "PREMIUM"
                            ? "bg-white text-gray-900 shadow"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Tienda Premium
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${ownerTier === "PREMIUM" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"}`}>
                          ★
                        </span>
                      </button>
                    </div>
                    {ownerTier === "BASIC" ? (
                      <p className="text-xs text-gray-400 mt-1.5">{PRO_MAX_AFFILIATES} afiliados · {PRO_MAX_ACTIVE_COUPONS} cupones · Dominio propio no incluido</p>
                    ) : (
                      <p className="text-xs text-amber-700/80 mt-1.5">Afiliados y cupones ilimitados · Dominio propio · App instalable · Flyer publicitario</p>
                    )}
                  </div>
                )}

                {/* Selector de facturación */}
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-2">Facturación</p>
                  <div className="inline-flex w-full rounded-2xl border border-gray-200 bg-gray-50 p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setBilling("MONTHLY")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        billing === "MONTHLY"
                          ? "bg-white text-gray-900 shadow"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Mensual
                    </button>
                    <button
                      type="button"
                      onClick={() => setBilling("ANNUAL")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        billing === "ANNUAL"
                          ? "bg-white text-gray-900 shadow"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      Anual
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${billing === "ANNUAL" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700"}`}>
                        -25%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Precio según selección */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-gray-950 font-black text-xl">
                      {money(billing === "ANNUAL" ? Math.round(planPrices.ANNUAL / 12) : planPrices.MONTHLY)}
                      <span className="text-gray-500 text-sm font-normal">/mes</span>
                    </p>
                    {billing === "ANNUAL" && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {money(planPrices.ANNUAL)}/año
                        <span className="ml-2 text-teal-600 font-semibold">Ahorrás {money(planPrices.MONTHLY * 12 - planPrices.ANNUAL)}</span>
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">7 días gratis</span>
                </div>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3.5 rounded-2xl text-sm mb-6"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                <input
                  type="text" name="name" value={form.name} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Ej: María García"
                  className={`w-full bg-white border rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-gray-400 transition-all ${fieldErrors.name ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.name
                  ? <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                  : <p className="text-xs text-gray-500 mt-1">Solo letras, mínimo 2 caracteres.</p>
                }
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                <input
                  type="tel" name="phone" value={form.phone} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Ej: 11 4567-8901"
                  className={`w-full bg-white border rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-gray-400 transition-all ${fieldErrors.phone ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.phone
                  ? <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                  : <p className="text-xs text-gray-500 mt-1">Con código de área, sin el 0. Ej: 11 4567-8901</p>
                }
              </div>

              {accountType === "owner" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de tu tienda</label>
                  <input
                    type="text" name="storeName" value={form.storeName} onChange={handleChange} onBlur={handleBlur}
                    placeholder="Ej: Joyas María, Luna Moda..."
                    className={`w-full bg-white border rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-gray-400 transition-all ${fieldErrors.storeName ? "border-red-400" : "border-gray-300"}`}
                  />
                  {fieldErrors.storeName
                    ? <p className="text-xs text-red-500 mt-1">{fieldErrors.storeName}</p>
                    : <p className="text-xs text-gray-500 mt-1">
                        Tu tienda quedará en{" "}
                        <span className="text-gray-500">
                          {form.storeName
                            ? form.storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "tu-tienda"
                            : "tu-tienda"}
                        </span>
                        .tiendaapps.com
                      </p>
                  }
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange} onBlur={handleBlur}
                  placeholder="tu@email.com"
                  className={`w-full bg-white border rounded-2xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-gray-400 transition-all ${fieldErrors.email ? "border-red-400" : "border-gray-300"}`}
                />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} onBlur={handleBlur}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full bg-gray-50 border rounded-2xl px-4 py-3.5 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${colors.ring} text-sm hover:border-gray-300 transition-all ${fieldErrors.password ? "border-red-400" : "border-gray-300"}`}
                  />
                  <button
                    type="button" onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password
                  ? <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
                  : <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres.</p>
                }
              </div>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => { setAgeConfirmed(e.target.checked); setError(""); }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 bg-white accent-orange-600 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                    Confirmo que tengo <span className="text-gray-700 font-semibold">18 años o más</span>. Entiendo que el uso de esta plataforma está reservado para mayores de edad.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => { setTermsAccepted(e.target.checked); setError(""); }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 bg-white accent-orange-600 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                    Leí y acepto los{" "}
                    <Link
                      href={`/terminos?role=${accountType === "seller" ? "seller" : accountType === "owner" ? "owner" : "buyer"}`}
                      className="text-gray-600 underline hover:text-gray-900 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      términos y condiciones
                    </Link>
                    {" "}y la{" "}
                    <Link
                      href={`/privacidad?role=${accountType === "seller" ? "seller" : accountType === "owner" ? "owner" : "buyer"}`}
                      className="text-gray-600 underline hover:text-gray-900 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      política de privacidad
                    </Link>
                    . Entiendo que mis datos serán tratados conforme a la Ley 25.326.
                  </span>
                </label>
              </div>

              {captcha.widget}

              <button
                type="submit"
                disabled={loading || !ageConfirmed || !termsAccepted || !captcha.ready}
                className={`w-full text-white py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] disabled:hover:scale-100 ${colors.btn}`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Creando cuenta..." : selected.cta}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-7">
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="text-orange-600 font-bold hover:text-orange-700 transition-colors">
                Iniciar sesión →
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── STEP 1: elegí tu tipo ── */
  return (
    // `overflow-hidden` porque los dos globos decorativos de abajo se salen a
    // propósito del borde (`-left-32` y `-right-32`, o sea 128 px afuera). El de
    // la derecha es el que suma ancho a la página. Es la misma convención que ya
    // usan las secciones con globos de quienes-somos y de afiliados en el home;
    // acá se había pasado por alto.
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      <style>{`
        .grid-bg { background-image: linear-gradient(rgba(249,115,22,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,.05) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-5xl">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <AppLogo size={72} />
            <span className="text-2xl font-black text-gray-950">TiendaApps</span>
          </Link>
          <h1 className="text-4xl font-black text-gray-950 mb-3">Crear cuenta gratis</h1>
          <p className="text-gray-500 text-lg">¿Cómo querés usar TiendaApps?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TYPES.map(({ key, icon: Icon, color, title, desc, perks, cta, ...rest }) => {
            const premiumPerks = "premiumPerks" in rest ? (rest as { premiumPerks: string[] }).premiumPerks : undefined;
            const c = COLOR_MAP[color];
            return (
              // La tarjeta NO puede ser un <button>: adentro tiene los dos botones
              // de plan (Tienda Pro / Premium) y el HTML no permite un botón dentro
              // de otro. El navegador "arregla" el marcado por su cuenta al parsear,
              // le queda distinto al que renderiza React en el servidor, y eso es el
              // error de hidratación. Div con rol de botón: mismo comportamiento,
              // incluido el teclado, sin anidar.
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => selectType(key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectType(key); }
                }}
                className={`group text-left flex flex-col cursor-pointer ${c.bg} border ${c.border} rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] shadow-sm`}
              >
                <div className={`w-12 h-12 ${c.iconBg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${c.text}`} />
                </div>
                <h3 className="text-lg font-black text-gray-950 mb-1.5">{title}</h3>
                <p className="text-gray-500 text-xs mb-4 leading-relaxed">{desc}</p>
                <ul className="space-y-1.5 mb-4">
                  {perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle className={`h-3.5 w-3.5 ${c.check} flex-shrink-0 mt-0.5`} />
                      {p}
                    </li>
                  ))}
                  {premiumPerks?.map((p) => (
                    <li key={p} className={`flex items-start gap-2 text-xs transition-colors ${key === "owner" && step1Tier === "PREMIUM" ? "text-amber-700" : "text-gray-400"}`}>
                      <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 transition-colors ${key === "owner" && step1Tier === "PREMIUM" ? "text-amber-600" : "text-gray-300"}`} />
                      {p}
                    </li>
                  ))}
                </ul>

                {key === "owner" && (
                  <div className="flex gap-1.5 mb-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setStep1Tier("BASIC")}
                      className={`flex-1 rounded-xl border p-2.5 text-left transition-all ${
                        step1Tier === "BASIC"
                          ? "border-orange-400 bg-orange-100"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <p className="text-[11px] font-bold text-gray-900">Tienda Pro</p>
                      <p className={`text-[11px] font-black ${step1Tier === "BASIC" ? "text-orange-600" : "text-gray-400"}`}>
                        {money(PRICES.owner.BASIC.MONTHLY)}/mes
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep1Tier("PREMIUM")}
                      className={`flex-1 rounded-xl border p-2.5 text-left transition-all ${
                        step1Tier === "PREMIUM"
                          ? "border-amber-400 bg-amber-100"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <p className="text-[11px] font-bold text-gray-900">Premium ★</p>
                      <p className={`text-[11px] font-black ${step1Tier === "PREMIUM" ? "text-amber-700" : "text-gray-400"}`}>
                        {money(PRICES.owner.PREMIUM.MONTHLY)}/mes
                      </p>
                    </button>
                  </div>
                )}

                <div className="mt-auto">
                  {key !== "buyer" && (
                    <p className="text-xs text-gray-400 mb-3">
                      {key === "owner"
                        ? `${money(PRICES.owner[step1Tier].MONTHLY)}/mes · 7 días gratis`
                        : "Gratis · Sin tarjeta · Sin límite de tiempo"}
                    </p>
                  )}
                  <div className={`flex items-center gap-2 text-sm ${c.text} font-semibold group-hover:gap-3 transition-all`}>
                    {cta} <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-orange-600 font-bold hover:text-orange-700 transition-colors">
            Iniciar sesión →
          </Link>
        </p>
      </div>
    </div>
  );
}
