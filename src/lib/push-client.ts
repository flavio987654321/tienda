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
const STORE_MIGRATED_KEY = (storeSlug: string) => `push_sw_migrated_${storeSlug}`;

// Returns the store-scoped SW registration, waiting up to 3s for it to activate.
// Falls back to the root SW only if the scoped one never activates.
// Using the store-scoped registration is important on Android: Chrome attributes
// push notifications to the PWA (not "Chrome • domain") only when the subscription
// was created under the SW matching the installed manifest scope.
async function getStoreReg(storeSlug: string): Promise<ServiceWorkerRegistration> {
  const scopedReg = await navigator.serviceWorker.getRegistration(`/tienda/${storeSlug}`);
  if (!scopedReg) return navigator.serviceWorker.ready;
  if (scopedReg.active) return scopedReg;

  // SW registered but stuck in waiting — force it to skip waiting and activate.
  // The scoped SW is used solely for push attribution; no user-visible update to protect,
  // so bypassing the normal wait is safe.
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    const sw = scopedReg.installing ?? scopedReg.waiting;
    if (!sw) { clearTimeout(timeout); resolve(); return; }
    // If already installed (waiting), force activate immediately
    if (sw.state === "installed") sw.postMessage({ type: "SKIP_WAITING" });
    sw.addEventListener("statechange", function handler() {
      if (sw.state === "installed") sw.postMessage({ type: "SKIP_WAITING" });
      if (sw.state === "activated") {
        clearTimeout(timeout);
        sw.removeEventListener("statechange", handler);
        resolve();
      }
    });
  });

  return scopedReg.active ? scopedReg : navigator.serviceWorker.ready;
}

export async function subscribeToStore(storeId: string, storeSlug: string): Promise<boolean> {
  try {
    const keyRes = await fetch("/api/push/vapid-key");
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();

    const reg = await getStoreReg(storeSlug);
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

    // Remove any old root-scope subscription from the server to prevent duplicate pushes.
    // This happens during migration: root SW had endpoint A, scoped SW now has endpoint B.
    // Fire-and-forget — failure is non-fatal, worst case is one extra notification.
    const rootReg = await navigator.serviceWorker.ready;
    if (rootReg !== reg) {
      const rootSub = await rootReg.pushManager.getSubscription();
      if (rootSub && rootSub.endpoint !== json.endpoint) {
        fetch("/api/push/store-subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId, endpoint: rootSub.endpoint }),
        }).catch(() => {});
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeFromStore(storeId: string, storeSlug: string): Promise<boolean> {
  try {
    const reg = await getStoreReg(storeSlug);
    const sub = await reg.pushManager.getSubscription();

    // Also check root SW for old subscriptions (migration scenario)
    const rootReg = await navigator.serviceWorker.ready;
    const rootSub = rootReg !== reg ? await rootReg.pushManager.getSubscription() : null;

    if (!sub && !rootSub) {
      localStorage.removeItem(STORE_SUB_KEY(storeId));
      return true;
    }

    // Delete scoped endpoint from server
    if (sub) {
      const res = await fetch("/api/push/store-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, endpoint: sub.endpoint }),
      });
      // Only clear local state if server confirmed deletion; otherwise the UI stays
      // "subscribed" and the user can retry — prevents orphaned server subscriptions
      // that keep delivering pushes after the user thinks they unsubscribed (iOS bug).
      if (!res.ok) return false;
    }

    // Also delete old root-scope endpoint if it's a different endpoint
    if (rootSub && rootSub.endpoint !== sub?.endpoint) {
      fetch("/api/push/store-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, endpoint: rootSub.endpoint }),
      }).catch(() => {});
    }

    localStorage.removeItem(STORE_SUB_KEY(storeId));
    return true;
  } catch {
    return false;
  }
}


// Migrates an existing push subscription to the store-scoped SW.
// Called on page load: if the user was subscribed under the root SW (before per-store
// scoped SWs were introduced), silently re-subscribes under the store-scoped SW so
// Android attributes notifications to the installed PWA instead of "Chrome • domain".
export async function migrateStoreSubscription(storeId: string, storeSlug: string): Promise<void> {
  try {
    if (localStorage.getItem(STORE_MIGRATED_KEY(storeSlug))) return;
    if (!localStorage.getItem(STORE_SUB_KEY(storeId))) return;

    const scopedReg = await navigator.serviceWorker.getRegistration(`/tienda/${storeSlug}`);
    if (!scopedReg?.active) return;

    // If store-scoped reg already has a subscription, nothing to migrate
    const scopedSub = await scopedReg.pushManager.getSubscription();
    if (scopedSub) {
      localStorage.setItem(STORE_MIGRATED_KEY(storeSlug), "1");
      return;
    }

    // Re-subscribe under the store-scoped SW (no permission dialog — already granted)
    const keyRes = await fetch("/api/push/vapid-key");
    if (!keyRes.ok) return;
    const { publicKey } = await keyRes.json();

    const sub = await scopedReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = sub.toJSON();
    const res = await fetch("/api/push/store-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, endpoint: json.endpoint, keys: json.keys }),
    });
    if (res.ok) {
      localStorage.setItem(STORE_MIGRATED_KEY(storeSlug), "1");
    }
  } catch {}
}

