"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Play, BookOpen, FileText } from "lucide-react";
// Solo la tabla liviana, NO `@/lib/ayuda`: esto es cliente y de ahí se bajaría
// el texto completo de todos los artículos para usar un título y un slug.
import { pantallaDe } from "@/lib/ayuda/pantallas";

/* El `?` del panel. Ofrece tres cosas, de la más específica a la más general:
   la guía en pantalla, el artículo de ESTA pantalla, y el centro de ayuda
   entero.

   La del medio es la que importa. Nadie va a buscar el centro de ayuda antes
   de trabarse, así que la única ayuda que se lee es la que está a un clic del
   lugar donde apareció la duda. Aparece sola: sale de la pantalla en la que
   estás parado y se esconde si esa pantalla todavía no tiene artículo escrito,
   en vez de ofrecer una puerta que da a la nada. */
/* `onStartTour` es opcional porque el panel del afiliado no tiene tour guiado.
   Sin él la fila del tour no se dibuja y quedan las otras dos, que son las que
   de verdad importan. La alternativa era un segundo componente casi igual, o
   pasarle una función vacía y mostrar un botón que no hace nada. */
export default function HelpButton({ onStartTour }: { onStartTour?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const pantalla = pantallaDe(pathname ?? "");

  /* De qué panel es esta ayuda. Este botón vive en los dos —la barra del dueño y
     la del afiliado— y cada uno tiene la suya, adentro de su propio `scope`. */
  const base = (pathname ?? "").startsWith("/afiliados") ? "/afiliados/ayuda" : "/dashboard/ayuda";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Ayuda"
        title="Ayuda"
      >
        <HelpCircle className="h-5 w-5 text-gray-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-gray-100 bg-white shadow-xl p-2">
          {onStartTour && (
            <button
              onClick={() => {
                setOpen(false);
                onStartTour();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-left"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 shrink-0">
                <Play className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Tour guiado</p>
                <p className="text-[11px] text-gray-400 leading-tight">Ver cómo usar el panel</p>
              </div>
            </button>
          )}

          {/* Los dos links iban a `/ayuda` en otra pestaña, y las dos cosas
              estaban mal desde que el panel se instala como app.

              `/ayuda` está fuera del `scope` del manifiesto, así que la app
              instalada terminaba con el sitio comercial entero adentro de su
              ventana. Y el `target="_blank"` no lo salvaba: en Android eso abre
              una pestaña de Chrome donde el sitio queda igual de navegable —lo
              comprobamos en el teléfono con el botón "Ir al sitio principal".

              Ahora apuntan a la ayuda del propio panel, que es la misma ayuda
              filtrada por rol y vive adentro del `scope`. Y van en la MISMA
              pestaña, que en una app instalada es la única que hay; el motivo
              original de abrir aparte —no pisar un formulario a medio llenar—
              queda cubierto por el botón "atrás", que ahora vuelve al panel. */}
          {pantalla && (
            <Link
              href={`${base}/${pantalla.slug}`}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-left"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 shrink-0">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Ayuda de esta pantalla</p>
                <p className="text-[11px] text-gray-400 leading-tight truncate">{pantalla.titulo}</p>
              </div>
            </Link>
          )}

          <Link
            href={base}
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-left"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Centro de ayuda</p>
              <p className="text-[11px] text-gray-400 leading-tight">Cómo funciona cada cosa</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
