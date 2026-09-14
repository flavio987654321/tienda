"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, Check, AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import CampoAuto from "@/components/CampoAuto";
import {
  PUNTOS_MAX, LARGO_TITULO_LAMINA, LARGO_TEXTO_LAMINA, LARGO_PUNTO,
  type Lamina,
} from "@/lib/ebook-ia";
/* ⚠️ LA MISMA FUNCIÓN QUE USA EL SERVIDOR, por lo mismo que en los otros dos
   editores: una regla, un mensaje, las dos puntas. */
import { revisarLaminas } from "@/lib/infografia-texto";
import { mismoPedazo, deQueCapitulo, type FotoDelCapitulo, type Seleccion } from "@/lib/ebook-texto";
import ElegirFoto from "./ElegirFoto";

/**
 * El editor de las láminas ya escritas.
 *
 * Es el tercer editor —después del de párrafos y del de recetas— y existe por
 * lo mismo: sin él, arreglar una palabra en una infografía cuesta una
 * generación entera. Una lámina son cuatro campos con tope —el título, el
 * texto, hasta tres datos y la foto— y cada uno va con su contador, porque
 * los topes son los del molde: lo que se pase se corta adentro del archivo.
 *
 * ── ⚠️ Lo que más se cuida: que no desaparezca una lámina ──────────────────
 *
 * El lector descarta la lámina ENTERA si se queda sin título o sin texto.
 * Guardar así no falla en ningún lado: se pierde en la próxima lectura, las de
 * abajo se corren un lugar y la infografía que se vendió como de diez entrega
 * nueve. Por eso la revisión que corre acá es exactamente la del servidor.
 * Ver `infografia-texto`.
 */
