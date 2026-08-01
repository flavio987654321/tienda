// ─────────────────────────────────────────────────────────────────────────────
// El fondo de una sección, en un solo lugar.
//
// Los diez templates leen `sectionColors["bgLoQueSea"]` y lo ponen tal cual en
// `background:` — el atajo de CSS, no `backgroundColor`. Eso significa que un
// degradado guardado ahí se dibuja solo, sin tocarle una línea a ningún
// template ni a los que vengan después. Por eso el degradado se guarda como el
// string de CSS ya armado y no como campos aparte: si fuera un campo nuevo,
// habría que enseñarle a los diez templates a leerlo.
//
// La contra de guardar CSS es que hay que poder leerlo de vuelta para que las
// barras del panel aparezcan donde el usuario las dejó. De eso se encargan
// `serializeBg` y `parseBg`, que son inversas exactas mientras el panel sea el
// único que escribe. Si alguien mete un valor a mano que no reconocemos, no se
// rompe nada: se trata como color plano y se puede pisar.
// ─────────────────────────────────────────────────────────────────────────────

import { parseColor, toHex } from "@/lib/contrast";

/** Hacia dónde se va el difuminado. El color elegido queda en el lado opuesto. */
export type BgDir = "derecha" | "izquierda" | "abajo" | "arriba" | "diagonal";
/** El otro extremo del degradado es el mismo color, más claro o más oscuro. */
export type BgHacia = "claro" | "oscuro";

export type SectionBg =
  | { tipo: "color"; color: string }
  | {
      tipo: "degradado";
      color: string;
      dir: BgDir;
      hacia: BgHacia;
      /** 0 = igual al color; 100 = el extremo llega a blanco o a negro. */
      fuerza: number;
      /** En qué punto arranca el difuminado, en %. Antes de eso es color liso. */
      desde: number;
    };

/** Todos en grados para que el parser sea uno solo. 0deg = hacia arriba. */
const ANGULOS: Record<BgDir, number> = {
  arriba: 0,
  derecha: 90,
  abajo: 180,
  izquierda: 270,
  diagonal: 135,
};

const DIR_POR_ANGULO = Object.fromEntries(
  Object.entries(ANGULOS).map(([dir, deg]) => [deg, dir as BgDir])
) as Record<number, BgDir>;

export const DIR_LABELS: Record<BgDir, { flecha: string; nombre: string }> = {
  derecha:   { flecha: "→", nombre: "Se difumina hacia la derecha" },
  izquierda: { flecha: "←", nombre: "Se difumina hacia la izquierda" },
  abajo:     { flecha: "↓", nombre: "Se difumina hacia abajo" },
  arriba:    { flecha: "↑", nombre: "Se difumina hacia arriba" },
  diagonal:  { flecha: "↘", nombre: "Se difumina en diagonal" },
};

// ─── Aclarar / oscurecer ─────────────────────────────────────────────────────

/**
 * El color del otro extremo: el mismo, mezclado hacia el blanco o hacia el negro.
 *
 * Se mezcla en RGB y no en HSL a propósito. En HSL, aclarar un color saturado le
 * mueve el tono y el gris elegido termina saliendo azulado o rosado en la punta;
 * mezclar hacia blanco/negro da exactamente el tinte que uno espera al mirarlo.
 */
export function extremo(color: string, hacia: BgHacia, fuerza: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  const f = Math.max(0, Math.min(100, fuerza)) / 100;
  const mezcla = (c: number) => (hacia === "claro" ? c + (255 - c) * f : c * (1 - f));
  return toHex({ r: mezcla(rgb.r), g: mezcla(rgb.g), b: mezcla(rgb.b) });
}

/** Deshace `extremo`: con qué fuerza se llegó de `color` a `otro`. */
function fuerzaEntre(color: string, otro: string, hacia: BgHacia): number {
  const a = parseColor(color);
  const b = parseColor(otro);
  if (!a || !b) return 0;
  // Se usa el canal con más recorrido disponible: en los otros, el redondeo a
  // enteros de 0-255 se come la precisión y devolvería una fuerza equivocada.
  const canales: Array<[number, number]> = [[a.r, b.r], [a.g, b.g], [a.b, b.b]];
  let mejor = 0;
  let recorridoMax = 0;
  for (const [c1, c2] of canales) {
    const recorrido = hacia === "claro" ? 255 - c1 : c1;
    if (recorrido <= recorridoMax) continue;
    recorridoMax = recorrido;
    mejor = hacia === "claro" ? (c2 - c1) / recorrido : 1 - c2 / c1;
  }
  // Se redondea al paso de la barra: si no, al reabrir el panel la barra queda
  // un pelo corrida respecto de donde la soltaron.
  return Math.max(0, Math.min(100, Math.round((mejor * 100) / 5) * 5));
}

// ─── Ida y vuelta ────────────────────────────────────────────────────────────

/** El valor CSS que va a `background:`. */
export function serializeBg(bg: SectionBg): string {
  if (bg.tipo === "color") return bg.color;
  // Mientras se escribe el hex a mano hay un instante en que dice "#ab". Metido
  // en un degradado, el CSS entero queda inválido y el navegador descarta el
  // fondo: la sección pega un salto al color por defecto en cada tecla. Con un
  // color a medio escribir se guarda el color solo, y el degradado vuelve en
  // cuanto el valor es válido.
  if (!parseColor(bg.color)) return bg.color;
  const otro = extremo(bg.color, bg.hacia, bg.fuerza);
  return `linear-gradient(${ANGULOS[bg.dir]}deg, ${bg.color} ${bg.desde}%, ${otro} 100%)`;
}

