// Topes de los formularios públicos de una tienda: contacto y suscripción.
//
// Valen en los DOS lados —el formulario que ve el comprador y el servidor que
// recibe— y por la misma razón que los de las reseñas: el tope del formulario se
// saltea mandando el POST directo con cualquier herramienta, así que sin el del
// servidor no hay tope real.
//
// Vive en su propio archivo y no adentro del route porque un `route.ts` sólo
// puede exportar sus handlers y la config que Next reconoce; cualquier otro
// export ahí rompe el build. Mismo motivo que `reviews.ts`.
//
// ── Por qué hacía falta ──────────────────────────────────────────────────────
// El formulario de contacto de la tienda validaba el MÍNIMO ("el mensaje es muy
// corto") y no tenía ningún máximo, ni en el navegador ni en el servidor. Ese
// mensaje se manda por mail al comerciante tal cual llega. O sea que alguien
// podía mandarle mensajes de megas, cinco por minuto (lo que deja pasar el
// límite por IP), y llenarle la casilla. No hace falta un bot: alcanza con pegar
// un archivo entero en el campo.

/** Nombre de quien escribe. Igual que el de las reseñas, por lo mismo. */
export const NOMBRE_MAX = 80;

/** Largo máximo de un mail. Es el del estándar, no un gusto. */
export const EMAIL_MAX = 254;

/** Asunto, donde el formulario lo ofrece. */
export const ASUNTO_MAX = 120;

/**
 * El mensaje.
 *
 * Más que el de una reseña (500) porque acá la persona está explicando algo:
 * un talle, un problema con un pedido, un pedido especial. Con 500 se queda
 * corta y termina mandando tres mensajes.
 *
 * 2000 son unas 350 palabras — de sobra para cualquier consulta real, y lejos de
 * lo que sirve para llenarle la casilla a nadie.
 */
export const MENSAJE_MAX = 2000;

/**
 * Recorta en vez de rechazar.
 *
 * Si alguien manda de más, se guarda lo que entra y se sigue. Rechazar el
 * mensaje entero castiga a la persona que escribió mucho —que casi siempre es
 * una clienta con un problema largo de explicar— por algo que el formulario ya
 * le había frenado. Al que manda basura el recorte igual lo frena.
 */
export function recortar(valor: unknown, tope: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, tope) : "";
}
