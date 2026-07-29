/**
 * Chequeos de los números de marketing. Se corre a mano:
 *
 *   npx tsx src/lib/metricas-marketing.check.ts
 *
 * El foco está en las tres cuentas que se equivocan en silencio: un carrito que
 * cae en dos etapas a la vez, un pedido con dos promos contado como dos pedidos,
 * y la misma promo repetida adentro de un mismo pedido.
 */

import {
  resumirCarritos, resumirCupones, resumirPromos, etiquetaDescuento,
  type CarritoCrudo, type CuponCrudo, type PromoAplicada,
} from "./metricas-marketing";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const fecha = (s: string) => new Date(s);

/* ── Carritos ─────────────────────────────────────────────────────────────── */
console.log("\n1) Carritos abandonados");

const carritos: CarritoCrudo[] = [
  // Recuperado — y ADEMÁS tiene recordatorio. Es el caso que rompía la cuenta.
  { total: 50000, reminderSentAt: fecha("2026-07-10"), recoveredAt: fecha("2026-07-11") },
  { total: 35000, reminderSentAt: fecha("2026-07-12"), recoveredAt: fecha("2026-07-13") },
  // Contactados, sin recuperar
  { total: 80000, reminderSentAt: fecha("2026-07-14"), recoveredAt: null },
  { total: 60000, reminderSentAt: fecha("2026-07-15"), recoveredAt: null },
  // Nunca contactados
  { total: 40000, reminderSentAt: null, recoveredAt: null },
  { total: 75000, reminderSentAt: null, recoveredAt: null },
];
const rc = resumirCarritos(carritos);

chequear("cuenta los 6", rc.cantidad === 6, rc.cantidad);
chequear("suma $340.000", rc.monto === 340000, rc.monto);
chequear("2 recuperados", rc.recuperados.cantidad === 2, rc.recuperados);
chequear("2 contactados sin recuperar", rc.contactados.cantidad === 2, rc.contactados);
chequear("2 sin contactar", rc.sinContactar.cantidad === 2, rc.sinContactar);
// LA trampa: los recuperados también tenían recordatorio. Si las etapas no fueran
// excluyentes, esto daria 8 sobre 6 carritos y los porcentajes pasarian el 100%.
chequear("las tres etapas suman el total exacto",
  rc.recuperados.cantidad + rc.contactados.cantidad + rc.sinContactar.cantidad === rc.cantidad,
  [rc.recuperados.cantidad, rc.contactados.cantidad, rc.sinContactar.cantidad]);
chequear("la plata de las etapas tambien cierra",
  rc.recuperados.monto + rc.contactados.monto + rc.sinContactar.monto === rc.monto);
chequear("recupero $85.000", rc.recuperados.monto === 85000, rc.recuperados.monto);
chequear("quedaron $255.000 sin volver", rc.montoPerdido === 255000, rc.montoPerdido);
chequear("tasa 33%", rc.tasaRecuperacion === 33, rc.tasaRecuperacion);

const vacio = resumirCarritos([]);
chequear("sin carritos no divide por cero", vacio.tasaRecuperacion === 0 && vacio.monto === 0);

/* ── Cupones ──────────────────────────────────────────────────────────────── */
console.log("\n2) Cupones");

const cupones: CuponCrudo[] = [
  { id: "c1", code: "BIENVENIDA10", label: null, discountType: "percentage", discountValue: 10, expiresAt: null },
  { id: "c2", code: "VERANO20", label: "20% OFF verano", discountType: "percentage", discountValue: 20, expiresAt: fecha("2026-01-01") },
  { id: "c3", code: "SINUSO", label: null, discountType: "fixed", discountValue: 5000, expiresAt: null },
];
const pedidosCupon = [
  { couponId: "c1", discountAmount: 12000 },
  { couponId: "c1", discountAmount: 12000 },
  { couponId: "c1", discountAmount: 8000 },
  { couponId: "c2", discountAmount: 18000 },
  { couponId: null, discountAmount: 0 },  // sin cupón, no tiene que contar
];
const rcup = resumirCupones(cupones, pedidosCupon, fecha("2026-07-29"));

