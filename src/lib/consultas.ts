/* ══════════════════════════════════════════════════════════════════════════
   CÓMO SE NOMBRA UNA CONSULTA EN EL PANEL (06/10/26)
   ══════════════════════════════════════════════════════════════════════════

   Una sola fuente para la pantalla de Consultas y el inicio del panel. Antes
   cada una tenía su texto: "Pendiente/Confirmada/Rechazada" en una,
   "Pendiente/Confirmado/REJECTED" (en inglés, crudo) en la otra, y
   "Confirmar" no decía QUÉ se confirmaba.

   Para una concesionaria la consulta es un interesado: está Nueva, se Vendió o
   se Descartó. En la base los estados siguen siendo PENDING / CONFIRMED /
   REJECTED (los usa la comisión de afiliados). */

export type EstadoConsulta = "PENDING" | "CONFIRMED" | "REJECTED";

export const ESTADO_CONSULTA: Record<EstadoConsulta, { label: string; cls: string }> = {
  PENDING:   { label: "Nueva",      cls: "bg-amber-100 panel-oscuro:bg-amber-500/15 text-amber-800 panel-oscuro:text-amber-300" },
  CONFIRMED: { label: "Vendida",    cls: "bg-green-100 panel-oscuro:bg-green-500/15 text-green-700 panel-oscuro:text-green-300" },
  REJECTED:  { label: "Descartada", cls: "bg-gray-100 panel-oscuro:bg-gray-800 text-gray-500 panel-oscuro:text-gray-400" },
};

export function estadoConsulta(s: string) {
  return ESTADO_CONSULTA[s as EstadoConsulta] ?? ESTADO_CONSULTA.PENDING;
}

/** Quién consultó. Sin nombre es que tocó WhatsApp y la charla sigue allá. */
export function quienConsulto(nombre: string | null | undefined): string {
  return nombre?.trim() || "Consultó por WhatsApp";
}
