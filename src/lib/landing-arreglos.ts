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

import { Element, Text, type ChildNode, type Document, type ParentNode } from "domhandler";
import { findAll, textContent, appendChild, replaceElement, removeElement } from "domutils";
import { MARCA_BARRA, CSS_DE_LA_BARRA, MARCA_FLECHA, CSS_DE_LAS_FLECHAS, MARCA_CUENTA } from "@/lib/landing-efectos";

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

  /* ── 3. Las flechas del carrusel ─────────────────────────────────────── */

  /* La tira de fotos que se desliza NO necesita programa: es `overflow-x` con
     `scroll-snap`, y arrastrando con el dedo o con el mouse anda sola. Las
     flechitas de al lado sí lo necesitaban, y sin él quedan dos redondeles
     lindos que no hacen nada — que es peor que no tenerlos, porque se tocan.

     Se reconocen por lo que DICEN de sí mismas: el nombre accesible que dejó
     escrito («Página anterior», «Página siguiente») o la clase. No por dónde
     están: el script mira al tocarlas si hay algo que se pueda deslizar cerca,
     y si no hay, no hace nada. Marcar de más no rompe nada. */
  const flechas: Element[] = [];
  for (const el of todos()) {
    if (el.attribs[ERA_BOTON] !== "boton") continue;
    const hacia = haciaDondeApunta(el);
    if (!hacia) continue;
    delete el.attribs[ERA_BOTON];
    el.attribs[MARCA_FLECHA] = hacia;
    /* Era un botón: que se pueda tocar con el dedo y llegar con el tabulador. */
    el.attribs.role = "button";
    el.attribs.tabindex = "0";
    flechas.push(el);
  }
  if (flechas.length) {
    css += (css ? "\n" : "") + CSS_DE_LAS_FLECHAS;
    hechos.push(
      `Volvimos a conectar ${flechas.length === 1 ? "la flecha" : `las ${flechas.length} flechas`} de pasar fotos: ` +
      `${flechas.length === 1 ? "era un botón" : "eran botones"} y sin el programa no ${flechas.length === 1 ? "hacía" : "hacían"} nada. ` +
      `La tira también se puede arrastrar con el dedo, como antes.`,
    );
  }

  /* ── 4. Lo que quedó sin función ─────────────────────────────────────── */

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

/**
 * Para qué lado apunta una flecha de carrusel, o null si no es una.
 *
 * Se mira lo que el botón dice de sí mismo: el nombre accesible que la
 * persona que lo escribió le dejó puesto («Página anterior»), la clase
 * (`afl-arrow--prev`) y el texto. En el archivo de verdad, la de la derecha
 * no tiene NADA en la clase que diga "next" — sólo el `aria-label`. Por eso
 * se miran las tres cosas y no una.
 */
function haciaDondeApunta(el: Element): "antes" | "despues" | null {
  const dice = `${el.attribs["aria-label"] ?? ""} ${el.attribs.class ?? ""} ${el.attribs.title ?? ""} ${textContent(el).replace(/\s+/g, " ").trim()}`.toLowerCase();
  const atras = /anterior|previo|\bprev\b|izquierd|atr[aá]s|\bback\b|‹|←|«|<</.test(dice);
  const adelante = /siguiente|\bnext\b|derech|adelante|pr[oó]xim|›|→|»|>>/.test(dice);
  /* Las dos cosas a la vez no es una flecha: es un texto que las nombra. */
  if (atras === adelante) return null;
  return atras ? "antes" : "despues";
}

/** Otro botón de los que quedaron sin programa. */
function esOtroBoton(el: Element | null): boolean {
  return !!el && (el.attribs[ERA_BOTON] === "boton" || el.attribs["aria-expanded"] !== undefined);
}

/* ── Los "[PRECIO]" que llenaba el script ───────────────────────────────── */

