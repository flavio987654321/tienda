/**
 * Chequeos de los avisos de Sasha. Se corre a mano:
 *
 *   npx tsx src/lib/asistente-avisos.check.ts
 *
 * Lo que se prueba acá no es que los mensajes se escriban: es que NO se manden
 * los que no corresponden. Un globito con contador se mira las primeras tres
 * veces; si de esas tres una no servía, deja de mirarse para siempre. El tope
 * diario, el orden por urgencia y el no-repetir son la función, no un adorno.
 */

import {
  armarAvisos, filtrarRepetidos, MAX_AVISOS_POR_DIA,
  type Aviso,
} from "./asistente-avisos";
import type { StoreSnapshot } from "./asistente-insights";
import type { FechaComercial } from "./fechas-comerciales";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/** Una tienda sin ningún problema. Cada caso pisa sólo lo que necesita. */
const tiendaTranquila: StoreSnapshot = {
  esTipoConsultas: false,
  pedidosPendientes: 0,
  productosStockBajo: 0,
  productosSinStock: 0,
  ventasUltimos30Dias: 500_000,
  ventasPrevios30Dias: 480_000,
  tendenciaVentas: "estable",
  productoTop: "Remera básica",
  diasDesdeUltimaVenta: 1,
  carritosAbandonadosPendientes: 0,
  pedidosEstancados: 0,
  montoPedidosEstancados: 0,
  confirmadosSinDespachar: 0,
  agotadosHaceDias: 0,
  agotadoQueMasVendias: null,
  // Los avisos no miran nada de marketing: los cupones y las promociones son para
  // cuando el dueño pregunta, no para interrumpirlo a la mañana.
  marketing: {
    cuponesActivos: 0, cuponesTope: null, cuponesVencidosActivos: 0,
    cuponesSinUsoViejos: 0, cuponMasUsado: null,
    promosVivas: 0, promosTope: null, promoMasUsada: null,
    margenPromedio: null, productosSinCosto: 0,
  },
};

const snap = (cambios: Partial<StoreSnapshot>): StoreSnapshot => ({ ...tiendaTranquila, ...cambios });
const avisos = (cambios: Partial<StoreSnapshot>, fechas: FechaComercial[] = []) =>
  armarAvisos({ snapshot: snap(cambios), fechasProximas: fechas });
const claves = (lista: Aviso[]) => lista.map((a) => a.clave);

const fechaComercial = (nombre: string, diasFaltan: number): FechaComercial => ({
  nombre, fecha: new Date(), hasta: null, diasFaltan, diasRestantes: null,
  enCurso: false, aproximada: false, sugerencia: "Armá una promo.",
});

/* ── Cuándo NO hay que decir nada ─────────────────────────────────────────── */
console.log("\n1) El silencio");

chequear("una tienda sin problemas no recibe nada", avisos({}).length === 0, claves(avisos({})));

// La tienda que todavía no vendió nunca. `tendenciaVentas: "sin_datos"` existe
// justamente para no darle una mala noticia inventada a la que recién arranca.
const reciénAbierta = avisos({
  tendenciaVentas: "sin_datos", ventasUltimos30Dias: 0, ventasPrevios30Dias: 0,
  diasDesdeUltimaVenta: null, productoTop: null,
});
chequear("la tienda nueva no recibe 'las ventas bajaron'",
  !claves(reciénAbierta).includes("ventas-bajando"), claves(reciénAbierta));
chequear("ni 'hace X dias que no vendes' sin una primera venta",
  !claves(reciénAbierta).includes("sin-ventas"), claves(reciénAbierta));

// 6 días sin vender puede ser un fin de semana largo. A los 7 sí.
chequear("6 dias sin vender todavia no es aviso",
  !claves(avisos({ diasDesdeUltimaVenta: 6 })).includes("sin-ventas"));
chequear("7 dias si", claves(avisos({ diasDesdeUltimaVenta: 7 })).includes("sin-ventas"));

