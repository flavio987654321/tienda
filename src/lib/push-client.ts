// Browser-only utilities for managing push notification subscriptions.
// Import only from client components ("use client").
//
// Dos flujos independientes:
//   1. Dashboard (usuarios autenticados): subscribeToPush / unsubscribeFromPush
//   2. Tiendas (visitantes anónimos): subscribeToStore / unsubscribeFromStore

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    const keyRes = await fetch("/api/push/vapid-key");
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// ─── Tienda (visitantes anónimos) ──────────────────────────────────────────

const STORE_SUB_KEY = (storeId: string) => `push_store_${storeId}`;

export async function subscribeToStore(storeId: string): Promise<boolean> {
  try {
    const keyRes = await fetch("/api/push/vapid-key");
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const json = sub.toJSON();
    const res = await fetch("/api/push/store-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, endpoint: json.endpoint, keys: json.keys }),
    });
    if (!res.ok) return false;

    localStorage.setItem(STORE_SUB_KEY(storeId), "1");
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromStore(storeId: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      localStorage.removeItem(STORE_SUB_KEY(storeId));
      return true;
    }

    await fetch("/api/push/store-subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, endpoint: sub.endpoint }),
    });

    localStorage.removeItem(STORE_SUB_KEY(storeId));
    return true;
  } catch {
    return false;
  }
}

// Devuelve true si localStorage dice suscripto Y el browser tiene suscripción activa.
export async function isSubscribedToStore(storeId: string): Promise<boolean> {
  try {
    if (!localStorage.getItem(STORE_SUB_KEY(storeId))) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // El browser ya no tiene suscripción (permiso revocado), limpiar localStorage
      localStorage.removeItem(STORE_SUB_KEY(storeId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
