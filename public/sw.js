// ─── TiendaApps Service Worker ─────────────────────────────────────────────
// SW_VERSION nombra el caché de ESTE service worker, que guarda dos cosas y
// nada más: la pantalla de "sin conexión" —la de la tienda, si es el SW de una
// tienda— y el favicon (ver el install de abajo).
// El fetch es network-first y solo intercepta navegación, así que el código de
// la app NUNCA sale de acá — siempre se pide a la red.
//
// O sea: subir este número NO es lo que hace que el usuario reciba la versión
// nueva de la app. De eso se encarga src/lib/app-versions.ts, que sale del
// commit deployado y avisa solo. Tocá esto únicamente si cambiás offline.html
// o el favicon y querés que se refresquen en quienes ya tienen la app instalada.
const SW_VERSION = "v13";
const CACHE_NAME = `tiendaapps-${SW_VERSION}`;

/* La pantalla de "sin conexión" que le toca a ESTE service worker.
 *
 * El mismo archivo se registra dos veces con scopes distintos: en la raíz, y una
 * vez por tienda en `/tienda/<slug>` (lo hace StoreShell, originalmente para que
 * Android atribuya bien los push). Eso alcanza para saber de quién es esta copia:
 * `self.registration.scope` trae la url completa del scope.
 *
 * Y sirve para arreglar algo que un archivo estático no podía. `offline.html` es
 * uno solo y dice "TiendaApps": alguien que instaló la app de su almacén, se
 * queda sin señal y abre el ícono, veía la marca de otro justo en el peor
 * momento. Cada tienda ahora se guarda la suya, con su logo y su color.
 *
 * La raíz —el panel, la web— se sigue quedando con la genérica, que ahí es la
 * correcta. */
const OFFLINE_URL = (() => {
  const enTienda = new URL(self.registration.scope).pathname.match(/^\/tienda\/([^/]+)/);
  return enTienda ? `/tienda/${enTienda[1]}/sin-conexion` : "/offline.html";
})();

/* El ícono de la app. ES `/icon.png`, NO `/favicon.ico`.
 *
 * Acá decía `/favicon.ico`, un archivo que en este proyecto no existe —el ícono
 * se sirve desde `public/icon.png`—. Y rompía dos cosas de una:
 *
 *   1. El `install` de abajo lo guardaba con `cache.addAll`, que es TODO O NADA:
 *      basta que una sola url falle para que rechace el array entero y no quede
 *      guardado nada. O sea que el 404 del favicon se llevaba puesta también a la
 *      pantalla de "sin conexión", y encima el `.catch(() => {})` lo hacía en
 *      silencio. La pantalla offline no funcionó nunca, para nadie.
 *   2. Es el ícono por defecto de las notificaciones push (ver más abajo), así
 *      que las que no traían uno propio salían sin ícono.
 */
const ICONO = "/icon.png";

// ─── Install: pre-cache offline shell ──────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // De a uno, no con `addAll`. Lo que importa guardar es la pantalla de
        // sin conexión; el ícono es un extra, y un extra no puede dejar sin
        // pantalla a la app. Si mañana se suma otro archivo, esto ya no se rompe.
        Promise.all(
          [OFFLINE_URL, ICONO].map((url) =>
            cache
              .add(url)
              .catch((e) => console.error("[sw] no se pudo guardar", url, e))
          )
        )
      )
      .catch((e) => console.error("[sw] no se pudo abrir el cache", e))
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

/* La pantalla guardada se refresca una vez por arranque del service worker.
 *
 * Se guarda en el `install`, que corre UNA sola vez por versión. Sin esto, una
 * tienda que cambia su logo o su nombre seguía mostrando los viejos en la
 * pantalla de sin conexión hasta que alguien se acordara de subir `SW_VERSION` —
 * o sea, probablemente nunca.
 *
 * Se hace después de una navegación que SALIÓ BIEN (ahí sabemos que hay red) y
 * una sola vez por arranque: el navegador apaga y prende el service worker todo
 * el tiempo, así que termina refrescándose seguido sin agregar un pedido por
 * cada página que se abre. */
let yaRefresque = false;
function refrescarPantallaOffline() {
  if (yaRefresque) return;
  yaRefresque = true;
  caches
    .open(CACHE_NAME)
    .then((cache) => cache.add(OFFLINE_URL))
    .catch(() => {
      // Sin conexión o la ruta falló: queda la copia anterior, que es lo correcto.
    });
}

// ─── Fetch: network-first; serve offline page on navigation failure ─────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Only intercept same-origin navigation requests.
  if (url.origin !== self.location.origin) return;
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        event.waitUntil(Promise.resolve().then(refrescarPantallaOffline));
        return res;
      })
      .catch(() =>
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
  // Ver el comentario de `ICONO`: acá decía `/favicon.ico`, que da 404, así que
  // toda notificación sin ícono propio salía sin ícono.
  const notifIcon = icon || ICONO;

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
