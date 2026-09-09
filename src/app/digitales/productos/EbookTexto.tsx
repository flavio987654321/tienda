"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, Check, AlertTriangle,
} from "lucide-react";
import CampoAuto from "@/components/CampoAuto";
import {
  BLOQUES_MIN, BLOQUES_MAX, LARGO_BLOQUE, LARGO_TITULO_CAPITULO,
  TIPOS_DE_BLOQUE,
  type Bloque, type CapituloEscrito,
} from "@/lib/ebook-ia";
/* ⚠️ LA MISMA FUNCIÓN QUE USA EL SERVIDOR PARA DECIDIR SI EL TEXTO ENTRA.
   Igual que en el editor del temario: escribir acá una versión "parecida" de
   las reglas es el camino conocido a que la pantalla habilite el botón y el
   servidor conteste que no. Una regla, un mensaje, las dos puntas. */
import { revisarTexto, COMO_SE_LLAMA_EL_BLOQUE } from "@/lib/ebook-texto";

/**
 * El editor del texto ya escrito.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES EL BOTÓN QUE LE FALTABA A "LEELO ANTES DE PUBLICARLO"
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La ventana del ebook termina diciendo que lo escribió una IA y que quien
 * vende es quien responde por lo que dice. Hasta hoy, quien lo leía y encontraba
 * una macana tenía un solo botón: **Rehacerlo** — que tira el ebook entero y
 * cobra otra generación por arreglar una palabra.
 *
 * Acá se corrige a mano y no cuesta nada: no llama al modelo.
 *
 * ── Por qué se abre de a un capítulo ───────────────────────────────────────
 *
 * Diez capítulos de quince pedazos son ciento cincuenta campos. Todos abiertos
 * a la vez no es una pantalla, es una pared — y en un celular, media hora de
 * dedo para llegar al capítulo 7. Se abre el que se está corrigiendo.
 *
 * ── Por qué los campos son `CampoAuto` y no `<textarea>` a secas ───────────
 *
 * Porque crece con el texto en vez de mostrar una ventanita con barra propia
 * adentro de otra: se ve el párrafo entero, que es lo que hace falta para
 * decidir si está bien escrito. Los saltos de línea se sacan solos, que es
 * justo lo que hace `limpiarTexto` del otro lado — un bloque es un párrafo.
 */
/**
 * ⚠️ EL TEXTO NO VIVE ACÁ ADENTRO, Y ESO ES A PROPÓSITO.
 *
 * Lo tuvo un rato, mientras el editor era una ventanita solo. Ahora al lado hay
 * una **vista previa que se dibuja mientras se escribe**, y para eso el texto
 * tiene que estar arriba: si viviera acá, la previa no se enteraría de nada
 * hasta guardar, que es justo cuando ya no sirve mirarla.
 *
 * Así que esto recibe lo que hay y avisa lo que cambió. `guardados` es lo que
 * está en la base —contra eso se compara para saber si hay algo sin guardar— y
 * `capitulos` es lo que se está escribiendo ahora.
 */
