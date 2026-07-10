// Helpers compartidos para generar feeds XML compatibles con Meta Commerce Manager
// (usados tanto por el feed de afiliadas como por el feed propio de cada tienda).

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
