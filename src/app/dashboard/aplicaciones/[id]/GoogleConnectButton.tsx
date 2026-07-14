"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Abre el login de Google en un popup. Cuando el callback termina, el popup
// avisa por postMessage y se cierra; acá refrescamos la página para que el
// server component relea el estado de conexión.
export default function GoogleConnectButton() {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "ga-oauth") return;
      if (e.data.status === "connected") {
        router.refresh();
      } else {
        setError(true);
        setWaiting(false);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  function openPopup() {
    setError(false);
    setWaiting(true);
    const w = 600;
    const h = 760;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open("/api/google/analytics/oauth/connect", "ga-oauth", `width=${w},height=${h},left=${left},top=${top}`);
  }

  return (
    <div>
      <button
        onClick={openPopup}
        disabled={waiting}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
      >
        {waiting && <Loader2 className="h-4 w-4 animate-spin" />}
        {waiting ? "Esperando a Google…" : "Instalar"}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-2">Hubo un error al conectar con Google. Intentá de nuevo.</p>
      )}
    </div>
  );
}
