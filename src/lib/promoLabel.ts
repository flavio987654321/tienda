"use client";

export type PromoType = "PERCENT" | "N_PAY_M";

/** Texto que ve el cliente en el modal mientras agrega productos al pendiente */
export function promoModalText(
  type: string | null | undefined,
  min: number,
  discount: number | null | undefined,
  payQty: number | null | undefined,
  pendingTotal: number,
): string {
  const remaining = Math.max(0, min - pendingTotal);
  if (type === "N_PAY_M" && payQty) {
    if (remaining > 0) return `Sumá ${remaining} más: llevá ${min}, pagá ${payQty}`;
    return `¡Llevá ${min} pagá ${payQty}!`;
  }
  if (remaining > 0) return `Sumá ${remaining} más y obtenés ${discount}% off`;
  return `¡${discount}% de descuento aplicado!`;
}

/** Etiqueta del ahorro en CartDrawer / CheckoutModal */
export function promoSavingsLabel(
  type: string | null | undefined,
  min?: number | null,
  payQty?: number | null,
  discount?: number | null,
): string {
  if (type === "N_PAY_M" && min && payQty) return `Llevá ${min} pagá ${payQty}`;
  if (discount) return `Descuento promo (${Math.round(discount)}% off)`;
  return "Descuento promo";
}

/** Etiqueta en el email de confirmación */
export function promoEmailLabel(
  type: string | null | undefined,
  min?: number | null,
  payQty?: number | null,
): string {
  if (type === "N_PAY_M" && min && payQty) return `🎉 Llevá ${min} pagá ${payQty}`;
  return "🎉 Ahorro por promo cantidad";
}

/** % de descuento efectivo para el cálculo (N_PAY_M se convierte a porcentaje) */
export function promoEffectivePct(
  type: string | null | undefined,
  discount: number | null | undefined,
  min: number | null | undefined,
  payQty: number | null | undefined,
): number {
  if (type === "N_PAY_M" && min && payQty && min > 0) {
    return ((min - payQty) / min) * 100;
  }
  return discount ?? 0;
}
