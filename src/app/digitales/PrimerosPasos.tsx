import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { type Paso, cuantosHechos, elQueSigue } from "@/lib/primeros-pasos";

/**
 * La lista de primeros pasos del panel.
 *
 * ── Por qué un solo botón y no cinco ───────────────────────────────────────
 *
 * Sólo el primero que falta muestra su llamado a la acción. Cinco botones a la
 * vez parecen más útiles y llaman a ninguno — y además el orden importa de
 * verdad: subir el archivo antes de tener producto no se puede.
 *
 * ── Por qué no se puede cerrar ─────────────────────────────────────────────
 *
 * Porque no se calcula de una bandera guardada sino del estado real, así que no
 * puede mentir: se va sola cuando los cinco están hechos, y si algo se rompe
 * —alguien borra su producto, se desconecta Mercado Pago— vuelve a aparecer, que
 * es justo lo que hay que ver. Un botón de "no mostrar más" taparía eso.
 *
 * ── Por qué dice la consecuencia y no la tarea ─────────────────────────────
 *
 * "Subí el archivo" ya está en el título; abajo va *por qué*: "sin él se puede
 * cobrar y no se puede entregar". La tarea repetida no agrega nada, y el motivo
 * es lo que hace que alguien la haga hoy en vez de mañana.
 */
export default function PrimerosPasos({ pasos }: { pasos: Paso[] }) {
  const hechos = cuantosHechos(pasos);
  const sigue = elQueSigue(pasos);

  return (
    <section className="rounded-3xl border border-orange-200 panel-oscuro:border-orange-500/30 bg-white panel-oscuro:bg-gray-900 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-black text-gray-900 panel-oscuro:text-gray-100">
          Para empezar a vender
        </h2>
        <p className="text-[12.5px] font-semibold text-orange-600">
          {hechos} de {pasos.length}
        </p>
      </div>

      {/* La barra. Va con `aria-*` porque es la única forma de que un lector de
          pantalla diga el avance sin tener que leer los cinco renglones. */}
      <div
        role="progressbar"
        aria-valuenow={hechos}
        aria-valuemin={0}
        aria-valuemax={pasos.length}
        aria-label="Pasos completados"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 panel-oscuro:bg-gray-800"
      >
        <div
          className="h-full rounded-full bg-orange-500 transition-all"
          style={{ width: `${(hechos / pasos.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 space-y-1">
        {pasos.map((p, i) => {
          const esElQueSigue = sigue?.clave === p.clave;
          return (
            <li
              key={p.clave}
              className={`flex gap-3 rounded-2xl px-3 py-2.5 ${
                esElQueSigue ? "bg-orange-50 panel-oscuro:bg-orange-500/10" : ""
              }`}
            >
              {/* Un tilde cuando está hecho, el número cuando no. El número dice
                  el orden, que es información: no se puede hacer el 3 sin el 1. */}
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  p.hecho
                    ? "bg-green-100 panel-oscuro:bg-green-500/20 text-green-700 panel-oscuro:text-green-400"
                    : esElQueSigue
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-400"
                }`}
              >
                {p.hecho ? <Check className="h-3 w-3" /> : i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className={`text-[13.5px] font-bold ${
                  p.hecho
                    ? "text-gray-400 panel-oscuro:text-gray-500 line-through"
                    : "text-gray-900 panel-oscuro:text-gray-100"
                }`}>
                  {p.titulo}
                  {/* Lo hecho se dice también con palabras: el tachado y el color
                      no llegan a quien no distingue verde de gris. */}
                  {p.hecho && <span className="sr-only"> — hecho</span>}
                </p>

                {/* El porqué sólo en los que faltan. En los hechos es ruido. */}
                {!p.hecho && (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500 panel-oscuro:text-gray-400">
                    {p.porque}
                  </p>
                )}

                {esElQueSigue && (
                  <Link
                    href={p.href}
                    className="group mt-2 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-orange-500"
                  >
                    {p.accion}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
