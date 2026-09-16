"use client";

import Link from "next/link";
import { Package } from "lucide-react";

/**
 * "¿De qué producto?" — la fila de arriba de las pantallas de Marketing que
 * se configuran POR PRODUCTO (Enlaces, Oferta de salida, Reels).
 *
 * ── Por qué se muestra aunque haya un solo producto ─────────────────────────
 *
 * Antes las fichas aparecían sólo con dos o más, y con uno la pantalla no
 * decía de qué producto hablaba: parecía que la oferta era "de la cuenta".
 * Cuando esa persona cargue el segundo producto no va a saber que lo de
 * acá era del primero. Con un producto se ve una sola ficha, marcada: es la
 * forma de decir "esto es de ESTE producto", y de mostrar dónde van a
 * aparecer los demás.
 *
 * La elección viaja por la URL (`?p=`) cuando la pantalla la resuelve el
 * servidor, o por `onElegir` cuando es estado de la pantalla.
 *
 * ⚠️ `ruta` es un TEXTO y no una función que arme el link. Esto es un
 * componente de cliente y lo dibujan pantallas del servidor (Reels): una
 * función no cruza esa frontera —React no la puede mandar por el cable— y la
 * pantalla entera se cae con "Functions cannot be passed directly to Client
 * Components". Era exactamente lo que pasaba en Reels.
 */
export type FichaDeProducto = { id: string; name: string; nota?: string };

export default function ProductoElegido({ productos, elegidoId, ruta, onElegir }: {
  productos: FichaDeProducto[];
  elegidoId: string | null;
  /** La pantalla donde vive la elección; se le agrega `?p=<id>`. */
  ruta?: string;
  onElegir?: (id: string) => void;
}) {
  if (productos.length === 0) return null;
  const clase = (activa: boolean) =>
    `shrink-0 max-w-[260px] truncate rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
      activa
        ? "bg-gray-900 panel-oscuro:bg-gray-100 text-white panel-oscuro:text-gray-900"
        : "bg-white panel-oscuro:bg-gray-900 border border-gray-200 panel-oscuro:border-gray-800 text-gray-600 panel-oscuro:text-gray-400 hover:border-orange-300"
    }`;
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
      <div className="flex items-center gap-2 w-max sm:w-auto sm:flex-wrap">
        <span className="mr-1 inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
          <Package className="h-3.5 w-3.5" /> Producto
        </span>
        {productos.map((p) => {
          const activa = p.id === elegidoId;
          const texto = p.nota ? `${p.name} · ${p.nota}` : p.name;
          return ruta ? (
            <Link key={p.id} href={`${ruta}?p=${p.id}`} aria-current={activa ? "page" : undefined} title={texto} className={clase(activa)}>{texto}</Link>
          ) : (
            <button key={p.id} type="button" onClick={() => onElegir?.(p.id)} aria-pressed={activa} title={texto} className={clase(activa)}>{texto}</button>
          );
        })}
        {productos.length === 1 && (
          <span className="shrink-0 text-[11.5px] text-gray-400">Cuando cargues otro, aparece acá.</span>
        )}
      </div>
    </div>
  );
}
