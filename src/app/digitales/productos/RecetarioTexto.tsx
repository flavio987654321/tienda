"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, Check, AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import CampoAuto from "@/components/CampoAuto";
import {
  INGREDIENTES_MAX, PASOS_MAX, LARGO_CAMPO_CORTO, LARGO_PASO,
  LARGO_TITULO_CAPITULO, LARGO_DESCRIPCION_RECETA,
  type Receta, type Ingrediente, type PasoDeReceta,
} from "@/lib/ebook-ia";
/* ⚠️ LA MISMA FUNCIÓN QUE USA EL SERVIDOR. Escribir acá una versión "parecida"
   de las reglas es el camino conocido a que la pantalla habilite el botón y el
   servidor conteste que no. Una regla, un mensaje, las dos puntas. */
import {
  revisarRecetas, INGREDIENTES_MIN, PASOS_MIN, LARGO_TIP,
} from "@/lib/recetario-texto";
import { mismoPedazo, deQueCapitulo, type FotoDelCapitulo, type Seleccion } from "@/lib/ebook-texto";
import ElegirFoto from "./ElegirFoto";

/**
 * El editor de las recetas ya escritas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES EL MISMO BOTÓN QUE LE FALTABA AL EBOOK DE TEXTO, PARA EL RECETARIO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Hasta hoy, quien hacía un recetario y encontraba un error tenía un solo
 * camino: **Rehacerlo**, que tira las treinta recetas y cobra otra generación
 * por arreglar un número. Y en un recetario lo que se corrige casi siempre ES
 * un número —una cantidad, una temperatura, un tiempo— así que el agujero se
 * usaba más que en un ebook de texto.
 *
 * ── Por qué no alcanzaba con el editor que ya existía ──────────────────────
 *
 * Porque aquél dibuja párrafos, y una receta son campos. "500 g" tiene que
 * poder cambiarse sin tocar "harina", los pasos van numerados y las fichas de
 * arriba son tres cosas distintas. Metido en un campo de texto corrido, eso se
 * mezcla y el molde del PDF no lo puede volver a separar.
 *
 * ── ⚠️ Lo que más se cuida: que no desaparezca una receta ──────────────────
 *
 * El lector descarta la receta ENTERA si se queda sin título, con menos de dos
 * ingredientes o con menos de dos pasos. Guardar así no falla en ningún lado: la
 * receta se pierde en la próxima lectura, todas las de abajo se corren un lugar
 * y el recetario que se vendió como de treinta entrega veintinueve. Por eso los
 * botones de borrar se apagan al llegar al mínimo, y por eso la revisión que
 * corre acá es exactamente la del servidor. Ver `recetario-texto`.
 */
