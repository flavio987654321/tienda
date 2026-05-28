"use client";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import type { StoreConfig } from "@/types/store-config";
import FashionNoir from "./templates/FashionNoir";
import BohoTerra from "./templates/BohoTerra";
import UrbanPulse from "./templates/UrbanPulse";
import ChicParis from "./templates/ChicParis";

const TEMPLATES: Record<string, React.ComponentType> = {
  "fashion-noir": FashionNoir,
  "boho-terra":   BohoTerra,
  "urban-pulse":  UrbanPulse,
  "chic-paris":   ChicParis,
};

export default function StorefrontTemplateRenderer({ config }: { config: StoreConfig }) {
  const Template = TEMPLATES[config.template];
  if (!Template) return null;
  return (
    <StoreConfigContext.Provider value={config}>
      <Template />
    </StoreConfigContext.Provider>
  );
}
