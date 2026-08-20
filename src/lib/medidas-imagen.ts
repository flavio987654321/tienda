/**
 * Cuánto mide una imagen, leyendo su encabezado.
 *
 * ── Por qué a mano y no con una librería ─────────────────────────────────────
 * `sharp` está en node_modules, pero como dependencia de Next, no nuestra. Usarla
 * es apoyarse en algo que puede desaparecer en un `next upgrade` sin que nadie lo
 * decida: el día que Next cambie de optimizador, las subidas dejan de andar.
 * Agregar `image-size` sería una dependencia más para leer ocho bytes.
 *
 * Los cuatro formatos que acepta la subida guardan el tamaño en los primeros
 * bytes del archivo, en un lugar fijo y documentado. No hace falta decodificar la
 * imagen — de hecho no se decodifica: se leen unos pocos bytes del principio.
 *
 * ── Para qué sirve ───────────────────────────────────────────────────────────
 * Una foto de 285px puesta donde el diseño necesita 844px se ve borrosa en
 * cualquier celular moderno. El optimizador de Next pide el ancho correcto
 * (`w=1200`) y recibe lo que hay: no puede agrandar lo que no está. Medido en una
 * tienda real, banners de 285px llenando huecos de 844px.
 *
 * Quien sube la foto no se entera: en su monitor se ve bien. Con esto, se entera.
 */

export type MedidasImagen = { ancho: number; alto: number } | null;

export function medirImagen(bytes: Buffer): MedidasImagen {
  return medirPng(bytes) ?? medirGif(bytes) ?? medirWebp(bytes) ?? medirJpeg(bytes);
}

/* PNG: firma de 8 bytes, después el chunk IHDR, y ahí ancho y alto como enteros
   de 32 bits big-endian en las posiciones 16 y 20. */
function medirPng(b: Buffer): MedidasImagen {
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null; // \x89PNG
  if (b.toString("ascii", 12, 16) !== "IHDR") return null;
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

/* GIF: "GIF87a" o "GIF89a" y después ancho y alto de 16 bits LITTLE-endian. */
function medirGif(b: Buffer): MedidasImagen {
  if (b.length < 10) return null;
  const firma = b.toString("ascii", 0, 6);
  if (firma !== "GIF87a" && firma !== "GIF89a") return null;
  return { ancho: b.readUInt16LE(6), alto: b.readUInt16LE(8) };
}

/* WebP: contenedor RIFF con tres variantes, y cada una guarda el tamaño distinto.
   VP8 (con pérdida), VP8L (sin pérdida) y VP8X (extendido, el de animados y
   transparencia). Hay que atender las tres: el editor de fotos que use cada
   comerciante decide cuál sale. */
function medirWebp(b: Buffer): MedidasImagen {
  if (b.length < 30) return null;
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const tipo = b.toString("ascii", 12, 16);

  if (tipo === "VP8 ") {
    // Los 14 bits bajos de cada uno; los 2 altos son la escala.
    return { ancho: b.readUInt16LE(26) & 0x3fff, alto: b.readUInt16LE(28) & 0x3fff };
  }
  if (tipo === "VP8L") {
    // 14 bits para el ancho y 14 para el alto, empaquetados en 4 bytes, y
    // guardados con uno menos que el valor real.
    const n = b.readUInt32LE(21);
    return { ancho: (n & 0x3fff) + 1, alto: ((n >> 14) & 0x3fff) + 1 };
  }
  if (tipo === "VP8X") {
    // Enteros de 24 bits little-endian, también guardados con uno menos.
    const leer24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
    return { ancho: leer24(24) + 1, alto: leer24(27) + 1 };
  }
  return null;
}

/* JPEG: no tiene el tamaño en un lugar fijo. Hay que recorrer los segmentos
   hasta encontrar un "Start Of Frame", que es el que lo declara. Los SOF van de
   C0 a CF salteando C4, C8 y CC, que son otra cosa (tablas Huffman y demás). */
function medirJpeg(b: Buffer): MedidasImagen {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; } // relleno entre segmentos
    const marca = b[i + 1];
    if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) { i += 2; continue; }
    const largo = b.readUInt16BE(i + 2);
    if (largo < 2) return null;
    const esSof = marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc;
    if (esSof) return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    i += 2 + largo;
  }
  return null;
}

/**
 * Cuánto necesita medir una foto para no verse borrosa.
 *
 * ── Cómo salió el número ─────────────────────────────────────────────────────
 * Midiendo tiendas reales en un celular común (Pixel 5: 393px de pantalla con
 * densidad 2.75x). Los huecos que hay que llenar son dos:
 *
 *   grilla de productos → 638px
 *   banner a lo ancho   → 844px, y hasta 1081px en el más grande
 *
 * El primer intento fue 1200px, para cubrir el banner con aire. Estaba mal: al
 * probarlo contra doce fotos reales de las tiendas marcó DIEZ como borrosas,
 * incluida una de 1199x1600 — que se ve perfecta. Una foto de producto sacada
 * con un celular sale entre 900 y 1200px de ancho, y en la grilla le sobra.
 *
 * Un aviso que salta en el 80% de las fotos no avisa nada: se vuelve un cartel
 * que se aprende a ignorar, y el día que aparezca por una foto de verdad mala
 * tampoco se va a mirar. Con 800 se cubre la grilla con margen y de esas mismas
 * doce fotos no se marca ninguna — pero el banner de 285px que dio origen a todo
 * esto sí se marca.
 *
 * No es un mínimo obligatorio: hay fotos que legítimamente son chicas —un logo,
 * un ícono— y bloquear la subida por eso sería peor que el problema. Es un aviso.
 */
export const ANCHO_RECOMENDADO = 800;

/** El aviso para mostrarle a quien sube, o null si la foto está bien. */
export function avisoDeFotoChica(medidas: MedidasImagen): string | null {
  if (!medidas) return null; // formato que no supimos leer: mejor callarse que mentir
  if (medidas.ancho >= ANCHO_RECOMENDADO) return null;
  return `Esta imagen mide ${medidas.ancho}px de ancho. En pantallas de celular se va a ver borrosa — lo ideal son ${ANCHO_RECOMENDADO}px o más de ancho.`;
}
