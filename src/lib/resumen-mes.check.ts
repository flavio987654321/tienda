/**
 * Chequeos del resumen en texto. Se corre a mano:
 *
 *   npx tsx src/lib/resumen-mes.check.ts
 *
 * Un resumen que afirma cosas es más peligroso que una tarjeta con un número:
 * nadie duda de una frase en castellano. El foco está en los casos donde el
 * texto sale gramaticalmente perfecto y factualmente al revés — el mes que sube
 * en plata mientras pierde clientes, el período anterior en cero, la tienda que
 * todavía no vendió nada.
 */

import { armarResumen, type PeriodoResumen } from "./resumen-mes";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const p = (ingresos: number, pedidosConfirmados: number, visitas: number): PeriodoResumen =>
  ({ ingresos, pedidosConfirmados, visitas });

/** Todo el texto de varios resúmenes junto, para buscarle errores de una. */
const todosLosTextos = (resumenes: { titular: string; parrafos: string[] }[]) =>
  resumenes.map((r) => [r.titular, ...r.parrafos].join(" ")).join(" ");

/* ── Titular ──────────────────────────────────────────────────────────────── */
console.log("\n1) El titular");

const subio = armarResumen({ dias: 30, actual: p(1_240_000, 110, 6_000), previo: p(1_050_000, 125, 6_400) });
chequear("mes que sube: tono bien", subio.tono === "bien", subio.tono);
chequear("dice los dos numeros", subio.titular.includes("1.240.000") && subio.titular.includes("1.050.000"), subio.titular);
chequear("dice el porcentaje", subio.titular.includes("18%"), subio.titular);

const bajo = armarResumen({ dias: 30, actual: p(800_000, 80, 5_000), previo: p(1_000_000, 100, 5_000) });
chequear("mes que baja: tono mal", bajo.tono === "mal", bajo.tono);

// Un 2% no es una tendencia: con 100 pedidos lo mueve un solo cliente.
const parejo = armarResumen({ dias: 30, actual: p(1_020_000, 100, 5_000), previo: p(1_000_000, 100, 5_000) });
chequear("un 2% se declara parejo, no 'subiste'", parejo.tono === "neutro", parejo.titular);
chequear("y no inventa una causa", parejo.parrafos.length === 0, parejo.parrafos);

// LA trampa clásica: dividir por cero. "Subiste ∞%" no es informacion.
const primeraVez = armarResumen({ dias: 30, actual: p(500_000, 40, 2_000), previo: p(0, 0, 0) });
chequear("sin periodo anterior no muestra porcentaje", !primeraVez.titular.includes("%"), primeraVez.titular);
chequear("y no dice NaN ni Infinity",
  !/NaN|Infinity/.test(primeraVez.titular), primeraVez.titular);

const sinNada = armarResumen({ dias: 7, actual: p(0, 0, 0), previo: p(0, 0, 0) });
chequear("tienda sin ventas ni visitas: tono neutro, no 'mal'", sinNada.tono === "neutro", sinNada.tono);
chequear("no la reta por no haber vendido todavia", !sinNada.titular.includes("%"), sinNada.titular);

const soloVisitas = armarResumen({ dias: 7, actual: p(0, 0, 230), previo: p(0, 0, 100) });
chequear("con visitas y sin ventas lo dice", soloVisitas.titular.includes("230"), soloVisitas.titular);

const seCayo = armarResumen({ dias: 30, actual: p(0, 0, 4_000), previo: p(900_000, 90, 5_000) });
chequear("dejar de vender del todo si es 'mal'", seCayo.tono === "mal", seCayo.tono);

chequear("7 dias dice 'La semana'", subio.titular.length > 0 &&
  armarResumen({ dias: 7, actual: p(10, 1, 1), previo: p(0, 0, 0) }).titular.startsWith("La semana"));
chequear("90 dias dice 'Los 90 días'",
  armarResumen({ dias: 90, actual: p(10, 1, 1), previo: p(0, 0, 0) }).titular.startsWith("Los 90 días"));

/* ── El porqué ────────────────────────────────────────────────────────────── */
console.log("\n2) La explicacion");

