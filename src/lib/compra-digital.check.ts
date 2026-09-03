/**
 * Chequeos de la cuenta de una compra digital. Se corre con:
 *
 *   npx tsx src/lib/compra-digital.check.ts
 *
 * Esto decide **cuánta plata se cobra y cuánta se retiene**. Un error acá no
 * rompe nada ni tira ningún error: se cobra mal, y se descubre cuando alguien
 * revisa su liquidación — o nunca.
 */

import { readFileSync } from "fs";
import {
  totalDeLaCompra, comisionDeLaVenta, armarItems, upsellsQueValen,
  MAX_UPSELLS_POR_COMPRA, type ItemDeCompra,
} from "./compra-digital";
import { COMISION_DIGITAL } from "./planLimits";
import { TIERS_DIGITALES } from "./planes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const prod = (id: string, price: number, rol: string, padreId: string | null = "P") =>
  ({ id, name: id, price, rolDigital: rol, padreId });

const PRINCIPAL: ItemDeCompra = { id: "P", name: "Ebook", price: 15000, rolDigital: "PRINCIPAL" };

/* ── Lo que se cobra ──────────────────────────────────────────────────────── */

check("TOT-A", totalDeLaCompra(PRINCIPAL, []) === 15000,
  "sin agregados se cobra el precio del producto");
check("TOT-B", totalDeLaCompra(PRINCIPAL, [
  { id: "U1", name: "u", price: 4900, rolDigital: "UPSELL" },
  { id: "U2", name: "u", price: 2000, rolDigital: "UPSELL" },
]) === 21900, "cada upsell elegido suma");

/* ⚠️ Un precio negativo en la base —por un error de carga o de migración— no
   puede DESCONTAR del total. Sin el piso, un upsell a -20000 deja la compra en
   negativo y Mercado Pago le paga al comprador. */
check("TOT-C", totalDeLaCompra(PRINCIPAL, [
  { id: "U1", name: "u", price: -20000, rolDigital: "UPSELL" },
]) === 15000, "un precio negativo suma cero, nunca resta");
check("TOT-D", totalDeLaCompra({ ...PRINCIPAL, price: -5 }, []) === 0,
  "y el del principal tampoco puede ser negativo");

/* ⚠️ Éste destapó un bug de verdad. El filtro era `> 0`, y `Infinity > 0` da
   `true`: un precio infinito pasaba entero y salía una comisión infinita rumbo a
   Mercado Pago. `price` es un `Float`, y una columna de doble precisión de
   Postgres guarda `Infinity` y `NaN` sin quejarse. */
check("TOT-E", [Infinity, -Infinity, NaN].every((v) =>
  totalDeLaCompra({ ...PRINCIPAL, price: v }, []) === 0 &&
  totalDeLaCompra(PRINCIPAL, [{ id: "U", name: "u", price: v, rolDigital: "UPSELL" }]) === 15000),
  "un precio infinito o NaN vale cero, no rompe la cuenta");

/* ── La comisión ──────────────────────────────────────────────────────────── */

/* Los tres porcentajes salen del registro de planes, no escritos acá: si algún
   día cambian, este chequeo tiene que seguir pasando sin tocarlo. */
check("COM-A", TIERS_DIGITALES.every((t) =>
  comisionDeLaVenta(10000, t) === Math.round((10000 * COMISION_DIGITAL[t]) / 100)),
  "cada plan retiene su porcentaje, y sale del registro de planes");

check("COM-B", comisionDeLaVenta(17000, "FREE") === 1360, "Free sobre $17.000 retiene $1.360");
check("COM-C", comisionDeLaVenta(17000, "PRO") === 340, "y Pro, $340");

/* ⚠️ La comisión entra sobre el TOTAL, upsells incluidos. Es lo que explica que
   Free tenga un upsell habilitado: sube el ticket y con él la única comisión que
   Free paga. Si entrara sólo sobre el principal, el upsell sería gratis para
   nosotros y la decisión de dárselo a Free no se sostendría. */
