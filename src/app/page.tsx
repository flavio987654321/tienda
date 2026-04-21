"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, ShoppingBag, Star, Store, TrendingUp, Truck, Users, Wallet } from "lucide-react";

const heroImages = [
  {
    src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
    label: "Tiendas reales",
  },
  {
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80",
    label: "Moda y accesorios",
  },
  {
    src: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=700&q=80",
    label: "Envios",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900">MiTienda</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/vendedoras" className="hidden sm:inline text-gray-600 hover:text-gray-900 font-medium">
            Soy vendedora
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
            Iniciar sesion
          </Link>
          <Link href="/registro" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            Crear cuenta
          </Link>
        </div>
      </nav>

      <section className="px-6 py-20 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border border-indigo-100">
            <Star className="h-4 w-4 fill-indigo-400" />
            Plataforma para dueñas y vendedoras
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
            Crea tu tienda. <span className="text-indigo-600">Aproba vendedoras.</span> Vende mas.
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl text-gray-500 mb-10 leading-relaxed">
            Las dueñas crean su ecommerce, cargan productos y aprueban solicitudes.
            Las vendedoras se postulan a tiendas activas, comparten su link y retiran sus comisiones.
          </motion.p>
          <motion.div variants={fadeUp} className="flex items-center gap-4 flex-wrap">
            <Link href="/registro" className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-200">
              Crear cuenta <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/vendedoras" className="text-gray-700 font-semibold text-lg hover:text-indigo-600 transition-colors">
              Postularme como vendedora →
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-12 grid grid-cols-3 gap-5">
            {[
              { label: "Tiendas activas", value: "1.200+" },
              { label: "Vendedoras", value: "3.800+" },
              { label: "Ventas/mes", value: "$12M+" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-extrabold text-indigo-600">{stat.value}</p>
                <p className="text-sm text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 overflow-hidden rounded-2xl shadow-xl aspect-[16/9]">
            <img src={heroImages[0].src} alt={heroImages[0].label} className="h-full w-full object-cover" />
          </div>
          {heroImages.slice(1).map((image) => (
            <div key={image.src} className="relative overflow-hidden rounded-2xl aspect-square shadow-sm">
              <img src={image.src} alt={image.label} className="h-full w-full object-cover" />
              <div className="absolute left-3 bottom-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800">
                {image.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      <section className="bg-gray-50 px-6 py-20">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="max-w-6xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-900 text-center mb-4">
            Todo lo necesario para vender con equipo
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-center mb-12 text-lg">
            Tienda, productos, pedidos, vendedoras, comisiones y retiros en un solo panel.
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Store, title: "Tienda propia", desc: "La dueña crea una tienda, personaliza diseño y carga productos con stock." },
              { icon: Users, title: "Solicitudes de vendedoras", desc: "Las vendedoras se postulan y la dueña aprueba o rechaza cada perfil." },
              { icon: TrendingUp, title: "Comisiones automaticas", desc: "Cada venta por link aprobado genera comision y se suma a la billetera." },
              { icon: Wallet, title: "Retiros de saldo", desc: "La vendedora ve su porcentaje, saldo disponible y puede pedir retiros." },
              { icon: Truck, title: "Pedidos y envios", desc: "Panel para confirmar pagos, descontar stock, cargar tracking y entregar." },
              { icon: CheckCircle, title: "Control para la dueña", desc: "La dueña decide si activa vendedoras y a quien le da permiso real para vender." },
            ].map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="mb-4 inline-flex p-3 bg-indigo-50 rounded-xl">
                  <Icon className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="px-6 py-20 max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-gray-900 text-center mb-14">
            Dos caminos, una misma plataforma
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 p-7">
              <Store className="h-8 w-8 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Para dueñas</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>Crear tienda y activar sistema de vendedoras.</li>
                <li>Revisar solicitudes con presentacion, experiencia y CV/link.</li>
                <li>Aprobar permisos, confirmar pagos y controlar comisiones.</li>
              </ul>
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-2xl border border-gray-100 p-7">
              <Users className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Para vendedoras</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>Crear cuenta sin tienda propia.</li>
                <li>Ver tiendas activas y postularse con datos reales.</li>
                <li>Compartir link aprobado, ver porcentaje y pedir retiros.</li>
              </ul>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="px-6 py-20 text-center bg-gray-950 text-white">
        <h2 className="text-4xl font-bold mb-4">Listo para vender mejor?</h2>
        <p className="text-gray-300 mb-8 text-lg">Crea una cuenta como dueña o vendedora y empeza desde el panel correcto.</p>
        <Link href="/registro" className="inline-flex items-center gap-2 bg-white text-gray-950 px-10 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors">
          Crear cuenta <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      <footer className="border-t border-gray-100 px-6 py-8 text-center text-gray-400 text-sm">
        © 2026 MiTienda. Plataforma ecommerce para dueñas y vendedoras.
      </footer>
    </div>
  );
}
