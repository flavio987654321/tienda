/**
 * Chequeos del rango de fechas. Se corre a mano:
 *
 *   npx tsx src/lib/rango-fechas.check.ts
 *
 * Esto decide QUÉ PERÍODO mira toda la pantalla. Un error acá no rompe nada:
 * muestra los números de otro rango, y se ven perfectamente creíbles. Por eso
 * hay tantos chequeos de basura en la URL como de la cuenta en sí — cualquiera
 * puede editar la barra de direcciones, y algunos valores raros llegan solos
 * desde un link viejo o un favorito.
 */

import {
  resolverRango, esDiaValido, diasDelRango, mismoDiaElAnioPasado,
  etiquetaComparacion, fechaLarga, MAX_DIAS,
} from "./rango-fechas";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const HOY = "2026-08-09"; // un domingo

/* ── Los presets de siempre ───────────────────────────────────────────────── */
console.log("\n1) Los tres botones no cambian");

const r30 = resolverRango({}, HOY);
chequear("sin parametros son 30 dias", r30.actual.dias === 30, r30.actual);
chequear("y termina hoy", r30.actual.hasta === HOY, r30.actual.hasta);
// 30 dias CONTANDO hoy: del 11/7 al 9/8 inclusive. Si arrancara el 10/7 serian 31.
chequear("arranca 29 dias atras, no 30", r30.actual.desde === "2026-07-11", r30.actual.desde);
chequear("el anterior pega justo antes",
  r30.anterior.hasta === "2026-07-10" && r30.anterior.dias === 30, r30.anterior);

const r7 = resolverRango({ range: "7" }, HOY);
chequear("7 dias", r7.actual.dias === 7 && r7.actual.desde === "2026-08-03", r7.actual);
chequear("90 dias", resolverRango({ range: "90" }, HOY).actual.dias === 90);
chequear("un preset inventado cae en 30", resolverRango({ range: "45" }, HOY).actual.dias === 30);
chequear("y no deja aviso, porque no lo pidio a medida",
  resolverRango({ range: "45" }, HOY).aviso === null);

/* ── El rango a medida ────────────────────────────────────────────────────── */
console.log("\n2) Del 1 al 15 de marzo");

const rm = resolverRango({ desde: "2026-03-01", hasta: "2026-03-15" }, HOY);
chequear("15 dias contando los dos extremos", rm.actual.dias === 15, rm.actual.dias);
chequear("no es un preset", rm.preset === null);
chequear("no incluye hoy", rm.incluyeHoy === false);
chequear("sin avisos", rm.aviso === null, rm.aviso);
chequear("el anterior son los 15 dias de antes",
  rm.anterior.desde === "2026-02-14" && rm.anterior.hasta === "2026-02-28", rm.anterior);
chequear("la etiqueta dice las fechas", rm.etiqueta === "1/3/2026 a 15/3/2026", rm.etiqueta);

const unDia = resolverRango({ desde: "2026-03-01", hasta: "2026-03-01" }, HOY);
chequear("un solo dia es un dia, no cero", unDia.actual.dias === 1, unDia.actual.dias);
chequear("y el anterior es el dia de antes",
  unDia.anterior.desde === "2026-02-28" && unDia.anterior.dias === 1, unDia.anterior);

/* ── Contra el año pasado ─────────────────────────────────────────────────── */
console.log("\n3) Contra el año pasado");

const ra = resolverRango({ desde: "2026-12-01", hasta: "2026-12-24", comparar: "anio" }, "2027-01-05");
chequear("mismas fechas, un año antes",
  ra.anterior.desde === "2025-12-01" && ra.anterior.hasta === "2025-12-24", ra.anterior);
chequear("y el mismo largo", ra.anterior.dias === ra.actual.dias, [ra.actual.dias, ra.anterior.dias]);
chequear("la etiqueta lo dice",
  etiquetaComparacion(ra) === "el mismo período del año pasado", etiquetaComparacion(ra));

// LA trampa de los bisiestos: el 29 de febrero no existe en un año comun, y
// `new Date` lo empuja al 1 de marzo sin decir nada. Un informe del 29/2 se
// compararia contra el 1/3 y nadie se enteraria.
chequear("el 29/2 cae al 28, no se pasa al 1/3",
  mismoDiaElAnioPasado("2028-02-29") === "2027-02-28", mismoDiaElAnioPasado("2028-02-29"));
chequear("un 28/2 normal no se toca",
  mismoDiaElAnioPasado("2026-02-28") === "2025-02-28", mismoDiaElAnioPasado("2026-02-28"));
chequear("el 1/1 va al 1/1", mismoDiaElAnioPasado("2026-01-01") === "2025-01-01");

