// Verificación ejecutable del motor de precios contra la TABLA DE CASOS CONGELADA
// de PROMOCIONES.md. No hay runner de tests en el repo, así que corre con:
//   npx tsx src/lib/pricing.check.ts
// Sale con código 1 si algún caso no da el número esperado.
//
// Producto base: precio $10.000. Los casos de mayorista (H/I/J) y cupón (K–O) NO
// están acá: pertenecen al resolvedor de precio base y al checkout, no al motor
// de promos. El motor aplica las StorePromotion (promociones a nivel tienda);
// eso es lo que cubren los casos SP-* y FS-*.

import { priceCart, resolveBasePrice, freeShippingProgress, type PricingItem, type ActivePromotion } from "./pricing";
import { costFloorCheck, fixedFloorError, fixedImpact, type CostFloorPromo, type CostFloorProduct } from "./promotions";
import { resolveProductPromo, describePromo, resolveStoreEvent } from "./promoDisplay";

const BASE = 10000;

function item(qty: number, basePrice = BASE, opts?: { productId?: string; category?: string | null }): PricingItem {
  return { productId: opts?.productId ?? "P", variantId: null, quantity: qty, basePrice, category: opts?.category };
}

// El MISMO producto en otra variante (talle/color). Son líneas distintas del
// carrito con el mismo productId — el caso que destapó B-11.
function variante(qty: number, variantId: string, basePrice = BASE): PricingItem {
  return { productId: "P", variantId, quantity: qty, basePrice, category: null };
}

// Fábrica de StorePromotion vigentes (el llamador ya filtró por fecha).
function promo(p: Partial<ActivePromotion> & { type: string }): ActivePromotion {
  return {
    name: p.name ?? null,
    type: p.type, value: p.value ?? null, minQty: p.minQty ?? null, payQty: p.payQty ?? null,
    minOrderAmount: p.minOrderAmount ?? 0, scope: p.scope ?? "ALL",
    categories: p.categories ?? [], productIds: p.productIds ?? [],
    combinesWithCoupons: p.combinesWithCoupons ?? false,
    // Presentación (no tocan el precio): el evento y su fin viajan con la promo.
    eventLabel: p.eventLabel ?? null,
    endsAt: p.endsAt ?? null,
  };
}

// Baseline sin ninguna promo: el subtotal es el precio de lista por cantidad.
const cases: { id: string; items: PricingItem[]; expectedSubtotal: number; desc: string }[] = [
  { id: "A", items: [item(1)], expectedSubtotal: 10000, desc: "1u, sin promo" },
  { id: "B", items: [item(3)], expectedSubtotal: 30000, desc: "3u, sin promo" },
];

let failed = 0;
for (const c of cases) {
  const result = priceCart(c.items);
  const ok = result.subtotal === c.expectedSubtotal;
  if (!ok) failed++;
  const mark = ok ? "OK  " : "FAIL";
  console.log(`${mark} [${c.id}] esperado $${c.expectedSubtotal.toLocaleString("es-AR")} · dio $${result.subtotal.toLocaleString("es-AR")} — ${c.desc}`);
}

