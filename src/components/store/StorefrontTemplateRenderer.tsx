"use client";
import { StoreConfigContext } from "@/contexts/StoreConfigContext";
import { EditContext } from "@/contexts/EditContext";
import type { StoreConfig } from "@/types/store-config";
import Aire from "./templates/Aire";
import BohoTerra from "./templates/BohoTerra";
import UrbanPulse from "./templates/UrbanPulse";
import ChicParis from "./templates/ChicParis";
import Aurora from "./templates/Aurora";
import AutoMotor from "./templates/AutoMotor";
import AutoDrive from "./templates/AutoDrive";
import ElectroPrime from "./templates/ElectroPrime";
import TechNova from "./templates/TechNova";
import HomeStudio from "./templates/HomeStudio";
import CasaClara from "./templates/CasaClara";
import FlyerPopup from "./FlyerPopup";
import GamificationWidget from "./GamificationWidget";
import { GAMIFICATION_EXCLUDED_TEMPLATES } from "@/lib/gamification";

const TEMPLATES: Record<string, React.ComponentType> = {
  "aire":         Aire,
  /* Alias del id viejo. Aire REEMPLAZA a Fashion Noir, que ademas de ser un
     template era el valor por defecto: cualquier tienda cuyo JSON haya quedado
     con "fashion-noir" escrito seguiria entrando por aca. Sin esta linea,
     `TEMPLATES[config.template]` da undefined y el componente devuelve null —
     la tienda no muestra NADA, sin un error que lo explique. */
  "fashion-noir": Aire,
  "boho-terra":   BohoTerra,
  "urban-pulse":  UrbanPulse,
  "chic-paris":   ChicParis,
  /* Faltaba. Aurora estaba en el selector de templates —con su componente y todo—
     pero no en ESTA lista, que es la que dibuja la tienda publicada. O sea que la
     duenia lo podia elegir, ver la previa, guardar, y su tienda quedaba en BLANCO:
     `TEMPLATES["aurora"]` daba undefined y el componente de arriba devuelve null.
     Es exactamente lo que avisa el comentario de "fashion-noir" cuatro lineas mas
     arriba, y volvio a pasar. Ahora hay un chequeo que lo cuida. */
  "aurora":       Aurora,
  "auto-motor":   AutoMotor,
  "auto-drive":   AutoDrive,
  "electro-prime": ElectroPrime,
  "tech-nova":     TechNova,
  "home-studio":   HomeStudio,
  "casa-clara":    CasaClara,
};

/* La tipografía de la plataforma NO entra a las tiendas.
 *
 * El layout raíz pasó a servir Figtree como fuente de la marca TiendaApps, y
 * `body` la hereda. Sin esto, las tiendas de los comerciantes amanecían con
 * otra letra de un día para el otro, sin que nadie se los hubiera avisado.
 *
 * Además sería un cambio a medias: la mayoría de los templates declaran su
 * tipografía con `style={{ fontFamily }}` inline —que le gana a lo heredado—
 * pero no en todos los textos. Se cambiaría solo la parte que no tiene estilo
 * propio, y cada tienda quedaría con dos tipografías mezcladas.
 *
 * Va acá y no en un layout de ruta porque por este mismo componente pasan las
 * tres vistas: la tienda publicada, la previa del editor y la del panel. Si se
 * separara por ruta, la previa dejaría de coincidir con la tienda real.
 *
 * `display: contents` hace que este div no genere caja: no cambia ni el layout
 * ni el posicionado de nada, pero la fuente igual se hereda a través suyo. */
const SIN_FUENTE_DE_PLATAFORMA: React.CSSProperties = {
  display: "contents",
  fontFamily: "Arial, Helvetica, sans-serif",
};

export default function StorefrontTemplateRenderer({ config }: { config: StoreConfig }) {
  const Template = TEMPLATES[config.template];
  if (!Template) return null;
  return (
    <div style={SIN_FUENTE_DE_PLATAFORMA}>
    <StoreConfigContext.Provider value={config}>
      <EditContext.Provider value={{
        editMode: false,
        activeField: null,
        activeLabel: null,
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
        {!GAMIFICATION_EXCLUDED_TEMPLATES.has(config.template) && <GamificationWidget />}
      </EditContext.Provider>
    </StoreConfigContext.Provider>
    </div>
  );
}
