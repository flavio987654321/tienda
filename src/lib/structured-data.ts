/**
 * Datos estructurados (schema.org) para las fichas de producto.
 *
 * Qué es
 * ------
 * Un bloque JSON invisible que va en el HTML y que Google lee para entender QUÉ
 * hay en la página. Sin él, ve un texto cualquiera; con él, sabe que es un
 * producto, cuánto sale, si hay stock y qué puntaje tiene. Eso es lo que hace la
 * diferencia entre un link pelado y un resultado con precio y estrellas.
 *
 * No necesita ninguna cuenta, ni Merchant Center, ni Google Shopping: es gratis y
 * alcanza con que la página sea pública.
 *
 * La regla que no se puede romper
 * -------------------------------
 * Lo que se declara acá tiene que ESTAR VISIBLE en la página. Si se marca un
 * puntaje que el comprador no ve, o un precio distinto al que se muestra, Google
 * lo trata como engaño y puede sacar el sitio de los resultados enriquecidos —o
 * del índice—. Por eso todo lo de acá sale de los mismos datos que pinta la
 * ficha, y `aggregateRating` sólo se incluye si hay reseñas de verdad.
 */

import { SITE_URL } from "@/lib/site";

export type ProductoParaSchema = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  images: string[];
  /** Fin de la oferta, si el producto está en oferta. */
  offerEndsAt?: Date | string | null;
  variants: { price: number | null; stock: number; sku: string | null }[];
};

export type TiendaParaSchema = {
  nombre: string;
  slug: string;
};

export type ResenasParaSchema = {
  /** Promedio en la escala 1–5. */
  promedio: number;
  /** Cuántas reseñas publicadas hay. Si es 0, no se declara puntaje. */
  total: number;
};

const urlAbsoluta = (ruta: string) => `${SITE_URL}${ruta}`;

/** Redondea a dos decimales sin arrastrar la basura del punto flotante. */
const dosDecimales = (n: number) => Math.round(n * 100) / 100;

export function construirProductSchema(
  producto: ProductoParaSchema,
  tienda: TiendaParaSchema,
  moneda: string,
  resenas?: ResenasParaSchema
): Record<string, unknown> {
  const url = urlAbsoluta(`/tienda/${tienda.slug}/producto/${producto.id}`);

  // Disponibilidad: la suma del stock de todas las variantes. Un producto sin
  // variantes cargadas no permite afirmar que está agotado, así que se lo da por
  // disponible — declarar "OutOfStock" de más esconde el producto de los
  // resultados enriquecidos sin que nadie se entere.
  const hayVariantes = producto.variants.length > 0;
  const stockTotal = producto.variants.reduce((s, v) => s + v.stock, 0);
  const disponible = !hayVariantes || stockTotal > 0;

  // El precio que se declara es el que ve el comprador. Cuando las variantes
  // tienen precio propio, la ficha muestra un rango —y ahí corresponde
  // `AggregateOffer` con mínimo y máximo, no un precio único que sería mentira
  // para todas las variantes menos una.
  const preciosVariantes = producto.variants
    .map((v) => v.price)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const precios = preciosVariantes.length > 0 ? preciosVariantes : [producto.price];
  const minimo = Math.min(...precios);
  const maximo = Math.max(...precios);

  const disponibilidad = disponible
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  const comunDeLaOferta = {
    priceCurrency: moneda,
    availability: disponibilidad,
    itemCondition: "https://schema.org/NewCondition",
    url,
    seller: { "@type": "Organization", name: tienda.nombre },
    // Sólo si el producto tiene una oferta con fecha de fin. Google pide que si
    // se declara, sea real: es la fecha hasta la que ese precio vale.
    ...(producto.offerEndsAt
      ? { priceValidUntil: new Date(producto.offerEndsAt).toISOString().slice(0, 10) }
      : {}),
  };

  const offers =
    minimo === maximo
      ? { "@type": "Offer", price: dosDecimales(minimo), ...comunDeLaOferta }
      : {
          "@type": "AggregateOffer",
          lowPrice: dosDecimales(minimo),
          highPrice: dosDecimales(maximo),
          offerCount: precios.length,
          ...comunDeLaOferta,
        };

  // El SKU de la primera variante que tenga uno. Le sirve a Google para juntar la
  // misma prenda vendida en distintos lados; si no hay, no se inventa nada.
  const sku = producto.variants.find((v) => v.sku)?.sku ?? undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.name,
    // La descripción se recorta igual que en la metadata de la página, para que
    // las dos digan exactamente lo mismo.
    description: producto.description?.slice(0, 5000) || `${producto.name} — ${tienda.nombre}`,
    ...(producto.images.length > 0 ? { image: producto.images } : {}),
    ...(producto.category ? { category: producto.category } : {}),
    ...(sku ? { sku } : {}),
    // `productID` con el id interno: es el identificador estable de esta ficha.
    productID: producto.id,
    brand: { "@type": "Brand", name: tienda.nombre },
    offers,
    // SÓLO si hay reseñas publicadas. Declarar un `aggregateRating` con cero
    // reseñas es un error que Google marca y que invalida el bloque entero —no
    // sólo el puntaje—, así que se omite en vez de mandar ceros.
    ...(resenas && resenas.total > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: dosDecimales(resenas.promedio),
            reviewCount: resenas.total,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** Las migas de pan: le dicen a Google la ruta de la ficha, y las muestra en vez
 *  de la URL cruda debajo del título. */
export function construirBreadcrumbSchema(
  producto: { id: string; name: string },
  tienda: TiendaParaSchema
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: tienda.nombre, item: urlAbsoluta(`/tienda/${tienda.slug}`) },
      { "@type": "ListItem", position: 2, name: "Productos", item: urlAbsoluta(`/tienda/${tienda.slug}/productos`) },
      { "@type": "ListItem", position: 3, name: producto.name },
    ],
  };
}

/**
 * Serializa para meter adentro de un <script type="application/ld+json">.
 *
 * El `replace` no es decorativo: si algún dato tuviera "</script>" —el nombre de
 * un producto, una descripción— el navegador cerraría la etiqueta ahí y el resto
 * quedaría suelto en la página como HTML. Escapando "<" eso no puede pasar.
 */
export function serializarSchema(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
