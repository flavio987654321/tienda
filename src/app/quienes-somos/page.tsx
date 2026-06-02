"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShoppingBag, Users, Wallet, TrendingUp, Heart, Briefcase,
  ArrowRight, CheckCircle, Globe, Shield, MessageCircle,
  Home, Share2, DollarSign, Zap, Store, ShoppingCart, Menu, X,
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

export default function QuienesSomosPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const pathname = usePathname();
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
            <span className="text-lg font-bold text-white">TiendaApps</span>
          </Link>
          <div className="hidden md:flex items-center gap-3">
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
      <div className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#030712] border-l border-white/10 transition-transform duration-300 ease-in-out md:hidden flex flex-col ${mobileMenu ? "translate-x-0" : "translate-x-full"}`}>
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
            const active = href === "/quienes-somos" ? pathname === "/quienes-somos" : href === "/precios" ? pathname === "/precios" : href === "/tiendas" ? pathname === "/tiendas" : false;
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
              Construimos esto<br />
              <span className="gradient-text">para ayudar a la gente.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              TiendaApps existe para que el dueño de tienda pueda vender más, el afiliado pueda
              ganarse la vida desde su casa, y el comprador encuentre lo que busca en tiendas argentinas reales.
              Todos importan. Todos ganan.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
              <Link href="/registro" className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-indigo-500/25 hover:scale-105">
                Empezar gratis <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/afiliados" className="flex items-center gap-2 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:bg-white/5">
                <Briefcase className="h-5 w-5" /> Quiero ser afiliado
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TRES PERSONAS, UN SOLO PROPÓSITO ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Para quiénes existe TiendaApps</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-900 mb-5">
              Una plataforma, tres personas que ganan.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">
              No diseñamos esto para un solo tipo de usuario. Pensamos en todos — y cada uno
              tiene un lugar real en este ecosistema.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                color: "#6366f1",
                bg: "from-indigo-50 to-indigo-100/50",
                border: "border-indigo-200",
                title: "El dueño de tienda",
                sub: "Tiene productos, necesita equipo de ventas",
                gains: [
                  "Arma un equipo sin pagar sueldos fijos",
                  "Sus productos llegan a todo el país",
                  "Solo paga cuando se genera una venta real",
                  "Control total sobre quién representa su marca",
                ],
                cta: "Crear mi tienda",
                href: "/registro",
              },
              {
                icon: Users,
                color: "#a855f7",
                bg: "from-purple-50 to-purple-100/50",
                border: "border-purple-200",
                title: "El afiliado",
                sub: "Quiere trabajar desde casa, sin inversión",
                gains: [
                  "Empieza sin poner un peso",
                  "Trabaja a su ritmo, desde cualquier lugar",
                  "Cobra comisión automática por cada venta",
                  "Su billetera crece cuanto más comparte",
                ],
                cta: "Quiero ser afiliado",
                href: "/afiliados",
              },
              {
                icon: ShoppingCart,
                color: "#10b981",
                bg: "from-emerald-50 to-emerald-100/50",
                border: "border-emerald-200",
                title: "El comprador",
                sub: "Quiere comprar con confianza y comodidad",
                gains: [
                  "Descubre tiendas argentinas verificadas",
                  "Paga con Mercado Pago de forma segura",
                  "Sigue sus envíos en tiempo real",
                  "Compra desde el celular como si fuera una app",
                ],
                cta: "Explorar tiendas",
                href: "/tiendas",
              },
            ].map(({ icon: Icon, color, bg, border, title, sub, gains, cta, href }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                className={`bg-gradient-to-br ${bg} border ${border} rounded-3xl p-8 flex flex-col`}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: color + "20" }}>
                  <Icon className="h-7 w-7" style={{ color }} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-500 text-sm mb-6">{sub}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {gains.map((g) => (
                    <li key={g} className="flex items-start gap-3 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color }} />
                      {g}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-white text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: color }}
                >
                  {cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EL PROBLEMA QUE VIMOS ── */}
      <section className="py-20 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">Por qué lo construimos</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-5">
              Dos mundos que no se encontraban
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto">
              Vimos dos problemas que nadie estaba resolviendo al mismo tiempo.
              Decidimos resolverlos juntos.
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

      {/* ── LA SOLUCIÓN ── */}
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

      {/* ── NUESTRO EQUIPO ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <div className="grid grid-cols-2 gap-4">
                <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl" />
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl mt-8" />
                <img src="https://images.unsplash.com/photo-1573497161161-c3e73707e25c?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl -mt-8" />
                <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl" />
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">El equipo</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-black text-white mb-6">
                Un equipo chico<br />con un objetivo grande.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 leading-relaxed mb-5">
                Somos un equipo argentino. Vimos de cerca la falta de oportunidades — personas con ganas de
                trabajar sin poder arrancar, y dueños de tienda con productos que no llegaban a ningún lado.
              </motion.p>
              <motion.p variants={fadeUp} className="text-gray-400 leading-relaxed mb-8">
                TiendaApps nació de esa frustración. Decidimos construir algo simple, honesto, y que le dé
                trabajo real a la gente. No solo a uno — a todos los que participan.
              </motion.p>
              <motion.div variants={stagger} className="grid grid-cols-3 gap-4">
                {[
                  { label: "Honestidad", sub: "Sin promesas vacías" },
                  { label: "Impacto real", sub: "Trabajo concreto" },
                  { label: "Simple", sub: "Sin complicaciones" },
                ].map(({ label, sub }) => (
                  <motion.div key={label} variants={fadeUp} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-white font-bold text-sm mb-1">{label}</p>
                    <p className="text-gray-500 text-xs">{sub}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PARA EL AFILIADO ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-purple-600 font-semibold text-sm uppercase tracking-widest mb-3">Para quienes buscan trabajo</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-900 mb-6">
                Trabajá desde tu casa.<br />
                <span className="text-purple-600">Con tu celular.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-500 text-lg leading-relaxed mb-8">
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
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-gray-600 text-sm font-medium">{text}</span>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div variants={fadeUp}>
                <Link href="/afiliados" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-purple-500/25 hover:scale-105">
                  Quiero ser afiliado <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            >
              <div className="bg-gray-950 border border-white/10 rounded-3xl p-8">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-5">Ejemplo real</p>
                <div className="bg-gradient-to-br from-purple-600/30 to-indigo-600/20 border border-purple-500/30 rounded-2xl p-6 mb-5">
                  <p className="text-purple-300 text-sm mb-1">Ganancias del mes</p>
                  <p className="text-4xl font-black text-white">$183.400</p>
                  <p className="text-purple-400 text-sm mt-2">Compartiendo desde el celular</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Invertiste para arrancar", value: "$0" },
                    { label: "Conocimientos técnicos requeridos", value: "Ninguno" },
                    { label: "Horario obligatorio", value: "Libre" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                      <span className="text-gray-400 text-sm">{label}</span>
                      <span className="font-bold text-sm text-emerald-400">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PARA EL DUEÑO ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="order-2 lg:order-1"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-5">Panel del dueño</p>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { label: "Afiliados activos", value: "12", color: "#6366f1" },
                    { label: "Ventas este mes", value: "94", color: "#10b981" },
                    { label: "Costo en sueldos", value: "$0", color: "#f59e0b" },
                    { label: "Ganancia neta", value: "$847K", color: "#ec4899" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-gray-500 text-xs mb-2">{label}</p>
                      <p className="text-2xl font-black" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center">
                  <p className="text-indigo-400 text-sm font-semibold">
                    12 personas vendiendo tus productos — sin pagar un sueldo fijo.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="order-1 lg:order-2">
              <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">Para dueños de tienda</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-6">
                Un equipo de ventas.<br />
                <span className="text-indigo-400">Sin costo fijo.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-400 text-lg leading-relaxed mb-8">
                Cada afiliado que activés es una persona que va a salir a vender tus productos
                en sus redes, con sus contactos. Solo pagás comisión cuando se genera una venta real.
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
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-indigo-400" />
                    </div>
                    <span className="text-gray-300 text-sm font-medium">{text}</span>
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
              con ganas de trabajar que no encuentran oportunidades. TiendaApps es nuestra
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
            <span className="text-lg font-bold text-white">TiendaApps</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/" className="text-gray-500 hover:text-white transition-colors">Inicio</Link>
            <Link href="/precios" className="text-gray-500 hover:text-white transition-colors">Precios</Link>
            <Link href="/tiendas" className="text-gray-500 hover:text-white transition-colors">Tiendas</Link>
            <Link href="/afiliados" className="text-gray-500 hover:text-white transition-colors">Ser afiliado</Link>
            <Link href="/terminos" className="text-gray-500 hover:text-white transition-colors">Términos</Link>
            <Link href="/privacidad" className="text-gray-500 hover:text-white transition-colors">Privacidad</Link>
          </div>
          <p className="text-gray-600 text-sm">© 2026 TiendaApps. Hecho en Argentina.</p>
        </div>
      </footer>
    </div>
  );
}
