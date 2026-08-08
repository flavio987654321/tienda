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

const cupon = (
  id: string, code: string,
  extra: Partial<CuponCrudo> = {}
): CuponCrudo => ({
  id, code, label: null, discountType: "percentage", discountValue: 10,
  expiresAt: null, isActive: true, winnerEmail: null, ...extra,
});

const cupones: CuponCrudo[] = [
  cupon("c1", "BIENVENIDA10"),
  cupon("c2", "VERANO20", { label: "20% OFF verano", discountValue: 20, expiresAt: fecha("2026-01-01") }),
  // Vigente y sin un solo uso: es el que la tarjeta escondía.
  cupon("c3", "SINUSO", { discountType: "fixed", discountValue: 5000 }),
  // Apagado y sin uso: NO es una campaña que falló, ya se decidió apagarla.
  cupon("c4", "APAGADO", { isActive: false }),
  // Vencido y sin uso: idem, ya terminó.
  cupon("c5", "VIEJO", { expiresAt: fecha("2026-01-01") }),
  // Premio de la ruleta, canjeado. Va aparte del ranking.
  cupon("g1", "WIN-ABC123", { winnerEmail: "ana@example.com" }),
  // Premio de la ruleta sin canjear: no es un cupón tuyo "sin usar".
  cupon("g2", "WIN-XYZ789", { winnerEmail: "juan@example.com" }),
];
const pedidosCupon = [
  { couponId: "c1", discountAmount: 12000, total: 108000 },
  { couponId: "c1", discountAmount: 12000, total: 108000 },
  { couponId: "c1", discountAmount: 8000,  total:  72000 },
  { couponId: "c2", discountAmount: 18000, total:  22000 },
  { couponId: "g1", discountAmount: 5000,  total:  45000 },
  { couponId: null, discountAmount: 0,     total:  30000 },  // sin cupón, no tiene que contar
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

// ── Lo que trajo cada cupón ──
// LA razón de todo esto: los dos cupones de abajo cuestan parecido y son casos
// opuestos. BIENVENIDA10 resignó $32.000 para entrar $288.000; VERANO20 resignó
// $18.000 para entrar $22.000. Sin la columna `facturado` se ven iguales.
chequear("facturado del primero = $288.000", rcup.filas[0].facturado === 288000, rcup.filas[0].facturado);
chequear("facturado del segundo = $22.000",
  rcup.filas.find(f => f.code === "VERANO20")?.facturado === 22000);
chequear("facturado total $310.000", rcup.facturadoTotal === 310000, rcup.facturadoTotal);
chequear("el pedido sin cupon no suma al facturado", rcup.facturadoTotal !== 340000);

// ── Los premios de la ruleta, aparte ──
chequear("el premio canjeado no ensucia el ranking",
  !rcup.filas.some(f => f.code.startsWith("WIN-")), rcup.filas.map(f => f.code));
chequear("la ruleta cuenta su uso aparte", rcup.ruleta.usos === 1, rcup.ruleta);
chequear("y su descuento aparte", rcup.ruleta.descuento === 5000, rcup.ruleta.descuento);
chequear("y lo que facturo", rcup.ruleta.facturado === 45000, rcup.ruleta.facturado);
chequear("el descuento de la ruleta NO entra en el total propio",
  rcup.descuentoTotal === 50000, rcup.descuentoTotal);

// ── Los que no se usaron ──
chequear("SINUSO aparece", rcup.sinUsar.some(c => c.code === "SINUSO"), rcup.sinUsar);
chequear("el apagado no aparece", !rcup.sinUsar.some(c => c.code === "APAGADO"));
chequear("el vencido no aparece", !rcup.sinUsar.some(c => c.code === "VIEJO"));
chequear("el premio sin canjear no aparece", !rcup.sinUsar.some(c => c.code.startsWith("WIN-")));
chequear("los usados no aparecen", !rcup.sinUsar.some(c => c.code === "BIENVENIDA10"));
chequear("queda uno solo sin usar", rcup.sinUsar.length === 1, rcup.sinUsar.map(c => c.code));

/* ── Promociones ──────────────────────────────────────────────────────────── */
console.log("\n3) Promociones");

const p = (name: string | null, label: string, savings: number): PromoAplicada =>
  ({ name, label, type: "PERCENT", savings });

const pedidosPromo = [
  { applied: [p("3x2 pantalones", "3x2", 60000)], freeShipping: null, total: 120000 },
  { applied: [p("3x2 pantalones", "3x2", 60000)], freeShipping: null, total: 120000 },
  // UN pedido con DOS promos distintas: cuenta una vez como pedido, dos filas.
  { applied: [p("3x2 pantalones", "3x2", 60000), p("20% camperas", "20% OFF", 9000)], freeShipping: null, total: 200000 },
  { applied: [p("20% camperas", "20% OFF", 9000)], freeShipping: p(null, "Envío gratis", 5000), total: 40000 },
  { applied: [], freeShipping: null, total: 15000 },  // sin promo
];
const rp = resumirPromos(pedidosPromo, ["3x2 pantalones", "20% camperas", "Nunca aplicada", "  "]);

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

// ── Lo que facturaron ──
chequear("el 3x2 facturo $440.000", rp.filas[0].facturado === 440000, rp.filas[0].facturado);
chequear("el envio gratis facturo $40.000",
  rp.filas.find(f => f.etiqueta === "Envío gratis")?.facturado === 40000);
// LA trampa, otra vez: el pedido con dos promos suma su total entero en las dos
// filas. El total tiene que contarse por PEDIDO o sale $720.000 sobre $480.000.
chequear("facturado total $480.000, contado por pedido", rp.facturadoTotal === 480000, rp.facturadoTotal);
chequear("la suma de la columna SI da mas que el total",
  rp.filas.reduce((s, f) => s + f.facturado, 0) === 720000);
chequear("el pedido sin promo no suma al facturado", rp.facturadoTotal !== 495000);

// ── Las que no se aplicaron nunca ──
chequear("la promo que nunca entro aparece",
  rp.sinUsar.length === 1 && rp.sinUsar[0] === "Nunca aplicada", rp.sinUsar);
chequear("las que si entraron no aparecen", !rp.sinUsar.includes("3x2 pantalones"));
chequear("un nombre vacio no se cuela", !rp.sinUsar.some(n => n.trim() === ""));
chequear("sin lista de activas no inventa nada",
  resumirPromos(pedidosPromo).sinUsar.length === 0);

// Misma promo repetida DENTRO de un pedido: es un pedido, no dos.
const repetida = resumirPromos([
  { applied: [p("2x1", "2x1", 1000), p("2x1", "2x1", 1500)], freeShipping: null, total: 9000 },
]);
chequear("promo repetida en un pedido cuenta 1 pedido", repetida.filas[0].pedidos === 1, repetida.filas[0]);
chequear("pero suma los dos ahorros", repetida.filas[0].ahorro === 2500, repetida.filas[0].ahorro);
chequear("y el total del pedido se cuenta una sola vez",
  repetida.filas[0].facturado === 9000 && repetida.facturadoTotal === 9000, repetida.filas[0].facturado);

// Dos campañas distintas con la MISMA etiqueta visible no se mezclan.
const mismaEtiqueta = resumirPromos([
  { applied: [p("Verano remeras", "20% OFF", 1000)], freeShipping: null, total: 5000 },
  { applied: [p("Invierno camperas", "20% OFF", 2000)], freeShipping: null, total: 8000 },
]);
chequear("dos campañas con la misma etiqueta quedan separadas",
  mismaEtiqueta.filas.length === 2, mismaEtiqueta.filas.map(f => f.clave));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
