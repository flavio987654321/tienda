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
const descarga = readFileSync("src/app/api/digitales/descargar/[token]/route.ts", "utf8");

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

/* ── La devolución y el contracargo, 03/09/26 ─────────────────────────────── */

/* ⚠️ EL agujero más serio que tenía el webhook, encontrado releyéndolo.
   `refunded` estaba metido con `cancelled` y `rejected`, todos contra órdenes
   PENDING. Pero una devolución llega sobre una orden que ya está CONFIRMED, así
   que el `updateMany` actualizaba CERO filas y se iba en silencio: la persona
   seguía bajando el archivo con la plata ya devuelta, para siempre. Y un
   contracargo ni siquiera estaba contemplado. */
check("DEV-A", /refunded" \|\| pago\.status === "charged_back"/.test(cobro),
  "una devolución y un contracargo se atienden, no sólo los pagos rechazados");

check("DEV-B", /status: \{ in: \["PENDING", "CONFIRMED"\] \}/.test(cobro),
  "y alcanzan a una orden YA CONFIRMADA, que es donde llegan de verdad");

/* Pasar la orden a CANCELLED corta la descarga sola: la ruta de descarga exige
   CONFIRMED. Es lo que hace que no haya nada más que apagar. */
check("DEV-C", descarga.includes('order.status !== "CONFIRMED"'),
  "cancelar la orden corta la descarga sola: no hay dos lugares que apagar");

/* ⚠️ `in_mediation` queda AFUERA. Una mediación no está resuelta: cortarle el
   archivo a alguien mientras reclama es castigarlo por reclamar, y si después
   gana se quedó sin lo que pagó. */
check("DEV-D", !cobro.includes('"in_mediation"'),
  "una mediación sin resolver NO corta el acceso: se corta con una decisión");

/* Queda la historia de que fue una devolución y no una cancelación cualquiera. */
check("DEV-E", cobro.includes("digital_devolucion") && cobro.includes("digital_contracargo"),
  "queda registrado en el historial cuál de las dos fue");

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

/* ── El mail de entrega ───────────────────────────────────────────────────── */

const mails = readFileSync("src/lib/resend.ts", "utf8");
const cuerpoDelMail = mails.slice(mails.indexOf("export async function sendEntregaDigitalEmail"));

/* ⚠️ EL chequeo del mail, y el que más caro sale si se afloja.
   Abrir `/api/digitales/descargar/<token>` GASTA una de las cinco descargas, y
   los enlaces de un correo los visitan solos —apenas llega— Outlook Safe Links,
   los antivirus corporativos y los previsualizadores. Con el enlace directo acá,
   alguien se queda sin sus cinco descargas sin haber tocado nada. */
check("MAIL-A", !cuerpoDelMail.includes("/api/digitales/descargar"),
  "el mail NO linkea a la ruta de descarga: abrirla sola gastaría una descarga");
check("MAIL-B", cobro.includes("/gracias?orden="),
  "linkea a la pantalla de gracias, que tiene los botones y abrirla no cuesta nada");

/* Todo lo que llega de afuera —el nombre de quien compró, el del producto, el
   del vendedor— se dibuja adentro de un HTML que se manda por mail. */
