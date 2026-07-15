// Autos/motos quedan afuera de la ruleta de gamificación a propósito.
export const GAMIFICATION_EXCLUDED_TEMPLATES = new Set(["auto-motor", "auto-drive"]);

// ─── Ruleta: helpers compartidos ─────────────────────────────────────────────
// La ruleta se dibuja en dos lugares distintos: SVG en la vista previa del
// editor y canvas en la tienda real. Antes cada uno tenía su propia copia de
// esta lógica y se desincronizaron (texto blanco fijo, texto boca abajo y
// recorte a 10 caracteres, iguales en ambos). Vive acá para que haya una sola
// fuente de verdad.

/** Luminancia relativa (WCAG 2.1). `null` si el color no es un hex válido. */
function luminance(hex: string): number | null {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const channel = (i: number) => {
    const s = parseInt(full.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/**
 * Color de texto legible sobre `bg`: blanco o casi negro, el que contraste más.
 * Reemplaza al blanco hardcodeado, que se volvía ilegible sobre sectores
 * claros (el amarillo de Girly Store, por ejemplo).
 */
export function readableTextOn(bg: string): string {
  const L = luminance(bg);
  if (L === null) return "#ffffff";
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? "#ffffff" : "#111827";
}

/**
 * Capa translúcida (bordes, fondos de inputs) que se note sobre `bg`: clara
 * sobre fondos oscuros y oscura sobre fondos claros. Antes estaba fija en
 * blanco, así que sobre un popup de color claro los campos desaparecían.
 */
export function overlayOn(bg: string, alpha: number): string {
  return readableTextOn(bg) === "#ffffff"
    ? `rgba(255,255,255,${alpha})`
    : `rgba(0,0,0,${alpha})`;
}

/**
 * Corrige un ángulo (radianes) para que el texto nunca quede cabeza abajo: si
 * quedaría invertido, lo gira media vuelta. Sin esto, los sectores de la mitad
 * inferior de la ruleta mostraban el texto al revés.
 */
export function uprightAngle(rad: number): number {
  const norm = Math.atan2(Math.sin(rad), Math.cos(rad)); // normaliza a (-π, π]
  return norm > Math.PI / 2 || norm < -Math.PI / 2 ? rad + Math.PI : rad;
}

/**
 * Ancho real disponible para el texto de un sector: la cuerda del sector a la
 * altura del radio donde se dibuja, con un margen para no tocar los bordes.
 */
export function wheelTextMaxWidth(r: number, segments: number, textRadiusRatio: number): number {
  const step = (2 * Math.PI) / Math.max(segments, 1);
  return 2 * r * textRadiusRatio * Math.sin(Math.min(step, Math.PI) / 2) * 0.82;
}

/**
 * Ajusta una etiqueta al ancho disponible: primero achica la tipografía y solo
 * recorta si aún no entra con el tamaño mínimo legible. Antes se recortaba a 10
 * caracteres a ciegas, sin medir, así que el texto largo igual se desbordaba.
 * `measure` permite usar la medición real del canvas; sin ella se estima.
 */
export function fitWheelText(
  label: string,
  maxWidth: number,
  baseFont: number,
  minFont: number,
  measure?: (text: string, font: number) => number,
): { text: string; fontSize: number } {
  const width = measure ?? ((t: string, f: number) => t.length * f * 0.58);
  const clean = label.trim();
  if (!clean) return { text: "", fontSize: baseFont };

  let fontSize = baseFont;
  while (fontSize > minFont && width(clean, fontSize) > maxWidth) fontSize -= 0.5;
  if (width(clean, fontSize) <= maxWidth) return { text: clean, fontSize };

  let text = clean;
  while (text.length > 1 && width(`${text}…`, fontSize) > maxWidth) text = text.slice(0, -1);
  return { text: `${text}…`, fontSize };
}
