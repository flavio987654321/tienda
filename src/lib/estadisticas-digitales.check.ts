/**
 * Chequeos de Estadísticas de Productos Digitales. Se corre con:
 *
 *   npx tsx src/lib/estadisticas-digitales.check.ts
 *
 * `armarEstadisticas` es pura y se ejecuta de verdad: es una cuenta de plata
 * y de porcentajes, y una conversión mal dividida sale por pantalla como un
 * número perfectamente creíble. La pantalla se mira leyendo el archivo: que
 * bloquee por plan lo que corresponde y que no pida nada que no exista.
 */

import { existsSync, readFileSync } from "node:fs";
import {
  resolverRango, armarEstadisticas, puedeVer, DESDE_QUE_PLAN, RANGOS, DIAS_DE_TODO,
  type OrdenCruda, type VisitaCruda, type OrigenCrudo,
} from "./estadisticas-digitales";
import { DIAS_RETENCION_VISITAS } from "./retencion";
import { featuresDigital } from "./planes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El rango ────────────────────────────────────────────────────────────── */

const HOY = "2026-09-14";
check("RANGO-A", resolverRango("hoy", HOY).desde === HOY && resolverRango("hoy", HOY).dias === 1,
  "hoy es un solo día");
check("RANGO-B", resolverRango("7", HOY).desde === "2026-09-08" && resolverRango("7", HOY).hasta === HOY,
  "7 días incluye hoy y los seis anteriores");
check("RANGO-C", resolverRango(undefined, HOY).clave === "30" && resolverRango("banana", HOY).clave === "30",
  "sin parámetro o con uno inventado, 30 días");
check("RANGO-D", DIAS_DE_TODO === DIAS_RETENCION_VISITAS && resolverRango("todo", HOY).dias === DIAS_DE_TODO,
  "\"Todo\" llega hasta donde se guardan las visitas: más atrás la conversión sería inventada");
check("RANGO-E", RANGOS.includes("hoy") && RANGOS.includes("90"), "hoy y 90 días existen, como en la competencia");

/* ── Qué ve cada plan ────────────────────────────────────────────────────── */

check("PLAN-A", puedeVer("FREE", "ventas") && !puedeVer("FREE", "visitas") && !puedeVer("FREE", "embudo"),
  "Free ve las ventas y nada más");
check("PLAN-B", puedeVer("STARTER", "visitas") && !puedeVer("STARTER", "embudo") && !puedeVer("STARTER", "origenes"),
  "Starter suma visitas y conversión, sin embudo ni origen");
check("PLAN-C", puedeVer("PRO", "embudo") && puedeVer("PRO", "origenes"),
  "Pro ve todo");
check("PLAN-D", DESDE_QUE_PLAN.ventas === "FREE",
  "las ventas nunca se bloquean: ya las paga con la comisión");
check("PLAN-E",
  featuresDigital("FREE").some((f) => /conversión/i.test(f.text) && !f.on)
  && featuresDigital("STARTER").some((f) => /conversión/i.test(f.text) && f.on)
  && featuresDigital("PRO").some((f) => /embudo/i.test(f.text) && f.on)
  && featuresDigital("STARTER").some((f) => /embudo/i.test(f.text) && !f.on),
  "la página de precios promete lo mismo que aplica la pantalla");

/* ── La cuenta ───────────────────────────────────────────────────────────── */

const rango = resolverRango("7", HOY); // 08 al 14
const ordenes: OrdenCruda[] = [
  { estado: "CONFIRMED", total: 10000, tasa: 8, dia: "2026-09-10", principal: "a" },
  { estado: "CONFIRMED", total: 10000, tasa: 8, dia: "2026-09-10", principal: "a" },
  { estado: "CONFIRMED", total: 20000, tasa: 2, dia: "2026-09-14", principal: "b" },
  { estado: "REFUNDED",  total: 10000, tasa: 8, dia: "2026-09-12", principal: "a" },
  /* Fuera del rango: no cuenta. */
  { estado: "CONFIRMED", total: 99999, tasa: 8, dia: "2026-09-01", principal: "a" },
];
const visitas: VisitaCruda[] = [
  { productId: "a", date: "2026-09-10", paso: "pagina", count: 50 },
  { productId: "a", date: "2026-09-10", paso: "pagar", count: 10 },
  { productId: "b", date: "2026-09-14", paso: "pagina", count: 50 },
  { productId: "b", date: "2026-09-14", paso: "pagar", count: 5 },
  { productId: "a", date: "2026-09-01", paso: "pagina", count: 1000 },
];
const origenes: OrigenCrudo[] = [
  { productId: "a", date: "2026-09-10", source: "instagram", count: 30 },
  { productId: "a", date: "2026-09-10", source: "directo", count: 20 },
  { productId: "b", date: "2026-09-14", source: "whatsapp", count: 40 },
  { productId: "b", date: "2026-09-14", source: "inventado", count: 10 },
];
const principales = [
  { id: "a", name: "Mecánica", publicada: true },
  { id: "b", name: "Tortas", publicada: true },
  { id: "c", name: "Vacío", publicada: false },
];

