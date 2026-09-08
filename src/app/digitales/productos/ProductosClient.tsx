"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Plus, Gift, TrendingUp, BookOpen, Loader2, Pencil, Trash2, AlertTriangle, Image as ImageIcon,
  Eye, EyeOff, X, ArrowUpRight, Upload, Sparkles, ExternalLink, LayoutTemplate, Globe,
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
import EmbudoIA from "./EmbudoIA";
import EbookIA from "./EbookIA";

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

const TINTA: Record<RolDigital, { borde: string; fondo: string; texto: string; suave: string }> = {
  PRINCIPAL: { borde: "border-orange-200 panel-oscuro:border-orange-500/30", fondo: "bg-orange-100 panel-oscuro:bg-orange-500/15", texto: "text-orange-600", suave: "bg-orange-50 panel-oscuro:bg-orange-500/10" },
  BONO:      { borde: "border-amber-200 panel-oscuro:border-amber-500/30",  fondo: "bg-amber-100 panel-oscuro:bg-amber-500/15",  texto: "text-amber-600",  suave: "bg-amber-50 panel-oscuro:bg-amber-500/10" },
  UPSELL:    { borde: "border-rose-200 panel-oscuro:border-rose-500/30",   fondo: "bg-rose-100 panel-oscuro:bg-rose-500/15",   texto: "text-rose-600",   suave: "bg-rose-50/40 panel-oscuro:bg-rose-500/10" },
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
  hijosDe: (padreId: string, rol: RolDigital) => ProductoEnPantalla[];
};

