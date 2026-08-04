"use client";

import { useState } from "react";

/**
 * Campo para escribir el nombre de una opción de producto ("Talle", "Largo",
 * "Material").
 *
 * El nombre ES la clave con la que se guarda la variante, así que no se puede
 * reescribir en cada tecla. Escribiendo "Largo" pasaría por "L", "La", "Lar"…
 * y cada paso renombraría la clave en todas las filas. Dos cosas se rompen ahí:
 *
 *  - al borrar todo queda una opción sin nombre, que la tienda no puede dibujar
 *    (`opcionesDeVariantes` descarta las claves vacías, así que el comprador
 *    vería un talle menos sin que nadie se entere);
 *  - si el nombre a medio escribir coincide con otro que ya existe, las dos
 *    columnas se pisan y una se pierde con todos sus valores.
 *
 * Por eso se escribe sobre un borrador y se confirma al salir del campo o con
 * Enter. Si quedó vacío o repetido, vuelve al que estaba.
 *
 * El borrador arranca en `null` —no en el valor— para no tener que
 * sincronizarlo con un efecto cada vez que el nombre cambia desde afuera, como
 * cuando la categoría elegida sugiere otro.
 */
export function NombreOpcion({ valor, otros, onCommit, className, ariaLabel }: {
  valor: string;
  /** Los nombres de las demás opciones, para no permitir repetidos. */
  otros: string[];
  onCommit: (nuevo: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function confirmar() {
    if (draft === null) return;
    const limpio = draft.trim();
    setDraft(null);
    if (!limpio) return;
    if (otros.some(o => o.toLowerCase() === limpio.toLowerCase())) return;
    if (limpio !== valor) onCommit(limpio);
  }

  return (
    <input
      type="text"
      value={draft ?? valor}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
