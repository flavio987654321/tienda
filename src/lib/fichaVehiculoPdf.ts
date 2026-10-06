import PDFDocument from "pdfkit";
import { soloLoQueEntra } from "@/lib/ebook-pdf";
import type { BloquesDeFicha, FilaDeFicha } from "@/lib/fichaVehiculo";

/**
 * La ficha técnica de un vehículo, en PDF (06/10/26).
 *
 * Una hoja A4 (dos si hay mucho equipamiento) para mandar por WhatsApp o
 * imprimir en la concesionaria: foto, precio, los datos principales, motor,
 * medidas, equipamiento y papeles, y cómo consultar.
 *
 * Mismo motor que el ebook (pdfkit, sin navegador — ver `ebook-pdf.ts`), pero
 * con las Helvetica de fábrica: una ficha de auto es una planilla, no un libro.
 * Todo texto pasa por `soloLoQueEntra`, que deja sólo lo que esas letras
 * pueden dibujar (los acentos y la ñ sí entran; un emoji en el nombre, no).
 *
 * Las fotos llegan ya convertidas a JPEG (pdfkit no lee webp): de eso se ocupa
 * la ruta que lo sirve. Sin foto, la hoja sale igual, sin el hueco.
 */

export type DatosDeLaFichaPdf = {
  tienda: { nombre: string; logo: Buffer | null; whatsapp: string | null; link: string; acento: string };
  vehiculo: {
    nombre: string;
    precio: string;
    chips: string[];
    ubicacion: string;
    reservado: boolean;
    foto: Buffer | null;
    principales: FilaDeFicha[];
  };
  ficha: BloquesDeFicha;
  fecha: Date;
};

type Doc = InstanceType<typeof PDFDocument>;

const HOJA = { ancho: 595.28, alto: 841.89 };
const M = 40;
const ANCHO = HOJA.ancho - M * 2;
const PIE = 54;
const LIMITE = HOJA.alto - M - PIE;

const TINTA = "#1a2744";
const SUAVE = "#6b7280";
const LINEA = "#e5e7eb";

const t = (s: string) => soloLoQueEntra(s);

function colorValido(c: string): string {
  return /^#[0-9a-f]{6}$/i.test(c) ? c : "#2563eb";
}

/** Una imagen cubriendo el rectángulo sin deformarse; `false` si no se pudo abrir. */
function imagenCubriendo(doc: Doc, datos: Buffer, x: number, y: number, ancho: number, alto: number): boolean {
  try {
    const conMedidas = doc as unknown as { openImage(d: Buffer): { width: number; height: number } };
    const img = conMedidas.openImage(datos);
    const escala = Math.max(ancho / img.width, alto / img.height);
    const a = img.width * escala;
    const b = img.height * escala;
    doc.save();
    doc.roundedRect(x, y, ancho, alto, 8).clip();
    doc.image(datos, x + (ancho - a) / 2, y + (alto - b) / 2, { width: a, height: b });
    doc.restore();
    return true;
  } catch {
    return false;
  }
}

/** El logo entra entero (no se recorta): `fit` en una caja. */
function logoEntero(doc: Doc, datos: Buffer, x: number, y: number, ancho: number, alto: number): number | null {
  try {
    const conMedidas = doc as unknown as { openImage(d: Buffer): { width: number; height: number } };
    const img = conMedidas.openImage(datos);
    const escala = Math.min(ancho / img.width, alto / img.height);
    doc.image(datos, x, y + (alto - img.height * escala) / 2, { width: img.width * escala });
    return img.width * escala;
  } catch {
    return null;
  }
}

/** Blanco o negro sobre el acento, el que se lea (un amarillo con tilde blanco no se ve). */
function sobreAcento(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#111111" : "#ffffff";
}

function tilde(doc: Doc, x: number, y: number, acento: string) {
  doc.save();
  doc.circle(x + 6, y + 6, 6).fill(acento);
  doc.moveTo(x + 3.2, y + 6.2).lineTo(x + 5.3, y + 8.3).lineTo(x + 9, y + 4.2)
    .lineWidth(1.5).lineCap("round").lineJoin("round").stroke(sobreAcento(acento));
  doc.restore();
}

