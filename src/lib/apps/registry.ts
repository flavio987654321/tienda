// Registro de aplicaciones disponibles en /dashboard/aplicaciones.
// Es un array estático (no una tabla en la base de datos): cada app hoy es
// interna y su estado de "instalada" ya se puede derivar de datos que
// existen en Store, así que no hace falta persistir nada nuevo todavía.
// `provider` queda preparado para el día que se sumen apps de desarrolladores
// externos, sin que eso implique construir esa sección ahora.

export type AppCategory = "ventas" | "analitica" | "marketing";

export type AppDefinition = {
  id: string;
  name: string;
  /** Explicación completa en lenguaje simple — se muestra en la tarjeta de la vidriera, no solo en la ficha. */
  description: string;
  /** 2-4 resultados concretos, cortos, sin jerga técnica. */
  benefits: string[];
  category: AppCategory;
  price: "gratis" | "pago";
  provider: "interno" | "externo";
  /** Marca dueña del servicio, se muestra como "Proporcionado por X". */
  providerName: string;
  /** Visible en la vidriera pero sin botón de instalar todavía — se muestra "Próximamente". */
  comingSoon?: boolean;
};

export const CATEGORY_LABELS: Record<AppCategory, string> = {
  ventas: "Ventas",
  analitica: "Analítica",
  marketing: "Marketing",
};

export const APPS_REGISTRY: AppDefinition[] = [
  {
    id: "meta-catalogo",
    name: "Catálogo de Meta",
    description:
      "Conecta automáticamente todos tus productos a Facebook e Instagram, para que tus clientes los vean y los compren sin salir de esas apps.",
    benefits: [
      "Tus productos aparecen en la pestaña Tienda de tu Facebook",
      "Podés etiquetar productos en tus posts e historias de Instagram",
      "Se actualiza solo: si cambiás un precio o se agota el stock, se ve reflejado",
    ],
    category: "ventas",
    price: "gratis",
    provider: "interno",
    providerName: "Meta",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description:
      "Te muestra, con datos reales de Google, cuánta gente visita tu tienda, qué productos miran más y por dónde te encuentran.",
    benefits: [
      "Sabés cuántas visitas tenés por día",
      "Vés si tus clientes llegan por Instagram, WhatsApp, Google u otro lado",
      "Detectás qué productos generan más interés",
    ],
    category: "analitica",
    price: "gratis",
    provider: "interno",
    providerName: "Google",
  },
  {
    id: "facebook-pixel",
    name: "Meta Pixel",
    description:
      "Si hacés publicidad paga en Facebook o Instagram, esto le enseña a Meta qué tipo de personas terminan comprando en tu tienda, para mostrarles el anuncio a más gente parecida.",
    benefits: [
      "Tus anuncios rinden más con la misma plata invertida",
      "Podés mostrarle un anuncio a alguien que miró un producto y no compró",
      "Sin esto, Meta no tiene forma de saber si tus anuncios generan ventas",
    ],
    category: "marketing",
    price: "gratis",
    provider: "interno",
    providerName: "Meta",
  },
  {
    id: "google-shopping",
    name: "Google Shopping",
    description:
      "Mostrá tus productos gratis en la búsqueda de Google y en la pestaña Shopping, para que te encuentren clientes nuevos que ni sabían que existías.",
    benefits: [
      "Tus productos aparecen en Google sin pagar publicidad",
      "Se actualiza solo: si cambiás un precio o se agota el stock, se ve reflejado",
      "Funciona parecido al catálogo de Meta, pero del lado de Google",
    ],
    category: "ventas",
    price: "gratis",
    provider: "interno",
    providerName: "Google",
    comingSoon: true,
  },
  {
    id: "whatsapp-catalogo",
    name: "Catálogo en WhatsApp",
    description:
      "Mostrá tu catálogo de productos directo en tu WhatsApp Business, y activá gratis la inteligencia artificial de Meta para que les conteste a tus clientes sola, las 24 horas.",
    benefits: [
      "Tus clientes ven tus productos, precios y fotos sin salir de WhatsApp",
      "Se actualiza solo, es el mismo catálogo que usan Facebook e Instagram",
      "Podés activar gratis la IA de Meta para que responda consultas automáticamente",
    ],
    category: "ventas",
    price: "gratis",
    provider: "interno",
    providerName: "Meta",
  },
];

export function getApp(id: string): AppDefinition | undefined {
  return APPS_REGISTRY.find((a) => a.id === id);
}
