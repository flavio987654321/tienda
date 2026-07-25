"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { TextOverride, ImageOverride } from "@/types/store-config";
import { colorRepresentativo } from "@/lib/section-bg";

type EditContextType = {
  editMode: boolean;
  activeField: string | null;
  setActiveField: (field: string | null) => void;
  overrides: Record<string, TextOverride>;
  setOverride: (field: string, partial: Partial<TextOverride>) => void;
  resetOverride: (field: string) => void;
  imageOverrides: Record<string, ImageOverride>;
  setImageOverride: (field: string, partial: Partial<ImageOverride>) => void;
  sectionColors: Record<string, string>;
  setSectionColor: (field: string, color: string) => void;
  imageLoading: Record<string, boolean>;
  hiddenSections: string[];
  toggleHiddenSection: (id: string) => void;
  sectionOrder: string[];
  moveSection: (id: string, defaultOrder: string[], direction: "up" | "down") => void;
};

export const EditContext = createContext<EditContextType>({
  editMode: false,
  activeField: null,
  setActiveField: () => {},
  overrides: {},
  setOverride: () => {},
  resetOverride: () => {},
  imageOverrides: {},
  setImageOverride: () => {},
  sectionColors: {},
  setSectionColor: () => {},
  imageLoading: {},
  hiddenSections: [],
  toggleHiddenSection: () => {},
  sectionOrder: [],
  moveSection: () => {},
});

