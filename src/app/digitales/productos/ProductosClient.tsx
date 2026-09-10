"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Plus, Gift, TrendingUp, BookOpen, Loader2, Pencil, Trash2, AlertTriangle, Image as ImageIcon,
  RotateCcw,
  Eye, EyeOff, X, ArrowUpRight, Upload, Sparkles, ExternalLink, LayoutTemplate, Globe,
  FileText, Download,
} from "lucide-react";
import { COPY_DIGITAL, esElPlanMasAlto, type TierDigital } from "@/lib/planes-digitales";
import {
  COPY_ROL, topeDe, loQueFalta, validarCampos, LARGO_TITULO, LARGO_DESCRIPCION,
  type RolDigital,
} from "@/lib/productos-digitales";
import { MAX_PDF_MB, avisoDePeso } from "@/lib/subida-digital";
import { subirPdfDigital } from "@/lib/subir-pdf-digital";
/* ⚠️ De `configuracion-digital` y NO de `direccion-digital`: aquel importa
   Prisma, y esto es una pantalla. */
import { dominioDeLaPlataforma } from "@/lib/configuracion-digital";
import type { EstadoDelCupo } from "@/lib/cupo-ia";
/* `import type` se borra al compilar: no arrastra prisma al navegador. */
import type { EstadoDelBorrador } from "@/lib/ebook-borrador";
import { COMO_SE_LLAMA } from "@/lib/ebook-opciones";
import { ESTILOS, QUE_ES_CADA_ESTILO, type EstiloDeEbook } from "@/lib/ebook-estilos";
import { MiniaturaDeEstilo } from "./MiniaturaDeEstilo";
/* La misma función con la que el servidor decide si hay texto para corregir. */
import { sePuedeEditarElTexto } from "@/lib/ebook-texto";
import EmbudoIA from "./EmbudoIA";
import FichaIA from "./FichaIA";
import EbookIA from "./EbookIA";
import CampoAuto from "@/components/CampoAuto";
/* El producto de ejemplo, para mirar la tarjeta terminada sin tener una. Se
   dibuja detrás de `NODE_ENV`, así que no viaja al build. */
import { PRODUCTO_DE_EJEMPLO } from "./ejemploDeTarjeta";

export type ProductoEnPantalla = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  rol: RolDigital;
  padreId: string | null;
  /** La portada. `null` mientras no se suba ninguna. */
  imagen: string | null;
  tieneArchivo: boolean;
  archivoNombre: string | null;
  archivoPeso: number | null;
  publicado: boolean;
  /** El ebook que le está escribiendo la IA, o `null` si nunca pidió uno. */
  ebook: EstadoDelBorrador | null;
  /**
   * Lo que contó para generarlo, tal cual lo escribió.
   *
   * ⚠️ La tarjeta no lo muestra: es para que el formulario de "rehacerlo"
   * arranque con lo que ya había contado en vez de en blanco. Ver `contado` en
   * `EbookIA`.
   */
  contado: { tema: string; publico: string } | null;
  /** Su dirección: `mecanica` de `mecanica.tiendaapps.com`. Sólo el principal. */
  slugDigital: string | null;
  /** El dominio que conectó, si conectó alguno. Viene con Pro. */
  dominioPropio: string | null;
};

function money(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

const ICONO: Record<RolDigital, React.ElementType> = {
  PRINCIPAL: BookOpen,
  BONO: Gift,
  UPSELL: TrendingUp,
};

/**
 * ⚠️ EL GRIS DE LAS PISTAS ES `gray-500`, NO `gray-400`.
 *
 * Esta pantalla usaba `text-gray-400` para todo lo secundario: el precio
 * tachado, el nombre del archivo, el aviso de los 50 MB, los "(opcional)" del
 * formulario. Sobre blanco eso da **2,85:1**, y el mínimo para texto chico es
 * 4,5:1. O sea que las pistas —justamente lo que explica qué hacer— eran lo
 * menos legible de la pantalla, y quien peor las lee es quien más las necesita.
 *
 * `gray-500` da 4,83:1. Y en el modo oscuro se invierte a `gray-400`, que sobre
 * el fondo oscuro pasa de 4,0:1 a 7,4:1: el par estaba mal en los dos modos.
 */
/**
 * El color de cada rol.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ TIENEN QUE SER TRES COLORES DISTINTOS, NO TRES NARANJAS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Eran naranja, ámbar y rosa. Los tres son cálidos y a la distancia de una
 * pantalla son el mismo color: la única forma de saber si estabas mirando un
 * bono o un upsell era leer el título de la sección. El color no estaba
 * haciendo su trabajo, sólo estaba ocupando lugar — y por eso la pantalla se
 * veía monótona por más que cada bloque tuviera "su" tinte.
 *
 * Ahora: **naranja el principal, violeta los bonos, celeste los upsells.**
 * Tres tonos que se distinguen de un vistazo, y ninguno se pisa con los dos
 * colores que ya tienen significado fijo en esta pantalla: el verde de
 * "Publicado" y "GRATIS", y el rojo de lo que falta.
 *
 * El naranja se queda en el principal porque es el color de la marca y el
 * principal es lo que se vende; los otros dos cuelgan de él.
 *
 * ⚠️ `texto` lleva su par oscuro. Antes era `text-orange-600` a secas, que
 * sobre el fondo oscuro del panel queda por debajo del contraste mínimo: el
 * sello del rol se leía mal justo en el modo donde más se nota.
 */
const TINTA: Record<RolDigital, { borde: string; fondo: string; texto: string; suave: string }> = {
  PRINCIPAL: {
    borde: "border-orange-200 panel-oscuro:border-orange-500/30",
    fondo: "bg-orange-100 panel-oscuro:bg-orange-500/15",
    texto: "text-orange-600 panel-oscuro:text-orange-300",
    suave: "bg-orange-50 panel-oscuro:bg-orange-500/10",
  },
  BONO: {
    borde: "border-violet-200 panel-oscuro:border-violet-500/30",
    fondo: "bg-violet-100 panel-oscuro:bg-violet-500/15",
    texto: "text-violet-600 panel-oscuro:text-violet-300",
    suave: "bg-violet-50 panel-oscuro:bg-violet-500/10",
  },
  UPSELL: {
    borde: "border-sky-200 panel-oscuro:border-sky-500/30",
    fondo: "bg-sky-100 panel-oscuro:bg-sky-500/15",
    texto: "text-sky-600 panel-oscuro:text-sky-300",
    suave: "bg-sky-50 panel-oscuro:bg-sky-500/10",
  },
};

type Borrador = {
  id: string | null;
  rol: RolDigital;
  padreId: string | null;
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  imagen: string | null;
};

function borradorNuevo(rol: RolDigital, padreId: string | null): Borrador {
  return { id: null, rol, padreId, name: "", description: "", price: "", comparePrice: "", imagen: null };
}

/** El tope real de `/api/upload`: lo pone la plataforma, no nosotros. */
const MAX_IMAGEN_MB = 4;

/* El dominio se calcula una vez y no por tarjeta: sale de una variable de
   entorno que no cambia mientras la pantalla está abierta. */
const DOMINIO = dominioDeLaPlataforma();

/**
 * Si el botón del EBOOK existe ya.
 *
 * Son dos botones distintos y cuestan cosas completamente distintas:
 *
 *   1. **Armar el embudo** — ✅ HECHO (04/09/26). Hace las tres fichas con
 *      título, descripción y precio. Son centavos: es texto corto. Va en los
 *      tres planes y no pasa por esta bandera — tiene su propio botón, arriba de
 *      la lista, y su propio cupo (ver `EmbudoIA` y `lib/cupo-ia`).
 *   2. **Escribir el ebook** — 🔲 el que sigue apagado. Hace el PDF de ESA
 *      ficha. Es el que gasta el cupo de `ebooksIA`, y por eso Free no lo tiene.
 *
 *      ⚠️ Acá decía *"Son US$2 a 4, o sea entre 150 y 300 veces más caro que el
 *      otro"*. **Medido el 07/09/26: US$0,22.** Un ebook de 8 capítulos y 4817
 *      palabras, en 9 llamadas a `claude-sonnet-5`. El techo con 10 capítulos
 *      es US$0,38. Sigue siendo la llamada cara de las dos —el embudo es texto
 *      corto— pero la distancia no es la que decía este comentario, y esa
 *      distancia no se volvió a medir: se saca el número inventado en vez de
 *      reemplazarlo por otro. Ver `planLimits`.
 *
 * ✅ Prendido el 04/09/26, con las tres rutas hechas y con la política de
 * privacidad de digitales declarando a Anthropic — que era el otro seguro que
 * tenía este interruptor, y saltó al prenderlo: los botones de IA ya mandaban
 * texto a un tercero y la solapa digital no lo nombraba.
 */
const IA_LISTA = true;

/**
 * Lo que la tarjeta y el grupo necesitan de la pantalla.
 *
 * Va como un objeto en vez de ocho props sueltas porque los dos componentes lo
 * pasan hacia abajo tal cual: con props sueltas, agregar una acción obliga a
 * tocar los tres lugares por los que viaja.
 */
type Acciones = {
  tier: TierDigital;
  /** Si la cuenta ya conectó Mercado Pago. Sin eso no se publica. */
  cobroConectado: boolean;
  trabajando: string | null;
  /** El id del producto cuyo archivo se está subiendo, o `null`. */
  subiendoArchivo: string | null;
  setBorrador: (b: Borrador) => void;
  publicar: (p: ProductoEnPantalla, publicado: boolean) => void;
  borrar: (p: ProductoEnPantalla) => void;
  subirArchivo: (p: ProductoEnPantalla, file: File) => void;
  abrirEbook: (p: ProductoEnPantalla) => void;
  /**
   * Volver a armar el PDF con lo que ya está escrito.
   *
   * ⚠️ NO llama al modelo y NO gasta ninguna generación: junta el texto que ya
   * está guardado, busca las fotos otra vez y dibuja. Existe como botón porque
   * un ebook puede haber salido sin fotos —el banco al tope en el momento de
   * armarlo— y ése es el arreglo, pero nadie iba a adivinarlo.
   */
  /**
   * Rehacer el PDF con lo que ya está escrito. No llama al modelo.
   *
   * Con `estilo`, además cambia cómo está armada la hoja: se guarda primero y
   * el archivo se dibuja con el molde nuevo. Ver `conEstilo`.
   */
  rehacerPDF: (p: ProductoEnPantalla, estilo?: EstiloDeEbook) => void;
  /**
   * `true` en la tarjeta de ejemplo, donde las acciones no hacen nada.
   *
   * ⚠️ No es prolijidad: sin esto los botones del ejemplo se ven iguales a los
   * de verdad, se aprietan, y **no pasa nada**. Quien lo probó pensó que estaba
   * roto, y tenía razón en pensarlo — un botón que se puede apretar promete que
   * hace algo. Con la bandera quedan apagados y dicen por qué.
   */
  deMentira?: boolean;
  /** Pedirle a la IA UN bono o UN upsell para un principal que ya existe. */
  pedirFicha: (padre: ProductoEnPantalla, rol: "BONO" | "UPSELL") => void;
  hijosDe: (padreId: string, rol: RolDigital) => ProductoEnPantalla[];
};

/* ⚠️ Tarjeta y Grupo viven ACÁ AFUERA y no adentro de la pantalla.
 *
 * Un componente definido adentro del cuerpo de otro se vuelve a crear en cada
 * dibujo, así que React lo trata como un componente distinto: desmonta y vuelve
 * a montar todo lo que hay abajo en cada tecla que se escribe en el formulario.
 * Acá adentro hay un `<img>` por tarjeta, y eso se ve como un parpadeo de todas
 * las portadas mientras escribís. Mismo motivo que en `configuracion/piezas.tsx`. */

/**
 * El nombre de un grupo de botones.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ OCHO BOTONES SEGUIDOS NO SON UNA TARJETA, SON UNA BOTONERA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Estaban todos en la misma fila gris: reemplazar el archivo, escribirlo con
 * IA, cambiar el precio, publicar, borrar, editar la página, la dirección y ver
 * cómo quedó. Ocho cosas de TRES temas distintos, con el mismo tamaño y el
 * mismo color, y ninguna decía a qué parte del producto le pegaba. "Borrar"
 * quedaba a la misma altura visual que "Editar".
 *
 * Con tres renglones que los nombran —el archivo, el producto, su página— cada
 * botón se lee adentro de algo. Es lo mismo que se hizo adentro del editor del
 * texto: lo que ordena no es achicar los botones, es decir de qué son.
 */
/**
 * Un enlace de la tarjeta que, en el ejemplo, no lleva a ningún lado.
 *
 * ⚠️ En el ejemplo el producto no existe, así que estos enlaces terminarían en
 * un 404. Se dibujan igual —el ejemplo está para ver la tarjeta entera— pero
 * apagados y diciendo por qué. Un enlace que se puede apretar promete que va a
 * algún lado.
 */
function Enlace({
  href, externo = false, apagado, motivo, className, children,
}: {
  href: string;
  externo?: boolean;
  apagado?: boolean;
  motivo?: string;
  className: string;
  children: React.ReactNode;
}) {
  if (apagado) {
    return (
      <span title={motivo} className={`${className} cursor-not-allowed opacity-50`}>
        {children}
      </span>
    );
  }
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return <Link href={href} className={className}>{children}</Link>;
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
      {children}
    </p>
  );
}

