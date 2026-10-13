import sharp from "sharp";
import { urlDeDescargaPermitida } from "@/lib/url-utils";

/**
 * Una imagen de la tienda lista para dibujar en una vista previa de compartir
 * (WhatsApp, Facebook) con `ImageResponse`.
 *
 * El motor de `next/og` NO lee WebP: con un logo WebP devuelve la placa sin el
 * logo, sin dar error (medido el 13/10/26). Y desde ese día todo lo que se sube
 * se guarda en WebP (ver `achicar-imagen`). Así que acá se baja, se achica al
 * tamaño que se va a dibujar y se pasa a PNG.
 *
 * `null` si no se puede (dirección no permitida, se cae, no es imagen): quien
 * llama dibuja lo de siempre sin imagen —las iniciales, el degradado—.
 */
export async function imagenParaOg(url: string | null | undefined, lado = 400): Promise<string | null> {
  const permitida = url ? urlDeDescargaPermitida(url) : null;
  if (!permitida) return null;
  try {
    // `redirect: "error"`: un 302 hacia adentro esquivaría la guarda de arriba.
    const res = await fetch(permitida, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: lado, height: lado, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