export default function InfografiaTexto({
  guardadas,
  laminas,
  onLaminas,
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
  guardadas: Lamina[][];
  /** Lo que se está corrigiendo ahora, agrupado igual que lo guardado. */
  laminas: Lamina[][];
  onLaminas: (laminas: Lamina[][]) => void;
  /** La foto de cada lámina, TODAS SEGUIDAS: una lámina es una hoja. */
  fotos: FotoDelCapitulo[];
  onFotos: (fotos: FotoDelCapitulo[]) => void;
  otrosCambios?: boolean;
  seleccion?: Seleccion | null;
  onSeleccion?: (s: Seleccion | null) => void;
  guardando: boolean;
  error: string | null;
  onCambio: (hay: boolean) => void;
  onGuardar: (laminas: Lamina[][]) => void;
  onVolver: () => void;
}) {
  const [abiertaAMano, setAbiertaAMano] = useState<number | null>(0);
  const [fotoAMano, setFotoAMano] = useState<number | null>(null);

  /* Lo que se toca en la previa manda, y se DERIVA en vez de copiarse a un
     estado propio. Ver `RecetarioTexto`. */
  const desdeLaPrevia = deQueCapitulo(seleccion);
  const abierta = desdeLaPrevia ?? abiertaAMano;
  const fotoAbierta = seleccion?.que === "foto" ? seleccion.capitulo : fotoAMano;

  /* Se muestran seguidas y se guardan agrupadas, con los mismos tamaños de
     grupo: cada grupo es una llamada al modelo ya cobrada. Ver `RecetarioTexto`. */
  const planas = laminas.flat();
  const tamanos = laminas.map((g) => g.length);

  const volverAAgrupar = (lista: Lamina[]): Lamina[][] => {
    const grupos: Lamina[][] = [];
    let desde = 0;
    for (const cuantas of tamanos) {
      grupos.push(lista.slice(desde, desde + cuantas));
      desde += cuantas;
    }
    return grupos;
  };

  const cambiarLamina = (i: number, cambio: Partial<Lamina>) =>
    onLaminas(volverAAgrupar(planas.map((l, j) => (j === i ? { ...l, ...cambio } : l))));

  const cambiarFoto = (i: number, cambio: Partial<FotoDelCapitulo>) =>
    onFotos(fotos.map((f, j) => (j === i ? { ...f, ...cambio } : f)));

  /* La misma revisión que hace el servidor, con el mismo mensaje. */
  const revision = revisarLaminas({ laminas }, { grupos: guardadas });
  const falta = revision.ok ? null : revision.error;

  const cambiado =
    revision.ok
    && (otrosCambios || JSON.stringify(revision.grupos) !== JSON.stringify(guardadas));

  useEffect(() => { onCambio(cambiado); }, [cambiado, onCambio]);
  useEffect(() => () => onCambio(false), [onCambio]);

  useEffect(() => {
    const cual = deQueCapitulo(seleccion);
    if (cual === null || !seleccion) return;
    const id = requestAnimationFrame(() => {
      if (seleccion.que === "titulo") {
        const campo = document.getElementById(`lamina-titulo-${cual}`) as HTMLTextAreaElement | null;
        if (campo && document.activeElement !== campo) {
          campo.focus({ preventScroll: true });
          campo.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
      }
      document.getElementById(`renglon-lamina-${cual}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [seleccion]);

  /* Abrir una lámina no puede mover la pantalla. Ver `EbookTexto`. */
  const abrirLamina = (i: number) => {
    const renglon = document.getElementById(`renglon-lamina-${i}`);
    const antes = renglon?.getBoundingClientRect().top ?? null;
    onSeleccion?.(null);
    setAbiertaAMano(abierta === i ? null : i);
    if (antes === null) return;
    requestAnimationFrame(() => {
      const despues = document.getElementById(`renglon-lamina-${i}`)?.getBoundingClientRect().top;
      if (despues !== undefined) window.scrollBy(0, despues - antes);
    });
  };

  const campo =
    "border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 rounded-lg px-3 py-2 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60";
  const chico =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 panel-oscuro:border-gray-700 text-gray-500 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";
  const rotulo =
    "block text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500";
  /* El contador de cada campo. Los topes son del molde y no perdonan: lo que
     se pase se corta en el archivo, así que se ve cuánto queda. */
  const contador = (largo: number, tope: number) => (
    <span className={`font-normal normal-case tabular-nums ${largo >= tope ? "text-amber-600" : ""}`}>
      {largo}/{tope}
    </span>
  );

  return (
    <>
      <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
        Estas son las láminas tal como salieron. Corregí lo que quieras —{" "}
        <strong>no gasta ninguna generación</strong>: acá no vuelve a escribir la IA, lo
        cambiás vos.
      </p>

      <p className="mt-1.5 hidden text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400 lg:block">
        ¿Buscás algo que viste en la hoja de al lado? Tocalo ahí y te lo abro acá.
      </p>

      <ul className="mt-4 space-y-2">
        {planas.map((l, i) => {
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
              <div id={`renglon-lamina-${i}`}>
                <button
                  type="button"
                  onClick={() => abrirLamina(i)}
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
                      {l.titulo || "Sin título"}
                    </span>
                    <span className="block text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                      {l.puntos.length === 0
                        ? "Sin datos"
                        : `${l.puntos.length} ${l.puntos.length === 1 ? "dato" : "datos"}`}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abiertaEsta ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {abiertaEsta && (
                <div className="border-t border-gray-100 panel-oscuro:border-gray-800 px-3 py-3">
                  <label htmlFor={`lamina-titulo-${i}`} className={`${rotulo} flex justify-between`}>
                    <span>La idea, en una frase</span>
                    {contador(l.titulo.length, LARGO_TITULO_LAMINA)}
                  </label>
                  <CampoAuto
                    id={`lamina-titulo-${i}`}
                    value={l.titulo}
                    onChange={(v) => cambiarLamina(i, { titulo: v.slice(0, LARGO_TITULO_LAMINA) })}
                    maxLength={LARGO_TITULO_LAMINA}
                    disabled={guardando}
                    placeholder="Regar de noche es un error"
                    estilo={campo}
                    className={`mt-1.5 font-bold ${
                      mismoPedazo(seleccion, { que: "titulo", capitulo: i }) ? "ring-2 ring-orange-400" : ""
                    }`}
                  />

                  <label htmlFor={`lamina-texto-${i}`} className={`${rotulo} mt-3 flex justify-between`}>
                    <span>El texto</span>
                    {contador(l.texto.length, LARGO_TEXTO_LAMINA)}
                  </label>
                  <CampoAuto
                    id={`lamina-texto-${i}`}
                    value={l.texto}
                    onChange={(v) => cambiarLamina(i, { texto: v.slice(0, LARGO_TEXTO_LAMINA) })}
                    maxLength={LARGO_TEXTO_LAMINA}
                    disabled={guardando}
                    placeholder="Dos o tres frases: por qué, y qué hacer"
                    estilo={campo}
                    className={`mt-1.5 leading-relaxed ${
                      mismoPedazo(seleccion, { que: "bloque", capitulo: i, bloque: 0 }) ? "ring-2 ring-orange-400" : ""
                    }`}
                  />

                  {/* ── La foto ─────────────────────────────────────────── */}
                  {fotoAbierta === i ? (
                    <div className="mt-3">
                      <ElegirFoto
                        frase={fotos[i]?.frase ?? ""}
                        elegida={fotos[i]?.elegida ?? null}
                        deQue={`la lámina ${i + 1}`}
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
                              : "Se busca con el título de la lámina"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11.5px] font-bold text-orange-700 panel-oscuro:text-orange-300">
                        Cambiar
                      </span>
                    </button>
                  )}

                  <Datos
                    lamina={l}
                    guardando={guardando}
                    campo={campo}
                    chico={chico}
                    rotulo={rotulo}
                    contador={contador}
                    onCambio={(puntos) => cambiarLamina(i, { puntos })}
                    id={i}
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
 * Los datos cortos de abajo: hasta tres, de una línea, y se pueden mover.
 *
 * Pueden no haber ninguno —el lector no descarta una lámina sin datos— así que
 * el botón de borrar no se apaga nunca. Lo que sí se cuida es el tope de tres:
 * la hoja no es elástica.
 */
function Datos({
  lamina, guardando, campo, chico, rotulo, contador, onCambio, id,
}: {
  lamina: Lamina;
  guardando: boolean;
  campo: string;
  chico: string;
  rotulo: string;
  contador: (largo: number, tope: number) => React.ReactNode;
  onCambio: (puntos: string[]) => void;
  id: number;
}) {
  const lista = lamina.puntos;

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
        Datos cortos{" "}
        <span className="font-normal normal-case">({lista.length} de {PUNTOS_MAX}, opcionales)</span>
      </p>

      {lista.length > 0 && (
        <ul className="mt-1.5 space-y-2">
          {lista.map((punto, k) => (
            <li key={k} className="rounded-lg bg-gray-50 panel-oscuro:bg-gray-800/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`${rotulo} normal-case`}>
                  {contador(punto.length, LARGO_PUNTO)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => mover(k, -1)}
                    disabled={guardando || k === 0}
                    aria-label={`Subir el dato ${k + 1}`}
                    className={chico}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(k, 1)}
                    disabled={guardando || k === lista.length - 1}
                    aria-label={`Bajar el dato ${k + 1}`}
                    className={chico}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCambio(lista.filter((_, j) => j !== k))}
                    disabled={guardando}
                    aria-label={`Borrar el dato ${k + 1}`}
                    className={`${chico} hover:text-red-600`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <CampoAuto
                value={punto}
                onChange={(v) => onCambio(lista.map((x, j) => (j === k ? v.slice(0, LARGO_PUNTO) : x)))}
                maxLength={LARGO_PUNTO}
                disabled={guardando}
                ariaLabel={`Dato ${k + 1} de la lámina ${id + 1}`}
                placeholder="Un ejemplo, un sí / no, un número que salga de la idea"
                estilo={campo}
                className="mt-2"
              />
            </li>
          ))}
        </ul>
      )}

      {lista.length < PUNTOS_MAX && (
        <button
          type="button"
          onClick={() => onCambio([...lista, ""])}
          disabled={guardando}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 panel-oscuro:border-gray-700 px-4 py-2 text-[12px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar un dato
        </button>
      )}
    </div>
  );
}
