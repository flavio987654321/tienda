// Verificación ejecutable del calendario comercial. No hay runner de tests en el
// repo, así que corre con:
//   npx tsx src/lib/fechas-comerciales.check.ts
// Sale con código 1 si algún caso falla.
//
// Lo que se verifica acá es la parte con filo: los PERÍODOS (vacaciones, Hot
// Sale). Una fecha de un solo día es trivial —falta o no falta—, pero un período
// puede haber arrancado hace días y seguir corriendo, y eso rompía el filtro
// viejo (`fecha >= hoy`), que lo hacía desaparecer justo cuando estaba pasando.

import { getUpcomingDates, getEventNames, getEventRange } from "./fechas-comerciales";

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

console.log(failed === 0 ? "\n✅ El calendario da lo esperado." : `\n❌ ${failed} caso(s) fallan.`);
process.exit(failed === 0 ? 0 : 1);
