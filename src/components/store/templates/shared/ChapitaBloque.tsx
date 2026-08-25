"use client";
import { CAPAS } from "@/lib/capas-tienda";

/* El violeta del editor, y el pelito blanco que lo salva de cualquier fondo.
 *
 * El color no puede ser uno solo, y ese es el punto: la dueña elige el fondo de
 * cada sección, así que cualquier color se le puede pegar justo —un violeta sobre
 * un fondo violeta desaparece—. Por eso va el borde blanco: no hay ningún fondo
 * que sea a la vez igual al violeta y al blanco. */
export const LINEA_EDITOR = "rgba(99,102,241,0.95)";
export const HALO_EDITOR = "0 1px 0 rgba(255,255,255,0.9), 0 -1px 0 rgba(255,255,255,0.9)";

/**
 * La chapita con el nombre del bloque, arriba a la izquierda.
 *
 * Vive suelta porque la usan DOS cosas y una de ellas apareció después:
 *
 *   · `SectionBlock`, para los bloques de la portada que se pueden mover y
 *     ocultar.
 *   · `EditableSectionBg`, para las tres superficies que NO son bloques —el pie,
 *     la pantalla de contacto y la del catálogo—. Ésas no se mueven ni se
 *     ocultan, así que nunca tuvieron `SectionBlock`, y por eso su botón "Fondo"
 *     quedaba flotando solo, sin nada que dijera de quién era. Que es exactamente
 *     el problema que los bloques ya tenían resuelto.
 *
 * Copiarla no era opción: mide 15px de alto justos porque abajo va el botón
 * "Fondo" (que arranca a 17) y el contenido de los templates arranca a 40. Esos
 * números se tocan juntos, y con dos copias se despegan a la primera corrección.
 *
 * `pointerEvents:"none"` para que no le robe el clic a lo que haya abajo —un
 * título editable, por ejemplo—: es un cartel, no un control.
 */
export function ChapitaBloque({ nombre }: { nombre: string }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, zIndex: CAPAS.nav,
      pointerEvents: "none",
      background: LINEA_EDITOR, color: "#fff",
      /* Chiquita a propósito: 15px de alto justos. Agrandar la letra o el padding
         le empuja el botón "Fondo" encima del título de la sección. */
      fontSize: 9, fontWeight: 800, letterSpacing: 0.6, lineHeight: 1.2,
      textTransform: "uppercase", padding: "2px 8px",
      // En escuadra arriba y redondeada abajo a la derecha: se lee como una
      // etiqueta que baja del filo hacia adentro.
      borderRadius: "0 0 7px 0",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.75), 0 1px 4px rgba(0,0,0,0.25)",
      maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {nombre}
    </div>
  );
}
