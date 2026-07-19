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
// ALCANCE: la cuenta de las StorePromotion (promociones a nivel tienda) sobre un
// precio base ya resuelto. Quién elige ese precio base (variante / mayorista /
// escalón) es un paso previo — así el enredo del mayorista (ver B-01/B-04) no
// contamina esta cuenta. El cupón y el envío son a nivel pedido y viven en el
// checkout; esta función llega hasta el subtotal.
// ─────────────────────────────────────────────────────────────────────────────

// Tope de las StorePromotion de tipo PERCENT (validatePromotionBody: 1..90).
const MAX_STORE_PERCENT = 90;

// Un ítem del carrito ya con su precio base resuelto (variante o mayorista/escalón).
// Las StorePromotion se aplican ENCIMA de este precio.
export type PricingItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  basePrice: number;   // precio unitario ya resuelto
  // Categoría del producto — la usan las StorePromotion con alcance por categoría.
  // Opcional: los llamadores viejos (preview del modal) no la pasan y no la necesitan.
  category?: string | null;
};

// ── StorePromotion (promociones a nivel tienda) ──────────────────────────────
// La forma que consume el motor. El llamador YA filtró por vigencia (fecha activa,
// isActive, sin archivar) — Prisma con fechas Date en el server, el storefront con
// ISO strings; por eso acá no se tocan fechas. El motor sí evalúa el alcance, la
// compra mínima y el tipo, que dependen del carrito. Los arrays ya vienen parseados.
export type ActivePromotion = {
  type: string;                 // PERCENT | FIXED | N_PAY_M | FREE_SHIPPING
  value: number | null;         // % (PERCENT) o monto fijo por unidad (FIXED)
  minQty: number | null;        // N de "llevá N" (N_PAY_M)
  payQty: number | null;        // M de "pagá M" (N_PAY_M)
  minOrderAmount: number;       // compra mínima (sobre el subtotal SIN promo) para que aplique
  scope: string;                // ALL | CATEGORY | PRODUCTS
  categories: string[];         // nombres de categoría si scope=CATEGORY
  productIds: string[];         // ids de producto si scope=PRODUCTS
  combinesWithCoupons: boolean; // si false y la promo aplica al carrito, el cupón no entra
};

export type PriceCartOptions = {
  // Promos de tienda vigentes. El motor decide cuáles aplican y la mejor por línea.
  promotions?: ActivePromotion[];
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
  // Alguna StorePromotion de envío gratis aplica a este carrito (mínimo cumplido y
  // en alcance). El checkout y el checkout modal ponen el envío en 0.
  freeShipping: boolean;
  // Si false, hay una promo activa en el carrito que NO se combina con cupones
  // (combinesWithCoupons=false): el checkout ignora el cupón y el modal lo bloquea.
  couponsAllowed: boolean;
};

