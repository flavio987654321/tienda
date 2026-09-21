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
import { findAll, findOne, removeElement, textContent, prependChild, appendChild } from "domutils";
import render from "dom-serializer";
import { LANDING_MAX_BYTES, MAX_FOTOS_DE_LANDING, MAX_ENLACES_DE_LANDING, nombreDeFoto, claveDeLink, type InventarioDeLanding, type QuitadoDeLanding } from "@/lib/landing-estado";
import { revisarLanding } from "@/lib/landing-revision";
import { arreglarLanding, rescatarBarras, rescatarFotos, llenarMarcadoresDePrecio, rescatarContador, rescatarCasillas, ERA_BOTON, ERA_FOTO } from "@/lib/landing-arreglos";
import { loQueNoSePuedeVer, losQueEstanPegados, cuantoCuestaRevisar, TOPE_DE_REVISION } from "@/lib/landing-invisible";
import { MARCA_BARRA, CLASE_DE_LA_FOTO, MARCA_FOTO, MARCA_HUECO, MARCA_FLECHA, MARCA_RELOJ, MARCA_DESPUES, MARCA_CUENTA, MARCA_DEMO } from "@/lib/landing-efectos";
import { claveDeBienvenida } from "@/lib/bienvenida";
import { cuentaRegresiva } from "@/lib/oferta-salida";

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
    "*": ["class", "id", "title", "lang", "dir", "role", "style", "aria-*", "data-tienda", "data-tienda-era", "data-tienda-aparece", CLASE_DE_LA_FOTO, "hidden", "tabindex"],
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
      /* Un lugar de foto marcado a la manera de otra plataforma
         (`data-afl-img="portada"`) se pasa al nuestro ACÁ, que es el único
         momento en que se ven los atributos originales: dos líneas más abajo
         el filtro los tira y no hay forma de saber que existieron.
         Ver `rescatarFotos`. */
      if (!attribs["data-tienda"]) {
        const foto = nombreDelHuecoDeFoto(attribs);
        if (foto) {
          attribs["data-tienda"] = `foto:${foto}`;
          attribs[ERA_BOTON] = ERA_FOTO;
          /* Y la descripción que tenía al lado, para que la foto que pongamos
             no quede muda: `ponerFoto` la usa de `alt`. */
          const alt = textoDeAlgunAlt(attribs);
          if (alt && !attribs["aria-label"]) attribs["aria-label"] = alt;
          /* Y con qué FORMA va: `data-afl-class="afl-cover"` es el archivo
             diciendo qué clase lleva la foto que va ahí. Sin eso, la foto
             entra sin tamaño ni posición y se le va atrás del adorno que el
             diseño le había puesto alrededor. Ver `ponerFoto`. */
          const clase = nombreDeClaseDeLaFoto(attribs);
          if (clase) attribs[CLASE_DE_LA_FOTO] = clase;
        }
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

/* ── Los lugares de foto de otra plataforma ─────────────────────────────── */

/** Un atributo que dice "imagen" en su nombre: `data-afl-img`, `data-foto`. */
const ATRIBUTO_DE_IMAGEN = /(^|[-_])(img|image|imagen|foto|photo|picture|pic)([-_]|$)/i;
/** Y que trae un nombre corto de valor, no una dirección ni una descripción. */
const NOMBRE_CORTO = /^[a-z0-9][a-z0-9 _-]{0,40}$/i;

/**
 * El nombre del hueco de foto que este elemento declara, o null.
 *
 * Se mira el NOMBRE del atributo, no el valor: `class="imagen-hero"` no es un
 * hueco (la clase se llama así) pero `data-image="hero"` sí. Y el valor tiene
 * que ser un nombre corto: `data-image-src="https://…"` es una dirección, no
 * un hueco. Ver `rescatarFotos` en `landing-arreglos`.
 */
function nombreDelHuecoDeFoto(attribs: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(attribs)) {
    if (!ATRIBUTO_DE_IMAGEN.test(k) || typeof v !== "string") continue;
    const valor = v.trim();
    if (valor && NOMBRE_CORTO.test(valor) && !/^(true|false|lazy|eager|auto|sync|async)$/i.test(valor)) return valor;
  }
  return null;
}

