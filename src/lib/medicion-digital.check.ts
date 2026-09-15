/**
 * Chequeos de la medición de la página de venta digital. Se corre con:
 *
 *   npx tsx src/lib/medicion-digital.check.ts
 *
 * Lo que importa: que los tres pasos del embudo lleven el píxel que la dueña
 * pegó (hasta el 15/09/26 se guardaba y nadie lo leía), que Purchase se dispare
 * sólo con la compra confirmada y una sola vez, y que lo que entra al <script>
 * público siga pasando por la lista blanca de `tracking-ids`.
 */

import { readFileSync } from "node:fs";
import { medicionDeLaTienda, marcarCompraEnElNavegador, claveDeCompraMedida, MONEDA_DIGITAL } from "./medicion-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

/* ── Leer la configuración ───────────────────────────────────────────────── */

const m = medicionDeLaTienda(JSON.stringify({ analytics: { facebookPixelId: " 123456789012345 ", googleAnalyticsId: "G-ABC123", clarityProjectId: "abcdefghij" } }));
check("LEER-A", m.pixelId === "123456789012345" && m.gaId === "G-ABC123" && m.clarityId === "abcdefghij", "lee los tres IDs y les saca los espacios");
check("LEER-B", JSON.stringify(medicionDeLaTienda(null)) === JSON.stringify({ pixelId: "", gaId: "", clarityId: "" }), "sin configuración, vacíos");
check("LEER-C", JSON.stringify(medicionDeLaTienda("{no es json")) === JSON.stringify({ pixelId: "", gaId: "", clarityId: "" }), "un JSON roto no tumba la página: vacíos");
check("LEER-D", medicionDeLaTienda(JSON.stringify({ analytics: { facebookPixelId: 123 } })).pixelId === "", "un ID que no es texto no se toma");
check("LEER-E", MONEDA_DIGITAL === "ARS", "la moneda es pesos, como todos los precios digitales");

/* ── Medir la compra en el navegador ────────────────────────────────────── */

const llamadas: unknown[][] = [];
const almacen = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  fbq: (...a: unknown[]) => llamadas.push(["fbq", ...a]),
  gtag: (...a: unknown[]) => llamadas.push(["gtag", ...a]),
  localStorage: { getItem: (k: string) => almacen.get(k) ?? null, setItem: (k: string, v: string) => almacen.set(k, v) },
};

const primera = marcarCompraEnElNavegador({ ordenId: "ord1", total: 13000 });
check("COMPRA-A", primera && llamadas.some((l) => l[0] === "fbq" && l[1] === "track" && l[2] === "Purchase"
  && JSON.stringify(l[3]) === JSON.stringify({ value: 13000, currency: "ARS" }) && JSON.stringify(l[4]) === JSON.stringify({ eventID: "ord1" })),
  "dispara Purchase con el total, en pesos, y el id de la orden como eventID");
check("COMPRA-B", !llamadas.some((l) => l[0] === "fbq" && l[1] === "set"), "no manda ningún dato de la persona: el correo no puede salir por una ruta pública");
check("COMPRA-C", llamadas.some((l) => l[0] === "gtag" && l[1] === "event" && l[2] === "purchase" && (l[3] as { transaction_id: string }).transaction_id === "ord1"),
  "y purchase en GA4 con la orden como transacción");
const cuantas = llamadas.length;
const segunda = marcarCompraEnElNavegador({ ordenId: "ord1", total: 13000 });
check("COMPRA-D", !segunda && llamadas.length === cuantas && almacen.get(claveDeCompraMedida("ord1")) === "1",
  "la misma orden no se mide dos veces: recargar gracias no vende dos veces");
check("COMPRA-E", marcarCompraEnElNavegador({ ordenId: "ord2", total: 500 }) && llamadas.length > cuantas, "otra orden sí");

(globalThis as unknown as { window: unknown }).window = { localStorage: { getItem: () => null, setItem: () => {} } };
check("COMPRA-F", !marcarCompraEnElNavegador({ ordenId: "ord3", total: 500 }), "sin píxel ni GA cargados no hace nada");

/* ── Las páginas ─────────────────────────────────────────────────────────── */

const pagina = leer("src/app/p/[id]/page.tsx");
const pagar = leer("src/app/p/[id]/pagar/page.tsx");
const gracias = leer("src/app/p/[id]/gracias/page.tsx");
const graciasCli = leer("src/app/p/[id]/gracias/GraciasClient.tsx");
const estado = leer("src/app/api/digitales/estado-compra/[orden]/route.ts");
const scripts = leer("src/components/store/StoreTrackingScripts.tsx");
const config = leer("src/app/digitales/configuracion/page.tsx");

check("PAG-A", /<StoreTrackingScripts/.test(pagina) && /medicionDeLaTienda\(fila\.store\.storeConfig\)/.test(pagina) && /storeConfig: true/.test(pagina),
  "la página de venta lee la medición de la tienda y monta los scripts");
check("PAG-B", /fila\.isActive && \(\(\) => \{[^]*?<StoreTrackingScripts/.test(pagina) && /viewContent=\{\{ contentId: fila\.id, value: fila\.price, currency: MONEDA_DIGITAL \}\}/.test(pagina),
  "sólo en la página publicada, con ViewContent del producto");
const bloqueDePrevia = pagina.slice(pagina.indexOf("if (previa) {"), pagina.indexOf("<VisitaDigital"));
check("PAG-C", bloqueDePrevia.length > 0 && !bloqueDePrevia.includes("<StoreTrackingScripts"),
  "la previa del editor no mide: es la dueña mirándose");
check("PAG-D", /seLePuedeVender && \(\(\) => \{[^]*?initiateCheckout=\{\{ contentId: fila\.id, value: fila\.price, currency: MONEDA_DIGITAL \}\}/.test(pagar) && /storeConfig: true/.test(pagar),
  "el checkout dispara InitiateCheckout sólo cuando se puede comprar");
check("PAG-E", /<StoreTrackingScripts facebookPixelId=\{m\.pixelId\} googleAnalyticsId=\{m\.gaId\} clarityProjectId=\{m\.clarityId\} \/>/.test(gracias) && !/purchase=/.test(gracias),
  "gracias monta PageView y NO dispara Purchase al dibujarse: la compra puede no estar confirmada");
check("PAG-F", /if \(d\.estado === "listo"[^]*?marcarCompraEnElNavegador\(\{ ordenId: p\.ordenId!, total: d\.total/.test(graciasCli),
  "Purchase sale del navegador cuando la consulta dice listo, con el total que vino del servidor");
check("PAG-G", /estado: "listo", archivos, total: fila\.total \}/.test(estado) && !/email|emHash|createHash/.test(estado)
  && !/estado: "esperando", total/.test(estado),
  "estado-compra manda el total sólo con listo, y nada de la persona: es una ruta pública");
check("PAG-H", /initiateCheckout && CONTENT_ID_RE\.test\(initiateCheckout\.contentId\) && CURRENCY_RE\.test\(initiateCheckout\.currency\) && Number\.isFinite\(initiateCheckout\.value\)/.test(scripts)
  && /fbq\('track', 'InitiateCheckout'/.test(scripts),
  "InitiateCheckout pasa por la misma lista blanca que ViewContent antes de entrar al <script>");
check("PAG-I", /medicionDeLaTienda\(store\?\.storeConfig\)/.test(config) && !/function leerAnalytics/.test(config),
  "Configuración lee los IDs con la misma función que las páginas: una sola definición");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
