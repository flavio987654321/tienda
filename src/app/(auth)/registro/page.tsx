"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { useTurnstile } from "@/components/Turnstile";
import { validarContrasena, LARGO_MINIMO } from "@/lib/password-policy";
import { isPwa } from "@/lib/pwa";
import { trackEvent } from "@/lib/meta-pixel";
import { PRICES as PLAN_PRICES, PRO_MAX_AFFILIATES, PRO_MAX_ACTIVE_COUPONS, PRO_MAX_PRODUCTS, PRECIOS_DIGITALES, COMISION_DIGITAL, DIGITALES_ABIERTO } from "@/lib/planLimits";
import { featuresDigital, COPY_DIGITAL, TIERS_DIGITALES, type TierDigital } from "@/lib/planes-digitales";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2, Eye, EyeOff, ArrowRight, ArrowLeft,
  Store, Users, CheckCircle, ShoppingCart, Zap, Download, Sparkles,
} from "lucide-react";

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroContent />
    </Suspense>
  );
}

type AccountType = "owner" | "seller" | "buyer" | "digital";

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
  /* La cuarta: Productos Digitales.

     Se dice "páginas de venta" y nunca "tiendas" — la competencia vende una
     tienda por subdominio y nosotros vendemos productos con su página.

     Comparte el naranja y el ícono con la tarjeta de /precios a propósito: es el
     mismo producto visto dos veces, y quien viene de ahí tiene que reconocerlo.
     Queda en la punta opuesta a "Tengo una tienda", que es la otra naranja. */
  {
    key: "digital" as AccountType,
    icon: Download,
    color: "orange",
    title: "Vendo productos digitales",
    desc: "Vendé ebooks, plantillas y guías con entrega automática al pagar.",
    perks: [
      "Entrega automática al pagar",
      "La IA te arma la página de venta",
      "La IA te escribe el ebook",
      "Bonos y upsells por producto",
      "Cobrás con Mercado Pago",
    ],
    cta: "Elegir plan",
  },
].filter((t) => t.key !== "digital" || DIGITALES_ABIERTO);

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
  /* La misma regla que aplica el servidor, no una copia parecida: si acá
     dijera algo distinto, el formulario dejaría pasar contraseñas que la API
     rechaza —o al revés— y la persona vería un error recién al enviar. */
  const problemaContrasena = validarContrasena(form.password);
  if (problemaContrasena) return problemaContrasena;
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
    rawPlan === "digital" && DIGITALES_ABIERTO ? "digital" :
    null;
  const billingParam = searchParams.get("billing");
  const rawRedirect = searchParams.get("redirect");
  const redirectParam = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : null;

  const rawTier = searchParams.get("tier");
  const tierParam: "BASIC" | "PREMIUM" = rawTier === "premium" || rawTier === "PREMIUM" ? "PREMIUM" : "BASIC";

  /* El mismo parámetro sirve para los dos productos, porque nunca conviven: una
     tienda no tiene tier digital ni al revés. Se compara en mayúsculas contra la
     lista real de tiers y lo que no esté cae en FREE — nunca en un plan pago. */
  const tierDigitalEnLaUrl = TIERS_DIGITALES.find((t) => t === (rawTier ?? "").toUpperCase()) ?? null;
  const tierEnLaUrl = tierDigitalEnLaUrl !== null;
  const tierDigitalParam: TierDigital = tierDigitalEnLaUrl ?? "FREE";

  /* La URL decide dónde ARRANCA la pantalla y nada más.
   *
   * `?plan=digital` sin un tier válido no puede saltar al formulario: sería
   * mandar a alguien a completar sus datos sin haberle mostrado nunca los tres
   * planes, y creándole la cuenta en Free porque sí. Con tier —que es como llega
   * quien apretó un plan en /precios— ya eligió, y ahí sí va derecho al
   * formulario. */
  const arrancaEnPlanesDigitales = planParam === "digital" && !tierEnLaUrl;
  const [step, setStep] = useState<"type" | "form">(
    planParam && !arrancaEnPlanesDigitales ? "form" : "type"
  );
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
  /* La tarjeta de Productos Digitales no lleva derecho al formulario: primero se
     elige el plan, igual que la de tienda elige entre Pro y Premium. La
     diferencia es que son tres y no entran adentro de la tarjeta, así que
     reemplazan a las cuatro — la misma interacción que en /precios. */
  const [verPlanesDigitales, setVerPlanesDigitales] = useState(arrancaEnPlanesDigitales);
  const [digitalTier, setDigitalTier] = useState<TierDigital>(tierDigitalParam);
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
      /* La misma regla que el envío y que el servidor. Era una CUARTA copia: acá
         decía 6 y aprobaba el campo, y recién al enviar aparecía que el mínimo
         era otro. El aviso mientras se escribe y el del envío tienen que salir
         de la misma función o se contradicen entre ellos. */
      err = validarContrasena(value) ?? "";
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

  /* Elegido el plan, recién ahí se va al formulario. El tier viaja en el estado
     y se manda con el alta: el servidor lo vuelve a validar, porque esto es el
     navegador y acá no se decide nada que cueste plata. */
  function elegirPlanDigital(tier: TierDigital) {
    setDigitalTier(tier);
    setAccountType("digital");
    setVerPlanesDigitales(false);
    setStep("form");
  }

  function selectType(t: AccountType) {
    /* Digitales SIEMPRE pasa por la pantalla de planes.
     *
     * Acá había un `&& !tierEnLaUrl` y era un error: el tier de la URL no se
     * borra al navegar por la pantalla, así que quien entraba desde /precios con
     * un plan elegido, volvía a las cuatro cuentas y apretaba "Elegir plan",
     * caía derecho al formulario otra vez — el botón no hacía lo que decía, y
     * quedaba sin forma de cambiar de plan salvo editando la dirección.
     *
     * La URL ya hizo su trabajo más arriba, eligiendo dónde arranca la pantalla.
     * A partir del primer clic manda lo que la persona toca. */
    if (t === "digital") { setVerPlanesDigitales(true); return; }
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
      body: JSON.stringify({ ...form, accountType, billing, tier: ownerTier, digitalTier, phone: form.phone.trim(), termsAccepted, ageConfirmed, turnstileToken: captcha.token }),
    });
    const data = await res.json();
    captcha.reset();
    if (!res.ok) {
      setError(data.error || "Error al registrarse");
      setLoading(false);
      return;
    }
    // Conversión para el pixel de plataforma. Va acá y no en la pantalla de
    // /login a la que redirigimos, porque este es el único punto donde consta
    // que el alta salió bien: si el POST falla ya volvimos arriba, y a /login
    // se llega también entrando de mil formas que no son un registro.
    //
    // Para un OWNER la tienda se crea en ESTE mismo request (el create anidado
    // de `api/auth/registro`), así que no existe un segundo momento
    // "tienda creada" que medir — sería contar dos veces lo mismo. Lo que sí
    // se distingue es el tipo de cuenta, que es lo que después deja armar
    // públicos parecidos solo con los que abren tienda.
    trackEvent("CompleteRegistration", { content_name: accountType, status: true });
    // El alta que arranca una prueba gratis de 7 días. Es un evento estándar
    // aparte para poder optimizar campañas directamente contra esto, que es la
    // conversión que de verdad importa.
    //
    // Una cuenta digital también puede arrancar probando, si eligió Starter o
    // Pro en vez de Free. Sin esta rama esas altas no se contaban y las campañas
    // de digitales optimizaban contra nada.
    if (accountType === "owner" || (accountType === "digital" && digitalTier !== "FREE")) {
      trackEvent("StartTrial");
    }

    /* Si el mail de confirmación no salió, la cuenta existe pero no se puede
       usar. La pantalla de ingreso tiene que decirlo y ofrecer el reenvío, en vez
       de mandarla a esperar un mail que no viene. */
    const sufijoMail = data?.mailEnviado === false ? "&mail=0" : "";

    setRedirecting(true);
    if (accountType === "buyer") {
      router.push(`/login?registered=buyer${sufijoMail}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ""}`);
    } else if (accountType === "seller") {
      router.push(`/login?registered=seller${sufijoMail}`);
    } else if (accountType === "digital") {
      router.push(`/login?registered=digital${sufijoMail}`);
    } else {
      router.push(`/login?registered=true${sufijoMail}`);
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
    digital: {
      gradient: "from-orange-600 via-amber-500 to-rose-500",
      headline: "Vendé tu\nconocimiento",
      sub: "Subís el archivo, la IA te arma la página de venta y el que compra lo recibe al instante.",
    },
  };

  const panel = LEFT_PANEL[accountType];

  /* El texto del botón que ENVÍA el formulario, que no es el de la tarjeta.
   *
   * Salían del mismo lugar (`selected.cta`) y con tres tipos de cuenta funcionaba
   * de casualidad: "Crear mi tienda" sirve igual para la tarjeta y para el envío.
   * Digitales rompió la coincidencia — su tarjeta dice "Elegir plan", así que el
   * botón de abajo del formulario también decía "Elegir plan", cuando el plan ya
   * estaba elegido diez pasos antes.
   *
   * Y no dice "Suscribite": acá no se cobra nada y el formulario ni siquiera pide
   * una tarjeta. Prometer una suscripción y arrancar una prueba son cosas
   * distintas, y la que confunde de verdad es hacerle creer a alguien que se le
   * cobró.
   */
  const textoDelBoton =
    accountType === "digital"
      ? digitalTier === "FREE"
        ? "Crear mi cuenta"
        : `Empezar mi prueba de ${COPY_DIGITAL[digitalTier].nombre}`
      : selected.cta;

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
            <div className="flex items-center justify-between gap-3 mb-8">
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${colors.border} ${colors.bg}`}>
                <selected.icon className={`h-4 w-4 ${colors.text}`} />
                {/* Sin el plan. Lo dice el recuadro de abajo, con el doble de
                    tamaño y al lado del precio. Acá sólo estorbaba: en 360 el
                    texto pasaba a dos renglones, la chapita se estiraba y
                    empujaba a "Cambiar" fuera de la pantalla. */}
                <span className={`text-sm font-semibold ${colors.text}`}>{selected.title}</span>
              </div>
              <button
                type="button"
                /* En digitales "Cambiar" vuelve a los planes y no a las cuatro
                   cuentas: lo que se cambia nueve de cada diez veces es el plan,
                   y desde ahí se puede seguir saliendo a las cuentas. */
                onClick={() => {
                  setError("");
                  if (accountType === "digital") { setVerPlanesDigitales(true); }
                  setStep("type");
                }}
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
                : accountType === "digital"
                /* Sin repetir el plan ni los 7 días: eso lo dice el recuadro de
                   abajo, con mucha más fuerza que un renglón gris. Decirlo dos
                   veces seguidas le quita peso a las dos. */
                ? "Es el último paso."
                : "Empezá a explorar tiendas ya."}
            </p>

            {/* El resumen de lo que eligió, arriba del formulario.

                Existe porque acá es donde la persona decide si completa sus
                datos o se va, y la única señal de lo que estaba por hacer eran
                una chapita chica arriba y un renglón gris. Lo que tiene que
                quedar clarísimo son dos cosas: qué plan y que son 7 días gratis
                sin tarjeta.

                Y una tercera, que es la que saca el miedo: al terminar no se
                cierra nada. Decirlo ANTES de pedir los datos es lo honesto —
                después de crear la cuenta ya no es un aviso, es una excusa. */}
            {accountType === "digital" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`mb-7 rounded-2xl border p-5 ${
                  digitalTier === "FREE"
                    ? "border-gray-200 bg-gray-50"
                    : "border-orange-200 bg-gradient-to-br from-orange-50 to-rose-50/60"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full text-[11px] font-black px-2.5 py-1 ${
                    digitalTier === "FREE" ? "bg-gray-900 text-white" : "bg-orange-600 text-white"
                  }`}>
                    {digitalTier !== "FREE" && <Zap className="h-3 w-3" />}
                    Plan {COPY_DIGITAL[digitalTier].nombre}
                  </span>
                  {digitalTier !== "FREE" && (
                    <span className="text-xs text-gray-500 font-medium">
                      {billing === "ANNUAL" ? "Facturación anual" : "Facturación mensual"}
                    </span>
                  )}
                </div>

                {digitalTier === "FREE" ? (
                  <>
                    <p className="text-2xl font-black text-gray-950 leading-tight">Gratis para siempre</p>
                    <p className="text-sm text-gray-500 mt-0.5">Sin tarjeta y sin fecha de vencimiento.</p>
                    <div className="h-px bg-gray-200 my-4" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                      No pagás abono: nos llevamos una comisión del{" "}
                      <strong className="text-gray-700">{COMISION_DIGITAL.FREE}% sobre cada venta</strong> que
                      hagas. Si no vendés, no pagás nada.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-black text-gray-950 leading-tight">7 días gratis</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Sin tarjeta. Hoy no se te cobra nada.
                    </p>

                    <div className="h-px bg-orange-200/70 my-4" />

                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <span className="text-xs text-gray-500">Después de la prueba</span>
                      <span className="text-right">
                        <span className="text-lg font-black text-gray-950">
                          {money(
                            billing === "ANNUAL"
                              ? Math.round(PRECIOS_DIGITALES[`DIGITAL_${digitalTier}`].ANNUAL / 12)
                              : PRECIOS_DIGITALES[`DIGITAL_${digitalTier}`].MONTHLY
                          )}
                        </span>
                        <span className="text-gray-500 text-xs font-normal">/mes</span>
                        {billing === "ANNUAL" && (
                          <span className="block text-[11px] text-gray-500">
                            {money(PRECIOS_DIGITALES[`DIGITAL_${digitalTier}`].ANNUAL)}/año
                            <span className="ml-1.5 text-teal-600 font-bold">
                              Ahorrás {money(PRECIOS_DIGITALES[`DIGITAL_${digitalTier}`].MONTHLY * 12 - PRECIOS_DIGITALES[`DIGITAL_${digitalTier}`].ANNUAL)}
                            </span>
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed mt-3">
                      Si no pagás, <strong className="text-gray-700">volvés al plan Free</strong>. No se cierra
                      nada ni perdés tus productos ni tus ventas.
                    </p>
                  </>
                )}
              </motion.div>
            )}

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
                    placeholder={`Mínimo ${LARGO_MINIMO} caracteres`}
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
                  : <p className="text-xs text-gray-500 mt-1">{`Mínimo ${LARGO_MINIMO} caracteres.`}</p>
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
                    {/* ⚠️ El rol va DERECHO, sin traducir. Acá había una cadena
                        de tres condiciones —seller, owner, y todo lo demás a
                        "buyer"— escrita cuando los tipos de cuenta eran tres.
                        Al aparecer el cuarto, `digital` caía en ese último
                        "buyer": quien se registraba en Productos Digitales
                        aceptaba los términos del CLIENTE, el documento de
                        alguien que compra en una tienda. Y los de Cliente son
                        justo los que prometen 10 días de arrepentimiento.
                        Un `else` que decide un documento legal envejece mal.
                        `rolValido` del otro lado ya descarta cualquier rol que
                        no exista, así que mandarlo entero es más seguro que
                        traducirlo. Encontrado el 03/09/26. */}
                    Leí y acepto los{" "}
                    <Link
                      href={`/terminos?role=${accountType}`}
                      className="text-gray-600 underline hover:text-gray-900 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      términos y condiciones
                    </Link>
                    {" "}y la{" "}
                    <Link
                      href={`/privacidad?role=${accountType}`}
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
                {loading ? "Creando cuenta..." : textoDelBoton}
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

      {/* Con la cuarta tarjeta el contenedor crece; con tres queda como estaba. */}
      <div className={`relative w-full ${TYPES.length === 4 ? "max-w-7xl" : "max-w-5xl"}`}>
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <AppLogo size={72} />
            <span className="text-2xl font-black text-gray-950">TiendaApps</span>
          </Link>
          <h1 className="text-4xl font-black text-gray-950 mb-3">
            {verPlanesDigitales ? "Elegí tu plan" : "Crear cuenta gratis"}
          </h1>
          <p className="text-gray-500 text-lg">
            {verPlanesDigitales
              ? "Todos arrancan sin tarjeta. Podés cambiar de plan cuando quieras."
              : "¿Cómo querés usar TiendaApps?"}
          </p>
        </div>

        {/* ── LOS TRES PLANES DE PRODUCTOS DIGITALES ──
            Reemplazan a las cuatro tarjetas, no se agregan abajo: es la misma
            interacción que en /precios, y quien viene de ahí la reconoce.

            Elegir Starter o Pro NO cobra nada acá: arranca sus 7 días de prueba.
            Al terminar, si no pagó, la cuenta cae a Free — no se cierra nada.
            Por eso el botón dice "Probar 7 días gratis" y no "Suscribirme". */}
        {verPlanesDigitales ? (
          <>
            <button
              type="button"
              onClick={() => setVerPlanesDigitales(false)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a todas las cuentas
            </button>

            {/* Mensual / Anual, el mismo que ya tiene el formulario de tienda.

                Acá no se cobra nada —esto arranca una prueba—, pero el ciclo
                elegido queda guardado en la suscripción y es el que va a estar
                puesto cuando llegue el momento de pagar. Sin esto, quien venía de
                /precios con "Anual" prendido perdía el descuento en el camino y
                sin que nada se lo dijera. */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setBilling("MONTHLY")}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    billing === "MONTHLY" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBilling("ANNUAL")}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    billing === "ANNUAL" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Anual
                  <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${billing === "ANNUAL" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700"}`}>
                    -25%
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
              {TIERS_DIGITALES.map((tier, i) => {
                const gratis = tier === "FREE";
                const esPro = tier === "PRO";
                const precio = gratis
                  ? null
                  : esPro ? PRECIOS_DIGITALES.DIGITAL_PRO : PRECIOS_DIGITALES.DIGITAL_STARTER;
                return (
                  /* Entran de a una, en el orden en que se leen. El retardo es
                     chico a propósito: alcanza para que la fila no aparezca de
                     golpe, y no tanto como para que haya que esperarla. */
                  <motion.div
                    key={tier}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
                    className={`group relative rounded-3xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                      esPro
                        ? "border-2 border-orange-400 bg-orange-50/40 shadow-lg shadow-orange-500/10 hover:shadow-2xl hover:shadow-orange-500/25"
                        : gratis
                        ? "border border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-900/5"
                        : "border border-orange-200 bg-orange-50/40 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/15"
                    }`}
                  >
                    {/* El resplandor del plan destacado. Sólo en Pro y sólo al
                        pasar por encima: si está siempre prendido deja de
                        destacar nada. */}
                    {esPro && (
                      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-orange-400/0 via-orange-400/0 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}

                    <div className="relative flex flex-col flex-1">
                      {esPro && (
                        <div className="inline-flex self-start items-center gap-1.5 rounded-full bg-orange-600 text-white text-[10px] font-black px-2.5 py-1 mb-3 shadow-sm shadow-orange-500/30">
                          <Zap className="h-3 w-3" /> Más completo
                        </div>
                      )}
                      <h3 className="text-xl font-black text-gray-950 mb-1">{COPY_DIGITAL[tier].nombre}</h3>
                      <p className="text-gray-500 text-xs mb-4">{COPY_DIGITAL[tier].bajada}</p>

                      {/* Alto fijo para los tres: Free no tiene la línea de
                          "después de los 7 días" y sin esto arrancaba la lista
                          un renglón más arriba que las otras dos, que es lo que
                          después desalineaba todo hacia abajo. El anual suma un
                          renglón más, así que el alto reservado lo contempla. */}
                      <div className="mb-4 min-h-[84px]">
                        {precio ? (
                          <>
                            {/* El número grande es POR MES en los dos ciclos. Un
                                "$540.000" gigante al lado de un "$30.000" no se
                                puede comparar: parece dieciocho veces más caro
                                cuando en realidad es más barato. */}
                            <span className="text-3xl font-black text-gray-950">
                              {money(billing === "ANNUAL" ? Math.round(precio.ANNUAL / 12) : precio.MONTHLY)}
                            </span>
                            <span className="text-gray-500 text-xs">/mes</span>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {billing === "ANNUAL"
                                ? `${money(precio.ANNUAL)} al año, después de la prueba`
                                : "Después de los 7 días de prueba"}
                            </p>
                            {billing === "ANNUAL" && (
                              <p className="text-[11px] font-bold text-teal-600 mt-0.5">
                                Ahorrás {money(precio.MONTHLY * 12 - precio.ANNUAL)}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-black text-gray-950">Gratis</span>
                            <p className="text-[11px] text-gray-400 mt-1">Para siempre · Sin tarjeta</p>
                          </>
                        )}
                      </div>

                      <div className={`rounded-xl px-3 py-2 mb-4 border transition-colors ${
                        gratis
                          ? "border-gray-200 bg-white group-hover:border-gray-300"
                          : "border-orange-300 bg-orange-100/60 group-hover:bg-orange-100"
                      }`}>
                        <span className={`text-xs font-bold ${gratis ? "text-gray-700" : "text-orange-700"}`}>
                          Comisión {COMISION_DIGITAL[tier]}% por venta
                        </span>
                      </div>

                      <ul className="space-y-1.5 mb-5 flex-1">
                        {featuresDigital(tier).map((f) => (
                          <li key={f.text} className={`flex items-start gap-2 text-xs ${f.on ? "text-gray-600" : "text-gray-300"}`}>
                            <CheckCircle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${f.on ? (gratis ? "text-teal-600" : "text-orange-500") : "text-gray-200"}`} />
                            {f.text}
                          </li>
                        ))}
                      </ul>

                      {/* El botón y su renglón van pegados abajo con `mt-auto`, y
                          el renglón lo tienen LOS TRES. Cuando sólo lo tenían los
                          pagos, el botón del Free quedaba más abajo que los otros
                          dos: no era un problema de altura de tarjeta sino de que
                          a una le faltaba una línea al pie. */}
                      <div className="mt-auto">
                        <button
                          type="button"
                          onClick={() => elegirPlanDigital(tier)}
                          className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${
                            gratis
                              ? "bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/15 hover:shadow-xl hover:shadow-gray-900/25"
                              : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40"
                          }`}
                        >
                          {gratis ? "Empezar gratis" : "Probar 7 días gratis"}
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </button>
                        {/* Alto reservado para dos renglones. En 768 el renglón
                            de los planes pagos parte en dos y el del Free no, así
                            que sin esto el botón del Free quedaba 17 px más abajo
                            que los otros dos. */}
                        <p className="text-center text-[11px] text-gray-400 mt-2.5 min-h-[34px]">
                          {gratis ? "No te pedimos tarjeta nunca." : "Sin tarjeta. Si no pagás, volvés a Free."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
        /* Cuatro columnas recién en lg. En 768 son dos y dos: cuatro tarjetas
           con lista de beneficios adentro no entran en esa pantalla sin
           volverse ilegibles. */
        <div className={`grid grid-cols-1 gap-4 ${TYPES.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
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
                <div className="flex items-start gap-2 mb-1.5 flex-wrap">
                  <h3 className="text-lg font-black text-gray-950">{title}</h3>
                  {key === "digital" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 mt-0.5">
                      <Sparkles className="h-3 w-3" /> Nuevo
                    </span>
                  )}
                </div>
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
                        : key === "digital"
                        ? "3 planes · Empezás gratis · Sin tarjeta"
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
        )}

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
