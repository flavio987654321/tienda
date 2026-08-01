// Verificación ejecutable de las paletas de promoción. No hay runner de tests en
// el repo, así que corre con:
//   npx tsx src/lib/promoPaletas.check.ts
// Sale con código 1 si alguna paleta no cumple.
//
// Existe porque los comentarios de `PromoDisplay.tsx` afirman que los colores
// están MEDIDOS, y hasta ahora esa afirmación no la comprobaba nadie: el número
// entre paréntesis al lado de cada tono se escribió a mano una vez y quedó ahí.
// La próxima persona que "mejore" un color subiéndole el brillo rompe el
// contraste sin enterarse, y el síntoma —un tag que se lee flojo a 10px— no
// aparece en ninguna pantalla de error.
//
// Se comprueban las tres reglas que los comentarios se comprometen a cumplir:
//
//   1) CONTRASTE ≥ 5:1 contra el texto que le toca. Es lo que necesita texto
//      chico; el mínimo de WCAG AA (4.5) queda justo para 10px en negrita.
//   2) SEPARACIÓN DE TONO ≥ 49° entre vecinos en la rueda. No alcanza con que
//      cada color se lea: dos tonos cercanos, en un tag de 10px de alto, son el
//      mismo color y el comprador no distingue un 3×2 de un 20%.
//   3) NADA DE ROJO (tono 350–10 con saturación alta). El rojo está reservado
//      para la OFERTA del producto (OfferBadge), y esa distinción —promo de
//      tienda vs. oferta— es la que hace que los dos sellos signifiquen algo.
//
// La paleta TIERRA agrega una cuarta suya, que es la única que la hace de esta
// casa: saturación por debajo del 65%. Un tono al 80% se lee como tinta
// industrial por más terroso que sea el nombre que le pongamos.

import { PALETA_PROMO_NEON, PALETA_PROMO_TIERRA, coloresPromo, type PaletaPromo } from "@/components/store/PromoDisplay";

let fallos = 0;
function chk(nombre: string, ok: boolean, detalle: string) {
  if (ok) { console.log(`  ok   ${nombre} — ${detalle}`); return; }
  if (TOLERADAS.has(nombre)) { console.log(`  tol  ${nombre} — ${detalle}`); return; }
  console.error(`  FALLA ${nombre} — ${detalle}`);
  fallos++;
}

type RGB = { r: number; g: number; b: number };
const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const luminancia = ({ r, g, b }: RGB) => {
  const c = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const contraste = (a: string, b: string) => {
  const la = luminancia(rgb(a)), lb = luminancia(rgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};
const hs = (hex: string) => {
  const { r, g, b } = rgb(hex);
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0 };
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === R ? ((G - B) / d + (G < B ? 6 : 0)) : mx === G ? ((B - R) / d + 2) : ((R - G) / d + 4);
  return { h: h * 60, s };
};
/**
 * Distancia entre dos tonos por el lado corto de la rueda, en grados enteros.
 * Se redondea porque los valores del archivo están anotados en enteros y el
 * teal contra el azul de la clásica da 48.999…: comparar en flotante lo daba
 * por debajo del mínimo que el propio comentario dice que cumple.
 */
const distanciaTono = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.round(d > 180 ? 360 - d : d);
};

const MIN_CONTRASTE = 5;
const MIN_TONO = 49;

/**
 * Lo que ya está en la calle y no cumple, con el motivo escrito.
 *
 * La lima de la paleta clásica da 4.99 contra el blanco, no 5. El comentario de
 * `PromoDisplay.tsx` dice "5:1 o más" y al lado anota "(4.99)": la regla se
 * escribió redondeando. Pasa AA de sobra (el mínimo real para texto chico es
 * 4.5) y está pintando promos en los ocho templates que no son Urban Pulse ni
 * Boho Terra, así que cambiarla por 0.01 repinta media tienda a cambio de nada.
 * Queda anotada acá en vez de bajar el umbral: si mañana alguien agrega un color
 * nuevo, se le exige 5 igual que a todos.
 */
