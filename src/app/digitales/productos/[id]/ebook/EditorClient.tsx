"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import EbookTexto from "../../EbookTexto";
import type { CapituloEscrito } from "@/lib/ebook-ia";
import { useSalida } from "@/app/digitales/SalidaSinGuardar";

/**
 * Lo que rodea al editor: guardar, rehacer el PDF y avisar.
 *
 * `EbookTexto` sólo dibuja y valida —es el mismo componente que se probaba
 * adentro del modal— y todo lo que le habla al servidor vive acá.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ SON DOS PEDIDOS Y TIENEN QUE SER DOS, PERO UN SOLO BOTÓN
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Guardar el texto **no cambia el archivo**: el PDF colgado del producto es el
 * de antes, y es el que va a recibir quien compre. Por eso el guardado baja el
 * ebook de `LISTO` a `COMPLETO` —que es lo que de verdad es, escrito y sin
 * archivo— y acá se arma de nuevo enseguida.
 *
 * Si el armado falla, el texto YA quedó guardado y se dice con esas palabras.
 * El ebook queda en `COMPLETO`, que es un estado del que se sale desde la
 * tarjeta con el botón de siempre. Nada se pierde y nada miente.
 */
export default function EditorDeEbook({
  productoId,
  producto,
  titulo,
  capitulos,
  total,
}: {
  productoId: string;
  producto: string;
  titulo: string;
  capitulos: CapituloEscrito[];
  total: number;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<string | null>(null);

  /* ⚠️ Hay algo corregido a mano que se pierde si se sale de la pantalla.
     Acá pesa más que en el modal: esto es una dirección, así que se sale con el
     "volver", con el menú de al lado o con el botón de atrás del navegador —tres
     caminos, ninguno con un "¿seguro?" propio—. Es la misma guarda del editor de
     la página de venta. */
  const [sinGuardar, setSinGuardar] = useState(false);
  const { setBloqueado } = useSalida();
  useEffect(() => {
    setBloqueado(sinGuardar);
    /* Sin la limpieza, el aviso sobrevive a la pantalla y sigue preguntando
       desde otra: el interruptor vive arriba, no acá. */
    return () => setBloqueado(false);
  }, [sinGuardar, setBloqueado]);

  /* Corta el doble clic: sin esto, dos clics rápidos mandan dos guardados y el
     segundo se choca contra el candado del servidor. */
  const enVuelo = useRef(false);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const pedir = useCallback(async (url: string, cuerpo: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoId, ...cuerpo }),
    });
    const datos = await res.json().catch(() => null);
    return { ok: res.ok, datos: (datos ?? {}) as Record<string, unknown> };
  }, [productoId]);

  const guardar = useCallback(async (corregidos: CapituloEscrito[]) => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setGuardando(true);
    setError(null);
    setListo(null);

    try {
      const { ok, datos } = await pedir("/api/digitales/ia/ebook/texto", { capitulos: corregidos });
      if (!vivo.current) return;

      if (!ok) {
        /* Se queda en la pantalla con el motivo escrito: lo corregido sigue a la
           vista y se puede arreglar y volver a intentar. */
        setError(typeof datos.error === "string" ? datos.error : "No pudimos guardar el texto.");
        return;
      }

      if (datos.hayQueArmar === true) {
        const armado = await pedir("/api/digitales/ia/ebook/armar", {});
        if (!vivo.current) return;

        if (!armado.ok) {
          setError(
            typeof armado.datos.error === "string"
              ? `Los cambios quedaron guardados, pero no pudimos rehacer el PDF: ${armado.datos.error}`
              : "Los cambios quedaron guardados, pero no pudimos rehacer el PDF. Probá de nuevo desde la tarjeta del producto.",
          );
          return;
        }

        setListo("Guardado, y el PDF se rehizo con los cambios. Ése es el que se entrega.");
      } else {
        setListo("Guardado. El PDF se va a armar solo cuando termine de escribirse.");
      }

      /* Que la pantalla vuelva a leer del servidor: el título y los capítulos
         que se dibujan salen de ahí, y ahora son otros. Sin esto, salir y
         volver a entrar mostraría lo viejo hasta que alguien recargue. */
      router.refresh();
    } catch {
      if (vivo.current) setError("Se cortó la conexión. Probá de nuevo.");
    } finally {
      enVuelo.current = false;
      if (vivo.current) setGuardando(false);
    }
  }, [pedir, router]);

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 panel-oscuro:text-gray-500">
          {producto}
        </p>
        <h1 className="mt-0.5 text-xl font-black text-gray-900 panel-oscuro:text-gray-100">
          Editar el contenido
        </h1>
      </div>

      {listo && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 panel-oscuro:border-emerald-500/25 bg-emerald-50 panel-oscuro:bg-emerald-500/10 px-3.5 py-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-[12.5px] leading-relaxed text-emerald-900 panel-oscuro:text-emerald-300">
            {listo}
          </p>
        </div>
      )}

      {/* Mientras se arma el PDF esto tarda unos segundos y no hay barra que
          mirar: el cartel es lo único que dice que algo está pasando. */}
      {guardando && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-gray-100 panel-oscuro:bg-gray-800 px-3.5 py-2.5">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-500" />
          <p className="text-[12.5px] text-gray-600 panel-oscuro:text-gray-300">
            Guardando y rehaciendo el PDF. No cierres esta pantalla.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-4 sm:p-5">
        <EbookTexto
          /* La `key` fuerza a empezar de nuevo cuando el servidor manda otro
             texto —después de guardar—: sin ella, `EbookTexto` se quedaría con
             el que tenía en la mano cuando se montó y lo corregido volvería a
             contar como "sin guardar". */
          key={`${titulo}:${capitulos.length}`}
          inicial={{ titulo, capitulos, total }}
          guardando={guardando}
          error={error}
          onCambio={setSinGuardar}
          onGuardar={guardar}
          onVolver={() => router.push("/digitales/productos")}
        />
      </div>
    </div>
  );
}
