"use client";
import type { CSSProperties } from "react";

export type OfferBadgeKey = "OFERTA" | "SALE" | "PCT";

interface Props {
  badge?: string | null;
  /** Only for PCT badge — pass Math.round((1 - price/comparePrice)*100) */
  pct?: number | null;
  size?: "sm" | "md";
  /** When set, renders an auto-generated NxM badge (takes priority over badge prop) */
  nxm?: { n: number; m: number };
}

type ShapeKey = "tag" | "burst" | "circle";

const CONFIGS: Record<OfferBadgeKey, {
  label: (pct?: number | null) => string;
  gradient: string;
  color: string;
  shape: ShapeKey;
  rotate: number;
}> = {
  OFERTA: { label: () => "¡OFERTA!", gradient: "linear-gradient(150deg,#ff1a44 0%,#c0002a 100%)", color: "#fff", shape: "tag",    rotate: -14 },
  SALE:   { label: () => "SALE",     gradient: "linear-gradient(150deg,#ffe234 0%,#ff9000 100%)", color: "#111", shape: "burst",  rotate: -10 },
  PCT:    { label: (p) => (p ? `-${p}%` : "OFF"), gradient: "linear-gradient(150deg,#f43f5e 0%,#991b1b 100%)", color: "#fff", shape: "circle", rotate: -12 },
};

const NXM_GRADIENT = "linear-gradient(150deg,#22c55e 0%,#15803d 100%)";

const BURST_PATH = "polygon(50% 5%,61% 35%,94% 20%,79% 50%,94% 80%,61% 65%,50% 95%,39% 65%,6% 80%,21% 50%,6% 20%,39% 35%)";
const TAG_PATH   = "polygon(0 0,100% 0,100% 68%,50% 100%,0 68%)";
const SHADOW = "drop-shadow(2px 6px 14px rgba(0,0,0,0.6)) drop-shadow(0 2px 4px rgba(0,0,0,0.3))";

const SIZES = {
  burst:  ["clamp(38px,10vw,56px)", "68px"] as const,
  circle: ["clamp(34px,9vw,48px)",  "58px"] as const,
  tagFs:  ["clamp(8px,2.2vw,10px)", "12px"] as const,
  tagPad: ["clamp(4px,1.1vw,5px) clamp(10px,2.8vw,13px) clamp(5px,1.4vw,6px)", "7px 17px 9px"] as const,
} as const;

function txt(color: string, fs: string): CSSProperties {
  return {
    color, fontSize: fs, fontWeight: 900,
    fontFamily: "system-ui,-apple-system,sans-serif",
    textTransform: "uppercase", letterSpacing: "0.04em",
    lineHeight: 1, whiteSpace: "nowrap",
    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
  };
}

export function OfferBadge({ badge, pct, size = "md", nxm }: Props) {
  const i = size === "sm" ? 0 : 1;
  const base: CSSProperties = {
    position: "absolute",
    top: i === 0 ? 16 : 20,
    left: i === 0 ? 12 : 14,
    zIndex: 4,
    pointerEvents: "none",
    userSelect: "none",
    transformOrigin: "center",
    filter: SHADOW,
  };

  // NxM promo badge takes priority — auto-generated from promo config
  if (nxm) {
    const label = `${nxm.n}×${nxm.m}`;
    const d = SIZES.burst[i];
    return (
      <div style={{ ...base, transform: "rotate(-10deg)", width: d, height: d, background: NXM_GRADIENT, clipPath: BURST_PATH, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={txt("#fff", SIZES.tagFs[i])}>{label}</span>
      </div>
    );
  }

  if (!badge || !(badge in CONFIGS)) return null;
  const cfg = CONFIGS[badge as OfferBadgeKey];
  const label = cfg.label(pct);

  if (cfg.shape === "burst") {
    const d = SIZES.burst[i];
    return (
      <div style={{ ...base, transform: `rotate(${cfg.rotate}deg)`, width: d, height: d, background: cfg.gradient, clipPath: BURST_PATH, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={txt(cfg.color, SIZES.tagFs[i])}>{label}</span>
      </div>
    );
  }

  if (cfg.shape === "circle") {
    const d = SIZES.circle[i];
    return (
      <div style={{ ...base, transform: `rotate(${cfg.rotate}deg)`, width: d, height: d, borderRadius: "50%", background: cfg.gradient, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 3px rgba(255,255,255,0.85)" }}>
        <span style={txt(cfg.color, SIZES.tagFs[i])}>{label}</span>
      </div>
    );
  }

  // tag
  return (
    <div style={{ ...base, transform: `rotate(${cfg.rotate}deg)`, background: cfg.gradient, clipPath: TAG_PATH, padding: SIZES.tagPad[i], display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      <span style={txt(cfg.color, SIZES.tagFs[i])}>{label}</span>
    </div>
  );
}

/** Inline preview for the dashboard badge picker — no absolute positioning */
export function OfferBadgePreview({ badge, pct }: { badge: string; pct?: number | null }) {
  if (!(badge in CONFIGS)) return null;
  const cfg = CONFIGS[badge as OfferBadgeKey];
  const label = cfg.label(pct);

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: cfg.gradient,
    color: cfg.color,
    fontSize: 9,
    fontWeight: 900,
    fontFamily: "system-ui,-apple-system,sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    lineHeight: 1,
    whiteSpace: "nowrap",
    filter: "drop-shadow(1px 3px 6px rgba(0,0,0,0.45))",
    transform: `rotate(${cfg.rotate}deg)`,
  };

  if (cfg.shape === "burst")  return <span style={{ ...base, width: 44, height: 44, clipPath: BURST_PATH, fontSize: 7 }}>{label}</span>;
  if (cfg.shape === "circle") return <span style={{ ...base, width: 38, height: 38, borderRadius: "50%", boxShadow: "0 0 0 2px rgba(255,255,255,0.8)" }}>{label}</span>;
  return <span style={{ ...base, padding: "4px 9px 10px", clipPath: TAG_PATH }}>{label}</span>;
}
