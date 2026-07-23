"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import PromotionsCarousel from "@/components/PromotionsCarousel";
import AsistentePersonaje from "@/components/dashboard/AsistentePersonaje";
import { AppLogo } from "@/components/AppLogo";
import { useTurnstile } from "@/components/Turnstile";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useScroll, useMotionValueEvent } from "framer-motion";
import {
  ArrowRight, X, Store, Users, TrendingUp, CheckCircle,
  ShoppingBag, Star, Send, MessageCircle, HeartHandshake,
  Package, ShoppingCart, ChevronRight, ChevronLeft, Menu,
  BadgeCheck, Sparkles,
  ExternalLink, Info, Bell, Tag, Shield, Clock,
} from "lucide-react";
import { TEMPLATE_CATEGORIES } from "@/lib/templateRegistry";
import { SiteFooter } from "@/components/SiteFooter";

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

type RealTestimonial = {
  id: string;
  name: string;
  role: string;
  location: string | null;
  text: string;
  // La persona elige de 1 a 5 al enviar su historia y la API lo guarda y lo
  // devuelve. Faltaba acá, así que la página no tenía con qué pintar la
  // calificación real y mostraba siempre cinco estrellas.
  rating: number;
};

/* ─── Modal: Contá tu historia ─── */
function TestimonioModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", role: "Afiliado", location: "", text: "", rating: 5 });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const captcha = useTurnstile("testimonio");
  // Candado contra el doble envío. El botón deshabilitado NO alcanza: `sending`
  // es estado, o sea que recién bloquea en el render siguiente, y además con
  // Enter dentro de un campo el formulario se manda sin pasar por el botón. Un
  // ref cambia en el acto y corta la segunda llamada antes del fetch.
  const enviando = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    enviando.current = true;
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
    } finally {
      enviando.current = false;
      captcha.reset();
      setSending(false);
    }
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
              {/* Una sola columna en celular: el modal mide como mucho 448 px y con
                  el padding quedan ~256 px útiles. Partidos en dos, el desplegable
                  con "Dueño/a de tienda" no entraba. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

const ROTATING_WORDS = ["vender", "crecer", "todo", "despegar"];

// Preguntas de ejemplo de Sasha, para la "nube flotante": aparecen y desaparecen
// flotando en distintos puntos del bloque. Cada una tiene su posición [top%, left%].
// Hay dos disposiciones porque en celular no hay ancho para dispersarlas sin que se
// pisen: WIDE se esparce, NARROW va más centrada y en ritmo vertical.
const SASHA_QUESTIONS = [
  "¿Cuánto vendí esta semana?",
  "Armame un cupón para el Hot Sale",
  "¿Qué productos se venden más?",
  "Tengo un pedido sin confirmar",
  "¿Cómo conecto Mercado Pago?",
  "Ideas para el Día del Padre",
];
const SASHA_POS_WIDE: [number, number][]   = [[14, 24], [22, 66], [45, 37], [52, 71], [74, 29], [82, 60]];
const SASHA_POS_NARROW: [number, number][] = [[6, 48], [23, 45], [40, 55], [57, 44], [74, 55], [91, 49]];

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
const ANNOUNCEMENT_KEY = "announcement_v2";
const ANNOUNCEMENT_EVENT = "announcement-dismissed";

// La barra vive en localStorage, que no existe en el servidor. Se lee con
// useSyncExternalStore en vez de un useState + useEffect para no disparar un
// render en cascada: el snapshot del servidor es "cerrada", así que el HTML
// server-side y la hidratación coinciden, y recién después React relee el
// valor real del navegador.
function subscribeAnnouncement(onChange: () => void) {
  window.addEventListener(ANNOUNCEMENT_EVENT, onChange);
  return () => window.removeEventListener(ANNOUNCEMENT_EVENT, onChange);
}

export default function Home() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const announcementClosed = useSyncExternalStore(
    subscribeAnnouncement,
    () => localStorage.getItem(ANNOUNCEMENT_KEY) !== null,
    () => true,
  );
  const [realTestimonials, setRealTestimonials] = useState<RealTestimonial[]>([]);
  const [testimonioModal, setTestimonioModal] = useState(false);
  const [comunidadHref, setComunidadHref] = useState("/comunidad");
  const [templateFilter, setTemplateFilter] = useState("todo");
  const [templateInfoModal, setTemplateInfoModal] = useState<typeof TEMPLATE_ITEMS[number] | null>(null);
  const [templatePage, setTemplatePage] = useState(0);
  const [templateNavDir, setTemplateNavDir] = useState(1);
  const [thumbW, setThumbW] = useState(320);
  const [cloudNarrow, setCloudNarrow] = useState(false);
  const [rotatingWordIdx, setRotatingWordIdx] = useState(0);
  const [featureSlide, setFeatureSlide] = useState<[number, number]>([0, 1]);
  const [templatesInView, setTemplatesInView] = useState(false);
  const templatesSectionRef = useRef<HTMLElement>(null);
  const { user: sessionUser } = useAuth();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setNavScrolled(v > 50));

  // Pasar de herramienta. Se definen una sola vez y los usan las flechas, los
  // puntos y el deslizar con el dedo — así los tres se mueven igual, incluida la
  // dirección de la animación (el 2do valor del par).
  const featureNext = () => setFeatureSlide(([i]) => [(i + 1) % FEATURES.length, 1]);
  const featurePrev = () => setFeatureSlide(([i]) => [i === 0 ? FEATURES.length - 1 : i - 1, -1]);
  // En celular y tablet no hay mouse: sin esto, las flechas y los puntitos eran
  // la única forma de pasar de tarjeta, y en la galería de plantillas las flechas
  // ni siquiera se muestran (`hidden md:flex`). El hook ya distingue el gesto
  // horizontal del scroll vertical, así que no interfiere con bajar la página.
  const featureSwipe = useTouchSwipe(featureNext, featurePrev);

  // El filtrado y el total de páginas se calculan acá y no dentro del render de
  // la galería, porque ahora hay tres cosas que necesitan saber en qué página
  // estamos y cuántas hay: las flechas, los puntos y el deslizar. Una sola cuenta
  // para las tres, y el movimiento no puede pasarse de los extremos.
  const TEMPLATES_PAGE_SIZE = 6;
  const templatesFiltered = TEMPLATE_ITEMS.filter((t) => templateFilter === "todo" || t.categoryId === templateFilter);
  const templateTotalPages = Math.max(1, Math.ceil(templatesFiltered.length / TEMPLATES_PAGE_SIZE));
  const templatePageSafe = Math.min(templatePage, templateTotalPages - 1);
  const goTemplatePage = (dir: 1 | -1) => {
    const destino = templatePageSafe + dir;
    if (destino < 0 || destino > templateTotalPages - 1) return;
    setTemplateNavDir(dir);
    setTemplatePage(destino);
  };
  const templatesSwipe = useTouchSwipe(() => goTemplatePage(1), () => goTemplatePage(-1));

  function dismissAnnouncement() {
    localStorage.setItem(ANNOUNCEMENT_KEY, "1");
    window.dispatchEvent(new Event(ANNOUNCEMENT_EVENT));
  }

  useEffect(() => {
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

  // El reloj arranca de cero cada vez que cambia la vista, la cambie el timer o
  // la persona. Antes las deps eran [] : el intervalo se creaba al montar y
  // corría por su cuenta, así que si tocabas una pestaña a mitad del ciclo te
  // quedaba solo el resto del tiempo para mirarla (a veces menos de un segundo).
  // Depende de featureSlide entero y no solo del índice porque cada clic
  // reemplaza el array — así también se reinicia si tocás la pestaña que ya
  // estaba activa, que es justo cuando alguien quiere quedarse mirándola.
  // setTimeout en vez de setInterval: ahora dispara una sola vez por ciclo y el
  // efecto lo vuelve a armar.
  useEffect(() => {
    const timer = setTimeout(() => setFeatureSlide(([i]) => [(i + 1) % FEATURES.length, 1]), 12000);
    return () => clearTimeout(timer);
  }, [featureSlide]);

  useEffect(() => {
    const update = () => {
      // clientWidth, NO innerWidth: innerWidth incluye la barra de scroll (en
      // DevTools son ~15px reales), así que las dos tarjetas se pasaban por ese
      // margen y caían a una por fila. clientWidth es el ancho real disponible
      // —sin la barra— y en un celular de verdad da lo mismo (ahí la barra no
      // ocupa espacio).
      const w = document.documentElement.clientWidth;
      setCloudNarrow(w < 640);
      if (w < 640) {
        // Dos por fila en celular. Antes era 160px fijo, pero con el gap (12px)
        // dos tarjetas no entraban y caían a una sola, dejando la galería
        // larguísima. El ancho se calcula para que entren exactamente dos:
        // (pantalla − padding px-6 (48) − gap (12)) / 2, con 2px de aire para
        // que un redondeo no las tire a la fila de abajo. Tope de 320.
        setThumbW(Math.min(320, Math.floor((w - 48 - 12) / 2) - 2));
      } else {
        setThumbW(320);
      }
    };
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
          {/* `truncate` en vez de `whitespace-nowrap`: con dos textos que no
              admiten corte más el padding lateral, en un celular de 320-360 px no
              entraban y se recortaban por los dos lados (la barra está centrada y
              la página no scrollea en horizontal, así que quedaba texto perdido).
              Truncando, esta parte cede espacio y el botón se ve entero siempre. */}
          <span className="text-white text-xs sm:text-sm font-semibold truncate min-w-0">
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

          {/* Mismo criterio que el nav compartido (SiteNav): el menú completo no
              entra en 768px, así que aparece recién en lg (1024px) y abajo de eso
              manda la hamburguesa. whitespace-nowrap para que ningún link ni botón
              se parta a dos líneas. El gap arranca chico y crece en xl. */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link href="/tiendas" className="text-gray-500 hover:text-gray-900 text-sm font-medium whitespace-nowrap transition-colors">Tiendas</Link>
            <a href="#como-funciona" className="text-gray-500 hover:text-gray-900 text-sm font-medium whitespace-nowrap transition-colors">Cómo funciona</a>
            <Link href="/quienes-somos" className="text-gray-500 hover:text-gray-900 text-sm font-medium whitespace-nowrap transition-colors">Quiénes somos</Link>
            <Link href="/precios" className="text-gray-500 hover:text-gray-900 text-sm font-medium whitespace-nowrap transition-colors">Precios</Link>
            <Link href="/seguimiento" className="text-gray-500 hover:text-gray-900 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5">
              <Package className="h-4 w-4" />Seguimiento
            </Link>
            <Link href="/contacto" className="text-gray-500 hover:text-gray-900 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />Contacto
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {sessionUser ? (
              <>
                <span className="text-gray-500 text-sm whitespace-nowrap">Hola, {userName ?? "!"}</span>
                <Link href={panelHref} className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold whitespace-nowrap px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105">
                  {panelLabel}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium whitespace-nowrap px-5 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Iniciar sesión
                </Link>
                <Link href="/registro" className="relative bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold whitespace-nowrap px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden text-gray-500 hover:text-gray-900">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenu(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-white border-l border-gray-200 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
                <span className="text-gray-900 font-bold">Menú</span>
                <button onClick={() => setMobileMenu(false)} className="text-gray-500 hover:text-gray-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1 px-4 py-4 flex-1">
                <Link href="/tiendas" onClick={() => setMobileMenu(false)} className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">Tiendas</Link>
                <a href="#como-funciona" onClick={() => setMobileMenu(false)} className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">Cómo funciona</a>
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

            {/* Centrados hasta `lg`, igual que el bloque de Diseño Propio: mientras
                el hero es una sola columna los botones pegados al margen izquierdo
                quedan sueltos debajo de un título que ocupa todo el ancho. Desde
                `lg` el hero se parte en dos y vuelven a alinearse con el texto. */}
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center lg:justify-start gap-4 mb-5">
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
            {/* Acompaña a los botones de arriba: si se centran solo ellos, esta
                fila queda colgada contra el margen izquierdo. */}
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center lg:justify-start items-center gap-x-5 gap-y-2 mb-10 text-gray-500 text-xs">
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

          {/* Tabs. En celular van en grilla de 2 columnas parejas: con
              `flex-wrap` cada pastilla tomaba el ancho de su texto y, centradas,
              las filas quedaban de distinto ancho y sin alinear (se veian
              desordenadas). Desde `sm` vuelve al tab bar centrado de siempre, que
              en pantalla ancha se ve bien. */}
          <div className="grid grid-cols-2 gap-2 mb-8 sm:flex sm:flex-wrap sm:justify-center">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const active = featureSlide[0] === i;
              return (
                <button
                  key={i}
                  onClick={() => setFeatureSlide([i, i >= featureSlide[0] ? 1 : -1])}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm border transition-all sm:px-5"
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

          {/* Slider — se puede pasar con el dedo en celular y tablet */}
          <div {...featureSwipe} className="relative overflow-hidden rounded-3xl border border-gray-200 shadow-xl shadow-gray-100 min-h-[420px]">
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
              onClick={featurePrev}
              aria-label="Herramienta anterior"
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
              onClick={featureNext}
              aria-label="Herramienta siguiente"
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
            // Las cuentas viven arriba, en el cuerpo del componente, para que las
            // compartan las flechas, los puntos y el deslizar con el dedo.
            const totalPages = templateTotalPages;
            const page = templatePageSafe;
            const pageItems = templatesFiltered.slice(page * TEMPLATES_PAGE_SIZE, page * TEMPLATES_PAGE_SIZE + TEMPLATES_PAGE_SIZE);
            const slots: (typeof pageItems[number] | null)[] = [...pageItems];
            while (slots.length < TEMPLATES_PAGE_SIZE) slots.push(null);

            return (
              <div className="px-0 md:px-14">
                {/* relative: contexto para las flechas absolutas — sin overflow-hidden para no clipearlas */}
                <div className="relative">
                  {totalPages > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); goTemplatePage(-1); }}
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
                      onClick={(e) => { e.preventDefault(); goTemplatePage(1); }}
                      aria-disabled={page === totalPages - 1}
                      aria-label="Siguiente bloque"
                      className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 items-center justify-center bg-transparent border-none text-gray-400 hover:text-orange-600 transition-colors ${page === totalPages - 1 ? "opacity-20 pointer-events-none" : "cursor-pointer"}`}
                      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
                    >
                      <ChevronRight className="h-11 w-11" strokeWidth={1.5} />
                    </button>
                  )}

                  {/* overflow-hidden solo en el wrapper de la animación, no afecta las flechas.
                      El gesto va acá: en celular las flechas están ocultas (`hidden md:flex`),
                      así que sin esto los puntitos eran la única forma de pasar de bloque. */}
                  <div {...templatesSwipe} className="overflow-hidden">
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

      {/* ── DISEÑO PROPIO ── */}
      {/* Fondo blanco a propósito: la galería de arriba es gray-50, y con el
          mismo gris las dos secciones se leían como una sola. Layout partido
          (foto izquierda / texto derecha) que queda espejado con Afiliados,
          justo debajo, que tiene el texto a la izquierda. */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          {/* En celular las dos columnas colapsan a una, y el orden del código
              dejaba foto → título → descripción: se entraba a la sección por una
              foto sin saber de qué se trataba. El orden natural es leer el título,
              ver la foto y después el detalle.

              El orden se cambia con `order-*` (solo mobile) y en desktop se
              recompone con posición explícita de grid: la foto ocupa la columna
              izquierda entera y el texto queda partido en dos filas a la derecha,
              exactamente como se veía antes. Así el título vive en UN solo lugar
              del markup — duplicarlo para mobile sería dos textos que mantener. */}
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="grid lg:grid-cols-2 lg:grid-rows-[auto_auto] gap-y-10 lg:gap-x-16 lg:gap-y-0 items-center"
          >
            {/* Título — en celular arranca acá; en desktop vuelve arriba a la derecha. */}
            <motion.div variants={fadeUp} className="order-1 lg:col-start-2 lg:row-start-1 lg:self-end">
              <p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-4">
                Tu propio diseño
              </p>
              <h2 className="text-4xl sm:text-5xl font-black text-gray-950 mb-0 lg:mb-6 leading-tight">
                ¿Ninguna plantilla es la tuya?
              </h2>
            </motion.div>

            {/* Foto cálida de un comercio real andando. El "resultado" al que se
                aspira, no un mockup del producto.

                El grid recién se parte en dos a partir de `lg`, así que entre 640
                y 1023 px la foto ocupaba el ancho entero: en una tablet de 1000 px
                son ~975×731 px de foto sola. Se le pone techo y se centra; en
                celular y en desktop queda como estaba. */}
            <motion.div variants={fadeUp} className="relative order-2 w-full sm:max-w-xl sm:mx-auto lg:max-w-none lg:mx-0 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-center">
              <div className="absolute -inset-4 bg-gradient-to-br from-amber-200/40 to-orange-200/30 rounded-[2rem] blur-2xl pointer-events-none" />
              <div className="relative rounded-3xl overflow-hidden shadow-xl aspect-[4/3] lg:aspect-[5/6]">
                <Image
                  src="https://images.unsplash.com/photo-1552960562-daf630e9278b?auto=format&fit=crop&w=900&q=80"
                  alt="Dos emprendedores diseñando su tienda online juntos frente a una laptop"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              {/* Detalle flotante para reforzar la calidez y el "sin costo". */}
              <div className="absolute -bottom-4 -right-2 sm:right-6 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-orange-600" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-gray-900">Diseño a tu medida</p>
                  <p className="text-xs text-gray-400">Sin costo</p>
                </div>
              </div>
            </motion.div>

            {/* El detalle: una frase que invita, sin listar pasos. */}
            <motion.div variants={fadeUp} className="order-3 lg:col-start-2 lg:row-start-2 lg:self-start">
              <p className="text-gray-500 text-lg leading-relaxed mb-4">
                Contanos cómo imaginás tu tienda y la <strong className="text-gray-900 font-semibold">diseñamos
                con vos</strong>, a tu gusto y sin que te cueste nada.
              </p>
              <p className="text-gray-500 text-lg leading-relaxed mb-9">
                No necesitás saber de diseño ni tener la tienda creada. Vos nos contás la idea, nosotros la hacemos realidad.
              </p>

              {/* Centrado hasta `lg`: mientras la sección es una sola columna, el
                  botón pegado a la izquierda queda perdido debajo de un texto que
                  ocupa todo el ancho. Desde `lg` esto vuelve a ser la columna
                  derecha del bloque partido y se alinea con el resto.
                  La línea de abajo acompaña al botón — si se centra uno solo, el
                  otro queda colgado. */}
              <div className="text-center lg:text-left">
                <Link
                  href="/diseno-propio"
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
                >
                  Diseñar mi tienda <ArrowRight className="h-5 w-5" />
                </Link>
                <p className="text-gray-400 text-sm mt-4">Gratis · Sin registrarte · Te respondemos por mail o WhatsApp</p>
              </div>

              {/* La letra chica va a la vista y no recién al final del formulario:
                  si el trato no le cierra a alguien, mejor que se entere antes. */}
              <p className="text-xs text-gray-400 leading-relaxed mt-8 pt-6 border-t border-gray-200">
                El diseño terminado se suma al catálogo de TiendaApps y otras tiendas van a poder usarlo.
                Tus colores, tus fotos, tu logo y tus productos siguen siendo únicos tuyos.
              </p>
            </motion.div>
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

              {/* Centrado hasta `lg` como los demás: acá la columna del collage de
                  fotos está oculta en celular (`hidden lg:block`), así que el botón
                  quedaba solo contra el margen izquierdo debajo de los tres pasos. */}
              <motion.div variants={fadeUp} className="mt-10 text-center lg:text-left">
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

            {/* Nube flotante de preguntas de ejemplo. En vez de una lista quieta,
                las preguntas aparecen y desaparecen flotando en distintos puntos
                del bloque. Cada una está en una posición absoluta fija (para que no
                se pisen) y anima opacidad + una deriva suave en Y, con el ciclo
                escalonado (delay i*0.75) para que en todo momento haya ~3-4
                legibles mientras las otras entran/salen. Las posiciones cambian
                según el ancho: dispersas en desktop, más centradas en celular. */}
            <motion.div variants={fadeUp} className="mb-8">
              <p style={{ color: "#6b7280" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Por ejemplo, le podés preguntar:</p>
              <div className="relative w-full h-[260px] sm:h-[220px]">
                {SASHA_QUESTIONS.map((q, i) => {
                  const [top, left] = (cloudNarrow ? SASHA_POS_NARROW : SASHA_POS_WIDE)[i];
                  return (
                    <div key={q} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: `${top}%`, left: `${left}%` }}>
                      <motion.span
                        className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-[11px] sm:text-xs font-medium px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], y: [7, 0, -5, -9], scale: [0.92, 1, 1, 0.95] }}
                        transition={{ duration: 5, delay: i * 0.75, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut", times: [0, 0.22, 0.72, 1] }}
                      >
                        <MessageCircle className="h-3 w-3 text-orange-400 flex-shrink-0" />
                        {q}
                      </motion.span>
                    </div>
                  );
                })}
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

          {/* Solo historias reales y aprobadas. Antes había además una lista de
              relleno que estaba vacía desde siempre: todo el armado que la mezclaba
              con las reales, y las ramas de foto y de "Verificado" que servían para
              distinguirlas, no se ejecutaban nunca. Si no hay ninguna, la grilla no
              se dibuja — el texto de arriba ya explica que todavía no hay. */}
          {realTestimonials.length > 0 && (
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {realTestimonials.slice(0, 3).map((t) => (
                <motion.div key={t.id} variants={fadeUp}>
                  <Card3D className="h-full">
                    <div className="h-full bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col">
                      {/* Las estrellas vacías van en gris. Antes las dos ramas del
                          ternario eran idénticas (ámbar en las dos), así que quien
                          puntuaba con 3 aparecía publicado con 5. */}
                      <div className="flex gap-0.5 mb-4" aria-label={`${t.rating} de 5 estrellas`}>
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= t.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                        ))}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mb-6 italic flex-1">&ldquo;{t.text}&rdquo;</p>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-600 font-bold text-sm">{t.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                          <p className="text-gray-500 text-xs">
                            {t.role}{t.location ? ` · ${t.location}` : ""}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-medium">Verificado</span>
                        </div>
                      </div>
                    </div>
                  </Card3D>
                </motion.div>
              ))}
            </motion.div>
          )}

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
      <SiteFooter />

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
