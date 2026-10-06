/**
 * Chequeo del seguimiento de consultas. Se corre con:
 *
 *   npx tsx src/lib/seguimiento.check.ts
 *
 * Lo delicado es la hora: todo se piensa en Argentina (UTC−3) sea cual sea la
 * zona de la máquina. Las 23:00 de Argentina ya son "mañana" en UTC, y un
 * recordatorio para "mañana" no puede caer pasado mañana por eso.
 */
import {
  desdeCamposAR, aCamposAR, diaAR, fechaDeAtajo, cuandoAR, validarSeguimiento, etapaResultante, mensajeDeVisita, horasSinResponder,
} from "./seguimiento";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };

// 23:00 del lunes 6/10 en Argentina = 02:00 UTC del martes 7/10
const nocheAR = new Date("2026-10-07T02:00:00Z");
const mediodiaAR = new Date("2026-10-06T15:00:00Z");

ok("17:30 AR = 20:30 UTC", desdeCamposAR("2026-10-09", "17:30")?.toISOString() === "2026-10-09T20:30:00.000Z", desdeCamposAR("2026-10-09", "17:30"));
ok("campos inválidos → null", desdeCamposAR("9/10/2026", "17:30") === null && desdeCamposAR("2026-10-09", "5pm") === null);
ok("ida y vuelta de campos", JSON.stringify(aCamposAR(new Date("2026-10-09T20:30:00Z"))) === JSON.stringify({ fecha: "2026-10-09", hora: "17:30" }));
ok("a las 23 AR, 'hoy' sigue siendo el 6/10", diaAR(nocheAR).desde.toISOString() === "2026-10-06T03:00:00.000Z", diaAR(nocheAR).desde);
ok("y termina a las 23:59:59.999 AR", diaAR(nocheAR).hasta.toISOString() === "2026-10-07T02:59:59.999Z");
ok("'Mañana' desde las 23 AR → el 7/10 a las 10", fechaDeAtajo("manana", nocheAR).toISOString() === "2026-10-07T13:00:00.000Z", fechaDeAtajo("manana", nocheAR));
ok("'En una semana' → 13/10 a las 10", fechaDeAtajo("semana", mediodiaAR).toISOString() === "2026-10-13T13:00:00.000Z");
ok("fin de mes: 'mañana' desde el 31/10 → 1/11", fechaDeAtajo("manana", new Date("2026-10-31T15:00:00Z")).toISOString() === "2026-11-01T13:00:00.000Z");

ok("cuando: hoy", cuandoAR(new Date("2026-10-06T20:30:00Z"), mediodiaAR) === "hoy 17:30", cuandoAR(new Date("2026-10-06T20:30:00Z"), mediodiaAR));
ok("cuando: mañana", cuandoAR(new Date("2026-10-07T13:00:00Z"), mediodiaAR) === "mañana 10:00");
ok("cuando: ayer", cuandoAR(new Date("2026-10-05T13:00:00Z"), mediodiaAR) === "ayer 10:00");
ok("cuando: otro día", cuandoAR(new Date("2026-10-09T20:30:00Z"), mediodiaAR) === "vie 9/10 17:30", cuandoAR(new Date("2026-10-09T20:30:00Z"), mediodiaAR));

const v = (b: object) => validarSeguimiento(b as Record<string, unknown>, mediodiaAR);
ok("etapa válida", "cambios" in v({ etapa: "NEGOCIANDO" }));
ok("etapa inventada → error", "error" in v({ etapa: "GANADA" }));
ok("etapa null (volver a nueva)", "cambios" in v({ etapa: null }));
ok("nota recortada a 1000", (v({ nota: "x".repeat(2000) }) as { cambios: { nota: string } }).cambios.nota.length === 1000);
ok("nota vacía → null", (v({ nota: "   " }) as { cambios: { nota: null } }).cambios.nota === null);
ok("recordatorio de hace una semana → error", "error" in v({ recordarEl: "2026-09-29T13:00:00Z" }));
ok("recordatorio a 2 años → error", "error" in v({ recordarEl: "2028-10-06T13:00:00Z" }));
ok("recordatorio basura → error", "error" in v({ recordarEl: "mañana" }));
const vis = v({ visitaEl: "2026-10-09T20:30:00Z", visitaTipo: "PRUEBA" }) as { cambios: { visitaTipo: string } };
ok("visita con tipo prueba", vis.cambios.visitaTipo === "PRUEBA");
ok("tipo inventado → visita común", (v({ visitaEl: "2026-10-09T20:30:00Z", visitaTipo: "X" }) as { cambios: { visitaTipo: string } }).cambios.visitaTipo === "VISITA");
ok("cancelar visita borra el tipo", (v({ visitaEl: null }) as { cambios: { visitaTipo: null } }).cambios.visitaTipo === null);
ok("cuerpo vacío → error", "error" in v({}));

ok("agendar visita sube de nueva a VISITA", etapaResultante(null, { visitaEl: new Date() }) === "VISITA");
ok("agendar visita sube de CONTACTADO a VISITA", etapaResultante("CONTACTADO", { visitaEl: new Date() }) === "VISITA");
ok("agendar visita NO baja de NEGOCIANDO", etapaResultante("NEGOCIANDO", { visitaEl: new Date() }) === "NEGOCIANDO");
ok("una nota no cambia la etapa", etapaResultante("CONTACTADO", { nota: "x" }) === "CONTACTADO");
ok("elegir etapa a mano manda", etapaResultante("NEGOCIANDO", { etapa: "CONTACTADO" }) === "CONTACTADO");

ok("mensaje de visita", mensajeDeVisita("Juan Pérez", "Corolla", new Date("2026-10-07T20:00:00Z"), "PRUEBA", "Autos Sur", mediodiaAR)
  === "Hola Juan! Te escribo de Autos Sur para confirmar la prueba de manejo del Corolla: mañana 17:00 hs. ¿Te sigue quedando bien?");
ok("horas sin responder", horasSinResponder(new Date("2026-10-06T12:00:00Z"), mediodiaAR) === 3);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
