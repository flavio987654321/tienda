// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE PRECIOS — una sola cuenta para toda la tienda.
//
// Antes, "cuánto sale esto con la promo" estaba calculado en 3 lugares distintos
// (checkout, useCartLogic, CartDrawer) con reglas que no coincidían entre sí:
//   - los escalones mayoristas se aplicaban en 2 de 3 (el checkout los ignoraba → cobraba de más)
//   - el N×M se redondeaba en 3 momentos distintos → diferencias de centavos
// Ver PROMOCIONES.md (B-01, B-03) para el detalle.
//
// Este módulo es una FUNCIÓN PURA: sin Prisma, sin fetch, sin estado. Recibe
// datos, devuelve números. Por eso la pueden usar las dos puntas sin duplicar la
// cuenta: el cliente para MOSTRAR, y el checkout —que es el que COBRA— para la
// cifra real, siempre releyendo los datos desde la base. El cliente nunca es la
// autoridad del precio; solo dibuja lo que esta función también calcula server-side.
//
// ALCANCE: la cuenta de PROMOS por producto (PERCENT y N×M) sobre un precio base
// ya resuelto. Quién elige ese precio base (variante / mayorista / escalón) es un
// paso previo — así el enredo del mayorista (ver B-01/B-04) no contamina esta
// cuenta. El cupón y el envío son a nivel pedido y viven en el checkout; esta
// función llega hasta el subtotal.
// ─────────────────────────────────────────────────────────────────────────────

export const PROMO_PERCENT = "PERCENT";
export const PROMO_N_PAY_M = "N_PAY_M";

// Tope de descuento por promo de porcentaje, por seguridad ante datos corruptos.
// Coincide con la validación del server (validateProductBody): 1..80%.
const MAX_PROMO_PERCENT = 80;

// Acepta null y undefined: el server (Prisma) usa null, el storefront usa campos
// opcionales (undefined). Así calza en las dos puntas sin coerción en cada lado.
export type PromoConfig = {
  promoType: string | null | undefined;
  promoQtyMin: number | null | undefined;
  promoPayQty: number | null | undefined;
  promoQtyDiscount: number | null | undefined;
};

// Un ítem del carrito ya con su precio base resuelto (variante o mayorista/escalón).
// La promo se aplica ENCIMA de este precio.
export type PricingItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  basePrice: number;   // precio unitario ya resuelto, sin la promo por cantidad
  promo: PromoConfig;
};

export type PricedLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;    // efectivo tras la promo, redondeado a centavos
  lineTotal: number;    // unitPrice * quantity, redondeado a centavos
  promoApplied: boolean;
  savings: number;      // cuánto ahorró esta línea respecto al precio base
};

export type CartPricing = {
  lines: PricedLine[];
  subtotal: number;     // Σ lineTotal
  promoSavings: number; // Σ savings
};

// Redondeo a centavos, estable, en un solo lugar. Todas las cuentas lo usan para
// que no haya 3 criterios de redondeo distintos como pasaba antes.
function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Precio base con mayorista y escalones ────────────────────────────────────
// Antes esto estaba en 3 versiones que no coincidían: el carrito y el drawer
// aplicaban los escalones, el checkout NO (cobraba el mayorista plano → cobraba
// de más, B-01). Este es el único lugar donde se decide el precio base.

export type EscalonBand = { desde: number; precio: number };

export type BasePriceConfig = {
  // Precio retail ya resuelto: el de la variante elegida, o el del producto.
  retailPrice: number;
  precioMayorista: number | null | undefined;
  cantMinMayorista: number | null | undefined;
  preciosEscalonados: EscalonBand[] | null | undefined;
};

// Parsea el JSON de escalones (en la DB es un string) a bandas válidas. Descarta
// cualquier cosa que no sea {desde:number, precio:number}. Un solo parser para
// las dos puntas (el server tiene string, el storefront ya lo trae parseado).
export function parseEscalones(raw: unknown): EscalonBand[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (b): b is EscalonBand =>
      !!b && typeof b === "object" &&
      typeof (b as EscalonBand).desde === "number" &&
      typeof (b as EscalonBand).precio === "number"
  );
}

