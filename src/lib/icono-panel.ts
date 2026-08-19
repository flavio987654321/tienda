import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * El ícono de un panel instalable, compuesto a partir del logo real.
 *
 * Lo usan los dos paneles —tiendas y afiliados— y lo único que cambia entre
 * ellos es el color de fondo. Antes era el mismo código escrito dos veces; la
 * segunda copia nació de un copiar y pegar de la primera, que es exactamente
 * como después se separan.
 *
 * ── Por qué se compone el logo y no se dibuja uno ────────────────────────────
 * Las primeras versiones DIBUJABAN un ícono a partir de `src/app/icon.svg`, que
 * es una versión simplificada y vieja: una bolsita con una etiqueta rectangular.
 * El logo de verdad tiene sus líneas de velocidad y su etiqueta blanca en
 * diagonal. Instalabas el panel y te quedaba algo parecido a tu marca que no era
 * tu marca.
 *
 * ── Por qué sharp y no `ImageResponse` ───────────────────────────────────────
 * `ImageResponse` (Satori) compone una imagen a partir de JSX, que era lo que
 * hacía falta mientras el ícono se dibujaba. Acá el trabajo es otro: achicar un
 * PNG de 1,8 MB y pegarlo sobre un fondo. Con Satori habría que meter el archivo
 * entero como data URI —1,8 MB de base64 en cada pedido— y sharp trabaja directo sobre
 * los bytes.
 */

const LOGO = path.join(process.cwd(), "public", "icon.png");

export type Color = { r: number; g: number; b: number; alpha: number };

/**
 * Cuánto hay que correr el logo para que se vea centrado.
 *
 * Centrar la caja que lo contiene NO lo centra a la vista, y la diferencia se
 * nota: Flavio la vio en el teléfono antes que cualquier medición ("está un
 * piquito apenas tirado a la derecha").
 *
 * El motivo es que el dibujo no reparte su peso parejo adentro de su caja. Las
 * líneas de velocidad son finas y tenues pero se extienden hacia la izquierda, y
 * el resplandor hacia arriba: las dos cosas agrandan la caja de un lado sin poner
 * casi nada de dibujo ahí. La masa sólida —la bolsa y la etiqueta— queda abajo a
 * la derecha. Medido sobre el archivo real: 9% a la derecha y 10,7% abajo del
 * centro geométrico.
 *
 * Se mide en cada llamada en vez de dejar esos números escritos, y no es
 * ceremonia: si mañana se cambia el logo por otro con otra composición, los
 * números escritos quedarían corrigiendo un corrimiento que ya no existe y lo
 * dejarían peor que sin corregir. Se mide sobre la imagen YA achicada, que son
 * unos pocos cientos de miles de píxeles.
 *
 * El alfa entra como peso: un píxel medio transparente pesa la mitad. Así el
 * resplandor influye en proporción a lo que se ve, y no como si fuera dibujo
 * macizo.
 */
async function corrimientoVisual(imagen: Buffer): Promise<{ dx: number; dy: number }> {
  const { data, info } = await sharp(imagen).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  let sumaX = 0, sumaY = 0, peso = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * ch + 3];
      // Por debajo de 25 es resplandor, no dibujo: sin este piso el halo tira del
      // centro hacia afuera y la corrección sale al revés.
      if (a < 25) continue;
      sumaX += x * a;
      sumaY += y * a;
      peso += a;
    }
  }

  if (peso === 0) return { dx: 0, dy: 0 };
  return { dx: Math.round(sumaX / peso - w / 2), dy: Math.round(sumaY / peso - h / 2) };
}

export async function componerIconoDePanel(opciones: {
  size: number;
  maskable: boolean;
  fondo: Color;
}): Promise<Buffer> {
  const { size, maskable, fondo } = opciones;

  /* 56% entra en el círculo de recorte del maskable; 72% no, pero en el `any` no
     hay recorte y el logo se ve más grande, que es lo que conviene.
     La zona segura del maskable: Android le aplica su propia máscara —casi
     siempre un círculo del 80% del lado— y recorta lo que sobra. Un cuadrado
     centrado entra entero en ese círculo sólo si mide 56% o menos, porque su
     diagonal es 1,41 veces el lado y 0,56 × 1,41 ≈ 0,79. */
  const ladoLogo = Math.round(size * (maskable ? 0.56 : 0.72));
  // La máscara de Android ya redondea; redondear también acá deja doble borde.
  const radio = maskable ? 0 : Math.round(size * 0.22);

  const original = await readFile(LOGO);

  /* `trim` antes de escalar: el archivo trae bastante aire transparente
     alrededor del dibujo, y sin recortarlo el logo visible terminaba ocupando
     menos de la mitad del cuadrado — se veía perdido en el medio. El umbral de
     10 deja pasar el resplandor tenue como si fuera fondo; sin él, `trim` lo
     toma como parte del dibujo y no recorta casi nada. */
  const achicado = await sharp(original)
    .trim({ threshold: 10 })
    .resize(ladoLogo, ladoLogo, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const { dx, dy } = await corrimientoVisual(achicado);

  /* Se pega con posición explícita en vez de `gravity: "centre"`, restando el
     corrimiento. `Math.max(0, …)` porque sharp no acepta coordenadas negativas:
     con un logo casi tan grande como el lienzo, la corrección podría pedir
     salirse del borde. Ahí se pega pegado al borde, que es lo más cerca del
     centro visual que se puede llegar sin recortar dibujo. */
  const izquierda = Math.max(0, Math.round((size - ladoLogo) / 2) - dx);
  const arriba = Math.max(0, Math.round((size - ladoLogo) / 2) - dy);

  let lienzo = sharp({
    create: { width: size, height: size, channels: 4, background: fondo },
  }).composite([{ input: achicado, left: izquierda, top: arriba }]);

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

  return lienzo.png().toBuffer();
}

/**
 * Un cuadrado liso del color del panel.
 *
 * Sin ícono no se puede instalar la app: el manifiesto lo declara y el navegador
 * lo exige. Antes que eso, esto — feo, pero instalable y arreglable con un
 * deploy.
 */
export async function iconoDeRespaldo(size: number, fondo: Color): Promise<Buffer> {
  return sharp({ create: { width: size, height: size, channels: 4, background: fondo } })
    .png()
    .toBuffer();
}