check("MAIL-C", (cuerpoDelMail.match(/escapeHtml\(/g) ?? []).length >= 4,
  "cada texto de afuera se escapa antes de entrar al HTML del mail");

/* ⚠️ En un AGREGADO la orden no tiene principal: lleva sólo el upsell. Buscar el
   principal y salir si no está dejaba a esas compras sin mail de entrega. */
/* La cuenta se mudó a `armadoDelMail` cuando el reenvío pasó a armar el mismo
   mail: se busca donde vive ahora, no donde vivía. */
check("MAIL-D", fuente.includes("primera?.padreId"),
  "un agregado también recibe su mail, aunque su orden no tenga producto principal");

/* Con `despues`, no con `await` ni con una promesa suelta. En serverless una
   promesa colgada no se resuelve: el mail llega tarde o no llega, en silencio. */
check("MAIL-E", cobro.includes("despues(") && !/await sendEntregaDigitalEmail/.test(cobro),
  "el mail sale con `despues`: ni frena la respuesta ni se pierde");

/* Y si falla, la venta no se cae: ya está confirmada y los permisos emitidos. */
check("MAIL-F", cobro.indexOf("prisma.$transaction") < cobro.indexOf("mandarLaEntrega({"),
  "se manda DESPUÉS de confirmar: un mail que no sale no voltea una venta cobrada");

/* Los plazos del mail salen de las constantes, no escritos a mano: la pantalla,
   el mail y el barrido tienen que prometer todos lo mismo. Viven en
   `envio-digital`, que es por donde pasan ahora los dos caminos del mail. */
const envio = readFileSync("src/lib/envio-digital.ts", "utf8");
check("MAIL-G", envio.includes("dias: DIAS_DEL_PERMISO") && envio.includes("maxDescargas: MAX_DESCARGAS"),
  "los plazos que promete el mail salen de la misma constante que los aplica");

/* ── El registro de descargas ───────────────────────────────────────────────
 *
 * Es la prueba de entrega ante un contracargo. El contador dice "se bajó 3
 * veces" y nada más: no dice cuándo ni desde dónde, así que como prueba no sirve.
 */
const sinComent = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const descargaLimpia = sinComent(descarga);

check("LOG-A", /prisma\.digitalDownloadLog\.create/.test(descargaLimpia),
  "cada descarga entregada deja una fila con cuándo, desde dónde y con qué");

/* ⚠️ DESPUÉS de firmar el enlace, nunca antes. Anotado arriba quedaría escrito
   "se lo bajó" en una descarga que terminó en error 502, y una prueba falsa es
   peor que ninguna. */
check("LOG-B",
  descargaLimpia.indexOf("enlaceDeDescarga(config") < descargaLimpia.indexOf("digitalDownloadLog.create"),
  "se anota DESPUÉS de firmar el enlace: no se registra una entrega que falló");

/* Y no puede frenar la entrega. Si la fila no se puede escribir —la base
   ocupada, la tabla todavía sin migrar— la persona igual se lleva lo que pagó. */
check("LOG-C",
  /digitalDownloadLog\.create\(\{[\s\S]{0,400}?\}\)\s*\.catch/.test(descargaLimpia) &&
  !/await prisma\.digitalDownloadLog\.create/.test(descargaLimpia),
  "un registro que falla no puede negar un archivo ya pagado");

/* El `User-Agent` lo escribe el cliente: entra recortado o no entra. */
check("LOG-D", /user-agent"\)\?\.slice\(0, \d+\)/.test(descargaLimpia),
  "el navegador que se anota viene recortado, que lo escribe quien pide");

/* ── Reenviar el mail de entrega ────────────────────────────────────────────
 *
 * Es el único camino de vuelta para alguien que pagó y se quedó sin su archivo:
 * no tiene cuenta, así que no puede recuperar nada por su cuenta. Y es un botón
 * que le manda un correo a un tercero, así que todo lo de acá abajo es freno.
 */
const reenvio = sinComent(readFileSync("src/app/api/digitales/ventas/[orden]/reenviar/route.ts", "utf8"));

/* ⚠️ QUE LA VENTA SEA SUYA. Sin esto, cualquier cuenta digital con sesión le
   reenvía el mail al comprador de cualquier otra cambiando un identificador. */
check("REE-A",
  /venta\.store\.ownerId !== user\.id/.test(reenvio) && /user\.role !== "DIGITAL"/.test(reenvio),
  "sólo se reenvía una venta propia, y sólo desde una cuenta digital");

/* Y se contesta lo mismo que si no existiera: "no es tuya" y "no existe" no se
   distinguen desde afuera, así que esto tampoco sirve para averiguar qué hay. */
check("REE-B", /!venta \|\| venta\.store\.ownerId !== user\.id[\s\S]{0,200}status: 404/.test(reenvio),
  "una venta ajena contesta lo mismo que una que no existe");

check("REE-C", /venta\.status !== "CONFIRMED"/.test(reenvio),
  "una venta sin cobrar no tiene nada que entregar");

/* ⚠️ Renueva el VENCIMIENTO y nunca el CONTADOR. Son dos límites con dueños
   distintos: el vencimiento protege contra un enlace vivo para siempre, y el
   contador contra que se reparta a diez amigos. Reenviar el mail no cambia lo
   segundo. */
/* Se miran sólo las ESCRITURAS. `descargas` y `maxDescargas` aparecen de sobra
   en el `select` y en el texto del mail, y eso está bien: lo que no puede pasar
   es que alguno entre en un `data:`. */
const loQueEscribe = reenvio.match(/data: \{[^}]*\}/g) ?? [];
check("REE-D",
  /data: \{ expiresAt: vencimientoDelPermiso\(ahora\) \}/.test(reenvio) &&
  loQueEscribe.length > 0 && loQueEscribe.every((d) => !/descargas/i.test(d)),
  "el reenvío renueva el vencimiento y no toca el contador de descargas");

