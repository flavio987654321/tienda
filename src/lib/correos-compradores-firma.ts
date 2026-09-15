import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * El token de baja del mail a compradores. Sólo servidor: usa `crypto`.
 * Lo puro está en `correos-compradores`.
 */

/* Un cuid, que es lo que la base pone de id. Un id con puntos rompería el
   token, que los usa de separador. */
const ID_RE = /^c[a-z0-9]{20,30}$/;

/**
 * `<storeId>.<correo en base64url>.<firma>`. Firmado con la clave del
 * servidor, así no hace falta una fila por destinatario: el token dice de
 * qué cuenta y qué correo, y la firma prueba que lo armamos nosotros. Sin
 * firma, cualquiera daría de baja a cualquiera con sólo saber su correo.
 */
function firma(storeId: string, email: string): string {
  const secreto = process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error("NEXTAUTH_SECRET no configurada");
  return createHmac("sha256", secreto).update(`baja-correo:${storeId}:${email}`).digest("base64url").slice(0, 32);
}

export function tokenDeBaja(storeId: string, email: string): string {
  const e = email.trim().toLowerCase();
  return `${storeId}.${Buffer.from(e, "utf8").toString("base64url")}.${firma(storeId, e)}`;
}

/** Lo que dice un token, o null si está tocado o no es nuestro. */
export function leerTokenDeBaja(token: unknown): { storeId: string; email: string } | null {
  if (typeof token !== "string" || token.length > 400) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [storeId, emailB64, f] = partes;
  if (!ID_RE.test(storeId) || !/^[A-Za-z0-9_-]{4,}$/.test(emailB64) || !/^[A-Za-z0-9_-]{32}$/.test(f)) return null;
  const email = Buffer.from(emailB64, "base64url").toString("utf8").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email)) return null;
  const esperada = firma(storeId, email);
  const a = Buffer.from(f), b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { storeId, email };
}
