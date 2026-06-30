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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* Flechas de orden — centradas abajo, independientes del toggle de ocultar */}
      <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", gap: 4 }}>
        <button
          onClick={() => moveSection(id, defaultOrder, "up")}
          disabled={isFirst}
          title={isFirst ? "Ya es el primer bloque" : `Subir "${label}"`}
          style={{
            background: "rgba(0,0,0,0.72)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 7,
            width: 28, height: 26, fontSize: 11, fontWeight: 700,
            cursor: isFirst ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
            opacity: isFirst ? 0.35 : 1,
          }}
        >
          ▲
        </button>
        <button
          onClick={() => moveSection(id, defaultOrder, "down")}
          disabled={isLast}
          title={isLast ? "Ya es el último bloque" : `Bajar "${label}"`}
          style={{
            background: "rgba(0,0,0,0.72)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 7,
            width: 28, height: 26, fontSize: 11, fontWeight: 700,
            cursor: isLast ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
            opacity: isLast ? 0.35 : 1,
          }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
