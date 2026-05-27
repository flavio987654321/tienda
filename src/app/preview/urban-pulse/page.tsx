"use client";
import { useState, useEffect } from "react";
import UrbanPulse from "@/components/store/templates/UrbanPulse";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import type { StoreConfig } from "@/types/store-config";

export default function PreviewUrbanPulse() {
  const [config, setConfig] = useState<StoreConfig | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "STORE_CONFIG_UPDATE") setConfig(e.data.config as StoreConfig);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <StoreConfigContext.Provider value={config}>
      <UrbanPulse />
    </StoreConfigContext.Provider>
  );
}
