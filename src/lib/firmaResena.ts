import { createHmac, timingSafeEqual } from "crypto";

/* ══════════════════════════════════════════════════════════════════════════
   EL SELLO DE "COMPRA VERIFICADA" (05/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Antes alcanzaba con tipear el mail de alguien que compró: el sello salía
   para cualquiera que lo supiera, y la respuesta delataba si ese mail le había
   comprado a la tienda. Ahora el sello lo da una FIRMA que sólo tiene quien
   recibió el mail de "tu pedido fue entregado": el link de ese mail la lleva
   (`?resena=`), la tienda la guarda y el formulario la manda con la reseña.

   La firma ata el pedido y el mail del comprador, con el secreto del servidor.
   No vence: es la prueba de que esa persona compró, y eso no deja de ser cierto.
   Igual el servidor vuelve a mirar en la base que el pedido esté ENTREGADO y
   que tenga el producto reseñado. */

function secreto(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET no configurado");
  return s;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const firma = (datos: string) => createHmac("sha256", secreto()).update(`resena:${datos}`).digest("base64url");

export function crearFirmaResena(orderId: string, email: string): string {
  const datos = `${orderId}|${email.trim().toLowerCase()}`;
  return `${b64(datos)}.${firma(datos)}`;
}

/** El pedido y el mail que firma el token, o `null` si no es válido. */
export function leerFirmaResena(token: unknown): { orderId: string; email: string } | null {
  if (typeof token !== "string" || token.length > 500) return null;
  const [cuerpo, sello] = token.split(".");
  if (!cuerpo || !sello) return null;
  let datos: string;
  try { datos = Buffer.from(cuerpo, "base64url").toString("utf8"); } catch { return null; }
  let esperado: string;
  try { esperado = firma(datos); } catch { return null; }
  const a = Buffer.from(sello), b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [orderId, email] = datos.split("|");
  return orderId && email ? { orderId, email } : null;
}
