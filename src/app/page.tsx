"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useScroll, useMotionValueEvent } from "framer-motion";
import {
  ArrowRight, X, Store, Users, TrendingUp, Wallet, Truck, CheckCircle,
  ShoppingBag, Star, Zap, Shield, Send, MessageCircle, Phone, Mail,
  Package, Heart, ShoppingCart, Globe, Eye, ChevronRight, Menu, MapPin,
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

type RealTestimonial = {
  id: string;
  name: string;
  role: string;
  location: string | null;
  text: string;
};

/* ─── Modal: Contá tu historia ─── */
function TestimonioModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", role: "Afiliado", location: "", text: "", rating: 5 });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/testimonios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Algo salió mal. Intentá de nuevo.");
    }
    setSending(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gray-950 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Gracias por compartir!</h3>
            <p className="text-gray-400 text-sm">Revisamos tu historia y si todo está bien la publicamos en la página.</p>
            <button onClick={onClose} className="mt-6 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-500 transition-colors text-sm">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">Contá tu historia</h3>
              <p className="text-gray-400 mt-1 text-sm">¿Ya usás MiTienda? Contanos cómo te fue. La revisamos y la publicamos.</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Tu calificación</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setForm((p) => ({ ...p, rating: s }))}
                      className="transition-transform hover:scale-110">
                      <Star className={`h-7 w-7 ${s <= form.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tu nombre</label>
                <input
                  type="text" required value={form.name} maxLength={80}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Valentina M."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Soy...</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="Afiliado" className="bg-gray-900">Afiliado/a</option>
                    <option value="Dueño de tienda" className="bg-gray-900">Dueño/a de tienda</option>
                    <option value="Comprador" className="bg-gray-900">Comprador/a</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Ciudad (opcional)</label>
                  <input
                    type="text" value={form.location} maxLength={60}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Buenos Aires"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tu experiencia</label>
                <textarea
                  required value={form.text} maxLength={500}
                  onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                  rows={4} placeholder="Contanos cómo te fue, qué lograste, qué cambió..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                />
                <p className="text-right text-xs text-gray-600 mt-1">{form.text.length}/500</p>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-60 text-sm"
              >
                {sending ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="h-4 w-4" /> Enviar mi historia</>}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

const FEATURES = [
  { icon: Store, title: "Tienda personalizable", desc: "Elegí entre 10 plantillas, personalizá colores, fuentes y fotos. Tu marca, exactamente como la imaginás.", color: "#6366f1" },
  { icon: Users, title: "Afiliados que venden por vos", desc: "Los afiliados se postulan, vos aprobás. Cada uno sale a vender con su link — sin que pagues un sueldo.", color: "#8b5cf6" },
  { icon: TrendingUp, title: "Comisiones automáticas", desc: "Cuando el afiliado genera una venta, la comisión se acredita sola en su billetera. Sin planillas ni cálculos.", color: "#ec4899" },
  { icon: Wallet, title: "Billetera digital", desc: "Cada afiliado ve su saldo en tiempo real y retira sus ganancias cuando quiere. Simple y transparente.", color: "#f59e0b" },
  { icon: Truck, title: "Envíos integrados", desc: "Andreani, OCA y Correo Argentino con seguimiento automático. Tus clientes saben dónde está su pedido.", color: "#10b981" },
  { icon: Shield, title: "Control total", desc: "Vos decidís qué afiliados activar, qué stock mostrar y cómo presentarte. Tu tienda, tus reglas.", color: "#0ea5e9" },
];

const TESTIMONIALS = [
  { name: "Valentina M.", role: "Dueña · Luna Moda", text: "Tengo 12 afiliados que venden mis productos en Instagram y TikTok. No les pago sueldo — solo comisión por venta real. Triplicamos las ventas en 4 meses.", img: "https://i.pravatar.cc/150?img=47" },
  { name: "Camila R.", role: "Afiliada · Tucumán", text: "Empecé sin saber nada. Con el celular, compartiendo productos por WhatsApp e Instagram. Hoy gano $180.000 por mes sin salir de mi casa y sin haber invertido un peso.", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80" },
  { name: "Sofía G.", role: "Dueña · Bella Joyas", text: "Antes gastaba una fortuna en publicidad y llegaba a muy poca gente. Con los afiliados, mi tienda llegó a provincias que nunca hubiera podido alcanzar sola.", img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=150&q=80" },
];

const SLOTS = 6;

export default function Home() {
  const [contact, setContact] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [realStores, setRealStores] = useState<RealStore[]>([]);
  const [realTestimonials, setRealTestimonials] = useState<RealTestimonial[]>([]);
  const [testimonioModal, setTestimonioModal] = useState(false);
  const { user: sessionUser } = useAuth();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setNavScrolled(v > 50));

  useEffect(() => {
    fetch("/api/stores?featured=true&limit=6")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.stores)) setRealStores(d.stores); })
      .catch(() => {});
    fetch("/api/testimonios")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRealTestimonials(d); })
      .catch(() => {});
  }, []);

  const role = sessionUser?.role;
  const panelHref = role === "ADMIN" ? "/admin" : role === "OWNER" ? "/dashboard" : role === "SELLER" ? "/vendedoras" : "/mi-cuenta";
  const panelLabel = role === "ADMIN" ? "Admin" : role === "OWNER" ? "Mi tienda" : role === "SELLER" ? "Mi panel" : "Mi cuenta";
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
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .marquee { animation: marquee 30s linear infinite; display: flex; width: max-content; }
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
            {[["#tiendas", "Tiendas"], ["#como-funciona", "Cómo funciona"]].map(([href, label]) => (
              <a key={href} href={href} className="text-gray-400 hover:text-white text-sm font-medium transition-colors">{label}</a>
            ))}
            <Link href="/quienes-somos" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Quiénes somos</Link>
            <Link href="/precios" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Precios</Link>
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
              {[["#tiendas", "Tiendas"], ["#como-funciona", "Cómo funciona"]].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block text-gray-300 hover:text-white py-2">{label}</a>
              ))}
              <Link href="/quienes-somos" onClick={() => setMobileMenu(false)} className="block text-gray-300 hover:text-white py-2">Quiénes somos</Link>
              <Link href="/precios" onClick={() => setMobileMenu(false)} className="block text-gray-300 hover:text-white py-2">Precios</Link>
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
              Ecommerce con afiliados · 100% argentino
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
              Tu tienda.<br />
              <span className="gradient-text">Tu equipo.</span><br />
              Todos ganan.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-gray-400 mb-10 leading-relaxed max-w-lg">
              Los dueños de tienda consiguen un equipo de ventas sin pagar sueldos.
              Los afiliados trabajan desde casa, con el celular, sin invertir un peso.
              Cada venta que se genera, los dos cobran.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-14">
              <Link
                href="/registro"
                className="group flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105"
              >
                Crear mi tienda gratis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/vendedoras"
                className="flex items-center gap-2 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:bg-white/5"
              >
                <Users className="h-5 w-5" />
                Quiero ser afiliado
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6">
              {[
                { value: "1.200+", label: "Tiendas con equipo" },
                { value: "3.800+", label: "Afiliados ganando" },
                { value: "$12M+", label: "Distribuido/mes" },
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
                        <img src="https://i.pravatar.cc/80?img=47" alt="" className="w-full h-full object-cover" />
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

      {/* ── MARQUEE STRIP ── */}
      <div className="bg-indigo-600 py-3.5 overflow-hidden border-y border-indigo-500/40">
        <div className="marquee gap-10 items-center">
          {[
            "✦ Tienda personalizable",
            "✦ Afiliados automáticos",
            "✦ Comisiones al instante",
            "✦ Envíos integrados",
            "✦ Mercado Pago",
            "✦ Billetera digital",
            "✦ Andreani & OCA",
            "✦ Panel en tiempo real",
            "✦ 100% argentino",
            "✦ Gratis para empezar",
            "✦ Tienda personalizable",
            "✦ Afiliados automáticos",
            "✦ Comisiones al instante",
            "✦ Envíos integrados",
            "✦ Mercado Pago",
            "✦ Billetera digital",
            "✦ Andreani & OCA",
            "✦ Panel en tiempo real",
            "✦ 100% argentino",
            "✦ Gratis para empezar",
          ].map((item, i) => (
            <span key={i} className="text-white/90 text-sm font-semibold whitespace-nowrap px-5">{item}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="como-funciona" className="relative py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Plataforma completa</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">Todo en uno. Sin complicaciones.</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">Tienda, afiliados, comisiones, envíos y cobros en un solo lugar. Para que vos te enfoques en vender.</motion.p>
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

      {/* ── SHOWCASE VISUAL ── */}
      <section className="py-24 bg-gray-950 overflow-hidden relative">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">En acción</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-4">Tu tienda, en cualquier pantalla</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-xl mx-auto">Diseñada para mobile, perfecta en desktop. Tus clientes compran desde donde quieran.</motion.p>
          </motion.div>

          <div className="grid grid-cols-12 gap-4">
            {/* Imagen principal grande */}
            <motion.div
              initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="col-span-12 lg:col-span-7 relative"
            >
              <div className="relative rounded-3xl overflow-hidden h-[440px] glow-border">
                <img
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80"
                  alt="Compradora online"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
                {/* Floating card sobre imagen */}
                <motion.div
                  animate={{ y: [-4, 4, -4] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-6 left-6 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
                >
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Pedido confirmado</p>
                    <p className="text-gray-400 text-xs">Remera oversize · $8.500</p>
                  </div>
                  <div className="ml-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                </motion.div>
              </div>
            </motion.div>

            {/* Grid de 4 imágenes más chicas */}
            <motion.div
              initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15 }}
              className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4"
            >
              {[
                { src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80", label: "Desde el celular" },
                { src: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80", label: "Envíos rápidos" },
                { src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80", label: "Pagos seguros" },
                { src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80", label: "Tu tienda online" },
              ].map(({ src, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative rounded-2xl overflow-hidden h-[206px] group"
                >
                  <img src={src} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-white text-xs font-semibold">{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
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
            <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-xl mx-auto">Tres pasos para tener tu tienda con equipo propio trabajando para vos.</motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-indigo-600/0 via-indigo-600/50 to-indigo-600/0" />
            {[
              { n: "01", title: "Creás tu tienda", desc: "Registrate en minutos, personalizá con tus colores y cargá tus productos. Sin conocimientos técnicos, sin pagar a un diseñador.", icon: Store },
              { n: "02", title: "Sumás afiliados", desc: "Los afiliados ven tu tienda y se postulan para vender. Vos revisás y aprobás quién representa tu marca. El control es tuyo.", icon: Users },
              { n: "03", title: "Todos cobran", desc: "Cada venta por link afiliado genera comisión automática para ellos y ganancia para vos. Sin sueldos fijos, sin riesgos.", icon: TrendingUp },
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

      {/* ── TRES CAMINOS ── */}
      <section className="py-24 bg-gray-950 relative">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-indigo-400 font-semibold text-sm uppercase tracking-widest mb-3">Para todos</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-white mb-4">¿Cuál es tu rol?</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-400 text-lg">Tenés tienda, querés trabajar como afiliado o simplemente comprar — hay un lugar para vos.</motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Store, color: "#6366f1", gradient: "from-indigo-600/20 to-purple-600/10", border: "border-indigo-500/20",
                title: "Tengo una tienda", sub: "Armá tu equipo de ventas sin pagar sueldos",
                items: ["Tienda online con dominio personalizable", "10 plantillas de diseño sin código", "Afiliados que venden por vos — gratis hasta que venden", "Control total: vos aprobás quién entra", "Comisiones automáticas y reportes en tiempo real"],
                cta: "Crear mi tienda gratis", href: "/registro",
              },
              {
                icon: Users, color: "#a855f7", gradient: "from-purple-600/20 to-pink-600/10", border: "border-purple-500/20",
                title: "Quiero trabajar", sub: "Trabajá desde casa sin invertir un peso",
                items: ["Postulate a tiendas y empezá a vender ya", "Tu propio link con seguimiento en tiempo real", "Cuanto más compartís, más ganás — sin límite", "Billetera digital con tu historial completo", "Retirá tus ganancias cuando quieras"],
                cta: "Quiero ser afiliado", href: "/vendedoras",
              },
              {
                icon: ShoppingCart, color: "#10b981", gradient: "from-emerald-600/20 to-teal-600/10", border: "border-emerald-500/20",
                title: "Quiero comprar", sub: "Descubrí tiendas argentinas en un solo lugar",
                items: ["Tiendas locales verificadas y activas", "Pagá con Mercado Pago de forma segura", "Seguí tus envíos en tiempo real", "Guardá favoritos y dejá reseñas", "Tu historial de pedidos siempre a mano"],
                cta: "Explorar tiendas", href: "/tiendas",
              },
            ].map(({ icon: Icon, color, gradient, border, title, sub, items, cta, href }) => (
              <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <div className={`h-full bg-gradient-to-br ${gradient} border ${border} rounded-3xl p-8 flex flex-col`}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: color + "20" }}>
                    <Icon className="h-7 w-7" style={{ color }} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">{title}</h3>
                  <p className="text-gray-400 text-sm mb-6">{sub}</p>
                  <ul className="space-y-3 mb-8 flex-1">
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
            <motion.p variants={fadeUp} className="text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-3">Historias reales</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-900">Personas que ya están ganando</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg mt-3 max-w-xl mx-auto">Dueños con equipo. Afiliados con ingresos. Sin inversión inicial.</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {(() => {
              const displayed = [
                ...realTestimonials.slice(0, 3),
                ...TESTIMONIALS.slice(0, Math.max(0, 3 - realTestimonials.length)).map((t, i) => ({
                  id: `fallback-${i}`, name: t.name, role: t.role, location: null, text: t.text, rating: 5, img: t.img,
                })),
              ].slice(0, 3);
              return displayed.map((t) => (
                <motion.div key={t.id} variants={fadeUp}>
                  <Card3D className="h-full">
                    <div className="h-full bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col">
                      <div className="flex gap-0.5 mb-4">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${"rating" in t && s <= (t as {rating:number}).rating ? "fill-yellow-400 text-yellow-400" : "fill-yellow-400 text-yellow-400"}`} />
                        ))}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mb-6 italic flex-1">"{t.text}"</p>
                      <div className="flex items-center gap-3">
                        {"img" in t && (t as {img:string}).img ? (
                          <img src={(t as {img:string}).img} alt={t.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-400 font-bold text-sm">{t.name[0]}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                          <p className="text-gray-500 text-xs">
                            {t.role}{"location" in t && t.location ? ` · ${t.location}` : ""}
                          </p>
                        </div>
                        {realTestimonials.some((r) => r.id === t.id) && (
                          <div className="ml-auto">
                            <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">Verificado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card3D>
                </motion.div>
              ));
            })()}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <button
              onClick={() => setTestimonioModal(true)}
              className="inline-flex items-center gap-2 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:text-indigo-700 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:shadow-md hover:shadow-indigo-100"
            >
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ¿Ya usás MiTienda? Contá tu historia
            </button>
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
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-900 mb-6">Queremos que la gente tenga trabajo.</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 leading-relaxed mb-5">
              Somos un equipo argentino y sabemos cómo está el país. Vimos que había dos problemas sin resolver: dueños de tienda sin equipo para vender, y personas con ganas de trabajar sin oportunidades reales.
            </motion.p>
            <motion.p variants={fadeUp} className="text-gray-500 leading-relaxed mb-8">
              MiTienda une esos dos mundos. Un dueño puede tener 10, 20 o 50 personas vendiendo sus productos en redes sin pagar un sueldo fijo. Y cada uno de esos afiliados gana dinero real desde su casa, con su celular, sin haber puesto un peso.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Link href="/quienes-somos" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:scale-105">
                Conocé nuestra historia <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/vendedoras" className="inline-flex items-center gap-2 border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 px-6 py-3 rounded-2xl font-semibold transition-all hover:bg-indigo-50">
                Quiero ser afiliado
              </Link>
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
            Empezá hoy.<br />
            <span className="gradient-text">Es gratis.</span>
          </h2>
          <p className="text-gray-400 text-xl mb-10">
            Si tenés una tienda, armá tu equipo sin pagar sueldos.<br />
            Si buscás trabajo, empezá a ganar desde tu celular.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registro?plan=owner"
              className="group flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105"
            >
              Crear mi tienda gratis
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/vendedoras"
              className="flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all hover:bg-white/5"
            >
              <Users className="h-5 w-5" /> Quiero ser afiliado
            </Link>
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
                {[["/vendedoras", "Postularme"], ["/vendedoras/billetera", "Mi billetera"], ["/quienes-somos", "Quiénes somos"]].map(([href, label]) => (
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

      {/* ── Testimonio Modal ── */}
      <AnimatePresence>
        {testimonioModal && <TestimonioModal onClose={() => setTestimonioModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
