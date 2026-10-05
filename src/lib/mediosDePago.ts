/* ══════════════════════════════════════════════════════════════════════════
   QUÉ MEDIOS DE PAGO OFRECE UNA TIENDA (05/10/26)
   ══════════════════════════════════════════════════════════════════════════

   UNA regla para el carrito (qué botones mostrar) y para el checkout del
   servidor (qué aceptar). Antes eran dos cosas distintas y ninguna miraba la
   configuración: "Transferencia" y "Pago al retirar" se ofrecían SIEMPRE,
   aunque la dueña los hubiera apagado en Pagos; el servidor aceptaba cualquiera
   de una lista fija; y "retirar" ni estaba en esa lista, así que se guardaba
   como "transfer" y el mail le mandaba al comprador instrucciones de
   transferencia por un pedido que iba a pagar en efectivo.

   Reglas:
   - Con afiliado: sólo MercadoPago (es de donde se retiene la comisión). Sin
     MercadoPago conectado, ninguno — ver `atribucion-afiliado.check.ts`.
   - MercadoPago: si la tienda lo tiene conectado.
   - Transferencia y efectivo: lo que diga la pantalla de Pagos. Una tienda que
     NUNCA la configuró (sin `paymentInfo`) sigue ofreciendo los dos, como
     siempre: si no, quedaría sin poder vender de un día para el otro. */

export type MedioDePago = "mercadopago" | "transferencia" | "efectivo";

export const ETIQUETA_MEDIO: Record<MedioDePago, string> = {
  mercadopago: "MercadoPago (tarjeta / débito)",
  transferencia: "Transferencia bancaria",
  efectivo: "Efectivo / pago al retirar",
};

type InfoDePago = { transferencia?: { enabled?: unknown } | null; efectivo?: { enabled?: unknown } | null } | null | undefined;

export function mediosHabilitados({ paymentInfo, hasMercadoPago, hasAffiliate = false }: {
  paymentInfo: InfoDePago;
  hasMercadoPago: boolean;
  hasAffiliate?: boolean;
}): MedioDePago[] {
  if (hasAffiliate) return hasMercadoPago ? ["mercadopago"] : [];
  const configurada = !!paymentInfo && (paymentInfo.transferencia != null || paymentInfo.efectivo != null);
  const medios: MedioDePago[] = [];
  if (hasMercadoPago) medios.push("mercadopago");
  if (!configurada || paymentInfo?.transferencia?.enabled) medios.push("transferencia");
  if (!configurada || paymentInfo?.efectivo?.enabled) medios.push("efectivo");
  return medios;
}

/** Lo que manda el navegador → el medio, o `null` si no es ninguno conocido.
 *  Acepta los nombres viejos ("mp", "transfer", "retirar") para que un carrito
 *  abierto antes del cambio no falle. */
export function normalizarMedio(crudo: unknown): MedioDePago | null {
  switch (crudo) {
    case "mercadopago": case "mp": return "mercadopago";
    case "transferencia": case "transfer": return "transferencia";
    case "efectivo": case "retirar": return "efectivo";
    default: return null;
  }
}
