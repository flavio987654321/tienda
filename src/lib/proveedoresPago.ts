/* Cómo quedó guardado el medio de pago de un pedido (`Payment.provider`).

   El nombre NO es uno solo, y eso ya hizo dos errores (05/10/26):
   - MercadoPago: el checkout de tiendas guarda "mp" (lo normaliza así para el
     mail); pedidos viejos y los digitales dicen "mercadopago". El chequeo de
     salud del cron buscaba sólo "mercadopago" y nunca veía un pago de tienda.
   - Manuales: "transferencia" y "efectivo", pero un medio que no está en la
     lista blanca del checkout se guarda como "transfer".
   Quien filtre pedidos por medio de pago usa ESTAS listas, no un string suelto. */

export const PROVEEDORES_MP = ["mp", "mercadopago"] as const;
export const PROVEEDORES_MANUALES = ["transferencia", "transfer", "efectivo"] as const;

export const esMercadoPago = (p: string | null | undefined) => !!p && (PROVEEDORES_MP as readonly string[]).includes(p);
