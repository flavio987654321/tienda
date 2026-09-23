/**
 * El orden de los flyers de la home (el carrusel que dibuja `PromotionsCarousel`).
 *
 * ── Por qué esto vive acá y no adentro de la ruta ───────────────────────────
 *
 * Porque es la única parte de mover un flyer que se puede probar sin base. La
 * ruta pide sesión de admin, abre una transacción y escribe; nada de eso entra en
 * un chequeo. Esto es "estado actual + a dónde lo quiero" para adentro y "qué
 * escrituras hacen falta" para afuera — y es justo lo que, si se equivoca, deja
 * el carrusel a medio ordenar.
 *
 * ── La trampa: `sortOrder` es ÚNICO en la base ──────────────────────────────
 *
 * `Promotion` tiene `@@unique([sortOrder])`, así que dos flyers NO pueden estar
 * en el mismo lugar ni por un instante. Un intercambio directo —el #1 pasa a #2 y
 * el #2 pasa a #1— revienta con clave duplicada en la primera escritura, cuando
 * los dos quedan valiendo 2.
 *
 * Por eso un intercambio son TRES pasos y no dos: el que se mueve sale primero a
 * un lugar provisorio que nadie usa, entra el otro en el que quedó libre, y recién
 * ahí el primero aterriza en su destino. Los tres van dentro de la misma
 * transacción: si se corta en el medio, se revierte todo y el carrusel queda como
 * estaba. Media transacción sería peor que no mover nada.
 */

/** Cuántos lugares tiene el carrusel. Es el mismo número que dibuja el panel. */
export const LUGARES = 3;

/**
 * El lugar de paso del intercambio.
 *
 * Negativo a propósito: los lugares de verdad son 0, 1 y 2, así que acá no puede
 * haber nadie y el único que lo pisa es el flyer que está en viaje. Y nunca queda
 * colgado, porque los tres pasos van en una transacción: si el tercero no llega,
 * el primero tampoco quedó escrito.
 */
export const LUGAR_PROVISORIO = -1;

export type PromoOrdenable = { id: string; sortOrder: number };

/** Una escritura: a este flyer, ponelo en este lugar. */
export type PasoDeOrden = { id: string; sortOrder: number };

/**
 * Qué escrituras hacen falta para llevar un flyer a un lugar.
 *
 * Devuelve la lista EN ORDEN: se aplican una atrás de la otra, dentro de una
 * transacción. Lista vacía significa "no hay nada que hacer" —ya está ahí, el
 * flyer no existe, o el lugar no es un lugar— y la ruta no abre transacción.
 */
export function pasosParaMover(
  promos: PromoOrdenable[],
  id: string,
  destino: number,
): PasoDeOrden[] {
  if (!Number.isInteger(destino) || destino < 0 || destino >= LUGARES) return [];

  const queSeMueve = promos.find((p) => p.id === id);
  if (!queSeMueve) return [];
  if (queSeMueve.sortOrder === destino) return [];

  /* Quién está parado en el destino. Puede no haber nadie: un lugar vacío del
     carrusel es un lugar sin fila en la tabla, no una fila con la imagen en
     blanco. Ahí no hay intercambio, hay una sola escritura. */
  const ocupante = promos.find((p) => p.sortOrder === destino && p.id !== id);
  if (!ocupante) return [{ id, sortOrder: destino }];

  return [
    { id, sortOrder: LUGAR_PROVISORIO },
    { id: ocupante.id, sortOrder: queSeMueve.sortOrder },
    { id, sortOrder: destino },
  ];
}
