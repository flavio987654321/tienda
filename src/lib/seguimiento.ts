/**
 * El seguimiento de una consulta de autos (06/10/26).
 *
 * Una consulta pasaba de "Nueva" a "Vendida" o "Descartada" sin nada en el
 * medio, y en una concesionaria lo que pasa en el medio es casi todo: se lo
 * contactó, vino a ver el auto, está negociando la permuta. Acá viven las
 * etapas intermedias, la nota, el "volver a llamar el jueves" y la visita o
 * prueba de manejo.
 *
 * El resultado final sigue en `Lead.status` (PENDING / CONFIRMED / REJECTED),
 * que es lo que usan la comisión y los totales: esto lo complementa, no lo
 * reemplaza. Se guarda en `SeguimientoConsulta` (ver el porqué en el esquema).
 *
 * ── La hora ────────────────────────────────────────────────────────────────
 * Todo se piensa en hora de Argentina (UTC−3, sin horario de verano desde
 * 2009), sea cual sea la zona del servidor o del navegador: "mañana a las 10"
 * es mañana a las 10 en Buenos Aires.
 *
 * Este archivo no importa nada de servidor.
 */

export type Etapa = "CONTACTADO" | "VISITA" | "NEGOCIANDO";
export const ETAPAS: { id: Etapa; label: string }[] = [
  { id: "CONTACTADO", label: "Contactado" },
  { id: "VISITA", label: "Visita agendada" },
  { id: "NEGOCIANDO", label: "Negociando" },
];
export const esEtapa = (e: unknown): e is Etapa => typeof e === "string" && ETAPAS.some((x) => x.id === e);
export const etiquetaEtapa = (e: string | null | undefined) => ETAPAS.find((x) => x.id === e)?.label ?? "Nueva";
const ordenEtapa = (e: string | null | undefined) => (e ? ETAPAS.findIndex((x) => x.id === e) + 1 : 0);

export type TipoVisita = "VISITA" | "PRUEBA";
export const TIPOS_VISITA: { id: TipoVisita; label: string }[] = [
  { id: "VISITA", label: "Visita" },
  { id: "PRUEBA", label: "Prueba de manejo" },
];

/* ── Hora argentina ─────────────────────────────────────────────────────── */

const OFFSET_AR_MS = -3 * 3600_000;

/** Las partes de una fecha vista en Argentina. */
function partesAR(d: Date) {
  const x = new Date(d.getTime() + OFFSET_AR_MS);
  return { anio: x.getUTCFullYear(), mes: x.getUTCMonth(), dia: x.getUTCDate(), hora: x.getUTCHours(), min: x.getUTCMinutes(), semana: x.getUTCDay() };
}

/** Un día y hora de Argentina, como instante. `mes` empieza en 0. */
export function fechaAR(anio: number, mes: number, dia: number, hora = 0, min = 0): Date {
  return new Date(Date.UTC(anio, mes, dia, hora, min) - OFFSET_AR_MS);
}

/** "2026-10-09" + "17:30" (lo que dan los campos de fecha y hora) → instante. `null` si no es válido. */
export function desdeCamposAR(fecha: string, hora: string): Date | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!f || !h) return null;
  const d = fechaAR(+f[1], +f[2] - 1, +f[3], +h[1], +h[2]);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Al revés: el instante como lo piden los campos de fecha y hora. */
export function aCamposAR(d: Date): { fecha: string; hora: string } {
  const p = partesAR(d);
  const dos = (n: number) => String(n).padStart(2, "0");
  return { fecha: `${p.anio}-${dos(p.mes + 1)}-${dos(p.dia)}`, hora: `${dos(p.hora)}:${dos(p.min)}` };
}

/** Desde las 0:00 hasta las 23:59:59 de HOY en Argentina (o del día `+n`). */
export function diaAR(ahora: Date, n = 0): { desde: Date; hasta: Date } {
  const p = partesAR(ahora);
  const desde = fechaAR(p.anio, p.mes, p.dia + n);
  return { desde, hasta: new Date(desde.getTime() + 86_400_000 - 1) };
}

