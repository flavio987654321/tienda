// Verificación ejecutable del motor de precios contra la TABLA DE CASOS CONGELADA
// de PROMOCIONES.md. No hay runner de tests en el repo, así que corre con:
//   npx tsx src/lib/pricing.check.ts
// Sale con código 1 si algún caso no da el número esperado.
//
// Producto base: precio $10.000. Los casos de mayorista (H/I/J) y cupón (K–O) NO
// están acá: pertenecen al resolvedor de precio base y al checkout, no al motor
// de promos. Este archivo cubre A–G (la cuenta de promos, que es lo que priceCart hace).

import { priceCart, resolveBasePrice, type PricingItem, type ActivePromotion, PROMO_PERCENT, PROMO_N_PAY_M } from "./pricing";

const BASE = 10000;
const NO_PROMO = { promoType: null, promoQtyMin: null, promoPayQty: null, promoQtyDiscount: null };
const PERCENT_25 = { promoType: PROMO_PERCENT, promoQtyMin: 3, promoPayQty: null, promoQtyDiscount: 25 };
const N3_PAY_2 = { promoType: PROMO_N_PAY_M, promoQtyMin: 3, promoPayQty: 2, promoQtyDiscount: null };

function item(qty: number, promo: PricingItem["promo"], basePrice = BASE, opts?: { productId?: string; category?: string | null }): PricingItem {
  return { productId: opts?.productId ?? "P", variantId: null, quantity: qty, basePrice, promo, category: opts?.category };
}

// Fábrica de StorePromotion vigentes (el llamador ya filtró por fecha).
function promo(p: Partial<ActivePromotion> & { type: string }): ActivePromotion {
  return {
    type: p.type, value: p.value ?? null, minQty: p.minQty ?? null, payQty: p.payQty ?? null,
    minOrderAmount: p.minOrderAmount ?? 0, scope: p.scope ?? "ALL",
    categories: p.categories ?? [], productIds: p.productIds ?? [],
    combinesWithCoupons: p.combinesWithCoupons ?? false,
  };
}

const cases: { id: string; items: PricingItem[]; expectedSubtotal: number; desc: string }[] = [
  { id: "A", items: [item(1, NO_PROMO)],   expectedSubtotal: 10000, desc: "1u, sin promo" },
  { id: "B", items: [item(3, NO_PROMO)],   expectedSubtotal: 30000, desc: "3u, sin promo" },
  { id: "C", items: [item(2, PERCENT_25)], expectedSubtotal: 20000, desc: "PERCENT 25% min3, 2u → bajo el mínimo" },
  { id: "D", items: [item(3, PERCENT_25)], expectedSubtotal: 22500, desc: "PERCENT 25% min3, 3u → $7.500 × 3" },
  { id: "E", items: [item(3, N3_PAY_2)],   expectedSubtotal: 20000, desc: "3×2, 3u → paga 2" },
  { id: "F", items: [item(4, N3_PAY_2)],   expectedSubtotal: 30000, desc: "3×2, 4u → paga 3" },
  { id: "G", items: [item(6, N3_PAY_2)],   expectedSubtotal: 40000, desc: "3×2, 6u → paga 4" },
  // Extra: dos líneas del MISMO producto (variantes distintas) que juntas activan la promo.
  { id: "H", items: [item(2, N3_PAY_2), item(1, N3_PAY_2)], expectedSubtotal: 20000, desc: "3×2 repartido en 2 líneas (2+1) → paga 2" },
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
// Producto base $10.000 salvo aclaración. Cubre cada tipo, best-of contra la promo
// del producto, el gate de compra mínima, envío gratis y el gate de cupón.
const P1 = { productId: "P1", category: "remeras" as string | null };
const P2 = { productId: "P2", category: "pantalones" as string | null };
const spCases: {
  id: string; items: PricingItem[]; promotions: ActivePromotion[];
  expectedSubtotal: number; expectedFree?: boolean; expectedCoupons?: boolean; desc: string;
}[] = [
  { id: "SP-A", items: [item(1, NO_PROMO)], promotions: [promo({ type: "PERCENT", value: 20 })],
    expectedSubtotal: 8000, expectedCoupons: false, desc: "PERCENT 20% ALL, 1u → $8.000 · sin combinar cupón" },
  { id: "SP-B", items: [item(2, NO_PROMO)], promotions: [promo({ type: "FIXED", value: 3000 })],
    expectedSubtotal: 14000, desc: "FIXED $3.000/u ALL, 2u → $7.000 × 2" },
  { id: "SP-C", items: [item(1, NO_PROMO)], promotions: [promo({ type: "FIXED", value: 15000 })],
    expectedSubtotal: 0, desc: "FIXED $15.000/u sobre $10.000 → piso en 0, no negativo" },
  { id: "SP-D", items: [item(3, NO_PROMO)], promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })],
    expectedSubtotal: 20000, desc: "N_PAY_M 3×2 ALL, 3u → paga 2" },
  { id: "SP-E", items: [item(3, PERCENT_25)], promotions: [promo({ type: "PERCENT", value: 20 })],
    expectedSubtotal: 22500, desc: "best-of: promo producto 25% gana a la de tienda 20% → $22.500" },
  { id: "SP-F", items: [item(2, PERCENT_25)], promotions: [promo({ type: "PERCENT", value: 30 })],
    expectedSubtotal: 14000, desc: "best-of: producto no llega al mínimo, gana tienda 30% → $14.000" },
  { id: "SP-G", items: [item(2, NO_PROMO)], promotions: [promo({ type: "PERCENT", value: 20, minOrderAmount: 25000 })],
    expectedSubtotal: 20000, expectedCoupons: true, desc: "compra mínima $25k no alcanzada (2u=$20k) → no aplica" },
  { id: "SP-H", items: [item(3, NO_PROMO)], promotions: [promo({ type: "PERCENT", value: 20, minOrderAmount: 25000 })],
    expectedSubtotal: 24000, expectedCoupons: false, desc: "compra mínima $25k alcanzada (3u=$30k) → 20% off" },
  { id: "SP-I", items: [item(1, NO_PROMO, BASE, P1), item(1, NO_PROMO, BASE, P2)],
    promotions: [promo({ type: "PERCENT", value: 50, scope: "CATEGORY", categories: ["remeras"] })],
    expectedSubtotal: 15000, desc: "50% solo en 'remeras': P1 $5.000 + P2 $10.000" },
  { id: "SP-J", items: [item(1, NO_PROMO)], promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 8000 })],
    expectedSubtotal: 10000, expectedFree: true, desc: "envío gratis desde $8.000, compra $10.000 → gratis" },
  { id: "SP-K", items: [item(1, NO_PROMO)], promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 50000 })],
    expectedSubtotal: 10000, expectedFree: false, desc: "envío gratis desde $50.000, compra $10.000 → NO" },
  { id: "SP-L", items: [item(1, NO_PROMO)], promotions: [promo({ type: "PERCENT", value: 20, combinesWithCoupons: true })],
    expectedSubtotal: 8000, expectedCoupons: true, desc: "PERCENT 20% que SÍ combina con cupón" },
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

console.log(failed === 0 ? "\n✅ Todos los casos dan el número congelado." : `\n❌ ${failed} caso(s) no coinciden.`);
process.exit(failed === 0 ? 0 : 1);
