"use client";
import { useMemo } from "react";
import { useEditContext } from "@/contexts/EditContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";

export function SectionBlock({
  id,
  label,
  isPreview = false,
  defaultOrder,
  children,
}: {
  id: string;
  label: string;
  isPreview?: boolean;
  /** Lista fija de ids del template, en su orden original de JSX. Misma
   *  referencia para todos los SectionBlock de un mismo template — se usa
   *  para calcular la posición CSS `order` de este bloque y la de sus
   *  hermanos, sin tener que mover el JSX de lugar en el archivo fuente. */
  defaultOrder: string[];
  children: React.ReactNode;
}) {
  const { editMode, hiddenSections, toggleHiddenSection, sectionOrder, moveSection } = useEditContext();
  const config = useStoreConfig();
  const isHidden = (config?.hiddenSections ?? hiddenSections).includes(id);

  const effectiveOrder = useMemo(() => {
    const persisted = config?.sectionOrder ?? sectionOrder;
    return [...persisted.filter(i => defaultOrder.includes(i)), ...defaultOrder.filter(i => !persisted.includes(i))];
  }, [config?.sectionOrder, sectionOrder, defaultOrder]);
  const myIndex = effectiveOrder.indexOf(id);
  const cssOrder = myIndex === -1 ? defaultOrder.indexOf(id) : myIndex;
  const isFirst = myIndex <= 0;
  const isLast = myIndex === -1 || myIndex === effectiveOrder.length - 1;

  // Real store (not preview, not editor): ocultar completamente
  if (!editMode && !isPreview && isHidden) return null;

  // Sin modo edición: renderizar normal, pero respetando el orden guardado
  if (!editMode) return <div style={{ order: cssOrder }}>{children}</div>;

  // Modo edición: mostrar siempre pero con overlay "apagado" si está oculto
  return (
    <div style={{ position: "relative", order: cssOrder }}>
      {/* Contenido, dimmeado si oculto */}
      <div style={isHidden ? { opacity: 0.25, filter: "grayscale(1) brightness(0.5)", pointerEvents: "none", userSelect: "none" } : undefined}>
        {children}
      </div>

      {/* Overlay "TV apagada" cuando está oculto */}
      {isHidden && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 90,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 8, pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)",
            borderRadius: 12, padding: "14px 24px", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>⊘</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Bloque oculto</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>No aparece en la tienda</span>
          </div>
        </div>
      )}

      {/* Toggle en esquina inferior derecha — la superior ya la usan los controles
          propios del editor (cambiar imagen, fondo de sección, etc.) */}
      <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: 200 }}>
        <button
          onClick={() => toggleHiddenSection(id)}
          title={isHidden ? `Mostrar "${label}"` : `Ocultar "${label}"`}
          style={{
            background: isHidden ? "rgba(239,68,68,0.92)" : "rgba(0,0,0,0.72)",
            color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 7,
            padding: "5px 12px", fontSize: 11, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            backdropFilter: "blur(8px)", letterSpacing: 0.3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
          }}
        >
          {isHidden ? "👁 Mostrar bloque" : "👁 Ocultar bloque"}
        </button>
      </div>

      {/* ── Flechas de orden ──────────────────────────────────────────────────
          Una sola pastilla con las dos flechas adentro, centrada abajo y pegada
          al filo del bloque.
          Eran dos botones cuadrados de 26×26 separados, flotando a 10px del
          borde. En una sección alta no molestaban, pero en una franja de
          garantías —80px de alto y el contenido repartido a lo ancho— caían justo
          encima del texto. No es un problema de un template: le pasa a cualquier
          sección baja de los diez.
          Juntas en una pastilla ocupan casi la mitad de alto (20 contra 26) y
          apoyadas en el filo se corren del medio de la franja, que es donde vive
          el contenido. El filo entre dos secciones es además donde estos botones
          significan algo: mueven el bloque respecto del de al lado.
          Las dos van siempre, aunque una esté deshabilitada: si desapareciera la
          que no se puede usar, la pastilla cambiaría de ancho al mover un bloque y
          la otra flecha se correría de abajo del mouse. */}
      <div style={{
        position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", zIndex: 200,
        display: "flex", alignItems: "stretch", overflow: "hidden",
        background: "rgba(0,0,0,0.78)", border: "1px solid rgba(255,255,255,0.32)", borderRadius: 999,
        backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
      }}>
        <button
          onClick={() => moveSection(id, defaultOrder, "up")}
          disabled={isFirst}
          title={isFirst ? "Ya es el primer bloque" : `Subir "${label}"`}
          style={{
            background: "none", color: "#fff", border: "none", padding: 0,
            width: 30, height: 20, fontSize: 10, fontWeight: 700, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.3 : 1,
          }}
        >
          ▲
        </button>
        {/* El separador va acá y no como borde de los botones: así no se ve en las
            puntas de la pastilla, solo entre las dos flechas. */}
        <span style={{ width: 1, background: "rgba(255,255,255,0.28)" }} />
        <button
          onClick={() => moveSection(id, defaultOrder, "down")}
          disabled={isLast}
          title={isLast ? "Ya es el último bloque" : `Bajar "${label}"`}
          style={{
            background: "none", color: "#fff", border: "none", padding: 0,
            width: 30, height: 20, fontSize: 10, fontWeight: 700, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: isLast ? "default" : "pointer", opacity: isLast ? 0.3 : 1,
          }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
