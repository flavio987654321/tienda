/**
 * Chequeos de los carritos abandonados de Productos Digitales.
 *
 *   npx tsx src/lib/carritos-digitales.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * **Que no le escribamos a quien está por pagar.** Mercado Pago deja pagar en
 * efectivo con un cupón que dura días. Mandarle "te olvidaste de pagar" a esa
 * persona es el peor error posible de esta función, y encima sale con el nombre
 * de quien vende en el asunto.
 *
 * **Que se mande UNA sola vez.** Insistir es correo no deseado. Y la marca se
 * pone salga o no salga el mail: si sólo se pusiera al salir bien, una dirección
 * rota se reintentaría todos los días para siempre.
 *
 * **Que la lista se vea en los tres planes.** Es plata de quien vende, no una
 * función nuestra. Lo que se cobra es el envío automático.
 */

import { readFileSync } from "fs";
import { haceCuanto, MADURACION_MS, PAGO_EN_CAMINO } from "./carritos-digitales";
import { featuresDigital } from "./planes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const lib = readFileSync("src/lib/carritos-digitales.ts", "utf8");
const pagina = readFileSync("src/app/digitales/carritos/page.tsx", "utf8");
const lista = readFileSync("src/app/digitales/carritos/CarritosClient.tsx", "utf8");
const cron = readFileSync("src/app/api/cron/daily/route.ts", "utf8");
const cobro = readFileSync("src/app/api/digitales/cobro/route.ts", "utf8");
const mail = readFileSync("src/lib/resend.ts", "utf8");
const esquema = readFileSync("prisma/schema.prisma", "utf8");

/* ══════════════════════════════════════════════════════════════════════════
   NO LE ESCRIBIMOS A QUIEN ESTÁ POR PAGAR
   ══════════════════════════════════════════════════════════════════════════ */

/* El webhook tiene que ANOTAR el estado que manda Mercado Pago cuando el pago no
   está aprobado pero tampoco muerto. Sin eso, "no quiso pagar" y "va a pagar en
   un kiosco" son la misma fila en nuestra base. */
check("CAR-A",
  /pending: "PENDING_MP"/.test(cobro) && /in_process: "IN_PROCESS"/.test(cobro) &&
  /authorized: "AUTHORIZED"/.test(cobro),
  "el webhook anota el pago que está en camino en vez de tirarlo");

/* ⚠️ Y anota SÓLO la fila de pago: la orden sigue PENDING. Tocarla acá
   entregaría el archivo o cobraría la comisión sin plata acreditada. */
const enCaminoEnCobro = cobro.slice(cobro.indexOf('if (pago.status !== "approved")'));
check("CAR-B",
  /prisma\.payment\s*\n?\s*\.updateMany/.test(enCaminoEnCobro) &&
  !/prisma\.order\.update/.test(enCaminoEnCobro.slice(0, enCaminoEnCobro.indexOf("return;"))),
  "anotar un pago en camino no toca la orden");

/* Y con la orden PENDING adentro del `where`: un aviso viejo que llega tarde no
   puede pisar una orden que mientras tanto se pagó. */
check("CAR-C",
  /order: \{ status: "PENDING" \}/.test(enCaminoEnCobro),
  "un aviso que llega tarde no pisa una orden ya resuelta");

/* La lista los deja afuera y los cuenta aparte. */
check("CAR-D",
  /PAGO_EN_CAMINO as readonly string\[\]\)\.includes/.test(lib) && /enCamino\+\+; continue;/.test(lib),
  "los pagos en camino no entran a la lista de abandonados");

check("CAR-E",
  PAGO_EN_CAMINO.length === 3 && PAGO_EN_CAMINO.includes("PENDING_MP"),
  "los estados de pago en camino son los que anota el webhook");

/* Y el cron también los excluye, que es donde de verdad importa. */
check("CAR-F",
  /notIn: \[\.\.\.PAGO_EN_CAMINO\]/.test(cron),
  "el cron no le manda el mail a quien tiene el pago en camino");

/* Una orden sin fila de pago todavía SÍ es un abandono: se fue antes de que
   Mercado Pago contestara nada. Sin el `OR`, esas quedaban afuera para siempre. */
check("CAR-G",
  /\{ payment: \{ is: null \} \}/.test(cron),
  "una orden sin fila de pago cuenta igual como abandono");

/* ══════════════════════════════════════════════════════════════════════════
   UNA SOLA VEZ
   ══════════════════════════════════════════════════════════════════════════ */