const conUpsell = totalDeLaCompra(PRINCIPAL, [{ id: "U", name: "u", price: 5000, rolDigital: "UPSELL" }]);
check("COM-D", comisionDeLaVenta(conUpsell, "FREE") > comisionDeLaVenta(15000, "FREE"),
  "el upsell también paga comisión: entra sobre el total");

check("COM-E", [0, -1, NaN, Infinity].every((t) => comisionDeLaVenta(t, "FREE") === 0),
  "un total que no es un número no genera comisión");

/* ⚠️ Este número se le manda a Mercado Pago como `marketplace_fee`. Una comisión
   mayor que el importe hace fallar la preferencia o —peor— deja al vendedor
   cobrando negativo. */
check("COM-F", TIERS_DIGITALES.every((t) => comisionDeLaVenta(100, t) <= 100),
  "la comisión nunca puede ser mayor que lo que se cobra");

/* Entero: MP no acepta centavos partidos en el fee y la liquidación tiene que
   cerrar contra un número redondo. */
check("COM-G", Number.isInteger(comisionDeLaVenta(16999, "STARTER")),
  "siempre da un entero de pesos");

/* ── Las líneas de la orden ───────────────────────────────────────────────── */

const bonos: ItemDeCompra[] = [
  { id: "B1", name: "bono", price: 0, rolDigital: "BONO" },
  { id: "B2", name: "bono", price: 0, rolDigital: "BONO" },
];
const ups: ItemDeCompra[] = [{ id: "U1", name: "u", price: 4900, rolDigital: "UPSELL" }];
const lineas = armarItems(PRINCIPAL, bonos, ups);

/* ⚠️ EL chequeo de este archivo. El permiso de descarga (`DigitalDownload`)
   cuelga de `OrderItem`, uno por línea. Un bono sin línea no tiene de dónde
   colgar su permiso: se cobra la compra y ese bono no se entrega NUNCA. */
check("LIN-A", lineas.length === 4,
  "hay una línea por cosa entregable: principal, los dos bonos y el upsell");
check("LIN-B", bonos.every((b) => lineas.some((l) => l.productId === b.id)),
  "y ningún bono se queda afuera: sin línea no hay permiso de descarga");

check("LIN-C", lineas.filter((l) => l.price === 0).length === 2,
  "los bonos van a precio cero: van incluidos, es su definición");
check("LIN-D", lineas[0].productId === "P" && lineas[0].price === 15000,
  "el principal va primero y con su precio");

/* La suma de las líneas coincide con el total. No se usa para cobrar —a MP se le
   manda un solo ítem con el total— pero si no cerrara, el desglose del mail le
   diría al comprador una cosa y el cobro otra. */
check("LIN-E", lineas.reduce((s, l) => s + l.price, 0) === totalDeLaCompra(PRINCIPAL, ups),
  "las líneas suman exactamente el total que se cobra");

/* ── Qué upsells se aceptan ───────────────────────────────────────────────── */

const hijos = [
  prod("U1", 4900, "UPSELL"),
  prod("U2", 2000, "UPSELL"),
  prod("B1", 0, "BONO"),
  prod("AJENO", 9999, "UPSELL", "OTRO_PADRE"),
  prod("GRATIS", 0, "UPSELL"),
];

check("UPS-A", upsellsQueValen(["U1", "U2"], hijos, "P").map((u) => u.id).join() === "U1,U2",
  "los upsells de este producto entran");

/* ⚠️ LO MÁS SERIO DE ESTA FUNCIÓN. El navegador manda identificadores. Sin este
   filtro, alguien manda el id de un producto de OTRO embudo —o de otro
   vendedor— y se lo lleva adentro de su compra: entra a la orden, genera su
   permiso de descarga y baja un ebook ajeno pagando el precio del suyo. */
check("UPS-B", upsellsQueValen(["AJENO"], hijos, "P").length === 0,
  "un upsell de OTRO producto no entra, aunque exista");
check("UPS-C", upsellsQueValen(["B1"], hijos, "P").length === 0,
  "un bono no se puede colar como upsell: ya va incluido y gratis");