// Luminancia relativa del color (0 = negro, 1 = blanco), o `null` si no se pudo
// leer. El fondo de una sección puede ser un degradado, no solo un color: cuando
// lo es, se decide con el punto medio. Los diez templates pasan por acá para
// saber si el texto va claro u oscuro, así que resolverlo en este único lugar
// alcanza para todos —y para los que vengan— en vez de enseñarle a cada uno a
// leer degradados.
function luminancia(color: string): number | null {
  if (!color) return null;
  const hex = colorRepresentativo(color);
  if (!hex) return null;
  let full = hex.startsWith("#") ? hex : "#" + hex;
  // Expand shorthand #RGB → #RRGGBB
  if (full.length === 4) {
    full = "#" + full[1] + full[1] + full[2] + full[2] + full[3] + full[3];
  }
  if (full.length < 7) return null;
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastColor(color: string): "light" | "dark" {
  const lum = luminancia(color);
  if (lum == null) return "dark";
  return lum > 0.5 ? "dark" : "light";
}

// Para usar el acento como color de TEXTO sobre un fondo (precio, nombre de
// marca, etc.) — no como fondo de botón, eso ya lo resuelve getContrastColor
// del otro lado. Si el acento elegido casi no se distingue de ese fondo (ej.
// blanco sobre una página clara, o negro sobre un footer oscuro), usarlo tal
// cual como texto lo volvería casi invisible, así que caemos al color de
// texto "seguro" del propio tema en vez del acento.
export function getReadableAccentText(accent: string, bg: string, fallback: string): string {
  return getContrastColor(accent) !== getContrastColor(bg) ? accent : fallback;
}

// Para usar el acento como RELLENO (el chip del talle elegido, un badge), no como
// texto. Es una pregunta distinta de la de arriba: ahí importa si el color se LEE
// sobre el fondo; acá, si se DISTINGUE del fondo como superficie.
//
// Con la regla de texto alcanzaba para el precio pero descartaba acentos que como
// relleno andan perfecto: un naranja sobre blanco se lee mal escrito, pero pintado
// de fondo se ve clarísimo —y el texto de adentro se resuelve aparte con
// getContrastColor, así que nunca queda ilegible—. Usar una sola regla para las
// dos cosas mandaba a negro naranjas, dorados y amarillos sin motivo.
//
// Se mide con el ratio de contraste de WCAG ((L1+0.05)/(L2+0.05)): 1.0 es el mismo
// color y 21 es blanco contra negro. Debajo de 1.25 el relleno se confunde con el
// fondo (beige, crema, marfil, blanco); de ahí para arriba se recorta solo.
const RATIO_MINIMO_RELLENO = 1.25;

export function getReadableAccentFill(accent: string, bg: string, fallback: string): string {
  const a = luminancia(accent);
  const b = luminancia(bg);
  if (a == null || b == null) return fallback;
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return ratio >= RATIO_MINIMO_RELLENO ? accent : fallback;
}

export function useEditContext() { return useContext(EditContext); }

/* ── EditableZone ─────────────────────────────────────────────
   Wrap any text element. In edit mode shows hover outline +
   pencil badge. Applies textOverrides (color, font, size, B/I/U)
   both in edit mode and in live preview.
──────────────────────────────────────────────────────────────── */
export function EditableZone({
  field, label, children, block = false, noBadge = false,
}: {
  field: string;
  label: string;
  children: React.ReactNode;
  block?: boolean;
  noBadge?: boolean;
}) {
  const { editMode, activeField, setActiveField, overrides } = useEditContext();
  const [hovered, setHovered] = useState(false);

  const isActive = activeField === field;
  const ov = overrides[field] ?? {};

  // ── El ÚNICO lugar donde los ajustes se vuelven CSS ────────────────────────
  // Todos los templates envuelven sus textos en <EditableZone>, así que lo que se
  // agregue acá lo heredan los diez de una vez — y también cualquier template
  // futuro, sin tocarle nada. Por eso no se aplican estilos dentro de cada
  // template: sería la misma lógica repetida diez veces, desincronizándose.
  //
  // Cada línea es condicional a propósito: si el ajuste no está definido, la
  // propiedad ni se escribe y manda el estilo original del diseño. Poner un valor
  // por defecto acá pisaría el diseño de todos los templates.
  const overrideStyle: React.CSSProperties = {
    ...(ov.color      && { color: ov.color }),
    ...(ov.fontFamily && { fontFamily: ov.fontFamily }),
    ...(ov.fontSize   && { fontSize: ov.fontSize }),
    ...(ov.bold       !== undefined && { fontWeight: ov.bold ? 700 : "normal" }),
    ...(ov.italic     !== undefined && { fontStyle: ov.italic ? "italic" : "normal" }),
    ...(ov.underline  !== undefined && { textDecoration: ov.underline ? "underline" : "none" }),
    // `textAlign` no tiene ningún efecto sobre un elemento en línea, y esta zona
    // se dibuja como <span> salvo que se le pase `block`. Sin el display forzado,
    // el control se vería andar en el panel y el texto no se movería nunca.
    // Con `block` la zona pasa a ocupar el ancho de su contenedor —el <h1> o el
    // <p> que la envuelve— que es contra el que uno espera alinear.
    ...(ov.align      && { textAlign: ov.align, display: "block", width: "100%" }),
    ...(ov.uppercase  !== undefined && { textTransform: ov.uppercase ? "uppercase" : "none" }),
    ...(ov.lineHeight && { lineHeight: ov.lineHeight }),
    // 0 es un espaciado válido (junta las letras al máximo normal), así que se
    // pregunta por `undefined` y no por si el número es "verdadero".
    ...(ov.letterSpacing !== undefined && { letterSpacing: `${ov.letterSpacing}px` }),
  };

  const displayContent = ov.text !== undefined ? ov.text : children;
  const hasStyle = Object.keys(overrideStyle).length > 0;
  const isHidden = !!ov.hidden;

  if (!editMode) {
    if (isHidden) return null;
    if (!hasStyle && ov.text === undefined) return <>{children}</>;
    const Tag = block ? "div" : ("span" as React.ElementType);
    return <Tag style={overrideStyle}>{displayContent}</Tag>;
  }

  const Tag = block ? "div" : ("span" as React.ElementType);

  if (isHidden) {
    return (
      <Tag
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveField(field); }}
        style={{
          position: "relative",
          display: block ? "block" : "inline",
          cursor: "pointer",
          opacity: 0.35,
          outline: isActive
            ? "2px solid #ef4444"
            : hovered ? "2px dashed rgba(239,68,68,0.6)"
            : "2px dashed rgba(239,68,68,0.35)",
          outlineOffset: 4,
          boxShadow: isActive
            ? "0 0 0 7px rgba(255,255,255,0.9)"
            : hovered ? "0 0 0 7px rgba(255,255,255,0.6)"
            : "0 0 0 7px rgba(255,255,255,0.25)",
          borderRadius: 3,
          transition: "outline-color 0.15s, box-shadow 0.15s",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          maxWidth: "100%",
        } as React.CSSProperties}
      >
        {displayContent}
        {(hovered || isActive) && (
          <span style={{
            position: "absolute", top: 0, left: 0,
            transform: "translateY(-100%)",
            background: "#ef4444", color: "white",
            fontSize: 10, fontWeight: 700, lineHeight: 1.5,
            padding: "3px 8px", borderRadius: "4px 4px 4px 0",
            display: "inline-flex", alignItems: "center", gap: 4,
            zIndex: 99999, whiteSpace: "nowrap", pointerEvents: "none",
            boxShadow: "0 2px 10px rgba(239,68,68,0.35)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: 0,
          }}>
            👁 OCULTO · clic para editar
          </span>
        )}
      </Tag>
    );
  }

  return (
    <Tag
      // Marca para poder encontrar este texto en la pantalla desde el panel de
      // edición. Se usa para leer el fondo REAL que tiene detrás —subiendo por sus
      // contenedores hasta dar con uno que tenga color— y avisar si el color
      // elegido no se lee. Adivinar el fondo desde la configuración no serviría:
      // cada template pinta sus secciones a su manera.
      data-edit-field={field}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveField(field); }}
      style={{
        position: "relative",
        display: block ? "block" : "inline",
        cursor: "pointer",
        outline: isActive
          ? "2px solid #6366f1"
          : hovered ? "1.5px dashed rgba(99,102,241,0.7)"
          : "1.5px dashed transparent",
        outlineOffset: 3,
        boxShadow: isActive
          ? "0 0 0 4px rgba(99,102,241,0.35)"
          : hovered ? "0 0 0 3px rgba(99,102,241,0.18)"
          : "none",
        borderRadius: 3,
        transition: "outline-color 0.15s, box-shadow 0.15s",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        maxWidth: "100%",
        ...overrideStyle,
      } as React.CSSProperties}
    >
      {displayContent}
      {hovered && !isActive && !noBadge && (
        <span style={{
          position: "absolute", top: 0, left: 0,
          transform: "translateY(-100%)",
          background: "#6366f1", color: "white",
          fontSize: 10, fontWeight: 700, lineHeight: 1.5,
          padding: "3px 8px", borderRadius: "4px 4px 4px 0",
          display: "inline-flex", alignItems: "center", gap: 4,
          zIndex: 99999, whiteSpace: "nowrap", pointerEvents: "none",
          boxShadow: "0 2px 10px rgba(99,102,241,0.45)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: 0,
        }}>
          ✏ {label}
        </span>
      )}
    </Tag>
  );
}

