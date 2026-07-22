// Validación y estado de las promociones (StorePromotion). El form valida para la
// UX; ESTO valida para seguridad — el server es la autoridad, un POST directo por
// consola no puede meter un "500% off" ni un "llevá 2 pagá 3". Ver PROMOCIONES.md
// (reglas transversales · coherencia por tipo).

import { priceCart, MIN_PRICE_RATIO, type ActivePromotion } from "./pricing";

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

// ── Candado del monto fijo: ningún producto puede quedar en $0 (B-07) ─────────
// El motor pisa el precio en 0 (`Math.max(0, base - value)`), así que un FIXED
// mayor o igual al precio REGALA el producto. `PERCENT` ya está topeado en 90
// justamente para que eso no pase ("un 100% regala el producto, casi siempre es
// un error de tipeo") — esto es la misma regla, aplicada al tipo que no la tenía.
//
// Es el ÚNICO lugar de la sección donde se bloquea en vez de avisar: no es una
// opinión sobre el negocio (liquidar bajo costo es válido y por eso el piso de
// costo solo avisa), es que "gratis" no es un resultado que el sistema acepte.
//
// ⚠️ Con scope=ALL esto mira el catálogo de HOY: un producto cargado después
// puede caer bajo la promo y quedar gratis sin que nadie revise (F6-C9, pendiente).
export type FixedFloorProduct = { name: string; price: number; category: string | null; id: string };

// ── Montos escritos a mano, a la argentina (B-13) ────────────────────────────
// "5.000" son cinco mil, no cinco: acá el punto separa MILES y la coma decimales.
// El parseo anterior mandaba el texto crudo a `parseFloat`, que lee el punto como
// decimal — así que quien escribía "5.000" en el monto de descuento guardaba $5.
// Y el placeholder del campo dice justamente "$ 5.000": el ejemplo enseñaba la
// forma que se rompía. Solo salía bien tipeando "50000" de corrido.
//
// Vive en la librería y no en la pantalla para poder congelarlo en la suite: es
// la puerta por la que entra la plata que después cobra el motor.

export function parseMoneyInput(s: string): number {
  const limpio = String(s).replace(/[^\d.,]/g, "");
  const ultimaComa = limpio.lastIndexOf(",");
  // Con coma, ELLA manda: lo de la izquierda son miles (se tiran los puntos) y lo
  // de la derecha, decimales. Sin coma, todos los puntos son de miles — nadie
  // escribe "5.50" por cinco pesos con cincuenta, y menos en un monto de promo.
  const normalizado = ultimaComa === -1
    ? limpio.replace(/\./g, "")
    : limpio.slice(0, ultimaComa).replace(/[.,]/g, "") + "." + limpio.slice(ultimaComa + 1).replace(/[.,]/g, "");
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : 0;
}

/**
 * El camino de vuelta: un número del sistema escrito como se escribe en el campo.
 * Hace falta al EDITAR — `String(5000.5)` da "5000.5", con punto decimal a la
 * inglesa, que el parseo de arriba leería como 50005. Abrir una promo y guardarla
 * sin tocar nada no puede multiplicar el monto por mil.
 */
export function moneyInputValue(n: number): string {
  return String(n).replace(".", ",");
}

// Qué productos alcanza una promo. Estaba escrito tres veces igual (candado del
// monto fijo, piso de costo, impacto): tres copias de la misma regla son tres
// lugares donde puede quedar desincronizada, que es exactamente lo que causó B-10.
type ScopeFields = { scope: string; categories: string[]; productIds: string[] };

export function productsInScope<T extends { id: string; category: string | null }>(
  promo: ScopeFields, products: T[]
): T[] {
  return products.filter((p) =>
    promo.scope === "ALL" ? true :
    promo.scope === "CATEGORY" ? (p.category != null && promo.categories.includes(p.category)) :
    promo.scope === "PRODUCTS" ? promo.productIds.includes(p.id) : false
  );
}

// ── Impacto de un monto fijo, producto por producto (F6-C4) ──────────────────
// El mismo monto es un descuento suave o una regalada según a qué le caiga:
// $5.000 es un 23% sobre $22.000 y un 83% sobre $6.000. Nadie tiene ese cálculo
// en la cabeza mientras tipea, así que lo hace el panel y lo muestra en vivo.
//
// Devuelve los tres cortes que necesita la pantalla: el PEOR caso (una línea bajo
// el campo), los que TOCAN EL PISO del motor (lo único que bloquea, B-07) y los
// que pasan el umbral de descuento profundo (aviso en Revisá, no bloquea).

/** A partir de acá el descuento se avisa: más de la mitad del precio del producto. */
export const DEEP_DISCOUNT_PCT = 50;

