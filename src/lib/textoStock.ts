/** El aviso de stock bajo de la ficha, bien escrito en singular y plural.
 *  Antes cinco pantallas decían "¡Últimas 1 unidades!" con stock 1 (05/10/26). */
export function avisoUltimas(stock: number): string {
  return stock === 1 ? "¡Última unidad!" : `¡Últimas ${stock} unidades!`;
}
