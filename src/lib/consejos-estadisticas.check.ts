/**
 * Chequeos de los consejos de Estadísticas. Se corre con:
 *
 *   npx tsx src/lib/consejos-estadisticas.check.ts
 *
 * Lo que se prueba: que cada bloque tenga consejo con la cuenta en cero (es
 * para lo que existen), que con datos digan lo que los datos piden y no otra
 * cosa, y que ningún texto salga con un "undefined" o un "NaN" adentro, que es
 * lo que pasa cuando una regla mira un campo que no vino.
 */

import { readFileSync } from "node:fs";
import { consejoPara, type BloqueConConsejo } from "./consejos-estadisticas";
import { armarEstadisticas, resolverRango, type OrdenCruda, type Estadisticas } from "./estadisticas-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const BLOQUES: BloqueConConsejo[] = ["visitas", "ventas", "posventa", "cuando", "embudo", "porProducto", "carritos", "origenes", "campanias"];
const rango = resolverRango("30", "2026-09-14");
const principales = [{ id: "a", name: "Mecánica fácil", publicada: true }, { id: "b", name: "Guía de frenos", publicada: true }];

const orden = (x: Partial<OrdenCruda> = {}): OrdenCruda => ({
  estado: "CONFIRMED", motivo: null, total: 10000, tasa: 8, dia: "2026-09-10", diaSemana: 2, hora: 21,
  principal: "a", comprador: "u1", upsell: 0, bajo: true, vencidoSinBajar: false, mail: "ENVIADO", recordada: false,
  origen: null, campania: null, ...x,
});

const armar = (x: Partial<Parameters<typeof armarEstadisticas>[0]> = {}): Estadisticas =>
  armarEstadisticas({ rango, ordenes: [], visitas: [], origenes: [], principales, elegido: null, ...x });

