// Secciones del panel admin que reciben cosas y muestran el badge de "algo nuevo"
// en el sidebar. Fuente única para el endpoint de counts, el de marcar-visto y el
// sidebar. El count de cada una es cuántos registros entraron después del seenAt
// del admin (ver modelo AdminSectionView).

export type AdminSection = "disenos" | "leads" | "testimonios" | "donaciones";

export const ADMIN_SECTIONS: AdminSection[] = ["disenos", "leads", "testimonios", "donaciones"];

export function isAdminSection(v: unknown): v is AdminSection {
  return typeof v === "string" && (ADMIN_SECTIONS as string[]).includes(v);
}