/**
 * La clase que el archivo dice que lleva la foto: `data-afl-class="afl-cover"`.
 *
 * No es lo mismo que la clase del contenedor (`class`), y por eso se exige
 * que el nombre TERMINE en "class"/"clase" con algo adelante: el contenedor
 * es la caja donde va la foto y esto es cómo se viste la foto. En el archivo
 * de verdad, `afl-cover` es lo que le da a la portada el tamaño de libro, la
 * sombra, la inclinación y —lo que importa— el `position:relative` que la
 * pone ADELANTE del redondel de fondo. Sin eso, la foto aparece atrás.
 */
function nombreDeClaseDeLaFoto(attribs: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(attribs)) {
    if (k.toLowerCase() === "class") continue;
    if (!/[-_](class|clase|classname)$/i.test(k) || typeof v !== "string") continue;
    const clase = v.trim().replace(/\s+/g, " ");
    if (clase && /^[a-z0-9 _-]{1,120}$/i.test(clase)) return clase;
  }
  return null;
}

/** La descripción que el archivo le había puesto al lado: `data-afl-alt`. */
function textoDeAlgunAlt(attribs: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(attribs)) {
    if (/(^|[-_])alt([-_]|$)/i.test(k) && typeof v === "string" && v.trim()) return v.trim().slice(0, 120);
  }
  return null;
}

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
  s = sinLoQueHaceDano(s);
  /* ⚠️ Y NUNCA un "</". Esto se guarda adentro de un <style> NUESTRO, y el
     navegador cierra esa etiqueta con `</style >` —con un espacio, o un tab,
     o una barra— igual que con `</style>`. Quien logre cerrarla sale de la
     hoja, sale del Shadow DOM y escribe HTML suyo en nuestra página, con
     `onerror` y todo (el CSP deja correr lo que está en línea). En CSS un
     "</" no significa nada, así que sacarlo no le cuesta el diseño a nadie. */
  s = s.replace(/<\//g, "");
  return s.trim();
}