// Mismas visitas, misma conversion, ticket al alza.
const porTicket = armarResumen({
  dias: 30,
  actual: p(1_120_000, 100, 5_000),
  previo: p(840_000, 100, 5_000),
});
chequear("atribuye al ticket", porTicket.parrafos[0].includes("ticket promedio"), porTicket.parrafos[0]);
chequear("y lo explica en criollo",
  porTicket.parrafos[0].includes("más caro"), porTicket.parrafos[0]);

// Mismo ticket, misma conversion, mas gente.
const porVisitas = armarResumen({
  dias: 30,
  actual: p(1_500_000, 150, 7_500),
  previo: p(1_000_000, 100, 5_000),
});
chequear("atribuye a las visitas", porVisitas.parrafos[0].includes("visitas"), porVisitas.parrafos[0]);

// Mismas visitas, mismo ticket, mejor conversion.
const porConversion = armarResumen({
  dias: 30,
  actual: p(1_400_000, 140, 5_000),
  previo: p(1_000_000, 100, 5_000),
});
chequear("atribuye a la conversion", porConversion.parrafos[0].includes("de cada 100 visitas"), porConversion.parrafos[0]);
// La tarjeta "Conversión" de la pantalla cuenta TODOS los pedidos; acá se cuentan
// sólo los confirmados. Son dos números distintos y legítimos: lo que no puede
// pasar es que el resumen los llame igual y el lector vea 1,6% al lado de 2,0%.
chequear("dice 'venta confirmada', no 'conversión' a secas",
  porConversion.parrafos[0].includes("terminan en venta confirmada"), porConversion.parrafos[0]);

// LA trampa importante: sube la plata pero se pierden clientes. Un resumen
// ingenuo felicita y listo.
chequear("el mes que sube perdiendo gente lleva advertencia",
  subio.parrafos.length === 2 && subio.parrafos[1].includes("Ojo"), subio.parrafos);
chequear("y nombra que las visitas bajaron",
  subio.parrafos[1].includes("visitas") && subio.parrafos[1].includes("bajaron"), subio.parrafos[1]);

// El verbo tiene que ir con el sujeto. "las visitas bajó" es lo primero que
// delata un texto armado por una máquina.
const textoCompleto = todosLosTextos([subio, bajo, parejo, porTicket, porVisitas, porConversion]);
chequear("nunca dice 'las visitas subió/bajó'",
  !/las visitas (subió|bajó)/.test(textoCompleto), textoCompleto);
chequear("nunca dice 'la conversión subieron/bajaron'",
  !/la (conversión|ticket)[^.]*?(subieron|bajaron)/.test(textoCompleto), textoCompleto);

// Con 3 ventas no se explica nada: un cliente mueve todos los porcentajes.
const pocasVentas = armarResumen({ dias: 7, actual: p(300_000, 3, 200), previo: p(100_000, 2, 180) });
chequear("con 3 ventas no arriesga una causa", pocasVentas.parrafos.length === 0, pocasVentas.parrafos);
chequear("pero el titular sale igual", pocasVentas.titular.includes("300.000"), pocasVentas.titular);

// Sin visitas del período anterior la descomposición no cierra: se calla.
const sinVisitasPrevias = armarResumen({ dias: 30, actual: p(500_000, 50, 3_000), previo: p(400_000, 40, 0) });
chequear("sin visitas previas no explica", sinVisitasPrevias.parrafos.length === 0, sinVisitasPrevias.parrafos);

// Ningún texto puede salir con un número roto.
const todos = [subio, bajo, parejo, primeraVez, sinNada, soloVisitas, seCayo, porTicket, porVisitas, porConversion];
chequear("ningun resumen imprime NaN, Infinity ni undefined",
  todos.every((r) => !/NaN|Infinity|undefined|null/.test([r.titular, ...r.parrafos].join(" "))));

/* ── El margen de las visitas ─────────────────────────────────────────────── */
console.log("\n2b) El margen de las visitas");

