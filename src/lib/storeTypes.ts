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
  | "DIGITAL"
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
  condicionOptions?: string[];
  /**
   * El producto se entrega como archivo descargable: el formulario pide subirlo
   * y sin archivo no se puede publicar.
   *
   * Flag y no una comparación contra "DIGITAL" repartida por el código, por el
   * mismo motivo que `supportsAffiliates`: el día que otro rubro venda archivos
   * —una disquería con sus temas, un estudio con planos— se destraba cambiando
   * UN booleano acá y no persiguiendo comparaciones por seis archivos.
   */
  requiereArchivo?: boolean;
  /**
   * El stock no se descuenta al vender: hay existencias infinitas.
   *
   * Explícito y NO inferido de `requiereArchivo`, por el mismo motivo que
   * `showServiceHistory` no se infiere de `hideVariants`: son dos cosas
   * distintas que hoy coinciden. Un rubro futuro podría vender un archivo con
   * stock limitado (entradas numeradas, cupos de un taller), y heredar por
   * error "vendé infinito" sería vender lo que no hay.
   *
   * Ojo con lo contrario también: `hideVariants` hace que el formulario mande
   * una variante sintética con stock 1. Sin este flag, un PDF se vendería UNA
   * sola vez y quedaría agotado para siempre.
   */
  stockIlimitado?: boolean;
  checkoutMode: "cart" | "inquiry";
  /**
   * Si el rubro puede tener programa de afiliados.
   *
   * Hoy sólo lo apaga AUTOS, y no por una limitación técnica: el cableado está
   * entero y andando. Es una decisión sobre plata.
   *
   * La diferencia con los rubros de carrito: ahí la comisión la retiene
   * MercadoPago de la venta misma (`marketplace_fee`), o sea que existe antes de
   * que el afiliado la vea. En un rubro de consulta no pasa un peso por la
   * plataforma —el auto se paga en la concesionaria— así que el saldo que se le
   * acredita al afiliado no lo respalda nada, y el dueño tiene que transferirlo
   * de su bolsillo.
   *
   * Con precios de auto, un porcentaje mal puesto son millones de comisión sobre
   * una venta que nunca tocamos. Eso necesita su propio diseño (monto fijo por
   * consulta, topes, y qué se le promete a cada lado), no heredar el de ropa.
   *
   * Se pausa ahora porque ahora es gratis: no hay ninguna tienda de autos ni
   * ninguna consulta en producción. Con concesionarias adentro, sacarlo sería
   * romperle el negocio a alguien.
   */
  supportsAffiliates: boolean;
  namePlaceholder: string;
  variantValuePlaceholder: string;
  tagsPlaceholder: string;
  categorias: string[];
  subcategorias: Record<string, string[]>;
  extraFields: ExtraField[];
  /**
   * Specs propias de una categoría o subcategoría (ej: "Pulgadas" para tvs,
   * "Piedra" para joyas). Se resuelven con `camposActivos`.
   *
   * La clave puede ser una subcategoría ("tvs", "collares") o una categoría
   * ("joyas"). Antes sólo se miraba la subcategoría: los mismos dos campos
   * había que repetirlos en `collares`, `anillos`, `pulseras` y `aros`, y un
   * producto cargado en "Joyas" sin subcategoría no recibía ninguno.
   */
  extraFieldsByCategory?: Record<string, ExtraField[]>;
  /** Ejemplos del nombre y de los tags por categoría. Ver `ejemploNombre`. */
  ejemplosPorCategoria?: Record<string, { nombre: string; tags: string }>;
}

/**
 * Los ejemplos del formulario para una categoría: el del nombre y el de los tags.
 *
 * Los del rubro son un solo par para todo Moda, y son de ropa: quien abre una
 * joyería ve "Ej: Remera oversize negra talle M" y "negro, oversize, algodon".
 * Es la primera señal de "esto no fue pensado para mí".
 *
 * OJO CON EL ALCANCE: el campo del nombre está ARRIBA de la categoría en el
 * formulario, así que el que carga de arriba hacia abajo no llega a ver el
 * ejemplo bueno. Sirve si vuelve a mirar o si cambia de categoría. Los tags sí
 * están abajo y ahí funciona siempre.
 *
 * No se mueve la categoría arriba del nombre a propósito: ni Shopify ni
 * Tiendanube ni MercadoLibre lo hacen, y acá cambiaría el orden en los cinco
 * rubros, no sólo en Moda.
 *
 * Los ejemplos viven DENTRO de cada rubro y no en un mapa suelto porque los
 * nombres de categoría se repiten entre rubros: Moda y Autos tienen las dos una
 * categoría "accesorios", y un mapa suelto le pondría "Lentes de sol
 * polarizados" a una casa de repuestos.
 */