/* ⚠️ Tarjeta y Grupo viven ACÁ AFUERA y no adentro de la pantalla.
 *
 * Un componente definido adentro del cuerpo de otro se vuelve a crear en cada
 * dibujo, así que React lo trata como un componente distinto: desmonta y vuelve
 * a montar todo lo que hay abajo en cada tecla que se escribe en el formulario.
 * Acá adentro hay un `<img>` por tarjeta, y eso se ve como un parpadeo de todas
 * las portadas mientras escribís. Mismo motivo que en `configuracion/piezas.tsx`. */

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
  const subiendoEste = acc.subiendoArchivo === p.id;
  /* La MISMA regla que usa el servidor al confirmar. Si el aviso cambia, cambia
     en los dos lados a la vez. */
  const avisoPeso = p.archivoPeso ? avisoDePeso(p.archivoPeso) : null;

  return (
    <div className={`rounded-2xl border ${tinta.borde} bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5 shadow-sm`}>
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagen}
            alt=""
            className="w-16 h-16 sm:w-24 sm:h-24 shrink-0 rounded-2xl object-cover border border-gray-100 panel-oscuro:border-gray-800"
          />
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

          {p.description && (
            <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-1 line-clamp-2 break-words">{p.description}</p>
          )}

          <div className="flex items-baseline gap-2 mt-2">
            {p.rol === "BONO" ? (
              <span className="text-emerald-600 font-black">GRATIS</span>
            ) : (
              <span className="text-gray-900 panel-oscuro:text-gray-100 font-black">{money(p.price)}</span>
            )}
            {p.comparePrice !== null && p.comparePrice > 0 && (
              <span className="text-sm text-gray-400 panel-oscuro:text-gray-500 line-through">{money(p.comparePrice)}</span>
            )}
          </div>

          {/* El aviso va ACÁ adentro y no en un panel de errores aparte: el
              lugar donde se ve el problema tiene que ser el lugar donde se
              arregla. */}
          {falta && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 border border-red-100 panel-oscuro:border-red-500/25 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 panel-oscuro:text-red-300 font-medium">{falta}</p>
            </div>
          )}

          {p.tieneArchivo && p.archivoNombre && (
            <p className="mt-2 text-xs text-gray-400 panel-oscuro:text-gray-500 truncate">
              Archivo: {p.archivoNombre}
              {p.archivoPeso ? ` · ${Math.round(p.archivoPeso / 1024 / 1024 * 10) / 10} MB` : ""}
            </p>
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

          {/* La dirección se muestra en la tarjeta y no sólo adentro de su
              pantalla: es lo que la persona copia y pega, así que tiene que
              estar donde ya está mirando. `break-all` porque una dirección
              larga en 360 empujaba la tarjeta entera. */}
          {/* ⚠️ Se muestran LAS DOS cuando hay dos, y no sólo el dominio: el
              dominio se suma, no reemplaza, y la de tiendaapps sigue andando.
              Mostrar sólo la de arriba haría pensar que la otra se apagó, que es
              justo lo que esta fase promete que no pasa. */}
          {p.rol === "PRINCIPAL" && (p.dominioPropio || p.slugDigital) && (
            <div className="mt-2 space-y-0.5">
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
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400 panel-oscuro:text-gray-500">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* La etiqueta ES el botón: un `<input type="file">` no se puede
                disfrazar, así que se esconde y se lo dispara desde acá. */}
            <label
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                subiendoEste || ocupado
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
                className="hidden"
                disabled={subiendoEste || ocupado}
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
              disabled={!IA_LISTA || acc.tier === "FREE" || ocupado || subiendoEste}
              title={
                acc.tier === "FREE"
                  ? "Escribir el ebook con IA viene desde el plan Starter. En el gratis el PDF lo subís vos."
                  : !IA_LISTA
                    ? "Todavía no está listo."
                    : undefined
              }
              className={
                IA_LISTA && acc.tier !== "FREE"
                  ? "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 text-xs font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/10 transition-colors disabled:opacity-50"
                  : "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 panel-oscuro:border-gray-700 text-xs font-bold text-gray-400 panel-oscuro:text-gray-500 cursor-not-allowed"
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {/* El rótulo dice en qué estado está, así no hay que abrir la
                  ventana para saber si quedó a medio escribir. */}
              {!p.ebook
                ? "Escribir con IA"
                : p.ebook.estado === "LISTO"
                  ? "Escrito con IA"
                  : `Seguir (${p.ebook.escritos} de ${p.ebook.total})`}
            </button>

            {/* ── La ficha: título, precio, publicar, borrar ───────────────
                Se va a la derecha en pantalla ancha (`sm:ml-auto`) y baja a su
                propio renglón en 360, donde `ml-auto` no separa nada. */}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
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
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>

            <button
              onClick={() => acc.publicar(p, !p.publicado)}
              disabled={ocupado || (!p.publicado && falta !== null)}
              title={!p.publicado && falta ? falta : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 panel-oscuro:hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Borrar
            </button>
            </div>
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
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 panel-oscuro:border-gray-800 pt-3">
                <Link
                  href={`/digitales/productos/${p.id}/pagina`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" /> Página de venta
                </Link>
                <Link
                  href={`/digitales/productos/${p.id}/direccion`}
                  className={
                    /* Sin dirección el botón se destaca: es lo que falta para
                       poder repartir el producto, y en una fila de botones
                       grises no lo vería nadie. */
                    p.slugDigital
                      ? "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                      : "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 panel-oscuro:border-orange-500/30 text-xs font-bold text-orange-700 panel-oscuro:text-orange-300 hover:bg-orange-50 panel-oscuro:hover:bg-orange-500/10 transition-colors"
                  }
                >
                  <Globe className="h-3.5 w-3.5" />
                  {p.slugDigital ? "Dirección" : "Elegí tu dirección"}
                </Link>
                <Link
                  href={`/p/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver página
                </Link>
              </div>
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
    <div className={`rounded-2xl border ${tinta.borde} ${tinta.suave} p-4`}>
      {/* ⚠️ La cabecera lleva el ÍCONO DEL ROL en un cuadro de su color, igual
          que la miniatura de las tarjetas de adentro. Antes era un renglón de
          texto chico, así que la sección y sus tarjetas no se veían como la
          misma cosa: se leían como dos bloques sueltos que casualmente estaban
          pegados. El ícono repetido es lo que los ata. */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
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
          <button
            onClick={() => acc.setBorrador(borradorNuevo(rol, padre.id))}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:border-gray-300 panel-oscuro:hover:border-gray-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {rol === "BONO" ? "Agregar bono" : "Agregar upsell"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 panel-oscuro:text-gray-500">Todavía no cargaste ninguno.</p>
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
  productos,
  cupoIA,
  cupoEbook,
  cobroConectado,
}: {
  tier: TierDigital;
  productos: ProductoEnPantalla[];
  cupoIA: EstadoDelCupo;
  /** El cupo de EBOOKS, que es una bolsa aparte del de armar el embudo. */
  cupoEbook: EstadoDelCupo;
  /** Si ya conectó Mercado Pago: sin eso no se puede publicar. */
  cobroConectado: boolean;
}) {
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  /** Si está abierta la ventana de armar el embudo con IA. */
  const [embudoIA, setEmbudoIA] = useState(false);
  /** El producto cuyo ebook se está escribiendo, o `null`. */
  const [ebookDe, setEbookDe] = useState<ProductoEnPantalla | null>(null);
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

  /* Lo que la tarjeta y el grupo necesitan de acá. Se arma una vez y se pasa
     hacia abajo: las funciones se declaran en el cuerpo del componente, así que
     memorizarlo no ganaría nada —el objeto cambiaría igual en cada dibujo—. */
  const acc: Acciones = {
    tier, cobroConectado, trabajando, subiendoArchivo, setBorrador, publicar, borrar, subirArchivo,
    abrirEbook: setEbookDe, hijosDe,
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
      window.location.reload();
    } catch {
      setError("No pudimos conectarnos. Revisá tu internet e intentá de nuevo.");
      enVuelo.current = false;
      setGuardando(false);
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
    <div className="space-y-5">
      {/* Cuánto usaste de tu plan. Se dice "páginas de venta" y nunca "tiendas":
          la competencia vende tiendas y nosotros no. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 panel-oscuro:border-gray-800 bg-white panel-oscuro:bg-gray-900 px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">
            {principales.length} de {topePrincipales} página{topePrincipales === 1 ? "" : "s"} de venta
          </p>
          <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5">Tu plan {COPY_DIGITAL[tier].nombre}</p>
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
              <Sparkles className="h-4 w-4" /> Armar con IA
            </button>
            <button
              onClick={() => setBorrador(borradorNuevo("PRINCIPAL", null))}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-sm font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" /> A mano
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 panel-oscuro:border-red-500/30 bg-red-50 panel-oscuro:bg-red-500/10 px-5 py-4">
          <p className="text-sm font-medium text-red-700 panel-oscuro:text-red-300">{error}</p>
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
        principales.map((p) => (
          <div key={p.id} className="space-y-3">
            <Tarjeta p={p} acc={acc} />
            <div className="pl-0 sm:pl-8 space-y-3">
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

      {ebookDe && (
        <EbookIA
          producto={{ id: ebookDe.id, name: ebookDe.name, tieneArchivo: ebookDe.tieneArchivo }}
          cupoInicial={cupoEbook}
          estadoInicial={ebookDe.ebook}
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
                    <ImageIcon className="h-7 w-7 text-gray-400 panel-oscuro:text-gray-500" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">Portada</p>
                  <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">
                    Es la imagen que se ve en tu página de venta. Hasta {MAX_IMAGEN_MB} MB.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 panel-oscuro:border-gray-700 text-xs font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors cursor-pointer">
                      {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      {subiendo ? "Subiendo..." : borrador.imagen ? "Cambiar" : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
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
                <input
                  id="titulo"
                  value={borrador.name}
                  maxLength={LARGO_TITULO}
                  onChange={(e) => setBorrador({ ...borrador, name: e.target.value })}
                  placeholder="Guía práctica de mecánica del automotor"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
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
                <p className="text-xs text-gray-400 panel-oscuro:text-gray-500 mt-1.5">
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
                      Cuánto vale <span className="font-normal text-gray-400 panel-oscuro:text-gray-500">(opcional)</span>
                    </label>
                    <input
                      id="valorBono"
                      inputMode="decimal"
                      value={borrador.comparePrice}
                      onChange={(e) => setBorrador({ ...borrador, comparePrice: e.target.value.replace(/[^d.,]/g, "") })}
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
                      Precio original <span className="font-normal text-gray-400 panel-oscuro:text-gray-500">(opcional)</span>
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