/* ── Lo que ya avisa la campanita ─────────────────────────────────────────── */
console.log("\n1b) No repetir lo que ya avisa la campanita");

// EL PUNTO DE TODO ESTO. La campanita avisa en el momento y hasta suena el
// celular; si Sasha repite lo mismo a la mañana, su contador es un resumen de
// cosas que el dueño ya vio ayer y a la tercera vez deja de mirarse.
//
// Un pedido que entró hace diez minutos: la campanita ya lo dijo. Sasha no.
const pedidoRecien = avisos({ pedidosPendientes: 3, pedidosEstancados: 0 });
chequear("un pedido de hace un rato no genera aviso (ya sono la campanita)",
  pedidoRecien.length === 0, claves(pedidoRecien));

// El mismo pedido, dos días después y sin confirmar: eso la campanita no lo mira.
const pedidoTrabado = avisos({ pedidosPendientes: 3, pedidosEstancados: 3, montoPedidosEstancados: 145_000 });
chequear("pero uno trabado hace mas de un dia si",
  claves(pedidoTrabado).includes("pedidos-estancados"), claves(pedidoTrabado));
chequear("y dice cuanta plata hay parada",
  pedidoTrabado[0].texto.includes("145.000"), pedidoTrabado[0].texto);

// Stock bajo: la campanita ya avisa variante por variante. Sasha no lo toca.
const stockBajo = avisos({ productosStockBajo: 7 });
chequear("stock bajo no genera aviso: ya lo avisa la campanita",
  stockBajo.length === 0, claves(stockBajo));

// Que se agote algo también lo avisa la campanita (y por email). Sasha habla
// cuando pasaron días y sigue agotado.
const agotadoHoy = avisos({ productosSinStock: 4, agotadosHaceDias: 0 });
chequear("agotarse hoy no genera aviso: ya lo avisa la campanita",
  agotadoHoy.length === 0, claves(agotadoHoy));
chequear("seguir agotado varios dias si",
  claves(avisos({ productosSinStock: 4, agotadosHaceDias: 2 })).includes("agotado-estancado"));

// El dato que la campanita NO tiene: que el agotado es el que más vendías.
const agotadoTop = avisos({ productosSinStock: 1, agotadosHaceDias: 1, agotadoQueMasVendias: "Remera negra" });
chequear("si el agotado es el que mas vendias, eso si es noticia",
  claves(agotadoTop).includes("agotado-el-que-mas-vendias"), claves(agotadoTop));
chequear("y lo nombra", agotadoTop[0].texto.includes("Remera negra"), agotadoTop[0].texto);
chequear("sin duplicar con el aviso genérico de agotado",
  !claves(agotadoTop).includes("agotado-estancado"), claves(agotadoTop));

// Cobrado y sin despachar: nadie lo avisa hoy, y es de donde salen los reclamos.
const sinDespachar = avisos({ confirmadosSinDespachar: 6 });
chequear("cobrado y sin despachar si es aviso",
  claves(sinDespachar).includes("sin-despachar"), claves(sinDespachar));
chequear("y va antes que los pedidos sin confirmar (esa gente ya pago)",
  claves(avisos({ confirmadosSinDespachar: 2, pedidosEstancados: 5 }))[0] === "sin-despachar",
  claves(avisos({ confirmadosSinDespachar: 2, pedidosEstancados: 5 })));

/* ── El tope ──────────────────────────────────────────────────────────────── */
console.log("\n2) El tope diario");

