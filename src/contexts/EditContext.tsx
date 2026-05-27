"use client";
import { createContext, useContext, useState } from "react";
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
});

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
