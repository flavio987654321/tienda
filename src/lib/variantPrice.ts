import type { StorefrontVariant } from "@/hooks/useStorefront";
import { buscarVariante } from "@/lib/variantMatch";

/**
 * Resuelve el precio propio de la variante seleccionada (si tiene uno).
 * Retorna null si no hay variante con precio propio, o si no hay match.
 * Cuando retorna un valor, ese precio REEMPLAZA al precio base del producto.
 */
export function resolveVariantPrice(
  variants: StorefrontVariant[],
  /** Los valores elegidos, sin los nombres: `["M", "Negro"]`. */
  elegidos: string[],
  variantId?: string | null,
): number | null {
  if (!variants.length) return null;
  // Primero buscar por variantId (más preciso)
  if (variantId) {
    const v = variants.find(v => v.id === variantId);
    if (v?.price != null && v.price > 0) return v.price;
  }
  // Fallback por talle+color — mismo buscador que usan el stock y el id de la
  // variante que se vende, así los tres no pueden volver a discrepar.
  const v = buscarVariante(variants, elegidos);
  if (v?.price != null && v.price > 0) return v.price;
  return null;
}
