/**
 * Chequeos de las visitas a la página de venta digital. Se corre con:
 *
 *   npx tsx src/lib/visitas-digitales.check.ts
 *
 * Lo que cuida: que el ping se mande desde la página pública y el checkout y
 * NO desde la previa; que la ruta filtre antes de escribir (bots, paso libre,
 * borradores, la dueña); que el origen se guarde sólo al entrar; y que las
 * dos tablas nuevas tengan su migración y su limpieza. Todos agujeros con la
 * misma forma: no rompen nada, y la conversión sale por pantalla como un
 * número perfectamente creíble.
 */

import { existsSync, readFileSync } from "node:fs";
import { PASOS_DIGITALES, esPasoDigital, MAX_VISITAS_POR_IP } from "./visitas-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/* ── La lista cerrada ────────────────────────────────────────────────────── */

check("PASO-A", PASOS_DIGITALES.length === 2 && esPasoDigital("pagina") && esPasoDigital("pagar"),
  "los dos pasos: entrar a la página y abrir el checkout");
check("PASO-B", !esPasoDigital("venta") && !esPasoDigital("") && !esPasoDigital(null) && !esPasoDigital(1),
  "la venta no es un paso registrado —sale de Order— y nada que no sea de la lista pasa");
check("PASO-C", MAX_VISITAS_POR_IP >= 3 && MAX_VISITAS_POR_IP <= 10,
  "el tope por IP deja lugar a una familia sin dejar inflar el número");

/* ── Quién manda el ping ─────────────────────────────────────────────────── */

const pagina = leer("src/app/p/[id]/page.tsx");
const pagar = leer("src/app/p/[id]/pagar/page.tsx");
const lib = leer("src/lib/visitas-digitales.ts");

check("PING-A", /<VisitaDigital paso="pagina" productoId=\{fila\.id\} apagado=\{!fila\.isActive\} \/>/.test(pagina),
  "la página pública cuenta la entrada, apagada en borrador");
check("PING-B", !/<PaginaEnVivo[^>]*>[\s\S]{0,200}<VisitaDigital/.test(pagina) && !/<VisitaDigital[\s\S]{0,400}<PaginaEnVivo/.test(pagina),
  "la previa del editor NO cuenta: es la dueña mirándose");
check("PING-C", /<VisitaDigital paso="pagar" productoId=\{fila\.id\} apagado=\{!seLePuedeVender\} \/>/.test(pagar),
  "el checkout cuenta el segundo escalón, apagado cuando es la previa de la dueña");
check("PING-D", /navigator\.webdriver/.test(lib) && /localStorage\.getItem\(clave\)/.test(lib),
  "el cliente descarta navegadores manejados por script y deduplica por día");
check("PING-E", /timeZone: "America\/Argentina\/Buenos_Aires"/.test(lib),
  "el día del dedup es el argentino, el mismo que guarda el servidor");
