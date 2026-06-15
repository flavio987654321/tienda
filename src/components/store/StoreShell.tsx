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

  // Registra una visita por día por sesión (dedup con sessionStorage).
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `sv_${storeSlug}_${today}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/store-views/${storeSlug}`, { method: "POST" }).catch(() => {});
  }, [storeSlug]);

  return (
    <PushBellProvider storeId={storeId} storeSlug={storeSlug} enabled={showPushBell}>
      {showPushBell && <StorePushBanner storeName={storeName} />}
      <StorefrontTemplateRenderer config={config} />
      <StorefrontPaymentSuccess />
    </PushBellProvider>
  );
}