const todo = armarEstadisticas({ rango, ordenes, visitas, origenes, principales, elegido: null });

check("CUENTA-A", todo.kpis.ventas === 3 && todo.kpis.devueltas === 1 && todo.kpis.bruto === 40000,
  "3 ventas, 1 devuelta, bruto 40.000; la de fuera del rango no cuenta");
check("CUENTA-B", todo.kpis.comision === 800 + 800 + 400 && todo.kpis.neto === 40000 - 2000,
  "la comisión se descuenta con la tasa congelada de cada orden");
check("CUENTA-C", todo.kpis.ticket !== null && Math.round(todo.kpis.ticket) === 13333,
  "el ticket promedio es bruto ÷ ventas");
check("CUENTA-D", todo.kpis.visitas === 100 && todo.kpis.checkouts === 15 && todo.kpis.conversion === 3,
  "100 visitas, 15 checkouts, conversión 3 %");
check("CUENTA-E", todo.embudo.pctCheckout === 15 && todo.embudo.pctVenta === 20,
  "embudo: 15 % abrió el checkout, 20 % de ésos pagó");
check("CUENTA-F", todo.serie.grano === "dia" && todo.serie.visitas.length === 7
  && todo.serie.visitas.map((p) => p.value).join(",") === "0,0,50,0,0,0,50",
  "la serie trae los 7 días, con cero donde no pasó nada");
check("CUENTA-G", todo.serie.ventas.map((p) => p.value).join(",") === "0,0,2,0,0,0,1"
  && todo.serie.bruto.map((p) => p.value).join(",") === "0,0,20000,0,0,0,20000",
  "ventas y bruto por día, la devuelta no suma");
check("CUENTA-H", todo.porProducto.map((p) => p.id).join(",") === "b,a,c",
  "por producto de más a menos plata; el vacío figura último");
check("CUENTA-I", todo.porProducto[1].ventas === 2 && todo.porProducto[1].neto === 18400
  && todo.porProducto[1].visitas === 50 && todo.porProducto[1].conversion === 4,
  "cada producto con sus ventas, su neto, sus visitas y su conversión");
check("CUENTA-J", todo.origenes.conocidas === 90 && todo.origenes.filas[0].origen === "whatsapp"
  && todo.origenes.filas.at(-1)?.origen === "directo",
  "orígenes: una etiqueta fuera de la lista se descarta, y directo va al final");

const soloA = armarEstadisticas({ rango, ordenes, visitas, origenes, principales, elegido: "a" });
check("CUENTA-K", soloA.kpis.ventas === 2 && soloA.kpis.visitas === 50 && soloA.kpis.conversion === 4
  && soloA.kpis.devueltas === 1,
  "mirando un producto, sólo lo suyo");
check("CUENTA-L", soloA.porProducto.length === 0, "mirando un producto no hay ranking");
check("CUENTA-M", soloA.origenes.filas.map((f) => f.origen).join(",") === "instagram,directo",
  "y los orígenes son los de ese producto");

const vacio = armarEstadisticas({ rango, ordenes: [], visitas: [], origenes: [], principales: [], elegido: null });
check("CUENTA-N", vacio.kpis.ticket === null && vacio.kpis.conversion === null && vacio.embudo.pctCheckout === null,
  "sin datos no se divide por cero: ticket y conversión quedan en null, no en NaN");

const largo = armarEstadisticas({ rango: resolverRango("todo", HOY), ordenes, visitas, origenes, principales, elegido: null });
check("CUENTA-O", largo.serie.grano === "mes" && largo.serie.visitas.length < 40,
  "con dos años la serie se agrupa por mes");

/* ── La pantalla ─────────────────────────────────────────────────────────── */

const pagina = "src/app/digitales/estadisticas/page.tsx";
const cliente = "src/app/digitales/estadisticas/EstadisticasClient.tsx";
check("PANT-A", existsSync(pagina) && existsSync(cliente), "la pantalla existe");
if (existsSync(pagina) && existsSync(cliente)) {
  const p = readFileSync(pagina, "utf8").replace(/\r\n/g, "\n");
  const c = readFileSync(cliente, "utf8").replace(/\r\n/g, "\n");
  const barra = readFileSync("src/app/digitales/DigitalesSidebar.tsx", "utf8");
  check("PANT-B", /armarEstadisticas\(/.test(p) && /resolverRango\(/.test(p),
    "la página cuenta en el servidor con la librería");
  check("PANT-C", /status: \{ in: \["CONFIRMED", "REFUNDED"\] \}/.test(p),
    "trae cobradas y devueltas, nada más");
  check("PANT-D", /puedeVer\(tier, "visitas"\)/.test(c) && /puedeVer\(tier, "embudo"\)/.test(c) && /puedeVer\(tier, "origenes"\)/.test(c),
    "la pantalla bloquea por plan cada bloque");
  check("PANT-E", /<BotonVolver/.test(p), "tiene botón de volver");
  check("PANT-F", /href: "\/digitales\/estadisticas"/.test(barra), "está en la barra lateral");
  check("PANT-G", /Disponible desde/.test(c), "un bloque bloqueado dice desde qué plan se ve");
}

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
