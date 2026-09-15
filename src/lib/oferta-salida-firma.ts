import { createHmac, timingSafeEqual } from "node:crypto";
import type { HorasDeOferta } from "@/lib/oferta-salida";

/**
 * El plazo de la oferta de salida, firmado. Sólo servidor: usa `crypto`.
 * Lo puro (las reglas, el texto del plazo) está en `oferta-salida`.
 */

function firma(productId: string, ts: number): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error("NEXTAUTH_SECRET no configurada");
  return createHmac("sha256", secreto).update(`oferta-salida:${productId}:${ts}`).digest("base64url").slice(0, 24);
}

/** `<milisegundos>.<firma>`: cuándo se mostró la oferta, y la prueba de que lo dijimos nosotros. */
export function firmarOferta(productId: string, vistaEn: number): string {
  const ts = Math.floor(vistaEn);
  return `${ts}.${firma(productId, ts)}`;
}

/**
 * Lo que dice un token para ESTE producto: cuándo se vio y hasta cuándo
 * vale. Null si está tocado, es de otro producto, o ya venció. La hora de
 * "vista" no puede ser futura: un token con la hora adelantada alargaría el
 * plazo.
 */
export function leerTokenDeOferta(token: unknown, productId: string, horas: HorasDeOferta, ahora = Date.now()): { vistaEn: Date; venceEn: Date } | null {
  if (typeof token !== "string" || token.length > 80) return null;
  const [tsCrudo, f] = token.split(".");
  if (!/^\d{10,16}$/.test(tsCrudo ?? "") || !/^[A-Za-z0-9_-]{24}$/.test(f ?? "")) return null;
  const ts = Number(tsCrudo);
  const a = Buffer.from(f), b = Buffer.from(firma(productId, ts));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const venceEn = ts + horas * 60 * 60_000;
  if (ts > ahora + 5 * 60_000 || venceEn < ahora) return null;
  return { vistaEn: new Date(ts), venceEn: new Date(venceEn) };
}
