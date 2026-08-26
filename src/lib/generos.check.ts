/**
 * Chequeo del filtro Mujer / Hombre del menú. Se corre a mano:
 *
 *   npx tsx src/lib/generos.check.ts
 *
 * ── Qué se cuida ─────────────────────────────────────────────────────────────
 *
 * 1. La regla: el filtro sirve sólo si hay mujer Y hombre. Está escrita en
 *    `generosDanFiltro` y la usan DOS lugares que no se conocen entre sí — el
 *    template, con los productos que trajo el navegador, y el servidor, con una
 *    consulta a la base. Si los dos no contestan lo mismo, el menú reserva un
 *    hueco para dos botones que después no aparecen.
 *
 * 2. Que cada template siga usando la variable correcta en cada lugar. Son dos
 *    preguntas distintas que se parecen mucho:
 *
 *      · DÓNDE se apoya el menú  →  `generosParaElMenu` (lo dice el servidor)
 *      · SI se dibujan los botones y SI se filtra  →  `hayGeneros` (los productos)
 *
 *    El motivo de la separación es un salto medido: los productos llegan por
 *    `fetch` después del primer dibujado, así que `hayGeneros` contesta "no" en
 *    todas las tiendas durante ese rato. Como sin género el grupo de
 *    "Categorías" se va contra la derecha, el menú se dibujaba a la derecha y se
 *    corría al centro un segundo después. Medido en Amaranta: **382 píxeles**.
 *
 *    Y la mitad que falta: los botones ocupan su lugar desde el principio
 *    (`esperandoGeneros` los deja invisibles hasta que los productos confirman).
 *    Sin eso el grupo se ensancha al aparecer y "Categorías" igual se corría 74px.
 *
 *    Volver a poner `hayGeneros` en el acomodo devuelve el salto sin romper nada
 *    más, así que no lo agarra ningún error de compilación ni ninguna pantalla en
 *    blanco: sólo se ve mirando la barra el primer segundo. Por eso está acá.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generosDanFiltro, catalogoTieneGeneros } from "./generos";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

console.log("1) La regla: hace falta mujer Y hombre");

const casos: [string, (string | null | undefined)[], boolean][] = [
  ["mujer y hombre",                  ["mujer", "hombre"], true],
  ["mujer y hombre entre unisex",     ["unisex", "mujer", "unisex", "hombre"], true],
  ["solo mujer",                      ["mujer", "mujer"], false],
  ["solo hombre",                     ["hombre"], false],
  ["todo unisex (el valor de fabrica)", ["unisex", "unisex", "unisex"], false],
  ["catalogo vacio",                  [], false],
  ["sin genero cargado",              [null, undefined], false],
  /* Lencería: casi todo mujer y ni un hombre. El filtro dejaría "Hombre"
     mostrando una pantalla vacía. */
  ["lenceria: 40 mujer, 0 hombre",    Array(40).fill("mujer"), false],
];
for (const [nombre, generos, esperado] of casos) {
  chequear(`${nombre} → ${esperado ? "hay filtro" : "no hay filtro"}`,
    generosDanFiltro(generos) === esperado);
}

console.log("\n2) Las dos puertas contestan lo mismo");

/* `catalogoTieneGeneros` (el template, con productos) y `generosDanFiltro` (el
   servidor, con una lista de géneros) tienen que coincidir sobre el mismo
   catálogo. Si se separan, el servidor reserva lugar para botones que el
   template no dibuja. */
const catalogos: [string, { id: string; gender?: string }[]][] = [
  ["mixto",        [{ id: "a", gender: "mujer" }, { id: "b", gender: "hombre" }]],
  ["solo mujer",   [{ id: "a", gender: "mujer" }, { id: "b", gender: "mujer" }]],
  ["todo unisex",  [{ id: "a", gender: "unisex" }]],
  ["vacio",        []],
];
for (const [nombre, productos] of catalogos) {
  const porTemplate = catalogoTieneGeneros(productos);
  const porServidor = generosDanFiltro(productos.map(p => p.gender));
  chequear(`${nombre}: template=${porTemplate} servidor=${porServidor}`, porTemplate === porServidor);
}

