import type { StorefrontProduct } from "@/hooks/useStorefront";
import type { ShippingMethod } from "@/types/store-config";
import { DEFAULT_SHIPPING_METHODS } from "@/types/store-config";

export type CartItem = {
  product: StorefrontProduct;
  size: string;
  color: string;
  variantId: string | null;
  qty: number;
  discountPct?: number;
};

export type ContactStatus = "idle" | "sending" | "sent";
export type CheckoutStatus = "idle" | "placing" | "done";

export type { ShippingMethod };

export function getEnvioOptions(methods?: ShippingMethod[] | null): ShippingMethod[] {
  const src = methods?.length ? methods : DEFAULT_SHIPPING_METHODS;
  return src.filter(m => m.enabled);
}

export function fmtEnvioPrice(opt: ShippingMethod, fmt: (n: number) => string): string {
  if (opt.isPickup) return "Gratis";
  if (opt.coordinar) return "A coordinar";
  if (opt.price === 0) return "Gratis";
  return fmt(opt.price);
}

export const ENVIO_OPTIONS = DEFAULT_SHIPPING_METHODS;

export const BASE_PAGO_OPTIONS = [
  { id: "transferencia", label: "Transferencia bancaria" },
  { id: "retirar",       label: "Pago al retirar / acordar" },
];

export const MP_PAGO_OPTION = { id: "mercadopago", label: "MercadoPago (tarjeta / débito)" };

export function getPagoOptions(hasMercadoPago: boolean, hasAffiliate = false) {
  if (hasAffiliate) return hasMercadoPago ? [MP_PAGO_OPTION] : [];
  return hasMercadoPago ? [MP_PAGO_OPTION, ...BASE_PAGO_OPTIONS] : BASE_PAGO_OPTIONS;
}

export const PAGO_OPTIONS = BASE_PAGO_OPTIONS;

export const fmt = (n: number) => "$" + n.toLocaleString("es-AR");
