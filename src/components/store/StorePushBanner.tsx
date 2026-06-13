"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";
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

// Solo se usa para no mostrar el badge rojo en usuarios que ya vieron el prompt
const SEEN_KEY = (id: string) => `push_seen_${id}`;

export default function StorePushBanner({ storeId, storeName }: Props) {
  const [state, setState] = useState<State>("checking");
  const [action, setAction] = useState<ActionState>("idle");
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true); // true = no mostrar badge hasta saber
  const popoverRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setState("hidden");
      return;
    }
    setSeen(!!localStorage.getItem(SEEN_KEY(storeId)));
    isSubscribedToStore(storeId).then((subscribed) => {
      setState(subscribed ? "subscribed" : "prompt");
    });
  }, [storeId]);

  // Cierra el popover al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggleOpen() {
    if (!open && !seen) {
      localStorage.setItem(SEEN_KEY(storeId), "1");
      setSeen(true);
    }
    setOpen((v) => !v);
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
    if (ok) setOpen(false);
  }

  async function handleUnsubscribe() {
    setAction("busy");
    setState("loading");
    const ok = await unsubscribeFromStore(storeId);
    setAction("idle");
    if (ok) {
      localStorage.removeItem(SEEN_KEY(storeId));
      setSeen(false);
      setState("prompt");
      setOpen(false);
    } else {
      setState("subscribed");
    }
  }

  if (state === "hidden" || state === "checking") return null;

  const isSubscribed = state === "subscribed";
  const isLoading = state === "loading";
  const showBadge = !seen && !isSubscribed;

  return (
    <>
      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="fixed bottom-[72px] right-4 z-[9991] w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4"
        >
          {/* Flecha apuntando al botón */}
          <div
            className="absolute -bottom-2 right-[18px] w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45"
            aria-hidden
          />

          <div className="flex items-start gap-3 mb-3">
            <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl ${isSubscribed ? "bg-indigo-50" : "bg-gray-50"}`}>
              <Bell className={`h-4 w-4 ${isSubscribed ? "text-indigo-600 fill-indigo-100" : "text-gray-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-tight">
                {isSubscribed ? "Notificaciones activas" : `Novedades de ${storeName}`}
              </p>
              <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                {isSubscribed
                  ? "Recibís alertas cuando la tienda publique novedades."
                  : state === "error"
                  ? "Revisá los permisos de notificaciones en tu navegador."
                  : "Activá para recibir alertas de productos y ofertas."}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg hover:bg-gray-100 transition-colors -mt-0.5 -mr-0.5"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>

          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={action === "busy"}
              className="w-full py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
            >
              Desactivar notificaciones
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={action === "busy" || isLoading}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              Activar notificaciones
            </button>
          )}
        </div>
      )}

      {/* Bell FAB */}
      <button
        ref={btnRef}
        onClick={toggleOpen}
        aria-label={isSubscribed ? "Gestionar notificaciones" : "Activar notificaciones"}
        className={`fixed bottom-5 right-4 z-[9990] w-11 h-11 rounded-full shadow-lg border flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 ${
          isSubscribed
            ? "bg-indigo-600 border-indigo-700 text-white"
            : "bg-white border-gray-200 text-gray-400 hover:text-indigo-500 hover:border-indigo-200"
        }`}
      >
        {isLoading ? (
          <Loader2 className={`h-5 w-5 animate-spin ${isSubscribed ? "text-white" : "text-indigo-500"}`} />
        ) : (
          <Bell className={`h-5 w-5 ${isSubscribed ? "fill-white/20" : ""}`} />
        )}

        {/* Badge rojo para primera visita */}
        {showBadge && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </>
  );
}