/* Y sólo renueva los que ESTABAN vencidos, con la condición adentro del `where`:
   reenviar no le puede regalar 30 días a un enlace que estaba por la mitad. */
check("REE-E", /where: \{ id: \{ in: vencidos \}, expiresAt: \{ lte: ahora \} \}/.test(reenvio),
  "no le regala treinta días a un enlace que todavía valía");

/* Si no queda ninguna descarga, no se manda nada: un mail con un botón que
   devuelve error es peor que no mandarlo. */
check("REE-F", /conSaldo\.length === 0[\s\S]{0,400}status: 409/.test(reenvio),
  "sin descargas disponibles no se manda el mail, se explica por qué");

/* Los dos topes: por venta —para que el botón no sea una máquina de mandarle
   correos a alguien— y por cuenta, para quien aprieta todos los de la lista. */
check("REE-G",
  /digital-reenvio:\$\{ordenId\}/.test(reenvio) && /digital-reenvio-cuenta:\$\{user\.id\}/.test(reenvio),
  "hay tope por venta y tope por cuenta");

/* ⚠️ Se ESPERA el mail, al revés que en el aviso de pago: allá la respuesta va
   para Mercado Pago, acá va para una persona que apretó un botón y necesita
   saber si salió. Decirle "listo" sin haber esperado es mentirle. */