// ── Precio base mayorista + escalones (casos H/I/J de la tabla) ──────────────
const wholesale = { retailPrice: 10000, precioMayorista: 8000, cantMinMayorista: 5, preciosEscalonados: [{ desde: 10, precio: 7000 }] };
const baseCases: { id: string; qty: number; expected: number; desc: string }[] = [
  { id: "H", qty: 4,  expected: 10000, desc: "mayorista min5, 4u → bajo el mínimo → retail" },
  { id: "I", qty: 5,  expected: 8000,  desc: "mayorista min5, 5u → precio mayorista" },
  { id: "J", qty: 10, expected: 7000,  desc: "escalón desde 10 → $7.000 (antes el checkout cobraba $8.000, B-01)" },
];
for (const c of baseCases) {
  const got = resolveBasePrice(wholesale, c.qty);
  const ok = got === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] base esperado $${c.expected.toLocaleString("es-AR")} · dio $${got.toLocaleString("es-AR")} — ${c.desc}`);
}

// ── StorePromotion: el motor que las lee (Fase 2, último paso) ───────────────
// Producto base $10.000 salvo aclaración. Cubre cada tipo, el gate de compra
// mínima, best-of entre dos promos, envío gratis y el gate de cupón.
const P1 = { productId: "P1", category: "remeras" as string | null };
const P2 = { productId: "P2", category: "pantalones" as string | null };
const spCases: {
  id: string; items: PricingItem[]; promotions: ActivePromotion[];
  expectedSubtotal: number; expectedFree?: boolean; expectedCoupons?: boolean; desc: string;
}[] = [
  { id: "SP-A", items: [item(1)], promotions: [promo({ type: "PERCENT", value: 20 })],
    expectedSubtotal: 8000, expectedCoupons: false, desc: "PERCENT 20% ALL, 1u → $8.000 · sin combinar cupón" },
  { id: "SP-B", items: [item(2)], promotions: [promo({ type: "FIXED", value: 3000 })],
    expectedSubtotal: 14000, desc: "FIXED $3.000/u ALL, 2u → $7.000 × 2" },
  { id: "SP-C", items: [item(1)], promotions: [promo({ type: "FIXED", value: 15000 })],
    expectedSubtotal: 0, desc: "FIXED $15.000/u sobre $10.000 → piso en 0, no negativo" },
  { id: "SP-D", items: [item(3)], promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "N_PAY_M 3×2 ALL, 3u → paga 2" },
  { id: "SP-E", items: [item(2, BASE, P1), item(1, BASE, P1)], promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "N_PAY_M 3×2 repartido en 2 líneas del mismo producto (2+1) → paga 2" },
  { id: "SP-F", items: [item(2)], promotions: [promo({ type: "PERCENT", value: 20 }), promo({ type: "PERCENT", value: 30 })],
    expectedSubtotal: 14000, desc: "best-of: dos %, gana 30% → $7.000 × 2" },
  { id: "SP-G", items: [item(2)], promotions: [promo({ type: "PERCENT", value: 20, minOrderAmount: 25000 })],
    expectedSubtotal: 20000, expectedCoupons: true, desc: "compra mínima $25k no alcanzada (2u=$20k) → no aplica" },
  { id: "SP-H", items: [item(3)], promotions: [promo({ type: "PERCENT", value: 20, minOrderAmount: 25000 })],
    expectedSubtotal: 24000, expectedCoupons: false, desc: "compra mínima $25k alcanzada (3u=$30k) → 20% off" },
  { id: "SP-I", items: [item(1, BASE, P1), item(1, BASE, P2)],
    promotions: [promo({ type: "PERCENT", value: 50, scope: "CATEGORY", categories: ["remeras"] })],
    expectedSubtotal: 15000, desc: "50% solo en 'remeras': P1 $5.000 + P2 $10.000" },
  { id: "SP-J", items: [item(1)], promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 8000 })],
    expectedSubtotal: 10000, expectedFree: true, desc: "envío gratis desde $8.000, compra $10.000 → gratis" },
  { id: "SP-K", items: [item(1)], promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 50000 })],
    expectedSubtotal: 10000, expectedFree: false, desc: "envío gratis desde $50.000, compra $10.000 → NO" },
  { id: "SP-L", items: [item(1)], promotions: [promo({ type: "PERCENT", value: 20, combinesWithCoupons: true })],
    expectedSubtotal: 8000, expectedCoupons: true, desc: "PERCENT 20% que SÍ combina con cupón" },

  // ── B-11: el mismo producto repartido en VARIAS líneas (talles/colores) ──────
  // La suite tenía N×M pero nunca partía el producto en 3+ líneas, y por eso no
  // agarró el bug: cada línea redondeaba su fracción por separado y siempre hacia
  // arriba. 3 líneas de 1 unidad daban $20.001 en vez de $20.000 — en contra del
  // comprador, y en el caso más común de una tienda de ropa (una prenda, 3 talles).
  { id: "SP-M", items: [variante(1, "S"), variante(1, "M"), variante(1, "L")],
    promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "B-11: 3×2 con la misma prenda en 3 talles → paga 2 exactas" },
  { id: "SP-N", items: [variante(1, "S"), variante(1, "M"), variante(1, "L"), variante(1, "XL"), variante(1, "XXL"), variante(1, "XXXL")],
    promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 40000, desc: "B-11: 6 talles con 3×2 → dos grupos, paga 4 exactas" },
  { id: "SP-O", items: [variante(1, "S"), variante(2, "M")],
    promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "B-11: partición 1+2 (la que ya daba bien) sigue dando bien" },
  { id: "SP-P", items: [variante(3, "S")],
    promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "B-11: una sola línea de 3 → sin cambios" },
];
for (const c of spCases) {
  const r = priceCart(c.items, { promotions: c.promotions });
  let ok = r.subtotal === c.expectedSubtotal;
  if (c.expectedFree !== undefined) ok = ok && r.freeShipping === c.expectedFree;
  if (c.expectedCoupons !== undefined) ok = ok && r.couponsAllowed === c.expectedCoupons;
  if (!ok) failed++;
  const extra = [
    c.expectedFree !== undefined ? `envíoGratis=${r.freeShipping}` : "",
    c.expectedCoupons !== undefined ? `cupónOK=${r.couponsAllowed}` : "",
  ].filter(Boolean).join(" ");
  console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] esperado $${c.expectedSubtotal.toLocaleString("es-AR")} · dio $${r.subtotal.toLocaleString("es-AR")} ${extra} — ${c.desc}`);
}