export default function EbookTexto({
  guardados,
  capitulos,
  onCapitulos,
  total,
  guardando,
  error,
  onCambio,
  onGuardar,
  onVolver,
}: {
  /** Lo que está guardado en la base. Es contra lo que se mide si cambió algo. */
  guardados: CapituloEscrito[];
  /** Lo que se está escribiendo ahora. */
  capitulos: CapituloEscrito[];
  onCapitulos: (capitulos: CapituloEscrito[]) => void;
  /** Cuántos capítulos tiene el ebook entero, escritos o no. */
  total: number;
  guardando: boolean;
  error: string | null;
  /** Avisa hacia arriba si hay algo escrito a mano que se perdería al salir. */
  onCambio: (hay: boolean) => void;
  onGuardar: (capitulos: CapituloEscrito[]) => void;
  onVolver: () => void;
}) {
  /* Cuál está abierto. Arranca en el primero: abrir el editor y ver una lista
     de títulos cerrados no dice que adentro hay texto para corregir. */
  const [abierto, setAbierto] = useState<number | null>(0);

  /* La misma revisión que hace el servidor, con el mismo mensaje. */
  const revision = revisarTexto({ capitulos }, { capitulos: guardados });
  const falta = revision.ok ? null : revision.error;

  /* Se compara el resultado LIMADO contra lo guardado: así un espacio de más al
     final no cuenta como un cambio y no dispara un guardado al pedo. */
  const cambiado =
    revision.ok && JSON.stringify(revision.capitulos) !== JSON.stringify(guardados);

  /* Se avisa hacia arriba, que es donde está el botón de salir. Dos efectos y
     no uno: la limpieza del segundo corre SÓLO al desmontarse. */
  useEffect(() => { onCambio(cambiado); }, [cambiado, onCambio]);
  useEffect(() => () => onCambio(false), [onCambio]);

  const cambiarTitulo = (i: number, valor: string) =>
    onCapitulos(capitulos.map((c, j) => (j === i ? { ...c, titulo: valor } : c)));

  const tocarBloques = (i: number, f: (bs: Bloque[]) => Bloque[]) =>
    onCapitulos(capitulos.map((c, j) => (j === i ? { ...c, bloques: f(c.bloques) } : c)));

  const cambiarBloque = (i: number, k: number, campo: "tipo" | "texto", valor: string) =>
    tocarBloques(i, (bs) => bs.map((b, j) => (j === k ? { ...b, [campo]: valor } : b)));

  const borrarBloque = (i: number, k: number) =>
    tocarBloques(i, (bs) => bs.filter((_, j) => j !== k));

  const moverBloque = (i: number, k: number, hacia: -1 | 1) =>
    tocarBloques(i, (bs) => {
      const j = k + hacia;
      if (j < 0 || j >= bs.length) return bs;
      const copia = [...bs];
      [copia[k], copia[j]] = [copia[j], copia[k]];
      return copia;
    });

  const agregarBloque = (i: number) =>
    tocarBloques(i, (bs) =>
      bs.length >= BLOQUES_MAX ? bs : [...bs, { tipo: "parrafo", texto: "" }]);

  const campo =
    "border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-950 rounded-lg px-3 py-2 text-[13px] text-gray-900 panel-oscuro:text-gray-100 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none disabled:opacity-60";
  const chico =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 panel-oscuro:border-gray-700 text-gray-500 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

  /* Cuántos capítulos del ebook están escritos. Si faltan, se dice: alguien que
     entra a corregir tiene que saber que abajo todavía viene más. */
  const faltan = Math.max(0, total - capitulos.length);

  return (
    <>
      <p className="text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
        Este es el texto tal como salió. Corregí lo que quieras —{" "}
        <strong>no gasta ninguna generación</strong>: acá no vuelve a escribir la IA, lo
        cambiás vos.
      </p>

      {faltan > 0 && (
        <p className="mt-2 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
          Están los {capitulos.length} que ya se escribieron. {faltan === 1
            ? "Falta uno todavía"
            : `Faltan ${faltan} todavía`}: cuando se escriba vas a poder corregirlo también.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {capitulos.map((c, i) => {
          const abiertoEste = abierto === i;
          return (
            <li
              key={i}
              className="rounded-xl border border-gray-200 panel-oscuro:border-gray-700 overflow-hidden"
            >
              {/* ── El renglón que abre ─────────────────────────────────── */}
              <button
                type="button"
                onClick={() => setAbierto(abiertoEste ? null : i)}
                aria-expanded={abiertoEste}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 panel-oscuro:hover:bg-gray-800/60 transition-colors"
              >
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 panel-oscuro:bg-gray-800 text-[11px] font-bold text-gray-500 panel-oscuro:text-gray-400">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {/* `break-words` y no `truncate`: el título entero, en los
                      renglones que haga falta. En 360 un título de doce
                      palabras cortado en "Cómo empezar a…" no identifica nada. */}
                  <span className="block text-[13px] font-bold leading-snug text-gray-900 panel-oscuro:text-gray-100 break-words">
                    {c.titulo || "Sin título"}
                  </span>
                  <span className="block text-[11px] text-gray-400 panel-oscuro:text-gray-500">
                    {c.bloques.length} {c.bloques.length === 1 ? "pedazo" : "pedazos"}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abiertoEste ? "rotate-180" : ""}`}
                />
              </button>

              {/* ── El capítulo abierto ─────────────────────────────────── */}
              {abiertoEste && (
                <div className="border-t border-gray-100 panel-oscuro:border-gray-800 px-3 py-3">
                  <label
                    htmlFor={`titulo-capitulo-${i}`}
                    className="block text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500"
                  >
                    Título del capítulo
                  </label>
                  <CampoAuto
                    id={`titulo-capitulo-${i}`}
                    value={c.titulo}
                    onChange={(v) => cambiarTitulo(i, v.slice(0, LARGO_TITULO_CAPITULO))}
                    maxLength={LARGO_TITULO_CAPITULO}
                    disabled={guardando}
                    placeholder="Título del capítulo"
                    estilo={campo}
                    className="mt-1.5 font-bold"
                  />

                  <ul className="mt-3 space-y-2.5">
                    {c.bloques.map((b, k) => (
                      <li
                        key={k}
                        className="rounded-lg bg-gray-50 panel-oscuro:bg-gray-800/40 p-2.5"
                      >
                        {/* `flex-wrap` en el de afuera y no sólo en las
                            fichitas: en 360 los cuatro nombres más los tres
                            botones no entran en un renglón, y sin esto se
                            aplastan hasta que "Subtítulo" sale cortado. Así el
                            grupo de la derecha baja entero a su renglón. */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {/* Qué clase de pedazo es. Botones y no una lista
                              desplegable: son cuatro, y lo que se elige acá
                              cambia cómo sale dibujado en el PDF — se ve mejor
                              cuál está puesto que abriendo un menú. */}
                          <div className="flex flex-wrap gap-1">
                            {TIPOS_DE_BLOQUE.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => cambiarBloque(i, k, "tipo", t)}
                                disabled={guardando}
                                title={COMO_SE_LLAMA_EL_BLOQUE[t].explica}
                                aria-pressed={b.tipo === t}
                                className={`rounded-md px-2 py-1 text-[10.5px] font-bold transition-colors disabled:opacity-50 ${
                                  b.tipo === t
                                    ? "bg-orange-600 text-white"
                                    : "bg-white panel-oscuro:bg-gray-950 text-gray-500 panel-oscuro:text-gray-400 border border-gray-200 panel-oscuro:border-gray-700 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800"
                                }`}
                              >
                                {COMO_SE_LLAMA_EL_BLOQUE[t].nombre}
                              </button>
                            ))}
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moverBloque(i, k, -1)}
                              disabled={guardando || k === 0}
                              aria-label={`Subir el pedazo ${k + 1}`}
                              className={chico}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moverBloque(i, k, 1)}
                              disabled={guardando || k === c.bloques.length - 1}
                              aria-label={`Bajar el pedazo ${k + 1}`}
                              className={chico}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            {/* ⚠️ Se apaga al llegar al mínimo, y no se deja
                                borrar para avisar después: un capítulo por
                                debajo de `BLOQUES_MIN` desaparece al leerlo y
                                corre todos los de abajo. Ver `ebook-texto`. */}
                            <button
                              type="button"
                              onClick={() => borrarBloque(i, k)}
                              disabled={guardando || c.bloques.length <= BLOQUES_MIN}
                              title={
                                c.bloques.length <= BLOQUES_MIN
                                  ? `Un capítulo necesita al menos ${BLOQUES_MIN} pedazos.`
                                  : undefined
                              }
                              aria-label={`Borrar el pedazo ${k + 1}`}
                              className={`${chico} hover:text-red-600`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <CampoAuto
                          value={b.texto}
                          onChange={(v) => cambiarBloque(i, k, "texto", v.slice(0, LARGO_BLOQUE))}
                          maxLength={LARGO_BLOQUE}
                          disabled={guardando}
                          ariaLabel={`${COMO_SE_LLAMA_EL_BLOQUE[b.tipo].nombre} ${k + 1} del capítulo ${i + 1}`}
                          placeholder={COMO_SE_LLAMA_EL_BLOQUE[b.tipo].explica}
                          estilo={campo}
                          className={`mt-2 leading-relaxed ${
                            b.tipo === "subtitulo" ? "font-bold" : ""
                          }`}
                        />
                      </li>
                    ))}
                  </ul>

                  {c.bloques.length < BLOQUES_MAX && (
                    <button
                      type="button"
                      onClick={() => agregarBloque(i)}
                      disabled={guardando}
                      className="mt-2.5 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 panel-oscuro:border-gray-700 px-4 py-2 text-[12px] font-bold text-gray-600 panel-oscuro:text-gray-400 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar un párrafo
                    </button>
                  )}
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

      {/* El motivo por el que el botón está apagado, escrito. Un botón gris sin
          explicación deja a alguien tocándolo sin entender qué le falta. */}
      {falta && (
        <p className="mt-3 rounded-xl bg-amber-50 panel-oscuro:bg-amber-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900 panel-oscuro:text-amber-200">
          {falta}
        </p>
      )}

      {/* ⚠️ Que el archivo se rehace, ANTES de apretar. Guardar el texto no
          cambia el PDF que está colgado del producto: eso lo hace el armado, y
          es lo que va a pasar al tocar el botón. Sin este renglón, alguien
          guarda, cierra, y sigue entregando el ebook de antes sin saberlo. */}
      <p className="mt-3 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
        Al guardar se rehace el PDF con los cambios, y ése es el que se entrega. Tarda unos
        segundos y no gasta ninguna generación.
      </p>

      <button
        onClick={() => revision.ok && onGuardar(revision.capitulos)}
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