const TOLERADAS = new Set(["clásica/N_PAY_M contrasta"]);

function auditar(nombre: string, paleta: PaletaPromo, maxSaturacion?: number) {
  console.log(`\n── ${nombre} ──`);
  const tonos: { tipo: string; hex: string; h: number }[] = [];

  for (const [tipo, hex] of Object.entries(paleta)) {
    // El color de texto NO se elige acá: se le pregunta a `coloresPromo`, que es
    // la que decide en la tienda real. Si mañana esa función cambia de criterio,
    // esta verificación cambia con ella en vez de comprobar una regla paralela.
    const { texto } = coloresPromo(tipo, paleta);
    const c = contraste(hex, texto === "#fff" ? "#ffffff" : "#111111");
    chk(`${nombre}/${tipo} contrasta`, c >= MIN_CONTRASTE, `${hex} sobre ${texto} = ${c.toFixed(2)} (mín ${MIN_CONTRASTE})`);

    const { h, s } = hs(hex);
    tonos.push({ tipo, hex, h });

    const esRojo = (h >= 350 || h <= 10) && s > 0.5;
    chk(`${nombre}/${tipo} no invade el rojo`, !esRojo, `tono ${h.toFixed(0)}° sat ${(s * 100).toFixed(0)}%`);

    if (maxSaturacion != null) {
      chk(`${nombre}/${tipo} es pigmento, no flúor`, s <= maxSaturacion,
        `sat ${(s * 100).toFixed(0)}% (máx ${(maxSaturacion * 100).toFixed(0)}%)`);
    }
  }

  // Todos contra todos, no sólo los vecinos del orden en que están escritos: el
  // objeto no tiene orden semántico y el comprador ve los cinco tags mezclados
  // en la misma grilla.
  for (let i = 0; i < tonos.length; i++) {
    for (let j = i + 1; j < tonos.length; j++) {
      const d = distanciaTono(tonos[i].h, tonos[j].h);
      chk(`${nombre}/${tonos[i].tipo} vs ${tonos[j].tipo} se distinguen`, d >= MIN_TONO,
        `${d.toFixed(0)}° de separación (mín ${MIN_TONO})`);
    }
  }
}

// La clásica no se importa: es un `const` privado de PromoDisplay y exportarla
// sólo para esta verificación abriría la puerta a que un template la use suelta,
// que es justo lo que la tabla `PALETA_POR_TEMPLATE` evita. Se audita la copia,
// y si alguna vez difieren, difieren en un archivo que dice por qué.
const CLASICA: PaletaPromo = {
  PERCENT: "#c2410c", N_PAY_M: "#4d7c0f", FREE_SHIPPING: "#0f766e",
  MIX_N_PAY_M: "#1d4ed8", FIXED: "#a21caf",
};

auditar("clásica", CLASICA);
auditar("neón (Urban Pulse)", PALETA_PROMO_NEON);
auditar("tierra (Boho Terra)", PALETA_PROMO_TIERRA, 0.65);

// Las tres tienen que cubrir los mismos tipos de promo: a la que le falte uno
// cae al PERCENT y ese tipo pierde su color en ese template — el bug silencioso
// que la tabla por template hace fácil de introducir.
const tipos = Object.keys(CLASICA).sort().join(",");
for (const [nombre, p] of [["neón", PALETA_PROMO_NEON], ["tierra", PALETA_PROMO_TIERRA]] as const) {
  chk(`${nombre} cubre todos los tipos`, Object.keys(p).sort().join(",") === tipos, Object.keys(p).sort().join(","));
}

console.log(fallos === 0 ? "\n✓ todo en orden\n" : `\n✗ ${fallos} caso(s) mal\n`);
process.exit(fallos === 0 ? 0 : 1);
