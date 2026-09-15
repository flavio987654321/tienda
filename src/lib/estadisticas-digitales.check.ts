/**
 * Chequeos de Estadísticas de Productos Digitales. Se corre con:
 *
 *   npx tsx src/lib/estadisticas-digitales.check.ts
 *
 * `armarEstadisticas` es pura y se ejecuta de verdad: es una cuenta de plata
 * y de porcentajes, y una conversión mal dividida sale por pantalla como un
 * número perfectamente creíble. La pantalla se mira leyendo el archivo: que
 * bloquee por plan lo que corresponde, que busque las devoluciones donde
 * están, y que no pida nada que no exista.
 */

import { existsSync, readFileSync } from "node:fs";
import {
  resolverRango, armarEstadisticas, puedeVer, DESDE_QUE_PLAN, RANGOS, DIAS_DE_TODO,
  type OrdenCruda, type VisitaCruda, type OrigenCrudo, type CampaniaCruda, type Bloque,
} from "./estadisticas-digitales";
import { OTRAS } from "./utm-digital";
import { DIAS_RETENCION_VISITAS } from "./retencion";
import { featuresDigital } from "./planes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/* ── El rango ────────────────────────────────────────────────────────────── */

const HOY = "2026-09-14";
check("RANGO-A", resolverRango("hoy", HOY).desde === HOY && resolverRango("hoy", HOY).dias === 1,
  "hoy es un solo día");
check("RANGO-B", resolverRango("7", HOY).desde === "2026-09-08" && resolverRango("7", HOY).hasta === HOY,
  "7 días incluye hoy y los seis anteriores");
check("RANGO-C", resolverRango(undefined, HOY).clave === "30" && resolverRango("banana", HOY).clave === "30",
  "sin parámetro o con uno inventado, 30 días");
check("RANGO-D", DIAS_DE_TODO === DIAS_RETENCION_VISITAS && resolverRango("todo", HOY).dias === DIAS_DE_TODO,
  "\"Todo\" llega hasta donde se guardan las visitas: más atrás la conversión sería inventada");
check("RANGO-E", RANGOS.includes("hoy") && RANGOS.includes("90"), "hoy y 90 días existen, como en la competencia");

/* ── Qué ve cada plan: por pregunta, bloques enteros ─────────────────────── */

const bloques = Object.keys(DESDE_QUE_PLAN) as Bloque[];
check("PLAN-A", (["ventas", "posventa"] as Bloque[]).every((b) => puedeVer("FREE", b))
  && bloques.filter((b) => puedeVer("FREE", b)).length === 2,
  "Free responde \"¿vendí y entregué bien?\": ventas y posventa, nada más");
check("PLAN-B", (["visitas", "cuando"] as Bloque[]).every((b) => puedeVer("STARTER", b) && !puedeVer("FREE", b))
  && !puedeVer("STARTER", "embudo") && !puedeVer("STARTER", "origenes") && !puedeVer("STARTER", "carritos"),
  "Starter responde \"¿la página funciona?\": suma visitas, conversión y cuándo se vende");
check("PLAN-C", bloques.every((b) => puedeVer("PRO", b))
  && (["embudo", "origenes", "campanias", "carritos"] as Bloque[]).every((b) => DESDE_QUE_PLAN[b] === "PRO"),
  "Pro responde \"¿dónde invierto?\": embudo, origen y carritos recuperados son suyos");
check("PLAN-D", DESDE_QUE_PLAN.ventas === "FREE" && DESDE_QUE_PLAN.posventa === "FREE",
  "las ventas y lo de después nunca se bloquean: ya las paga con la comisión");
check("PLAN-E",
  featuresDigital("FREE").some((f) => /conversión/i.test(f.text) && !f.on)
  && featuresDigital("STARTER").some((f) => /conversión/i.test(f.text) && f.on)
  && featuresDigital("PRO").some((f) => /embudo/i.test(f.text) && f.on)
  && featuresDigital("STARTER").some((f) => /embudo/i.test(f.text) && !f.on),
  "la página de precios promete lo mismo que aplica la pantalla");

/* ── La cuenta ───────────────────────────────────────────────────────────── */

