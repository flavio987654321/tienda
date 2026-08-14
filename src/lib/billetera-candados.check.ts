/**
 * Chequeos de las dos cerraduras de la billetera. Se corre a mano:
 *
 *   npx tsx src/lib/billetera-candados.check.ts
 *
 * Acá viven las dos cosas del panel de afiliados que mueven plata y que NO se
 * pueden probar corriendo la aplicación: una necesita dos pedidos en el mismo
 * milisegundo, la otra necesita que alguien te robe un token. Las dos se
 * arreglaron cambiando la FORMA de una consulta, y las dos se pueden desarreglar
 * en un refactor que parece inocente.
 *
 *
 * 1) Rechazar un retiro dos veces devolvía la plata dos veces
 * -----------------------------------------------------------
 * `withdrawals/[id]` preguntaba "¿sigue PENDING?" con un SELECT y después
 * actualizaba con un UPDATE sin condición. Entre las dos consultas hay una
 * ventana. PostgreSQL, en su nivel por defecto, deja que dos transacciones lean
 * las dos "PENDING" — y siguen las dos de largo. Cada una le devolvía el importe
 * a la billetera.
 *
 * Alcanzaba con el botón abierto en dos pestañas.
 *
 * El arreglo es que la condición viaje adentro del WHERE del UPDATE. Ahí la
 * decide la base, que para eso bloquea la fila, y al segundo le vuelve
 * `count: 0`. Se chequea la forma de la consulta porque es exactamente lo que un
 * refactor "para que se lea mejor" vuelve a partir en dos.
 *
 *
 * 2) El token de la billetera servía media hora, todas las veces que quisieras
 * ---------------------------------------------------------------------------
 * El token es un HMAC: se verifica con la clave, sin preguntarle nada a la base.
 * Eso lo hace repetible — una firma válida sigue valiendo hasta que vence.
 *
 * Quien conseguía el token de otra persona (compu prestada, sessionStorage leído
 * por un script) tenía 30 minutos para cambiarle el CBU, aunque la dueña de la
 * cuenta ya hubiera terminado su trámite y se hubiera ido.
 *
 * Ahora la firma dice "lo emití yo y no venció" y una huella guardada en la base
 * dice "y todavía no se usó". Hacen falta las dos, y por eso las rutas tienen
 * que llamar a `otpTokenVigente` y NUNCA a `verifyOtpToken` a secas: la segunda
 * deja pasar un token ya quemado. Ese es el error fácil de cometer y el que este
 * chequeo cuida.
 *
 * El momento de quemarlo también importa, y es al revés de lo que parece: DESPUÉS
 * de que la operación salió bien. Si se quemara al validar, un "saldo
 * insuficiente" —el error más común de esa pantalla— obligaría a pedir otro
 * código por mail sólo para corregir el monto.
 */

process.env.NEXTAUTH_SECRET ??= "clave-de-prueba-para-los-chequeos-0123456789";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { makeOtpToken, verifyOtpToken } from "./otp-token";

