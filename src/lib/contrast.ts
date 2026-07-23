// ─────────────────────────────────────────────────────────────────────────────
// Contraste entre un texto y su fondo.
//
// `getContrastColor` (EditContext) contesta otra pregunta: "sobre este fondo,
// ¿el texto va claro u oscuro?". Sirve para elegir automáticamente. Acá hace
// falta algo distinto: la persona YA eligió un color, y queremos saber si de
// verdad se lee — y si no, ofrecerle el más parecido que sí.
//
// Se usa la fórmula de contraste de WCAG, que no es el promedio simple de los
// tres canales: el ojo humano ve el verde mucho más brillante que el azul, y sin
// esa corrección un texto amarillo sobre blanco daría "bien" cuando en la
// práctica no se lee.
// ─────────────────────────────────────────────────────────────────────────────

export type RGB = { r: number; g: number; b: number };

/** Acepta "#abc", "#aabbcc" y "rgb(1, 2, 3)" / "rgba(1, 2, 3, .5)". */
export function parseColor(input: string): RGB | null {
  const s = (input ?? "").trim();
  if (!s) return null;

  const rgb = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };

  let hex = s.startsWith("#") ? s.slice(1) : s;
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null;
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Luminancia relativa de WCAG: corrige la gamma y pesa cada canal como lo ve el ojo. */
function luminance({ r, g, b }: RGB): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** De 1 (idénticos, ilegible) a 21 (negro sobre blanco). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Mínimo de WCAG AA para texto normal. Debajo de esto mucha gente no lo lee. */
export const MIN_LEGIBLE = 4.5;
/** Los títulos grandes son más fáciles de leer, así que se les pide menos. */
export const MIN_LEGIBLE_GRANDE = 3;

// ─── Sugerencia ──────────────────────────────────────────────────────────────

function toHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === R ? ((G - B) / d + (G < B ? 6 : 0)) :
    max === G ? ((B - R) / d + 2) :
                ((R - G) / d + 4);
  return { h: h * 60, s, l };
}

function fromHsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60  ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

/**
 * El color MÁS PARECIDO al elegido que llega al contraste pedido.
 *
 * Mantiene el tono y la saturación y solo mueve la luminosidad — así el rojo
 * sigue siendo rojo. Devolver blanco o negro sería más fácil, pero le estaría
 * cambiando el color a la persona en vez de corregírselo.
 *
 * Prueba en las dos direcciones y se queda con la que menos lo aleja del
 * original. Devuelve null si ni el negro ni el blanco alcanzan — pasa cuando el
 * fondo es un gris medio, y ahí el problema es el fondo, no el texto.
 */
export function nearestLegible(color: RGB, fondo: RGB, minimo = MIN_LEGIBLE): string | null {
  if (contrastRatio(color, fondo) >= minimo) return toHex(color);

  const { h, s, l } = toHsl(color);
  let mejor: { rgb: RGB; distancia: number } | null = null;

  for (const paso of [-0.02, 0.02]) {
    for (let i = 1; i <= 50; i++) {
      const nl = l + paso * i;
      if (nl < 0 || nl > 1) break;
      const cand = fromHsl(h, s, nl);
      if (contrastRatio(cand, fondo) >= minimo) {
        const distancia = Math.abs(nl - l);
        if (!mejor || distancia < mejor.distancia) mejor = { rgb: cand, distancia };
        break;
      }
    }
  }
  return mejor ? toHex(mejor.rgb) : null;
}