chequear("solo los usados aparecen", rcup.filas.length === 2, rcup.filas.map(f => f.code));
chequear("el mas usado va primero", rcup.filas[0].code === "BIENVENIDA10", rcup.filas[0].code);
chequear("3 usos del primero", rcup.filas[0].usos === 3, rcup.filas[0].usos);
chequear("descuento $32.000", rcup.filas[0].descuento === 32000, rcup.filas[0].descuento);
chequear("los pedidos sin cupon no cuentan", rcup.usosTotales === 4, rcup.usosTotales);
chequear("descuento total $50.000", rcup.descuentoTotal === 50000, rcup.descuentoTotal);
chequear("detecta el vencido", rcup.filas.find(f => f.code === "VERANO20")?.vencido === true);
chequear("usa la etiqueta propia si existe",
  rcup.filas.find(f => f.code === "VERANO20")?.etiqueta === "20% OFF verano");
chequear("si no hay etiqueta, la arma del descuento",
  rcup.filas[0].etiqueta === "10%", rcup.filas[0].etiqueta);
chequear("etiqueta de monto fijo", etiquetaDescuento("fixed", 5000) === "$5.000");

/* ── Promociones ──────────────────────────────────────────────────────────── */
console.log("\n3) Promociones");

const p = (name: string | null, label: string, savings: number): PromoAplicada =>
  ({ name, label, type: "PERCENT", savings });

const pedidosPromo = [
  { applied: [p("3x2 pantalones", "3x2", 60000)], freeShipping: null },
  { applied: [p("3x2 pantalones", "3x2", 60000)], freeShipping: null },
  // UN pedido con DOS promos distintas: cuenta una vez como pedido, dos filas.
  { applied: [p("3x2 pantalones", "3x2", 60000), p("20% camperas", "20% OFF", 9000)], freeShipping: null },
  { applied: [p("20% camperas", "20% OFF", 9000)], freeShipping: p(null, "Envío gratis", 5000) },
  { applied: [], freeShipping: null },  // sin promo
];
const rp = resumirPromos(pedidosPromo);

chequear("3 promos distintas", rp.filas.length === 3, rp.filas.map(f => f.clave));
chequear("el 3x2 va primero con 3 pedidos", rp.filas[0].pedidos === 3, rp.filas[0]);
chequear("ahorro del 3x2 = $180.000", rp.filas[0].ahorro === 180000, rp.filas[0].ahorro);
// LA trampa: el tercer pedido tiene dos promos. Si `pedidosConPromo` saliera de
// sumar la columna, daria 6 sobre 4 pedidos que realmente tuvieron promo.
chequear("4 pedidos con promo, no 6", rp.pedidosConPromo === 4, rp.pedidosConPromo);
chequear("la suma de la columna SI da mas que los pedidos",
  rp.filas.reduce((s, f) => s + f.pedidos, 0) === 6);
chequear("el envio gratis entra como una promo mas",
  rp.filas.some(f => f.etiqueta === "Envío gratis"));
chequear("ahorro total $203.000", rp.ahorroTotal === 203000, rp.ahorroTotal);
chequear("los pedidos sin promo no cuentan", rp.pedidosConPromo !== 5);

// Misma promo repetida DENTRO de un pedido: es un pedido, no dos.
const repetida = resumirPromos([
  { applied: [p("2x1", "2x1", 1000), p("2x1", "2x1", 1500)], freeShipping: null },
]);
chequear("promo repetida en un pedido cuenta 1 pedido", repetida.filas[0].pedidos === 1, repetida.filas[0]);
chequear("pero suma los dos ahorros", repetida.filas[0].ahorro === 2500, repetida.filas[0].ahorro);

// Dos campañas distintas con la MISMA etiqueta visible no se mezclan.
const mismaEtiqueta = resumirPromos([
  { applied: [p("Verano remeras", "20% OFF", 1000)], freeShipping: null },
  { applied: [p("Invierno camperas", "20% OFF", 2000)], freeShipping: null },
]);
chequear("dos campañas con la misma etiqueta quedan separadas",
  mismaEtiqueta.filas.length === 2, mismaEtiqueta.filas.map(f => f.clave));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