/** El ejemplo del nombre: el de la categoría si hay, si no el del rubro. */
export function ejemploNombre(config: StoreTypeConfig, category: string): string {
  const propio = config.ejemplosPorCategoria?.[category]?.nombre;
  return propio ? `Ej: ${propio}` : config.namePlaceholder;
}

/** El ejemplo de los tags: el de la categoría si hay, si no el del rubro. */
export function ejemploTags(config: StoreTypeConfig, category: string): string {
  return config.ejemplosPorCategoria?.[category]?.tags ?? config.tagsPlaceholder;
}

/**
 * Los campos propios de lo que se está cargando. Manda la subcategoría; si no
 * hay nada para ella, la categoría.
 */
export function camposPropios(config: StoreTypeConfig, category: string, subcategory: string): ExtraField[] {
  const porSub = subcategory ? config.extraFieldsByCategory?.[subcategory] : undefined;
  if (porSub?.length) return porSub;
  return (category ? config.extraFieldsByCategory?.[category] : undefined) ?? [];
}

/**
 * Todos los campos a mostrar: los del rubro más los de la categoría.
 *
 * Si comparten `key`, el de la categoría PISA al del rubro y se queda en su
 * lugar. Antes sólo se sumaban, así que un collar pedía "Material: Algodón,
 * poliéster..." —el ejemplo de todo Moda— además de lo suyo.
 */
export function camposActivos(config: StoreTypeConfig, category: string, subcategory: string): ExtraField[] {
  const propios = camposPropios(config, category, subcategory);
  return [
    ...config.extraFields.map(f => propios.find(p => p.key === f.key) ?? f),
    ...propios.filter(p => !config.extraFields.some(f => f.key === p.key)),
  ];
}

/* ── Cómo se escribe cada categoría en pantalla ──────────────────────────────
   Los slugs (`ropa-ninos`, `ropa-bebe`) van sin tildes ni ñ a propósito: se
   guardan en la base y viajan en la URL, y ahí los caracteres especiales traen
   problemas. Pero la etiqueta que ve la dueña salía de capitalizar el slug, así
   que en el formulario se leía "Ropa Ninos" y "Ropa Bebe".

   Acá van SÓLO las excepciones: las que pierden una letra que el slug no puede
   llevar. El resto se arma solo.

   Los slugs de subcategoría sí tienen tildes ("básica", "corpiños"), porque no
   viajan en la URL — por eso casi ninguna necesita estar acá.                   */
export const ETIQUETAS_CATEGORIA: Record<string, string> = {
  "ropa-ninos": "Ropa niños",
  "ropa-bebe": "Ropa bebé",
  "escote-v": "Escote V", // la V va en mayúscula: es la forma del escote, no una palabra
};

/** Cómo mostrar una categoría o subcategoría.
 *
 *  Va en mayúscula sólo la primera palabra, no todas. Antes se capitalizaban
 *  todas y quedaban cosas como "Short De Baño" y "Manga Larga"; en español lleva
 *  mayúscula la primera y nada más. */
