"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// A diferencia de Meta o Analytics, acá no hay OAuth: instalar es simplemente
// dar el permiso para que los productos de la tienda entren al feed central
// que lee el Merchant Center de la plataforma.
export default function GoogleShoppingInstallButton() {
  const router = useRouter();
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState(false);

  async function install() {
    setInstalling(true);
    setError(false);
    const res = await fetch("/api/google/shopping/install", { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setError(true);
    }
    setInstalling(false);
  }

  return (
    <div>
      <button
        onClick={install}
        disabled={installing}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
      >
        {installing && <Loader2 className="h-4 w-4 animate-spin" />}
        {installing ? "Instalando…" : "Instalar"}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-2">No se pudo instalar. Intentá de nuevo.</p>
      )}
    </div>
  );
}