/**
 * El descuento más profundo que un monto fijo puede llegar a dar: el mismo que el
 * tope del porcentaje. Pasado esto, el motor pisa el precio (`MIN_PRICE_RATIO`) y
 * la promo dejaría de cumplirse como está escrita — así que se frena al configurar
 * en vez de recortar en silencio.
 */
export const MAX_FIXED_DISCOUNT_PCT = MAX_PROMO_PERCENT;

export type FixedImpactItem = { id: string; name: string; price: number; effective: number; pct: number };
export type FixedImpactResult = {
  inScope: number;               // productos con precio cargado dentro del alcance
  worst: FixedImpactItem | null; // el de descuento más profundo (= el más barato)
  capped: FixedImpactItem[];     // el motor tendría que pisarles el precio — esto SÍ frena (B-07)
  deep: FixedImpactItem[];       // pasan DEEP_DISCOUNT_PCT sin llegar al piso — solo avisan
};

const IMPACTO_VACIO: FixedImpactResult = { inScope: 0, worst: null, capped: [], deep: [] };

export function fixedImpact(
  promo: { type: string; value: number | null } & ScopeFields,
  products: FixedFloorProduct[]
): FixedImpactResult {
  if (promo.type !== "FIXED" || promo.value == null || !(promo.value > 0)) return IMPACTO_VACIO;
  const value = promo.value;
  const items = productsInScope(promo, products)
    .filter((p) => p.price > 0) // sin precio cargado no se puede juzgar
    .map((p) => {
      // EXACTAMENTE la misma cuenta que hace el motor. Si acá dijera otra cosa, el
      // panel prometería un precio y el checkout cobraría otro.
      const effective = Math.max(p.price * MIN_PRICE_RATIO, p.price - value);
      return { id: p.id, name: p.name, price: p.price, effective, pct: Math.round((1 - effective / p.price) * 100) };
    })
    // Del más profundo al más suave. A igual %, primero el más barato: entre dos
    // productos al piso, el que se nombra es el que más obviamente está mal.
    .sort((a, b) => b.pct - a.pct || a.price - b.price);

  // Tocó el piso = el monto pedido supera lo que el motor va a descontar de verdad.
  // Se compara contra el precio y no contra `effective` para no depender del
  // redondeo del porcentaje mostrado.
  const tocaElPiso = (i: FixedImpactItem) => value > i.price * (MAX_FIXED_DISCOUNT_PCT / 100);

  return {
    inScope: items.length,
    worst: items[0] ?? null,
    capped: items.filter(tocaElPiso),
    deep: items.filter((i) => !tocaElPiso(i) && i.pct >= DEEP_DISCOUNT_PCT),
  };
}

export function fixedFloorError(
  promo: { type: string; value: number | null } & ScopeFields,
  products: FixedFloorProduct[]
): string | null {
  // El más barato del alcance es el que define el riesgo: si ese sobrevive, todos.
  const peor = fixedImpact(promo, products).capped[0];
  if (!peor) return null;
  const ars = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");
  const maximo = Math.floor(peor.price * (MAX_FIXED_DISCOUNT_PCT / 100));
  return `Con ${ars(promo.value!)} de descuento, “${peor.name}” (${ars(peor.price)}) quedaría casi regalado. ` +
    `El máximo es ${MAX_FIXED_DISCOUNT_PCT}% de descuento — para ese producto, ${ars(maximo)}. ` +
    `Bajá el monto o sacalo del alcance.`;
}

// ── La otra puerta: un producto nuevo que cae bajo una promo fija (F6-C9) ────
// `fixedImpact` mira UNA promo contra el catálogo, y se usa al armar la promo.
// Esto es el espejo: UN producto contra las promos vigentes, para el momento en
// que se carga el producto.
//
// Hace falta porque el candado de B-07 protege una sola puerta. Se crea una promo
// de $12.000 off en toda la tienda —perfectamente sana con el catálogo de hoy— y
// tres semanas después se carga un producto de $10.000. Nadie revisa nada: el
// producto entra a una promo que lo regala. El chequeo tiene que estar también
// acá, donde se comete ese error.
export type PromoOnProduct = { promoName: string; value: number; effective: number; pct: number };

export function deepestFixedOnProduct(
  product: { id: string; price: number; category: string | null },
  promos: ({ name: string; type: string; value: number | null } & ScopeFields)[]
): PromoOnProduct | null {
  if (!(product.price > 0)) return null;
  let peor: PromoOnProduct | null = null;
  for (const p of promos) {
    // Se reusa el mismo cálculo que ve el dueño al armar la promo: si los dos
    // lados no dieran el mismo número, una pantalla contradiría a la otra.
    const w = fixedImpact(p, [{ id: product.id, name: "", price: product.price, category: product.category }]).worst;
    if (!w) continue;
    if (peor === null || w.pct > peor.pct) peor = { promoName: p.name, value: p.value!, effective: w.effective, pct: w.pct };
  }
  return peor;
}

