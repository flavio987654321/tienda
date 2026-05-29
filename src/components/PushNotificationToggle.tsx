"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

type State = "unsupported" | "loading" | "subscribed" | "unsubscribed" | "error";

export default function PushNotificationToggle() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setState("error"));
  }, []);

  async function subscribe() {
    setState("loading");
    try {
      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) throw new Error("Push no configurado en el servidor");
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      setState("subscribed");
    } catch (err) {
      console.error("[push] subscribe failed:", err);
      setState("error");
    }
  }

  async function unsubscribe() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch (err) {
      console.error("[push] unsubscribe failed:", err);
      setState("error");
    }
  }

  if (state === "unsupported") return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
      {state === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      ) : state === "subscribed" ? (
        <>
          <Bell className="h-4 w-4 text-indigo-600 fill-indigo-100" />
          <span className="text-xs text-gray-600 font-medium flex-1">Notificaciones activas</span>
          <button
            onClick={unsubscribe}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Desactivar
          </button>
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 flex-1">Notificaciones push</span>
          <button
            onClick={subscribe}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
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
