"use client";
import { createContext, useContext, useState } from "react";
import type { TextOverride } from "@/types/store-config";

type EditContextType = {
  editMode: boolean;
  activeField: string | null;
  setActiveField: (field: string | null) => void;
  overrides: Record<string, TextOverride>;
  setOverride: (field: string, partial: Partial<TextOverride>) => void;
  resetOverride: (field: string) => void;
};

export const EditContext = createContext<EditContextType>({
  editMode: false,
  activeField: null,
  setActiveField: () => {},
  overrides: {},
  setOverride: () => {},
  resetOverride: () => {},
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