/* ── EditableImageButton ──────────────────────────────────────
   Drop this inside any section that has position:relative.
   Shows a floating camera button in edit mode to change the
   background image of that section.
──────────────────────────────────────────────────────────────── */
export function EditableImageButton({
  field,
  label,
  compact = false,
}: {
  field: string;
  label: string;
  /** Solo el ícono de cámara, sin el texto — para tarjetas chicas donde el
   *  botón completo choca con otros controles (ej: el selector de categoría). */
  compact?: boolean;
}) {
  const { editMode, activeField, setActiveField, imageLoading } = useEditContext();
  const [hovered, setHovered] = useState(false);
  const imageKey = `img:${field}`;
  const isActive = activeField === imageKey;
  const isLoading = !!imageLoading[field];

  if (!editMode) return null;

  return (
    <>
      {isLoading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 9997,
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "rgba(30,41,59,0.95)", color: "#e2e8f0",
            fontSize: 12, fontWeight: 700, padding: "10px 18px", borderRadius: 10,
            border: "1px solid rgba(99,102,241,0.5)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: "50%",
              border: "2.5px solid rgba(129,140,248,0.3)", borderTopColor: "#818cf8",
              animation: "imgSpin 0.75s linear infinite", flexShrink: 0,
            }} />
            Cargando imagen...
          </div>
          <style>{`@keyframes imgSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); setActiveField(isActive ? null : imageKey); }}
        title={compact ? label : undefined}
        // Le deja al panel una forma de encontrar el hueco real donde va la foto y
        // medirlo. Sin esto, el panel dibujaba la muestra apaisada siempre y
        // recomendaba medidas fijas — y en las secciones verticales le estaba
        // diciendo al dueño justo lo contrario de lo que le convenía.
        data-edit-image={field}
        style={compact ? {
          position: "absolute", top: 8, right: 8, zIndex: 9998,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
          background: isActive ? "#6366f1" : hovered ? "rgba(20,20,20,0.9)" : "rgba(20,20,20,0.65)",
          color: "white",
          border: isActive ? "2px solid #6366f1" : "1.5px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(6px)",
          transition: "all 0.15s",
        } : {
          position: "absolute", top: 16, right: 16, zIndex: 9998,
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 9, cursor: "pointer",
          fontSize: 12, fontWeight: 700,
          background: isActive ? "#6366f1" : hovered ? "rgba(20,20,20,0.9)" : "rgba(20,20,20,0.65)",
          color: "white",
          border: isActive ? "2px solid #6366f1" : "1.5px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(6px)",
          transition: "all 0.15s",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <svg width={compact ? 13 : 14} height={compact ? 13 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
        </svg>
        {!compact && label}
      </button>
    </>
  );
}

/* ── EditableSectionBg ────────────────────────────────────────
   Drop inside any section with position:relative to allow the
   owner to change the section background color. Smart contrast
   is computed automatically when bg changes.
──────────────────────────────────────────────────────────────── */
export function EditableSectionBg({ field, label }: { field: string; label: string }) {
  const { editMode, activeField, setActiveField, sectionColors } = useEditContext();
  const [hovered, setHovered] = useState(false);
  const bgKey = `bg:${field}`;
  const isActive = activeField === bgKey;
  const currentColor = sectionColors[field];

  if (!editMode) return null;

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setActiveField(isActive ? null : bgKey); }}
      title={`Editar fondo: ${label}`}
      // Le deja al panel una forma de encontrar la sección y leer el fondo que
      // tiene puesto AHORA. Sin esto, el panel no sabe el color que trae el
      // template de fábrica: asume negro, y prender un difuminado sobre una
      // sección que nunca se tocó la pintaba de negro de golpe.
      data-edit-bg={field}
      style={{
        position: "absolute", top: 16, left: 16, zIndex: 9998,
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: 9, cursor: "pointer",
        fontSize: 11, fontWeight: 700,
        background: isActive ? "#6366f1" : hovered ? "rgba(20,20,20,0.9)" : "rgba(20,20,20,0.65)",
        color: "white",
        border: isActive ? "2px solid #6366f1" : "1.5px solid rgba(255,255,255,0.25)",
        backdropFilter: "blur(6px)",
        transition: "all 0.15s",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5"/><path d="M17 13H7a5 5 0 0 0 0 10h10a5 5 0 0 0 0-10z"/><line x1="9" y1="18" x2="15" y2="18"/>
      </svg>
      {currentColor && (
        <span style={{ width: 10, height: 10, borderRadius: 2, background: currentColor, border: "1px solid rgba(255,255,255,0.4)", flexShrink: 0 }} />
      )}
      Fondo
    </button>
  );
}

/* ── EditableFixed ────────────────────────────────────────────
   For fixed/absolute elements like the WhatsApp button.
──────────────────────────────────────────────────────────────── */
export function EditableFixed({
  field, label, bottom, right, size = 52, children,
}: {
  field: string; label: string;
  bottom: number; right: number; size?: number;
  children: React.ReactNode;
}) {
  const { editMode, activeField, setActiveField } = useEditContext();
  const [hovered, setHovered] = useState(false);
  const isActive = activeField === field;

  return (
    <>
      {children}
      {editMode && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setActiveField(field)}
          style={{
            position: "fixed", bottom, right,
            width: size, height: size, borderRadius: "50%",
            zIndex: 99999, cursor: "pointer",
            outline: isActive
              ? "3px solid #6366f1"
              : hovered ? "3px dashed rgba(99,102,241,0.8)"
              : "3px dashed transparent",
            outlineOffset: 3,
            boxShadow: isActive
              ? "0 0 0 7px rgba(255,255,255,0.9)"
              : hovered ? "0 0 0 7px rgba(255,255,255,0.6)"
              : "none",
            transition: "outline-color 0.15s, box-shadow 0.15s",
          }}
        >
          {(hovered || isActive) && (
            <span style={{
              position: "absolute", bottom: "100%", right: 0, marginBottom: 6,
              background: "#6366f1", color: "white",
              fontSize: 10, fontWeight: 700, lineHeight: 1.5,
              padding: "3px 8px", borderRadius: "4px 4px 0 4px",
              whiteSpace: "nowrap", pointerEvents: "none",
              boxShadow: "0 2px 10px rgba(99,102,241,0.45)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}>
              ✏ {label}
            </span>
          )}
        </div>
      )}
    </>
  );
}

/* ── DraggableImage ───────────────────────────────────────────
   Wraps an <img objectFit="cover"> to allow drag-repositioning
   when the image panel is open (activeField === "img:${field}").
──────────────────────────────────────────────────────────────── */
export function DraggableImage({
  field,
  src,
  alt,
  style,
  className,
}: {
  field: string;
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const { editMode, activeField, imageOverrides, setImageOverride, imageLoading } = useEditContext();
  const imgKey = `img:${field}`;
  const isActive = activeField === imgKey;
  const ov = imageOverrides[field] ?? {};
  const posX = ov.posX ?? 50;
  const posY = ov.posY ?? 50;

  const isLoadingImg = editMode && !!imageLoading[field];
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0, px: posX, py: posY });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      const newX = Math.round(Math.max(0, Math.min(100, startPos.current.px - (deltaX / rect.width) * 100 * 1.5)));
      const newY = Math.round(Math.max(0, Math.min(100, startPos.current.py - (deltaY / rect.height) * 100 * 1.5)));
      setImageOverride(field, { posX: newX, posY: newY });
    };

    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isActive, field, setImageOverride]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    dragging.current = true;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY, px: posX, py: posY };
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", overflow: "hidden", ...(style as React.CSSProperties) }}
      className={className}
    >
      <img
        src={src}
        alt={alt ?? ""}
        onMouseDown={handleMouseDown}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${posX}% ${posY}%`,
          display: "block",
          cursor: editMode && isActive ? (isDragging ? "grabbing" : "grab") : undefined,
          userSelect: "none",
          draggable: false,
        } as React.CSSProperties}
      />
      {isLoadingImg && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 9997,
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "rgba(30,41,59,0.95)", color: "#e2e8f0",
            fontSize: 12, fontWeight: 700, padding: "10px 18px", borderRadius: 10,
            border: "1px solid rgba(99,102,241,0.5)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: "50%",
              border: "2.5px solid rgba(129,140,248,0.3)", borderTopColor: "#818cf8",
              animation: "imgSpin 0.75s linear infinite", flexShrink: 0,
            }} />
            Cargando imagen...
          </div>
          <style>{`@keyframes imgSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {editMode && isActive && !isDragging && !isLoadingImg && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(20,20,20,0.75)", color: "white",
          fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8,
          pointerEvents: "none", whiteSpace: "nowrap", zIndex: 9990,
          backdropFilter: "blur(4px)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          ✋ Arrastrá para reposicionar
        </div>
      )}
    </div>
  );
}

/* ── BgDragHandle ─────────────────────────────────────────────
   Transparent overlay inside a section with backgroundImage
   that allows drag-repositioning. Active when the image/bg panel
   is open. Place inside the section (position:relative).
──────────────────────────────────────────────────────────────── */
export function BgDragHandle({ imgKey }: { imgKey: string }) {
  const { editMode, activeField, imageOverrides, setImageOverride } = useEditContext();

  // activation key: "sectionbg_foo" → "bg:foo", otherwise "img:foo"
  const activationKey = imgKey.startsWith("sectionbg_")
    ? `bg:${imgKey.slice(10)}`
    : `img:${imgKey}`;
  const isActive = activeField === activationKey;

  const ov = imageOverrides[imgKey] ?? {};
  const hasImage = !!ov.url;

  const posX = ov.posX ?? 50;
  const posY = ov.posY ?? 50;

  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0, px: posX, py: posY });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // derive the field name for setImageOverride
  const field = imgKey;

  useEffect(() => {
    if (!isActive || !hasImage) return;

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      const newX = Math.round(Math.max(0, Math.min(100, startPos.current.px - (deltaX / rect.width) * 100 * 1.5)));
      const newY = Math.round(Math.max(0, Math.min(100, startPos.current.py - (deltaY / rect.height) * 100 * 1.5)));
      setImageOverride(field, { posX: newX, posY: newY });
    };

    const onUp = () => {
      dragging.current = false;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isActive, hasImage, field, setImageOverride]);

  if (!editMode || !hasImage || !isActive) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY, px: posX, py: posY };
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute", inset: 0,
        zIndex: 9989,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {!isDragging && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(20,20,20,0.75)", color: "white",
          fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8,
          pointerEvents: "none", whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          ✋ Arrastrá para reposicionar
        </div>
      )}
    </div>
  );
}
