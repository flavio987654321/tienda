"use client";

import { useEffect, useRef } from "react";

/* ── Campo de una línea que crece en vez de correrse ────────────────────────
   Un <input type="text"> NO puede pasar a renglón nuevo: es lo que el elemento
   es, no algo que se arregle con CSS. El texto se desplaza hacia la derecha y
   en una pantalla angosta se pierde de vista casi todo lo escrito.

   Esto es un <textarea> que arranca en un renglón y suma los que hagan falta,
   midiendo el alto real del contenido. Sigue siendo un valor de una línea: los
   saltos se sacan al escribir y al pegar, así que lo que se guarda es igual que
   con un input.

   Cuándo usarlo: campos de texto libre donde el valor puede ser largo —un
   título, una etiqueta, un material, un tag—. Para números, fechas y colores
   conviene el input nativo: ahí importa más el teclado que abre el teléfono y
   los controles propios del tipo, y esos valores nunca son largos.

   `onEnter` es para los campos donde Enter significa algo (confirmar una
   fichita, por ejemplo). Sin él, Enter simplemente no hace nada — que es lo que
   corresponde adentro de un formulario largo, donde un Enter distraído no tiene
   que mandarlo a guardar.

   `innerRef` es para cuando el de afuera necesita tocar el campo: mover el
   cursor, leer dónde está parado, enfocarlo a mano. El caso real es el botón de
   emoji del nombre de la promoción, que inserta en la posición del cursor y no
   al final. */
export default function CampoAuto({
  value, onChange, onEnter, onBlur, placeholder, className = "", id, maxLength, ariaLabel, disabled,
  innerRef, autoFocus, required,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  id?: string;
  maxLength?: number;
  ariaLabel?: string;
  disabled?: boolean;
  innerRef?: React.RefObject<HTMLTextAreaElement | null>;
  autoFocus?: boolean;
  /** Un `<textarea>` soporta `required` igual que un `<input>`, así que al pasar
   *  un campo obligatorio a este componente la validación del navegador se
   *  mantiene tal cual — no hay que reemplazarla por un chequeo a mano. */
  required?: boolean;
}) {
  const propio = useRef<HTMLTextAreaElement>(null);
  // El de afuera manda si lo pasaron: así el autoajuste de alto y quien inserta
  // el emoji miran el MISMO elemento, sin duplicar referencias.
  const ref = innerRef ?? propio;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Se baja a "auto" primero para que `scrollHeight` mida el contenido y no
    // el alto que había quedado de antes: si no, el campo crece y nunca achica.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, ref]);

  return (
    <textarea
      id={id}
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      required={required}
      aria-label={ariaLabel}
      maxLength={maxLength}
      onBlur={onBlur}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n+\s*/g, " "))}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        onEnter?.();
      }}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    />
  );
}
