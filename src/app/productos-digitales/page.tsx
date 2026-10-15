"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, Sparkles, Download, Upload, Wand2, CreditCard,
  Mail, Gift, TrendingUp, Ticket, ShieldCheck, Star, Plus, Minus, Zap,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PRECIOS_DIGITALES, COMISION_DIGITAL, DIGITALES_ABIERTO } from "@/lib/planLimits";
import { COPY_DIGITAL, TIERS_DIGITALES, type TierDigital } from "@/lib/planes-digitales";

/* ═══════════════════════════════════════════════════════════════════════════
   LA PÁGINA DE PRODUCTOS DIGITALES

   Es la que EXPLICA. El bloque de la home promete en tres frases y manda acá;
   acá se cuenta todo. Nunca los dos explicando lo mismo: son dos textos que en
   tres meses dicen cosas distintas.

   ── Sobre los efectos ───────────────────────────────────────────────────────
   Las apariciones son CSS puro (`animation-timeline: view()`), no JavaScript.
   Framer-motion quedó sólo para lo que CSS no hace: el parallax del celular, el
   acordeón de las preguntas y los `whileHover`. El motivo está largo en el
   `<style>`: con `whileInView`, una sección que ya estaba en pantalla al cargar
   se quedaba INVISIBLE, y eso es peor que no tener ningún efecto.

   Y todos se apagan solos con `prefers-reduced-motion` (ver el `<style>`): un
   parallax que no se puede apagar es un problema de accesibilidad, no un
   adorno.

   ── Sobre lo que dice ───────────────────────────────────────────────────────
   Cada cosa prometida acá existe hoy en el producto. Los precios y las
   comisiones salen de `planLimits`, no escritos a mano: una página de venta que
   miente el precio es peor que no tenerla.
   ═══════════════════════════════════════════════════════════════════════════ */


function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

/**
 * Cuánto sale un plan por mes, o `null` si no se paga.
 *
 * Es el mismo criterio que la tarjeta de `/precios`, y se resuelve por nombre y
 * no indexando: el registro de precios guarda los planes con el prefijo del
 * ecosistema (`DIGITAL_PRO`) y Free directamente no figura, porque no tiene
 * precio que guardar.
 */
function mensualDe(tier: TierDigital): number | null {
  if (tier === "FREE") return null;
  return tier === "PRO"
    ? PRECIOS_DIGITALES.DIGITAL_PRO.MONTHLY
    : PRECIOS_DIGITALES.DIGITAL_STARTER.MONTHLY;
}

/* Lo que se puede vender, en una cinta que no para. Es la forma más corta de
   decir "esto no es sólo para ebooks" sin escribir un párrafo. */
const COSAS = [
  "ebooks", "recetarios", "guías", "cursos en PDF", "rutinas de entrenamiento",
  "cuadernillos para imprimir", "partituras", "planes de comidas", "apuntes",
  "manuales", "libros para colorear", "patrones de costura",
];

const PASOS = [
  {
    icon: Upload,
    titulo: "Subís tu archivo",
    corta: "Tu PDF, de hasta 50 MB, guardado en privado.",
    texto: "Tu PDF, de hasta 50 MB. Queda guardado en un lugar privado al que sólo llega quien pagó: el link de descarga se arma en el momento y vence.",
  },
  {
    icon: Wand2,
    titulo: "Se arma tu página de venta",
    corta: "Con su dirección y los textos escritos por la IA.",
    texto: "Cada producto tiene la suya, con su propia dirección. La IA te escribe los textos y después los editás a mano — o, si ya tenés un diseño hecho, subís el tuyo y usás ese.",
  },
  {
    icon: CreditCard,
    titulo: "Cobrás y se entrega sola",
    corta: "La plata a tu Mercado Pago y el archivo al que compró.",
    texto: "La plata entra a tu cuenta de Mercado Pago. El archivo le llega al comprador apenas se aprueba el pago, sin que vos hagas nada.",
  },
];

/* Los dos caminos: foto, título y una línea; lo demás detrás del "+". */
const CAMINOS = [
  {
    icon: Upload, foto: "/digitales/ya-lo-tengo.webp",
    chapa: "Ya lo tengo",
    titulo: "Subilo y publicá hoy",
    corta: "Cargás el archivo, le ponés precio y ya tenés página de venta.",
    texto: "Si querés, la IA te escribe los textos de la página a partir de una descripción corta.",
    puntos: ["Tu PDF, hasta 50 MB", "La página se arma sola, con IA", "Lo editás todo a mano"],
  },
  {
    icon: Wand2, foto: "/digitales/de-cero.webp",
    chapa: "Arranco de cero",
    titulo: "Que la IA te escriba el ebook",
    corta: "Le contás de qué se trata y te arma el PDF entero, con tapa.",
    texto: "Te propone el índice, lo aprobás, y escribe el PDF entero con su tapa. Viene con los planes Starter y Pro.",
    puntos: ["Vos aprobás el índice antes", "Sale en PDF con tapa", "Desde el plan Starter"],
  },
];

