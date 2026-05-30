"use client";

import { useRef, useState, useCallback, useEffect } from "react";

function ComingSoonMini({
  name,
  logo,
  color,
  tagline,
}: {
  name: string;
  logo: string | null;
  color: string;
  tagline: string | null;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(ellipse at center, ${color}1a 0%, #f8fafc 70%)`,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        padding: "1.5rem 1rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 12,
          boxShadow: `0 4px 16px ${color}50`,
          background: logo ? undefined : `linear-gradient(135deg, ${color}, ${color}bb)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{initials}</span>
        )}
      </div>
      <span
        style={{
          display: "inline-block",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color,
          background: `${color}1a`,
          border: `1px solid ${color}40`,
          borderRadius: 99,
          padding: "3px 10px",
          marginBottom: 10,
        }}
      >
        Próximamente
      </span>
      <h1
        style={{
          fontSize: "1.05rem",
          fontWeight: 900,
          color: "#0f172a",
          margin: "0 0 6px",
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}
      >
        {name}
      </h1>
      <p
        style={{
          fontSize: 10,
          color: "#64748b",
          maxWidth: 200,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {tagline || "Estamos preparando algo especial para vos. ¡Volvé pronto!"}
      </p>
      <p
        style={{
          position: "absolute",
          bottom: 8,
          fontSize: 9,
          color: "#94a3b8",
          margin: 0,
        }}
      >
        Powered by{" "}
        <strong style={{ color: "#6366f1" }}>TiendaApps</strong>
      </p>
    </div>
  );
}

export default function OwnerPreviewBadge({
  name,
  logo,
  color,
  tagline,
}: {
  name: string;
  logo: string | null;
  color: string;
  tagline: string | null;
}) {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos({ x: window.innerWidth - 300, y: 80 });
    setInitialized(true);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    },
    [pos]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!initialized) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: minimized ? "auto" : 264,
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        borderRadius: 12,
        overflow: "hidden",
        border: "1.5px solid rgba(99,102,241,0.25)",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {/* Drag handle / header */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          background: "linear-gradient(90deg, #1e1b4b, #312e81)",
          padding: "8px 10px",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13 }}>👁</span>
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 600,
            color: "#c7d2fe",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          Vista del visitante
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMinimized((v) => !v)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 4,
            color: "#c7d2fe",
            fontSize: 12,
            lineHeight: 1,
            padding: "2px 6px",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title={minimized ? "Expandir" : "Minimizar"}
        >
          {minimized ? "▲" : "▼"}
        </button>
      </div>

      {/* Body */}
      {!minimized && (
        <>
          <div
            style={{
              background: "#f1f5f9",
              padding: "5px 10px",
              fontSize: 10,
              color: "#64748b",
              borderBottom: "1px solid #e2e8f0",
              flexShrink: 0,
            }}
          >
            Tu tienda no está publicada. Los visitantes ven esto:
          </div>
          <div style={{ height: 260, display: "flex", flexDirection: "column" }}>
            <ComingSoonMini name={name} logo={logo} color={color} tagline={tagline} />
          </div>
        </>
      )}
    </div>
  );
}