// El largo se conserva aunque el año pasado ese tramo tuviera un dia mas: si no,
// la comparacion le regala una jornada de ventas a uno de los dos lados.
const cruzaBisiesto = resolverRango({ desde: "2029-02-01", hasta: "2029-03-01", comparar: "anio" }, "2029-06-01");
chequear("cruzando un bisiesto los dos lados miden igual",
  cruzaBisiesto.anterior.dias === cruzaBisiesto.actual.dias,
  [cruzaBisiesto.actual, cruzaBisiesto.anterior]);

chequear("un preset tambien se puede comparar contra el año pasado",
  resolverRango({ range: "30", comparar: "anio" }, HOY).anterior.desde === "2025-07-11",
  resolverRango({ range: "30", comparar: "anio" }, HOY).anterior);

/* ── Lo que puede venir en la URL ─────────────────────────────────────────── */
console.log("\n4) Basura en la barra de direcciones");

const alReves = resolverRango({ desde: "2026-03-15", hasta: "2026-03-01" }, HOY);
chequear("las fechas al reves se dan vuelta",
  alReves.actual.desde === "2026-03-01" && alReves.actual.hasta === "2026-03-15", alReves.actual);
chequear("y se avisa", alReves.aviso !== null, alReves.aviso);

// Un rango que termina en el futuro hunde todos los promedios con dias vacios
// que todavia no pasaron.
const futuro = resolverRango({ desde: "2026-08-01", hasta: "2027-01-01" }, HOY);
chequear("el futuro se recorta a hoy", futuro.actual.hasta === HOY, futuro.actual.hasta);
chequear("y se avisa", futuro.aviso !== null, futuro.aviso);

const largo = resolverRango({ desde: "2020-01-01", hasta: "2026-08-09" }, HOY);
chequear(`mas de ${MAX_DIAS} dias se recorta`, largo.actual.dias === MAX_DIAS, largo.actual.dias);
const tresAnios = resolverRango({ desde: "2023-08-10", hasta: HOY }, HOY);
chequear("tres años enteros entran sin recorte",
  tresAnios.aviso === null && tresAnios.actual.dias === MAX_DIAS, [tresAnios.actual.dias, tresAnios.aviso]);
chequear("recortando por el principio, no por el final",
  largo.actual.hasta === HOY, largo.actual.hasta);

// Sin uno de los dos extremos no hay rango. Adivinar el que falta da un periodo
// que la persona no pidio y que se ve igual de creible que el correcto.
const solaUna = resolverRango({ desde: "2026-03-01" }, HOY);
chequear("con una sola fecha cae en 30 dias", solaUna.actual.dias === 30, solaUna.actual);
chequear("y avisa", solaUna.aviso !== null, solaUna.aviso);

for (const basura of ["", "hoy", "2026-13-01", "2026-02-30", "1999-01-01", "2026-2-1", "<script>", "0000-00-00"]) {
  const r = resolverRango({ desde: basura, hasta: "2026-03-15" }, HOY);
  chequear(`"${basura}" no rompe y cae en 30`, r.actual.dias === 30 && r.aviso !== null, r.actual);
}

chequear("un dia que no existe se rechaza", !esDiaValido("2026-02-30"));
chequear("el 29/2 de un bisiesto si existe", esDiaValido("2028-02-29"));
chequear("el 29/2 de un año comun no", !esDiaValido("2027-02-29"));
chequear("undefined no explota", !esDiaValido(undefined));

/* ── La cuenta de días ────────────────────────────────────────────────────── */
console.log("\n5) Contar dias");

chequear("el mismo dia es 1", diasDelRango("2026-08-09", "2026-08-09") === 1);
chequear("cruza el fin de mes", diasDelRango("2026-07-31", "2026-08-01") === 2);
chequear("cruza el año", diasDelRango("2025-12-31", "2026-01-01") === 2);
chequear("febrero de un bisiesto tiene 29", diasDelRango("2028-02-01", "2028-02-29") === 29);
// Argentina no tiene horario de verano desde 2009, pero si alguna vez vuelve,
// una cuenta hecha con horas locales se saltearia o repetiria un dia. Esta va
// sobre UTC a proposito.
chequear("un año entero", diasDelRango("2026-01-01", "2026-12-31") === 365);
chequear("la fecha larga no lleva ceros", fechaLarga("2026-03-05") === "5/3/2026");

/* ── incluyeHoy ───────────────────────────────────────────────────────────── */
console.log("\n6) Si el periodo va por la mitad");

chequear("un preset siempre incluye hoy", r30.incluyeHoy === true);
chequear("un rango cerrado del pasado no", rm.incluyeHoy === false);
chequear("uno a medida que termina hoy si",
  resolverRango({ desde: "2026-08-01", hasta: HOY }, HOY).incluyeHoy === true);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