const rango = resolverRango("7", HOY); // 08 al 14
const base: Omit<OrdenCruda, "estado" | "total" | "tasa" | "dia" | "principal"> = {
  motivo: null, diaSemana: 3, hora: 21, comprador: "u1", upsell: 0,
  bajo: true, vencidoSinBajar: false, mail: "ENVIADO", recordada: false, origen: null, campania: null,
};
const orden = (o: Partial<OrdenCruda> & Pick<OrdenCruda, "estado" | "total" | "tasa" | "dia" | "principal">): OrdenCruda => ({ ...base, ...o });

const ordenes: OrdenCruda[] = [
  orden({ estado: "CONFIRMED", total: 10000, tasa: 8, dia: "2026-09-10", principal: "a", comprador: "u1", upsell: 3000, origen: "instagram",
    campania: { medio: "pago", campania: "lanzamiento", anuncio: "video2" } }),
  orden({ estado: "CONFIRMED", total: 10000, tasa: 8, dia: "2026-09-10", principal: "a", comprador: "u2", bajo: false, vencidoSinBajar: true, mail: "FALLO", origen: "instagram",
    campania: { medio: "pago", campania: "lanzamiento", anuncio: "foto" } }),
  orden({ estado: "CONFIRMED", total: 20000, tasa: 2, dia: "2026-09-14", principal: "b", comprador: "u1", bajo: null, mail: null, recordada: true, diaSemana: 0, hora: 9 }),
  orden({ estado: "DEVUELTA", total: 10000, tasa: 8, dia: "2026-09-12", principal: "a", motivo: "contracargo", comprador: "u3" }),
  /* Fuera del rango: no cuenta. */
  orden({ estado: "CONFIRMED", total: 99999, tasa: 8, dia: "2026-09-01", principal: "a", comprador: "u9" }),
];
const visitas: VisitaCruda[] = [
  { productId: "a", date: "2026-09-10", paso: "pagina", dispositivo: "movil", count: 40 },
  { productId: "a", date: "2026-09-10", paso: "pagina", dispositivo: "escritorio", count: 10 },
  { productId: "a", date: "2026-09-10", paso: "pagar", dispositivo: "movil", count: 10 },
  { productId: "b", date: "2026-09-14", paso: "pagina", dispositivo: "movil", count: 50 },
  { productId: "b", date: "2026-09-14", paso: "pagar", dispositivo: "escritorio", count: 5 },
  { productId: "a", date: "2026-09-01", paso: "pagina", dispositivo: "movil", count: 1000 },
];
const origenes: OrigenCrudo[] = [
  { productId: "a", date: "2026-09-10", source: "instagram", count: 30 },
  { productId: "a", date: "2026-09-10", source: "directo", count: 20 },
  { productId: "b", date: "2026-09-14", source: "whatsapp", count: 40 },
  { productId: "b", date: "2026-09-14", source: "inventado", count: 10 },
];
const principales = [
  { id: "a", name: "Mecánica", publicada: true },
  { id: "b", name: "Tortas", publicada: true },
  { id: "c", name: "Vacío", publicada: false },
];

const carritos = [
  { dia: "2026-09-11", principal: "a", recordado: true },
  { dia: "2026-09-11", principal: "a", recordado: false },
  { dia: "2026-09-13", principal: "b", recordado: true },
  /* Fuera del rango: no cuenta. */
  { dia: "2026-09-01", principal: "a", recordado: true },
];
const campanias: CampaniaCruda[] = [
  { productId: "a", date: "2026-09-10", medio: "pago", campania: "lanzamiento", anuncio: "video2", count: 20 },
  { productId: "a", date: "2026-09-10", medio: "pago", campania: "lanzamiento", anuncio: "foto", count: 10 },
  { productId: "b", date: "2026-09-14", medio: "historia", campania: "promo", anuncio: "", count: 15 },
  { productId: "a", date: "2026-09-10", medio: "pago", campania: OTRAS, anuncio: "", count: 5 },
  /* Un medio inventado no entra; una fuera de rango tampoco. */
  { productId: "a", date: "2026-09-10", medio: "banana", campania: "x", anuncio: "", count: 99 },
  { productId: "a", date: "2026-09-01", medio: "pago", campania: "vieja", anuncio: "", count: 99 },
];
const todo = armarEstadisticas({ rango, ordenes, visitas, origenes, principales, elegido: null, carritos, campanias });

