"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Cuando la tienda no se puede armar del lado del servidor (la base que tarda,
 * un dato que no se pudo leer). Lo que se rompe DIBUJANDO el template lo ataja
 * antes `TemplateSeguro`, que además ofrece el WhatsApp de la tienda.
 *
 * No existía (auditoría del 13/10/26): esto subía hasta `global-error`, que
 * reemplaza la página entera con un mensaje de la plataforma, sin nada de la
 * tienda que el comprador estaba mirando.
 *
 * "Probar de nuevo" usa `unstable_retry` —le vuelve a pedir la pantalla al
 * servidor— y no `reset`, que redibujaba lo mismo que acababa de fallar.
 */
export default function ErrorDeLaTienda({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { donde: "tienda" } });
    console.error("[tienda] error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10 text-white">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-extrabold">No pudimos mostrar la tienda</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/75">
          Fue un problema nuestro, no de tu conexión. Probá de nuevo en un momento.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 min-h-[46px] rounded-xl bg-white px-5 text-[15px] font-extrabold text-slate-900 transition hover:bg-slate-200"
        >
          Probar de nuevo
        </button>
      </div>
    </main>
  );
}
