/* ══════════════════════════════════════════════════════════════════════════
   LA LANDING PROPIA: "tu diseño, nuestro enchufe"
   ══════════════════════════════════════════════════════════════════════════

   Una vendedora le pide a Claude una landing con SU diseño, baja el .html y
   lo sube acá. Nosotros la mostramos en la dirección del producto en vez de
   la página de secciones, y le enchufamos lo que una landing suelta nunca
   tiene: el precio real, el botón que cobra, las fotos, el reloj de verdad,
   las opiniones verificadas. La página de pago sigue siendo la nuestra.

   Lo que la vendedora NO hace: tocar código. En Shopify el mismo archivo la
   obliga a pegar URLs de fotos y el link del checkout adentro de un
   <script>; acá cada cosa es un hueco con nombre (`data-tienda="…"`) y el
   panel le muestra cuáles faltan.

   ── Qué se saca, y por qué ─────────────────────────────────────────────────

   - **Todo el JavaScript.** Un script ajeno en nuestro dominio es la puerta
     a robar sesiones. Y con él se van los contadores falsos que estas
     landings traen de fábrica ("reservado por 15:00" que vuelve a 15:00 con
     F5). Lo que se resuelve sin código queda: el acordeón de preguntas es
     `<details>`, los "tocá lo que te pasa" son checkboxes de CSS.
   - **Formularios, iframes, objetos.** Nada que mande datos ni cargue otra
     página adentro de la nuestra.
   - **Imágenes incrustadas** (`data:`). Son la forma en que un HTML pasa a
     pesar cinco megas. Las fotos se suben aparte y van por CDN.

   Lo que queda es HTML + CSS, y se muestra adentro de un Shadow DOM: su CSS
   no toca lo nuestro (la barra, el checkout) y lo nuestro no toca lo suyo.

   Sacar el JavaScript deja cosas que se VEN bien y no funcionan —un botón de
   comprar que no lleva a ningún lado, una pregunta que no abre—. Eso no se
   avisa: se arregla, acá mismo, antes de guardar. Ver `landing-arreglos`.

   ── Los huecos ─────────────────────────────────────────────────────────────

     data-tienda="precio"           → "$ 9.900", el del producto
     data-tienda="precio-anterior"  → "$ 19.900", el tachado; sin él, el
                                       elemento desaparece
     data-tienda="comprar"          → el link va al pago (en <a> o <button>)
     data-tienda="foto:portada"     → la foto que subió con ese nombre
     data-tienda="reloj"            → el precio de bienvenida con reloj real
     data-tienda="opiniones"        → las opiniones verificadas
     data-tienda="aviso-ventas"     → las compras reales recientes
     data-tienda="nombre"           → el nombre del producto

   Las instrucciones para Claude (`landing-instrucciones`) piden exactamente
   esto, así la landing baja lista para enchufar. Un HTML hecho de otra
   forma entra igual: se limpia, se conecta lo que se reconoce y el panel
   dice qué quedó suelto.

   Este archivo corre en el servidor (usa `sanitize-html` y `htmlparser2`).
   Probado en `landing-propia.check.ts`. */

import sanitizeHtml from "sanitize-html";
import { parseDocument } from "htmlparser2";
import { Element, Text, type ChildNode, type Document } from "domhandler";
import { findAll, findOne, removeElement, textContent, prependChild } from "domutils";
import render from "dom-serializer";
import { LANDING_MAX_BYTES, nombreDeFoto, claveDeLink, type InventarioDeLanding, type QuitadoDeLanding } from "@/lib/landing-estado";
import { revisarLanding } from "@/lib/landing-revision";
import { arreglarLanding, rescatarBarras, llenarMarcadoresDePrecio, ERA_BOTON } from "@/lib/landing-arreglos";
import { loQueNoSePuedeVer, losQueEstanPegados } from "@/lib/landing-invisible";
import { MARCA_BARRA } from "@/lib/landing-efectos";

export { LANDING_MAX_BYTES, LANDING_VERSIONES, nombreDeFoto, claveDeLink, type InventarioDeLanding, type QuitadoDeLanding } from "@/lib/landing-estado";

