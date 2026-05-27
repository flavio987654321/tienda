export type TemplateId = "fashion-noir" | "boho-terra" | "urban-pulse";

export type TextOverride = {
  text?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type ImageOverride = {
  url?: string;
  overlayType?: "none" | "dark" | "light";
  overlayOpacity?: number;
};

export type StoreConfig = {
  template: TemplateId;
  storeName: string;
  storeTagline: string;
  colors: {
    accent: string;
  };
  whatsapp: {
    enabled: boolean;
    number: string;
  };
  currency: "ARS" | "USD";
  language: "ES" | "EN";
  seo: {
    enabled: boolean;
    title: string;
    description: string;
  };
  textOverrides: Record<string, TextOverride>;
  imageOverrides: Record<string, ImageOverride>;
};

export const TEMPLATE_DEFAULTS: Record<TemplateId, { accent: string; storeName: string }> = {
  "fashion-noir": { accent: "#c9a84c", storeName: "FASHION NOIR" },
  "boho-terra":   { accent: "#b5652a", storeName: "BOHO TERRA"   },
  "urban-pulse":  { accent: "#d4ff00", storeName: "URBAN PULSE"  },
};

export const DEFAULT_CONFIG: StoreConfig = {
  template:      "fashion-noir",
  storeName:     "Mi Tienda",
  storeTagline:  "Tu tienda online",
  colors:        { accent: "#c9a84c" },
  whatsapp:      { enabled: true, number: "+54 9 11 0000-0000" },
  currency:      "ARS",
  language:      "ES",
  seo:           { enabled: false, title: "", description: "" },
  textOverrides: {},
  imageOverrides: {},
};
