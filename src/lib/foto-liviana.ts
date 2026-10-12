/* Una foto de Supabase pasada por el optimizador de Next, para usar en un
 * `<img>` común sin cambiar nada de cómo se dibuja.
 *
 * Existe por el corte de octubre de 2026. Supabase cobra el egress: cada vez que
 * un visitante nuevo baja una foto directo del depósito, se paga. Los flyers de
 * la home (PNG de 1,2 a 1,6 MB) y las fotos de los templates de autos iban así:
 * tamaño original, una descarga por visitante. Por el optimizador, Supabase
 * entrega cada foto UNA vez cada 31 días (`minimumCacheTTL` en next.config) y
 * lo demás lo sirve Vercel ya achicado a WebP.
 *
 * Por qué una url y no `<Image>`: esas pantallas tienen el `<img>` con estilos
 * propios (alto automático, `maxHeight: 80vh`, `objectFit`...) y `<Image>` pide
 * ancho y alto o `fill`, que cambia el layout. Cambiar sólo el `src` no mueve
 * ni un pixel.
 *
 * Un ancho fijo por lugar, a propósito: cada ancho distinto es una
 * transformación aparte que Vercel cuenta, y un srcset con todos los anchos
 * multiplica eso. Se elige el ancho que cubre el lugar a 2x.
 */

/** Los anchos que acepta el optimizador: `deviceSizes` + `imageSizes` de
 *  next.config. Pedir otro devuelve 400, así que se redondea para arriba. */
const ANCHOS = [64, 128, 256, 384, 640, 828, 1200, 1920] as const;

/** Sólo lo público de Supabase. Lo firmado vence (y cada firma es otra url, que
 *  el caché no reconoce), y el SVG el optimizador lo rechaza. Una url de otro
 *  lado, una ruta local o un `blob:` de la vista previa pasan tal cual. */
function esFotoDeSupabase(src: string): boolean {
  try {
    const u = new URL(src);
    return u.protocol === "https:"
      && u.hostname.endsWith(".supabase.co")
      && u.pathname.includes("/storage/v1/object/public/")
      && !/\.svg$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function fotoLiviana(src: string | null | undefined, ancho: number): string {
  if (!src) return "";
  if (!esFotoDeSupabase(src)) return src;
  const w = ANCHOS.find((a) => a >= ancho) ?? ANCHOS[ANCHOS.length - 1];
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}
