// Reglas de las reseñas que tienen que valer en los dos lados: el formulario que
// ve el comprador y el servidor que guarda.
//
// Vive en su propio archivo y no adentro del route porque un `route.ts` solo
// puede exportar sus handlers (GET, POST, …) y la config que Next reconoce;
// cualquier otro export ahí rompe el build.

/**
 * Tope del comentario de una reseña.
 *
 * El formulario lo usa para frenar mientras se escribe, y el servidor para
 * recortar. Los dos, no uno: el tope del formulario se saltea mandando el POST
 * directo, y sin el del servidor una sola reseña de megas quedaba guardada y
 * publicada — estirando además todas las tarjetas de la portada, que van en una
 * fila que las iguala al alto de la más alta.
 */
export const COMENTARIO_MAX = 500;

/** Tope del nombre de quien reseña. Ya se aplicaba en el servidor. */
export const RESENADOR_MAX = 80;
