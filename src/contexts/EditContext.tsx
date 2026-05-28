"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import type { TextOverride, ImageOverride } from "@/types/store-config";

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
});

export function getContrastColor(hex: string): "light" | "dark" {
  if (!hex) return "dark";
  let full = hex.startsWith("#") ? hex : "#" + hex;
  // Expand shorthand #RGB → #RRGGBB
  if (full.length === 4) {
    full = "#" + full[1] + full[1] + full[2] + full[2] + full[3] + full[3];
  }
  if (full.length < 7) return "dark";
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? "dark" : "light";
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

  const overrideStyle: React.CSSProperties = {
    ...(ov.color      && { color: ov.color }),
    ...(ov.fontFamily && { fontFamily: ov.fontFamily }),
    ...(ov.fontSize   && { fontSize: ov.fontSize }),
    ...(ov.bold       !== undefined && { fontWeight: ov.bold ? 700 : "normal" }),
    ...(ov.italic     !== undefined && { fontStyle: ov.italic ? "italic" : "normal" }),
    ...(ov.underline  !== undefined && { textDecoration: ov.underline ? "underline" : "none" }),
  };

  const displayContent = ov.text !== undefined ? ov.text : children;
  const hasStyle = Object.keys(overrideStyle).length > 0;

  if (!editMode) {
    if (!hasStyle && ov.text === undefined) return <>{children}</>;
    const Tag = block ? "div" : ("span" as React.ElementType);
    return <Tag style={overrideStyle}>{displayContent}</Tag>;
  }

  const Tag = block ? "div" : ("span" as React.ElementType);

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveField(field); }}
      style={{
        position: "relative",
        display: block ? "block" : "inline",
        cursor: "pointer",
        outline: isActive
          ? "2px solid #6366f1"
          : hovered ? "2px dashed rgba(99,102,241,0.75)"
          : "2px dashed transparent",
        outlineOffset: 4,
        borderRadius: 3,
        transition: "outline-color 0.15s",
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
}: {
  field: string;
  label: string;
}) {
  const { editMode, activeField, setActiveField } = useEditContext();
  const [hovered, setHovered] = useState(false);
  const imageKey = `img:${field}`;
  const isActive = activeField === imageKey;

  if (!editMode) return null;

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setActiveField(isActive ? null : imageKey); }}
      style={{
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
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
      </svg>
      {label}
    </button>
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
            transition: "outline-color 0.15s",
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
  const { editMode, activeField, imageOverrides, setImageOverride } = useEditContext();
  const imgKey = `img:${field}`;
  const isActive = activeField === imgKey;
  const ov = imageOverrides[field] ?? {};
  const posX = ov.posX ?? 50;
  const posY = ov.posY ?? 50;

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
      {editMode && isActive && !isDragging && (
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
