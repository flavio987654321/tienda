/**
 * Chequeos de la exportación de Estadísticas. Se corre con:
 *
 *   npx tsx src/lib/exportar-estadisticas.check.ts
 *
 * Lo que importa acá es una sola cosa: los nombres de campaña los escribió un
 * desconocido y una planilla EJECUTA una celda que empieza con `=`. Se prueba
 * con lo que un bot mandaría. Lo demás —que el archivo abra bien en Excel en
 * castellano— se prueba también, porque un CSV con el separador equivocado es
 * una columna sola de texto ilegible.
 */

import { existsSync, readFileSync } from "node:fs";
import { celda, csvGeneral, csvCampanias, nombreDelArchivo } from "./exportar-estadisticas";
import { armarEstadisticas, resolverRango, puedeVer, DESDE_QUE_PLAN } from "./estadisticas-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── La celda ────────────────────────────────────────────────────────────── */

check("CEL-A", celda("=HYPERLINK(\"http://malo\")") === "\"'=HYPERLINK(\"\"http://malo\"\")\"",
  "una celda que empieza con = se antepone con apóstrofo y va entre comillas: la planilla la muestra, no la ejecuta");
check("CEL-B", celda("+1") === "\"'+1\"" && celda("-cmd") === "\"'-cmd\"" && celda("@SUM") === "\"'@SUM\"",
  "lo mismo con +, - y @");
check("CEL-C", celda("promo; 20%") === "\"promo; 20%\"",
  "el separador adentro de un texto no parte la fila: va entre comillas");
check("CEL-D", celda("dijo \"hola\"") === "\"dijo \"\"hola\"\"\"",
  "las comillas de adentro se doblan");
check("CEL-E", celda("a\r\nb\tc") === "\"a b c\"",
  "los saltos de línea y tabulaciones se vuelven espacio: una fila es una fila");
check("CEL-F", celda(1234) === "1234" && celda(12.5) === "12,50" && celda(null) === "" && celda(undefined) === "",
  "los números van con coma decimal y sin miles; lo vacío, vacío");

/* ── Los archivos ────────────────────────────────────────────────────────── */

const rango = resolverRango("7", "2026-09-14");
const d = armarEstadisticas({
  rango,
  ordenes: [{
    estado: "CONFIRMED", motivo: null, total: 10000, tasa: 8, dia: "2026-09-10", diaSemana: 3, hora: 21,
    principal: "a", comprador: "u1", upsell: 0, bajo: true, vencidoSinBajar: false, mail: "ENVIADO", recordada: false,
    origen: "instagram", campania: { medio: "pago", campania: "=cmd|' /C calc'!A0", anuncio: "video" },
  }],
  visitas: [{ productId: "a", date: "2026-09-10", paso: "pagina", dispositivo: "movil", count: 50 }],
  origenes: [{ productId: "a", date: "2026-09-10", paso: "pagina", source: "instagram", count: 50 }],
  campanias: [{ productId: "a", date: "2026-09-10", medio: "pago", campania: "=cmd|' /C calc'!A0", anuncio: "video", count: 50 }],
  principales: [{ id: "a", name: "Mecánica; \"fácil\"", publicada: true }],
  elegido: null,
});

const general = csvGeneral(d, "Estadísticas — General");
const camp = csvCampanias(d, "Estadísticas — Campañas");

check("CSV-A", general.startsWith("﻿") && camp.startsWith("﻿"), "empiezan con la marca de orden de bytes: los acentos abren bien");
check("CSV-B", /\r\n/.test(general) && general.split("\r\n").every((l) => !l.includes("\n")), "las filas terminan en CRLF");
check("CSV-C", /"Ventas";1\r\n/.test(general) && /"Te quedó \(neto\)";9200\r\n/.test(general),
  "General lleva los números del período con punto y coma");
check("CSV-D", /"Mecánica; ""fácil""";"sí";1;9200;50;2\r\n/.test(general),
  "el nombre del producto con punto y coma y comillas adentro no rompe la fila");
check("CSV-E", camp.includes("\"'=cmd|' /C calc'!A0\"") && !/\r\n"Anuncio pago";"=cmd/.test(camp) && !/;"=cmd/.test(camp),
  "un nombre de campaña que es una fórmula sale desactivado con el apóstrofo, nunca crudo");
check("CSV-F", /"Instagram";"\(todos\)";50;0;1;9200;0;2\r\n/.test(camp), "el canal lleva entraron, al pago, pagaron, te quedó y los porcentajes");
check("CSV-G", /"Medio";"Producto";"Visitas";"Ventas";"Te quedó";"Conversión %"\r\n"Anuncio pago";"\(todos\)";50;1;9200;2\r\n/.test(camp),
  "el resumen por medio está");
check("CSV-G2", !/"Instagram";"Mecánica/.test(camp) && /"Anuncio pago";"=cmd|' \/C calc'!A0";;"\(toda la campaña\)"/.test(camp.replace(/"'=cmd/g, "\"=cmd")),
  "con un solo producto no hay filas por producto, y la campaña va sin producto");
