"use client";
import type { CSSProperties } from "react";
import { describePromo } from "@/lib/promoDisplay";
import type { ActivePromotion } from "@/lib/pricing";

// ─────────────────────────────────────────────────────────────────────────────
// Presentación de la PROMOCIÓN de tienda en la tienda pública. Se usa en cards,
// modales, detalle y los templates. Es distinta del OfferBadge (la "oferta" del
// producto, badge rojo) a propósito: la promo va en NARANJA para que el comprador
// distinga de un vistazo "promoción de tienda" de "oferta del producto".
//   · PromoTag   → tag rectangular en la esquina de la foto (cards + modal).
//   · PromoBlock → bloque explicativo (headline + alcance + condiciones) para el
//                  modal/detalle, donde sí hay lugar para el detalle completo.
// ─────────────────────────────────────────────────────────────────────────────

export function PromoTag({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  const sm = size === "sm";
  const style: CSSProperties = {
    position: "absolute",
    top: sm ? 8 : 14,
    left: sm ? 8 : 14,
    zIndex: 5,
    background: "#ea580c",
    color: "#fff",
    fontSize: sm ? 10 : 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    padding: sm ? "4px 8px" : "6px 11px",
    borderRadius: 4,
    boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
    maxWidth: "78%",
    lineHeight: 1.15,
    pointerEvents: "none",
  };
  return <div style={style}>{label}</div>;
}

export function PromoBlock({ promo, freeShippingExtra = false }: { promo: ActivePromotion; freeShippingExtra?: boolean }) {
  const d = describePromo(promo);
  return (
    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#ea580c" }}>¡{d.headline}!</div>
      <div style={{ fontSize: 12.5, color: "#9a3412", lineHeight: 1.5 }}>Válido {d.scope}.</div>
      {d.conditions.map((c, i) => (
        <div key={i} style={{ fontSize: 11.5, color: "#9a3412", opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#c2410c", display: "inline-block", flexShrink: 0 }} />
          {c}
        </div>
      ))}
      {freeShippingExtra && promo.type !== "FREE_SHIPPING" && (
        <div style={{ fontSize: 12, color: "#0d9488", fontWeight: 700, marginTop: 2 }}>🚚 Envío gratis incluido</div>
      )}
    </div>
  );
}
