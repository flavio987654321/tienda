"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Cuando se rompe una pantalla del panel de Productos Digitales.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO EXISTÍA, Y ESO SE VEÍA COMO UNA PANTALLA EN BLANCO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El panel tiene diez pantallas —productos, ventas, carritos, la página de
 * venta, el editor del ebook— y ninguna tenía una red abajo. Sin este archivo,
 * cualquier error de dibujo subía hasta el `global-error`, que **reemplaza el
 * armazón entero**: la persona perdía la barra lateral, el menú y de dónde
 * volver, y se quedaba con una hoja suelta que dice "se nos rompió algo".
 *
 * Con esto, el error queda adentro del panel: la barra sigue estando, se puede
 * ir a otra parte, y "Reintentar" vuelve a dibujar sólo lo que falló.
 *
 * ── Y avisa ────────────────────────────────────────────────────────────────
 *
 * `console.error` vive en el navegador de quien tuvo el problema: de este lado
 * no se ve nunca. Acá se vende, así que una pantalla rota que nadie reporta es
 * una venta que no pasa y una tarde perdida buscando qué cambió.
 *
 * Encontrado en la auditoría del panel del 09/09/26.
 */
export default function ErrorDigitales({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[digitales] error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 panel-oscuro:border-gray-700 bg-white panel-oscuro:bg-gray-900 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 panel-oscuro:bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>

        <h1 className="mb-2 text-lg font-black text-gray-900 panel-oscuro:text-gray-100">
          No pudimos dibujar esta pantalla
        </h1>

        {/* ⚠️ Que NO se perdió nada. Es lo primero que piensa alguien que estaba
            escribiendo un ebook o armando su página de venta, y en este panel es
            cierto: lo que se guarda se guarda solo, capítulo por capítulo. Sin
            esta frase, un error de dibujo se lee como "perdí el trabajo". */}
        <p className="mb-6 text-[13px] leading-relaxed text-gray-600 panel-oscuro:text-gray-300">
          Falló de nuestro lado y ya nos llegó el aviso. Lo que tenías guardado está
          guardado: esto es un problema al mostrarlo, no al conservarlo.
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>

        {/* El único hilo que une lo que vio la persona con lo que vemos nosotros:
            sin él, un reclamo dice "me tiró error" y no hay cuál. */}
        {error.digest && (
          <p className="mt-5 text-[11px] text-gray-400 panel-oscuro:text-gray-500">
            Si nos escribís, pasanos este código: <strong>{error.digest}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
