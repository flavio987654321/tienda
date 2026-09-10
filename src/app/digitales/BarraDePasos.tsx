import { Check } from "lucide-react";

/**
 * La barra de círculos del recibimiento.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTÁ ACÁ PORQUE LA DIBUJAN TRES PANTALLAS SEGUIDAS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El recibimiento, la pantalla de elegir el estilo y la de "Todo listo" van una
 * atrás de la otra en el mismo recorrido, y las tres muestran la misma barra.
 * Escrita tres veces, alcanza con tocar una para que a mitad de camino cambien
 * los nombres, el ancho de las rayas o el orden — y eso se lee como que la
 * pantalla se rompió.
 *
 * Ya había pasado con los nombres: por eso `NOMBRE_CORTO` vive en
 * `lib/primeros-pasos` desde que aparecieron dos pantallas. Esto es lo mismo,
 * un escalón más arriba.
 *
 * ── Qué NO sabe ────────────────────────────────────────────────────────────
 *
 * Cuáles son los pasos. Recibe círculos ya resueltos, así que el día que entre
 * o salga uno de la puerta no hay que tocar este archivo. Quien decide es
 * `pasosDeLaPuerta`, y cada pantalla arma su lista.
 */

export type CirculoDePaso = {
  nombre: string;
  estado: "hecho" | "actual" | "falta";
};

/**
 * Los dos círculos del cierre, que no son pasos de la puerta.
 *
 * ⚠️ Se nombran acá y en ningún otro lado por lo mismo que `NOMBRE_CORTO`: los
 * escriben las tres pantallas, y uno renombrado en una sola hace que la barra
 * cambie de palabra mientras la persona avanza.
 */
export const NOMBRE_ESTILO = "Estilo";
export const NOMBRE_LISTO = "Listo";

export default function BarraDePasos({ circulos }: { circulos: CirculoDePaso[] }) {
  return (
    /* ⚠️ En el teléfono se ven SÓLO los números y las rayas. Los cuatro nombres
       a 360 entran en tres letras cada uno o se parten; el número con su tilde
       ya dice lo único que importa acá arriba, que es cuánto falta. El nombre
       del paso donde estás se lee completo en la tarjeta de abajo. */
    <ol className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
      {/* La posición va en la clave junto al nombre: los pasos de la puerta se
          pueden renombrar, y dos círculos con el mismo texto rompen la lista sin
          decir por qué. */}
      {circulos.map(({ nombre, estado }, n) => (
        <li key={`${n}-${nombre}`} className="flex min-w-0 items-center gap-1 sm:gap-2">
          {n > 0 && (
            <span
              aria-hidden="true"
              className={`h-px w-3 shrink-0 sm:w-6 ${
                estado === "falta" ? "bg-gray-200 panel-oscuro:bg-gray-700" : "bg-orange-400"
              }`}
            />
          )}
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
              estado === "hecho"
                ? "bg-orange-600 text-white"
                : estado === "actual"
                  ? "bg-orange-100 panel-oscuro:bg-orange-500/20 text-orange-700 panel-oscuro:text-orange-300 ring-2 ring-orange-500"
                  : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-400 panel-oscuro:text-gray-500"
            }`}
            /* El estado se dice, no se deja al color: quien no distingue el
               naranja del gris tiene que poder saber en cuál está. */
            aria-current={estado === "actual" ? "step" : undefined}
          >
            {estado === "hecho" ? <Check className="h-3.5 w-3.5" /> : n + 1}
            <span className="sr-only">
              {estado === "hecho" ? "hecho: " : estado === "actual" ? "estás acá: " : "falta: "}
              {nombre}
            </span>
          </span>
          <span
            aria-hidden="true"
            /* Sólo el nombre del paso actual se destaca. Hecho y pendiente se
               dibujan iguales a propósito: la diferencia entre esos dos ya la
               dice el círculo, con el tilde. */
            className={`hidden truncate text-[12px] font-bold sm:block ${
              estado === "actual"
                ? "text-orange-700 panel-oscuro:text-orange-300"
                : "text-gray-400 panel-oscuro:text-gray-500"
            }`}
          >
            {nombre}
          </span>
        </li>
      ))}
    </ol>
  );
}