// ── B-12: con DOS promos de envío gratis, cuál se nombra no puede depender del
// orden en que la base las devuelva. Gana la del umbral más alto ya superado.
{
  const barata = promo({ type: "FREE_SHIPPING", minOrderAmount: 3000, name: "Envío gratis siempre" });
  const exigente = promo({ type: "FREE_SHIPPING", minOrderAmount: 8000, name: "Black Friday envío gratis" });
  const carrito = [item(1)]; // $10.000: supera los dos umbrales
  const normal = priceCart(carrito, { promotions: [barata, exigente] });
  const invertido = priceCart(carrito, { promotions: [exigente, barata] });
  const estable = normal.freeShippingPromo?.name === invertido.freeShippingPromo?.name;
  const gana = normal.freeShippingPromo?.name === "Black Friday envío gratis";
  const ok = estable && gana && normal.freeShipping;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} [SP-Q] dos envíos gratis → nombra "${normal.freeShippingPromo?.name}" sin importar el orden (invertido: "${invertido.freeShippingPromo?.name}") — B-12`);
}

// ── B-08: el cupón solo se bloquea si la promo REALMENTE dio algo ────────────
{
  const nxm = promo({ type: "N_PAY_M", minQty: 3, payQty: 2, combinesWithCoupons: false });
  const envio = promo({ type: "FREE_SHIPPING", minOrderAmount: 8000, combinesWithCoupons: false });
  const casos: { id: string; r: ReturnType<typeof priceCart>; esperado: boolean; desc: string }[] = [
    { id: "CG-A", r: priceCart([item(1)], { promotions: [nxm] }), esperado: true,
      desc: "3×2 con 1 sola unidad: no descontó nada → el cupón SIGUE permitido" },
    { id: "CG-B", r: priceCart([item(3)], { promotions: [nxm] }), esperado: false,
      desc: "3×2 con 3 unidades: sí descontó → cupón bloqueado (correcto)" },
    { id: "CG-C", r: priceCart([item(1)], { promotions: [envio] }), esperado: false,
      desc: "envío gratis otorgado: bloquea aunque no haya ahorro de línea" },
    { id: "CG-D", r: priceCart([item(1, 5000)], { promotions: [envio] }), esperado: true,
      desc: "envío gratis NO alcanzado ($5.000 < $8.000) → cupón permitido" },
  ];
  for (const c of casos) {
    const ok = c.r.couponsAllowed === c.esperado;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] cupónOK=${c.r.couponsAllowed} — ${c.desc}`);
  }
}