/* ── Una tarjeta, igual para los tres roles ──────────────────────────────── */
function Tarjeta({ p, acc }: { p: ProductoEnPantalla; acc: Acciones }) {
  const Icono = ICONO[p.rol];
  const tinta = TINTA[p.rol];
  const falta = loQueFalta({
    rolDigital: p.rol,
    archivoPath: p.tieneArchivo ? "hay" : null,
    price: p.price,
    name: p.name,
    cobroConectado: acc.cobroConectado,
  });
  const ocupado = acc.trabajando === p.id;
  /* En el ejemplo todo está apagado menos "Editar el contenido", que es lo
     único que abre algo de verdad. */
  const apagado = ocupado || !!acc.deMentira;
  const porQueApagado = acc.deMentira
    ? "Es un ejemplo: este botón no hace nada. El que anda es «Editar el contenido»."
    : undefined;
  const subiendoEste = acc.subiendoArchivo === p.id;
  /* La MISMA regla que usa el servidor al confirmar. Si el aviso cambia, cambia
     en los dos lados a la vez. */
  const avisoPeso = p.archivoPeso ? avisoDePeso(p.archivoPeso) : null;

  return (
    /* La sombra crece al pasar el mouse. Es lo único que se mueve en la tarjeta
       —nada de agrandarla ni levantarla— porque adentro hay ocho blancos que se
       apuntan con el mouse: una tarjeta que se mueve corre el botón al que
       estabas yendo. `motion-reduce` la apaga para quien pidió menos animación
       en su sistema. */
    <div
      className={`rounded-2xl border ${tinta.borde} bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none`}
    >
      <div className="flex gap-4">
        {/* La portada si la hay; si no, el ícono del rol. Un cuadro vacío en su
            lugar se lee como que la imagen se rompió.

            ⚠️ Y CON LA PALABRA DEL ROL ADENTRO. Antes era un cuadradito de
            56 px con un ícono, y los tres roles se distinguían sólo por el tono
            del ícono —naranja, ámbar, rosa—, que son tres naranjas. En una
            pantalla con un producto, dos bonos y tres upsells, no se leía cuál
            era cuál sin buscar el título de la sección más arriba. El borde
            punteado dice además que ahí FALTA una portada, que es cierto. */}
        {p.imagen ? (
          /* ⚠️ CON PORTADA TAMBIÉN LLEVA EL SELLO, encima de la imagen.
             Estaba sólo en la rama sin portada, así que la etiqueta del rol
             desaparecía justo en el producto PRINCIPAL —que es el único que
             suele tener portada— y quedaba la tarjeta más importante siendo la
             única que no se identifica. Se ve en el panel: el bono dice "BONO"
             y el principal no decía nada. */
          <div className="relative w-16 h-16 sm:w-24 sm:h-24 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imagen}
              alt=""
              className="w-full h-full rounded-2xl object-cover border border-gray-100 panel-oscuro:border-gray-800"
            />
            <span
              className={`absolute inset-x-1 bottom-1 rounded-lg ${tinta.fondo} ${tinta.texto} py-0.5 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wide`}
            >
              {COPY_ROL[p.rol].corto}
            </span>
          </div>
        ) : (
          <div
            className={`w-16 h-16 sm:w-24 sm:h-24 shrink-0 rounded-2xl border-2 border-dashed ${tinta.borde} ${tinta.suave} flex flex-col items-center justify-center gap-1`}
          >
            <Icono className={`h-5 w-5 sm:h-7 sm:w-7 ${tinta.texto}`} />
            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${tinta.texto}`}>
              {COPY_ROL[p.rol].corto}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold text-gray-900 panel-oscuro:text-gray-100 leading-snug break-words">{p.name}</p>
            <span
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                p.publicado
                  ? "bg-emerald-50 panel-oscuro:bg-emerald-500/10 text-emerald-700 panel-oscuro:text-emerald-300 border-emerald-200 panel-oscuro:border-emerald-500/30"
                  : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400 border-gray-200 panel-oscuro:border-gray-700"
              }`}
            >
              {p.publicado ? "Publicado" : "Borrador"}
            </span>
          </div>

          {/* ⚠️ `max-w-prose`: la descripción NO se estira hasta el borde.
              Un renglón se lee cómodo hasta unos 75 caracteres; sin tope, a 896
              px son más de 120 y el ojo se pierde al volver al principio del
              renglón siguiente. Es lo que hacía que la tarjeta se viera tirada
              a lo ancho cuando se ensanchó la pantalla. */}
          {p.description && (
            <p className="mt-1 max-w-prose text-sm text-gray-500 panel-oscuro:text-gray-400 line-clamp-2 break-words">
              {p.description}
            </p>
          )}

          <div className="flex items-baseline gap-2 mt-2">
            {p.rol === "BONO" ? (
              <span className="text-emerald-600 font-black">GRATIS</span>
            ) : (
              <span className="text-gray-900 panel-oscuro:text-gray-100 font-black">{money(p.price)}</span>
            )}
            {p.comparePrice !== null && p.comparePrice > 0 && (
              <span className="text-sm text-gray-500 panel-oscuro:text-gray-400 line-through">{money(p.comparePrice)}</span>
            )}
          </div>

          {/* El aviso va ACÁ adentro y no en un panel de errores aparte: el
              lugar donde se ve el problema tiene que ser el lugar donde se
              arregla. */}
          {falta && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 border border-red-100 panel-oscuro:border-red-500/25 px-3 py-2">
              <AlertTriangle aria-hidden className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              {/* El `id` lo usa el botón de publicar con `aria-describedby`: el
                  motivo por el que está apagado tiene que llegarle también a
                  quien no ve la franja roja. Ver ese botón más abajo. */}
              <p id={`falta-${p.id}`} className="text-xs text-red-700 panel-oscuro:text-red-300 font-medium">
                {falta}
              </p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              EL ARCHIVO, QUE ES LO QUE SE ENTREGA
              ══════════════════════════════════════════════════════════════════

              ⚠️ Acá había UN RENGLÓN DE TEXTO: "Archivo: guia.pdf · 2,1 MB". Se
              podía leer el nombre y nada más. O sea que cuando la IA terminaba
              de escribir un ebook —lo que acaba de costar una generación— el
              resultado aparecía como una línea gris entre otras, sin forma de
              abrirlo. **La única manera de ver el propio ebook era comprárselo.**
              Y la ventana, encima, pide "leelo antes de publicarlo".

              Ahora es una caja con las dos cosas que se hacen con un archivo:
              bajarlo y corregirlo. Es el único bloque de la tarjeta que aparece
              sólo cuando hay algo para entregar, y por eso se distingue del
              resto: es el estado que la persona está persiguiendo. */}
          <Rotulo>El archivo que se entrega</Rotulo>

          {p.tieneArchivo && (
            <div className="rounded-xl border border-gray-200 panel-oscuro:border-gray-700 bg-gray-50 panel-oscuro:bg-gray-800/40 px-3 py-2.5">
              <div className="flex items-start gap-2.5">
                <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 panel-oscuro:text-gray-500" />
                <div className="min-w-0 flex-1">
                  {/* `break-words` y no `truncate`: un nombre de archivo cortado
                      en "Guia definitiva de pa…" no identifica cuál es. */}
                  <p className="text-xs font-bold text-gray-800 panel-oscuro:text-gray-200 break-words">
                    {p.archivoNombre ?? "El archivo del producto"}
                  </p>
                  <p className="text-[11px] text-gray-500 panel-oscuro:text-gray-400">
                    {p.archivoPeso
                      ? `${Math.round(p.archivoPeso / 1024 / 1024 * 10) / 10} MB · `
                      : ""}
                    {/* De dónde salió. Importa porque explica por qué al lado
                        hay —o no hay— un botón para corregirlo. */}
                    {p.ebook && p.ebook.estado === "LISTO"
                      ? "Lo escribió la IA"
                      : "Lo subiste vos"}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                {/* ⚠️ Un `<a>` común y no un `<Link>`: esto no navega a una
                    pantalla nuestra, se va a un enlace firmado de Supabase que
                    baja el archivo. Con el router de Next quedaría a mitad de
                    camino. `rel` porque abre en otra pestaña. */}
                {/* En el ejemplo el archivo no existe, así que bajarlo daría un
                    error. Un botón apagado que dice por qué es mejor que uno
                    que lleva a una pantalla rota. */}
                {acc.deMentira ? (
                  <span
                    title={porQueApagado}
                    className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-3 py-2 text-xs font-bold text-gray-400 panel-oscuro:text-gray-600 opacity-60"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </span>
                ) : (
                  <a
                    href={`/api/digitales/productos/${p.id}/archivo`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-3 py-2 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-white panel-oscuro:hover:bg-gray-800 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </a>
                )}

                {/* Sólo si hay algo de la IA para corregir. Un PDF que subió la
                    persona no se puede editar acá: no tenemos su contenido, sólo
                    el archivo. La regla la decide la misma función que el
                    servidor.

                    ⚠️ Acá también decía `formato !== "recetario"`, porque un
                    recetario son campos y el editor dibujaba párrafos. Desde el
                    09/09/26 tiene el suyo: arreglar una cantidad ya no cuesta una
                    generación entera. Ver `RecetarioTexto`. */}
                {p.ebook
                  && p.ebook.escritos > 0
                  && sePuedeEditarElTexto(p.ebook.estado) && (
                  <Link
                    href={`/digitales/productos/${p.id}/ebook`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 px-3 py-2 text-xs font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/10 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar el contenido
                  </Link>
                )}
              </div>

              {/* ══════════════════════════════════════════════════════════════
                  CAMBIAR CÓMO ESTÁ ARMADA LA HOJA, CON EL EBOOK YA ESCRITO
                  ══════════════════════════════════════════════════════════════

                  ⚠️ Está acá, en la tarjeta, y no adentro del modal de generar,
                  porque **es acá donde se puede juzgar**: el modal lo pregunta
                  antes de que exista una sola palabra, y cuatro miniaturas
                  vacías no dicen cómo va a quedar tu texto. Con el ebook
                  escrito, apretar una y bajar el PDF contesta la pregunta de
                  verdad.

                  Y es gratis, dicho con esas palabras: el estilo no toca el
                  texto, así que rehacer el archivo no llama al modelo ni gasta
                  una generación. Sin el "es gratis" nadie prueba, por miedo a
                  que se le vaya un ebook del cupo. Ver `ebook-estilos`. */}
              {p.ebook && p.ebook.escritos > 0 && (() => {
                /* ⚠️ Adentro de un recetario no hay párrafos: la miniatura
                   dibuja una receta y los textos hablan de la receta —dónde va
                   la foto, dónde van rinde, tiempo y cocción—, no de columnas
                   ni de subtítulos. Ver `MiniaturaDeEstilo`. */
                const esUnRecetario = p.ebook.opciones.formato === "recetario";
                return (
                <div className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 panel-oscuro:text-gray-400">
                    {esUnRecetario ? "Cómo está armada cada receta" : "Cómo está armada la hoja"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500 panel-oscuro:text-gray-400">
                    {esUnRecetario
                      ? "Cambia dónde va la foto y dónde van rinde, tiempo y cocción. Rehace el PDF con las recetas que ya están escritas. Es gratis."
                      : "Cambiarlo rehace el PDF con lo que ya está escrito. Es gratis."}
                  </p>
                  <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:max-w-[280px]">
                    {ESTILOS.map((x) => {
                      const puesto = (p.ebook?.opciones.estilo ?? "libro") === x;
                      return (
                        <button
                          key={x}
                          type="button"
                          onClick={() => !acc.deMentira && !puesto && acc.rehacerPDF(p, x)}
                          disabled={ocupado || acc.deMentira || puesto}
                          title={acc.deMentira ? porQueApagado : (esUnRecetario ? QUE_ES_CADA_ESTILO[x].receta : QUE_ES_CADA_ESTILO[x].explica)}
                          aria-pressed={puesto}
                          className={`rounded-lg border p-1 text-left transition-colors disabled:cursor-not-allowed ${
                            puesto
                              ? "border-orange-400 bg-orange-50 panel-oscuro:bg-orange-500/10"
                              : "border-gray-200 panel-oscuro:border-gray-700 hover:bg-white panel-oscuro:hover:bg-gray-800 disabled:opacity-50"
                          }`}
                        >
                          <span className="block overflow-hidden rounded ring-1 ring-black/10 panel-oscuro:ring-white/10">
                            <MiniaturaDeEstilo
                              estilo={x}
                              muestra={esUnRecetario ? "receta" : "hoja"}
                              acento="#c2410c"
                              tinta="#0f172a"
                              papel="#FCFAF7"
                            />
                          </span>
                          <span className="mt-1 block text-center text-[10.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                            {QUE_ES_CADA_ESTILO[x].nombre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {/* ══════════════════════════════════════════════════════════════
                  ⚠️ "SALIÓ SIN FOTOS", DICHO — Y CON EL BOTÓN QUE LO ARREGLA
                  ══════════════════════════════════════════════════════════════

                  El banco de imágenes tiene UN tope para toda la plataforma. Si
                  justo cuando se armaba este archivo estaba lleno, el PDF salió
                  con bloques de color donde iban las fotos. Se arma igual a
                  propósito —un ebook sin fotos se puede vender, uno que no se
                  arma es plata cobrada sin nada que entregar— pero hasta hoy
                  **nadie lo decía**: el armado suele terminar con la pestaña
                  cerrada, así que la persona volvía, veía "listo", y creía que
                  ése era el diseño de su producto.

                  Y el arreglo es gratis: rehacer el PDF no llama al modelo y no
                  gasta ninguna generación. El tope se libera por hora.
                  Ver `leerAvisoDeFotos`. */}
              {p.ebook?.fotosAlTope && (
                <div className="mt-2.5 rounded-lg border border-amber-200 panel-oscuro:border-amber-500/25 bg-amber-50 panel-oscuro:bg-amber-500/10 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
                    <strong>Este PDF salió sin fotos.</strong> El banco de imágenes estaba al tope
                    justo cuando se armó, así que quedaron bloques de color en su lugar. No es tu
                    texto ni tu configuración.
                  </p>
                  <button
                    onClick={() => acc.rehacerPDF(p)}
                    disabled={ocupado}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 panel-oscuro:border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-900 panel-oscuro:text-amber-200 hover:bg-amber-100 panel-oscuro:hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                  >
                    {ocupado
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RotateCcw className="h-3.5 w-3.5" />}
                    {ocupado ? "Rehaciendo…" : "Rehacer el PDF (es gratis)"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ⚠️ El aviso del peso vive ACÁ, calculado del peso guardado, y no en
              un cartel que aparece al terminar de subir.
              Estaba puesto con `setError` justo antes del `reload`, así que se
              perdía siempre: nadie lo vio nunca. Acá se ve cada vez que mira el
              producto, que además es cuando sirve — el archivo pesado no molesta
              el día que se sube, molesta en cada venta. */}
          {avisoPeso && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700 panel-oscuro:text-amber-400">
              {avisoPeso}
            </p>
          )}

          {/* Un ebook a medio escribir se dice en la tarjeta y no adentro de la
              ventana: si hay que abrir algo para enterarse de que quedó por la
              mitad, nadie se entera. */}
          {/* ⚠️ Y con el nombre que corresponde: un recetario no tiene
              capítulos, y decía "4 de 10 capítulos". Ver `COMO_SE_LLAMA`. */}
          {p.ebook && p.ebook.estado !== "LISTO" && (
            <p className="mt-2 text-[11px] font-bold text-orange-700 panel-oscuro:text-orange-300">
              {COMO_SE_LLAMA[p.ebook.opciones.formato].obra} a medio escribir:{" "}
              {p.ebook.escritos} de {p.ebook.total} {COMO_SE_LLAMA[p.ebook.opciones.formato].partes}.
              {" "}Abrilo para seguir.
            </p>
          )}

          {/* ⚠️ El aviso del peso va ANTES de elegir el archivo, no después.
              La competencia abre el explorador directo y no dice el límite hasta
              que ya elegiste: con el caso real que tenemos anotado —una guía de
              46 páginas de 117 MB— eso es esperar la subida entera para que
              falle. Y no dice "máximo 50 MB", que no le indica a nadie qué
              hacer, sino la instrucción que resuelve el problema. */}
          {!p.tieneArchivo && (
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
              PDF de hasta {MAX_PDF_MB} MB. Si te pasás, exportalo en calidad para pantalla.
            </p>
          )}

          {/* ── Los botones, en dos grupos y no en una pila ─────────────────
              ⚠️ Eran OCHO, todos con el mismo peso, partidos en dos filas por
              el `flex-wrap`. "Borrar" quedaba a la misma altura visual que
              "Editar", y ninguno decía cuál era el que había que apretar ahora.

              Ahora se leen tres cosas distintas:
                · EL CONTENIDO — de dónde sale el archivo que se entrega.
                · LA FICHA — título, precio, publicar, borrar. A la derecha.
                · EL SITIO — su propia página y su dirección. Renglón aparte,
                  abajo, y sólo en el principal (ver más abajo).

              El separador de la derecha es `ml-auto` en pantalla ancha y un
              salto de línea en 360: dos grupos apretados uno contra otro en un
              celular se leen como una sola pila, que es de donde venimos. */}
          {/* ══════════════════════════════════════════════════════════════════
              ⚠️ EN 360 ES UNA GRILLA DE DOS COLUMNAS, NO UNA FILA QUE ENVUELVE.
              ══════════════════════════════════════════════════════════════════

              Con `flex-wrap` a secas, en un celular cada botón mide lo que mide
              su texto y entra donde entra: "Subir PDF" y "Escribir con IA" no
              entran juntos, "Editar" y "Publicar" sí, "Borrar" queda solo. El
              resultado son siete botones de siete anchos distintos en una
              columna despareja, que es lo que se vio en pantalla el 08/09/26.

              Con la grilla son dos por renglón, todos del mismo ancho, y de paso
              el área para tocar se agranda —que en un teléfono importa más que
              en cualquier otro lado—.

              De `sm` para arriba vuelve a ser la fila de siempre: ahí el ancho
              sobra y la grilla desperdiciaría media pantalla estirando botones
              de dos palabras. */}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {/* La etiqueta ES el botón: un `<input type="file">` no se puede
                disfrazar, así que se esconde y se lo dispara desde acá.

                ══════════════════════════════════════════════════════════════
                ⚠️ SE ESCONDE CON `sr-only`, NUNCA CON `hidden`
                ══════════════════════════════════════════════════════════════

                `hidden` es `display: none`, y un elemento así **no recibe
                foco**. Un `<label>` tampoco está en el orden de tabulación. O
                sea que con `hidden` este botón era INALCANZABLE CON EL TECLADO:
                quien no usa mouse no podía subir el archivo — el paso
                obligatorio para poder vender, y el único que no tiene otro
                camino en el plan Free.

                `sr-only` lo saca de la vista pero lo deja enfocable, así que
                se llega tabulando y se abre con Enter. Y como el foco queda en
                el input invisible, el anillo lo dibuja el label con
                `focus-within`: sin eso se tabula a un botón que no se ve.

                ══════════════════════════════════════════════════════════════
                ⚠️ Y EL LABEL VA `relative`. ES LA OTRA MITAD DE `sr-only`.
                ══════════════════════════════════════════════════════════════

                `sr-only` incluye `position: absolute`. Un absoluto se ubica
                contra **el ancestro posicionado más cercano**, y si no hay
                ninguno, contra el documento entero. Sin `relative` acá, este
                input quedaba colgado del DOCUMENTO en vez de del botón: no se
                movía con el scroll del `<main>`, y su posición —la de la última
                tarjeta de la lista— caía miles de píxeles por debajo de la
                ventana.

                Eso hacía dos cosas. El documento pasaba a tener ese sobrante
                para scrollear, que no debería existir nunca adentro del panel.
                Y al apretar el botón —que le da el foco al input— el navegador
                scrolleaba el documento para "mostrarlo": el armazón, que mide
                una ventana justa, se iba para arriba y abajo aparecía la franja.

                ⚠️ POR ESO PASABA SÓLO EN LAS TARJETAS DE ABAJO: cuanto más
                abajo la tarjeta, más lejos caía su input y más se scrolleaba.
                En la primera no se notaba nada.

                Se persiguió tres veces por el lado equivocado —el fondo del
                body, el `shrink-0`, el `overflow` del documento— porque el
                síntoma era la franja. La causa era esta línea, que faltaba.

                Con `relative`, el input vive adentro del botón y se acabó. */}
            <label
              aria-busy={subiendoEste}
              title={porQueApagado}
              className={`relative inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 panel-oscuro:focus-within:ring-offset-gray-900 ${
                subiendoEste || apagado
                  ? "opacity-50 cursor-not-allowed border border-gray-200 panel-oscuro:border-gray-700 text-gray-500"
                  : p.tieneArchivo
                    ? "cursor-pointer border border-gray-200 panel-oscuro:border-gray-700 text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                    : "cursor-pointer bg-orange-600 text-white hover:bg-orange-500"
              }`}
            >
              {subiendoEste ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {subiendoEste ? "Subiendo…" : p.tieneArchivo ? "Reemplazar PDF" : "Subir PDF"}
              <input
                type="file"
                accept="application/pdf"
                /* Ver el porqué largo arriba: `sr-only` y NO `hidden`. */
                className="sr-only"
                disabled={subiendoEste || apagado}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  /* Se limpia el input para que elegir el MISMO archivo dos
                     veces seguidas vuelva a disparar el `onChange`: si el valor
                     no cambia, el navegador no avisa nada. */
                  e.target.value = "";
                  if (file) acc.subirArchivo(p, file);
                }}
              />
            </label>

            {/* ⚠️ El segundo botón de IA. Ver `IA_LISTA`.
                Se dibuja SIEMPRE, aunque el plan no lo tenga, porque el hueco al
                lado de "Subir PDF" dice algo que el botón solo no dice: **el
                archivo tiene dos caminos, no uno**. Y en Free apagado no es un
                bug: es el plan, y para siempre. Lo dice el cartel al pasar el
                mouse, no hay que adivinarlo. */}
            <button
              type="button"
              onClick={() => acc.abrirEbook(p)}
              disabled={!IA_LISTA || acc.tier === "FREE" || apagado || subiendoEste}
              title={
                porQueApagado
                ?? (acc.tier === "FREE"
                  ? "Escribir el ebook con IA viene desde el plan Starter. En el gratis el PDF lo subís vos."
                  : !IA_LISTA
                    ? "Todavía no está listo."
                    : p.ebook?.estado === "LISTO"
                      ? "Lo escribe de nuevo desde cero con IA. Antes de hacer nada te dice qué se pierde."
                      : undefined)
              }
              className={
                IA_LISTA && acc.tier !== "FREE"
                  ? "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 text-xs font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/10 transition-colors disabled:opacity-50"
                  : "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 text-xs font-bold text-gray-500 panel-oscuro:text-gray-400 cursor-not-allowed"
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {/* El rótulo dice en qué estado está, así no hay que abrir la
                  ventana para saber si quedó a medio escribir.

                  ⚠️ Y DICE QUÉ ESCRIBE. Decía "Escribir con IA" a secas: el
                  verbo y el método, sin la cosa. Al lado de "Subir PDF" —que sí
                  nombra lo que sube— se leía como el botón de escribir
                  *cualquier cosa*, y en la tarjeta de un bono ni siquiera se
                  entendía que lo que escribe es el archivo que ese bono entrega.
                  Es el mismo arreglo que se le hizo a "A mano" el 08/09/26.

                  El nombre sale de `COMO_SE_LLAMA` y no está escrito acá: quien
                  eligió recetario tiene que leer "recetario", no "ebook". Sin
                  ebook empezado todavía no hay formato elegido, así que se dice
                  "el ebook", que es lo que ofrece la ventana al abrirse. */}
              {/* ⚠️ Y DICE UNA ACCIÓN, SIEMPRE. Con el ebook terminado decía
                  "Ebook escrito", que no es lo que el botón hace: es en qué
                  estado está. Se apretaba esperando algo, se abría una ventana
                  que ofrece rehacerlo, y no había forma de saberlo desde el
                  rótulo. Un botón que describe un estado se lee como un cartel
                  y se aprieta como un botón. */}
              {!p.ebook
                ? "Escribir el ebook"
                : p.ebook.estado === "LISTO"
                  ? `Escribirlo de nuevo`
                  : `Seguir el ${COMO_SE_LLAMA[p.ebook.opciones.formato].obra.toLowerCase()} (${p.ebook.escritos} de ${p.ebook.total})`}
            </button>

          </div>

          {/* ── El producto: su ficha ─────────────────────────────────────
              Título, precio, publicar y borrar. Estaban en la misma fila que el
              archivo, así que "Borrar" quedaba al lado de "Reemplazar PDF" como
              si fueran dos formas de hacer lo mismo. */}
          <Rotulo>El producto</Rotulo>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              onClick={() =>
                acc.setBorrador({
                  id: p.id,
                  rol: p.rol,
                  padreId: p.padreId,
                  name: p.name,
                  description: p.description ?? "",
                  imagen: p.imagen,
                  price: p.price ? String(p.price) : "",
                  comparePrice: p.comparePrice ? String(p.comparePrice) : "",
                })
              }
              disabled={apagado}
              title={porQueApagado}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {/* ⚠️ Decía "Editar" a secas, y era el TERCER botón con esa
                  palabra en la misma tarjeta: estaban también "Editar el
                  contenido" —el texto del ebook— y "Editar la página" —la
                  página de venta—. Tres editar, tres cosas distintas, y el más
                  corto era el más ambiguo. Éste abre el título y el precio, así
                  que eso dice. */}
              <Pencil className="h-3.5 w-3.5" /> Precio y título
            </button>

            <button
              onClick={() => acc.publicar(p, !p.publicado)}
              disabled={apagado || (!p.publicado && falta !== null)}
              title={porQueApagado ?? (!p.publicado && falta ? falta : undefined)}
              /* ⚠️ El `title` NO alcanza: no existe al tocar en un celular y un
                 lector de pantalla no siempre lo anuncia. Con esto, el motivo
                 —la misma franja roja de arriba— se lee junto con el nombre del
                 botón, así que "Publicar, apagado" pasa a ser "Publicar, falta
                 el archivo". Sin él, el botón está gris y no se sabe por qué. */
              aria-describedby={!p.publicado && falta ? `falta-${p.id}` : undefined}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ocupado ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : p.publicado ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {p.publicado ? "Despublicar" : "Publicar"}
            </button>

            <button
              onClick={() => acc.borrar(p)}
              disabled={apagado}
              title={porQueApagado}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 panel-oscuro:hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Borrar
            </button>
          </div>

          {/* ── El sitio del producto: renglón propio ────────────────────────
              Sólo el principal tiene página de venta: los bonos y los upsells
              viajan adentro de la de él, no tienen una propia.

              ⚠️ VA EN SU PROPIO RENGLÓN, separado por una línea, y no mezclado
              con los otros seis botones. No es una acción más sobre la ficha:
              es **el sitio del producto**, que es lo que nos separa de la
              competencia —cada producto es su propio dominio— y ahí arriba
              quedaba como el quinto botón gris de una fila de ocho.

              ⚠️ La dirección `/p/<id>` es PROVISORIA — la definitiva es un
              subdominio por producto (Fase 5 bis). Y se abre en otra pestaña
              porque sale del panel: es la página pública, no una previa. */}
          {p.rol === "PRINCIPAL" && (
            <>
              <Rotulo>Su página</Rotulo>

              {/* ⚠️ LA DIRECCIÓN VIVE ACÁ, en el grupo de la página, y no suelta
                  arriba entre el precio y los botones. Es la dirección DE esta
                  página: leerla al lado de "Editar la página" y "Ver cómo quedó"
                  dice qué es; arriba, entre el archivo y el precio, era un
                  renglón gris del que no se sabía a qué correspondía.

                  Se muestra en la tarjeta y no sólo adentro de su pantalla
                  porque es lo que la persona copia y pega, así que tiene que
                  estar donde ya está mirando. `break-all` porque una dirección
                  larga en 360 empujaba la tarjeta entera.

                  ⚠️ Y se muestran LAS DOS cuando hay dos: el dominio propio se
                  suma, no reemplaza, y la de tiendaapps sigue andando. Mostrar
                  sólo la de arriba haría pensar que la otra se apagó. */}
              {(p.dominioPropio || p.slugDigital) && (
                <div className="space-y-0.5">
                  {p.dominioPropio && (
                    <p className="text-[11.5px] font-bold text-gray-700 panel-oscuro:text-gray-300 break-all">
                      {p.dominioPropio}
                    </p>
                  )}
                  {p.slugDigital && (
                    <p className="text-[11.5px] font-semibold text-gray-500 panel-oscuro:text-gray-400 break-all">
                      {p.slugDigital}.{DOMINIO}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Enlace
                  href={`/digitales/productos/${p.id}/pagina`}
                  apagado={acc.deMentira}
                  motivo={porQueApagado}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" /> Editar la página
                </Enlace>
                <Enlace
                  href={`/digitales/productos/${p.id}/direccion`}
                  apagado={acc.deMentira}
                  motivo={porQueApagado}
                  className={
                    /* Sin dirección el botón se destaca: es lo que falta para
                       poder repartir el producto, y en una fila de botones
                       grises no lo vería nadie. */
                    p.slugDigital
                      ? "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                      : "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 text-xs font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/10 transition-colors"
                  }
                >
                  <Globe className="h-3.5 w-3.5" />
                  {/* ⚠️ LOS TRES BOTONES DE ESTE RENGLÓN DECÍAN CASI LO MISMO.
                      Eran "Página de venta", "Elegí tu dirección" y "Ver
                      página": dos de los tres nombraban *la página*, y ninguno
                      decía qué le hace. Uno abre el editor, el otro abre la
                      página publicada en otra pestaña — y desde el rótulo no
                      había forma de saber cuál era cuál.

                      Ahora cada uno dice el VERBO: editar, elegir, ver. Es la
                      misma corrección que se le hizo a "A mano" y a "Escribir
                      con IA": el botón nombra lo que hace, no la cosa sobre la
                      que trabaja. */}
                  {/* ⚠️ "Su dirección" no era un verbo: era la única de las
                      tres que nombraba una cosa en vez de decir qué le hace.
                      Al lado de "Editar la página" y "Ver cómo quedó" se leía
                      como un cartel con la dirección adentro. */}
                  {p.slugDigital ? "Cambiar la dirección" : "Elegí tu dirección"}
                </Enlace>
                <Enlace
                  href={`/p/${p.id}`}
                  externo
                  apagado={acc.deMentira}
                  motivo={porQueApagado}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver cómo quedó
                </Enlace>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/* ── Un grupo de hijos (bonos o upsells) de un principal ─────────────────── */
function Grupo({ padre, rol, acc }: { padre: ProductoEnPantalla; rol: "BONO" | "UPSELL"; acc: Acciones }) {
  const items = acc.hijosDe(padre.id, rol);
  const tope = topeDe(acc.tier, rol);
  const lleno = items.length >= tope;
  const tinta = TINTA[rol];
  const IconoRol = ICONO[rol];

  return (
    /* ══════════════════════════════════════════════════════════════════════
       ⚠️ SIN CAJA QUE ENVUELVA. ES LO QUE HACE QUE LOS TAMAÑOS COINCIDAN.
       ══════════════════════════════════════════════════════════════════════

       Acá había un `<div>` con borde, fondo tintado y `p-4`. Ese `p-4` es
       justamente el motivo por el que la tarjeta de un bono NUNCA podía medir
       lo mismo que la del producto: quedaba 32 px más angosta, y eso se ve —
       dos tarjetas casi iguales pero no iguales se leen como un error.

       Ahora la sección es una BARRA de color y las tarjetas cuelgan abajo, al
       mismo ancho que la del principal. Lo que las agrupa es el color, no una
       caja: mismo criterio que usa la competencia, y el que ya funciona con la
       miniatura y su sello. */
    <div className="space-y-3">
      {/* La barra de la sección: ícono del rol en su color, el contador como
          sello, y el botón de agregar a la derecha. Es el ancla de color que
          ata la sección con sus tarjetas ahora que no hay caja. */}
      <div
        className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border ${tinta.borde} ${tinta.suave} px-4 py-3`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className={`h-9 w-9 shrink-0 rounded-xl ${tinta.fondo} flex items-center justify-center`}>
            <IconoRol className={`h-4.5 w-4.5 ${tinta.texto}`} />
          </div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
              {COPY_ROL[rol].titulo}
              {/* El contador como sello y no como texto gris al lado: es el
                  número que se mira para saber si queda lugar. */}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tinta.fondo} ${tinta.texto}`}>
                {items.length} de {tope}
              </span>
            </p>
            <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">{COPY_ROL[rol].bajada}</p>
          </div>
        </div>

        {/* ⚠️ Igual que arriba: en el plan más alto no hay a dónde mejorar, así
            que el cartel informa y no ofrece. Y `tope === 0` no puede pasar en
            el plan de arriba —ningún plan tope tiene un rol en cero— pero se
            contempla igual, porque quien lo lea no tiene que averiguarlo. */}
        {lleno && esElPlanMasAlto(acc.tier) ? (
          <p className="shrink-0 text-xs font-bold text-gray-500 panel-oscuro:text-gray-400">
            {tope === 0
              ? "Tu plan no los incluye"
              : `Usaste ${tope === 1 ? "el único" : `los ${tope}`} de tu plan`}
          </p>
        ) : lleno ? (
          <Link
            href="/digitales/mi-cuenta"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-500 panel-oscuro:text-gray-400 hover:text-orange-600 hover:border-orange-300 transition-colors"
          >
            {tope === 0 ? "Tu plan no los incluye" : "Llegaste al tope"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {/* ⚠️ EL BOTÓN QUE FALTABA.
                "Armar con IA" arranca creando el principal, y en Free el tope de
                principales es uno: apenas alguien tiene su producto, ese botón
                desaparece y **el embudo no se puede correr nunca más**. Quien
                hizo su producto a mano quedaba sin ninguna forma de pedirle a la
                IA el bono ni el upsell, para siempre.

                Visto en la base el 08/09/26: una cuenta con el principal creado
                a las 18:30 y los bonos cuatro horas después. El upsell no
                existía ni borrado, porque no había manera de pedirlo.

                Va PRIMERO y relleno, y "a mano" al lado: es el camino que
                resuelve la pantalla en blanco. Mismo criterio que arriba. */}
            {IA_LISTA && (
              <button
                onClick={() => acc.pedirFicha(padre, rol)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-500 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {/* ⚠️ EL BOTÓN NOMBRA LO QUE CREA, y no es cosmética.
                    Estos dos botones existen TRES veces en la pantalla —arriba
                    para el producto, acá para los bonos, acá abajo para los
                    upsells— y decían lo mismo en los tres lados: "Con IA" y "A
                    mano". Eso dice el MÉTODO y no la cosa: se lee el botón y no
                    se sabe qué va a aparecer.

                    Y con lector de pantalla era peor: se escuchaba "A mano"
                    tres veces sin ninguna forma de saber cuál era cuál, porque
                    el título del grupo que da el contexto está en otro
                    elemento. Nombrar la cosa lo arregla de los dos lados. */}
                {COPY_ROL[rol].corto} con IA
              </button>
            )}
            <button
              onClick={() => acc.setBorrador(borradorNuevo(rol, padre.id))}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:border-gray-300 panel-oscuro:hover:border-gray-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {COPY_ROL[rol].corto} a mano
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        /* Sin la caja que envolvía, este renglón quedaba solo contra el borde
           izquierdo de la pantalla. El recuadro punteado le da el mismo tamaño
           que van a tener las tarjetas cuando existan: se ve el hueco que hay
           que llenar en vez de una frase suelta. */
        <div
          className={`rounded-2xl border-2 border-dashed ${tinta.borde} px-4 py-6 text-center text-xs text-gray-500 panel-oscuro:text-gray-400`}
        >
          Todavía no cargaste {rol === "BONO" ? "ningún bono" : "ningún upsell"}.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <Tarjeta key={h.id} p={h} acc={acc} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * La pantalla de productos.
 *
 * ── Por qué una sola lista y no tres ─────────────────────────────────────────
 * Un producto, un bono y un upsell son la misma cosa con distinto papel, así que
 * comparten formulario, tarjeta y validación. Tres pantallas serían tres copias
 * que se desincronizan de a una.
 *
 * ── Las dos subidas de esta pantalla son distintas a propósito ───────────────
 * La **portada** pasa por `/api/upload`, o sea por nuestro servidor: una imagen
 * entra cómoda en el cuerpo de un pedido, y así se pueden mirar los BYTES y
 * confirmar que un "image/png" es de verdad un png.
 *
 * El **archivo del producto** no puede hacer eso: un ebook de 30 MB no entra en
 * un pedido. Va derecho a Supabase con un permiso firmado, en tres pasos, y la
 * validación de verdad vive en el bucket. Ver `subirArchivo` más abajo y el
 * porqué largo en `lib/subida-digital`.
 *
 * ── Publicar sigue cerrado hasta que haya archivo ────────────────────────────
 * Lo corta `loQueFalta`, acá y otra vez en el servidor. Un producto publicado sin
 * archivo se puede comprar y no se puede entregar — se cobra la plata y no llega
 * nada. Es el peor final posible de este ecosistema.
 */
export default function ProductosClient({
  tier,
  paginaInicial,
  productos,
  cupoIA,
  cupoEbook,
  cobroConectado,
  conEjemplo,
}: {
  tier: TierDigital;
  /**
   * Cuál de las páginas de venta se está mirando, del `?pagina=` de la
   * dirección. Lo lee el servidor y llega con el primer dibujo: ver el porqué
   * largo en `page.tsx`. `null` es "la primera".
   */
  paginaInicial: string | null;
  productos: ProductoEnPantalla[];
  cupoIA: EstadoDelCupo;
  /** El cupo de EBOOKS, que es una bolsa aparte del de armar el embudo. */
  cupoEbook: EstadoDelCupo;
  /** Si ya conectó Mercado Pago: sin eso no se puede publicar. */
  cobroConectado: boolean;
  /** Si la dirección trae `?ejemplo=1`. Ver la tarjeta de ejemplo, más abajo. */
  conEjemplo: boolean;
}) {
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  /** Si está abierta la ventana de armar el embudo con IA. */
  const [embudoIA, setEmbudoIA] = useState(false);
  /** El producto cuyo ebook se está escribiendo, o `null`. */
  const [ebookDe, setEbookDe] = useState<ProductoEnPantalla | null>(null);
  /** Para qué principal y de qué tipo se está pidiendo una ficha con IA. */
  const [fichaIA, setFichaIA] = useState<{ padre: ProductoEnPantalla; rol: "BONO" | "UPSELL" } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  /* Aparte de `subiendo`, que es el de la portada adentro del modal: los dos
     pueden estar prendidos a la vez y son botones distintos. Guarda el ID del
     producto y no un booleano, para prender la tarjeta que corresponde. */
  const [subiendoArchivo, setSubiendoArchivo] = useState<string | null>(null);

  /**
   * El cerrojo del doble clic.
   *
   * `guardando` y `trabajando` son estado, y el estado se ve recién en el
   * siguiente dibujo: dos clics en el mismo cuadro leen los dos el valor viejo,
   * los dos pasan, y salen dos pedidos. El botón apagado llega tarde.
   *
   * Un ref cambia en el acto, así que el segundo clic encuentra la puerta ya
   * cerrada. Importa de verdad acá: dos altas seguidas crean dos productos y
   * gastan dos lugares del plan, y dos borrados dejan el segundo en un 404 que
   * la persona lee como que algo salió mal.
   *
   * Es uno solo para toda la pantalla porque desde acá nunca hay dos cosas
   * legítimas escribiendo a la vez.
   */
  const enVuelo = useRef(false);

  /**
   * La portada, subida por `/api/upload`.
   *
   * Pasa por nuestro servidor a propósito, al revés que el archivo del producto:
   * una imagen entra cómoda en los 4 MB que aguanta el cuerpo de un pedido, y así
   * el servidor puede mirar los BYTES y confirmar que un "image/png" es de verdad
   * un png. El archivo pago no puede hacer eso —pesa demasiado— y por eso va
   * derecho a Supabase con un permiso firmado.
   */
  async function subirImagen(file: File) {
    if (enVuelo.current) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Eso no es una imagen.");
      return;
    }
    if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
      setError(`La imagen no puede pesar más de ${MAX_IMAGEN_MB} MB.`);
      return;
    }
    enVuelo.current = true;
    setSubiendo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) {
        setError(data.error ?? "No pudimos subir la imagen.");
        return;
      }
      setBorrador((b) => (b ? { ...b, imagen: data.url as string } : b));
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
    } finally {
      enVuelo.current = false;
      setSubiendo(false);
    }
  }

  /**
   * El archivo del producto: el PDF que se lleva quien compra.
   *
   * Son tres pasos y **ninguno se puede saltear**:
   *
   *   1. Le pedimos permiso a nuestro servidor. Ahí no viaja el archivo, sólo su
   *      tipo y su tamaño. El servidor elige la ruta —si la eligiera el
   *      navegador podría escribir sobre el archivo de otra cuenta—.
   *   2. Los bytes van DERECHO a Supabase. No pasan por nosotros: un ebook no
   *      entra en el cuerpo de un pedido, que Next corta bastante antes.
   *   3. Recién ahí se confirma, y el servidor va a MIRAR que el archivo esté.
   *
   * El paso 3 no es burocracia. Como el 2 no pasa por nosotros, "ya lo subí" es
   * una afirmación de la parte interesada: sin comprobarla, alcanzaría con
   * llamar a confirmar sin haber subido nada para marcar el producto como
   * entregable, publicarlo y cobrar por un archivo que no existe.
   */
  async function subirArchivo(p: ProductoEnPantalla, file: File) {
    if (enVuelo.current) return;
    setError("");

    enVuelo.current = true;
    setSubiendoArchivo(p.id);
    const soltar = () => { enVuelo.current = false; setSubiendoArchivo(null); };

    /* ⚠️ Los tres llamados encadenados viven en `lib/subir-pdf-digital`, no acá:
       el recibimiento de una cuenta nueva sube el archivo igual, y escrito dos
       veces el día que cambie se entera uno y el otro no. */
    const r = await subirPdfDigital(p.id, file);

    if (!r.ok) {
      setError(r.error);
      soltar();
      return;
    }

    /* El aviso del peso NO se muestra acá. Se mostraba con `setError` y después
       venía este `reload`, así que se perdía siempre: la persona no lo vio
       nunca. Ahora vive en la tarjeta, calculado del peso guardado — se ve cada
       vez que mira el producto y no una sola vez, que además es cuando sirve. */
    window.location.reload();
    /* El cerrojo NO se suelta acá: la página se está yendo, y devolverle el
       botón durante ese rato es ofrecerle subir dos veces. Mismo criterio que
       guardar, publicar y borrar. */
  }

  const principales = productos.filter((p) => p.rol === "PRINCIPAL");
  const hijosDe = (padreId: string, rol: RolDigital) =>
    productos.filter((p) => p.padreId === padreId && p.rol === rol);

  /* ══════════════════════════════════════════════════════════════════════════
     UN EMBUDO POR VEZ
     ══════════════════════════════════════════════════════════════════════════

     Antes se dibujaban todos, uno abajo del otro. Con dos ya se lee mal; con los
     cinco de Pro son **45 tarjetas** en un solo scroll —cada producto lleva
     hasta 5 bonos y 3 upsells— y encontrar el bono de la página tres es
     scrollear a ojo. El aire entre embudos ayudaba, pero el problema no es la
     separación: es la cantidad.

     Así que se elige cuál se mira, y se muestra ese.

     ⚠️ La elección vive en la DIRECCIÓN (`?pagina=`) y no sólo en memoria, y no
     es un lujo: guardar un producto termina en `window.location.reload()`
     —la lista la arma el servidor, recargar es lo único que garantiza que se vea
     lo que quedó guardado—. Con la elección en memoria, editar el bono de la
     página dos te devolvía a la página uno y el bono recién editado no estaba a
     la vista: parecía que no se había guardado.

     Y de paso queda compartible y el botón de atrás del navegador hace algo
     razonable.

     `?? principales[0]` no es un descuido: es lo que pasa cuando se borra la
     página que estabas mirando, o cuando llega una dirección con un id que ya no
     existe. Cae en la primera en vez de mostrar una pantalla vacía. */
  const [paginaVista, setPaginaVista] = useState<string | null>(paginaInicial);

  const elegido = principales.find((p) => p.id === paginaVista) ?? principales[0] ?? null;

  const elegirPagina = (id: string) => {
    setPaginaVista(id);
    /* `replaceState` y no `push`: cambiar de solapa no es navegar. Con `push`,
       mirar las cinco páginas dejaba cinco pasos de historial y volver atrás
       era apretar cinco veces para salir de la misma pantalla. */
    const url = new URL(window.location.href);
    url.searchParams.set("pagina", id);
    window.history.replaceState(null, "", url);
  };

  /* De qué producto cuelga el ebook que se está escribiendo, si cuelga de
     alguno. No es un adorno: es lo que le avisa a la persona que NO tiene que
     volver a explicar el contexto del principal —el servidor ya se lo manda al
     modelo, ver `contextoDelPadre`—. Sin ese renglón el dato existe y nadie lo
     sabe, y se escribe todo de nuevo por las dudas.

     Puede dar `null` con un `padreId` cargado: el principal pudo haberse
     borrado. Ahí no hay nada que decir y no se dice nada. */
  const padreCrudo = ebookDe?.padreId
    ? productos.find((x) => x.id === ebookDe.padreId)
    : null;
  const padreDelEbook =
    padreCrudo && ebookDe && ebookDe.rol !== "PRINCIPAL"
      ? { nombre: padreCrudo.name, rol: ebookDe.rol }
      : null;

  /* Lo que la tarjeta y el grupo necesitan de acá. Se arma una vez y se pasa
     hacia abajo: las funciones se declaran en el cuerpo del componente, así que
     memorizarlo no ganaría nada —el objeto cambiaría igual en cada dibujo—. */
  const acc: Acciones = {
    tier, cobroConectado, trabajando, subiendoArchivo, setBorrador, publicar, borrar, subirArchivo,
    rehacerPDF,
    abrirEbook: setEbookDe,
    pedirFicha: (padre, rol) => setFichaIA({ padre, rol }),
    hijosDe,
  };

  /* Las acciones del ejemplo: ninguna hace nada. No es prolijidad — la tarjeta
     de arriba tiene "Borrar" y "Publicar", y esos le pegarían a la base con un
     id que no existe. Ver dónde se dibuja, más abajo. */
  const accDeEjemplo: Acciones = {
    ...acc,
    setBorrador: () => {},
    publicar: () => {},
    borrar: () => {},
    subirArchivo: () => {},
    rehacerPDF: () => {},
    abrirEbook: () => {},
    deMentira: true,
    pedirFicha: () => {},
    hijosDe: () => [],
  };

  const topePrincipales = topeDe(tier, "PRINCIPAL");
  const llegoAlTope = principales.length >= topePrincipales;

  /* La pantalla usa la MISMA función que valida el servidor. No la reemplaza
     —lo que valida el navegador no protege nada— pero dice qué está mal al lado
     del campo en vez de después del viaje.
     El título va como `undefined` mientras esté vacío, que para `validarCampos`
     significa "no vino" y no lo revisa. Antes iba como cadena vacía, así que el
     formulario recién abierto ya te retaba con "el título tiene que tener al
     menos 2 letras" por un campo que todavía no habías tocado. Lo que impide
     guardar vacío es el botón apagado, no un reto. */
  const precioNum = borrador ? Number(borrador.price.replace(",", ".")) : 0;
  const comparaNum = borrador?.comparePrice ? Number(borrador.comparePrice.replace(",", ".")) : null;
  const problema = borrador
    ? validarCampos(
        {
          name: borrador.name.trim() === "" ? undefined : borrador.name.trim(),
          description: borrador.description,
          price: borrador.rol === "BONO" ? 0 : (borrador.price === "" ? undefined : precioNum),
          comparePrice: comparaNum,
        },
        borrador.rol
      )
    : null;
  const puedeGuardar = Boolean(borrador && borrador.name.trim().length >= 2 && !problema && !guardando);

  async function guardar() {
    if (!borrador || !puedeGuardar || enVuelo.current) return;
    enVuelo.current = true;
    setError("");
    setGuardando(true);
    try {
      const cuerpo = {
        rol: borrador.rol,
        padreId: borrador.padreId,
        name: borrador.name.trim(),
        description: borrador.description,
        price: borrador.rol === "BONO" ? 0 : (borrador.price === "" ? 0 : precioNum),
        comparePrice: comparaNum && comparaNum > 0 ? comparaNum : null,
        imagen: borrador.imagen,
      };
      const r = await fetch(
        borrador.id ? `/api/digitales/productos/${borrador.id}` : "/api/digitales/productos",
        {
          method: borrador.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos guardar el producto.");
        enVuelo.current = false;
        setGuardando(false);
        return;
      }
      /* La lista la arma el servidor: recargar es lo único que garantiza que lo
         que se ve sea lo que quedó guardado.
         El cerrojo NO se suelta acá: la página se está yendo, y devolverle el
         botón a alguien durante ese rato es ofrecerle guardar dos veces. */

      /* ⚠️ Un producto NUEVO abre su propia solapa. Sin esto, crear la página
         tres te devolvía a la uno —la recarga cae en la primera— y lo que
         acababas de crear no estaba a la vista: se ve igual que si no se hubiera
         guardado. Sólo el principal, porque es el único que tiene solapa; un
         bono se crea adentro de la que ya estás mirando.

         La dirección se arma sobre la actual y no a mano, para no perder lo que
         venga colgado el día que esta pantalla tenga otro parámetro. */
      const nuevoPrincipal =
        !borrador.id && borrador.rol === "PRINCIPAL" && typeof data.id === "string"
          ? (data.id as string)
          : null;
      if (nuevoPrincipal) {
        const url = new URL(window.location.href);
        url.searchParams.set("pagina", nuevoPrincipal);
        window.location.href = url.toString();
        return;
      }
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
      enVuelo.current = false;
      setGuardando(false);
    }
  }

  /* Rehacer el PDF con lo que ya está escrito. Ver `rehacerPDF` en `Acciones`. */
  async function rehacerPDF(p: ProductoEnPantalla, estilo?: EstiloDeEbook) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(p.id);
    try {
      const r = await fetch("/api/digitales/ia/ebook/armar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estilo ? { productoId: p.id, estilo } : { productoId: p.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos rehacer el PDF.");
        enVuelo.current = false;
        setTrabajando(null);
        return;
      }
      /* ⚠️ Si volvió a salir sin fotos se dice, en vez de recargar y dejar el
         mismo cartel ahí como si no hubiera pasado nada. El tope del banco se
         libera por hora: puede seguir lleno un rato. */
      if (data.sinFotos === true) {
        setError("El banco de fotos sigue al tope. El PDF se rehizo igual, pero todavía sin fotos: probá de nuevo en un rato.");
        enVuelo.current = false;
        setTrabajando(null);
        return;
      }
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos.");
      enVuelo.current = false;
      setTrabajando(null);
    }
  }

  async function publicar(p: ProductoEnPantalla, publicado: boolean) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setTrabajando(p.id);
    try {
      const r = await fetch(`/api/digitales/productos/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicado }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "No pudimos cambiarlo.");
        enVuelo.current = false;
        setTrabajando(null);
        return;
      }
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos.");
      enVuelo.current = false;
      setTrabajando(null);
    }
  }

  async function borrar(p: ProductoEnPantalla) {
    if (enVuelo.current) return;
    const cuantosHijos = p.rol === "PRINCIPAL"
      ? productos.filter((h) => h.padreId === p.id).length
      : 0;
    const aviso = cuantosHijos > 0
      ? `Se borra "${p.name}" y también sus ${cuantosHijos} bono/upsell. No se puede deshacer.`
      : `Se borra "${p.name}". No se puede deshacer.`;
    // El cerrojo se cierra DESPUÉS de preguntar: si dice que no, no hubo nada
    // en vuelo y la pantalla tiene que seguir respondiendo.
    if (!window.confirm(aviso)) return;

    enVuelo.current = true;
    setTrabajando(p.id);
    try {
      const r = await fetch(`/api/digitales/productos/${p.id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? "No pudimos borrarlo.");
        enVuelo.current = false;
        setTrabajando(null);
        return;
      }
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos.");
      enVuelo.current = false;
      setTrabajando(null);
    }
  }

  return (
    /* `space-y-8` afuera contra `space-y-3` adentro de cada embudo: eso es lo
       que separa un producto del que sigue ahora que no hay sangría. Con los
       cinco de Pro uno abajo del otro, sin esa diferencia se leen como una sola
       lista larga de tarjetas sueltas. */
    <div className="space-y-8">
      {/* Cuánto usaste de tu plan. Se dice "páginas de venta" y nunca "tiendas":
          la competencia vende tiendas y nosotros no. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
            {principales.length} de {topePrincipales} página{topePrincipales === 1 ? "" : "s"} de venta
          </p>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">Tu plan {COPY_DIGITAL[tier].nombre}</p>
          {/* ⚠️ QUÉ HACE EL BOTÓN DE AL LADO, PORQUE HACE MÁS DE LO QUE PARECE.
              "Armar todo con IA" no crea un producto: crea LOS TRES —producto,
              bono y upsell— de una sola vez (ver `EmbudoIA`). Sin este renglón
              alguien lo aprieta esperando una tarjeta y le aparecen tres, que es
              una sorpresa aunque sea buena.

              Sólo cuando los botones están: al lado de "Usaste las 5 de tu plan"
              sería contar algo que en ese momento no se puede hacer. */}
          {!llegoAlTope && (
            <p className="text-[11px] text-gray-400 panel-oscuro:text-gray-500 mt-1">
              Con IA salen los tres de una: producto, bono y upsell.
            </p>
          )}
        </div>

        {/* ⚠️ EN EL PLAN MÁS ALTO NO SE OFRECE MEJORAR, porque no hay a dónde.
            Acá había un enlace a Mi cuenta para todos: quien pagaba el plan más
            caro leía "Llegaste al tope de tu plan →", iba, y descubría que ya lo
            tenía. Primero lo hace dudar y después le hace perder el viaje.
            En el tope de arriba es un dato, no una oferta. */}
        {llegoAlTope && esElPlanMasAlto(tier) ? (
          <p className="text-sm font-bold text-gray-500 panel-oscuro:text-gray-400">
            Usaste las {topePrincipales} de tu plan
          </p>
        ) : llegoAlTope ? (
          <Link
            href="/digitales/mi-cuenta"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-orange-50 panel-oscuro:bg-orange-500/10 text-sm font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-100 transition-colors"
          >
            Llegaste al tope de tu plan
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {/* ⚠️ La IA va PRIMERA y a mano va segunda, no al revés. Es el camino
                que resuelve la pantalla en blanco —"no sé qué escribir"— y el que
                hace que valga la pena el plan. Escribir a mano sigue estando, y
                sin castigo: es un botón al lado, no un enlace escondido. */}
            <button
              onClick={() => setEmbudoIA(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-200"
            >
              <Sparkles className="h-4 w-4" /> Armar todo con IA
            </button>
            <button
              onClick={() => setBorrador(borradorNuevo("PRINCIPAL", null))}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
            >
              {/* "Producto nuevo" y no "A mano": el de al lado ya dice "con IA",
                  así que la diferencia queda dicha sin repetir el método, y este
                  botón nombra lo que hace en vez de cómo lo hace. */}
              <Plus className="h-4 w-4" /> Producto nuevo
            </button>
          </div>
        )}
      </div>

      {/* ── Las solapas: cuál de tus páginas estás mirando ─────────────────────
          Van pegadas abajo del bloque del plan porque son de la misma idea: ahí
          arriba dice "2 de 5 páginas de venta" y acá se elige cuál de esas dos.

          ⚠️ CON UNA SOLA NO APARECEN. Una fila de una sola solapa no es una
          elección, es un adorno que ocupa un renglón y hace dudar de si falta
          algo. Y es el caso de todo el plan Free, donde el tope es uno.

          ── Por qué el número Y el nombre ────────────────────────────────────
          El número es lo que se pidió y lo que ordena —"la dos" es una forma
          real de nombrarlas—, pero con cinco páginas los números solos no dicen
          a cuál volver. El nombre es lo que se reconoce. Va cortado, porque un
          título de 140 caracteres reventaría la fila.

          ── Por qué botones y no un `<select>` ──────────────────────────────
          Con cinco como máximo, todas entran a la vista y se cambia en un clic.
          Un desplegable esconde lo que hay hasta que lo abrís.

          `aria-pressed` y no `role="tab"`: las solapas de verdad se manejan con
          las flechas del teclado, y prometer eso en el rol sin implementarlo es
          peor que no prometerlo. Esto es un grupo de botones que se aprietan, y
          con Tab se recorren solos. */}
      {principales.length > 1 && (
        <div
          role="group"
          aria-label="Elegí qué página de venta estás viendo"
          /* ⚠️ ENVUELVE, NO SCROLLEA. Acá había `overflow-x-auto`, y con dos
             páginas se veía perfecto — el problema aparece recién con cinco,
             que es lo que da Pro.

             Cinco solapas ocupan 1032 px (200 cada una: 28 de aire, 20 del
             número, 8 de separación y hasta 144 del nombre) y el ancho útil de
             esta pantalla son 848 px en 1280, 720 en 768 y 328 en 360. O sea
             que **en los tres anchos se pasa**, y con scroll horizontal las dos
             últimas quedaban escondidas: en un celular se descubren arrastrando,
             pero en escritorio hay que saber que existe shift+rueda. Una página
             que no se puede encontrar es una página que no existe.

             Envolviendo no se esconde nada en ningún ancho. El costo es que en
             360 son tres renglones, y para eso el nombre se acorta abajo. */
          className="-mt-5 flex flex-wrap gap-2"
        >
          {principales.map((p, i) => {
            const activa = elegido?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => elegirPagina(p.id)}
                aria-pressed={activa}
                className={`shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors ${
                  activa
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-gray-600 panel-oscuro:text-gray-300 hover:border-gray-300 panel-oscuro:hover:border-gray-600"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] ${
                    activa ? "bg-white/25" : "bg-gray-100 panel-oscuro:bg-gray-800"
                  }`}
                >
                  {i + 1}
                </span>
                {/* Sin título todavía es un caso real: se crea a mano y se guarda
                    con el nombre a medio escribir. Una solapa en blanco no se
                    puede apretar con confianza.

                    ⚠️ Y el nombre se acorta en pantalla chica, que es lo que
                    hace que envolver sirva. Con 144 px fijos, en 360 entraba UNA
                    sola por renglón y cinco páginas eran cinco renglones —una
                    lista, no un selector—. Con 80 px entran dos y son tres.

                    Ochenta píxeles son unos diez caracteres: alcanzan para
                    distinguir "Bachiller…" de "Panadería…", y al lado está el
                    número, que es el que no se corta nunca. */}
                <span className="max-w-[5rem] truncate sm:max-w-[7rem] lg:max-w-[9rem]">
                  {p.name.trim() || "Sin título"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 px-5 py-4">
          <p className="text-sm font-medium text-red-700 panel-oscuro:text-red-300">{error}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          UN PRODUCTO DE EJEMPLO, CON SU EBOOK YA HECHO — SÓLO EN DESARROLLO
          ══════════════════════════════════════════════════════════════════════

          Para ver cómo queda la tarjeta de un producto TERMINADO hay que tener
          uno, y tenerlo cuesta una generación de IA contra la base de
          producción. El otro camino era peor: meter un producto falso en esa
          base, que queda ahí hasta que alguien se acuerde de borrarlo.

          Así que se dibuja con la MISMA tarjeta que los de verdad, arriba de la
          lista, y no toca nada: las acciones que le llegan no hacen nada. El
          único botón que anda es "Editar el contenido", y ése abre el editor de
          verdad con un ebook inventado — o sea que los pasos que se prueban son
          los pasos que hay. Ver `ejemploDeTarjeta`.

          `process.env.NODE_ENV` lo resuelve el compilador, así que en el build
          de producción este bloque no existe.

          ── ⚠️ Y ADEMÁS HAY QUE PEDIRLA: `?ejemplo=1` — 10/09/26 ─────────────

          Antes se dibujaba sola en desarrollo, arriba de todo. O sea que
          trabajar sobre los productos de verdad era pasarle por encima a una
          tarjeta falsa en cada carga, y en el teléfono empujaba los propios
          abajo del pliegue.

          Ahora el panel se ve como en producción, y el ejemplo se abre a
          propósito:

              /digitales/productos?ejemplo=1

          Los dos candados suman, no se reemplazan. El de `NODE_ENV` es el que
          protege de verdad —borra el bloque del build— y el `?ejemplo=1` sólo
          saca del camino algo que estorbaba mientras se trabaja. Sacar el
          primero dejaría la tarjeta falsa a un parámetro de distancia de los
          productos reales de cualquiera. */}
      {process.env.NODE_ENV === "development" && conEjemplo && (
        <div className="mb-8 rounded-3xl border-2 border-dashed border-amber-300 panel-oscuro:border-amber-500/40 bg-amber-50/60 panel-oscuro:bg-amber-500/5 p-3 sm:p-4">
          <p className="mb-3 text-[11.5px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
            <strong>Ejemplo, sólo en desarrollo.</strong> Así se ve un producto con el
            ebook terminado. Este producto no existe, así que sus botones están apagados:
            el único que anda es <strong>Editar el contenido</strong>, que abre el editor
            de verdad con un ebook inventado.
          </p>
          <Tarjeta p={PRODUCTO_DE_EJEMPLO} acc={accDeEjemplo} />
        </div>
      )}

      {principales.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 p-10 text-center shadow-sm">
          <div className="w-14 h-14 bg-orange-100 panel-oscuro:bg-orange-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-7 w-7 text-orange-600" />
          </div>
          <p className="text-gray-900 panel-oscuro:text-gray-100 font-bold text-lg mb-1">Todavía no cargaste ningún producto</p>
          <p className="text-gray-500 panel-oscuro:text-gray-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            Un producto es tu ebook, tu plantilla o tu guía. Contame de qué se trata y te armo el
            producto, un bono de regalo y un upsell — después lo editás.
          </p>
          {/* La pantalla vacía es donde más pesa: es el momento exacto del "no sé
              qué escribir". Por eso acá la IA es el botón grande. */}
          <button
            onClick={() => setEmbudoIA(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-200"
          >
            <Sparkles className="h-4 w-4" /> Armar mi embudo con IA
          </button>
          <p className="mt-3">
            <button
              onClick={() => setBorrador(borradorNuevo("PRINCIPAL", null))}
              className="text-[13px] font-semibold text-gray-500 panel-oscuro:text-gray-400 hover:text-orange-600 transition-colors underline underline-offset-2"
            >
              o cargalo a mano
            </button>
          </p>
        </div>
      ) : (
        (elegido ? [elegido] : []).map((p) => (
          /* ⚠️ SIN SANGRÍA. Acá había un `sm:pl-8` en los grupos, para mostrar
             que los bonos y los upsells cuelgan del producto. El costo era que
             TODO lo de abajo quedaba 32 px más angosto que la tarjeta de
             arriba: la sangría era el último motivo por el que los tamaños no
             coincidían, y se ve a simple vista aunque no se sepa por qué.

             Lo que cuelga de qué ya lo dice el color —cada sección con su barra
             y su tinte— y lo dice mejor, porque también funciona en 360, donde
             la sangría estaba apagada y no decía nada.

             Y para que dos embudos seguidos no se mezclen, la separación entre
             productos es más grande que la de adentro: `space-y-10` afuera
             contra `space-y-3` adentro. El aire agrupa igual que la sangría y
             no le come ancho a nadie. */
          <div key={p.id} className="space-y-3">
            <Tarjeta p={p} acc={acc} />
            <div className="space-y-3">
              <Grupo padre={p} rol="BONO" acc={acc} />
              <Grupo padre={p} rol="UPSELL" acc={acc} />
            </div>
          </div>
        ))
      )}

      {/* ── Armar el embudo con IA ────────────────────────────────────────
          Su propia ventana y no un paso adentro del formulario: la IA devuelve
          TRES fichas y el formulario crea UNA. Ver el comentario adentro. */}
      {embudoIA && <EmbudoIA cupoInicial={cupoIA} onCerrar={() => setEmbudoIA(false)} />}

      {/* Una ficha suelta —un bono o un upsell— para un principal que ya
          existe. Ver el porqué largo adentro de `FichaIA`. */}
      {fichaIA && (
        <FichaIA
          padre={{ id: fichaIA.padre.id, name: fichaIA.padre.name }}
          rol={fichaIA.rol}
          cupoInicial={cupoIA}
          onCerrar={() => setFichaIA(null)}
        />
      )}

      {ebookDe && (
        <EbookIA
          producto={{ id: ebookDe.id, name: ebookDe.name, tieneArchivo: ebookDe.tieneArchivo }}
          padre={padreDelEbook}
          cupoInicial={cupoEbook}
          estadoInicial={ebookDe.ebook}
          contado={ebookDe.contado}
          onCerrar={() => setEbookDe(null)}
        />
      )}

      {/* ── El formulario ─────────────────────────────────────────────────── */}
      {borrador && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !guardando && setBorrador(null)} />
          <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white panel-oscuro:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <div className="sticky top-0 bg-white panel-oscuro:bg-gray-900 border-b border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-between">
              <p className="font-black text-gray-900 panel-oscuro:text-gray-100">
                {borrador.id ? "Editar" : `Nuevo ${borrador.rol === "PRINCIPAL" ? "producto" : borrador.rol === "BONO" ? "bono" : "upsell"}`}
              </p>
              <button
                onClick={() => !guardando && setBorrador(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 flex items-center justify-center text-gray-500 panel-oscuro:text-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* ⚠️ Acá había un cartel de "Próximamente" para armar el embudo
                  con IA, y se sacó el 04/09/26 cuando el botón pasó a existir.
                  No se convirtió en un botón en este lugar a propósito: la IA
                  arma el embudo ENTERO —principal, bono y upsell— y este
                  formulario crea UNO. Metido acá, habría que decidir qué hacer
                  con las otras dos fichas mientras hay un formulario a medio
                  llenar encima. Vive afuera, arriba de la lista, con su propia
                  ventana. Ver `EmbudoIA`. */}

              {/* La portada. Va primera porque es lo primero que ve quien entra a
                  la página de venta. */}
              <div className="flex items-start gap-4">
                {borrador.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={borrador.imagen}
                    alt=""
                    className="w-24 h-24 shrink-0 rounded-2xl object-cover border border-gray-200 panel-oscuro:border-gray-700"
                  />
                ) : (
                  <div className="w-24 h-24 shrink-0 rounded-2xl bg-gray-100 panel-oscuro:bg-gray-800 border border-dashed border-gray-300 panel-oscuro:border-gray-600 flex items-center justify-center">
                    <ImageIcon className="h-7 w-7 text-gray-500 panel-oscuro:text-gray-400" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Portada</p>
                  <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">
                    Es la imagen que se ve en tu página de venta. Hasta {MAX_IMAGEN_MB} MB.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {/* ⚠️ La MISMA regla que el PDF de arriba: `sr-only` y no
                        `hidden`, o este botón tampoco se alcanza con el teclado.
                        Éste apareció por la prueba, no mirándolo: son dos
                        subidas en el mismo archivo y sólo se había arreglado
                        una. Ver el porqué largo en el label del PDF.

                        Y `relative` en el label por lo mismo: sin eso el input
                        absoluto se cuelga del documento y le agrega sobrante
                        para scrollear. Ver el porqué largo allá arriba. */}
                    <label className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 panel-oscuro:focus-within:ring-offset-gray-900">
                      {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      {subiendo ? "Subiendo..." : borrador.imagen ? "Cambiar" : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={subiendo}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          // Se limpia el input para que elegir el MISMO archivo dos
                          // veces seguidas vuelva a disparar el cambio.
                          e.target.value = "";
                          if (f) subirImagen(f);
                        }}
                      />
                    </label>
                    {borrador.imagen && (
                      <button
                        onClick={() => setBorrador({ ...borrador, imagen: null })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 panel-oscuro:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Sacar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="titulo" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Título</label>
                {/* ⚠️ `CampoAuto` y no un `<input>`: acepta 140 caracteres en un
                    renglón, y el título es el campo que MÁS se llena de todo el
                    panel. Un input no puede pasar a renglón nuevo —es lo que el
                    elemento es— así que el texto se corría hacia la derecha y
                    quien escribía un título largo dejaba de ver el principio.
                    Esto crece hacia abajo. Sigue siendo un valor de una línea:
                    los saltos se sacan al escribir y al pegar. */}
                <CampoAuto
                  id="titulo"
                  value={borrador.name}
                  maxLength={LARGO_TITULO}
                  onChange={(v) => setBorrador({ ...borrador, name: v })}
                  placeholder="Guía práctica de mecánica del automotor"
                  estilo="px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="desc" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Descripción</label>
                <textarea
                  id="desc"
                  value={borrador.description}
                  maxLength={LARGO_DESCRIPCION}
                  rows={5}
                  onChange={(e) => setBorrador({ ...borrador, description: e.target.value })}
                  placeholder="Qué se lleva la persona que lo compra."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-y"
                />
                <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1.5">
                  Se usa en la página de venta. {borrador.description.length.toLocaleString("es-AR")} / {LARGO_DESCRIPCION.toLocaleString("es-AR")}
                </p>
              </div>

              {/* Un bono va gratis por definición, así que no se le pide precio:
                  un campo apagado que siempre dice 0 sólo confunde. */}
              {borrador.rol === "BONO" ? (
                <div className="grid gap-3">
                  <div className="rounded-2xl bg-amber-50 panel-oscuro:bg-amber-500/10 border border-amber-100 panel-oscuro:border-amber-500/25 px-4 py-3">
                    <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Un bono va gratis</p>
                    <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">
                      No se cobra: se entrega junto con la compra del producto principal.
                    </p>
                  </div>

                  {/* ⚠️ Esto FALTABA, y era un agujero grande: el rol BONO escondía
                      los dos campos de precio, y uno de los dos no era un precio.
                      `comparePrice` en un bono es CUÁNTO VALE — el número tachado al
                      lado de GRATIS— y de él sale toda la cuenta de la página de
                      venta: el valor total, el porcentaje del sello y el renglón del
                      ahorro. Sin poder escribirlo, un bono sumaba cero y el GRATIS
                      no significaba nada. */}
                  <div>
                    <label htmlFor="valorBono" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">
                      Cuánto vale <span className="font-normal text-gray-500 panel-oscuro:text-gray-400">(opcional)</span>
                    </label>
                    <input
                      id="valorBono"
                      inputMode="decimal"
                      value={borrador.comparePrice}
                      /* ⚠️ `[^\d.,]` CON LA BARRA. Acá decía `[^d.,]` —sin ella—
                         y eso no es un detalle de estilo: sin la barra, la `d`
                         deja de significar "un dígito" y pasa a ser la letra d.
                         O sea que la regla era "borrá todo lo que no sea una
                         letra d, un punto o una coma", y **borraba los números**.

                         Este campo no aceptaba un solo dígito: se escribía 8000
                         y el casillero quedaba vacío. Y es el que le pone valor
                         al bono, o sea de donde sale toda la cuenta de la página
                         de venta —el total, el porcentaje del sello, el renglón
                         del ahorro—. Sin él, el bono suma cero y el GRATIS al
                         lado no significa nada.

                         Los otros dos campos de precio de este mismo formulario
                         siempre lo tuvieron bien; era sólo éste. Encontrado el
                         08/09/26 revisando los formularios uno por uno. */
                      onChange={(e) => setBorrador({ ...borrador, comparePrice: e.target.value.replace(/[^\d.,]/g, "") })}
                      placeholder="8000"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1.5">
                      El número tachado al lado de GRATIS. Es lo que hace que el regalo
                      valga algo: sin esto el bono no suma al total de tu página.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="precio" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">Precio</label>
                    <input
                      id="precio"
                      inputMode="decimal"
                      value={borrador.price}
                      onChange={(e) => setBorrador({ ...borrador, price: e.target.value.replace(/[^\d.,]/g, "") })}
                      placeholder="16990"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="antes" className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">
                      Precio original <span className="font-normal text-gray-500 panel-oscuro:text-gray-400">(opcional)</span>
                    </label>
                    <input
                      id="antes"
                      inputMode="decimal"
                      value={borrador.comparePrice}
                      onChange={(e) => setBorrador({ ...borrador, comparePrice: e.target.value.replace(/[^\d.,]/g, "") })}
                      placeholder="84950"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {problema && <p className="text-sm text-red-600 font-medium">{problema}</p>}
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            </div>

            <div className="sticky bottom-0 bg-white panel-oscuro:bg-gray-900 border-t border-gray-100 panel-oscuro:border-gray-800 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => !guardando && setBorrador(null)}
                className="px-5 py-3 rounded-2xl text-sm font-bold text-gray-500 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={!puedeGuardar}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
