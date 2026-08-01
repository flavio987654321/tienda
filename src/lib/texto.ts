/**
 * Contar y recortar texto sin romper los emojis.
 *
 * `"🎉".length` es 2, no 1: en JavaScript un emoji ocupa dos unidades. Y hay
 * emojis de más: 🛍️ son dos code points (el símbolo y un selector de variante),
 * y una bandera o una familia, varios más pegados con caracteres invisibles.
 *
 * Eso rompe dos cosas a la vez:
 *
 * 1. **El contador miente.** Un título de "10 caracteres" con tres emojis marca
 *    16, y el dueño ve que se le acaba el espacio sin entender por qué.
 * 2. **`.slice()` corta a la mitad de un emoji.** Lo que queda no es un
 *    carácter: es media unidad suelta, y llega al celular y a la casilla como
 *    un rombito con un signo de pregunta.
 *
 * `Intl.Segmenter` agrupa por "lo que se ve como un carácter", que es
 * exactamente la unidad en la que piensa quien escribe. Va con respaldo a
 * `Array.from` —que al menos respeta los code points— por si algún runtime viejo
 * no lo trae.
 */

const segmentador =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** El texto partido en caracteres visibles. */
function grafemas(texto: string): string[] {
  if (!segmentador) return Array.from(texto);
  return Array.from(segmentador.segment(texto), (s) => s.segment);
}

/** Cuántos caracteres ve una persona. Es lo que tiene que mostrar el contador. */
export function largoVisible(texto: string): number {
  return grafemas(texto).length;
}

/** Recorta a `max` caracteres visibles, sin partir ninguno al medio. */
export function recortar(texto: string, max: number): string {
  const partes = grafemas(texto);
  return partes.length <= max ? texto : partes.slice(0, max).join("");
}
