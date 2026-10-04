/**
 * Chequeos de `ordenEfectivo`. Se corre con:
 *
 *   npx tsx src/lib/ordenBloques.check.ts
 *
 * Lo que se vigila: que un bloque nuevo del template entre al lado de su
 * vecino de fábrica y no al final; que el orden que eligió la dueña se
 * respete; y que los ids viejos que el template ya no tiene se descarten.
 */

import { ordenEfectivo } from "./ordenBloques";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const FABRICA = ["tira", "productos", "lookbook", "resenas", "preguntas", "newsletter"];

chequear("sin nada guardado, el de fábrica", ordenEfectivo([], FABRICA).join() === FABRICA.join());

// La dueña había dado vuelta reseñas y productos ANTES de que existieran lookbook y preguntas.
const viejo = ["tira", "resenas", "productos", "newsletter"];
const r = ordenEfectivo(viejo, FABRICA);
chequear("respeta lo que movió la dueña", r.indexOf("resenas") < r.indexOf("productos"), r);
chequear("el nuevo entra después de su vecino (lookbook tras productos)", r.indexOf("lookbook") === r.indexOf("productos") + 1, r);
chequear("el nuevo entra después de su vecino (preguntas tras reseñas)", r.indexOf("preguntas") === r.indexOf("resenas") + 1, r);
chequear("newsletter sigue al final", r[r.length - 1] === "newsletter", r);
chequear("no se pierde ni se repite ninguno", [...r].sort().join() === [...FABRICA].sort().join(), r);

chequear("un nuevo que va primero entra primero", ordenEfectivo(["b", "c"], ["a", "b", "c"]).join() === "a,b,c");
chequear("dos nuevos seguidos quedan en orden", ordenEfectivo(["a", "d"], ["a", "b", "c", "d"]).join() === "a,b,c,d");
chequear("descarta ids que el template ya no tiene", ordenEfectivo(["viejo", "a", "b"], ["a", "b"]).join() === "a,b");
chequear("lo guardado completo se respeta tal cual", ordenEfectivo(["c", "a", "b"], ["a", "b", "c"]).join() === "c,a,b");

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
