"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { AlertTriangle } from "lucide-react";

/**
 * ⚠️ ESTA PANTALLA NO RECIBÍA EL ERROR, así que no lo podía contar.
 *
 * Un `error.tsx` de Next recibe `{ error, reset }`. Éste no declaraba ninguno de
 * los dos: dibujaba el cartel y listo, o sea que una métrica que se rompía se
 * veía como "no se pudieron cargar" y **de este lado no quedaba ningún rastro**.
 * Encontrado en la auditoría del 09/09/26.
 */
export default function MetricasError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[metricas] error:", error);
  }, [error]);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Métricas</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <p className="text-base font-semibold text-gray-700">No se pudieron cargar las métricas</p>
          <p className="mt-1 text-sm text-gray-400">Hubo un error al obtener los datos. Intentá recargar la página.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Recargar
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
