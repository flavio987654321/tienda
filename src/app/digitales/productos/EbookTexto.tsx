"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, Check, AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import CampoAuto from "@/components/CampoAuto";
import {
  BLOQUES_MIN, BLOQUES_MAX, LARGO_BLOQUE, LARGO_TITULO_CAPITULO,
  TIPOS_DE_BLOQUE,
  type Bloque, type CapituloEscrito, type TipoDeBloque,
} from "@/lib/ebook-ia";
/* ⚠️ LA MISMA FUNCIÓN QUE USA EL SERVIDOR PARA DECIDIR SI EL TEXTO ENTRA.
   Igual que en el editor del temario: escribir acá una versión "parecida" de
   las reglas es el camino conocido a que la pantalla habilite el botón y el
   servidor conteste que no. Una regla, un mensaje, las dos puntas. */
import {
  revisarTexto, COMO_SE_LLAMA_EL_BLOQUE, mismoPedazo, deQueCapitulo,
  type FotoDelCapitulo, type Seleccion,
} from "@/lib/ebook-texto";
import ElegirFoto from "./ElegirFoto";

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
  fotos,
  onFotos,
  otrosCambios = false,
  seleccion = null,
  onSeleccion,
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
  /**
   * La foto de cada capítulo: con qué buscarla y cuál se eligió.
   *
   * ⚠️ Viene de arriba y no de acá adentro por lo mismo que el texto: la vista
   * previa de al lado tiene que ver la foto elegida apenas se elige. Y es más
   * larga que `capitulos` cuando faltan capítulos por escribir — hay una por
   * entrada del temario, escrita o no.
   */
  fotos: FotoDelCapitulo[];
  onFotos: (fotos: FotoDelCapitulo[]) => void;
  /**
   * Si cambió algo que no es el texto —una foto, la tapa—.
   *
   * ⚠️ Sin esto el botón de guardar medía SÓLO el texto, así que cambiar una
   * foto y apretar no hacía nada: el botón estaba apagado y no decía por qué.
   */
  otrosCambios?: boolean;
  /**
   * Qué pedazo se está mirando.
   *
   * ⚠️ Manda sobre qué capítulo está abierto. Se toca un párrafo en la vista
   * previa de al lado y este editor abre ese capítulo y lleva el cursor a ese
   * campo — que es la única forma de encontrar rápido lo que se quiere corregir
   * cuando hay diez capítulos de quince pedazos. Ver `Seleccion`.
   */
  seleccion?: Seleccion | null;
  /** Al revés: al escribir en un campo, se marca en la previa. */
  onSeleccion?: (s: Seleccion | null) => void;
  /** Cuántos capítulos tiene el ebook entero, escritos o no. */
  total: number;
  guardando: boolean;
  error: string | null;
  /** Avisa hacia arriba si hay algo escrito a mano que se perdería al salir. */
  onCambio: (hay: boolean) => void;
  onGuardar: (capitulos: CapituloEscrito[]) => void;
  onVolver: () => void;
}) {
  /* Cuál abrió la persona a mano. Arranca en el primero: abrir el editor y ver
     una lista de títulos cerrados no dice que adentro hay texto para corregir. */
  const [abiertoAMano, setAbiertoAMano] = useState<number | null>(0);
  /* Y en cuál abrió el elegidor de foto. Uno solo por vez: son quince
     miniaturas cada uno, y diez abiertos es una pared de fotos. */
  const [fotoAMano, setFotoAMano] = useState<number | null>(null);

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ LO QUE SE TOCÓ EN LA PREVIA MANDA, Y SE DERIVA — NO SE COPIA
     ══════════════════════════════════════════════════════════════════════════

     La primera versión guardaba el capítulo abierto en su propio estado y lo
     sincronizaba con un efecto al llegar una selección. Eso son dos verdades
     para el mismo hecho: una tarde cualquiera quedan distintas, y además React
     avisa —con razón— que actualizar estado adentro de un efecto encadena
     dibujos al pedo.

     Así que hay UN dato de esta pantalla —cuál abrió la persona a mano— y el
     que llega de afuera lo pisa mientras exista. Cerrar un capítulo a mano
     apaga la selección, que es lo que hace que el capítulo se pueda cerrar. */
  const desdeLaPrevia = deQueCapitulo(seleccion);
  const abierto = desdeLaPrevia ?? abiertoAMano;
  const fotoAbierta = seleccion?.que === "foto" ? seleccion.capitulo : fotoAMano;

  /* ══════════════════════════════════════════════════════════════════════════
     Y LA PANTALLA VA HASTA AHÍ
     ══════════════════════════════════════════════════════════════════════════

     Abrir el capítulo no alcanza: si está a tres pantallas de distancia, tocar
     algo en la previa no muestra nada. Se lleva la vista hasta el campo y el
     cursor adentro, listo para escribir.

     ⚠️ Se buscan por `id` y no con refs guardadas: leer una ref mientras se
     dibuja es justo lo que React pide no hacer, y acá alcanza con pedírselos al
     navegador cuando ya están puestos.

     ⚠️ `preventScroll` en el foco, y el desplazamiento aparte: el navegador, al
     enfocar, lleva el campo al borde de la pantalla de un salto. Yendo por
     `scrollIntoView` con `block: "center"` queda en el medio, que es donde uno
     lo está buscando. */
  useEffect(() => {
    const cual = deQueCapitulo(seleccion);
    if (cual === null || !seleccion) return;

    /* Un cuadro después: el capítulo se acaba de abrir y el campo todavía no
       existe cuando este efecto corre. */
    const id = requestAnimationFrame(() => {
      if (seleccion.que === "bloque") {
        const campo = document.getElementById(
          `pedazo-${seleccion.capitulo}-${seleccion.bloque}`,
        ) as HTMLTextAreaElement | null;
        if (campo) {
          /* ⚠️ SI EL CAMPO YA TIENE EL CURSOR, NO SE TOCA NADA.

             Esta selección se enciende de dos lados: tocando la hoja de la
             derecha, y también al pararse en un campo de acá —que es lo que la
             marca del otro lado—. Sin esta línea, hacer clic en un campo para
             escribir movía la pantalla sola para centrarlo: uno va a corregir
             una palabra y el texto se le corre abajo del mouse.

             Mover la vista sirve cuando el campo está en otro lado; si ya se
             está escribiendo adentro, es una molestia. */
          if (document.activeElement === campo) return;
          campo.focus({ preventScroll: true });
          campo.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
      }
      document.getElementById(`renglon-capitulo-${cual}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [seleccion]);

  const cambiarFoto = (i: number, cambio: Partial<FotoDelCapitulo>) =>
    onFotos(fotos.map((f, j) => (j === i ? { ...f, ...cambio } : f)));

  /* La misma revisión que hace el servidor, con el mismo mensaje. */
  const revision = revisarTexto({ capitulos }, { capitulos: guardados });
  const falta = revision.ok ? null : revision.error;

  /* Se compara el resultado LIMADO contra lo guardado: así un espacio de más al
     final no cuenta como un cambio y no dispara un guardado al pedo. */
  const cambiado =
    revision.ok
    && (otrosCambios
      || JSON.stringify(revision.capitulos) !== JSON.stringify(guardados));

  /* Se avisa hacia arriba, que es donde está el botón de salir. Dos efectos y
     no uno: la limpieza del segundo corre SÓLO al desmontarse. */
  useEffect(() => { onCambio(cambiado); }, [cambiado, onCambio]);
  useEffect(() => () => onCambio(false), [onCambio]);

  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ ABRIR UN CAPÍTULO NO PUEDE MOVER LA PANTALLA
     ══════════════════════════════════════════════════════════════════════════

     Abriendo el 3 con el 1 abierto pasaban dos cosas juntas: el 1 se cerraba
     —o sea, desaparecían de golpe quince campos de ARRIBA— y el 3 se abría. El
     renglón que se acababa de apretar saltaba media pantalla para arriba y
     quedaba el contenido de otro capítulo abajo del mouse. Se sentía como si la
     pantalla se hubiera roto.

     El arreglo no es una animación: es medir dónde estaba el renglón antes de
     tocar nada, y después de que el navegador reacomodó todo, correr la página
     lo mismo que se movió. El renglón queda quieto y lo que se mueve es lo de
     alrededor, que es lo que de verdad cambió.
  */
  const abrirCapitulo = (i: number) => {
    const renglon = document.getElementById(`renglon-capitulo-${i}`);
    const antes = renglon?.getBoundingClientRect().top ?? null;

    /* ⚠️ Se apaga la selección, y no es un detalle: mientras exista, ella manda
       sobre qué capítulo está abierto (ver arriba), así que sin esto un capítulo
       abierto desde la previa no se podría cerrar a mano — se volvería a abrir
       solo y parecería que el botón está roto. */
    onSeleccion?.(null);
    setAbiertoAMano(abierto === i ? null : i);

    if (antes === null) return;
    requestAnimationFrame(() => {
      const despues = document.getElementById(`renglon-capitulo-${i}`)?.getBoundingClientRect().top;
      if (despues !== undefined) window.scrollBy(0, despues - antes);
    });
  };

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

      {/* ⚠️ Que se puede tocar del otro lado, dicho. Es lo que más ayuda con un
          ebook largo y no se descubre solo: nadie prueba a hacerle clic a una
          vista previa. Sólo en pantalla ancha — en el celular las dos columnas
          son solapas y "el de al lado" no existe. */}
      <p className="mt-1.5 hidden text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400 lg:block">
        ¿Buscás algo que viste en la hoja de al lado? Tocalo ahí y te lo abro acá.
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
              /* ⚠️ EL CAPÍTULO ABIERTO SE TIENE QUE VER DISTINTO, no sólo estar
                 abierto. Con todos los renglones iguales, abrir uno y después
                 otro se leía como una sola lista larga y no como "estoy adentro
                 de este". El anillo y el fondo blanco lo separan del resto. */
              className={`rounded-xl border overflow-hidden transition-colors ${
                abiertoEste
                  ? "border-orange-200 panel-oscuro:border-orange-500/30 bg-white panel-oscuro:bg-gray-900 ring-1 ring-orange-200 panel-oscuro:ring-orange-500/20"
                  : "border-gray-200 panel-oscuro:border-gray-700"
              }`}
            >
              {/* ── El renglón que abre ─────────────────────────────────── */}
              <div id={`renglon-capitulo-${i}`}>
                <button
                  type="button"
                  onClick={() => abrirCapitulo(i)}
                  aria-expanded={abiertoEste}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    abiertoEste
                      ? "bg-orange-50/60 panel-oscuro:bg-orange-500/5"
                      : "hover:bg-gray-50 panel-oscuro:hover:bg-gray-800/60"
                  }`}
                >
                  <span
                    className={`shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
                      abiertoEste
                        ? "bg-orange-600 text-white"
                        : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400"
                    }`}
                  >
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
              </div>

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
                    className={`mt-1.5 font-bold ${
                      mismoPedazo(seleccion, { que: "titulo", capitulo: i })
                        ? "ring-2 ring-orange-400"
                        : ""
                    }`}
                  />
                  <Cuenta largo={c.titulo.length} tope={LARGO_TITULO_CAPITULO} />

                  {/* ── La foto del capítulo ─────────────────────────────
                      Va ACÁ arriba, pegada al título, y no al final: en el PDF
                      la foto abre el capítulo —una banda de 350 puntos con el
                      número encima— así que es lo primero que se ve de este
                      capítulo, y tiene que ser lo primero que se pueda tocar. */}
                  {fotoAbierta === i ? (
                    <div className="mt-3">
                      <ElegirFoto
                        frase={fotos[i]?.frase ?? ""}
                        elegida={fotos[i]?.elegida ?? null}
                        deQue={`el capítulo ${i + 1}`}
                        disabled={guardando}
                        onFrase={(frase) => cambiarFoto(i, { frase })}
                        onElegida={(elegida) => cambiarFoto(i, { elegida })}
                        onCerrar={() => {
                          setFotoAMano(null);
                          onSeleccion?.(null);
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFotoAMano(i)}
                      disabled={guardando}
                      className="mt-2.5 flex w-full items-center gap-2.5 rounded-lg border border-gray-200 panel-oscuro:border-gray-700 p-2 text-left hover:bg-gray-50 panel-oscuro:hover:bg-gray-800/60 transition-colors disabled:opacity-50"
                    >
                      {fotos[i]?.elegida ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={fotos[i].elegida.url}
                          alt=""
                          className="h-9 w-12 shrink-0 rounded object-cover"
                        />
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
                              : "Se busca con el título del capítulo"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11.5px] font-bold text-orange-700 panel-oscuro:text-orange-300">
                        Cambiar
                      </span>
                    </button>
                  )}

                  {/* ══════════════════════════════════════════════════════
                      LOS PEDAZOS
                      ══════════════════════════════════════════════════════

                      ⚠️ ANTES CADA UNO MOSTRABA TODO SIEMPRE: los cuatro
                      nombres de tipo, los dos botones de mover y el de borrar,
                      arriba de cada campo. Quince pedazos daban ciento cinco
                      controles apilados, todos del mismo tamaño y del mismo
                      color, y el texto —que es lo único que se viene a
                      corregir— quedaba como un renglón más entre botones.

                      Ahora el que se está tocando muestra sus herramientas y el
                      resto muestra su nombre y su texto. Es la misma idea que
                      abrir de a un capítulo, un escalón más abajo. */}
                  <ul className="mt-3 space-y-2">
                    {c.bloques.map((b, k) => {
                      const marcado = mismoPedazo(seleccion, { que: "bloque", capitulo: i, bloque: k });
                      return (
                        <li
                          key={k}
                          className={`rounded-lg border transition-colors ${
                            marcado
                              ? "border-orange-300 panel-oscuro:border-orange-500/40 bg-orange-50/50 panel-oscuro:bg-orange-500/5"
                              : "border-transparent bg-gray-50 panel-oscuro:bg-gray-800/40"
                          } p-2.5`}
                        >
                          {/* `flex-wrap` en el de afuera y no sólo en las
                              fichitas: en 360 los cuatro nombres más los tres
                              botones no entran en un renglón, y sin esto se
                              aplastan hasta que "Subtítulo" sale cortado. Así el
                              grupo de la derecha baja entero a su renglón. */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Qué clase de pedazo es. Cerrado es una etiqueta
                                que se lee; abierto son los cuatro para elegir. */}
                            {marcado ? (
                              <div className="flex flex-wrap gap-1">
                                {TIPOS_DE_BLOQUE.map((tipo) => (
                                  <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => cambiarBloque(i, k, "tipo", tipo)}
                                    disabled={guardando}
                                    title={COMO_SE_LLAMA_EL_BLOQUE[tipo].explica}
                                    aria-pressed={b.tipo === tipo}
                                    className={`rounded-md px-2 py-1 text-[10.5px] font-bold transition-colors disabled:opacity-50 ${
                                      b.tipo === tipo
                                        ? "bg-orange-600 text-white"
                                        : "bg-white panel-oscuro:bg-gray-950 text-gray-500 panel-oscuro:text-gray-400 border border-gray-200 panel-oscuro:border-gray-700 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800"
                                    }`}
                                  >
                                    {COMO_SE_LLAMA_EL_BLOQUE[tipo].nombre}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSeleccion?.({ que: "bloque", capitulo: i, bloque: k })}
                                disabled={guardando}
                                className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500 hover:text-orange-700 panel-oscuro:hover:text-orange-300 transition-colors disabled:opacity-50"
                              >
                                <Marca tipo={b.tipo} />
                                {COMO_SE_LLAMA_EL_BLOQUE[b.tipo].nombre}
                              </button>
                            )}

                            {/* Mover y borrar, sólo en el que se está tocando:
                                son las tres cosas que se hacen de a una y que,
                                repetidas quince veces, tapan el texto. */}
                            {marcado && (
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
                                    debajo de `BLOQUES_MIN` desaparece al leerlo
                                    y corre todos los de abajo. Ver `ebook-texto`. */}
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
                            )}
                          </div>

                          {/* ⚠️ El campo se PARECE a lo que va a salir: el
                              subtítulo en negrita y más grande, la viñeta con su
                              bolita, el recuadro con su barra de color. Todos
                              iguales, la única forma de saber qué era cada uno
                              era leer la etiqueta de arriba — y con quince
                              pedazos nadie la lee. */}
                          {/* ⚠️ El foco se escucha ACÁ y no en el campo: en
                              React el foco burbujea, y `CampoAuto` —que lo usa
                              medio panel— no tiene `onFocus`. Agregárselo por
                              esta pantalla sería tocar a todos los demás. */}
                          <div
                            onFocus={() => onSeleccion?.({ que: "bloque", capitulo: i, bloque: k })}
                            className={`mt-2 flex gap-2 ${b.tipo === "aviso" ? "border-l-2 border-orange-400 pl-2" : ""}`}
                          >
                            {b.tipo === "vineta" && (
                              <span aria-hidden className="pt-2 text-[13px] leading-none text-gray-400">•</span>
                            )}
                            <CampoAuto
                              id={`pedazo-${i}-${k}`}
                              value={b.texto}
                              onChange={(v) => cambiarBloque(i, k, "texto", v.slice(0, LARGO_BLOQUE))}
                              maxLength={LARGO_BLOQUE}
                              disabled={guardando}
                              ariaLabel={`${COMO_SE_LLAMA_EL_BLOQUE[b.tipo].nombre} ${k + 1} del capítulo ${i + 1}`}
                              placeholder={COMO_SE_LLAMA_EL_BLOQUE[b.tipo].explica}
                              estilo={campo}
                              className={`flex-1 leading-relaxed ${
                                b.tipo === "subtitulo" ? "font-bold text-[14px]" : ""
                              }`}
                            />
                          </div>
                          <Cuenta largo={b.texto.length} tope={LARGO_BLOQUE} />
                        </li>
                      );
                    })}
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

/**
 * La marquita que dice de un vistazo qué clase de pedazo es.
 *
 * Cuatro formas distintas y no cuatro colores: en gris, un color más no dice
 * nada, y la forma se reconoce sin leer.
 */
function Marca({ tipo }: { tipo: TipoDeBloque }) {
  if (tipo === "subtitulo") {
    return <span aria-hidden className="inline-block h-3 w-0.5 rounded-sm bg-orange-500" />;
  }
  if (tipo === "vineta") {
    return <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />;
  }
  if (tipo === "aviso") {
    return <span aria-hidden className="inline-block h-3 w-3 rounded-sm border-2 border-orange-400" />;
  }
  return <span aria-hidden className="inline-block h-0.5 w-3 rounded-sm bg-gray-400" />;
}

/**
 * Cuánto entra, dicho sólo cuando falta poco.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ EL TOPE EXISTÍA Y NO SE VEÍA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Los campos cortan en `LARGO_BLOQUE`, así que al llegar al tope **las teclas
 * dejan de hacer efecto sin decir nada**: se sigue escribiendo y no aparece
 * nada. Parece que se colgó la pantalla.
 *
 * No se muestra siempre: un contador abajo de cada uno de los quince campos es
 * exactamente el amontonamiento que se vino a sacar. Aparece al 85 %, que es
 * cuando empieza a importar.
 */
function Cuenta({ largo, tope }: { largo: number; tope: number }) {
  if (largo < tope * 0.85) return null;
  const lleno = largo >= tope;
  return (
    <p
      className={`mt-1 text-right text-[11px] ${
        lleno ? "font-bold text-amber-700 panel-oscuro:text-amber-400" : "text-gray-400 panel-oscuro:text-gray-500"
      }`}
    >
      {lleno ? `Llegaste al máximo: ${tope} caracteres` : `${largo} de ${tope}`}
    </p>
  );
}