/**
 * Estos archivos vienen con marcadores entre corchetes que un script llenaba
 * desde su CONFIGURACIÓN: `$[PRECIO]`, `Antes $[PRECIO ANTERIOR]`. Sin el
 * script quedan escritos así, a la vista de quien entra.
 *
 * Dos de esos los podemos llenar de verdad, porque el dato es nuestro: el
 * precio y el precio tachado salen de Productos y se actualizan solos el día
 * que los cambie. El marcador se reemplaza por el hueco `data solo-tienda`
 * correspondiente, partiendo el texto donde estaba.
 *
 * Los demás (`[MARCA]`, `[NOMBRE DEL EBOOK]`) no se tocan: no sabemos qué
 * van. Ésos se avisan.
 */
const MARCADOR_DE_PRECIO = /\[\s*precio\s*(anterior|viejo|de\s*lista|tachado)?\s*\]/i;

export function llenarMarcadoresDePrecio(doc: Document): Arreglos {
  let n = 0;
  for (const nodo of [...findAll(() => true, doc.children)].flatMap((el) => el.children)) {
    if (nodo.type !== "text") continue;
    const texto = (nodo as Text).data;
    const m = texto.match(MARCADOR_DE_PRECIO);
    if (!m || m.index === undefined) continue;
    const padre = nodo.parent;
    if (!padre || !("children" in padre)) continue;
    /* Si el elemento que lo contiene YA es un hueco, no se anida otro. */
    if (padre.type === "tag" && (padre as Element).attribs["data-tienda"]) continue;

    const cual = m[1] ? "precio-anterior" : "precio";
    /* Si el marcador es TODO lo que dice su elemento —el caso normal:
       `$<span data-afl-field="precio">[PRECIO]</span>`— el hueco es ese
       elemento, no uno nuevo adentro. Así el `$` que está al lado sigue
       siendo su vecino y no se escribe dos veces. */
    if (padre.type === "tag" && padre.children.length === 1 && texto.trim() === m[0]) {
      (padre as Element).attribs["data-tienda"] = cual;
      (padre as Element).children = [];
      n++;
      continue;
    }
    const hueco = new Element("span", { "data-tienda": cual });
    const antes = texto.slice(0, m.index);
    const despues = texto.slice(m.index + m[0].length);
    const piezas: ChildNode[] = [];
    if (antes) piezas.push(new Text(antes));
    piezas.push(hueco);
    if (despues) piezas.push(new Text(despues));

    const hijos = padre.children as ChildNode[];
    const donde = hijos.indexOf(nodo);
    hijos.splice(donde, 1, ...piezas);
    reenlazar(padre, hijos);
    n++;
  }
  if (!n) return { hechos: [], sueltos: [], css: "" };
  return {
    hechos: [
      n === 1
        ? "Llenamos 1 lugar del precio que había quedado escrito a mano («[PRECIO]»): ahora sale del precio de tu producto y se actualiza solo cuando lo cambies."
        : `Llenamos ${n} lugares del precio que habían quedado escritos a mano («[PRECIO]»): ahora salen del precio de tu producto y se actualizan solos cuando lo cambies.`,
    ],
    sueltos: [],
    css: "",
  };
}

/* ── 4. Los lugares donde va una foto ───────────────────────────────────── */

/**
 * Dónde van las fotos, en un archivo que no se escribió para nosotros.
 *
 * Nuestras instrucciones piden `data-tienda="foto:Portada"`, y con eso el
 * panel sabe qué pedirle. Pero un archivo hecho en otro lado marca sus fotos
 * a su manera, y ahí la vendedora se queda mirando un cuadro que dice
 * "Cargá la URL en imagenes.portada" sin ningún lugar donde cargarla. Medido
 * sobre un archivo de verdad: **catorce** lugares de foto y ninguno se
 * reconocía. La portada del ebook, las seis fotos de recetas, las cinco
 * páginas de muestra, el bono y el pack. Nada.
 *
 * Lo que se reconoce no es una plataforma, es la FORMA de marcar una foto, y
 * son dos:
 *
 *   1. **Un atributo que dice "imagen" y trae un nombre corto.**
 *      `data-afl-img="portada"`, `data-image="hero"`, `data-foto="bonus"`.
 *      Eso es un hueco con nombre puesto por quien escribió el archivo, y el
 *      nombre sirve de clave: aguanta que ella baje una versión nueva del
 *      diseño sin perder la foto que ya subió. Se marca en el saneado
 *      (`limpiarLanding`), porque ese atributo no sobrevive al filtro.
 *
 *   2. **Una imagen cuyo `src` no es una dirección.** `src="URL_DE_TU_LOGO"`,
 *      `src="{{imagen}}"`, `src=""`. Eso no es una foto, es el lugar donde
 *      iba una — y hoy se ve rota en la página.
 *
 * Lo que NO se toca: una imagen con una dirección de verdad, aunque apunte
 * afuera. Ésa se ve, y el panel ya avisa aparte que conviene subirla.
 */
