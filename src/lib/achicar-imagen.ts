import sharp from "sharp";

/**
 * Toda imagen pública se achica ACÁ, en el servidor, antes de guardarse (13/10/26).
 *
 * Hasta ahora achicar dependía de cada formulario: el de producto y el de Diseño
 * lo hacían, el logo, el perfil, los productos digitales y el admin no. Así
 * entraron logos PNG de 2,4 MB que se mostraban en un cuadrito de 96 px, y cada
 * visita los bajaba enteros de Supabase, que cobra el tráfico de salida.
 *
 * Con esto da igual de dónde venga: lo que se guarda en un depósito público pasa
 * por acá. Los formularios pueden seguir achicando antes (así suben más rápido y
 * no chocan con el techo de 4,5 MB del pedido), pero ya no dependemos de eso.
 *
 * - Lado mayor: 2400 px (cubre un banner a lo ancho); el logo, 1024.
 * - WebP calidad 80, que mantiene la transparencia de logos y PNG.
 * - Gira según el EXIF: la foto del celular deja de quedar acostada.
 * - El GIF animado sigue animado (WebP animado).
 * - Si el resultado pesa MÁS que el original (una WebP ya liviana), queda el original.
 */
export const LADO_MAXIMO = 2400;
export const LADO_MAXIMO_LOGO = 1024;
const CALIDAD = 80;

export type ImagenAchicada = { bytes: Buffer; extension: string; tipo: string };

export async function achicarImagen(
  entrada: ArrayBuffer | Buffer,
  { ladoMaximo = LADO_MAXIMO }: { ladoMaximo?: number } = {},
): Promise<ImagenAchicada | null> {
  const original = Buffer.isBuffer(entrada) ? entrada : Buffer.from(entrada);
  try {
    const animada = (await sharp(original).metadata()).pages ?? 1;
    const salida = await sharp(original, { animated: animada > 1 })
      .rotate()
      .resize({ width: ladoMaximo, height: ladoMaximo, fit: "inside", withoutEnlargement: true })
      .webp({ quality: CALIDAD, effort: 4 })
      .toBuffer();
    if (salida.length >= original.length) return null;
    return { bytes: salida, extension: "webp", tipo: "image/webp" };
  } catch (e) {
    /* Una imagen que sharp no entiende no se rechaza acá: quien llama ya
       comprobó por los bytes que es una imagen, y se guarda como vino. */
    console.error("[achicar-imagen] no se pudo achicar:", e);
    return null;
  }
}
