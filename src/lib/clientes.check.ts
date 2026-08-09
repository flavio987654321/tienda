/**
 * Chequeos de nuevos vs. que vuelven. Se corre a mano:
 *
 *   npx tsx src/lib/clientes.check.ts
 *
 * Lo que más importa acá es que los dos grupos NO se pisen: si una misma
 * persona cae en los dos, la plata se cuenta dos veces y el total del bloque
 * deja de coincidir con los ingresos de arriba. Eso no se ve —los dos números
 * son creíbles— hasta que alguien los suma a mano.
 */

import {
  resumirClientes, MINIMO_POR_GRUPO, DIFERENCIA_MINIMA_PCT,
  type PedidoDeCliente,
} from "./clientes";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const p = (buyerId: string, total: number, nuevo: boolean): PedidoDeCliente =>
  ({ buyerId, total, primeraCompraEnElPeriodo: nuevo });

/* ── Los grupos no se pisan ───────────────────────────────────────────────── */
console.log("\n1) Cada peso en un solo grupo");

const mezcla = [
  p("ana", 10_000, true), p("ana", 15_000, true),   // nueva, compro dos veces
  p("beto", 8_000, false),                          // ya habia comprado antes
  p("caro", 12_000, true),
  p("beto", 20_000, false),
];
const r = resumirClientes(mezcla);

chequear("la plata suma exacta",
  r.nuevos.facturado + r.vuelven.facturado === 65_000,
  [r.nuevos.facturado, r.vuelven.facturado]);
chequear("los pedidos suman exacto", r.nuevos.pedidos + r.vuelven.pedidos === 5,
  [r.nuevos.pedidos, r.vuelven.pedidos]);

// Ana compro dos veces siendo nueva: es UNA persona, no dos. Contando pedidos
// en vez de personas, "cuantos clientes nuevos tuve" da un numero inflado.
chequear("ana cuenta como una sola persona", r.nuevos.personas === 2, r.nuevos.personas);
chequear("beto tambien", r.vuelven.personas === 1, r.vuelven.personas);

// Y toda la plata de ana va a "nuevos", incluida su segunda compra: si el
// segundo pedido se fuera a "vuelven", ana estaria en los dos grupos y la
// pregunta "cuantos clientes nuevos tuve" se quedaria sin respuesta.
chequear("las dos compras de ana van al mismo lado",
  r.nuevos.facturado === 37_000, r.nuevos.facturado);

chequear("el porcentaje de plata de los que vuelven",
  r.pctFacturadoDeVuelven === Math.round((28_000 / 65_000) * 100), r.pctFacturadoDeVuelven);

/* ── El ticket ────────────────────────────────────────────────────────────── */
console.log("\n2) El ticket promedio");

const conDiferencia = [
  p("n1", 10_000, true), p("n2", 10_000, true), p("n3", 10_000, true),
  p("v1", 20_000, false), p("v2", 20_000, false), p("v3", 20_000, false),
];
const rd = resumirClientes(conDiferencia);
chequear("ticket de nuevos", rd.nuevos.ticket === 10_000, rd.nuevos.ticket);
chequear("los que vuelven gastan 100% mas", rd.diferenciaTicketPct === 100, rd.diferenciaTicketPct);

const alReves = [
  p("n1", 30_000, true), p("n2", 30_000, true), p("n3", 30_000, true),
  p("v1", 15_000, false), p("v2", 15_000, false), p("v3", 15_000, false),
];
chequear("y si gastan menos, sale negativo",
  resumirClientes(alReves).diferenciaTicketPct === -50,
  resumirClientes(alReves).diferenciaTicketPct);

/* ── Cuándo callarse ──────────────────────────────────────────────────────── */
console.log("\n3) Cuando NO comparar");

// Un solo pedido de un lado: el "ticket promedio" de ese grupo ES ese pedido, y
// una compra grande o chica da vuelta la conclusion entera.
const pocos = [
  p("n1", 10_000, true), p("n2", 10_000, true), p("n3", 10_000, true),
  p("v1", 90_000, false),
];
chequear(`con menos de ${MINIMO_POR_GRUPO} pedidos de un lado no se compara`,
  resumirClientes(pocos).diferenciaTicketPct === null,
  resumirClientes(pocos).diferenciaTicketPct);

// Casi iguales. Anunciar que los que vuelven gastan "un 4% mas" es presentar
// ruido como si fuera un hallazgo, y encima invita a decidir sobre eso.
const casiIgual = [
  p("n1", 10_000, true), p("n2", 10_000, true), p("n3", 10_000, true),
  p("v1", 10_400, false), p("v2", 10_400, false), p("v3", 10_400, false),
];
chequear(`una diferencia de menos de ${DIFERENCIA_MINIMA_PCT}% no se dice`,
  resumirClientes(casiIgual).diferenciaTicketPct === null,
  resumirClientes(casiIgual).diferenciaTicketPct);

/* ── Los bordes ───────────────────────────────────────────────────────────── */
console.log("\n4) Los bordes");

const vacio = resumirClientes([]);
chequear("sin pedidos no explota",
  vacio.nuevos.pedidos === 0 && vacio.vuelven.pedidos === 0 &&
  vacio.nuevos.ticket === 0 && vacio.diferenciaTicketPct === null &&
  vacio.pctFacturadoDeVuelven === null);

const soloNuevos = resumirClientes([p("a", 5_000, true), p("b", 5_000, true), p("c", 5_000, true)]);
chequear("una tienda que arranca: nadie vuelve todavia",
  soloNuevos.vuelven.pedidos === 0 && soloNuevos.pctFacturadoDeVuelven === 0,
  soloNuevos.pctFacturadoDeVuelven);
chequear("y no divide por cero", soloNuevos.diferenciaTicketPct === null);

// Pedidos en cero: una tienda puede tener un pedido de regalo o 100% cupon. No
// tiene que romper la division ni inventar un ticket.
const enCero = resumirClientes([
  p("n1", 0, true), p("n2", 0, true), p("n3", 0, true),
  p("v1", 1_000, false), p("v2", 1_000, false), p("v3", 1_000, false),
]);
chequear("con ticket de nuevos en 0 no divide por cero",
  enCero.diferenciaTicketPct === null, enCero.diferenciaTicketPct);
chequear("y el porcentaje de plata sigue saliendo",
  enCero.pctFacturadoDeVuelven === 100, enCero.pctFacturadoDeVuelven);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