check("CUENTA-A", todo.kpis.ventas === 3 && todo.kpis.devueltas === 1 && todo.kpis.bruto === 40000,
  "3 ventas, 1 devuelta, bruto 40.000; la de fuera del rango no cuenta");
check("CUENTA-B", todo.kpis.comision === 800 + 800 + 400 && todo.kpis.neto === 40000 - 2000,
  "la comisión se descuenta con la tasa congelada de cada orden");
check("CUENTA-C", todo.kpis.ticket !== null && Math.round(todo.kpis.ticket) === 13333,
  "el ticket promedio es bruto ÷ ventas");
check("CUENTA-D", todo.kpis.visitas === 100 && todo.kpis.checkouts === 15 && todo.kpis.conversion === 3,
  "100 visitas, 15 checkouts, conversión 3 %");
check("CUENTA-E", todo.embudo.pctCheckout === 15 && todo.embudo.pctVenta === 20,
  "embudo: 15 % abrió el checkout, 20 % de ésos pagó");
check("CUENTA-F", todo.serie.grano === "dia" && todo.serie.visitas.length === 7
  && todo.serie.visitas.map((p) => p.value).join(",") === "0,0,50,0,0,0,50",
  "la serie trae los 7 días, con cero donde no pasó nada");
check("CUENTA-G", todo.serie.ventas.map((p) => p.value).join(",") === "0,0,2,0,0,0,1"
  && todo.serie.bruto.map((p) => p.value).join(",") === "0,0,20000,0,0,0,20000",
  "ventas y bruto por día, la devuelta no suma");
check("CUENTA-H", todo.porProducto.map((p) => p.id).join(",") === "b,a,c",
  "por producto de más a menos plata; el vacío figura último");
check("CUENTA-I", todo.porProducto[1].ventas === 2 && todo.porProducto[1].neto === 18400
  && todo.porProducto[1].visitas === 50 && todo.porProducto[1].conversion === 4,
  "cada producto con sus ventas, su neto, sus visitas y su conversión");
check("CUENTA-J", todo.dispositivos.movil === 90 && todo.dispositivos.escritorio === 10 && todo.dispositivos.pctMovil === 90,
  "el dispositivo se cuenta sólo sobre las entradas a la página, no sobre los checkouts");

/* Después de la venta */
const pv = todo.posventa;
check("POSV-A", pv.descargas.conPermiso === 2 && pv.descargas.bajaron === 1 && pv.descargas.sinBajar === 1
  && pv.descargas.vencidosSinBajar === 1 && pv.descargas.pctBajaron === 50,
  "descargas por compra: la que no tiene permiso todavía no cuenta, la vencida sin bajar se señala");
check("POSV-B", pv.devoluciones.total === 1 && pv.devoluciones.contracargo === 1 && pv.devoluciones.arrepentimiento === 0
  && pv.devoluciones.tasa === 25,
  "devoluciones con motivo; la tasa es sobre cobradas + devueltas (1 de 4)");
check("POSV-C", pv.upsell.ventas === 1 && pv.upsell.plata === 3000 && pv.upsell.pct !== null && Math.round(pv.upsell.pct * 10) === 333,
  "upsell: cuántas lo llevaron y cuánta plata extra");
check("POSV-D", pv.mails.enviados === 1 && pv.mails.fallados === 1,
  "mails de entrega: salidos y fallados; el que no salió todavía no es ninguno");
check("POSV-E", pv.compradores.unicos === 2 && pv.compradores.repiten === 1,
  "compradores distintos y cuántos repiten");

/* Cuándo se vende */
check("CUANDO-A", todo.cuando.porDiaSemana[3] === 2 && todo.cuando.porDiaSemana[0] === 1
  && todo.cuando.porHora[21] === 2 && todo.cuando.porHora[9] === 1,
  "por día de la semana y por hora, sólo las cobradas");

/* Orígenes: visitas y ventas */
check("ORIG-A", todo.origenes.conocidas === 90 && todo.origenes.filas[0].origen === "whatsapp"
  && todo.origenes.filas.at(-1)?.origen === "directo",
  "orígenes: una etiqueta fuera de la lista se descarta, y directo va al final");
