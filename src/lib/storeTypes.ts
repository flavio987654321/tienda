import { PROVINCIAS_ARGENTINA } from "./provincias";

// Rubros vigentes. Se sacaron BELLEZA, DEPORTE, MASCOTAS y LIBROS: estaban en
// comingSoon desde siempre, ninguna tienda los usaba y sumaban ruido a cada
// selector. ALIMENTOS pasó a llamarse GASTRONOMIA. Inmobiliarias y hotelería
// van a entrar más adelante — hotelería, además, necesita reservas por fecha,
// que es una feature entera y no un rubro más.
export type StoreType =
  | "ROPA"
  | "AUTOS"
  | "HOGAR_TECH"
  | "GASTRONOMIA"
  | "GENERAL";

export interface ExtraField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  options?: string[];
  // Aclaración opcional para campos que pueden confundirse con otro ya
  // visible en el formulario (ej. Carrocería vs. Subcategoría).
  tip?: string;
}

export interface StoreTypeConfig {
  id: StoreType;
  label: string;
  emoji: string;
  // Frase corta que ayuda a decidir si el rubro de uno encaja en este tipo
  // de tienda — se muestra al elegir el tipo, antes de los ejemplos de categorías.
  description: string;
  comingSoon?: boolean;
  supportsWholesale: boolean;
  supportsCondicion: boolean;
  hideVariants: boolean;
  hideTags: boolean;
  hideGender?: boolean;
  // Oculta la sección "Envío" (peso/dimensiones del paquete) cuando el producto
  // no se manda por correo — ej. un auto o una moto se entregan en persona.
  hideShipping?: boolean;
  // Oculta "Promoción por cantidad" y "Cuotas sin interés" — no tienen sentido
  // para rubros donde no se compra por unidades múltiples online (ej. AUTOS,
  // que usa checkoutMode "inquiry"). El precio de oferta (comparePrice) sigue
  // disponible, esa sí aplica a un vehículo individual.
  hidePromotions?: boolean;
  // Muestra el bloque "Historial de servicios" y usa el texto "Condición del
  // vehículo" en vez de "Condición del producto". Explícito (no inferido de
  // hideVariants) para que un futuro rubro con hideVariants:true no herede
  // por error textos/funciones pensadas para vehículos.
  showServiceHistory?: boolean;
  // Usa la lista de "Gastos del vehículo" (compra, lavado, service, cubiertas...)
  // en vez del campo único "Costo" — un vehículo se vende una sola vez y suele
  // acumular varios gastos, a diferencia de un producto de stock repetido.
  usesVehicleExpenses?: boolean;
  supportsFeatured?: boolean;
  condicionOptions?: string[];
  defaultVariantName: string;
  checkoutMode: "cart" | "inquiry";
  namePlaceholder: string;
  variantValuePlaceholder: string;
  tagsPlaceholder: string;
  categorias: string[];
  subcategorias: Record<string, string[]>;
  extraFields: ExtraField[];
  // Specs propias de cada subcategoría (ej: "Pulgadas" para tvs, "RAM" para notebooks).
  // Se suman a extraFields cuando el vendedor elige esa subcategoría — así una
  // heladera y un celular no piden los mismos campos.
  extraFieldsByCategory?: Record<string, ExtraField[]>;
}