/* Con dos productos, mirando Todos: cada canal y cada medio reparten por
   producto en filas propias, y cada campaña lleva el suyo. */
const dos = armarEstadisticas({
  rango,
  ordenes: [{
    estado: "CONFIRMED", motivo: null, total: 10000, tasa: 8, dia: "2026-09-10", diaSemana: 3, hora: 21,
    principal: "a", comprador: "u1", upsell: 0, bajo: true, vencidoSinBajar: false, mail: "ENVIADO", recordada: false,
    origen: "instagram", campania: { medio: "pago", campania: "promo", anuncio: "" },
  }],
  visitas: [{ productId: "a", date: "2026-09-10", paso: "pagina", dispositivo: "movil", count: 50 }, { productId: "b", date: "2026-09-10", paso: "pagina", dispositivo: "movil", count: 20 }],
  origenes: [{ productId: "a", date: "2026-09-10", paso: "pagina", source: "instagram", count: 50 }, { productId: "b", date: "2026-09-10", paso: "pagina", source: "instagram", count: 20 }],
  campanias: [{ productId: "a", date: "2026-09-10", medio: "pago", campania: "promo", anuncio: "", count: 50 }, { productId: "b", date: "2026-09-10", medio: "pago", campania: "promo", anuncio: "", count: 20 }],
  principales: [{ id: "a", name: "Mecánica", publicada: true }, { id: "b", name: "Tortas", publicada: true }],
  elegido: null,
});
const campDos = csvCampanias(dos, "t");
check("CSV-I", /"Instagram";"\(todos\)";70;0;1;9200;0;1,40\r\n"Instagram";"Mecánica";50;;1;9200;;\r\n"Instagram";"Tortas";20;;0;0;;\r\n/.test(campDos),
  "con dos productos, debajo del canal va una fila por producto");
check("CSV-J", /"Anuncio pago";"\(todos\)";70;1;9200;1,40\r\n"Anuncio pago";"Mecánica";50;1;9200;\r\n"Anuncio pago";"Tortas";20;0;0;\r\n/.test(campDos),
  "y debajo del medio también");
check("CSV-K", /"Anuncio pago";"promo";"Mecánica";"\(toda la campaña\)";50;1;9200;2\r\n/.test(campDos) && /"Anuncio pago";"promo";"Tortas";"\(toda la campaña\)";20;0;0;0\r\n/.test(campDos),
  "la misma campaña en dos productos son dos filas, cada una con su producto");
check("CSV-H", nombreDelArchivo("campanias", d) === "estadisticas-campanias-2026-09-08-a-2026-09-14.csv",
  "el nombre del archivo lleva la solapa y el rango, sin acentos ni espacios");

/* ── La ruta y el botón ──────────────────────────────────────────────────── */

const ruta = "src/app/api/digitales/estadisticas/exportar/route.ts";
check("RUTA-A", existsSync(ruta), "la ruta existe");
if (existsSync(ruta)) {
  const r = readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
  const c = readFileSync("src/app/digitales/estadisticas/EstadisticasClient.tsx", "utf8").replace(/\r\n/g, "\n");
  check("RUTA-B", /cargarEstadisticas\(user\.id, q\.get\("p"\) \?\? undefined, q\.get\("rango"\) \?\? undefined\)/.test(r),
    "usa el mismo cargador que la pantalla: el archivo dice lo mismo que se ve");
  check("RUTA-C", /puedeVer\(cargadas\.tier, "exportar"\)/.test(r) && /vista === "campanias" && !puedeVer\(cargadas\.tier, "campanias"\)/.test(r),
    "la ruta vuelve a mirar el plan, no le cree al botón");
  check("RUTA-D", /if \(!user \|\| user\.role !== "DIGITAL"\)/.test(r) && r.indexOf("user.role") < r.indexOf("cargarEstadisticas("),
    "sin sesión digital no consulta nada");
  check("RUTA-E", /checkRateLimit\(`exportar-estadisticas:\$\{user\.id\}`/.test(r), "tiene tope de ritmo: armar el archivo es la consulta entera");
  check("RUTA-F", /"Content-Disposition": `attachment; filename=/.test(r) && /"Cache-Control": "no-store"/.test(r),
    "baja como archivo y no se cachea");
  check("RUTA-G", /puedeVer\(tier, "exportar"\) && \(vista === "general" \|\| puedeVer\(tier, "campanias"\)\)/.test(c) && /Exportar<span[^>]*> · desde/.test(c),
    "el botón sigue la misma regla y en el plan que no lo tiene dice desde cuál");
  check("RUTA-I", /!hayQueExportar \? \(/.test(c) && /title="Nada para exportar en este período"/.test(c) && /kpis\.ventas \+ kpis\.devueltas \+ kpis\.visitas > 0/.test(c),
    "sin nada en el rango, el botón está apagado: una planilla vacía parece un error");
  check("RUTA-H", puedeVer("STARTER", "exportar") && !puedeVer("FREE", "exportar") && DESDE_QUE_PLAN.exportar === "STARTER",
    "exportar es desde Starter: es lo que se cobra, los números Free los ve en pantalla");
}

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
