// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY de la promo por PRODUCTO (Fase 4.5) — cómo se muestra el descuento en
// las cards, modales y detalle de la tienda.
//
// El motor (pricing.ts) resuelve la cuenta del CARRITO. Acá resolvemos qué mostrar
// en UNA card, donde todavía no hay carrito: qué promo de tienda alcanza al producto
// y cómo se comunica (precio tachado + %, badge 3×2, "envío gratis desde $X", o un
// badge condicional cuando hay compra mínima). Reusa la cuenta del motor para que el
// precio mostrado sea el mismo que después cobra el checkout — no una 2da cuenta.
//
// Regla de qué se muestra (una sola señal principal, por prioridad):
//   1) Descuento directo (PERCENT/FIXED) SIN mínimo → precio tachado + efectivo + "-X%".
//   2) Descuento directo CON mínimo → sin tachar (no está garantizado); badge "X% desde $Z".
//   3) N×M → badge "3×2" (no cambia el precio unitario mostrado).
//   4) Envío gratis → badge "Envío gratis" (+ "desde $Z" si hay mínimo).
// ─────────────────────────────────────────────────────────────────────────────

import { priceCart, type ActivePromotion } from "./pricing";

export type ProductPromoDisplay = {
  hasPriceDrop: boolean;   // mostrar precio tachado + efectivo
  effectivePrice: number;  // precio unitario a mostrar (= original si no hay descuento directo)
  originalPrice: number;   // precio de lista (para tachar cuando hasPriceDrop)
  pctOff: number | null;   // % de descuento redondeado (para el badge / OfferBadge)
  nxm: { n: number; m: number } | null;
  freeShipping: boolean;
  minOrder: number | null; // >0 si el mejor descuento directo depende de una compra mínima
  badge: string | null;    // etiqueta corta lista para mostrar ("-20%", "3×2", "Envío gratis", "-$5.000")
  primaryPromo: ActivePromotion | null; // la promo que gana — para describirla en palabras (describePromo)
};

// Descripción en lenguaje humano de UNA promo, para el bloque explicativo del modal/card
// (estilo Tiendanube: "¡20% OFF! · Válido en la categoría X · Comprando $Z o más"). Es lo
// que hace entendible QUÉ promo hay, más allá del precio tachado.
export function describePromo(p: ActivePromotion): { headline: string; scope: string; conditions: string[] } {
  const ars = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
  let headline = "Promoción";
  if (p.type === "PERCENT" && p.value) headline = `${Math.round(p.value)}% OFF`;
  else if (p.type === "FIXED" && p.value) headline = `${ars(p.value)} OFF`;
  else if (p.type === "N_PAY_M" && p.minQty && p.payQty) headline = `${p.minQty}×${p.payQty}`;
  else if (p.type === "FREE_SHIPPING") headline = "Envío gratis";

  const cats = p.categories.filter(Boolean);
  const scope =
    p.scope === "CATEGORY" ? (cats.length ? `en la categoría: ${cats.join(", ")}` : "en una categoría")
    : p.scope === "PRODUCTS" ? "en productos seleccionados"
    : "en toda la tienda";

  const conditions: string[] = [];
  if (p.type === "N_PAY_M" && p.minQty && p.payQty) conditions.push(`Llevá ${p.minQty}, pagá ${p.payQty}`);
  if (p.minOrderAmount > 0) conditions.push(`Comprando ${ars(p.minOrderAmount)} o más`);
  conditions.push(p.combinesWithCoupons ? "Se puede combinar con un cupón" : "No se acumula con cupones");
  return { headline, scope, conditions };
}

export type PromoDisplayProduct = { id: string; price: number; category: string | null };

