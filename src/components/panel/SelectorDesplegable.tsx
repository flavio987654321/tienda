"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Elegir entre varias opciones en el celular: un botón ancho que dice cuál está
 * elegida, con una flechita, que al tocarlo despliega la lista entera.
 *
 * Reemplaza a las filas de pestañas que se deslizaban de costado: tenían una
 * barrita gris, la última quedaba cortada a la mitad y no se sabía cuántas había.
 * Apiladas, en cambio, se comían la pantalla antes del primer campo. Flavio lo
 * eligió el 15/10/26 para la configuración de digitales y pidió lo mismo en los
 * productos. En la compu, quien lo usa muestra otra cosa (el menú de la
 * izquierda, los botones a la vista): esto se esconde con `lg:hidden` desde afuera.
 *
 * Sin ícono de hamburguesa a propósito: el de arriba de los paneles ya abre el
 * menú principal, y dos iguales en la misma pantalla confunden.
 */

export type OpcionDesplegable<T extends string> = {
  id: T;
  /** Lo que se lee. En la lista va entero; en el botón se corta si no entra. */
  label: string;
  /** Lo que va adelante: un ícono, un número. */
  marca?: ReactNode;
};

/** El color de cada panel: naranja en digitales, índigo en tiendas. */
const ACENTOS = {
  naranja: {
    marca: "text-orange-600 panel-oscuro:text-orange-400",
    activa: "bg-orange-500/10 panel-oscuro:bg-orange-500/15 text-orange-700 panel-oscuro:text-orange-300",
  },
  indigo: {
    marca: "text-indigo-600 panel-oscuro:text-indigo-400",
    activa: "bg-indigo-500/10 panel-oscuro:bg-indigo-500/15 text-indigo-700 panel-oscuro:text-indigo-300",
  },
} as const;

export default function SelectorDesplegable<T extends string>({
  opciones,
  valor,
  elegir,
  queSeElige,
  acento = "naranja",
  className = "",
}: {
  opciones: readonly OpcionDesplegable<T>[];
  valor: T;
  elegir: (id: T) => void;
  /** Para los lectores de pantalla: "Sección", "Página de venta". */
  queSeElige: string;
  acento?: keyof typeof ACENTOS;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const actual = opciones.find((o) => o.id === valor) ?? opciones[0];

  // Se cierra tocando afuera o con Escape, como cualquier desplegable.
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  if (!actual) return null;

  return (
    <div ref={caja} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${queSeElige}: ${actual.label}. Cambiar`}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 px-4 py-3 text-left text-sm font-bold text-gray-900 panel-oscuro:text-gray-100"
      >
        {actual.marca && <span className={`shrink-0 ${ACENTOS[acento].marca}`}>{actual.marca}</span>}
        <span className="min-w-0 flex-1 truncate">{actual.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-1.5 shadow-xl">
          {opciones.map((o) => {
            const activa = o.id === valor;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => { elegir(o.id); setAbierto(false); }}
                aria-current={activa ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-left text-sm font-bold transition-colors ${
                  activa
                    ? ACENTOS[acento].activa
                    : "text-gray-700 panel-oscuro:text-gray-300 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
                }`}
              >
                {o.marca && <span className="shrink-0">{o.marca}</span>}
                <span className="min-w-0 flex-1 break-words">{o.label}</span>
                {activa && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