export default function RecetarioTexto({
  guardadas,
  recetas,
  onRecetas,
  fotos,
  onFotos,
  otrosCambios = false,
  seleccion = null,
  onSeleccion,
  guardando,
  error,
  onCambio,
  onGuardar,
  onVolver,
}: {
  /** Lo que está en la base. Es contra lo que se mide si cambió algo. */
  guardadas: Receta[][];
  /** Lo que se está corrigiendo ahora, agrupado igual que lo guardado. */
  recetas: Receta[][];
  onRecetas: (recetas: Receta[][]) => void;
  /** La foto de cada receta, TODAS SEGUIDAS: una receta es una hoja. */
  fotos: FotoDelCapitulo[];
  onFotos: (fotos: FotoDelCapitulo[]) => void;
  otrosCambios?: boolean;
  seleccion?: Seleccion | null;
  onSeleccion?: (s: Seleccion | null) => void;
  guardando: boolean;
  error: string | null;
  onCambio: (hay: boolean) => void;
  onGuardar: (recetas: Receta[][]) => void;
  onVolver: () => void;
}) {
  const [abiertaAMano, setAbiertaAMano] = useState<number | null>(0);
  const [fotoAMano, setFotoAMano] = useState<number | null>(null);

  /* ⚠️ Igual que en el editor del texto: lo que se toca en la previa manda, y se
     DERIVA en vez de copiarse a un estado propio. Dos verdades para el mismo
     hecho quedan distintas una tarde cualquiera. */
  const desdeLaPrevia = deQueCapitulo(seleccion);
  const abierta = desdeLaPrevia ?? abiertaAMano;
  const fotoAbierta = seleccion?.que === "foto" ? seleccion.capitulo : fotoAMano;

  /* ══════════════════════════════════════════════════════════════════════════
     LAS RECETAS SE MUESTRAN SEGUIDAS Y SE GUARDAN AGRUPADAS
     ══════════════════════════════════════════════════════════════════════════

     Lo guardado va por secciones —cada grupo es una llamada al modelo ya
     cobrada— pero para quien corrige eso no significa nada: ve una receta atrás
     de otra, numeradas del 1 al 30, que es como salen en el archivo.

     Así que acá se aplana para mostrar y se vuelve a agrupar para guardar,
     respetando exactamente los mismos tamaños de grupo. Cambiarlos rompería la
     cuenta de "¿está completo?" del otro lado. */
  const planas = recetas.flat();
  const tamanos = recetas.map((g) => g.length);

  const volverAAgrupar = (lista: Receta[]): Receta[][] => {
    const grupos: Receta[][] = [];
    let desde = 0;
    for (const cuantas of tamanos) {
      grupos.push(lista.slice(desde, desde + cuantas));
      desde += cuantas;
    }
    return grupos;
  };

  const cambiarReceta = (i: number, cambio: Partial<Receta>) =>
    onRecetas(volverAAgrupar(planas.map((r, j) => (j === i ? { ...r, ...cambio } : r))));

  const cambiarFoto = (i: number, cambio: Partial<FotoDelCapitulo>) =>
    onFotos(fotos.map((f, j) => (j === i ? { ...f, ...cambio } : f)));

  /* La misma revisión que hace el servidor, con el mismo mensaje. */
  const revision = revisarRecetas({ recetas }, { grupos: guardadas });
  const falta = revision.ok ? null : revision.error;

  const cambiado =
    revision.ok
    && (otrosCambios || JSON.stringify(revision.grupos) !== JSON.stringify(guardadas));

  useEffect(() => { onCambio(cambiado); }, [cambiado, onCambio]);
  useEffect(() => () => onCambio(false), [onCambio]);

  /* Y la pantalla va hasta lo que se tocó del otro lado. Igual que en el editor
     del texto: se buscan por `id` y no con refs guardadas. */
  useEffect(() => {
    const cual = deQueCapitulo(seleccion);
    if (cual === null || !seleccion) return;
    const id = requestAnimationFrame(() => {
      if (seleccion.que === "titulo") {
        const campo = document.getElementById(`receta-titulo-${cual}`) as HTMLTextAreaElement | null;
        if (campo && document.activeElement !== campo) {
          campo.focus({ preventScroll: true });
          campo.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
      }
      document.getElementById(`renglon-receta-${cual}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [seleccion]);

  /* ⚠️ Abrir una receta no puede mover la pantalla: se mide dónde estaba el
     renglón y se corre la página lo mismo que se movió. El porqué largo está en
     `EbookTexto`, donde se encontró. */
  const abrirReceta = (i: number) => {
    const renglon = document.getElementById(`renglon-receta-${i}`);
    const antes = renglon?.getBoundingClientRect().top ?? null;
    onSeleccion?.(null);
    setAbiertaAMano(abierta === i ? null : i);
    if (antes === null) return;
    requestAnimationFrame(() => {
      const despues = document.getElementById(`renglon-receta-${i}`)?.getBoundingClientRect().top;
      if (despues !== undefined) window.scrollBy(0, despues - antes);
    });
  };

  const campo =
    "border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 rounded-lg px-3 py-2 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60";
  const chico =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 panel-oscuro:border-gray-700 text-gray-500 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const rotulo =
    "block text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500";

  return (
    <>
      <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
        Estas son las recetas tal como salieron. Corregí lo que quieras —{" "}
        <strong>no gasta ninguna generación</strong>: acá no vuelve a escribir la IA, lo
        cambiás vos.
      </p>

      <p className="mt-1.5 hidden text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400 lg:block">
        ¿Buscás algo que viste en la hoja de al lado? Tocalo ahí y te lo abro acá.
      </p>

      <ul className="mt-4 space-y-2">
        {planas.map((r, i) => {
          const abiertaEsta = abierta === i;
          return (
            <li
              key={i}
              className={`rounded-xl border overflow-hidden transition-colors ${
                abiertaEsta
                  ? "border-orange-200 panel-oscuro:border-orange-500/30 bg-white panel-oscuro:bg-gray-900 ring-1 ring-orange-200 panel-oscuro:ring-orange-500/20"
                  : "border-gray-200 panel-oscuro:border-gray-700"
              }`}
            >
              <div id={`renglon-receta-${i}`}>
                <button
                  type="button"
                  onClick={() => abrirReceta(i)}
                  aria-expanded={abiertaEsta}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    abiertaEsta
                      ? "bg-orange-50/60 panel-oscuro:bg-orange-500/5"
                      : "hover:bg-gray-50 panel-oscuro:hover:bg-gray-800/60"
                  }`}
                >
                  <span
                    className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
                      abiertaEsta
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold leading-snug text-gray-900 panel-oscuro:text-gray-100 break-words">
                      {r.titulo || "Sin título"}
                    </span>
                    <span className="block text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                      {r.ingredientes.length} {r.ingredientes.length === 1 ? "ingrediente" : "ingredientes"}
                      {" · "}
                      {r.pasos.length} {r.pasos.length === 1 ? "paso" : "pasos"}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abiertaEsta ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {abiertaEsta && (
                <div className="border-t border-gray-100 panel-oscuro:border-gray-800 px-3 py-3">
                  <label htmlFor={`receta-titulo-${i}`} className={rotulo}>
                    Título de la receta
                  </label>
                  <CampoAuto
                    id={`receta-titulo-${i}`}
                    value={r.titulo}
                    onChange={(v) => cambiarReceta(i, { titulo: v.slice(0, LARGO_TITULO_CAPITULO) })}
                    maxLength={LARGO_TITULO_CAPITULO}
                    disabled={guardando}
                    placeholder="Título de la receta"
                    estilo={campo}
                    className={`mt-1.5 font-bold ${
                      mismoPedazo(seleccion, { que: "titulo", capitulo: i }) ? "ring-2 ring-orange-400" : ""
                    }`}
                  />

                  <label htmlFor={`receta-bajada-${i}`} className={`${rotulo} mt-3`}>
                    La bajada
                  </label>
                  <CampoAuto
                    id={`receta-bajada-${i}`}
                    value={r.descripcion}
                    onChange={(v) => cambiarReceta(i, { descripcion: v.slice(0, LARGO_DESCRIPCION_RECETA) })}
                    maxLength={LARGO_DESCRIPCION_RECETA}
                    disabled={guardando}
                    placeholder="Una línea abajo del título"
                    estilo={campo}
                    className="mt-1.5"
                  />

                  {/* ── La foto ─────────────────────────────────────────── */}
                  {fotoAbierta === i ? (
                    <div className="mt-3">
                      <ElegirFoto
                        frase={fotos[i]?.frase ?? ""}
                        elegida={fotos[i]?.elegida ?? null}
                        deQue={`la receta ${i + 1}`}
                        disabled={guardando}
                        onFrase={(frase) => cambiarFoto(i, { frase })}
                        onElegida={(elegida) => cambiarFoto(i, { elegida })}
                        onCerrar={() => { setFotoAMano(null); onSeleccion?.(null); }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFotoAMano(i)}
                      disabled={guardando}
                      className="mt-3 flex w-full items-center gap-2.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 p-2 text-left hover:bg-gray-50 panel-oscuro:hover:bg-gray-800/60 transition-colors disabled:opacity-50"
                    >
                      {fotos[i]?.elegida ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={fotos[i].elegida.url} alt="" className="h-9 w-12 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="inline-flex h-9 w-12 shrink-0 items-center justify-center rounded bg-gray-100 panel-oscuro:bg-gray-800 text-gray-400">
                          <ImageIcon className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11.5px] font-bold text-gray-700 panel-oscuro:text-gray-300">
                          {fotos[i]?.elegida ? "Foto elegida" : "Foto automática"}
                        </span>
                        <span className="block truncate text-[11px] text-gray-500 panel-oscuro:text-gray-400">
                          {fotos[i]?.elegida
                            ? `De ${fotos[i].elegida.fotografo}`
                            : fotos[i]?.frase
                              ? `Se busca “${fotos[i].frase}”`
                              : "Se busca con el título de la receta"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11.5px] font-bold text-orange-700 panel-oscuro:text-orange-300">
                        Cambiar
                      </span>
                    </button>
                  )}

                  {/* ── Las tres fichas ─────────────────────────────────
                      Cortas a propósito: en el archivo van en una ficha de
                      ancho fijo arriba de todo. "Rinde 12 porciones grandes,
                      aunque depende del molde" no entra. */}
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {([
                      ["rinde", "Rinde", "12 porciones"],
                      ["tiempo", "Tiempo", "45 minutos"],
                      ["coccion", "Cocción", "165 °C"],
                    ] as const).map(([clave, nombre, ejemplo]) => (
                      <div key={clave}>
                        <label htmlFor={`receta-${clave}-${i}`} className={rotulo}>{nombre}</label>
                        <CampoAuto
                          id={`receta-${clave}-${i}`}
                          value={r[clave]}
                          onChange={(v) => cambiarReceta(i, { [clave]: v.slice(0, LARGO_CAMPO_CORTO) })}
                          maxLength={LARGO_CAMPO_CORTO}
                          disabled={guardando}
                          placeholder={ejemplo}
                          estilo={campo}
                          className="mt-1.5"
                        />
                      </div>
                    ))}
                  </div>

                  <Ingredientes
                    receta={r}
                    guardando={guardando}
                    campo={campo}
                    chico={chico}
                    rotulo={rotulo}
                    onCambio={(ingredientes) => cambiarReceta(i, { ingredientes })}
                    id={i}
                  />

                  <Pasos
                    receta={r}
                    guardando={guardando}
                    campo={campo}
                    chico={chico}
                    rotulo={rotulo}
                    onCambio={(pasos) => cambiarReceta(i, { pasos })}
                    id={i}
                  />

                  <label htmlFor={`receta-tip-${i}`} className={`${rotulo} mt-4`}>
                    El consejo <span className="font-normal normal-case">(opcional)</span>
                  </label>
                  <CampoAuto
                    id={`receta-tip-${i}`}
                    value={r.tip}
                    onChange={(v) => cambiarReceta(i, { tip: v.slice(0, LARGO_TIP) })}
                    maxLength={LARGO_TIP}
                    disabled={guardando}
                    placeholder="Lo que se aprende haciéndola dos veces"
                    estilo={campo}
                    className="mt-1.5"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 panel-oscuro:bg-red-500/10 px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-[12.5px] leading-relaxed text-red-800 panel-oscuro:text-red-300">{error}</p>
        </div>
      )}

      {falta && (
        <p className="mt-3 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
          {falta}
        </p>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
        Al guardar se rehace el PDF con los cambios, y ése es el que se entrega. Tarda unos
        segundos y no gasta ninguna generación.
      </p>

      <button
        onClick={() => revision.ok && onGuardar(revision.grupos)}
        disabled={guardando || !revision.ok || !cambiado}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {guardando ? "Guardando y rehaciendo el PDF…" : "Guardar y rehacer el PDF"}
      </button>

      <button
        onClick={onVolver}
        disabled={guardando}
        className="mt-2 w-full rounded-xl border border-gray-200 panel-oscuro:border-gray-700 px-4 py-2.5 text-[13px] font-bold text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {cambiado ? "Volver sin guardar" : "Volver"}
      </button>
    </>
  );
}

/**
 * Los ingredientes: nombre y cantidad, en dos columnas.
 *
 * ⚠️ Son dos campos y no uno con "500 g de harina" adentro, porque el molde los
 * dibuja en dos columnas con la cantidad alineada a la derecha. De un solo campo
 * eso no se puede volver a separar sin adivinar dónde termina el número.
 */
function Ingredientes({
  receta, guardando, campo, chico, rotulo, onCambio, id,
}: {
  receta: Receta;
  guardando: boolean;
  campo: string;
  chico: string;
  rotulo: string;
  onCambio: (ingredientes: Ingrediente[]) => void;
  id: number;
}) {
  const lista = receta.ingredientes;
  /* ⚠️ Con menos de dos, el lector tira la receta ENTERA. Se apaga el botón en
     vez de dejar borrar y avisar después. Ver `recetario-texto`. */
  const sePuedeBorrar = lista.length > INGREDIENTES_MIN;

  return (
    <div className="mt-4">
      <p className={rotulo}>
        Ingredientes <span className="font-normal normal-case">({lista.length} de {INGREDIENTES_MAX})</span>
      </p>

      <ul className="mt-1.5 space-y-1.5">
        {lista.map((ing, k) => (
          <li key={k} className="flex items-start gap-1.5">
            <CampoAuto
              value={ing.nombre}
              onChange={(v) => onCambio(lista.map((x, j) => (j === k ? { ...x, nombre: v.slice(0, LARGO_CAMPO_CORTO) } : x)))}
              maxLength={LARGO_CAMPO_CORTO}
              disabled={guardando}
              ariaLabel={`Ingrediente ${k + 1} de la receta ${id + 1}`}
              placeholder="harina"
              estilo={campo}
              className="flex-1"
            />
            {/* La cantidad puede quedar vacía: "sal a gusto" no lleva número. */}
            <CampoAuto
              value={ing.cantidad}
              onChange={(v) => onCambio(lista.map((x, j) => (j === k ? { ...x, cantidad: v.slice(0, LARGO_CAMPO_CORTO) } : x)))}
              maxLength={LARGO_CAMPO_CORTO}
              disabled={guardando}
              ariaLabel={`Cantidad del ingrediente ${k + 1} de la receta ${id + 1}`}
              placeholder="500 g"
              estilo={campo}
              className="w-24 shrink-0"
            />
            <button
              type="button"
              onClick={() => onCambio(lista.filter((_, j) => j !== k))}
              disabled={guardando || !sePuedeBorrar}
              title={sePuedeBorrar ? undefined : `Una receta necesita al menos ${INGREDIENTES_MIN} ingredientes.`}
              aria-label={`Borrar el ingrediente ${k + 1}`}
              className={`${chico} mt-1 hover:text-red-600`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {lista.length < INGREDIENTES_MAX && (
        <button
          type="button"
          onClick={() => onCambio([...lista, { nombre: "", cantidad: "" }])}
          disabled={guardando}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 panel-oscuro:border-gray-700 px-4 py-2 text-[12px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar un ingrediente
        </button>
      )}
    </div>
  );
}

/**
 * Los pasos: un título corto opcional y el texto.
 *
 * ⚠️ El orden importa más que en cualquier otro lado de este panel —son
 * instrucciones— así que se pueden mover. Y el tope de ocho no es capricho: cada
 * receta ocupa UNA hoja, y una hoja no es elástica. Ver `PASOS_MAX`.
 */
function Pasos({
  receta, guardando, campo, chico, rotulo, onCambio, id,
}: {
  receta: Receta;
  guardando: boolean;
  campo: string;
  chico: string;
  rotulo: string;
  onCambio: (pasos: PasoDeReceta[]) => void;
  id: number;
}) {
  const lista = receta.pasos;
  const sePuedeBorrar = lista.length > PASOS_MIN;

  const mover = (k: number, hacia: -1 | 1) => {
    const j = k + hacia;
    if (j < 0 || j >= lista.length) return;
    const copia = [...lista];
    [copia[k], copia[j]] = [copia[j], copia[k]];
    onCambio(copia);
  };

  return (
    <div className="mt-4">
      <p className={rotulo}>
        Preparación <span className="font-normal normal-case">({lista.length} de {PASOS_MAX} pasos)</span>
      </p>

      <ul className="mt-1.5 space-y-2">
        {lista.map((paso, k) => (
          <li key={k} className="rounded-lg bg-gray-50 panel-oscuro:bg-gray-800/40 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white panel-oscuro:bg-gray-950 text-[10.5px] font-bold text-orange-700 panel-oscuro:text-orange-300 border border-gray-200 panel-oscuro:border-gray-700">
                {k + 1}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => mover(k, -1)}
                  disabled={guardando || k === 0}
                  aria-label={`Subir el paso ${k + 1}`}
                  className={chico}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => mover(k, 1)}
                  disabled={guardando || k === lista.length - 1}
                  aria-label={`Bajar el paso ${k + 1}`}
                  className={chico}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onCambio(lista.filter((_, j) => j !== k))}
                  disabled={guardando || !sePuedeBorrar}
                  title={sePuedeBorrar ? undefined : `Una receta necesita al menos ${PASOS_MIN} pasos.`}
                  aria-label={`Borrar el paso ${k + 1}`}
                  className={`${chico} hover:text-red-600`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <CampoAuto
              value={paso.titulo}
              onChange={(v) => onCambio(lista.map((x, j) => (j === k ? { ...x, titulo: v.slice(0, LARGO_CAMPO_CORTO) } : x)))}
              maxLength={LARGO_CAMPO_CORTO}
              disabled={guardando}
              ariaLabel={`Nombre del paso ${k + 1} de la receta ${id + 1}`}
              placeholder="En dos palabras: “Activar la levadura” (opcional)"
              estilo={campo}
              className="mt-2 font-bold"
            />
            <CampoAuto
              value={paso.texto}
              onChange={(v) => onCambio(lista.map((x, j) => (j === k ? { ...x, texto: v.slice(0, LARGO_PASO) } : x)))}
              maxLength={LARGO_PASO}
              disabled={guardando}
              ariaLabel={`Paso ${k + 1} de la receta ${id + 1}`}
              placeholder="Qué hay que hacer"
              estilo={campo}
              className="mt-1.5 leading-relaxed"
            />
          </li>
        ))}
      </ul>

      {lista.length < PASOS_MAX && (
        <button
          type="button"
          onClick={() => onCambio([...lista, { titulo: "", texto: "" }])}
          disabled={guardando}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 panel-oscuro:border-gray-700 px-4 py-2 text-[12px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar un paso
        </button>
      )}
    </div>
  );
}
