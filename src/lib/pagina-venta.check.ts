/**
 * Chequeos de la página de venta. Se corre con:
 *
 *   npx tsx src/lib/pagina-venta.check.ts
 *
 * Lo de acá decide qué se puede escribir en la página que la persona lee ANTES
 * de pagar, y qué se puede apagar de esa página. Dos cosas que si se aflojan no
 * se ven en el panel: se ven en un reclamo.
 */

import {
  SECCIONES, buscarSeccion, contenidoPorDefecto, normalizarContenido,
  type Campo,
} from "./pagina-venta";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const claves = (p: { secciones: Array<{ clave: string }> }) => p.secciones.map((s) => s.clave);
const seccion = (p: ReturnType<typeof normalizarContenido>, clave: string) =>
  p.secciones.find((s) => s.clave === clave);

/* ── El catálogo está bien formado ────────────────────────────────────────── */

check("CAT-A", new Set(SECCIONES.map((s) => s.clave)).size === SECCIONES.length,
  "no hay dos secciones con la misma clave");

const camposOk = SECCIONES.every((s) => {
  const cs = s.campos.map((c) => c.clave);
  return new Set(cs).size === cs.length;
});
check("CAT-B", camposOk, "ni dos campos con la misma clave adentro de una sección");

/* Un campo sin tope es un campo sin tope en la base: alguien pega un libro. */
const conTope = (c: Campo): boolean =>
  c.tipo === "lista"
    ? (c.maxItems ?? 0) > 0 && (c.campos ?? []).length > 0 && (c.campos ?? []).every(conTope)
    : c.largo > 0;
check("CAT-C", SECCIONES.every((s) => s.campos.every(conTope)),
  "todo campo tiene tope: los de texto en caracteres, las listas en cantidad");

/* ── Lo que no se puede apagar ─────────────────────────────────────────────
 *
 * ⚠️ EL chequeo de este archivo. En el de la competencia el precio SÍ se puede
 * ocultar, y esa combinación arma una página que dice "Comprar ahora" sin
 * mostrar cuánto sale hasta el checkout. */
check("FIJO-A", buscarSeccion("precio")?.sePuedeOcultar === false,
  "el precio NO se puede ocultar: se ve antes de pagar, siempre");
check("FIJO-B", buscarSeccion("producto")?.sePuedeOcultar === false,
  "el producto tampoco: una página que cobra tiene que decir qué entrega");
check("FIJO-C", buscarSeccion("pie")?.sePuedeOcultar === false,
  "ni el pie: ahí está a quién reclamarle");
check("FIJO-D", buscarSeccion("portada")?.sePuedeOcultar === false,
  "ni la portada, que es la primera pantalla");

check("FIJO-E", buscarSeccion("portada")?.sePuedeMover === false
  && buscarSeccion("pie")?.sePuedeMover === false,
  "la portada y el pie están clavados en su lugar");

/* Nacen apagadas a propósito: una página recién creada no tiene opiniones de
   verdad ni una oferta con fecha, y encenderlas de fábrica es pedir que se
   inventen. */
check("FIJO-F", ["opiniones", "urgencia", "avisoDeVentas", "garantia"].every(
  (c) => buscarSeccion(c)?.encendida === false),
  "opiniones, urgencia, aviso de ventas y garantía nacen apagadas");

/* ── La página de fábrica ─────────────────────────────────────────────────── */

const base = contenidoPorDefecto();
check("DEF-A", claves(base).join() === SECCIONES.map((s) => s.clave).join(),
  "una página nueva trae todas las secciones, en el orden del catálogo");
check("DEF-B", seccion(base, "portada")?.campos.titulo !== "",
  "y viene con los textos de ejemplo puestos");
check("DEF-C", seccion(base, "opiniones")?.visible === false
  && seccion(base, "precio")?.visible === true,
  "las apagadas vienen apagadas y las obligatorias encendidas");

/* ── Lo que llega de afuera ───────────────────────────────────────────────── */

/* Esta función atiende dos puertas: el panel y lo que devuelva la IA. Ninguna de
   las dos puede dejar la página en un estado que la pantalla no sepa dibujar. */