export function etiquetaCategoria(valor: string): string {
  const excepcion = ETIQUETAS_CATEGORIA[valor];
  if (excepcion) return excepcion;
  const texto = valor.split("-").filter(Boolean).join(" ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
    supportsAffiliates: true,
    variantValuePlaceholder: "S, M, L, XL",
    namePlaceholder: "Ej: Remera oversize negra talle M",
    tagsPlaceholder: "negro, oversize, algodon",
    // El orden es el del desplegable: primero lo de arriba del cuerpo, después lo
    // de abajo, después calzado y accesorios, y al final las líneas de niños.
    //
    // `sweaters` va como CATEGORÍA propia y no dentro de `buzos`: un buzo es de
    // frisa y un sweater es de punto o lana. Prenda distinta, tela distinta,
    // temporada distinta — y nadie que busca un sweater entra a "Buzos".
    // Lo mismo con `camisas`, que antes caían en "remeras".
    categorias: ["remeras", "camisas", "sweaters", "buzos", "camperas", "pantalones", "polleras", "vestidos", "mallas", "calzado", "joyas", "accesorios", "bolsos", "ropa-interior", "ropa-ninos", "ropa-bebe"],
    subcategorias: {
      remeras: ["básica", "oversize", "estampada", "manga-larga"],
      camisas: ["lisa", "estampada", "lino", "denim", "manga-corta", "oversize"],
      sweaters: ["cárdigan", "cuello-alto", "escote-v", "hilo", "lana", "chaleco"],
      pantalones: ["jeans", "wide-leg", "cargo", "legging", "short"],
      polleras: ["mini", "midi", "larga", "plisada", "denim", "tubo"],
      vestidos: ["casual", "fiesta", "midi", "maxi"],
      mallas: ["bikini", "enteriza", "trikini", "short-de-baño", "salida-de-baño"],
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
    // Moda no es sólo ropa: adentro entran joyería, calzado, marroquinería y
    // accesorios, y cada uno se describe distinto. Sin esto, una joyería pedía
    // "Material: Algodón, poliéster..." para un collar de plata.
    //
    // Dos campos por categoría y todos opcionales, a propósito. Es el modelo de
    // Shopify (atributos por categoría, opcionales) y no el de MercadoLibre
    // (ficha técnica larga con campos obligatorios): la diferencia entre dos
    // campos y cinco es la diferencia entre que se completen y que se saltee la
    // sección entera.
    //
    // Van por CATEGORÍA, no por subcategoría: los cuatro tipos de joya piden lo
    // mismo. Ver `camposPropios`, que cae a la categoría si no hay nada para la
    // subcategoría.
    extraFieldsByCategory: {
      joyas: [
        // Pisa al "material" del rubro: mismo `key`, mismo rótulo, otro ejemplo.
        { key: "material", label: "Material", placeholder: "Plata 925, oro 18k, acero quirúrgico..." },
        { key: "piedra", label: "Piedra", placeholder: "Circonia, perla, cuarzo rosa..." },
      ],
      calzado: [
        { key: "material", label: "Material", placeholder: "Cuero, gamuza, lona, sintético..." },
        { key: "suela", label: "Suela", placeholder: "Goma, EVA, cuero..." },
      ],
      bolsos: [
        { key: "material", label: "Material", placeholder: "Cuero, lona, sintético..." },
        { key: "medidas", label: "Medidas", placeholder: "30 x 25 x 12 cm" },
      ],
      // Éstas sí van por SUBCATEGORÍA: dentro de accesorios, unos lentes y un
      // cinturón no tienen nada en común.
      lentes: [
        { key: "proteccionUv", label: "Protección UV", options: ["UV400", "UV380", "Sin protección"] },
        { key: "tipoLente", label: "Tipo de lente", options: ["Polarizado", "Espejado", "Degradé", "Común"] },
      ],
      cinturones: [
        { key: "material", label: "Material", placeholder: "Cuero, sintético..." },
        { key: "ancho", label: "Ancho", placeholder: "3 cm" },
      ],
      // Mallas, ropa interior y bebé quedan con el "Material" del rubro y nada
      // más: no hay un campo que sumen que no sea ruido, y campos de más es
      // justo lo que hace que no se complete ninguno.
    },
    ejemplosPorCategoria: {
      joyas:        { nombre: "Collar de plata 925 con dije de luna", tags: "plata, dorado, minimalista" },
      calzado:      { nombre: "Zapatilla urbana de cuero blanca",     tags: "cuero, urbana, blanca" },
      bolsos:       { nombre: "Cartera de cuero con manija corta",    tags: "cuero, negra, mano" },
      accesorios:   { nombre: "Lentes de sol polarizados negros",     tags: "polarizado, negro, verano" },
      vestidos:     { nombre: "Vestido midi floreado de gasa",        tags: "floreado, midi, verano" },
      mallas:       { nombre: "Bikini triangulito lisa",              tags: "lisa, verano, playa" },
      "ropa-interior": { nombre: "Corpiño sin aro de algodón",        tags: "algodon, sin aro, comodo" },
      "ropa-bebe":  { nombre: "Body de algodón manga larga",          tags: "algodon, bebe, invierno" },
      "ropa-ninos": { nombre: "Buzo de frisa con capucha",            tags: "frisa, capucha, abrigo" },
    },
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
    supportsAffiliates: false,
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
    checkoutMode: "cart" as const,
    supportsAffiliates: true,
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
    supportsAffiliates: true,
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
    id: "DIGITAL",
    label: "Productos digitales",
    emoji: "📥",
    description: "Archivos que el comprador descarga: plantillas, ebooks, guías, licencias y códigos. No se envía nada — se entregan solos cuando entra el pago.",
    // Nada de esto se manda por correo ni se cuenta en un depósito: sin envío,
    // sin variantes (un PDF no tiene talle ni color) y sin género. El mayorista
    // tampoco aplica: no hay costo por unidad que baje comprando de a diez.
    supportsWholesale: false,
    supportsCondicion: false,
    hideVariants: true,
    hideTags: false,
    hideGender: true,
    hideShipping: true,
    requiereArchivo: true,
    stockIlimitado: true,
    // Carrito, NO consulta. Es la diferencia con AUTOS, que también esconde el
    // envío: acá el pago online es justamente lo que dispara la entrega.
    checkoutMode: "cart" as const,
    supportsAffiliates: true,
    variantValuePlaceholder: "Opción 1, Opción 2",
    namePlaceholder: "Ej: Plantilla de presupuesto familiar en Excel",
    tagsPlaceholder: "canva, excel, imprimible",
    // "plantillas" acá es lo que compra el cliente (un archivo ya diseñado). No
    // confundir con /afiliados/plantillas, que son textos para copiar y pegar:
    // viven en pantallas distintas y no se cruzan nunca.
    categorias: ["plantillas", "ebooks", "licencias"],
    subcategorias: {
      plantillas: ["canva", "excel", "word", "notion", "imprimibles"],
      ebooks: ["guías", "recetarios", "libros"],
      licencias: ["software", "códigos", "accesos"],
    },
    extraFields: [
      { key: "formato",  label: "Formato",           placeholder: "PDF, XLSX, DOCX, ZIP..." },
      { key: "programa", label: "Programa necesario", placeholder: "Canva, Excel, Word..." },
      { key: "paginas",  label: "Páginas",            placeholder: "24", type: "number" },
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
    supportsAffiliates: true,
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

/**
 * Si este rubro puede tener afiliados. Ver `supportsAffiliates` arriba.
 *
 * Todo lo que decide sobre afiliados pregunta acá y no compara contra "AUTOS" a
 * mano: cuando el modelo de comisión por consulta esté resuelto, se destraba
 * cambiando UN booleano en la definición del rubro. Con la comparación repartida
 * por seis archivos, destrabarlo a medias sería dejar una puerta abierta sin que
 * se note.
 */
export function soportaAfiliados(tipoTienda: string | null | undefined): boolean {
  return getStoreType(tipoTienda ?? "ROPA").supportsAffiliates;
}

/**
 * Los rubros que sí lo tienen, para filtrar en la base.
 *
 * Sale de la misma definición que `soportaAfiliados` en vez de ser una lista
 * escrita a mano: así una consulta SQL y un chequeo en código nunca pueden
 * opinar distinto sobre el mismo rubro.
 */
export const RUBROS_CON_AFILIADOS: string[] = STORE_TYPES
  .filter((t) => t.supportsAffiliates)
  .map((t) => t.id);

/** Por qué no se puede, para mostrarle a la dueña. */
export const MOTIVO_SIN_AFILIADOS =
  "El programa de afiliados todavía no está disponible para tiendas de autos y motos. " +
  "Acá la venta no se cobra online, así que la comisión necesita otras reglas — lo estamos preparando.";
