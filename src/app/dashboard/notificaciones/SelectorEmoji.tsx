"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

/**
 * Selector de emojis para el título y el mensaje de una campaña.
 *
 * Es una lista curada y no un selector completo a propósito. Un picker de
 * verdad son miles de emojis y una librería externa — que además no cargaría,
 * porque el proyecto no admite recursos de afuera. Y para lo que se usa acá no
 * hace falta: en una notificación de tienda entran veinte emojis, no dos mil.
 *
 * Los emojis importan más en el push que en el mail: en la pantalla bloqueada
 * del celular, la notificación compite con todas las demás y el ícono es lo
 * primero que frena el ojo.
 */

const GRUPOS: { titulo: string; emojis: string[] }[] = [
  { titulo: "Anuncio",  emojis: ["🎉", "✨", "🆕", "📢", "⭐", "💫"] },
  { titulo: "Oferta",   emojis: ["🔥", "💥", "🏷️", "💸", "⚡", "⏰"] },
  { titulo: "Tienda",   emojis: ["🛍️", "🎁", "🚚", "📦", "💳", "✅"] },
  { titulo: "Producto", emojis: ["👗", "👟", "👜", "💎", "🧥", "🕶️"] },
  { titulo: "Ánimo",    emojis: ["❤️", "😍", "👀", "🙌", "💖", "🤩"] },
];

export function SelectorEmoji({
  onElegir,
  deshabilitado,
}: {
  onElegir: (emoji: string) => void;
  deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Cerrar al tocar afuera o con Escape. Sin esto queda un panel flotando
  // encima del formulario que sólo se va tocando el mismo botón — y nadie
  // busca ahí, buscan el vacío de al lado.
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={deshabilitado}
        title="Agregar emoji"
        aria-label="Agregar emoji"
        className={`p-1 rounded-md transition-colors ${
          abierto ? "text-indigo-600 bg-indigo-50" : "text-gray-400 hover:text-indigo-500 hover:bg-gray-50"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Smile className="h-3.5 w-3.5" />
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="mb-1.5 last:mb-0">
              <p className="px-1 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                {g.titulo}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    // El panel NO se cierra al elegir: casi siempre se pone un
                    // emoji adelante y otro atrás, y cerrarlo obligaría a
                    // abrirlo de nuevo para el segundo.
                    onClick={() => onElegir(e)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-base leading-none transition-colors hover:bg-indigo-50"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
