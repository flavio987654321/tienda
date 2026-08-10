/**
 * Chequeos del grano de las curvas y de la tabla. Se corre a mano:
 *
 *   npx tsx src/lib/serie-grafico.check.ts
 *
 * Lo que se cuida acá es que agrupar NO cambie la plata. Un gráfico que dibuja
 * un total distinto al del título de su propia tarjeta es peor que no tener
 * gráfico, y es un error que no avisa: la curva se ve perfecta.
 */

import {
  serieParaGrafico, agrupar, granoPara, nombreGrano, etiquetaMes,
  DIAS_PARA_SEMANA, DIAS_PARA_MES,
  type Punto,
} from "./serie-grafico";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/** Días consecutivos desde una fecha, con el valor que se le pida a cada uno. */
const serie = (desde: string, n: number, valor: (i: number) => number = () => 1): Punto[] => {
  const [y, m, d] = desde.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const t = new Date(Date.UTC(y, m - 1, d + i));
    const dia = t.toISOString().slice(0, 10);
    return { dia, label: `${t.getUTCDate()}/${t.getUTCMonth() + 1}`, value: valor(i) };
  });
};
const suma = (p: Punto[]) => p.reduce((s, x) => s + x.value, 0);

/* ── Qué grano le toca a cada rango ───────────────────────────────────────── */
console.log("\n1) Los tres presets no cambian");

for (const dias of [7, 30, 90, 120]) {
  chequear(`${dias} dias: por dia`, granoPara(dias) === "dia", granoPara(dias));
}
chequear(`el corte a semana es ${DIAS_PARA_SEMANA}`, granoPara(121) === "semana");
chequear("1 año: por semana", granoPara(366) === "semana");
chequear(`el corte a mes es ${DIAS_PARA_MES}`, granoPara(551) === "mes", granoPara(551));
chequear("550 todavia es semana", granoPara(550) === "semana");
chequear("3 años: por mes", granoPara(1096) === "mes");
chequear("por dia no se aclara nada", nombreGrano("dia") === null);
chequear("por semana se aclara", nombreGrano("semana") === "por semana");
chequear("por mes se aclara", nombreGrano("mes") === "por mes");

/* ── La plata no cambia ───────────────────────────────────────────────────── */
console.log("\n2) Agrupar no mueve un peso");

// LA trampa: si el gráfico sumara distinto al titulo de su tarjeta, la curva se
// veria perfecta y el numero de arriba no coincidiria con ella.
const anio = serie("2025-08-11", 365, (i) => (i % 7 === 6 ? 200_000 : 10_000));
const sem = serieParaGrafico(anio, "semana");
chequear("365 dias son 53 semanas", sem.puntos.length === 53, sem.puntos.length);
chequear("y la suma es EXACTAMENTE la misma", suma(sem.puntos) === suma(anio), [suma(sem.puntos), suma(anio)]);

const tresAnios = serie("2023-08-11", 1096, () => 1000);
const mes = serieParaGrafico(tresAnios, "mes");
chequear("3 años son 37 meses de calendario", mes.puntos.length === 37, mes.puntos.length);
chequear("y la suma es EXACTAMENTE la misma", suma(mes.puntos) === suma(tresAnios), [suma(mes.puntos), suma(tresAnios)]);
chequear("por dia no toca nada", serieParaGrafico(anio, "dia").puntos.length === 365);

/* ── Los meses son de calendario, no bloques de 30 ────────────────────────── */
console.log("\n3) Meses de verdad");

// Un bloque de 30 dias que arranca el 12 no es ningun mes, y "julio" es lo que
// la gente espera ver.
const eneAFeb = serieParaGrafico(serie("2026-01-01", 59, () => 1), "mes");
chequear("enero y febrero son dos bloques", eneAFeb.puntos.length === 2, eneAFeb.puntos.length);
chequear("enero tiene 31", eneAFeb.puntos[0].value === 31, eneAFeb.puntos[0].value);
chequear("febrero de 2026 tiene 28", eneAFeb.puntos[1].value === 28, eneAFeb.puntos[1].value);

