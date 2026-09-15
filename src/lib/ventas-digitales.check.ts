/**
 * Chequeos de lo puro de Tus ventas. Se corre con:
 *
 *   npx tsx src/lib/ventas-digitales.check.ts
 */

import { existsSync, readFileSync } from "node:fs";
import {
  resolverRangoVentas, limitesDelRango, leerConsulta, direccionDeVentas, dondeVentas,
  mensajeParaElComprador, enlaceDeMail, enlaceDeWhatsApp,
} from "./ventas-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El rango ────────────────────────────────────────────────────────────── */

const hoy = "2026-09-15";
check("RANGO-A", JSON.stringify(resolverRangoVentas(undefined, hoy)) === JSON.stringify({ clave: "todo", desde: null, hasta: null }), "sin parámetro es Todo, sin recorte");
check("RANGO-B", JSON.stringify(resolverRangoVentas("basura", hoy)) === JSON.stringify({ clave: "todo", desde: null, hasta: null }), "una clave inventada cae a Todo");
check("RANGO-C", resolverRangoVentas("hoy", hoy).desde === hoy && resolverRangoVentas("hoy", hoy).hasta === hoy, "Hoy es el día de hoy");
check("RANGO-D", resolverRangoVentas("7", hoy).desde === "2026-09-09", "7 días son hoy y los seis anteriores");
check("RANGO-E", resolverRangoVentas("mes", hoy).desde === "2026-09-01" && resolverRangoVentas("mes", hoy).hasta === hoy, "Este mes va del 1 a hoy");
const anterior = resolverRangoVentas("mes-anterior", hoy);
check("RANGO-F", anterior.desde === "2026-08-01" && anterior.hasta === "2026-08-31", "Mes pasado es agosto entero");
const enero = resolverRangoVentas("mes-anterior", "2026-01-03");
check("RANGO-G", enero.desde === "2025-12-01" && enero.hasta === "2025-12-31", "en enero, el mes pasado es diciembre del año anterior");
const marzo = resolverRangoVentas("mes-anterior", "2028-03-10");
check("RANGO-H", marzo.desde === "2028-02-01" && marzo.hasta === "2028-02-29", "febrero bisiesto termina el 29");
check("RANGO-I", limitesDelRango(resolverRangoVentas("todo", hoy)) === null, "Todo no pone límites");
const lim = limitesDelRango(resolverRangoVentas("hoy", hoy))!;
check("RANGO-J", lim.gte.toISOString() === "2026-09-15T03:00:00.000Z" && lim.lt.toISOString() === "2026-09-16T03:00:00.000Z",
  "los límites son las 00:00 argentinas (03:00 UTC) del día y del siguiente");

/* ── La dirección ────────────────────────────────────────────────────────── */

const c = leerConsulta({ estado: "cobradas", q: "  ana@mail.com  ", pagina: "3", p: "ckabc123", rango: "mes" }, hoy);
check("DIR-A", c.estado === "cobradas" && c.q === "ana@mail.com" && c.pagina === 3 && c.p === "ckabc123" && c.rango.clave === "mes", "lee los cinco parámetros y recorta la búsqueda");
const sucio = leerConsulta({ estado: "DROP TABLE", q: "x".repeat(500), pagina: "NaN", p: "../../etc", rango: "1=1" }, hoy);
check("DIR-B", sucio.estado === null && sucio.q.length === 120 && sucio.pagina === 1 && sucio.p === null && sucio.rango.clave === "todo",
  "basura en cada parámetro cae a lo seguro: sin estado, búsqueda recortada, página 1, sin producto, Todo");
check("DIR-C", leerConsulta({ pagina: "99999999" }, hoy).pagina === 10_000, "la página tiene techo");
check("DIR-D", leerConsulta({ q: ["a", "b"] }, hoy).q === "", "un parámetro repetido no se toma");
check("DIR-E", direccionDeVentas({}) === "/digitales/ventas" && direccionDeVentas({ rango: "todo", pagina: 1 }) === "/digitales/ventas",
  "los valores por defecto no se escriben en la dirección");
check("DIR-F", direccionDeVentas({ p: "abc", rango: "mes", estado: "cobradas", q: "ana", pagina: 2 }) === "/digitales/ventas?p=abc&rango=mes&estado=cobradas&q=ana&pagina=2",
  "todo lo demás sí, siempre en el mismo orden");

/* ── El where ────────────────────────────────────────────────────────────── */

const d = dondeVentas("tienda1", c, "prod1") as Record<string, unknown>;
check("WHERE-A", d.storeId === "tienda1" && JSON.stringify(d.items) === JSON.stringify({ some: { productId: "prod1" } }) && d.status === "CONFIRMED",
  "lleva la tienda, el producto (por su línea) y el estado");