// ── B-07: el candado del monto fijo. Ningún producto puede quedar en $0 ───────
{
  const prods = [
    { id: "A", name: "Remera básica", price: 22000, category: "remeras" },
    { id: "B", name: "Llavero", price: 4000, category: "accesorios" },
  ];
  const fixed = (value: number, scope = "ALL", cats: string[] = [], ids: string[] = []) =>
    ({ type: "FIXED", value, scope, categories: cats, productIds: ids });

  const casos: { id: string; err: string | null; debeFrenar: boolean; desc: string }[] = [
    { id: "FF-A", err: fixedFloorError(fixed(5000), prods), debeFrenar: true,
      desc: "$5.000 en toda la tienda con un producto de $4.000 → FRENA" },
    { id: "FF-B", err: fixedFloorError(fixed(3000), prods), debeFrenar: false,
      desc: "$3.000 en toda la tienda: nadie llega a $0 → pasa" },
    { id: "FF-C", err: fixedFloorError(fixed(5000, "CATEGORY", ["remeras"]), prods), debeFrenar: false,
      desc: "$5.000 solo en remeras: el llavero está fuera de alcance → pasa" },
    { id: "FF-D", err: fixedFloorError(fixed(22000, "PRODUCTS", [], ["A"]), prods), debeFrenar: true,
      desc: "monto IGUAL al precio (no solo mayor) → FRENA" },
  ];
  for (const c of casos) {
    const ok = (c.err !== null) === c.debeFrenar;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] ${c.err ? "frenó" : "pasó"} — ${c.desc}`);
  }

  // ── F6-C4: el impacto que se muestra en vivo mientras se tipea el monto ─────
  // Lo que se congela acá es el NÚMERO que ve el dueño antes de guardar: si el
  // peor caso o el % se calculan mal, el panel da un consejo falso — peor que no
  // dar ninguno.
  const impCasos: { id: string; imp: ReturnType<typeof fixedImpact>; peor: string | null; pct: number | null; libres: number; hondos: number; desc: string }[] = [
    { id: "FI-A", imp: fixedImpact(fixed(3000), prods), peor: "Llavero", pct: 75, libres: 0, hondos: 1,
      desc: "el peor caso es el MÁS BARATO, no el primero de la lista: $3.000 sobre $4.000 = 75%" },
    { id: "FI-B", imp: fixedImpact(fixed(2000), prods), peor: "Llavero", pct: 50, libres: 0, hondos: 1,
      desc: "justo en el umbral (50%) → ya avisa" },
    { id: "FI-C", imp: fixedImpact(fixed(1000), prods), peor: "Llavero", pct: 25, libres: 0, hondos: 0,
      desc: "descuento suave → sin aviso, pero igual muestra la línea" },
    { id: "FI-D", imp: fixedImpact(fixed(5000), prods), peor: "Llavero", pct: 100, libres: 1, hondos: 0,
      desc: "gratis: el % se topea en 100 (no 125) y sale de `hondos` para no contarse dos veces" },
    { id: "FI-E", imp: fixedImpact(fixed(5000, "CATEGORY", ["remeras"]), prods), peor: "Remera básica", pct: 23, libres: 0, hondos: 0,
      desc: "el alcance manda: sin el llavero, el mismo monto pasa a ser un 23%" },
    { id: "FI-F", imp: fixedImpact({ type: "PERCENT", value: 5000, scope: "ALL", categories: [], productIds: [] }, prods), peor: null, pct: null, libres: 0, hondos: 0,
      desc: "no es monto fijo → no se calcula nada" },
  ];
  for (const c of impCasos) {
    const peor = c.imp.worst?.name ?? null;
    const pct = c.imp.worst?.pct ?? null;
    const ok = peor === c.peor && pct === c.pct && c.imp.free.length === c.libres && c.imp.deep.length === c.hondos;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] peor=${peor} ${pct}% · gratis=${c.imp.free.length} · hondos=${c.imp.deep.length} — ${c.desc}`);
  }
}