// Precio unitario de un producto bajo UNA promo directa (PERCENT/FIXED), reusando el
// motor. Ignora alcance/mínimo a propósito (ya filtramos alcance afuera; el mínimo se
// evalúa aparte para decidir si se tacha o es condicional). null = no descontó.
function directUnitPrice(p: ActivePromotion, price: number): number | null {
  const line = priceCart(
    [{
      productId: "x", variantId: null, quantity: 1, basePrice: price, category: null,
      promo: { promoType: null, promoQtyMin: null, promoPayQty: null, promoQtyDiscount: null },
    }],
    { promotions: [{ ...p, scope: "ALL", minOrderAmount: 0, categories: [], productIds: [] }] }
  ).lines[0];
  return line?.promoApplied ? line.unitPrice : null;
}

export function resolveProductPromo(
  product: PromoDisplayProduct,
  promotions: ActivePromotion[] | undefined | null
): ProductPromoDisplay {
  const none: ProductPromoDisplay = {
    hasPriceDrop: false, effectivePrice: product.price, originalPrice: product.price,
    pctOff: null, nxm: null, freeShipping: false, minOrder: null, badge: null, primaryPromo: null,
  };
  if (!promotions?.length || !(product.price > 0)) return none;

  // Promos vigentes que alcanzan a ESTE producto (por alcance).
  const matching = promotions.filter((p) =>
    p.scope === "ALL" ? true :
    p.scope === "CATEGORY" ? (product.category != null && p.categories.includes(product.category)) :
    p.scope === "PRODUCTS" ? p.productIds.includes(product.id) : false
  );
  if (!matching.length) return none;

  const freeShippingPromo = matching.find((p) => p.type === "FREE_SHIPPING") ?? null;

  // Mejor descuento DIRECTO (PERCENT/FIXED): el menor precio unitario para el comprador.
  let best: { price: number; promo: ActivePromotion } | null = null;
  let nxm: { n: number; m: number } | null = null;
  let nxmPromo: ActivePromotion | null = null;
  for (const p of matching) {
    if (p.type === "N_PAY_M" && p.minQty && p.minQty >= 2 && p.payQty && p.payQty >= 1 && p.payQty < p.minQty) {
      // El de mayor beneficio (menor razón pagás/llevás) gana como badge.
      if (!nxm || p.payQty / p.minQty < nxm.m / nxm.n) { nxm = { n: p.minQty, m: p.payQty }; nxmPromo = p; }
      continue;
    }
    if (p.type === "PERCENT" || p.type === "FIXED") {
      const u = directUnitPrice(p, product.price);
      if (u != null && (best === null || u < best.price)) best = { price: u, promo: p };
    }
  }

  // 1/2) Hay descuento directo.
  if (best) {
    const pctOff = Math.round((1 - best.price / product.price) * 100);
    const hasMin = best.promo.minOrderAmount > 0;
    if (hasMin) {
      // Condicional: no se tacha el precio (no está garantizado sin llegar al mínimo) y
      // NO lleva badge fuerte de corner (parecería un descuento seguro). El detalle
      // ("X% desde $Z") lo muestra la card como nota, con pctOff + minOrder.
      return {
        ...none,
        pctOff: pctOff > 0 ? pctOff : null,
        minOrder: best.promo.minOrderAmount,
        badge: null,
        primaryPromo: best.promo,
      };
    }
    return {
      hasPriceDrop: pctOff > 0,
      effectivePrice: best.price,
      originalPrice: product.price,
      pctOff: pctOff > 0 ? pctOff : null,
      nxm: null,
      freeShipping: !!freeShippingPromo,
      minOrder: null,
      badge: pctOff > 0 ? `-${pctOff}%` : null,
      primaryPromo: best.promo,
    };
  }

  // 3) N×M (badge, sin cambiar el precio unitario mostrado).
  if (nxm) {
    return { ...none, nxm, freeShipping: !!freeShippingPromo, badge: `${nxm.n}×${nxm.m}`, primaryPromo: nxmPromo };
  }

  // 4) Solo envío gratis. Badge corto; el "desde $Z" lo pone la card con minOrder.
  if (freeShippingPromo) {
    const min = freeShippingPromo.minOrderAmount > 0 ? freeShippingPromo.minOrderAmount : null;
    return { ...none, freeShipping: true, minOrder: min, badge: "Envío gratis", primaryPromo: freeShippingPromo };
  }

  return none;
}
