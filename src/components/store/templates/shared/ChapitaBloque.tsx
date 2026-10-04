"use client";
import { useEffect, useId, useRef, useState } from "react";
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
/* ── El ⓘ "¿para qué sirve?" (04/10/26) ────────────────────────────────────
   Con `ayuda`, la chapita lleva un ⓘ que abre una tarjetita con para qué sirve
   el bloque y cuándo no se ve en la tienda (los textos viven en
   `lib/ayudaBloques`). Sólo existe editando: la chapita misma sólo se dibuja
   en modo edición.

   Se abre TOCANDO, no al pasar el mouse: en el editor del celular no hay mouse,
   y un globito que aparece solo al pasar tapa lo que se está por editar. Se
   cierra tocando afuera, con Escape o con la ✕. La chapita sigue midiendo 15px
   y sin robar clics (`pointerEvents:"none"`): sólo el ⓘ y la tarjeta los
   reciben. */
export function ChapitaBloque({ nombre, ayuda, id }: { nombre: string; ayuda?: string; /** El id del bloque: la lista de textos del celular lo pasa al panel. */ id?: string }) {
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const idTarjeta = useId();

  useEffect(() => {
    if (!abierta) return;
    const afuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierta(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierta(false); };
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", afuera); document.removeEventListener("keydown", tecla); };
  }, [abierta]);

  return (
    <div ref={caja} style={{ position: "absolute", top: 0, left: 0, zIndex: abierta ? CAPAS.panel : CAPAS.nav, pointerEvents: "none", maxWidth: "60%" }}>
      {/* `data-chapita`: la lista de textos del editor de celular agrupa por bloque
          leyendo estas marcas en el orden en que aparecen (ver /preview/celular). */}
      <div data-chapita={nombre} data-chapita-id={id} style={{
        display: "flex", alignItems: "center", gap: 5,
        background: LINEA_EDITOR, color: "#fff",
        /* Chiquita a propósito: 15px de alto justos. Agrandar la letra o el padding
           le empuja el botón "Fondo" encima del título de la sección. */
        fontSize: 9, fontWeight: 800, letterSpacing: 0.6, lineHeight: 1.2,
        textTransform: "uppercase", padding: ayuda ? "0 3px 0 8px" : "2px 8px", height: 15, boxSizing: "border-box",
        // En escuadra arriba y redondeada abajo a la derecha: se lee como una
        // etiqueta que baja del filo hacia adentro.
        borderRadius: "0 0 7px 0",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.75), 0 1px 4px rgba(0,0,0,0.25)",
      }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</span>
        {ayuda && (
          <button type="button" onClick={() => setAbierta(a => !a)} aria-expanded={abierta} aria-controls={idTarjeta}
            aria-label={`¿Para qué sirve "${nombre}"?`} title="¿Para qué sirve?"
            style={{ pointerEvents: "auto", flexShrink: 0, width: 13, height: 13, borderRadius: 999, border: "1px solid rgba(255,255,255,0.85)",
              background: abierta ? "#fff" : "transparent", color: abierta ? LINEA_EDITOR : "#fff", padding: 0, cursor: "pointer",
              display: "grid", placeItems: "center", fontSize: 8.5, fontWeight: 900, lineHeight: 1, fontFamily: "system-ui, -apple-system, sans-serif" }}>
            i
          </button>
        )}
      </div>
      {ayuda && abierta && (
        <div id={idTarjeta} role="dialog" aria-label={`Para qué sirve ${nombre}`}
          style={{ pointerEvents: "auto", position: "absolute", top: 21, left: 6, width: "max-content", maxWidth: "min(300px, 80vw)",
            background: "#fff", color: "#1e1b4b", border: `1.5px solid ${LINEA_EDITOR}`, borderRadius: 12, padding: "11px 30px 12px 13px",
            boxShadow: "0 12px 32px rgba(15,23,42,0.28)", fontFamily: "system-ui, -apple-system, sans-serif", textTransform: "none", letterSpacing: 0 }}>
          <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 800, color: LINEA_EDITOR, textTransform: "uppercase", letterSpacing: 0.5 }}>{nombre}: ¿para qué sirve?</p>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, fontWeight: 400 }}>{ayuda}</p>
          <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar"
            style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 999, border: "none", background: "transparent",
              color: "#64748b", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
        </div>
      )}
    </div>
  );
}
