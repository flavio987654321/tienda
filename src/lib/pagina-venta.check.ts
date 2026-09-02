/**
 * Chequeos de la página de venta. Se corre con:
 *
 *   npx tsx src/lib/pagina-venta.check.ts
 *
 * Lo de acá decide qué se puede escribir en la página que la persona lee ANTES
 * de pagar, y qué se puede apagar de esa página. Dos cosas que si se aflojan no
 * se ven en el panel: se ven en un reclamo.
 */

import { readFileSync } from "fs";
import {
  SECCIONES, buscarSeccion, contenidoPorDefecto, normalizarContenido, porQueNoSeDibuja,
  conFichas, FICHA_DIAS, FICHA_ANIO, ESTILOS, PALETAS, COLORES_CLAROS, COLORES_OSCUROS,
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
const conTope = (c: Campo): boolean => {
  if (c.tipo === "lista") {
    return (c.maxItems ?? 0) > 0 && (c.campos ?? []).length > 0 && (c.campos ?? []).every(conTope);
  }
  if (c.tipo === "numero") return typeof c.min === "number" && typeof c.max === "number" && c.min <= c.max;
  return c.largo > 0;
};
check("CAT-C", SECCIONES.every((s) => s.campos.every(conTope)),
  "todo campo tiene tope: los de texto en caracteres, las listas en cantidad, los números en piso y techo");

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

/* ── La garantía y sus días ───────────────────────────────────────────────── */

/* ⚠️ Arranca en 10 y no en 7 (que es lo que pone la competencia) porque en
   Argentina una compra a distancia ya tiene 10 días de arrepentimiento por ley,
   y eso corre se escriba o no. Prometer menos no ahorra nada: igual hay que dar
   los 10, y encima la página anuncia menos de lo que la persona puede pedir. */
const campoDias = buscarSeccion("garantia")?.campos.find((c) => c.clave === "dias");
check("GAR-A", campoDias?.porDefecto === 10,
  "la garantía arranca en 10 días, que es lo que la ley da igual");

check("GAR-B", (() => {
  const p = normalizarContenido({ secciones: [{ clave: "garantia", campos: { dias: 0 } }] });
  const d = seccion(p, "garantia")?.campos.dias as number;
  const q = normalizarContenido({ secciones: [{ clave: "garantia", campos: { dias: 99999 } }] });
  return d === (campoDias?.min ?? 1) && (seccion(q, "garantia")?.campos.dias as number) === (campoDias?.max ?? 365);
})(), "y el número queda entre su piso y su techo");

check("GAR-C", ["", "   ", null, undefined, {}, [], "muchos", NaN].every((v) => {
  const p = normalizarContenido({ secciones: [{ clave: "garantia", campos: { dias: v } }] });
  return seccion(p, "garantia")?.campos.dias === 10;
}), "lo que no es un número vuelve al de fábrica: vacío dibujaría 'Garantía de  días'");

check("GAR-D", (() => {
  const p = normalizarContenido({ secciones: [{ clave: "garantia", campos: { dias: 30.7 } }] });
  return seccion(p, "garantia")?.campos.dias === 31;
})(), "y siempre es entero: no existe media garantía");

/* El número vive en UN campo y los textos lo nombran. Escrito a mano en dos
   lados, se cambia uno y queda un título que dice 7 con una garantía de 30. */
check("GAR-E", (() => {
  const campos = { dias: 15, titulo: `Garantía de ${FICHA_DIAS} días` };
  return conFichas(campos.titulo, campos) === "Garantía de 15 días";
})(), "{dias} en un texto se reemplaza por el número de al lado");

check("GAR-F", conFichas("sin ficha", { dias: 15 }) === "sin ficha",
  "y un texto sin la ficha queda igual");

/* ── El cierre, la barra y el pie ─────────────────────────────────────────── */

/* ⚠️ EL punto de esta tanda. En la página de la competencia el cierre tiene sus
   PROPIAS casillas de "Precio" y "Precio original", así que el número vive en
   tres lugares: el producto, el resumen y el cierre. Corregís uno, te olvidás de
   otro, y la misma página muestra dos precios distintos — el que la persona lee
   antes de pagar. Acá el precio no es un campo de ninguna sección. */
const escribenPrecio = SECCIONES.filter((s) =>
  s.campos.some((c) => /precio|price/i.test(c.clave)));
check("CIE-A", escribenPrecio.length === 0,
  "ninguna sección tiene un campo de precio: sale del producto y no puede discrepar");

check("CIE-B", buscarSeccion("cierre") !== null && buscarSeccion("barra") !== null,
  "existen el cierre y la barra de compra");

/* La barra vive pegada al borde de abajo, así que moverla en la lista no
   significa nada. */
check("CIE-C", buscarSeccion("barra")?.sePuedeMover === false,
  "la barra no se ordena: está fuera del flujo de la página");
check("CIE-D", buscarSeccion("barra")?.sePuedeOcultar === true
  && buscarSeccion("cierre")?.sePuedeOcultar === true,
  "pero las dos se pueden apagar");

/* El año escrito a mano queda viejo el 1 de enero en todas las páginas de todos
   los clientes a la vez, y nadie se entera. El de la competencia dice "© 2026". */
check("PIE-A", (() => {
  const c = buscarSeccion("pie")?.campos.find((x) => x.clave === "copyright");
  return typeof c?.ejemplo === "string" && c.ejemplo.includes(FICHA_ANIO);
})(), "el copyright de fábrica lleva la ficha del año, no un número escrito");

check("PIE-B", conFichas(`© ${FICHA_ANIO} Taller`, {}, { anio: 2027 }) === "© 2027 Taller",
  "y la ficha se reemplaza por el año que le pasen");

/* Sin el año, la ficha queda cruda en la página. Se prefiere eso a inventar un
   año: es visible y se arregla, un año equivocado no se nota. */
check("PIE-C", conFichas(`© ${FICHA_ANIO}`, {}) === `© ${FICHA_ANIO}`,
  "sin año no se inventa ninguno");

/* Los enlaces legales van fijos y no son campos: son obligaciones. El de
   arrepentimiento lo pide la Resolución 424/2020 y ya existe en el proyecto. */
check("PIE-D", (() => {
  const d = readFileSync("src/components/digitales/PaginaDeVenta.tsx", "utf8");
  return ["/terminos", "/privacidad", "/arrepentimiento"].every((h) => d.includes(`href="${h}"`));
})(), "el pie lleva Términos, Privacidad y el botón de arrepentimiento, fijos");

/* ── Las listas ───────────────────────────────────────────────────────────── */

check("LIS-A", (() => {
  const items = Array.from({ length: 50 }, (_, i) => ({ titulo: `beneficio ${i}` }));
  const p = normalizarContenido({ secciones: [{ clave: "beneficios", campos: { items } }] });
  return (seccion(p, "beneficios")?.campos.items as unknown[]).length === 8;
})(), "una lista se corta en su tope de ítems");

check("LIS-B", (() => {
  const items = [{ titulo: "sirve" }, { titulo: "  " }, {}, null, "hola", { otro: "x" }];
  const p = normalizarContenido({ secciones: [{ clave: "beneficios", campos: { items } }] });
  const l = seccion(p, "beneficios")?.campos.items as Array<Record<string, unknown>>;
  return l.length === 1 && l[0].titulo === "sirve";
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

/* ── La ruta que guarda ───────────────────────────────────────────────────── */

/* ⚠️ Todo lo de arriba no sirve de nada si la ruta guarda lo que le mandaron sin
   pasarlo por `normalizarContenido`. Es UNA línea, y no se nota hasta que una
   página publicada aparece sin precio. */
const guardar = readFileSync("src/app/api/digitales/productos/[id]/pagina/route.ts", "utf8");

check("RUTA-A", /normalizarContenido\(cuerpo\)/.test(guardar),
  "lo que llega se normaliza antes de guardarse");
check("RUTA-B", /paginaVenta:\s*JSON\.stringify\(pagina\)/.test(guardar)
  && !/paginaVenta:\s*JSON\.stringify\(cuerpo\)/.test(guardar)
  && !/paginaVenta:\s*crudo/.test(guardar),
  "y lo que se guarda es lo normalizado, nunca el cuerpo del pedido");

/* El dueño va ADENTRO del where: una consulta que ya no puede devolver lo ajeno
   no se puede olvidar de comprobarlo. */
check("RUTA-C", /ownerId:\s*user\.id/.test(guardar),
  "sólo se puede guardar la página de un producto propio");
check("RUTA-D", /rolDigital:\s*"PRINCIPAL"/.test(guardar),
  "y sólo la de un principal: los bonos viajan adentro de la de su padre");

/* `JSON.parse` de varios megas bloquea el hilo mientras corre. Se mide antes. */
check("RUTA-E", guardar.indexOf("crudo.length > MAX_CUERPO") < guardar.indexOf("JSON.parse(crudo)"),
  "el cuerpo se mide ANTES de parsearlo");

/* ── La página pública ────────────────────────────────────────────────────── */

const publica = readFileSync("src/app/p/[id]/page.tsx", "utf8");
check("PUB-A", /normalizarContenido\(fila\.paginaVenta\)/.test(publica),
  "lo guardado se vuelve a normalizar al leerlo: una columna vieja se dibuja con la forma de hoy");
check("PUB-B", /rolDigital:\s*"PRINCIPAL"/.test(publica),
  "sólo un principal tiene página pública");
/* Un borrador con su precio adentro no se le muestra a cualquiera que pruebe ids. */
check("PUB-C", /isActive/.test(publica) && /ownerId/.test(publica),
  "un producto sin publicar lo ve sólo su dueña");

/* ── El editor ────────────────────────────────────────────────────────────── */

const editor = readFileSync("src/app/digitales/productos/[id]/pagina/EditorClient.tsx", "utf8");

/* Que una sección no se pueda apagar no puede parecer un error: donde iría el
   botón va un candado que dice por qué. */
const fijas = SECCIONES.filter((s) => !s.sePuedeOcultar).map((s) => s.clave);
const motivos = editor.split("const MOTIVO_FIJO")[1] ?? "";
check("EDI-A", fijas.length > 0 && fijas.every((c) => new RegExp(`${c}:\\s*"`).test(motivos)),
  "cada sección que no se puede apagar explica por qué");

check("EDI-B", /enVuelo\.current/.test(editor),
  "el guardado no se dispara dos veces con doble clic");
check("EDI-C", /maxLength=\{campo\.largo\}/.test(editor),
  "las casillas llevan el tope del catálogo, no uno escrito a mano");
/* La previa es un iframe y no un recuadro: un recuadro angosto no reacomoda el
   diseño, porque las medidas miran el ancho de la VENTANA. */
check("EDI-D", /<iframe/.test(editor) && editor.includes("/p/${productoId}?previa=1"),
  "la previa es la página de verdad adentro de un iframe");

/* ── Qué se dibuja y qué no ───────────────────────────────────────────────── */

/* ⚠️ Una sola regla, leída desde los dos lados: la página pública decide con
   ella qué pinta, y el editor avisa con ella "esta sección no se va a ver, y por
   qué". Si fueran dos, el panel diría una cosa y la página haría otra. */
const sinBonos = { hayBonos: false };
const conBonos = { hayBonos: true };
const secc = (clave: string, campos: Record<string, unknown> = {}, visible = true) =>
  ({ clave, visible, campos });

check("DIB-A", porQueNoSeDibuja(secc("bonos"), sinBonos) !== null
  && porQueNoSeDibuja(secc("bonos"), conBonos) === null,
  "la sección de bonos se dibuja sólo si hay bonos cargados");

check("DIB-B", porQueNoSeDibuja(secc("beneficios", { items: [] }), sinBonos) !== null
  && porQueNoSeDibuja(secc("beneficios", { items: [{ titulo: "algo" }] }), sinBonos) === null,
  "una lista vacía no se dibuja, y con un ítem sí");

/* Un ítem con todos los campos en blanco no cuenta: dibujaría un renglón vacío. */
check("DIB-C", porQueNoSeDibuja(secc("preguntas", { items: [{ pregunta: "", respuesta: "" }] }), sinBonos) !== null,
  "ni un ítem con todo en blanco");

check("DIB-D", porQueNoSeDibuja(secc("beneficios", { items: [{ titulo: "x" }] }), sinBonos) === null
  && porQueNoSeDibuja({ ...secc("beneficios", { items: [{ titulo: "x" }] }), visible: false }, sinBonos) !== null,
  "y una sección apagada no se dibuja aunque tenga contenido");

/* Las que van siempre no dependen de nada: si alguna vez devolvieran un motivo,
   habría páginas publicadas sin precio o sin producto. */
check("DIB-E", ["portada", "producto", "precio", "pie"].every(
  (c) => porQueNoSeDibuja(secc(c), sinBonos) === null),
  "portada, producto, precio y pie se dibujan siempre, aun vacías");

/* El aviso de ventas muestra compras REALES. Hoy no hay ninguna venta digital,
   así que no se dibuja — y lo que no va a hacer nunca es inventar una. */
check("DIB-F", porQueNoSeDibuja(secc("avisoDeVentas"), conBonos) !== null,
  "el aviso de ventas no dibuja nada hasta que haya una venta de verdad");

const dibujante = readFileSync("src/components/digitales/PaginaDeVenta.tsx", "utf8");
check("DIB-G", /seDibuja\(s, ctx\)/.test(dibujante),
  "la página pública decide con esa regla, no con una copia adentro");
check("DIB-H", /porQueNoSeDibuja\(s, \{ hayBonos/.test(editor),
  "y el editor avisa con la misma, así los dos dicen lo mismo");

/* ── Lo que la IA tiene que poder llenar ──────────────────────────────────── */

/* ⚠️ Un beneficio de un solo renglón se lee como una lista de supermercado. Con
   el porqué abajo, convence — es lo que hace la competencia y era la diferencia
   más grande entre su página y la nuestra. Vale igual para los puntos de dolor. */
check("LLE-A", ["beneficios", "dolores"].every((c) => {
  const items = buscarSeccion(c)?.campos.find((x) => x.clave === "items");
  const hijos = (items?.campos ?? []).map((h) => h.clave);
  return hijos.includes("titulo") && hijos.includes("detalle");
}), "cada beneficio y cada dolor tienen título Y explicación, no un renglón suelto");

/* La bajada de cada sección es texto que la IA llena y que hoy no existía. */
check("LLE-B", ["beneficios", "dolores", "comoFunciona", "preguntas", "opiniones"].every(
  (c) => buscarSeccion(c)?.campos.some((x) => x.clave === "subtitulo")),
  "las secciones largas tienen bajada, no sólo título");

/* ── El estilo y la paleta ────────────────────────────────────────────────── */

/* ⚠️ EL motivo por el que las paletas son combinaciones armadas y no un
   cuentagotas: con colores libres alguien elige amarillo sobre blanco y el
   BOTÓN DE COMPRAR desaparece — y no lo ve, porque en su pantalla y con su luz
   se distingue. Acá el contraste se calcula, no se confía.

   La cuenta es la de la norma de accesibilidad (WCAG): 4,5 para texto normal.
   Se aplica al texto sobre el fondo y al texto ARRIBA del botón. */
function canal(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luz(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}
function contraste(a: string, b: string): number {
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const MINIMO = 4.5;
const flojas = PALETAS.filter((p) =>
  contraste(COLORES_CLAROS.tinta, p.fondo) < MINIMO ||
  contraste(COLORES_CLAROS.tinta, p.suave) < MINIMO ||
  contraste(COLORES_CLAROS.tenue, p.fondo) < MINIMO ||
  contraste(p.sobreAcento, p.acento) < MINIMO);

check("PAL-A", flojas.length === 0,
  `toda paleta se lee en claro: texto y texto tenue sobre el fondo, y el texto del botón, mínimo ${MINIMO}` +
  (flojas.length ? ` — flojas: ${flojas.map((p) => p.nombre).join(", ")}` : ""));

/* ⚠️ El estilo Nocturno da vuelta los colores, así que hay que medirlo aparte:
   una paleta que se lee en claro no se lee sola en oscuro. El caso concreto que
   lo destapó es el verde del "ahorrás $X" — el oscuro sobre fondo oscuro
   desaparece, y ese renglón es el que dice cuánta plata se ahorra. */
const o = COLORES_OSCUROS;
const flojasOscuro =
  contraste(o.tinta, o.fondo) < MINIMO ||
  contraste(o.tinta, o.tarjeta) < MINIMO ||
  contraste(o.tenue, o.fondo) < MINIMO ||
  contraste(o.ok, o.fondo) < MINIMO;
check("PAL-J", !flojasOscuro,
  "y la versión oscura también: texto, texto tenue y el verde del ahorro");

/* El acento no cambia entre claro y oscuro — es lo que hace saltar el botón—,
   así que tiene que leerse contra los dos fondos. */
/* ⚠️ MEDIDO: los acentos oscuros no se despegan del fondo oscuro. Grafito daba
   1,28 sobre 3 — el botón de comprar quedaba casi invisible—, y Azul y Violeta
   tampoco llegaban. Por eso cada paleta tiene su acento para Nocturno. */
const acentosFlojos = PALETAS.filter((p) =>
  contraste(p.acentoOscuro, o.fondo) < 3 ||
  contraste(p.sobreAcentoOscuro, p.acentoOscuro) < MINIMO);
check("PAL-K", acentosFlojos.length === 0,
  "el botón también se despega del fondo oscuro, y su texto se lee" +
  (acentosFlojos.length ? ` — flojos: ${acentosFlojos.map((p) => p.nombre).join(", ")}` : ""));

check("PAL-B", PALETAS.length >= 3 && new Set(PALETAS.map((p) => p.clave)).size === PALETAS.length,
  "hay varias paletas y ninguna clave repetida");
check("PAL-C", ESTILOS.length >= 3 && new Set(ESTILOS.map((e) => e.clave)).size === ESTILOS.length,
  "hay varios estilos, sin claves repetidas");

/* ⚠️ Este chequeo salió de un error real: el primer intento tenía "Clásico" y
   "Suave" con la misma cara —cambiaba el radio de los bordes y poco más— y no se
   distinguían. Tres estilos que se ven igual son un estilo con tres nombres. */
const caras = ESTILOS.map((e) => [e.tarjeta, e.boton, e.titulo, e.seccion].join("|"));
check("PAL-H", new Set(caras).size === ESTILOS.length,
  "y ninguno comparte la cara con otro");

/* El aire es lo que más se nota de lejos, así que tienen que ser tres distintos:
   si los tres respiran igual, la diferencia queda en detalles que sólo se ven
   mirando de cerca. */
check("PAL-I", new Set(ESTILOS.map((e) => e.seccion)).size === ESTILOS.length,
  "cada estilo tiene su propio aire, que es lo primero que se ve");

/* Una clave que no conocemos vuelve a la de fábrica. No se guarda lo que llegó:
   si mañana se saca una paleta, las páginas que la usaban se dibujan con la
   primera y no con un color que ya no existe. */
check("PAL-D", ["inventada", "", null, 5, {}].every((v) => {
  const p = normalizarContenido({ estilo: v, paleta: v });
  return p.estilo === ESTILOS[0].clave && p.paleta === PALETAS[0].clave;
}), "un estilo o una paleta desconocidos vuelven a los de fábrica");

check("PAL-E", (() => {
  const p = normalizarContenido({ estilo: "suave", paleta: "violeta" });
  return p.estilo === "suave" && p.paleta === "violeta";
})(), "y los que existen se respetan");

/* ⚠️ Tailwind necesita ver la clase ENTERA escrita en el código para generarla.
   Una armada pegando pedazos no existe, y la página sale sin estilo. */
check("PAL-F", ESTILOS.every((e) => ![e.tarjeta, e.boton, e.titulo].some((c) => c.includes("${"))),
  "las clases de cada estilo están escritas enteras, no armadas con pedazos");

/* El color del botón sale de la paleta, no de una clase escrita en el dibujante:
   si estuviera escrito ahí, elegir otra paleta no cambiaría lo único que hay
   que mirar en la página. */
check("PAL-G", /bg-\[color:var\(--pv-acento\)\]/.test(dibujante)
  && !/bg-orange-600/.test(dibujante),
  "el botón de comprar toma su color de la paleta");

/* ── La previa en vivo ────────────────────────────────────────────────────── */

/* La previa es otra ventana, así que el editor le manda el borrador. Un
   `message` lo puede mandar CUALQUIER ventana — incluida una página ajena que
   meta ésta en un iframe suyo—, así que hay dos cosas que no se negocian. */
const enVivo = readFileSync("src/app/p/[id]/PaginaEnVivo.tsx", "utf8");

check("VIVO-A", /e\.origin !== window\.location\.origin/.test(enVivo),
  "sólo se escuchan avisos de nuestro propio origen");
check("VIVO-B", /normalizarContenido\(d\.pagina\)/.test(enVivo),
  "y el borrador que llega pasa por el catálogo, igual que si viniera del servidor");

/* Con `"*"` como destino, el día que ese iframe apunte a otro lado le estaríamos
   entregando el borrador a un dominio ajeno. */
check("VIVO-C", !/postMessage\([^)]*,\s*["']\*["']\s*\)/.test(editor)
  && !/postMessage\([^)]*,\s*["']\*["']\s*\)/.test(enVivo),
  "y ningún aviso se manda a `*`");

/* ── Tocar en la previa abre la casilla ───────────────────────────────────── */

/* ⚠️ La clave de la sección llega de OTRA VENTANA, así que se comprueba contra
   el catálogo antes de usarla. Sin eso, un aviso armado a mano manda cualquier
   cosa a `querySelector`. */
check("TOC-A", /d\.tipo === AVISO_TOCAR[\s\S]{0,120}buscarSeccion\(d\.clave\)/.test(editor),
  "la sección que llega de la previa se comprueba contra el catálogo");
check("TOC-B", /data-seccion=\{s\.clave\}/.test(editor),
  "y cada sección del editor se puede encontrar para traerla a la vista");

/* Se toca el TEXTO, no un cartelito de veinte píxeles arriba a la derecha:
   apuntarle a la chapita es puntería, tocar el párrafo sale solo. */
check("TOC-D", /onClick=\{alClic\}/.test(dibujante),
  "el bloque entero abre su casilla, no sólo el cartel del nombre");

/* Pero si el clic cayó sobre algo que ya hace otra cosa —el botón de comprar, un
   enlace del pie, una pregunta que se abre— gana eso: si no, la previa se comería
   sus propios controles. */
check("TOC-E", /closest\("button, a, summary, input, label/.test(dibujante),
  "y un clic sobre un botón o un enlace sigue haciendo lo suyo");

/* La marca es sólo de la previa: quien compra no tiene que ver recuadros de
   edición ni poder tocar nada que no sea comprar. */
check("TOC-C", /alTocarSeccion/.test(dibujante) && !/alTocarSeccion/.test(publica),
  "la página pública no dibuja las marcas de edición");

/* Sin `key`, el iframe no se vuelve a montar en cada cambio: si lo hiciera,
   perdería el scroll y saltaría al principio a cada tecla. */
check("VIVO-D", /ref=\{marco\}/.test(editor) && !/key=\{refresco\}/.test(editor),
  "la previa se actualiza sin volver a cargarse, así no pierde el scroll");

/* ── Que un texto largo no rompa la página ────────────────────────────────── */

/* ⚠️ Visto ROTO en la página de la competencia el 02/09/26: se pega un título sin
   espacios ("carasfsdfsdfsdfsdf…"), la palabra no puede cortarse en ningún lado y
   empuja el ancho de toda la página. Queda una barra de scroll horizontal, el
   título saliéndose de la pantalla y el contenido corrido.

   Nosotros teníamos el mismo agujero. Se tapa en UN lugar porque `overflow-wrap`
   se hereda: puesto en la raíz, vale para todos los textos de la página. */
check("ANCHO-A", /\[overflow-wrap:anywhere\]/.test(dibujante),
  "una palabra sin espacios se corta en vez de empujar el ancho de la página");
check("ANCHO-B", /overflow-x-clip/.test(dibujante),
  "y si algo igual se pasa, se recorta: nunca aparece scroll horizontal");

/* `clip` y no `hidden`: `hidden` en un eje convierte el otro en un contenedor
   con scroll propio, y la página quedaría con una barra vertical adentro. */
check("ANCHO-C", !/overflow-x-hidden/.test(dibujante),
  "y se recorta con clip, no con hidden, que dejaría un scroll vertical propio");

/* ── La oferta se ve, y no se puede inventar ──────────────────────────────── */

/* ⚠️ Esto salió de mirar la página de la competencia al lado de la nuestra el
   02/09/26: la de ellos parecía una vidriera y la nuestra no. La diferencia no
   era el color — era que el descuento estaba susurrado.

   Lo que ellos hacen para verse vivos y NOSOTROS NO COPIAMOS: cupos que no
   existen, un reloj que se reinicia solo, ⭐4,9 con cero ventas y "16 personas
   viendo". Todo eso es inventado.

   Lo de acá abajo es lo contrario: el sello y el ahorro salen de una resta
   entre dos números que cargó quien vende. Sin precio tachado no hay nada. */

check("OFE-A", ESTILOS.every((e) => e.sello.trim().length > 0),
  "cada estilo dice qué forma tiene su sello de oferta");

/* No reusa `tarjeta`: la de Editorial es una línea arriba con espacio abajo, y
   en una píldora de tres palabras eso queda como un renglón suelto. */
check("OFE-B", ESTILOS.every((e) => e.sello !== e.tarjeta),
  "y el sello no es la tarjeta: una tarjeta achicada no se lee como sello");

/* ⚠️ El de la competencia es un campo de texto libre, así que se puede escribir
   "80% OFF" arriba de un precio que nunca bajó. Acá no hay dónde escribirlo:
   ninguna sección tiene un campo de descuento ni de precio. */
const hayCampoDePrecio = SECCIONES.some((s) => s.campos.some((c) =>
  /precio|descuento|oferta|porcentaje|ahorr/i.test(c.clave)));
check("OFE-C", !hayCampoDePrecio,
  "el descuento no se escribe en ningún lado: sale de restar los dos precios");

check("OFE-D", dibujante.includes("porcentaje > 0 &&")
  && dibujante.includes("${estilo.sello}"),
  "y sin precio tachado el sello directamente no se dibuja");

/* El renglón del ahorro era el más chico de la ficha siendo el que más empuja. */
check("OFE-E", dibujante.includes("font-extrabold text-[color:var(--pv-ok)]"),
  "cuánta plata se ahorra tiene renglón propio y peso, no letra chica gris");

/* ⚠️ Un sello de garantía en una página SIN garantía es una promesa que nadie
   escribió y que después hay que cumplir igual. Por eso mira `seDibuja` y no
   `visible`: una sección encendida pero vacía tampoco se dibuja. */
check("OFE-F", dibujante.includes("{dias ? <span>")
  && dibujante.includes("seDibuja(s, { hayBonos"),
  "el sello de garantía aparece sólo si esa sección se va a ver de verdad");

/* Los días del sello y los del texto tienen que ser el mismo número, y ese
   número vive en el campo de la sección — no hay un 7 escrito en el dibujante. */
check("OFE-G", dibujante.includes("Garantía de {dias} días"),
  "y con los días que dice la sección, no con un número escrito en el dibujo");

/* ── Quién puede enmarcar la página ───────────────────────────────────────── */

/* ⚠️ La política base del sitio es `frame-ancestors 'none'`, y con eso la previa
   del editor salía EN BLANCO. Se afloja sólo para `/p/`, y sólo a `'self'`.
   Nunca a `*`: en esta pantalla se aprieta el botón de pagar, y un iframe ajeno
   encima es exactamente cómo se roba ese clic. */
const config = readFileSync("next.config.ts", "utf8");

check("CSP-A", /source:\s*"\/p\/\(\.\*\)"/.test(config),
  "la página de venta tiene su propia regla de cabeceras");
check("CSP-B", /cspPaginaDigital[\s\S]{0,120}frame-ancestors 'self'/.test(config),
  "y se deja enmarcar por nuestro propio dominio, que es lo que hace andar la previa");
check("CSP-C", !/frame-ancestors \*/.test(config),
  "por NADIE más: un iframe ajeno arriba del botón de pagar roba el clic");
/* Sin excluirla de la regla base, el navegador recibe dos CSP y aplica la
   intersección — o sea que vuelve a ganar `'none'` y la previa queda en blanco. */
check("CSP-D", config.includes("|p\\\\/|precios"),
  "y está excluida de la regla base, o las dos cabeceras se pisan");

console.log(fallos === 0
  ? "\nok — la página de venta no se puede dejar sin precio, sin producto ni sin contacto"
  : `\nFALLA — ${fallos} chequeo(s) de la página de venta`);
process.exit(fallos === 0 ? 0 : 1);