const sano = (c: { texto: string }) => c.texto.length > 40 && !/undefined|NaN|null|\[object/.test(c.texto);

/* ── En cero ─────────────────────────────────────────────────────────────── */

const vacio = armar();
check("CERO-A", BLOQUES.every((b) => sano(consejoPara(b, vacio))), "con la cuenta en cero, los nueve bloques tienen consejo y ninguno sale roto");
check("CERO-B", consejoPara("posventa", vacio).accion?.href === "/digitales/ventas", "sin compras, el de posventa lleva a Tus ventas");
check("CERO-C", /una visita por persona y por día/.test(consejoPara("visitas", vacio).texto), "sin visitas explica cómo se cuentan y dónde poner el link");
check("CERO-D", /mañana siguiente/.test(consejoPara("carritos", vacio).texto), "sin carritos explica cuándo sale el mail: el cron corre una vez al día");
check("CERO-E", /utm_source=whatsapp/.test(consejoPara("origenes", vacio).texto), "sin orígenes explica por qué hace falta la etiqueta");

/* ── Posventa: el orden de lo que se pide ────────────────────────────────── */

const conFallados = armar({ ordenes: [orden({ mail: "FALLO", bajo: false }), orden({ comprador: "u2" })] });
check("POSV-A", /mail de entrega falló/.test(consejoPara("posventa", conFallados).texto) && consejoPara("posventa", conFallados).accion?.href === "/digitales/ventas",
  "un mail fallado va antes que todo: es alguien que pagó y no recibió nada");
const sinBajar = armar({ ordenes: [orden({ bajo: false }), orden({ bajo: false, comprador: "u2" }), orden({ comprador: "u3" })] });
check("POSV-B", /2 compras cobradas siguen sin bajar/.test(consejoPara("posventa", sinBajar).texto), "cuenta las compras sin bajar y manda a reenviar");
const repiten = armar({ ordenes: [orden(), orden({ dia: "2026-09-11" }), orden({ comprador: "u2" })] });
check("POSV-C", /1 persona te compró más de una vez/.test(consejoPara("posventa", repiten).texto), "con todo bajado y alguien que repite, señala la lista de repetidores");
const todoBien = armar({ ordenes: [orden({ upsell: 3000 })] });
check("POSV-D", /pedirle una reseña/.test(consejoPara("posventa", todoBien).texto), "con todo en orden, el consejo es la reseña");

/* ── Ventas y devoluciones ───────────────────────────────────────────────── */

const devueltas = armar({ ordenes: [orden(), orden({ comprador: "u2" }), orden({ comprador: "u3", estado: "DEVUELTA", motivo: "arrepentimiento" })] });
check("VENT-A", /Se devolvió el 33 %/.test(consejoPara("ventas", devueltas).texto), "con un tercio devuelto, lo dice y apunta a lo que promete la página");
check("VENT-B", /alguien que ya te conoce/.test(consejoPara("ventas", vacio).texto), "sin ventas, el consejo es la primera venta");

/* ── Cuándo se vende ─────────────────────────────────────────────────────── */

const pocas = armar({ ordenes: [orden(), orden({ comprador: "u2" })] });
check("CUAN-A", /pocas ventas para sacar una regla/.test(consejoPara("cuando", pocas).texto), "con dos ventas no inventa un patrón");
const martesALas21 = armar({ ordenes: Array.from({ length: 8 }, (_, i) => orden({ comprador: `u${i}`, diaSemana: i < 5 ? 2 : 5, hora: i < 6 ? 21 : 10 })) });
check("CUAN-B", /los martes, cerca de las 21 h/.test(consejoPara("cuando", martesALas21).texto), "con ventas alcanza: dice el día y la hora más fuertes");

/* ── El embudo ───────────────────────────────────────────────────────────── */

const visita = (count: number, paso: "pagina" | "pagar" = "pagina") => ({ productId: "a", date: "2026-09-10", paso, dispositivo: "movil" as const, count });
const pocosAbren = armar({ visitas: [visita(200), visita(4, "pagar")], ordenes: [orden()] });
check("EMB-A", /De cada 100 que entran, 2 abren el pago/.test(consejoPara("embudo", pocosAbren).texto), "200 visitas y 4 al pago: la página no convence");
const noTerminan = armar({ visitas: [visita(200), visita(40, "pagar")], ordenes: [orden(), orden({ comprador: "u2" })] });
check("EMB-B", /Abren el pago y no pagan: sólo 5 de cada 100/.test(consejoPara("embudo", noTerminan).texto), "40 al pago y 2 ventas: se frenan al pagar");
const sanoEmbudo = armar({ visitas: [visita(200), visita(40, "pagar")], ordenes: Array.from({ length: 30 }, (_, i) => orden({ comprador: `u${i}` })) });
check("EMB-C", /El embudo está sano/.test(consejoPara("embudo", sanoEmbudo).texto), "con 30 de 40 pagando, el consejo es traer más gente");
const poquitas = armar({ visitas: [visita(10)] });
check("EMB-D", /poca gente para sacar conclusiones/.test(consejoPara("embudo", poquitas).texto), "con diez visitas no opina");

/* ── Visitas y celular ───────────────────────────────────────────────────── */

const celular = armar({ visitas: [visita(90), { ...visita(10), dispositivo: "escritorio" as const }] });
check("VIS-A", /9 de cada 10 entran desde el celular/.test(consejoPara("visitas", celular).texto), "con 90 % móvil manda a mirar la página en el celular");
const parejo = armar({ visitas: [visita(50), { ...visita(50), dispositivo: "escritorio" as const }] });
check("VIS-B", /se guardan dos años/.test(consejoPara("visitas", parejo).texto), "si no, el consejo general, que además dice cuánto se guardan");

/* ── Por producto ────────────────────────────────────────────────────────── */

const dosProductos = armar({
  visitas: [visita(500), { ...visita(40), productId: "b" }],
  ordenes: [...Array.from({ length: 5 }, (_, i) => orden({ comprador: `a${i}` })), ...Array.from({ length: 3 }, (_, i) => orden({ comprador: `b${i}`, principal: "b" }))],
});
check("PROD-A", /«Guía de frenos» convierte mejor que «Mecánica fácil»/.test(consejoPara("porProducto", dosProductos).texto), "señala al que convierte mejor con menos visitas");
check("PROD-B", /pocas visitas y buena conversión/.test(consejoPara("porProducto", vacio).texto), "sin datos, el consejo general");

/* ── Carritos ────────────────────────────────────────────────────────────── */

const carritosPocos = armar({ carritos: Array.from({ length: 12 }, () => ({ dia: "2026-09-10", principal: "a", recordado: true })), ordenes: [orden({ recordada: true })] });
check("CARR-A", /Vuelven pocos/.test(consejoPara("carritos", carritosPocos).texto) && consejoPara("carritos", carritosPocos).accion?.href === "/digitales/carritos",
  "13 recordados y 1 recuperado: vuelven pocos, y lleva a Carritos");
const carritosBien = armar({ carritos: [{ dia: "2026-09-10", principal: "a", recordado: true }], ordenes: [orden({ recordada: true })] });
check("CARR-B", /un mensaje personal recupera más/i.test(consejoPara("carritos", carritosBien).texto), "con pocos recordados no opina del porcentaje: manda a escribirles");

/* ── Orígenes ────────────────────────────────────────────────────────────── */

const origen = (source: string, count: number, paso: "pagina" | "pagar" = "pagina") => ({ productId: "a", date: "2026-09-10", paso, source, count });
const dosCanales = armar({
  visitas: [visita(150)],
  origenes: [origen("instagram", 120), origen("whatsapp", 30)],
  ordenes: [orden({ origen: "instagram" }), orden({ origen: "whatsapp", comprador: "u2" }), orden({ origen: "whatsapp", comprador: "u3" }), orden({ origen: "whatsapp", comprador: "u4" })],
});
check("ORIG-A", /Instagram trae más gente, pero en WhatsApp es donde más pagan/.test(consejoPara("origenes", dosCanales).texto), "compara el que trae con el que paga");
const unCanal = armar({ visitas: [visita(150)], origenes: [origen("instagram", 120)], ordenes: [orden({ origen: "instagram" })] });
check("ORIG-B", /Instagram es tu canal/.test(consejoPara("origenes", unCanal).texto), "con un canal solo, exprimirlo");
const sinOrigen = armar({ visitas: [visita(150)], origenes: [origen("instagram", 120)], ordenes: [orden({ origen: "instagram" }), orden({ comprador: "u2" })] });
check("ORIG-C", /1 venta no tiene canal anotado/.test(consejoPara("origenes", sinOrigen).texto), "con ventas sin canal, pide más etiquetas");

/* ── Campañas ────────────────────────────────────────────────────────────── */

const camp = (campania: string, count: number) => ({ productId: "a", date: "2026-09-10", medio: "pago" as const, campania, anuncio: "", count });
const paraApagar = armar({ visitas: [visita(200)], campanias: [camp("video largo", 80), camp("testimonio", 60)], ordenes: [orden({ campania: { medio: "pago", campania: "testimonio", anuncio: "" } })] });
check("CAMP-A", /«video largo» trajo 80 visitas y ninguna venta/.test(consejoPara("campanias", paraApagar).texto), "nombra la campaña con visitas y sin ventas");
const todasVenden = armar({ visitas: [visita(200)], campanias: [camp("testimonio", 60)], ordenes: [orden({ campania: { medio: "pago", campania: "testimonio", anuncio: "" } })] });
check("CAMP-B", /merece más presupuesto/.test(consejoPara("campanias", todasVenden).texto), "si todas venden, el consejo general");

/* ── La pantalla ─────────────────────────────────────────────────────────── */

const c = readFileSync("src/app/digitales/estadisticas/EstadisticasClient.tsx", "utf8").replace(/\r\n/g, "\n");
const enganchados = BLOQUES.filter((b) => new RegExp(`consejo=\\{\\{ bloque: "${b}", datos \\}\\}`).test(c));
check("PANT-A", enganchados.length === BLOQUES.length, `los nueve bloques están enganchados en la pantalla (${enganchados.length}/9)`);
const bloqueados = c.split("<Bloqueado").slice(1).map((t) => t.split("</Bloqueado>")[0]);
check("PANT-B", bloqueados.length >= 8 && bloqueados.every((t) => !t.includes("consejo=")),
  `ningún bloque bloqueado lleva consejo (${bloqueados.length} bloqueados revisados): sería un consejo sobre números de muestra`);
check("PANT-C", /function Consejo\(/.test(c) && /Lightbulb/.test(c), "el consejo tiene su pieza, con la lamparita");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
