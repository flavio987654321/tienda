import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// `nodejs` y no `edge`: hay que leer el archivo del logo del disco, y el runtime
// edge no tiene sistema de archivos.
export const runtime = "nodejs";

/**
 * El ícono del panel de afiliados instalado.
 *
 * Es el MISMO logo que el panel de tiendas, sobre un fondo distinto. Las dos
 * decisiones tienen su motivo:
 *
 * ── Por qué el mismo logo ────────────────────────────────────────────────────
 * La primera versión dibujaba dos personitas, que es lo que representa a un
 * afiliado. Se ve bien y no dice nada: podría ser el ícono de cualquier app de
 * cualquiera. Este panel es TiendaApps igual que el otro, así que lleva la marca
 * de TiendaApps.
 *
 * ── Por qué el fondo cambia ──────────────────────────────────────────────────
 * Hay gente con las dos apps instaladas —quien tiene su tienda y además vende
 * para otras—, y dos cuadrados idénticos en la pantalla de inicio obligarían a
 * abrirlos para saber cuál es cuál. A ese tamaño lo primero que distingue el ojo
 * es el color: el panel de tiendas va sobre blanco y éste sobre el índigo que ya
 * usa toda la navegación de afiliados. El logo naranja sobre índigo, además,
 * resalta más que sobre blanco.
 *
 * ── La zona segura del maskable ──────────────────────────────────────────────
 * Android le aplica su propia máscara —casi siempre un círculo del 80% del lado—
 * y recorta lo que sobra. Por eso el maskable va cuadrado (la máscara ya
 * redondea; hacerlo dos veces deja un borde raro) y con el logo al 56%: un
 * cuadrado centrado entra entero en ese círculo sólo si mide 56% o menos, porque
 * su diagonal es 1,41 veces el lado y 0,56 × 1,41 ≈ 0,79.
 */

const LOGO = path.join(process.cwd(), "public", "icon.png");
const INDIGO = { r: 79, g: 70, b: 229, alpha: 1 };

export async function GET(req: NextRequest) {
  const raw = parseInt(req.nextUrl.searchParams.get("size") ?? "512");
  const size = Math.min(Math.max(raw, 16), 1024);
  const maskable = req.nextUrl.searchParams.get("purpose") === "maskable";

  const ladoLogo = Math.round(size * (maskable ? 0.56 : 0.72));
  const radio = maskable ? 0 : Math.round(size * 0.22);

  try {
    const logo = await readFile(LOGO);

    /* `trim` antes de escalar: el archivo trae bastante aire transparente
       alrededor del dibujo, y sin recortarlo el logo visible terminaba ocupando
       menos de la mitad del cuadrado. El umbral de 10 deja pasar el resplandor
       tenue como si fuera fondo; sin él, `trim` lo toma como parte del dibujo y
       no recorta casi nada. */
    const achicado = await sharp(logo)
      .trim({ threshold: 10 })
      .resize(ladoLogo, ladoLogo, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    let lienzo = sharp({
      create: { width: size, height: size, channels: 4, background: INDIGO },
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
       navegador lo exige. Antes que eso, un cuadrado índigo liso — feo, pero
       instalable y arreglable con un deploy. */
    console.error("[icons/afiliados] no se pudo componer el ícono:", err);
    const liso = await sharp({
      create: { width: size, height: size, channels: 4, background: INDIGO },
    }).png().toBuffer();
    return new Response(new Uint8Array(liso), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }
}