/* El "+" que abre el detalle. A la vista va lo corto; esto es para quien quiere saber más. */
function MasDetalle({ abierto, onToggle, children }: { abierto: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <>
      <button type="button" onClick={onToggle} aria-expanded={abierto}
        className="mt-3 flex w-fit items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors">
        {abierto ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {abierto ? "Menos" : "Más detalle"}
      </button>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* El dibujito de cada paso: muestra lo que pasa en vez de contarlo. */
function EscenaPaso({ i }: { i: number }) {
  const caja = "mt-4 inline-flex items-center gap-3 bg-white rounded-2xl border border-black/[0.06] shadow-md shadow-gray-200/60 px-4 py-3";
  if (i === 0) return (
    <div className={caja}>
      <div className="w-9 h-11 rounded-md bg-rose-50 border border-rose-100 flex items-end justify-center pb-1 text-[9px] font-black text-rose-500">PDF</div>
      <div className="w-36">
        <p className="text-xs font-bold text-gray-800 mb-1.5 truncate">mi-ebook.pdf</p>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="pd-carga h-full rounded-full bg-orange-500" /></div>
      </div>
    </div>
  );
  if (i === 1) return (
    <div className={caja}>
      <div className="relative w-9 h-14 rounded-md overflow-hidden border-2 border-gray-900 bg-white">
        <Image src="/marketing/pagina-de-venta-ejemplo.png" alt="" fill sizes="36px" className="object-cover object-top" />
      </div>
      <div>
        <p className="text-[11px] text-gray-400 font-semibold leading-none mb-1">Tu página, con su dirección</p>
        <p className="text-xs font-bold text-gray-800">tiendaapps.com/p/…</p>
      </div>
    </div>
  );
  return (
    <div className={caja}>
      <div className="pd-latido w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <Check className="h-4 w-4 text-white" strokeWidth={3} />
      </div>
      <div>
        <p className="text-[11px] text-gray-400 font-semibold leading-none mb-1">Venta aprobada · archivo enviado</p>
        <p className="text-sm font-black text-gray-900 leading-none">$ 9.900</p>
      </div>
    </div>
  );
}

const ADENTRO = [
  { icon: Gift, titulo: "Bonos que regalás", texto: "Sumás archivos de regalo a la compra. Se ven en la página como parte del paquete y se entregan junto con el principal." },
  { icon: TrendingUp, titulo: "Un upsell después de pagar", texto: "Justo después de la compra le ofrecés algo más, con su propio descuento. Si acepta, se cobra sobre el pago que ya hizo. El reloj de la oferta viene desde Starter." },
  { icon: Ticket, titulo: "Cupones", texto: "Los armás vos, con tope de usos y vencimiento. También hay automáticos para quien deja la compra por la mitad." },
  { icon: Mail, titulo: "Correos que salen solos", texto: "El de la entrega sale siempre, con tu nombre y no con el nuestro. El de recuperación de carrito y los avisos a tus compradores vienen con Pro." },
  { icon: Star, titulo: "Opiniones de quien compró", texto: "Sólo puede opinar quien pagó, así que lo que se ve en la página es de gente real." },
  { icon: ShieldCheck, titulo: "Garantía y datos en regla", texto: "La garantía que prometas queda escrita en el consentimiento que acepta el comprador. Los textos legales se generan solos." },
];

const PREGUNTAS = [
  {
    q: "¿Necesito tener una tienda?",
    a: "No. Productos Digitales es aparte: cada producto tiene su propia página de venta con su dirección. No hay stock, ni variantes, ni envíos, ni un carrito que pida la dirección de nadie.",
  },
  {
    q: "¿Cómo cobro?",
    a: "Conectás tu cuenta de Mercado Pago y la plata de cada venta entra ahí, a tu nombre. Nosotros no tocamos tu dinero: retenemos la comisión dentro del mismo cobro y el resto es tuyo.",
  },
  {
    q: "¿Qué pasa si no vendo nada?",
    a: "No pagás nada. El plan Free no tiene abono ni vencimiento y no pide tarjeta: si no vendés, no te cuesta. Cobramos un porcentaje sólo cuando vendés.",
  },
  {
    q: "¿Y si todavía no tengo el ebook escrito?",
    a: "Te lo escribe la IA: le contás de qué se trata y a quién apunta, revisás el índice, y te arma el PDF con su tapa. Eso viene con los planes Starter y Pro. En el plan gratis la IA igual te arma la página de venta, pero el ebook lo traés vos.",
  },
  /* Esta va en las preguntas y no en un bloque propio a propósito: le importa a
     poca gente —quien ya tiene un diseño hecho o sabe armarlo— pero cuando le
     importa, decide la compra. Plegada no le cuesta un renglón a nadie más. */
  {
    q: "¿Puedo usar mi propio diseño en vez del de ustedes?",
    a: "Sí. Subís tu propio archivo HTML y esa pasa a ser tu página de venta. Las fotos las cambiás después desde el panel sin volver a subir nada, y las versiones anteriores quedan guardadas por si querés volver atrás. Lo que subís se limpia de scripts antes de publicarse. Es una función de los planes Starter y Pro.",
  },
  {
    q: "¿El comprador puede pasarle el archivo a otro?",
    a: "El link de descarga es personal y vence, así que no sirve reenviarlo. Nada impide que alguien comparta el PDF que ya bajó — eso no lo puede evitar ninguna plataforma — pero el acceso a la descarga sí está controlado.",
  },
  {
    q: "¿Puedo usar mi propio dominio?",
    a: "En el plan Pro, sí, y va por producto y no por cuenta: cada página de venta puede tener su propio dominio. En Free y en Starter cada producto igual tiene su dirección en tiendaapps.com, que funciona igual de bien. En los tres casos, quien llega desde un anuncio de tortas ve tortas y nunca ve tu cuenta.",
  },
];

/**
 * Un número que sube cuando entra en pantalla.
 *
 * ⚠️ ARRANCA EN EL NÚMERO DE VERDAD, NO EN CERO, y eso no es un detalle: acá se
 * muestran las comisiones. La primera versión arrancaba en 0 y subía cuando
 * `onViewportEnter` avisaba; ese aviso no llegaba nunca —el mismo problema de
 * viewport que dejaba secciones invisibles— y la página quedó anunciando **0% de
 * comisión en los tres planes**. Un efecto que falla se nota; un número que
 * falla es una promesa que después hay que cumplir.
 *
 * Ahora el valor real está puesto desde el principio y la animación lo baja a
 * cero para subirlo sólo si de verdad va a correr. Sin JavaScript, con el
 * observador roto o con "menos movimiento" activado, se lee el dato correcto.
 */
function Contador({ hasta, sufijo = "" }: { hasta: number; sufijo?: string }) {
  const [n, setN] = useState(hasta);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let reloj: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0]?.isIntersecting) return;
        io.disconnect();
        const paso = Math.max(1, Math.round(hasta / 22));
        let v = 0;
        setN(0);
        reloj = setInterval(() => {
          v += paso;
          if (v >= hasta) { v = hasta; clearInterval(reloj); }
          setN(v);
        }, 32);
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => { io.disconnect(); clearInterval(reloj); };
  }, [hasta]);

  return <span ref={ref}>{n}{sufijo}</span>;
}

