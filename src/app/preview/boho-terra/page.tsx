"use client";
import { useState, useEffect } from "react";
import BohoTerra from "@/components/store/templates/BohoTerra";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { DEFAULT_CONFIG, type StoreConfig } from "@/types/store-config";

/* Arranca con la config por defecto y `previewFill` prendido, en vez de con
   `null`. Es el mismo arreglo que ya tenía `/preview/aire`.

   Con `null` el template no sabe que está en una previa, y eso tiene dos
   consecuencias feas. La visible: queda sin nombre de tienda, sin colores y sin
   las fotos de ejemplo, así que abrir esta dirección mostraba un template roto
   que no era el template. Y la que costó encontrar: `isPreview` sale de
   `previewFill`, así que el template se creía publicado y al tocar "ver catálogo"
   se iba a otra página en vez de abrirlo acá mismo.

   Cuando el editor manda su config, la pisa entera. */
const CONFIG_INICIAL: StoreConfig = { ...DEFAULT_CONFIG, template: "boho-terra", previewFill: true };

export default function PreviewBohoTerra() {
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
      <BohoTerra />
    </StoreConfigContext.Provider>
  );
}
