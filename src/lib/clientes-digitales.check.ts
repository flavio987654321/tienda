/**
 * Chequeos de Tus clientes (Productos Digitales).
 *
 *   npx tsx src/lib/clientes-digitales.check.ts
 *
 * Lo que se cuida: que un cliente sea alguien que PAGÓ; que los números sean
 * los mismos que Ventas; que "sin bajar" mire sólo lo vigente; y que a quien
 * pidió la baja no se le ofrezca el mail.
 */

import { readFileSync } from "node:fs";
import { armarCliente, leerConsultaDeClientes, direccionDeClientes, direccionParaEscribirles, resumirClientes, type CompraCruda } from "./clientes-digitales";
import { comisionCongelada } from "./compra-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string, detalle?: unknown) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const leer = (p: string) => readFileSync(p, "utf8");

const ahora = new Date("2026-09-21T15:00:00Z");
const d = (iso: string) => new Date(iso);
const permiso = (descargas: number, vence = "2027-01-01T00:00:00Z") => ({ descargas, expiresAt: d(vence) });
const compras: CompraCruda[] = [
  /* La primera: cobrada, con upsell, bajó todo. */
  { id: "o1", status: "CONFIRMED", total: 10000, lockedCommissionRate: 10, createdAt: d("2026-08-01T12:00:00Z"), telefonoDigital: "1155550000",
    items: [{ product: { name: "Guía", rolDigital: "PRINCIPAL" }, descargas: [permiso(2)] }, { product: { name: "Extra", rolDigital: "UPSELL" }, descargas: [permiso(1)] }] },
  /* La segunda: cobrada, un archivo sin bajar vigente y otro sin bajar VENCIDO. */
  { id: "o2", status: "CONFIRMED", total: 5000, lockedCommissionRate: 5, createdAt: d("2026-09-10T12:00:00Z"), telefonoDigital: null,
    items: [{ product: { name: "Recetario", rolDigital: "PRINCIPAL" }, descargas: [permiso(0)] }, { product: { name: "Bono", rolDigital: "BONO" }, descargas: [permiso(0, "2026-09-01T00:00:00Z")] }] },
  /* Una devuelta: no cuenta como compra ni suma plata, pero se ve. */
  { id: "o3", status: "CANCELLED", total: 7000, lockedCommissionRate: 10, createdAt: d("2026-09-15T12:00:00Z"), telefonoDigital: "1155559999",
    items: [{ product: { name: "Guía", rolDigital: "PRINCIPAL" }, descargas: [permiso(0)] }] },
];
const c = armarCliente({ id: "u1", name: "  Ana  ", email: "ana@x.com", phone: "11 5555-1234" }, compras, ahora, false);

check("CLI-A", c.compras === 2 && c.devoluciones === 1 && c.gasto === 15000
  && c.neto === (10000 - comisionCongelada(10000, 10)) + (5000 - comisionCongelada(5000, 5)),
  "cuenta las cobradas, aparte las devueltas, y el neto con la MISMA comisión congelada que Ventas");
/* ⚠️ EL TELÉFONO SALE DE LA COMPRA MÁS RECIENTE QUE HAYA DEJADO UNO, no de
   la cuenta de la persona: el checkout digital lo guarda en la orden porque
   esa cuenta es una sola para toda la plataforma. Acá "o3" es la más reciente
   y dejó uno, así que gana; si ninguna tuviera, quedaría el de la cuenta. */
check("CLI-A2", c.telefono === "1155559999"
  && armarCliente({ id: "u1", name: "Ana", email: "ana@x.com", phone: "11 5555-1234" },
      compras.map((x) => ({ ...x, telefonoDigital: null })), ahora, false).telefono === "11 5555-1234",
  "el teléfono sale de la compra más reciente que haya dejado uno, y si no hay, de la cuenta");

check("CLI-B", c.sinBajar === 1 && c.historial[1].sinBajar === 1 && c.historial[0].sinBajar === 0,
  "«sin bajar» es sólo lo pago, sin bajar y VIGENTE: el vencido no cuenta, y la devuelta tampoco");
