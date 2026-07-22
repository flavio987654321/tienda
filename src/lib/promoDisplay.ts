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

import { priceCart, promoLabel, type ActivePromotion } from "./pricing";

// ─── Evento comercial ────────────────────────────────────────────────────────
// Una promo puede pertenecer a un evento ("Black Friday"). Es SOLO presentación:
// no cambia ni un centavo del precio, que lo sigue resolviendo el motor.
//
// Todo lo que muestra el evento —el tag del producto, el banner de arriba, el
// filtro del listado— sale de acá. La regla que lo mantiene coherente es que
// NADIE pregunta "¿este producto está en Black Friday?" por su cuenta: pregunta
// qué promo gana (resolveProductPromo) y esa promo dice si tiene evento. Así el
// filtro no puede mostrar un producto sin el cartel, ni al revés.

/**
 * Formato único del nombre del evento. Existe para que el tag, el banner, el
 * filtro y el email escriban exactamente lo mismo: si cada lado lo formateara a
 * su manera, en una pantalla diría "BLACK FRIDAY" y en otra "Black friday".
 */
export function eventLabelOf(p: PromoEventFields | null | undefined): string | null {
  const raw = p?.eventLabel?.trim();
  return raw ? raw : null;
}

// Lo mínimo para resolver el evento. Se pide esto y no un ActivePromotion entero
// porque la página de la tienda lo calcula en el servidor con una consulta chica
// (solo eventLabel y endsAt) — obligarla a armar promos completas para poder
// llamar acá sería pedirle datos que no necesita.
export type PromoEventFields = { eventLabel?: string | null; endsAt?: string | Date | null };

/** Fin de la promo como Date, o null. Acepta Date (server) o ISO (storefront). */
function endsAtDate(p: PromoEventFields): Date | null {
  if (!p.endsAt) return null;
  const d = p.endsAt instanceof Date ? p.endsAt : new Date(p.endsAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * El evento que muestra el banner de la tienda, entre todas las promos vigentes.
 *
 * Gana el que TERMINA ANTES: es el más urgente y el que conviene comunicar. Sin
 * una regla escrita, con dos eventos pisados (Black Friday y Cyber Monday caen
 * pegados) la tienda mostraría uno u otro según el orden en que vengan de la
 * base — un bug que aparece meses después y no se puede reproducir.
 *
 * Las promos sin fecha de fin van al final: no tienen urgencia que comunicar.
 */
export function resolveStoreEvent(
  promotions: PromoEventFields[] | undefined | null
): { label: string; endsAt: Date | null } | null {
  const conEvento = (promotions ?? []).filter((p) => eventLabelOf(p));
  if (!conEvento.length) return null;

  const ordenadas = [...conEvento].sort((a, b) => {
    const fa = endsAtDate(a);
    const fb = endsAtDate(b);
    if (fa && fb) return fa.getTime() - fb.getTime();
    if (fa) return -1;
    if (fb) return 1;
    // Empate real (ninguna tiene fin): por nombre, para que sea estable entre
    // recargas en vez de depender del orden de la consulta.
    return (eventLabelOf(a) ?? "").localeCompare(eventLabelOf(b) ?? "");
  });

  const ganadora = ordenadas[0];
  return { label: eventLabelOf(ganadora)!, endsAt: endsAtDate(ganadora) };
}

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
export function describePromo(p: ActivePromotion): { headline: string; scope: string; conditions: string[]; event: string | null } {
  const ars = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
  // Misma etiqueta corta que usa el email y el comprobante — una sola fuente.
  const base = promoLabel(p);
  // Con evento, el titular lo lleva adelante ("BLACK FRIDAY · 20% OFF"). Va acá y
  // no en cada template porque los 8 llaman a esta función para armar el tag: si
  // se resolviera arriba, habría que tocar los 8 y alguno se olvidaría.
  const event = eventLabelOf(p);
  const headline = event ? `${event.toUpperCase()} · ${base}` : base;

  const cats = p.categories.filter(Boolean);
  const scope =
    p.scope === "CATEGORY" ? (cats.length
      ? `en ${cats.length === 1 ? "la categoría" : "las categorías"}: ${cats.join(", ")}`
      : "en una categoría")
    : p.scope === "PRODUCTS" ? "en productos seleccionados"
    : "en toda la tienda";

  const conditions: string[] = [];
  if (p.type === "N_PAY_M" && p.minQty && p.payQty) conditions.push(`Llevá ${p.minQty}, pagá ${p.payQty}`);
  // Mix & match: lo que lo hace distinto es que las unidades se pueden MEZCLAR entre
  // productos, y lo que se regala es lo más barato. Decirlo explícito es la promo.
  if (p.type === "MIX_N_PAY_M" && p.minQty && p.payQty) {
    const free = p.minQty - p.payQty;
    conditions.push(`Llevá ${p.minQty} combinando los productos que quieras`);
    conditions.push(free === 1 ? "El más barato te sale gratis" : `Los ${free} más baratos te salen gratis`);
  }
  if (p.minOrderAmount > 0) conditions.push(`Comprando ${ars(p.minOrderAmount)} o más`);
  conditions.push(p.combinesWithCoupons ? "Se puede combinar con un cupón" : "No se acumula con cupones");
  return { headline, scope, conditions, event };
}

export type PromoDisplayProduct = { id: string; price: number; category: string | null };

// Precio unitario de un producto bajo UNA promo directa (PERCENT/FIXED), reusando el
// motor. Ignora alcance/mínimo a propósito (ya filtramos alcance afuera; el mínimo se
// evalúa aparte para decidir si se tacha o es condicional). null = no descontó.
function directUnitPrice(p: ActivePromotion, price: number): number | null {
  const line = priceCart(
    [{ productId: "x", variantId: null, quantity: 1, basePrice: price, category: null }],
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
    // El mix & match también se muestra como N×M en la card: si el comprador lleva N
    // unidades de ESTE producto, el pool las cuenta igual y una sale gratis. Que además
    // se puedan mezclar productos lo explica el bloque (describePromo).
    if ((p.type === "N_PAY_M" || p.type === "MIX_N_PAY_M") && p.minQty && p.minQty >= 2 && p.payQty && p.payQty >= 1 && p.payQty < p.minQty) {
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
