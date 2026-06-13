"use client";

import { useEffect } from "react";
import { PushBellProvider } from "@/contexts/PushBellContext";
import StorePushBanner from "./StorePushBanner";
import StorefrontTemplateRenderer from "./StorefrontTemplateRenderer";
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
  // to this store's PWA ("Girly Store") instead of "Chrome • tiendaapps.com".
  // The same /sw.js is used but with a narrower scope per store.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", {
      scope: `/tienda/${storeSlug}`,
      updateViaCache: "none",
    }).catch(() => {});
  }, [storeSlug]);

  return (
    <PushBellProvider storeId={storeId} storeSlug={storeSlug} enabled={showPushBell}>
      {showPushBell && <StorePushBanner storeName={storeName} />}
      <StorefrontTemplateRenderer config={config} />
    </PushBellProvider>
  );
}
