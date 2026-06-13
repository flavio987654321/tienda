"use client";

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
  return (
    <PushBellProvider storeId={storeId} storeSlug={storeSlug} enabled={showPushBell}>
      {showPushBell && <StorePushBanner storeName={storeName} />}
      <StorefrontTemplateRenderer config={config} />
    </PushBellProvider>
  );
}
