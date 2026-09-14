/**
 * Chequeos de "Tu uso" en Mi cuenta de Productos Digitales. Se corre con:
 *
 *   npx tsx src/lib/uso-digital.check.ts
 *
 * `armarUso` es pura y se ejecuta de verdad. La tarjeta se mira leyendo el
 * archivo: que cuente lo creado contra el tope del plan, que diga cuánto pesa
 * lo subido, y que no invente una barra para lo que no tiene tope.
 */

import { readFileSync } from "node:fs";
import { armarUso, pesoLegible, type FilaDeUso } from "./uso-digital";
import { TOPES_DIGITALES } from "./planLimits";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const fila = (p: Partial<FilaDeUso> & { id: string }): FilaDeUso => ({
  name: p.id, rolDigital: "PRINCIPAL", padreId: null, isActive: true, archivoPeso: null, ...p,
});

/* ── Contar ──────────────────────────────────────────────────────────────── */

const vacio = armarUso([], "FREE");
check("USO-A", vacio.paginas.creadas === 0 && vacio.paginas.publicadas === 0 && vacio.paginas.tope === TOPES_DIGITALES.FREE.paginas
  && vacio.porPagina.length === 0 && vacio.archivos.cantidad === 0 && vacio.archivos.bytes === 0,
  "sin productos es todo cero, con el tope del plan igual");

const filas: FilaDeUso[] = [
  fila({ id: "a", name: "Mecánica", archivoPeso: 2 * 1024 * 1024 }),
  fila({ id: "b", name: "Tortas", isActive: false, archivoPeso: 1024 * 1024 }),
  fila({ id: "a1", rolDigital: "BONO", padreId: "a", archivoPeso: 512 * 1024 }),
  fila({ id: "a2", rolDigital: "BONO", padreId: "a" }),
  fila({ id: "a3", rolDigital: "UPSELL", padreId: "a", archivoPeso: 0 }),
  fila({ id: "b1", rolDigital: "UPSELL", padreId: "b" }),
  /* Huérfano: su padre se borró. No cuenta en ninguna página, pero pesa. */
  fila({ id: "z", rolDigital: "BONO", padreId: "no-existe", archivoPeso: 1024 }),
];
const uso = armarUso(filas, "PRO");

check("USO-B", uso.paginas.creadas === 2 && uso.paginas.publicadas === 1 && uso.paginas.tope === TOPES_DIGITALES.PRO.paginas,
  "las páginas se cuentan creadas y publicadas por separado");
check("USO-C", uso.porPagina.map((p) => p.id).join(",") === "a,b",
  "una fila por página, en el orden en que llegaron");
check("USO-D", uso.porPagina[0].bonos === 2 && uso.porPagina[0].upsells === 1 && uso.porPagina[0].publicada === true,
  "los bonos y upsells se cuentan por página");
check("USO-E", uso.porPagina[1].bonos === 0 && uso.porPagina[1].upsells === 1 && uso.porPagina[1].publicada === false,
  "la página en borrador figura igual, con lo suyo");
check("USO-F", uso.topes.bonos === TOPES_DIGITALES.PRO.bonos && uso.topes.upsells === TOPES_DIGITALES.PRO.upsells,
  "los topes de hijos son los del plan");
check("USO-G", uso.archivos.cantidad === 4 && uso.archivos.bytes === (2 * 1024 + 1024 + 512 + 1) * 1024,
  "los archivos se cuentan con su peso, huérfanos incluidos, y los de peso cero no");

/* Caída de plan: más creadas que el tope. Se cuenta tal cual, la tarjeta avisa. */
const caida = armarUso([fila({ id: "a" }), fila({ id: "b" }), fila({ id: "c" })], "FREE");
check("USO-H", caida.paginas.creadas === 3 && caida.paginas.tope === 1,
  "con más páginas que el tope se cuenta lo que hay, no se recorta");

/* ── El peso en palabras ─────────────────────────────────────────────────── */

check("PESO-A", pesoLegible(0) === "0 KB", "cero se dice en KB");
check("PESO-B", pesoLegible(92 * 1024) === "92 KB", "menos de un mega va en KB");
check("PESO-C", pesoLegible(2.1 * 1024 * 1024) === "2,1 MB", "los megas van con coma y un decimal");
check("PESO-D", pesoLegible(1.5 * 1024 * 1024 * 1024) === "1,5 GB", "y los gigas también");

/* ── La tarjeta ──────────────────────────────────────────────────────────── */

const cliente = readFileSync("src/app/digitales/mi-cuenta/MiCuentaClient.tsx", "utf8").replace(/\r\n/g, "\n");
const pagina = readFileSync("src/app/digitales/mi-cuenta/page.tsx", "utf8").replace(/\r\n/g, "\n");

check("TARJ-A", /usoDeLaCuenta\(/.test(pagina) && /uso=\{uso\}/.test(pagina),
  "la página lee el uso en el servidor y se lo pasa a la tarjeta");
check("TARJ-B", /usoDeLaCuenta\(user\.id, tier, estado === "TRIAL"\)/.test(pagina) && /estadoDelCupo\(userId, tier, "EBOOK", enPrueba\)/.test(pagina),
  "el cupo de ebooks se lee con `enPrueba`, igual que la ruta que lo gasta");
check("TARJ-C", /Tu uso/.test(cliente), "la tarjeta se llama Tu uso");
check("TARJ-D", /uso\.paginas\.creadas/.test(cliente) && /uso\.paginas\.tope/.test(cliente) && /uso\.paginas\.publicadas/.test(cliente),
  "la barra de páginas muestra creadas, tope y publicadas");
check("TARJ-E", /uso\.paginas\.creadas > uso\.paginas\.tope/.test(cliente),
  "si hay más páginas que el tope —cayó de plan— lo dice");
check("TARJ-F", /pesoLegible\(uso\.archivos\.bytes\)/.test(cliente),
  "los archivos se dicen con su peso en palabras");
check("TARJ-G", /cupo=\{uso\.ia\.embudo\}/.test(cliente) && /cupo=\{uso\.ia\.ebook\}/.test(cliente) && /cupo\.quedanDelMes/.test(cliente) && /cupo\.quedanDeBienvenida/.test(cliente),
  "las dos bolsas de IA se muestran por separado");
check("TARJ-H", /uso\.porPagina\.map/.test(cliente) && /uso\.topes\.bonos/.test(cliente),
  "los bonos y upsells van por página, contra el tope del plan");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