check("CLI-C", c.historial.map((h) => h.id).join(",") === "o3,o2,o1" && c.ultima === "15/09/26" && c.primera === "01/08/26"
  && c.historial[2].conUpsell && !c.historial[1].conUpsell && c.historial[0].estado === "DEVUELTA",
  "el historial va de la última a la primera, con fecha argentina, y dice qué llevó upsell y qué se devolvió");
check("CLI-D", c.nombre === "Ana" && c.ultimoProducto === "Guía" && c.productos.join("|") === "Guía|Recetario",
  "el nombre sale limpio, el último producto es el de la última compra, y los productos no se repiten");

const r = resumirClientes([{ compras: 1, sinBajar: 0 }, { compras: 3, sinBajar: 1 }, { compras: 2, sinBajar: 0 }]);
check("CLI-E", r.clientes === 3 && r.repiten === 2 && r.sinBajar === 1, "los números de arriba: cuántos, cuántos repiten, cuántos no bajaron");

const q = leerConsultaDeClientes({ q: ["  ana@x.com  ", "otra"], pagina: "3" });
const mala = leerConsultaDeClientes({ q: "x".repeat(500), pagina: "-2" });
check("CLI-F", q.q === "ana@x.com" && q.pagina === 3 && mala.q.length === 120 && mala.pagina === 1
  && direccionDeClientes({ q: "ana", pagina: 2 }) === "/digitales/clientes?q=ana&pagina=2" && direccionDeClientes({}) === "/digitales/clientes",
  "lo que llega por la dirección se recorta y se limpia antes de tocar la base; la dirección se arma sin ruido");

/* ── Lo que toca la base y la pantalla ──────────────────────────────────── */
const page = leer("src/app/digitales/clientes/page.tsx");
/* El `where` vive en la lib de base, que comparten la página y la exportación. */
const db = leer("src/lib/clientes-digitales-db.ts");
const cliente = leer("src/app/digitales/clientes/ClientesClient.tsx");
const barra = leer("src/app/digitales/DigitalesSidebar.tsx");

check("CLI-G", /user\.role !== "DIGITAL"/.test(page)
  && /OR: \[\{ status: "CONFIRMED" \}, \{ status: "CANCELLED", payment: \{ status: "REFUNDED" \} \}\]/.test(db)
  && /consulta\.q \? \[\{ OR: \[\{ email: \{ contains: consulta\.q, mode: "insensitive" as const \} \}, \{ name: \{ contains: consulta\.q, mode: "insensitive" as const \} \}\] \}\]/.test(db)
  && /orderBy: \{ _max: \{ createdAt: "desc" \} \}/.test(db) && /idsDeClientes\(ctx, \(ctx\.consulta\.pagina - 1\) \* CLIENTES_POR_PAGINA, CLIENTES_POR_PAGINA\)/.test(page)
  && !/status: "PENDING"/.test(db) && !/status: "PENDING"/.test(page),
  "la página pide sesión digital, trae lo pagado (cobradas y devueltas, nunca pendientes), busca por la persona, y pagina en el servidor por última compra");

/* ── 21/09/26: los filtros ─────────────────────────────────────────────────
   "Compraron X" y "no compraron Y" son el MISMO segmento que Mail a tus
   compradores (mismo criterio: alguna cobrada de ESTA cuenta con ese
   producto), y "Escribirles a estos" lleva allá con el segmento puesto.
   "Repiten" se decide contando cobradas (having ≥ 2). Un id que no sea de
   un producto propio se cae a "sin filtro". */
