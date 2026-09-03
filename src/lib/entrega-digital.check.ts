/**
 * Chequeos de la entrega de un producto digital. Se corre con:
 *
 *   npx tsx src/lib/entrega-digital.check.ts
 *
 * Acá se decide quién puede bajar qué. Un error de este archivo tiene sólo dos
 * formas posibles, y las dos son caras: alguien pagó y no recibe, o alguien
 * recibe sin haber pagado.
 */

import { readFileSync } from "fs";
import {
  DIAS_DEL_PERMISO, MAX_DESCARGAS, nuevoTokenDeDescarga, vencimientoDelPermiso,
  lineasEntregables,
} from "./entrega-digital";
import { DIAS_CUARENTENA_ARCHIVO } from "./deposito-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El token ─────────────────────────────────────────────────────────────── */

/* ⚠️ Es lo ÚNICO que separa a un comprador del archivo de otro. */
const tokens = Array.from({ length: 500 }, () => nuevoTokenDeDescarga());

check("TOK-A", new Set(tokens).size === 500, "quinientos tokens seguidos, ninguno repetido");

/* 32 bytes en base64url son 43 caracteres. Un token corto se puede probar a
   fuerza bruta; con esto, no. */
check("TOK-B", tokens.every((t) => t.length >= 43), "cada token trae al menos 32 bytes de azar");

/* base64url y no base64: viaja en una URL, y un `+` o un `/` adentro de una
   dirección se rompen o se reinterpretan al pegarlos de un mail. */
check("TOK-C", tokens.every((t) => /^[A-Za-z0-9_-]+$/.test(t)),
  "y sólo lleva caracteres que sobreviven a una URL");

/* ⚠️ `randomBytes` y NUNCA `Math.random()`: el generador de JavaScript es
   predecible a partir de unas pocas salidas del mismo proceso. Ni un cuid, que
   lleva la marca de tiempo adentro y deja adivinar los cercanos. */
/* Mira el CÓDIGO, no los comentarios. Es la tercera vez en este proyecto que un
   chequeo falla por culpa del comentario que explica el error que evita: el de
   acá abajo nombra `Math.random` y el cuid para decir que NO se usan. Mismo
   truco que en `pagina-venta.check`. */
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

const fuente = sinComentarios(readFileSync("src/lib/entrega-digital.ts", "utf8"));
check("TOK-D", fuente.includes("randomBytes") && !fuente.includes("Math.random") && !fuente.includes("cuid"),
  "sale del generador criptográfico, no de Math.random ni de un cuid");

/* ── El vencimiento ───────────────────────────────────────────────────────── */

const desde = new Date("2026-09-03T12:00:00.000Z");
const vence = vencimientoDelPermiso(desde);

check("VEN-A", vence.getTime() - desde.getTime() === DIAS_DEL_PERMISO * 24 * 60 * 60 * 1000,
  `el permiso dura exactamente ${DIAS_DEL_PERMISO} días`);
check("VEN-B", vence > desde, "y siempre vence después de emitido, nunca antes");

/* ⚠️ El plazo del permiso y la cuarentena del barrido tienen que ser el MISMO
   número. Si el barrido fuera más corto, borraríamos el archivo de alguien que
   todavía tiene derecho a bajarlo: pagó y no recibe. */
check("VEN-C", DIAS_DEL_PERMISO === DIAS_CUARENTENA_ARCHIVO,
  "coincide con la cuarentena del barrido: no se borra lo que alguien puede bajar");

check("VEN-D", MAX_DESCARGAS >= 2 && MAX_DESCARGAS <= 10,
  "el tope de descargas corta el reenvío sin castigar al que lo baja en dos aparatos");

/* ── Qué se entrega ───────────────────────────────────────────────────────── */

const linea = (id: string, archivoPath: string | null) => ({ id, product: { archivoPath } });

check("ENT-A", lineasEntregables([linea("a", "supabase://x/a.pdf"), linea("b", "supabase://x/b.pdf")]).length === 2,
  "cada línea con archivo recibe su permiso");

/* ⚠️ Una línea sin archivo no tiene nada que entregar, y darle permiso es PEOR
   que no dárselo: el mail mostraría un enlace que al tocarlo no baja nada, y
   quien pagó pensaría que le estafaron. */
