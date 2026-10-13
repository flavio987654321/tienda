"use client";

import { sugerirMarcas, quisoDecir } from "@/lib/marcasVehiculos";

/* Lo que va debajo del campo Marca de un vehículo: las marcas que coinciden con
 * lo escrito, y si parece un error de tipeo, "¿Quisiste decir…?".
 *
 * Son botones y no un `<datalist>` porque el campo es un `CampoAuto` (un
 * textarea que crece), y el datalist sólo funciona con `<input>`. Ver
 * `lib/marcasVehiculos` para por qué existe. */
export default function SugerenciasMarca({ valor, elegir }: { valor: string; elegir: (marca: string) => void }) {
  const sugeridas = sugerirMarcas(valor);
  const correccion = quisoDecir(valor);
  if (!sugeridas.length && !correccion) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite">
      {correccion ? (
        <p className="text-xs text-amber-700 panel-oscuro:text-amber-400 [overflow-wrap:anywhere]">
          ¿Quisiste decir{" "}
          <button
            type="button"
            onClick={() => elegir(correccion)}
            className="font-semibold underline underline-offset-2 hover:text-amber-900 panel-oscuro:hover:text-amber-300"
          >
            {correccion}
          </button>
          ? Así aparece bien en la tienda y se agrupa con las demás.
        </p>
      ) : (
        sugeridas.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => elegir(m)}
            className="min-h-[32px] px-3 rounded-full border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 text-xs font-medium text-gray-700 panel-oscuro:text-gray-300 hover:border-indigo-400 hover:text-indigo-700 panel-oscuro:hover:text-indigo-300 transition-colors"
          >
            {m}
          </button>
        ))
      )}
    </div>
  );
}
