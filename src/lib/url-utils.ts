/**
 * Valida que una URL sea segura (no inyecta javascript:, data:, etc.)
 *
 * isSafeUrl      — permite http/https y rutas relativas (/ruta). Para links internos del editor de tienda.
 * isSafeExternal — solo http/https absolutos. Para links externos (CV, redes sociales).
 */

export function isSafeUrl(url: unknown): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return url.startsWith("/");
  }
}

export function isSafeExternalUrl(url: unknown): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