/* ───────────────────────────────────────────────────────────────────────────
 * El panel: una sola dirección de entrega, en la puerta correcta.
 *
 * Tres problemas que arregla esta función, y los tres se veían en la base:
 *
 *   1. LAS DIRECCIONES SE PERDÍAN Y NADIE HACÍA UNA NUEVA.
 *      Cuando una suscripción vence, el servidor la borra al primer envío que
 *      falla (410/404), y hace bien. Pero después nadie la reemplazaba: el
 *      cartel de "activá las notificaciones" solo aparece si el permiso está en
 *      `default`, y el de esta persona ya está en `granted`. O sea que dejaba de
 *      recibir avisos de pedidos, para siempre, sin enterarse. Seguía viendo el
 *      permiso dado y confiando en que le iban a llegar.
 *
 *   2. SE ACUMULABAN. `sendPushToUser` manda a TODAS las filas del usuario, y
 *      cada re-suscripción crea una fila nueva porque el endpoint cambia. En la
 *      base había alguien con cuatro para la misma tienda: cada novedad le
 *      llegaba cuatro veces.
 *
 *   3. ESTABAN ANOTADAS EN LA PUERTA EQUIVOCADA. El manifiesto del panel declara
 *      `/dashboard`, pero el service worker se registraba en la raíz. Android
 *      atribuye la notificación a la app instalada solo si la suscripción nació
 *      bajo el service worker que coincide con ese scope; si no, la muestra como
 *      "Chrome · tiendaapps.com".
 *
 * No pide permiso ni muestra ningún diálogo: si el permiso no está dado, se va.
 * Suscribir con el permiso ya concedido es silencioso.
 * ─────────────────────────────────────────────────────────────────────────── */
export async function asegurarSuscripcionDelPanel(scope: string): Promise<void> {
  try {
    if (!isPushSupported()) return;
    // Sin permiso no hay nada que hacer acá: de eso se encarga el cartel.
    if (Notification.permission !== "granted") return;

    const reg = await navigator.serviceWorker.getRegistration(scope);
    if (!reg?.active) return;

    const keyRes = await fetch("/api/push/vapid-key");
    if (!keyRes.ok) return;
    const { publicKey } = await keyRes.json();

    // La del scope correcto. Si no existe, se crea; si ya existe, se deja.
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const json = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    if (!res.ok) return;

    /* Y ahora la vieja, la de la raíz, la que hacía llegar todo por duplicado.
       Se borra SOLO la de este mismo aparato: quien usa el panel en la
       computadora y en el celular tiene una fila legítima por cada uno, y borrar
       "todas las demás del usuario" le apagaría la otra.

       Se borra la fila del servidor y NO se llama a `unsubscribe()`, aunque a
       primera vista sea lo prolijo. El motivo: una registración de service worker
       tiene UNA sola suscripción, y la de la raíz puede estar sirviendo también a
       una tienda — `getStoreReg` cae a la raíz cuando el service worker de la
       tienda todavía no terminó de activarse. Dándola de baja del navegador se
       mataría de paso el aviso de novedades de esa tienda, que no tiene nada que
       ver con el panel.

       Dejarla viva del lado del navegador no cuesta nada: las repeticiones salen
       de las FILAS de la base, que es a quien se le manda, y esa ya no está. Y
       esta función solo mira la registración del scope, así que no la va a
       registrar de nuevo. */
    const raiz = await navigator.serviceWorker.getRegistration("/");
    if (!raiz || raiz.scope === reg.scope) return;

    const vieja = await raiz.pushManager.getSubscription();
    if (!vieja || vieja.endpoint === sub.endpoint) return;

    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: vieja.endpoint }),
    }).catch(() => {});
  } catch {
    // Nunca romper el panel por esto: es una mejora de fondo, no una función.
  }
}
