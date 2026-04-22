"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useScroll, useMotionValueEvent } from "framer-motion";
import {
  ArrowRight, X, Store, Users, TrendingUp, Wallet, Truck, CheckCircle,
  ShoppingBag, Star, Zap, Shield, Send, MessageCircle, Phone, Mail,
  Package, Heart, ShoppingCart, Globe, Eye, ChevronRight, Menu,
} from "lucide-react";

/* ─── 3D Tilt Card ─── */
function Card3D({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-10, 10]);
  const sRotX = useSpring(rotateX, { stiffness: 180, damping: 18 });
  const sRotY = useSpring(rotateY, { stiffness: 180, damping: 18 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: sRotX, rotateY: sRotY, transformStyle: "preserve-3d" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Contact Modal ─── */
function ContactModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSent(true);
    setSending(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gray-950 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Mensaje enviado!</h3>
            <p className="text-gray-400">Te respondemos en menos de 24 hs.</p>
            <button onClick={onClose} className="mt-6 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-500 transition-colors">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">Contáctanos</h3>
              <p className="text-gray-400 mt-1">Respondemos todas las consultas.</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Nombre</label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Tu nombre"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="tu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Mensaje</label>
                <textarea
                  required value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  rows={4} placeholder="¿En qué podemos ayudarte?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
              </div>
              <button
                type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-60"
              >
                {sending ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send className="h-4 w-4" /> Enviar mensaje</>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const PLACEHOLDER_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6", "#0ea5e9"];

type RealStore = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  primaryColor: string;
  totalProducts: number;
  totalOrders: number;
  categories: string[];
  coverImg: string | null;
};

const FEATURES = [
  { icon: Store, title: "Tienda personalizable", desc: "10 plantillas, colores, fuentes, hero, tarjetas y más. Tu marca, tu estilo.", color: "#6366f1" },
  { icon: Users, title: "Red de afiliados", desc: "Los afiliados se postulan. Vos aprobas quien puede vender con tu link.", color: "#8b5cf6" },
  { icon: TrendingUp, title: "Comisiones automáticas", desc: "Cada venta por link afiliado genera comisión al instante en la billetera.", color: "#ec4899" },
  { icon: Wallet, title: "Billetera digital", desc: "Saldo, historial de ganancias y retiros con un solo clic.", color: "#f59e0b" },
  { icon: Truck, title: "Envíos integrados", desc: "Andreani, OCA y Correo Argentino con tracking automático.", color: "#10b981" },
  { icon: Shield, title: "Control total", desc: "Vos decidis que afiliados activar, que stock mostrar y como presentarte.", color: "#0ea5e9" },
];

const TESTIMONIALS = [
  { name: "Valentina M.", role: "Dueña · Luna Moda", text: "En 3 meses duplicamos las ventas gracias al sistema de afiliados. Es increiblemente facil de usar.", img: "https://images.unsplash.com/photo-1494790108755-2616b612b786?auto=format&fit=crop&w=150&q=80" },
  { name: "Camila R.", role: "Afiliada", text: "Gano $180k por mes compartiendo links desde mi celular. Sin invertir nada, solo tiempo.", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80" },
  { name: "Sofía G.", role: "Dueña · Bella Joyas", text: "La tienda quedó hermosa sin saber nada de diseño. Y las comisiones se calculan solas.", img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=150&q=80" },
];

const SLOTS = 6;

export default function Home() {
  const [contact, setContact] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [realStores, setRealStores] = useState<RealStore[]>([]);
  const { user: sessionUser } = useAuth();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setNavScrolled(v > 50));

  useEffect(() => {
    fetch("/api/stores?featured=true&limit=6")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.stores)) setRealStores(d.stores); })
      .catch(() => {});
  }, []);

  const role = sessionUser?.role;
  const panelHref = role === "OWNER" ? "/dashboard" : role === "SELLER" ? "/vendedoras" : "/mi-cuenta";
  const panelLabel = role === "OWNER" ? "Mi tienda" : role === "SELLER" ? "Mi panel" : "Mi cuenta";
  const userName = sessionUser?.name?.split(" ")[0] ?? null;

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .float { animation: float 5s ease-in-out infinite; }
        .gradient-text {
          background: linear-gradient(135deg, #818cf8, #a78bfa, #f472b6, #818cf8);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glow-border { box-shadow: 0 0 0 1px rgba(99,102,241,.3), 0 0 30px rgba(99,102,241,.15); }
        .grid-bg { background-image: linear-gradient(rgba(99,102,241,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.06) 1px, transparent 1px); background-size: 48px 48px; }
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? "bg-gray-950/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-4.5 w-4.5 text-white h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">MiTienda</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[["#tiendas", "Tiendas"], ["#como-funciona", "Cómo funciona"], ["#nosotros", "Quiénes somos"]].map(([href, label]) => (
              <a key={href} href={href} className="text-gray-400 hover:text-white text-sm font-medium transition-colors">{label}</a>
            ))}
            <button onClick={() => setContact(true)} className="text-gray-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />Contacto
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {sessionUser ? (
              <>
                <span className="text-gray-400 text-sm">Hola, {userName ?? "!"}</span>
                <Link href={panelHref} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105">
                  {panelLabel}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all">
                  Iniciar sesión
                </Link>
                <Link href="/registro" className="relative bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-gray-400 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-gray-950 border-t border-white/5 px-6 py-4 space-y-3"
            >
              {[["#tiendas", "Tiendas"], ["#como-funciona", "Cómo funciona"], ["#nosotros", "Quiénes somos"]].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block text-gray-300 hover:text-white py-2">{label}</a>
              ))}
              <button onClick={() => { setContact(true); setMobileMenu(false); }} className="block text-gray-300 hover:text-white py-2 w-full text-left">Contacto</button>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                {sessionUser ? (
                  <Link href={panelHref} onClick={() => setMobileMenu(false)} className="text-center bg-indigo-600 rounded-xl py-2.5 text-sm font-semibold text-white">
                    {panelLabel}
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="text-center border border-white/10 rounded-xl py-2.5 text-sm text-white">Iniciar sesión</Link>
                    <Link href="/registro" className="text-center bg-indigo-600 rounded-xl py-2.5 text-sm font-semibold text-white">Crear cuenta</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center grid-bg">
        {/* Gradient blobs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <Star className="h-3.5 w-3.5 fill-indigo-400 text-indigo-400" />
              Plataforma #1 para afiliados argentinos
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
              Vendé más.<br />
              <span className="gradient-text">Con equipo.</span><br />
              Sin límites.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-gray-400 mb-10 leading-relaxed max-w-lg">
              Las tiendas cargan productos y aprueban afiliados.
              Los afiliados comparten su link y cobran comisiones automaticamente.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-14">
              <Link
                href="/registro"
                className="group flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105"
              >
                Crear mi tienda gratis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => setContact(true)}
                className="flex items-center gap-2 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:bg-white/5"
              >
                <MessageCircle className="h-5 w-5" />
                Hablar con nosotros
              </button>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6">
              {[
                { value: "1.200+", label: "Tiendas activas" },
                { value: "3.800+", label: "Afiliados" },
                { value: "$12M+", label: "Ventas/mes" },
              ].map((s) => (
                <div key={s.label} className="border-l border-indigo-500/30 pl-4">
                  <p className="text-3xl font-black gradient-text">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Floating store mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block"
          >
            <Card3D className="cursor-pointer">
              <div className="float relative">
                {/* Main card */}
                <div className="glow-border bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
                  {/* Store header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Luna Moda</p>
                        <p className="text-indigo-200 text-xs">mitienda.ar/lunamoda</p>
                      </div>
                      <div className="ml-auto bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">Activa</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {["$83.200", "24 ventas", "8 afiliados"].map((v, i) => (
                        <div key={i} className="bg-white/10 rounded-xl p-2.5 text-center">
                          <p className="text-white font-bold text-sm">{v}</p>
                          <p className="text-indigo-200 text-xs">{["Este mes", "Este mes", "Activas"][i]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Products mini grid */}
                  <div className="p-5 space-y-3">
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Productos destacados</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: "Remera oversize", price: "$8.500", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=80" },
                        { name: "Jean cargo", price: "$12.900", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=200&q=80" },
                      ].map((p) => (
                        <div key={p.name} className="bg-gray-800/60 rounded-2xl overflow-hidden border border-white/5">
                          <img src={p.img} alt={p.name} className="w-full h-24 object-cover" />
                          <div className="p-2.5">
                            <p className="text-white text-xs font-medium truncate">{p.name}</p>
                            <p className="text-indigo-400 text-xs font-bold mt-0.5">{p.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Afiliado row */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?auto=format&fit=crop&w=80&q=80" alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-emerald-400 text-xs font-semibold">Valentina vendió $18.400</p>
                        <p className="text-gray-500 text-xs">Comisión: $3.680 → billetera</p>
                      </div>
                      <Zap className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <motion.div
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-6 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-emerald-500/30"
                >
                  +$18.400 venta ✓
                </motion.div>
                <motion.div
                  animate={{ y: [4, -4, 4] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-4 -left-6 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-1.5"
                >
                  <Users className="h-3 w-3" /> 8 afiliados activos
                </motion.div>
              </div>
            </Card3D>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="como-funciona" className="relative py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Plataforma completa</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">Todo lo que necesitás para vender</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">Tienda, productos, pedidos, afiliados, comisiones y retiros en un solo panel.</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <motion.div key={title} variants={fadeUp}>
                <Card3D className="h-full">
                  <div className="h-full bg-white border border-gray-100 rounded-3xl p-7 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-default">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: color + "18" }}
                    >
                      <Icon className="h-7 w-7" style={{ color }} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMO FUNCIONA (Steps) ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-900/20 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">Simple y rápido</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-4">¿Cómo funciona?</motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-indigo-600/0 via-indigo-600/50 to-indigo-600/0" />
            {[
              { n: "01", title: "Creás tu tienda", desc: "Registrate, elegí una plantilla, personalizá colores y cargá tus productos en minutos.", icon: Store },
              { n: "02", title: "Aprobas afiliados", desc: "Los afiliados se postulan. Revisas su perfil y decidis quien puede vender con tu marca.", icon: Users },
              { n: "03", title: "Vendés con equipo", desc: "Cada venta por link afiliado suma comisión automáticamente. Vos crecés, ellas también.", icon: TrendingUp },
            ].map(({ n, title, desc, icon: Icon }) => (
              <motion.div key={n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: parseInt(n) * 0.15 }} className="relative text-center">
                <div className="w-20 h-20 bg-indigo-600/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <Icon className="h-9 w-9 text-indigo-400" />
                </div>
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-3 bg-indigo-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                  {n.slice(1)}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VER TIENDAS ── */}
      <section id="tiendas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-2">Tiendas reales</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-900">Explorá las tiendas activas</motion.h2>
            </div>
            <motion.div variants={fadeUp}>
              <Link href="/tiendas" className="flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                Ver todas <ChevronRight className="h-5 w-5" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: SLOTS }).map((_, i) => {
              const store = realStores[i];
              const color = PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length];
              return (
                <motion.div key={i} variants={fadeUp}>
                  <Card3D>
                    {store ? (
                      <Link href={`/tienda/${store.slug}`} className="block bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
                        <div className="relative overflow-hidden h-48">
                          {store.coverImg || store.banner ? (
                            <img src={(store.coverImg || store.banner)!} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: store.primaryColor + "22" }}>
                              <Store className="h-16 w-16 opacity-30" style={{ color: store.primaryColor }} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-3">
                            <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full border border-white/20">
                              {store.categories[0] ?? "General"}
                            </span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-900">{store.name}</h3>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: store.primaryColor }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{store.totalProducts} productos</span>
                            <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: store.primaryColor }}>
                              <Eye className="h-4 w-4" /> Ver tienda
                            </span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="bg-white border border-dashed border-gray-200 rounded-3xl overflow-hidden h-full">
                        <div className="h-48 flex items-center justify-center" style={{ backgroundColor: color + "11" }}>
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: color + "22" }}>
                              <Store className="h-6 w-6" style={{ color }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Próximamente</span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-3" />
                          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                        </div>
                      </div>
                    )}
                  </Card3D>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── DOS CAMINOS ── */}
      <section className="py-24 bg-gray-950 relative">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-4">Dos caminos, una plataforma</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-lg">¿Tenes tienda o sos afiliado? Cada perfil tiene su panel propio.</motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Store, color: "#6366f1", gradient: "from-indigo-600/20 to-purple-600/10", border: "border-indigo-500/20",
                title: "Para dueñas", sub: "Creá y administrá tu tienda",
                items: ["Tienda propia con dominio personalizable", "Hasta 10 plantillas de diseño distintas", "Panel de afiliados con aprobacion", "Control de stock, pedidos y envios", "Comisiones automaticas y reportes"],
                cta: "Crear mi tienda", href: "/registro",
              },
              {
                icon: Users, color: "#a855f7", gradient: "from-purple-600/20 to-pink-600/10", border: "border-purple-500/20",
                title: "Para afiliados", sub: "Ganas sin tener tienda propia",
                items: ["Postulate a tiendas activas", "Link de afiliado con tracking propio", "Billetera digital con historial", "Retira tus ganancias cuando quieras", "Panel simple desde el celular"],
                cta: "Quiero ser afiliado", href: "/vendedoras",
              },
            ].map(({ icon: Icon, color, gradient, border, title, sub, items, cta, href }) => (
              <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <div className={`h-full bg-gradient-to-br ${gradient} border ${border} rounded-3xl p-8`}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: color + "20" }}>
                    <Icon className="h-7 w-7" style={{ color }} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">{title}</h3>
                  <p className="text-gray-400 text-sm mb-6">{sub}</p>
                  <ul className="space-y-3 mb-8">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                    style={{ backgroundColor: color }}
                  >
                    {cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Testimonios reales</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-900">Lo que dicen nuestras usuarias</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <motion.div key={t.name} variants={fadeUp}>
                <Card3D className="h-full">
                  <div className="h-full bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                    <div className="flex gap-0.5 mb-4">
                      {[1,2,3,4,5].map((s) => <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                    <div className="flex items-center gap-3 mt-auto">
                      <img src={t.img} alt={t.name} className="w-11 h-11 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                        <p className="text-gray-500 text-xs">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── QUIÉNES SOMOS ── */}
      <section id="nosotros" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="grid grid-cols-2 gap-4">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl" />
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl mt-8" />
              <img src="https://images.unsplash.com/photo-1573497161161-c3e73707e25c?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl -mt-8" />
              <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80" alt="Equipo" className="w-full aspect-square object-cover rounded-3xl" />
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Quiénes somos</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-900 mb-6">Construimos la plataforma que quisiéramos usar</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 leading-relaxed mb-5">
              Somos un equipo argentino que entendio el potencial de las redes de afiliados. Vimos como las tiendas perdian ventas por no tener herramientas para gestionar su equipo de forma profesional.
            </motion.p>
            <motion.p variants={fadeUp} className="text-gray-500 leading-relaxed mb-8">
              MiTienda nacio para democratizar el ecommerce: que cualquier persona pueda tener una tienda online hermosa, con afiliados, pagos y envios, sin necesitar conocimientos tecnicos.
            </motion.p>
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-5">
              {[
                { icon: Globe, label: "100% argentino", desc: "Medios de pago y envíos locales" },
                { icon: Shield, label: "Datos seguros", desc: "Tus datos y los de tus clientes" },
                { icon: Zap, label: "Siempre activo", desc: "Uptime 99.9% garantizado" },
                { icon: MessageCircle, label: "Soporte real", desc: "Respondemos en menos de 24hs" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative text-center max-w-3xl mx-auto px-6">
          <h2 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            ¿Lista para <span className="gradient-text">vender mejor?</span>
          </h2>
          <p className="text-gray-400 text-xl mb-10">Creá tu tienda gratis hoy. Sin tarjeta de crédito. Sin límite de tiempo.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registro"
              className="group flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105"
            >
              Crear cuenta gratis
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={() => setContact(true)}
              className="flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:bg-white/5"
            >
              <Phone className="h-5 w-5" /> Contactar
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#020408] border-t border-white/5 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">MiTienda</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                La plataforma de ecommerce con sistema de afiliados para crecer con equipo.
              </p>
              <div className="flex items-center gap-4 mt-5">
                <button onClick={() => setContact(true)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-400 transition-colors">
                  <Mail className="h-4 w-4" /> hola@mitienda.ar
                </button>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Plataforma</p>
              <ul className="space-y-2.5">
                {[["#tiendas", "Ver tiendas"], ["#como-funciona", "Cómo funciona"], ["/registro", "Crear cuenta"], ["/login", "Iniciar sesión"]].map(([href, label]) => (
                  <li key={label}><a href={href} className="text-gray-500 hover:text-white text-sm transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-4">Afiliados</p>
              <ul className="space-y-2.5">
                {[["/vendedoras", "Postularme"], ["/vendedoras/billetera", "Mi billetera"], ["#nosotros", "Quiénes somos"]].map(([href, label]) => (
                  <li key={label}><a href={href} className="text-gray-500 hover:text-white text-sm transition-colors">{label}</a></li>
                ))}
                <li><button onClick={() => setContact(true)} className="text-gray-500 hover:text-white text-sm transition-colors">Contacto</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-600 text-sm">© 2026 MiTienda. Hecho con ❤️ en Argentina.</p>
            <p className="text-gray-700 text-xs">Plataforma ecommerce para tiendas y afiliados</p>
          </div>
        </div>
      </footer>

      {/* ── Floating contact button ── */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.5, type: "spring" }}
        onClick={() => setContact(true)}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-500 text-white w-14 h-14 rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center transition-all hover:scale-110"
        title="Contacto"
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      {/* ── Contact Modal ── */}
      <AnimatePresence>
        {contact && <ContactModal onClose={() => setContact(false)} />}
      </AnimatePresence>
    </div>
  );
}
