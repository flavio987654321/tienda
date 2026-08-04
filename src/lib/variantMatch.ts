import type { StorefrontVariant } from "@/hooks/useStorefront";
import { parseVariantAttrs } from "@/lib/variantAttrs";

// ─────────────────────────────────────────────────────────────────────────────
// Encontrar la variante que eligió el comprador.
//
// Había TRES implementaciones de lo mismo y sólo dos estaban bien:
//
//   - `resolveVariantStock` (useCartLogic)  → parseaba los atributos. Bien.
//   - `resolveVariantPrice` (variantPrice)  → idem. Bien.
//   - `resolveVariantId`    (useStorefront) → comparaba `v.value` contra el talle
//                                             o el color SUELTOS. Mal.
//
// El tercero es justo el que decide QUÉ VARIANTE SE VENDE, y estaba roto: una
// variante con dos dimensiones guarda `value` como `"M/L / Negro"`, que nunca es
// igual a `"M/L"` ni a `"Negro"` por separado. Al no encontrar match caía en
// `variants[0]`, así que TODA compra de un producto con talle y color se llevaba
// la primera variante de la lista sin importar lo que el comprador hubiera
// elegido: se descontaba stock de la fila equivocada y el pedido le llegaba a la
// dueña con el color que no era.
//
// Al 2026-08-04 eso alcanzaba a 53 productos activos de tres tiendas publicadas
// (amaranta 30, girly-store 21, tiendaapps 2).
//
// Ahora hay una sola función y la usan las tres. La coincidencia se hace por los
// VALORES, sin mirar cómo se llaman las opciones — así sigue funcionando igual
// el día que una opción se llame "Largo" en vez de "Talle".
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ¿Esta variante tiene TODOS estos valores?
 *
 * Los vacíos se ignoran, así que con la lista vacía da `true`: sirve tanto para
 * "la que eligió el comprador" como para "las que tienen este color, en
 * cualquier talle" —que es lo que necesitan los tachados de sin-stock—.
 */
export function varianteTiene(
  v: StorefrontVariant,
  valores: (string | null | undefined)[],
): boolean {
  const buscados = valores.filter((x): x is string => !!x).map(x => x.toLowerCase());
  const attrs = parseVariantAttrs(v.name);
  if (attrs) {
    const vals = Object.values(attrs).map(x => String(x).toLowerCase());
    return buscados.every(b => vals.includes(b));
  }
  // Fila vieja, anterior al JSON: `name` era el nombre de la opción y `value` el
  // valor, a veces con varios juntos. Se compara por contenido, como antes.
  const val = v.value.toLowerCase();
  return buscados.every(b => val.includes(b));
}

/**
 * La variante que corresponde a los valores elegidos.
 *
 * `elegidos` son los valores, no los nombres: `["M/L", "Negro"]`. Los vacíos se
 * ignoran, así que con nada elegido devuelve la primera —que es lo que hace falta
 * para mostrar precio y stock antes de que el comprador toque nada.
 *
 * Devuelve `null` si el producto tiene varias variantes y ninguna coincide. Antes
 * en ese caso se devolvía la primera, que es exactamente cómo se vendía la
 * variante equivocada: ante la duda es mejor no resolver que resolver mal.
 */
export function buscarVariante(
  variants: StorefrontVariant[],
  elegidos: (string | null | undefined)[],
): StorefrontVariant | null {
  if (!variants.length) return null;
  const match = variants.find(v => varianteTiene(v, elegidos));
  if (match) return match;
  return variants.length === 1 ? variants[0] : null;
}