check("CAR-H",
  /recordatorioAt DateTime\?/.test(esquema) && /recordatorioAt: null/.test(cron),
  "sólo se le escribe a quien todavía no recibió el recordatorio");

/* ⚠️ La marca se pone SALGA O NO SALGA. Si sólo se pusiera al salir bien, una
   dirección rota se reintentaría todos los días para siempre, gastando cuota. */
check("CAR-I",
  /Se marca SIEMPRE, salga o no salga/.test(cron) &&
  /data: \{ recordatorioAt: now \}/.test(cron),
  "la marca se pone aunque el mail falle, para no reintentar para siempre");

/* Y el mail lo dice, que es lo que lo vuelve honesto. */
check("CAR-J",
  /único recordatorio que te/.test(mail),
  "el mail avisa que es el único que se va a mandar");

/* Nada de relojes ni de "última oportunidad": sería mentira escrita con el
   nombre de quien vende. */
check("CAR-K",
  !/última oportunidad|Última oportunidad|quedan \d+ horas|urgente/i.test(
    mail.slice(mail.indexOf("sendCarritoAbandonadoDigitalEmail"))),
  "el mail no inventa urgencia ni promete descuentos");

/* ══════════════════════════════════════════════════════════════════════════
   QUIÉN LO RECIBE Y ADÓNDE LLEVA
   ══════════════════════════════════════════════════════════════════════════ */

/* El envío automático es de Pro, y con el plan al día. */
check("CAR-L",
  /subscription: \{ tier: "PRO", status: \{ in: \["ACTIVE", "TRIAL"\] \} \}/.test(cron) &&
  /role: "DIGITAL"/.test(cron),
  "el mail automático sale sólo para una cuenta digital Pro al día");

/* Pero VER la lista es de los tres: es plata de quien vende, no una función
   nuestra. Está decidido en el documento y sale del propio código de topes. */
const fs3 = ["FREE", "STARTER", "PRO"].map((t) =>
  featuresDigital(t as "FREE" | "STARTER" | "PRO").find((f) => /carritos abandonados/i.test(f.text)));
check("CAR-M",
  fs3.every((f) => f?.on === true),
  "ver los carritos está prendido en los tres planes");

const recuperacion = ["FREE", "STARTER", "PRO"].map((t) =>
  featuresDigital(t as "FREE" | "STARTER" | "PRO").find((f) => /recuperación/i.test(f.text)));
check("CAR-N",
  recuperacion[0]?.on === false && recuperacion[1]?.on === false && recuperacion[2]?.on === true,
  "el mail de recuperación es sólo de Pro, como dice la página de precios");

/* El link lleva a la dirección propia del producto, que es la que la persona
   vio. El dominio primero: es el que reconoce si llegó por un anuncio. */
check("CAR-O",
  /principal\.dominioPropio/.test(cron) &&
  cron.indexOf("principal.dominioPropio") < cron.indexOf("principal.slugDigital"),
  "el link del mail usa el dominio propio antes que el subdominio");

/* Un producto despublicado no se manda: el link llevaría a una página que no
   abre, y eso es peor que no escribir. */
check("CAR-P",
  /principal\.isActive && correo/.test(cron),
  "no se escribe si el producto está despublicado o falta el correo");

/* ══════════════════════════════════════════════════════════════════════════
   LA PANTALLA
   ══════════════════════════════════════════════════════════════════════════ */

/* Una compra recién empezada no es un abandono: la persona puede estar pagando
   en ese mismo momento. */
check("CAR-Q", MADURACION_MS === 60 * 60 * 1000,
  "una compra recién empezada no aparece como abandonada");

check("CAR-R",
  haceCuanto(new Date(Date.now() - 10 * 60_000)) === "hace un rato" &&
  haceCuanto(new Date(Date.now() - 5 * 3600_000)) === "hace 5 horas" &&
  haceCuanto(new Date(Date.now() - 26 * 3600_000)) === "ayer" &&
  haceCuanto(new Date(Date.now() - 5 * 24 * 3600_000)) === "hace 5 días",
  "el hace cuánto se dice en castellano y sin decimales");

/* ⚠️ Y se calcula en el SERVIDOR: hecho en el navegador da distinto —el servidor
   corre en UTC— y React avisa que el texto no coincide. */
check("CAR-S",
  /haceCuanto\(c\.cuando, ahora\)/.test(pagina) && !/haceCuanto/.test(lista),
  "el hace cuánto se calcula en el servidor, no en el navegador");

