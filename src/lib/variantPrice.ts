import type { StorefrontVariant } from "@/hooks/useStorefront";
import { parseVariantAttrs } from "@/lib/variantAttrs";

/**
 * Resuelve el precio propio de la variante seleccionada (si tiene uno).
 * Retorna null si no hay variante con precio propio, o si no hay match.
 * Cuando retorna un valor, ese precio REEMPLAZA al precio base del producto.
 */
export function resolveVariantPrice(
  variants: StorefrontVariant[],
  size: string,
  color: string,
  variantId?: string | null,
): number | null {
  if (!variants.length) return null;
  // Primero buscar por variantId (más preciso)
  if (variantId) {
    const v = variants.find(v => v.id === variantId);
    if (v?.price != null && v.price > 0) return v.price;
  }
  // Fallback por talle+color
  const v = variants.find(v => {
    const a = parseVariantAttrs(v.name);
    if (a) {
      const vals = Object.values(a).map((x) => String(x).toLowerCase());
      const sizeOk = !size || vals.includes(size.toLowerCase());
      const colorOk = !color || vals.includes(color.toLowerCase());
      return sizeOk && colorOk;
    }
    return (!size || v.value.includes(size)) && (!color || v.value.includes(color));
  }) ?? (variants.length === 1 ? variants[0] : null);
  if (v?.price != null && v.price > 0) return v.price;
  return null;
}
