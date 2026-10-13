/**
 * Chequeos de `marcasVehiculos`. Se corre a mano:
 *
 *   npx tsx src/lib/marcasVehiculos.check.ts
 */

import { MARCAS_VEHICULOS, marcaConocida, sugerirMarcas, quisoDecir } from "./marcasVehiculos";
import { normalizar } from "./busquedas";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── El caso que lo originó ─────────────────────────────────────────────── */
chequear("\"Toyta\" → ¿Quisiste decir Toyota?", quisoDecir("Toyta") === "Toyota", quisoDecir("Toyta"));
chequear("\"Fodr\" (letras dadas vuelta) → Ford", quisoDecir("Fodr") === "Ford", quisoDecir("Fodr"));
chequear("\"Peugot\" → Peugeot", quisoDecir("Peugot") === "Peugeot", quisoDecir("Peugot"));
chequear("\"Wolksvagen\" (dos errores, palabra larga) → Volkswagen", quisoDecir("Wolksvagen") === "Volkswagen", quisoDecir("Wolksvagen"));
chequear("\"Citroen\" sin diéresis es Citroën, no un error", quisoDecir("Citroen") === null && marcaConocida("Citroen") === "Citroën");

/* ── No molestar ────────────────────────────────────────────────────────── */
chequear("bien escrita no avisa", quisoDecir("Toyota") === null && quisoDecir("TOYOTA") === null);
chequear("mientras escribe (\"Toyo\") no avisa: sugiere", quisoDecir("Toyo") === null && sugerirMarcas("Toyo").includes("Toyota"));
chequear("palabras cortas no avisan (\"Kis\" no es un error de Kia)", quisoDecir("Kis") === null);
chequear("una marca que no está y no se parece a nada no avisa", quisoDecir("Zxcvbnm") === null);
chequear("vacío no hace nada", quisoDecir("") === null && sugerirMarcas("").length === 0);

/* ── Sugerencias ────────────────────────────────────────────────────────── */
chequear("\"vol\" sugiere Volkswagen y Volvo", ["Volkswagen", "Volvo"].every((m) => sugerirMarcas("vol").includes(m)), sugerirMarcas("vol"));
chequear("\"deere\" encuentra John Deere (por la segunda palabra)", sugerirMarcas("deere").includes("John Deere"));
chequear("como mucho 6", sugerirMarcas("c").length <= 6);
chequear("ya completa no sugiere nada", sugerirMarcas("Ford").length === 0);
chequear("\"mercedes benz\" es Mercedes-Benz", marcaConocida("mercedes benz") === "Mercedes-Benz");

/* ── La lista ───────────────────────────────────────────────────────────── */
const claves = MARCAS_VEHICULOS.map(normalizar);
chequear("sin marcas repetidas", new Set(claves).size === claves.length, claves.filter((c, i) => claves.indexOf(c) !== i));

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