// ── Mix & match (Fase 5): llevá N MEZCLANDO productos, el más barato gratis ───
// A diferencia del N×M (mismo producto), junta las unidades elegibles de productos
// DISTINTOS del alcance y regala las más baratas del pool.
const M1 = { productId: "M1", category: "remeras" as string | null };
const M2 = { productId: "M2", category: "remeras" as string | null };
const M3 = { productId: "M3", category: "pantalones" as string | null };
const mixCases: {
  id: string; items: PricingItem[]; promotions: ActivePromotion[];
  expectedSubtotal: number; desc: string;
}[] = [
  { id: "MX-A", items: [item(1, 10000, M1), item(1, 10000, M2), item(1, 10000, M3)],
    promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "3 productos distintos a $10.000, mix 3×2 → 1 gratis" },
  { id: "MX-B", items: [item(1, 10000, M1), item(1, 6000, M2), item(1, 4000, M3)],
    promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 16000, desc: "mix 3×2 con precios distintos → se regala el MÁS BARATO ($4.000)" },
  { id: "MX-C", items: [item(1, 10000, M1), item(1, 10000, M2)],
    promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "solo 2 unidades: no se completa el grupo de 3 → sin descuento" },
  { id: "MX-D", items: [item(2, 10000, M1), item(2, 5000, M2), item(2, 3000, M3)],
    promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 30000, desc: "6 unidades = 2 grupos → 2 gratis (las 2 de $3.000)" },
  { id: "MX-E", items: [item(1, 10000, M1), item(1, 6000, M2), item(1, 10000, M3)],
    promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2, scope: "CATEGORY", categories: ["remeras"] })],
    expectedSubtotal: 26000, desc: "mix solo en 'remeras': el pantalón no cuenta → 2 elegibles, sin descuento" },
  { id: "MX-F", items: [item(1, 10000, M1), item(1, 10000, M2), item(1, 10000, M3)],
    promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 }), promo({ type: "PERCENT", value: 20 })],
    expectedSubtotal: 20000, desc: "best-of: mix ($20.000) le gana al 20% por ítem ($24.000)" },
  { id: "MX-G", items: [item(1, 10000, M1), item(1, 10000, M2)],
    promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 }), promo({ type: "PERCENT", value: 50 })],
    expectedSubtotal: 10000, desc: "best-of: el mix no llega al grupo → gana el 50% por ítem" },
];
for (const c of mixCases) {
  const r = priceCart(c.items, { promotions: c.promotions });
  const ok = r.subtotal === c.expectedSubtotal;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] esperado $${c.expectedSubtotal.toLocaleString("es-AR")} · dio $${r.subtotal.toLocaleString("es-AR")} — ${c.desc}`);
}

// ── Qué promos ganaron (para nombrarlas en el email/comprobante) ──────────────
// El motor no solo dice CUÁNTO se ahorró: dice QUÉ promo lo hizo y cuánto aportó.
const dcheck0 = (id: string, got: boolean, desc: string) => { if (!got) failed++; console.log(`${got ? "OK  " : "FAIL"} [${id}] ${desc}`); };
{
  const r = priceCart([item(1)], { promotions: [promo({ name: "Verano en remeras", type: "PERCENT", value: 20 })] });
  const a = r.appliedPromos[0];
  dcheck0("AP-A", r.appliedPromos.length === 1 && a.name === "Verano en remeras" && a.label === "20% OFF" && a.savings === 2000,
    "20% con nombre → 1 promo aplicada, etiqueta '20% OFF', ahorro $2.000");
}
{
  const r = priceCart([item(1, 10000, M1), item(1, 6000, M2), item(1, 4000, M3)],
    { promotions: [promo({ name: "Combo verano", type: "MIX_N_PAY_M", minQty: 3, payQty: 2 })] });
  const a = r.appliedPromos[0];
  dcheck0("AP-B", r.appliedPromos.length === 1 && a.name === "Combo verano" && a.label === "3×2" && a.savings === 4000,
    "mix 3×2 → la promo reportada es el combo, ahorro $4.000 (el más barato)");
}
{
  // Dos promos que tocan productos distintos → las dos se reportan por separado.
  const r = priceCart([item(1, 10000, P1), item(1, 10000, P2)], {
    promotions: [
      promo({ name: "Remeras 20", type: "PERCENT", value: 20, scope: "CATEGORY", categories: ["remeras"] }),
      promo({ name: "Pantalones 50", type: "PERCENT", value: 50, scope: "CATEGORY", categories: ["pantalones"] }),
    ],
  });
  const byName = Object.fromEntries(r.appliedPromos.map((a) => [a.name, a.savings]));
  dcheck0("AP-C", r.appliedPromos.length === 2 && byName["Pantalones 50"] === 5000 && byName["Remeras 20"] === 2000,
    "dos promos por categoría → se reportan las dos con su ahorro cada una");
}
{
  const r = priceCart([item(1)], { promotions: [promo({ name: "Envío gratis verano", type: "FREE_SHIPPING", minOrderAmount: 5000 })] });
  dcheck0("AP-D", r.freeShipping && r.freeShippingPromo?.name === "Envío gratis verano" && r.appliedPromos.length === 0,
    "envío gratis → se reporta cuál promo lo dio, y no cuenta como ahorro de producto");
}
{
  const r = priceCart([item(1)]);
  dcheck0("AP-E", r.appliedPromos.length === 0 && r.freeShippingPromo === null, "sin promos → nada que reportar");
}

// ── Envío gratis en vivo: cuánto falta para el umbral ────────────────────────
const fsCases: { id: string; items: PricingItem[]; promotions: ActivePromotion[]; expected: number | null; desc: string }[] = [
  { id: "FS-A", items: [item(1)], promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 8000 })],
    expected: null, desc: "$10.000 ≥ umbral $8.000 → ya gratis, sin empujón" },
  { id: "FS-B", items: [item(1)], promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 15000 })],
    expected: 5000, desc: "$10.000 vs umbral $15.000 → faltan $5.000" },
  { id: "FS-C", items: [item(1)], promotions: [promo({ type: "PERCENT", value: 20 })],
    expected: null, desc: "no hay promo de envío → null" },
  { id: "FS-D", items: [item(1)],
    promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 50000 }), promo({ type: "FREE_SHIPPING", minOrderAmount: 15000 })],
    expected: 5000, desc: "dos umbrales ($50k y $15k) → el más cercano, faltan $5.000" },
];
for (const c of fsCases) {
  const r = freeShippingProgress(c.items, c.promotions);
  const got = r ? r.remaining : null;
  const ok = got === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] esperado ${c.expected === null ? "null" : "$" + c.expected.toLocaleString("es-AR")} · dio ${got === null ? "null" : "$" + got.toLocaleString("es-AR")} — ${c.desc}`);
}

