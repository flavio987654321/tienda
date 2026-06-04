export type TemplateId = "fashion-noir" | "boho-terra" | "urban-pulse" | "chic-paris" | "auto-motor" | "auto-drive";

export const TEMPLATES_WITH_CAROUSEL: TemplateId[] = ["chic-paris"];

export type TextOverride = {
  text?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  hidden?: boolean;
};

export type ImageOverride = {
  url?: string;
  overlayType?: "none" | "dark" | "light";
  overlayOpacity?: number;
  posX?: number; // focal point X, 0-100, default 50
  posY?: number; // focal point Y, 0-100, default 50
  hideContent?: boolean; // hide template text + buttons (for images with embedded text)
};

export type FlyerConfig = {
  enabled: boolean;
  images: string[]; // hasta 3 URLs de Supabase Storage
};

export type StoreConfig = {
  template: TemplateId;
  storeId?: string;
  slug?: string;
  storeName: string;
  storeTagline: string;
  colors: {
    accent: string;
  };
  whatsapp: {
    enabled: boolean;
    number: string;
  };
  socialLinks: {
    instagram: string;
    facebook: string;
    tiktok: string;
    youtube: string;
    pinterest: string;
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
  sectionColors: Record<string, string>;
  bannerInterval?: number;
  promoBanner?: {
    enabled: boolean;
  };
  previewFill?: boolean;
  isOwner?: boolean;
  isVerified?: boolean;
  verifiedInfo?: {
    showName: boolean; name: string | null;
    showCity: boolean; city: string | null;
    showPhone: boolean; phone: string | null;
    showSince: boolean; memberSince: string | null;
  };
  tipoTienda?: string;
  tieneVentaMayorista?: boolean;
  ocultarPreciosPublico?: boolean;
  featuredCategories?: string[];
  flyerConfig?: FlyerConfig;
};

export const TEMPLATE_DEFAULTS: Record<TemplateId, { accent: string; storeName: string }> = {
  "fashion-noir": { accent: "#c9a84c", storeName: "FASHION NOIR" },
  "boho-terra":   { accent: "#b5652a", storeName: "BOHO TERRA"   },
  "urban-pulse":  { accent: "#d4ff00", storeName: "URBAN PULSE"  },
  "chic-paris":   { accent: "#c0392b", storeName: "CHIC PARIS"   },
  "auto-motor":   { accent: "#e8a020", storeName: "AUTO MOTOR"   },
  "auto-drive":   { accent: "#2563eb", storeName: "AUTO DRIVE"   },
};

export const TEMPLATE_TIPO_TIENDA: Record<TemplateId, string[]> = {
  "fashion-noir": ["ROPA", "BELLEZA", "DEPORTE", "MASCOTAS", "LIBROS", "ALIMENTOS", "HOGAR", "GENERAL"],
  "boho-terra":   ["ROPA", "BELLEZA", "ALIMENTOS", "MASCOTAS", "LIBROS", "GENERAL"],
  "urban-pulse":  ["ROPA", "DEPORTE", "TECH", "GENERAL"],
  "chic-paris":   ["ROPA", "BELLEZA", "HOGAR", "GENERAL"],
  "auto-motor":   ["AUTOS"],
  "auto-drive":   ["AUTOS"],
};

export const DEFAULT_CONFIG: StoreConfig = {
  template:      "fashion-noir",
  storeName:     "Mi Tienda",
  storeTagline:  "Tu tienda online",
  colors:        { accent: "#c9a84c" },
  whatsapp:      { enabled: true, number: "+54 9 11 0000-0000" },
  socialLinks:   { instagram: "", facebook: "", tiktok: "", youtube: "", pinterest: "" },
  currency:      "ARS",
  language:      "ES",
  seo:           { enabled: false, title: "", description: "" },
  textOverrides: {},
  imageOverrides: {},
  sectionColors: {},
  promoBanner: { enabled: true },
};
