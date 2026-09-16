/**
 * Lo que no se puede ver: el problema genérico, no el de una landing.
 *
 * ── Por qué hace falta algo genérico ───────────────────────────────────────
 *
 * Los arreglos de `landing-arreglos` conocen dos formas conocidas de romperse
 * (el botón que no lleva al pago, la pregunta que no abre). Pero una landing
 * puede romperse de mil formas, y todas tienen la misma raíz: **el CSS
 * esconde algo y el JavaScript lo mostraba**. Sin el script, eso queda
 * escondido para siempre.
 *
 * Es el mismo hueco en una barra que aparece al bajar, en una ventana
 * emergente, en unas pestañas, en un "ver más", en un carrusel. Cambian los
 * nombres de las clases —que son de quien la escribió— pero no la forma:
 *
 *     .algo            { display: none }           ← lo esconde
 *     .algo.is-open    { display: block }          ← lo mostraba el script
 *
 * Y la marca del script se reconoce sin saber nada de esa landing: la clase
 * que la muestra (`is-open`, `active`, `visible`, lo que sea) **no está
 * escrita en ningún lado del HTML**. Si nadie la tiene puesta y no hay
 * programa que la ponga, ese contenido no existe para quien entra.
 *
 * Eso se puede medir sin adivinar, y es lo que hace esto: aplica el CSS de
 * ella sobre su propio HTML —con un motor de selectores de verdad, no con
 * palabras— y devuelve qué bloques quedan invisibles.
 *
 * ── Lo que NO se cuenta como escondido ─────────────────────────────────────
 *
 * - Lo que esconde un `@media`: eso es diseño responsivo a propósito
 *   ("esta barra sólo en celular"), y se ve en el otro tamaño.
 * - Lo que se muestra al pasar el mouse, al tocar, con un checkbox tildado o
 *   con un `<details>` abierto: la persona puede hacerlo aparecer.
 * - Lo que va adentro de un acordeón que nosotros armamos, y lo marcado con
 *   `data-tienda-aparece`, que lo muestra nuestro script.
 * - Lo que está escondido y NADIE muestra en ningún lado: eso es una clase
 *   de ayuda, no un bloque perdido.
 *
 * Probado en `landing-propia.check.ts`, con pestañas, ventanas emergentes,
 * barras que aparecen al bajar y un caso responsivo que no tiene que saltar.
 */

import { selectAll } from "css-select";
import { Element, type Document } from "domhandler";
import { textContent } from "domutils";
import { MARCA_APARECE, MARCA_BARRA } from "@/lib/landing-efectos";

export type Escondido = {
  /** El elemento, para poder rescatarlo si se puede (`landing-arreglos`). */
  el: Element;
  /** Lo que dice el bloque, recortado: para que lo reconozca. */
  texto: string;
  /** Cuántos botones de comprar quedaron adentro. Si no queda ninguno afuera, eso ya no es un aviso. */
  botonesDePago: number;
};

/** Hasta acá se cuenta: más que esto no es una landing rota, es otra cosa. */
const TOPE = 6;

/* ── Qué declaración esconde y qué declaración muestra ───────────────────── */

