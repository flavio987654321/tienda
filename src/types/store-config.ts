import type { ClaveLegal } from "@/lib/politicas-tienda";

export type TemplateId = "fashion-noir" | "boho-terra" | "urban-pulse" | "chic-paris" | "aurora" | "auto-motor" | "auto-drive" | "electro-prime" | "tech-nova" | "home-studio" | "casa-clara";

export const TEMPLATES_WITH_CAROUSEL: TemplateId[] = ["chic-paris", "electro-prime", "tech-nova", "home-studio", "casa-clara"];

/**
 * Qué templates dibujan el formulario de "suscribite a las novedades".
 *
 * No hay interruptor: el que lo tiene lo muestra siempre. Importa para la
 * política de privacidad — ese formulario junta emails de gente que todavía no
 * compró, y solo se puede declarar si de verdad está en pantalla.
 *
 * Auto Motor y Auto Drive no están, y no es un olvido: esas tiendas venden por
 * consulta y no mandan novedades.
 */
export const TEMPLATES_CON_NEWSLETTER: TemplateId[] = ["aurora", "boho-terra", "chic-paris", "fashion-noir", "urban-pulse"];

// Qué templates dibujan el formulario de "opiná sobre esta tienda".
//
// Las reseñas de tienda funcionan en toda la plataforma —la base, la API, el
// panel del dueño— pero el formulario para dejarlas todavía vive en un solo
// template. En los demás, el dueño ve la pestaña "La tienda" en su panel y
// espera reseñas que nadie puede escribirle.
//
// Sin esta lista sería exactamente el problema de la foto de fondo: prometer
// algo que del otro lado no existe, y que no hay forma de descubrir salvo
// esperando. Al portar el formulario a otro template, hay que sumarlo acá.
export const TEMPLATES_CON_RESENA_TIENDA: TemplateId[] = ["chic-paris"];

// ── Qué secciones aceptan FOTO de fondo, por template ────────────────────────
// El fondo de una sección es un COLOR. Algunos templates además saben dibujar una
// foto detrás, y otros no — Chic Paris, por ejemplo, no lo hace en ninguna.
//
// Sin esta lista el panel ofrecía "Foto de fondo" en todas las secciones de todos
// los templates: la foto se subía, se guardaba bien y el template no la leía nunca.
// No era que tardara en aparecer; no aparecía jamás, y no había forma de darse
// cuenta salvo esperando.
//
// Sale de leer qué claves `sectionbg_*` consume realmente cada template. Si a un
// template se le agrega una sección con foto, hay que sumarla acá o el dueño no va
// a poder cargarla.
export const SECTION_BG_PHOTO: Record<TemplateId, string[]> = {
  // Sólo el hero. El resto de Aurora no acepta foto de fondo a propósito: el
  // fondo ES la escena de luz, y una foto encima la tapa y le saca al template
  // exactamente aquello por lo que se elige. El hero es la excepción porque ahí
  // la foto no compite con la escena, es el bloque: va la de la tienda si sube
  // una, y si no la de sus propios productos.
  "aurora":        ["bgHero"],
  "auto-drive":    ["bgCatalogo", "bgCategorias", "bgContacto", "bgFooter", "bgHero", "bgNosotros", "bgServicios", "bgStats"],
  "auto-motor":    ["bgCatalogo", "bgContacto", "bgFooter", "bgNosotros", "bgServicios"],
  "boho-terra":    ["bgNewsletter"],
  "casa-clara":    ["bgContacto", "bgFooter", "bgHero", "bgNosotros", "bgOfertas", "bgProductos"],
  "chic-paris":    [],
  "electro-prime": ["bgConfianza", "bgContacto", "bgDepartamentos", "bgFooter", "bgHero", "bgNosotros", "bgOfertas", "bgProductos"],
  "fashion-noir":  ["bgContacto", "bgFooter", "bgStatement"],
  "home-studio":   ["bgConfianza", "bgContacto", "bgDepartamentos", "bgFooter", "bgHero", "bgNosotros", "bgOfertas", "bgProductos"],
  "tech-nova":     ["bgConfianza", "bgContacto", "bgDepartamentos", "bgFooter", "bgHero", "bgNosotros", "bgOfertas", "bgProductos"],
  "urban-pulse":   ["bgContacto", "bgFooter"],
};

