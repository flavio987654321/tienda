/**
 * Los arreglos: lo que acomodamos solos mientras se sube.
 *
 * ── Por qué ────────────────────────────────────────────────────────────────
 *
 * Una landing hecha para otro lado da por sentado que va a tener un programa
 * corriendo al lado. Acá no lo tiene: el JavaScript se saca entero (ver
 * `landing-propia`). Eso deja cosas que se VEN bien y no funcionan, que es lo
 * peor que le puede pasar a una página de venta.
 *
 * Medido sobre un archivo de verdad, de los que genera otra plataforma:
 *
 *   - 6 botones de comprar que eran links a `#oferta` ("bajá hasta la
 *     oferta"). Adentro de un Shadow DOM el salto por ancla NO funciona: el
 *     navegador le pone `#oferta` a la dirección y la página no se mueve.
 *     Seis botones muertos, todos los de comprar.
 *   - 11 preguntas frecuentes con 0 respuestas visibles. El acordeón era un
 *     `<button>` que un script abría; sin el script el CSS las deja
 *     escondidas para siempre. Una sección entera perdida.
 *
 * Avisar de eso no alcanza: hay que arreglarlo. Y se arregla mecánicamente,
 * sin adivinar y sin inventar nada, que es lo que se puede explicar después
 * en una línea ("conectamos estos 3 botones porque decían COMPRAR").
 *
 * ── Qué NO hace ────────────────────────────────────────────────────────────
 *
 * No toca el diseño, no reescribe el texto y no borra nada. Sólo enchufa lo
 * que quedó suelto y devuelve el recibo en castellano para mostrarlo en el
 * panel. Lo que no se puede arreglar sin adivinar —una flecha de carrusel,
 * un link a una sección— se cuenta, no se rompe más.
 *
 * Corre en el servidor, sobre el árbol ya limpio, antes de dibujarlo.
 * Probado en `landing-propia.check.ts`.
 */

import { Element, type ChildNode, type Document } from "domhandler";
import { findAll, textContent, appendChild, replaceElement, removeElement } from "domutils";

/** La marca que deja `limpiarLanding` en un `<button>` que pasó a `<span>`. */
export const ERA_BOTON = "data-tienda-era";

export type Arreglos = {
  /** El recibo, en castellano, para el panel. Una línea por arreglo. */
  hechos: string[];
  /** Lo que quedó sin función y no se puede arreglar sin adivinar. */
  sueltos: string[];
  /** CSS nuestro, al final de la hoja: hace falta para que el acordeón se vea. */
  css: string;
};

/* ── Qué texto es "comprar" ─────────────────────────────────────────────── */

/**
 * Un botón que dice esto y no lleva a ningún lado, quiere llevar al pago.
 * Es a propósito una lista corta: preferimos dejar uno sin conectar (el
 * panel lo va a marcar) antes que mandar al checkout a alguien que tocó
 * "ver el temario".
 */
const DICE_COMPRAR = /\b(comprar|compro|comprarlo|lo quiero|la quiero|los quiero|las quiero|quiero mi|quiero mis|quiero el|quiero la|quiero los|quiero las|quiero acceder|quiero aprovechar|quiero empezar|dame acceso|acceder ahora|acceso inmediato|obtener|obtenelo|consegu[íi]lo|llevatelo|lo llevo|empezar ahora|comenzar ahora|inscribirme|anotarme|sumarme|unirme|pagar|comprá|compralo|quiero sumarme)\b/i;

/** Una pregunta no es un botón de comprar, aunque diga "comprar". */
function pareceCta(texto: string): boolean {
  const t = texto.replace(/\s+/g, " ").trim();
  if (!t || t.length > 42) return false;
  if (/[?¿]/.test(t)) return false;
  return DICE_COMPRAR.test(t);
}

/** Lo que puede ser la respuesta de una pregunta: un bloque con contenido. */
const BLOQUES = ["div", "p", "section", "article", "ul", "ol", "dl", "aside", "figure", "blockquote"];

/**
 * Un link a otra parte de la misma página está VIVO si su destino existe y
 * no se lo tragó a él mismo.
 *
 * Lo segundo importa más de lo que parece: en estos archivos los botones de
 * comprar suelen apuntar a la sección de la oferta, y el que ya está ADENTRO
 * de esa sección no tiene a dónde bajar. Ése es el que cobra, y por eso es el
 * que se conecta al pago.
 *
 * (Que el salto funcione no es gratis: adentro de la cápsula el navegador no
 * lo hace solo. Lo hace el script de `landing-efectos`.)
 */
