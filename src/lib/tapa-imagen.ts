import sharp from "sharp";
import path from "path";
import { coloresDelEbook, type ColoresDeTapa, type ModoDelEbook } from "@/lib/ebook-colores";

/**
 * La tapa del ebook, como imagen.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PARA QUÉ: EL PRODUCTO SE VENDÍA CON UN CUADRADO VACÍO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un producto digital sin portada muestra el ícono del rol adentro de un
 * recuadro punteado. En la tarjeta del panel es aceptable —dice "acá falta una
 * foto", que es cierto— pero **en la página de venta y en el enlace que se
 * comparte por WhatsApp e Instagram, eso es lo que ve quien podría comprar**.
 *
 * Y la tapa ya existe: es la primera hoja del PDF, con la foto elegida, el
 * título y los colores de la persona. Estaba adentro de un archivo que sólo se
 * puede ver bajándolo. Ahora sale también como imagen, y si el producto no
 * tiene portada, se le pone.
 *
 * ── ⚠️ Es la MISMA maqueta que el PDF, escrita dos veces ───────────────────
 *
 * Los colores no se copian: salen de `coloresDelEbook`, la misma función que
 * usa el PDF y la vista previa. Las medidas sí están escritas de nuevo, porque
 * pdfkit dibuja en un documento y esto compone imágenes — pero son las mismas
 * medidas, en los mismos puntos de una A4, y con las mismas tipografías. Si
 * cambia la tapa del PDF, cambia acá **en el mismo commit**: una portada que no
 * se parece al archivo que se entrega es peor que no tener portada.
 *
 * ── Por qué las letras van con `fontfile` y no con el nombre de la fuente ──
 *
 * Porque del otro lado no sabemos qué fuentes hay instaladas. En una máquina de
 * desarrollo con Windows sobran; en el servidor donde corre esto puede no haber
 * ninguna, y ahí el título saldría en blanco o en cuadraditos — adentro de la
 * imagen con la que alguien vende. Pasándole el archivo `.ttf` que ya viaja con
 * el PDF (ver `outputFileTracingIncludes` en `next.config.ts`), la tapa se
 * dibuja igual en los dos lados.
 */

/** Una hoja A4, en puntos: las mismas medidas que el PDF. */
const HOJA = { ancho: 595.28, alto: 841.89 };
const MARGEN = 56;
const ANCHO_UTIL = HOJA.ancho - MARGEN * 2;

/**
 * Cuántos píxeles por punto.
 *
 * 1,4 da 833 × 1179, que es de sobra para una portada —se muestra a 150 px en
 * la tarjeta y a unos 500 en la página de venta— y pesa unos 150 KB en JPEG.
 * Más grande no se ve mejor: se baja más lento.
 */
const ESCALA = 1.4;
const ANCHO = Math.round(HOJA.ancho * ESCALA);
const ALTO = Math.round(HOJA.alto * ESCALA);

/** De puntos de la hoja a píxeles de la imagen. */
const px = (pt: number) => Math.round(pt * ESCALA);

/**
 * Las mismas cuatro tipografías del PDF.
 *
 * ⚠️ La ruta se arma igual que allá (`process.cwd() + /fuentes/`) y esos
 * archivos ya viajan con la función. El nombre que va en la descripción de
 * Pango tiene que ser el nombre INTERNO de la familia, no el del archivo.
 */
const FUENTES = {
  titulo: { archivo: "PlayfairDisplay-Bold.ttf", familia: "Playfair Display Bold" },
  cursiva: { archivo: "Lora-Italic.ttf", familia: "Lora Italic" },
} as const;

const rutaDeFuente = (archivo: string) => path.join(process.cwd(), "fuentes", archivo);

/**
 * Sacar lo que no se puede dibujar y lo que rompería el marcado.
 *
 * Dos cosas distintas en la misma función: los caracteres de control no los
 * dibuja ninguna fuente, y los `<`, `>` y `&` los interpretaría Pango como
 * marcado — un título con "Ventas & marketing" tiraría el dibujo entero.
 */
function limpio(texto: string, tope = 300): string {
  const sinControles = Array.from(texto)
    .filter((c) => {
      const n = c.codePointAt(0) ?? 0;
      return n >= 32 || n === 10;
    })
    .join("");
  return sinControles
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, tope)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type Pedazo = { datos: Buffer; ancho: number; alto: number };

/**
 * Un texto dibujado, con la medida que ocupó.
 *
 * ⚠️ Devuelve el alto porque lo que va abajo se acomoda con eso: el título
 * puede ser de un renglón o de cuatro, y la raya y la promesa van *después*, no
 * en una coordenada fija. Es lo mismo que hace el PDF con `doc.y`.
 *
 * `dpi` es el zoom: la medida de la letra se escribe en los MISMOS puntos que
 * el PDF y la ampliación la hace la resolución. Así los dos dibujos no se
 * separan cuando alguien cambia `ESCALA`.
 */
