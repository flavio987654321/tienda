"use client";

import { Loader2, Check, Clock } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════
   LAS PIEZAS DE LA PANTALLA DE CONFIGURACIÓN
   ══════════════════════════════════════════════════════════════════════════

   Viven en su propio archivo y NO adentro del cuerpo de la pantalla. Un
   componente definido adentro de otro se vuelve a crear en cada dibujo, así que
   React lo trata como un componente distinto y desmonta y vuelve a montar todo
   lo que hay abajo — en un botón se ve como un parpadeo, y en una sección con
   `<input>` adentro te come el foco justo mientras escribís. */

/** La caja blanca de cada sección, con su ícono, su título y su bajada. */
export function Seccion({
  Icono, titulo, bajada, children, apagada = false,
}: {
  Icono: React.ElementType;
  titulo: string;
  bajada: string;
  children: React.ReactNode;
  apagada?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl border bg-white panel-oscuro:bg-gray-900 p-5 sm:p-6 shadow-sm ${
        apagada ? "border-gray-100 panel-oscuro:border-gray-800" : "border-gray-100 panel-oscuro:border-gray-800"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
            apagada ? "bg-gray-100 panel-oscuro:bg-gray-800" : "bg-orange-100 panel-oscuro:bg-orange-500/15"
          }`}
        >
          <Icono className={`h-5 w-5 ${apagada ? "text-gray-400 panel-oscuro:text-gray-500" : "text-orange-600"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`font-black ${apagada ? "text-gray-500 panel-oscuro:text-gray-400" : "text-gray-900 panel-oscuro:text-gray-100"}`}>{titulo}</h2>
            {apagada && <EtiquetaPendiente />}
          </div>
          <p className="text-sm text-gray-500 panel-oscuro:text-gray-400 mt-0.5 leading-relaxed">{bajada}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * La etiqueta de "esto todavía no anda".
 *
 * ── Por qué se dibuja algo que no funciona ───────────────────────────────────
 * Porque si no está dibujado, se olvida. La pantalla completa muestra de una
 * cuáles son los agujeros que faltan tapar, en vez de tenerlos anotados en un
 * documento que hay que acordarse de abrir.
 *
 * ── Y por qué se avisa tan fuerte ────────────────────────────────────────────
 * Porque una sección que PARECE que anda y no anda es peor que no tenerla: la
 * persona la configura, se queda tranquila, y se entera de que no pasó nada
 * cuando ya es tarde. El aviso y los controles apagados son lo que separa "esto
 * viene después" de "esto está roto".
 */
export function EtiquetaPendiente() {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400 border border-gray-200 panel-oscuro:border-gray-700">
      <Clock className="h-3 w-3" />
      Todavía no
    </span>
  );
}

/**
 * El renglón que explica de qué depende una sección apagada.
 *
 * Dice **qué falta**, no "próximamente": "próximamente" no se puede verificar y
 * envejece mal. Que dependa de algo concreto se puede leer y se puede tachar.
 */
export function NotaPendiente({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-400 panel-oscuro:text-gray-500 leading-relaxed mt-3 pt-3 border-t border-gray-100 panel-oscuro:border-gray-800">
      {children}
    </p>
  );
}

/**
 * El botón de guardar de cada sección.
 *
 * ── Por qué uno por sección y no uno solo arriba ─────────────────────────────
 * La competencia tiene los dos a la vez: un "Guardar cambios" arriba de todo y
 * un "Guardar contexto" abajo, en la sección de la IA. Nadie puede saber cuál
 * guarda qué — si tocás el contexto y apretás el de arriba, no hay forma de
 * adivinar si se guardó.
 *
 * Acá cada sección guarda lo suyo y manda sólo sus campos. Además de que se
 * entiende, evita un problema real: un guardado del objeto entero pisaría con lo
 * que la pantalla tenga cargado campos que quizás cambiaron en otra pestaña.
 *
 * Se apaga con CUALQUIER guardado en curso y no sólo con el suyo: el cerrojo es
 * uno para toda la pantalla.
 */
export function BotonGuardar({
  id, onClick, disabled, guardando, listo, texto = "Guardar",
}: {
  id: string;
  onClick: () => void;
  disabled?: boolean;
  guardando: string | null;
  listo: string | null;
  texto?: string;
}) {
  const hecho = listo === id && guardando === null;
  return (
    <button
      onClick={onClick}
      disabled={disabled || guardando !== null}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {guardando === id && <Loader2 className="h-4 w-4 animate-spin" />}
      {hecho && <Check className="h-4 w-4" />}
      {hecho ? "Guardado" : texto}
    </button>
  );
}

/** Una etiqueta de campo, con su "(opcional)" cuando corresponde. */
export function Etiqueta({
  htmlFor, children, opcional = false,
}: {
  htmlFor: string;
  children: React.ReactNode;
  opcional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-gray-600 panel-oscuro:text-gray-400 mb-1.5">
      {children}
      {opcional && <span className="font-normal text-gray-400 panel-oscuro:text-gray-500"> (opcional)</span>}
    </label>
  );
}

/** La ayuda gris de abajo de un campo. Dice qué hace ese dato, no cómo llenarlo. */
export function Ayuda({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-500 panel-oscuro:text-gray-400 mt-1.5 leading-relaxed">{children}</p>;
}

export const CLASE_INPUT =
  "w-full px-4 py-3 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 text-sm text-gray-900 panel-oscuro:text-gray-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400";