// ── Piso de costo (Fase 3): aviso a la dueña, no frena al comprador ───────────
// A: precio $10.000, costo $8.000 (remeras) · B: $10.000, costo $5.000 (remeras)
// · C: $10.000, SIN costo (pantalones).
const cfProducts: CostFloorProduct[] = [
  { id: "A", name: "A", price: 10000, costPrice: 8000, category: "remeras" },
  { id: "B", name: "B", price: 10000, costPrice: 5000, category: "remeras" },
  { id: "C", name: "C", price: 10000, costPrice: null, category: "pantalones" },
];
const cf = (p: Partial<CostFloorPromo> & { type: string }): CostFloorPromo => ({
  type: p.type, value: p.value ?? null, minQty: p.minQty ?? null, payQty: p.payQty ?? null,
  scope: p.scope ?? "ALL", categories: p.categories ?? [], productIds: p.productIds ?? [],
});
const cfCases: { id: string; promo: CostFloorPromo; below: number; missing: number; desc: string }[] = [
  { id: "CF-A", promo: cf({ type: "PERCENT", value: 30 }), below: 1, missing: 1, desc: "30% ALL → A a $7.000 < $8.000 bajo costo; C sin costo" },
  { id: "CF-B", promo: cf({ type: "PERCENT", value: 15 }), below: 0, missing: 1, desc: "15% ALL → A a $8.500 > $8.000, nadie bajo costo" },
  { id: "CF-C", promo: cf({ type: "PERCENT", value: 30, scope: "CATEGORY", categories: ["remeras"] }), below: 1, missing: 0, desc: "30% solo remeras → A bajo costo, C fuera de alcance" },
  { id: "CF-D", promo: cf({ type: "FIXED", value: 6000 }), below: 2, missing: 1, desc: "$6.000 off ALL → A y B a $4.000, ambos bajo costo" },
  { id: "CF-E", promo: cf({ type: "N_PAY_M", minQty: 3, payQty: 2 }), below: 1, missing: 1, desc: "3×2 ALL → $6.666,67/u: A bajo $8.000, B no ($5.000)" },
  { id: "CF-F", promo: cf({ type: "FREE_SHIPPING" }), below: 0, missing: 0, desc: "envío gratis → no toca precio, nunca bajo costo" },
  { id: "CF-G", promo: cf({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 }), below: 1, missing: 1, desc: "mix 3×2 ALL → mismo piso que el N×M: A bajo costo, B no" },
];
for (const c of cfCases) {
  const r = costFloorCheck(c.promo, cfProducts);
  const ok = r.below.length === c.below && r.missingCost === c.missing;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] bajo costo=${r.below.length} (esp ${c.below}) · sin costo=${r.missingCost} (esp ${c.missing}) — ${c.desc}`);
}

// ── Display por producto (Fase 4.5): cómo se muestra la promo en la card ──────
// Producto $10.000, categoría "remeras".
const dp = { id: "P1", price: 10000, category: "remeras" as string | null };
const dcheck = (id: string, got: boolean, desc: string) => { if (!got) failed++; console.log(`${got ? "OK  " : "FAIL"} [${id}] ${desc}`); };
{
  const r = resolveProductPromo(dp, [promo({ type: "PERCENT", value: 20 })]);
  dcheck("DP-A", r.hasPriceDrop && r.effectivePrice === 8000 && r.pctOff === 20 && r.badge === "-20%", "20% sin mínimo → tacha $10.000, muestra $8.000, badge -20%");
}
{
  const r = resolveProductPromo(dp, [promo({ type: "PERCENT", value: 20, minOrderAmount: 50000 })]);
  dcheck("DP-B", !r.hasPriceDrop && r.pctOff === 20 && r.minOrder === 50000 && r.badge === null, "20% con mínimo $50k → no tacha, sin badge fuerte (nota condicional en la card)");
}
{
  const r = resolveProductPromo(dp, [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })]);
  dcheck("DP-C", !r.hasPriceDrop && r.nxm?.n === 3 && r.nxm?.m === 2 && r.badge === "3×2", "3×2 → badge 3×2, sin tachar el unitario");
}
{
  const r = resolveProductPromo(dp, [promo({ type: "FIXED", value: 2000 })]);
  dcheck("DP-D", r.hasPriceDrop && r.effectivePrice === 8000 && r.pctOff === 20, "FIXED $2.000 → $8.000 (equivale a 20%)");
}
{
  const r = resolveProductPromo(dp, [promo({ type: "FREE_SHIPPING", minOrderAmount: 30000 })]);
  dcheck("DP-E", !r.hasPriceDrop && r.freeShipping && r.minOrder === 30000 && r.badge === "Envío gratis", "envío gratis desde $30k → badge corto + minOrder para la nota");
}
{
  const r = resolveProductPromo(dp, [promo({ type: "PERCENT", value: 20 }), promo({ type: "PERCENT", value: 30 })]);
  dcheck("DP-F", r.effectivePrice === 7000 && r.pctOff === 30, "best-of: dos %, gana 30% → $7.000");
}
{
  const r = resolveProductPromo(dp, [promo({ type: "PERCENT", value: 50, scope: "CATEGORY", categories: ["pantalones"] })]);
  dcheck("DP-G", !r.hasPriceDrop && r.badge === null, "50% en pantalones → no alcanza a la remera, sin badge");
}
{
  const r = resolveProductPromo(dp, [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 })]);
  const d = r.primaryPromo ? describePromo(r.primaryPromo) : null;
  dcheck("DP-H", !r.hasPriceDrop && r.nxm?.n === 3 && r.badge === "3×2" && !!d?.conditions.some(c => c.includes("gratis")),
    "mix 3×2 → badge 3×2 + el bloque avisa que el más barato sale gratis");
}

// ── Evento comercial (Black Friday y compañía) ───────────────────────────────
// Es presentación pura: ninguno de estos casos puede mover un precio.
{
  const p = promo({ type: "PERCENT", value: 20, eventLabel: "Black Friday" });
  const d = describePromo(p);
  dcheck("EV-A", d.headline === "BLACK FRIDAY · 20% OFF" && d.event === "Black Friday",
    "con evento → el titular lo lleva adelante en mayúsculas");
}
{
  const d = describePromo(promo({ type: "PERCENT", value: 20 }));
  dcheck("EV-B", d.headline === "20% OFF" && d.event === null,
    "sin evento → titular igual que antes (no rompe lo que ya andaba)");
}
{
  // Un evento en blanco no debe ensuciar el tag con un separador suelto.
  const d = describePromo(promo({ type: "PERCENT", value: 20, eventLabel: "   " }));
  dcheck("EV-C", d.headline === "20% OFF" && d.event === null, "evento en blanco → se ignora");
}
{
  const conEvento = promo({ type: "PERCENT", value: 20, eventLabel: "Black Friday" });
  const sinEvento = promo({ type: "PERCENT", value: 20 });
  const a = resolveProductPromo(dp, [conEvento]).effectivePrice;
  const b = resolveProductPromo(dp, [sinEvento]).effectivePrice;
  dcheck("EV-D", a === b && a === 8000, "el evento no cambia el precio: mismo número con y sin");
}
{
  // Dos eventos pisados: gana el que termina antes, sin importar el orden de entrada.
  const bf = promo({ type: "PERCENT", value: 20, eventLabel: "Black Friday", endsAt: "2026-11-27T00:00:00Z" });
  const cm = promo({ type: "PERCENT", value: 20, eventLabel: "Cyber Monday", endsAt: "2026-11-30T00:00:00Z" });
  const r1 = resolveStoreEvent([bf, cm]);
  const r2 = resolveStoreEvent([cm, bf]);
  dcheck("EV-E", r1?.label === "Black Friday" && r2?.label === "Black Friday",
    "dos eventos → gana el que termina antes, y no depende del orden");
}
{
  // Con fin y sin fin: el que tiene fecha comunica urgencia, va primero.
  const conFin = promo({ type: "PERCENT", value: 20, eventLabel: "Black Friday", endsAt: "2026-11-27T00:00:00Z" });
  const sinFin = promo({ type: "PERCENT", value: 20, eventLabel: "Liquidación" });
  dcheck("EV-F", resolveStoreEvent([sinFin, conFin])?.label === "Black Friday",
    "el que tiene fecha de fin gana al que no la tiene");
}
{
  const sinFin = promo({ type: "PERCENT", value: 20, eventLabel: "Liquidación" });
  const r = resolveStoreEvent([sinFin]);
  dcheck("EV-G", r?.label === "Liquidación" && r.endsAt === null,
    "sin fecha de fin → el evento igual nombra al filtro, sin fecha que mostrar");
}
{
  dcheck("EV-H", resolveStoreEvent([promo({ type: "PERCENT", value: 20 })]) === null && resolveStoreEvent([]) === null,
    "sin promos con evento → el filtro se llama como siempre");
}

console.log(failed === 0 ? "\n✅ Todos los casos dan el número congelado." : `\n❌ ${failed} caso(s) no coinciden.`);
process.exit(failed === 0 ? 0 : 1);