const raiz = join(__dirname, "..", "..");
const leer = (p: string) => readFileSync(join(raiz, p), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const retiro     = leer("src/app/api/vendedoras/withdrawals/[id]/route.ts");
const billetera  = leer("src/app/api/vendedoras/wallet/route.ts");
const otpRuta    = leer("src/app/api/vendedoras/wallet/otp/route.ts");
const otpLib     = leer("src/lib/otp-token.ts");
const clicks     = leer("src/app/api/track-click/route.ts");
const stats      = leer("src/app/api/vendedoras/stats/route.ts");

console.log("\n1) El candado del retiro está en el WHERE, no en un SELECT aparte");

chequear(
  "la condición de estado viaja adentro del UPDATE",
  /updateMany\(\{\s*where: \{ id, status: \{ in: allowedFrom\[action\]/.test(retiro)
);
chequear(
  "y si no agarró nada, corta",
  /if \(tomado\.count === 0\) throw new Error\("Este retiro ya fue procesado"\);/.test(retiro)
);
chequear(
  "la transacción es Serializable",
  /isolationLevel: Prisma\.TransactionIsolationLevel\.Serializable/.test(retiro)
);
chequear(
  "ya no queda el SELECT-y-después-UPDATE que abría la ventana",
  !/validFrom\.includes\(fresh\.status\)/.test(retiro)
);
chequear(
  "el choque entre dos Serializable se contesta 409, no 400",
  /code === "P2034"[\s\S]{0,200}status: 409/.test(retiro)
);

console.log("\n1b) La acción del retiro se valida contra la lista");

chequear(
  "hay una lista cerrada de acciones",
  /const ACCIONES = \["APPROVE", "REJECT", "PROCESSING"\] as const;/.test(retiro)
);
chequear(
  "y lo que viene en el pedido se compara contra ella",
  /if \(!ACCIONES\.includes\(accionCruda\)\)/.test(retiro)
);
chequear(
  "el motivo y las notas se aceptan sólo si son texto",
  /typeof body\.rejectionReason === "string"/.test(retiro) && /typeof body\.notes === "string"/.test(retiro)
);

console.log("\n2) La transacción del retiro no escribe avisos adentro");

// El cuerpo de la transacción, aislado por su cierre con isolationLevel.
const cuerpoTx = retiro.match(/prisma\.\$transaction\(\s*async \(tx\) => \{([\s\S]*?)\},\s*\{ isolationLevel/)?.[1] ?? "";
chequear("se encontró el cuerpo de la transacción", cuerpoTx.length > 0);
chequear(
  "no manda notificaciones con la fila bloqueada",
  cuerpoTx.length > 0 && !/createNotification/.test(cuerpoTx)
);
chequear(
  "los avisos salen igual, pero afuera",
  /despues\(\(\) => createNotification/.test(retiro)
);

console.log("\n3) La billetera exige el token completo, no sólo la firma");

chequear(
  "no queda ni una llamada a verifyOtpToken en la ruta de la billetera",
  !/verifyOtpToken/.test(billetera)
);
chequear(
  "las DOS operaciones sensibles usan otpTokenVigente",
  (billetera.match(/await otpTokenVigente\(otpToken, user\.id\)/g) ?? []).length === 2,
  (billetera.match(/await otpTokenVigente\(otpToken, user\.id\)/g) ?? []).length
);
chequear(
  "y las dos queman el token",
  (billetera.match(/quemarOtpToken\(/g) ?? []).length === 2,
  (billetera.match(/quemarOtpToken\(/g) ?? []).length
);

console.log("\n4) El token se quema DESPUÉS de que la operación salió bien");

const finTx    = billetera.indexOf("{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }");
const quemaPost = billetera.indexOf("quemarOtpToken(userId, otpToken!)");
chequear("se encontraron las dos marcas", finTx > 0 && quemaPost > 0);
chequear(
  "en el retiro, la quema va después de la transacción",
  finTx > 0 && quemaPost > finTx,
  { finTx, quemaPost }
);

const guardado = billetera.indexOf("affiliateBankUpdatedAt: updatedAt");
const quemaPut = billetera.indexOf("quemarOtpToken(user.id, otpToken!)");
chequear(
  "en los datos bancarios, la quema va después del guardado",
  guardado > 0 && quemaPut > guardado,
  { guardado, quemaPut }
);

console.log("\n5) El token queda anotado al emitirse, y con su propio propósito");

chequear(
  "al verificar el código se registra el token",
  /const token = makeOtpToken\(user\.id\);\s*await registrarOtpToken\(user\.id, token\);/.test(otpRuta)
);
chequear(
  "la huella es un hash, no el token entero",
  /createHash\("sha256"\)\.update\(token\)\.digest\("hex"\)/.test(otpLib)
);
chequear(
  "otpTokenVigente compara contra la huella guardada",
  /return fila\.otpCode === huella\(token!\);/.test(otpLib)
);
chequear(
  "quemarOtpToken lleva la huella en el WHERE, así dos en paralelo no ganan los dos",
  /updateMany\(\{\s*where: \{ id: userId, otpCode: huella\(token\)/.test(otpLib)
);
chequear(
  "verificar un CÓDIGO rechaza una fila que en realidad tiene un token",
  /otpPurpose !== "bank_data"/.test(otpRuta)
);

console.log("\n6) La firma sigue siendo lo que dice ser");

const token = makeOtpToken("usuario-1");
chequear("un token recién hecho vale para su dueño", verifyOtpToken(token, "usuario-1"));
chequear("no vale para otra cuenta", !verifyOtpToken(token, "usuario-2"));
// El último carácter se cambia por OTRO, no por un "0" fijo: una de cada
// dieciséis firmas termina en 0, y esas veces "el token tocado" era el token
// original y el chequeo fallaba solo. Un chequeo que falla por azar se termina
// ignorando, que es la única forma de que no sirva para nada.
const ultimo = token.slice(-1);
chequear(
  "no vale si le tocan la firma",
  !verifyOtpToken(token.slice(0, -1) + (ultimo === "0" ? "1" : "0"), "usuario-1")
);
chequear("no vale un token cualquiera", !verifyOtpToken("usuario-1:1:deadbeef", "usuario-1"));
chequear("no vale vacío", !verifyOtpToken(null, "usuario-1"));

// Un token viejo pero BIEN FIRMADO: prueba que lo que corta es el vencimiento y
// no que la firma no cierre. Sin esto, el chequeo anterior taparía el agujero.
const viejo = Date.now() - 31 * 60 * 1000;
const firmaVieja = createHmac("sha256", process.env.NEXTAUTH_SECRET!)
  .update(`usuario-1:${viejo}`)
  .digest("hex");
chequear(
  "un token de hace 31 minutos ya no vale, aunque la firma cierre",
  !verifyOtpToken(`usuario-1:${viejo}:${firmaVieja}`, "usuario-1")
);

console.log("\n7) Los techos que faltaban");

chequear(
  "pedir el código por mail tiene tope por cuenta",
  /checkRateLimitConRespaldo\(\s*`otp-pedido:\$\{user\.id\}`/.test(otpRuta)
);
chequear(
  "las visitas repetidas del mismo lugar no se cuentan dos veces",
  /contarConTope\(\s*`click-unico:\$\{affiliate\.id\}:\$\{ip\}`,\s*1,/.test(clicks)
);
chequear(
  "la pantalla de estadísticas tiene tope",
  /checkRateLimitConRespaldo\(\s*`stats-afiliado:\$\{user\.id\}`/.test(stats)
);

console.log(
  fallos === 0
    ? "\nTodo bien: el retiro no se puede procesar dos veces y el token sirve una sola.\n"
    : `\n${fallos} chequeo(s) fallando.\n`
);
process.exit(fallos === 0 ? 0 : 1);