function anclaViva(el: Element, porId: Map<string, Element>): boolean {
  const h = (el.attribs.href ?? "").trim();
  if (!h.startsWith("#") || h.length < 2) return false;
  const destino = porId.get(h.slice(1));
  return !!destino && destino !== el && !contieneA(destino, el);
}

function contieneA(padre: Element, hijo: Element): boolean {
  for (let n = hijo.parent; n; n = n.parent) if (n === padre) return true;
  return false;
}

/* ── El CSS del acordeón rescatado ──────────────────────────────────────── */

/**
 * El `<details>` que armamos hereda el CSS que la landing le había puesto al
 * botón y a la respuesta — por eso se conserva la clase: el acordeón sigue
 * viéndose como ella lo diseñó. Lo único que hay que forzar es que la
 * respuesta se VEA cuando está abierto: el CSS original la escondía con
 * `visibility:hidden` y `grid-template-rows:0fr`, y la abría agregando una
 * clase con el script que ya no está.
 */
const CSS_DEL_ACORDEON = `
[data-tienda-acordeon]{display:block}
[data-tienda-acordeon]>summary{cursor:pointer;list-style:none}
[data-tienda-acordeon]>summary::-webkit-details-marker{display:none}
[data-tienda-acordeon]>summary::marker{content:""}
[data-tienda-acordeon][open]>:not(summary){visibility:visible!important;grid-template-rows:1fr!important;max-height:none!important;opacity:1!important}
`.trim();

/* ── Arreglar ───────────────────────────────────────────────────────────── */

/**
 * El árbol limpio → el árbol enchufado. Lo modifica en el lugar y devuelve
 * el recibo.
 */