// OJO: agregar un campo acá NO alcanza. Hay que tocar los tres lugares a la vez:
//   1. este tipo,
//   2. el esquema de `src/lib/store-config.ts` — Zod descarta lo que no conoce, así
//      que un campo nuevo se guarda bien en pantalla y desaparece al recargar,
//   3. `overrideStyle` en `src/contexts/EditContext.tsx`, que es el único lugar
//      donde esto se convierte en CSS (y por eso lo heredan los diez templates).
export type TextOverride = {
  text?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  hidden?: boolean;
  align?: "left" | "center" | "right";
  uppercase?: boolean;
  /** Múltiplo del tamaño de letra (1.4 = 140%). */
  lineHeight?: number;
  /** Espacio entre letras, en px. Puede ser negativo para juntarlas. */
  letterSpacing?: number;
};

export type ImageOverride = {
  url?: string;
  overlayType?: "none" | "dark" | "light";
  overlayOpacity?: number;
  posX?: number; // focal point X, 0-100, default 50
  posY?: number; // focal point Y, 0-100, default 50
  // Punto de foco SEPARADO para celular. Solo tiene sentido en imágenes a pantalla
  // completa (el banner del hero), cuya forma cambia mucho entre celular (alto y
  // angosto) y PC (ancho y bajo): con un solo foco, el recorte de una pantalla no
  // se puede controlar en la otra. Si no está seteado, el template cae a posX/posY.
  posXMobile?: number; // focal point X en celular, 0-100
  posYMobile?: number; // focal point Y en celular, 0-100
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
  // true = el precio no es fijo, se cotiza en vivo (Envíopack) según
  // código postal del comprador + peso/dimensiones del carrito.
  liveQuote?: boolean;
};

export const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  { id: "retiro",   label: "Retiro en local / acordar", price: 0, coordinar: false, enabled: true, isPickup: true  },
  { id: "estandar", label: "Envío estándar",             price: 0, coordinar: true,  enabled: true, isPickup: false },
  { id: "nacional", label: "Envío nacional",             price: 0, coordinar: true,  enabled: true, isPickup: false },
];

export const LIVE_QUOTE_DOMICILIO_ID = "envio-domicilio";

// Métodos de cotización en vivo: se agregan a la lista de la tienda solo
// cuando el dueño activa el toggle correspondiente (ver PagosClient). Por
// default vienen deshabilitados hasta que complete su dirección de origen.
// Nota: "envío a sucursal" no está acá todavía — la cotización a sucursal de
// Envíopack requiere resolver el ID de localidad (no alcanza con el código
// postal) y eso todavía no está implementado en src/lib/enviopack.ts. Ofrecer
// ese método ahora haría que se cobre $0 siempre, sin que la tienda lo sepa.
export const LIVE_QUOTE_SHIPPING_METHODS: ShippingMethod[] = [
  { id: LIVE_QUOTE_DOMICILIO_ID, label: "Envío a domicilio", price: 0, coordinar: false, enabled: false, isPickup: false, liveQuote: true },
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
  /* `language` se eliminó el 15/08/2026. Era un selector ES/EN en el modal de
     Configuración avanzada; una búsqueda por todo el proyecto mostró que las
     únicas cuatro apariciones de la clave eran las líneas que dibujaban ese
     mismo selector. Elegir "English" no cambiaba una palabra de la tienda.
     El valor que haya quedado en el JSON de tiendas viejas se preserva como
     clave ajena y no se lee. */
  seo: {
    enabled: boolean;
    title: string;
    description: string;
  };
  analytics?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
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
  /**
   * True solo en la demo pública de un diseño (`/plantillas/[id]`).
   *
   * Esa página necesita `previewFill` para tener productos y reseñas de ejemplo,
   * pero los templates venían usando ESE MISMO flag para decidir si mostrar los
   * avisos dirigidos a la dueña ("En tu tienda esta sección aparece sola…").
   * Resultado: un visitante que entraba a mirar el diseño leía instrucciones para
   * administrar una tienda que no es suya.
   *
   * Los dos usos son distintos: rellenar con ejemplos es una cosa, estar
   * acomodando la propia tienda es otra. Esto separa la segunda.
   *
   * Nunca se guarda: lo pone la página de demo en memoria y no está en el schema
   * que valida el `storeConfig` de la base.
   */
  demoPublica?: boolean;
  // True solo cuando el template actualmente mostrado ya fue persistido con
  // "Guardar cambios" — recién ahí el tipoTienda real en la base coincide con
  // el del editor, y los productos demo de relleno resuelven su página de
  // detalle sin romperse en la tienda pública.
  templateSaved?: boolean;
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
  flyerConfig?: FlyerConfig;
  showPushBell?: boolean;
  onPreviewBellClick?: () => void;
  paymentInfo?: StorePaymentInfo;
  shippingMethods?: ShippingMethod[];
  /**
   * Qué políticas legales están publicadas: tienen texto Y el interruptor de
   * "Pagos" en Visible.
   *
   * Lo llena la página de la tienda desde la base (ver `documentosPublicados`
   * en `lib/politicas-tienda`). Los pies de página listaban las tres siempre,
   * así que una tienda recién hecha mostraba tres links que llevaban a "Esta
   * tienda aún no publicó esta política".
   *
   * Acá van solo las claves, no el texto: el pie necesita saber cuáles linkear,
   * no arrastrar el contenido de cuatro documentos en cada carga de la tienda.
   */
  legales?: ClaveLegal[];
  hiddenSections?: string[];
  sectionOrder?: string[];
};

