/**
 * Qué estados de pedido cuentan como "una venta de verdad".
 *
 * La lista estaba copiada y pegada en una docena de archivos. Eso funciona hasta
 * que dos de esas copias dejan de coincidir, y ahí no falla nada: simplemente
 * dos pantallas muestran plata distinta para el mismo período y no hay forma de
 * saber cuál miente. Ya pasó entre Métricas y Sasha.
 *
 * PENDING queda afuera a propósito: es un pedido que la persona armó pero
 * todavía no pagó ni confirmó nadie. Contarlo como ingreso es contar plata que
 * puede no llegar nunca.
 */
export const ESTADOS_VENTA_CONFIRMADA = ["CONFIRMED", "SHIPPED", "DELIVERED"] as const;

/** La misma lista como `string[]`, que es lo que esperan los filtros de Prisma. */
export const ESTADOS_VENTA_CONFIRMADA_LISTA: string[] = [...ESTADOS_VENTA_CONFIRMADA];

export function esVentaConfirmada(status: string): boolean {
  return (ESTADOS_VENTA_CONFIRMADA as readonly string[]).includes(status);
}
