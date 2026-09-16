import { createHmac, timingSafeEqual } from "node:crypto";
import { HORAS_MAXIMAS } from "@/lib/oferta-salida";

/**
 * El plazo de la oferta de salida, firmado. Sólo servidor: usa `crypto`.
 * Lo puro (las reglas, el texto del plazo, la cuenta regresiva) está en
 * `oferta-salida`.
 *
 * El token lleva la hora en que VENCE, no la de vista. Así el checkout firma
 * "ahora + 15 minutos" y el mail de carrito "ahora + 24 horas" con el mismo
 * token, y quien lo revisa no tiene que saber qué plazo tenía la oferta
 * cuando se mostró: mira la hora, y listo. Si la dueña acorta el plazo
 * después, lo que ya se prometió se cumple igual.
 */

function firma(productId: string, ts: number): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error("NEXTAUTH_SECRET no configurada");
  return createHmac("sha256", secreto).update(`oferta-salida:${productId}:${ts}`).digest("base64url").slice(0, 24);
}

/** `<milisegundos>.<firma>`: hasta cuándo vale, y la prueba de que lo dijimos nosotros. */
export function firmarOferta(productId: string, venceEn: number): string {
  const ts = Math.floor(venceEn);
  return `${ts}.${firma(productId, ts)}`;
}

/**
 * Hasta cuándo vale un token para ESTE producto. Null si está tocado, es de
 * otro producto, ya venció, o promete más que el plazo más largo que existe
 * (una firma nuestra nunca dice eso; si aparece, algo anda mal y no se
 * cobra con ella).
 */
export function leerTokenDeOferta(token: unknown, productId: string, ahora = Date.now()): { venceEn: Date } | null {
  if (typeof token !== "string" || token.length > 80) return null;
  const [tsCrudo, f] = token.split(".");
  if (!/^\d{10,16}$/.test(tsCrudo ?? "") || !/^[A-Za-z0-9_-]{24}$/.test(f ?? "")) return null;
  const venceEn = Number(tsCrudo);
  const a = Buffer.from(f), b = Buffer.from(firma(productId, venceEn));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (venceEn < ahora || venceEn > ahora + HORAS_MAXIMAS * 3_600_000 + 5 * 60_000) return null;
  return { venceEn: new Date(venceEn) };
}