check("NOR-A", [null, undefined, 5, "", "no soy json", [], {}, { secciones: 7 }].every(
  (v) => claves(normalizarContenido(v)).length === SECCIONES.length),
  "cualquier basura devuelve una página entera y válida");

check("NOR-B", (() => {
  const p = normalizarContenido({ secciones: [{ clave: "inventada", visible: true }] });
  return !claves(p).includes("inventada");
})(), "una sección que no está en el catálogo no entra");

check("NOR-C", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "precio" }, { clave: "precio" }, { clave: "precio" }],
  });
  return claves(p).filter((c) => c === "precio").length === 1;
})(), "y una repetida entra una sola vez: dos precios son dos números");

/* ⚠️ Mandar `visible: false` a mano es la forma obvia de saltear FIJO-A. */
check("NOR-D", (() => {
  const p = normalizarContenido({ secciones: [{ clave: "precio", visible: false }] });
  return seccion(p, "precio")?.visible === true;
})(), "apagar el precio mandando visible:false no funciona");

check("NOR-E", (() => {
  const p = normalizarContenido({ secciones: [{ clave: "beneficios", visible: false }] });
  return seccion(p, "beneficios")?.visible === false;
})(), "pero las que sí se pueden apagar, se apagan");

/* La portada y el pie vuelven a su lugar aunque el pedido diga otra cosa. */
check("NOR-F", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "pie" }, { clave: "preguntas" }, { clave: "portada" }],
  });
  const cs = claves(p);
  return cs[0] === "portada" && cs[cs.length - 1] === "pie";
})(), "la portada queda primera y el pie último, mandes el orden que mandes");

check("NOR-G", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "preguntas" }, { clave: "beneficios" }],
  });
  const cs = claves(p).filter((c) => c === "preguntas" || c === "beneficios");
  return cs.join() === "preguntas,beneficios";
})(), "y el orden que sí se puede cambiar se respeta");

/* Una sección nueva del catálogo aparece sola en las páginas viejas, pero
   APAGADA: no se le cambia la página a nadie sin avisar. */
check("NOR-H", (() => {
  const p = normalizarContenido({ secciones: [{ clave: "portada" }] });
  return claves(p).length === SECCIONES.length && seccion(p, "beneficios")?.visible === false;
})(), "las secciones que faltaban se agregan apagadas");

/* ── Los textos ───────────────────────────────────────────────────────────── */

check("TXT-A", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "portada", campos: { titulo: "x".repeat(500) } }],
  });
  return (seccion(p, "portada")?.campos.titulo as string).length === 120;
})(), "un texto largo se recorta al tope del campo");

check("TXT-B", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "portada", campos: { titulo: `Ho${String.fromCharCode(0)}la` } }],
  });
  return seccion(p, "portada")?.campos.titulo === "Ho la";
})(), "los caracteres invisibles se limpian, igual que en todas las puertas");

check("TXT-C", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "portada", campos: { titulo: { hola: 1 }, subtitulo: 42 } }],
  });
  const c = seccion(p, "portada")?.campos;
  return c?.titulo === "" && c?.subtitulo === "";
})(), "lo que no es texto queda vacío, nunca '[object Object]'");

/* El botón de comprar sin texto es un botón que no se lee. */
check("TXT-D", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "portada", campos: { textoBoton: "   " } }],
  });
  return (seccion(p, "portada")?.campos.textoBoton as string).length > 0;
})(), "el texto del botón vacío vuelve al de fábrica");

/* ── La imagen ────────────────────────────────────────────────────────────── */

/* ⚠️ Esto termina adentro de un atributo de la página pública. */
check("IMG-A", (() => {
  const malas = [
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "http://x.com/a.png",
    "//x.com/a.png",
    " javascript:alert(1)",
  ];
  return malas.every((m) => {
    const p = normalizarContenido({ secciones: [{ clave: "portada", campos: { imagen: m } }] });
    return seccion(p, "portada")?.campos.imagen === "";
  });
})(), "sólo https: ni javascript:, ni data:, ni http pelado");