export function arreglarLanding(doc: Document): Arreglos {
  const hechos: string[] = [];
  const sueltos: string[] = [];
  let css = "";

  const todos = () => findAll(() => true, doc.children);
  const textoDe = (el: Element) => textContent(el).replace(/\s+/g, " ").trim();
  const recorte = (t: string) => (t.length > 34 ? `${t.slice(0, 31)}…` : t);
  const conComillas = (ts: string[]) => ts.slice(0, 3).map((t) => `«${recorte(t)}»`).join(", ") + (ts.length > 3 ? " y más" : "");

  /* ── 1. Los botones de comprar que no llevaban al pago ───────────────── */

  const porId = new Map<string, Element>();
  for (const el of todos()) if (el.attribs.id && !porId.has(el.attribs.id)) porId.set(el.attribs.id, el);
  const vivas = todos().filter((el) => el.name === "a" && anclaViva(el, porId));

  const conectados: string[] = [];
  for (const el of todos()) {
    if (el.attribs["data-tienda"]) continue;
    const esExBoton = el.attribs[ERA_BOTON] === "boton";
    const esLinkMuerto = el.name === "a" && !vivas.includes(el);
    if (!esExBoton && !esLinkMuerto) continue;
    const t = textoDe(el);
    if (!pareceCta(t)) continue;
    /* Pasa a ser un link de compra: el destino lo pone `armarLanding`. */
    el.name = "a";
    el.attribs["data-tienda"] = "comprar";
    el.attribs.href = "#";
    delete el.attribs.role;
    delete el.attribs.target;
    delete el.attribs.rel;
    delete el.attribs[ERA_BOTON];
    conectados.push(t);
  }
  if (conectados.length) {
    hechos.push(
      `Conectamos ${conectados.length} ${conectados.length === 1 ? "botón que no llevaba" : "botones que no llevaban"} a ningún lado: ${conComillas(conectados)}. ` +
      `Ahora ${conectados.length === 1 ? "va" : "van"} a tu página de pago.`,
    );
  }

  /* Los que apuntaban a una sección que no existe quedan como link vacío:
     así el panel le ofrece completarlos en vez de dejarlos mudos. */
  for (const el of todos()) {
    if (el.name !== "a" || el.attribs["data-tienda"]) continue;
    const h = (el.attribs.href ?? "").trim();
    if (h.startsWith("#") && h.length > 1 && !vivas.includes(el)) el.attribs.href = "#";
  }

  /* Y los que sí bajan a una sección ahora bajan de verdad. */
  if (vivas.length) {
    hechos.push(
      `${vivas.length} ${vivas.length === 1 ? "link baja" : "links bajan"} a otra parte de tu página: ${conComillas(vivas.map(textoDe).filter(Boolean))}. ` +
      `Adentro de tu página ese salto no anda solo, así que lo hacemos nosotros — y baja suave.`,
    );
  }

  /* ── 2. El acordeón de preguntas ─────────────────────────────────────── */

  let acordeones = 0;
  for (const el of todos()) {
    if (el.attribs["data-tienda"]) continue;
    if (el.attribs[ERA_BOTON] !== "boton" && el.attribs["aria-expanded"] === undefined) continue;
    const padre = el.parent;
    if (!padre || !("children" in padre)) continue;
    /* Tres señales de que esto abría algo, y alcanza con una: lo dice el
       propio HTML (`aria-expanded`), el texto es una pregunta, o la clase lo
       nombra. Sin ninguna, un botón seguido de cualquier cosa se
       convertiría en acordeón, que es adivinar. */
    const t = textoDe(el);
    const clases = `${el.attribs.class ?? ""} ${padre.type === "tag" ? (padre as Element).attribs.class ?? "" : ""}`;
    const abriaAlgo = el.attribs["aria-expanded"] !== undefined || /^¿|\?$/.test(t) || /faq|acorde|accordion|pregunta|collaps|toggle|desplega/i.test(clases);
    if (!abriaAlgo) continue;
    /* Si el de al lado —antes o después— es otro botón, esto es una barra de
       pestañas y no un acordeón: ahí sí estaríamos adivinando. */
    if (esOtroBoton(anteriorElemento(el))) continue;
    /* Y lo de al lado tiene que ser un bloque de contenido, no un link. */
    const respuesta = siguienteElemento(el);
    if (!respuesta || !BLOQUES.includes(respuesta.name) || esOtroBoton(respuesta)) continue;
    if (!t || !textoDe(respuesta)) continue;

    const detalle = new Element("details", { "data-tienda-acordeon": "" });
    const resumen = new Element("summary", el.attribs.class ? { class: el.attribs.class } : {});
    for (const hijo of [...el.children]) appendChild(resumen, hijo as ChildNode);
    replaceElement(el, detalle);
    removeElement(respuesta);
    appendChild(detalle, resumen);
    appendChild(detalle, respuesta);
    acordeones++;
  }
  if (acordeones) {
    css += CSS_DEL_ACORDEON;
    hechos.push(
      `Rescatamos ${acordeones} ${acordeones === 1 ? "pregunta que se abría" : "preguntas que se abrían"} con un programa: ` +
      `${acordeones === 1 ? "su respuesta no se veía" : "sus respuestas no se veían"} y ahora ${acordeones === 1 ? "abre" : "abren"} al tocarlas, con el mismo diseño.`,
    );
  }

  /* ── 3. Lo que quedó sin función ─────────────────────────────────────── */

  const mudos: string[] = [];
  for (const el of todos()) {
    if (el.attribs[ERA_BOTON] !== "boton") continue;
    delete el.attribs[ERA_BOTON];
    /* El nombre accesible primero: un botón que sólo tiene una flecha
       adentro se reconoce por su aria-label, no por su texto («›»). */
    mudos.push((el.attribs["aria-label"] ?? "").trim() || textoDe(el) || "sin texto");
  }
  if (mudos.length) {
    sueltos.push(
      `${mudos.length} ${mudos.length === 1 ? "botón necesitaba" : "botones necesitaban"} un programa para hacer algo (${conComillas(mudos)}): ` +
      `${mudos.length === 1 ? "quedó" : "quedaron"} como texto. Si no ${mudos.length === 1 ? "hace" : "hacen"} falta, pedile a Claude que ${mudos.length === 1 ? "lo saque" : "los saque"}.`,
    );
  }

  return { hechos, sueltos, css };
}

/** Otro botón de los que quedaron sin programa. */
function esOtroBoton(el: Element | null): boolean {
  return !!el && (el.attribs[ERA_BOTON] === "boton" || el.attribs["aria-expanded"] !== undefined);
}

/** El hermano de al lado que es una etiqueta (saltea los espacios en blanco). */
function siguienteElemento(el: Element): Element | null {
  let n: ChildNode | null = el.next;
  while (n) {
    if (n instanceof Element) return n;
    n = n.next;
  }
  return null;
}

/** El de atrás, igual que `siguienteElemento`. */
function anteriorElemento(el: Element): Element | null {
  let n: ChildNode | null = el.prev;
  while (n) {
    if (n instanceof Element) return n;
    n = n.prev;
  }
  return null;
}
