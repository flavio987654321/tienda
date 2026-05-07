export type StoreType =
  | "ROPA"
  | "AUTOS"
  | "TECH"
  | "HOGAR"
  | "ALIMENTOS"
  | "BELLEZA"
  | "DEPORTE"
  | "MASCOTAS"
  | "LIBROS"
  | "GENERAL";

export interface ExtraField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
}

export interface StoreTypeConfig {
  id: StoreType;
  label: string;
  emoji: string;
  supportsWholesale: boolean;
  supportsCondicion: boolean;
  hideVariants: boolean;
  hideTags: boolean;
  defaultVariantName: string;
  checkoutMode: "cart" | "inquiry";
  namePlaceholder: string;
  variantValuePlaceholder: string;
  tagsPlaceholder: string;
  categorias: string[];
  subcategorias: Record<string, string[]>;
  extraFields: ExtraField[];
}

export const STORE_TYPES: StoreTypeConfig[] = [
  {
    id: "ROPA",
    label: "Ropa y moda",
    emoji: "👗",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Talle",
    variantValuePlaceholder: "S, M, L, XL",
    namePlaceholder: "Ej: Remera oversize negra talle M",
    tagsPlaceholder: "negro, oversize, algodon",
    categorias: ["remeras", "pantalones", "vestidos", "camperas", "buzos", "calzado", "joyas", "accesorios", "bolsos", "ropa-interior"],
    subcategorias: {
      remeras: ["básica", "oversize", "estampada", "manga-larga"],
      pantalones: ["jeans", "wide-leg", "cargo", "legging", "short"],
      vestidos: ["casual", "fiesta", "midi", "maxi"],
      camperas: ["bomber", "cuero", "denim", "abrigo"],
      buzos: ["hoodie", "crewneck", "canguro"],
      calzado: ["zapatillas", "botas", "sandalias", "zapatos", "ojotas"],
      joyas: ["collares", "anillos", "pulseras", "aros"],
      accesorios: ["cinturones", "lentes", "gorros", "pañuelos"],
      bolsos: ["carteras", "mochilas", "riñoneras", "tote"],
      "ropa-interior": ["corpiños", "bombachas", "boxers", "medias"],
    },
    extraFields: [
      { key: "genero", label: "Género", placeholder: "Mujer / Hombre / Unisex" },
      { key: "material", label: "Material", placeholder: "Algodón, poliéster..." },
    ],
  },
  {
    id: "AUTOS",
    label: "Autos y motos",
    emoji: "🚗",
    supportsWholesale: false,
    supportsCondicion: true,
    hideVariants: true,
    hideTags: true,
    checkoutMode: "inquiry" as const,
    defaultVariantName: "Color",
    variantValuePlaceholder: "Rojo, Blanco, Negro",
    namePlaceholder: "Ej: Toyota Corolla 2022 automático",
    tagsPlaceholder: "sedan, automatico, nafta",
    categorias: ["autos", "motos", "camionetas", "repuestos", "accesorios"],
    subcategorias: {
      autos: ["sedán", "suv", "hatchback", "coupé", "convertible"],
      motos: ["naked", "enduro", "scooter", "trail", "cuatriciclo"],
      camionetas: ["pickup", "van", "utilitario"],
      repuestos: ["motor", "frenos", "suspensión", "eléctrico", "carrocería"],
      accesorios: ["audio", "seguridad", "limpieza", "interior"],
    },
    extraFields: [
      { key: "marca", label: "Marca", placeholder: "Toyota, Ford..." },
      { key: "modelo", label: "Modelo", placeholder: "Corolla, Ranger..." },
      { key: "año", label: "Año", placeholder: "2022", type: "number" },
      { key: "km", label: "Kilómetros", placeholder: "50000", type: "number" },
      { key: "combustible", label: "Combustible", placeholder: "Nafta / Diesel / Eléctrico" },
      { key: "transmision", label: "Transmisión", placeholder: "Manual / Automático" },
    ],
  },
  {
    id: "TECH",
    label: "Tecnología",
    emoji: "💻",
    supportsWholesale: false,
    supportsCondicion: true,
    hideVariants: true,
    hideTags: true,
    checkoutMode: "cart" as const,
    defaultVariantName: "Almacenamiento",
    variantValuePlaceholder: "128GB, 256GB, 512GB",
    namePlaceholder: "Ej: iPhone 15 Pro 256GB",
    tagsPlaceholder: "iphone, liberado, sin uso",
    categorias: ["celulares", "laptops", "tablets", "audio", "gaming", "wearables", "fotografia", "accesorios"],
    subcategorias: {
      celulares: ["iphone", "samsung", "motorola", "xiaomi", "otro"],
      laptops: ["gaming", "ultrabook", "chromebook", "workstation"],
      tablets: ["ipad", "android", "windows"],
      audio: ["auriculares", "parlantes", "soundbar", "micrófonos"],
      gaming: ["consolas", "joysticks", "sillas", "monitores", "juegos"],
      wearables: ["smartwatch", "pulsera", "auriculares-true-wireless"],
      fotografia: ["cámaras", "lentes", "trípodes", "drones"],
      accesorios: ["cables", "fundas", "cargadores", "hubs"],
    },
    extraFields: [
      { key: "marca", label: "Marca", placeholder: "Apple, Samsung..." },
      { key: "modelo", label: "Modelo", placeholder: "iPhone 15, Galaxy S24..." },
    ],
  },
  {
    id: "HOGAR",
    label: "Hogar y muebles",
    emoji: "🏠",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Tamaño",
    variantValuePlaceholder: "Chico, Mediano, Grande",
    namePlaceholder: "Ej: Mesa de madera escandinava 120cm",
    tagsPlaceholder: "madera, moderno, escandinavo",
    categorias: ["muebles", "decoracion", "cocina", "baño", "jardin", "textiles", "iluminacion", "organizacion"],
    subcategorias: {
      muebles: ["sillas", "mesas", "camas", "sofás", "escritorios", "estantes"],
      decoracion: ["cuadros", "plantas", "velas", "espejos", "marcos", "relojes"],
      cocina: ["utensilios", "vajilla", "electrodomésticos", "almacenamiento"],
      baño: ["accesorios", "toallas", "alfombras", "espejos"],
      jardin: ["plantas", "macetas", "herramientas", "muebles-exterior"],
      textiles: ["almohadas", "sábanas", "frazadas", "cortinas", "alfombras"],
      iluminacion: ["lamparas", "veladores", "apliques", "tiras-led"],
      organizacion: ["cajas", "perchas", "estantes", "cestos"],
    },
    extraFields: [
      { key: "material", label: "Material", placeholder: "Madera, metal, tela..." },
      { key: "dimensiones", label: "Dimensiones", placeholder: "80x60x120 cm" },
    ],
  },
  {
    id: "ALIMENTOS",
    label: "Alimentos",
    emoji: "🥗",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Peso/Tamaño",
    variantValuePlaceholder: "500g, 1kg, 2kg",
    namePlaceholder: "Ej: Granola artesanal con frutas 500g",
    tagsPlaceholder: "organico, sin-tacc, vegano",
    categorias: ["frutas-verduras", "lacteos", "carnes", "panaderia", "bebidas", "snacks", "congelados", "organicos"],
    subcategorias: {
      "frutas-verduras": ["frutas", "verduras", "hierbas"],
      lacteos: ["leche", "quesos", "yogur", "manteca", "huevos"],
      carnes: ["vacuna", "pollo", "cerdo", "pescado", "embutidos"],
      panaderia: ["pan", "facturas", "tortas", "galletitas"],
      bebidas: ["agua", "jugos", "gaseosas", "vinos", "cervezas", "café"],
      snacks: ["chips", "frutos-secos", "chocolates", "barras"],
      congelados: ["comidas-listas", "helados", "verduras-congeladas"],
      organicos: ["frutas", "verduras", "lácteos", "cereales"],
    },
    extraFields: [
      { key: "peso", label: "Peso/Contenido", placeholder: "500g, 1kg, 1L..." },
      { key: "ingredientes", label: "Ingredientes", placeholder: "Lista de ingredientes..." },
    ],
  },
  {
    id: "BELLEZA",
    label: "Belleza y cuidado",
    emoji: "💄",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Tono",
    variantValuePlaceholder: "Claro, Medio, Oscuro",
    namePlaceholder: "Ej: Sérum vitamina C antiedad 30ml",
    tagsPlaceholder: "natural, vegano, sin-parabenos",
    categorias: ["maquillaje", "skincare", "perfumes", "cabello", "uñas", "higiene", "suplementos"],
    subcategorias: {
      maquillaje: ["labios", "ojos", "rostro", "bases", "contorno"],
      skincare: ["limpieza", "hidratación", "solar", "antiedad", "serum"],
      perfumes: ["mujer", "hombre", "unisex"],
      cabello: ["shampoo", "acondicionador", "mascarillas", "tinturas", "styling"],
      uñas: ["esmaltes", "acrilicos", "herramientas"],
      higiene: ["desodorantes", "jabones", "pasta-dental", "afeitado"],
      suplementos: ["vitaminas", "colágeno", "proteínas"],
    },
    extraFields: [
      { key: "marca", label: "Marca", placeholder: "L'Oreal, Maybelline..." },
      { key: "tipo-piel", label: "Tipo de piel", placeholder: "Seca, mixta, grasa, sensible..." },
    ],
  },
  {
    id: "DEPORTE",
    label: "Deporte y fitness",
    emoji: "⚽",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Talle",
    variantValuePlaceholder: "S, M, L, XL",
    namePlaceholder: "Ej: Zapatillas running Nike Air talle 42",
    tagsPlaceholder: "running, gym, futbol",
    categorias: ["ropa-deportiva", "calzado", "equipamiento", "suplementos", "accesorios", "camping"],
    subcategorias: {
      "ropa-deportiva": ["remeras", "calzas", "shorts", "camperas", "medias"],
      calzado: ["running", "fútbol", "básquet", "training", "trekking"],
      equipamiento: ["pesas", "colchonetas", "pelota", "raquetas", "bicicletas"],
      suplementos: ["proteínas", "creatina", "pre-workout", "vitaminas"],
      accesorios: ["bolsos", "botellones", "guantes", "rodilleras"],
      camping: ["carpas", "bolsas-de-dormir", "mochilas", "linternas"],
    },
    extraFields: [
      { key: "deporte", label: "Deporte/Actividad", placeholder: "Fútbol, running, gym..." },
      { key: "genero", label: "Género", placeholder: "Mujer / Hombre / Unisex" },
    ],
  },
  {
    id: "MASCOTAS",
    label: "Mascotas",
    emoji: "🐾",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Tamaño",
    variantValuePlaceholder: "Pequeño, Mediano, Grande",
    namePlaceholder: "Ej: Collar acolchado para perro mediano",
    tagsPlaceholder: "perro, gato, natural",
    categorias: ["alimentos", "accesorios", "juguetes", "higiene", "ropa-mascotas", "salud"],
    subcategorias: {
      alimentos: ["perros", "gatos", "aves", "peces", "roedores"],
      accesorios: ["correas", "collares", "camas", "jaulas", "transportines"],
      juguetes: ["perros", "gatos", "aves"],
      higiene: ["shampoos", "cepillos", "cortauñas", "pañales"],
      "ropa-mascotas": ["ropa", "zapatos", "disfraces"],
      salud: ["antiparasitarios", "vitaminas", "primeros-auxilios"],
    },
    extraFields: [
      { key: "para-animal", label: "Para mascota", placeholder: "Perro, gato, ave..." },
    ],
  },
  {
    id: "LIBROS",
    label: "Libros y arte",
    emoji: "📚",
    supportsWholesale: false,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Formato",
    variantValuePlaceholder: "Físico, Digital, Tapa dura",
    namePlaceholder: "Ej: Cien años de soledad - Gabriel García Márquez",
    tagsPlaceholder: "ficcion, bestseller, regalo",
    categorias: ["libros", "arte", "manualidades", "musica", "juegos", "papeleria"],
    subcategorias: {
      libros: ["ficción", "no-ficción", "infantil", "comics", "educación", "autoayuda"],
      arte: ["pinturas", "esculturas", "fotografía", "ilustraciones"],
      manualidades: ["materiales", "kits", "herramientas"],
      musica: ["instrumentos", "partituras", "accesorios"],
      juegos: ["mesa", "cartas", "rompecabezas", "coleccionables"],
      papeleria: ["cuadernos", "lapiceros", "plumas", "sellos"],
    },
    extraFields: [
      { key: "autor", label: "Autor/Artista", placeholder: "Nombre del autor..." },
      { key: "editorial", label: "Editorial/Marca", placeholder: "Editorial..." },
    ],
  },
  {
    id: "GENERAL",
    label: "General",
    emoji: "🏪",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Variante",
    variantValuePlaceholder: "Opción 1, Opción 2",
    namePlaceholder: "Ej: Nombre del producto",
    tagsPlaceholder: "oferta, nuevo, popular",
    categorias: ["general", "otros"],
    subcategorias: {
      general: ["varios"],
      otros: ["varios"],
    },
    extraFields: [],
  },
];

export function getStoreType(id: string): StoreTypeConfig {
  return STORE_TYPES.find((t) => t.id === id) ?? STORE_TYPES[0];
}
