"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingBag, Users, Wallet, TrendingUp, Heart, Briefcase,
  ArrowRight, CheckCircle, Star, Globe, Shield, MessageCircle,
  Home, Share2, DollarSign, Zap, Store, Smartphone, Trophy,
  Gift, Download, Bell,
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

export default function QuienesSomosPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <style>{`
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .gradient-text {
          background: linear-gradient(135deg, #818cf8, #a78bfa, #f472b6, #818cf8);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .grid-bg { background-image: linear-gradient(rgba(99,102,241,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.06) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">MiTienda</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/precios" className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 transition-colors">
              Precios
            </Link>
            <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/25 transition-all">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 grid-bg">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <Heart className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
              Hecho en Argentina, para Argentina
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
              Generamos<br />
              <span className="gradient-text">trabajo real.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Creemos que hoy, más que nunca, la gente necesita oportunidades para trabajar
              desde su casa y ganar dinero sin invertir un peso. Eso es exactamente lo que construimos.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
              <Link href="/registro" className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-indigo-500/25 hover:scale-105">
                Empezar gratis <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/vendedoras" className="flex items-center gap-2 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:bg-white/5">
                <Briefcase className="h-5 w-5" /> Quiero ser afiliado
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── EL PROBLEMA ── */}
      <section className="py-20 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">El problema que vimos</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-5">
              Dos mundos que no se encontraban
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
              Por un lado, dueños de tiendas con productos increíbles pero sin equipo para difundirlos.
              Por el otro, personas con ganas de trabajar pero sin capital para invertir.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="bg-red-950/20 border border-red-500/20 rounded-3xl p-8"
            >
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5">
                <Store className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">El dueño de tienda</h3>
              <ul className="space-y-3">
                {[
                  "Tiene productos pero poca visibilidad",
                  "No puede pagar un equipo de vendedores",
                  "Las redes sociales requieren tiempo y dinero",
                  "Cada peso que gasta en marketing es un riesgo",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="text-red-400 mt-0.5 font-bold flex-shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="bg-red-950/20 border border-red-500/20 rounded-3xl p-8"
            >
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-5">
                <Users className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">La persona que busca trabajo</h3>
              <ul className="space-y-3">
                {[
                  "Quiere trabajar desde casa pero no sabe cómo",
                  "No tiene capital para emprender su propio negocio",
                  "Los empleos formales son cada vez más escasos",
                  "Tiene tiempo libre y ganas, pero le falta la oportunidad",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="text-red-400 mt-0.5 font-bold flex-shrink-0">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── LA SOLUCIÓN (TODOS GANAN) ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Nuestra solución</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-900 mb-5">
              Todos ganan. <span className="text-indigo-600">En serio.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">
              Conectamos dueños de tienda con personas que quieren trabajar.
              Los dos crecen juntos, sin que ninguno ponga un peso extra.
            </motion.p>
          </motion.div>

          {/* Flujo visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: Store,
                color: "#6366f1",
                bg: "#6366f111",
                step: "1",
                who: "El dueño crea su tienda",
                desc: "Carga sus productos, configura su tienda y activa el sistema de afiliados. Listo.",
                result: "Tiene una tienda online profesional sin saber de tecnología.",
              },
              {
                icon: Share2,
                color: "#a855f7",
                bg: "#a855f711",
                step: "2",
                who: "El afiliado empieza a compartir",
                desc: "Se postula a la tienda, recibe su link único y empieza a compartirlo en redes desde su celular.",
                result: "Trabaja desde casa, a cualquier hora, sin invertir nada.",
              },
              {
                icon: DollarSign,
                color: "#10b981",
                bg: "#10b98111",
                step: "3",
                who: "Ambos cobran por cada venta",
                desc: "Cuando alguien compra por el link del afiliado, la comisión va automáticamente a su billetera.",
                result: "El dueño vende más. El afiliado gana plata. Nadie pierde.",
              },
            ].map(({ icon: Icon, color, bg, step, who, desc, result }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: parseInt(step) * 0.15 }}
                className="relative bg-white border border-gray-100 rounded-3xl p-7 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="absolute -top-4 left-7 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg" style={{ backgroundColor: color }}>
                  {step}
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-2" style={{ backgroundColor: bg }}>
                  <Icon className="h-7 w-7" style={{ color }} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{who}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{desc}</p>
                <div className="flex items-start gap-2 bg-gray-50 rounded-2xl p-3">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color }} />
                  <p className="text-sm font-medium text-gray-700">{result}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* La síntesis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-10 text-center text-white"
          >
            <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-3xl font-black mb-4">
              "El dueño genera empleo sin pagar sueldos.<br />El afiliado trabaja sin invertir capital."
            </h3>
            <p className="text-indigo-200 text-lg max-w-2xl mx-auto">
              Cuánto más tiempo le dedique el afiliado a compartir productos en sus redes,
              más gana — y más crece la tienda. Un círculo virtuoso donde nadie pierde.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── PARA EL AFILIADO ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-900/20 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-purple-400 font-semibold text-sm uppercase tracking-widest mb-3">Para quienes buscan trabajo</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-6">
                Trabajá desde tu casa.<br />
                <span className="text-purple-400">Con tu celular.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 text-lg leading-relaxed mb-8">
                No necesitás experiencia, no necesitás inversión, no necesitás local.
                Solo tenés que compartir productos que ya existen en tiendas reales —
                y por cada venta que generás, cobrás tu comisión automáticamente.
              </motion.p>
              <motion.ul variants={stagger} className="space-y-4 mb-10">
                {[
                  { icon: Home, text: "Trabajás desde tu casa, a tus horarios" },
                  { icon: Share2, text: "Compartís productos por WhatsApp, Instagram, TikTok" },
                  { icon: Wallet, text: "Cobrás comisión por cada venta que generás" },
                  { icon: TrendingUp, text: "Cuanto más compartís, más ganás — sin techo" },
                  { icon: DollarSign, text: "Retirás tus ganancias cuando querés" },
                ].map(({ icon: Icon, text }) => (
                  <motion.li key={text} variants={fadeUp} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="text-gray-300 text-sm font-medium">{text}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div variants={fadeUp}>
                <Link href="/vendedoras" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-purple-500/25 hover:scale-105">
                  Quiero ser afiliado <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="relative"
            >
              <div className="bg-gray-900/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-5">Billetera del afiliado</p>
                <div className="bg-gradient-to-br from-purple-600/30 to-indigo-600/20 border border-purple-500/30 rounded-2xl p-6 mb-6">
                  <p className="text-purple-300 text-sm mb-1">Ganancias del mes</p>
                  <p className="text-4xl font-black text-white">$183.400</p>
                  <p className="text-purple-400 text-sm mt-2 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" /> +34% vs mes anterior
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { store: "Luna Moda", amount: "$74.200", sales: "38 ventas", color: "#6366f1" },
                    { store: "Bella Joyas", amount: "$62.800", sales: "24 ventas", color: "#ec4899" },
                    { store: "Ropa Kids", amount: "$46.400", sales: "31 ventas", color: "#10b981" },
                  ].map(({ store, amount, sales, color }) => (
                    <div key={store} className="flex items-center justify-between bg-white/5 rounded-xl p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "22" }}>
                          <Store className="h-4 w-4" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">{store}</p>
                          <p className="text-gray-500 text-xs">{sales}</p>
                        </div>
                      </div>
                      <p className="text-white font-bold text-sm">{amount}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-emerald-400 text-sm font-semibold">Retiro disponible: $183.400</p>
                  <p className="text-gray-500 text-xs mt-1">Se acredita en 24-48hs hábiles</p>
                </div>
              </div>

              <motion.div
                animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-emerald-500/30"
              >
                +$18.400 nueva venta ✓
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PREMIOS PARA AFILIADOS ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-3">Programa de premios</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-900 mb-5">
              Cuanto más generás,<br />
              <span className="text-purple-600">más premios ganás.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">
              Cada mes se evalúan tus comisiones y subís de nivel automáticamente.
              Los niveles más altos desbloquean cupones exclusivos para usar en tiendas o en tu suscripción.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              {
                icon: Gift,
                level: "Bronce",
                desc: "Punto de partida",
                color: "#a8835a",
                bg: "#fef9f0",
                border: "#e5d4b8",
                perks: ["Insignia en tu perfil", "Ya estás en el sistema"],
              },
              {
                icon: Star,
                level: "Plata",
                desc: "Primeros cupones",
                color: "#9ca3af",
                bg: "#f9fafb",
                border: "#e5e7eb",
                perks: ["10% off en suscripción", "10% off en tiendas"],
              },
              {
                icon: Trophy,
                level: "Oro",
                desc: "Beneficios reales",
                color: "#d97706",
                bg: "#fffbeb",
                border: "#fde68a",
                perks: ["20% off en suscripción", "15% off en tiendas"],
                highlight: true,
              },
              {
                icon: Star,
                level: "Diamante",
                desc: "Nivel máximo",
                color: "#6366f1",
                bg: "#f5f3ff",
                border: "#c4b5fd",
                perks: ["Mes de suscripción gratis", "20% off en tiendas", "Bonus por racha de 3 meses"],
              },
            ].map(({ icon: Icon, level, desc, color, bg, border, perks, highlight }) => (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                className={`relative rounded-3xl p-6 border-2 ${highlight ? "shadow-xl" : "shadow-sm"}`}
                style={{ backgroundColor: bg, borderColor: border }}
              >
                {highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full shadow" style={{ backgroundColor: color, color: "#fff" }}>
                    Popular
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: color + "22" }}>
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <p className="font-black text-gray-900 text-lg mb-0.5">{level}</p>
                <p className="text-xs font-medium mb-4" style={{ color }}>{desc}</p>
                <ul className="space-y-2">
                  {perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 text-center text-white"
          >
            <Trophy className="h-10 w-10 mx-auto mb-3 text-amber-300" />
            <p className="text-2xl font-black mb-2">Los cupones llegan solos al cierre de cada mes</p>
            <p className="text-purple-200 max-w-xl mx-auto text-sm">
              No hay formularios ni esperas. Si alcanzás Plata o superior, tu cupón aparece automáticamente.
              Mantener nivel Diamante 3 meses seguidos activa un bonus extra de racha.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── PARA EL DUEÑO DE TIENDA ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="order-2 lg:order-1"
            >
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-8">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-5">Panel del dueño</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Afiliados activos", value: "12", icon: Users, color: "#6366f1" },
                    { label: "Ventas este mes", value: "94", icon: TrendingUp, color: "#10b981" },
                    { label: "En comisiones", value: "$0", icon: DollarSign, color: "#f59e0b", sub: "pagado a afiliados" },
                    { label: "Ganancia neta", value: "$847K", icon: Wallet, color: "#ec4899" },
                  ].map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-500 text-xs">{label}</p>
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <p className="text-2xl font-black text-gray-900">{value}</p>
                      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                    </div>
                  ))}
                </div>
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
                  <p className="text-indigo-700 text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 fill-indigo-500 text-indigo-500" />
                    12 afiliados trabajando para tu tienda — sin que pagues un sueldo.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="order-1 lg:order-2">
              <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Para dueños de tienda</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-900 mb-6">
                Un equipo de ventas.<br />
                <span className="text-indigo-600">Sin costo fijo.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-500 text-lg leading-relaxed mb-8">
                Cada afiliado que actives es una persona que va a salir a vender tus productos
                en sus redes, con sus contactos. Vos no pagás nada hasta que se genera una venta —
                y ahí sí, la comisión se descuenta automáticamente.
              </motion.p>
              <motion.ul variants={stagger} className="space-y-4 mb-10">
                {[
                  { icon: Users, text: "Aprobás vos mismo quién puede vender tus productos" },
                  { icon: Globe, text: "Tus productos llegan a más gente, sin gastar en publicidad" },
                  { icon: Shield, text: "Solo pagás comisión cuando se efectúa una venta real" },
                  { icon: TrendingUp, text: "Tu tienda crece con cada afiliado que sumás" },
                  { icon: MessageCircle, text: "Panel completo para ver el rendimiento de cada afiliado" },
                ].map(({ icon: Icon, text }) => (
                  <motion.li key={text} variants={fadeUp} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-gray-600 text-sm font-medium">{text}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div variants={fadeUp}>
                <Link href="/registro?plan=owner" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-indigo-500/25 hover:scale-105">
                  Crear mi tienda gratis <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PWA / TU TIENDA COMO APP ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">Tu tienda como app</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-6">
                Una app real.<br />
                <span className="text-indigo-400">Sin app store.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 text-lg leading-relaxed mb-8">
                Tu tienda se puede instalar en el celular de tus clientes como si fuera una app nativa.
                Sin pasar por Google Play ni el App Store — directamente desde el navegador,
                en segundos. Se ve y se usa exactamente como una app profesional.
              </motion.p>
              <motion.ul variants={stagger} className="space-y-4 mb-10">
                {[
                  { icon: Download, text: "Se instala con un tap desde cualquier celular o computadora" },
                  { icon: Smartphone, text: "Ícono propio en la pantalla de inicio del cliente" },
                  { icon: Bell, text: "Podés enviar notificaciones push a tus clientes" },
                  { icon: Zap, text: "Carga ultra rápida, experiencia fluida como app nativa" },
                  { icon: Globe, text: "Funciona en Android, iPhone, Windows y Mac" },
                ].map(({ icon: Icon, text }) => (
                  <motion.li key={text} variants={fadeUp} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-indigo-400" />
                    </div>
                    <span className="text-gray-300 text-sm font-medium">{text}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div variants={fadeUp}>
                <Link href="/registro" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-indigo-500/25 hover:scale-105">
                  Crear mi tienda app <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="flex justify-center"
            >
              <div className="relative w-64">
                {/* Phone mockup */}
                <div className="bg-gray-900 border-4 border-gray-700 rounded-[3rem] p-3 shadow-2xl shadow-indigo-500/20">
                  <div className="bg-gray-800 rounded-[2.4rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="bg-gray-900 px-5 py-2 flex justify-between items-center">
                      <span className="text-white text-xs font-semibold">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-white/60 rounded-sm" />
                        <div className="w-1.5 h-2 bg-white/40 rounded-sm" />
                      </div>
                    </div>
                    {/* Install banner */}
                    <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-bold">Luna Moda</p>
                          <p className="text-gray-400 text-[10px]">Instalar app</p>
                        </div>
                      </div>
                      <div className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                        Instalar
                      </div>
                    </div>
                    {/* Store content */}
                    <div className="p-4 space-y-3">
                      <div className="bg-indigo-600/20 rounded-2xl h-28 flex items-center justify-center border border-indigo-500/30">
                        <ShoppingBag className="h-10 w-10 text-indigo-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {["Remeras", "Vestidos", "Accesorios", "Ofertas"].map((cat) => (
                          <div key={cat} className="bg-white/5 rounded-xl h-14 flex items-center justify-center">
                            <p className="text-gray-300 text-xs font-medium">{cat}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <motion.div
                  animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-emerald-500/30"
                >
                  ✓ App instalada
                </motion.div>
                <motion.div
                  animate={{ y: [4, -4, 4] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-3 -left-3 bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg"
                >
                  🔔 Nueva oferta
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── IMPACTO SOCIAL ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">Por qué lo hacemos</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-6">
              Queremos que la gente<br />
              <span className="gradient-text">tenga trabajo.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed mb-14">
              No es solo un negocio. Sabemos cómo está el país. Sabemos que hay personas
              con ganas de trabajar que no encuentran oportunidades. MiTienda es nuestra
              respuesta a eso: una plataforma donde cualquiera puede ganarse la vida
              honestamente, desde su casa, con su celular, sin depender de nadie.
            </motion.p>

            <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
              {[
                { value: "3.800+", label: "Afiliados generando ingresos", sub: "trabajando desde casa" },
                { value: "$12M+", label: "Distribuido en comisiones", sub: "en el último mes" },
                { value: "1.200+", label: "Tiendas con afiliados activos", sub: "creciendo con equipo" },
              ].map(({ value, label, sub }) => (
                <motion.div key={label} variants={fadeUp} className="border border-white/10 rounded-2xl p-6 bg-white/3">
                  <p className="text-5xl font-black gradient-text mb-2">{value}</p>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-gray-500 text-xs mt-1">{sub}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/registro" className="group flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all shadow-2xl shadow-indigo-500/30 hover:scale-105">
                Sumate a la plataforma <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/precios" className="flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:bg-white/5">
                Ver planes y precios
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#020408] border-t border-white/5 px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">MiTienda</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/" className="text-gray-500 hover:text-white transition-colors">Inicio</Link>
            <Link href="/precios" className="text-gray-500 hover:text-white transition-colors">Precios</Link>
            <Link href="/tiendas" className="text-gray-500 hover:text-white transition-colors">Tiendas</Link>
            <Link href="/vendedoras" className="text-gray-500 hover:text-white transition-colors">Ser afiliado</Link>
            <Link href="/terminos" className="text-gray-500 hover:text-white transition-colors">Términos</Link>
            <Link href="/privacidad" className="text-gray-500 hover:text-white transition-colors">Privacidad</Link>
          </div>
          <p className="text-gray-600 text-sm">© 2026 MiTienda. Hecho en Argentina.</p>
        </div>
      </footer>
    </div>
  );
}
