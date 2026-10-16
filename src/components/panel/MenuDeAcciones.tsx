"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreHorizontal, X } from "lucide-react";

/**
 * El botón ⋯ de una tarjeta, con el resto de las acciones en un panel que sube
 * desde abajo de la pantalla, cada una con su nombre escrito.
 *
 * Nació en la grilla de productos de las tiendas (15/10/26): en el celular eran
 * seis íconos de 40 px en media pantalla —estado, editar, ver, QR, duplicar,
 * borrar—, chicos para el dedo y que había que adivinar. Flavio eligió dejar
 * "Editar" grande a la vista y esto para lo demás.
 *
 * El panel va con un portal al `body`: las tarjetas tienen `overflow-hidden`
 * (por la foto con esquinas redondeadas) y un desplegable adentro quedaba
 * cortado. Abajo de todo y no flotando al lado del botón, porque en el celular
 * es donde llega el pulgar.
 */

export type Accion = {
  label: string;
  icono: ReactNode;
  onClick?: () => void;
  /** Adentro del sitio. */
  href?: string;
  /** Afuera, en otra pestaña (la página pública). */
  externo?: string;
  /** Rojo y al final: borrar, eliminar. */
  peligro?: boolean;
  disabled?: boolean;
};

export default function MenuDeAcciones({ titulo, acciones, className = "" }: {
  /** Arriba del panel, para saber de qué producto son las acciones. */
  titulo: string;
  acciones: Accion[];
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);

  const fila = (a: Accion) =>
    `flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[15px] font-semibold transition-colors disabled:opacity-40 ${
      a.peligro
        ? "text-red-600 panel-oscuro:text-red-400 hover:bg-red-50 panel-oscuro:hover:bg-red-500/10"
        : "text-gray-800 panel-oscuro:text-gray-100 hover:bg-gray-50 panel-oscuro:hover:bg-gray-800"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Más acciones de ${titulo}`}
        aria-expanded={abierto}
        className={`flex items-center justify-center rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 text-gray-600 panel-oscuro:text-gray-300 hover:bg-gray-200 panel-oscuro:hover:bg-gray-700 transition-colors ${className}`}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {abierto && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
          <button type="button" aria-label="Cerrar" onClick={() => setAbierto(false)} className="absolute inset-0 bg-black/50" />
          <div
            // El tema del panel vive en un atributo del armazón; el portal sale de
            // ahí, así que se copia para que el modo oscuro siga valiendo.
            data-panel-tema={document.querySelector("[data-panel-tema]")?.getAttribute("data-panel-tema") ?? undefined}
            className="relative w-full max-w-md rounded-t-3xl bg-white panel-oscuro:bg-gray-900 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="flex items-center gap-3 px-4 pb-2 pt-1">
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-500 panel-oscuro:text-gray-400">{titulo}</p>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 panel-oscuro:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {acciones.map((a) => {
                const contenido = <><span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{a.icono}</span>{a.label}</>;
                if (a.href && !a.disabled) {
                  return <Link key={a.label} href={a.href} onClick={() => setAbierto(false)} className={fila(a)}>{contenido}</Link>;
                }
                if (a.externo && !a.disabled) {
                  return <a key={a.label} href={a.externo} target="_blank" rel="noopener noreferrer" onClick={() => setAbierto(false)} className={fila(a)}>{contenido}</a>;
                }
                return (
                  <button key={a.label} type="button" disabled={a.disabled} onClick={() => { setAbierto(false); a.onClick?.(); }} className={fila(a)}>
                    {contenido}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
