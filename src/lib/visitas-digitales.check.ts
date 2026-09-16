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

check("PING-A", /<VisitaDigital paso="pagina" productoId=\{fila\.id\} apagado=\{!fila\.isActive \|\| previaDeLanding\} \/>/.test(pagina),
  "la página pública cuenta la entrada, apagada en borrador y en la previa de la landing propia");
check("PING-B", !/<PaginaEnVivo[^>]*>[\s\S]{0,200}<VisitaDigital/.test(pagina) && !/<VisitaDigital[\s\S]{0,400}<PaginaEnVivo/.test(pagina),
  "la previa del editor NO cuenta: es la dueña mirándose");
check("PING-C", /<VisitaDigital paso="pagar" productoId=\{fila\.id\} apagado=\{!seLePuedeVender\} \/>/.test(pagar),
  "el checkout cuenta el segundo escalón, apagado cuando es la previa de la dueña");
check("PING-D", /navigator\.webdriver/.test(lib) && /localStorage\.getItem\(clave\)/.test(lib),
  "el cliente descarta navegadores manejados por script y deduplica por día");
check("PING-E", /timeZone: "America\/Argentina\/Buenos_Aires"/.test(lib),
  "el día del dedup es el argentino, el mismo que guarda el servidor");
check("PING-F", /if \(paso === "pagina"\) \{[\s\S]*document\.referrer/.test(lib) && /const anotado = origenAnotado\(productId\);/.test(lib),
  "al entrar va el referente de verdad; al abrir el pago va el que la página anotó al entrar, no el nuestro");

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
check("RUTA-F", /const claveOrigen = \{ productId: producto\.id, date, paso, source \};/.test(ruta)
  && ruta.indexOf("prisma.digitalVisita.upsert") < ruta.indexOf("prisma.digitalVisitaOrigen.upsert")
  && ruta.indexOf("prisma.digitalVisitaOrigen.upsert") < ruta.indexOf("if (paso === \"pagina\") {"),
  "el origen se guarda en los dos pasos con el paso en la clave, después del total y antes de la campaña");
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
check("TABLA-B", /model DigitalVisitaOrigen \{[\s\S]*@@unique\(\[productId, date, paso, source\]\)/.test(schema)
  && /paso      String  @default\("pagina"\)/.test(schema),
  "DigitalVisitaOrigen: una fila por producto, día, paso y origen; el paso nació con 'pagina' por defecto");
const migracionPaso = "prisma/migrations/20260915020000_origen_por_paso/migration.sql";
check("TABLA-B2", existsSync(migracionPaso) && /ADD COLUMN IF NOT EXISTS "paso" TEXT NOT NULL DEFAULT 'pagina'/.test(leer(migracionPaso))
  && /DROP INDEX IF EXISTS "DigitalVisitaOrigen_productId_date_source_key"/.test(leer(migracionPaso)),
  "la migración agrega el paso con su valor por defecto y cambia la clave; se puede volver a correr");
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

/* ── La campaña (UTM) ────────────────────────────────────────────────────── */

const comprar = leer("src/app/api/digitales/comprar/route.ts");
check("UTM-A", /utm_campaign/.test(lib) && /utm_content/.test(lib) && /utm_medium/.test(lib) && /body: JSON\.stringify\(\{ paso, referente, \.\.\.utm, movil: esMovil\(\) \}\)/.test(lib),
  "el ping manda las cuatro etiquetas crudas; las limpia el servidor");
check("UTM-B", /JSON\.stringify\(\{ referente, \.\.\.utm \} satisfies OrigenCrudo\)/.test(lib),
  "al entrar se anotan las cuatro, para que la orden las lleve");
check("UTM-C", /const campania = campaniaDe\(/.test(ruta) && /cuerpo\?\.utmSource,/.test(ruta),
  "la ruta pasa las etiquetas por utm-digital, con el utm_source como condición");
check("UTM-D", /prisma\.digitalVisitaCampania\.count\(\{ where: base \}\)/.test(ruta) && /dondeCae\(campania, existente !== null, distintasHoy\)/.test(ruta),
  "antes de crear una combinación nueva se cuenta cuántas hay hoy: el techo se aplica");
check("UTM-E", ruta.indexOf("prisma.digitalVisitaOrigen.upsert") < ruta.indexOf("prisma.digitalVisitaCampania")
  && /\} catch \{\s*\/\* Contada sin campaña\. \*\/\s*\}/.test(ruta),
  "la campaña va después del origen y en su propio try: si falla, la visita ya está contada");
check("UTM-F", /utmMedio: campania\?\.medio \?\? null,/.test(comprar) && /utmCampania: campania\?\.campania \?\? null,/.test(comprar)
  && /const campania = campaniaDe\(/.test(comprar),
  "la orden guarda la campaña limpia, o null si no la traía");
check("UTM-G", /model DigitalVisitaCampania \{[\s\S]*@@unique\(\[productId, date, medio, campania, anuncio\]\)/.test(schema)
  && /utmMedio\s+String\?/.test(schema) && /utmCampania String\?/.test(schema) && /utmAnuncio\s+String\?/.test(schema),
  "la tabla de campañas y las tres columnas de la orden existen en el esquema");
const migracionUtm = "prisma/migrations/20260915010000_campanias_digitales/migration.sql";
check("UTM-H", existsSync(migracionUtm) && /CREATE TABLE IF NOT EXISTS "DigitalVisitaCampania"/.test(leer(migracionUtm))
  && /ADD COLUMN IF NOT EXISTS "utmMedio"/.test(leer(migracionUtm)),
  "y tienen su migración, que se puede volver a correr");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
