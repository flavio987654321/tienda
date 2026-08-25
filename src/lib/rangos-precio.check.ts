// Que los tramos del filtro de precio sirvan para filtrar.
//
// Lo que se prueba no son los números exactos —el reparto puede afinarse— sino
// las tres promesas que hacen que el filtro no mienta:
//
//   1. TODO producto entra en algún tramo. Uno que no entre en ninguno es un
//      producto que desaparece del catálogo apenas se toca un filtro, y no hay
//      forma de que la dueña se entere: lo ve en su tienda, sin filtrar.
//   2. NINGÚN tramo está vacío. Un tramo sin productos es una opción que
//      promete algo y devuelve una pantalla en blanco.
//   3. Cuando filtrar no sirve, no hay filtro. Un tramo solo, o todo al mismo
//      precio, es una perilla que no hace nada.

import { rangosDePrecio, entraEnRango, pasoLindo } from "./rangos-precio";

let fallos = 0;
function chequear(titulo: string, ok: boolean, detalle?: unknown) {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
}

const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

/** Las tres promesas, sobre cualquier catálogo. */
function promesas(nombre: string, precios: number[]) {
  const tramos = rangosDePrecio(precios, fmt);
  if (tramos.length === 0) { console.log(`  --    ${nombre}: sin filtro (a propósito)`); return; }
  const sinTramo = precios.filter(p => p > 0 && !tramos.some(r => entraEnRango(p, r)));
  const vacios = tramos.filter(r => !precios.some(p => entraEnRango(p, r)));
  chequear(`${nombre}: ${tramos.length} tramos, todos los productos entran`,
    sinTramo.length === 0, sinTramo.slice(0, 4));
  chequear(`${nombre}: ningún tramo vacío`, vacios.length === 0, vacios.map(v => v.etiqueta));
  /* Con dos tramos casi no vale la pena mostrar el filtro: es "barato o caro".
     Se pide al menos tres cuando hay productos suficientes para repartir. */
  if (precios.length >= 6) chequear(`${nombre}: corta en al menos 3 tramos`, tramos.length >= 3, tramos.length);
  console.log("        " + tramos.map(r => r.etiqueta).join("  |  "));
}

console.log("1) El paso siempre es un número que alguien elegiría a mano");
for (const [crudo, esperado] of [[1, 1], [3, 5], [7, 10], [23847, 50000], [1200, 2000], [80, 100], [0.4, 0.5]] as const) {
  chequear(`${crudo} → ${esperado}`, pasoLindo(crudo) === esperado, pasoLindo(crudo));
}
/* Basura adentro no puede dar `Infinity` ni `NaN`: con eso el `for` de los
   tramos no termina nunca y cuelga la pestaña. */
for (const veneno of [0, -5, NaN, Infinity]) {
  chequear(`${veneno} no rompe`, Number.isFinite(pasoLindo(veneno)) && pasoLindo(veneno) > 0, pasoLindo(veneno));
}

console.log("\n2) Catálogos de verdad");
promesas("ropa argentina  ", [18000, 22000, 25500, 31000, 34000, 47000, 52000, 68000, 89000]);
promesas("accesorios      ", [1200, 1800, 2400, 3100, 4500, 5200, 8900]);
promesas("todo caro       ", [180000, 240000, 310000, 450000, 620000]);
/* El caso que rompe los cortes parejos: casi todo junto y UNA cosa carísima.
   Sin tirar los vacíos, esto daba cuatro tramos en el medio sin nada. */
promesas("uno carísimo    ", [20000, 21000, 22000, 23000, 24000, 300000]);
promesas("dos productos   ", [5000, 90000]);
promesas("muchos y parejos", Array.from({ length: 60 }, (_, i) => 10000 + i * 1500));

console.log("\n3) Cuando filtrar no sirve, no hay filtro");
chequear("sin productos", rangosDePrecio([], fmt).length === 0);
chequear("un solo producto", rangosDePrecio([25000], fmt).length === 0);
/* Un catálogo que entra en una pantalla no necesita filtro. */
chequear("dos productos", rangosDePrecio([5000, 90000], fmt).length === 0);
chequear("tres productos", rangosDePrecio([5000, 40000, 90000], fmt).length === 0);
chequear("cuatro ya sí", rangosDePrecio([5000, 30000, 60000, 90000], fmt).length > 1);
chequear("todos al mismo precio", rangosDePrecio([25000, 25000, 25000], fmt).length === 0);
/* Un precio en 0 no es "gratis": es un producto a consultar, o a medio cargar.
   Metido en el filtro arrastra el tramo de abajo hasta cero y regala tramos
   vacíos. */
chequear("los precios en 0 no cuentan", rangosDePrecio([0, 0, 25000], fmt).length === 0);
chequear("los negativos tampoco", rangosDePrecio([-100, 25000], fmt).length === 0);
/* Cuatro precios buenos, para que la basura sea lo unico que se descarte y no
   se confunda con la guarda de "catalogo muy chico". */
chequear("con basura mezclada no rompe y filtra igual",
  rangosDePrecio([NaN, Infinity, 10000, 30000, 50000, 90000] as number[], fmt).length > 1);

console.log("\n4) Los tramos no se pisan");
/* Que dos tramos consecutivos compartan borde hace que un producto justo ahí
   aparezca en los dos, y que la suma de los filtros dé más que el total. */
const t = rangosDePrecio([10000, 30000, 50000, 70000, 90000], fmt);
let pisados = 0;
for (let i = 1; i < t.length; i++) if (t[i].desde <= t[i - 1].hasta) pisados++;
chequear("ningún tramo empieza donde termina el anterior", pisados === 0,
  t.map(r => r.etiqueta));
chequear("van de menor a mayor", t.every((r, i) => i === 0 || r.desde > t[i - 1].desde));
console.log("     ejemplo: " + t.map(r => r.etiqueta).join("  |  "));

console.log(fallos === 0
  ? "\nTodo bien: el filtro nunca esconde un producto ni ofrece un tramo vacío.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
