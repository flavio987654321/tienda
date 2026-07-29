"use client";

import { useEffect } from "react";
import { PushBellProvider } from "@/contexts/PushBellContext";
import StorePushBanner from "./StorePushBanner";
import StorefrontTemplateRenderer from "./StorefrontTemplateRenderer";
import StorefrontPaymentSuccess from "./StorefrontPaymentSuccess";
import { migrateStoreSubscription } from "@/lib/push-client";
import type { StoreConfig } from "@/types/store-config";

interface Props {
  config: StoreConfig;
  storeId: string;
  storeName: string;
  storeSlug: string;
  showPushBell: boolean;
}

export default function StoreShell({ config, storeId, storeName, storeSlug, showPushBell }: Props) {
  // Register a store-scoped SW so Android attributes push notifications
  // to this store's PWA instead of "Chrome • tiendaapps.com".
  // After the scoped SW activates, migrate any existing root-scope subscription
  // so returning users also get proper PWA attribution without re-subscribing.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", {
      scope: `/tienda/${storeSlug}`,
      updateViaCache: "none",
    }).then((reg) => {
      // If the scoped SW is waiting (blocked by root SW clients), force activate now.
      // This is safe: the scoped SW only serves push attribution, not any user-visible content.
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      if (showPushBell) migrateStoreSubscription(storeId, storeSlug);
    }).catch(() => {});
  }, [storeId, storeSlug, showPushBell]);

  // Registra UNA visita por día por persona. El dueño viendo su propia tienda no
  // cuenta.
  //
  // Antes deduplicaba con `sessionStorage`, que es por PESTAÑA y se borra al
  // cerrarla: la misma persona con tres pestañas abiertas contaba tres visitas, y
  // volver más tarde el mismo día contaba otra. `localStorage` es del navegador
  // entero y sobrevive al cierre, que es lo que "una visita por día" quiere decir.
  //
  // Y el día tiene que ser el ARGENTINO, el mismo que usa el servidor para
  // guardar la fila. Con la fecha en UTC la clave del navegador cambiaba a las
  // 21:00 mientras el servidor seguía en el mismo día: entre las 21:00 y las 00:00
  // el visitante se contaba dos veces.
  useEffect(() => {
    if (config.isOwner) return;
    // Un navegador manejado por un script (Puppeteer, Playwright, Selenium) lo
    // declara acá. El filtro de bots del servidor mira el User-Agent, que estos
    // suelen disfrazar; esta bandera es más difícil de sacar.
    if (navigator.webdriver) return;

    const hoy = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const key = `sv_${storeSlug}_${hoy}`;

    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      // Las claves de días anteriores no sirven para nada y se acumularían para
      // siempre en el navegador del visitante.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(`sv_${storeSlug}_`) && k !== key) localStorage.removeItem(k);
      }
    } catch {
      // Modo incógnito con almacenamiento bloqueado: se cuenta igual, sin dedup.
    }

    fetch(`/api/store-views/${storeSlug}`, { method: "POST" }).catch(() => {});
  }, [storeSlug, config.isOwner]);

  return (
    <PushBellProvider storeId={storeId} storeSlug={storeSlug} enabled={showPushBell}>
      {showPushBell && <StorePushBanner storeName={storeName} />}
      <StorefrontTemplateRenderer config={config} />
      <StorefrontPaymentSuccess />
    </PushBellProvider>
  );
}