console.log("\n3) Cada template usa la variable correcta en cada lugar");

const TEMPLATES = ["Aurora", "BohoTerra", "UrbanPulse"];

for (const t of TEMPLATES) {
  const src = leer(`src/components/store/templates/${t}.tsx`);

  /* El acomodo del menú —el `marginLeft:auto` cuando NO hay géneros— es lo único
     que tiene que salir del servidor. Con `hayGeneros` vuelve el salto de 382px. */
  chequear(`${t}: el menu se acomoda con lo que dice el servidor`,
    /\.\.\.\(generosParaElMenu \? \{\} : \{ marginLeft:"auto"/.test(src),
    "el `marginLeft:auto` volvio a colgar de `hayGeneros`: eso devuelve el salto");

  chequear(`${t}: y ese valor cae a lo de siempre sin servidor`,
    /const generosParaElMenu = storeConfig\?\.tieneGeneros \?\? hayGeneros;/.test(src),
    "sin el `?? hayGeneros` la previa del editor se queda sin botones");

  /* El hueco. Sin esto el grupo se ensancha al aparecer los botones. */
  chequear(`${t}: los botones ocupan su lugar mientras se espera`,
    /const esperandoGeneros: React\.CSSProperties = hayGeneros \? \{\} : \{ opacity: 0, pointerEvents: "none" \};/.test(src)
    && (src.match(/\.\.\.esperandoGeneros/g)?.length ?? 0) >= 2,
    "faltan los dos botones con `...esperandoGeneros`");

  /* Y lo que NO cambia: filtrar sigue saliendo de los productos de verdad. Si
     esto colgara del servidor, una tienda podria filtrar por un genero que su
     catalogo no tiene. */
  chequear(`${t}: filtrar sigue mirando los productos, no al servidor`,
    /if \(hayGeneros && activeGender/.test(src),
    "el filtro dejo de usar `hayGeneros`");
}

console.log("\n4) El servidor pregunta por los mismos productos que se publican");

/* `/api/public/[slug]` decide que productos ve el navegador: activos, no
   borrados, y sin los de solo-mayorista cuando la tienda no vende mayorista. La
   pagina tiene que mirar exactamente esos, o el menu reservaria lugar para dos
   botones que despues no aparecen. */
const pagina = leer("src/app/tienda/[slug]/page.tsx");

/* Y tiene que salir de la consulta que ya se hacia, no de una aparte: son dos
   idas y vueltas contra la base en cada visita a una tienda, para un dato que se
   necesita antes de dibujar el primer pixel. `distinct` hace que vuelvan a lo
   sumo unas pocas filas en vez del catalogo entero. */
chequear("los generos viajan pegados a la consulta de la tienda",
  /products: \{\s*where: \{ isActive: true, deletedAt: null \},\s*select: \{ gender: true, soloMayorista: true \},\s*distinct: \["gender", "soloMayorista"\],\s*\}/.test(pagina),
  "volvio a ser una consulta aparte: eso agrega un viaje a la base en cada visita");

chequear("no quedo una consulta suelta de generos",
  !/groupBy\(\{\s*by: \["gender"\]/.test(pagina));

chequear("y saca los de solo-mayorista cuando la tienda no vende mayorista",
  /\.filter\(p => store\.tieneVentaMayorista \|\| !p\.soloMayorista\)/.test(pagina),
  "sin esto se cuentan productos que el navegador nunca va a recibir");

chequear("y usa la regla compartida, no una copia",
  /generosDanFiltro\(generosVisibles\)/.test(pagina));

console.log(fallos === 0
  ? "\nTodo bien: la regla es una sola y el menu no salta al cargar.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
