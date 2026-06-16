"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ShoppingBag } from "lucide-react";

export default function MiCuentaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mi-cuenta] error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f5f4ff] flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 text-center max-w-sm w-full">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50 text-red-400 mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="font-black text-gray-950 text-lg mb-1">Algo salió mal</h1>
        <p className="text-sm text-gray-400 mb-6">
          No pudimos cargar tu cuenta. Podés intentar de nuevo o volver al inicio.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" /> Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
