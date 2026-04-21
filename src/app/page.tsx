"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingBag, Store, Users, Truck,
  Star, ArrowRight, Zap, Shield, TrendingUp
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

function Card3D({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ rotateY: 4, rotateX: -4, scale: 1.03, z: 30 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50"
      >
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring" }}>
            <ShoppingBag className="h-7 w-7 text-indigo-600" />
          </motion.div>
          <span className="text-xl font-bold text-gray-900">MiTienda</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Iniciar sesión
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/registro"
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Crear tienda gratis
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative px-6 py-28 text-center max-w-5xl mx-auto">
        {/* Background blobs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border border-indigo-100"
        >
          <Star className="h-4 w-4 fill-indigo-400" />
          La plataforma de ventas #1 de Argentina
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight"
        >
          Vendé todo lo que quieras.{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Desde tu propia tienda.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Creá tu tienda online en minutos. Vendé ropa, joyas y más. Pagos con MercadoPago,
          envíos con Andreani y OCA, y sumá vendedoras que ganen comisión automática.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/registro"
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-200"
            >
              Empezar gratis <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
          <Link href="/tiendas" className="text-gray-600 font-semibold text-lg hover:text-indigo-600 transition-colors">
            Ver tiendas →
          </Link>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 flex items-center justify-center gap-8 flex-wrap"
        >
          {[
            { label: "Tiendas activas", value: "1.200+" },
            { label: "Vendedoras", value: "3.800+" },
            { label: "Ventas/mes", value: "$12M+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold text-indigo-600">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features con 3D */}
      <section className="bg-gray-50 px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="max-w-6xl mx-auto"
        >
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-900 text-center mb-4">
            Todo lo que necesitás para vender
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-center mb-12 text-lg">
            Sin complicaciones. Sin costos ocultos.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Store className="h-7 w-7 text-indigo-600" />,
                title: "Tu tienda propia",
                desc: "Personalizá colores, logo y diseño con templates profesionales. Hacela tuya.",
                gradient: "from-indigo-50 to-blue-50",
              },
              {
                icon: <ShoppingBag className="h-7 w-7 text-green-600" />,
                title: "Pagos automáticos",
                desc: "MercadoPago integrado. Cobrás al instante, sin formularios ni complicaciones.",
                gradient: "from-green-50 to-emerald-50",
              },
              {
                icon: <Truck className="h-7 w-7 text-blue-600" />,
                title: "Envíos a todo Argentina",
                desc: "Andreani, OCA y Correo Argentino. Cotización automática y seguimiento incluido.",
                gradient: "from-blue-50 to-cyan-50",
              },
              {
                icon: <Users className="h-7 w-7 text-purple-600" />,
                title: "Sistema de vendedoras",
                desc: "Sumá vendedoras a tu equipo. Ellas venden, ganan su comisión automáticamente.",
                gradient: "from-purple-50 to-pink-50",
              },
              {
                icon: <Zap className="h-7 w-7 text-yellow-600" />,
                title: "Caja de ahorro",
                desc: "Cada vendedora ve su saldo acumulado y retira cuando quiera. Como una billetera.",
                gradient: "from-yellow-50 to-orange-50",
              },
              {
                icon: <Shield className="h-7 w-7 text-red-500" />,
                title: "100% seguro",
                desc: "Pagos protegidos, datos encriptados. Comprá y vendé con total tranquilidad.",
                gradient: "from-red-50 to-rose-50",
              },
            ].map((f) => (
              <motion.div key={f.title} variants={fadeUp}>
                <Card3D className={`bg-gradient-to-br ${f.gradient} rounded-2xl p-6 border border-white shadow-sm h-full cursor-default`}>
                  <div className="mb-4 inline-flex p-3 bg-white rounded-xl shadow-sm">
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-900 text-center mb-14">
            ¿Cómo funciona?
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Creá tu tienda", desc: "Registrate, elegí un template y personalizá tu tienda. En 5 minutos estás listo para vender." },
              { step: "02", title: "Cargá tus productos", desc: "Subí fotos, ponele precio, talle y stock. Todo desde tu panel de control." },
              { step: "03", title: "Empezá a vender", desc: "Compartí tu tienda, sumá vendedoras y cobrá automáticamente con MercadoPago." },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUp} className="text-center">
                <div className="text-6xl font-extrabold text-indigo-100 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Vendedoras highlight */}
      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-20 mx-6 rounded-3xl mb-12 max-w-6xl lg:mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center text-white"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <TrendingUp className="h-4 w-4" />
            Generá trabajo real
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">
            El sistema de vendedoras más completo
          </motion.h2>
          <motion.p variants={fadeUp} className="text-indigo-200 text-lg mb-10 max-w-2xl mx-auto">
            Cualquier persona puede registrarse como vendedora, elegir tiendas para promocionar
            y ganar comisiones automáticas en su billetera personal.
          </motion.p>

          <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Registrarse", desc: "La vendedora crea su cuenta gratis" },
              { label: "Elegir tiendas", desc: "Ve todas las tiendas y se suma a las que quiere" },
              { label: "Ganar comisión", desc: "Cada venta suma a su caja de ahorro automáticamente" },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} className="bg-white/10 rounded-2xl p-5 border border-white/20">
                <p className="font-bold text-white mb-1">{item.label}</p>
                <p className="text-indigo-200 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-900 mb-4">
            ¿Listo para empezar a vender?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 mb-8 text-lg">
            Registrate gratis y creá tu tienda en menos de 5 minutos.
          </motion.p>
          <motion.div variants={fadeUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-200"
            >
              Crear mi tienda gratis <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <footer className="border-t border-gray-100 px-6 py-8 text-center text-gray-400 text-sm">
        © 2025 MiTienda · Hecho con ❤️ en Argentina
      </footer>
    </div>
  );
}