async function dibujarTexto(
  texto: string,
  o: {
    fuente: { archivo: string; familia: string };
    cuerpo: number;
    color: string;
    ancho: number;
    alinear?: "left" | "centre";
    /** Separación entre letras, en puntos. Para los renglones en versalita. */
    entreLetras?: number;
    /** Separación entre renglones, en puntos. */
    entreRenglones?: number;
  },
): Promise<Pedazo | null> {
  if (!texto) return null;
  const espaciado = o.entreLetras ? ` letter_spacing="${Math.round(o.entreLetras * 1024)}"` : "";
  try {
    const { data, info } = await sharp({
      text: {
        text: `<span foreground="${o.color}"${espaciado}>${texto}</span>`,
        font: `${o.fuente.familia} ${o.cuerpo}`,
        fontfile: rutaDeFuente(o.fuente.archivo),
        rgba: true,
        width: px(o.ancho),
        wrap: "word",
        align: o.alinear ?? "left",
        spacing: o.entreRenglones ?? 0,
        dpi: Math.round(72 * ESCALA),
      },
    }).png().toBuffer({ resolveWithObject: true });
    return { datos: data, ancho: info.width, alto: info.height };
  } catch (e) {
    console.error("[tapa-imagen] no se pudo dibujar un texto", e);
    return null;
  }
}

/** Un rectángulo de color, para las rayas y las franjas. */
function rectangulo(ancho: number, alto: number, color: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">`
    + `<rect width="${ancho}" height="${alto}" fill="${color}"/></svg>`,
  );
}

/**
 * El velo negro del modo oscuro, con las mismas paradas que el PDF.
 *
 * Va en SVG y no en texto, así que acá no hay ningún riesgo de tipografías: son
 * formas.
 */
function velo(alto: number, paradas: [number, number][]): Buffer {
  const stops = paradas
    .map(([donde, cuanto]) => `<stop offset="${donde}" stop-color="#000000" stop-opacity="${cuanto}"/>`)
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${alto}">`
    + `<defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`
    + `<rect width="${ANCHO}" height="${alto}" fill="url(#v)"/></svg>`,
  );
}

type Capa = { input: Buffer; top: number; left: number };

/**
 * Apilar sólo lo que entra en la hoja.
 *
 * ⚠️ Sharp **tira** si algo se compone fuera de los bordes, y acá el largo de
 * los textos lo escribe una persona: un título de doce palabras empuja la
 * promesa abajo del borde y, sin este filtro, eso no sería una tapa fea sino un
 * armado que falla. Es la misma decisión que en el PDF, donde lo que no entra
 * se recorta: mejor una tapa sin la promesa que ninguna tapa.
 */
function loQueEntra(capas: (Capa | null)[]): Capa[] {
  const buenas: Capa[] = [];
  for (const c of capas) {
    if (!c) continue;
    if (c.top < 0 || c.left < 0) continue;
    buenas.push(c);
  }
  return buenas;
}

function capa(pedazo: Pedazo | null, left: number, top: number): Capa | null {
  if (!pedazo) return null;
  if (top + pedazo.alto > ALTO || left + pedazo.ancho > ANCHO) return null;
  return { input: pedazo.datos, top: Math.round(top), left: Math.round(left) };
}

/**
 * Lo mismo, pero centrado en la hoja.
 *
 * ⚠️ El `align: "centre"` de sharp NO alcanza: la imagen que devuelve está
 * recortada a lo que ocupa la tinta, así que centrar adentro de esa imagen no
 * mueve nada y el nombre salía pegado al borde izquierdo. Se centra al pegarlo.
 */
function capaCentrada(pedazo: Pedazo | null, top: number): Capa | null {
  if (!pedazo) return null;
  return capa(pedazo, Math.max(0, (ANCHO - pedazo.ancho) / 2), top);
}

/**
 * El sello redondo con la cantidad de capítulos.
 *
 * Va montado sobre el borde de la foto. Además de decir algo cierto —cuánto hay
 * adentro— tapa el corte recto entre la foto y el papel, que es lo que hacía
 * ver la mitad de abajo como una hoja a medio llenar. Mismo motivo y mismo
 * lugar que en el PDF: ver `sello` en `ebook-pdf`.
 */