const ESCONDE: readonly RegExp[] = [
  /display\s*:\s*none/i,
  /visibility\s*:\s*hidden/i,
  /opacity\s*:\s*0(\.0+)?\s*(;|$|!)/i,
  /max-height\s*:\s*0/i,
  /grid-template-rows\s*:\s*0fr/i,
  /clip-path\s*:\s*inset\(\s*100%/i,
  /transform\s*:[^;]*translate[XY3d]*\(\s*-?1\d\d(\.\d+)?%/i,
];

const MUESTRA: readonly RegExp[] = [
  /display\s*:\s*(block|flex|grid|inline|inline-block|inline-flex|table|list-item)/i,
  /visibility\s*:\s*visible/i,
  /opacity\s*:\s*(1|0\.[89]\d*)\s*(;|$|!)/i,
  /max-height\s*:\s*(?!0(;|$|\s))/i,
  /grid-template-rows\s*:\s*1fr/i,
  /transform\s*:\s*none/i,
  /transform\s*:[^;]*translate[XY3d]*\(\s*0/i,
];

/** Lo que la persona puede provocar sola: no es "escondido para siempre". */
const LO_PUEDE_TOCAR = /:hover|:focus|:focus-within|:focus-visible|:active|:checked|:target|\[open\]|::?details-content/i;

/* ── Leer el CSS ────────────────────────────────────────────────────────── */

type Regla = { selector: string; cuerpo: string; enMedia: boolean };

/**
 * El CSS en reglas, entrando a los `@media` y salteando lo que no tiene
 * selectores (`@keyframes`, `@font-face`). Es un lector tolerante a propósito:
 * lo que no entiende lo saltea, porque esto informa, no dibuja.
 */
export function leerReglas(css: string, enMedia = false): Regla[] {
  const reglas: Regla[] = [];
  let i = 0;
  let desde = 0;
  let nivel = 0;
  let inicioDelBloque = -1;
  while (i < css.length) {
    const c = css[i];
    if (c === "{") {
      if (nivel === 0) inicioDelBloque = i;
      nivel++;
    } else if (c === "}") {
      nivel--;
      if (nivel === 0 && inicioDelBloque >= 0) {
        const selector = css.slice(desde, inicioDelBloque).trim();
        const cuerpo = css.slice(inicioDelBloque + 1, i);
        if (selector.startsWith("@")) {
          /* Adentro de un `@media` o un `@supports` hay más reglas. */
          if (/^@(media|supports|layer|container)\b/i.test(selector)) reglas.push(...leerReglas(cuerpo, true));
        } else if (selector) {
          reglas.push({ selector, cuerpo, enMedia });
        }
        desde = i + 1;
        inicioDelBloque = -1;
      }
      if (nivel < 0) nivel = 0;
    }
    i++;
  }
  return reglas;
}

/** Un selector con comas son varios. Los `::before` no son elementos. */
function selectoresDe(regla: string): string[] {
  return regla
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !s.includes("::") && !s.startsWith("@") && !/^(from|to|\d+%)$/i.test(s));
}

/** Le saca lo que la persona puede provocar, para preguntar a quién alcanza. */
function sinLoQueSeToca(selector: string): string {
  return selector
    .replace(/:(hover|focus-within|focus-visible|focus|active|checked|target)\b/gi, "")
    .replace(/\[open\]/gi, "")
    .trim();
}

/* ── Buscar ─────────────────────────────────────────────────────────────── */

/**
 * El árbol ya limpio y arreglado + su CSS → los bloques que nadie va a poder
 * ver nunca.
 */
export function loQueNoSePuedeVer(doc: Document, css: string): Escondido[] {
  const reglas = leerReglas(css);
  const escondidos = new Set<Element>();
  const mostrados = new Set<Element>();

  for (const regla of reglas) {
    const esconde = ESCONDE.some((re) => re.test(regla.cuerpo));
    const muestra = MUESTRA.some((re) => re.test(regla.cuerpo));
    if (!esconde && !muestra) continue;
    for (const sel of selectoresDe(regla.selector)) {
      if (esconde) {
        /* ⚠️ Una misma regla suele traer las dos cosas: la barra de la
           landing de verdad dice `display:flex` (muestra) y
           `transform:translateY(110%)` (esconde) en el mismo renglón. Lo que
           vale es el resultado, y el resultado es que no se ve. Contarla
           también como "muestra" la dejaba pasar. */
        /* Esconder en un `@media` es diseño responsivo: se ve en otro tamaño. */
        if (!regla.enMedia && !LO_PUEDE_TOCAR.test(sel)) {
          for (const el of alcanzados(sel, doc)) escondidos.add(el);
        }
        continue;
      }
      /* Mostrar cuenta siempre, venga de donde venga: alcanza con que haya
         UNA forma de verlo. */
      for (const el of alcanzados(sinLoQueSeToca(sel), doc)) mostrados.add(el);
    }
  }

  const perdidos: Element[] = [];
  for (const el of escondidos) {
    if (mostrados.has(el)) continue;
    if (nuestro(el)) continue;
    /* Si el que está arriba también está perdido, el bloque es el de arriba:
       no se cuenta dos veces lo mismo. */
    if (algunPadre(el, (p) => escondidos.has(p) && !mostrados.has(p) && !nuestro(p))) continue;
    perdidos.push(el);
  }

  return perdidos
    .map((el) => ({
      el,
      texto: textContent(el).replace(/\s+/g, " ").trim(),
      botonesDePago: alcanzadosEn(el, '[data-tienda="comprar"]').length + (el.attribs["data-tienda"] === "comprar" ? 1 : 0),
    }))
    .filter((x) => x.botonesDePago > 0 || x.texto.length >= 12)
    .map((x) => ({ ...x, texto: x.texto.length > 90 ? `${x.texto.slice(0, 87)}…` : x.texto }))
    .slice(0, TOPE);
}

/**
 * Los que el CSS deja pegados a la pantalla. Es lo que hace falta para
 * reconocer una barra de comprar de las que aparecen al bajar: si además
 * está escondida para siempre, se puede rescatar. Ver `landing-arreglos`.
 */
export function losQueEstanPegados(doc: Document, css: string): Set<Element> {
  const pegados = new Set<Element>();
  for (const regla of leerReglas(css)) {
    if (!/position\s*:\s*(fixed|sticky)/i.test(regla.cuerpo)) continue;
    for (const sel of selectoresDe(regla.selector)) {
      for (const el of alcanzados(sel, doc)) pegados.add(el);
    }
  }
  return pegados;
}

/** Lo que mostramos nosotros: el acordeón que armamos y lo que aparece al bajar. */
function nuestro(el: Element): boolean {
  if (el.attribs[MARCA_APARECE] !== undefined || el.attribs[MARCA_BARRA] !== undefined) return true;
  return algunPadre(el, (p) => p.attribs["data-tienda-acordeon"] !== undefined || p.attribs[MARCA_APARECE] !== undefined || p.attribs[MARCA_BARRA] !== undefined);
}

function algunPadre(el: Element, vale: (p: Element) => boolean): boolean {
  for (let n = el.parent; n; n = n.parent) {
    if (n instanceof Element && vale(n)) return true;
  }
  return false;
}

/** Un selector que el motor no entiende no rompe la subida: no alcanza a nadie. */
function alcanzados(selector: string, doc: Document): Element[] {
  if (!selector) return [];
  try {
    return selectAll(selector, doc.children) as Element[];
  } catch {
    return [];
  }
}

function alcanzadosEn(el: Element, selector: string): Element[] {
  try {
    return selectAll(selector, el) as Element[];
  } catch {
    return [];
  }
}
