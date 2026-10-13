/**
 * Chequeos de `cuota-supabase`. Se corre a mano:
 *
 *   npx tsx src/lib/cuota-supabase.check.ts
 */

import { medir, queAvisar, enGB, TOPES_PRO } from "./cuota-supabase";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const GB = 1024 ** 3;
const LUNES = 1, MARTES = 2;

// Lo de hoy (12/10/26): lejísimos de los topes.
const hoy = medir(0.3 * GB, 0.4 * GB);
chequear("con lo de hoy no avisa ni un lunes", !queAvisar(hoy, LUNES).avisar);

const al75 = medir(6 * GB, 1 * GB); // base al 75%
chequear("al 75% avisa el lunes", queAvisar(al75, LUNES).avisar);
chequear("al 75% NO avisa el martes (una vez por semana)", !queAvisar(al75, MARTES).avisar);
chequear("al 75% no es urgente", !queAvisar(al75, LUNES).urgente);
chequear("al 75% el mail nombra sólo lo que se pasó", queAvisar(al75, LUNES).pasadas.map((m) => m.nombre).join() === "Base de datos");

const al92 = medir(1 * GB, 92 * GB); // depósito al 92%
chequear("al 92% avisa también un martes", queAvisar(al92, MARTES).avisar);
chequear("al 92% es urgente", queAvisar(al92, MARTES).urgente);

const pasado = medir(9 * GB, 0); // más del 100%
chequear("pasado del tope sigue avisando", queAvisar(pasado, MARTES).avisar && queAvisar(pasado, MARTES).urgente);

chequear("justo en 70% ya avisa", queAvisar(medir(TOPES_PRO.base * 0.7, 0), LUNES).avisar);
chequear("los GB se escriben a la argentina", enGB(1.5 * GB) === "1,5 GB", enGB(1.5 * GB));

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
