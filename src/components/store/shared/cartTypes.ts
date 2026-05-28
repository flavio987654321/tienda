import type { StorefrontProduct } from "@/hooks/useStorefront";

export type CartItem = {
  product: StorefrontProduct;
  size: string;
  color: string;
  variantId: string | null;
  qty: number;
};

export type ContactStatus = "idle" | "sending" | "sent";
export type CheckoutStatus = "idle" | "placing" | "done";

export const ENVIO_OPTIONS = [
  { id: "retiro",   label: "Retiro en local / acordar", price: 0 },
  { id: "estandar", label: "Envío estándar",             price: 3500 },
  { id: "nacional", label: "Envío nacional",             price: 6500 },
];

export const PAGO_OPTIONS = [
  { id: "transferencia", label: "Transferencia bancaria" },
  { id: "retirar",       label: "Pago al retirar / acordar" },
];

export const fmt = (n: number) => "$" + n.toLocaleString("es-AR");
