import type { StorefrontProduct, SeleccionOpciones } from "@/hooks/useStorefront";
import type { ShippingMethod } from "@/types/store-config";
import { DEFAULT_SHIPPING_METHODS } from "@/types/store-config";

export type CartItem = {
  product: StorefrontProduct;
  /**
   * Lo que eligió el comprador, por nombre de opción: `{ Talle: "M", Color: "Negro" }`.
   *
   * Antes eran dos campos sueltos, `size` y `color`, que sólo podían representar
   * exactamente dos opciones y siempre con esos nombres.
   *
   * Nunca viajó al backend y sigue sin viajar: el pedido se arma sólo con
   * `variantId` (ver `PlaceOrderParams`). Esto es para mostrar en el carrito y
   * para volver a encontrar la variante.
   */
  seleccion: SeleccionOpciones;
  variantId: string | null;
  qty: number;
};

/** Los valores elegidos, en una línea: "Negro · M". Para mostrar, no para comparar. */
export function textoSeleccion(seleccion: SeleccionOpciones): string {
  return Object.values(seleccion).filter(Boolean).join(" · ");
}

/** Clave estable de una línea del carrito: mismo producto y misma combinación. */
export function claveItem(productId: string, seleccion: SeleccionOpciones): string {
  return productId + "|" + Object.entries(seleccion)
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([n, v]) => `${n}=${v}`)
    .join("|");
}

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

/**
 * Formateador de precios de la tienda, armado con su moneda.
 *
 * Antes esto era una constante con el "$" escrito a mano, y era el camino por el
 * que pasan los precios de los templates que no traen el suyo (Aurora, Chic
 * Paris, Urban Pulse, Boho Terra y Fashion Noir). En esos cinco, elegir USD en
 * el panel no cambiaba nada: se guardaba la preferencia y los precios seguían
 * saliendo en pesos.
 *
 * El separador de miles sigue siendo el argentino en los dos casos: es el
 * formato que lee quien compra acá, que es todo el público de la plataforma.
 */
export function crearFmt(currency?: string | null) {
  const simbolo = currency === "USD" ? "USD " : "$";
  return (n: number) => simbolo + n.toLocaleString("es-AR");
}

/** Formateador en pesos, para lo que formatea sin saber de qué tienda es. */
export const fmt = crearFmt("ARS");
