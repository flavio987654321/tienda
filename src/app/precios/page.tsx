"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Check, ShoppingBag, Zap, Store, Star, ArrowRight, ArrowLeft, PartyPopper, ShoppingCart, Crown, Mail, X, BadgeCheck, Download, Sparkles } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import PaymentModal from "@/components/subscription/PaymentModal";
import { PRICES, PRO_MAX_ACTIVE_COUPONS, PRO_MAX_LIVE_PROMOTIONS, PRO_MAX_AFFILIATES, PRO_MAX_PRODUCTS, MAX_PRODUCTS_POR_TIENDA, PUSH_CAMPAIGNS_PER_WEEK, PRECIOS_DIGITALES, COMISION_DIGITAL, DIGITALES_ABIERTO } from "@/lib/planLimits";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { featuresDigital, COPY_DIGITAL, type TierDigital } from "@/lib/planes-digitales";

function money(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
}

const FAQ_TIENDAS = [
  { q: "¿Necesito tarjeta de crédito para el período de prueba?", a: "No. Los 7 días de prueba son completamente gratis y no te pedimos datos de pago hasta que decides suscribirte." },
  { q: "¿Qué es el subdominio incluido?", a: "Al crear tu tienda recibís automáticamente una URL del tipo tutienda.tiendaapps.com. Es gratis y funciona desde el primer día." },
  { q: "¿Cómo funciona el dominio propio en Tienda Premium?", a: "Comprás tu dominio donde quieras (ej: Namecheap, GoDaddy) y lo conectás desde tu panel. Nosotros hacemos toda la configuración técnica automáticamente. El dominio es tuyo y lo renovás vos directamente, cuesta aproximadamente $9 USD/año." },
  { q: "¿Puedo pasar de Tienda Pro a Tienda Premium?", a: "Sí, podés cambiar de plan en cualquier momento desde tu panel." },
  { q: "¿Qué pasa si supero los 6 afiliados en Tienda Pro?", a: "No podés agregar más afiliados hasta renovar a Tienda Premium. Los afiliados existentes siguen funcionando." },
  { q: "¿Qué pasa cuando vence mi suscripción?", a: "Te avisamos con anticipación. Tenés 4 días de gracia para renovar antes de que se limite el acceso." },
];

/* Las de Productos Digitales. Contestan lo que la tabla de planes no puede: qué
   es una página de venta, cómo llega el archivo, y las dos cosas que conviene
   saber ANTES de elegir plan y no después — que la comisión se suma a la de
   Mercado Pago, y que no hay transferencia: sólo Mercado Pago, en los tres. */
const FAQ_DIGITAL = [
  { q: "¿El plan Free tiene fecha de vencimiento?", a: "No. Es gratis para siempre y no te pedimos tarjeta. No pagás abono: nos llevamos una comisión sobre cada venta que hagas. Si no vendés, no pagás nada." },
  { q: "¿Qué es una “página de venta”?", a: "Es la página donde se vende uno de tus productos: la foto, el texto, el precio, los bonos y el botón de compra. Va una por producto, así que cuando decimos “5 páginas de venta” queremos decir que podés tener 5 productos publicados." },
  { q: "¿Cómo recibe el archivo el que me compra?", a: "Apenas se acredita el pago le llega un mail con un link privado y personal. Ese link vive 30 días y se puede usar hasta 5 veces, así que lo puede bajar en el celular y en la computadora sin problema. Desde tu panel ves quién lo descargó y quién todavía no, y podés reenviárselo." },
  { q: "¿La comisión es lo único que me cobran por venta?", a: "No: nuestra comisión se suma a lo que Mercado Pago cobra por procesar el pago, que es aparte y va para ellos. Conviene tenerlo en cuenta al poner el precio de tu producto." },
  { q: "¿Puedo cobrar por transferencia?", a: "No: el único medio es Mercado Pago, en los tres planes. Es lo que hace que la entrega sea automática — apenas se aprueba el pago, a quien te compró le llega el archivo por mail, sin que tengas que confirmar nada. Con una transferencia nadie nos avisa que el pago entró." },
  { q: "¿Qué pasa si dejo de pagar el plan?", a: "No te cerramos nada ni perdés tus productos: volvés al plan Free. Se te apagan las funciones del plan pago y la comisión vuelve a la del Free, pero tu página y tus ventas siguen ahí." },
  { q: "Ya tengo una tienda en TiendaApps, ¿puedo usar la misma cuenta?", a: "No. Cada cuenta es una sola cosa, así que para vender productos digitales necesitás registrarte con otro correo. Son dos negocios distintos y cada uno tiene su panel." },
];

