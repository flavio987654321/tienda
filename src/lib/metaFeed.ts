// Helpers compartidos para generar feeds XML compatibles con Meta Commerce Manager
// (usados tanto por el feed de afiliados como por el feed propio de cada tienda).

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function parseFirstImage(images: string): string | null {
  try {
    const arr = JSON.parse(images);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return typeof arr[0] === "string" ? arr[0] : (arr[0] as { url?: string })?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * La dirección de una foto para un catálogo de Meta: las de nuestro depósito
 * pasan por /api/feed-foto, que las entrega en JPG (Meta no acepta WebP). Las
 * de afuera van como están.
 */
export function fotoParaMeta(url: string, urlBase: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base && url.startsWith(`${base}/storage/v1/object/public/`) ? `${urlBase}/api/feed-foto?u=${encodeURIComponent(url)}` : url;
}
