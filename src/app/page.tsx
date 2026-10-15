"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import Link from "next/link";
import Image from "next/image";
import { useSesion } from "@/components/AuthProvider";
import PromotionsCarousel from "@/components/PromotionsCarousel";
import AsistentePersonaje from "@/components/dashboard/AsistentePersonaje";
import { AppLogo } from "@/components/AppLogo";
import { useTurnstile } from "@/components/Turnstile";
import { DIGITALES_ABIERTO } from "@/lib/planLimits";
import { LINKS_PUBLICOS } from "@/lib/nav-publico";
import { motion, AnimatePresence, useTransform, useSpring, useScroll, useMotionValueEvent, useReducedMotion, useInView, animate } from "framer-motion";
import {
  ArrowRight, X, Users, CheckCircle, Star, Send, MessageCircle, HeartHandshake, Menu, BadgeCheck, Sparkles, Download, Shield, Clock, Store,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

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

/* Las cuatro filas de "Todo para vender". Las fotos están en public/home. */
const FILAS = [
  {
    etiqueta: "Tu tienda", color: "var(--color-marca)", img: "/home/tienda.webp",
    titulo: "Una tienda con tu marca, lista en una tarde",
    texto: "Elegís el diseño, cargás tus productos y compartís tu link. Se ve impecable en el celular, que es donde compran tus clientes.",
    puntos: ["Diseños pensados para cada rubro", "URL propia: tiendaapps.com/tutienda", "Productos con variantes y fotos", "Optimizada para celular"],
  },
  {
    etiqueta: "Pagos", color: "#0d9488", img: "/home/pagos.webp",
    titulo: "Cobrá sin complicaciones, desde el día uno",
    texto: "Mercado Pago integrado de entrada. Tus clientes pagan como quieran y vos recibís la plata sin configuraciones técnicas ni vueltas.",
    puntos: ["Mercado Pago incluido", "Tarjeta, transferencia y más", "Precios mayoristas y minoristas"],
  },
  {
    etiqueta: "Pedidos", color: "#e11d48", img: "/home/pedidos.webp",
    titulo: "Cada pedido, bajo control",
    texto: "Cuando entra una venta te llega al panel al instante. La confirmás, la preparás y la enviás, con seguimiento para vos y para tu cliente.",
    puntos: ["Pedidos en tiempo real", "Estados: pendiente, en camino, entregado", "Seguimiento de envíos integrado"],
  },
  {
    etiqueta: "Tus clientes", color: "#3b82f6", img: "/home/clientes.webp",
    titulo: "Volvé a venderle a quien ya te compró",
    texto: "Cupones, notificaciones al celular y mails de carrito abandonado. Y con las estadísticas sabés qué se vende y de dónde llegan.",
    puntos: ["Cupones con vencimiento y límite de usos", "Notificaciones push y mails automáticos", "Google Analytics y Pixel de Facebook"],
  },
];

/* Entrada de costado de cada fila: el texto llega desde el lado de la foto. */
const deCostado = (derecha: boolean) => ({
  hidden: { opacity: 0, x: derecha ? -36 : 36 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
});

/* Un número que cuenta desde cero la primera vez que aparece. */
function Contador({ hasta, antes = "", despues = "" }: { hasta: number; antes?: string; despues?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true });
  const quieto = useReducedMotion();
  useEffect(() => {
    if (!visto || !ref.current) return;
    if (quieto || hasta === 0) { ref.current.textContent = `${antes}${hasta}${despues}`; return; }
    const ctl = animate(0, hasta, {
      duration: 1.4, ease: "easeOut",
      onUpdate: (v) => { if (ref.current) ref.current.textContent = `${antes}${Math.round(v)}${despues}`; },
    });
    return () => ctl.stop();
  }, [visto, quieto, hasta, antes, despues]);
  // En el HTML del servidor va el número final: sin JS (o para un buscador) se lee bien.
  return <span ref={ref}>{antes}{hasta}{despues}</span>;
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

/* ─── Testimonios: una cita grande, de a una ───
   (15/10/26) Antes eran tarjetas chicas en cursiva con "Ver más": con dos
   historias la pantalla quedaba vacía y costaba leerlas. Ahora va una por vez,
   en letra grande, y pasan solas cada 8 segundos (se frenan con el mouse o el
   foco adentro; con "reducir movimiento" no pasan solas). Todas están apiladas
   en la misma celda de la grilla, así el bloque mide lo que la más larga y no
   salta de alto al cambiar. Sólo historias reales y aprobadas: con una, queda
   fija y sin rayitas. */
const CITA_MS = 8000;
// Hasta acá se lee entera; más larga, se corta y aparece "Ver más".
const CITA_LARGA = 420;

function CitaRotativa({ historias }: { historias: RealTestimonial[] }) {
  const lista = historias.slice(0, 6);
  const n = lista.length;
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const quieto = useReducedMotion();
  const pos = Math.min(actual, Math.max(n - 1, 0));
  const ir = (k: number) => { setAbierta(null); setActual(((k % n) + n) % n); };
  const swipe = useTouchSwipe(() => ir(pos + 1), () => ir(pos - 1));
  const corre = n > 1 && !pausa && !quieto && abierta === null;

  useEffect(() => {
    if (!corre) return;
    const id = window.setTimeout(() => { setAbierta(null); setActual((a) => (a + 1) % n); }, CITA_MS);
    return () => window.clearTimeout(id);
  }, [corre, pos, n]);

  if (n === 0) return null;

  return (
    <div
      role="region" aria-roledescription="carrusel" aria-label="Historias de usuarios"
      onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)} onBlur={() => setPausa(false)}
      {...swipe}
      className="relative"
    >
      {/* La comilla de fondo, arriba a la derecha (dibujada: la tipografía la hacía dos rayas) */}
      <svg aria-hidden viewBox="0 0 48 36" className="absolute -top-2 right-0 w-16 sm:w-24 text-orange-500/15 pointer-events-none" fill="currentColor"><path d="M0 36V22C0 9.5 6.5 2.2 19 0l2 5.2C14 7.4 10.6 11.6 10.2 18H19v18H0Zm27 0V22C27 9.5 33.5 2.2 46 0l2 5.2C41 7.4 37.6 11.6 37.2 18H46v18H27Z" /></svg>

      <div className="grid">
        {lista.map((t, k) => {
          const activa = k === pos;
          const esLarga = t.text.length > CITA_LARGA;
          const abiertaEsta = abierta === t.id;
          return (
            <motion.figure
              key={t.id}
              aria-hidden={!activa}
              initial={false}
              animate={activa ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ gridArea: "1 / 1", pointerEvents: activa ? "auto" : "none" }}
              className="relative"
            >
              <div className="flex gap-1 mb-6" aria-label={`${t.rating} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-5 w-5 ${s <= t.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                ))}
              </div>
              <blockquote className={`text-gray-900 text-xl sm:text-2xl lg:text-[28px] font-semibold leading-snug tracking-tight ${esLarga && !abiertaEsta ? "line-clamp-6" : ""}`}>
                {t.text}
              </blockquote>
              {esLarga && (
                <button
                  type="button" tabIndex={activa ? 0 : -1}
                  onClick={() => setAbierta(abiertaEsta ? null : t.id)}
                  className="mt-3 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  {abiertaEsta ? "Ver menos" : "Ver más"}
                </button>
              )}
              <figcaption className="flex items-center gap-4 mt-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/25">
                  <span className="text-white font-black">{t.name[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-950">{t.name}</p>
                  <p className="text-gray-500 text-sm">{t.role}{t.location ? ` · ${t.location}` : ""}</p>
                </div>
                <span className="ml-auto text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-medium flex-shrink-0">Verificado</span>
              </figcaption>
            </motion.figure>
          );
        })}
      </div>

      {/* Las rayitas: la actual se llena mientras corre su tiempo. */}
      {n > 1 && (
        <div className="flex gap-2 mt-10 max-w-xs">
          {lista.map((t, k) => (
            <button
              key={t.id} type="button" onClick={() => ir(k)}
              aria-label={`Ver historia ${k + 1} de ${n}`} aria-current={k === pos}
              className="flex-1 py-3"
            >
              <span className="block h-1 rounded-full bg-gray-200 overflow-hidden">
                <span
                  key={`${pos}-${corre}`}
                  className="block h-full rounded-full bg-orange-500 origin-left"
                  style={k < pos || (k === pos && !corre)
                    ? { transform: "none" }
                    : k === pos ? { animation: `cita-llena ${CITA_MS}ms linear forwards` } : { transform: "scaleX(0)" }}
                />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Sasha: un chat de muestra que se puede tocar ───
   (15/10/26) Antes eran preguntas que flotaban y se pisaban, al lado de un chat
   quieto con los puntitos de "escribiendo" para siempre. Ahora al llegar al
   bloque la charla de ejemplo se cuenta sola, mensaje por mensaje, y cada
   pregunta de la izquierda es un botón: aparece en el chat, Sasha "escribe" y
   responde. Las respuestas están armadas acá (es una muestra, no la IA de
   verdad) y cada una nombra la sección real del panel donde se hace. */
const SASHA_PREGUNTAS: { q: string; a: string }[] = [
  { q: "¿Cuánto vendí esta semana?", a: "Esta semana entraron 12 pedidos, un 18% más que la anterior. El detalle por día lo tenés en Panel → Estadísticas." },
  { q: "Armame un cupón para el Hot Sale", a: "Dale. Andá a Panel → Cupones → Nuevo. Te sugiero HOTSALE15: 15% de descuento, que venza el último día del Hot Sale y con límite de usos para que haya urgencia." },
  { q: "¿Qué productos se venden más?", a: "Tus más vendidos del mes están en Panel → Estadísticas, ordenados por unidades. Si alguno se está quedando sin stock, te aviso antes de que se agote." },
  { q: "Tengo un pedido sin confirmar", a: "Sí, es el que entró ayer a la tarde. Lo encontrás en Panel → Pedidos: lo confirmás y tu cliente puede seguirlo desde su celular." },
  { q: "¿Cómo conecto Mercado Pago?", a: "En Panel → Pagos tocás para conectar Mercado Pago, entrás con tu cuenta y listo: desde ahí cobrás directo a tu cuenta." },
  { q: "Ideas para el Día del Padre", a: "Armá un combo de regalo con dos o tres productos, un cupón PAPA10 en Panel → Cupones y avisales a tus clientes una semana antes." },
];
const SASHA_CHARLA: { de: "sasha" | "yo"; texto: string }[] = [
  { de: "sasha", texto: "¡Hola! Tenés 3 pedidos sin confirmar y se acerca el Día de la Madre: buen momento para armar algo especial." },
  { de: "yo", texto: "armame un cupón de descuento para esa fecha" },
  { de: "sasha", texto: "Listo, te explico: andá a Panel → Cupones → Nuevo. Ponés el porcentaje, la fecha y el nombre. ¿Querés que te sugiera un nombre para la campaña?" },
];
type MsgSasha = { id: number; de: "sasha" | "yo"; texto: string };

/* "Panel → Cupones → Nuevo" va resaltado: es lo que la persona tiene que encontrar. */
function TextoSasha({ texto }: { texto: string }) {
  const partes = texto.split(/(Panel(?: → [A-ZÁÉÍÓÚ][a-záéíóúñ]+)+)/);
  return <>{partes.map((p, i) => (i % 2 ? <span key={i} className="font-semibold text-orange-600">{p}</span> : p))}</>;
}

function SashaDemo({ children }: { children: React.ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLDivElement>(null);
  const visto = useInView(raiz, { once: true, amount: 0.35 });
  const [msgs, setMsgs] = useState<MsgSasha[]>([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [ocupado, setOcupado] = useState(true);
  const relojes = useRef<number[]>([]);
  const sig = useRef(0);
  const despues = (ms: number, fn: () => void) => { relojes.current.push(window.setTimeout(fn, ms)); };
  const agregar = (de: MsgSasha["de"], texto: string) =>
    setMsgs((m) => [...m, { id: sig.current++, de, texto }].slice(-8));

  // La charla de ejemplo, de a un mensaje, la primera vez que se ve el bloque.
  useEffect(() => {
    if (!visto) return;
    let t = 300;
    SASHA_CHARLA.forEach((m) => {
      if (m.de === "sasha") {
        despues(t, () => setEscribiendo(true));
        t += 1100;
        despues(t, () => { setEscribiendo(false); agregar("sasha", m.texto); });
      } else {
        despues(t, () => agregar("yo", m.texto));
      }
      t += 900;
    });
    despues(t, () => setOcupado(false));
    const r = relojes.current;
    return () => { r.forEach(clearTimeout); };
  }, [visto]);

  // Siempre mostrando lo último: se mueve el chat, no la página.
  useEffect(() => {
    const el = chat.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, escribiendo]);

  function preguntar(p: { q: string; a: string }) {
    if (ocupado) return;
    setOcupado(true);
    agregar("yo", p.q);
    // En el celular el chat queda abajo de los botones: se lo acerca a la vista.
    if (window.innerWidth < 1024) chat.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    despues(350, () => setEscribiendo(true));
    despues(1500, () => { setEscribiendo(false); agregar("sasha", p.a); setOcupado(false); });
  }

  return (
    <div ref={raiz} className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center">
      <div>
        {children}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="lg:mb-8">
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Probá preguntarle:</motion.p>
          {/* En el celular, una tira que se desliza con el dedo; desde sm, en filas. */}
          <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-2 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none]">
            {SASHA_PREGUNTAS.map((p) => (
              <button
                key={p.q} type="button" onClick={() => preguntar(p)} disabled={ocupado}
                className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full shadow-sm whitespace-nowrap transition-all hover:border-orange-400 hover:text-orange-700 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <MessageCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                {p.q}
              </button>
            ))}
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="hidden lg:flex">
          <Link href="/registro" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-lg shadow-orange-500/25 hover:scale-105">
            Creá tu tienda y probalo <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>

      <div>
        <motion.div
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-gray-100 shadow-2xl shadow-orange-200/40 bg-white overflow-hidden max-w-sm mx-auto"
        >
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

          <div ref={chat} aria-live="polite" className="h-[360px] overflow-y-auto p-4 space-y-3 bg-gray-50/50 [scrollbar-width:thin]">
            <AnimatePresence initial={false}>
              {msgs.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${m.de === "yo" ? "justify-end" : "justify-start"}`}
                >
                  <div className={m.de === "yo"
                    ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-600 px-4 py-2.5 text-sm text-white leading-relaxed"
                    : "max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm px-4 py-2.5 text-sm text-gray-800 leading-relaxed"}>
                    {m.de === "sasha" ? <TextoSasha texto={m.texto} /> : m.texto}
                  </div>
                </motion.div>
              ))}
              {escribiendo && (
                <motion.div key="escribiendo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center" aria-label="Sasha está escribiendo">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        <p className="text-center text-xs text-gray-400 mt-3">Conversación de ejemplo</p>
        <div className="flex justify-center mt-6 lg:hidden">
          <Link href="/registro" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-lg shadow-orange-500/25 hover:scale-105">
            Creá tu tienda y probalo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
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
  const [rotatingWordIdx, setRotatingWordIdx] = useState(0);
  // Los tres estados con nombre, del mismo hook que usan el nav compartido y
  // los once templates de tienda. Ver `useSesion`: leer solo `user` hacía que
  // esto afirmara "no estás logueado" mientras todavía se estaba averiguando.
  const { cargando: authCargando, logueado, nombre: userName, panelHref, panelLabel } = useSesion();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setNavScrolled(v > 50));
  // Arriba de todo la barra va transparente sobre la foto oscura de la portada: letras blancas.
  const sobreFoto = !navScrolled;

  // Paralaje de la portada: la foto se queda un poco atrás y el texto se va antes.
  const heroRef = useRef<HTMLElement>(null);
  const reducirMov = useReducedMotion();
  const { scrollYProgress: heroProg } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroFotoY = useTransform(heroProg, [0, 1], ["0%", "22%"]);
  const heroFotoScale = useTransform(heroProg, [0, 1], [1.04, 1.14]);
  const heroTextoY = useTransform(heroProg, [0, 1], [0, -90]);
  const heroTextoOp = useTransform(heroProg, [0, 0.75], [1, 0]);
  // Afiliados: la foto se desliza un poco mientras la sección cruza la pantalla,
  // y la línea de los pasos se dibuja a medida que se baja por ellos.
  const afRef = useRef<HTMLElement>(null);
  const { scrollYProgress: afProg } = useScroll({ target: afRef, offset: ["start end", "end start"] });
  const afFotoY = useTransform(afProg, [0, 1], ["-6%", "6%"]);
  const pasosRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: pasosProg } = useScroll({ target: pasosRef, offset: ["start 75%", "end 55%"] });
  const pasosLinea = useSpring(pasosProg, { stiffness: 120, damping: 24 });

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
    const timer = setInterval(() => setRotatingWordIdx((i) => (i + 1) % ROTATING_WORDS.length), 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── ANNOUNCEMENT BAR ── */}
      {!announcementClosed && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 sm:gap-4 px-10"
          style={{ height: ANNOUNCEMENT_H, background: "linear-gradient(90deg,var(--color-marca),#e11d48)" }}
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
          /* El naranja sale del token de la marca (globals.css) y no escrito a
             mano, así que si algún día cambia el color, esta palabra cambia con
             él. El ámbar y el rosa son acompañantes del degradado, no la marca,
             y por eso siguen fijos. */
          background: linear-gradient(135deg, var(--color-marca-claro), #f59e0b, #e11d48, var(--color-marca-claro));
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
        @keyframes baja-seña { from { transform: translateY(-100%) } to { transform: translateY(200%) } }
        .baja-seña { animation: baja-seña 1.8s ease-in-out infinite; }
        @keyframes cita-llena { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        @media (prefers-reduced-motion: reduce) { .baja-seña { animation: none; } }
      `}</style>

      {/* ── NAVBAR ── */}
      <motion.nav
        style={{ top: announcementClosed ? 0 : ANNOUNCEMENT_H }}
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? "bg-white/90 backdrop-blur-xl border-b border-gray-200 shadow-sm" : "bg-transparent"}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <AppLogo size={72} />
            <span className={`text-lg font-bold transition-colors ${sobreFoto ? "text-white" : "text-gray-900"}`}>TiendaApps</span>
          </Link>

          {/* Mismo criterio que el nav compartido (SiteNav): el menú completo no
              entra en 768px, así que aparece recién en lg (1024px) y abajo de eso
              manda la hamburguesa. whitespace-nowrap para que ningún link ni botón
              se parta a dos líneas. El gap arranca chico y crece en xl.

              Los links salen de `@/lib/nav-publico`, el mismo array que usa
              SiteNav. La home mantiene su barra propia (arranca transparente
              sobre el hero, y abajo abre un cajón lateral) pero ya no tiene su
              propia lista: agregar un link en un solo archivo lo hace aparecer
              en las dos barras y en los dos menús. */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {LINKS_PUBLICOS.map(({ key, href, label, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className={`${sobreFoto ? "text-white/80 hover:text-white" : "text-gray-500 hover:text-gray-900"} text-sm font-medium whitespace-nowrap transition-colors${Icon ? " flex items-center gap-1.5" : ""}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {/* El hueco mide lo mismo que los botones reales (px-5 py-2.5 sobre
                texto de 14px = 42px de alto) para que al resolverse la sesión no
                salte nada de lugar. */}
            {authCargando ? (
              <div aria-hidden className="flex items-center gap-3">
                <div className="h-[42px] w-28 rounded-xl bg-gray-100 animate-pulse" />
                <div className="h-[42px] w-32 rounded-xl bg-gray-100 animate-pulse" />
              </div>
            ) : logueado ? (
              <>
                <span className={`${sobreFoto ? "text-white/80" : "text-gray-500"} text-sm whitespace-nowrap`}>Hola, {userName ?? "!"}</span>
                <Link href={panelHref} className="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold whitespace-nowrap px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105">
                  {panelLabel}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className={`${sobreFoto ? "text-white border-white/30 hover:border-white/60 hover:bg-white/10" : "text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300 hover:bg-gray-50"} text-sm font-medium whitespace-nowrap px-5 py-2.5 rounded-xl border transition-all`}>
                  Iniciar sesión
                </Link>
                <Link href="/registro" className="relative bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold whitespace-nowrap px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} aria-label="Abrir menú" className={`lg:hidden transition-colors ${sobreFoto ? "text-white" : "text-gray-500 hover:text-gray-900"}`}>
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
              /* Arranca abajo de la barra del anuncio, igual que el nav. Con
                 `top-0` el cajón se metía por debajo de esa barra (que va en
                 z-[60], arriba del cajón) y la X para cerrar quedaba tapada:
                 medido a 360px, el botón caía en y=22 y el click lo comía la
                 barra. Se podía cerrar tocando afuera, pero la X no respondía. */
              style={{ top: announcementClosed ? 0 : ANNOUNCEMENT_H }}
              className="fixed right-0 bottom-0 z-50 w-72 bg-white border-l border-gray-200 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
                <span className="text-gray-900 font-bold">Menú</span>
                <button onClick={() => setMobileMenu(false)} className="text-gray-500 hover:text-gray-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1 px-4 py-4 flex-1">
                {/* El mismo array que el nav de escritorio de acá arriba; el
                    menú chico va sin íconos, igual que el de SiteNav. */}
                {LINKS_PUBLICOS.map(({ key, href, label }) => (
                  <Link
                    key={key}
                    href={href}
                    onClick={() => setMobileMenu(false)}
                    className="block text-gray-700 hover:text-gray-900 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
                <div className="pt-3 border-t border-gray-200 flex flex-col gap-2 mt-2">
                  {authCargando ? (
                    <div aria-hidden className="h-[46px] rounded-xl bg-gray-100 animate-pulse" />
                  ) : logueado ? (
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
      {/* Una foto a pantalla entera con el texto encima (15/10/26), en vez del
          celular dibujado: una mano con el teléfono mirando una tienda, que sirve
          para todos los que entran acá —quien vende, quien vende productos
          digitales, el afiliado y el que compra— sin mostrar ningún rubro.
          La foto es propia (public/home), achicada: 38 KB la del celular (recorte
          cuadrado centrado en el teléfono) y 70 KB la de la compu. Al bajar, la
          foto se queda un poco atrás y el texto se va antes (paralaje suave);
          con "reducir movimiento" no se mueve nada. */}
      <section ref={heroRef} className="relative min-h-[100svh] flex items-end lg:items-center overflow-hidden bg-gray-950">
        <motion.div aria-hidden style={reducirMov ? undefined : { y: heroFotoY, scale: heroFotoScale }} className="absolute inset-0 will-change-transform">
          <picture>
            <source media="(max-width: 767px)" srcSet="/home/portada-celu.webp" />
            <img src="/home/portada.webp" alt="" fetchPriority="high" decoding="async" className="w-full h-full object-cover object-[45%_50%] lg:object-[62%_50%]" />
          </picture>
        </motion.div>
        {/* Velo: abajo en el celular (el texto va abajo), a la izquierda en la compu. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/75 to-gray-950/25 lg:bg-gradient-to-r lg:from-gray-950/95 lg:via-gray-950/60 lg:to-gray-950/10" />
        <div aria-hidden className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-orange-600/25 blur-3xl pointer-events-none" />

        <motion.div
          style={reducirMov ? undefined : { y: heroTextoY, opacity: heroTextoOp }}
          className="relative max-w-7xl mx-auto px-6 pb-14 lg:pb-16 w-full"
        >
          <div className="max-w-2xl" style={{ paddingTop: announcementClosed ? 112 : 152 }}>
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6 lg:mb-8">
                <span className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-orange-400 text-orange-400" />)}
                </span>
                Plataforma nueva · Sumate de los primeros
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-[44px] leading-[1.02] sm:text-6xl lg:text-7xl font-black mb-5 lg:mb-6 tracking-tight text-white">
                Tu marca.<br />
                <span className="gradient-text">Lista</span>{" "}
                para{" "}
                <motion.span
                  key={rotatingWordIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45 }}
                  className="gradient-text"
                >
                  {ROTATING_WORDS[rotatingWordIdx]}
                </motion.span>
                .
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base sm:text-lg text-white/80 mb-8 lg:mb-10 leading-relaxed max-w-xl">
                Tu tienda online, tus productos digitales y afiliados que venden por vos. Mercado Pago integrado y todo en un panel, sin técnicos ni inversión inicial.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                <Link
                  href="/registro"
                  className="group flex items-center justify-center gap-2.5 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-orange-600/30 hover:shadow-orange-500/50 hover:scale-105"
                >
                  Crear mi tienda gratis
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/registro?plan=seller"
                  className="flex items-center justify-center gap-2 border border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:bg-white/10 backdrop-blur-sm"
                >
                  <Users className="h-5 w-5" />
                  Quiero ser afiliado
                </Link>
              </motion.div>

              {/* ── TRUST STACK ── */}
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-8 lg:mb-10 text-white/70 text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  Pago seguro
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle className="h-3.5 w-3.5 text-sky-400" />
                  Mercado Pago incluido
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-orange-400" />
                  7 días gratis · sin tarjeta
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <BadgeCheck className="h-3.5 w-3.5 text-orange-400" />
                  Cancelás cuando quieras
                </span>
              </motion.div>

              {/* Los números cuentan desde cero cuando aparecen. */}
              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 sm:gap-6 max-w-md">
                {[
                  { hasta: 24, despues: "hs", label: "Primera venta" },
                  { hasta: 50, despues: "+", label: "Afiliados gratis" },
                  { hasta: 0, antes: "$", label: "Para arrancar" },
                ].map((s) => (
                  <div key={s.label} className="border-l-2 border-orange-500 pl-3 sm:pl-4">
                    <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                      <Contador hasta={s.hasta} antes={s.antes} despues={s.despues} />
                    </p>
                    <p className="text-xs sm:text-sm text-white/60 mt-1">{s.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Seña para bajar: una línea que cae, sólo donde sobra alto. */}
        <div aria-hidden className="hidden lg:block absolute bottom-6 left-1/2 -translate-x-1/2 w-px h-12 bg-white/15 overflow-hidden">
          <span className="block w-px h-1/2 bg-white/70 baja-seña" />
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

      {/* La seccion "¿Cual es tu lugar?" (Dueño / Afiliado / Comprador) vivia
          aca. Se saco: repetia el selector de tipo de cuenta que ya esta en
          /registro, alargaba la home, y los badges ("+24 ventas este mes",
          "$3.680 comision cobrada") eran numeros inventados. Los tres caminos
          siguen accesibles: "Crear cuenta" en el nav, "Tiendas" en el nav y
          "Quiero ser afiliado" en el footer y en el hero. */}

      {/* ── HERRAMIENTAS ── */}
      {/* Cuatro filas con foto que entran al bajar (15/10/26). Antes eran ocho
          pestañas con un carrusel: en el celular la grilla de botones ocupaba
          media pantalla antes de mostrar nada. Lo que quedó afuera de las filas
          no se perdió: los afiliados, los productos digitales y Sasha tienen su
          bloque más abajo, y cupones, avisos y estadísticas van en "Tus clientes".
          Las fotos son propias (public/home), de 13 a 20 KB cada una. */}
      <section className="py-20 lg:py-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14 lg:mb-20">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">La plataforma completa</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-4 leading-tight">Todo para vender,<br className="hidden sm:block" /> en un solo panel.</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg max-w-2xl mx-auto">Sin instalar nada y sin saber de sistemas.</motion.p>
          </motion.div>

          <div className="space-y-20 lg:space-y-28">
            {FILAS.map((f, i) => {
              const derecha = i % 2 === 1;
              return (
                <div key={f.etiqueta} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                  {/* La foto se descubre de costado y se acomoda. Lo dispara el
                      envoltorio y no la foto: el navegador no da por "a la vista"
                      algo recortado del todo, y la foto se quedaba tapada. */}
                  <motion.div
                    initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}
                    className={derecha ? "lg:order-2" : ""}
                  >
                  <motion.div
                    variants={{
                      hidden: { clipPath: derecha ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" },
                      show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
                    }}
                    className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-gray-900/15"
                  >
                    <motion.img
                      src={f.img} alt="" loading="lazy" decoding="async"
                      variants={{ hidden: { scale: 1.18 }, show: { scale: 1, transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1] } } }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${f.color}55 0%, transparent 55%)` }} />
                    <span className="absolute left-5 bottom-4 text-white/90 text-6xl lg:text-7xl font-black leading-none drop-shadow-[0_4px_18px_rgba(0,0,0,.45)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </motion.div>
                  </motion.div>

                  <motion.div
                    initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}
                  >
                    <motion.p variants={deCostado(derecha)} className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: f.color }}>{f.etiqueta}</motion.p>
                    <motion.h3 variants={deCostado(derecha)} className="text-3xl lg:text-4xl font-black text-gray-950 mb-4 leading-tight">{f.titulo}</motion.h3>
                    <motion.p variants={deCostado(derecha)} className="text-gray-500 leading-relaxed mb-6 text-base lg:text-lg">{f.texto}</motion.p>
                    <ul className="space-y-3">
                      {f.puntos.map((b) => (
                        <motion.li key={b} variants={deCostado(derecha)} className="flex items-center gap-3 text-sm lg:text-base text-gray-700">
                          <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: f.color }} />
                          {b}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Aca vivia "Tu tienda, con identidad propia.": la galeria de las once
          plantillas con filtro por rubro, carrusel y modal de detalle. Se saco
          entera, junto con todo lo que llevaba a ella (el "Como funciona" del
          nav, del SiteNav y del footer) y con la demo publica /plantillas/[id],
          que ya no existe. Los diseños se muestran ahora en los videos
          publicitarios, no en la home. */}

      {/* ── DISEÑO PROPIO ── */}
      {/* Fondo gris a propósito. Antes era blanco porque arriba tenía la galería
          de plantillas en gray-50 y con el mismo gris las dos se leían como una
          sola sección. Al sacarse la galería, el bloque de arriba pasó a ser
          Herramientas —que es blanco—, así que el blanco produjo justamente lo
          que evitaba: dos secciones seguidas sin corte visible. El gris devuelve
          la alternancia. Layout partido (foto izquierda / texto derecha) que
          queda espejado con Afiliados, justo debajo, que tiene el texto a la
          izquierda. */}
      <section className="py-24 bg-gray-50 overflow-hidden">
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
              {/* Antes decía "¿Ninguna plantilla es la tuya?", que era la
                  respuesta a la galería de plantillas que estaba justo arriba.
                  Al sacarse la galería, la pregunta le hablaba a algo que el
                  visitante nunca había visto. */}
              <h2 className="text-4xl sm:text-5xl font-black text-gray-950 mb-0 lg:mb-6 leading-tight">
                Tu propia tienda web, dentro de TiendaApps.
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
                  unoptimized
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
                Contanos cómo la imaginás y la <strong className="text-gray-900 font-semibold">diseñamos
                con vos</strong>, gratis. Queda con tu identidad, pero con la plataforma entera atrás:
                pagos, pedidos, afiliados y una comunidad de comercios que ya está vendiendo.
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
      {/* Foto y pasos (15/10/26), en el mismo idioma que la portada. Antes el
          collage de tres fotos estaba sólo en la compu (`hidden lg:block`) y en
          el celular el bloque era texto puro. Ahora la foto va en todos los
          anchos: arriba y con el título encima en el celular, a la derecha a
          todo el alto en la compu. Es vertical a propósito (33 KB): una sola
          foto sirve para los dos recortes. Los pasos llevan una línea que se
          dibuja al bajar y cada número se prende cuando llega. */}
      <section ref={afRef} className="relative bg-gray-950 text-white overflow-hidden">
        <div aria-hidden className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />
        <div className="relative h-[78svh] max-h-[620px] lg:absolute lg:inset-y-0 lg:right-0 lg:w-[46%] lg:h-auto lg:max-h-none overflow-hidden">
          <motion.img
            src="/home/afiliados.webp" alt="" loading="lazy" decoding="async"
            style={reducirMov ? undefined : { y: afFotoY, scale: 1.12 }}
            className="absolute inset-0 w-full h-full object-cover object-[50%_25%]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/35 to-transparent lg:bg-gradient-to-r lg:from-gray-950 lg:via-gray-950/30 lg:to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 -mt-48 lg:mt-0 pb-20 lg:py-28">
          <div className="lg:max-w-[50%]">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fadeUp} className="text-orange-400 font-semibold text-sm uppercase tracking-widest mb-4">Para afiliados</motion.p>
              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black mb-6 leading-tight">
                Representá marcas<br className="hidden sm:block" /> que te gustan.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/70 text-lg leading-relaxed mb-12">
                Un afiliado no maneja stock, no cobra pagos, no hace envíos. Representa una tienda, comparte su link y suma comisiones con cada venta que genera. La forma más flexible de vender online.
              </motion.p>
            </motion.div>

            {/* Pasos: la línea crece con el scroll; cada número se prende al llegar. */}
            <div ref={pasosRef} className="relative">
              <div aria-hidden className="absolute left-5 top-5 bottom-5 w-px bg-white/10" />
              <motion.div aria-hidden style={reducirMov ? undefined : { scaleY: pasosLinea }} className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-orange-500 to-amber-400 origin-top" />
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
              ].map((step) => (
                <motion.div
                  key={step.n} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }}
                  className="flex gap-5 pb-10 last:pb-0 relative"
                >
                  <motion.div
                    variants={{
                      hidden: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.2)", scale: 0.85 },
                      show: { backgroundColor: "#ea580c", borderColor: "#ea580c", scale: 1, transition: { duration: 0.45, delay: 0.15 } },
                    }}
                    className="w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 text-white text-xs font-black z-10 shadow-lg shadow-orange-600/20"
                  >
                    {step.n}
                  </motion.div>
                  <motion.div variants={deCostado(false)} className="pt-1">
                    <p className="font-black text-base mb-1">{step.title}</p>
                    <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-12">
              <Link href="/registro?plan=seller" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-7 py-3.5 rounded-2xl font-semibold transition-all shadow-lg shadow-orange-600/30 hover:scale-105">
                Quiero ser afiliado <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS DIGITALES ──

          POR QUÉ VA ACÁ Y NO EN OTRO LADO
          En "Para afiliados" la home deja de hablarle a quien quiere una tienda
          y empieza a mostrar las OTRAS formas de usar la plataforma. Este es el
          tercer camino, así que acompaña ese tramo en vez de interrumpir el
          anterior. Más arriba competiría con el mensaje principal; al final,
          después de los testimonios, sería un tema nuevo cuando la página ya
          está cerrando — ahí sí quedaría colgado.

          POR QUÉ ES BLANCO
          Afiliados es un degradado cálido y Sasha es `bg-gray-50`. Pintado de
          gris quedaban dos fondos iguales pegados y las dos secciones se leían
          como una sola.

          PROMETE, NO EXPLICA
          Tres frases y un botón. La explicación entera —la IA, los planes, la
          comisión, la garantía— va a vivir en su propia página. Contada en los
          dos lados son dos textos que en tres meses dicen cosas distintas.

          LA PANTALLA DE LA DERECHA ES UN EJEMPLO NUESTRO
          Mismo diseño que la página de venta de verdad, con un producto
          inventado (`public/marketing/pagina-de-venta-ejemplo.png`). La única
          página real que existe hoy es la de una clienta, y su tapa y sus textos
          son de ella. Si algún día se muestra una real, va con su permiso.

          ⚠️ SE DIBUJA SÓLO SI EL PRODUCTO ESTÁ ABIERTO
          La misma llave que ya miran `/precios`, `/login` y `/registro`. Hoy
          está prendida, pero si un día se apaga —para rehacer algo, o porque se
          frena el alta— sin esto la home lo seguiría ofreciendo y "Empezá
          gratis" llevaría a un registro donde esa cuenta ya no está: el
          parámetro se descarta y la persona cae a elegir entre las otras tres,
          sin que nada le explique qué pasó. */}
      {DIGITALES_ABIERTO && (
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.span variants={fadeUp} className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
              <Download className="h-3.5 w-3.5" /> Productos digitales
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-black text-gray-950 mb-5 leading-tight">
              Subí tu ebook.<br className="hidden sm:block" /> Del resto nos ocupamos.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-lg leading-relaxed mb-8">
              Vendés guías, plantillas o recetarios sin tener una tienda: te armamos la página de venta, cobrás con Mercado Pago y el archivo le llega solo al que compra.
            </motion.p>

            <motion.div variants={stagger} className="space-y-3 mb-9">
              {[
                "Su propia página de venta, lista para publicar",
                "Cobrás con Mercado Pago, a tu cuenta",
                "La entrega es automática: se manda sola al pagar",
              ].map((t) => (
                <motion.div key={t} variants={deCostado(false)} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-base">{t}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* La página explica el producto y desde ahí se elige el plan; el
                alta queda en el siguiente paso, junto con precios. */}
            <motion.div variants={fadeUp}>
              <Link
                href="/productos-digitales"
                className="inline-flex items-center gap-2 bg-gray-950 text-white px-7 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
              >
                Conocé cómo funciona <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-gray-400 text-sm mt-3">Sin tarjeta. El plan gratis no vence.</p>
            </motion.div>
          </motion.div>

          {/* La pantalla, en un celular.

              Va después del texto en el código: en el celular las dos columnas
              colapsan a una y así se entra por el título y no por una foto sin
              saber de qué se trata. Es el mismo criterio que usa la sección de
              "Diseño a tu medida" más arriba.

              El recorte es a propósito: se ve la parte de arriba —la tapa y el
              título, que es lo que convence— y el resto se va abajo del marco.
              Mostrar la página entera achicada no dejaría leer nada. */}
          {/* Entra subiendo y enderezándose, como un celular que se levanta para mirar. */}
          <motion.div
            initial={{ opacity: 0, y: 70, rotate: -7 }} whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.3 }} transition={{ type: "spring", stiffness: 70, damping: 16 }}
            className="relative mx-auto w-[248px] sm:w-[276px]"
          >
            <div className="relative h-[420px] sm:h-[470px] rounded-[2.2rem] overflow-hidden border-[7px] border-gray-900 shadow-2xl shadow-gray-300/70 bg-white">
              <Image
                src="/marketing/pagina-de-venta-ejemplo.png"
                alt="Ejemplo de una página de venta de un producto digital"
                fill
                sizes="276px"
                className="object-cover object-top"
              />
            </div>

            {/* El aviso de venta. Es lo único de la escena que no está en la
                pantalla de al lado, y es lo que la sección promete: que cobrás.

                Va abajo y a la izquierda, sobre la tapa del ebook. Arriba a la
                derecha —donde estaba— le tapaba el título a la pantalla, que es
                justo lo que la captura tiene para mostrar.

                En el celular va más abajo, sobre el borde de abajo del marco: ahí
                sólo tapa la parte de la página que ya quedaba cortada. Aparece
                con un rebote, después de que el celular termina de entrar. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -3 }} whileInView={{ opacity: 1, scale: 1, rotate: -3 }}
              viewport={{ once: true }} transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.7 }}
              className="flex absolute -left-5 -bottom-5 sm:-left-10 sm:bottom-16 items-center gap-2.5 bg-white rounded-2xl px-4 py-3 shadow-xl shadow-gray-300/60 border border-black/5"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 font-semibold leading-none mb-1">Venta aprobada</p>
                <p className="text-sm font-black text-gray-900 leading-none">$ 9.900</p>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>
      )}

      {/* ── SASHA (asistente de IA) ── */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <SashaDemo>
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
        </motion.div>
        </SashaDemo>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Resultados reales</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-black text-gray-950">La prueba está en quienes ya están adentro.</motion.h2>
            {/* El subtítulo tiene que seguir a la grilla: mientras estuvo fijo,
                decía que todavía no había historias con dos ya publicadas debajo. */}
            <motion.p variants={fadeUp} className="text-gray-500 text-lg mt-3 max-w-xl mx-auto">
              {realTestimonials.length > 0
                ? "Historias de gente que ya está vendiendo con TiendaApps."
                : "Cuando haya historias reales de usuarios, las vas a ver acá. Por ahora, podés ser el primero."}
            </motion.p>
          </motion.div>

          {/* Solo historias reales y aprobadas; si no hay ninguna no se dibuja
              (el subtítulo de arriba ya lo explica). Ver CitaRotativa. */}
          {realTestimonials.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl mx-auto mb-14 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/60 px-6 py-10 sm:px-12 sm:py-14"
            >
              <CitaRotativa historias={realTestimonials} />
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
      {/* "¿Por dónde arrancás?" (15/10/26). Antes era una tarjeta naranja con
          dos botones (tienda y afiliado) y los productos digitales no
          aparecían. Ahora son los tres caminos, cada uno a su registro.
          La foto de fondo es LA MISMA de la portada, desenfocada: la página
          cierra como abre y no se baja nada nuevo (ya está en caché). */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <picture>
          <source media="(max-width: 767px)" srcSet="/home/portada-celu.webp" />
          <img src="/home/portada.webp" alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-45" />
        </picture>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-gray-950/60 to-gray-950/90" />
        <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-orange-600/25 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12 lg:mb-16">
            <motion.h2 variants={fadeUp} className="text-5xl lg:text-6xl font-black leading-tight mb-5">
              Arrancá hoy.<br /><span className="gradient-text">Sin vueltas.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/75 text-lg lg:text-xl max-w-xl mx-auto">
              Probá la plataforma completa durante 7 días. Sin tarjeta, sin letra chica. Si no es para vos, no pasa nada.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-8 text-orange-400 font-semibold text-sm uppercase tracking-widest">¿Por dónde arrancás?</motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
            className={`grid grid-cols-1 gap-4 lg:gap-6 ${DIGITALES_ABIERTO ? "lg:grid-cols-3 max-w-xl lg:max-w-none mx-auto" : "md:grid-cols-2 max-w-3xl mx-auto"}`}
          >
            {[
              { href: "/registro?plan=owner", icon: Store, titulo: "Abrí tu tienda", texto: "Vendé tus productos con tu marca y cobrá con Mercado Pago.", boton: "Crear mi tienda gratis" },
              ...(DIGITALES_ABIERTO ? [{ href: "/registro?plan=digital", icon: Download, titulo: "Vendé lo digital", texto: "Tu ebook, guía o plantilla con su página de venta y entrega automática.", boton: "Empezar gratis" }] : []),
              { href: "/registro?plan=seller", icon: Users, titulo: "Ganá como afiliado", texto: "Representá tiendas que te gustan y cobrá comisión por cada venta.", boton: "Quiero ser afiliado" },
            ].map(({ href, icon: Icon, titulo, texto, boton }) => (
              <motion.div key={href} variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-md p-6 lg:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500 hover:bg-orange-600 hover:shadow-2xl hover:shadow-orange-600/30"
                >
                  <span className="w-12 h-12 rounded-2xl bg-orange-600/20 text-orange-400 flex items-center justify-center mb-4 lg:mb-6 transition-colors group-hover:bg-white/20 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-2xl font-black mb-2">{titulo}</span>
                  <span className="text-white/65 leading-relaxed mb-6 lg:mb-8 transition-colors group-hover:text-white/90">{texto}</span>
                  <span className="mt-auto inline-flex items-center gap-2 font-bold text-orange-400 transition-colors group-hover:text-white">
                    {boton} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            ))}
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
