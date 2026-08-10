"use client";

/**
 * El selector de período.
 *
 * Eran tres links y nada más. Ahora tiene que resolver tres cosas sin ocuparle
 * media pantalla al que sólo quiere ver los últimos 30 días:
 *
 *   1. los tres botones de siempre, que son el 95% de los usos;
 *   2. un rango a medida ("del 1 al 15 de marzo");
 *   3. contra qué comparar: el período anterior o el mismo del año pasado.
 *
 * Por eso 2 y 3 viven detrás de un botón que se despliega. Un panel de fechas
 * siempre abierto arriba de todo empuja los números —que son a lo que la persona
 * vino— abajo del pliegue, y en un teléfono los saca de la pantalla.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, X } from "lucide-react";
import { PRESETS, NOMBRE_PRESET, MAX_DIAS, type Comparacion } from "@/lib/rango-fechas";

export function RangeSelector({
  preset, desde, hasta, comparacion, hoy, aMedida,
}: {
  preset: number | null;
  desde: string;
  hasta: string;
  comparacion: Comparacion;
  /** El día de hoy en Argentina. Es el tope de los dos campos. */
  hoy: string;
  /** `true` si el período actual es un rango a medida y no uno de los presets. */
  aMedida: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);
  const [comp, setComp] = useState<Comparacion>(comparacion);

  // El único caso imposible de arreglar del lado del servidor sin recargar. Los
  // otros —fechas al revés, futuro, rango larguísimo— los corrige `resolverRango`
  // y avisa, pero avisar después de una recarga es peor que no dejar apretar.
  const invalido = !d || !h;

  function aplicar() {
    if (invalido) return;
    const p = new URLSearchParams({ desde: d, hasta: h });
    if (comp === "anio") p.set("comparar", "anio");
    router.push(`/dashboard/metricas?${p.toString()}`);
    setAbierto(false);
  }

  function irAPreset(r: number) {
    const p = new URLSearchParams();
    if (r !== 30) p.set("range", String(r));
    if (comp === "anio") p.set("comparar", "anio");
    const qs = p.toString();
    router.push(`/dashboard/metricas${qs ? `?${qs}` : ""}`);
    setAbierto(false);
  }

  return (
    <div className="relative">
      <div className="inline-flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          {PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => irAPreset(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                r === preset ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {NOMBRE_PRESET[r]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
            aMedida || comparacion === "anio"
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
          aria-expanded={abierto}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          {/* En angosto sólo el ícono: con los tres botones al lado, "Otras
              fechas" completo empuja todo a una segunda fila. */}
          <span className="hidden sm:inline">
            {aMedida ? "Otras fechas" : comparacion === "anio" ? "vs. año pasado" : "Otras fechas"}
          </span>
        </button>
      </div>

      {abierto && (
        <>
          {/* La capa de atrás cierra el panel. En un teléfono no hay "clic
              afuera" evidente y sin esto el panel queda pegado hasta que se
              navega a otro lado. */}
          <button
            type="button"
            aria-label="Cerrar"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Elegí el período</p>
              <button type="button" onClick={() => setAbierto(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Desde</span>
                <input
                  type="date"
                  value={d}
                  max={h || hoy}
                  onChange={(e) => setD(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Hasta</span>
                <input
                  type="date"
                  value={h}
                  min={d}
                  max={hoy}
                  onChange={(e) => setH(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
                />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">Hasta {MAX_DIAS} días.</p>

            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500">Comparar contra</p>
              <div className="mt-1.5 grid gap-1.5">
                {([
                  ["anterior", "El período anterior", "Los mismos días, justo antes."],
                  ["anio", "El año pasado", "Las mismas fechas, un año atrás. Es la que sirve para un rubro con temporada."],
                ] as const).map(([valor, titulo, ayuda]) => (
                  <label
                    key={valor}
                    className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-xs ${
                      comp === valor ? "border-indigo-300 bg-indigo-50" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="comparar"
                      className="mt-0.5 shrink-0"
                      checked={comp === valor}
                      onChange={() => setComp(valor)}
                    />
                    <span>
                      <span className="block font-semibold text-gray-800">{titulo}</span>
                      <span className="block leading-relaxed text-gray-500">{ayuda}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={aplicar}
              disabled={invalido}
              className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              Ver este período
            </button>
          </div>
        </>
      )}
    </div>
  );
}
