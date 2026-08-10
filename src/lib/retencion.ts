/**
 * Cuánto tiempo se guarda cada cosa, y cómo se lo dice.
 *
 * Vive en un archivo propio porque lo usan tres lugares que no se hablan entre
 * sí: el cron que borra, la pantalla de Métricas y el pie del PDF. Con el número
 * escrito a mano en cada uno, alcanza con que alguien ajuste el cron para que la
 * pantalla siga prometiendo otra cosa — y esa mentira no la ve nadie hasta que
 * alguien busca un dato que ya no está.
 *
 * ── Las ventas no se borran nunca ────────────────────────────────────────────
 * `Order`, `OrderItem` y `Coupon` no los toca ninguna limpieza. Son plata que se
 * cobró: el historial tiene que poder mirarse siempre, y además hace de respaldo
 * contable ante un reclamo.
 *
 * ── Las visitas, dos años ────────────────────────────────────────────────────
 * `StoreView`, `StoreViewSource` y `StoreFunnelStep` son una fila por tienda por
 * día, así que crecen para siempre aunque cada fila sea diminuta.
 *
 * Dos años y no uno, que era lo que decía el cron antes. Con uno solo, comparar
 * contra el año pasado tenía ingresos de los dos lados —los pedidos no se
 * borran— pero visitas de uno solo: la mitad de la comparación quedaba en cero
 * sin ninguna explicación a la vista. Justo la función que se acababa de hacer
 * salía coja.
 *
 * Dos años cubren cualquier comparación anual con margen, y el tope de la
 * pantalla son tres.
 */

/** Días que se conservan las visitas, su origen y los pasos del embudo. */
export const DIAS_RETENCION_VISITAS = 730;

/** Lo que hay que decirle a la dueña, en una línea. */
export const AVISO_RETENCION =
  "Las ventas se guardan siempre. Las visitas y de dónde vino la gente, 2 años.";

/**
 * `true` si el período pedido arranca antes de donde llegan las visitas.
 *
 * No es lo mismo que "no hay visitas": una tienda nueva tampoco tiene, y ahí no
 * hay nada que aclarar. Esto es para el caso en que las hubo y ya se borraron,
 * que es el único donde el número de la pantalla engaña — se ven los ingresos de
 * ese tramo y las visitas en cero, así que la conversión da cualquier cosa.
 */
export function periodoExcedeRetencion(desde: string, hoy: string): boolean {
  // El `- 1` del mes no es un detalle: `Date.UTC` cuenta los meses desde 0, así
  // que pasarle el 8 de "2026-08-10" da SEPTIEMBRE. El corte se iba un mes para
  // adelante y el aviso salía en períodos que estaban perfectamente guardados.
  // Lo agarró el chequeo del borde exacto.
  const [y, m, d] = hoy.split("-").map(Number);
  const corte = new Date(Date.UTC(y, m - 1, d - DIAS_RETENCION_VISITAS));
  return desde < corte.toISOString().slice(0, 10);
}
