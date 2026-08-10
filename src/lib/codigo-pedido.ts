/**
 * El código corto con el que un comprador busca su pedido.
 *
 * Es lo que va en el mail ("N° de orden: 4Q5XASA") y lo que la página pública de
 * seguimiento recibe en la URL. Sale de los últimos caracteres del id, que es un
 * cuid: sólo minúsculas y números.
 *
 * ── Por qué esto existe como función aparte ──────────────────────────────────
 * Porque el endpoint buscaba con `endsWith: codigo`, y Prisma NO escapa los
 * comodines de `LIKE` en `contains` / `startsWith` / `endsWith`. O sea que lo
 * que llegaba por la URL entraba crudo al patrón:
 *
 *     /api/seguimiento?codigo=______   →   LIKE '%______'
 *
 * Seis guiones bajos son seis "cualquier carácter", así que eso hacía juego con
 * el primer pedido que encontrara la base —de cualquier tienda— y devolvía
 * nombre, email, teléfono, dirección, productos y totales de una persona real.
 * Sin login, desde cualquier lado. Con `%` pasaba lo mismo.
 *
 * El largo mínimo no alcanzaba para nada: `______` mide seis.
 *
 * Lo que corta es la lista de caracteres. Un cuid no tiene guiones bajos ni
 * porcentajes, así que aceptar sólo letras y números deja el comodín afuera por
 * definición, y no depende de que alguien se acuerde de escapar.
 */

/**
 * Cuántos caracteres se piden como mínimo.
 *
 * Los mails reparten 8. El panel muestra 6 —el `#4WB1AH` de la lista de
 * pedidos— así que se aceptan 6 para que alguien pueda tipear el de un
 * comprobante. Con 6 caracteres de letras y números son 2.200 millones de
 * combinaciones, y el endpoint acepta 30 consultas por minuto: adivinarlo a
 * ciegas llevaría siglos.
 */
export const LARGO_MINIMO = 6;

/** Un cuid entero mide 25. Más que eso no es un código, es basura. */
export const LARGO_MAXIMO = 25;

const FORMATO = /^[A-Z0-9]+$/;

/**
 * Normaliza y valida lo que vino por la URL.
 *
 * Devuelve el código en minúsculas —listo para comparar contra el id— o `null`
 * si no sirve. Nunca tira: es un endpoint público y recibir basura es lo normal.
 */
export function normalizarCodigoPedido(crudo: string | null | undefined): string | null {
  if (typeof crudo !== "string") return null;
  const limpio = crudo.trim().toUpperCase();
  if (limpio.length < LARGO_MINIMO || limpio.length > LARGO_MAXIMO) return null;
  if (!FORMATO.test(limpio)) return null;
  return limpio.toLowerCase();
}
