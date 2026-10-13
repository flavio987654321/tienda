/* Sube una imagen de diseño (banner, flyer, foto de sección, promo del admin)
 * achicada y por nuestra ruta.
 *
 * Hasta octubre de 2026 el panel de Diseño subía directo del navegador a
 * Supabase. Para eso el depósito `tienda-imagenes` dejaba a CUALQUIER cuenta
 * subir, reemplazar y borrar cualquier archivo: sin tope de tamaño, de tipo ni
 * de cantidad, y con permiso sobre los banners de otras tiendas. Y como nada lo
 * achicaba, había flyers PNG de 5 MB que bajaba cada visitante.
 *
 * Por `/api/upload` pasa con sesión, tope de subidas por hora, tope de tamaño y
 * mirando los bytes para confirmar que es una imagen de verdad.
 *
 * El GIF no se toca: pasarlo por el canvas lo deja quieto en el primer cuadro.
 */
const LADO_MAXIMO = 2400; // cubre un banner a lo ancho en pantalla grande
const PESO_MAXIMO = 900 * 1024;

export async function subirImagenDeDiseno(file: File): Promise<string> {
  let archivo = file;
  if (file.type !== "image/gif") {
    const { optimizeImage } = await import("@/lib/image-optimizer");
    archivo = await optimizeImage(file, { maxSidePx: LADO_MAXIMO, maxBytes: PESO_MAXIMO, startQuality: 0.85 });
  }

  const form = new FormData();
  form.append("file", archivo);
  form.append("purpose", "image");
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const datos = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !datos.url) throw new Error(datos.error ?? "No se pudo subir la imagen. Probá de nuevo.");
  return datos.url;
}

/**
 * Achicar en el navegador ANTES de mandar, para cualquier formulario (13/10/26).
 *
 * El servidor achica igual todo lo público (`lib/achicar-imagen`), así que esto
 * no es lo que protege el depósito: es lo que deja pasar la foto del celular de
 * 6 MB, que si no choca con el techo de 4,5 MB del pedido y rebota. Lo que no es
 * imagen (un PDF) o es GIF vuelve tal cual. Si el navegador no puede, también.
 */
export async function achicarAntesDeSubir(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const { optimizeImage } = await import("@/lib/image-optimizer");
    return await optimizeImage(file, { maxSidePx: LADO_MAXIMO, maxBytes: PESO_MAXIMO, startQuality: 0.85 });
  } catch {
    return file;
  }
}