async function elSello(
  cantidad: number,
  palabra: [string, string],
  t: ReturnType<typeof coloresDelEbook>,
  xCentro: number,
  yCentro: number,
): Promise<(Capa | null)[]> {
  if (cantidad <= 0) return [];
  const RADIO = 42;
  const lado = px(RADIO * 2);
  const izquierda = px(xCentro - RADIO);
  const arriba = px(yCentro - RADIO);

  const circulo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">`
    + `<circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="${t.acento}"/></svg>`,
  );

  const numero = await dibujarTexto(String(cantidad), {
    fuente: FUENTES.titulo, cuerpo: 20, color: t.sobreAcento, ancho: RADIO * 2,
  });
  const nombre = await dibujarTexto(cantidad === 1 ? palabra[0] : palabra[1], {
    fuente: FUENTES.titulo, cuerpo: 7, color: t.sobreAcento, ancho: RADIO * 2, entreLetras: 1.2,
  });

  /* Centrados adentro del círculo, por lo mismo que el nombre de abajo. */
  const centrar = (pedazo: Pedazo | null, top: number) =>
    pedazo ? capa(pedazo, izquierda + (lado - pedazo.ancho) / 2, top) : null;

  return [
    { input: circulo, top: arriba, left: izquierda },
    centrar(numero, px(yCentro - 17)),
    centrar(nombre, px(yCentro + 6)),
  ];
}

/**
 * Dibujar la tapa. Devuelve un JPEG, o `null` si algo salió mal.
 *
 * ⚠️ **Nunca tira.** Esto corre pegado al armado del PDF, que es lo que la
 * persona pagó: una portada que no se pudo dibujar no puede llevarse puesto el
 * archivo que se vende. Ante cualquier problema se devuelve `null` y quien
 * llama sigue como si esto no existiera.
 */
export async function dibujarLaTapa(d: {
  titulo: string;
  promesa: string;
  autor: string;
  /** Los bytes de la foto de tapa, si hay. JPEG o PNG. */
  foto: Buffer | null;
  /** Cuántos capítulos —o recetas— tiene adentro. Van en el sello. */
  cantidad: number;
  /** Cómo se llama cada uno, en singular y en plural. */
  palabra: [string, string];
  paleta: ColoresDeTapa;
  modo: ModoDelEbook;
}): Promise<Buffer | null> {
  try {
    const t = coloresDelEbook(d.paleta, d.modo);
    const titulo = limpio(d.titulo, 160);
    const promesa = limpio(d.promesa, 240);
    const autor = limpio(d.autor, 80).toUpperCase();

    /* ⚠️ La foto se prueba ANTES de decidir la maqueta. Si no se puede abrir
       —un archivo cortado, un formato que sharp no lee— la tapa con foto
       quedaría con un hueco. Es lo mismo que hace el PDF con `fotoCubriendo`,
       que devuelve `false` y manda a la maqueta de color. */
    const hayFoto = d.foto ? await sharp(d.foto).metadata().then(() => true).catch(() => false) : false;

    const capas: (Capa | null)[] = [];

    /* ── Oscura con foto: la foto ocupa la hoja y el texto va encima ────── */
    if (hayFoto && d.foto && t.modo === "oscuro") {
      const fondo = await sharp(d.foto)
        .resize(ANCHO, ALTO, { fit: "cover", position: "centre" })
        .toBuffer();
      capas.push({ input: fondo, top: 0, left: 0 });

      /* De un cuarto para abajo se oscurece: ahí va todo el texto. */
      capas.push({ input: velo(ALTO - px(HOJA.alto * 0.26), [[0, 0], [0.4, 0.66], [1, 0.97]]), top: px(HOJA.alto * 0.26), left: 0 });
      capas.push({ input: velo(px(200), [[0, 0.62], [1, 0]]), top: 0, left: 0 });

      const arriba = await dibujarTexto("GUÍA COMPLETA", {
        fuente: FUENTES.titulo, cuerpo: 9, color: t.acento, ancho: ANCHO_UTIL, entreLetras: 2.4,
      });
      capas.push(capa(arriba, px(MARGEN), px(60)));

      const grande = await dibujarTexto(titulo, {
        fuente: FUENTES.titulo, cuerpo: 37, color: "#FFFFFF", ancho: ANCHO_UTIL, entreRenglones: 3,
      });
      /* Apoyado en un renglón fijo y creciendo para arriba, igual que el PDF:
         así la raya de abajo siempre cae en el mismo lugar. */
      capas.push(capa(grande, px(MARGEN), px(588) - (grande?.alto ?? 0)));

      capas.push({ input: rectangulo(px(62), px(4), t.acento), top: px(608), left: px(MARGEN) });

      const bajada = await dibujarTexto(promesa, {
        fuente: FUENTES.cursiva, cuerpo: 13, color: "#E9E2D8", ancho: ANCHO_UTIL - 30, entreRenglones: 3,
      });
      capas.push(capa(bajada, px(MARGEN), px(636)));

      const firma = await dibujarTexto(autor, {
        fuente: FUENTES.titulo, cuerpo: 9, color: "#CFC5B8", ancho: ANCHO_UTIL, entreLetras: 2.2,
      });
      capas.push(capa(firma, px(MARGEN), px(HOJA.alto - 66)));

      capas.push(...await elSello(d.cantidad, d.palabra, t, HOJA.ancho - MARGEN - 42, 706));

      return await componer(capas, t.fondo);
    }

    /* ── Las otras dos comparten el corte: arriba la foto o el color, abajo
          el papel con el texto. ────────────────────────────────────────── */
    const corte = px(HOJA.alto * (hayFoto ? 0.52 : 0.6));

    if (hayFoto && d.foto) {
      const arribaFoto = await sharp(d.foto)
        .resize(ANCHO, corte, { fit: "cover", position: "centre" })
        .toBuffer();
      capas.push({ input: arribaFoto, top: 0, left: 0 });

      /* Montado sobre el borde de la foto, del lado derecho: sin esto el corte
         entre la foto y el papel queda como una hoja partida al medio. */
      capas.push(...await elSello(
        d.cantidad, d.palabra, t, HOJA.ancho - MARGEN - 42, HOJA.alto * 0.52,
      ));

      const etiqueta = await dibujarTexto("GUÍA COMPLETA", {
        fuente: FUENTES.titulo, cuerpo: 9, color: t.acento, ancho: ANCHO_UTIL, entreLetras: 2.4,
      });
      capas.push(capa(etiqueta, px(MARGEN), corte + px(44)));

      const grande = await dibujarTexto(titulo, {
        fuente: FUENTES.titulo, cuerpo: 30, color: t.tinta, ancho: ANCHO_UTIL, entreRenglones: 3,
      });
      capas.push(capa(grande, px(MARGEN), corte + px(64)));

      const yRaya = corte + px(64) + (grande?.alto ?? 0) + px(16);
      capas.push(capa({ datos: rectangulo(px(62), px(4), t.acento), ancho: px(62), alto: px(4) }, px(MARGEN), yRaya));

      capas.push(...await elPie({ promesa, autor }, t, yRaya + px(24)));
      return await componer(capas, t.fondo);
    }

    /* ── Sin foto: un bloque de color con el título adentro ─────────────── */
    capas.push({ input: rectangulo(ANCHO, corte, t.acento), top: 0, left: 0 });

    const grande = await dibujarTexto(titulo, {
      fuente: FUENTES.titulo, cuerpo: 34, color: t.sobreAcento, ancho: ANCHO_UTIL, entreRenglones: 4,
    });
    /* Adentro del bloque: si bajara al papel, la tapa quedaría con medio metro
       de color vacío arriba. */
    capas.push(capa(grande, px(MARGEN), corte - (grande?.alto ?? 0) - px(54)));
    capas.push({ input: rectangulo(px(62), px(4), t.sobreAcento), top: corte - px(34), left: px(MARGEN) });

    capas.push(...await elPie({ promesa, autor }, t, corte + px(48)));
    return await componer(capas, t.fondo);
  } catch (e) {
    console.error("[tapa-imagen] no se pudo dibujar la tapa", e);
    return null;
  }
}

