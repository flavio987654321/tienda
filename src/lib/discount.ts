// % de descuento a mostrar en el badge "Oferta/SALE". Devuelve null (sin
// badge) si no hay precio de comparación o si está mal cargado (menor o
// igual al precio actual) — evita mostrar "Oferta" con un descuento falso.
export function discountPercent(price: number, comparePrice: number | null | undefined): number | null {
  if (!comparePrice || comparePrice <= price) return null;
  return Math.round((1 - price / comparePrice) * 100);
}
