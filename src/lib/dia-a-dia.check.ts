/**
 * Chequeos del detalle diario. Se corre a mano:
 *
 *   npx tsx src/lib/dia-a-dia.check.ts
 *
 * El foco está en las dos afirmaciones que este archivo se anima a hacer —cuál
 * fue el mejor día y qué día de la semana rinde más— porque las dos se pueden
 * equivocar sonando perfectas. La segunda sobre todo: con cuatro sábados
 * medidos, uno bueno alcanza para inventar un patrón que no existe.
 */

import {
  resumirDias, diaDeLaSemana, fechaCorta,
  MINIMO_POR_DIA_SEMANA, DESPEGUE_MINIMO,
  type DiaCrudo,
} from "./dia-a-dia";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const dia = (d: string, ingresos: number, pedidos = 1, visitas = 10): DiaCrudo =>
  ({ dia: d, ingresos, pedidos, visitas, ganancia: null });

/* ── El día de la semana ──────────────────────────────────────────────────── */
console.log("\n1) Nombrar el dia correcto");

// LA trampa: `new Date("2026-08-15")` es medianoche UTC, y en Argentina (UTC-3)
// vuelve como el 14. Un sábado se informaría como viernes.
chequear("el 15/8/2026 es sabado", diaDeLaSemana("2026-08-15") === "sábado", diaDeLaSemana("2026-08-15"));
chequear("el 17/8/2026 es lunes", diaDeLaSemana("2026-08-17") === "lunes", diaDeLaSemana("2026-08-17"));
chequear("el 1/1/2026 es jueves", diaDeLaSemana("2026-01-01") === "jueves", diaDeLaSemana("2026-01-01"));
chequear("la fecha corta no lleva ceros", fechaCorta("2026-08-05") === "5/8", fechaCorta("2026-08-05"));

/* ── El mejor día ─────────────────────────────────────────────────────────── */
console.log("\n2) El mejor dia");

const semana = [
  dia("2026-08-10", 20_000), dia("2026-08-11", 35_000), dia("2026-08-12", 84_000),
  dia("2026-08-13", 0, 0, 4), dia("2026-08-14", 15_000),
];
const rs = resumirDias(semana);

chequear("elige el de mas ingresos", rs.mejor?.dia === "2026-08-12", rs.mejor?.dia);
chequear("promedia sobre TODOS los dias, no solo los que vendieron",
  rs.promedio === 154_000 / 5, rs.promedio);
chequear("cuenta los dias sin ventas", rs.sinVentas === 1, rs.sinVentas);

const todoEnCero = resumirDias([dia("2026-08-10", 0), dia("2026-08-11", 0)]);
chequear("sin una sola venta no hay mejor dia", todoEnCero.mejor === null, todoEnCero.mejor);
chequear("y no divide por cero", todoEnCero.promedio === 0 && todoEnCero.mejorDiaSemana === null);
chequear("sin dias no explota", resumirDias([]).mejor === null);

/* ── El día de la semana que rinde ────────────────────────────────────────── */
console.log("\n3) El patron semanal");

// Cuatro sábados fuertes contra el resto flojo: eso sí es un patrón.
const conPatron: DiaCrudo[] = [];
for (let i = 0; i < 28; i++) {
  const d = new Date(Date.UTC(2026, 7, 1 + i));
  const iso = d.toISOString().slice(0, 10);
  conPatron.push(dia(iso, d.getUTCDay() === 6 ? 200_000 : 10_000));
}
const rp = resumirDias(conPatron);
chequear("detecta el sabado", rp.mejorDiaSemana?.nombre === "sábado", rp.mejorDiaSemana);
chequear("dice cuantas veces lo midio", rp.mejorDiaSemana?.veces === 4, rp.mejorDiaSemana?.veces);

// LA trampa principal: todos parejos. Siempre hay uno que sale primero, pero
// nombrarlo seria inventar un patron. Con un despegue chico no se dice nada.
const parejo: DiaCrudo[] = [];
for (let i = 0; i < 28; i++) {
  const d = new Date(Date.UTC(2026, 7, 1 + i));
  parejo.push(dia(d.toISOString().slice(0, 10), d.getUTCDay() === 6 ? 11_000 : 10_000));
}
chequear(`si nadie se despega ${DESPEGUE_MINIMO}x no se afirma nada`,
  resumirDias(parejo).mejorDiaSemana === null, resumirDias(parejo).mejorDiaSemana);

// Pocas repeticiones: una semana sola no alcanza para hablar de "los sábados".
const unaSemana: DiaCrudo[] = [];
for (let i = 0; i < 7; i++) {
  const d = new Date(Date.UTC(2026, 7, 1 + i));
  unaSemana.push(dia(d.toISOString().slice(0, 10), d.getUTCDay() === 6 ? 500_000 : 1_000));
}
chequear(`con menos de ${MINIMO_POR_DIA_SEMANA} repeticiones no se afirma nada`,
  resumirDias(unaSemana).mejorDiaSemana === null, resumirDias(unaSemana).mejorDiaSemana);

// Un día en cero cuenta como medición de ese día, no se saca del promedio: si se
// sacara, los lunes flojos se verían tan buenos como los sábados.
const conCeros: DiaCrudo[] = [];
for (let i = 0; i < 28; i++) {
  const d = new Date(Date.UTC(2026, 7, 1 + i));
  // Los lunes venden mucho una vez y nada las otras tres.
  const esLunes = d.getUTCDay() === 1;
  conCeros.push(dia(d.toISOString().slice(0, 10), esLunes && i < 7 ? 200_000 : esLunes ? 0 : 30_000));
}
const rc = resumirDias(conCeros);
chequear("un lunes bueno y tres en cero no hacen de los lunes el mejor dia",
  rc.mejorDiaSemana?.nombre !== "lunes", rc.mejorDiaSemana);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
