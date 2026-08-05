import type { StorefrontProduct, StorefrontVariant } from "@/hooks/useStorefront";
import { opcionesDeVariantes } from "@/lib/opciones";

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

export function mapProduct(raw: RawProduct): StorefrontProduct {
  const variants = raw.variants ?? [];
  // Las opciones salen de las variantes con su nombre, con la MISMA función que
  // usa el navegador. Acá vivía la lista blanca ENTERA duplicada —los mismos 17
  // nombres permitidos, copiados—, así que este mapeo del servidor perdía una
  // opción llamada "Largo" exactamente igual que el otro.
  const opciones = opcionesDeVariantes(variants);
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
    opciones, variants,
    attributes,
  };
}