check("REE-H",
  /await mandarLaEntrega\(/.test(reenvio) && !/despues\(/.test(reenvio),
  "el reenvío espera al mail antes de contestar, y no lo manda en diferido");

/* Y la respuesta no repite el correo de quien compró: ya está en la pantalla. */
check("REE-I", !/buyer\.email/.test(reenvio.slice(reenvio.indexOf("return NextResponse.json({\n    ok: true"))),
  "la respuesta no devuelve datos de quien compró");

/* ⚠️ UNA SOLA FORMA DE ARMAR EL MAIL. El automático y el reenviado tienen que
   decir lo mismo, y el reenviado se prueba mucho menos: con la cuenta escrita en
   los dos lugares, se separan solos. */
check("REE-J",
  /armadoDelMail\(/.test(cobro) && /armadoDelMail\(/.test(reenvio) &&
  !/rolDigital === "PRINCIPAL"/.test(sinComent(cobro)),
  "el mail automático y el reenviado se arman con la misma función");

/* ── El registro de envíos ──────────────────────────────────────────────────
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NADIE PODÍA CONTESTAR "¿SALIÓ EL MAIL?"
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El mail de entrega sale con `despues`, y si fallaba terminaba en un
 * `console.error` que nadie lee: la venta quedaba COBRADA, quien compró sin
 * nada, y sin un solo rastro en la base. `DigitalEnvioLog` es ese rastro.
 */
const resendSrc = readFileSync("src/lib/resend.ts", "utf8");

/* Los dos caminos del mail —el automático y el botón— pasan por la misma
   función, y esa función anota. Escritos por separado, uno de los dos se olvida
   de anotar y el agujero vuelve por la mitad. */
check("ENV-A",
  /mandarLaEntrega\(/.test(cobro) && /mandarLaEntrega\(/.test(reenvio) &&
  !/sendEntregaDigitalEmail\(/.test(cobro) && !/sendEntregaDigitalEmail\(/.test(reenvio),
  "los dos caminos del mail pasan por la función que lo anota");

/* Y se anotan LOS DOS resultados. Un registro que sólo guarda los éxitos no
   contesta la única pregunta por la que existe. */
check("ENV-B",
  /prisma\.digitalEnvioLog\.create/.test(envio) &&
  /estado: error === null \? "ENVIADO" : "FALLO"/.test(envio),
  "se anota el envío salga o no salga");

/* ⚠️ EL SDK DE RESEND NO TIRA ERROR: LO DEVUELVE. `resend.emails.send()`
   resuelve la promesa igual cuando la API rechaza el mail, así que un `try/catch`
   solo anotaría "ENVIADO" en un mail que nunca salió — o sea, fabricaría una
   prueba de entrega. Hay que mirar el `error` del resultado. */
check("ENV-C",
  /if \(r\.error\) error = r\.error\.message/.test(envio) &&
  /return \{ error: r\.error \? \{ message: r\.error\.message \} : null \}/.test(resendSrc),
  "se mira el error que DEVUELVE Resend, no sólo el que tira");

/* Sin la clave tampoco sale nada, y eso es un fallo y no un silencio: para quien
   compró, las dos cosas son "no me llegó". Devolver vacío dejaría "ENVIADO". */
check("ENV-D",
  /RESEND_API_KEY no configurada/.test(resendSrc),
  "sin la clave de Resend se contesta fallo, no silencio");

/* ⚠️ Anotar no puede voltear una entrega ya pagada. Misma regla que el registro
   de descargas: un apunte que falla no puede negar un archivo cobrado. */
check("ENV-E",
  /catch \(err\) \{\s*console\.error\("\[digital-envio\]/.test(envio),
  "un registro de envío que falla no voltea la entrega");

/* Un fallo anotado en una tabla que nadie mira no arregla nada: quien puede
   resolverlo tiene que enterarse el mismo día, y con el link a ESA venta, que es
   donde está el botón de reenviar. */
check("ENV-F",
  /DIGITAL_ENTREGA_FALLIDA/.test(cobro) && /link: `\/digitales\/ventas\/\$\{orden\.id\}`/.test(cobro),
  "si la entrega falla, le llega un aviso a quien vendió con el link a esa venta");

/* Y el aviso de la venta no puede afirmar que el mail ya salió: se escribe ANTES
   de mandarlo, a propósito, para que una entrega fallida no deje a quien vende
   sin enterarse de que vendió. */
check("ENV-G",
  /Le estamos mandando el archivo/.test(cobro) && !/Ya le mandamos el archivo/.test(cobro),
  "el aviso de la venta no afirma que el mail ya salió");

/* El motivo técnico del fallo se guarda, pero no viaja al navegador: puede traer
   detalles de nuestra cuenta de Resend y quien mira el panel no puede hacer nada
   con "domain not verified". */
check("ENV-H",
  !/envio\.error/.test(reenvio.slice(reenvio.indexOf("return NextResponse.json"))) ||
  !/NextResponse\.json\(\s*\{ error: envio\.error/.test(reenvio),
  "el motivo técnico del fallo no se le muestra a quien vende");

console.log(fallos === 0
  ? "\nok — sólo baja el archivo quien lo pagó, y sólo mientras vale su permiso"
  : `\nFALLA — ${fallos} chequeo(s) de la entrega digital`);
process.exit(fallos === 0 ? 0 : 1);
