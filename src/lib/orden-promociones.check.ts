/**
 * Chequeos del orden de los flyers de la home. Se corre con:
 *
 *   npx tsx src/lib/orden-promociones.check.ts
 *
 * Lo que se prueba acá es lo único que puede dejar el carrusel roto: que un
 * intercambio no pase NUNCA por un estado con dos flyers en el mismo lugar, que
 * es lo que el `@@unique([sortOrder])` de la base no perdona.
 */

import { pasosParaMover, LUGARES, LUGAR_PROVISORIO, type PromoOrdenable } from "./orden-promociones";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const lleno: PromoOrdenable[] = [
  { id: "a", sortOrder: 0 },
  { id: "b", sortOrder: 1 },
  { id: "c", sortOrder: 2 },
];

/* ── Lo que no hay que hacer ─────────────────────────────────────────────── */

check("NADA-A", pasosParaMover(lleno, "a", 0).length === 0,
  "mover algo al lugar donde ya está no escribe nada");
check("NADA-B", pasosParaMover(lleno, "z", 1).length === 0,
  "un id que no existe no escribe nada");
check("NADA-C", pasosParaMover(lleno, "a", LUGARES).length === 0 && pasosParaMover(lleno, "a", -1).length === 0,
  "un lugar fuera del carrusel no escribe nada");
check("NADA-D", pasosParaMover(lleno, "a", 1.5).length === 0 && pasosParaMover(lleno, "a", NaN).length === 0,
  "un lugar que no es un entero tampoco: NaN pasaba los dos `<` y `>=`");

/* ── El lugar está libre: una sola escritura ─────────────────────────────── */

const conHueco: PromoOrdenable[] = [{ id: "a", sortOrder: 0 }, { id: "c", sortOrder: 2 }];
const alHueco = pasosParaMover(conHueco, "a", 1);
check("LIBRE-A", alHueco.length === 1 && alHueco[0].id === "a" && alHueco[0].sortOrder === 1,
  "a un lugar vacío se va derecho, sin lugar provisorio");

/* ── El intercambio: tres pasos, y ninguno repite lugar ──────────────────── */

const swap = pasosParaMover(lleno, "a", 1);
check("SWAP-A", swap.length === 3, "intercambiar son tres escrituras, no dos");
check("SWAP-B", swap[0].id === "a" && swap[0].sortOrder === LUGAR_PROVISORIO,
  "el que se mueve sale PRIMERO al lugar provisorio");
check("SWAP-C", swap[1].id === "b" && swap[1].sortOrder === 0,
  "después el otro ocupa el lugar que quedó libre");
check("SWAP-D", swap[2].id === "a" && swap[2].sortOrder === 1,
  "y recién al final aterriza el que se movía");

/* El chequeo que de verdad importa: se aplican los pasos de a uno sobre el
   estado y se mira, DESPUÉS DE CADA UNO, que no haya dos en el mismo lugar. Es
   exactamente lo que mira la base, y es lo que fallaba con dos escrituras. */
function aplicarYVigilar(inicial: PromoOrdenable[], pasos: { id: string; sortOrder: number }[]) {
  const estado = inicial.map((p) => ({ ...p }));
  for (const paso of pasos) {
    const fila = estado.find((p) => p.id === paso.id);
    if (!fila) return { ok: false, estado };
    fila.sortOrder = paso.sortOrder;
    const lugares = estado.map((p) => p.sortOrder);
    if (new Set(lugares).size !== lugares.length) return { ok: false, estado };
  }
  return { ok: true, estado };
}

const corrida = aplicarYVigilar(lleno, swap);
check("SWAP-E", corrida.ok,
  "en ningún momento del intercambio hay dos flyers en el mismo lugar");
check("SWAP-F", corrida.estado.find((p) => p.id === "a")!.sortOrder === 1 &&
                corrida.estado.find((p) => p.id === "b")!.sortOrder === 0 &&
                corrida.estado.find((p) => p.id === "c")!.sortOrder === 2,
  "y al terminar quedaron intercambiados, sin tocar al tercero");

/* Los seis movimientos posibles del carrusel lleno, uno por uno. */
let todosOk = true;
for (const quien of ["a", "b", "c"]) {
  for (let destino = 0; destino < LUGARES; destino++) {
    const r = aplicarYVigilar(lleno, pasosParaMover(lleno, quien, destino));
    const fila = r.estado.find((p) => p.id === quien)!;
    if (!r.ok || fila.sortOrder !== destino) todosOk = false;
    /* Y los tres siguen estando, cada uno en un lugar del carrusel. */
    const lugares = r.estado.map((p) => p.sortOrder).sort();
    if (lugares.join() !== "0,1,2") todosOk = false;
  }
}
check("TODOS-A", todosOk,
  "los nueve movimientos del carrusel lleno terminan bien y sin choques");

/* El renglón final dice FALLA cuando algo se rompió: `correr-chequeos` usa esa
   palabra para no confundir una prueba ROTA con una salteada por falta de
   variables de entorno. Es lo que imprimen las otras. */
console.log(fallos === 0
  ? "\nok — los flyers se mueven sin pisarse"
  : `\nFALLA — ${fallos} chequeo(s) del orden de los flyers`);
process.exit(fallos === 0 ? 0 : 1);
