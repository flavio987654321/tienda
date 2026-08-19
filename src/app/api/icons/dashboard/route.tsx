import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// `nodejs` y no `edge`: hay que leer el archivo del logo del disco, y el runtime
// edge no tiene sistema de archivos.
export const runtime = "nodejs";

/**
 * El ícono del panel instalado.
 *
 * ── Por qué se compone el logo de verdad y no se dibuja uno ──────────────────
 * Antes esto DIBUJABA un ícono: primero una bolsita blanca sobre violeta, y
 * después la misma bolsita sobre el degradado naranja de la marca. Las dos veces
 * era un dibujo hecho a mano a partir de `src/app/icon.svg`, que es una versión
 * simplificada y vieja — no el logo. El de verdad tiene sus líneas de velocidad
 * y su etiqueta blanca en diagonal, y nada de eso estaba.
 *
 * Instalabas el panel y te quedaba en la pantalla de inicio algo parecido a tu
 * marca pero que no era tu marca. Ahora sale de `public/icon.png`, que es el
 * archivo real.
 *
 * ── Por qué sharp y no `ImageResponse` ───────────────────────────────────────
 * `ImageResponse` (Satori) sirve para COMPONER una imagen a partir de JSX, y eso
 * era lo que hacía falta cuando el ícono se dibujaba. Acá el trabajo es otro:
 * agarrar un PNG de 1,8 MB, achicarlo y pegarlo sobre un fondo. Para eso Satori
 * obligaría a meter el archivo entero como data URI —1,8 MB de texto base64 en
 * cada pedido— y sharp lo hace directo sobre los bytes.
 *
 * ── El fondo blanco ──────────────────────────────────────────────────────────
 * El logo es naranja y rojo sobre transparente. Ponerlo sobre el degradado de la
 * marca lo haría desaparecer: naranja sobre naranja. Sobre blanco resalta, y
 * además es el mismo blanco de la pantalla de arranque y del panel, así que abrir
 * la app no tiene ningún salto de color.
 *
 * ── La zona segura del maskable ──────────────────────────────────────────────
 * Android le aplica su propia máscara al maskable —casi siempre un círculo del
 * 80% del lado— y recorta lo que sobra. Por eso el maskable va cuadrado (la
 * máscara ya redondea; hacerlo dos veces deja un borde raro) y con el logo más
 * chico: un cuadrado centrado entra entero en ese círculo sólo si mide 56% o
 * menos, porque su diagonal es 1,41 veces el lado y 0,56 × 1,41 ≈ 0,79.
 */

const LOGO = path.join(process.cwd(), "public", "icon.png");

export async function GET(req: NextRequest) {
  const raw = parseInt(req.nextUrl.searchParams.get("size") ?? "512");
  const size = Math.min(Math.max(raw, 16), 1024);
  const maskable = req.nextUrl.searchParams.get("purpose") === "maskable";

  // 56% entra en el círculo de recorte del maskable; 72% no, pero en el `any`
  // no hay recorte y el logo se ve más grande, que es lo que conviene.
  const ladoLogo = Math.round(size * (maskable ? 0.56 : 0.72));
  const radio = maskable ? 0 : Math.round(size * 0.22);

  try {
    const logo = await readFile(LOGO);

    /* `trim` antes de escalar, y no es un detalle estético.
       El archivo trae bastante aire transparente alrededor del dibujo —y un
       resplandor que se desvanece—, así que escalando el archivo entero al 72%
       del cuadrado el logo visible terminaba ocupando menos de la mitad: se veía
       perdido en el medio, sobre todo al tamaño real de un ícono en la pantalla
       de inicio. Recortando primero ese margen, el 72% es 72% de logo.
       El umbral de 10 deja pasar el resplandor tenue como si fuera fondo; sin él,
       `trim` lo toma como parte del dibujo y no recorta casi nada. */
    const achicado = await sharp(logo)
      .trim({ threshold: 10 })
      .resize(ladoLogo, ladoLogo, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    let lienzo = sharp({
      create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    }).composite([{ input: achicado, gravity: "centre" }]);

    /* Las esquinas redondeadas se recortan con una máscara: se dibuja el
       rectángulo redondeado y se deja pasar sólo lo que cae adentro. Hay que
       aplanar a PNG antes, porque `dest-in` trabaja sobre el canal alfa del
       resultado y no sobre las capas sueltas. */
    if (radio > 0) {
      const plano = await lienzo.png().toBuffer();
      const mascara = Buffer.from(
        `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radio}" ry="${radio}" fill="#fff"/></svg>`
      );
      lienzo = sharp(plano).composite([{ input: mascara, blend: "dest-in" }]);
    }

    const png = await lienzo.png().toBuffer();

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    /* Sin ícono no se puede instalar la app: el manifiesto lo declara y el
       navegador lo exige. Antes que eso, se devuelve un cuadrado blanco liso —
       feo, pero instalable y arreglable con un deploy. */
    console.error("[icons/dashboard] no se pudo componer el ícono:", err);
    const liso = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    }).png().toBuffer();
    return new Response(new Uint8Array(liso), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }
}
