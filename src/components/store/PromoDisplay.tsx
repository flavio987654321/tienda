"use client";
import type { CSSProperties } from "react";
import { describePromo, resolveProductPromo, type PromoDisplayProduct } from "@/lib/promoDisplay";
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

// ─────────────────────────────────────────────────────────────────────────────
// PromoPrice — el precio de un producto en cualquier lista de la tienda.
//
// Existe porque el precio se mostraba en siete lugares distintos de un mismo
// template y solo dos consultaban las promociones. Los otros cinco —ofertas, lo
// más visto, el buscador, favoritos, productos similares— escribían `fmt(p.price)`
// a mano. Con una promo del 20% vigente, el mismo producto aparecía a $8.000 en la
// grilla y a $10.000 tres bloques más abajo, las dos cosas visibles a la vez.
//
// La cuenta no se repite acá: `resolveProductPromo` reusa el motor, así que el
// precio que se ve es el que después cobra el checkout. Lo que aporta este
// componente es que sea IMPOSIBLE mostrar un precio sin haber preguntado por las
// promos — no hay forma de pintar el número salteándose el paso.
//
// El tamaño y el peso los define cada sección: la idea es unificar la CUENTA, no
// aplanar el diseño de los templates.
// ─────────────────────────────────────────────────────────────────────────────

export function PromoPrice({
  product,
  promotions,
  fmt,
  accent,
  priceSize,
  compareSize,
  weight = 800,
  ocultarPrecios = false,
  consultaLabel = "Consultá precio",
  gap = 6,
  align = "baseline",
  style,
}: {
  /** El producto tal cual viene del storefront. `comparePrice` es opcional: sin él, no se tacha nada. */
  product: PromoDisplayProduct & { comparePrice?: number | null };
  promotions: ActivePromotion[] | undefined | null;
  /** El formateador de moneda del template (`fmt` de useCartLogic). */
  fmt: (n: number) => string;
  /** Color del precio cuando NO hay descuento — el acento de la tienda. */
  accent: string;
  priceSize: number;
  /** Tamaño del precio tachado. Omitirlo esconde el tachado (listas muy compactas). */
  compareSize?: number;
  weight?: number;
  ocultarPrecios?: boolean;
  consultaLabel?: string;
  gap?: number;
  align?: CSSProperties["alignItems"];
  style?: CSSProperties;
}) {
  const wrap: CSSProperties = { display: "flex", alignItems: align, gap, flexWrap: "wrap", ...style };

  if (ocultarPrecios) {
    return (
      <div style={wrap}>
        <span style={{ fontSize: priceSize, fontWeight: weight, color: accent }}>{consultaLabel}</span>
      </div>
    );
  }

  const promo = resolveProductPromo(product, promotions);

  // Hay promo de tienda: el precio baja de verdad. Va en rojo —el mismo que usa la
  // grilla del catálogo— para que se lea distinto del precio normal en acento.
  if (promo.hasPriceDrop) {
    return (
      <div style={wrap}>
        <span style={{ fontSize: priceSize, fontWeight: weight, color: "#dc2626" }}>{fmt(promo.effectivePrice)}</span>
        {compareSize != null && (
          <span style={{ fontSize: compareSize, color: "#aaa", textDecoration: "line-through" }}>{fmt(promo.originalPrice)}</span>
        )}
      </div>
    );
  }

  // Sin promo: precio normal, y el tachado de la "oferta" del producto si la tiene.
  const enOferta = product.comparePrice != null && product.comparePrice > product.price;
  return (
    <div style={wrap}>
      <span style={{ fontSize: priceSize, fontWeight: weight, color: accent }}>{fmt(product.price)}</span>
      {compareSize != null && enOferta && (
        <span style={{ fontSize: compareSize, color: "#aaa", textDecoration: "line-through" }}>{fmt(product.comparePrice!)}</span>
      )}
    </div>
  );
}
