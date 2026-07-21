// Verificación ejecutable de las cuentas de la Canasta Solidaria. Corre con:
//   npx tsx src/lib/canasta.check.ts
// Sale con código 1 si algún caso no da lo esperado.
//
// Se testea esto porque decide dos cosas que la gente ve y que mueven plata:
// cuánto puede donar cada persona, y cuán llena se ve la canasta. Un error en la
// segunda desalienta a donar justo en el tramo final, sin que nadie lo note.

import { calculateGoalAmount, fundedProducts, maxDonationFor, MIN_DONATION } from "./canasta";

let failed = 0;
function check(id: string, ok: boolean, desc: string) {
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${id.padEnd(7)} ${desc}`);
}

// Canasta típica: 4 alimentos por $90.000 y 10% de reserva → meta $100.000.
const PRODUCTOS = [
  { targetPrice: 20000 },
  { targetPrice: 25000 },
  { targetPrice: 20000 },
  { targetPrice: 25000 },
];
const RESERVA = 10;
const META = calculateGoalAmount(PRODUCTOS, RESERVA);
const llenos = (recaudado: number) =>
  fundedProducts(PRODUCTOS, recaudado, RESERVA).filter((p) => p.fundedPct === 100).length;

// ── La meta ────────────────────────────────────────────────────────────────
{
  check("CAN-A", META === 100000, `productos por $90.000 + 10% de reserva → meta $${META.toLocaleString("es-AR")}`);
}
{
  check("CAN-B", calculateGoalAmount([], 10) === 0, "una campaña sin productos todavía no tiene meta");
}

// ── El llenado de la canasta ───────────────────────────────────────────────
{
  // El bug: la canasta se veía completa al 90% de la meta, porque el llenado no
  // descontaba la reserva. La barra decía 90% y la canasta ya estaba llena.
  check("CAN-C", llenos(90000) < PRODUCTOS.length,
    "al 90% de la meta la canasta NO se ve completa");
}
{
  check("CAN-D", llenos(META) === PRODUCTOS.length,
    "al 100% de la meta la canasta se ve completa, exacto");
}
{
  const r = fundedProducts(PRODUCTOS, META, RESERVA);
  check("CAN-E", r.every((p) => p.fundedPct === 100),
    "ningún producto queda a medias cuando se llegó a la meta");
}
{
  check("CAN-F", llenos(0) === 0 && fundedProducts(PRODUCTOS, 0, RESERVA)[0].fundedPct === 0,
    "sin donaciones no hay nada financiado");
}
{
  // Se llenan en orden, no todos un poquito.
  const r = fundedProducts(PRODUCTOS, 25000, RESERVA);
  check("CAN-G", r[0].fundedPct === 100 && r[1].fundedPct > 0 && r[2].fundedPct === 0,
    "la plata llena los productos en orden, uno a la vez");
}
{
  // Pasarse de la meta no rompe: los porcentajes siguen topeados en 100.
  const r = fundedProducts(PRODUCTOS, META * 2, RESERVA);
  check("CAN-H", r.every((p) => p.fundedPct === 100),
    "recaudar de más no genera porcentajes mayores a 100");
}
{
  // Un producto en $0 (recién agregado, sin precio) no puede dividir por cero.
  const conCero = [{ targetPrice: 0 }, { targetPrice: 10000 }];
  const r = fundedProducts(conCero, 50000, 0);
  check("CAN-I", Number.isFinite(r[0].fundedPct) && r[1].fundedPct === 100,
    "un producto sin precio cargado no rompe la cuenta");
}

// ── El tope por persona ────────────────────────────────────────────────────
{
  check("CAN-J", maxDonationFor(META, 0) === 20000,
    "sin nada recaudado, el tope es el 20% de la meta");
}
{
  // Cuando falta poco, manda lo que falta y no el 20%.
  check("CAN-K", maxDonationFor(META, 95000) === 5000,
    "si faltan $5.000, ese es el máximo que se puede donar");
}
{
  check("CAN-L", maxDonationFor(META, META) === 0,
    "con la meta cumplida no se puede donar más");
}
{
  check("CAN-M", maxDonationFor(null, 0) === null,
    "una causa sin meta no tiene tope por persona");
}
{
  // El tope nunca puede quedar por debajo del mínimo sin que se note: si pasa,
  // la donación se descarta. Con la meta de ejemplo hay margen de sobra.
  const tope = maxDonationFor(META, 0);
  check("CAN-N", tope !== null && tope >= MIN_DONATION,
    `el tope ($${tope?.toLocaleString("es-AR")}) deja donar el mínimo ($${MIN_DONATION.toLocaleString("es-AR")})`);
}

console.log(failed === 0 ? "\n✅ Las cuentas de la canasta dan bien." : `\n❌ ${failed} caso(s) fallan.`);
process.exit(failed === 0 ? 0 : 1);