/** Los atajos de "Recordarme": siempre a las 10 de la mañana. */
export type Atajo = "manana" | "tresDias" | "semana";
export const ATAJOS: { id: Atajo; label: string; dias: number }[] = [
  { id: "manana", label: "Mañana", dias: 1 },
  { id: "tresDias", label: "En 3 días", dias: 3 },
  { id: "semana", label: "En una semana", dias: 7 },
];
export function fechaDeAtajo(atajo: Atajo, ahora: Date): Date {
  const p = partesAR(ahora);
  const dias = ATAJOS.find((a) => a.id === atajo)?.dias ?? 1;
  return fechaAR(p.anio, p.mes, p.dia + dias, 10, 0);
}

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** "hoy 17:30", "mañana 10:00", "jue 9/10 17:30" — siempre en hora argentina. */
export function cuandoAR(d: Date, ahora: Date): string {
  const p = partesAR(d);
  const hora = `${p.hora}:${String(p.min).padStart(2, "0")}`;
  const hoy = diaAR(ahora);
  if (d >= hoy.desde && d <= hoy.hasta) return `hoy ${hora}`;
  const manana = diaAR(ahora, 1);
  if (d >= manana.desde && d <= manana.hasta) return `mañana ${hora}`;
  const ayer = diaAR(ahora, -1);
  if (d >= ayer.desde && d <= ayer.hasta) return `ayer ${hora}`;
  return `${DIAS[p.semana]} ${p.dia}/${p.mes + 1} ${hora}`;
}

/* ── Lo que manda el panel ──────────────────────────────────────────────── */

export type CambiosSeguimiento = {
  etapa?: Etapa | null;
  nota?: string | null;
  recordarEl?: Date | null;
  visitaEl?: Date | null;
  visitaTipo?: TipoVisita | null;
};

/**
 * Valida el cuerpo del PATCH. Sólo lo que vino se toca (un campo ausente no
 * se borra; `null` sí). Las fechas: ni más de un día para atrás —un
 * recordatorio en el pasado es un error de tipeo— ni más de un año adelante.
 */
export function validarSeguimiento(b: Record<string, unknown> | null | undefined, ahora: Date): { cambios: CambiosSeguimiento } | { error: string } {
  if (!b || typeof b !== "object") return { error: "Faltan datos." };
  const c: CambiosSeguimiento = {};

  if ("etapa" in b) {
    if (b.etapa === null) c.etapa = null;
    else if (esEtapa(b.etapa)) c.etapa = b.etapa;
    else return { error: "Etapa inválida." };
  }
  if ("nota" in b) {
    if (b.nota === null) c.nota = null;
    else if (typeof b.nota === "string") c.nota = b.nota.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 1000) || null;
    else return { error: "Nota inválida." };
  }
  const fecha = (v: unknown): Date | null | "mal" => {
    if (v === null) return null;
    if (typeof v !== "string") return "mal";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "mal";
    if (d.getTime() < ahora.getTime() - 86_400_000 || d.getTime() > ahora.getTime() + 366 * 86_400_000) return "mal";
    return d;
  };
  if ("recordarEl" in b) {
    const d = fecha(b.recordarEl);
    if (d === "mal") return { error: "Revisá la fecha del recordatorio: tiene que ser de hoy en adelante." };
    c.recordarEl = d;
  }
  if ("visitaEl" in b) {
    const d = fecha(b.visitaEl);
    if (d === "mal") return { error: "Revisá la fecha de la visita: tiene que ser de hoy en adelante." };
    c.visitaEl = d;
    if (d) c.visitaTipo = b.visitaTipo === "PRUEBA" ? "PRUEBA" : "VISITA";
    else c.visitaTipo = null;
  }
  if (Object.keys(c).length === 0) return { error: "No hay nada para guardar." };
  return { cambios: c };
}

/**
 * La etapa que queda después de un cambio. Agendar una visita la sube a
 * "Visita agendada" si estaba antes; nunca la baja sola (si ya estaba
 * negociando y agenda otra prueba, sigue negociando).
 */
export function etapaResultante(actual: string | null | undefined, c: CambiosSeguimiento): string | null {
  if (c.etapa !== undefined) return c.etapa;
  if (c.visitaEl && ordenEtapa(actual) < ordenEtapa("VISITA")) return "VISITA";
  return actual ?? null;
}

/** El mensaje para confirmar la visita por WhatsApp. */
export function mensajeDeVisita(nombre: string, vehiculo: string, cuando: Date, tipo: string | null, tienda: string, ahora: Date): string {
  const que = tipo === "PRUEBA" ? "la prueba de manejo" : "la visita";
  return `Hola ${nombre.trim().split(/\s+/)[0]}! Te escribo de ${tienda} para confirmar ${que} del ${vehiculo}: ${cuandoAR(cuando, ahora)} hs. ¿Te sigue quedando bien?`;
}

/** Horas que lleva una consulta con datos sin que nadie la haya tocado. */
export function horasSinResponder(createdAt: Date, ahora: Date): number {
  return Math.floor((ahora.getTime() - createdAt.getTime()) / 3600_000);
}

/** A partir de cuántas horas una consulta sin tocar se marca en rojo. */
export const HORAS_DEMORA = 2;
