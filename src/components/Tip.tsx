"use client";

import { HelpCircle } from "lucide-react";

/* ── Ayuda puntual al lado de un campo ──────────────────────────────────────
   Vivía adentro del formulario de producto y no salió nunca de ahí, así que el
   resto del panel se quedó sin ayuda por campo: Cupones, por ejemplo, no tenía
   ni una. Ahora es compartido.

   Va al lado de la etiqueta y dice la trampa PUNTUAL de ese campo, no lo que el
   campo es. "Fecha de vencimiento" no necesita que le expliquen que es una
   fecha; necesita que le avisen que si la dejás vacía el cupón no vence nunca.
   Si el texto no dice algo que la etiqueta no diga ya, es relleno — y el que
   aprende que la ayuda es relleno deja de leerla el día que importa.

   `align` decide de qué lado se ancla el globo: usá "right" cuando el campo
   está pegado al borde derecho y "left" cuando está sobre el izquierdo, para
   que no se salga de la pantalla. */
export default function Tip({
  text,
  align = "center",
}: {
  text: string;
  align?: "center" | "right" | "left";
}) {
  return (
    <span className="relative inline-flex group/tip ml-1 cursor-help align-middle">
      <HelpCircle className="h-3.5 w-3.5 text-indigo-400 hover:text-indigo-600 transition-colors" />
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full mb-2 w-56 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 leading-relaxed shadow-lg ${
          align === "right" ? "right-0" : align === "left" ? "left-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {text}
        <span
          className={`absolute top-full border-4 border-transparent border-t-gray-900 ${
            align === "right" ? "right-3" : align === "left" ? "left-3" : "left-1/2 -translate-x-1/2"
          }`}
        />
      </span>
    </span>
  );
}