// Una tienda con TODO mal. Sin tope serían 7 mensajes de una.
const todoMal = avisos(
  {
    productosSinStock: 4, productosStockBajo: 9, pedidosPendientes: 6,
    pedidosEstancados: 6, montoPedidosEstancados: 300_000,
    confirmadosSinDespachar: 3,
    agotadosHaceDias: 4, agotadoQueMasVendias: "Remera negra",
    carritosAbandonadosPendientes: 11, tendenciaVentas: "bajando",
    ventasUltimos30Dias: 200_000, ventasPrevios30Dias: 800_000,
    diasDesdeUltimaVenta: 12,
  },
  [fechaComercial("Día de la Madre", 12)]
);
// El tope lo aplica `filtrarRepetidos`, no `armarAvisos`.
const todoMalSinHistorial = filtrarRepetidos(todoMal, []);
chequear(`nunca manda mas de ${MAX_AVISOS_POR_DIA}`,
  todoMalSinHistorial.length === MAX_AVISOS_POR_DIA, todoMalSinHistorial.length);

// Y los que entran tienen que ser los urgentes, no los primeros que salieron.
chequear("lo que entra es lo mas urgente",
  claves(todoMalSinHistorial).join(",") === "agotado-el-que-mas-vendias,sin-despachar,pedidos-estancados",
  claves(todoMalSinHistorial));
chequear("la fecha comercial no le gana a nada que cueste plata",
  !claves(todoMalSinHistorial).some((c) => c.startsWith("fecha-")), claves(todoMalSinHistorial));

// EL BUG QUE ESTO ARREGLA. Si los tres más urgentes ya se mandaron ayer, el dueño
// tiene que recibir los que siguen — no quedarse sin nada porque el tope se comió
// los lugares con avisos que después se descartaban.
const yaMandados = filtrarRepetidos(todoMal, [
  { clave: "agotado-el-que-mas-vendias", diasAtras: 1 },
  { clave: "sin-despachar", diasAtras: 1 },
  { clave: "pedidos-estancados", diasAtras: 1 },
]);
chequear("si los 3 mas urgentes ya se mandaron, entran los que siguen",
  yaMandados.length > 0, claves(yaMandados));
chequear("y son los siguientes por prioridad, no cualquiera",
  claves(yaMandados)[0] === "sin-ventas", claves(yaMandados));

// Pero si no hay ningún problema, la oportunidad sí tiene lugar.
const soloFecha = avisos({}, [fechaComercial("Hot Sale", 5)]);
chequear("sin problemas, la fecha comercial si aparece",
  claves(soloFecha).length === 1 && claves(soloFecha)[0].startsWith("fecha-"), claves(soloFecha));

/* ── El orden ─────────────────────────────────────────────────────────────── */
console.log("\n3) La prioridad");

const stockYFecha = avisos({ productosSinStock: 2, agotadosHaceDias: 2 }, [fechaComercial("Navidad", 20)]);
chequear("agotado va antes que la fecha", claves(stockYFecha)[0] === "agotado-estancado", claves(stockYFecha));

const agotadoYBajo = avisos({ productosSinStock: 1, agotadosHaceDias: 1, agotadoQueMasVendias: "Buzo gris" });
chequear("agotado va antes que stock bajo",
  claves(agotadoYBajo)[0] === "agotado-el-que-mas-vendias", claves(agotadoYBajo));

chequear("los avisos vienen ordenados de mayor a menor prioridad",
  todoMal.every((a, i, arr) => i === 0 || arr[i - 1].prioridad >= a.prioridad),
  todoMal.map((a) => a.prioridad));

/* ── No repetir ───────────────────────────────────────────────────────────── */
console.log("\n4) No repetirse");

const conStock = avisos({ productosSinStock: 3, agotadosHaceDias: 3 });

chequear("sin historial, pasa",
  filtrarRepetidos(conStock, []).length === 1);
chequear("mandado ayer, no se repite (repite cada 3 dias)",
  filtrarRepetidos(conStock, [{ clave: "agotado-estancado", diasAtras: 1 }]).length === 0);
chequear("mandado hace 3 dias, vuelve",
  filtrarRepetidos(conStock, [{ clave: "agotado-estancado", diasAtras: 4 }]).length === 1);
chequear("el historial de OTRO aviso no lo tapa",
  filtrarRepetidos(conStock, [{ clave: "ventas-bajando", diasAtras: 0 }]).length === 1);

