/* ══════════════════════════════════════════════════════════════════════════
   LOOKBOOK: los puntos sobre la foto
   ══════════════════════════════════════════════════════════════════════════

   Los puntos de cada look se guardan en el override `lookbookPuntos<n>` como
   JSON [{ id, x, y }], con x/y en % de la foto: así valen en cualquier ancho.
   Lo usan todos los templates que tienen lookbook (ver
   `shared/useLookbook`), así que leerlo vive en un solo lugar.

   El texto viene de la base y lo pudo haber escrito cualquier versión vieja
   del editor: se lee sin confiar en nada. */

export const MAX_LOOKS = 3;
export const MAX_PUNTOS = 6;

export type PuntoLook = { id: string; x: number; y: number };

export function leerPuntos(texto: string | undefined): PuntoLook[] {
  try {
    const crudo = JSON.parse(texto ?? "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo
      .filter(p => p && typeof p.id === "string" && Number.isFinite(p.x) && Number.isFinite(p.y))
      .map(p => ({ id: p.id, x: Math.max(0, Math.min(100, p.x)), y: Math.max(0, Math.min(100, p.y)) }))
      .slice(0, MAX_PUNTOS);
  } catch { return []; }
}

/** Lo que se guarda: con un decimal alcanza, y el JSON queda corto. */
export const escribirPuntos = (lista: PuntoLook[]) =>
  JSON.stringify(lista.map(p => ({ id: p.id, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })));
