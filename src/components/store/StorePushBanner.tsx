"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X, Loader2 } from "lucide-react";
import {
  isPushSupported,
  isSubscribedToStore,
  subscribeToStore,
  unsubscribeFromStore,
} from "@/lib/push-client";

interface Props {
  storeId: string;
  storeName: string;
}

type State = "checking" | "hidden" | "prompt" | "loading" | "subscribed" | "error";
type ActionState = "idle" | "busy";

// Clave solo para "nunca suscripto y cerró el prompt"
const DISMISSED_KEY = (id: string) => `push_banner_dismissed_${id}`;

export default function StorePushBanner({ storeId, storeName }: Props) {
  const [state, setState] = useState<State>("checking");
  const [action, setAction] = useState<ActionState>("idle");

  useEffect(() => {
    if (!isPushSupported()) {
      setState("hidden");
      return;
    }

    isSubscribedToStore(storeId).then((subscribed) => {
      if (subscribed) {
        // Suscripto → siempre mostrar para que pueda desactivar
        setState("subscribed");
      } else if (localStorage.getItem(DISMISSED_KEY(storeId))) {
        // Nunca suscripto y ya descartó el prompt → no molestar
        setState("hidden");
      } else {
        setState("prompt");
      }
    });
  }, [storeId]);

  // X cuando está en prompt/error → descarta permanentemente (ya no suscripto, no quiere)
  function dismissPrompt() {
    localStorage.setItem(DISMISSED_KEY(storeId), "1");
    setState("hidden");
  }

  // X cuando está suscripto → oculta solo en esta sesión, vuelve a aparecer en la próxima visita
  function hideForSession() {
    setState("hidden");
  }

  async function handleSubscribe() {
    if (Notification.permission === "denied") {
      setState("error");
      return;
    }
    setAction("busy");
    setState("loading");
    const ok = await subscribeToStore(storeId);
    setAction("idle");
    setState(ok ? "subscribed" : "error");
  }

  async function handleUnsubscribe() {
    setAction("busy");
    setState("loading");
    const ok = await unsubscribeFromStore(storeId);
    setAction("idle");
    if (ok) {
      // Borra el dismissed key para que en la próxima visita aparezca el prompt de re-activar
      localStorage.removeItem(DISMISSED_KEY(storeId));
      setState("prompt");
    } else {
      setState("subscribed");
    }
  }

  if (state === "hidden" || state === "checking") return null;

  const isSubscribed = state === "subscribed";

  return (
    <div
      role="region"
      aria-label="Notificaciones de la tienda"
      className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-[9990] w-[calc(100%-2rem)] max-w-sm"
    >
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg px-4 py-3 flex items-center gap-3">
        {/* Icono */}
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          ) : isSubscribed ? (
            <Bell className="h-4 w-4 fill-indigo-100 text-indigo-600" />
          ) : (
            <BellOff className="h-4 w-4 text-indigo-400" />
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          {isSubscribed ? (
            <>
              <p className="text-xs font-semibold text-gray-800 leading-tight">Notificaciones activas</p>
              <p className="text-[11px] text-gray-400 leading-tight">
                Te avisamos cuando haya novedades en {storeName}.
              </p>
            </>
          ) : state === "error" ? (
            <>
              <p className="text-xs font-semibold text-red-600 leading-tight">No se pudo activar</p>
              <p className="text-[11px] text-gray-400 leading-tight">
                Revisá los permisos de notificaciones en tu navegador.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-800 leading-tight">
                Novedades de {storeName}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight">
                Activá para recibir alertas de productos y ofertas.
              </p>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={action === "busy"}
              className="text-[11px] text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Desactivar
            </button>
          ) : state === "prompt" || state === "error" ? (
            <button
              onClick={handleSubscribe}
              disabled={action === "busy"}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 min-w-[72px] justify-center"
            >
              <Bell className="h-3.5 w-3.5 shrink-0" />
              Activar
            </button>
          ) : null}

          <button
            onClick={isSubscribed ? hideForSession : dismissPrompt}
            aria-label="Cerrar"
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
