"use client";

export type OfferBadgeKey = "OFERTA" | "SALE" | "PROMO" | "HOT" | "PCT" | "2X1" | "NUEVO";

interface Props {
  badge: string | null | undefined;
  /** Only used for PCT badge — pass Math.round((1 - price/comparePrice)*100) */
  pct?: number | null;
  size?: "sm" | "md";
}

const CONFIGS: Record<OfferBadgeKey, { label: (pct?: number | null) => string; bg: string; color: string; shape: "rect" | "pill" | "ribbon" | "circle" | "tag" }> = {
  OFERTA: { label: () => "¡OFERTA!",  bg: "#e11d48", color: "#fff",    shape: "tag"    },
  SALE:   { label: () => "SALE",      bg: "#f59e0b", color: "#1c1917",  shape: "rect"   },
  PROMO:  { label: () => "PROMO",     bg: "#7c3aed", color: "#fff",    shape: "pill"   },
  HOT:    { label: () => "🔥 HOT",   bg: "#ea580c", color: "#fff",    shape: "pill"   },
  PCT:    { label: (p) => p ? `-${p}%` : "OFF", bg: "#dc2626", color: "#fff", shape: "circle" },
  "2X1":  { label: () => "2×1",       bg: "#16a34a", color: "#fff",    shape: "pill"   },
  NUEVO:  { label: () => "NUEVO",     bg: "#0891b2", color: "#fff",    shape: "rect"   },
};

export function OfferBadge({ badge, pct, size = "md" }: Props) {
  if (!badge || !(badge in CONFIGS)) return null;
  const cfg = CONFIGS[badge as OfferBadgeKey];
  const label = cfg.label(pct);
  const fs = size === "sm" ? 9 : 10;
  const pad = size === "sm" ? "3px 7px" : "4px 10px";

  const base: React.CSSProperties = {
    position: "absolute",
    top: 10,
    left: 10,
    background: cfg.bg,
    color: cfg.color,
    fontSize: fs,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: 1.2,
    zIndex: 3,
    pointerEvents: "none",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  if (cfg.shape === "circle") {
    const d = size === "sm" ? 32 : 38;
    return (
      <div style={{ ...base, width: d, height: d, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, textAlign: "center", fontSize: fs - 1 }}>
        {label}
      </div>
    );
  }
  if (cfg.shape === "tag") {
    return (
      <div style={{ ...base, padding: pad, clipPath: "polygon(0 0,100% 0,100% 75%,50% 100%,0 75%)" }}>
        {label}
      </div>
    );
  }
  if (cfg.shape === "ribbon") {
    return (
      <div style={{ ...base, padding: pad, transform: "rotate(-12deg)", transformOrigin: "top left", borderRadius: 2 }}>
        {label}
      </div>
    );
  }
  return (
    <div style={{ ...base, padding: pad, borderRadius: cfg.shape === "pill" ? 100 : 2 }}>
      {label}
    </div>
  );
}

/** Inline preview for the dashboard badge picker — no absolute positioning */
export function OfferBadgePreview({ badge, pct }: { badge: string; pct?: number | null }) {
  if (!(badge in CONFIGS)) return null;
  const cfg = CONFIGS[badge as OfferBadgeKey];
  const label = cfg.label(pct);
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: cfg.bg,
    color: cfg.color,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };
  if (cfg.shape === "circle") {
    return <span style={{ ...base, width: 36, height: 36, borderRadius: "50%", padding: 0, fontSize: 9 }}>{label}</span>;
  }
  if (cfg.shape === "tag") {
    return <span style={{ ...base, padding: "4px 10px", clipPath: "polygon(0 0,100% 0,100% 75%,50% 100%,0 75%)" }}>{label}</span>;
  }
  return <span style={{ ...base, padding: "4px 10px", borderRadius: cfg.shape === "pill" ? 100 : 2 }}>{label}</span>;
}
