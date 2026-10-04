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

/* El look de EJEMPLO de las vistas previas de los diseños (Flavio, 04/10/26:
   "¿cómo va a ver la gente que existe eso?"). Sin él, el bloque no aparecía en
   ninguna vista previa —sin foto no existe— y nadie se enteraba de que el
   template lo trae. Es una foto de Unsplash (como las de los productos de
   ejemplo) con tres prendas que tienen su producto de ejemplo: la musculosa
   (demo-1, Remera Oversize), la cartera (demo-8, Cartera Tote) y el pantalón
   (demo-4, Pantalón Cargo). Los puntos están medidos sobre la foto en 4/5,
   que es como la muestran todos los templates. */
export const LOOK_EJEMPLO = {
  foto: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&h=1000&q=75",
  puntos: [
    { id: "demo-1", x: 55, y: 44 },
    { id: "demo-8", x: 47, y: 58 },
    { id: "demo-4", x: 66, y: 79 },
  ] as PuntoLook[],
};

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
