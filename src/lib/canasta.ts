// Reglas de la Canasta Solidaria. Sin dependencias de servidor a propósito: las
// mismas constantes las usan las APIs que cobran y los formularios que se ven en
// el navegador, y con el SDK de MercadoPago acá adentro las pantallas no podían
// importarlas — terminaban con el mínimo y el tope copiados a mano, libres de
// desincronizarse del que después hace cumplir.
//
// Lo que sí necesita MercadoPago vive en lib/canasta-checkout.

// La meta de una campaña nunca es un valor fijo guardado: siempre se
// recalcula a partir de los precios actuales de los productos + el % de
// reserva. Centralizado acá para que el tope de donación, el progreso
// público y el clonado de campaña usen siempre el mismo número.
export function calculateGoalAmount(products: { targetPrice: number }[], reservePct: number) {
  const productsTotal = products.reduce((sum, p) => sum + p.targetPrice, 0);
  return Math.round(productsTotal / (1 - reservePct / 100));
}

export const MIN_DONATION = 1000;
// Tope por persona para que la campaña sea un aporte colectivo y no la
// financie una sola persona.
export const MAX_DONATION_PCT_OF_GOAL = 0.2;

/**
 * Cuánto puede donar una persona a esta campaña, hoy.
 *
 * Junta las dos reglas que antes cada pantalla combinaba por su cuenta: el tope
 * por persona (% de la meta) y lo que falta para llegar a la meta, que manda
 * cuando es menor. Devuelve `null` cuando no hay meta —una Causa Libre sin
 * techo—, donde no hay tope que calcular.
 */
export function maxDonationFor(goalAmount: number | null, totalRaised: number): number | null {
  if (!goalAmount || goalAmount <= 0) return null;
  const porPersona = Math.floor(goalAmount * MAX_DONATION_PCT_OF_GOAL);
  const loQueFalta = Math.max(0, goalAmount - totalRaised);
  return Math.min(porPersona, loQueFalta);
}

/**
 * Cuánto está financiado cada producto de la canasta, en orden, como si la plata
 * fuera cayendo y completara un alimento a la vez.
 *
 * Solo la parte que NO es reserva compra alimentos: la meta ya incluye el % de
 * envío y gastos. Llenando con el total crudo, la canasta se veía completa al
 * llegar a la suma de los productos —el 90% de la meta con 10% de reserva—
 * mientras la barra marcaba 90% y la página seguía pidiendo plata.
 *
 * Vive acá y no suelto dentro de la ruta para poder verificarlo: es la cuenta que
 * decide lo que el donante ve, y equivocarla desalienta justo en el tramo final.
 */
export function fundedProducts<T extends { targetPrice: number }>(
  products: T[],
  totalRaised: number,
  reservePct: number
): (T & { fundedPct: number })[] {
  let remaining = totalRaised * (1 - reservePct / 100);
  return products.map((p) => {
    let fundedPct = 0;
    if (p.targetPrice > 0 && remaining >= p.targetPrice) {
      fundedPct = 100;
      remaining -= p.targetPrice;
    } else if (p.targetPrice > 0 && remaining > 0) {
      fundedPct = Math.round((remaining / p.targetPrice) * 100);
      remaining = 0;
    }
    return { ...p, fundedPct };
  });
}
