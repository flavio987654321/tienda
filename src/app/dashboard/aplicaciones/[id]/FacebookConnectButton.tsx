"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, XCircle } from "lucide-react";
import { pedirFocoInstalacion } from "./instalacion-foco";

// Abre el login de Facebook en un popup (como Shopify). Cuando el callback
// termina, el popup avisa por postMessage y se cierra; acá refrescamos la
// página para que el server component relea el estado de conexión.
//
// El postMessage NO siempre llega: si el dueño cierra la ventana a mitad de
// camino, si el navegador bloquea el popup, o si se le corta internet mientras
// Facebook redirige, no llega nada nunca. Antes eso dejaba el botón en
// "Esperando a Facebook…" para siempre y no se destrababa ni tocándolo — había
// que recargar la página entera. Por eso además del mensaje vigilamos que la
// ventana siga abierta.
export default function FacebookConnectButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popupRef = useRef<Window | null>(null);
  const vigilanciaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Marca que el flujo terminó bien: si no, al cerrarse el popup (que se cierra
  // solo al terminar) el vigilante lo tomaría como "lo cerró el usuario".
  const listoRef = useRef(false);

  function pararVigilancia() {
    if (vigilanciaRef.current) {
      clearInterval(vigilanciaRef.current);
      vigilanciaRef.current = null;
    }
  }

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "fb-oauth") return;
      pararVigilancia();
      if (e.data.status === "connected") {
        listoRef.current = true;
        // El refresh de abajo hace aparecer los pasos varias pantallas más
        // abajo, y sin esto la ventana se queda arriba: lo único que cambiaba a
        // la vista era este botón poniéndose verde, así que parecía terminado.
        pedirFocoInstalacion();
        router.refresh();
      } else {
        setError("Facebook no pudo completar la conexión. Intentá de nuevo.");
        setWaiting(false);
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      pararVigilancia();
    };
  }, [router]);

  function openPopup() {
    setError(null);
    listoRef.current = false;

    const w = 600;
    const h = 760;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      "/api/facebook/oauth/connect",
      "fb-oauth",
      `width=${w},height=${h},left=${left},top=${top}`,
    );

    // Popup bloqueado por el navegador: nunca va a haber postMessage.
    if (!popup) {
      setError("Tu navegador bloqueó la ventana de Facebook. Permitila y probá de nuevo.");
      return;
    }

    popupRef.current = popup;
    setWaiting(true);

    pararVigilancia();
    vigilanciaRef.current = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        pararVigilancia();
        // Si terminó bien, el postMessage ya corrió y esto es solo el cierre normal.
        if (!listoRef.current) {
          setWaiting(false);
          setError("Se cerró la ventana de Facebook antes de terminar. Probá de nuevo.");
        }
      }
    }, 700);
  }

  if (!configured) {
    return (
      <div>
        <button
          disabled
          className="inline-flex items-center gap-2 bg-slate-200 text-slate-400 font-bold px-8 py-2.5 rounded-lg text-sm cursor-not-allowed"
        >
          <Clock className="h-4 w-4" /> Muy pronto
        </button>
        <p className="text-[11px] text-slate-400 mt-2">
          Estamos terminando de habilitar la conexión con Meta. Vas a poder instalarla en breve.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={openPopup}
        disabled={waiting}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
      >
        {waiting && <Loader2 className="h-4 w-4 animate-spin" />}
        {waiting ? "Esperando a Facebook…" : "Instalar"}
      </button>
      {error && (
        <p className="flex items-start gap-1.5 text-xs text-red-300 mt-2.5 max-w-xs">
          <XCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
          {error}
        </p>
      )}
    </div>
  );
}