// Las visitas se guardan por día entero, así que el día de hoy entra a medias
// contra un día completo del período anterior. Si el movimiento de visitas cabe
// adentro de ese margen, no se puede afirmar si la causa fue la gente o la
// tienda: se calla.
// Todo el movimiento está en las visitas (+8%): mismo ticket, misma conversión.
const soloVisitasSubieron = {
  dias: 7,
  actual: p(1_080_000, 108, 5_400),
  previo: p(1_000_000, 100, 5_000),
};
const sinMargen = armarResumen(soloVisitasSubieron);
const conMargen = armarResumen({ ...soloVisitasSubieron, incertidumbreVisitasPct: 10 });
chequear("sin margen declarado, atribuye a las visitas",
  sinMargen.parrafos[0]?.includes("cantidad de gente"), sinMargen.parrafos);
chequear("un movimiento de visitas de 8% con margen de 10% no se afirma",
  conMargen.parrafos.length === 0, conMargen.parrafos);
// El margen no puede tapar de más: con 8% de movimiento y 3% de margen, sí se afirma.
const margenChico = armarResumen({ ...soloVisitasSubieron, incertidumbreVisitasPct: 3 });
chequear("pero con margen de 3% sí lo afirma", margenChico.parrafos.length > 0, margenChico.parrafos);

// Pero si la causa es el ticket —que sale de datos con hora exacta— el margen de
// las visitas no tiene por qué taparlo.
const porTicketConMargen = armarResumen({
  dias: 7, actual: p(1_400_000, 100, 5_050), previo: p(1_000_000, 100, 5_000),
  incertidumbreVisitasPct: 6,
});
chequear("el ticket se sigue explicando aunque las visitas estén en duda",
  porTicketConMargen.parrafos[0]?.includes("ticket promedio"), porTicketConMargen.parrafos);
chequear("y no nombra las visitas dudosas en la advertencia",
  !porTicketConMargen.parrafos.join(" ").includes("las visitas"), porTicketConMargen.parrafos);

/* ── Pendientes ───────────────────────────────────────────────────────────── */
console.log("\n3) Los pendientes");

const conSenales = armarResumen({
  dias: 30,
  actual: p(1_000_000, 100, 5_000),
  previo: p(1_000_000, 100, 5_000),
  senales: {
    productosSinCosto: 4,
    carritosSinContactar: { cantidad: 9, monto: 390_000 },
    enviosBonificados: 45_000,
    pedidosPendientes: { cantidad: 6, monto: 180_000 },
    cuponesVencidos: 1,
  },
});
chequear("los lista todos", conSenales.pendientes.length === 5, conSenales.pendientes.length);
// Ordenados por plata: primero los $390.000, no lo que sea mas facil de calcular.
chequear("primero el que mas plata tiene",
  conSenales.pendientes[0].plata === 390_000, conSenales.pendientes.map((x) => x.plata));
chequear("va de mayor a menor",
  conSenales.pendientes.every((x, i, a) => i === 0 || a[i - 1].plata >= x.plata),
  conSenales.pendientes.map((x) => x.plata));
// Las que no son plata concreta nunca le ganan a las que si.
chequear("lo que no es plata queda al final",
  conSenales.pendientes.slice(-2).every((x) => x.plata === 0),
  conSenales.pendientes.map((x) => x.plata));

const enCero = armarResumen({
  dias: 30, actual: p(1_000_000, 100, 5_000), previo: p(1_000_000, 100, 5_000),
  senales: { productosSinCosto: 0, cuponesVencidos: 0, enviosBonificados: 0,
             carritosSinContactar: { cantidad: 0, monto: 0 } },
});
chequear("nada en cero se muestra", enCero.pendientes.length === 0, enCero.pendientes);

const sinSenales = armarResumen({ dias: 30, actual: p(1_000_000, 100, 5_000), previo: p(900_000, 90, 5_000) });
chequear("sin señales no explota", Array.isArray(sinSenales.pendientes) && sinSenales.pendientes.length === 0);

// Singular y plural: "1 carrito quedó" / "9 carritos quedaron".
const uno = armarResumen({
  dias: 30, actual: p(1, 1, 1), previo: p(1, 1, 1),
  senales: { carritosSinContactar: { cantidad: 1, monto: 5_000 }, pedidosPendientes: { cantidad: 1, monto: 3_000 } },
});
chequear("conjuga en singular",
  uno.pendientes.some((x) => x.texto.includes("1 carrito quedó")) &&
  uno.pendientes.some((x) => x.texto.includes("1 pedido está")),
  uno.pendientes.map((x) => x.texto));