const f1 = leerConsultaDeClientes({ p: "c" + "a".repeat(24), sin: "no-es-un-id", f: "repiten" });
const f2 = leerConsultaDeClientes({ f: "otra" });
check("CLI-K", f1.p === "c" + "a".repeat(24) && f1.sin === null && f1.f === "repiten" && f2.f === null
  && direccionDeClientes({ p: "x", sin: "y", f: "sin-bajar", pagina: 2 }) === "/digitales/clientes?p=x&sin=y&f=sin-bajar&pagina=2"
  && direccionParaEscribirles({ p: "x", sin: "y" }) === "/digitales/marketing/compradores?p=x&sin=y"
  && direccionParaEscribirles({ p: null, sin: null }) === "/digitales/marketing/compradores",
  "los filtros se leen limpios de la dirección, y «Escribirles a estos» lleva a Mail a tus compradores con el mismo segmento");
check("CLI-L", /const propio = \(id: string \| null\) => \(id && productos\.some/.test(db)
  && /\.\.\.\(p \? \[\{ orders: \{ some: cobradaCon\(p\) \} \}\] : \[\]\)/.test(db) && /\.\.\.\(sin \? \[\{ NOT: \{ orders: \{ some: cobradaCon\(sin\) \} \} \}\] : \[\]\)/.test(db)
  && /buyer: \{ AND: condiciones \}/.test(db)
  && /const cobradaCon = \(productId: string\): Prisma\.OrderWhereInput => \(\{ storeId: store\.id, status: "CONFIRMED", items: \{ some: \{ productId \} \} \}\)/.test(db)
  && /having = f === "repiten" \? \{ buyerId: \{ _count: \{ gte: 2 \} \} \} : undefined/.test(db)
  && /descargas: \{ some: \{ descargas: 0, expiresAt: \{ gt: ahora \} \} \}/.test(db),
  "los filtros se aplican sobre la PERSONA con el mismo criterio que el mail; repiten cuenta cobradas; sin bajar mira permisos vigentes");
check("CLI-M", /direccionParaEscribirles\(\{ p, sin \}\)/.test(cliente) && /const escribibles = \(p \|\| sin\) && !f;/.test(cliente)
  && /productos\.length > 1 && \(/.test(cliente) && /Escribirles a estos/.test(cliente),
  "el botón de escribirles aparece sólo con un segmento del mail, y «no compraron» sólo con más de un producto");
check("CLI-H", /prisma\.bajaCorreoDigital\.findMany\(\{\s*where: \{ storeId: ctx\.store\.id, email: \{ in: personas\.map\(\(x\) => x\.email\.toLowerCase\(\)\) \}/.test(db)
  && /\{!c\.dioDeBaja && \(\s*<a href=\{enlaceDeMail\(c\.email, mensaje\)\}/.test(cliente) && /Sin mails/.test(cliente),
  "a quien pidió la baja se lo marca y no se le ofrece el mail; WhatsApp y Ventas siguen");
check("CLI-I", /mensajeParaElComprador\(\{ nombre: c\.nombre, producto: c\.ultimoProducto, sinBajar: c\.sinBajar > 0 \}\)/.test(cliente)
  && /\/digitales\/ventas\?q=\$\{encodeURIComponent\(c\.email\)\}/.test(cliente) && /Preguntarle si le llegó/.test(cliente),
  "el mensaje es el mismo que el de Ventas (¿te llegó? si tiene algo sin bajar), y «Ver sus ventas» filtra Ventas por su mail");
const links = [...barra.matchAll(/href: "\/digitales\/([a-z-]+)", label: "([^"]+)"/g)].map((m) => m[2]);
/* Inicio tiene el href pelado (/digitales) y queda afuera del patrón a propósito. */
check("CLI-J", links.join(" · ") === "Productos · Ventas · Clientes · Carritos · Estadísticas · Marketing · Configuración · Mi cuenta",
  "el menú: Productos, Ventas, Clientes, Carritos, Estadísticas, Marketing — la plata, quién la puso, la que se escapó, si la página sirve, y cómo traer más", links);

console.log(fallos === 0
  ? "\nok — un cliente es alguien que pagó, y los números son los de Ventas"
  : `\nFALLA — ${fallos} chequeo(s) de Tus clientes`);
process.exit(fallos === 0 ? 0 : 1);