/**
 * Precio unitario base según la cantidad, aplicando mayorista + escalones.
 * Sin mayorista o bajo el mínimo → precio retail. Calificando → el mejor escalón
 * (desde ≤ qty, más barato), o el mayorista base si no hay escalón aplicable.
 * NO decide si se rechaza una compra bajo el mínimo — eso es validación aparte (B-04).
 */
export function resolveBasePrice(cfg: BasePriceConfig, qty: number): number {
  const { retailPrice, precioMayorista, cantMinMayorista, preciosEscalonados } = cfg;
  if (!precioMayorista || !cantMinMayorista || qty < cantMinMayorista) return retailPrice;
  let best: number | null = null;
  for (const band of preciosEscalonados ?? []) {
    if (qty >= band.desde && (best === null || band.precio < best)) best = band.precio;
  }
  return best ?? precioMayorista;
}

// ¿La promo de cantidad de un producto es válida y aplica para esta cantidad total?
// Réplica exacta de la guarda del checkout, en un solo lugar.
function promoApplies(promo: PromoConfig, totalQty: number): boolean {
  const { promoType, promoQtyMin, promoPayQty, promoQtyDiscount } = promo;
  if (!promoQtyMin || promoQtyMin < 2 || totalQty < promoQtyMin) return false;
  if (promoType === PROMO_N_PAY_M) {
    return promoPayQty != null && promoPayQty >= 1 && promoPayQty < promoQtyMin;
  }
  // PERCENT
  return promoQtyDiscount != null && promoQtyDiscount > 0 && promoQtyDiscount <= MAX_PROMO_PERCENT;
}

// Cuántas unidades se PAGAN en un N×M, para una cantidad total.
// "Llevá N pagá M": por cada grupo completo de N pagás M; el resto, a precio lleno.
// Cuenta directa (decisión aprobada) — no se convierte a % ni se redondea por unidad.
function paidUnitsNxM(totalQty: number, n: number, m: number): number {
  const completeGroups = Math.floor(totalQty / n);
  const remainder = totalQty % n;
  return completeGroups * m + remainder;
}

/**
 * Calcula el precio de todo el carrito aplicando las promos por cantidad.
 * Agrupa por producto porque el N×M y el mínimo del PERCENT dependen de la
 * cantidad TOTAL de ese producto en el carrito, no de cada línea suelta.
 */
export function priceCart(items: PricingItem[]): CartPricing {
  // Cantidad total por producto (todas las líneas del mismo producto suman).
  const totalQtyByProduct = new Map<string, number>();
  for (const it of items) {
    totalQtyByProduct.set(it.productId, (totalQtyByProduct.get(it.productId) ?? 0) + it.quantity);
  }

  const lines: PricedLine[] = [];
  let subtotal = 0;
  let promoSavings = 0;

  for (const it of items) {
    // El Map se llenó con todas las líneas arriba, así que la clave siempre está.
    const totalQty = totalQtyByProduct.get(it.productId)!;
    const applies = promoApplies(it.promo, totalQty);

    // La "razón" de descuento de la línea. Clave: se calcula el TOTAL de la línea
    // como base × cantidad × razón y se redondea UNA sola vez. Derivar primero un
    // precio unitario y multiplicarlo después metía centavos de error (era B-03).
    let ratio = 1;
    if (applies && it.promo.promoType === PROMO_N_PAY_M) {
      // N×M cuenta directa: se pagan `paid` de `totalQty` unidades. Misma razón
      // para todas las líneas del producto → reparten el beneficio parejo.
      const paid = paidUnitsNxM(totalQty, it.promo.promoQtyMin!, it.promo.promoPayQty!);
      ratio = paid / totalQty;
    } else if (applies) {
      // PERCENT
      ratio = 1 - it.promo.promoQtyDiscount! / 100;
    }

    const lineTotal = roundCents(it.basePrice * it.quantity * ratio);
    const unitPrice = it.quantity > 0 ? roundCents(lineTotal / it.quantity) : it.basePrice;
    const savings = roundCents(it.basePrice * it.quantity - lineTotal);

    lines.push({
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
      unitPrice,
      lineTotal,
      promoApplied: applies,
      savings: applies ? savings : 0,
    });
    subtotal = roundCents(subtotal + lineTotal);
    if (applies) promoSavings = roundCents(promoSavings + savings);
  }

  return { lines, subtotal, promoSavings };
}
