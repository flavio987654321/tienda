import { MIN_PRICE_RATIO } from "./pricing";

export function normalizeCouponCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("es-AR");
}

export function isValidCouponCode(value: string) {
  return /^[\p{L}\p{N}\s_\-+.!%&/]+$/u.test(value);
}

// ── Cuánto descuenta un cupón ────────────────────────────────────────────────
// Una sola fórmula para las tres puntas: el endpoint que valida, el checkout que
// cobra y el carrito que muestra el total.
//
// Estaba escrita dos veces y NO coincidían: `/api/cupones/validar` calculaba el
// porcentaje sin tope y el checkout lo topeaba en $50.000. Con un cupón del 20% y
// un carrito de $300.000, la pantalla decía −$60.000 y el servidor cobraba
// −$50.000: el comprador aprobaba un total y se le creaba el pedido con otro,
// $10.000 más caro, sin ningún aviso.
// El techo del descuento es RELATIVO al carrito, no un monto fijo.
//
// Antes era $50.000 escrito a mano, y un número absoluto no puede servir en una
// plataforma donde un carrito es un llavero de $4.000 o un auto de $28.000.000.
// Estaba mal en las dos direcciones a la vez: ahogaba a la tienda de autos (un 10%
// sobre $28.000.000 daba $50.000) y no protegía a la de ropa (el cupón de monto
// fijo ni siquiera lo miraba, así que un cero de más vaciaba el pedido).
//
// El único trabajo que le queda a este techo es que no salga un pedido de $0, que
// además es impagable por MercadoPago. Y para eso ya hay un número en el sistema:
// MIN_PRICE_RATIO, el piso que el motor le pone a las promociones para que ningún
// producto quede regalado. Es el mismo criterio, así que es el mismo número.
//
// Lo que evita el error de dedo es la validación al CREAR el cupón
// (`couponValueError`), que es donde la dueña todavía puede corregirlo.
export const MAX_COUPON_RATIO = 1 - MIN_PRICE_RATIO; // 0.90

export type CouponRule = { discountType: string; discountValue: number };

export function couponDiscountFor(coupon: CouponRule, subtotal: number): number {
  if (!(subtotal > 0) || !(coupon.discountValue > 0)) return 0;
  const bruto = coupon.discountType === "percentage"
    ? Math.round((subtotal * coupon.discountValue) / 100)
    : coupon.discountValue;
  // Mismo techo para los dos tipos: la asimetría anterior (el % topeado, el fijo
  // no) no respondía a ninguna razón.
  return Math.min(bruto, Math.floor(subtotal * MAX_COUPON_RATIO));
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/**
 * ¿El valor de este cupón tiene sentido? Se pregunta al CREARLO.
 *
 * Un cupón mal tipeado —un cero de más— no lo puede atajar el checkout: ahí ya es
 * tarde y lo único que se puede hacer es recortarlo en silencio. Acá, en cambio,
 * la dueña ve el error y lo arregla.
 *
 * Para el monto fijo no hay un número universal que sirva, así que se compara
 * contra los datos de SU tienda:
 *   · Si el cupón exige compra mínima, el descuento tiene que ser menor que esa
 *     mínima. "$100.000 en compras desde $500.000" es coherente; "$1.000.000 desde
 *     $500.000" es un error de tipeo.
 *   · Sin compra mínima, se compara contra el producto más caro que vende. Un cupón
 *     que vale más que cualquier cosa del catálogo no es una promoción, es un cero
 *     de más.
 */
export function couponValueError(
  coupon: { discountType: string; discountValue: number; minOrderAmount: number },
  precioMaxDeLaTienda: number | null,
): string | null {
  if (!(coupon.discountValue > 0)) return "El valor del descuento debe ser mayor a 0.";
  if (coupon.discountType === "percentage") {
    return coupon.discountValue > 100 ? "El porcentaje no puede superar 100%." : null;
  }
  if (coupon.minOrderAmount > 0) {
    return coupon.discountValue >= coupon.minOrderAmount
      ? `Un descuento de ${pesos(coupon.discountValue)} sobre una compra mínima de ${pesos(coupon.minOrderAmount)} deja el pedido en nada. Tiene que ser menor que la compra mínima.`
      : null;
  }
  if (precioMaxDeLaTienda != null && precioMaxDeLaTienda > 0 && coupon.discountValue > precioMaxDeLaTienda) {
    return `El descuento (${pesos(coupon.discountValue)}) es mayor que tu producto más caro (${pesos(precioMaxDeLaTienda)}). Si es a propósito, ponele una compra mínima; si no, revisá el monto.`;
  }
  return null;
}

export function getCouponVisualSeed(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}
