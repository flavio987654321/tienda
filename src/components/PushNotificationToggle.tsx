"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  isPushSupported,
} from "@/lib/push-client";

type State = "unsupported" | "loading" | "subscribed" | "unsubscribed" | "error";

export default function PushNotificationToggle() {
  const [state, setState] = useState<State>("loading");

  // PWAManager (rendered higher in the tree) handles SW registration.
  // We just wait for serviceWorker.ready to check the current subscription.
  useEffect(() => {
    if (!isPushSupported()) {
      setState("unsupported");
      return;
    }

    getPushSubscription()
      .then((sub) => setState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setState("error"));
  }, []);

  async function subscribe() {
    setState("loading");
    const ok = await subscribeToPush();
    setState(ok ? "subscribed" : "error");
  }

  async function unsubscribe() {
    setState("loading");
    const ok = await unsubscribeFromPush();
    setState(ok ? "unsubscribed" : "error");
  }

  if (state === "unsupported") return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      {state === "loading" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="flex-1 text-xs text-gray-400">Notificaciones push</span>
        </>
      ) : state === "subscribed" ? (
        <>
          <Bell className="h-4 w-4 fill-indigo-100 text-indigo-600" />
          <span className="flex-1 text-xs font-medium text-gray-700">Notificaciones activas</span>
          <button
            onClick={unsubscribe}
            className="text-xs text-gray-400 transition-colors hover:text-red-500"
          >
            Desactivar
          </button>
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4 text-gray-400" />
          <span className="flex-1 text-xs text-gray-500">Notificaciones push</span>
          <button
            onClick={subscribe}
            className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
          >
            Activar
          </button>
        </>
      )}

      {state === "error" && (
        <span className="text-xs text-red-500">Error — intentá de nuevo</span>
      )}
    </div>
  );
}