export const ERA_FOTO = "foto";

/**
 * `src` que va a mostrar algo DE VERDAD cuando la página la sirvamos
 * nosotros: una dirección completa y nada más.
 *
 * ⚠️ Una ruta relativa (`fotos/tapa.jpg`, `/img/tapa.jpg`) parece una
 * dirección pero no lo es: apunta a un archivo del equipo de ella que nunca
 * subió a ningún lado, así que en nuestra dirección da 404 y se ve una
 * imagen rota. Tratarla como lugar de foto le da dónde subirla, que es lo
 * que necesita. Todo lo que llega acá ya pasó por el filtro, así que un
 * `data:` o un `javascript:` no existen más.
 */
function esUnaDireccion(src: string): boolean {
  return /^https?:\/\/\S/i.test(src.trim());
}

export function rescatarFotos(doc: Document): Arreglos {
  const nombrados: string[] = [];
  const rotas: string[] = [];
  let sinNombre = 0;

  for (const el of findAll(() => true, doc.children)) {
    /* Los que marcó el saneado por el atributo (forma 1). */
    if (el.attribs[ERA_BOTON] === ERA_FOTO) {
      delete el.attribs[ERA_BOTON];
      nombrados.push((el.attribs["data-tienda"] ?? "").replace(/^foto:/i, ""));
      continue;
    }
    /* Y las imágenes con un marcador en vez de una dirección (forma 2). */
    if (el.name !== "img" || el.attribs["data-tienda"]) continue;
    if (esUnaDireccion(el.attribs.src ?? "")) continue;
    const nombre = (el.attribs.alt ?? "").trim().slice(0, 40) || `foto ${++sinNombre}`;
    el.attribs["data-tienda"] = `foto:${nombre}`;
    rotas.push(nombre);
  }

  const total = nombrados.length + rotas.length;
  if (!total) return { hechos: [], sueltos: [], css: "" };
  /* El mismo nombre en varios lugares es UNA foto puesta varias veces (la
     portada suele ir tres veces), y así se cuenta: es lo que va a subir. */
  const distintas = new Set([...nombrados, ...rotas]).size;
  return {
    hechos: [
      `Encontramos ${total === 1 ? "1 lugar" : `${total} lugares`} donde va una foto` +
      `${distintas !== total ? ` (${distintas === 1 ? "es una sola foto repetida" : `son ${distintas} fotos, algunas repetidas`})` : ""}: ` +
      `${rotas.length && nombrados.length ? "el archivo los tenía marcados a su manera y " : ""}` +
      `abajo te los pedimos de a uno. Los que no cargues no se van a ver — mejor eso que un cuadro vacío.`,
    ],
    sueltos: [],
    css: "",
  };
}

/* ── 5. La barra de comprar que aparecía al bajar ───────────────────────── */

