"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

   Se abre de dos formas (Flavio, 05/10/26):
   - PASANDO EL MOUSE por el ⓘ: se abre sola y se cierra al salir (con un
     respiro, para poder llevar el mouse hasta la tarjeta sin que se cierre).
     Sólo con mouse: en el celular no hay "pasar por encima".
   - TOCANDO el ⓘ: queda fija hasta tocar afuera, Escape o la ✕. Es lo que
     funciona en el editor del celular.
   La tarjeta se dibuja AFUERA del bloque (un portal al body, en posición fija
   medida desde la chapita), en la capa de los globitos del editor. Adentro
   del bloque la tapaban dos cosas: el botón "Fondo", que va justo debajo de
   la chapita, y el bloque de abajo cuando la tarjeta es más larga que el
   suyo: las secciones con `data-reveal` quedan con un `transform` puesto, y
   eso encierra cualquier zIndex de adentro, por alto que sea. Por estar fija,
   se cierra al scrollear (si no, quedaría flotando mientras la página pasa).

   El ⓘ late (un aro que se expande) hasta que se abre por primera vez: es
   chiquito y sin eso nadie lo descubre. Con "reducir movimiento" no late.
   La chapita sigue midiendo 15px y sin robar clics (`pointerEvents:"none"`):
   sólo el ⓘ y la tarjeta los reciben. */
export function ChapitaBloque({ nombre, ayuda, id }: { nombre: string; ayuda?: string; /** El id del bloque: la lista de textos del celular lo pasa al panel. */ id?: string }) {
  /** "mouse": abierta mientras el mouse está encima. "fija": abierta por un toque. */
  const [abierta, setAbierta] = useState<false | "mouse" | "fija">(false);
  const [yaVista, setYaVista] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idTarjeta = useId();

  /* Antes de pintar: medida desde la chapita, y corrida a la izquierda si no
     entra (el ancho máximo es el mismo de la tarjeta: 300px o el 80% de la
     pantalla). */
  useLayoutEffect(() => {
    if (!abierta || !caja.current) { setPos(null); return; }
    const r = caja.current.getBoundingClientRect();
    const ancho = Math.min(300, window.innerWidth * 0.8);
    setPos({ top: r.top + 19, left: Math.max(8, Math.min(r.left + 6, window.innerWidth - ancho - 8)) });
  }, [abierta]);
  useEffect(() => () => { if (cierre.current) clearTimeout(cierre.current); }, []);

  useEffect(() => {
    if (!abierta) return;
    const afuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!caja.current?.contains(t) && !tarjeta.current?.contains(t)) setAbierta(false);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierta(false); };
    /* Al scrollear se cierra (está fija, ver arriba). En captura, porque lo que
       scrollea puede ser el marco del editor y no la ventana. */
    const scroll = () => setAbierta(false);
    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", tecla);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      window.removeEventListener("resize", scroll);
      document.removeEventListener("pointerdown", afuera);
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [abierta]);

  const entra = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setYaVista(true);
    if (cierre.current) { clearTimeout(cierre.current); cierre.current = null; }
    setAbierta(a => a || "mouse");
  };
  const sale = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    cierre.current = setTimeout(() => setAbierta(a => (a === "mouse" ? false : a)), 220);
  };

  return (
    <div ref={caja} style={{ position: "absolute", top: 0, left: 0, zIndex: CAPAS.nav, pointerEvents: "none", maxWidth: "60%" }}>
      {ayuda && !yaVista && (
        <style>{"@keyframes chapita-late { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.95) } 70% { box-shadow: 0 0 0 7px rgba(255,255,255,0) } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0) } } @media (prefers-reduced-motion: reduce) { .chapita-ayuda { animation: none !important } }"}</style>
      )}
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
          /* Un toque con la tarjeta abierta por el mouse la deja fija, no la cierra:
             quien hace clic quiere leerla tranquilo. */
          <button type="button" className="chapita-ayuda" onClick={() => { setYaVista(true); setAbierta(a => (a === "fija" ? false : "fija")); }}
            onPointerEnter={entra} onPointerLeave={sale}
            aria-expanded={!!abierta} aria-controls={idTarjeta}
            aria-label={`¿Para qué sirve "${nombre}"?`}
            /* Relleno blanco con la "i" violeta: sobre la chapita violeta se ve de
               lejos. Abierta se invierte, para que se note que es ésa. */
            style={{ pointerEvents: "auto", flexShrink: 0, width: 13, height: 13, borderRadius: 999, border: "1px solid #fff",
              background: abierta ? LINEA_EDITOR : "#fff", color: abierta ? "#fff" : LINEA_EDITOR, padding: 0, cursor: "pointer",
              animation: yaVista ? undefined : "chapita-late 1.8s ease-out infinite",
              display: "grid", placeItems: "center", fontSize: 9, fontWeight: 900, lineHeight: 1, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
            i
          </button>
        )}
      </div>
      {ayuda && abierta && pos && createPortal(
        <div ref={tarjeta} id={idTarjeta} role="dialog" aria-label={`Para qué sirve ${nombre}`} onPointerEnter={entra} onPointerLeave={sale}
          /* 19px abajo de la chapita: pegada (15px + el aro). Con más hueco, el
             mouse que baja del ⓘ a la tarjeta la cerraba en el camino. */
          style={{ pointerEvents: "auto", position: "fixed", top: pos.top, left: pos.left, zIndex: CAPAS.edicionGlobito, width: "max-content", maxWidth: "min(300px, 80vw)",
            background: "#fff", color: "#1e1b4b", border: `1.5px solid ${LINEA_EDITOR}`, borderRadius: 12, padding: "11px 30px 12px 13px",
            boxShadow: "0 12px 32px rgba(15,23,42,0.28)", fontFamily: "system-ui, -apple-system, sans-serif", textTransform: "none", letterSpacing: 0 }}>
          <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 800, color: LINEA_EDITOR, textTransform: "uppercase", letterSpacing: 0.5 }}>{nombre}: ¿para qué sirve?</p>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, fontWeight: 400 }}>{ayuda}</p>
          <p style={{ margin: "8px 0 0", paddingTop: 7, borderTop: "1px solid #e2e8f0", fontSize: 11, lineHeight: 1.45, color: "#64748b", fontWeight: 400 }}>
            En modo edición pueden aparecer productos de muestra: sirven para ver el diseño, no son parte de tu stock y no se publican. Revisá los textos editables antes de publicar.
          </p>
          <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar"
            style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 999, border: "none", background: "transparent",
              color: "#64748b", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
        </div>,
        document.body,
      )}
    </div>
  );
}
