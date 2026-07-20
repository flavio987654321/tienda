// Validación y estado de las promociones (StorePromotion). El form valida para la
// UX; ESTO valida para seguridad — el server es la autoridad, un POST directo por
// consola no puede meter un "500% off" ni un "llevá 2 pagá 3". Ver PROMOCIONES.md
// (reglas transversales · coherencia por tipo).

import { priceCart, type ActivePromotion } from "./pricing";

// MIX_N_PAY_M = mix & match (Fase 5): llevá N mezclando productos del alcance, el/los
// más barato(s) gratis. Reusa minQty/payQty igual que N_PAY_M — no necesitó columna nueva.
export const PROMO_TYPES = ["PERCENT", "FIXED", "N_PAY_M", "MIX_N_PAY_M", "FREE_SHIPPING"] as const;
export const PROMO_SCOPES = ["ALL", "CATEGORY", "PRODUCTS"] as const;
export type PromoType = (typeof PROMO_TYPES)[number];
export type PromoScope = (typeof PROMO_SCOPES)[number];

// Tope de porcentaje. 90 y no 100: un 100% regala el producto, casi siempre es un
// error de tipeo. Si alguna vez se quiere "gratis", se decide aparte.
export const MAX_PROMO_PERCENT = 90;
export const MAX_PROMO_NAME = 80;
export const MAX_PROMO_SCOPE_ITEMS = 500; // tope de categorías/productos por promo

export type PromotionStatus = "active" | "scheduled" | "expired" | "paused" | "archived";

// Estado derivado (no se guarda). El mismo criterio lo usa el badge de la fila y
// los contadores de arriba, para que coincidan.
export function promotionStatus(
  p: { isActive: boolean; archivedAt: Date | null; startsAt: Date | null; endsAt: Date | null },
  now: Date
): PromotionStatus {
  if (p.archivedAt) return "archived";
  if (p.endsAt && p.endsAt <= now) return "expired";
  if (!p.isActive) return "paused";
  if (p.startsAt && p.startsAt > now) return "scheduled";
  return "active";
}

// Parseo seguro de los arrays guardados como JSON string (convención del repo).
export function parseStringArray(raw: unknown): string[] {
  let arr: unknown = raw;
  if (typeof raw === "string") { try { arr = JSON.parse(raw); } catch { return []; } }
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, MAX_PROMO_SCOPE_ITEMS);
}

export type ValidatedPromotion = {
  name: string;
  type: PromoType;
  value: number | null;
  minQty: number | null;
  payQty: number | null;
  minOrderAmount: number;
  scope: PromoScope;
  categories: string[];
  productIds: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  combinesWithCoupons: boolean;
  combinesWithPromotions: boolean;
  eventLabel: string | null;
};

// Tope del nombre del evento. Se muestra dentro del tag del producto, al lado
// del descuento; más largo que esto no entra y rompe la tarjeta.
export const MAX_EVENT_LABEL = 24;

type Body = Record<string, unknown>;

// Devuelve { error } con el mensaje, o { data } con los campos ya limpios y coherentes.
export function validatePromotionBody(body: Body): { error: string } | { data: ValidatedPromotion } {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_PROMO_NAME) : "";
  if (name.length < 2) return { error: "Poné un nombre para la promoción." };

  const type = body.type as PromoType;
  if (!PROMO_TYPES.includes(type)) return { error: "Tipo de promoción inválido." };

  const scope = body.scope as PromoScope;
  if (!PROMO_SCOPES.includes(scope)) return { error: "Alcance inválido." };

  // ── Alcance ──
  const categories = scope === "CATEGORY" ? parseStringArray(body.categories) : [];
  const productIds = scope === "PRODUCTS" ? parseStringArray(body.productIds) : [];
  if (scope === "CATEGORY" && categories.length === 0) return { error: "Elegí al menos una categoría." };
  if (scope === "PRODUCTS" && productIds.length === 0) return { error: "Elegí al menos un producto." };

  // ── Reglas por tipo (coherencia dura) ──
  let value: number | null = null;
  let minQty: number | null = null;
  let payQty: number | null = null;

  if (type === "PERCENT") {
    value = Number(body.value);
    if (!Number.isFinite(value) || value < 1 || value > MAX_PROMO_PERCENT) {
      return { error: `El porcentaje debe estar entre 1 y ${MAX_PROMO_PERCENT}.` };
    }
  } else if (type === "FIXED") {
    value = Number(body.value);
    if (!Number.isFinite(value) || value <= 0) return { error: "El monto de descuento debe ser mayor a 0." };
  } else if (type === "N_PAY_M" || type === "MIX_N_PAY_M") {
    // Mismas reglas para el N×M del mismo producto y para el mix & match: lo único
    // que cambia es si las unidades se cuentan de un solo producto o mezclando.
    minQty = Math.trunc(Number(body.minQty));
    payQty = Math.trunc(Number(body.payQty));
    if (!Number.isFinite(minQty) || minQty < 2) return { error: "En 'llevá N', N tiene que ser 2 o más." };
    if (!Number.isFinite(payQty) || payQty < 1) return { error: "En 'pagá M', M tiene que ser 1 o más." };
    if (payQty >= minQty) return { error: "El 'pagá' tiene que ser menor que el 'llevá' (ej. llevá 3 pagá 2)." };
  }
  // FREE_SHIPPING no usa value/minQty/payQty — solo minOrderAmount.

  // ── Compra mínima ──
  const minOrderAmount = body.minOrderAmount != null ? Number(body.minOrderAmount) : 0;
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) return { error: "La compra mínima no puede ser negativa." };

  // ── Fechas ──
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt && endsAt && endsAt < startsAt) return { error: "La fecha de fin no puede ser anterior a la de inicio." };

  // ── Evento ──
  // Vacío o solo espacios cuenta como "sin evento": si no, una promo quedaría
  // con un evento en blanco y la tienda mostraría un tag con un separador suelto.
  const eventoCrudo = typeof body.eventLabel === "string" ? body.eventLabel.trim() : "";
  const eventLabel = eventoCrudo ? eventoCrudo.slice(0, MAX_EVENT_LABEL) : null;

  return {
    data: {
      name, type, value, minQty, payQty, minOrderAmount, scope, categories, productIds,
      startsAt, endsAt,
      combinesWithCoupons: body.combinesWithCoupons === true,
      combinesWithPromotions: body.combinesWithPromotions === true,
      eventLabel,
    },
  };
}

