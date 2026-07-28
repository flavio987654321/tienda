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
export const MAX_COUPON_DISCOUNT = 50_000;

export type CouponRule = { discountType: string; discountValue: number };

export function couponDiscountFor(coupon: CouponRule, subtotal: number): number {
  if (!(subtotal > 0) || !(coupon.discountValue > 0)) return 0;
  if (coupon.discountType === "percentage") {
    return Math.min(Math.round((subtotal * coupon.discountValue) / 100), MAX_COUPON_DISCOUNT);
  }
  // El de monto fijo NO lleva el tope de $50.000, solo el del subtotal — es la
  // asimetría que ya existía y se deja tal cual para no cambiar lo que se cobra
  // sin decidirlo aparte. Una tienda de autos puede tener un cupón legítimo de
  // $500.000, así que el tope de $50.000 tampoco es obviamente el correcto para
  // el porcentaje. Queda anotado acá, que es donde se ve.
  return Math.min(coupon.discountValue, subtotal);
}

export function getCouponVisualSeed(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}