check("IMG-B", (() => {
  const url = "https://xx.supabase.co/storage/v1/object/sign/imagenes/a.png";
  const p = normalizarContenido({ secciones: [{ clave: "portada", campos: { imagen: url } }] });
  return seccion(p, "portada")?.campos.imagen === url;
})(), "y una https entra tal cual");

/* ── La fecha de la oferta ────────────────────────────────────────────────── */

check("FEC-A", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "urgencia", campos: { hasta: "2026-12-24T15:00:00.000Z" } }],
  });
  return seccion(p, "urgencia")?.campos.hasta === "2026-12-24T15:00:00.000Z";
})(), "una fecha real se guarda en ISO");

check("FEC-B", ["mañana", "", "31/02/2026", 5, null, {}].every((v) => {
  const p = normalizarContenido({ secciones: [{ clave: "urgencia", campos: { hasta: v } }] });
  return seccion(p, "urgencia")?.campos.hasta === null;
}), "y lo que no es una fecha queda en null, no en una cuenta regresiva rara");

/* ── Las listas ───────────────────────────────────────────────────────────── */

check("LIS-A", (() => {
  const items = Array.from({ length: 50 }, (_, i) => ({ texto: `beneficio ${i}` }));
  const p = normalizarContenido({ secciones: [{ clave: "beneficios", campos: { items } }] });
  return (seccion(p, "beneficios")?.campos.items as unknown[]).length === 8;
})(), "una lista se corta en su tope de ítems");

check("LIS-B", (() => {
  const items = [{ texto: "sirve" }, { texto: "  " }, {}, null, "hola", { otro: "x" }];
  const p = normalizarContenido({ secciones: [{ clave: "beneficios", campos: { items } }] });
  const l = seccion(p, "beneficios")?.campos.items as Array<Record<string, unknown>>;
  return l.length === 1 && l[0].texto === "sirve";
})(), "los ítems vacíos o basura se descartan: no dibujan filas en blanco");

check("LIS-C", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "preguntas", campos: { items: [{ pregunta: "a", respuesta: "b".repeat(900) }] } }],
  });
  const l = seccion(p, "preguntas")?.campos.items as Array<Record<string, string>>;
  return l[0].respuesta.length === 500;
})(), "y adentro de un ítem los topes valen igual");

check("LIS-D", ["hola", 5, null, {}].every((v) => {
  const p = normalizarContenido({ secciones: [{ clave: "beneficios", campos: { items: v } }] });
  return Array.isArray(seccion(p, "beneficios")?.campos.items);
}), "lo que no es una lista queda como lista vacía, no rompe la página");

/* ── Nada de campos de más ────────────────────────────────────────────────── */

/* Lo que devuelva la IA se guarda con esta función. Un campo que el catálogo no
   declara no se dibuja en ningún lado, así que guardarlo es guardar algo que
   nadie mira y que igual sale por el endpoint público. */
check("EXT-A", (() => {
  const p = normalizarContenido({
    secciones: [{ clave: "portada", campos: { titulo: "ok", colado: "<script>", onclick: "x" } }],
  });
  const c = seccion(p, "portada")?.campos ?? {};
  return !("colado" in c) && !("onclick" in c)
    && Object.keys(c).join() === buscarSeccion("portada")!.campos.map((x) => x.clave).join();
})(), "un campo que el catálogo no declara no se guarda");

/* ── Ida y vuelta ─────────────────────────────────────────────────────────── */

check("IDA-A", (() => {
  const una = normalizarContenido(contenidoPorDefecto());
  const dos = normalizarContenido(JSON.stringify(una));
  return JSON.stringify(una) === JSON.stringify(dos);
})(), "normalizar dos veces da lo mismo, y pasando por JSON también");

console.log(fallos === 0
  ? "\nok — la página de venta no se puede dejar sin precio, sin producto ni sin contacto"
  : `\nFALLA — ${fallos} chequeo(s) de la página de venta`);
process.exit(fallos === 0 ? 0 : 1);