/**
 * La barra pegada abajo con el precio y el botón: en celular es EL botón de
 * comprar, el que te sigue por la página. Casi todas arrancan escondidas y
 * las mostraba el script al pasar la portada, así que sin el script no
 * aparece nunca — y no se nota, porque la página se ve bien.
 *
 * Se rescata sólo cuando se juntan las dos cosas, que es lo que la hace
 * reconocible sin saber nada de esa landing:
 *
 *   1. el CSS la deja pegada a la pantalla (`position: fixed` o `sticky`), y
 *   2. está escondida y nada en la página puede mostrarla
 *      (`lib/landing-invisible` ya lo calculó).
 *
 * Marcarla alcanza: el script de `landing-efectos` la muestra al bajar una
 * pantalla y la vuelve a esconder al subir, que es lo que hacía la de ella y
 * lo que hacen todas. Lo que se fuerza es lo mínimo —ni la posición ni el
 * tamaño, que son de su diseño— y `display` no se toca, para no romperle el
 * "esta barra sólo en celular".
 */
export function rescatarBarras(escondidos: readonly { el: Element; texto: string }[], pegados: ReadonlySet<Element>): Arreglos {
  const rescatadas = escondidos.filter((x) => pegados.has(x.el));
  if (!rescatadas.length) return { hechos: [], sueltos: [], css: "" };
  for (const x of rescatadas) x.el.attribs[MARCA_BARRA] = "";
  return {
    hechos: [
      `Rescatamos ${rescatadas.length === 1 ? "la barra de comprar pegada" : `${rescatadas.length} barras pegadas`} abajo: ` +
      `${rescatadas.length === 1 ? "la escondía" : "las escondía"} el CSS y ${rescatadas.length === 1 ? "la mostraba" : "las mostraba"} el programa que le sacamos. ` +
      `Ahora ${rescatadas.length === 1 ? "aparece sola" : "aparecen solas"} cuando la persona baja, como en tu diseño.`,
    ],
    sueltos: [],
    css: CSS_DE_LA_BARRA,
  };
}

/**
 * Después de partir un texto hay que volver a coser los vecinos: meter algo
 * en la lista de hijos NO actualiza el `prev` y el `next` de cada uno.
 *
 * No es un detalle: `armarLanding` mira el texto de al lado para no escribir
 * el signo `$` dos veces, y sin esto el precio salía "$$ 9.900".
 */
