"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Cuando se rompe la página de venta, el pago o la pantalla de gracias.
 *
 * ⚠️ No existía: cualquier error —la base que tarda, una página de venta con
 * un dato raro— subía hasta el `global-error` y se veía "se nos rompió algo"
 * suelto, sin decir nada útil a alguien que estaba por pagar o que YA pagó.
 * Encontrado en la auditoría del 03/10/26.
 *
 * Dos cosas que tiene que decir sí o sí:
 *   - Que no se cobró nada de más. Es lo primero que piensa quien estaba
 *     pagando cuando vio un error.
 *   - Que si ya pagó, el archivo le llega por mail igual. Es cierto: la entrega
 *     la dispara el aviso de Mercado Pago, no esta pantalla.
 *
 * "Probar de nuevo" usa `unstable_retry` —le vuelve a pedir la pantalla al
 * servidor— y no `reset`, que redibujaba lo mismo que acababa de fallar.
 */
export default function ErrorDelProducto({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[p] error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 [color-scheme:light]">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-3 text-4xl" aria-hidden>⚠️</p>
        <h1 className="text-xl font-black text-gray-900">No pudimos cargar esta página</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Algo falló al mostrarla. No se te cobró nada por esto, y si ya habías pagado, no
          te preocupes: el archivo te llega por mail igual.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-gray-700"
        >
          Probar de nuevo
        </button>
        {error.digest && (
          <p className="mt-5 text-[11px] text-gray-400">
            Si escribís para reclamar, pasá este código: <strong>{error.digest}</strong>
          </p>
        )}
      </div>
    </main>
  );
}