check("WHERE-B", (d.createdAt as { gte: Date }).gte.toISOString() === "2026-09-01T03:00:00.000Z", "y el rango como instantes");
check("WHERE-C", JSON.stringify((d.buyer as { OR: unknown[] }).OR).includes("ana@mail.com"), "y la búsqueda por correo y nombre");
const todo = dondeVentas("tienda1", leerConsulta({}, hoy), null) as Record<string, unknown>;
check("WHERE-D", Object.keys(todo).join() === "storeId", "sin filtros, el where es sólo la tienda");
const conP = dondeVentas("tienda1", leerConsulta({ p: "ajeno" }, hoy), null) as Record<string, unknown>;
check("WHERE-E", !("items" in conP), "el producto de la dirección no filtra si no se verificó: manda el `elegido`, no el `p`");

/* ── Escribirle ──────────────────────────────────────────────────────────── */

const m1 = mensajeParaElComprador({ nombre: "Ana María López", producto: "Mecánica fácil", sinBajar: true });
check("MSJ-A", m1.cuerpo.startsWith("Hola Ana,") && /todavía no bajaste el archivo/.test(m1.cuerpo) && m1.asunto === "Tu compra de Mecánica fácil",
  "al que no bajó se le pregunta si le llegó el mail, por el nombre de pila");
const m2 = mensajeParaElComprador({ nombre: null, producto: "Mecánica fácil", sinBajar: false });
check("MSJ-B", m2.cuerpo.startsWith("Hola,") && /cómo te fue/.test(m2.cuerpo), "al que bajó se le pregunta cómo le fue, y sin nombre no se inventa uno");
check("MSJ-B2", mensajeParaElComprador({ nombre: "   ", producto: "X", sinBajar: false }).cuerpo.startsWith("Hola,\n"), "un nombre de puros espacios no saluda \"Hola ,\"");
const mail = enlaceDeMail("ana@mail.com", { asunto: "A & B", cuerpo: "línea 1\nlínea 2" });
check("MSJ-C", mail === "mailto:ana%40mail.com?subject=A%20%26%20B&body=l%C3%ADnea%201%0Al%C3%ADnea%202", "el mailto codifica el &, los acentos y los saltos");
const wa = (t: string | null) => enlaceDeWhatsApp(t, { cuerpo: "hola" });
check("WA-A", wa("11 5555-1234") === "https://wa.me/5491155551234?text=hola", "un celular de Buenos Aires como lo escribe la gente");
check("WA-B", wa("+54 9 11 5555 1234") === "https://wa.me/5491155551234?text=hola" && wa("0341 15 555 1234") === "https://wa.me/5493415551234?text=hola",
  "con +54 9 adelante, o con 0 y 15 (Rosario), se normaliza igual");
check("WA-D", wa("11 1555-1234") === "https://wa.me/5491115551234?text=hola", "un 15 en el medio de un número de diez dígitos es parte del número");
check("WA-C", wa("1234") === null && wa(null) === null && wa("") === null && wa("no tengo") === null, "lo que no parece un celular no abre ningún chat");

/* ── La pantalla y la ruta ───────────────────────────────────────────────── */

const pagina = readFileSync("src/app/digitales/ventas/page.tsx", "utf8").replace(/\r\n/g, "\n");
const cliente = readFileSync("src/app/digitales/ventas/VentasClient.tsx", "utf8").replace(/\r\n/g, "\n");
check("PANT-A", !/FILTROS = \{/.test(pagina) && /contextoDeVentas\(/.test(pagina), "la página usa el contexto compartido, no un filtro propio");
check("PANT-B", /direccionDeVentas/.test(cliente) && !/function direccion\(/.test(cliente), "el cliente arma la dirección con la función compartida");
check("PANT-C", /RANGOS_VENTAS\.map/.test(cliente) && /enlaceDeMail\(/.test(cliente), "el cliente tiene los chips de fecha y el botón de escribirle");
const ruta = "src/app/api/digitales/ventas/exportar/route.ts";
check("RUTA-A", existsSync(ruta), "la exportación existe");
if (existsSync(ruta)) {
  const r = readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
  check("RUTA-B", /contextoDeVentas\(/.test(r) && /puedeVer\(ctx\.tier, "exportar"\)/.test(r), "exporta con el mismo contexto que la pantalla y vuelve a mirar el plan");
  check("RUTA-C", /if \(!user \|\| user\.role !== "DIGITAL"\)/.test(r) && r.indexOf("user.role") < r.indexOf("contextoDeVentas("), "sin sesión digital no consulta nada");
  check("RUTA-D", /checkRateLimit\(`exportar-ventas:\$\{user\.id\}`/.test(r), "con tope de ritmo");
  check("RUTA-E", /"Cache-Control": "no-store"/.test(r) && /attachment; filename=/.test(r), "baja como archivo y no se cachea");
  check("RUTA-F", /TECHO_DE_EXPORTACION/.test(r), "con techo de filas");
}

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
