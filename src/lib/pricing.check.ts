// Verificación ejecutable del motor de precios contra la TABLA DE CASOS CONGELADA
// de PROMOCIONES.md. No hay runner de tests en el repo, así que corre con:
//   npx tsx src/lib/pricing.check.ts
// Sale con código 1 si algún caso no da el número esperado.
//
// Producto base: precio $10.000. Los casos de mayorista (H/I/J) y cupón (K–O) NO
// están acá: pertenecen al resolvedor de precio base y al checkout, no al motor
// de promos. Este archivo cubre A–G (la cuenta de promos, que es lo que priceCart hace).

import { priceCart, resolveBasePrice, type PricingItem, PROMO_PERCENT, PROMO_N_PAY_M } from "./pricing";

const BASE = 10000;
const NO_PROMO = { promoType: null, promoQtyMin: null, promoPayQty: null, promoQtyDiscount: null };
const PERCENT_25 = { promoType: PROMO_PERCENT, promoQtyMin: 3, promoPayQty: null, promoQtyDiscount: 25 };
const N3_PAY_2 = { promoType: PROMO_N_PAY_M, promoQtyMin: 3, promoPayQty: 2, promoQtyDiscount: null };

function item(qty: number, promo: PricingItem["promo"], basePrice = BASE): PricingItem {
  return { productId: "P", variantId: null, quantity: qty, basePrice, promo };
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

console.log(failed === 0 ? "\n✅ Todos los casos dan el número congelado." : `\n❌ ${failed} caso(s) no coinciden.`);
process.exit(failed === 0 ? 0 : 1);