check("UPS-D", upsellsQueValen(["NO_EXISTE"], hijos, "P").length === 0,
  "un id inventado no entra");

/* Un upsell a precio cero es un error de carga, no un regalo: para eso está el
   bono. Cobrarlo a cero ensucia la orden sin darle nada a nadie. */
check("UPS-E", upsellsQueValen(["GRATIS"], hijos, "P").length === 0,
  "un upsell sin precio no entra");

check("UPS-F", upsellsQueValen(["U1", "U1", "U1"], hijos, "P").length === 1,
  "el mismo id repetido se compra una sola vez");

check("UPS-G", [null, undefined, "U1", 5, {}].every((v) => upsellsQueValen(v, hijos, "P").length === 0),
  "lo que no es una lista no agrega nada");

check("UPS-H", upsellsQueValen([1, null, {}, "U1"], hijos, "P").length === 1,
  "y adentro de la lista, lo que no es texto se descarta sin romper");

/* Techo absoluto contra un pedido que mande mil identificadores. */
check("UPS-I", upsellsQueValen(new Array(500).fill("U1"), hijos, "P").length <= MAX_UPSELLS_POR_COMPRA,
  "hay un techo de cuántos se miran, aunque manden quinientos");

/* ── La ruta: lo que no se puede probar con números ───────────────────────── */

const ruta = readFileSync("src/app/api/digitales/comprar/route.ts", "utf8");

/* ⚠️ Es la PRIMERA ruta pública de digitales: las otras siete piden sesión y rol.
   A ésta le pega cualquiera desde internet, y cada pedido que pasa le escribe
   una orden a la base y le pide una preferencia a Mercado Pago con el token del
   vendedor. */
check("RUT-A", ruta.includes("checkRateLimit"),
  "la ruta pública tiene límite por IP");

/* ⚠️ Ningún precio llega del navegador. Si el cuerpo del pedido pudiera traer un
   importe, cualquiera compra un ebook a un peso desde la consola. */
check("RUT-B", !/cuerpo\.(precio|price|total|monto|importe)/.test(ruta),
  "ningún precio se lee del pedido: todos salen de la base");

/* No se le vende a un producto borrado, ni despublicado, ni sin archivo. */
check("RUT-C", ruta.includes("deletedAt: null") && ruta.includes("isActive: true") &&
  ruta.includes("loQueFalta"),
  "no se cobra por algo borrado, despublicado o sin archivo que entregar");

/* ⚠️ Las URLs de retorno se arman con datos NUESTROS. Es a donde vuelve alguien
   que acaba de pagar: dejar que la elija quien llama a la ruta es regalarle a
   dónde mandar a un comprador con la plata ya puesta. */
check("RUT-D", !/backUrls[\s\S]{0,400}cuerpo\./.test(ruta),
  "las URLs de retorno no llevan nada que haya mandado el navegador");

/* SIEMPRE un solo ítem con el total exacto. Reconstruirlo sumando líneas ya
   cobró un peso de más en el otro ecosistema. */
check("RUT-E", /unit_price: total/.test(ruta),
  "a Mercado Pago se le manda un solo ítem con el total exacto");

/* ⚠️ Volver atrás desde Mercado Pago y apretar Pagar otra vez dejaba una orden
   PENDING por intento: el panel de ventas se llena de compras que nunca fueron. */
check("RUT-F", ruta.includes('status: "PENDING"') && ruta.includes("createdAt: { gte: desde }"),
  "una orden pendiente reciente se reusa: el doble click no deja dos");

/* Nunca se actualiza una cuenta existente desde el checkout: si el correo es de
   alguien que vende, se le colgaría la orden encima de sus datos. */
check("RUT-G", /findUnique\(\{ where: \{ email \}[\s\S]{0,200}user\.create/.test(ruta),
  "un correo que ya tiene cuenta se reusa y NO se toca");

console.log(fallos === 0
  ? "\nok — la compra digital cobra lo que dice y no entrega lo que no se pagó"
  : `\nFALLA — ${fallos} chequeo(s) de la compra digital`);
process.exit(fallos === 0 ? 0 : 1);
