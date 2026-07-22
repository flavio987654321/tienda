// Verificación ejecutable del motor de precios contra la TABLA DE CASOS CONGELADA
// de PROMOCIONES.md. No hay runner de tests en el repo, así que corre con:
//   npx tsx src/lib/pricing.check.ts
// Sale con código 1 si algún caso no da el número esperado.
//
// Producto base: precio $10.000. Los casos de mayorista (H/I/J) y cupón (K–O) NO
// están acá: pertenecen al resolvedor de precio base y al checkout, no al motor
// de promos. El motor aplica las StorePromotion (promociones a nivel tienda);
// eso es lo que cubren los casos SP-* y FS-*.

import { priceCart, resolveBasePrice, freeShippingProgress, MIN_PRICE_RATIO, type PricingItem, type ActivePromotion } from "./pricing";
import {
  costFloorCheck, fixedFloorError, fixedImpact, deepestFixedOnProduct, deadPromoCheck, parseMoneyInput, moneyInputValue, MAX_PROMO_PERCENT,
  type CostFloorPromo, type CostFloorProduct,
} from "./promotions";
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
  // ⚠️ NÚMERO CAMBIADO A PROPÓSITO (22/07): antes esperaba 0. El motor tenía el
  // piso en 0, o sea que un monto mayor al precio REGALABA el producto. Ahora el
  // piso es MIN_PRICE_RATIO — el espejo del tope de 90 que el PERCENT ya tenía.
  { id: "SP-C", items: [item(1)], promotions: [promo({ type: "FIXED", value: 15000 })],
    expectedSubtotal: 1000, desc: "FIXED $15.000/u sobre $10.000 → piso en el 10%, nunca gratis" },
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
    { id: "FI-D", imp: fixedImpact(fixed(5000), prods), peor: "Llavero", pct: 90, libres: 1, hondos: 0,
      desc: "monto mayor al precio: el piso lo deja en 90% (no 100 ni 125) y sale de `hondos` para no contarse dos veces" },
    { id: "FI-E", imp: fixedImpact(fixed(5000, "CATEGORY", ["remeras"]), prods), peor: "Remera básica", pct: 23, libres: 0, hondos: 0,
      desc: "el alcance manda: sin el llavero, el mismo monto pasa a ser un 23%" },
    { id: "FI-F", imp: fixedImpact({ type: "PERCENT", value: 5000, scope: "ALL", categories: [], productIds: [] }, prods), peor: null, pct: null, libres: 0, hondos: 0,
      desc: "no es monto fijo → no se calcula nada" },
  ];
  for (const c of impCasos) {
    const peor = c.imp.worst?.name ?? null;
    const pct = c.imp.worst?.pct ?? null;
    const ok = peor === c.peor && pct === c.pct && c.imp.capped.length === c.libres && c.imp.deep.length === c.hondos;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] peor=${peor} ${pct}% · gratis=${c.imp.capped.length} · hondos=${c.imp.deep.length} — ${c.desc}`);
  }
}

// ── El piso: ningún producto se vende regalado ───────────────────────────────
// Cierra el agujero que los avisos no podían cerrar: se protege el RESULTADO, sin
// importar por qué puerta entró la mala configuración.
{
  const chk = (id: string, got: boolean, desc: string) => { if (!got) failed++; console.log(`${got ? "OK  " : "FAIL"} [${id}] ${desc}`); };

  // El que ata los dos números. Si alguien sube el tope del % o baja el piso sin
  // tocar el otro, el sistema queda incoherente en silencio y esto lo grita.
  chk("PISO-A", Math.abs(MIN_PRICE_RATIO - (1 - MAX_PROMO_PERCENT / 100)) < 1e-9,
    `el piso (${MIN_PRICE_RATIO}) es el espejo exacto del tope del % (${MAX_PROMO_PERCENT}) — si uno cambia, el otro también`);

  const r1 = priceCart([item(1)], { promotions: [promo({ type: "FIXED", value: 50000 })] });
  chk("PISO-B", r1.subtotal === 1000,
    `un monto absurdo ($50.000 sobre $10.000) no regala: queda ${r1.subtotal}`);

  const r2 = priceCart([item(1)], { promotions: [promo({ type: "FIXED", value: 9000 })] });
  chk("PISO-C", r2.subtotal === 1000,
    "justo en el limite (90% de descuento) el resultado es el mismo, sin salto raro");

  const r3 = priceCart([item(1)], { promotions: [promo({ type: "FIXED", value: 8999 })] });
  chk("PISO-D", r3.subtotal === 1001,
    "un peso por debajo del limite el piso NO se activa: la cuenta normal manda");

  // El piso es solo para descuentos directos. En el 3×2 y el combo la unidad
  // gratis es la promesa explicita de la promo, no un accidente que haya que tapar.
  const r4 = priceCart([item(3)], { promotions: [promo({ type: "N_PAY_M", minQty: 3, payQty: 2 })] });
  chk("PISO-E", r4.subtotal === 20000,
    "el 3x2 sigue regalando una unidad — el piso no lo toca");

  const r5 = priceCart(
    [item(1, 10000, { productId: "X1" }), item(1, 10000, { productId: "X2" }), item(1, 3000, { productId: "X3" })],
    { promotions: [promo({ type: "MIX_N_PAY_M", minQty: 3, payQty: 2 })] }
  );
  chk("PISO-F", r5.subtotal === 20000,
    "el combo sigue regalando el mas barato entero — el piso no lo toca");

  // Y la otra mitad: el panel tiene que decir el MISMO numero que cobra el motor.
  const prods = [{ id: "P", name: "Remera", price: 10000, category: null }];
  const imp = fixedImpact({ type: "FIXED", value: 50000, scope: "ALL", categories: [], productIds: [] }, prods);
  chk("PISO-G", imp.worst?.effective === 1000 && imp.capped.length === 1,
    `el panel muestra ${imp.worst?.effective} igual que el motor, y lo marca para frenar`);
}

// ── F6-C6: cada línea dice CUÁL promo la ganó ────────────────────────────────
// El motor ya elegía la ganadora por línea para hacer la cuenta y la tiraba. Al
// exponerla, el carrito puede nombrarla sin recalcular nada — que es el punto:
// una segunda cuenta paralela es lo que fue B-10.
{
  const chk = (id: string, got: boolean, desc: string) => { if (!got) failed++; console.log(`${got ? "OK  " : "FAIL"} [${id}] ${desc}`); };
  const veinte = promo({ type: "PERCENT", value: 20, name: "Verano" });
  const treinta = promo({ type: "PERCENT", value: 30, name: "Liquidación" });
  const soloRemeras = promo({ type: "PERCENT", value: 50, scope: "CATEGORY", categories: ["remeras"], name: "Remerazo" });

  const r1 = priceCart([item(1)], { promotions: [veinte] });
  chk("LP-A", r1.lines[0].promo?.name === "Verano" && r1.lines[0].promo?.label === "20% OFF",
    `la línea nombra la promo que ganó → ${r1.lines[0].promo?.name} · ${r1.lines[0].promo?.label}`);

  const r2 = priceCart([item(1)], { promotions: [veinte, treinta] });
  chk("LP-B", r2.lines[0].promo?.name === "Liquidación",
    "con dos promos nombra la que GANÓ, no la primera del array");

  const r3 = priceCart([item(1, BASE, P1), item(1, BASE, P2)], { promotions: [soloRemeras] });
  chk("LP-C", r3.lines[0].promo?.name === "Remerazo" && r3.lines[1].promo === null,
    "la línea fuera de alcance no nombra ninguna promo");

  const r4 = priceCart([item(1)], { promotions: [promo({ type: "PERCENT", value: 20, minOrderAmount: 999999 })] });
  chk("LP-D", r4.lines[0].promo === null,
    "promo que alcanza pero NO llegó al mínimo → no se anuncia nada");

  const r5 = priceCart([item(1)], { promotions: [veinte] });
  chk("LP-E", r5.lines[0].promo?.savings === r5.lines[0].savings,
    "lo que dice la promo de la línea es lo que ahorró esa línea, no otro número");

  const r6 = priceCart([item(1)], { promotions: [promo({ type: "FREE_SHIPPING", minOrderAmount: 5000 })] });
  chk("LP-F", r6.lines[0].promo === null && r6.freeShipping,
    "el envío gratis no descuenta la línea → va aparte, no como promo de producto");
}

// ── F6-C9: la otra puerta — un producto que cae bajo una promo fija vigente ──
// Espejo de FI: allá era una promo contra el catálogo, acá es un producto contra
// las promos. Tienen que dar el MISMO número, o una pantalla contradice a la otra.
{
  const promo = (name: string, value: number, scope = "ALL", cats: string[] = [], ids: string[] = []) =>
    ({ name, type: "FIXED", value, scope, categories: cats, productIds: ids });
  const nuevo = { id: "", price: 10000, category: "remeras" as string | null };

  const casos: { id: string; r: ReturnType<typeof deepestFixedOnProduct>; promo: string | null; pct: number | null; desc: string }[] = [
    { id: "PP-A", r: deepestFixedOnProduct(nuevo, [promo("Liquidación", 12000)]), promo: "Liquidación", pct: 90,
      desc: "producto de $10.000 bajo una promo de $12.000: el piso lo salva de quedar gratis, pero igual hay que avisar" },
    { id: "PP-B", r: deepestFixedOnProduct(nuevo, [promo("Suave", 2000)]), promo: "Suave", pct: 20,
      desc: "descuento chico: se calcula igual, la pantalla decide si avisa" },
    { id: "PP-C", r: deepestFixedOnProduct(nuevo, [promo("Camperas", 12000, "CATEGORY", ["camperas"])]), promo: null, pct: null,
      desc: "otra categoría → no lo alcanza, no se avisa nada" },
    { id: "PP-D", r: deepestFixedOnProduct(nuevo, [promo("Remeras", 6000, "CATEGORY", ["remeras"])]), promo: "Remeras", pct: 60,
      desc: "su categoría sí lo alcanza" },
    { id: "PP-E", r: deepestFixedOnProduct(nuevo, [promo("Elegidos", 9000, "PRODUCTS", [], ["P1"])]), promo: null, pct: null,
      desc: "promo por producto elegido: uno NUEVO (sin id) no puede estar en la lista" },
    { id: "PP-F", r: deepestFixedOnProduct({ ...nuevo, id: "P1" }, [promo("Elegidos", 9000, "PRODUCTS", [], ["P1"])]), promo: "Elegidos", pct: 90,
      desc: "el mismo producto EDITÁNDOSE sí está en la lista → avisa" },
    { id: "PP-G", r: deepestFixedOnProduct(nuevo, [promo("Suave", 2000), promo("Fuerte", 8000)]), promo: "Fuerte", pct: 80,
      desc: "con varias promos gana la que más descuenta, que es la que hay que avisar" },
    { id: "PP-H", r: deepestFixedOnProduct({ ...nuevo, price: 0 }, [promo("Liquidación", 12000)]), promo: null, pct: null,
      desc: "sin precio cargado todavía → no se inventa un aviso" },
  ];
  for (const c of casos) {
    const ok = (c.r?.promoName ?? null) === c.promo && (c.r?.pct ?? null) === c.pct;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] ${c.r ? `${c.r.promoName} ${c.r.pct}%` : "sin aviso"} — ${c.desc}`);
  }

  // Coherencia entre las dos puertas: el mismo producto y la misma promo tienen
  // que dar el mismo precio final, se mire desde donde se mire.
  const p = { id: "P1", name: "Remera", price: 10000, category: "remeras" as string | null };
  const pr = promo("Liquidación", 6000);
  const desdeLaPromo = fixedImpact(pr, [p]).worst;
  const desdeElProducto = deepestFixedOnProduct(p, [pr]);
  const ok = desdeLaPromo?.effective === desdeElProducto?.effective && desdeLaPromo?.pct === desdeElProducto?.pct;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} [PP-I] promo→${desdeLaPromo?.effective} (${desdeLaPromo?.pct}%) · producto→${desdeElProducto?.effective} (${desdeElProducto?.pct}%) — las dos pantallas dicen el mismo número`);
}

// ── F6-C7: la promo que nace muerta ──────────────────────────────────────────
// El riesgo grande acá NO es dejar pasar una muerta: es la falsa alarma. Decirle
// "esto no va a aplicar nunca" a alguien que armó una promo perfectamente buena
// destruye la confianza en todos los demás avisos del panel. Por eso la mayoría
// de estos casos verifica que se CALLE.
{
  const chk = (id: string, got: boolean, desc: string) => { if (!got) failed++; console.log(`${got ? "OK  " : "FAIL"} [${id}] ${desc}`); };
  const prods = [
    { id: "A", name: "Pantalón barato", price: 53000, category: "pantalones" },
    { id: "B", name: "Pantalón caro", price: 80000, category: "pantalones" },
    { id: "C", name: "Remera", price: 22000, category: "remeras" },
  ];
  const viva = (p: Partial<Parameters<typeof deadPromoCheck>[1][number]> & { name: string; type: string; value: number }) => ({
    minOrderAmount: 0, startsAt: null, endsAt: null, isActive: true, archivedAt: null,
    scope: "ALL", categories: [], productIds: [], ...p,
  });
  const nueva = (p: Partial<Parameters<typeof deadPromoCheck>[0]> & { type: string; value: number }) => ({
    minOrderAmount: 0, startsAt: null, endsAt: null,
    scope: "ALL", categories: [], productIds: [], ...p,
  });

  chk("DM-A",
    deadPromoCheck(nueva({ type: "PERCENT", value: 20 }), [viva({ name: "Treinta", type: "PERCENT", value: 30 })], prods) != null,
    "20% con un 30% ya activo en el mismo alcance → nace muerta, avisa");

  chk("DM-B",
    deadPromoCheck(nueva({ type: "PERCENT", value: 30 }), [viva({ name: "Veinte", type: "PERCENT", value: 20 })], prods) == null,
    "al revés (la nueva descuenta MÁS) → se calla");

  // El caso del documento: 20% vs $12.000 sobre pantalones reales. El fijo gana en
  // el barato y pierde en el caro, así que NINGUNA de las dos está muerta.
  const soloPantalones = { scope: "CATEGORY", categories: ["pantalones"] };
  chk("DM-C",
    deadPromoCheck(nueva({ type: "FIXED", value: 12000, ...soloPantalones }),
      [viva({ name: "Veinte", type: "PERCENT", value: 20, ...soloPantalones })], prods) == null,
    "% y monto fijo se REPARTEN los productos (el fijo gana en el barato) → no avisa");

  chk("DM-D",
    deadPromoCheck(nueva({ type: "PERCENT", value: 20, ...soloPantalones }),
      [viva({ name: "Remerazo", type: "PERCENT", value: 50, scope: "CATEGORY", categories: ["remeras"] })], prods) == null,
    "la rival es de OTRA categoría → no la tapa");

  chk("DM-E",
    deadPromoCheck(nueva({ type: "PERCENT", value: 20 }),
      [viva({ name: "Treinta", type: "PERCENT", value: 30, minOrderAmount: 90000 })], prods) == null,
    "la rival pide compra mínima más alta → hay carritos donde la nueva es la única");

  chk("DM-F",
    deadPromoCheck(nueva({ type: "PERCENT", value: 20 }),
      [viva({ name: "Treinta", type: "PERCENT", value: 30, isActive: false })], prods) == null,
    "la rival está PAUSADA → no tapa nada");

  chk("DM-G",
    deadPromoCheck(nueva({ type: "PERCENT", value: 20, startsAt: "2026-01-01", endsAt: "2026-12-31" }),
      [viva({ name: "Treinta", type: "PERCENT", value: 30, startsAt: "2026-06-01", endsAt: "2026-06-30" })], prods) == null,
    "la rival cubre solo un mes de la vigencia nueva → la tapa un rato, no siempre");

  chk("DM-H",
    deadPromoCheck(nueva({ type: "PERCENT", value: 20, startsAt: "2026-06-05", endsAt: "2026-06-20" }),
      [viva({ name: "Treinta", type: "PERCENT", value: 30, startsAt: "2026-06-01", endsAt: "2026-06-30" })], prods) != null,
    "la rival cubre TODA la vigencia nueva → ahí sí, nace muerta");

  chk("DM-I",
    deadPromoCheck(nueva({ type: "N_PAY_M", value: 0 }), [viva({ name: "Treinta", type: "PERCENT", value: 30 })], prods) == null,
    "un 3×2 depende de la cantidad: con 1 unidad no da nada → nunca se lo declara muerto");

  chk("DM-J",
    deadPromoCheck(nueva({ type: "PERCENT", value: 20 }), [viva({ name: "Igual", type: "PERCENT", value: 20 })], prods) != null,
    "duplicado exacto: empata en todo, no aporta nada → avisa");

  const r = deadPromoCheck(nueva({ type: "PERCENT", value: 10 }), [
    viva({ name: "Pantalones 30", type: "PERCENT", value: 30, scope: "CATEGORY", categories: ["pantalones"] }),
    viva({ name: "Remeras 40", type: "PERCENT", value: 40, scope: "CATEGORY", categories: ["remeras"] }),
  ], prods);
  chk("DM-K", r != null && r.killers.length === 2,
    `dos promos que entre las dos cubren todo el catálogo → nombra a las dos (${r?.killers.join(" + ") ?? "—"})`);
}

// ── B-13: montos escritos a mano, a la argentina ─────────────────────────────
// Es la puerta por la que entra la plata: lo que este parseo devuelve es lo que
// se guarda y después descuenta el motor. "5.000" tiene que ser cinco mil.
{
  const casos: { id: string; entrada: string; esperado: number; desc: string }[] = [
    { id: "MP-A", entrada: "5.000", esperado: 5000, desc: "el punto es de MILES — antes daba 5 y guardaba $5 (B-13)" },
    { id: "MP-B", entrada: "50000", esperado: 50000, desc: "sin separadores, la única forma que andaba antes" },
    { id: "MP-C", entrada: "1.234.567", esperado: 1234567, desc: "varios puntos de miles" },
    { id: "MP-D", entrada: "5,50", esperado: 5.5, desc: "la coma SÍ es decimal (es-AR)" },
    { id: "MP-E", entrada: "1.234,56", esperado: 1234.56, desc: "los dos separadores juntos, cada uno en su papel" },
    { id: "MP-F", entrada: "$ 12.000", esperado: 12000, desc: "con símbolo y espacio pegados, como se copia y pega" },
    { id: "MP-G", entrada: "", esperado: 0, desc: "vacío → 0, no NaN (es lo que hace pasar el campo opcional)" },
    { id: "MP-H", entrada: ",", esperado: 0, desc: "solo un separador → 0, no NaN" },
  ];
  for (const c of casos) {
    const r = parseMoneyInput(c.entrada);
    const ok = r === c.esperado;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [${c.id}] "${c.entrada}" → ${r} (esp ${c.esperado}) — ${c.desc}`);
  }

  // La vuelta: editar y guardar sin tocar nada no puede cambiar el monto.
  for (const n of [5000, 5000.5, 0.5, 1234567]) {
    const ok = parseMoneyInput(moneyInputValue(n)) === n;
    if (!ok) failed++;
    console.log(`${ok ? "OK  " : "FAIL"} [MP-I] ${n} → "${moneyInputValue(n)}" → ${parseMoneyInput(moneyInputValue(n))} — abrir y guardar una promo deja el monto igual`);
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
