/**
 * AUTO RUTA — la paleta y la letra (15/10/26).
 *
 * Claro, de trabajo: papel cálido, tinta casi negra y el acento como en la
 * señalización de ruta (amarillo por defecto). Los títulos van en mayúscula y
 * angostos, como un cartel; los datos en números tabulares, como una planilla.
 * Sin íconos decorativos: la jerarquía la dan la letra, las rayas y el acento.
 */
export const FONDO = "#f3f2ee";
export const PAPEL = "#ffffff";
export const TINTA = "#16191d";
export const TENUE = "#5b6068";
export const LINEA = "#dddbd4";
export const ASFALTO = "#1c2025";
export const ACENTO_RUTA = "#f2b705";

/** Títulos de cartel. Sin fuente web (el proyecto no carga ninguna): la más angosta que tenga el sistema. */
export const TITULAR = "'Arial Narrow','Roboto Condensed','Helvetica Neue',Arial,sans-serif";
export const CUERPO = "'Inter','Segoe UI',system-ui,sans-serif";

/** Un color con transparencia. Sólo hex de 6; con otra cosa devuelve el color tal cual. */
export function alfa(hex: string, a: number): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

/** La raya cortada de la ruta, como fondo de una línea. */
export function rayaDeRuta(color: string): string {
  return `repeating-linear-gradient(90deg, ${color} 0 18px, transparent 18px 30px)`;
}
