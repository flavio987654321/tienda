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
    texto: "Tu PDF, de hasta 50 MB. Queda guardado en un lugar privado al que sólo llega quien pagó: el link de descarga se arma en el momento y vence.",
  },
  {
    icon: Wand2,
    titulo: "Se arma tu página de venta",
    texto: "Cada producto tiene la suya, con su propia dirección. La IA te escribe los textos y después los editás a mano — o, si ya tenés un diseño hecho, subís el tuyo y usás ese.",
  },
  {
    icon: CreditCard,
    titulo: "Cobrás y se entrega sola",
    texto: "La plata entra a tu cuenta de Mercado Pago. El archivo le llega al comprador apenas se aprueba el pago, sin que vos hagas nada.",
  },
];

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
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });

  /* ⚠️ El parallax también se apaga con "menos movimiento", y hay que apagarlo
     ACÁ: lo mueve framer-motion, así que el `@media (prefers-reduced-motion)`
     del `<style>` no lo toca —ese sólo alcanza a las animaciones CSS—. Un
     parallax es de lo que peor le cae a quien pidió menos movimiento. */
  const menosMovimiento = useReducedMotion();
  const celularY = useTransform(scrollYProgress, [0, 1], [0, menosMovimiento ? 0 : -90]);
  const celularEscala = useTransform(scrollYProgress, [0, 1], [1, menosMovimiento ? 1 : 0.94]);

  const [abierta, setAbierta] = useState<number | null>(0);

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
        }

        /* Quien pidió menos movimiento no recibe ninguno de estos efectos. */
        @media (prefers-reduced-motion: reduce) {
          .pd-texto-degrade, .pd-flota, .pd-cinta, .pd-latido { animation: none !important; }
          .pd-entra > *, .pd-reveal > *, .pd-reveal-uno { animation: none !important; }
        }
      `}</style>

      <SiteNav active="digitales" />

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative overflow-hidden pd-grilla bg-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] bg-orange-200/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -right-40 w-[520px] h-[520px] bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
          {/* La entrada de acá es CSS (`pd-entra`) y no framer-motion. Ver el
              comentario largo en el `<style>`: con variantes, este texto se
              quedaba invisible y el hero aparecía vacío. */}
          <div className="pd-entra">
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
              <Download className="h-3.5 w-3.5" /> Productos digitales
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-950 leading-[1.05] tracking-tight mb-6">
              Vendé lo que sabés,<br />
              <span className="pd-texto-degrade">sin tener una tienda.</span>
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
              Subís tu archivo y te queda una página de venta con su propia dirección. Cobrás con Mercado Pago y la entrega sale sola, apenas se aprueba el pago.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Link
                href="/registro?plan=digital"
                className="inline-flex items-center gap-2 bg-gray-950 text-white px-7 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
              >
                Empezá gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#como-funciona"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-7 py-4 rounded-2xl font-bold hover:border-gray-300 hover:text-gray-950 transition-colors"
              >
                Ver cómo funciona
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-gray-500">
              {["Sin tarjeta", "El plan gratis no vence", "Cobrás vos, a tu cuenta"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-orange-600" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* El celular, con parallax y las ventas entrando de a una */}
          <motion.div style={{ y: celularY, scale: celularEscala }} className="relative mx-auto w-[260px] sm:w-[300px]">
            <div className="pd-flota relative h-[450px] sm:h-[520px] rounded-[2.4rem] overflow-hidden border-[8px] border-gray-900 shadow-2xl shadow-orange-200/60 bg-white">
              <Image
                src="/marketing/pagina-de-venta-ejemplo.png"
                alt="Ejemplo de una página de venta de un producto digital"
                fill sizes="300px" priority
                className="object-cover object-top"
              />
            </div>

            {/* Las dos van en la MITAD DE ABAJO, sobre la tapa del ebook. Arriba
                —donde estaban— le tapaban el título y la bajada a la pantalla,
                que es justo lo que la captura tiene para mostrar.

                ⚠️ Y la inclinación va como PROP de motion, no en `style`:
                framer-motion arma su propio `transform` con lo que anima (x,
                scale) y al escribirlo pisa el del `style`, así que la tarjeta
                salía derecha. Puesta entre lo que anima, entra en el mismo
                transform y sobrevive. */}
            {[
              { monto: "$ 9.900", donde: "-right-14 bottom-40", retraso: 0.8, giro: 3 },
              { monto: "$ 14.500", donde: "-left-16 bottom-16", retraso: 1.5, giro: -3 },
            ].map((v) => (
              <motion.div
                key={v.monto}
                initial={{ opacity: 0, x: 30, scale: 0.9, rotate: v.giro }}
                animate={{ opacity: 1, x: 0, scale: 1, rotate: v.giro }}
                transition={{ duration: 0.5, delay: v.retraso }}
                className={`hidden sm:flex absolute ${v.donde} items-center gap-2.5 bg-white rounded-2xl px-4 py-3 shadow-xl shadow-gray-300/60 border border-black/5`}
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
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="pd-reveal text-center mb-14">
            <motion.p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Por dónde empezás</motion.p>
            <motion.h2 className="text-4xl lg:text-5xl font-black text-gray-950 mb-4">
              ¿Ya lo tenés hecho, o arrancás de cero?
            </motion.h2>
            <motion.p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Los dos caminos terminan en el mismo lugar: tu producto publicado y cobrando.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Upload,
                chapa: "Ya lo tengo",
                titulo: "Subilo y publicá hoy",
                texto: "Cargás el archivo, le ponés precio y ya tenés página de venta. Si querés, la IA te escribe los textos a partir de una descripción corta.",
                puntos: ["Tu PDF, hasta 50 MB", "La página se arma sola, con IA", "Lo editás todo a mano"],
              },
              {
                icon: Wand2,
                chapa: "Arranco de cero",
                titulo: "Que la IA te escriba el ebook",
                texto: "Le contás de qué se trata y a quién le hablás. Te propone el índice, lo aprobás, y escribe el PDF entero con su tapa. Viene con los planes Starter y Pro.",
                puntos: ["Vos aprobás el índice antes", "Sale en PDF con tapa", "Desde el plan Starter"],
              },
            ].map((c) => (
              /* El de afuera entra, el de adentro se levanta: ver el aviso en el
                 <style> sobre por que no pueden ser el mismo elemento. */
              <div key={c.chapa} className="pd-reveal-uno">
              <motion.div
                className="group relative h-full bg-white border border-black/[0.07] rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:shadow-orange-100 transition-shadow"
                whileHover={{ y: -6 }}
              >
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-orange-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <c.icon className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{c.chapa}</p>
                <h3 className="text-2xl font-black text-gray-950 mb-3">{c.titulo}</h3>
                <p className="text-gray-500 leading-relaxed mb-6">{c.texto}</p>
                <div className="space-y-2.5">
                  {c.puntos.map((p) => (
                    <div key={p} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700 text-sm">{p}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
              </div>
            ))}
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

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* La línea que une los pasos, dibujándose al entrar */}
            <motion.div
              style={{ transformOrigin: "left" }}
              className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-orange-300 via-orange-400 to-rose-300"
            />

            {PASOS.map((p, i) => (
              <motion.div
                key={p.titulo}
                className="pd-reveal-uno relative text-center md:text-left"
              >
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-white border border-black/[0.06] shadow-lg shadow-orange-100/70 flex items-center justify-center mb-5 mx-auto md:mx-0">
                  <p.icon className="h-7 w-7 text-orange-600" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-950 text-white text-[11px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-950 mb-2.5">{p.titulo}</h3>
                <p className="text-gray-500 leading-relaxed">{p.texto}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LA PÁGINA POR DENTRO ═══ */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="pd-reveal text-center mb-14">
            <motion.p className="text-orange-600 font-semibold text-sm uppercase tracking-widest mb-3">Lo que trae cada producto</motion.p>
            <motion.h2 className="text-4xl lg:text-5xl font-black text-gray-950 mb-4">
              No es un botón de pago.<br className="hidden sm:block" /> Es el embudo entero.
            </motion.h2>
            <motion.p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Viene armado y se prende desde el panel, producto por producto. Algunas cosas dependen del plan, y está aclarado en cada una.
            </motion.p>
          </motion.div>

          <motion.div className="pd-reveal grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ADENTRO.map((c) => (
              <div key={c.titulo}>
              <motion.div
                whileHover={{ y: -5 }}
                className="h-full bg-gray-50 hover:bg-white border border-transparent hover:border-black/[0.06] rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-gray-200/60"
              >
                <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-black text-gray-950 mb-2">{c.titulo}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{c.texto}</p>
              </motion.div>
              </div>
            ))}
          </motion.div>
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
      <section className="py-24 bg-gray-950 relative overflow-hidden">
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
      </section>

      <SiteFooter />
    </>
  );
}