export default function ProductosDigitalesPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start end", "end start"] });

  /* ⚠️ El parallax también se apaga con "menos movimiento", y hay que apagarlo
     ACÁ: lo mueve framer-motion, así que el `@media (prefers-reduced-motion)`
     del `<style>` no lo toca —ese sólo alcanza a las animaciones CSS—. Un
     parallax es de lo que peor le cae a quien pidió menos movimiento. */
  const menosMovimiento = useReducedMotion();
  const celularY = useTransform(scrollYProgress, [0, 1], [menosMovimiento ? 0 : 50, menosMovimiento ? 0 : -50]);
  const celularEscala = useTransform(scrollYProgress, [0, 0.5, 1], [menosMovimiento ? 1 : 0.96, 1, menosMovimiento ? 1 : 0.96]);

  const [abierta, setAbierta] = useState<number | null>(0);

  const pasosRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: pasosProg } = useScroll({ target: pasosRef, offset: ["start 80%", "end 60%"] });
  const lineaPasos = useTransform(pasosProg, [0, 1], [menosMovimiento ? 1 : 0, 1]);

  // Qué "+" están abiertos (caminos, pasos y lo que trae), por su título.
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const alternar = (k: string) => setAbiertos((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  /* La misma llave que mira la home, el registro y los precios. Con el producto
     apagado esta página no existe: ver el `notFound` de más abajo no sirve acá
     porque es un componente de cliente, así que se dibuja el aviso y nada más. */
  if (!DIGITALES_ABIERTO) {
    return (
      <>
        <SiteNav active="digitales" />
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
          <Sparkles className="h-10 w-10 text-orange-500 mb-4" />
          <h1 className="text-3xl font-black text-gray-950 mb-3">Productos Digitales está en camino</h1>
          <p className="text-gray-500 mb-8">Todavía no está abierto al público. Dejanos tu consulta y te avisamos apenas se pueda usar.</p>
          <Link href="/contacto" className="bg-gray-950 text-white px-7 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors">
            Escribinos
          </Link>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pd-gradient { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .pd-texto-degrade {
          background: linear-gradient(135deg, var(--color-marca-claro), #f59e0b, #e11d48, var(--color-marca-claro));
          background-size: 300% 300%;
          animation: pd-gradient 4s ease infinite;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pd-grilla { background-image: linear-gradient(rgba(249,115,22,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,.05) 1px, transparent 1px); background-size: 48px 48px; }
        @keyframes pd-flotar { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .pd-flota { animation: pd-flotar 5s ease-in-out infinite; }
        @keyframes pd-cinta { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .pd-cinta { animation: pd-cinta 38s linear infinite; display: flex; width: max-content; }
        @keyframes pd-cargando { 0% { width: 0 } 70%, 100% { width: 100% } }
        .pd-carga { width: 100%; animation: pd-cargando 2.6s ease-out infinite; }
        @keyframes pd-latido { 0%,100%{ box-shadow:0 0 0 0 rgba(16,185,129,.45) } 50%{ box-shadow:0 0 0 9px rgba(16,185,129,0) } }
        .pd-latido { animation: pd-latido 2.4s ease-in-out infinite; }

        /* LA ENTRADA DEL HERO ES CSS Y NO JAVASCRIPT, A PROPOSITO.

           Estaba hecha con variantes de framer-motion y el texto se quedaba
           transparente para siempre: en 1280 el hero se veia VACIO (solo el
           celular) mientras que en 360 andaba. Depende de cuando termina de
           hidratar, asi que es una loteria, y lo que se sortea es si se lee o no
           el titulo de la pagina.

           Con CSS el peor caso es que la animacion no se reproduzca; el texto se
           ve igual. Nunca al reves.

           (Sin comillas invertidas ni acentos raros aca adentro: esto vive en un
           template literal de JSX y una comilla invertida lo parte al medio.) */
        @keyframes pd-entra { from { opacity: 0; transform: translateY(26px) } to { opacity: 1; transform: none } }
        .pd-entra > * { animation: pd-entra .6s cubic-bezier(.16,1,.3,1) both; }
        .pd-entra > *:nth-child(1) { animation-delay: .05s }
        .pd-entra > *:nth-child(2) { animation-delay: .15s }
        .pd-entra > *:nth-child(3) { animation-delay: .25s }
        .pd-entra > *:nth-child(4) { animation-delay: .35s }
        .pd-entra > *:nth-child(5) { animation-delay: .45s }

        /* LO QUE APARECE AL BAJAR, SIN UNA LINEA DE JAVASCRIPT.

           animation-timeline: view() ata la animacion al scroll: el navegador la
           corre solo cuando el elemento entra en pantalla, y la corre en el
           compositor, asi que no pelea con el hilo principal.

           Va adentro de @supports a proposito. Donde no existe (Safari y Firefox
           por ahora), no se aplica NADA y el contenido se ve normal, quieto. Ese
           es el punto: el efecto es un extra, nunca la condicion para leer.

           Es lo que reemplazo a whileInView, que dejaba secciones enteras en
           blanco cuando ya estaban en pantalla al cargar la pagina (entrando por
           un ancla, o recargando a mitad de la pagina). */
        @supports (animation-timeline: view()) {
          .pd-reveal > *, .pd-reveal-uno {
            animation: pd-entra .8s cubic-bezier(.16,1,.3,1) both;
            animation-timeline: view();
            animation-range: entry 0% cover 30%;
          }
          .pd-reveal > *:nth-child(2) { animation-range: entry 0% cover 33%; }
          .pd-reveal > *:nth-child(3) { animation-range: entry 0% cover 36%; }
          .pd-reveal > *:nth-child(4) { animation-range: entry 0% cover 39%; }

          /* Los números de los pasos: grises hasta que llegan, despues naranja.
             Sin soporte quedan naranja de entrada (el color final es el de la clase). */
          @keyframes pd-prende { from { background-color: #d1d5db; transform: scale(.85) } to { background-color: var(--color-marca); transform: none } }
          .pd-prende { animation: pd-prende linear both; animation-timeline: view(); animation-range: entry 70% cover 45%; }
        }

        /* Quien pidió menos movimiento no recibe ninguno de estos efectos. */
        @media (prefers-reduced-motion: reduce) {
          .pd-texto-degrade, .pd-flota, .pd-cinta, .pd-latido, .pd-carga { animation: none !important; }
          .pd-entra > *, .pd-reveal > *, .pd-reveal-uno, .pd-prende { animation: none !important; }
        }
      `}</style>

      <SiteNav active="digitales" />

      {/* ═══ HERO ═══ */}
      {/* Foto entera con el texto encima (15/10/26), como la home: alguien
          leyendo un ebook en la tablet, que es lo que se vende acá. La foto va
          espejada para que la tablet quede a la derecha y el texto no la tape.
          Propia y achicada (public/digitales): 28 KB en el celular, 46 en la
          compu. El celular con la página de venta pasó a la sección de abajo. */}
      <section className="relative overflow-hidden bg-gray-950 min-h-[560px] sm:min-h-[620px] lg:min-h-[640px] flex items-end lg:items-center">
        <picture>
          <source media="(max-width: 767px)" srcSet="/digitales/portada-celu.webp" />
          <img src="/digitales/portada.webp" alt="" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover object-[70%_40%] lg:object-[80%_45%]" />
        </picture>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-gray-950/10 lg:bg-gradient-to-r lg:from-gray-950/95 lg:via-gray-950/60 lg:to-transparent" />
        <div aria-hidden className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-orange-600/25 blur-3xl pointer-events-none" />

        {/* La entrada de acá es CSS (`pd-entra`) y no framer-motion. Ver el
            comentario largo en el `<style>`: con variantes, este texto se
            quedaba invisible y el hero aparecía vacío. */}
        <div className="relative max-w-6xl mx-auto px-6 w-full pt-24 pb-12 lg:py-20">
          <div className="pd-entra max-w-xl text-white">
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
              <Download className="h-3.5 w-3.5" /> Productos digitales
            </span>

            <h1 className="text-[38px] sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-4 sm:mb-6">
              Vendé lo que sabés,<br />
              <span className="pd-texto-degrade">sin tener una tienda.</span>
            </h1>

            <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-7 sm:mb-8">
              Subís tu archivo, te queda una página de venta y la entrega sale sola apenas te pagan.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Link
                href="/registro?plan=digital"
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl font-bold transition-colors shadow-lg shadow-orange-600/30"
              >
                Empezá gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 text-white px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl font-bold transition-colors backdrop-blur-sm"
              >
                Cómo funciona
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-[13px] sm:text-sm text-white/70">
              {["Sin tarjeta", "El plan gratis no vence", "Cobrás vos, a tu cuenta"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-orange-400" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ASÍ QUEDA ═══ */}
      {/* El celular con una página de venta de ejemplo y las ventas entrando:
          una línea y la imagen, que es lo que convence. */}
      <section ref={heroRef} className="relative overflow-hidden pd-grilla bg-white py-16 sm:py-20">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="pd-reveal text-center lg:text-left">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Así queda</p>
            <h2 className="text-3xl lg:text-5xl font-black text-gray-950 leading-tight mb-4">
              Tu página de venta,<br className="hidden sm:block" /> lista para compartir.
            </h2>
            <p className="text-gray-500 text-lg">Con su propia dirección. La pegás en Instagram o WhatsApp y empieza a vender.</p>
          </div>

          {/* El celular, con parallax y las ventas entrando de a una */}
          <motion.div style={{ y: celularY, scale: celularEscala }} className="relative mx-auto w-[230px] sm:w-[280px]">
            <div className="pd-flota relative h-[400px] sm:h-[480px] rounded-[2.4rem] overflow-hidden border-[8px] border-gray-900 shadow-2xl shadow-orange-200/60 bg-white">
              <Image
                src="/marketing/pagina-de-venta-ejemplo.png"
                alt="Ejemplo de una página de venta de un producto digital"
                fill sizes="280px"
                className="object-cover object-top"
              />
            </div>

            {/* Las dos van en la MITAD DE ABAJO, sobre la tapa del ebook: arriba
                le tapaban el título a la pantalla.

                ⚠️ La inclinación va como PROP de motion, no en `style`:
                framer-motion arma su propio `transform` con lo que anima y pisa
                el del `style`. Puesta entre lo que anima, sobrevive. */}
            {[
              { monto: "$ 9.900", donde: "-right-10 bottom-40 sm:-right-14", retraso: 0.4, giro: 3 },
              { monto: "$ 14.500", donde: "-left-10 bottom-16 sm:-left-16", retraso: 1.1, giro: -3 },
            ].map((v) => (
              <motion.div
                key={v.monto}
                initial={{ opacity: 0, x: 30, scale: 0.9, rotate: v.giro }}
                animate={{ opacity: 1, x: 0, scale: 1, rotate: v.giro }}
                transition={{ duration: 0.5, delay: v.retraso }}
                className={`flex absolute ${v.donde} z-10 items-center gap-2.5 bg-white rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-xl shadow-gray-300/60 border border-black/5`}
              >
                <div className="pd-latido w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold leading-none mb-1">Venta aprobada</p>
                  <p className="text-sm font-black text-gray-900 leading-none">{v.monto}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ LA CINTA ═══ */}
      <section className="py-8 bg-gray-950 overflow-hidden">
        <div className="pd-cinta gap-10">
          {/* La lista va DOS veces: la cinta se corre hasta la mitad y vuelve a
              empezar, así que la segunda copia es la que tapa el salto. Por eso
              la key lleva el índice: los textos se repiten a propósito. */}
          {[...COSAS, ...COSAS].map((c, i) => (
            <span key={i} className="flex items-center gap-10 text-white/70 text-lg font-semibold whitespace-nowrap">
              {c}
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            </span>
          ))}
        </div>
      </section>

      {/* ═══ LOS DOS CAMINOS ═══ */}
      {/* Foto, título y una línea a la vista; el resto detrás del "+" (15/10/26):
          la gente no lee bloques, pero el que quiere el detalle lo encuentra. */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="pd-reveal text-center mb-12">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Por dónde empezás</p>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-950">
              ¿Ya lo tenés hecho, o arrancás de cero?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {CAMINOS.map((c) => {
              const abierto = abiertos.has(c.chapa);
              return (
                /* El de afuera entra, el de adentro se levanta: ver el aviso en el
                   <style> sobre por que no pueden ser el mismo elemento. */
                <div key={c.chapa} className="pd-reveal-uno">
                <motion.div
                  className="group relative bg-white border border-black/[0.07] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-orange-100 transition-shadow"
                  whileHover={{ y: -6 }}
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element -- foto propia ya achicada (public/digitales) */}
                    <img src={c.foto} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur text-gray-900 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                      <c.icon className="h-3.5 w-3.5 text-orange-600" /> {c.chapa}
                    </span>
                  </div>
                  <div className="p-6 sm:p-7">
                    <h3 className="text-2xl font-black text-gray-950 mb-2">{c.titulo}</h3>
                    <p className="text-gray-500 leading-relaxed">{c.corta}</p>
                    <MasDetalle abierto={abierto} onToggle={() => alternar(c.chapa)}>
                      <p className="text-gray-500 leading-relaxed mb-4">{c.texto}</p>
                      <div className="space-y-2.5">
                        {c.puntos.map((p) => (
                          <div key={p} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                            <span className="text-gray-700 text-sm">{p}</span>
                          </div>
                        ))}
                      </div>
                    </MasDetalle>
                  </div>
                </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CÓMO FUNCIONA ═══ */}
      <section id="como-funciona" className="py-24 bg-gray-50 overflow-hidden scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="pd-reveal text-center mb-16">
            <motion.p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Cómo funciona</motion.p>
            <motion.h2 className="text-4xl lg:text-5xl font-black text-gray-950">
              Tres pasos, y después<br className="hidden sm:block" /> se maneja solo.
            </motion.h2>
          </motion.div>

          {/* La línea que une los pasos se dibuja con el scroll (useScroll: va
              atada a la posición, no a "entró en pantalla", así que no puede
              quedarse a medias como whileInView). Horizontal en la compu,
              vertical en el celular, donde los pasos van uno abajo del otro. */}
          <div ref={pasosRef} className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-orange-200/50" />
            <motion.div
              style={{ scaleX: lineaPasos, transformOrigin: "left" }}
              className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-orange-300 via-orange-500 to-rose-400"
            />
            <div className="md:hidden absolute left-8 top-8 bottom-8 w-px bg-orange-200/50" />
            <motion.div
              style={{ scaleY: lineaPasos, transformOrigin: "top" }}
              className="md:hidden absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-orange-300 via-orange-500 to-rose-400"
            />

            {PASOS.map((p, i) => (
              <motion.div
                key={p.titulo}
                className="pd-reveal-uno relative flex gap-5 md:block text-left"
              >
                <div className="relative z-10 w-16 h-16 flex-shrink-0 rounded-2xl bg-white border border-black/[0.06] shadow-lg shadow-orange-100/70 flex items-center justify-center md:mb-5">
                  <p.icon className="h-7 w-7 text-orange-600" />
                  <span className="pd-prende absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-600 text-white text-[11px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="pt-1 md:pt-0 flex-1 min-w-0">
                  <h3 className="text-xl font-black text-gray-950 mb-1.5">{p.titulo}</h3>
                  <p className="text-gray-500 leading-relaxed">{p.corta}</p>
                  <EscenaPaso i={i} />
                  <MasDetalle abierto={abiertos.has(p.titulo)} onToggle={() => alternar(p.titulo)}>
                    <p className="text-gray-500 leading-relaxed">{p.texto}</p>
                  </MasDetalle>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LA PÁGINA POR DENTRO ═══ */}
      {/* Sólo el ícono y el nombre de cada cosa; tocándola se abre lo que hace
          (15/10/26). Antes eran seis tarjetas con su párrafo a la vista. */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="pd-reveal text-center mb-12">
            <p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Lo que trae cada producto</p>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-950 mb-4">
              No es un botón de pago.<br className="hidden sm:block" /> Es el embudo entero.
            </h2>
            <p className="text-gray-500 text-lg">Tocá cada una para ver qué hace.</p>
          </div>

          <div className="pd-reveal-uno grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 items-start">
            {ADENTRO.map((c) => {
              const abierto = abiertos.has(c.titulo);
              return (
                <button
                  key={c.titulo} type="button" onClick={() => alternar(c.titulo)} aria-expanded={abierto}
                  className={`text-left rounded-2xl border p-4 sm:p-5 transition-all ${abierto
                    ? "sm:col-span-2 lg:col-span-1 bg-white border-orange-200 shadow-xl shadow-orange-100/60"
                    : "bg-gray-50 border-transparent hover:bg-white hover:border-black/[0.06] hover:shadow-lg hover:-translate-y-0.5"}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${abierto ? "bg-orange-600 text-white" : "bg-white text-orange-600 shadow-sm"}`}>
                      <c.icon className="h-5 w-5" />
                    </span>
                    <span className="font-black text-gray-950 text-sm sm:text-base leading-tight flex-1">{c.titulo}</span>
                    {abierto ? <Minus className="h-4 w-4 text-orange-600 flex-shrink-0" /> : <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                  </span>
                  <AnimatePresence initial={false}>
                    {abierto && (
                      <motion.span
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="block overflow-hidden"
                      >
                        <span className="block pt-3 text-gray-500 text-sm leading-relaxed">{c.texto}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">Algunas dependen del plan, y está aclarado en cada una.</p>
        </div>
      </section>

      {/* ═══ LA PLATA ═══ */}
      <section className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(150deg,#fffbeb 0%,#fff7ed 50%,#fff1f2 100%)" }}>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div className="pd-reveal">
            <motion.p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-4">Tu plata</motion.p>
            <motion.h2 className="text-4xl lg:text-5xl font-black text-gray-950 mb-6 leading-tight">
              Cobrás vos.<br />Nosotros no tocamos nada.
            </motion.h2>
            <motion.p className="text-gray-600 text-lg leading-relaxed mb-8">
              Conectás tu cuenta de Mercado Pago y cada venta entra ahí, a tu nombre. La comisión se retiene adentro del mismo cobro: no hay que facturarte nada ni perseguir a nadie.
            </motion.p>
            <motion.div className="space-y-3">
              {[
                "La plata va derecho a tu cuenta, no a la nuestra",
                "Sin abono en el plan gratis: si no vendés, no pagás",
                "Cuanto más alto el plan, menos comisión",
              ].map((t) => (
                <div key={t} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700">{t}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Las comisiones, con el número subiendo */}
          <motion.div
            className="pd-reveal-uno bg-white rounded-3xl p-8 shadow-2xl shadow-orange-100/70 border border-black/[0.05]"
          >
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Comisión por venta</p>
            <div className="space-y-5">
              {TIERS_DIGITALES.map((t) => (
                <div key={t} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-gray-950">{COPY_DIGITAL[t].nombre}</p>
                    <p className="text-gray-400 text-sm">
                      {mensualDe(t) === null ? "Sin abono" : `${money(mensualDe(t)!)} por mes`}
                    </p>
                  </div>
                  <p className="text-3xl font-black text-orange-600 tabular-nums">
                    <Contador hasta={COMISION_DIGITAL[t]} sufijo="%" />
                  </p>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mt-6 pt-6 border-t border-gray-100">
              A eso se le suma lo que cobra Mercado Pago por procesar el pago, que es igual en todos los planes y no pasa por nosotros.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ PLANES (corto: el detalle vive en /precios) ═══ */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.div className="pd-reveal">
            <motion.p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Planes</motion.p>
            <motion.h2 className="text-4xl lg:text-5xl font-black text-gray-950 mb-4">
              Empezás gratis y subís cuando vendas.
            </motion.h2>
            <motion.p className="text-gray-500 text-lg mb-12 max-w-2xl mx-auto">
              Se diferencian por cuántos productos podés tener y por cuánta comisión pagás. Ninguno pide tarjeta para arrancar.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {TIERS_DIGITALES.map((t) => (
              <div key={t} className="pd-reveal-uno">
              <motion.div
                whileHover={{ y: -6 }}
                className={`h-full rounded-3xl p-7 border text-left transition-shadow hover:shadow-2xl ${
                  t === "STARTER"
                    ? "bg-gray-950 border-gray-950 text-white shadow-xl"
                    : "bg-white border-black/[0.07] shadow-sm"
                }`}
              >
                {t === "STARTER" && (
                  <span className="inline-flex items-center gap-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
                    <Zap className="h-3 w-3" /> El más elegido
                  </span>
                )}
                <p className={`font-black text-xl mb-1 ${t === "STARTER" ? "text-white" : "text-gray-950"}`}>{COPY_DIGITAL[t].nombre}</p>
                <p className={`text-3xl font-black mb-4 ${t === "STARTER" ? "text-white" : "text-gray-950"}`}>
                  {mensualDe(t) === null ? "Gratis" : money(mensualDe(t)!)}
                  {mensualDe(t) !== null && <span className="text-sm font-medium text-gray-400">/mes</span>}
                </p>
                <p className={`text-sm ${t === "STARTER" ? "text-gray-300" : "text-gray-500"}`}>
                  {COMISION_DIGITAL[t]}% de comisión por venta
                </p>
              </motion.div>
              </div>
            ))}
          </div>

          <Link href="/precios?ver=digitales" className="inline-flex items-center gap-2 text-orange-600 font-bold hover:text-orange-700 transition-colors">
            Ver todo lo que incluye cada plan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ═══ PREGUNTAS ═══ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            className="pd-reveal-uno text-4xl font-black text-gray-950 text-center mb-12"
          >
            Preguntas frecuentes
          </motion.h2>

          <div className="space-y-3">
            {PREGUNTAS.map((p, i) => {
              const abierto = abierta === i;
              return (
                <motion.div
                  key={p.q}
                  className="pd-reveal-uno bg-white rounded-2xl border border-black/[0.06] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setAbierta(abierto ? null : i)}
                    aria-expanded={abierto}
                    className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 hover:bg-gray-50/70 transition-colors"
                  >
                    <span className="font-bold text-gray-950">{p.q}</span>
                    {abierto
                      ? <Minus className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      : <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {abierto && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                      >
                        <p className="px-6 pb-5 text-gray-500 leading-relaxed">{p.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CIERRE ═══ */}
      <section className="pt-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 pd-grilla opacity-[0.15]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          className="pd-reveal-uno relative max-w-3xl mx-auto px-6 text-center"
        >
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-5 leading-tight">
            Tu primer producto puede<br className="hidden sm:block" /> estar publicado hoy.
          </h2>
          <p className="text-gray-400 text-lg mb-9">
            Sin tarjeta, sin abono y sin que tengas que saber nada de páginas web.
          </p>
          <Link
            href="/registro?plan=digital"
            className="inline-flex items-center gap-2 bg-white text-gray-950 px-8 py-4 rounded-2xl font-black hover:bg-gray-100 transition-colors"
          >
            Empezá gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* El mismo celular del principio, asomando desde abajo con una venta:
            la página cierra mostrando lo que promete. Se corta con el borde de
            la sección a propósito. */}
        <div className="pd-reveal-uno relative mx-auto mt-14 w-[240px] sm:w-[280px] h-[210px] sm:h-[240px]">
          <div className="absolute inset-x-0 top-0 h-[420px] rounded-t-[2.2rem] overflow-hidden border-[7px] border-b-0 border-gray-700 bg-white shadow-2xl shadow-orange-600/20">
            <Image src="/marketing/pagina-de-venta-ejemplo.png" alt="" fill sizes="280px" className="object-cover object-top" />
          </div>
          <div className="absolute -left-12 sm:-left-20 top-16 z-10 flex items-center gap-2.5 bg-white rounded-2xl px-4 py-3 shadow-xl shadow-black/30 -rotate-3">
            <div className="pd-latido w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-semibold leading-none mb-1">Venta aprobada</p>
              <p className="text-sm font-black text-gray-900 leading-none">$ 9.900</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
