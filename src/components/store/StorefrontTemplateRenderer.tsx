"use client";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { EditContext } from "@/contexts/EditContext";
import type { StoreConfig } from "@/types/store-config";
import FashionNoir from "./templates/FashionNoir";
import BohoTerra from "./templates/BohoTerra";
import UrbanPulse from "./templates/UrbanPulse";
import ChicParis from "./templates/ChicParis";
import AutoMotor from "./templates/AutoMotor";
import AutoDrive from "./templates/AutoDrive";
import ElectroPrime from "./templates/ElectroPrime";
import TechNova from "./templates/TechNova";
import HomeStudio from "./templates/HomeStudio";
import CasaClara from "./templates/CasaClara";
import FlyerPopup from "./FlyerPopup";

const TEMPLATES: Record<string, React.ComponentType> = {
  "fashion-noir": FashionNoir,
  "boho-terra":   BohoTerra,
  "urban-pulse":  UrbanPulse,
  "chic-paris":   ChicParis,
  "auto-motor":   AutoMotor,
  "auto-drive":   AutoDrive,
  "electro-prime": ElectroPrime,
  "tech-nova":     TechNova,
  "home-studio":   HomeStudio,
  "casa-clara":    CasaClara,
};

export default function StorefrontTemplateRenderer({ config }: { config: StoreConfig }) {
  const Template = TEMPLATES[config.template];
  if (!Template) return null;
  return (
    <StoreConfigContext.Provider value={config}>
      <EditContext.Provider value={{
        editMode: false,
        activeField: null,
        setActiveField: () => {},
        overrides: config.textOverrides,
        setOverride: () => {},
        resetOverride: () => {},
        imageOverrides: config.imageOverrides,
        setImageOverride: () => {},
        sectionColors: config.sectionColors,
        setSectionColor: () => {},
        imageLoading: {},
        hiddenSections: config.hiddenSections ?? [],
        toggleHiddenSection: () => {},
        sectionOrder: config.sectionOrder ?? [],
        moveSection: () => {},
      }}>
        <Template />
        {!config.isOwner && config.flyerConfig?.enabled && (config.flyerConfig.images?.length ?? 0) > 0 && (
          <FlyerPopup flyer={config.flyerConfig} />
        )}
      </EditContext.Provider>
    </StoreConfigContext.Provider>
  );
}