/**
 * Una de las tres tarjetas de adentro de Productos Digitales.
 *
 * ⚠️ `sub` no es opcional a propósito. Hasta el 16/09/26 esta tarjeta no recibía
 * NADA de la sesión: les mostraba "Probar 7 días gratis" con un link al registro
 * a todo el mundo, incluida la persona que ya estaba en ese mismo plan pago y
 * mirando esta página desde adentro de su cuenta. La tarjeta de tienda, que sí
 * mira la suscripción, hacía lo correcto desde siempre; ésta se sumó después y
 * se olvidó la mitad.
 *
 * Que el parámetro sea obligatorio es la parte que evita que vuelva a pasar: una
 * tarjeta nueva no compila hasta que su autor decida qué hace con la sesión.
 */
function TarjetaDigital({ tier, isAnnual, sub }: { tier: TierDigital; isAnnual: boolean; sub: UserSub | null }) {
  const esPro = tier === "PRO";
  const gratis = tier === "FREE";
  const precio = gratis
    ? null
    : tier === "PRO" ? PRECIOS_DIGITALES.DIGITAL_PRO : PRECIOS_DIGITALES.DIGITAL_STARTER;
  const porMes = precio ? (isAnnual ? Math.round(precio.ANNUAL / 12) : precio.MONTHLY) : 0;

  /* Quién está mirando. Se calcula acá arriba y no adentro del botón porque el
     renglón de abajo lo necesita también: decirle "Sin tarjeta. Si no pagás,
     volvés a Free" justo debajo de "Tu plan actual" sería avisarle de algo que
     ya le pasó o que no le aplica. */
  const esDigital = sub?.role === "DIGITAL";
  /* Free no tiene ciclo: no se factura, así que comparar mensual contra anual en
     esa tarjeta no quiere decir nada. En los pagos sí, porque pasar de mensual a
     anual es un cambio de plan de verdad. */
  const mismoPlan = !!esDigital && sub!.tier === tier &&
    (gratis || sub!.plan === (isAnnual ? "ANNUAL" : "MONTHLY"));

  return (
    /* Free en gris como la tarjeta de Cliente, los dos pagos en naranja como el
       resto de la página. Sin esto, Free y Starter salían idénticos. */
    <div className={`group rounded-3xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
      esPro
        ? "border-2 border-orange-400 bg-orange-50/40 shadow-lg shadow-orange-500/10 hover:shadow-2xl hover:shadow-orange-500/25"
        : gratis
        ? "border border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-900/5"
        : "border border-orange-200 bg-orange-50/40 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/15"
    }`}>
      {esPro && (
        <div className="inline-flex self-start items-center gap-1.5 rounded-full bg-orange-600 text-white text-xs font-black px-3 py-1 mb-3">
          <Crown className="h-3.5 w-3.5" /> Más completo
        </div>
      )}
      <h3 className="text-2xl font-black text-gray-950 mb-1">{COPY_DIGITAL[tier].nombre}</h3>
      <p className="text-gray-500 text-sm mb-5">{COPY_DIGITAL[tier].bajada}</p>

      <div className="mb-4">
        {gratis ? (
          <>
            <span className="text-4xl font-black text-gray-950">Gratis</span>
            <p className="text-xs text-gray-400 mt-1">Para siempre · Sin tarjeta</p>
          </>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-gray-950">{money(porMes)}</span>
              <span className="text-gray-500 text-sm mb-1.5">/mes</span>
            </div>
            {isAnnual && precio && (
              <p className="text-xs text-gray-500 mt-1">
                {money(precio.ANNUAL)} facturado anualmente
                <span className="ml-2 text-teal-600 font-semibold">
                  Ahorrás {money(precio.MONTHLY * 12 - precio.ANNUAL)}
                </span>
              </p>
            )}
          </>
        )}
      </div>

      <div className={`rounded-xl px-4 py-2.5 mb-6 border ${gratis ? "border-gray-200 bg-white" : "border-orange-300 bg-orange-100/60"}`}>
        <span className={`text-sm font-bold ${gratis ? "text-gray-700" : "text-orange-700"}`}>
          Comisión {COMISION_DIGITAL[tier]}% por venta
        </span>
        {esPro && <span className="ml-2 text-xs text-orange-600 font-semibold">la más baja</span>}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {featuresDigital(tier).map((f) => (
          <li key={f.text} className={`flex items-start gap-2.5 text-sm ${f.on ? "text-gray-600" : "text-gray-300"}`}>
            {f.on
              ? <Check className={`h-4 w-4 shrink-0 mt-0.5 ${gratis ? "text-teal-600" : "text-orange-500"}`} />
              : <X className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />}
            {f.text}
          </li>
        ))}
      </ul>

      {/* ── Qué botón va, y eso depende de quién está mirando ──────────────────

          Cuatro situaciones, y antes las cuatro mostraban la misma invitación a
          registrarse:

          1. Sin sesión (o con sesión sin suscripción) → el camino de siempre:
             crear la cuenta con este plan ya elegido.
          2. Cuenta digital, en ESTE plan → "Tu plan actual". No hay nada que
             comprar.
          3. Cuenta digital, en otro plan → cambiar de plan, pero en
             `/digitales/mi-cuenta`, que es donde vive ese trámite con su
             prorrateo. Acá sería una segunda copia del mismo cobro en una
             página pública.
          4. Cuenta de tienda o de afiliado → no puede comprar esto. El servidor
             ya lo corta con un 409 (el candado de ecosistema de
             `api/suscripcion/preferencia`), así que plata no se pierde; lo que
             se evitaba mal era el viaje hasta el modal de pago para enterarse.
             Ahora se dice acá, con el mismo texto que contesta el servidor. */}
      {(() => {
        if (mismoPlan) {
          return (
            <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-teal-50 border border-teal-200 text-teal-700">
              <BadgeCheck className="h-4 w-4" /> Tu plan actual
            </div>
          );
        }

        if (esDigital) {
          return (
            <Link
              href="/digitales/mi-cuenta"
              className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${
                gratis
                  ? "bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/15"
                  : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/25"
              }`}
            >
              Cambiar de plan <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          );
        }

        if (sub) {
          return (
            <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-gray-100 border border-gray-200 text-gray-400 cursor-default text-center px-3">
              <BadgeCheck className="h-4 w-4 shrink-0" /> Necesitás otra cuenta
            </div>
          );
        }

        return (
          /* A Starter y Pro NO se les cobra acá: arrancan sus 7 días de prueba,
             sin tarjeta. Al terminar, si no pagó, la cuenta cae a Free y no se
             cierra nada. Por eso el botón dice "Probar 7 días gratis" y no
             "Suscribirme": prometer una suscripción y arrancar una prueba son
             cosas distintas. */
          <Link
            /* El ciclo viaja con el plan. Sin esto, tocar "Anual" acá y apretar
               el botón perdía el descuento en el camino al registro, en
               silencio. */
            href={`/registro?plan=digital&tier=${tier.toLowerCase()}${isAnnual ? "&billing=annual" : ""}`}
            className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${
              gratis
                ? "bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/15 hover:shadow-xl hover:shadow-gray-900/25"
                : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40"
            }`}
          >
            {gratis ? "Crear cuenta gratis" : "Probar 7 días gratis"}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        );
      })()}
      {/* Mismo alto para los tres: el renglón de los planes pagos parte en dos
          en pantallas angostas y el del Free no, y sin esto el botón del Free
          quedaba más abajo que los otros. */}
      <p className="text-center text-xs text-gray-400 mt-3 min-h-[36px]">
        {sub && !esDigital
          ? "Cada cuenta es un solo producto. Registrate con otro correo."
          : mismoPlan && !gratis
          /* Mismo dato que muestra la tarjeta de tienda para su plan actual: lo
             que le importa a quien ya está adentro no es cómo empezar, es
             cuánto le queda. */
          ? `${sub!.daysLeft} días restantes`
          : gratis ? "Para siempre · Sin tarjeta" : "Sin tarjeta. Si no pagás, volvés a Free."}
      </p>
    </div>
  );
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
  /* Productos Digitales no es una tarjeta más: al tocarla, las cuatro se
     reemplazan por sus tres planes. Son dos vistas de la misma pantalla. */
  const [verDigitales, setVerDigitales] = useState(false);
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
    // El canal se crea DESPUÉS de que resuelve getUser(), así que hay una
    // ventana en la que el efecto ya se limpió pero el canal todavía no
    // existe: el cleanup ve `channel` en null y no limpia nada. Cuando la
    // promesa resuelve igual, crea un canal huérfano.
    //
    // En dev salta siempre, porque el Strict Mode monta → desmonta → monta y
    // deja dos getUser() en vuelo: el segundo pedía `supabase.channel()` con
    // el mismo nombre, recibía el canal que el primero ya había suscrito, y
    // el .on() sobre un canal suscrito revienta con "cannot add
    // postgres_changes callbacks after subscribe()".
    //
    // En producción no hay doble montaje, pero si el usuario navega antes de
    // que resuelva getUser() queda el canal huérfano abierto igual.
    let cancelado = false;

    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId || cancelado) return;

      channel = supabase.channel("precios-sub-" + userId);
      channel.on(
        "postgres_changes" as Parameters<typeof channel.on>[0],
        { event: "*", schema: "public", table: "Subscription", filter: `userId=eq.${userId}` },
        () => fetchSub()
      );
      channel.subscribe();
    });

    return () => {
      cancelado = true;
      if (channel) supabase.removeChannel(channel);
    };
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

  // El plan de afiliados es gratuito — estas funciones de precio sólo se usan para la tarjeta de OWNER
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

      {/* max-w-7xl y no 6xl: con la cuarta tarjeta la fila pasó a cuatro columnas
          y a 6xl el selector "Tienda Pro / Tienda Premium" se partía en dos
          renglones. El resto de la página no se estira porque el encabezado va
          centrado y las preguntas frecuentes tienen su propio max-w-2xl. */}
      <div className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">

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
              {/* En digitales el Free no vence: la prueba de 7 días es de Starter y
                  Pro. El mismo cartel para los dos decía la mitad. */}
              {verDigitales ? "Free para siempre · Starter y Pro con 7 días de prueba, sin tarjeta" : "7 días de prueba gratis, sin tarjeta"}
            </div>
            <h1 className="text-5xl lg:text-6xl font-black mb-4 text-gray-950">
              Planes simples,<br />
              <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">resultados reales</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              {verDigitales
                ? "Arrancá en Free sin vencimiento y sin tarjeta. Probá Starter o Pro 7 días cuando quieras; si no pagás, volvés a Free."
                : "Empezá gratis 7 días. Sin tarjeta de crédito. Cancelá cuando quieras."}
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
          {!verDigitales && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* ── AFILIADO ── */}
            <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 xl:p-7 flex flex-col">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 min-h-[44px]">Para vendedores independientes</div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-5">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-950 mb-1">Afiliado</h2>
              <p className="text-gray-500 text-sm mb-5 min-h-[60px]">Vendé productos de otras tiendas y ganá comisiones sin tener stock.</p>

              <div className="mb-2 min-h-[152px]">
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

              {/* "Ir a mi panel" es sólo para quien TIENE ese panel, o sea el
                  afiliado. Antes bastaba con estar logueada y no ser dueña, así
                  que a una clienta también se lo mostraba — y ese botón la
                  manda a un panel que no es el suyo. Sin cuenta de afiliado, lo
                  que corresponde es la invitación a crearse una. */}
              {userSub?.role === "OWNER" ? null : userSub?.role === "SELLER" ? (
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
              {/* Alto reservado para dos renglones en las cuatro: la de tiendas
                  dice "7 dias gratis · Sin tarjeta · Cancela cuando quieras" y parte
                  en dos, asi que sin esto su boton quedaba 16 px mas arriba que los
                  otros tres. */}
              <p className="text-center text-xs text-gray-400 mt-3 min-h-[32px]">Sin costo · Sin tarjeta · Acceso inmediato</p>
            </div>

            {/* ── DUEÑO DE TIENDA (con selector interno) ── */}
            <div className="rounded-3xl border border-orange-200 bg-orange-50/40 p-6 xl:p-7 flex flex-col ring-1 ring-orange-300 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/30">
                  Más popular
                </span>
              </div>

              <div className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-3 min-h-[44px]">Para dueños de tienda</div>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-5">
                <Store className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-950 mb-1">Dueño de Tienda</h2>
              <p className="text-gray-500 text-sm mb-5 min-h-[60px]">Creá tu tienda online y gestioná afiliados que vendan por vos.</p>

              {/* El selector y el precio comparten el alto reservado: acá
                  arriba hay un elemento más que en las otras tres tarjetas, y
                  sin esto su divisor quedaba 34 px más abajo. */}
              <div className="min-h-[152px] mb-2">
              {/* Selector de tier */}
              <div className="flex rounded-xl border border-gray-200 bg-white p-1 gap-1 mb-5">
                <button
                  onClick={() => setOwnerTier("BASIC")}
                  className={`flex-1 py-2 rounded-lg text-sm lg:text-xs font-bold whitespace-nowrap transition-all ${ownerTier === "BASIC" ? "bg-orange-600 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
                >
                  Tienda Pro
                </button>
                <button
                  onClick={() => setOwnerTier("PREMIUM")}
                  className={`flex-1 py-2 rounded-lg text-sm lg:text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${ownerTier === "PREMIUM" ? "bg-amber-500 text-white shadow" : "text-gray-500 hover:text-gray-900"}`}
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
              </div>

              <div className="h-px bg-orange-100 my-6" />

              {/* Features dinámicas según tier */}
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  { text: "Tienda con subdominio incluido", both: true },
                  // Decía "Productos y variantes ilimitados" para los dos planes,
                  // y dejó de ser cierto el día que los productos pasaron a tener
                  // tope. Las variantes siguen sin tope, así que la promesa se
                  // parte en dos en vez de borrarse. Premium tampoco es infinito:
                  // tiene el techo por tienda, que es técnico y no de plan.
                  { text: `Hasta ${PRO_MAX_PRODUCTS.toLocaleString("es-AR")} productos, con variantes ilimitadas`, both: false, basic: true, premiumText: `Hasta ${MAX_PRODUCTS_POR_TIENDA.toLocaleString("es-AR")} productos, con variantes ilimitadas` },
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
                /* Y las cuentas de Productos Digitales tampoco, por la misma
                   razón y con un agujero peor: el freno de los afiliados existía
                   desde antes, pero al sumar el cuarto ecosistema nadie agregó
                   éste. `isCurrentPlan` sólo sabe comparar contra "OWNER", así
                   que a una cuenta DIGITAL le daba false y caía en el
                   `if (userSub)` de más abajo — que le ofrecía "Cambiar de
                   plan". Abría el modal, elegía, apretaba pagar, y recién ahí el
                   servidor le contestaba 409 con el candado de ecosistema.
                   Nunca se cobró de más: lo que estaba mal era ofrecerlo. */
                if (userSub?.role === "DIGITAL" || (!userSub && userMetaRole === "DIGITAL")) {
                  return (
                    <div className="flex flex-col items-center justify-center gap-1 w-full py-3 rounded-2xl text-sm font-bold bg-gray-100 border border-gray-200 text-gray-400 cursor-default text-center px-3">
                      <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 shrink-0" /> Necesitás otra cuenta</span>
                      <span className="text-xs font-medium">Tu cuenta es de Productos Digitales</span>
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
              {/* El renglón de abajo también tiene que saber de la cuenta
                  digital: prometerle "7 días gratis" justo debajo de un botón
                  apagado que le dice que necesita otra cuenta es contradecirse
                  en dos renglones seguidos. */}
              <p className="text-center text-xs text-gray-400 mt-3 min-h-[32px]">
                {isCurrentPlan("OWNER", ownerTier)
                  ? `${userSub!.daysLeft} días restantes`
                  : userSub?.role === "DIGITAL"
                  ? "Cada cuenta es un solo producto. Registrate con otro correo."
                  : "7 días gratis · Sin tarjeta · Cancelá cuando quieras"}
              </p>
            </div>

            {/* ── CLIENTE ──
                Antes tenía `md:col-span-2 md:w-1/2 md:mx-auto` para centrarse:
                con tres tarjetas en una grilla de dos columnas quedaba huérfana
                abajo. Con cuatro son 2×2 y no sobra ninguna, así que el centrado
                se sacó — dejarlo la dejaba flotando en el medio de su fila. */}
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 xl:p-7 flex flex-col">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 min-h-[44px]">Para compradores</div>
              <div className="w-12 h-12 rounded-2xl bg-gray-200/60 flex items-center justify-center mb-5">
                <ShoppingCart className="h-6 w-6 text-gray-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-700 mb-1">Cliente</h2>
              <p className="text-gray-500 text-sm mb-5 min-h-[60px]">Explorá tiendas, comprá y seguí tus pedidos sin costo.</p>

              <div className="mb-2 min-h-[152px]">
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
              <p className="text-center text-xs text-gray-400 mt-3 min-h-[32px]">Sin tarjeta · Sin límite de tiempo</p>
            </div>

            {DIGITALES_ABIERTO && (
            /* ── PRODUCTOS DIGITALES ──
                No abre otra pantalla: al tocarla, las cuatro tarjetas se
                reemplazan por sus tres planes, en el mismo lugar y con el mismo
                interruptor Mensual/Anual de arriba.

                Se dice "páginas de venta" y NUNCA "tiendas": la competencia
                vende una tienda por subdominio y nosotros vendemos productos con
                su página. Ver ECOSISTEMA-DIGITALES.md, punto 2.3. */
            <div className="rounded-3xl border border-orange-200 bg-orange-50/40 p-6 xl:p-7 flex flex-col">
              <div className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-3 min-h-[44px] flex items-start gap-2 flex-wrap">
                Para vender archivos
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 normal-case tracking-normal">
                  <Sparkles className="h-3 w-3" /> Nuevo
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-5">
                <Download className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-950 mb-1">Productos Digitales</h2>
              <p className="text-gray-500 text-sm mb-5 min-h-[60px]">Vendé ebooks, plantillas y guías con entrega automática y páginas armadas con IA.</p>

              {/* "Comisión desde 2%" era engañoso y por eso se cambió.
                  El 2% es el de Pro, que sale $60.000 por mes: es el número más
                  lindo pegado al plan más caro, y arriba de la palabra "Gratis".
                  Quien entra gratis paga 8%. Ahora se dice ese, y se nombran los
                  planes pagos en vez de esconderlos detrás de un "desde". */}
              <div className="mb-2 min-h-[152px]">
                <span className="text-4xl font-black text-gray-950">Gratis</span>
                <p className="text-xs text-gray-500 mt-1">
                  Para siempre, con {COMISION_DIGITAL.FREE}% de comisión por venta
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Starter y Pro desde {money(PRECIOS_DIGITALES.DIGITAL_STARTER.MONTHLY)}/mes
                </p>
              </div>

              <div className="h-px bg-orange-200/70 my-6" />

              <ul className="space-y-3 mb-8 flex-1">
                {["Entrega automática al pagar", "La IA te arma la página de venta", "La IA te escribe el ebook", "Bonos y upsells por producto", "Cobrás con Mercado Pago"].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setVerDigitales(true)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white transition-all"
              >
                Ver los planes <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-gray-400 mt-3 min-h-[32px]">3 planes · Empezá gratis</p>
            </div>
            )}
          </div>
          )}

          {/* ── LOS TRES PLANES DE PRODUCTOS DIGITALES ──
              Reemplaza a la fila de cuatro, no se agrega abajo. */}
          {DIGITALES_ABIERTO && verDigitales && (
            <div>
              <button
                onClick={() => setVerDigitales(false)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> Volver a todos los planes
              </button>

              <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                  <Download className="h-6 w-6 text-orange-600" />
                </div>
                <h2 className="text-3xl font-black text-gray-950">Productos Digitales</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 text-white text-xs font-black px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5" /> Nuevo
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-8 max-w-2xl">
                Vendé ebooks, plantillas y guías con entrega automática. La IA te arma la
                página de venta y te escribe el producto.
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <TarjetaDigital tier="FREE" isAnnual={isAnnual} sub={userSub} />
                <TarjetaDigital tier="STARTER" isAnnual={isAnnual} sub={userSub} />
                <TarjetaDigital tier="PRO" isAnnual={isAnnual} sub={userSub} />
              </div>

              <p className="text-xs text-gray-400 mt-6 max-w-3xl">
                La comisión por venta se retiene junto con el cobro de Mercado Pago y se
                suma a lo que Mercado Pago cobra por procesar el pago. Sólo se aplica a las
                ventas cobradas online: con transferencia o efectivo no pasa por nosotros,
                y la entrega del archivo la confirmás vos.
              </p>
            </div>
          )}

          {/* FAQ — cambia con la vista.
              Al que está mirando los planes digitales no le sirve leer sobre el
              dominio propio de Tienda Premium ni sobre el tope de afiliados: son
              de otro producto. Cada vista muestra sus propias preguntas. */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-8 text-gray-950">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {(verDigitales ? FAQ_DIGITAL : FAQ_TIENDAS).map(({ q, a }) => (
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
