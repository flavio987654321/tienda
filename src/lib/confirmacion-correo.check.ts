/**
 * Chequeos del circuito de confirmación de correo. Se corre a mano con:
 *
 *   npx tsx src/lib/confirmacion-correo.check.ts
 *
 * ── Qué protege ─────────────────────────────────────────────────────────────
 *
 * Hasta el 31/08/26 el alta le decía a Supabase "creá esta cuenta **y dala por
 * confirmada**": nunca se le escribía a la dirección. Alguien podía registrarse
 * con el correo de otra persona y quedárselo — el dueño real no podía volver a
 * usarlo, y los mails de esa cuenta (los pedidos incluidos, si era una tienda) le
 * llegaban a un desconocido.
 *
 * El arreglo tiene una trampa: si sale a medias, **nadie puede entrar**. Son
 * cuatro piezas y las cuatro tienen que estar:
 *
 *   1. El alta pide el link en vez de saltearlo.
 *   2. El mail que lo lleva SE ESPERA, porque ahora es la llave.
 *   3. El ingreso sabe distinguir "falta confirmar" de "contraseña equivocada".
 *   4. Hay forma de pedir que lo reenvíen, en las DOS pantallas de ingreso.
 *
 * Se leen los archivos como texto, igual que en `pagos-suscripcion.check.ts`: son
 * frenos que viven adentro de rutas y componentes y no se pueden importar sin
 * arrastrar Supabase, Prisma y React.
 *
 * ── Lo que NO se puede probar desde acá ─────────────────────────────────────
 *
 * Que la dirección de vuelta esté en la lista de Redirect URLs de Supabase. Eso
 * vive en el panel de Supabase, no en el repo. Si falta, el link del mail lleva a
 * cualquier lado. Está anotado en ECOSISTEMA-DIGITALES.md.
 */

import { readFileSync } from "node:fs";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`); }
};

/** El archivo sin sus comentarios: varios de estos chequeos verifican que algo
 *  NO esté, y los comentarios citan el error viejo textual. */
function soloCodigo(fuente: string): string {
  return fuente
    .split("\n")
    .filter((linea) => {
      const t = linea.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"));
    })
    .join("\n");
}

const registro = soloCodigo(readFileSync("src/app/api/auth/registro/route.ts", "utf8"));
const reenviar = soloCodigo(readFileSync("src/app/api/auth/reenviar-confirmacion/route.ts", "utf8"));
const login = soloCodigo(readFileSync("src/hooks/useLoginForm.ts", "utf8"));
const pantallaWeb = soloCodigo(readFileSync("src/app/(auth)/login/page.tsx", "utf8"));
const pantallaApp = soloCodigo(readFileSync("src/components/panel/PanelLogin.tsx", "utf8"));
const mails = soloCodigo(readFileSync("src/lib/resend.ts", "utf8"));

/* ── 1. El alta no se saltea la confirmación ───────────────────────────────── */
console.log("\n1) La cuenta nace SIN confirmar, y con su link");

chequear("el alta NO da la cuenta por confirmada",
  !/email_confirm\s*:\s*true/.test(registro));
chequear("el alta genera el link de confirmación",
  /generateLink\(\{[\s\S]{0,120}type:\s*"signup"/.test(registro));
chequear("si no hay link, no se crea nada",
  /!linkDeConfirmacion/.test(registro));

/* ── 2. El mail es la llave, así que se espera ─────────────────────────────── */
console.log("\n2) El mail que lleva el link no se manda al aire");

chequear("el alta ESPERA a que el mail salga",
  /await sendWelcomeEmail\(/.test(registro));
chequear("y le pasa el link",
  /confirmLink: linkDeConfirmacion/.test(registro));
chequear("si no sale, la pantalla se entera",
  /mailEnviado/.test(registro));
chequear("sin clave de Resend, el mail con link falla fuerte en vez de callarse",
  /if \(confirmLink\) throw new Error/.test(mails));

/* ── 3. El ingreso explica qué pasa ────────────────────────────────────────── */
console.log("\n3) 'Falta confirmar' no se confunde con 'contraseña equivocada'");

chequear("el ingreso reconoce el caso",
  /not confirmed\|email_not_confirmed/.test(login));
chequear("y lo expone para que la pantalla actúe",
  /faltaConfirmar/.test(login));

/* ── 4. El reenvío existe y está en las dos pantallas ──────────────────────── */
console.log("\n4) Se puede pedir que lo manden de nuevo");

chequear("la ruta de reenvío tiene tope de ritmo",
  /checkRateLimit\(`reenviar-confirmacion/.test(reenviar));
chequear("y no revela si el correo existe: siempre contesta lo mismo",
  !/status:\s*4\d\d/.test(reenviar));
chequear("la pantalla de la web ofrece el reenvío",
  /reenviarConfirmacion/.test(pantallaWeb));
chequear("la de la app instalada también, que es la que no tiene salida",
  /reenviarConfirmacion/.test(pantallaApp));

console.log(fallos === 0
  ? "\nok — el circuito de confirmación está completo"
  : `\nFALLA — ${fallos} pieza(s) del circuito de confirmación`);
process.exit(fallos === 0 ? 0 : 1);
