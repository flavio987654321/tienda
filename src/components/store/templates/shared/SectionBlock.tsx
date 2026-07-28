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

      {/* ── Los controles van PEGADOS al filo de abajo ────────────────────────
          Estaban flotando adentro de la sección: las flechas centradas y a 10px
          del borde, y el ojo abajo a la derecha. En una sección alta no molesta,
          pero en una franja de garantías —80px de alto y el contenido repartido a
          lo ancho— caían justo encima del texto y del botón de cambiar ícono. No
          es un problema de un template: le pasa a cualquier sección baja de los
          diez.
          El filo entre dos secciones es la única línea que nunca tiene contenido,
          y encima es donde estos botones significan algo: mueven el bloque
          respecto del de al lado. Van ahí, aplanados —20px de alto contra los 26
          de antes—, uno en cada esquina y sin separación del borde, así el ancho
          útil de la sección queda libre.
          Arriba a la izquierda no se puede: esa esquina se la queda el chip de
          "Fondo" (`EditableSectionBg`, en `top:16 left:16`). */}
      {(() => {
        const filo: React.CSSProperties = {
          color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderBottom: "none",
          height: 20, fontSize: 10, fontWeight: 700, padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(8px)", letterSpacing: 0.3,
        };
        return (
          <>
            {/* Flechas de orden — esquina de abajo a la izquierda, pegadas. */}
            <div style={{ position: "absolute", bottom: 0, left: 0, zIndex: 200, display: "flex", borderTopRightRadius: 6, overflow: "hidden" }}>
              <button
                onClick={() => moveSection(id, defaultOrder, "up")}
                disabled={isFirst}
                title={isFirst ? "Ya es el primer bloque" : `Subir "${label}"`}
                style={{ ...filo, background: "rgba(0,0,0,0.78)", borderLeft: "none", width: 26,
                         cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.35 : 1 }}
              >
                ▲
              </button>
              <button
                onClick={() => moveSection(id, defaultOrder, "down")}
                disabled={isLast}
                title={isLast ? "Ya es el último bloque" : `Bajar "${label}"`}
                style={{ ...filo, background: "rgba(0,0,0,0.78)", borderLeft: "none", width: 26,
                         cursor: isLast ? "default" : "pointer", opacity: isLast ? 0.35 : 1 }}
              >
                ▼
              </button>
            </div>

            {/* Ocultar / mostrar — esquina de abajo a la derecha, pegada. */}
            <button
              onClick={() => toggleHiddenSection(id)}
              title={isHidden ? `Mostrar "${label}"` : `Ocultar "${label}"`}
              style={{ ...filo, position: "absolute", bottom: 0, right: 0, zIndex: 200,
                       background: isHidden ? "rgba(239,68,68,0.92)" : "rgba(0,0,0,0.78)",
                       borderRight: "none", borderTopLeftRadius: 6, padding: "0 10px", gap: 5, cursor: "pointer" }}
            >
              {isHidden ? "👁 Mostrar bloque" : "👁 Ocultar bloque"}
            </button>
          </>
        );
      })()}
    </div>
  );
}