const ig = todo.origenes.filas.find((f) => f.origen === "instagram")!;
check("ORIG-B", ig.visitas === 30 && ig.ventas === 2 && ig.conversion !== null && Math.round(ig.conversion * 10) === 67
  && todo.origenes.ventasSinOrigen === 1,
  "cada origen con sus ventas y su conversión; la venta sin origen se cuenta aparte");

/* Campañas */
const camp = todo.campanias;
check("UTM-A", camp.conVisitas === 50 && camp.ventasConCampania === 2 && camp.filas.length === 3,
  "campañas: 50 visitas con campaña, 2 ventas con campaña, 3 campañas (una es la bolsa)");
check("UTM-B", camp.filas[0].campania === "lanzamiento" && camp.filas[0].medio === "pago" && camp.filas[0].visitas === 30
  && camp.filas[0].ventas === 2 && camp.filas[0].neto === 18400 && camp.filas[0].conversion !== null && Math.round(camp.filas[0].conversion * 10) === 67,
  "la que más vendió va primera, con visitas, ventas, neto y conversión sumados");
check("UTM-C", camp.filas[0].anuncios.map((a) => a.anuncio).join(",") === "video2,foto"
  && camp.filas[0].anuncios[0].visitas === 20 && camp.filas[0].anuncios[0].ventas === 1 && camp.filas[0].anuncios[0].conversion === 5,
  "adentro, cada anuncio con lo suyo, el que más vendió primero");
check("UTM-D", camp.filas.at(-1)?.campania === OTRAS && camp.filas.at(-1)?.visitas === 5,
  "\"(otras)\" siempre al final: es una bolsa");
check("UTM-E", !camp.filas.some((f) => f.campania === "x" || f.campania === "vieja"),
  "un medio inventado y una campaña fuera del rango no entran");
check("UTM-F", armarEstadisticas({ rango, ordenes, visitas, origenes, principales, elegido: "b", carritos, campanias }).campanias.filas.map((f) => f.campania).join(",") === "promo",
  "mirando un producto, sólo sus campañas");
check("UTM-G", puedeVer("PRO", "campanias") && !puedeVer("STARTER", "campanias") && DESDE_QUE_PLAN.campanias === "PRO",
  "las campañas son de Pro, con el origen y el embudo");

/* Carritos */
check("CARR-A", todo.carritos.abandonados === 3 && todo.carritos.recordados === 3
  && todo.carritos.recuperados === 1 && todo.carritos.pctRecuperados !== null && Math.round(todo.carritos.pctRecuperados * 10) === 333,
  "carritos: los que quedaron, a cuántos les escribió (los que siguen sin pagar más los recuperados) y cuántos volvieron a pagar");
const carrA = armarEstadisticas({ rango, ordenes, visitas, origenes, principales, elegido: "a", carritos });
check("CARR-B", carrA.carritos.abandonados === 2 && carrA.carritos.recordados === 1 && carrA.carritos.recuperados === 0,
  "mirando un producto, los carritos son los de su página");

const soloA = armarEstadisticas({ rango, ordenes, visitas, origenes, principales, elegido: "a" });
check("CUENTA-K", soloA.kpis.ventas === 2 && soloA.kpis.visitas === 50 && soloA.kpis.conversion === 4
  && soloA.kpis.devueltas === 1,
  "mirando un producto, sólo lo suyo");
check("CUENTA-L", soloA.porProducto.length === 0, "mirando un producto no hay ranking");
check("CUENTA-M", soloA.origenes.filas.map((f) => f.origen).join(",") === "instagram,directo",
  "y los orígenes son los de ese producto");

const vacio = armarEstadisticas({ rango, ordenes: [], visitas: [], origenes: [], principales: [], elegido: null });
check("CUENTA-N", vacio.kpis.ticket === null && vacio.kpis.conversion === null && vacio.embudo.pctCheckout === null
  && vacio.posventa.descargas.pctBajaron === null && vacio.posventa.devoluciones.tasa === null
  && vacio.dispositivos.pctMovil === null && vacio.carritos.pctRecuperados === null,
  "sin datos no se divide por cero: todo porcentaje queda en null, no en NaN");

const largo = armarEstadisticas({ rango: resolverRango("todo", HOY), ordenes, visitas, origenes, principales, elegido: null });
check("CUENTA-O", largo.serie.grano === "mes" && largo.serie.visitas.length < 40,
  "con dos años la serie se agrupa por mes");

