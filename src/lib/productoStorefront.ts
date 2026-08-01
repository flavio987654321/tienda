import type { StorefrontProduct, StorefrontVariant } from "@/hooks/useStorefront";

/**
 * Pasa un producto crudo de la base a la forma que usa el storefront.
 *
 * Vivía adentro de ProductDetailClient, que es "use client": desde el servidor no
 * se podía llamar. Y hacía falta — la ficha ahora se arma en el servidor para que
 * Google reciba el producto en el HTML, y para eso el server component necesita
 * normalizar igual que el navegador. Dos copias de esta función serían dos formas
 * distintas de leer las mismas variantes.
 */
export type RawProduct = {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  precioMayorista?: number | null;
  cantMinMayorista?: number | null;
  preciosEscalonados?: string;
  soloMayorista?: boolean;
  cuotas?: number;
  category?: string;
  subcategory?: string;
  gender?: string;
  description?: string | null;
  images?: string;
  reelUrls?: string;
  variants?: StorefrontVariant[];
  attributes?: string;
  offerBadge?: string | null;
  offerNote?: string | null;
  offerEndsAt?: string | null;
};

const SIZE_ATTRS  = ["talle","size","talla","talles","sizes","tamaño","tamano","almacenamiento","ram","versión","version","formato","variante","material","sabor","peso/tamaño","peso"];
const COLOR_ATTRS = ["color","colour","colores","colors","tono"];

export function mapProduct(raw: RawProduct): StorefrontProduct {
  const variants = raw.variants ?? [];
  const sizesSet  = new Set<string>();
  const colorsSet = new Set<string>();
  variants.forEach((v) => {
    let attrs: Record<string, string> = {};
    try { const p = JSON.parse(v.name); if (p && typeof p === "object") attrs = p; } catch {}
    if (Object.keys(attrs).length > 0) {
      Object.entries(attrs).forEach(([k, val]) => {
        if (SIZE_ATTRS.includes(k.toLowerCase())  && val) sizesSet.add(val as string);
        if (COLOR_ATTRS.includes(k.toLowerCase()) && val) colorsSet.add(val as string);
      });
    } else {
      if (SIZE_ATTRS.includes(v.name?.toLowerCase())  && v.value) sizesSet.add(v.value);
      if (COLOR_ATTRS.includes(v.name?.toLowerCase()) && v.value) colorsSet.add(v.value);
    }
  });
  let images: string[] = [];
  let imageItems: { url: string; variantValue?: string }[] = [];
  try {
    const parsed = JSON.parse(raw.images || "[]");
    imageItems = parsed
      .map((img: string | { url?: string; variantValue?: string }) => typeof img === "string" ? { url: img } : { url: img?.url ?? "", variantValue: img?.variantValue })
      .filter((x: { url: string }) => x.url);
    images = imageItems.map((x) => x.url);
  } catch {}
  let reelUrls: string[] = [];
  try {
    const parsed = JSON.parse(raw.reelUrls || "[]");
    reelUrls = Array.isArray(parsed) ? parsed.filter((u: unknown) => typeof u === "string") : [];
  } catch {}
  let attributes: { key: string; value: string }[] = [];
  try {
    const parsed = JSON.parse(raw.attributes || "[]");
    attributes = Array.isArray(parsed) ? parsed.filter((a: unknown) => a && typeof a === "object") : [];
  } catch {}
  const offerActive = !raw.offerEndsAt || new Date(raw.offerEndsAt) > new Date();
  return {
    id: raw.id, name: raw.name, price: raw.price,
    comparePrice: offerActive ? (raw.comparePrice ?? null) : null,
    precioMayorista: raw.precioMayorista ?? null,
    cantMinMayorista: raw.cantMinMayorista ?? null,
    preciosEscalonados: (() => { try { const p = JSON.parse(raw.preciosEscalonados || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } })(),
    soloMayorista: raw.soloMayorista ?? false,
    offerBadge: offerActive ? (raw.offerBadge ?? null) : null,
    offerNote: offerActive ? (raw.offerNote ?? null) : null,
    cuotas: raw.cuotas ?? 0,
    category: raw.category ?? "general",
    subcategory: raw.subcategory ?? undefined,
    gender: raw.gender ?? "unisex",
    description: raw.description ?? null,
    images, imageItems, reelUrls,
    sizes: [...sizesSet], colors: [...colorsSet], variants,
    attributes,
  };
}
