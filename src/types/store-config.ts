export type TemplateId = "fashion-noir" | "boho-terra" | "urban-pulse" | "chic-paris" | "auto-motor" | "auto-drive" | "electro-prime" | "tech-nova" | "home-studio" | "casa-clara";

export const TEMPLATES_WITH_CAROUSEL: TemplateId[] = ["chic-paris", "electro-prime", "tech-nova", "home-studio", "casa-clara"];

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

export type ShippingMethod = {
  id: string;
  label: string;
  price: number;
  coordinar: boolean;
  enabled: boolean;
  isPickup: boolean;
};

export const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  { id: "retiro",   label: "Retiro en local / acordar", price: 0, coordinar: false, enabled: true, isPickup: true  },
  { id: "estandar", label: "Envío estándar",             price: 0, coordinar: true,  enabled: true, isPickup: false },
  { id: "nacional", label: "Envío nacional",             price: 0, coordinar: true,  enabled: true, isPickup: false },
];

export type PaymentMethodTransferencia = {
  enabled: boolean;
  titular: string;
  cbu: string;
  cvu: string;
  alias: string;
  banco: string;
  cuil: string;
  instrucciones: string;
};

export type PaymentMethodEfectivo = {
  enabled: boolean;
  instrucciones: string;
};

export type StorePaymentInfo = {
  transferencia: PaymentMethodTransferencia;
  efectivo: PaymentMethodEfectivo;
};

export const DEFAULT_PAYMENT_INFO: StorePaymentInfo = {
  transferencia: {
    enabled: false,
    titular: "",
    cbu: "",
    cvu: "",
    alias: "",
    banco: "",
    cuil: "",
    instrucciones: "",
  },
  efectivo: {
    enabled: false,
    instrucciones: "",
  },
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
    message: string;
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
    messages?: string[];
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
  hasMercadoPago?: boolean;
  ocultarPreciosPublico?: boolean;
  featuredCategories?: string[];
  flyerConfig?: FlyerConfig;
  showPushBell?: boolean;
  onPreviewBellClick?: () => void;
  paymentInfo?: StorePaymentInfo;
  shippingMethods?: ShippingMethod[];
  policies?: {
    returns?: string;
    shipping?: string;
    terms?: string;
  };
};

export const TEMPLATE_DEFAULTS: Record<TemplateId, { accent: string; storeName: string }> = {
  "fashion-noir": { accent: "#c9a84c", storeName: "FASHION NOIR" },
  "boho-terra":   { accent: "#b5652a", storeName: "BOHO TERRA"   },
  "urban-pulse":  { accent: "#d4ff00", storeName: "URBAN PULSE"  },
  "chic-paris":   { accent: "#c0392b", storeName: "CHIC PARIS"   },
  "auto-motor":   { accent: "#e8a020", storeName: "AUTO MOTOR"   },
  "auto-drive":   { accent: "#2563eb", storeName: "AUTO DRIVE"   },
  "electro-prime": { accent: "#ea580c", storeName: "ELECTRO PRIME" },
  "tech-nova":     { accent: "#7c3aed", storeName: "TECH NOVA"     },
  "home-studio":   { accent: "#b5652a", storeName: "HOME STUDIO"   },
  "casa-clara":    { accent: "#0f172a", storeName: "CASA CLARA"    },
};

export const TEMPLATE_TIPO_TIENDA: Record<TemplateId, string[]> = {
  "fashion-noir": ["ROPA", "BELLEZA", "DEPORTE", "MASCOTAS", "LIBROS", "ALIMENTOS", "GENERAL"],
  "boho-terra":   ["ROPA", "BELLEZA", "ALIMENTOS", "MASCOTAS", "LIBROS", "GENERAL"],
  "urban-pulse":  ["ROPA", "DEPORTE", "GENERAL"],
  "chic-paris":   ["ROPA", "BELLEZA", "GENERAL"],
  "auto-motor":   ["AUTOS"],
  "auto-drive":   ["AUTOS"],
  "electro-prime": ["HOGAR_TECH"],
  "tech-nova":     ["HOGAR_TECH"],
  "home-studio":   ["HOGAR_TECH"],
  "casa-clara":    ["HOGAR_TECH"],
};

export const DEFAULT_CONFIG: StoreConfig = {
  template:      "fashion-noir",
  storeName:     "Mi Tienda",
  storeTagline:  "Tu tienda online",
  colors:        { accent: "#c9a84c" },
  whatsapp:      { enabled: true, number: "+54 9 11 0000-0000", message: "Hola! Me gustaría consultar sobre sus productos 😊" },
  socialLinks:   { instagram: "", facebook: "", tiktok: "", youtube: "", pinterest: "" },
  currency:      "ARS",
  language:      "ES",
  seo:           { enabled: false, title: "", description: "" },
  textOverrides: {},
  imageOverrides: {},
  sectionColors: {},
  promoBanner: { enabled: true },
};