/* ── La pantalla ─────────────────────────────────────────────────────────── */

const pagina = "src/app/digitales/estadisticas/page.tsx";
const cliente = "src/app/digitales/estadisticas/EstadisticasClient.tsx";
check("PANT-A", existsSync(pagina) && existsSync(cliente), "la pantalla existe");
if (existsSync(pagina) && existsSync(cliente)) {
  const p = leer(pagina);
  const c = leer(cliente);
  const barra = readFileSync("src/app/digitales/DigitalesSidebar.tsx", "utf8");
  check("PANT-B", /armarEstadisticas\(/.test(p) && /resolverRango\(/.test(p),
    "la página cuenta en el servidor con la librería");
  /* ⚠️ Las devoluciones NO tienen estado propio: quedan CANCELLED con el pago
     en REFUNDED. Buscarlas por `status: "REFUNDED"` las contaba como cero. */
  check("PANT-C", /\{ status: "CANCELLED", payment: \{ status: "REFUNDED" \} \}/.test(p) && !/"REFUNDED"\]/.test(p),
    "las devueltas se buscan como canceladas con el pago devuelto, que es como quedan");
  check("PANT-C2", /changedBy: \{ in: Object\.keys\(MOTIVOS\) \}/.test(p) && /digital_devolucion/.test(p) && /digital_contracargo/.test(p),
    "el motivo de la devolución sale de la historia de la orden");
  check("PANT-D", (["visitas", "cuando", "embudo", "origenes", "campanias", "carritos"] as Bloque[]).every((b) => new RegExp(`puedeVer\\(tier, "${b}"\\)`).test(c)),
    "la pantalla bloquea por plan cada bloque que no es de Free");
  check("PANT-D2", !/puedeVer\(tier, "posventa"\)/.test(c) && /<Posventa p=\{posventa\} \/>/.test(c),
    "lo de después de la venta se dibuja sin candado: es de todos");
  check("PANT-E", /<BotonVolver/.test(p), "tiene botón de volver");
  check("PANT-F", /href: "\/digitales\/estadisticas"/.test(barra), "está en la barra lateral");
  check("PANT-G", /Disponible desde/.test(c), "un bloque bloqueado dice desde qué plan se ve");
  check("PANT-H", /timeZone: AR_TZ, weekday: "short", hour: "numeric", hourCycle: "h23"/.test(p),
    "el día de la semana y la hora se leen en hora argentina, no en la del servidor");
  check("PANT-I", /MADURACION_MS/.test(p) && /status: "PENDING"/.test(p) && /carritos: pendientes\.map/.test(p),
    "los carritos se cuentan con la misma maduración que la pantalla de Carritos, y por producto");
  check("PANT-J", /prisma\.digitalVisitaCampania\.findMany/.test(p) && /utmMedio: true, utmCampania: true, utmAnuncio: true,/.test(p)
    && /PARAMETROS_PARA_META/.test(c) && /Campañas/.test(c),
    "la página trae las campañas y la orden con sus etiquetas; la pantalla las dibuja con el texto para Meta");
}

/* ── El origen viaja con la orden ────────────────────────────────────────── */

const checkout = leer("src/app/p/[id]/pagar/CheckoutClient.tsx");
const comprar = leer("src/app/api/digitales/comprar/route.ts");
const visitaComp = leer("src/app/p/[id]/VisitaDigital.tsx");
check("ORDEN-A", /origen: origenAnotado\(p\.productoId\)/.test(checkout), "el checkout manda el origen que anotó la página");
check("ORDEN-B", /origenVisita,/.test(comprar) && /clasificarOrigen\(/.test(comprar),
  "la ruta lo clasifica con la lista cerrada y lo guarda en la orden");
check("ORDEN-B2", /referenteCrudo \|\| utmCrudo\s*\? clasificarOrigen\(/.test(comprar),
  "sin referente ni utm queda null, no \"directo\": clasificar la nada sería afirmar algo");
check("ORDEN-C", /if \(paso === "pagina"\) anotarOrigen\(productoId\);/.test(visitaComp),
  "la página de venta anota el origen al entrar, antes del dedup del ping");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
