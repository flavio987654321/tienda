import PDFDocument from "pdfkit";
import type { Bloque, CapituloEscrito } from "@/lib/ebook-ia";

/**
 * De los capítulos escritos al PDF que se entrega.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ESTE ARCHIVO ES EL PRODUCTO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lo que sale de acá es lo que el comprador baja. No es una vista previa ni un
 * borrador: es la cosa por la que pagó.
 *
 * ── Por qué pdfkit y no un navegador ───────────────────────────────────────
 *
 * Lo natural sería dibujar HTML y pedirle a Chrome que lo imprima. No entra:
 * un Chrome adentro de una función serverless pesa más de 100 MB y tarda
 * segundos en arrancar, y acá el techo es de 60 segundos para todo.
 *
 * pdfkit escribe el PDF derecho, sin navegador. Corta los renglones y salta de
 * página solo, que es el 90 % del trabajo de maquetar texto corrido.
 *
 * ── ⚠️ Las tipografías de fábrica y por qué el texto se limpia ─────────────
 *
 * Se usan las 14 tipografías que todo lector de PDF ya tiene adentro. Así el
 * archivo pesa kilobytes en vez de megas y no hay que empaquetar ninguna
 * fuente. El costo es que **sólo entienden el alfabeto latino de un byte**:
 * un emoji, una flecha o una letra griega salen como un garabato o rompen el
 * armado. Por eso todo pasa por `soloLoQueEntra` antes de escribirse.
 */

/* ── El papel ───────────────────────────────────────────────────────────── */

const HOJA = { ancho: 595.28, alto: 841.89 };  // A4 en puntos
const MARGEN = 68;
const ANCHO_UTIL = HOJA.ancho - MARGEN * 2;

/* Tipografías de las 14 de fábrica. Times para el cuerpo porque es lo que se
   lee sin cansarse en textos largos; Helvetica para los títulos, que se miran. */
const CUERPO = "Times-Roman";
const CUERPO_CURSIVA = "Times-Italic";
const TITULO = "Helvetica-Bold";

const NEGRO = "#111111";
const GRIS = "#666666";

/* ── Lo que entra en una tipografía de un byte ──────────────────────────── */

/**
 * Los caracteres de más allá de 0xFF que WinAnsi sí sabe dibujar: las comillas
 * tipográficas, los guiones largos, los puntos suspensivos, la viñeta.
 *
 * Están acá porque son **los que un modelo escribe todo el tiempo**. Sin esta
 * lista, cada comilla curva de cada párrafo se perdería.
 */
const ENTRAN_IGUAL = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/** Los que no entran pero tienen un reemplazo obvio, en vez de desaparecer. */
const REEMPLAZOS: Record<string, string> = {
  "→": "->", "←": "<-", "⇒": "=>", "↔": "<->",
  "≈": "aprox. ", "≠": "!=", "≤": "<=", "≥": ">=",
  "✓": "-", "✔": "-", "✅": "-", "•": "•", "·": "-",
  "…": "…", "–": "–", "—": "—",
  " ": " ", " ": " ", "​": "",
};

/**
 * El texto, dejando sólo lo que la tipografía puede dibujar.
 *
 * ⚠️ **No es cosmética.** Un carácter que la fuente no tiene sale como un
 * cuadradito o directamente hace fallar el armado, y eso pasaría adentro del
 * archivo que alguien ya pagó. Todo lo que va al PDF pasa por acá, venga del
 * modelo o de un campo que escribió la persona.
 */
export function soloLoQueEntra(texto: string): string {
  let salida = "";
  for (const c of texto.normalize("NFC")) {
    const reemplazo = REEMPLAZOS[c];
    if (reemplazo !== undefined) { salida += reemplazo; continue; }

    const punto = c.codePointAt(0) ?? 0;
    /* Los de control se van: nadie los escribe a mano y rompen el renglón. El
       salto de línea tampoco entra — cada bloque es un párrafo, y el salto lo
       pone la maqueta, no el texto. */
    if (punto < 0x20 || punto === 0x7f) { salida += " "; continue; }
    if (punto <= 0xff || ENTRAN_IGUAL.has(punto)) { salida += c; continue; }
    /* Lo que quedó afuera —emojis, flechas raras, alfabetos de otro idioma— se
       descarta en silencio. Dejarlo pasar sería peor. */
  }
  return salida.replace(/ {2,}/g, " ").trim();
}

/* ── El armado ──────────────────────────────────────────────────────────── */

export type DatosDelEbook = {
  titulo: string;
  promesa: string;
  /** Quién lo vende. Va en la tapa: el ebook es de esa persona, no nuestro. */
  autor: string;
  capitulos: CapituloEscrito[];
};

type Doc = PDFKit.PDFDocument;