check("ENT-B", lineasEntregables([linea("a", "supabase://x/a.pdf"), linea("b", null)]).length === 1,
  "una línea sin archivo NO recibe permiso: un enlace que no baja nada es peor que ninguno");
check("ENT-C", lineasEntregables([linea("a", null)]).length === 0,
  "y si no hay ninguna con archivo, no se entrega nada");

/* ── El webhook ───────────────────────────────────────────────────────────── */

const cobro = readFileSync("src/app/api/digitales/cobro/route.ts", "utf8");

/* ⚠️ La dirección del webhook es pública: viaja en cada preferencia. Sin firma,
   un `POST` escrito a mano con el id de una orden ajena la confirma sin haber
   pagado nada — o sea, se lleva el archivo gratis. */
check("WEB-A", cobro.includes("firmaDeMercadoPagoValida"), "el aviso de pago se verifica");
check("WEB-B", cobro.indexOf("firmaDeMercadoPagoValida") < cobro.indexOf("prisma."),
  "y se verifica ANTES de tocar la base");

/* Un error hace que Mercado Pago reintente el mismo aviso una y otra vez. */
check("WEB-C", /catch \(e\) \{[\s\S]{0,200}console\.error[\s\S]{0,200}\}\s*return NextResponse\.json\(\{ ok: true \}\)/.test(cobro),
  "un fallo se loguea y se contesta 200: si no, MP reintenta para siempre");

/* La guarda de idempotencia: el segundo aviso encuentra CONFIRMED y se va. */
check("WEB-D", cobro.includes('orden.status !== "PENDING"'),
  "el mismo aviso dos veces no confirma dos veces");

/* ⚠️ EL chequeo de esta tanda. Dos avisos en paralelo leen los dos "todavía no"
   y crean los dos permisos, dejando dos tokens vivos y diez descargas donde
   debía haber cinco. Sólo la restricción única de la base resuelve esa carrera. */
check("WEB-E", cobro.includes("digitalDownload.upsert") && cobro.includes("orderItemId: linea.id"),
  "el permiso va con upsert sobre la clave única: dos avisos juntos no dan dos tokens");

/* Y si ya existía, no se toca: renovarle el vencimiento a alguien porque llegó
   un aviso repetido sería regalarle treinta días más en cada reintento. */
check("WEB-F", /update: \{\},/.test(cobro),
  "un permiso que ya existía no se renueva ni se le reinicia el contador");

/* ⚠️ Sin esto, un aviso dirigido acá con el id de una orden de TIENDA la
   confirmaría sin correr nada de lo que esa venta necesita —ni stock, ni envío,
   ni comisión de afiliado— y quedaría cobrada y a medio procesar. */
check("WEB-G", cobro.includes('owner.role !== "DIGITAL"'),
  "sólo acredita ventas digitales: una orden de tienda no se toca");

/* Un pago por menos que la orden no entrega. */
check("WEB-H", cobro.includes("TOLERANCIA") && cobro.includes("no se entrega"),
  "se compara lo pagado con el total de la orden antes de entregar");

/* Confirmar una venta sin un solo archivo deja a alguien que pagó sin nada y sin
   ninguna señal. Es preferible que la orden quede pendiente y a la vista. */
check("WEB-I", cobro.includes("entregables.length === 0"),
  "si no hay nada que entregar, la venta NO se confirma");

/* ── La firma, compartida ─────────────────────────────────────────────────── */

/* ⚠️ Estaba escrita sólo en el webhook de tiendas. Con una copia en cada uno
   alcanzaba con arreglar uno para que el otro se quedara con el agujero, en
   silencio y en la parte del sistema donde entra la plata. */
const webhookTiendas = readFileSync("src/app/api/mp/webhook/route.ts", "utf8");
const firma = readFileSync("src/lib/mp-firma.ts", "utf8");

check("FIR-A", webhookTiendas.includes("firmaDeMercadoPagoValida") &&
  !webhookTiendas.includes("createHmac"),
  "los dos webhooks de pago verifican con la MISMA pieza, no con una copia cada uno");

/* Comparar firmas con `===` corta en el primer carácter distinto, y ese tiempo
   se puede medir para ir adivinando la firma de a un byte. */