// Redondeo a PESO ENTERO, estable, en un solo lugar. En Argentina los precios se
// muestran y se cobran en pesos enteros; sin esto, un 20% sobre $24.999 daba
// $19.999,2 (feo y no es un monto que se cobre así). Todas las cuentas lo usan para
// que no haya criterios de redondeo distintos y para que lo mostrado == lo cobrado.
function roundMoney(n: number): number {
  return Math.round(n);
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

// Cuántas unidades se PAGAN en un N×M, para una cantidad total.
// "Llevá N pagá M": por cada grupo completo de N pagás M; el resto, a precio lleno.
// Cuenta directa (decisión aprobada) — no se convierte a % ni se redondea por unidad.
function paidUnitsNxM(totalQty: number, n: number, m: number): number {
  const completeGroups = Math.floor(totalQty / n);
  const remainder = totalQty % n;
  return completeGroups * m + remainder;
}

// ── StorePromotion: alcance y cuenta ─────────────────────────────────────────

// ¿La promo alcanza a ESTE ítem? (por producto o por categoría). El mínimo de
// compra se chequea aparte, a nivel carrito, porque depende del subtotal.
function promoMatchesItem(p: ActivePromotion, it: PricingItem): boolean {
  if (p.scope === "ALL") return true;
  if (p.scope === "PRODUCTS") return p.productIds.includes(it.productId);
  if (p.scope === "CATEGORY") return it.category != null && p.categories.includes(it.category);
  return false;
}

// ¿La promo alcanza a ALGÚN ítem del carrito? (para envío gratis y el gate de cupón).
function promoMatchesCart(p: ActivePromotion, items: PricingItem[]): boolean {
  if (p.scope === "ALL") return true;
  return items.some((it) => promoMatchesItem(p, it));
}

/**
 * Total de línea de UN ítem bajo UNA StorePromotion de descuento (no envío).
 * Devuelve null si el tipo no descuenta el precio (FREE_SHIPPING o datos inválidos).
 * `totalQty` es la cantidad total de ese producto en el carrito (para el N×M).
 * Redondea a centavos una sola vez, igual que el resto del motor.
 */
function storePromoLineTotal(p: ActivePromotion, it: PricingItem, totalQty: number): number | null {
  const base = it.basePrice * it.quantity;
  if (p.type === "PERCENT") {
    const pct = p.value != null && p.value > 0 ? Math.min(p.value, MAX_STORE_PERCENT) : 0;
    if (pct <= 0) return null;
    return roundMoney(base * (1 - pct / 100));
  }
  if (p.type === "FIXED") {
    if (p.value == null || p.value <= 0) return null;
    // Monto fijo por unidad, con piso en 0 (nunca precio negativo). El aviso de
    // "estás vendiendo bajo costo" es para la dueña (Fase 3), no frena al comprador.
    return roundMoney(Math.max(0, it.basePrice - p.value) * it.quantity);
  }
  if (p.type === "N_PAY_M") {
    const n = p.minQty, m = p.payQty;
    if (n == null || m == null || n < 2 || m < 1 || m >= n) return null;
    // Del mismo producto (decisión aprobada; mezclar categorías = Fase 5). El
    // beneficio se reparte parejo entre las líneas de ese producto con una razón.
    const paid = paidUnitsNxM(totalQty, n, m);
    return roundMoney(it.basePrice * it.quantity * (paid / totalQty));
  }
  return null; // FREE_SHIPPING no toca el precio del ítem
}

/**
 * Calcula el precio de todo el carrito aplicando las StorePromotion de tienda.
 * Agrupa por producto porque el N×M y el mínimo dependen de la cantidad TOTAL de
 * ese producto, no de cada línea suelta.
 *
 * Cuando varias StorePromotion alcanzan al mismo ítem se elige la MEJOR para el
 * comprador (menor total de línea), nunca se apilan — combinar dos promos sobre el
 * mismo ítem es una decisión aparte (combinesWithPromotions, Fase 3).
 */
export function priceCart(items: PricingItem[], opts?: PriceCartOptions): CartPricing {
  // Cantidad total por producto (todas las líneas del mismo producto suman).
  const totalQtyByProduct = new Map<string, number>();
  for (const it of items) {
    totalQtyByProduct.set(it.productId, (totalQtyByProduct.get(it.productId) ?? 0) + it.quantity);
  }

  // Subtotal SIN ninguna promo — es la base contra la que se mide la compra mínima
  // de las StorePromotion. Estable (no depende de qué promo aplique), sin circularidad.
  const preSubtotal = roundMoney(
    items.reduce((s, it) => s + it.basePrice * it.quantity, 0)
  );

  // Promos de tienda que superan su compra mínima. El resto ni se considera.
  const eligiblePromos = (opts?.promotions ?? []).filter((p) => preSubtotal >= p.minOrderAmount);

  const lines: PricedLine[] = [];
  let subtotal = 0;
  let promoSavings = 0;

  for (const it of items) {
    // El Map se llenó con todas las líneas arriba, así que la clave siempre está.
    const totalQty = totalQtyByProduct.get(it.productId)!;
    const baseLine = roundMoney(it.basePrice * it.quantity);

    // Cada StorePromotion de descuento que alcanza a este ítem es un candidato: se
    // parte del precio de lista y gana el menor total de línea (la mejor para el
    // comprador). No se apilan.
    let bestLine = baseLine;
    for (const p of eligiblePromos) {
      if (!promoMatchesItem(p, it)) continue;
      const cand = storePromoLineTotal(p, it, totalQty);
      if (cand != null && cand < bestLine) bestLine = cand;
    }

    const lineTotal = bestLine;
    const applies = lineTotal < baseLine - 0.001;
    const unitPrice = it.quantity > 0 ? roundMoney(lineTotal / it.quantity) : it.basePrice;
    const savings = roundMoney(baseLine - lineTotal);

    lines.push({
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
      unitPrice,
      lineTotal,
      promoApplied: applies,
      savings: applies ? savings : 0,
    });
    subtotal = roundMoney(subtotal + lineTotal);
    if (applies) promoSavings = roundMoney(promoSavings + savings);
  }

  // Envío gratis: alguna promo de envío elegible que alcance al carrito.
  const freeShipping = eligiblePromos.some(
    (p) => p.type === "FREE_SHIPPING" && promoMatchesCart(p, items)
  );

  // Cupón permitido salvo que una promo que SÍ toca el carrito prohíba combinarlo.
  const couponsAllowed = !eligiblePromos.some(
    (p) => !p.combinesWithCoupons && promoMatchesCart(p, items)
  );

  return { lines, subtotal, promoSavings, freeShipping, couponsAllowed };
}

// Progreso hacia el envío gratis: la promo FREE_SHIPPING que alcanza al carrito (por alcance)
// con el umbral más bajo TODAVÍA no alcanzado. Devuelve null si no hay promo de envío, si ya
// se alcanzó (envío ya gratis) o si ninguna aplica. Es para el empujón del carrito
// "agregá $X y el envío es gratis". Usa el MISMO preSubtotal que gate el motor.
export function freeShippingProgress(
  items: PricingItem[],
  promotions?: ActivePromotion[]
): { remaining: number; threshold: number } | null {
  if (!promotions?.length) return null;
  const preSubtotal = roundMoney(items.reduce((s, it) => s + it.basePrice * it.quantity, 0));
  let best: { remaining: number; threshold: number } | null = null;
  for (const p of promotions) {
    if (p.type !== "FREE_SHIPPING" || !promoMatchesCart(p, items)) continue;
    if (preSubtotal >= p.minOrderAmount) return null; // ya alcanzado → sin empujón
    if (!best || p.minOrderAmount < best.threshold) best = { remaining: p.minOrderAmount - preSubtotal, threshold: p.minOrderAmount };
  }
  return best;
}