function tapa(doc: Doc, d: DatosDelEbook): void {
  doc.fillColor(NEGRO);

  /* Un cuarto de la hoja de aire arriba: es lo que hace que una tapa de puro
     texto no parezca una hoja que arranca torcida. */
  doc.y = HOJA.alto * 0.28;

  doc.font(TITULO).fontSize(30)
    .text(soloLoQueEntra(d.titulo), MARGEN, doc.y, { width: ANCHO_UTIL, align: "left", lineGap: 4 });

  if (d.promesa) {
    doc.moveDown(0.8);
    doc.font(CUERPO_CURSIVA).fontSize(14).fillColor(GRIS)
      .text(soloLoQueEntra(d.promesa), { width: ANCHO_UTIL, lineGap: 2 });
  }

  if (d.autor) {
    doc.font(CUERPO).fontSize(12).fillColor(GRIS)
      .text(soloLoQueEntra(d.autor), MARGEN, HOJA.alto - MARGEN - 24, {
        width: ANCHO_UTIL, lineBreak: false,
      });
  }
}

function contenido(doc: Doc, d: DatosDelEbook): void {
  doc.addPage();
  doc.fillColor(NEGRO).font(TITULO).fontSize(20)
    .text("Contenido", MARGEN, MARGEN, { width: ANCHO_UTIL });
  doc.moveDown(1);

  /* Sin números de página a propósito: pdfkit no sabe en qué página va a caer
     un capítulo hasta haberlo dibujado, y una tabla de contenidos con números
     equivocados es peor que una sin números. */
  d.capitulos.forEach((c, i) => {
    doc.font(CUERPO).fontSize(12).fillColor(NEGRO)
      .text(`${i + 1}.  ${soloLoQueEntra(c.titulo)}`, { width: ANCHO_UTIL, lineGap: 6 });
  });
}

function dibujarBloque(doc: Doc, b: Bloque): void {
  const texto = soloLoQueEntra(b.texto);
  if (!texto) return;

  if (b.tipo === "subtitulo") {
    doc.moveDown(0.9);
    doc.font(TITULO).fontSize(13).fillColor(NEGRO)
      .text(texto, { width: ANCHO_UTIL, lineGap: 1 });
    doc.moveDown(0.35);
    return;
  }

  if (b.tipo === "vineta") {
    doc.font(CUERPO).fontSize(11.5).fillColor(NEGRO)
      .text(`•  ${texto}`, {
        width: ANCHO_UTIL - 16,
        indent: 16,
        lineGap: 2,
        paragraphGap: 6,
      });
    return;
  }

  doc.font(CUERPO).fontSize(11.5).fillColor(NEGRO)
    .text(texto, { width: ANCHO_UTIL, align: "justify", lineGap: 2.5, paragraphGap: 9 });
}

function capitulo(doc: Doc, c: CapituloEscrito, numero: number): void {
  /* Cada capítulo empieza en hoja nueva. Es lo que hace que se lea como un
     libro y no como un documento largo. */
  doc.addPage();

  doc.font(TITULO).fontSize(10).fillColor(GRIS)
    .text(`CAPÍTULO ${numero}`, MARGEN, MARGEN, { width: ANCHO_UTIL, characterSpacing: 1 });
  doc.moveDown(0.4);
  doc.font(TITULO).fontSize(19).fillColor(NEGRO)
    .text(soloLoQueEntra(c.titulo), { width: ANCHO_UTIL, lineGap: 3 });
  doc.moveDown(1);

  for (const b of c.bloques) dibujarBloque(doc, b);
}

/**
 * El número de página al pie, en todas menos la tapa.
 *
 * Se pone al final y no mientras se escribe: recién acá se sabe cuántas
 * páginas hay. Va con `lineBreak: false` y posición fija — un pie que se
 * desborda agregaría una página, y esa página agregaría otro pie.
 */
function pies(doc: Doc): void {
  const rango = doc.bufferedPageRange();
  for (let i = 1; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    doc.font(CUERPO).fontSize(9).fillColor(GRIS)
      .text(String(i), MARGEN, HOJA.alto - MARGEN + 18, {
        width: ANCHO_UTIL, align: "center", lineBreak: false,
      });
  }
}

/**
 * El PDF entero, en memoria.
 *
 * Devuelve el archivo armado y no lo guarda: quién lo guarda y con qué nombre
 * es decisión de quien llama. Así esto se puede probar sin tocar el depósito.
 */
export function armarPDF(d: DatosDelEbook): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [HOJA.ancho, HOJA.alto],
    margins: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
    /* Hace falta para poder volver a cada página a ponerle el pie. */
    bufferPages: true,
    info: {
      Title: soloLoQueEntra(d.titulo),
      Author: soloLoQueEntra(d.autor),
    },
    /* Sin esto pdfkit deja el PDF marcado como "producido por pdfkit", que no
       dice nada de quién lo vende. */
    autoFirstPage: true,
  });

  const pedazos: Buffer[] = [];
  const listo = new Promise<Buffer>((resolver, rechazar) => {
    doc.on("data", (p: Buffer) => pedazos.push(p));
    doc.on("end", () => resolver(Buffer.concat(pedazos)));
    doc.on("error", rechazar);
  });

  tapa(doc, d);
  contenido(doc, d);
  d.capitulos.forEach((c, i) => capitulo(doc, c, i + 1));
  pies(doc);

  doc.end();
  return listo;
}