const bisiesto = serieParaGrafico(serie("2028-02-01", 29, () => 1), "mes");
chequear("febrero de un bisiesto tiene 29", bisiesto.puntos[0].value === 29, bisiesto.puntos[0].value);

// El primero y el ultimo mes pueden estar incompletos y esta bien: son el pedazo
// de ese mes que entra en el periodo.
const aMedias = serieParaGrafico(serie("2026-01-20", 25, () => 1), "mes");
chequear("un mes cortado por el principio cuenta lo que entra",
  aMedias.puntos[0].value === 12 && aMedias.puntos[1].value === 13, aMedias.puntos.map(p => p.value));

// LA trampa del año: agrupando por la etiqueta del eje ("12/8") en vez de por la
// fecha, el 12/8 de 2025 y el de 2026 caerian en el mismo bloque y el grafico
// sumaria dos años en un punto.
const dosAgostos = [...serie("2025-08-01", 31, () => 100), ...serie("2026-08-01", 31, () => 100)];
const separados = serieParaGrafico(dosAgostos, "mes");
chequear("dos agostos de años distintos NO se mezclan",
  separados.puntos.length === 2 && separados.puntos.every(p => p.value === 3100),
  separados.puntos.map(p => [p.label, p.value]));

/* ── Las etiquetas ────────────────────────────────────────────────────────── */
console.log("\n4) Las etiquetas");

chequear("el mes dice mes y año", etiquetaMes("2026-08-11") === "ago 2026", etiquetaMes("2026-08-11"));
chequear("y no se confunde de año", etiquetaMes("2025-08-11") === "ago 2025");
chequear("por semana queda la fecha del primer dia",
  serieParaGrafico(serie("2026-05-13", 14), "semana").puntos.map(p => p.label).join(",") === "13/5,20/5",
  serieParaGrafico(serie("2026-05-13", 14), "semana").puntos.map(p => p.label));

/* ── La semana ────────────────────────────────────────────────────────────── */
console.log("\n5) La ultima semana puede estar incompleta");

// 366 no es multiplo de 7. Si el ultimo bloque se descartara, el grafico
// perderia hasta seis dias de ventas sin decir nada.
const g366 = serieParaGrafico(serie("2025-08-11", 366, () => 100), "semana");
chequear("366 dias son 53 semanas", g366.puntos.length === 53, g366.puntos.length);
chequear("la ultima tiene los 2 dias que sobran", g366.puntos[52].value === 200, g366.puntos[52].value);
chequear("y no se pierde ni un dia", suma(g366.puntos) === 36_600, suma(g366.puntos));

/* ── `agrupar` sirve igual para la tabla ──────────────────────────────────── */
console.log("\n6) El mismo agrupador para la tabla");

// El grafico y las filas de abajo NUNCA pueden estar cortados en lugares
// distintos: los dos se verian bien por separado y no habria como notarlo.
type Fila = { dia: string; ingresos: number };
const filas: Fila[] = serie("2026-01-01", 90, () => 1).map((p) => ({ dia: p.dia, ingresos: 5 }));
const porMes = agrupar(filas, "mes", (f) => f.dia);
chequear("enero, febrero y marzo", porMes.length === 3, porMes.length);
chequear("y ninguna fila se pierde", porMes.flat().length === 90, porMes.flat().length);
const porDia = agrupar(filas, "dia", (f) => f.dia);
chequear("por dia da un bloque por fila", porDia.length === 90 && porDia[0].length === 1);

/* ── Los bordes ───────────────────────────────────────────────────────────── */
console.log("\n7) Los bordes");

chequear("una serie vacia no explota", serieParaGrafico([], "mes").puntos.length === 0);
chequear("y agrupar tampoco", agrupar([], "semana", () => "").length === 0);
chequear("un solo dia queda como un bloque de uno",
  serieParaGrafico(serie("2026-08-10", 1, () => 42), "mes").puntos[0].value === 42);
chequear("todo en cero sigue en cero",
  suma(serieParaGrafico(serie("2026-01-01", 200, () => 0), "mes").puntos) === 0);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