export const STORE_TYPES: StoreTypeConfig[] = [
  {
    id: "ROPA",
    label: "Moda y ropa",
    emoji: "👗",
    description: "Indumentaria, calzado y accesorios de moda: remeras, pantalones, vestidos, zapatillas, carteras, joyas. Tiene talles y colores.",
    supportsWholesale: true,
    supportsCondicion: false,
    hideVariants: false,
    hideTags: false,
    checkoutMode: "cart" as const,
    defaultVariantName: "Talle",
    variantValuePlaceholder: "S, M, L, XL",
    namePlaceholder: "Ej: Remera oversize negra talle M",
    tagsPlaceholder: "negro, oversize, algodon",
    categorias: ["remeras", "pantalones", "vestidos", "camperas", "buzos", "calzado", "joyas", "accesorios", "bolsos", "ropa-interior", "ropa-ninos", "ropa-bebe"],
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
      "ropa-ninos": ["remeras", "pantalones", "vestidos", "camperas", "buzos", "calzado", "conjuntos"],
      "ropa-bebe": ["bodies", "pijamas", "conjuntos", "ajuar", "gorros", "medias"],
    },
    extraFields: [
      { key: "material", label: "Material", placeholder: "Algodón, poliéster..." },
    ],
  },
  {
    id: "AUTOS",
    label: "Autos y motos",
    emoji: "🚗",
    description: "Venta de autos, motos, camionetas (0km o usados) y repuestos/accesorios para vehículos. No usa carrito — los interesados consultan por cada unidad.",
    supportsWholesale: false,
    supportsCondicion: true,
    hideVariants: true,
    hideTags: true,
    hideShipping: true,
    hidePromotions: true,
    showServiceHistory: true,
    usesVehicleExpenses: true,
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
    hideGender: true,
    condicionOptions: ["0 km", "Casi nuevo", "Muy bueno", "Bueno", "Usado"],
    extraFields: [
      { key: "marca",      label: "Marca",       placeholder: "Toyota, Ford, Honda, Yamaha..." },
      { key: "modelo",     label: "Modelo",      placeholder: "Corolla, Ranger, CB 500..." },
      { key: "version",    label: "Versión",     placeholder: "XEI, LTZ, Sport, Full..." },
      { key: "año",        label: "Año",         placeholder: "2022", type: "number" },
      { key: "km",         label: "Kilómetros",  placeholder: "50000", type: "number" },
      { key: "motor",      label: "Motor",       placeholder: "2.0, 1.5 Turbo, 3.0 V6, 689cc" },
      { key: "combustible",label: "Combustible", options: ["Nafta", "Diesel", "GNC", "Eléctrico", "Híbrido"] },
      { key: "transmision",label: "Transmisión", options: ["Manual", "Automática", "CVT", "Secuencial"] },
      { key: "traccion",   label: "Tracción",    options: ["4x2", "4x4", "AWD", "FWD", "RWD"] },
      { key: "carroceria", label: "Carrocería",  options: ["Sedán", "SUV", "Pickup", "Hatchback", "Coupé", "Convertible", "Van / Minivan", "Naked", "Scooter", "Trail / Enduro", "Cuatriciclo"], tip: "Puede repetir lo que ya elegiste en Subcategoría — usalo si querés ser más específico (ej: subcategoría \"autos\" + carrocería \"SUV\")." },
      { key: "color",      label: "Color",       placeholder: "Blanco, Negro, Gris, Rojo..." },
      { key: "puertas",    label: "Puertas",     options: ["2", "3", "4", "5"] },
      { key: "provincia",  label: "Provincia",   options: PROVINCIAS_ARGENTINA.map((p) => p.name) },
      { key: "localidad",  label: "Localidad",   placeholder: "Ej: San Isidro, Nueva Córdoba, Rosario..." },
      { key: "codigoPostal", label: "Código Postal", placeholder: "Ej: 1642", type: "number" },
    ],
  },
  {
    id: "HOGAR_TECH",
    label: "Tecno y hogar",
    emoji: "🏠",
    description: "Electrodomésticos, celulares, informática, audio/video, muebles y artículos para el hogar y jardín.",
    supportsWholesale: true,
    supportsCondicion: true,
    condicionOptions: ["Nuevo", "Usado", "Reacondicionado"],
    hideVariants: false,
    hideTags: false,
    hideGender: true,
    supportsFeatured: true,
    checkoutMode: "cart" as const,
    defaultVariantName: "Color",
    variantValuePlaceholder: "Negro, Blanco, Gris",
    namePlaceholder: "Ej: Heladera Samsung No Frost 380L",
    tagsPlaceholder: "samsung, inverter, no-frost",
    categorias: [
      "electrodomesticos",
      "pequenos-electrodomesticos",
      "celulares-y-accesorios",
      "informatica-y-gaming",
      "audio-imagen-y-video",
      "muebles-y-colchones",
      "casa-y-jardin",
    ],
    subcategorias: {
      electrodomesticos: ["climatizacion", "refrigeracion", "agua-caliente", "cocina", "lavado-y-secado", "repuestos-y-accesorios"],
      "pequenos-electrodomesticos": ["desayuno", "ayudantes-de-cocina", "limpieza", "repuestos-y-accesorios"],
      "celulares-y-accesorios": ["smartphones", "wearables", "fundas", "cargadores", "auriculares-celular", "repuestos"],
      "informatica-y-gaming": ["pc", "notebooks", "impresoras", "monitores", "perifericos", "consolas", "videojuegos", "accesorios-gaming"],
      "audio-imagen-y-video": ["tvs", "camaras", "parlantes", "auriculares", "soundbars", "accesorios"],
      "muebles-y-colchones": ["mesas", "sillas", "sillones", "escritorios", "estantes", "colchones", "sommiers"],
      "casa-y-jardin": ["cuadros", "lamparas", "espejos", "plantas-deco", "textiles-hogar", "muebles-de-jardin", "herramientas-de-jardin"],
    },
    extraFields: [
      { key: "marca", label: "Marca", placeholder: "Samsung, LG, Whirlpool, Drean..." },
      { key: "modelo", label: "Modelo", placeholder: "RS27T5200S9, S4-W12JARPA..." },
      { key: "garantia", label: "Garantía", placeholder: "6 meses, 12 meses, sin garantía..." },
    ],
    extraFieldsByCategory: {
      // Electrodomésticos
      refrigeracion: [
        { key: "capacidad", label: "Capacidad (litros)", placeholder: "380" },
        { key: "tipoFrio", label: "Tipo de frío", options: ["No Frost", "Frío directo"] },
      ],
      climatizacion: [
        { key: "capacidadBtu", label: "Capacidad (BTU)", placeholder: "3000, 4500, 6000..." },
        { key: "tipoClima", label: "Tipo", options: ["Split", "Ventana/Portátil"] },
      ],
      cocina: [
        { key: "tipoCocina", label: "Tipo", placeholder: "Anafe, horno, microondas, cocina..." },
        { key: "potencia", label: "Potencia (W)", placeholder: "1000" },
      ],
      "lavado-y-secado": [
        { key: "capacidadKg", label: "Capacidad (kg)", placeholder: "8" },
        { key: "carga", label: "Tipo de carga", options: ["Frontal", "Superior"] },
      ],
      "agua-caliente": [
        { key: "capacidad", label: "Capacidad (litros)", placeholder: "80" },
        { key: "tipoAgua", label: "Tipo", options: ["Termotanque", "Calefón"] },
      ],
      // Pequeños electrodomésticos
      desayuno: [
        { key: "potencia", label: "Potencia (W)", placeholder: "800" },
      ],
      "ayudantes-de-cocina": [
        { key: "potencia", label: "Potencia (W)", placeholder: "600" },
        { key: "capacidad", label: "Capacidad", placeholder: "1.5 L, 5 L..." },
      ],
      limpieza: [
        { key: "potencia", label: "Potencia (W)", placeholder: "1800" },
      ],
      // Celulares y accesorios
      smartphones: [
        { key: "almacenamiento", label: "Almacenamiento", placeholder: "128GB, 256GB..." },
        { key: "ram", label: "Memoria RAM", placeholder: "8GB" },
        { key: "pantalla", label: "Pantalla", placeholder: "6.1\" AMOLED" },
      ],
      fundas: [
        { key: "compatible", label: "Compatible con", placeholder: "iPhone 13, Samsung A54..." },
      ],
      cargadores: [
        { key: "compatible", label: "Compatible con", placeholder: "USB-C, Lightning, Universal..." },
        { key: "potencia", label: "Potencia (W)", placeholder: "20, 65..." },
      ],
      "auriculares-celular": [
        { key: "conectividad", label: "Conectividad", options: ["Bluetooth", "Cable 3.5mm", "USB-C"] },
      ],
      wearables: [
        { key: "pantalla", label: "Pantalla", placeholder: "AMOLED 1.4\", LCD..." },
        { key: "autonomia", label: "Autonomía de batería", placeholder: "7 días, 24 horas..." },
        { key: "resistenciaAgua", label: "Resistencia al agua", placeholder: "5 ATM, IP68..." },
      ],
      // Informática y gaming
      impresoras: [
        { key: "tipoImpresora", label: "Tipo", options: ["Láser", "Inyección de tinta", "Multifunción"] },
      ],
      perifericos: [
        { key: "conectividad", label: "Conectividad", options: ["USB", "Bluetooth", "Inalámbrico"] },
      ],
      "accesorios-gaming": [
        { key: "compatible", label: "Compatible con", placeholder: "PS5, Xbox, PC..." },
      ],
      notebooks: [
        { key: "procesador", label: "Procesador", placeholder: "Ryzen 5, Core i5..." },
        { key: "ram", label: "Memoria RAM", placeholder: "16GB" },
        { key: "almacenamiento", label: "Almacenamiento", placeholder: "512GB SSD" },
      ],
      pc: [
        { key: "procesador", label: "Procesador", placeholder: "Ryzen 5, Core i5..." },
        { key: "ram", label: "Memoria RAM", placeholder: "16GB" },
        { key: "almacenamiento", label: "Almacenamiento", placeholder: "512GB SSD" },
      ],
      monitores: [
        { key: "pulgadas", label: "Pulgadas", placeholder: "24, 27, 32..." },
        { key: "resolucion", label: "Resolución", placeholder: "Full HD, 4K..." },
      ],
      consolas: [
        { key: "almacenamiento", label: "Almacenamiento", placeholder: "512GB, 1TB..." },
      ],
      // Audio, imagen y video
      tvs: [
        { key: "pulgadas", label: "Pulgadas", placeholder: "43, 50, 55, 65..." },
        { key: "resolucion", label: "Resolución", options: ["HD", "Full HD", "4K UHD", "8K"] },
        { key: "sistemaOperativo", label: "Sistema operativo", placeholder: "Android TV, Google TV, Roku..." },
      ],
      parlantes: [
        { key: "conectividad", label: "Conectividad", placeholder: "Bluetooth, Wi-Fi..." },
        { key: "potencia", label: "Potencia (W)", placeholder: "20" },
      ],
      soundbars: [
        { key: "conectividad", label: "Conectividad", placeholder: "Bluetooth, HDMI, óptico..." },
      ],
      camaras: [
        { key: "resolucion", label: "Resolución", placeholder: "12MP, 4K..." },
      ],
      auriculares: [
        { key: "conectividad", label: "Conectividad", options: ["Bluetooth", "Cable", "Inalámbrico"] },
      ],
      // Muebles y colchones
      colchones: [
        { key: "medidas", label: "Medidas", placeholder: "2 plazas, Queen, King..." },
        { key: "material", label: "Material", placeholder: "Espuma, resortes, viscoelástico..." },
      ],
      sommiers: [
        { key: "medidas", label: "Medidas", placeholder: "2 plazas, Queen, King..." },
      ],
      mesas: [
        { key: "material", label: "Material", placeholder: "Madera, vidrio, metal..." },
        { key: "medidas", label: "Medidas", placeholder: "120x80 cm" },
      ],
      sillas: [
        { key: "material", label: "Material", placeholder: "Madera, metal, plástico..." },
      ],
      sillones: [
        { key: "tapizado", label: "Tapizado", placeholder: "Tela, cuero, símil cuero..." },
        { key: "plazas", label: "Plazas", options: ["1", "2", "3", "Esquinero"] },
      ],
      escritorios: [
        { key: "material", label: "Material", placeholder: "Madera, melamina, metal..." },
        { key: "medidas", label: "Medidas", placeholder: "120x60 cm" },
      ],
      estantes: [
        { key: "material", label: "Material", placeholder: "Madera, metal..." },
      ],
      // Casa y jardín
      lamparas: [
        { key: "tipoLuz", label: "Tipo de luz", options: ["Cálida", "Fría", "Neutra"] },
      ],
      cuadros: [
        { key: "medidas", label: "Medidas", placeholder: "40x60 cm" },
      ],
      espejos: [
        { key: "medidas", label: "Medidas", placeholder: "60x80 cm" },
      ],
      "muebles-de-jardin": [
        { key: "material", label: "Material", placeholder: "Resina, aluminio, madera..." },
      ],
      "plantas-deco": [
        { key: "material", label: "Material", placeholder: "Cerámica, plástico, terracota..." },
      ],
      "textiles-hogar": [
        { key: "material", label: "Material", placeholder: "Algodón, blackout, lino..." },
        { key: "medidas", label: "Medidas", placeholder: "140x220 cm" },
      ],
    },
  },
  {
    id: "GASTRONOMIA",
    label: "Gastronomía",
    emoji: "🍽️",
    description: "Comida y bebida: rotisería, viandas, panadería, almacén, café, productos gourmet o de despensa.",
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
      { key: "ingredientes", label: "Ingredientes", placeholder: "Lista de ingredientes..." },
    ],
  },
  {
    id: "GENERAL",
    label: "Otros",
    emoji: "🏪",
    description: "Para cualquier otro producto que no encaje en los rubros anteriores.",
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