/** La promesa y el nombre de quien vende, en las dos tapas con papel abajo. */
async function elPie(
  x: { promesa: string; autor: string },
  t: ReturnType<typeof coloresDelEbook>,
  y: number,
): Promise<(Capa | null)[]> {
  const capas: (Capa | null)[] = [];

  const bajada = await dibujarTexto(x.promesa, {
    fuente: FUENTES.cursiva, cuerpo: 13, color: t.tinta, ancho: ANCHO_UTIL - 30, entreRenglones: 3,
  });
  capas.push(capa(bajada, px(MARGEN), y));

  if (x.autor) {
    /* La franja va a sangre y el nombre centrado adentro. Es lo que cierra la
       tapa por abajo: sin ella, el papel se termina en el aire. */
    capas.push({ input: rectangulo(ANCHO, px(44), t.acento), top: ALTO - px(44), left: 0 });
    const firma = await dibujarTexto(x.autor, {
      fuente: FUENTES.titulo, cuerpo: 9, color: t.sobreAcento, ancho: HOJA.ancho,
      alinear: "centre", entreLetras: 2.4,
    });
    capas.push(capaCentrada(firma, ALTO - px(28)));
  }
  return capas;
}

/** Apilar todo sobre el papel y sacar el JPEG. */
async function componer(capas: (Capa | null)[], fondo: string): Promise<Buffer> {
  return sharp({
    create: { width: ANCHO, height: ALTO, channels: 4, background: fondo },
  })
    .composite(loQueEntra(capas))
    /* JPEG y no PNG: una tapa con foto en PNG pesa cuatro veces más y no se ve
       mejor. `mozjpeg` aprieta otro 10 % sin tocar la calidad que se ve. */
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/** Cuánto mide la imagen que sale de acá, para quien la quiera anunciar. */
export const MEDIDAS_DE_LA_TAPA = { ancho: ANCHO, alto: ALTO };