check("FIR-B", firma.includes("timingSafeEqual"),
  "la comparación es de tiempo constante, no con el operador normal");

/* Un webhook de pagos sin verificar es peor que uno caído, porque el caído se
   nota. En producción, sin secreto, se rechaza todo. */
/* Se mira el bloque entero de "no hay secreto" en vez de contar caracteres entre
   una cosa y la otra: un chequeo que depende del largo de un `console.error`
   falla el día que alguien mejora el mensaje. */
const sinSecreto = firma.slice(firma.indexOf("if (!secret)"), firma.indexOf("const xSignature"));
check("FIR-C", sinSecreto.includes('NODE_ENV === "production"') && sinSecreto.includes("return false"),
  "en producción sin secreto configurado se rechaza TODO");

/* ── El canje del token por el archivo ────────────────────────────────────── */

const descarga = readFileSync("src/app/api/digitales/descargar/[token]/route.ts", "utf8");
const deposito = readFileSync("src/lib/deposito-digital.ts", "utf8");

/* ⚠️ EL chequeo de esta ruta. Con dos pedidos a la vez —el doble click de
   siempre, o el enlace abierto en dos pestañas— los dos leen "van 4 de 5" y los
   dos pasarían un `if`. La condición tiene que estar adentro del `where` para
   que la base deje pasar uno solo. Es el mismo patrón que el alta de productos
   contra el tope del plan. */
check("DES-A", /updateMany\(\{[\s\S]{0,300}descargas: \{ lt: permiso\.maxDescargas \}/.test(descarga),
  "el tope se aplica adentro del where: dos pedidos juntos no gastan dos descargas");

/* Y se cuenta ANTES de firmar: si se firmara primero, un pedido que muere en el
   medio entrega el archivo sin descontar nada. */
check("DES-B", descarga.indexOf("updateMany") < descarga.indexOf("enlaceDeDescarga(config"),
  "se descuenta antes de firmar, no después");

/* ⚠️ Pero si la firma falla, la descarga se devuelve. Sin esto, un problema
   NUESTRO —Supabase caído— le come una de las cinco a alguien que no bajó nada. */
check("DES-C", descarga.includes("decrement: 1"),
  "y si la firma falla se devuelve la descarga: un error nuestro no la gasta");

/* Una orden cancelada después (contracargo, devolución) deja el permiso escrito.
   El archivo no se tiene que entregar más. */
check("DES-D", descarga.includes('order.status !== "CONFIRMED"'),
  "una compra que dejó de estar confirmada ya no baja nada");

check("DES-E", descarga.includes("expiresAt <= ahora") && descarga.includes("descargas >= permiso.maxDescargas"),
  "se distingue vencido de agotado, para poder decir cuál de los dos es");

/* ⚠️ El archivo baja DERECHO de Supabase. Servirlo nosotros choca contra el techo
   de 4,5 MB de la plataforma —un PDF puede pesar 50— y encima paga el tránsito
   dos veces. */
check("DES-F", descarga.includes("NextResponse.redirect"),
  "se redirige al enlace firmado: el archivo no pasa por nuestra función");

/* Corto. Un enlace de descarga que dura horas es un enlace que se reenvía. */
check("DES-G", /MINUTOS_DEL_ENLACE = ([1-9]|10)\b/.test(deposito),
  "el enlace firmado dura pocos minutos");

/* Sin sesión, el token es TODA la autorización, así que la puerta necesita techo
   propio. */
check("DES-H", descarga.includes("checkRateLimit"),
  "la ruta pública de descarga tiene límite por IP");

/* 🔲 Cuando exista la página de descarga, hay que chequear que el mail linkee a
   ELLA y no acá: esta dirección descuenta una descarga con sólo abrirla, y los
   enlaces de un mail los visitan solos Outlook Safe Links y los antivirus. */
check("DES-I", descarga.includes("descuenta una descarga con sólo abrirla"),
  "queda escrito por qué el mail no puede linkear acá derecho");

console.log(fallos === 0
  ? "\nok — sólo baja el archivo quien lo pagó, y sólo mientras vale su permiso"
  : `\nFALLA — ${fallos} chequeo(s) de la entrega digital`);
process.exit(fallos === 0 ? 0 : 1);
