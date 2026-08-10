/**
 * Chequeos del agrupado de las curvas. Se corre a mano:
 *
 *   npx tsx src/lib/serie-grafico.check.ts
 *
 * Lo que se cuida acá es que agrupar NO cambie la plata. Un gráfico que dibuja
 * un total distinto al del título de su propia tarjeta es peor que no tener
 * gráfico, y es un error que no avisa: la curva se ve perfecta.
 */

import {
  serieParaGrafico, agruparPorSemana, convieneAgrupar, DIAS_PARA_AGRUPAR,
  type Punto,
} from "./serie-grafico";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const serie = (n: number, valor: (i: number) => number = () => 1): Punto[] =>
  Array.from({ length: n }, (_, i) => ({ label: `d${i}`, value: valor(i) }));

const suma = (p: Punto[]) => p.reduce((s, x) => s + x.value, 0);

/* ── Los presets no se tocan ──────────────────────────────────────────────── */
console.log("\n1) 7, 30 y 90 dias siguen dibujandose igual que siempre");

for (const dias of [7, 30, 90, 120]) {
  const r = serieParaGrafico(serie(dias));
  chequear(`${dias} dias: sigue por dia`, !r.porSemana && r.puntos.length === dias, r.puntos.length);
}
chequear(`el umbral es ${DIAS_PARA_AGRUPAR}`, DIAS_PARA_AGRUPAR === 120);
chequear("121 dias ya se agrupa", convieneAgrupar(121));

/* ── La plata no cambia ───────────────────────────────────────────────────── */
console.log("\n2) Agrupar no mueve un peso");

// LA trampa: si el gráfico sumara distinto al título de su tarjeta, la curva se
// veria perfecta y el numero de arriba no coincidiria con ella.
const anio = serie(365, (i) => (i % 7 === 6 ? 200_000 : 10_000)); // sabados fuertes
const r = serieParaGrafico(anio);
chequear("un año se agrupa", r.porSemana, r.porSemana);
chequear("365 dias son 53 semanas", r.puntos.length === 53, r.puntos.length);
chequear("la suma es EXACTAMENTE la misma", suma(r.puntos) === suma(anio), [suma(r.puntos), suma(anio)]);

// Los valores se SUMAN, no se promedian: son pesos que existieron.
const dos = agruparPorSemana(serie(14, () => 1000));
chequear("cada semana suma sus 7 dias", dos[0].value === 7000 && dos[1].value === 7000, dos);

/* ── La ultima semana incompleta ──────────────────────────────────────────── */
console.log("\n3) La ultima semana puede tener menos de 7 dias");

// 366 no es multiplo de 7. Si el ultimo bloque se descartara, el grafico
// perderia hasta seis dias de ventas sin decir nada.
const g366 = agruparPorSemana(serie(366, () => 100));
chequear("366 dias son 53 semanas", g366.length === 53, g366.length);
chequear("la ultima tiene los 2 dias que sobran", g366[52].value === 200, g366[52].value);
chequear("y no se pierde ni un dia", suma(g366) === 36_600, suma(g366));

const g8 = agruparPorSemana(serie(8, () => 5));
chequear("8 dias son 2 bloques (7 + 1)", g8.length === 2 && g8[1].value === 5, g8);

/* ── Las etiquetas ────────────────────────────────────────────────────────── */
console.log("\n4) Las etiquetas");

const etiquetas = agruparPorSemana(serie(21));
chequear("cada bloque se llama como su primer dia",
  etiquetas.map((e) => e.label).join(",") === "d0,d7,d14", etiquetas.map((e) => e.label));

/* ── Los bordes ───────────────────────────────────────────────────────────── */
console.log("\n5) Los bordes");

chequear("una serie vacia no explota", agruparPorSemana([]).length === 0);
chequear("un solo dia queda como un bloque de uno",
  agruparPorSemana(serie(1, () => 42))[0].value === 42);
chequear("todo en cero sigue en cero", suma(agruparPorSemana(serie(200, () => 0))) === 0);
// Un dia sin ventas es un 0 real y tiene que seguir contando como dia dentro de
// su semana, no desaparecer.
const conCeros = agruparPorSemana(serie(7, (i) => (i === 3 ? 5000 : 0)));
chequear("una semana con un solo dia de venta suma ese dia",
  conCeros.length === 1 && conCeros[0].value === 5000, conCeros);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