// Solo reconoce EXACTAMENTE lo que escribe `serializeBg`. Cualquier otro
// degradado (uno pegado a mano, o uno de una versión futura con más paradas)
// cae en el camino de "color" y el panel lo deja pisar en vez de mostrar barras
// que no le corresponden.
const CANON = /^linear-gradient\(\s*(\d{1,3})deg,\s*(#[0-9a-fA-F]{6})\s+(\d{1,3})%,\s*(#[0-9a-fA-F]{6})\s+100%\s*\)$/;

export function parseBg(raw: string | undefined | null): SectionBg {
  const s = (raw ?? "").trim();
  const m = s.match(CANON);
  if (!m) return { tipo: "color", color: s };

  const dir = DIR_POR_ANGULO[Number(m[1])];
  if (!dir) return { tipo: "color", color: s };

  const color = m[2].toLowerCase();
  const desde = Math.max(0, Math.min(100, Number(m[3])));
  const otro = m[4].toLowerCase();

  const a = parseColor(color);
  const b = parseColor(otro);
  if (!a || !b) return { tipo: "color", color: s };

  const sumaA = a.r + a.g + a.b;
  const sumaB = b.r + b.g + b.b;
  const hacia: BgHacia = sumaB >= sumaA ? "claro" : "oscuro";

  return { tipo: "degradado", color, dir, hacia, fuerza: fuerzaEntre(color, otro, hacia), desde };
}

/** Los dos extremos del fondo. En un color plano son el mismo. */
export function extremosDe(bg: SectionBg): [string, string] {
  if (bg.tipo === "color") return [bg.color, bg.color];
  return [bg.color, extremo(bg.color, bg.hacia, bg.fuerza)];
}

/**
 * Un color sólido que representa a todo el fondo, para decidir si el texto va
 * claro u oscuro. Con un degradado devuelve el punto medio: el texto se elige
 * UNA vez para toda la sección, así que lo justo es mirar el promedio y no una
 * de las dos puntas.
 *
 * Acepta cualquier string con hexadecimales adentro, no solo los nuestros, para
 * que un degradado escrito a mano tampoco deje el texto a ciegas.
 */
export function colorRepresentativo(raw: string | undefined | null): string {
  const s = (raw ?? "").trim();
  if (!s.includes("gradient")) return s;

  const hexes = s.match(/#[0-9a-fA-F]{3,8}\b/g);
  if (!hexes?.length) return s;

  let r = 0, g = 0, b = 0, n = 0;
  for (const h of hexes) {
    const c = parseColor(h.length > 7 ? h.slice(0, 7) : h);
    if (!c) continue;
    r += c.r; g += c.g; b += c.b; n++;
  }
  return n ? toHex({ r: r / n, g: g / n, b: b / n }) : s;
}

// ── Texto ARRIBA de una FOTO de fondo ────────────────────────────────────────
// Las secciones con foto son el único caso donde el contraste NO se puede medir:
// una foto tiene zonas claras y oscuras a la vez, cambia con cada tienda y el
// navegador no nos deja leerla. Los templates resolvían esto ignorándolo: se
// pintaban con el color de texto del COLOR de la sección —el que se usaría si no
// hubiera foto— y ese color se quedaba fijo aunque la foto lo tapara. Subiendo la
// capa al 10% sobre una foto oscura, el título en marrón desaparecía.
//
// Lo único que sí sabemos es la CAPA que el dueño puso encima, y eso es una
// declaración de intención: si eligió capa OSCURA está empujando la superficie
// hacia el negro, y el texto va claro. Si eligió CLARA, al revés.
//
// Con la capa en "ninguna" devolvemos null a propósito: ahí no hay ninguna señal
// y adivinar sería peor que dejar que el template use la suya.
//
// Ojo con el porcentaje: la intención vale igual con la capa al 10% que al 90%,
// pero al 10% la foto sigue mandando y NINGÚN color de texto alcanza solo. Por
// eso va de la mano de `sombraSobreFoto`, que es lo que de verdad salva ese caso.

export type CapaDeFoto = { overlayType?: "none" | "dark" | "light" } | undefined | null;

/** "clara" = texto claro sobre superficie oscura. null = no hay señal, decidí vos. */
export function tintaSobreFoto(capa: CapaDeFoto, hayFoto: boolean): "clara" | "oscura" | null {
  if (!hayFoto) return null;
  if (capa?.overlayType === "dark")  return "clara";
  if (capa?.overlayType === "light") return "oscura";
  return null;
}

/**
 * El halo que sostiene al texto cuando la capa es floja y la foto se ve entera.
 *
 * Es lo que hace que el bloque siga siendo legible con la capa al 10%, que es
 * justo donde elegir bien el color no alcanza: sobre una foto con un farol
 * encendido al lado de una sombra, cualquier color pierde en alguna parte.
 *
 * Va en la dirección contraria a la tinta —halo oscuro detrás del texto claro y
 * al revés— y con radio generoso y sin desplazamiento, para que se lea como
 * profundidad y no como una sombra dura de los 2000.
 */
export function sombraSobreFoto(tinta: "clara" | "oscura"): string {
  return tinta === "clara"
    ? "0 1px 12px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.45)"
    : "0 1px 12px rgba(255,255,255,0.65), 0 1px 3px rgba(255,255,255,0.55)";
}
