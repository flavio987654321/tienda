"use client";

import { Check, Loader2 } from "lucide-react";

/**
 * El "prendido / apagado" de una oferta, con lo que de verdad está pasando.
 *
 * ⚠️ Era una casilla suelta, y tocarla NO prendía nada: sólo cambiaba la
 * pantalla hasta apretar Guardar. Nada lo decía. Se tildaba, se guardaba, el
 * botón se apagaba en gris… y no quedaba ninguna señal de que la oferta
 * estuviera andando (03/10/26).
 *
 * Ahora son dos cosas a la vista:
 *   - el interruptor, que es lo que se está por guardar;
 *   - la etiqueta, que es lo que está GUARDADO — lo que ve la gente —, y que
 *     avisa "falta guardar" mientras las dos no coinciden.
 */
export function InterruptorDeOferta({
  titulo, explica, activa, guardadaActiva, disabled, onCambiar, femenino = true,
}: {
  titulo: string;
  explica: string;
  /** Lo que muestra el interruptor: lo que se va a guardar. */
  activa: boolean;
  /** Lo que está guardado: lo que ve la gente ahora. */
  guardadaActiva: boolean;
  disabled?: boolean;
  onCambiar: (v: boolean) => void;
  /** "Prendida" o "Prendido", según de qué se habla. */
  femenino?: boolean;
}) {
  const a = femenino ? "a" : "o";
  const falta = activa !== guardadaActiva;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-gray-900 panel-oscuro:text-gray-100">{titulo}</span>
          {falta ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 panel-oscuro:bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 panel-oscuro:text-amber-300">
              Falta guardar
            </span>
          ) : guardadaActiva ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 panel-oscuro:bg-green-500/15 px-2 py-0.5 text-[10.5px] font-bold text-green-800 panel-oscuro:text-green-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Prendid{a}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 panel-oscuro:bg-gray-800 px-2 py-0.5 text-[10.5px] font-bold text-gray-600 panel-oscuro:text-gray-400">
              Apagad{a}
            </span>
          )}
        </div>
        <span className="mt-0.5 block text-[12px] text-gray-500 panel-oscuro:text-gray-400">
          {falta
            ? `Apretá Guardar para que quede ${activa ? `prendid${a}` : `apagad${a}`}.`
            : explica}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activa}
        aria-label={titulo}
        disabled={disabled}
        onClick={() => onCambiar(!activa)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          activa ? "bg-orange-600" : "bg-gray-300 panel-oscuro:bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            activa ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/**
 * El botón de guardar de una oferta.
 *
 * ⚠️ "Guardado" NO va apagado en gris: así parecía un botón roto justo en el
 * momento en que tenía que decir "salió bien". Guardado y sin cambios, va en
 * verde con la tilde; con cambios vuelve a ser naranja.
 */
export function BotonGuardarOferta({
  onClick, guardando, hecho, disabled,
}: {
  onClick: () => void;
  guardando: boolean;
  /** Se guardó y no se tocó nada después. */
  hecho: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || hecho}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed ${
        hecho
          ? "bg-green-600 disabled:opacity-100"
          : "bg-orange-600 hover:bg-orange-500 disabled:opacity-40"
      }`}
    >
      {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
      {hecho && <Check className="h-4 w-4" />}
      {hecho ? "Guardado" : "Guardar"}
    </button>
  );
}