/** De dónde se pueden traer hojas de estilo: sólo las fuentes de Google. */
export const HOSTS_DE_FUENTES = ["fonts.googleapis.com"];

export type NombreDeHueco = "precio" | "precio-anterior" | "comprar" | "reloj" | "opiniones" | "aviso-ventas" | "nombre";

export type LandingLimpia = {
  /** Listo para guardar: sin scripts, con el CSS filtrado adelante. */
  html: string;
  bytes: number;
  titulo: string | null;
  inventario: InventarioDeLanding;
  quitado: QuitadoDeLanding;
};

/* ── Qué HTML se acepta ─────────────────────────────────────────────────── */

const ETIQUETAS_SVG = ["svg", "symbol", "use", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "g", "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "text", "tspan", "title", "desc"];
const ATRIBUTOS_SVG = ["viewbox", "d", "fill", "fill-rule", "clip-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-opacity", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "transform", "opacity", "offset", "stop-color", "stop-opacity", "gradientunits", "gradienttransform", "xmlns", "preserveaspectratio", "focusable", "clip-path", "mask", "dx", "dy", "text-anchor", "font-size", "font-weight", "font-family", "href", "xlink:href"];

const OPCIONES: sanitizeHtml.IOptions = {
  allowedTags: [
    "div", "section", "header", "footer", "main", "nav", "article", "aside", "address",
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "small", "strong", "em", "b", "i", "u", "s", "mark", "sup", "sub", "abbr", "time", "br", "hr", "wbr",
    "ul", "ol", "li", "dl", "dt", "dd", "blockquote", "q", "cite", "pre", "code",
    "img", "picture", "source", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "details", "summary", "label", "input",
    ...ETIQUETAS_SVG,
  ],
  allowedAttributes: {
    "*": ["class", "id", "title", "lang", "dir", "role", "style", "aria-*", "data-tienda", "data-tienda-era", "data-tienda-aparece", "hidden", "tabindex"],
    a: ["href", "target", "rel", "download"],
    img: ["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding"],
    source: ["srcset", "sizes", "type", "media"],
    input: ["type", "checked", "disabled"],
    label: ["for"],
    details: ["open"],
    time: ["datetime"],
    th: ["scope", "colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    col: ["span"],
    ol: ["start", "reversed", "type"],
    li: ["value"],
    abbr: ["title"],
    ...Object.fromEntries(ETIQUETAS_SVG.map((t) => [t, ATRIBUTOS_SVG])),
  },
  /* Sólo https (y http, que el navegador sube solo) para imágenes y links;
     `mailto`/`tel` para el contacto del pie. `data:` queda afuera: ver arriba. */
  allowedSchemes: ["https", "http", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https", "http"], source: ["https", "http"] },
  allowedSchemesAppliedToAttributes: ["href", "src", "srcset", "xlink:href"],
  allowProtocolRelative: false,
  /* El `style` en línea no lo filtra sanitize-html (eso requiere una lista
     de propiedades permitidas, y acá el diseño es de ella): lo filtra el
     mismo `limpiarCss` de las hojas, en el `transformTags` de abajo. */
  parseStyleAttributes: false,
  disallowedTagsMode: "discard",
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "template", "iframe", "object", "embed"],
  transformTags: {
    /* El `style` en línea pasa por el mismo filtro que las hojas. */
    "*": (tagName, attribs) => {
      if (attribs.style) {
        const limpio = limpiarDeclaraciones(attribs.style);
        if (limpio) attribs.style = limpio; else delete attribs.style;
      }
      return { tagName, attribs };
    },
    /* Un botón sin JavaScript no hace nada. El de comprar pasa a ser un link
       (el pago es una dirección); los demás quedan marcados como lo que
       fueron, y `landing-arreglos` decide qué hacer con cada uno: el que
       dice "comprar" se conecta al pago, el que abría una pregunta se
       convierte en acordeón de verdad, y el resto queda como texto. */
    button: (tag, attribs): sanitizeHtml.Tag => {
      const a: sanitizeHtml.Attributes = { class: attribs.class ?? "" };
      if (attribs["data-tienda"] === "comprar") return { tagName: "a", attribs: { ...a, "data-tienda": "comprar", href: "#" } };
      if (attribs["aria-expanded"] !== undefined) a["aria-expanded"] = attribs["aria-expanded"];
      /* Un botón sin texto (una flecha, una cruz) se reconoce por acá: es lo
         único que el panel puede nombrar cuando avisa que quedó sin función. */
      if (attribs["aria-label"]) a["aria-label"] = attribs["aria-label"];
      return { tagName: "span", attribs: { ...a, role: "text", [ERA_BOTON]: "boton" } };
    },
    /* Un checkbox o un radio sirven para los "tocá lo que te pasa" con CSS.
       Cualquier otro input es un formulario, y no hay formularios. */
    input: (tag, attribs) => {
      const a: Record<string, string> = { type: (attribs.type ?? "").toLowerCase() };
      for (const k of ["class", "id", "checked", "disabled"]) if (attribs[k] !== undefined) a[k] = attribs[k];
      return { tagName: "input", attribs: a };
    },
    a: (tag, attribs) => {
      const href = attribs.href ?? "";
      const a = { ...attribs };
      if (/^https?:/i.test(href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      else { delete a.target; delete a.rel; }
      return { tagName: "a", attribs: a };
    },
  },
  exclusiveFilter: (marco) => {
    /* Un input que no es checkbox ni radio es un formulario. */
    if (marco.tag === "input") return marco.attribs.type !== "checkbox" && marco.attribs.type !== "radio";
    /* `<use>` sólo hacia un símbolo del mismo archivo: `#icono`. */
    if (marco.tag === "use") {
      const h = marco.attribs.href ?? marco.attribs["xlink:href"] ?? "";
      return !h.startsWith("#");
    }
    return false;
  },
};

/* ── El CSS ─────────────────────────────────────────────────────────────── */

/**
 * Lo que puede hacer daño desde una hoja de estilos, o pesar de más:
 * `@import` (trae CSS de afuera), `expression`/`behavior`/`-moz-binding`
 * (ejecutan código en navegadores viejos), `javascript:` en un `url()`, y
 * `data:` (imágenes incrustadas). Se saca la declaración entera, no el
 * archivo: el resto de su diseño sigue.
 */
export function limpiarCss(css: string): string {
  let s = css.replace(/\/\*[\s\S]*?\*\//g, "");
  s = s.replace(/@import\b[^;]*;?/gi, "");
  s = s.replace(/@charset\b[^;]*;?/gi, "");
  s = s.replace(/[^{};]*(expression\s*\(|behavior\s*:|-moz-binding\s*:|javascript\s*:|vbscript\s*:)[^;}]*(;|(?=\}))/gi, "");
  s = s.replace(/[^{};]*url\(\s*["']?\s*(data|http|blob|file|ftp)\s*:[^)]*\)[^;}]*(;|(?=\}))/gi, "");
  return s.trim();
}

/** Lo mismo, para un `style="…"` en línea. */
export function limpiarDeclaraciones(declaraciones: string): string {
  const m = limpiarCss(`x{${declaraciones}}`).match(/^x\{([\s\S]*)\}$/);
  return (m?.[1] ?? "").trim();
}

/* ── Limpiar ────────────────────────────────────────────────────────────── */

/**
 * El archivo tal como lo bajó de Claude → HTML limpio, con el inventario de
 * huecos y el recibo de lo que se sacó. `ok: false` sólo por peso o por
 * vacío: un archivo raro no es un error, es una lista de avisos.
 */
export function limpiarLanding(htmlCrudo: string): { ok: true; landing: LandingLimpia } | { ok: false; problema: string } {
  if (typeof htmlCrudo !== "string" || !htmlCrudo.trim()) return { ok: false, problema: "El archivo está vacío." };
  if (Buffer.byteLength(htmlCrudo, "utf8") > LANDING_MAX_BYTES) {
    return { ok: false, problema: `El archivo pesa más de ${Math.round(LANDING_MAX_BYTES / 1000)} KB. Las fotos no van adentro del HTML: se suben aparte.` };
  }

  const quitado: QuitadoDeLanding = { scripts: 0, formularios: 0, marcos: 0, eventos: 0, imagenesIncrustadas: 0, contadores: 0 };
  let s = htmlCrudo.replace(/\r\n/g, "\n");

  /* Recibo de lo que se va, contado sobre el crudo ya parseado: después no
     está, y contarlo con regex sobre el texto cuenta también el "<script>"
     que estos archivos nombran en su comentario de arriba. */
  const docCrudo = parseDocument(s);
  const cuantos = (pred: (e: Element) => boolean) => findAll(pred, docCrudo.children).length;
  quitado.scripts = cuantos((e) => e.name === "script");
  quitado.formularios = cuantos((e) => e.name === "form");
  quitado.marcos = cuantos((e) => e.name === "iframe" || e.name === "object" || e.name === "embed");
  quitado.eventos = findAll(() => true, docCrudo.children).reduce((n, e) => n + Object.keys(e.attribs).filter((a) => /^on[a-z]+$/i.test(a)).length, 0);
  quitado.imagenesIncrustadas = cuantos((e) => e.name === "img" && /^data:/i.test(e.attribs.src ?? "")) + (s.match(/url\(\s*["']?data:image\//gi) ?? []).length;
  quitado.contadores = cuantos((e) => Object.keys(e.attribs).some((a) => /timer|countdown|cuenta-?regresiva/i.test(a)));

  /* El título, si vino con la cabecera entera. */
  const titulo = s.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || null;

  /* Las hojas de estilo salen antes de sanear y vuelven, filtradas, en una
     sola al principio. Las fuentes de Google se anotan aparte: dentro de un
     Shadow DOM un `@font-face` no registra la fuente, así que la página las
     carga arriba, afuera. */
  const fuentes: string[] = [];
  for (const m of s.matchAll(/<link\b[^>]*>/gi)) {
    const href = m[0].match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      const u = new URL(href);
      if (u.protocol === "https:" && HOSTS_DE_FUENTES.includes(u.hostname) && /stylesheet/i.test(m[0])) fuentes.push(u.toString());
    } catch { /* no es una dirección: se va con el resto */ }
  }
  const css: string[] = [];
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, c: string) => { css.push(limpiarCss(c)); return ""; });
  s = s.replace(/<head\b[\s\S]*?<\/head>/i, "").replace(/<\/?(html|body)\b[^>]*>/gi, "");

  /* La marca de "esto era un botón" la ponemos nosotros, y sólo nosotros: si
     viene escrita en el archivo se saca ANTES de sanear, porque después no
     hay forma de distinguir la nuestra de la suya. */
  for (const marca of [ERA_BOTON, MARCA_BARRA]) {
    s = s.replace(new RegExp(`\\s${marca}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)|\\s${marca}(?=[\\s>/])`, "gi"), " ");
  }

  const saneado = sanitizeHtml(s, OPCIONES).trim();
  if (!saneado) return { ok: false, problema: "Después de limpiarlo no quedó nada para mostrar. ¿Es un archivo HTML?" };

  /* Lo que quedó suelto al sacar el JavaScript se enchufa acá: los botones
     de comprar que no llevaban a ningún lado, el acordeón de preguntas.
     Ver `lib/landing-arreglos`. */
  const arbol = parseDocument(saneado);
  const arreglos = arreglarLanding(arbol);
  const precios = llenarMarcadoresDePrecio(arbol);
  const hoja = [...css.filter(Boolean), arreglos.css].filter(Boolean).join("\n");
  /* Y lo genérico: aplicar SU CSS sobre SU html para ver qué queda invisible.
     Los arreglos conocen dos formas de romperse; esto encuentra las que no
     conocemos. Ver `lib/landing-invisible`. */
  const escondidos = loQueNoSePuedeVer(arbol, hoja);
  /* Y de esos, la barra de comprar pegada abajo se puede rescatar: se marca y
     nuestro script la muestra al bajar, como hacía la suya. */
  const barras = rescatarBarras(escondidos, losQueEstanPegados(arbol, hoja));
  const perdidos = escondidos.filter((x) => x.el.attribs[MARCA_BARRA] === undefined);
  const hojaFinal = [hoja, barras.css].filter(Boolean).join("\n");
  const cuerpo = render(arbol, { encodeEntities: "utf8", emptyAttrs: true }).trim();

  const html = (hojaFinal ? `<style>\n${hojaFinal}\n</style>\n` : "") + cuerpo;
  const inventario = inventariar(cuerpo, fuentes, avisosDelCrudo(docCrudo));
  inventario.arreglos = [...arreglos.hechos, ...precios.hechos, ...barras.hechos];
  inventario.sueltos = arreglos.sueltos;
  /* Y qué DICE: la revisión mira el texto visible, no las etiquetas. Ver
     `lib/landing-revision`. */
  inventario.hallazgos = revisarLanding(textoVisible(cuerpo), {
    comprar: inventario.comprar, precio: inventario.precio, opiniones: inventario.opiniones, css: hojaFinal,
    escondidos: perdidos, comprarEscondidos: perdidos.reduce((n, x) => n + x.botonesDePago, 0),
  });

  return { ok: true, landing: { html, bytes: Buffer.byteLength(html, "utf8"), titulo, inventario, quitado } };
}

/**
 * Lo que se lee en la pantalla, sin etiquetas: es sobre esto que corre la
 * revisión.
 *
 * ⚠️ Los trozos se unen con un ESPACIO, no pegados. `textContent` los pega
 * —"<h1>Curso</h1><p>Quedan…" da "CursoQuedan"— y ahí la revisión deja de
 * ver la frase: busca palabras enteras. Un espacio de más no molesta a
 * nadie; uno de menos esconde un hallazgo.
 */
function textoVisible(cuerpo: string): string {
  const doc = parseDocument(cuerpo);
  for (const el of findAll((e) => e.name === "style" || e.name === "script" || e.name === "svg", doc.children)) removeElement(el);
  const trozos: string[] = [];
  const recorrer = (nodos: ChildNode[]) => {
    for (const n of nodos) {
      if (n.type === "text") trozos.push((n as Text).data);
      else if (n instanceof Element) { trozos.push(" "); recorrer(n.children as ChildNode[]); trozos.push(" "); }
    }
  };
  recorrer(doc.children as ChildNode[]);
  return trozos.join("");
}

function hueco(el: Element): string {
  return (el.attribs["data-tienda"] ?? "").trim().toLowerCase();
}

/**
 * Lo que un HTML hecho sin nuestras instrucciones deja escrito y nosotros
 * no podemos arreglar: el texto de un contador ("reservado por 15:00", que
 * sin su script queda clavado y sigue siendo mentira) y los "[PRECIO]" que
 * su script llenaba. Se avisan con el texto, para que la persona los
 * reconozca y le pida a Claude que los saque o use los huecos.
 */
function avisosDelCrudo(doc: Document): string[] {
  const avisos: string[] = [];
  const contadores = new Set<string>();
  const recortar = (t: string) => { const l = t.replace(/\s+/g, " ").trim(); return l.length > 70 ? `${l.slice(0, 67)}…` : l; };
  for (const el of findAll((e) => Object.keys(e.attribs).some((a) => /timer|countdown|cuenta-?regresiva/i.test(a)), doc.children)) {
    const padre = el.parent && el.parent.type === "tag" ? textContent(el.parent).replace(/\s+/g, " ").trim() : "";
    const t = recortar(padre && padre.length <= 120 ? padre : textContent(el));
    /* Dos veces el mismo contador con un emoji de diferencia es un aviso, no
       dos: se compara por las letras. */
    const huella = t.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!t || contadores.has(huella)) continue;
    contadores.add(huella);
    avisos.push(`Quedó un contador escrito: «${t}». Sin su script no corre, y sigue siendo mentira: pedile a Claude que lo saque o que deje el hueco data-tienda="reloj".`);
  }
  /* Sobre el texto visible: sin scripts, sin estilos y sin comentarios (el
     de arriba de estos archivos suele decir "<script>" en palabras). */
  for (const el of findAll((e) => e.name === "script" || e.name === "style", doc.children)) removeElement(el);
  const marcadores = new Set<string>();
  /* Los del precio no se avisan: ésos los llenamos nosotros con el precio de
     verdad (`llenarMarcadoresDePrecio`). Se avisan los que no sabemos qué
     van: "[MARCA]", "[NOMBRE DEL EBOOK]". */
  for (const m of textContent(doc).matchAll(/\[([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{3,30})\]/g)) {
    if (/^\[\s*PRECIO(\s+ANTERIOR)?\s*\]$/i.test(m[0])) continue;
    marcadores.add(m[0]);
  }
  /* Todos juntos en un renglón: uno por marcador eran siete avisos que decían
     lo mismo y estiraban la pantalla sin agregar nada. */
  if (marcadores.size) {
    const lista = [...marcadores].slice(0, 6).map((m) => `«${m}»`).join(", ");
    avisos.push(
      marcadores.size === 1
        ? `Quedó un texto sin llenar: ${lista}. Lo llenaba el programa que le sacamos, así que cambialo por lo que va.`
        : `Quedaron ${marcadores.size} textos sin llenar: ${lista}${marcadores.size > 6 ? " y más" : ""}. Los llenaba el programa que le sacamos, así que cambialos por lo que va.`,
    );
  }
  return avisos.slice(0, 6);
}

function inventariar(cuerpo: string, fuentes: string[], avisos: string[]): InventarioDeLanding {
  const doc = parseDocument(cuerpo);
  const inv: InventarioDeLanding = { precio: 0, precioAnterior: 0, comprar: 0, nombre: 0, fotos: [], reloj: false, opiniones: false, avisoVentas: false, linksVacios: [], imagenesExternas: [], fuentes: [...new Set(fuentes)], avisos, arreglos: [], sueltos: [], hallazgos: [] };
  for (const el of findAll(() => true, doc.children)) {
    const h = hueco(el);
    if (h === "precio") inv.precio++;
    else if (h === "precio-anterior") inv.precioAnterior++;
    else if (h === "comprar") inv.comprar++;
    else if (h === "nombre") inv.nombre++;
    else if (h === "reloj") inv.reloj = true;
    else if (h === "opiniones") inv.opiniones = true;
    else if (h === "aviso-ventas") inv.avisoVentas = true;
    else if (h.startsWith("foto:")) { const n = nombreDeFoto(h); if (n && !inv.fotos.includes(n)) inv.fotos.push(n); }

    if (el.name === "a" && h !== "comprar") {
      const href = (el.attribs.href ?? "").trim();
      /* Los `#seccion` que apuntan a algo que existe ya no llegan acá:
         `arreglarLanding` los deja vivos, y los que no, los normaliza a
         "#" para que el panel ofrezca completarlos. */
      if (href === "" || href === "#") {
        const t = textContent(el).replace(/\s+/g, " ").trim();
        if (t && !inv.linksVacios.includes(t)) inv.linksVacios.push(t);
      }
    }
    if (el.name === "img" && /^https?:/i.test(el.attribs.src ?? "")) inv.imagenesExternas.push(el.attribs.src);
  }
  return inv;
}

/* ── Armar: la landing con los datos de verdad ──────────────────────────── */

export type DatosParaArmar = {
  nombre: string;
  precio: number;
  precioAnterior: number | null;
  /** A dónde va cada botón de comprar. */
  hrefComprar: string;
  /** Nombre del hueco → dirección de la foto subida. */
  fotos: Record<string, string>;
  /** Texto del link (normalizado con `claveDeLink`) → dirección. */
  enlaces: Record<string, string>;
  /** HTML ya dibujado por nosotros para cada bloque vivo; sin él, el hueco se saca. */
  bloques: { reloj?: string; opiniones?: string; avisoVentas?: string };
  /** En la previa del panel: los huecos de foto sin foto se ven, con su nombre. */
  mostrarHuecos?: boolean;
};

const plata = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n).replace(/\u00a0/g, " ");

/**
 * El HTML limpio + los datos del producto → lo que se muestra. Cada hueco
 * se llena; lo que no tiene con qué llenarse se saca, para no mostrar un
 * "[PRECIO]" ni una foto rota.
 */
export function armarLanding(htmlLimpio: string, d: DatosParaArmar): string {
  const doc = parseDocument(htmlLimpio);
  const elementos = findAll(() => true, doc.children);

  for (const el of elementos) {
    const h = hueco(el);
    if (!h) {
      if (el.name === "a") enlazar(el, d.enlaces);
      continue;
    }
    if (h === "precio") ponerTexto(el, precioSinSignoRepetido(el, d.precio));
    else if (h === "precio-anterior") {
      if (d.precioAnterior && d.precioAnterior > d.precio) ponerTexto(el, precioSinSignoRepetido(el, d.precioAnterior));
      else removeElement(el);
    }
    else if (h === "nombre") ponerTexto(el, d.nombre);
    else if (h === "comprar") {
      el.attribs.href = d.hrefComprar;
      delete el.attribs.target; delete el.attribs.rel;
    }
    else if (h.startsWith("foto:")) ponerFoto(el, nombreDeFoto(h), d);
    else if (h === "reloj") ponerBloque(el, d.bloques.reloj);
    else if (h === "opiniones") ponerBloque(el, d.bloques.opiniones);
    else if (h === "aviso-ventas") ponerBloque(el, d.bloques.avisoVentas);
  }
  return render(doc, { encodeEntities: "utf8", emptyAttrs: true });
}

function ponerTexto(el: Element, texto: string) {
  el.children = [];
  prependChild(el, new Text(texto));
}

/* Si al lado del hueco ya escribió el "$" ("$<span data-tienda=precio>"),
   no se pone dos veces. */
function precioSinSignoRepetido(el: Element, n: number): string {
  return /\$\s*$/.test(textoDeAtras(el)) ? plata(n).replace(/^\$\s?/, "") : plata(n);
}

/**
 * El texto que quedó justo antes del hueco. Si el hueco es el primer hijo de
 * su elemento, el `$` puede estar un escalón más arriba —
 * `$<span><span data-tienda="precio"></span></span>`— así que se sube
 * mientras siga siendo el primero.
 */
function textoDeAtras(el: Element): string {
  let nodo: ChildNode | null = el;
  while (nodo) {
    if (nodo.prev) return nodo.prev.type === "text" ? (nodo.prev as Text).data : "";
    const padre: ChildNode | null = (nodo.parent as ChildNode | null) ?? null;
    nodo = padre && padre.type === "tag" ? padre : null;
  }
  return "";
}

function ponerFoto(el: Element, nombre: string | null, d: DatosParaArmar) {
  const url = nombre ? d.fotos[nombre] : undefined;
  if (!url) {
    if (d.mostrarHuecos && nombre) {
      el.attribs["data-tienda-falta"] = nombre;
      if (el.name === "img") { el.attribs.src = ""; el.attribs.alt = `Falta la foto: ${nombre}`; }
      return;
    }
    removeElement(el);
    return;
  }
  const alt = el.attribs.alt ?? el.attribs["data-alt"] ?? el.attribs.title ?? "";
  if (el.name === "img") {
    el.attribs.src = url;
    delete el.attribs.srcset;
    el.attribs.loading = el.attribs.loading ?? "lazy";
    el.attribs.decoding = "async";
    return;
  }
  /* Un contenedor (div, figure): la foto va adentro y su caja queda, así
     el CSS que le puso sigue valiendo. */
  const img = new Element("img", { src: url, alt, loading: "lazy", decoding: "async" });
  el.children = [];
  prependChild(el, img);
}

function ponerBloque(el: Element, html: string | undefined) {
  if (!html) { removeElement(el); return; }
  const trozo = parseDocument(html);
  el.children = [];
  for (const hijo of [...trozo.children].reverse()) prependChild(el, hijo as ChildNode);
}

function enlazar(el: Element, enlaces: Record<string, string>) {
  const href = (el.attribs.href ?? "").trim();
  if (href !== "" && href !== "#") return;
  const url = enlaces[claveDeLink(textContent(el))];
  if (url && /^(https?:|mailto:|tel:)/i.test(url)) {
    el.attribs.href = url;
    if (/^https?:/i.test(url)) { el.attribs.target = "_blank"; el.attribs.rel = "noopener noreferrer"; }
  }
}

/* Para los chequeos y para la previa. */
export function primerElemento(html: string, pred: (el: Element) => boolean): Element | null {
  return findOne(pred, parseDocument(html).children);
}
