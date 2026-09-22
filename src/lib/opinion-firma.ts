import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * El link para opinar, firmado con la compra. Sólo servidor: usa `crypto`.
 * Lo puro está en `opiniones-digitales`.
 *
 * `<orderId>.<firma>`: la orden dice quién compró qué; la firma prueba que
 * el link lo armamos nosotros. Sin esto, con saber el id de una orden ajena
 * (viaja en la pantalla de gracias) cualquiera opinaría por otro. La ruta
 * además verifica que la orden esté COBRADA y sea de ese producto.
 *
 * No vence: la opinión de alguien que compró hace un año vale igual, y una
 * por compra es el tope que importa (`orderId` único).
 */

const ID_RE = /^c[a-z0-9]{20,30}$/;

function firma(orderId: string): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error("NEXTAUTH_SECRET no configurada");
  return createHmac("sha256", secreto).update(`opinion:${orderId}`).digest("base64url").slice(0, 32);
}

export function tokenParaOpinar(orderId: string): string {
  return `${orderId}.${firma(orderId)}`;
}

/** La orden de un token, o null si está tocado o no es nuestro. */
export function leerTokenDeOpinion(token: unknown): { orderId: string } | null {
  if (typeof token !== "string" || token.length > 80) return null;
  const [orderId, f] = token.split(".");
  if (!ID_RE.test(orderId ?? "") || !/^[A-Za-z0-9_-]{32}$/.test(f ?? "")) return null;
  const a = Buffer.from(f), b = Buffer.from(firma(orderId));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { orderId };
}
