// ─── TiendaApps Service Worker ─────────────────────────────────────────────
// Bump SW_VERSION when deploying to force cache invalidation on all clients.
const SW_VERSION = "v12";
const CACHE_NAME = `tiendaapps-${SW_VERSION}`;
const OFFLINE_URL = "/offline.html";

// ─── Install: pre-cache offline shell ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/favicon.ico"]))
      .catch(() => {})
  );
  // Do NOT call skipWaiting() here.
  // PWAManager controls when the update applies (after user confirms).
});

// ─── Activate: clean stale caches, claim all open tabs ─────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== CACHE_NAME)
              .map((k) => caches.delete(k))
          )
        ),
      self.clients.claim(),
    ])
  );
});

// ─── Fetch: network-first; serve offline page on navigation failure ─────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Only intercept same-origin navigation requests.
  if (url.origin !== self.location.origin) return;
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(OFFLINE_URL)
        .then((cached) => cached || new Response("Sin conexión", { status: 503 }))
    )
  );
});

// ─── Push: show notification + signal open tabs to play sound ───────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const { title, body, icon, url, tag, storeName } = data;

  const notifBody = storeName ? `${body ?? ""}\n— ${storeName}` : (body ?? "");
  const notifIcon = icon || "/favicon.ico";

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: notifBody,
        icon: notifIcon,
        badge: notifIcon,
        data: { url: url || "/dashboard" },
        requireInteraction: false,
        vibrate: [200, 80, 200],
        tag: tag || "tiendaapps",
        renotify: true,
      }),
      // Signal all open windows so they can play the in-app sound.
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((cs) => cs.forEach((c) => c.postMessage({ type: "PUSH_RECEIVED", data }))),
    ])
  );
});

// ─── Notification click: focus existing tab or open a new one ───────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((cs) => {
        for (const c of cs) {
          if (c.url.includes(target) && "focus" in c) return c.focus();
        }
        return self.clients.openWindow(target);
      })
  );
});

// ─── Message: allow PWAManager to trigger a controlled version update ───────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
