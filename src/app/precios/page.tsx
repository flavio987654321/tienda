"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Check, ShoppingBag, Zap, Store, Star, ArrowRight, PartyPopper } from "lucide-react";
import PaymentModal from "@/components/subscription/PaymentModal";

const PLANS = {
  affiliate: {
    name: "Afiliado",
    icon: Zap,
    description: "Vendé productos de otras tiendas y ganá comisiones automáticas.",
    monthly: 15000,
    annual: 135000,
    color: "from-violet-600 to-indigo-600",
    border: "border-violet-500/30",
    badge: null,
    features: [
      "Acceso a todas las tiendas de la plataforma",
      "Link de afiliado con tracking en tiempo real",
      "Billetera digital para cobrar comisiones",
      "Panel de ventas y estadísticas",
      "Premios por volumen de ventas",
      "Soporte prioritario",
    ],
  },
  owner: {
    name: "Dueño de tienda",
    icon: Store,
    description: "Creá tu tienda online y gestioná afiliados que vendan por vos.",
    monthly: 25000,
    annual: 225000,
    color: "from-indigo-600 to-cyan-600",
    border: "border-indigo-500/30",
    badge: "Más popular",
    features: [
      "Tienda online con dominio propio",
      "Productos y variantes ilimitados",
      "Red de afiliados que venden por vos",
      "Panel de pedidos y estadísticas",
      "Gestión de cupones y descuentos",
      "Venta mayorista integrada",
      "Soporte prioritario",
    ],
  },
};

function money(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);
}

export default function PreciosPage() {
  return (
    <Suspense>
      <PreciosContent />
    </Suspense>
  );
}

function PreciosContent() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [payModal, setPayModal] = useState<{ plan: "OWNER" | "AFFILIATE"; billing: "MONTHLY" | "ANNUAL"; amount: number } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isRegistered = searchParams.get("registered") === "true";
  const role = searchParams.get("role"); // "owner" | "affiliate"

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">MiTienda</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/25 transition-all">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">

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
                  Elegí un plan ahora o empezá a usar la plataforma y suscribite después.
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
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium w-16 text-right ${!isAnnual ? "text-white" : "text-gray-500"}`}>Mensual</span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-14 h-7 rounded-full transition-colors shrink-0 ${isAnnual ? "bg-indigo-600" : "bg-gray-700"}`}
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAnnual ? "translate-x-8" : "translate-x-1"}`} />
              </button>
              <span className={`text-sm font-medium w-16 ${isAnnual ? "text-white" : "text-gray-500"}`}>Anual</span>
            </div>
            <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
              3 meses gratis pagando anual
            </span>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {(Object.entries(PLANS) as [string, typeof PLANS.affiliate][]).map(([key, plan]) => {
              const Icon = plan.icon;
              const price = isAnnual ? plan.annual : plan.monthly;
              const monthlyEquiv = isAnnual ? Math.round(plan.annual / 12) : plan.monthly;

              return (
                <div
                  key={key}
                  className={`relative rounded-3xl border ${plan.border} bg-gray-900/50 p-8 flex flex-col ${plan.badge ? "ring-1 ring-indigo-500/40" : ""}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/30">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  <h2 className="text-2xl font-black text-white mb-1">{plan.name}</h2>
                  <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                  <div className="mb-2">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-white">{money(isAnnual ? monthlyEquiv : price)}</span>
                      <span className="text-gray-400 text-sm mb-1.5">/mes</span>
                    </div>
                    {isAnnual && (
                      <p className="text-xs text-gray-500 mt-1">
                        {money(price)} facturado anualmente
                        <span className="ml-2 text-emerald-400 font-semibold">Ahorrás {money(plan.monthly * 12 - plan.annual)}</span>
                      </p>
                    )}
                  </div>

                  <div className="h-px bg-white/5 my-6" />

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                        <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isRegistered ? (
                    <button
                      onClick={() => setPayModal({
                        plan: key === "owner" ? "OWNER" : "AFFILIATE",
                        billing: isAnnual ? "ANNUAL" : "MONTHLY",
                        amount: isAnnual ? plan.annual : plan.monthly,
                      })}
                      className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all bg-gradient-to-r ${plan.color} text-white hover:opacity-90 hover:scale-[1.02] shadow-lg`}
                    >
                      Suscribirme ahora
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      href={`/registro?plan=${key}&billing=${isAnnual ? "annual" : "monthly"}`}
                      className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold transition-all bg-gradient-to-r ${plan.color} text-white hover:opacity-90 hover:scale-[1.02] shadow-lg`}
                    >
                      Empezar prueba gratis
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  <p className="text-center text-xs text-gray-600 mt-3">
                    {isRegistered ? "Pago seguro con Mercado Pago" : "7 días gratis · Sin tarjeta · Cancelá cuando quieras"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-8">Preguntas frecuentes</h2>
            <div className="space-y-4">
              {[
                { q: "¿Necesito tarjeta de crédito para el período de prueba?", a: "No. Los 7 días de prueba son completamente gratis y no te pedimos datos de pago hasta que decides suscribirte." },
                { q: "¿Qué pasa cuando vence mi suscripción?", a: "Te avisamos con anticipación. Tenés 4 días de gracia para renovar antes de que se limite el acceso." },
                { q: "¿Puedo cambiar de plan?", a: "Sí, podés cambiar entre mensual y anual o cancelar en cualquier momento desde tu configuración." },
                { q: "¿Cómo se cobra la suscripción?", a: "Con tarjeta de crédito o débito de cualquier banco argentino a través de Mercado Pago." },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-white/5 bg-gray-900/30 p-5">
                  <p className="text-sm font-semibold text-white mb-2">{q}</p>
                  <p className="text-sm text-gray-400">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legal */}
          <p className="text-center text-xs text-gray-600 mt-12">
            Al suscribirte aceptás nuestros{" "}
            <Link href="/terminos" className="text-gray-500 hover:text-gray-400 underline">Términos y Condiciones</Link>
            {" "}y la{" "}
            <Link href="/privacidad" className="text-gray-500 hover:text-gray-400 underline">Política de Privacidad</Link>.
          </p>
        </div>
      </div>

      {/* Modal de pago */}
      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          billing={payModal.billing}
          amount={payModal.amount}
          onClose={() => setPayModal(null)}
          onSuccess={() => {
            setPayModal(null);
            router.push(payModal.plan === "OWNER" ? "/login?registered=true" : "/login?registered=seller");
          }}
        />
      )}
    </div>
  );
}