// ── Qué templates dejan elegir el color de la barra de navegación ────────────
// Estar en la lista = el panel ofrece el control; el valor es el color que el
// template dibuja de fábrica. Los que no están pintan el nav con el color de su
// diseño y no hay nada que elegir.
//
// El color de fábrica es tan necesario como la lista, y por eso van juntos: un
// `<input type="color">` necesita SIEMPRE un color —con string vacío se pone
// negro— así que sin él el selector arrancaba mostrando un color que no era el
// que se veía en pantalla.
//
// Antes esto vivía suelto en el panel: una lista de ids escrita a mano en el JSX
// y el color de fábrica como dos ternarios anidados ("¿es auto-motor? ¿es
// home-studio? y si no, blanco"), repetidos en el selector y en el campo de texto.
// Ese "y si no, blanco" ya se había equivocado con Tech Nova, que pinta el nav casi
// negro: el dueño abría el panel y el selector le mostraba blanco arriba de una
// barra negra. Un template nuevo entraba en la lista y salía blanco sin que nadie
// lo decidiera — el error no era posible verlo hasta abrir esa pantalla.
//
// Cada valor sale del `sc["navBg"] ?? ...` del template. Si allá cambia, acá
// también: son el mismo color escrito dos veces, y esta es la copia que miente
// cuando se desincronizan.
export const TEMPLATE_NAV_BG: Partial<Record<TemplateId, string>> = {
  "aurora":        "#06070d", // el fondo de la escena, casi negro
  "auto-motor":    "#1b3f6e", // NAVY
  "auto-drive":    "#ffffff",
  "casa-clara":    "#ffffff",
  "electro-prime": "#ffffff",
  "home-studio":   "#faf8f4",
  "tech-nova":     "#0f0f1a",
};

export const TEMPLATE_DEFAULTS: Record<TemplateId, { accent: string; storeName: string }> = {
  "fashion-noir": { accent: "#c9a84c", storeName: "FASHION NOIR" },
  "boho-terra":   { accent: "#b5652a", storeName: "BOHO TERRA"   },
  "urban-pulse":  { accent: "#d4ff00", storeName: "URBAN PULSE"  },
  "chic-paris":   { accent: "#c0392b", storeName: "CHIC PARIS"   },
  "aurora":       { accent: "#8b5cf6", storeName: "AURORA"       },
  "auto-motor":   { accent: "#e8a020", storeName: "AUTO MOTOR"   },
  "auto-drive":   { accent: "#2563eb", storeName: "AUTO DRIVE"   },
  "electro-prime": { accent: "#ea580c", storeName: "ELECTRO PRIME" },
  "tech-nova":     { accent: "#7c3aed", storeName: "TECH NOVA"     },
  "home-studio":   { accent: "#b5652a", storeName: "HOME STUDIO"   },
  "casa-clara":    { accent: "#0f172a", storeName: "CASA CLARA"    },
};

export const TEMPLATE_TIPO_TIENDA: Record<TemplateId, string[]> = {
  "fashion-noir": ["ROPA", "GASTRONOMIA", "GENERAL"],
  "boho-terra":   ["ROPA", "GASTRONOMIA", "GENERAL"],
  "urban-pulse":  ["ROPA", "GENERAL"],
  "chic-paris":   ["ROPA", "GENERAL"],
  // Aurora no está atada a un rubro: es una estética, no una categoría. Por eso
  // aparece en los mismos tres que los templates más generales de Moda.
  "aurora":       ["ROPA", "GASTRONOMIA", "GENERAL"],
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
  seo:           { enabled: false, title: "", description: "" },
  analytics:     { googleAnalyticsId: "", facebookPixelId: "" },
  textOverrides: {},
  imageOverrides: {},
  sectionColors: {},
  promoBanner: { enabled: true },
};