// ── Promos que nacen muertas (F6-C7) ─────────────────────────────────────────
// Dos promos sobre la misma categoría NO se pisan: se reparten, y cada producto
// toma la que más le conviene al comprador. Por eso no se bloquea nada — con
// "20% en pantalones" + "$12.000 en pantalones", el barato toma el fijo y los
// caros toman el porcentaje, sin que nadie lo configure.
//
// Lo que sí hay que avisar es el caso en que la nueva promo **nunca** va a ganar:
// con un "30% en pantalones" ya activo, crear un "20% en pantalones" deja una
// promo que figura como Activa, con su nombre y su fecha, y es un adorno.
//
// Tres condiciones para animarse a decir "nunca", y las tres importan:
//   1. Solo entre PERCENT y FIXED. Un 3×2 descuenta o no según CUÁNTAS unidades
//      lleve el comprador, así que un % no está muerto porque exista un 3×2:
//      con una sola unidad, el 3×2 no da nada y el % sí.
//   2. La rival tiene que pedir un carrito igual o más chico. Si pide más, hay
//      compras donde la nueva es la única que aplica.
//   3. La rival tiene que cubrir TODA la vigencia de la nueva, no solaparse a
//      medias. Una que arranca a mitad de camino la tapa un rato, no siempre.
export type DeadPromoRival = {
  name: string; type: string; value: number | null; minOrderAmount: number;
  startsAt: Date | string | null; endsAt: Date | string | null;
  isActive: boolean; archivedAt: Date | string | null;
} & ScopeFields;

export type DeadPromoNew = {
  type: string; value: number | null; minOrderAmount: number;
  startsAt: Date | string | null; endsAt: Date | string | null;
} & ScopeFields;

function aFecha(v: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ¿La vigencia de `rival` cubre por completo la de `nueva`? (null = sin límite) */
function cubreLaVigencia(rival: DeadPromoRival, nueva: DeadPromoNew): boolean {
  const rd = aFecha(rival.startsAt), rh = aFecha(rival.endsAt);
  const nd = aFecha(nueva.startsAt), nh = aFecha(nueva.endsAt);
  if (rd && (!nd || rd > nd)) return false;   // la rival arranca después
  if (rh && (!nh || rh < nh)) return false;   // la rival termina antes
  return true;
}

const TIPOS_COMPARABLES = new Set(["PERCENT", "FIXED"]);

// Precio unitario bajo una promo DIRECTA. `minQty`/`payQty` van en null porque
// acá solo entran PERCENT y FIXED, que no dependen de la cantidad — es
// justamente lo que permite afirmar "nunca gana".
function precioDirecto(p: { type: string; value: number | null }, price: number): number | null {
  return promoEffectiveUnitPrice({ type: p.type, value: p.value, minQty: null, payQty: null }, price);
}

/**
 * Los nombres de las promos que dejan a `nueva` sin ningún producto donde ganar,
 * o null si en al menos uno conviene (o si no se puede juzgar con certeza).
 */
export function deadPromoCheck(
  nueva: DeadPromoNew, rivales: DeadPromoRival[], products: FixedFloorProduct[]
): { killers: string[] } | null {
  if (!TIPOS_COMPARABLES.has(nueva.type) || nueva.value == null || !(nueva.value > 0)) return null;

  const candidatas = rivales.filter((r) =>
    TIPOS_COMPARABLES.has(r.type) && r.value != null && r.value > 0 &&
    r.isActive && !r.archivedAt &&
    r.minOrderAmount <= nueva.minOrderAmount &&
    cubreLaVigencia(r, nueva)
  );
  if (!candidatas.length) return null;

  const enAlcance = productsInScope(nueva, products).filter((p) => p.price > 0);
  if (!enAlcance.length) return null; // sin productos que juzgar, no se afirma nada

  const killers = new Set<string>();
  for (const p of enAlcance) {
    const conLaNueva = precioDirecto(nueva, p.price);
    if (conLaNueva == null) return null;
    const tapa = candidatas.find((r) => {
      if (!productsInScope(r, [p]).length) return false;
      const conLaRival = precioDirecto(r, p.price);
      // `<=` y no `<`: si empatan, la nueva tampoco aporta nada (es el caso de
      // crear dos veces la misma promo sin darse cuenta).
      return conLaRival != null && conLaRival <= conLaNueva;
    });
    if (!tapa) return null; // gana en al menos un producto → está viva
    killers.add(tapa.name);
  }
  return { killers: [...killers] };
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
  const inScope = productsInScope(promo, products);
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
