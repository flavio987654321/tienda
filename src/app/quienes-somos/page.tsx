"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { motion } from "framer-motion";
import {
  ShoppingBag, Users, Wallet, TrendingUp, Heart, Briefcase,
  ArrowRight, CheckCircle, Globe, Shield, MessageCircle,
  Share2, Zap, Store, ShoppingCart, Menu, X, Package,
  Sparkles, Bell, Tag, QrCode, Utensils, Car,
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

export default function QuienesSomosPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white text-gray-950 overflow-x-hidden">
      <style>{`
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .gradient-text {
          background: linear-gradient(135deg, #f97316, #f59e0b, #e11d48, #f97316);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .grid-bg { background-image: linear-gradient(rgba(249,115,22,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,.05) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <AppLogo size={72} />
            <span className="text-lg font-bold text-gray-950">TiendaApps</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/tiendas" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Tiendas</Link>
            <Link href="/#como-funciona" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Cómo funciona</Link>
            <Link href="/quienes-somos" className="text-gray-950 text-sm font-medium transition-colors">Quiénes somos</Link>
            <Link href="/precios" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Precios</Link>
            <Link href="/seguimiento" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1.5"><Package className="h-4 w-4" />Seguimiento</Link>
            <Link href="/contacto" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1.5"><MessageCircle className="h-4 w-4" />Contacto</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">Iniciar sesión</Link>
            <Link href="/registro" className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">Crear cuenta</Link>
          </div>
          <button onClick={() => setMobileMenu(true)} className="md:hidden text-gray-500 hover:text-gray-900">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && <div className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm md:hidden" onClick={() => setMobileMenu(false)} />}
      <div className={`fixed top-0 right-0 bottom-0 z-50 w-72 bg-white border-l border-gray-200 transition-transform duration-300 ease-in-out md:hidden flex flex-col ${mobileMenu ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <span className="text-gray-950 font-bold">Menú</span>
          <button onClick={() => setMobileMenu(false)} className="text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-1 px-4 py-4 flex-1">
          {[
            { href: "/", label: "Inicio" },
            { href: "/#como-funciona", label: "Cómo funciona" },
            { href: "/tiendas", label: "Tiendas" },
            { href: "/quienes-somos", label: "Quiénes somos" },
            { href: "/precios", label: "Precios" },
          ].map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setMobileMenu(false)}
                className={`flex items-center gap-2 py-3 px-3 rounded-xl transition-all text-sm font-medium ${active ? "bg-orange-50 text-orange-600 border border-orange-200" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />}
                {label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-gray-200 flex flex-col gap-2 mt-2">
            <Link href="/login" onClick={() => setMobileMenu(false)} className="block text-center border border-gray-200 rounded-xl py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors">Iniciar sesión</Link>
            <Link href="/registro" onClick={() => setMobileMenu(false)} className="block text-center bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 px-3 rounded-xl transition-colors">Crear cuenta</Link>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 grid-bg overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <Heart className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
              Hecho en Argentina, con compromiso real
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight text-gray-950">
              Arrancamos desde cero.<br />
              <span className="gradient-text">Seguimos avanzando.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto mb-10">
              TiendaApps es un proyecto argentino construido en etapas a lo largo de casi un año.
              No hubo atajos ni fórmulas mágicas — solo trabajo constante, muchos intentos, y el compromiso
              de construir algo que realmente sirva.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center">
              <Link href="/registro" className="group flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-orange-500/25 hover:scale-105">
                Crear mi tienda gratis <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/afiliados" className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:bg-gray-50">
                <Briefcase className="h-5 w-5" /> Quiero ser afiliado
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── EL ORIGEN ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">El origen</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-5">
              No nació de un plan de negocios.<br className="hidden sm:block" /> Nació de un problema real.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">
              Cada proyecto que no funcionó fue un aprendizaje. Cada idea descartada dejó algo útil para la siguiente.
              Así se llegó a lo que es hoy TiendaApps.
            </motion.p>
          </motion.div>

          <div className="relative">
            {/* Línea vertical de conexión (desktop) */}
            <div className="hidden lg:block absolute left-1/2 top-8 bottom-8 w-px bg-gray-100 -translate-x-1/2 pointer-events-none" />

            <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-16 lg:gap-y-12">

              {/* Etapa 1 */}
              <motion.div
                initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="relative bg-white border border-gray-100 rounded-3xl p-7 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Car className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">El principio</span>
                    <p className="font-black text-gray-950 text-lg">Autos y códigos QR</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Todo empezó vendiendo autos. Contestar las mismas consultas por las redes todo el día era agotador.
                  La solución: crear un sistema propio de códigos QR. Pegabas el código en el vidrio del auto y cualquiera
                  que lo escaneara veía toda la información del vehículo — fotos, descripción, precio. Sin mensajes de ida y vuelta.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-orange-600 font-semibold">
                  <QrCode className="h-3.5 w-3.5" />
                  El primer proyecto real
                </div>
              </motion.div>

              {/* Etapa 2 */}
              <motion.div
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
                className="relative bg-white border border-gray-100 rounded-3xl p-7 shadow-sm lg:mt-16"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Utensils className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">El experimento</span>
                    <p className="font-black text-gray-950 text-lg">Sistemas para negocios</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Después vino un sistema de administración para restaurantes, hoteles e inmobiliarias.
                  La idea era que cualquiera pudiera registrarse y crear su propio negocio dentro de la plataforma.
                  No salió como se esperaba, pero dejó claro el camino: una sola plataforma, múltiples rubros.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-teal-600 font-semibold">
                  <CheckCircle className="h-3.5 w-3.5" />
                  La idea base tomó forma
                </div>
              </motion.div>

              {/* Etapa 3 */}
              <motion.div
                initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}
                className="relative bg-white border border-gray-100 rounded-3xl p-7 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">La búsqueda</span>
                    <p className="font-black text-gray-950 text-lg">Kiosco y otros proyectos</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Vinieron más proyectos: un sistema para kioscos, otras ideas. Cada uno con la misma pregunta de fondo:
                  ¿cómo puedo ofrecerle algo que realmente necesite a la mayor cantidad de personas posible?
                  Algunos funcionaron, otros no. Todos enseñaron algo.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-violet-600 font-semibold">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Cada error fue una lección
                </div>
              </motion.div>

              {/* Etapa 4 */}
              <motion.div
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                className="relative bg-gradient-to-br from-orange-500 to-rose-600 rounded-3xl p-7 shadow-xl shadow-orange-200 lg:mt-16"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-orange-100 uppercase tracking-widest">Hoy</span>
                    <p className="font-black text-white text-lg">TiendaApps</p>
                  </div>
                </div>
                <p className="text-orange-100 text-sm leading-relaxed">
                  Todas esas ideas convergieron en una sola plataforma: tiendas online, pagos, pedidos, afiliados,
                  estadísticas, inteligencia artificial, donaciones. Un lugar donde cualquier negocio argentino
                  puede existir, crecer y llegar a más personas.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-white font-semibold">
                  <Heart className="h-3.5 w-3.5 fill-white" />
                  Hecho en Argentina, con IA
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* ── QUÉ ES HOY ── */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">La plataforma hoy</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-5">
              Todo lo que un negocio necesita,<br className="hidden sm:block" /> en un solo lugar.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">
              No es solo una tienda online. Es una plataforma completa con herramientas reales para vender,
              crecer, y llegar a más clientes — sin depender de apps de terceros.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: Store,        label: "Tienda online",        color: "#ea580c", bg: "#ea580c12" },
              { icon: ShoppingCart, label: "Pagos integrados",     color: "#0d9488", bg: "#0d948812" },
              { icon: Package,      label: "Gestión de pedidos",   color: "#e11d48", bg: "#e11d4812" },
              { icon: Sparkles,     label: "Sasha IA",             color: "#7c3aed", bg: "#7c3aed12" },
              { icon: Users,        label: "Sistema de afiliados", color: "#f59e0b", bg: "#f59e0b12" },
              { icon: Tag,          label: "Cupones",              color: "#16a34a", bg: "#16a34a12" },
              { icon: Bell,         label: "Notificaciones push",  color: "#3b82f6", bg: "#3b82f612" },
              { icon: TrendingUp,   label: "Estadísticas",         color: "#6366f1", bg: "#6366f112" },
              { icon: Heart,        label: "Donaciones",           color: "#e11d48", bg: "#e11d4812" },
              { icon: Globe,        label: "Múltiples rubros",     color: "#0891b2", bg: "#0891b212" },
            ].map(({ icon: Icon, label, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all text-center"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: bg }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <p className="text-gray-800 font-semibold text-xs leading-tight">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA QUIÉN ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Para quién existe</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-5">
              Tres personas. Un mismo ecosistema.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">
              TiendaApps funciona cuando todos los que participan encuentran valor real en la plataforma.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                color: "#ea580c",
                bg: "from-orange-50 to-orange-100/40",
                border: "border-orange-200",
                title: "El dueño de tienda",
                sub: "Tiene productos y quiere venderlos mejor",
                points: [
                  "Crea su tienda online en minutos, sin saber programar",
                  "Gestiona productos, pedidos y pagos desde un panel",
                  "Activa afiliados que representan su marca",
                  "Usa herramientas de marketing integradas (cupones, emails, push)",
                  "Ve sus estadísticas en tiempo real",
                ],
                cta: "Crear mi tienda",
                href: "/registro",
              },
              {
                icon: Users,
                color: "#f59e0b",
                bg: "from-amber-50 to-amber-100/40",
                border: "border-amber-200",
                title: "El afiliado",
                sub: "Quiere representar marcas y generar comisiones",
                points: [
                  "Se postula a tiendas que le interesan",
                  "Recibe un link único para compartir",
                  "Cada venta generada acredita su comisión automáticamente",
                  "Ve su historial y comisiones desde su panel",
                  "Sin stock, sin pagos, sin envíos a su cargo",
                ],
                cta: "Postularme como afiliado",
                href: "/afiliados",
              },
              {
                icon: ShoppingCart,
                color: "#e11d48",
                bg: "from-rose-50 to-rose-100/40",
                border: "border-rose-200",
                title: "El comprador",
                sub: "Quiere comprar con confianza en tiendas argentinas",
                points: [
                  "Descubre tiendas argentinas verificadas",
                  "Paga con Mercado Pago de forma segura",
                  "Sigue sus envíos en tiempo real",
                  "Compra desde el celular con experiencia fluida",
                  "Puede dejar reseñas de sus compras",
                ],
                cta: "Explorar tiendas",
                href: "/tiendas",
              },
            ].map(({ icon: Icon, color, bg, border, title, sub, points, cta, href }) => (
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
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color }} />
                      {p}
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

      {/* ── NUESTRO COMPROMISO ── */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <motion.div
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-orange-500 to-rose-600 rounded-3xl p-10 text-white relative overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <p className="text-orange-100 text-sm font-semibold uppercase tracking-widest mb-3">Tecnología al servicio del negocio</p>
                <p className="text-white text-2xl font-black mb-4 leading-tight">
                  Usamos las mejores herramientas para construir las tuyas.
                </p>
                <p className="text-orange-100 text-sm leading-relaxed">
                  Combinamos inteligencia artificial, desarrollo constante y feedback real de quienes usan
                  la plataforma para que TiendaApps sea cada vez más útil, más simple y más poderosa.
                </p>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Nuestro equipo</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-950 mb-6">
                Un equipo comprometido<br />con cada negocio.
              </motion.h2>
              <motion.p variants={fadeUp} style={{ color: "#4b5563" }} className="leading-relaxed mb-4">
                Detrás de TiendaApps hay personas comprometidas con que la plataforma funcione, mejore
                y crezca con cada negocio que se suma. Empezamos con una idea simple y fuimos construyendo
                con trabajo constante, escuchando lo que los negocios realmente necesitaban.
              </motion.p>
              <motion.p variants={fadeUp} style={{ color: "#4b5563" }} className="leading-relaxed mb-8">
                No somos una corporación. Somos un equipo que conoce el mercado argentino, que sabe
                lo que cuesta arrancar un negocio, y que pone todo el esfuerzo en que las herramientas
                que ofrecemos sean reales, simples y confiables.
              </motion.p>
              <motion.div variants={stagger} className="grid grid-cols-3 gap-3">
                {[
                  { label: "~1 año", sub: "en desarrollo activo" },
                  { label: "100% AR", sub: "equipo argentino" },
                  { label: "Siempre", sub: "mejorando la plataforma" },
                ].map(({ label, sub }) => (
                  <motion.div key={label} variants={fadeUp} className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 text-center">
                    <p className="text-gray-950 font-black text-lg mb-0.5">{label}</p>
                    <p className="text-gray-500 text-xs">{sub}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── LA MISIÓN ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-orange-50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">La misión</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-5">
              Que cualquier persona con algo<br className="hidden sm:block" /> para vender, pueda hacerlo bien.
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "#6b7280" }} className="text-lg max-w-2xl mx-auto leading-relaxed">
              Sin necesidad de saber programar, sin grandes inversiones, sin depender de plataformas extranjeras.
              Herramientas profesionales, accesibles para cualquier negocio argentino.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Store,
                color: "#ea580c",
                bg: "#ea580c10",
                title: "Herramientas reales",
                desc: "No prometemos magia. Damos un panel completo con todo lo que un negocio online necesita para funcionar y crecer.",
              },
              {
                icon: Share2,
                color: "#f59e0b",
                bg: "#f59e0b10",
                title: "Crecimiento con afiliados",
                desc: "El sistema de afiliados existe para que los negocios lleguen a más personas a través de quienes ya confían en ellos.",
              },
              {
                icon: Heart,
                color: "#e11d48",
                bg: "#e11d4810",
                title: "Espacio para donar",
                desc: "Dentro de la plataforma existe un espacio de donaciones. Creemos que un negocio que crece puede ayudar a otros a hacerlo también.",
              },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="bg-white border border-gray-100 rounded-3xl p-7 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: bg }}>
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <h3 className="font-black text-gray-950 text-lg mb-2">{title}</h3>
                <p style={{ color: "#6b7280" }} className="text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center"
          >
            <Link href="/registro" className="group inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all shadow-2xl shadow-orange-500/30 hover:scale-105">
              Sumate a TiendaApps <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p style={{ color: "#9ca3af" }} className="text-sm mt-4">7 días de prueba gratis · Sin tarjeta de crédito</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-200 px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <AppLogo size={72} />
            <span className="text-lg font-bold text-gray-950">TiendaApps</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">Inicio</Link>
            <Link href="/precios" className="text-gray-500 hover:text-gray-900 transition-colors">Precios</Link>
            <Link href="/tiendas" className="text-gray-500 hover:text-gray-900 transition-colors">Tiendas</Link>
            <Link href="/afiliados" className="text-gray-500 hover:text-gray-900 transition-colors">Ser afiliado</Link>
            <Link href="/terminos" className="text-gray-500 hover:text-gray-900 transition-colors">Términos</Link>
            <Link href="/privacidad" className="text-gray-500 hover:text-gray-900 transition-colors">Privacidad</Link>
          </div>
          <p className="text-gray-400 text-sm">© 2026 TiendaApps. Hecho en Argentina.</p>
        </div>
      </footer>
    </div>
  );
}