chequear("y en plural",
  conSenales.pendientes.some((x) => x.texto.includes("9 carritos quedaron")),
  conSenales.pendientes.map((x) => x.texto));

// El cupón arrastraba la frase entera: "1 cupón ... está vencido. Si no LOS vas
// a renovar, conviene borrarLOS."
const cuponUno = armarResumen({ dias: 30, actual: p(1, 1, 1), previo: p(1, 1, 1), senales: { cuponesVencidos: 1 } });
const cuponVarios = armarResumen({ dias: 30, actual: p(1, 1, 1), previo: p(1, 1, 1), senales: { cuponesVencidos: 3 } });
chequear("el cupón vencido conjuga toda la frase, no solo el sustantivo",
  cuponUno.pendientes[0].texto.includes("lo vas a renovar, conviene borrarlo") &&
  cuponVarios.pendientes[0].texto.includes("los vas a renovar, conviene borrarlos"),
  [cuponUno.pendientes[0].texto, cuponVarios.pendientes[0].texto]);

/* ── Marketing ────────────────────────────────────────────────────────────── */
console.log("\n5) Qué pasó con las campañas");

const campana = (nombre: string, usos: number, costo: number, facturado: number, ganancia: number | null) =>
  ({ nombre, usos, costo, facturado, ganancia });

const conMarketing = armarResumen({
  dias: 30,
  actual: p(1_240_000, 110, 6_000),
  previo: p(1_050_000, 125, 6_400),
  marketing: {
    mejor: campana("BIENVENIDA10", 8, 32_000, 288_000, 105_000),
    peor: campana("VERANO20", 5, 60_000, 90_000, 12_000),
    cuponesSinUsar: 2,
    promosSinUsar: 1,
  },
});

const textoMkt = conMarketing.parrafos.join(" ");
chequear("felicita a la que funcionó, con nombre", textoMkt.includes("BIENVENIDA10"), textoMkt);
chequear("y dice los dos números", textoMkt.includes("32.000") && textoMkt.includes("105.000"));
chequear("la buena NO va en pendientes",
  !conMarketing.pendientes.some((x) => x.texto.includes("BIENVENIDA10")));

const pend = conMarketing.pendientes.map((x) => x.texto).join(" ");
chequear("la que resigna de más va en pendientes", pend.includes("VERANO20"), pend);
chequear("los cupones sin usar también", pend.includes("2 cupones vigentes"), pend);
chequear("y las promos sin usar", pend.includes("1 promoción activa"), pend);
// La plata en juego ordena: $60.000 resignados pesan más que los que no cuestan nada.
chequear("la campaña cara va antes que las que no cuestan",
  conMarketing.pendientes[0].texto.includes("VERANO20"),
  conMarketing.pendientes.map((x) => x.texto));

// Sin marketing, el resumen tiene que quedar igual que antes.
const sinMkt = armarResumen({ dias: 30, actual: p(1_240_000, 110, 6_000), previo: p(1_050_000, 125, 6_400) });
chequear("sin datos de marketing no inventa nada",
  sinMkt.parrafos.length === subio.parrafos.length && sinMkt.pendientes.length === 0);

// Ganancia desconocida: no se puede afirmar que funcionó.
const sinGanancia = armarResumen({
  dias: 30, actual: p(1, 1, 1), previo: p(1, 1, 1),
  marketing: { mejor: campana("X", 5, 1_000, 10_000, null), peor: campana("Y", 5, 1_000, 10_000, null) },
});
chequear("sin ganancia conocida no felicita ni señala",
  sinGanancia.parrafos.length === 0 && sinGanancia.pendientes.length === 0,
  [sinGanancia.parrafos, sinGanancia.pendientes]);

chequear("ningún texto de marketing sale con NaN o undefined",
  !/NaN|undefined|null/.test(textoMkt + pend), textoMkt + pend);

/* ── Muestra ──────────────────────────────────────────────────────────────── */
console.log("\n─── Cómo se lee ───\n");
for (const r of [subio, porTicket, sinNada]) {
  console.log(r.titular);
  r.parrafos.forEach((x) => console.log(`  ${x}`));
  console.log("");
}
console.log(conSenales.pendientes.map((x) => `  · ${x.texto}`).join("\n"));

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
