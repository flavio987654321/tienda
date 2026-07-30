// Verificación ejecutable del calendario comercial. No hay runner de tests en el
// repo, así que corre con:
//   npx tsx src/lib/fechas-comerciales.check.ts
// Sale con código 1 si algún caso falla.
//
// Lo que se verifica acá es la parte con filo: los PERÍODOS (vacaciones, Hot
// Sale). Una fecha de un solo día es trivial —falta o no falta—, pero un período
// puede haber arrancado hace días y seguir corriendo, y eso rompía el filtro
// viejo (`fecha >= hoy`), que lo hacía desaparecer justo cuando estaba pasando.

import {
  getUpcomingDates, getEventNames, getEventRange,
  diaArgentino, inicioDiaArgentino, sumarDiasCalendario, diasEntreDias,
  offsetArgentinaMin, ventanaArgentina,
} from "./fechas-comerciales";

let failed = 0;
function check(id: string, ok: boolean, desc: string) {
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${id.padEnd(6)} ${desc}`);
}

const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);
const buscar = (fechas: ReturnType<typeof getUpcomingDates>, nombre: string) =>
  fechas.find((f) => f.nombre.startsWith(nombre));

// ── Períodos en curso ───────────────────────────────────────────────────────
{
  // 20/07/2026: adentro de las vacaciones de invierno (13 al 26).
  const r = getUpcomingDates(21, dia("2026-07-20"));
  const vac = buscar(r, "Vacaciones de invierno");
  check("CAL-A", !!vac && vac.enCurso && vac.diasRestantes === 6,
    "un período que ya arrancó aparece como en curso, con los días que le quedan");
}
{
  // El día que arranca: en curso desde el día uno, no "falta 0 días".
  const r = getUpcomingDates(21, dia("2026-07-13"));
  const vac = buscar(r, "Vacaciones de invierno");
  check("CAL-B", !!vac && vac.enCurso && vac.diasFaltan === 0,
    "el primer día del período ya cuenta como en curso");
}
{
  // El último día todavía cuenta; el siguiente ya no.
  const ultimo = buscar(getUpcomingDates(21, dia("2026-07-26")), "Vacaciones de invierno");
  const despues = buscar(getUpcomingDates(21, dia("2026-07-27")), "Vacaciones de invierno");
  check("CAL-C", !!ultimo && ultimo.diasRestantes === 0 && !despues,
    "el último día sigue apareciendo y al día siguiente desaparece");
}
{
  // Antes de que arranque se comporta como cualquier fecha: cuenta regresiva.
  const vac = buscar(getUpcomingDates(21, dia("2026-07-06")), "Vacaciones de invierno");
  check("CAL-D", !!vac && !vac.enCurso && vac.diasFaltan === 7,
    "un período que todavía no arrancó cuenta los días que faltan");
}

// ── Fechas de un solo día ──────────────────────────────────────────────────
{
  // El bug que reportó Flavio: el 20/07 es el Día del Amigo y no aparecía.
  const amigo = buscar(getUpcomingDates(21, dia("2026-07-20")), "Día del Amigo");
  check("CAL-E", !!amigo && amigo.enCurso && amigo.diasRestantes === null,
    "una fecha de un solo día que cae hoy aparece, y no tiene días restantes");
}
{
  const r = getUpcomingDates(21, dia("2026-07-21"));
  check("CAL-F", !buscar(r, "Día del Amigo"),
    "una fecha de un solo día desaparece al día siguiente");
}

// ── Orden y cruce de año ───────────────────────────────────────────────────
{
  const r = getUpcomingDates(21, dia("2026-07-20"));
  const enCurso = r.filter((f) => f.enCurso).length;
  check("CAL-G", r.slice(0, enCurso).every((f) => f.enCurso),
    "lo que está pasando ahora va antes que lo que falta");
}
{
  // 05/01: las vacaciones de verano arrancaron el 1. Sin mirar el año anterior
  // esto se rompería en cualquier período que cruce el 31/12.
  const vac = buscar(getUpcomingDates(21, dia("2027-01-05")), "Vacaciones de verano");
  check("CAL-H", !!vac && vac.enCurso,
    "un período que arrancó antes del 1 de enero sigue vivo después del cambio de año");
}

// ── Ventana que el wizard de promociones propone ───────────────────────────
{
  const r = getEventRange("Vacaciones de invierno");
  const dias = r ? Math.round((r.hasta.getTime() - r.desde.getTime()) / 86_400_000) : -1;
  check("CAL-I", dias === 13,
    "un período propone su duración real, no una ventana de 3 días");
}
{
  const r = getEventRange("Black Friday");
  const dias = r ? Math.round((r.hasta.getTime() - r.desde.getTime()) / 86_400_000) : -1;
  check("CAL-J", dias === 3,
    "una fecha de un solo día propone arrancar unos días antes");
}
{
  check("CAL-K", getEventRange("Aniversario de mi tienda") === null,
    "un evento propio de la tienda no propone ninguna fecha");
}
{
  // El selector del wizard ofrece los nombres cortos; si getEventRange no los
  // reconociera, elegir una fecha del calendario no autocompletaría nada.
  const sinRango = getEventNames().filter((n) => !getEventRange(n));
  check("CAL-L", sinRango.length === 0,
    `todos los nombres que ofrece el selector resuelven su fecha${sinRango.length ? " — fallan: " + sinRango.join(", ") : ""}`);
}
{
  const largos = getEventNames().filter((n) => n.length > 24);
  check("CAL-M", largos.length === 0,
    `ningún nombre es tan largo que se corte en el cartelito${largos.length ? " — fallan: " + largos.join(", ") : ""}`);
}

// ── Días argentinos ─────────────────────────────────────────────────────────
// Métricas contaba los días en UTC: cada "día" iba de las 21:00 a las 21:00 de
// acá, y una venta de las 22:00 de un martes figuraba como del miércoles —justo
// las horas en que más se vende—. Acá se fija el borde exacto, que es donde se
// rompe.
{
  // 22:00 del 28 en Argentina = 01:00 UTC del 29. En UTC caía en el 29.
  check("DIA-A", diaArgentino(new Date("2026-07-29T01:00:00Z")) === "2026-07-28",
    "una venta de las 22:00 es del mismo día, no del siguiente");
  check("DIA-B", diaArgentino(new Date("2026-07-29T02:59:59Z")) === "2026-07-28",
    "el último segundo del día todavía es de ese día");
  check("DIA-C", diaArgentino(new Date("2026-07-29T03:00:00Z")) === "2026-07-29",
    "y el primero ya es del siguiente");
}
{
  check("DIA-D", inicioDiaArgentino("2026-07-29").toISOString() === "2026-07-29T03:00:00.000Z",
    "las 00:00 argentinas son las 03:00 UTC");

  // La vuelta completa tiene que cerrar: el instante en que arranca un día
  // pertenece a ese día, y el milisegundo anterior al día anterior.
  const arranque = inicioDiaArgentino("2026-07-29");
  check("DIA-E", diaArgentino(arranque) === "2026-07-29",
    "el arranque del día pertenece a ese día");
  check("DIA-F", diaArgentino(new Date(arranque.getTime() - 1)) === "2026-07-28",
    "un milisegundo antes es del día anterior");

  // Acá no se cambia la hora. Si algún día volviera el horario de verano, este
  // caso avisa antes de que se corran todos los períodos.
  const finDia = inicioDiaArgentino("2026-07-30");
  check("DIA-G", finDia.getTime() - arranque.getTime() === 86_400_000,
    "un día dura 24 horas exactas");
}
{
  check("DIA-H", sumarDiasCalendario("2026-07-31", 1) === "2026-08-01", "cruza el fin de mes");
  check("DIA-I", sumarDiasCalendario("2026-12-31", 1) === "2027-01-01", "cruza el fin de año");
  check("DIA-J", sumarDiasCalendario("2026-01-01", -1) === "2025-12-31", "cruza hacia atrás");
  check("DIA-K", sumarDiasCalendario("2028-02-28", 1) === "2028-02-29", "febrero de un año bisiesto");
  check("DIA-L", sumarDiasCalendario("2026-02-28", 1) === "2026-03-01", "febrero de uno que no lo es");
  check("DIA-M", sumarDiasCalendario("2026-07-29", -29) === "2026-06-30", "una ventana de 30 días");
}
{
  // Lo usa el cron de avisos de Sasha para saber hace cuántos días mandó cada uno.
  check("DIA-N", diasEntreDias("2026-07-29", "2026-07-29") === 0, "el mismo día da 0");
  check("DIA-O", diasEntreDias("2026-07-28", "2026-07-29") === 1, "ayer da 1");
  check("DIA-P", diasEntreDias("2026-07-29", "2026-07-28") === -1, "al revés da negativo");
  check("DIA-Q", diasEntreDias("2026-06-30", "2026-07-29") === 29, "cruza el mes");
  check("DIA-R", diasEntreDias("2025-12-31", "2026-01-01") === 1, "cruza el año");
}

// ── Las ventanas de rotación ────────────────────────────────────────────────
//
// Esto es lo que hace que el producto destacado cambie a medianoche argentina y
// no a las 21:00. No se puede verificar a ojo: habría que quedarse despierto
// hasta las 00:00, mirar la tienda, y volver a las 21:00 para confirmar que ahí
// ya NO cambia. Por cada una de las tres opciones (6, 12 y 24 horas).
//
// `Date.now() / ventana` cuenta desde el 1/1/1970 a medianoche UTC, así que los
// cortes caían en horas redondas de Londres.
{
  const ar = (iso: string) => new Date(`${iso}-03:00`);

  check("ROT-A", offsetArgentinaMin(ar("2026-07-29T12:00:00")) === -180,
    "Argentina está 180 minutos detrás de UTC");
  check("ROT-B", offsetArgentinaMin(ar("2026-01-15T12:00:00")) === -180,
    "en enero también: hoy no hay horario de verano");

  // El caso que molestaba. 21:00 era el corte viejo, así que estas dos horas
  // caían en franjas distintas y el destacado cambiaba en plena tarde.
  check("ROT-C",
    ventanaArgentina(24, ar("2026-07-29T20:59:00")) === ventanaArgentina(24, ar("2026-07-29T21:01:00")),
    "con 24hs, las 21:00 ya NO parten el día");

  check("ROT-D",
    ventanaArgentina(24, ar("2026-07-29T23:59:00")) !== ventanaArgentina(24, ar("2026-07-30T00:01:00")),
    "con 24hs, cambia en la medianoche argentina");

  // Todo el día tiene que dar la misma ventana: si dos personas entran a la
  // mañana y a la noche, ven el mismo destacado.
  const delDia = [0, 3, 7, 11, 15, 19, 23].map((h) =>
    ventanaArgentina(24, ar(`2026-07-29T${String(h).padStart(2, "0")}:30:00`))
  );
  check("ROT-E", new Set(delDia).size === 1,
    "con 24hs, todas las horas del mismo día argentino dan la misma ventana");

  // Y días seguidos tienen que dar ventanas seguidas, o el ciclo saltearía
  // productos.
  const d29 = ventanaArgentina(24, ar("2026-07-29T10:00:00"));
  const d30 = ventanaArgentina(24, ar("2026-07-30T10:00:00"));
  check("ROT-F", d30 - d29 === 1, "con 24hs, un día más es una ventana más");

  // 12 horas: cortes a las 00:00 y 12:00 argentinas.
  check("ROT-G",
    ventanaArgentina(12, ar("2026-07-29T11:59:00")) !== ventanaArgentina(12, ar("2026-07-29T12:01:00")),
    "con 12hs, corta al mediodía argentino");
  check("ROT-H",
    ventanaArgentina(12, ar("2026-07-29T12:01:00")) === ventanaArgentina(12, ar("2026-07-29T23:59:00")),
    "con 12hs, del mediodía a la medianoche es una sola ventana");

  // 6 horas: cortes en 00, 06, 12 y 18 argentinas.
  const franjas6 = [1, 7, 13, 19].map((h) =>
    ventanaArgentina(6, ar(`2026-07-29T${String(h).padStart(2, "0")}:00:00`))
  );
  check("ROT-I", new Set(franjas6).size === 4,
    "con 6hs, el día argentino se parte en 4 ventanas distintas");
  check("ROT-J",
    ventanaArgentina(6, ar("2026-07-29T05:59:00")) !== ventanaArgentina(6, ar("2026-07-29T06:01:00")),
    "con 6hs, corta a las 06:00 argentinas");

  // Que la cuenta sea la de antes MÁS el corrimiento, no otra: la ventana de un
  // instante tiene que ser la misma que la de 3 horas antes en UTC.
  const instante = ar("2026-07-29T10:00:00");
  const conOffset = Math.floor((instante.getTime() - 3 * 3_600_000) / (24 * 3_600_000));
  check("ROT-K", ventanaArgentina(24, instante) === conOffset,
    "la ventana es la de UTC corrida 3 horas, nada más");
}

console.log(failed === 0 ? "\n✅ El calendario da lo esperado." : `\n❌ ${failed} caso(s) fallan.`);
process.exit(failed === 0 ? 0 : 1);