// Cada aviso tiene su propio ritmo: los pedidos pendientes se resuelven en dos
// minutos y pueden volver pronto; la tendencia de 30 dias no cambia en un dia.
const pendientes = avisos({ pedidosPendientes: 4, pedidosEstancados: 4 });
chequear("pedidos pendientes vuelve a los 2 dias",
  filtrarRepetidos(pendientes, [{ clave: "pedidos-estancados", diasAtras: 2 }]).length === 1);
const bajando = avisos({ tendenciaVentas: "bajando", ventasUltimos30Dias: 1, ventasPrevios30Dias: 100 });
chequear("ventas bajando NO vuelve a los 2 dias",
  filtrarRepetidos(bajando, [{ clave: "ventas-bajando", diasAtras: 2 }]).length === 0);
chequear("pero si a los 7",
  filtrarRepetidos(bajando, [{ clave: "ventas-bajando", diasAtras: 7 }]).length === 1);

// Si la misma clave figura varias veces, manda la MÁS RECIENTE. Tomando la
// primera de la lista, un aviso viejo dejaría pasar uno de ayer.
chequear("con varias fechas del mismo aviso, gana la mas reciente",
  filtrarRepetidos(conStock, [
    { clave: "agotado-estancado", diasAtras: 30 },
    { clave: "agotado-estancado", diasAtras: 1 },
  ]).length === 0);

/* ── Los textos ───────────────────────────────────────────────────────────── */
console.log("\n5) Como quedan escritos");

const uno = avisos({
  agotadosHaceDias: 1, pedidosEstancados: 1, confirmadosSinDespachar: 1,
});
const textoUno = uno.map((a) => a.texto).join(" ");
chequear("conjuga en singular",
  textoUno.includes("1 producto sigue agotado") &&
  textoUno.includes("1 pedido lleva") &&
  textoUno.includes("1 pedido ya está pago"),
  uno.map((a) => a.texto));

const varios = avisos({
  agotadosHaceDias: 4, pedidosEstancados: 6, confirmadosSinDespachar: 3,
  carritosAbandonadosPendientes: 11,
});
const textoVarios = varios.map((a) => a.texto).join(" ");
chequear("y en plural",
  textoVarios.includes("6 pedidos llevan") && textoVarios.includes("3 pedidos ya están pagos"),
  varios.map((a) => a.texto));

// El carrito conjuga el sujeto Y el verbo: "1 persona dejó" / "11 personas dejaron".
const unCarrito = avisos({ carritosAbandonadosPendientes: 1 });
const variosCarritos = avisos({ carritosAbandonadosPendientes: 11 });
chequear("el carrito abandonado conjuga sujeto y verbo",
  unCarrito[0].texto.startsWith("1 persona dejó") &&
  variosCarritos[0].texto.startsWith("11 personas dejaron"),
  [unCarrito[0].texto, variosCarritos[0].texto]);

const todosLosCasos = [...todoMal, ...uno, ...varios, ...soloFecha, ...stockYFecha];
chequear("ningun aviso sale con NaN, undefined ni null",
  !/NaN|undefined|null/.test(todosLosCasos.map((a) => a.texto).join(" ")));
chequear("ninguno queda vacio", todosLosCasos.every((a) => a.texto.trim().length > 10));
chequear("todos tienen clave", todosLosCasos.every((a) => a.clave.trim().length > 0));

/* ── Muestra ──────────────────────────────────────────────────────────────── */
console.log("\n─── Un lunes malo ───\n");
for (const a of todoMal) console.log(`  [${a.prioridad}] ${a.texto}${a.link ? `  → ${a.link}` : ""}`);
console.log("\n─── Una tienda que anda bien ───\n");
for (const a of soloFecha) console.log(`  [${a.prioridad}] ${a.texto}${a.link ? `  → ${a.link}` : ""}`);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