function reenlazar(padre: ParentNode, hijos: ChildNode[]) {
  for (let i = 0; i < hijos.length; i++) {
    hijos[i].parent = padre;
    hijos[i].prev = hijos[i - 1] ?? null;
    hijos[i].next = hijos[i + 1] ?? null;
  }
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

/* ── El contador escrito ────────────────────────────────────────────────────
 *
 * "🔥 Precio promocional reservado por: 15:00". Lo traen todas, y en todas
 * es mentira: sin su script queda clavado. Hasta el 21/09/26 se avisaba
 * ("pedile a Claude que lo saque o que deje el hueco"), y con el precio de
 * bienvenida prendido quedaban DOS relojes: el nuestro arriba y el suyo
 * quieto abajo. Ahora se rescata: la caja que lo contiene pasa a ser el
 * hueco `reloj`, y la pastilla con la hora, el lugar de la cuenta.
 *
 *   - Prendido: adentro va el texto de la dueña y la cuenta de verdad,
 *     vestidos con SU CSS —la barra sigue siendo su barra, la pastilla su
 *     pastilla—.
 *   - Apagado: la caja desaparece entera. Nunca un "15:00" quieto.
 *
 * Qué se reconoce: un elemento cuyo texto es SÓLO una hora ("15:00",
 * "09:59:59"), sin hijos, con una señal de contador —su clase o la de su
 * caja dice timer/countdown/time/reloj/contador/cuenta, o el texto de la
 * caja dice "reservado", "expira", "termina", "quedan", "vence"— y una caja
 * chica (≤ 120 letras, ≤ 6 elementos): una barra, no la sección entera.
 * "Clase en vivo a las 18:00" no tiene señal y no se toca. Y "la clase
 * termina a las 18:00" dice "termina", pero "a las" (o "18:00 hs") la
 * delata como hora del día, y un horario no se toca. Uno solo: si hay un
 * segundo contador, ése se sigue avisando.
 */
const HORA_ESCRITA = /^\s*\d{1,2}:\d{2}(:\d{2})?\s*$/;
const SENAL_DE_CONTADOR = /timer|countdown|\btime\b|reloj|contador|cuenta/i;
const TEXTO_DE_CONTADOR = /reservad|expira|termina|quedan|vence|se acaba/i;
const HORA_DEL_DIA = /\b(a|desde|hasta|de)\s+las?\s+\d{1,2}:\d{2}|\d{1,2}:\d{2}\s*(hs\b|h\b|am\b|pm\b)/i;

export function rescatarContador(doc: Document): Arreglos & { textos: string[] } {
  for (const el of findAll((e) => !e.children.some((c) => c.type === "tag") && HORA_ESCRITA.test(textContent(e)), doc.children)) {
    const caja = el.parent && el.parent.type === "tag" ? (el.parent as Element) : null;
    if (!caja || caja.attribs["data-tienda"] !== undefined) continue;
    /* Los trozos se unen con un espacio: pegados quedaría "reservado por:15:00". */
    const textoCaja = caja.children.map((c) => textContent(c)).join(" ").replace(/\s+/g, " ").trim();
    const clases = `${el.attribs.class ?? ""} ${caja.attribs.class ?? ""}`;
    if (!SENAL_DE_CONTADOR.test(clases) && !TEXTO_DE_CONTADOR.test(textoCaja)) continue;
    if (HORA_DEL_DIA.test(textoCaja)) continue;
    if (textoCaja.length > 120 || findAll(() => true, caja.children).length > 6) continue;
    caja.attribs["data-tienda"] = "reloj";
    el.attribs[MARCA_CUENTA] = "";
    return {
      hechos: [`El contador escrito («${textoCaja}») pasó a ser el hueco del reloj: con el precio de bienvenida prendido cuenta de verdad, con tu diseño; apagado, esa barra desaparece.`],
      sueltos: [], css: "", textos: [textoCaja],
    };
  }
  return { hechos: [], sueltos: [], css: "", textos: [] };
}

/* ── La lista de tildar ─────────────────────────────────────────────────────
 *
 * "Tocá las que te pasan": casillas de verdad (<label><input type=checkbox>)
 * —eso lo hacen bien— pero el tilde se DIBUJA con una clase que ponía su
 * JavaScript: `.afl-pain.is-checked .afl-pain__box{…}`. Sin el programa la
 * casilla se marca y no se ve nada. Es el patrón de todas las IAs (clase
 * `is-checked`, `active`, `selected`, `on` puesta por código).
 *
 * El rescate es sólo CSS: en SU hoja, `.clase.is-checked` pasa a ser
 * `.clase:has(input:checked)`, que el navegador entiende sin código. Sólo
 * para clases que de verdad envuelven una casilla (hasta tres niveles arriba
 * del <input>): un `.tab.active` de pestañas no tiene casilla y no se toca,
 * porque no habría nada que lo prenda.
 */
const CLASE_DE_TILDE = /\.([\w-]+)\.(is-checked|checked|is-selected|selected|is-active|active|is-on|on)(?![\w-])/g;

export function rescatarCasillas(doc: Document, hojas: readonly string[]): { hechos: string[]; hojas: string[] } {
  const conCasilla = new Set<string>();
  for (const input of findAll((e) => e.name === "input" && /^(checkbox|radio)$/i.test(e.attribs.type ?? ""), doc.children)) {
    let p: ParentNode | null = input.parent;
    for (let i = 0; i < 3 && p && p.type === "tag"; i++, p = p.parent) {
      for (const c of ((p as Element).attribs.class ?? "").split(/\s+/)) if (c) conCasilla.add(c);
    }
  }
  if (!conCasilla.size) return { hechos: [], hojas: [...hojas] };
  const tocadas = new Set<string>();
  const nuevas = hojas.map((h) => h.replace(CLASE_DE_TILDE, (m, base: string) => {
    if (!conCasilla.has(base)) return m;
    tocadas.add(base);
    return `.${base}:has(input:checked)`;
  }));
  return {
    hechos: tocadas.size ? ["La lista para tildar se pintaba con un programa: ahora cada casilla se marca sola al tocarla, con tu diseño."] : [],
    hojas: nuevas,
  };
}
