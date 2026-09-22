import { createHmac, timingSafeEqual } from "node:crypto";
import { HORAS_MAXIMAS } from "@/lib/oferta-salida";
import { MINUTOS_MAXIMOS } from "@/lib/bienvenida";
import { MINUTOS_MAXIMOS_UPSELL } from "@/lib/oferta-upsell";

/**
 * Los plazos firmados: el de la oferta de salida, el del precio de
 * bienvenida y el de la oferta del upsell. Sólo servidor: usa `crypto`. Lo
 * puro (las reglas, el texto del plazo, la cuenta regresiva) está en
 * `oferta-salida`, `bienvenida` y `oferta-upsell`.
 *
 * El token lleva la hora en que VENCE, no la de vista. Así el checkout firma
 * "ahora + 15 minutos" y el mail de carrito "ahora + 24 horas" con el mismo
 * token, y quien lo revisa no tiene que saber qué plazo tenía la oferta
 * cuando se mostró: mira la hora, y listo. Si la dueña acorta el plazo
 * después, lo que ya se prometió se cumple igual.
 *
 * ── Tres ofertas, tres firmas ───────────────────────────────────────────────
 *
 * Cada una firma con su propio nombre adentro (`oferta-salida:`,
 * `bienvenida:` y `upsell:`), y por eso un token de una NO vale para otra:
 * la de salida puede prometer hasta 48 horas, la de bienvenida hasta una y
 * la del upsell media; si compartieran firma, un token de salida de dos días
 * le daría a alguien dos días de precio de bienvenida —o de oferta del
 * upsell—. Con el nombre adentro del HMAC, no hay forma de cruzarlos.
 */

type Clase = "oferta-salida" | "bienvenida" | "upsell";

/**
 * Si hay con qué firmar. Las páginas que ofrecen un plazo lo preguntan
 * ANTES de firmar: una clave que falta se loguea y la oferta no sale, en
 * vez de tirar abajo la página donde entra la plata. Pasó en desarrollo el
 * 21/09/26 —`.env.local` sin la clave— y la página de venta contestaba 500.
 */
export function hayClaveDeFirma(donde: string): boolean {
  if (process.env.NEXTAUTH_SECRET) return true;
  console.error(`[firma] NEXTAUTH_SECRET no configurada: ${donde} sale sin oferta`);
  return false;
}

function firma(clase: Clase, productId: string, ts: number): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error("NEXTAUTH_SECRET no configurada");
  return createHmac("sha256", secreto).update(`${clase}:${productId}:${ts}`).digest("base64url").slice(0, 24);
}

function firmar(clase: Clase, productId: string, venceEn: number): string {
  const ts = Math.floor(venceEn);
  return `${ts}.${firma(clase, productId, ts)}`;
}

/**
 * Si el token es nuestro, de esta clase y de este producto: la hora en que
 * vence. Null si está tocado, es de otro producto o de la otra oferta, o
 * promete más que el plazo más largo que existe (una firma nuestra nunca
 * dice eso; si aparece, algo anda mal y no se cobra con ella).
 *
 * ⚠️ NO mira si ya venció: eso lo decide cada lector, porque un token
 * vencido significa cosas distintas según quién pregunta. Al cobrar es "no
 * aplica"; al dibujar la página es "esta persona ya tuvo su plazo, mostrale
 * el precio normal" —que es distinto de "no tiene token, dale uno nuevo"—.
 */
function leerFirma(clase: Clase, token: unknown, productId: string, ahora: number, maximoMs: number): number | null {
  if (typeof token !== "string" || token.length > 80) return null;
  const [tsCrudo, f] = token.split(".");
  if (!/^\d{10,16}$/.test(tsCrudo ?? "") || !/^[A-Za-z0-9_-]{24}$/.test(f ?? "")) return null;
  const venceEn = Number(tsCrudo);
  const a = Buffer.from(f), b = Buffer.from(firma(clase, productId, venceEn));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (venceEn > ahora + maximoMs + 5 * 60_000) return null;
  return venceEn;
}

/* ── La oferta de salida ────────────────────────────────────────────────── */

/** `<milisegundos>.<firma>`: hasta cuándo vale, y la prueba de que lo dijimos nosotros. */
export function firmarOferta(productId: string, venceEn: number): string {
  return firmar("oferta-salida", productId, venceEn);
}

/**
 * Hasta cuándo vale un token de la oferta de salida para ESTE producto.
 * Null si está tocado, es de otro producto, ya venció, o promete más de
 * 48 horas.
 */
export function leerTokenDeOferta(token: unknown, productId: string, ahora = Date.now()): { venceEn: Date } | null {
  const venceEn = leerFirma("oferta-salida", token, productId, ahora, HORAS_MAXIMAS * 3_600_000);
  if (venceEn === null || venceEn < ahora) return null;
  return { venceEn: new Date(venceEn) };
}

/* ── El precio de bienvenida ────────────────────────────────────────────── */

export function firmarBienvenida(productId: string, venceEn: number): string {
  return firmar("bienvenida", productId, venceEn);
}

/**
 * Un token del precio de bienvenida de ESTE producto, leído. Null si está
 * tocado, es de otro producto, es de la oferta de salida, o promete más de
 * una hora. Si es nuestro, dice hasta cuándo vale y si sigue vivo: la
 * página necesita las dos cosas (ver `leerFirma`).
 */
export function leerTokenDeBienvenida(token: unknown, productId: string, ahora = Date.now()): { venceEn: number; vivo: boolean } | null {
  const venceEn = leerFirma("bienvenida", token, productId, ahora, MINUTOS_MAXIMOS * 60_000);
  if (venceEn === null) return null;
  return { venceEn, vivo: venceEn > ahora };
}

/* ── La oferta del upsell ───────────────────────────────────────────────── */

export function firmarUpsell(productId: string, venceEn: number): string {
  return firmar("upsell", productId, venceEn);
}

/**
 * Un token de la oferta del upsell de ESTE producto, leído. Null si está
 * tocado, es de otro producto, es de alguna de las otras dos ofertas, o
 * promete más de media hora. Si es nuestro, dice hasta cuándo vale y si
 * sigue vivo: la pantalla necesita las dos cosas, igual que en bienvenida
 * —"vencido" es distinto de "no tiene"— (ver `leerFirma`).
 */
export function leerTokenDeUpsell(token: unknown, productId: string, ahora = Date.now()): { venceEn: number; vivo: boolean } | null {
  const venceEn = leerFirma("upsell", token, productId, ahora, MINUTOS_MAXIMOS_UPSELL * 60_000);
  if (venceEn === null) return null;
  return { venceEn, vivo: venceEn > ahora };
}
