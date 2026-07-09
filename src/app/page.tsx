"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { STORE_TYPES } from "@/lib/storeTypes";
import PromotionsCarousel from "@/components/PromotionsCarousel";
import AsistentePersonaje from "@/components/dashboard/AsistentePersonaje";
import { AppLogo } from "@/components/AppLogo";
import { useTurnstile } from "@/components/Turnstile";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useScroll, useMotionValueEvent } from "framer-motion";
import {
  ArrowRight, X, Store, Users, TrendingUp, CheckCircle, Trophy,
  ShoppingBag, Star, Zap, Send, MessageCircle, Mail, HeartHandshake,
  Package, ShoppingCart, Eye, ChevronRight, ChevronLeft, Menu,
  BadgeCheck, Shirt, Car, Home as HomeIcon, Utensils, Sparkles, Dumbbell, PawPrint, BookOpen, LayoutGrid,
  ExternalLink, Info, Bell, Tag, Shield, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TEMPLATE_CATEGORIES } from "@/lib/templateRegistry";

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


const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const PLACEHOLDER_COLORS = ["#f97316", "#f59e0b", "#e11d48", "#0d9488", "#fb7185", "#eab308"];

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
  heroImg: string | null;
  isVerified: boolean;
  tipoTienda: string;
  updatedAt: number;
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
  const captcha = useTurnstile("testimonio");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/testimonios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: captcha.token }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Algo salió mal. Intentá de nuevo.");
    }
    captcha.reset();
    setSending(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white border border-gray-200 rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors">
          <X className="h-5 w-5" />
        </button>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">¡Gracias por compartir!</h3>
            <p className="text-gray-500 text-sm">Revisamos tu historia y si todo está bien la publicamos en la página.</p>
            <button onClick={onClose} className="mt-6 bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-500 transition-colors text-sm">
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Contá tu historia</h3>
              <p className="text-gray-500 mt-1 text-sm">¿Ya usás TiendaApps? Contanos cómo te fue. La revisamos y la publicamos.</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Tu calificación</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setForm((p) => ({ ...p, rating: s }))}
                      className="transition-transform hover:scale-110">
                      <Star className={`h-7 w-7 ${s <= form.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tu nombre</label>
                <input
                  type="text" required value={form.name} maxLength={80}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Valentina M."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Soy...</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  >
                    <option value="Afiliado">Afiliado/a</option>
                    <option value="Dueño de tienda">Dueño/a de tienda</option>
                    <option value="Comprador">Comprador/a</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Ciudad (opcional)</label>
                  <input
                    type="text" value={form.location} maxLength={60}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Buenos Aires"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tu experiencia</label>
                <textarea
                  required value={form.text} maxLength={500}
                  onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                  rows={4} placeholder="Contanos cómo te fue, qué lograste, qué cambió..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                />
                <p className="text-right text-xs text-gray-400 mt-1">{form.text.length}/500</p>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              {captcha.widget}
              <button
                type="submit" disabled={sending || !captcha.ready}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-60 text-sm"
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

const TESTIMONIALS: { name: string; role: string; text: string; img: string }[] = [];

const SLOTS = 6;

const ROTATING_WORDS = ["vender", "crecer", "todo", "despegar"];

const FEATURES = [
  {
    icon: Store, tab: "Tu tienda", color: "#ea580c",
    title: "Una tienda que enamora desde el primer click",
    desc: "Elegís entre 10 diseños profesionales, personalizás colores, logo y contenido — y en menos de una hora tenés tu tienda lista para vender.",
    bullets: ["10 plantillas listas para usar", "URL propia: tiendaapps.com/tutienda", "Galería de productos con variantes", "Optimizada para celular"],
    img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: ShoppingCart, tab: "Pagos", color: "#0d9488",
    title: "Cobrá sin complicaciones, desde el día uno",
    desc: "Mercado Pago integrado de entrada. Tus clientes pagan como quieran y vos recibís el dinero sin configuraciones técnicas ni vueltas.",
    bullets: ["Mercado Pago incluido", "Tarjeta, transferencia y más", "Precios mayoristas y minoristas", "Historial de cobros siempre disponible"],
    img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: Package, tab: "Pedidos", color: "#e11d48",
    title: "Cada pedido, bajo control",
    desc: "Cuando entra una venta, te llega al panel al instante. Lo confirmás, lo preparás y lo enviás — con seguimiento en tiempo real para vos y para tu cliente.",
    bullets: ["Panel de pedidos en tiempo real", "Estados: pendiente, en camino, entregado", "Historial completo por cliente", "Seguimiento de envíos integrado"],
    img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: Sparkles, tab: "Sasha IA", color: "#7c3aed",
    title: "Tu asistente que nunca duerme",
    desc: "Sasha te avisa cuándo tenés pedidos pendientes, te cuenta qué está pasando en tu tienda y responde tus preguntas sobre el panel — directo en el chat, con tus datos reales.",
    bullets: ["Alertas de pedidos y stock bajo", "Ideas para fechas clave (Hot Sale, Navidad...)", "Responde tus dudas del panel", "Disponible las 24 horas"],
    img: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: Users, tab: "Afiliados", color: "#f59e0b",
    title: "Crecé con un equipo que vende por vos",
    desc: "Cuando querés escalar, sumás afiliados que llevan tu marca a todos lados. Ellos venden con su propio link, vos aprobás quién representa tu marca.",
    bullets: ["Afiliados sin sueldos fijos", "Cada uno con su link propio", "Comisiones automáticas o manuales", "Metas mensuales con bonos extra"],
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: Tag, tab: "Cupones", color: "#16a34a",
    title: "Descuentos que generan urgencia",
    desc: "Creás un cupón en segundos y lo compartís con tus clientes o afiliados. Fijás el porcentaje, la fecha de vencimiento y cuántas veces se puede usar.",
    bullets: ["Porcentaje o monto fijo", "Límite de usos y fecha de expiración", "Compatible con campañas de afiliados", "Historial de canjes en tiempo real"],
    img: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: Bell, tab: "Notificaciones", color: "#3b82f6",
    title: "Llegá a tus clientes cuando más importa",
    desc: "Enviás una notificación push o un email en segundos. Carritos abandonados, lanzamientos de productos, descuentos exclusivos — sin apps de terceros ni costo extra.",
    bullets: ["Notificaciones push a suscriptores", "Emails de carrito abandonado automáticos", "Avisos de promos y novedades", "Sin integraciones ni costos extras"],
    img: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
  },
  {
    icon: TrendingUp, tab: "Estadísticas", color: "#6366f1",
    title: "Datos reales para decisiones inteligentes",
    desc: "Ves exactamente qué productos se venden más, de dónde vienen tus clientes y cómo crece tu tienda mes a mes. Integración nativa con Google Analytics y Pixel de Facebook.",
    bullets: ["Panel de ventas en tiempo real", "Google Analytics integrado", "Pixel de Facebook para remarketing", "Productos más vendidos y tendencias"],
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
  },
];

const STORE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  STORE_TYPES.map((t) => [t.id, t.label])
);

const TYPE_ICONS: Record<string, LucideIcon> = {
  TODAS:     LayoutGrid,
  ROPA:      Shirt,
  AUTOS:     Car,
  HOGAR_TECH: HomeIcon,
  ALIMENTOS: Utensils,
  BELLEZA:   Sparkles,
  DEPORTE:   Dumbbell,
  MASCOTAS:  PawPrint,
  LIBROS:    BookOpen,
  GENERAL:   Store,
};

/* ─── Galería de plantillas ("Diseño según tu rubro") ─── */
const TEMPLATE_ITEMS = TEMPLATE_CATEGORIES.flatMap((cat) =>
  cat.templates.map((t) => ({ ...t, categoryId: cat.id, categoryName: cat.name }))
);

const THUMB_W = 320;
const VIRTUAL_W = 1080;
const THUMB_H = 210;

function TemplateGalleryCard({ item, onInfo, inView, thumbW: tw = 320 }: { item: typeof TEMPLATE_ITEMS[number]; onInfo: () => void; inView: boolean; thumbW?: number }) {
  const Component = item.component;
  const scale = tw / VIRTUAL_W;
  const thumbH = Math.round(THUMB_H * (tw / THUMB_W));
  const virtualH = Math.round(thumbH / scale);
  return (
    <Card3D className="group">
      <div style={{ width: tw }} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
        {/* Barra tipo navegador */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-teal-400" />
          </div>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Demo</span>
        </div>

        {/* Vista del template real, escalada y sin interacción */}
        <div className="relative" style={{ width: tw, height: thumbH, overflow: "hidden", background: "#f8fafc" }}>
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: VIRTUAL_W, height: virtualH,
            transform: `scale(${scale})`, transformOrigin: "top left",
            pointerEvents: "none", userSelect: "none",
          }}>
            {inView ? <Component /> : (
              <div style={{ width: "100%", height: "100%", background: item.palette[0] ? item.palette[0] + "18" : "#f3f4f6" }} />
            )}
          </div>

          {/* Overlay con acciones, aparece en hover */}
          <div className="absolute inset-0 bg-gray-950/0 group-hover:bg-gray-950/55 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <a
              href={`/plantillas/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver demostración
            </a>
            <button
              onClick={onInfo}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg transition-colors"
            >
              <Info className="h-3.5 w-3.5" /> Más info
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600">{item.categoryName}</span>
            <div className="flex gap-1">
              {item.palette.map((c, i) => (
                <span key={i} className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <h3 className="font-bold text-gray-950 text-base mb-1">{item.name}</h3>
          <p className="text-gray-500 text-xs">{item.desc}</p>
        </div>
      </div>
    </Card3D>
  );
}

function TemplateInfoModal({ item, onClose }: { item: typeof TEMPLATE_ITEMS[number]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white border border-gray-200 rounded-3xl p-7 w-full max-w-md shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 mb-3">
          {item.palette.map((c, i) => (
            <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
          ))}
        </div>
        <p className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-1">{item.categoryName}</p>
        <h3 className="text-2xl font-black text-gray-950 mb-1">{item.name}</h3>
        <p className="text-gray-400 text-sm mb-4">{item.desc}</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">{item.blurb}</p>
        <div className="flex gap-3">
          <a
            href={`/plantillas/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            <ExternalLink className="h-4 w-4" /> Ver demostración
          </a>
          <button onClick={onClose} className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors">
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const ANNOUNCEMENT_H = 40;

export default function Home() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [announcementClosed, setAnnouncementClosed] = useState(true);
  const [realStores, setRealStores] = useState<RealStore[]>([]);
  const [realTestimonials, setRealTestimonials] = useState<RealTestimonial[]>([]);
  const [testimonioModal, setTestimonioModal] = useState(false);
  const [comunidadHref, setComunidadHref] = useState("/comunidad");
  const [templateFilter, setTemplateFilter] = useState("todo");
  const [templateInfoModal, setTemplateInfoModal] = useState<typeof TEMPLATE_ITEMS[number] | null>(null);
  const [templatePage, setTemplatePage] = useState(0);
  const [templateNavDir, setTemplateNavDir] = useState(1);
  const [thumbW, setThumbW] = useState(320);
  const [rotatingWordIdx, setRotatingWordIdx] = useState(0);
  const [featureSlide, setFeatureSlide] = useState<[number, number]>([0, 1]);
  const [templatesInView, setTemplatesInView] = useState(false);
  const templatesSectionRef = useRef<HTMLElement>(null);
  const { user: sessionUser } = useAuth();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setNavScrolled(v > 50));

  useEffect(() => {
    if (!localStorage.getItem("announcement_v2")) setAnnouncementClosed(false);
  }, []);

  function dismissAnnouncement() {
    setAnnouncementClosed(true);
    localStorage.setItem("announcement_v2", "1");
  }

  useEffect(() => {
    fetch("/api/stores?featured=true&limit=6")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.stores)) setRealStores(d.stores); })
      .catch(() => {});
    fetch("/api/testimonios")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRealTestimonials(d); })
      .catch(() => {});
    fetch("/api/canasta/campaign")
      .then((r) => r.json())
      .then((d) => { if (d?.campaign) setComunidadHref("/comunidad/campana"); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = templatesSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTemplatesInView(true); observer.disconnect(); } },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setRotatingWordIdx((i) => (i + 1) % ROTATING_WORDS.length), 2500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setFeatureSlide(([i]) => [(i + 1) % FEATURES.length, 1]), 12000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () => setThumbW(window.innerWidth < 640 ? 160 : 320);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const role = sessionUser?.role;
  const panelHref = role === "ADMIN" ? "/admin" : role === "OWNER" ? "/dashboard" : role === "SELLER" ? "/afiliados" : "/mi-cuenta";
  const panelLabel = role === "ADMIN" ? "Admin" : role === "OWNER" ? "Mi tienda" : role === "SELLER" ? "Mi panel" : "Mi cuenta";
  const userName = sessionUser?.name?.split(" ")[0] ?? null;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── ANNOUNCEMENT BAR ── */}
      {!announcementClosed && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 sm:gap-4 px-10"
          style={{ height: ANNOUNCEMENT_H, background: "linear-gradient(90deg,#ea580c,#e11d48)" }}
        >
          <span className="text-white text-xs sm:text-sm font-semibold whitespace-nowrap">
            ✨ 7 días de prueba gratis
          </span>
          <span className="text-orange-200 hidden sm:inline text-sm">·</span>
          <span className="text-orange-100 hidden sm:inline text-xs sm:text-sm">Sin tarjeta · Sin compromisos</span>
          <Link
            href="/registro"
            className="ml-1 text-white text-xs sm:text-sm font-black underline underline-offset-2 decoration-white/50 hover:decoration-white transition-all whitespace-nowrap"
          >
            Crear mi tienda →
          </Link>
          <button
            onClick={dismissAnnouncement}
            aria-label="Cerrar anuncio"
            className="absolute right-3 sm:right-5 text-white/60 hover:text-white transition-colors p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .float { animation: float 5s ease-in-out infinite; }
        @keyframes fab-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        .fab-float { animation: fab-float 2.6s ease-in-out infinite; }
        @keyframes fab-ring-orange { 0%,100%{box-shadow:0 8px 24px rgba(249,115,22,.4),0 0 0 0 rgba(249,115,22,.4)} 50%{box-shadow:0 8px 24px rgba(249,115,22,.4),0 0 0 10px rgba(249,115,22,0)} }
        @keyframes fab-ring-amber { 0%,100%{box-shadow:0 8px 24px rgba(245,158,11,.4),0 0 0 0 rgba(245,158,11,.4)} 50%{box-shadow:0 8px 24px rgba(245,158,11,.4),0 0 0 10px rgba(245,158,11,0)} }
        .fab-ring-orange { animation: fab-ring-orange 2.6s ease-in-out infinite; }
        .fab-ring-amber { animation: fab-ring-amber 2.6s ease-in-out infinite; }
        .gradient-text {
          background: linear-gradient(135deg, #f97316, #f59e0b, #e11d48, #f97316);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glow-border { box-shadow: 0 0 0 1px rgba(249,115,22,.18), 0 0 30px rgba(249,115,22,.1); }
        .grid-bg { background-image: linear-gradient(rgba(249,115,22,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,.05) 1px, transparent 1px); background-size: 48px 48px; }
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .marquee { animation: marquee 30s linear infinite; display: flex; width: max-content; }
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav
        style={{ top: announcementClosed ? 0 : ANNOUNCEMENT_H }}
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? "bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <AppLogo size={72} />
            <span className="text-lg font-bold text-gray-900">TiendaApps</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {[["#tiendas", "Tiendas"], ["#como-funciona", "Cómo funciona"]].map(([href, label]) => (
              <a key={href} href={href} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">{label}</a>
            ))}
            <Link href="/quienes-somos" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Quiénes somos</Link>
            <Link href="/precios" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Precios</Link>
            <Link href="/seguimiento" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1.5">
              <Package className="h-4 w-4" />Seguimiento
            </Link>
            <Link href="/contacto" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />Contacto
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {sessionUser ? (
              <>
                <span className="text-gray-500 text-sm">Hola, {userName ?? "!"}</span>
                <Link href={panelHref} className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105">
                  {panelLabel}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium px-5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Iniciar sesión
                </Link>
                <Link href="/registro" className="relative bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden text-gray-500 hover:text-gray-900">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenu(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-white border-l border-gray-200 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
                <span className="text-gray-900 font-bold">Menú</span>
                <button onClick={() => setMobileMenu(false)} className="text-gray-500 hover:text-gray-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1 px-4 py-4 flex-1">
                {[["#tiendas", "Tiendas"], ["#como-funciona", "Cómo funciona"]].map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">{label}</a>
                ))}
                <Link href="/quienes-somos" onClick={() => setMobileMenu(false)} className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">Quiénes somos</Link>
                <Link href="/precios" onClick={() => setMobileMenu(false)} className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">Precios</Link>
                <Link href="/seguimiento" onClick={() => setMobileMenu(false)} className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">Seguimiento</Link>
                <Link href="/contacto" onClick={() => setMobileMenu(false)} className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">Contacto</Link>
                <div className="pt-3 border-t border-gray-200 flex flex-col gap-2 mt-2">
                  {sessionUser ? (
                    <Link href={panelHref} onClick={() => setMobileMenu(false)} className="text-center bg-orange-600 hover:bg-orange-500 rounded-xl py-3 text-sm font-semibold text-white transition-colors">
                      {panelLabel}
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileMenu(false)} className="text-center border border-gray-200 rounded-xl py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors">Iniciar sesión</Link>
                      <Link href="/registro" onClick={() => setMobileMenu(false)} className="text-center bg-orange-600 hover:bg-orange-500 rounded-xl py-3 text-sm font-semibold text-white transition-colors">Crear cuenta</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center grid-bg">
        {/* Gradient blobs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full" style={{ paddingTop: announcementClosed ? 112 : 152 }}>
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <span className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-orange-500 text-orange-500" />)}
              </span>
              Plataforma nueva · Sumate de los primeros
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight text-gray-950">
              Tu marca.<br />
              <span className="gradient-text">Lista</span><br />
              para{" "}
              <motion.span
                key={rotatingWordIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="gradient-text"
              >
                {ROTATING_WORDS[rotatingWordIdx]}
              </motion.span>
              .
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-gray-600 mb-10 leading-relaxed max-w-lg">
              Tienda online + Mercado Pago integrado + afiliados que venden por vos — todo en un panel, sin técnicos ni inversión inicial.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-5">
              <Link
                href="/registro"
                className="group flex items-center gap-2.5 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
              >
                Crear mi tienda gratis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/afiliados"
                className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:bg-gray-50"
              >
                <Users className="h-5 w-5" />
                Quiero ser afiliado
              </Link>
            </motion.div>

            {/* ── TRUST STACK ── */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 text-gray-500 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                Pago seguro
              </span>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                Mercado Pago incluido
              </span>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-orange-400" />
                7 días gratis · sin tarjeta
              </span>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5 font-medium">
                <BadgeCheck className="h-3.5 w-3.5 text-orange-500" />
                Cancelás cuando quieras
              </span>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 sm:gap-6">
              {[
                { value: "24hs", label: "Primera venta" },
                { value: "50+", label: "Afiliados gratis" },
                { value: "$0", label: "Para arrancar" },
              ].map((s) => (
                <div key={s.label} className="border-l border-orange-300 pl-3 sm:pl-4">
                  <p className="text-2xl sm:text-3xl font-black gradient-text">{s.value}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Phone mockup — storefront del cliente */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:flex justify-center items-center"
          >
            <div className="relative">
              {/* Blob decorativo detrás */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-70 pointer-events-none" />

              {/* Phone */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-72 bg-white border-[6px] border-gray-900 rounded-[2.8rem] shadow-2xl shadow-gray-900/25 overflow-hidden"
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-xl z-20" />

                {/* Store banner */}
                <div className="relative h-44">
                  <Image
                    src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=600&q=80"
                    alt=""
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-gray-950/20 to-transparent" />
                  {/* Nav bar mínima */}
                  <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4">
                    <div className="w-6 h-6 bg-white/20 rounded-lg backdrop-blur-sm flex items-center justify-center">
                      <ShoppingBag className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="w-6 h-6 bg-white/20 rounded-lg backdrop-blur-sm flex items-center justify-center">
                      <ShoppingCart className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  {/* Store name */}
                  <div className="absolute bottom-3 left-4">
                    <p className="text-white/70 text-[9px] font-medium uppercase tracking-widest">tiendaapps.com/lunamoda</p>
                    <p className="text-white text-xl font-black leading-tight">Luna Moda</p>
                  </div>
                </div>

                {/* Products */}
                <div className="bg-white p-4 space-y-3">
                  <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Destacados</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { name: "Vestido floral", price: "$9.900", img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=300&q=80" },
                      { name: "Jean cargo", price: "$7.500", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=300&q=80" },
                    ].map((p) => (
                      <div key={p.name} className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                        <div className="relative h-24">
                          <Image src={p.img} alt={p.name} fill className="object-cover" />
                        </div>
                        <div className="p-2">
                          <p className="text-gray-800 text-[10px] font-semibold truncate">{p.name}</p>
                          <p className="text-orange-600 text-[10px] font-bold">{p.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-orange-600 text-white text-[10px] font-bold py-2.5 rounded-xl text-center">
                    Ver tienda completa →
                  </div>
                </div>
              </motion.div>

              {/* Badge — nueva venta */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-8 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-xl z-20"
              >
                <p className="text-gray-900 text-xs font-bold">Nueva venta 🎉</p>
                <p className="text-orange-600 text-xs font-semibold mt-0.5">Tu tienda está activa</p>
              </motion.div>

              {/* Badge — afiliados */}
              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-4 -left-8 bg-orange-600 text-white rounded-2xl px-4 py-3 shadow-xl shadow-orange-500/30 flex items-center gap-2.5 z-20"
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold">8 afiliados activos</p>
                  <p className="text-orange-200 text-xs">vendiendo ahora mismo</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="bg-orange-600 py-3.5 overflow-hidden border-y border-orange-500">
        <div className="marquee gap-10 items-center">
          {[
            "✦ Tienda personalizable",
            "✦ Afiliados sin sueldos fijos",
            "✦ Comisiones automáticas o manuales",
            "✦ Sin inversión inicial",
            "✦ Mercado Pago",
            "✦ Panel de comisiones",
            "✦ Sin stock propio",
            "✦ Panel en tiempo real",
            "✦ Para todos",
            "✦ Gratis para empezar",
            "✦ Tienda personalizable",
            "✦ Afiliados sin sueldos fijos",
            "✦ Comisiones automáticas o manuales",
            "✦ Sin inversión inicial",
            "✦ Mercado Pago",
            "✦ Panel de comisiones",
            "✦ Sin stock propio",
            "✦ Panel en tiempo real",
            "✦ Para todos",
            "✦ Gratis para empezar",
          ].map((item, i) => (
            <span key={i} className="text-white/90 text-sm font-semibold whitespace-nowrap px-5">{item}</span>
          ))}
        </div>
      </div>

      <PromotionsCarousel />

      {/* ── TRES CAMINOS ── */}
      <section className="py-24 bg-gray-50 relative">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Para todos</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-4">¿Cuál es tu lugar?</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-600 text-lg">Ya seas dueño, afiliado o comprador, acá hay un lugar para vos.</motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Store, color: "#ea580c", gradient: "from-orange-50 to-orange-50/40", border: "border-orange-200", metric: "+24 ventas este mes",
                title: "Dueño", sub: "El motor de tu marca, sin armar un equipo en planilla.",
                items: ["Tienda con subdominio propio incluido", "Productos y variantes ilimitados", "Sasha, tu asistente de IA, te avisa el estado de tu tienda", "Panel de pedidos, estadísticas y afiliados", "Vos aprobás quién representa tu marca", "Comisiones automáticas o con aprobación manual, según prefieras", "7 días de prueba gratis, sin tarjeta"],
                cta: "Crear mi tienda gratis", href: "/registro",
              },
              {
                icon: Users, color: "#f59e0b", gradient: "from-amber-50 to-amber-50/40", border: "border-amber-200", metric: "$3.680 comisión cobrada",
                title: "Afiliado", sub: "Plata por cada link que compartís, sin poner un peso.",
                items: ["Elegís las tiendas que te interesan y te postulás", "Link propio con seguimiento de clics y ventas", "Sin stock, sin inversión, sin riesgo", "Metas mensuales con bono extra si las cumplís", "Panel de comisiones con historial de ventas", "Retirá cuando quieras, por transferencia bancaria", "100% gratis, para siempre"],
                cta: "Quiero ser afiliado", href: "/afiliados",
              },
              {
                icon: ShoppingCart, color: "#e11d48", gradient: "from-rose-50 to-rose-50/40", border: "border-rose-200", metric: "Tiendas verificadas",
                title: "Comprador", sub: "Tiendas reales, con productos y precios reales.",
                items: ["Tiendas activas y verificadas por nosotros", "Pagos seguros, sin comisiones extra", "Guardá favoritos y dejá reseñas", "Historial de compras siempre disponible"],
                cta: "Explorar tiendas", href: "/tiendas",
              },
            ].map(({ icon: Icon, color, gradient, border, metric, title, sub, items, cta, href }) => (
              <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                <div className={`h-full bg-gradient-to-br ${gradient} bg-white border ${border} rounded-3xl p-8 flex flex-col shadow-sm`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color + "1A" }}>
                      <Icon className="h-7 w-7" style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: color + "14", color }}>
                      {metric}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-950 mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm mb-6">{sub}</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
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

      {/* ── HERRAMIENTAS (Feature showcase) ── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">La plataforma completa</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-4">Todo lo que necesitás,<br className="hidden sm:block" /> en un solo lugar.</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">Tienda, pagos, pedidos, cupones, notificaciones push, estadísticas, Pixel de Facebook, afiliados — todo en un solo panel, sin instalar nada.</motion.p>
          </motion.div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const active = featureSlide[0] === i;
              return (
                <button
                  key={i}
                  onClick={() => setFeatureSlide([i, i >= featureSlide[0] ? 1 : -1])}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border transition-all"
                  style={active
                    ? { backgroundColor: f.color, borderColor: f.color, color: "#fff", boxShadow: `0 4px 14px ${f.color}44` }
                    : { backgroundColor: "#fff", borderColor: "#e5e7eb", color: "#6b7280" }
                  }
                >
                  <Icon className="h-4 w-4" />
                  {f.tab}
                </button>
              );
            })}
          </div>

          {/* Slider */}
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 shadow-xl shadow-gray-100 min-h-[420px]">
            <AnimatePresence mode="wait" custom={featureSlide[1]}>
              <motion.div
                key={featureSlide[0]}
                custom={featureSlide[1]}
                variants={{
                  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: number) => ({ x: dir > 0 ? "-40%" : "40%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="grid grid-cols-1 lg:grid-cols-2"
              >
                {/* Texto */}
                <div className="p-10 lg:p-14 flex flex-col justify-center bg-white">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: FEATURES[featureSlide[0]].color + "18" }}>
                    {(() => { const Icon = FEATURES[featureSlide[0]].icon; return <Icon className="h-7 w-7" style={{ color: FEATURES[featureSlide[0]].color }} />; })()}
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-gray-950 mb-4 leading-tight">{FEATURES[featureSlide[0]].title}</h3>
                  <p className="text-gray-500 leading-relaxed mb-8 text-base">{FEATURES[featureSlide[0]].desc}</p>
                  <ul className="space-y-3">
                    {FEATURES[featureSlide[0]].bullets.map((b) => (
                      <li key={b} className="flex items-center gap-3 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: FEATURES[featureSlide[0]].color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Foto */}
                <div className="relative min-h-[280px] lg:min-h-0">
                  <Image
                    src={FEATURES[featureSlide[0]].img}
                    alt={FEATURES[featureSlide[0]].title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${FEATURES[featureSlide[0]].color}55 0%, transparent 55%)` }} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setFeatureSlide(([i]) => [i === 0 ? FEATURES.length - 1 : i - 1, -1])}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-orange-600 hover:border-orange-300 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              {FEATURES.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setFeatureSlide([i, i >= featureSlide[0] ? 1 : -1])}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i === featureSlide[0] ? 28 : 8, backgroundColor: i === featureSlide[0] ? FEATURES[featureSlide[0]].color : "#e5e7eb" }}
                />
              ))}
            </div>

            <button
              onClick={() => setFeatureSlide(([i]) => [(i + 1) % FEATURES.length, 1])}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-orange-600 hover:border-orange-300 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── RUBROS Y DISEÑOS (galería de plantillas) ── */}
      <section id="como-funciona" ref={templatesSectionRef} className="relative py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-10">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Diseño según tu rubro</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-4">Tu tienda, con identidad propia.</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto mb-6">Diez diseños listos, navegables de verdad. Elegís el que más se parece a tu marca, editás colores, textos e imágenes a tu gusto, y arrancás a vender.</motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {["Colores", "Logo", "Banner", "WhatsApp", "Redes sociales", "Envío y cobro", "SEO"].map((item) => (
                <span key={item} className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full">{item}</span>
              ))}
            </motion.div>
          </motion.div>

          {/* Filtro por categoría */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex flex-wrap justify-center gap-2 mb-10">
            {[{ id: "todo", name: "Todo" }, ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, name: c.name }))].map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setTemplateFilter(cat.id); setTemplatePage(0); }}
                className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
                  templateFilter === cat.id
                    ? "bg-orange-600 border-orange-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </motion.div>

          {(() => {
            const filtered = TEMPLATE_ITEMS.filter((t) => templateFilter === "todo" || t.categoryId === templateFilter);
            const PAGE_SIZE = 6;
            const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            const page = Math.min(templatePage, totalPages - 1);
            const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
            const slots: (typeof pageItems[number] | null)[] = [...pageItems];
            while (slots.length < PAGE_SIZE) slots.push(null);

            return (
              <div className="px-0 md:px-14">
                {/* relative: contexto para las flechas absolutas — sin overflow-hidden para no clipearlas */}
                <div className="relative">
                  {totalPages > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); if (page === 0) return; setTemplateNavDir(-1); setTemplatePage((p) => p - 1); }}
                      aria-disabled={page === 0}
                      aria-label="Bloque anterior"
                      className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 items-center justify-center bg-transparent border-none text-gray-400 hover:text-orange-600 transition-colors ${page === 0 ? "opacity-20 pointer-events-none" : "cursor-pointer"}`}
                      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
                    >
                      <ChevronLeft className="h-11 w-11" strokeWidth={1.5} />
                    </button>
                  )}
                  {totalPages > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); if (page === totalPages - 1) return; setTemplateNavDir(1); setTemplatePage((p) => p + 1); }}
                      aria-disabled={page === totalPages - 1}
                      aria-label="Siguiente bloque"
                      className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 items-center justify-center bg-transparent border-none text-gray-400 hover:text-orange-600 transition-colors ${page === totalPages - 1 ? "opacity-20 pointer-events-none" : "cursor-pointer"}`}
                      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
                    >
                      <ChevronRight className="h-11 w-11" strokeWidth={1.5} />
                    </button>
                  )}

                  {/* overflow-hidden solo en el wrapper de la animación, no afecta las flechas */}
                  <div className="overflow-hidden">
                    <motion.div
                      key={`${templateFilter}-${page}`}
                      initial={{ opacity: 0, x: templateNavDir * 32 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="flex flex-wrap justify-center gap-3 sm:gap-6 w-full"
                    >
                      {slots.map((item, i) =>
                        item ? (
                          <TemplateGalleryCard key={item.id} item={item} onInfo={() => setTemplateInfoModal(item)} inView={templatesInView} thumbW={thumbW} />
                        ) : (
                          <div key={`empty-${i}`} aria-hidden style={{ width: thumbW }} />
                        )
                      )}
                    </motion.div>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setTemplateNavDir(i >= page ? 1 : -1); setTemplatePage(i); }}
                        aria-label={`Ir al bloque ${i + 1}`}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ width: i === page ? 26 : 8, backgroundColor: i === page ? "#ea580c" : "#e5e7eb" }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      <AnimatePresence>
        {templateInfoModal && <TemplateInfoModal item={templateInfoModal} onClose={() => setTemplateInfoModal(null)} />}
      </AnimatePresence>

      {/* ── VER TIENDAS ── */}
      <section id="tiendas" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-2">Tiendas reales</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-950">Explorá las tiendas activas</motion.h2>
            </div>
            <motion.div variants={fadeUp}>
              <Link href="/tiendas" className="flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                Ver todas <ChevronRight className="h-5 w-5" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {Array.from({ length: SLOTS }).map((_, i) => {
              const store = realStores[i];
              const color = PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length];
              return (
                <motion.div key={i} variants={fadeUp}>
                  <Card3D>
                    {store ? (
                      <Link href={`/tienda/${store.slug}`} className="block bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 group">
                        <div className="relative overflow-hidden h-32 sm:h-44 bg-gray-50">
                          {(store.coverImg || store.heroImg) ? (
                            <Image
                              src={(store.coverImg ?? store.heroImg)!}
                              alt={store.name ?? ""}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: store.primaryColor + "18" }}>
                              {(() => { const Icon = TYPE_ICONS[store.tipoTienda] ?? Store; return <Icon className="h-10 w-10 opacity-30" style={{ color: store.primaryColor }} />; })()}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                          {store.isVerified && (
                            <div className="absolute top-2.5 right-2.5">
                              <div className="flex items-center gap-1 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                                <BadgeCheck className="h-3 w-3" />
                                Verificado
                              </div>
                            </div>
                          )}
                          {(() => {
                            const StoreIcon = TYPE_ICONS[store.tipoTienda];
                            return StoreIcon ? (
                              <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-black/5 shadow-sm flex items-center justify-center">
                                <StoreIcon className="h-3.5 w-3.5 text-gray-600" />
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="h-0.5" style={{ backgroundColor: store.primaryColor + "80" }} />
                        <div className="p-3 sm:p-4 min-h-[80px] sm:min-h-[124px] flex flex-col">
                          {STORE_TYPE_LABELS[store.tipoTienda] && (
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                              {STORE_TYPE_LABELS[store.tipoTienda]}
                            </span>
                          )}
                          <h3 className="font-bold text-gray-900 text-sm leading-snug truncate group-hover:text-orange-600 transition-colors mt-0.5 mb-1">
                            {store.name}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-1 mb-3 min-h-[16px]">
                            {store.description ?? ""}
                          </p>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                              <span>{store.totalProducts} producto{store.totalProducts !== 1 ? "s" : ""}</span>
                              {store.totalOrders > 0 && (
                                <span className="text-teal-600 font-semibold">· {store.totalOrders} pedido{store.totalOrders !== 1 ? "s" : ""}</span>
                              )}
                            </div>
                            <span className="flex items-center gap-1 text-[11px] font-bold text-gray-400 group-hover:text-orange-600 transition-colors">
                              <Eye className="h-3.5 w-3.5" />
                              Ver tienda
                            </span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="bg-white border border-dashed border-gray-200 rounded-2xl overflow-hidden">
                        <div className="h-32 sm:h-44 flex items-center justify-center" style={{ backgroundColor: color + "11" }}>
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: color + "22" }}>
                              <Store className="h-6 w-6" style={{ color }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Próximamente</span>
                          </div>
                        </div>
                        <div className="h-0.5" style={{ backgroundColor: color + "40" }} />
                        <div className="p-3 sm:p-4 min-h-[80px] sm:min-h-[124px] flex flex-col justify-between">
                          <div>
                            <div className="h-2.5 bg-gray-100 rounded-full w-1/3 mb-2" />
                            <div className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
                            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full w-2/3 mt-3 pt-3 border-t border-gray-100" />
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

      {/* ── AFILIADOS ── */}
      <section className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(150deg,#fffbeb 0%,#fff7ed 50%,#fff1f2 100%)" }}>
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-rose-200/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Izquierda: copy + pasos */}
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-4">Para afiliados</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-6 leading-tight">
                Representá marcas<br className="hidden sm:block" /> que te gustan.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-500 text-lg leading-relaxed mb-10">
                Un afiliado no maneja stock, no cobra pagos, no hace envíos. Representa una tienda, comparte su link y suma comisiones con cada venta que genera. La forma más flexible de vender online.
              </motion.p>

              {/* Pasos numerados */}
              <div className="space-y-0">
                {[
                  {
                    n: "01",
                    title: "Elegís la tienda",
                    desc: "Buscás entre las tiendas disponibles y te postulás a la que va con tu estilo o tu audiencia. El dueño decide quién lo representa.",
                  },
                  {
                    n: "02",
                    title: "Compartís tu link",
                    desc: "Te aprueban y recibís un link único. Lo compartís donde quieras: redes sociales, WhatsApp, stories — donde tengas llegada.",
                  },
                  {
                    n: "03",
                    title: "Seguís todo desde tu panel",
                    desc: "Ves en tiempo real las visitas que generaste, las ventas que se concretaron y tus comisiones acumuladas. Sin llamar a nadie.",
                  },
                ].map((step, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex gap-5 pb-8 last:pb-0 relative">
                    {i < 2 && <div className="absolute left-5 top-10 bottom-0 w-px bg-amber-200 pointer-events-none" />}
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-black z-10 shadow-lg shadow-orange-200">
                      {step.n}
                    </div>
                    <div className="pt-1">
                      <p className="font-black text-gray-950 text-base mb-1">{step.title}</p>
                      <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeUp} className="mt-10">
                <Link href="/afiliados" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-7 py-3.5 rounded-2xl font-semibold transition-all shadow-lg shadow-orange-500/25 hover:scale-105">
                  Quiero ser afiliado <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Derecha: collage de fotos */}
            <div className="relative h-[480px] hidden lg:block">
              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
                className="absolute left-0 top-10 w-56 h-[280px] rounded-2xl overflow-hidden shadow-2xl shadow-amber-100/80"
                style={{ transform: "rotate(-3deg)", border: "5px solid white" }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80"
                  alt="Afiliado compartiendo en redes"
                  fill className="object-cover"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.22 }}
                className="absolute left-40 top-32 w-52 h-64 rounded-2xl overflow-hidden shadow-2xl shadow-orange-100/80 z-10"
                style={{ transform: "rotate(2deg)", border: "5px solid white" }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80"
                  alt="Trabajando desde cualquier lugar"
                  fill className="object-cover"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.34 }}
                className="absolute right-0 top-6 w-48 h-56 rounded-2xl overflow-hidden shadow-2xl shadow-rose-100/80 z-20"
                style={{ transform: "rotate(-1.5deg)", border: "5px solid white" }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1523206489230-c012c64b2b48?auto=format&fit=crop&w=600&q=80"
                  alt="Ventas desde el celular"
                  fill className="object-cover"
                />
              </motion.div>

              {/* Dot decorativo */}
              <motion.div
                animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-400 rounded-full shadow-lg shadow-orange-300"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── SASHA (asistente de IA) ── */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.span variants={fadeUp} className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Nuevo en TiendaApps
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-950 mb-5">
              Alguien que cuida tu tienda cuando vos no podés.
            </motion.h2>
            <motion.p variants={fadeUp} style={{ color: "#4b5563" }} className="leading-relaxed mb-4 text-base">
              Sasha es tu asistente dentro del panel. Te avisa cuando tenés pedidos sin confirmar, te recuerda fechas clave para vender más y responde tus dudas sobre la plataforma — con tus datos reales, en segundos.
            </motion.p>
            <motion.p variants={fadeUp} style={{ color: "#4b5563" }} className="leading-relaxed mb-7 text-base">
              No necesitás saber de tecnología. Le preguntás como si le hablaras a una persona, y te responde como una persona.
            </motion.p>

            {/* Chips de ejemplo */}
            <motion.div variants={fadeUp} className="mb-8">
              <p style={{ color: "#6b7280" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Por ejemplo, le podés preguntar:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "¿Cuánto vendí esta semana?",
                  "Armame un cupón para el Hot Sale",
                  "¿Qué productos se venden más?",
                  "Tengo un pedido sin confirmar",
                  "¿Cómo conecto Mercado Pago?",
                  "Ideas para el Día del Padre",
                ].map((q) => (
                  <span
                    key={q}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
                  >
                    <MessageCircle className="h-3 w-3 text-orange-400 flex-shrink-0" />
                    {q}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link href="/registro" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-lg shadow-orange-500/25 hover:scale-105">
                Creá tu tienda y probalo <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-3xl border border-gray-100 shadow-2xl shadow-orange-200/40 bg-white overflow-hidden max-w-sm mx-auto"
            >
              {/* Header del chat */}
              <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <AsistentePersonaje estado="sonriente" size={36} />
                <div className="flex-1">
                  <p className="font-bold text-gray-950 text-sm">Sasha</p>
                  <p className="text-xs text-gray-400">Tu asistente de TiendaApps</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  En línea
                </span>
              </div>

              {/* Mensajes */}
              <div className="p-4 space-y-3 bg-gray-50/50">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm px-4 py-2.5 text-sm text-gray-800 leading-relaxed">
                    ¡Hola! Tenés 3 pedidos sin confirmar y se acerca el Día de la Madre — buen momento para armar algo especial.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-600 px-4 py-2.5 text-sm text-white leading-relaxed">
                    armame un cupón de descuento para esa fecha
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm px-4 py-2.5 text-sm text-gray-800 leading-relaxed">
                    Listo, te explico: andá a <span className="font-semibold text-orange-600">Panel → Cupones → Nuevo</span>. Ponés el porcentaje, la fecha y el nombre. ¿Querés que te sugiera un nombre para la campaña?
                  </div>
                </div>
                {/* Typing indicator */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-600 px-4 py-2.5 text-sm text-white">
                    sí dale, algo creativo
                  </div>
                </div>
                <div className="flex justify-start items-end gap-2">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Resultados reales</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-950">La prueba está en quienes ya están adentro.</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg mt-3 max-w-xl mx-auto">Cuando haya historias reales de usuarios, las vas a ver acá. Por ahora, podés ser el primero.</motion.p>
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
                          <Star key={s} className={`h-4 w-4 ${"rating" in t && s <= (t as {rating:number}).rating ? "fill-amber-400 text-amber-400" : "fill-amber-400 text-amber-400"}`} />
                        ))}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mb-6 italic flex-1">&ldquo;{t.text}&rdquo;</p>
                      <div className="flex items-center gap-3">
                        {"img" in t && (t as {img:string}).img ? (
                          <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                            <Image src={(t as {img:string}).img} alt={t.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-600 font-bold text-sm">{t.name[0]}</span>
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
                            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">Verificado</span>
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
              className="inline-flex items-center gap-2 bg-white border border-orange-200 hover:border-orange-400 text-orange-600 hover:text-orange-700 px-7 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:shadow-md hover:shadow-orange-100"
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              ¿Ya usás TiendaApps? Contá tu historia
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative text-center rounded-[2.5rem] bg-gradient-to-br from-orange-600 via-orange-600 to-rose-600 px-8 py-16 overflow-hidden"
          >
            <div className="absolute inset-0 grid-bg opacity-20" style={{ filter: "invert(1)" }} />
            <h2 className="relative text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Arrancá hoy.<br />Sin vueltas.
            </h2>
            <p className="relative text-orange-50 text-xl mb-10">
              Probá la plataforma completa durante 7 días.<br />
              Sin tarjeta, sin letra chica. Si no es para vos, no pasa nada.
            </p>
            <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/registro?plan=owner"
                className="group flex items-center justify-center gap-2.5 bg-white hover:bg-orange-50 text-orange-700 px-8 py-5 rounded-2xl font-bold text-lg transition-all shadow-2xl hover:scale-105"
              >
                Crear mi tienda gratis
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/afiliados"
                className="flex items-center justify-center gap-2 border border-white/40 hover:border-white text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all hover:bg-white/10"
              >
                <Users className="h-5 w-5" /> Quiero ser afiliado
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-200 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <AppLogo size={32} />
                <span className="text-lg font-bold text-gray-900">TiendaApps</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                La plataforma de ecommerce con sistema de afiliados para crecer con equipo.
              </p>
              <div className="flex items-center gap-4 mt-5">
                <Link href="/contacto" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors">
                  <Mail className="h-4 w-4" /> marketplacemitienda@gmail.com
                </Link>
              </div>
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm mb-4">Plataforma</p>
              <ul className="space-y-2.5">
                {[["#tiendas", "Ver tiendas"], ["#como-funciona", "Cómo funciona"], ["/registro", "Crear cuenta"], ["/login", "Iniciar sesión"]].map(([href, label]) => (
                  <li key={label}><a href={href} className="text-gray-500 hover:text-gray-900 text-sm transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm mb-4">Afiliados</p>
              <ul className="space-y-2.5">
                {[["/afiliados", "Postularme"], ["/afiliados/billetera", "Mis comisiones"], ["/quienes-somos", "Quiénes somos"]].map(([href, label]) => (
                  <li key={label}><a href={href} className="text-gray-500 hover:text-gray-900 text-sm transition-colors">{label}</a></li>
                ))}
                <li><Link href="/contacto" className="text-gray-500 hover:text-gray-900 text-sm transition-colors">Contacto</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-400 text-sm">© 2026 TiendaApps. Hecho con ❤️ para vos.</p>
            <p className="text-gray-400 text-xs">Plataforma ecommerce para tiendas y afiliados</p>
          </div>
        </div>
      </footer>

      {/* ── Floating canasta solidaria button ── */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1.6, type: "spring" }}
        className="fixed bottom-6 left-6 z-40"
      >
        <Link
          href={comunidadHref}
          className="fab-float fab-ring-amber bg-amber-500 hover:bg-amber-400 text-gray-950 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110"
          title="Comunidad Solidaria"
        >
          <HeartHandshake className="h-6 w-6" />
        </Link>
      </motion.div>

      {/* ── Testimonio Modal ── */}
      <AnimatePresence>
        {testimonioModal && <TestimonioModal onClose={() => setTestimonioModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
