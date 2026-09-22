/**
 * Los links legales del pie de la landing propia.
 *
 * La vendedora ya cargó sus términos, su privacidad y sus devoluciones en
 * Configuración → Legales, y se muestran en una página nuestra por producto
 * (`/p/<id>/legales?tipo=…`), con el botón de arrepentimiento siempre
 * presente. Su landing trae esos links vacíos (`href="#"`), y hasta el
 * 21/09/26 el panel le pedía que escribiera a mano una dirección que no
 * tiene por qué conocer. Ahora se reconocen por el texto y se llenan solos
 * con la página nuestra; si prefiere otra dirección (una que ya tenga en su
 * web), la escribe y gana la suya.
 *
 * El de arrepentimiento no tiene opción: es siempre el nuestro. La
 * Resolución 424/2020 exige el botón en el sitio, y una landing sin él
 * incumple. Si el archivo no lo trae, `armarLanding` lo agrega al final.
 *
 * Puro: sin base ni React, para que lo compartan el panel, el servidor y los
 * chequeos.
 */

import type { Document, Element } from "domhandler";
import { findAll, textContent } from "domutils";
import { CLAVE_ARREPENTIMIENTO, type ClaveDigital } from "@/lib/politicas-tienda";

export type ClaveLegalDelPie = ClaveDigital | typeof CLAVE_ARREPENTIMIENTO;

/* El texto del link, sin acentos ni mayúsculas, contra lo que suele decir.
   "Términos y condiciones", "Términos de uso", "Condiciones de compra";
   "Política de privacidad", "Privacidad", "Datos personales"; "Política de
   reembolso", "Devoluciones", "Garantía", "Cambios y devoluciones";
   "Botón de arrepentimiento", "Arrepentimiento". */
const PATRONES: readonly [ClaveLegalDelPie, RegExp][] = [
  [CLAVE_ARREPENTIMIENTO, /arrepent/],
  ["privacidad", /privacidad|datos personales|proteccion de datos/],
  ["devoluciones", /reembolso|devoluci|garantia|cambios/],
  ["terminos", /termino|condicion/],
];

/** Qué documento legal es este link, por lo que dice; null si no es legal. */
export function legalDelLink(texto: string): ClaveLegalDelPie | null {
  const t = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!t || t.length > 80) return null;
  for (const [clave, re] of PATRONES) if (re.test(t)) return clave;
  return null;
}

/**
 * Qué documento legal es este `<a>` del archivo, o null si no es un link
 * legal. Mira el texto (`legalDelLink`) y descarta dos cosas que dicen
 * "garantía" sin ser el link de la política:
 *
 *   - un hueco nuestro (`data-tienda`): el botón de comprar suele decir
 *     «Quiero mi guía — garantía de 7 días»;
 *   - un ancla a una sección de la misma página (`#garantia`): lleva al
 *     bloque de la garantía, no a la política.
 *
 * Sin esto, la auditoría del 21/09/26 encontró que con un botón así la
 * política de devoluciones no se agregaba nunca, y que los legales que
 * faltaban se metían al lado del ancla, en la barra de navegación, en vez
 * del pie.
 */
export function legalDelElemento(el: Element): ClaveLegalDelPie | null {
  if (el.name !== "a" || el.attribs["data-tienda"] !== undefined) return null;
  if (/^#./.test((el.attribs.href ?? "").trim())) return null;
  return legalDelLink(textContent(el));
}

/** La dirección de la página legal de ESE producto. Relativa: vale en el dominio de la plataforma y en el propio. */
export function urlDeLegal(productId: string, clave: ClaveLegalDelPie): string {
  return `/p/${encodeURIComponent(productId)}/legales?tipo=${clave}`;
}

/** Lo que se le dice en el panel cuando un documento no está cargado. */
export function faltaElDocumento(clave: ClaveLegalDelPie, publicados: readonly string[]): boolean {
  return clave !== CLAVE_ARREPENTIMIENTO && !publicados.includes(clave);
}

/** El texto de cada link cuando lo agregamos nosotros. */
export const TEXTO_DE_LEGAL: Record<ClaveLegalDelPie, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  devoluciones: "Política de devoluciones",
  [CLAVE_ARREPENTIMIENTO]: "Botón de arrepentimiento",
};

/** En este orden se agregan: como en el pie de nuestra página de secciones. */
const ORDEN: readonly ClaveLegalDelPie[] = ["terminos", "privacidad", "devoluciones", CLAVE_ARREPENTIMIENTO];

/**
 * Qué legales le faltan al pie: los cargados que no tienen link, y el de
 * arrepentimiento si no está. Uno no cargado no se agrega: un link a una
 * política vacía es peor que ninguno (el panel se lo dice).
 */
export function legalesQueFaltan(doc: Document, cargados: readonly string[]): ClaveLegalDelPie[] {
  const tiene = new Set<ClaveLegalDelPie>();
  for (const a of findAll((e) => e.name === "a", doc.children)) {
    const l = legalDelElemento(a);
    if (l) tiene.add(l);
  }
  return ORDEN.filter((c) => !tiene.has(c) && !faltaElDocumento(c, cargados));
}
