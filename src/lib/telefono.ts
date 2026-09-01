/**
 * Qué teléfono se acepta. Una sola definición, para todos los lugares.
 *
 * Existe por el mismo motivo que `password-policy`: la regla estaba escrita en el
 * registro —entre 8 y 15 dígitos, máximo 30 caracteres— y la ruta que EDITA el
 * teléfono después (`/api/perfil`) no la tenía. O sea que el número que no se
 * podía cargar al crear la cuenta se podía guardar igual entrando por la otra
 * puerta, y quedaba en la base sin que nada lo frenara.
 *
 * Los dos números:
 *
 *   - **8 a 15 dígitos** es el rango de la norma E.164, que es lo que existe en
 *     el mundo. Abajo de 8 no hay ningún número real; arriba de 15 tampoco.
 *   - **30 caracteres** de largo total, porque entre los dígitos entran espacios,
 *     guiones, paréntesis y el `+`. Es generoso a propósito: `+54 9 11 5555-5555`
 *     son 19.
 *
 * Se cuentan los dígitos y no los caracteres a propósito: cada persona escribe su
 * número como quiere y ninguna de esas formas está mal.
 */

export const LARGO_MAXIMO = 30;
export const DIGITOS_MINIMOS = 8;
export const DIGITOS_MAXIMOS = 15;

/**
 * `null` si está bien; el problema en castellano si no.
 *
 * El vacío se considera válido: el teléfono es opcional en todas partes, y
 * "borré mi número" es una respuesta legítima. Quien lo necesite obligatorio lo
 * exige antes de llamar acá.
 */
export function validarTelefono(valor: string): string | null {
  const limpio = valor.trim();
  if (limpio.length === 0) return null;

  if (limpio.length > LARGO_MAXIMO) {
    return `El teléfono no puede tener más de ${LARGO_MAXIMO} caracteres`;
  }

  /* Sólo lo que puede aparecer de verdad en un número escrito a mano. Sin esto
     entraba cualquier texto con ocho dígitos adentro —"llamame al 1155556666 y
     preguntá por Juan"— y quedaba guardado como si fuera un teléfono. */
  if (!/^[0-9+()\-.\s]+$/.test(limpio)) {
    return "El teléfono sólo puede tener números, espacios, guiones, paréntesis y +";
  }

  const digitos = limpio.replace(/\D/g, "");
  if (digitos.length < DIGITOS_MINIMOS || digitos.length > DIGITOS_MAXIMOS) {
    return `El teléfono debe tener entre ${DIGITOS_MINIMOS} y ${DIGITOS_MAXIMOS} dígitos`;
  }

  return null;
}