/** Lo que no puede quedar en una declaración, ni en un selector. */
const HACE_DANO = /expression\s*\(|behavior\s*:|-moz-binding\s*:|javascript\s*:|vbscript\s*:|url\(\s*["']?\s*(data|http|blob|file|ftp)\s*:/i;

/**
 * Saca las declaraciones con algo de `HACE_DANO` —y la regla entera si lo
 * tiene el selector—, recorriendo el texto UNA sola vez.
 *
 * ⚠️ Esto era un `replace` que empezaba con `[^{};]*`, y ahí estaba el
 * problema: el motor de expresiones prueba desde cada posición y vuelve
 * sobre lo mismo, así que el costo crece al cuadrado. Medido: 60 KB de CSS
 * sin un `;` tardaban 3,4 segundos, y los 500 KB que deja entrar el tope,
 * CUATRO MINUTOS de un procesador entero. Recorriendo de una vez, los mismos
 * 500 KB son milisegundos.
 */
function sinLoQueHaceDano(css: string): string {
  let salida = "";
  let trozo = "";
  let parentesis = 0;
  let comilla = "";
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (comilla) {
      trozo += c;
      if (c === comilla && css[i - 1] !== "\\") comilla = "";
      continue;
    }
    if (c === '"' || c === "'") { comilla = c; trozo += c; continue; }
    if (c === "(") parentesis++;
    else if (c === ")") parentesis = Math.max(0, parentesis - 1);
    /* Un `;` adentro de un `url(…)` o de un texto entre comillas no corta
       nada: `url(data:image/png;base64,…)` es UNA declaración. */
    if (parentesis === 0 && (c === ";" || c === "{" || c === "}")) {
      const malo = HACE_DANO.test(trozo);
      if (c === "{") {
        /* El que tiene el problema es el selector: se va la regla entera. */
        if (malo) { i = finDelBloque(css, i); trozo = ""; continue; }
        /* Acá, y no en otra pasada: éste es el único punto del recorrido donde
           se sabe que `trozo` es un SELECTOR y no una declaración. Buscar
           "body" por todo el texto pisaría un `font-family:"Body Grotesque"`
           o un `content:"body"`. */
        salida += `${capsularSelector(trozo)}{`;
      } else if (!malo) {
        salida += trozo + c;
      } else if (c === "}") {
        /* La declaración se va; la llave que cierra la regla se queda. */
        salida += c;
      }
      trozo = "";
      continue;
    }
    trozo += c;
  }
  return salida + (HACE_DANO.test(trozo) ? "" : trozo);
}

/**
 * `html`, `body` y `:root` pasan a ser `:host`, que es lo que son acá adentro.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ADENTRO DE LA CÁPSULA NO HAY `body` NI `:root`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Su diseño se dibuja adentro de un Shadow DOM (ver `LandingPropia`), y un
 * Shadow DOM no tiene `<html>` ni `<body>`: su raíz es el `:host`. Así que
 * TODA regla escrita para la página entera no le aplicaba a nada.
 *
 * Y eso es donde Claude pone casi todo lo importante de un diseño:
 *
 *     :root { --crema:#FDF8F0; --bordo:#8B1E3F; }
 *     body  { background:var(--crema); color:#3B2A22; font-family:Georgia; }
 *
 * Las dos líneas se guardaban tal cual y no pintaban nada. El fondo no
 * aparecía, las variables quedaban sin definir —así que cada `var(--bordo)`
 * de abajo caía en vacío— y la letra y el color base eran los del navegador.
 *
 * ── Por qué se veía NEGRO ──────────────────────────────────────────────────
 *
 * Sin fondo propio, la cápsula es transparente, y atrás está el `<body>` de
 * nuestro sitio. El sitio arranca en tema oscuro por defecto (`next-themes`),
 * o sea `.dark body{background:#0f172a}`. Su página se veía azul casi negro.
 *
 * No es algo que hayamos roto: pasaba desde el primer día. No se veía porque
 * antes la previa se caía antes de llegar a dibujar, y en la página pública
 * no lo vio nadie porque el producto nunca se publicó. El diseño anterior
 * zafaba de casualidad —tenía el fondo puesto en un `<div>` y no en el
 * `body`—, que es lo que hace que esto aparezca recién ahora.
 *
 * ── Lo que NO arregla ──────────────────────────────────────────────────────
 *
 * Un `body.oscuro{…}`: la clase viajaba en la etiqueta `<body>`, que se saca
 * al limpiar, así que no hay dónde ponerla. Queda como estaba —sin efecto—,
 * que es lo mismo que antes y no peor.
 */
function capsularSelector(selector: string): string {
  /* Los `@media`, `@supports` y `@keyframes` no llevan selectores: su
     encabezado se deja intacto. Un `@supports (x:body)` no es un selector. */
  if (selector.trimStart().startsWith("@")) return selector;
  /* Sólo al principio de cada parte o después de un combinador, para no tocar
     `.body`, `#body`, `[data-body]` ni `body-grande`. */
  const capsulado = selector.replace(/(^|[\s,>+~(])(?:html|body|:root)(?![-\w])/gi, "$1:host");
  if (capsulado === selector) return selector;
  /* `html,body{margin:0}` queda como `:host,:host{…}`, que es válido pero
     feo y engorda el archivo. Se juntan las partes repetidas — salvo que haya
     paréntesis, porque ahí una coma puede ser de adentro de un `:is(a,b)` y
     cortar por coma partiría el selector al medio. */
  if (capsulado.includes("(")) return capsulado;
  const partes = [...new Set(capsulado.split(",").map((p) => p.trim()).filter(Boolean))];
  return partes.join(",");
}

/** Dónde cierra el bloque que abre en `i`. */
function finDelBloque(css: string, i: number): number {
  let nivel = 0;
  for (let j = i; j < css.length; j++) {
    if (css[j] === "{") nivel++;
    else if (css[j] === "}" && --nivel === 0) return j;
  }
  return css.length;
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
  for (const marca of [ERA_BOTON, MARCA_BARRA, CLASE_DE_LA_FOTO, MARCA_FOTO, MARCA_HUECO, MARCA_FLECHA]) {
    s = s.replace(new RegExp(`\\s${marca}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)|\\s${marca}(?=[\\s>/])`, "gi"), " ");
  }

  const saneado = sanitizeHtml(s, OPCIONES).trim();
  if (!saneado) return { ok: false, problema: "Después de limpiarlo no quedó nada para mostrar. ¿Es un archivo HTML?" };

  /* Lo que quedó suelto al sacar el JavaScript se enchufa acá: los botones
     de comprar que no llevaban a ningún lado, el acordeón de preguntas.
     Ver `lib/landing-arreglos`. */
  const arbol = parseDocument(saneado);
  const arreglos = arreglarLanding(arbol);
  const fotos = rescatarFotos(arbol);
  const precios = llenarMarcadoresDePrecio(arbol);
  /* Y el "reservado por 15:00" escrito: pasa a ser el hueco del reloj de
     verdad. Ver `rescatarContador`. */
  const contador = rescatarContador(arbol);
  /* Y la lista de tildar que se pintaba con una clase puesta por su script:
     se reescribe SU CSS. Ver `rescatarCasillas`. */
  const casillas = rescatarCasillas(arbol, css);
  const hoja = [...casillas.hojas.filter(Boolean), arreglos.css].filter(Boolean).join("\n");
  /* Y lo genérico: aplicar SU CSS sobre SU html para ver qué queda invisible.
     Los arreglos conocen dos formas de romperse; esto encuentra las que no
     conocemos. Ver `lib/landing-invisible`. */
  /* Con un archivo enorme esta revisión no se hace (ver `TOPE_DE_REVISION`):
     antes que dejarla esperando un minuto, se le dice que la mire ella. */
  const muyGrande = cuantoCuestaRevisar(arbol, hoja) > TOPE_DE_REVISION;
  const escondidos = loQueNoSePuedeVer(arbol, hoja);
  /* Y de esos, la barra de comprar pegada abajo se puede rescatar: se marca y
     nuestro script la muestra al bajar, como hacía la suya. */
  const barras = rescatarBarras(escondidos, losQueEstanPegados(arbol, hoja));
  const perdidos = escondidos.filter((x) => x.el.attribs[MARCA_BARRA] === undefined);
  const hojaFinal = [hoja, barras.css].filter(Boolean).join("\n");
  const cuerpo = render(arbol, { encodeEntities: "utf8", emptyAttrs: true }).trim();

  const html = (hojaFinal ? `<style>\n${hojaFinal}\n</style>\n` : "") + cuerpo;
  const avisos = avisosDelCrudo(docCrudo, contador.textos);
  if (muyGrande) {
    avisos.unshift("Tu archivo es muy grande para que lo revisemos entero, así que puede haber quedado algo escondido que no vemos. Mirala completa en la previa antes de prenderla.");
  }
  const inventario = inventariar(cuerpo, fuentes, avisos);
  inventario.arreglos = [...arreglos.hechos, ...fotos.hechos, ...precios.hechos, ...contador.hechos, ...casillas.hechos, ...barras.hechos];
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
function avisosDelCrudo(doc: Document, rescatados: readonly string[] = []): string[] {
  const avisos: string[] = [];
  const contadores = new Set<string>();
  const recortar = (t: string) => { const l = t.replace(/\s+/g, " ").trim(); return l.length > 70 ? `${l.slice(0, 67)}…` : l; };
  const huellaDe = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  /* El que pasó a ser el hueco del reloj (`rescatarContador`) ya no es un
     aviso: es un arreglo, y se cuenta allá. */
  for (const t of rescatados) contadores.add(huellaDe(recortar(t)));
  for (const el of findAll((e) => Object.keys(e.attribs).some((a) => /timer|countdown|cuenta-?regresiva/i.test(a)), doc.children)) {
    const padre = el.parent && el.parent.type === "tag" ? textContent(el.parent).replace(/\s+/g, " ").trim() : "";
    const t = recortar(padre && padre.length <= 120 ? padre : textContent(el));
    /* Dos veces el mismo contador con un emoji de diferencia es un aviso, no
       dos: se compara por las letras. */
    const huella = huellaDe(t);
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

/**
 * Qué trae adentro.
 *
 * ⚠️ Las fotos y los links van con el MISMO tope que guarda el servidor
 * (`MAX_FOTOS_DE_LANDING`, `MAX_ENLACES_DE_LANDING`). Sin eso, un archivo con
 * ochocientos lugares de foto le dibujaba al panel ochocientos botones de
 * subir —una pantalla inusable— y recién en el número 31 le decía que no
 * entraban más, después de diez minutos subiendo. Lo que pasa del tope se
 * avisa arriba y el hueco de más desaparece al dibujar, como cualquier hueco
 * que no tiene con qué llenarse.
 */
function inventariar(cuerpo: string, fuentes: string[], avisos: string[]): InventarioDeLanding {
  const doc = parseDocument(cuerpo);
  const inv: InventarioDeLanding = { precio: 0, precioAnterior: 0, comprar: 0, nombre: 0, fotos: [], reloj: false, opiniones: false, avisoVentas: false, linksVacios: [], imagenesExternas: [], fuentes: [...new Set(fuentes)], avisos, arreglos: [], sueltos: [], hallazgos: [] };
  const deMas = { fotos: 0, links: 0 };
  for (const el of findAll(() => true, doc.children)) {
    const h = hueco(el);
    if (h === "precio") inv.precio++;
    else if (h === "precio-anterior") inv.precioAnterior++;
    else if (h === "comprar") inv.comprar++;
    else if (h === "nombre") inv.nombre++;
    else if (h === "reloj") inv.reloj = true;
    else if (h === "opiniones") inv.opiniones = true;
    else if (h === "aviso-ventas") inv.avisoVentas = true;
    else if (h.startsWith("foto:")) {
      const n = nombreDeFoto(h);
      if (n && !inv.fotos.includes(n)) { if (inv.fotos.length < MAX_FOTOS_DE_LANDING) inv.fotos.push(n); else deMas.fotos++; }
    }

    if (el.name === "a" && h !== "comprar") {
      const href = (el.attribs.href ?? "").trim();
      /* Los `#seccion` que apuntan a algo que existe ya no llegan acá:
         `arreglarLanding` los deja vivos, y los que no, los normaliza a
         "#" para que el panel ofrezca completarlos. */
      if (href === "" || href === "#") {
        const t = textContent(el).replace(/\s+/g, " ").trim();
        if (t && !inv.linksVacios.includes(t)) { if (inv.linksVacios.length < MAX_ENLACES_DE_LANDING) inv.linksVacios.push(t); else deMas.links++; }
      }
    }
    if (el.name === "img" && /^https?:/i.test(el.attribs.src ?? "")) inv.imagenesExternas.push(el.attribs.src);
  }
  if (deMas.fotos) avisos.push(`Tu página tiene ${MAX_FOTOS_DE_LANDING + deMas.fotos} lugares de foto y te pedimos los primeros ${MAX_FOTOS_DE_LANDING}: los demás no se van a ver. Si los necesitás, pedile a Claude una página con menos fotos.`);
  if (deMas.links) avisos.push(`Tu página tiene ${MAX_ENLACES_DE_LANDING + deMas.links} links sueltos y te pedimos los primeros ${MAX_ENLACES_DE_LANDING}. Los demás no se van a poder tocar.`);
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
  bloques: { opiniones?: string; avisoVentas?: string };
  /**
   * El precio de bienvenida de ESTA visita, si está corriendo. Con esto,
   * `precio` y `precioAnterior` son los de MIENTRAS corre el reloj, y acá
   * viene lo que la página pasa a decir cuando llega a cero: el script lo
   * cambia en el lugar, sin recargar. Ver `lib/bienvenida`.
   */
  bienvenida?: {
    productId: string;
    token: string;
    venceEn: number;
    texto: string;
    despues: { precio: number; precioAnterior: number | null };
    /** Sólo en la previa del panel: el reloj se muestra quieto y marcado "Ejemplo". */
    demo?: boolean;
  };
  /** En la previa del panel: los huecos de foto sin foto se ven, con su nombre. */
  mostrarHuecos?: boolean;
};

const plata = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n).replace(/\u00a0/g, " ");

/** Lo que puede pasar a ser un `<a>` sin perder nada de lo que ten\u00eda adentro. */
const PUEDE_SER_LINK = ["div", "span", "p", "section", "article", "header", "footer", "li", "strong", "em", "b", "small", "figure", "label"];

/**
 * Red de seguridad para lo que YA est\u00e1 guardado.
 *
 * Lo que se dibuja sali\u00f3 limpio de `limpiarLanding`, pero sali\u00f3 limpio el d\u00eda
 * que se subi\u00f3: una versi\u00f3n guardada por una limpieza vieja no se vuelve a
 * mirar nunca. Y el bloque de estilo que va adelante es el lugar delicado \u2014un
 * `</style >` ah\u00ed adentro cierra la etiqueta y lo que sigue deja de ser CSS
 * para ser HTML nuestro\u2014. Ese CSS es de ella pero el `<style>` es nuestro, y
 * un "</" en CSS no significa nada, as\u00ed que sacarlo no le cuesta el dise\u00f1o.
 */
function blindarElEstilo(html: string): string {
  if (!html.startsWith("<style>\n")) return html;
  const fin = html.indexOf("\n</style>\n");
  if (fin < 0) return html;
  const css = html.slice(8, fin);
  return css.includes("</") ? `<style>\n${css.replace(/<\//g, "")}${html.slice(fin)}` : html;
}

/**
 * El HTML limpio + los datos del producto → lo que se muestra. Cada hueco
 * se llena; lo que no tiene con qué llenarse se saca, para no mostrar un
 * "[PRECIO]" ni una foto rota.
 */
export function armarLanding(htmlLimpio: string, d: DatosParaArmar): string {
  const doc = parseDocument(blindarElEstilo(htmlLimpio));
  /* Red de seguridad para lo YA guardado, como `blindarElEstilo`: una versión
     limpiada antes del 21/09/26 no pasó por `rescatarContador`: con el
     reloj prendido mostraría el nuestro arriba y su "15:00" quieto abajo, y
     apagado dejaría ese "15:00" clavado. Se rescata acá también, prendido o
     no; no cambia lo guardado ni el inventario. */
  if (!findOne((e) => e.attribs["data-tienda"] === "reloj", doc.children)) rescatarContador(doc);
  /* Misma red para la lista de tildar: lo guardado antes del 21/09/26 tiene
     el `.is-checked` en su hoja, y sin esto las casillas no se pintan. */
  const hojaGuardada = findOne((e) => e.name === "style", doc.children)?.children[0];
  if (hojaGuardada instanceof Text) hojaGuardada.data = rescatarCasillas(doc, [hojaGuardada.data]).hojas[0];
  const elementos = findAll(() => true, doc.children);
  let hayReloj = false;
  /* Lo que cada precio pasa a decir al vencer: sólo con el reloj de verdad.
     En la previa (demo) el reloj está quieto y los precios no cambian. */
  const despues = d.bienvenida && !d.bienvenida.demo ? d.bienvenida.despues : null;

  for (const el of elementos) {
    const h = hueco(el);
    if (!h) {
      if (el.name === "a") enlazar(el, d.enlaces);
      continue;
    }
    if (h === "precio") {
      ponerTexto(el, precioSinSignoRepetido(el, d.precio));
      if (despues) el.attribs[MARCA_DESPUES] = precioSinSignoRepetido(el, despues.precio);
    }
    else if (h === "precio-anterior") {
      if (d.precioAnterior && d.precioAnterior > d.precio) {
        ponerTexto(el, precioSinSignoRepetido(el, d.precioAnterior));
        /* Al vencer, el tachado vuelve a ser el de siempre —o desaparece si
           no había—. Vacío significa "sacalo". */
        if (despues) el.attribs[MARCA_DESPUES] = despues.precioAnterior && despues.precioAnterior > despues.precio ? precioSinSignoRepetido(el, despues.precioAnterior) : "";
      }
      else removeElement(el);
    }
    else if (h === "nombre") ponerTexto(el, d.nombre);
    else if (h === "comprar") {
      /* Un `href` en un <div> no se puede tocar: el botón se vería igual y no
         llevaría a ninguna parte, que es la peor forma de romperse. Si marcó
         el hueco en algo que no es un link, lo pasamos a link. (Un <img> no:
         ahí el link tendría que ir alrededor, y eso sí es adivinar.) */
      if (el.name !== "a" && PUEDE_SER_LINK.includes(el.name)) {
        el.name = "a";
        delete el.attribs.role;
      }
      el.attribs.href = d.hrefComprar;
      delete el.attribs.target; delete el.attribs.rel;
    }
    else if (h.startsWith("foto:")) ponerFoto(el, nombreDeFoto(h), d);
    else if (h === "reloj") {
      if (d.bienvenida && !hayReloj) { hayReloj = true; ponerReloj(el, d.bienvenida); }
      else removeElement(el);
    }
    else if (h === "opiniones") ponerBloque(el, d.bloques.opiniones);
    else if (h === "aviso-ventas") ponerBloque(el, d.bloques.avisoVentas);
  }
  /* Si el archivo no dejó dónde ponerlo, el reloj va en una barra nuestra,
     pegada arriba: un precio que vence sin nada que lo diga es un precio que
     cambia solo, y eso sí es lo que hace la competencia. */
  if (d.bienvenida && !hayReloj) {
    const barra = new Element("div", { "data-tienda-barra-propia": "" });
    ponerReloj(barra, d.bienvenida);
    prependChild(doc, barra);
  }
  return render(doc, { encodeEntities: "utf8", emptyAttrs: true });
}

/**
 * El reloj de verdad adentro del hueco: el texto de la dueña y la cuenta,
 * que el script mueve cada segundo (`landing-efectos`). El token y la
 * clave viajan en el elemento para que el navegador los guarde; la hora en
 * que vence se escribe ya contada, así la página llega entera aunque el
 * script no corra.
 */
function ponerReloj(el: Element, b: NonNullable<DatosParaArmar["bienvenida"]>) {
  el.attribs[MARCA_RELOJ] = "";
  el.attribs["data-tienda-vence"] = String(b.venceEn);
  el.attribs["data-tienda-token"] = b.token;
  el.attribs["data-tienda-clave"] = claveDeBienvenida(b.productId);
  if (b.demo) el.attribs[MARCA_DEMO] = "";
  const numero = cuentaRegresiva(b.venceEn, b.demo ? b.venceEn - 899_000 : Date.now()) ?? "0:00";
  /* Un contador rescatado (`rescatarContador`) ya trae la pastilla de la
     hora marcada: se le pone la cuenta AHÍ, para que conserve su CSS, y se
     reemplaza el resto de la caja por el texto de la dueña. */
  const suya = findOne((e) => e.attribs[MARCA_CUENTA] !== undefined, el.children);
  if (suya) {
    for (const hijo of [...el.children]) if (hijo !== suya && !(hijo instanceof Element && findOne((e) => e === suya, hijo.children))) removeElement(hijo);
    suya.children = [];
    prependChild(suya, new Text(numero));
  } else {
    el.children = [];
    prependChild(el, new Element("b", { [MARCA_CUENTA]: "" }, [new Text(numero)]));
  }
  prependChild(el, new Text(`${b.texto} `));
  if (b.demo) appendChild(el, new Element("small", { "data-tienda-ejemplo": "" }, [new Text("Ejemplo")]));
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
  /* En la previa, el hueco lleva su nombre puesto —esté lleno o vacío— para
     que al subir una foto la previa se recargue MIRÁNDOLA, en vez de volver
     arriba de todo. Con catorce fotos, volver arriba catorce veces cansa. */
  if (d.mostrarHuecos && nombre) el.attribs[MARCA_HUECO] = nombre;
  if (!url) {
    if (d.mostrarHuecos && nombre) {
      el.attribs["data-tienda-falta"] = nombre;
      if (el.name === "img") { el.attribs.src = ""; el.attribs.alt = `Falta la foto: ${nombre}`; }
      return;
    }
    removeElement(el);
    return;
  }
  /* `aria-label` es donde quedó la descripción que el archivo traía al lado
     del hueco (ver `textoDeAlgunAlt`). Se usa y se saca: si quedara puesta,
     el lector de pantalla diría dos veces lo mismo. */
  const alt = el.attribs.alt ?? el.attribs["data-alt"] ?? el.attribs["aria-label"] ?? el.attribs.title ?? "";
  delete el.attribs["aria-label"];
  /* Con qué clase se viste la foto, si el archivo lo dijo. Ver
     `nombreDeClaseDeLaFoto`: es lo que la pone adelante del adorno y con el
     tamaño que el diseño le había reservado. */
  const clase = el.attribs[CLASE_DE_LA_FOTO];
  delete el.attribs[CLASE_DE_LA_FOTO];
  if (el.name === "img") {
    el.attribs.src = url;
    delete el.attribs.srcset;
    if (clase) el.attribs.class = [el.attribs.class, clase].filter(Boolean).join(" ");
    el.attribs[MARCA_FOTO] = "";
    el.attribs.loading = el.attribs.loading ?? "lazy";
    el.attribs.decoding = "async";
    return;
  }
  /* Un contenedor (div, figure): la foto va adentro y su caja queda, así
     el CSS que le puso sigue valiendo. */
  const img = new Element("img", { src: url, alt, loading: "lazy", decoding: "async", [MARCA_FOTO]: "" });
  if (clase) img.attribs.class = clase;
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