function parseDate(raw: unknown): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ── Piso de costo (aviso a la dueña, NUNCA frena al comprador) ────────────────
// Fase 3. Regla de Flavio: avisar al que configura si la promo deja algún producto
// bajo su costo; el comprador siempre paga el precio de la promo (un candado sería
// un cliente menos). El checkout no cambia — esto es puramente informativo.

// Precio unitario efectivo de un producto bajo la promo, en su mejor caso (para el
// aviso). Reusa el MOTOR para no tener una 2da cuenta que se desincronice. Ignora
// alcance y compra mínima a propósito (asume que la promo aplica al producto).
// null = la promo no toca el precio del producto (FREE_SHIPPING o datos incompletos).
// Interna: solo la usa costFloorCheck (se exportará si algún día la necesita otra parte).
function promoEffectiveUnitPrice(
  p: { type: string; value: number | null; minQty: number | null; payQty: number | null },
  unitPrice: number
): number | null {
  if (p.type === "FREE_SHIPPING" || !(unitPrice > 0)) return null;
  // Para los dos N×M (mismo producto y mix) se simula el grupo completo: es el caso
  // en que el precio por unidad baja más, que es justo lo que hay que avisar.
  const isNxM = p.type === "N_PAY_M" || p.type === "MIX_N_PAY_M";
  const qty = isNxM && p.minQty && p.minQty >= 2 ? p.minQty : 1;
  const promo: ActivePromotion = {
    type: p.type, value: p.value, minQty: p.minQty, payQty: p.payQty,
    minOrderAmount: 0, scope: "ALL", categories: [], productIds: [], combinesWithCoupons: true,
  };
  const line = priceCart(
    [{ productId: "x", variantId: null, quantity: qty, basePrice: unitPrice, category: null }],
    { promotions: [promo] }
  ).lines[0];
  if (!line || !line.promoApplied) return null; // la promo no descontó nada (datos incompletos)
  return line.unitPrice;
}

export type CostFloorPromo = {
  type: string; value: number | null; minQty: number | null; payQty: number | null;
  scope: string; categories: string[]; productIds: string[];
};
export type CostFloorProduct = {
  id: string; name: string; price: number; costPrice: number | null; category: string | null;
};
export type CostFloorResult = {
  below: { name: string; effective: number; cost: number }[]; // productos que quedan bajo costo
  missingCost: number;   // en alcance pero sin costo cargado (no se pudieron chequear)
  inScope: number;       // total de productos alcanzados
};

// ¿Qué productos en alcance quedarían por debajo de su costo con esta promo?
export function costFloorCheck(promo: CostFloorPromo, products: CostFloorProduct[]): CostFloorResult {
  const inScope = products.filter((p) =>
    promo.scope === "ALL" ? true :
    promo.scope === "CATEGORY" ? (p.category != null && promo.categories.includes(p.category)) :
    promo.scope === "PRODUCTS" ? promo.productIds.includes(p.id) : false
  );
  // Envío gratis no toca el precio del producto → nunca hay piso de costo que avisar
  // (y no tiene sentido contar "sin costo cargado" acá).
  if (promo.type === "FREE_SHIPPING") return { below: [], missingCost: 0, inScope: inScope.length };
  const below: { name: string; effective: number; cost: number }[] = [];
  let missingCost = 0;
  for (const p of inScope) {
    if (p.costPrice == null) { missingCost++; continue; }
    if (p.costPrice <= 0) continue; // costo en 0 = no cargado de verdad, no se avisa
    const eff = promoEffectiveUnitPrice(promo, p.price);
    if (eff != null && eff < p.costPrice) below.push({ name: p.name, effective: eff, cost: p.costPrice });
  }
  return { below, missingCost, inScope: inScope.length };
}
