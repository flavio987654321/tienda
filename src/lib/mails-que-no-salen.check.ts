/**
 * Que ningún mail rechazado se pierda en silencio.
 *
 *   npx tsx src/lib/mails-que-no-salen.check.ts
 *
 * ── El agujero que cuida ────────────────────────────────────────────────────
 *
 * `resend.emails.send()` **no tira error cuando la API rechaza el mail**:
 * contesta `{ data, error }` y resuelve la promesa igual. Dirección inválida,
 * dominio sin verificar, cuota agotada, clave revocada — todo eso llega como un
 * campo adentro de la respuesta.
 *
 * O sea que un `try/catch` alrededor no atrapa nada, y el código sigue como si
 * el mail hubiera salido. Los 22 senders de `lib/resend.ts` estuvieron así hasta
 * el 03/09/26.
 *
 * Y no es la primera vez que pasa lo mismo con otra cara: en julio de 2026 el
 * SMTP de Gmail devolvía EAUTH 535 y el error se perdía en un `.catch()`,
 * dejando 25 mails muertos durante días. `lib/email.ts` se arregló entonces;
 * `lib/resend.ts` se quedó afuera de aquella corrección y nadie lo notó, porque
 * un mail que no llega no hace ruido en ningún lado.
 *
 * ── Las dos reglas ──────────────────────────────────────────────────────────
 *
 * 1. **Ningún envío puede saltearse el control.** Todo pasa por un envoltorio
 *    que mira el `error` y lo deja escrito.
 * 2. **Lo que no puede fallar sin avisar, devuelve el resultado**, y su llamador
 *    lo mira: confirmar el correo, entregar un archivo pago.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const resendSrc = readFileSync("src/lib/resend.ts", "utf8");
const emailSrc = readFileSync("src/lib/email.ts", "utf8");

/* ── El envoltorio ───────────────────────────────────────────────────────── */

/* ⚠️ El cliente de verdad se toca en UN solo lugar. Si aparece una segunda vez,
   ese envío se salteó el control y vuelve a fallar en silencio. */
const usosDelClienteReal = (resendSrc.match(/clienteResend\.emails\.send\(/g) ?? []).length;
check("ENVOLT-A", usosDelClienteReal === 1,
  `el cliente real se usa una sola vez, adentro del envoltorio (se usa ${usosDelClienteReal})`);

/* Y el envoltorio mira el error y lo deja escrito con el asunto y el destino,
   que es con lo que después se encuentra de qué persona se trata. */
check("ENVOLT-B",
  /if \(r\.error\) \{[\s\S]{0,400}console\.error\("\[resend\] la API rechazó el mail"/.test(resendSrc) &&
  /para: payload\.to/.test(resendSrc),
  "el envoltorio deja escrito el rechazo, con asunto y destinatario");

/* Todos los senders siguen mandando por el envoltorio. El número sube cuando se
   agrega un mail nuevo; lo que se cuida es que no baje a cero ni que aparezcan
   envíos por afuera. */
const enviosEnvueltos = (resendSrc.match(/resend\.emails\.send\(/g) ?? []).length - usosDelClienteReal;
check("ENVOLT-C", enviosEnvueltos >= 20,
  `los senders mandan por el envoltorio (${enviosEnvueltos} envíos)`);

/* ── Nadie se arma su propio cliente por afuera ──────────────────────────── */

/* Un `new Resend(...)` en cualquier otro archivo es un envío que no pasa por
   ningún control. Los dos permitidos son los dos módulos de mails, que ya lo
   miran cada uno a su manera. */
function archivosTs(raiz: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(raiz)) {
    const ruta = join(raiz, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivosTs(ruta));
    else if (/\.tsx?$/.test(entrada) && !entrada.endsWith(".check.ts")) salida.push(ruta);
  }
  return salida;
}
const PERMITIDOS = ["src\\lib\\resend.ts", "src/lib/resend.ts", "src\\lib\\email.ts", "src/lib/email.ts"];
const clientesSueltos = archivosTs("src")
  .filter((f) => !PERMITIDOS.includes(f))
  .filter((f) => /new Resend\(/.test(readFileSync(f, "utf8")));
check("ENVOLT-D", clientesSueltos.length === 0,
  `nadie se arma un cliente de Resend por afuera${clientesSueltos.length ? `: ${clientesSueltos.join(", ")}` : ""}`);

/* ── El otro módulo de mails sigue mirando el error ──────────────────────── */

/* `email.ts` lo resuelve al revés —lo convierte en excepción— porque sus 25
   funciones venían de nodemailer, que tiraba, y ya estaban escritas para eso.
   Lo que no puede pasar es que deje de mirarlo. */
const tirasEnEmail = (emailSrc.match(/if \(error\) throw new Error\(`Resend:/g) ?? []).length;
const enviosEnEmail = (emailSrc.match(/resend\.emails\.send\(/g) ?? []).length;
check("ENVOLT-E", tirasEnEmail === enviosEnEmail && enviosEnEmail > 0,
  `en email.ts cada envío mira el error (${tirasEnEmail} de ${enviosEnEmail})`);

/* ── Los que no pueden fallar sin avisar ─────────────────────────────────── */

/* Sin el mail de confirmación la persona NO PUEDE ENTRAR NUNCA: no hay otro
   camino para confirmar la cuenta que acaba de crear. */
check("CRIT-A",
  /export async function sendConfirmEmail\([\s\S]{0,300}\}\): Promise<ResultadoDeEnvio>/.test(resendSrc),
  "el mail de confirmación devuelve si salió o no");

/* Y el de la entrega de un archivo pago, que además se anota en la base. */
check("CRIT-B",
  /export async function sendEntregaDigitalEmail\([\s\S]{0,600}\}\): Promise<ResultadoDeEnvio>/.test(resendSrc),
  "el mail de entrega digital devuelve si salió o no");

/* ⚠️ Y el llamador lo MIRA. El respaldo de Supabase estaba escrito y andando, y
   era inalcanzable justo para este fallo: como el envío nunca tiraba, la ruta
   contestaba "listo" y nunca llegaba a probarlo. */
const reenviar = readFileSync("src/app/api/auth/reenviar-confirmacion/route.ts", "utf8");
check("CRIT-C",
  /const envio = await sendConfirmEmail\(/.test(reenviar) &&
  /if \(!envio\.error\) return NextResponse\.json\(\{ ok: true \}\)/.test(reenviar),
  "si el mail de confirmación no sale, se prueba el segundo camino");

/* ⚠️ La recuperación de contraseña es la excepción, y está decidida: contesta lo
   mismo pase lo que pase para no revelar si esa dirección tiene cuenta. El
   fallo igual queda escrito por el envoltorio. */
const reset = readFileSync("src/app/api/auth/reset-password/route.ts", "utf8");
check("CRIT-D",
  /es a propósito/.test(reset) && /return NextResponse\.json\(\{ ok: true \}\);\s*\}\s*$/.test(reset.trimEnd() + "\n"),
  "recuperar la contraseña contesta genérico a propósito, y está explicado");

console.log(fallos === 0
  ? "\nok — un mail rechazado deja rastro, y los que no pueden fallar avisan"
  : `\nFALLA — ${fallos} chequeo(s) de los mails que no salen`);
process.exit(fallos === 0 ? 0 : 1);
