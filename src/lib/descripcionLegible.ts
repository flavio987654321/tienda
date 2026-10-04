/* ══════════════════════════════════════════════════════════════════════════
   COLORES DE LA DESCRIPCIÓN QUE NO SE LEEN SOBRE EL FONDO
   ══════════════════════════════════════════════════════════════════════════

   La descripción del producto la escribe la dueña en el editor de texto, y ese
   editor guarda el color con el que escribió adentro del HTML
   (`<span style="color:#111827">`). El editor es blanco, así que lo normal es
   que guarde un casi negro. En un template claro no se nota; sobre un fondo
   oscuro (Aurora, Urban Pulse, Auto Motor) ese texto desaparece. Pasó en
   tiendaapps con Aurora el 04/10/26. Y al revés: letra blanca guardada sobre
   un template claro.

   Se saca el color SÓLO si no llega a 3:1 contra el fondo donde se dibuja; ahí
   el texto toma el color normal del template. Un rojo o un verde que la dueña
   eligió y se leen, quedan. Lo que no se puede medir (un nombre de color,
   `var(...)`) se deja como está.

   Cada lugar que dibuja una descripción la pasa por acá con SU fondo. */

function aHex(valor: string): string | null {
  const v = valor.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v)) return v;
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(v);
  if (!m) return null;
  return "#" + [m[1], m[2], m[3]].map(n => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("");
}

/** Contraste WCAG entre dos colores #rrggbb / #rgb: (L1 + 0.05) / (L2 + 0.05). */
function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.length === 4 ? hex.slice(1).split("").map(c => c + c).join("") : hex.slice(1);
    const [r, g, bl] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function descripcionLegible(html: string, fondo: string): string {
  const fondoHex = aHex(fondo);
  // Sin un fondo que se pueda medir, no se toca nada: mejor el texto como lo
  // guardaron que sacarle un color que quizás se leía.
  if (!html || !fondoHex) return html;
  // Sólo adentro de un atributo `style="…"`: un texto que diga "Color: negro"
  // no se toca. Y `(?<![-\w])` para que sea `color:` y no `background-color:`.
  return html.replace(/(\sstyle\s*=\s*)(["'])(.*?)\2/gi, (_, antes: string, comilla: string, estilo: string) => {
    const limpio = estilo.replace(/(?<![-\w])color\s*:\s*([^;]+);?/gi, (entera, valor: string) => {
      const hex = aHex(valor);
      if (!hex) return entera;
      return contraste(hex, fondoHex) < 3 ? "" : entera;
    });
    return `${antes}${comilla}${limpio}${comilla}`;
  });
}
