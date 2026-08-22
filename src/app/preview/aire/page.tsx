"use client";
import { useState, useEffect } from "react";
import Aire from "@/components/store/templates/Aire";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { DEFAULT_CONFIG, type StoreConfig } from "@/types/store-config";

/* Arranca con la config por defecto y `previewFill` prendido, en vez de con
   `null`.

   Con `null` la pantalla quedaba a medias hasta que llegara el `postMessage` del
   editor: sin nombre de tienda, sin colores y —lo que mas confunde— sin las
   fotos de ejemplo del hero, porque todas dependen de `previewFill`. Abrir
   /preview/aire de forma suelta mostraba un template roto que no era el
   template. Cuando el editor manda su config, la pisa entera. */
const CONFIG_INICIAL: StoreConfig = { ...DEFAULT_CONFIG, previewFill: true };

export default function PreviewAire() {
  const [config, setConfig] = useState<StoreConfig>(CONFIG_INICIAL);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "STORE_CONFIG_UPDATE") setConfig(e.data.config as StoreConfig);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <StoreConfigContext.Provider value={config}>
      <Aire />
    </StoreConfigContext.Provider>
  );
}