export function armarFichaPdf(d: DatosDeLaFichaPdf): Promise<Buffer> {
  const acento = colorValido(d.tienda.acento);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: M, bottom: M, left: M, right: M },
    bufferPages: true,
    info: { Title: t(`Ficha técnica - ${d.vehiculo.nombre}`), Author: t(d.tienda.nombre) },
  });
  const partes: Buffer[] = [];
  doc.on("data", (b: Buffer) => partes.push(b));
  const listo = new Promise<Buffer>((ok, mal) => {
    doc.on("end", () => ok(Buffer.concat(partes)));
    doc.on("error", mal);
  });

  let y = M;
  const lugar = (alto: number) => {
    if (y + alto > LIMITE) { doc.addPage(); y = M; }
  };

  /* ── Encabezado: la concesionaria a la izquierda, qué es esto a la derecha ── */
  let anchoMarca: number | null = null;
  if (d.tienda.logo) anchoMarca = logoEntero(doc, d.tienda.logo, M, y, 150, 34);
  if (anchoMarca == null) {
    doc.font("Helvetica-Bold").fontSize(15).fillColor(TINTA)
      .text(t(d.tienda.nombre), M, y + 9, { width: ANCHO - 140, lineBreak: false, ellipsis: true });
  }
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(acento)
    .text("FICHA TÉCNICA", M + ANCHO - 140, y + 13, { width: 140, align: "right", characterSpacing: 1.5 });
  y += 44;
  doc.rect(M, y, ANCHO, 2).fill(acento);
  y += 16;

  /* ── Foto ── */
  if (d.vehiculo.foto && imagenCubriendo(doc, d.vehiculo.foto, M, y, ANCHO, 250)) {
    if (d.vehiculo.reservado) {
      doc.roundedRect(M + 12, y + 12, 86, 20, 4).fill("#f59e0b");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111")
        .text("RESERVADO", M + 12, y + 18, { width: 86, align: "center", characterSpacing: 0.8 });
    }
    y += 266;
  }

  /* ── Nombre, precio y datos rápidos ── */
  doc.font("Helvetica-Bold").fontSize(20).fillColor(TINTA);
  const nombre = t(d.vehiculo.nombre);
  doc.text(nombre, M, y, { width: ANCHO });
  y += doc.heightOfString(nombre, { width: ANCHO }) + 6;

  doc.font("Helvetica-Bold").fontSize(24).fillColor(acento).text(t(d.vehiculo.precio), M, y, { width: ANCHO });
  y += 32;

  const chips = d.vehiculo.chips.map(t).filter(Boolean);
  if (d.vehiculo.reservado && !d.vehiculo.foto) chips.unshift("Reservado");
  if (chips.length) {
    let x = M;
    doc.font("Helvetica-Bold").fontSize(9);
    for (const c of chips) {
      const w = doc.widthOfString(c) + 18;
      if (x + w > M + ANCHO) { x = M; y += 24; }
      const reservado = c === "Reservado";
      doc.roundedRect(x, y, w, 19, 9.5).fill(reservado ? "#f59e0b" : "#eef2ff");
      doc.fillColor(reservado ? "#111111" : "#3b4f8f").text(c, x + 9, y + 5.5, { lineBreak: false });
      x += w + 6;
    }
    y += 27;
  }
  if (d.vehiculo.ubicacion) {
    doc.font("Helvetica").fontSize(9.5).fillColor(SUAVE).text(t(`Ubicación: ${d.vehiculo.ubicacion}`), M, y, { width: ANCHO });
    y += 18;
  }

  /* ── Secciones ── */
  const titulo = (texto: string) => {
    lugar(70);
    y += 10;
    doc.rect(M, y, 3, 13).fill(acento);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(TINTA)
      .text(texto.toUpperCase(), M + 10, y + 2, { characterSpacing: 1, lineBreak: false });
    y += 22;
  };

  const tabla = (filas: FilaDeFicha[]) => {
    const columnas = 3;
    const anchoCol = ANCHO / columnas;
    for (let i = 0; i < filas.length; i += columnas) {
      lugar(34);
      filas.slice(i, i + columnas).forEach((f, j) => {
        const x = M + j * anchoCol;
        doc.font("Helvetica").fontSize(7.5).fillColor(SUAVE)
          .text(t(f.label).toUpperCase(), x, y, { width: anchoCol - 10, lineBreak: false, ellipsis: true, characterSpacing: 0.4 });
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TINTA)
          .text(t(f.valor), x, y + 11, { width: anchoCol - 10, lineBreak: false, ellipsis: true });
      });
      y += 28;
      doc.moveTo(M, y).lineTo(M + ANCHO, y).lineWidth(0.6).stroke(LINEA);
      y += 6;
    }
  };

  const tildados = (items: string[]) => {
    const columnas = 3;
    const anchoCol = ANCHO / columnas;
    for (let i = 0; i < items.length; i += columnas) {
      lugar(20);
      items.slice(i, i + columnas).forEach((item, j) => {
        const x = M + j * anchoCol;
        tilde(doc, x, y, acento);
        doc.font("Helvetica").fontSize(9.5).fillColor(TINTA)
          .text(t(item), x + 17, y + 1.5, { width: anchoCol - 22, lineBreak: false, ellipsis: true });
      });
      y += 19;
    }
    y += 4;
  };

  if (d.vehiculo.principales.length) { titulo("Datos principales"); tabla(d.vehiculo.principales); }
  if (d.ficha.motor.length) { titulo("Motor y prestaciones"); tabla(d.ficha.motor); }
  if (d.ficha.medidas.length) { titulo("Medidas"); tabla(d.ficha.medidas); }
  if (d.ficha.equipamiento.length) { titulo("Equipamiento"); tildados(d.ficha.equipamiento); }
  if (d.ficha.papeles.length) { titulo("Papeles y condiciones"); tildados(d.ficha.papeles); }

  /* ── El pie, en cada hoja: cómo consultar y de dónde salen los datos ── */
  const fecha = d.fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
  const rango = doc.bufferedPageRange();
  for (let i = rango.start; i < rango.start + rango.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    const yp = HOJA.alto - M - PIE + 14;
    doc.moveTo(M, yp).lineTo(M + ANCHO, yp).lineWidth(0.6).stroke(LINEA);
    const consulta = d.tienda.whatsapp ? `Consultas por WhatsApp: ${d.tienda.whatsapp}` : "Consultá este vehículo en la tienda";
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(TINTA).text(t(consulta), M, yp + 10, { width: ANCHO, lineBreak: false, ellipsis: true });
    doc.font("Helvetica").fontSize(8.5).fillColor(acento).text(t(d.tienda.link), M, yp + 24, { width: ANCHO, lineBreak: false, ellipsis: true, link: d.tienda.link });
    doc.font("Helvetica").fontSize(7.5).fillColor(SUAVE)
      .text(t(`Datos cargados por ${d.tienda.nombre}. Ficha generada el ${fecha}.${rango.count > 1 ? `  ${i + 1}/${rango.count}` : ""}`), M, yp + 37, { width: ANCHO, lineBreak: false, ellipsis: true });
  }

  doc.end();
  return listo;
}