check("PING-F", /if \(paso === "pagina"\) \{[\s\S]*document\.referrer/.test(lib),
  "el referente y el utm sólo van al entrar: el checkout se abre desde nuestra propia página");

/* ── La ruta ─────────────────────────────────────────────────────────────── */

const ruta = leer("src/app/api/digitales/visita/[id]/route.ts");
const antesDeLaBase = ruta.slice(0, ruta.indexOf("prisma.product.findFirst"));

check("RUTA-A", /visitaLegitima\(req, `digital-visita:\$\{id\}`, MAX_VISITAS_POR_IP\)/.test(antesDeLaBase),
  "bots, origen forjado y tope por IP se filtran antes de tocar la base");
check("RUTA-B", /if \(!esPasoDigital\(paso\)\) return NextResponse\.json\(\{ ok: false \}, \{ status: 400 \}\)/.test(antesDeLaBase),
  "un paso fuera de la lista se rechaza antes de consultar nada");
check("RUTA-C", /where: \{ id, deletedAt: null, isActive: true, rolDigital: "PRINCIPAL" \}/.test(ruta),
  "sólo cuenta un principal publicado");
check("RUTA-D", /if \(await esLaDuena\(req, producto\.store\.ownerId\)\)/.test(ruta) && /c\.name\.startsWith\("sb-"\)/.test(ruta),
  "la dueña no cuenta, y sólo se le pregunta a Supabase si hay cookie de sesión");
check("RUTA-E", /try \{\s*await sumarUno\(\s*\(\) => prisma\.digitalVisita\.upsert/.test(ruta),
  "la escritura va en un try: sin la tabla todavía, no tira 500");
check("RUTA-E2", /code !== "P2002"\) throw e;/.test(ruta) && /prisma\.digitalVisita\.updateMany\(\{ where: clave, data: \{ count: \{ increment: 1 \} \} \}\)/.test(ruta),
  "dos primeras visitas del día que llegan juntas no pierden ninguna: la clave duplicada se reintenta como suma");
check("RUTA-E3", /if \(!ID_RE\.test\(id\)\) return NextResponse\.json\(\{ ok: false \}, \{ status: 404 \}\);/.test(antesDeLaBase)
  && ruta.indexOf("ID_RE.test(id)") < ruta.indexOf("visitaLegitima("),
  "un id que no tiene forma de id se rechaza antes del límite por IP y de la base");
check("RUTA-F", /if \(paso === "pagina"\) \{[\s\S]*prisma\.digitalVisitaOrigen\.upsert/.test(ruta)
  && ruta.indexOf("prisma.digitalVisita.upsert") < ruta.indexOf("prisma.digitalVisitaOrigen.upsert"),
  "el origen se guarda sólo al entrar, y después del total");
check("RUTA-G", /clasificarOrigen\(referente, utmSource, req\.headers\.get\("host"\), false\)/.test(ruta),
  "la etiqueta la decide el servidor con la lista cerrada de origen-visita");

/* ── Las tablas ──────────────────────────────────────────────────────────── */

const schema = leer("prisma/schema.prisma");
const migracion = "prisma/migrations/20260914230000_visitas_digitales/migration.sql";
const cleanup = leer("src/app/api/cron/cleanup/route.ts");

check("TABLA-A", /model DigitalVisita \{[\s\S]*@@unique\(\[productId, date, paso, dispositivo\]\)/.test(schema),
  "DigitalVisita: una fila por producto, día, paso y dispositivo");
check("TABLA-A2", /const dispositivo: Dispositivo = cuerpo\?\.movil === true \? "movil" : "escritorio"/.test(ruta),
  "el dispositivo lo decide el servidor con el hecho crudo, comparado con true exacto");
check("TABLA-A3", /matchMedia\("\(pointer: coarse\)"\)/.test(lib) && /movil: esMovil\(\)/.test(lib),
  "el cliente manda si el puntero es grueso, no el ancho de la ventana");
check("TABLA-B", /model DigitalVisitaOrigen \{[\s\S]*@@unique\(\[productId, date, source\]\)/.test(schema),
  "DigitalVisitaOrigen: una fila por producto, día y origen");
check("TABLA-C", /model DigitalVisita \{[\s\S]*?onDelete: Cascade/.test(schema) && /model DigitalVisitaOrigen \{[\s\S]*?onDelete: Cascade/.test(schema),
  "borrar el producto se lleva sus visitas");
check("TABLA-D", existsSync(migracion)
  && /CREATE TABLE IF NOT EXISTS "DigitalVisita"/.test(leer(migracion))
  && /CREATE TABLE IF NOT EXISTS "DigitalVisitaOrigen"/.test(leer(migracion))
  && /"dispositivo" TEXT NOT NULL/.test(leer(migracion))
  && /ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "origenVisita" TEXT/.test(leer(migracion)),
  "la migración crea las dos tablas, con el dispositivo, y la columna del origen en la orden; se puede volver a correr");
check("TABLA-D2", /origenVisita String\?/.test(schema), "Order.origenVisita existe en el esquema y admite nulos");
check("TABLA-E", /prisma\.digitalVisita\.deleteMany\(\{\s*where: \{ date: \{ lt: corteVisitas \} \}/.test(cleanup)
  && /prisma\.digitalVisitaOrigen\.deleteMany\(\{\s*where: \{ date: \{ lt: corteVisitas \} \}/.test(cleanup),
  "la limpieza las borra con el mismo corte que las visitas de tiendas");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