/* El vacío no se dibuja como un problema: acá cero es la buena noticia. */
check("CAR-T",
  /No hay ninguno/.test(pagina) && /Nadie dejó una compra por la mitad/.test(pagina),
  "cero carritos se muestra como algo bueno, no como una tarea pendiente");

/* ⚠️ El bloque de Pro va ABAJO de la lista: primero lo que es suyo, después lo
   que le podemos vender. Al revés es cobrarle la entrada a lo que ya tiene. */
check("CAR-U",
  pagina.indexOf("<CarritosClient") < pagina.indexOf("El recordatorio automático"),
  "el ofrecimiento de Pro va después de la lista, no antes");

/* Y a quien no es Pro se le dice que la lista y los correos son suyos igual. */
check("CAR-V",
  /la lista es tuya igual, y los correos también/.test(pagina),
  "sin Pro se aclara que la lista y los correos son suyos igual");

/* Los pagos en camino se nombran aparte y con su motivo: mezclados, quien mira
   creería que perdió una venta que se está por cobrar. */
check("CAR-W",
  /todavía se pueden pagar\s+solas/.test(pagina),
  "las compras con el pago en camino se explican aparte");

/* La operación real es copiar el correo: se pega en el mail o en WhatsApp. */
check("CAR-X",
  /navigator\.clipboard\.writeText/.test(lista) && /aria-label=\{`Copiar/.test(lista),
  "el correo se copia con un botón, y el botón dice qué hace");

/* ⚠️ El "escribirle" abre el programa de correo DE LA PERSONA. Mandarlo desde
   nuestro servidor sin ser el envío automático de Pro sería usar nuestro dominio
   de envío para correo que no controlamos. */
check("CAR-Y",
  /href=\{`mailto:\$\{c\.email\}/.test(lista) && !/fetch\(/.test(lista),
  "escribirle abre el correo de quien vende; no manda nada desde el servidor");

/* Y un nombre de producto con `&` o `#` cortaría el enlace a la mitad. */
check("CAR-Z",
  (lista.match(/encodeURIComponent\(/g) ?? []).length >= 2,
  "el asunto y el cuerpo del mailto van escapados");

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE LA POLÍTICA PROMETE TIENE QUE SER CIERTO
   ══════════════════════════════════════════════════════════════════════════ */

const privacidad = readFileSync("src/app/privacidad/page.tsx", "utf8");

/* ⚠️ La solapa digital NO decía una palabra de esto —cero menciones a la palabra
   "carrito"— y la función que le escribe a esa gente ya estaba escrita. */
check("CAR-AA",
  /3 bis\. Compras que alguien empezó y no terminó/.test(privacidad),
  "la política de privacidad de digitales explica las compras sin terminar");

/* Y dice con qué derecho se manda ese mail. Sin base legal escrita, un mail a
   alguien que no es cliente es difícil de defender. */
check("CAR-AB",
  /interés legítimo en recuperar una operación que la propia persona empezó/.test(privacidad),
  "queda escrita la base legal del recordatorio");

/* Y que se manda UNA vez, que es lo que lo separa de una campaña. */
check("CAR-AC",
  /UNA sola vez por compra y nunca más/.test(privacidad),
  "la política dice que el recordatorio se manda una sola vez");

/* ⚠️ Promete 45 días. Sin el borrado, esas compras sin pagar quedaban PARA
   SIEMPRE con el correo de alguien que ni siquiera llegó a comprar. */
check("CAR-AD",
  /se elimina sola a los 45 días/.test(privacidad) &&
  /prisma\.order\.deleteMany\(\{[\s\S]{0,200}createdAt: \{ lt: ago45d \}/.test(cron),
  "lo que promete la política —45 días— lo cumple una limpieza de verdad");

/* ⚠️ Y SÓLO de cuentas digitales: una orden PENDING de tienda ya descontó stock
   al crearse, así que borrarla dejaría el inventario mal para siempre. */
check("CAR-AE",
  /store: \{ owner: \{ role: "DIGITAL" \} \}/.test(cron),
  "la limpieza no toca las órdenes pendientes de una tienda");

/* Y el comprador se entera por su propia solapa, no sólo por la del vendedor. */
check("CAR-AF",
  /Si era la compra de un producto digital/.test(privacidad),
  "quien compra también lo lee en la solapa que le corresponde");

console.log(fallos === 0
  ? "\nok — no se le escribe a quien está por pagar, y se escribe una sola vez"
  : `\nFALLA — ${fallos} chequeo(s) de los carritos abandonados`);
process.exit(fallos === 0 ? 0 : 1);
