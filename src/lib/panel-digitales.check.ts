/**
 * Chequeos del panel de Productos Digitales. Se corre a mano con:
 *
 *   npx tsx src/lib/panel-digitales.check.ts
 *
 * Cuida tres cosas que no se pueden probar importando nada, porque viven adentro
 * de rutas y componentes que arrastran Prisma, Supabase y Mercado Pago:
 *
 *   1. Los frenos de `/api/digitales/prueba`, que es la única ruta del proyecto
 *      que **regala un plan pago**. No cobra, así que no pasa por el webhook ni
 *      por ninguno de los controles que ya existen: los suyos son todos propios.
 *   2. Que ninguna pantalla del panel prometa una ruta que no existe.
 *   3. Que después de pagar, la persona vuelva a SU panel.
 *
 * Es un chequeo tosco a propósito: no prueba que funcionen, prueba que **no
 * desaparecieron**. Todos los agujeros que cubre tienen la misma forma —no rompen
 * nada, no tiran ningún error— y se descubren cuando ya pasó.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { PLANES, TOPES_DIGITALES, COMISION_DIGITAL } from "./planLimits";
import { TIERS_DIGITALES, featuresDigital } from "./planes-digitales";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* El archivo sin sus comentarios. Varios de estos chequeos verifican que algo NO
   esté, y los comentarios de esas mismas rutas explican el error viejo citándolo
   textual — sin sacarlos, el chequeo se dispara con su propia documentación.
   Mismo criterio que en `pagos-suscripcion.check.ts`. */
function soloCodigo(fuente: string): string {
  return fuente
    .split("\n")
    .filter((linea) => {
      const t = linea.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"));
    })
    .join("\n");
}

const prueba = soloCodigo(readFileSync("src/app/api/digitales/prueba/route.ts", "utf8"));
const preferencia = soloCodigo(readFileSync("src/app/api/suscripcion/preferencia/route.ts", "utf8"));
const barra = readFileSync("src/app/digitales/DigitalesSidebar.tsx", "utf8");
const layout = soloCodigo(readFileSync("src/app/digitales/layout.tsx", "utf8"));
const miCuenta = soloCodigo(readFileSync("src/app/digitales/mi-cuenta/MiCuentaClient.tsx", "utf8"));
const modal = soloCodigo(readFileSync("src/components/subscription/PaymentModal.tsx", "utf8"));
const cron = soloCodigo(readFileSync("src/app/api/cron/daily/route.ts", "utf8"));
const perfil = soloCodigo(readFileSync("src/app/api/perfil/route.ts", "utf8"));
const registro = soloCodigo(readFileSync("src/app/api/auth/registro/route.ts", "utf8"));
const mails = soloCodigo(readFileSync("src/lib/resend.ts", "utf8"));

/* ── 1. La ruta que regala un plan pago ────────────────────────────────────── */
console.log("\n1) Los frenos de /api/digitales/prueba");

chequear("exige sesión", /getCurrentUser\(\)/.test(prueba) && /status: 401/.test(prueba));

chequear("tiene tope de intentos", /checkRateLimit\(`digital-prueba:/.test(prueba));

// El tier llega del navegador y elige QUÉ plan se regala. Con un cast, "PRO"
// escrito a mano en la consola es Pro gratis; con una clave heredada del
// prototipo (`constructor`) se rompe de otra forma.
chequear("el tier sale de una tabla con hasOwnProperty y no de un cast",
  /hasOwnProperty\.call\(PROBABLES, tier\)/.test(prueba) &&
  !/tier as ("STARTER"|"PRO")/.test(prueba));

// Si Productos Digitales está apagado, sus planes no se venden — y tampoco se
// regalan. Es el mismo freno que ya tienen la preferencia y el webhook.
chequear("rechaza el plan de un producto cerrado", /if \(planCerrado\(defPlan\)\)/.test(prueba));

// El candado de ecosistema. Sin esto, una dueña de tienda que le pegara a esta
// ruta se quedaba con role DIGITAL y el cron le cerraba la tienda sola.
chequear("sólo toca suscripciones DIGITAL",
  /sub\.role !== "DIGITAL"/.test(prueba) && /status: 403/.test(prueba));

chequear("sólo se prueba desde Free", /sub\.tier !== "FREE"/.test(prueba));

// Una prueba repetible es Starter gratis para siempre, de a siete días.
chequear("no se puede volver a usar la prueba", /pruebaYaUsada\(sub\)/.test(prueba));

/* El `where` con la condición adentro es lo que hace que un doble click no empuje
   `trialEndsAt` dos veces. Un `update` por id la aplicaría las dos veces. */
chequear("la escritura es un updateMany condicionado (no un update por id)",
  /updateMany\(\{[\s\S]*?where: \{ userId: user\.id, role: "DIGITAL", tier: "FREE" \}/.test(prueba) &&
  /count === 0/.test(prueba));

// Lo más importante: el estado que queda es TRIAL. Un ACTIVE acá sería el plan
// más caro, gratis y para siempre, pedido desde el navegador.
chequear("el alta la arma altaDigitalConPrueba (que devuelve TRIAL, nunca ACTIVE)",
  /altaDigitalConPrueba\(tierProbable, billing\)/.test(prueba) &&
  !/status: "ACTIVE"/.test(prueba));

/* ── 2. Ninguna pantalla promete una ruta que no existe ────────────────────── */
console.log("\n2) Los links del panel llevan a algún lado");

// El menú es lo primero que se toca al entrar. Un link a una pantalla que todavía
// no está da 404 y se lee como "el panel está roto", no como "eso viene después".
const rutasDelNav = [...barra.matchAll(/href: "(\/digitales[^"]*)"/g)].map((m) => m[1]);
chequear("la barra declara al menos dos pantallas", rutasDelNav.length >= 2, rutasDelNav);
for (const ruta of rutasDelNav) {
  const archivo = `src/app${ruta}/page.tsx`;
  chequear(`${ruta} tiene su page.tsx`, existsSync(archivo));
}

// Y el aviso del cron —el único que le llega a una cuenta digital— tiene que
// caer en la pantalla que explica lo que pasó, no en la raíz del panel.
chequear("el aviso de baja a Free lleva a Mi cuenta",
  /link: "\/digitales\/mi-cuenta"/.test(cron) && existsSync("src/app/digitales/mi-cuenta/page.tsx"));


/* Y ninguna pantalla de adentro puede quedar sin salida.
 *
 * En escritorio la barra está siempre a la vista y el botón parece de más —el
 * panel de tiendas se lo sacó por eso—, pero en el celular el menú vive atrás de
 * una hamburguesa, y hay un caso peor: el aviso del cron linkea DERECHO a una
 * pantalla de adentro, así que se puede caer ahí sin haber pasado nunca por el
 * inicio. Este chequeo existe para que la próxima pantalla no se olvide.
 *
 * Mira los `page.tsx` y no los componentes de navegador a propósito: el
 * encabezado y el volver viven en el servidor, iguales en todas las pantallas. */
const pantallasDeAdentro = readdirSync("src/app/digitales", { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `src/app/digitales/${e.name}/page.tsx`)
  .filter((p) => existsSync(p));

chequear("hay al menos una pantalla de adentro", pantallasDeAdentro.length >= 1, pantallasDeAdentro);
for (const pantalla of pantallasDeAdentro) {
  chequear(`${pantalla.replace("src/app", "")} tiene botón de volver`,
    /<BotonVolver/.test(readFileSync(pantalla, "utf8")));
}

/* ── 3. Después de pagar, cada uno vuelve a su panel ───────────────────────── */
console.log("\n3) La vuelta de Mercado Pago");

// Estaba fijo en /dashboard/mi-plan. Con los planes digitales, el que pagaba
// Starter terminaba en el panel de tiendas, que le contesta "esta no es tu
// cuenta" — justo después de pagar.
chequear("las back_urls dependen del ecosistema del plan",
  /defPlan\.ecosistema === "DIGITAL" \? "\/digitales\/mi-cuenta" : "\/dashboard\/mi-plan"/.test(preferencia));

// El nombre del plan en el checkout salía de un `? :` escrito a mano: cualquier
// plan que no fuera de tienda se anunciaba como "Afiliado".
chequear("el modal de pago toma el nombre del registro",
  /PLANES\[plan\]\.label/.test(modal) && !/plan === "OWNER_PREMIUM" \?/.test(modal));

/* ── 4. La pantalla dice lo mismo que la base ──────────────────────────────── */
console.log("\n4) Mi cuenta no inventa números");

// Los tres números que se muestran salen de las constantes que los hacen cumplir.
// Copiados a mano se desincronizan solos, y esta es la pantalla donde se decide
// pagar.
chequear("la comisión sale de COMISION_DIGITAL", /COMISION_DIGITAL\[tier\]/.test(miCuenta));
chequear("el precio sale de PRECIOS_DIGITALES", /PRECIOS_DIGITALES\[PLAN_KEY\[tier\]\]\[billing\]/.test(miCuenta));
chequear("las funciones salen de featuresDigital", /featuresDigital\(tier\)/.test(miCuenta));

// Con el producto cerrado no se ofrece pagar: la ruta lo rechaza igual, así que
// sería un botón que no puede funcionar.
chequear("no ofrece pagar con el producto cerrado", /\{DIGITALES_ABIERTO && \(/.test(miCuenta));

// Los tres planes tienen que poder dibujarse: `featuresDigital` cruza tiers con
// topes, y un tier sin fila en TOPES_DIGITALES explota en pantalla.
chequear("los tres tiers tienen topes, comisión y funciones",
  TIERS_DIGITALES.every((t) =>
    TOPES_DIGITALES[t] !== undefined &&
    COMISION_DIGITAL[t] !== undefined &&
    featuresDigital(t).length > 0));

// La comisión tiene que bajar a medida que se paga más: es el argumento de venta
// de la pantalla ("con Starter baja a 6%"). Si alguna vez subiera, ese texto
// pasaría a mentir sin que nada avise.
chequear("la comisión baja de Free a Starter a Pro",
  COMISION_DIGITAL.FREE > COMISION_DIGITAL.STARTER &&
  COMISION_DIGITAL.STARTER > COMISION_DIGITAL.PRO);

// Los dos planes que se pueden probar tienen que existir con precio: la pantalla
// muestra "después $X/mes" al lado del botón de probar.
chequear("Starter y Pro existen en el registro y tienen precio",
  PLANES.DIGITAL_STARTER.precios !== null && PLANES.DIGITAL_PRO.precios !== null);

/* ── 5. La puerta del panel ────────────────────────────────────────────────── */
console.log("\n5) El layout sigue decidiendo sesión y rol");

chequear("sin sesión dibuja el login, no redirige", /LoginGate/.test(layout) && !/redirect\(/.test(layout));
chequear("un rol ajeno no entra", /user\.role !== "DIGITAL"/.test(layout) && /PanelRolAjeno/.test(layout));
// El manifiesto y el ícono ya pueden ir: el panel tiene adentro una pantalla que
// funciona. A medias instalaba una app rota.
chequear("declara su manifiesto y su ícono",
  /manifest: "\/api\/manifest\/digitales"/.test(layout) &&
  /icons\/digitales/.test(layout) &&
  existsSync("src/app/api/manifest/digitales/route.ts") &&
  existsSync("src/app/api/icons/digitales/route.tsx"));
// El scope del service worker tiene que coincidir con el del manifiesto o Android
// no atribuye la app instalada.
chequear("el service worker se registra en /digitales", /scope="\/digitales"/.test(layout));

/* ── 6. La barra es lateral, como el panel de tiendas ──────────────────────── */
console.log("\n6) El menú está donde está en el resto de la plataforma");

/* La primera versión era una barra horizontal, calcada de `/afiliados`. Estaba
   mal copiada: el panel que manda en esta plataforma es el de tiendas, y ese es
   lateral. Dos paneles del mismo producto con el menú en lugares distintos se
   sienten dos programas distintos. */
chequear("hay una barra lateral fija a la izquierda",
  /<aside[\s\S]{0,200}?fixed left-0/.test(barra));
chequear("el layout la usa", /<DigitalesSidebar/.test(layout));
/* Si el `<main>` no deja libre la franja de 56 px, la barra —que es `fixed`— se
   dibuja ENCIMA del contenido y tapa el borde izquierdo de cada pantalla. */
chequear("el contenido deja libre la franja de la barra", /lg:ml-14/.test(layout));

/* ── 7. Los datos de la cuenta ─────────────────────────────────────────────── */
console.log("\n7) Editar tus datos no pisa lo que no tocaste");

/* El arreglo que hizo falta para usar esta ruta desde el panel: hacía
   `city: city?.trim() || null` para los tres campos SIEMPRE, así que quien
   mandara sólo nombre y teléfono —como hace esta pantalla, que no pide ciudad—
   le borraba la ciudad a la persona sin nombrarla. */
chequear("la ruta distingue 'no vino' de 'vino vacío'",
  /if \(valor === undefined\) return undefined;/.test(perfil) &&
  !/city: city\?\.trim\(\) \|\| null/.test(perfil));
chequear("los campos tienen tope de largo", /const TOPES = \{/.test(perfil) && /slice\(0, tope\)/.test(perfil));
chequear("la ruta tiene tope de intentos", /checkRateLimit\(`perfil:/.test(perfil));
chequear("la pantalla manda sólo los campos que edita",
  /name: nombre\.trim\(\), phone: telefono\.trim\(\)/.test(miCuenta));

/* La contraseña se cambia por un link al correo y NO con un formulario acá.
   Un formulario en esta pantalla deja que cualquiera con la sesión abierta
   —el teléfono desbloqueado arriba de la mesa— te cambie la contraseña y te deje
   afuera de tu propia cuenta. Si alguna vez se agrega uno, tiene que verificar
   la contraseña vieja del lado del servidor, y este chequeo va a saltar para que
   esa decisión se tome a propósito y no de pasada. */
chequear("la contraseña se cambia por mail, no con un formulario en el panel",
  /\/api\/auth\/reset-password/.test(miCuenta) &&
  !/type="password"/.test(miCuenta));

/* ── 8. Lo que se escribe en un campo no puede hacer daño ──────────────────── */
console.log("\n8) Los dos campos que se escriben a mano");

/* La regla del teléfono es UNA sola y la usan los tres: el registro, la ruta que
   lo edita y la pantalla. Estaba nada más que en el alta, así que el número que
   el registro rechazaba se guardaba igual entrando por `/api/perfil`. Es el mismo
   error que ya había pasado con la contraseña (ver `password-policy`). */
chequear("el registro usa la regla compartida", /validarTelefono\(phone\)/.test(registro));
chequear("la ruta que lo edita usa la MISMA", /validarTelefono\(data\.phone\)/.test(perfil));
chequear("y la pantalla también", /validarTelefono\(telefono\)/.test(miCuenta));

/* Un nombre de una letra no identifica a nadie, y se dibuja en el panel, en los
   mails y en el checkout de Mercado Pago. */
chequear("el nombre tiene mínimo del lado del servidor", /data\.name\.length < 2/.test(perfil));

/* Los caracteres de control no los escribe nadie a mano: llegan pegados. Un salto
   de línea adentro del nombre se arrastra a los mails; el byte nulo rompe
   Postgres, que no lo acepta adentro de un texto. */
chequear("se limpian los caracteres de control",
  /\\u0000-\\u001F/.test(perfil) || /\\x00-\\x1F/.test(perfil));

/* ⚠️ El agujero de verdad que apareció al hacer editable el nombre.
   `sendVerificationReceivedEmail` y `sendVerificationApprovedEmail` metían
   `userName` CRUDO adentro del HTML del mail, mientras el resto del archivo ya
   usaba `escapeHtml`. Con el nombre editable desde el panel, eso es HTML puesto
   por la persona dentro de un correo que mandamos nosotros. */
chequear("ningún mail mete el nombre crudo en el HTML",
  !/\$\{userName \|\| "ahí"\}/.test(mails) &&
  /escapeHtml\(userName\)/.test(mails));

/* ── 9. Los botones no se pueden apretar dos veces ─────────────────────────── */
console.log("\n9) Doble click");

/* Cada botón que escribe algo tiene que apagarse solo mientras trabaja. Un
   `disabled` no alcanza como garantía —alcanza un Enter en el momento justo— así
   que además la función corta al entrar. */
chequear("guardar datos se apaga mientras guarda y corta al entrar",
  /disabled=\{guardando \|\| !datosCambiaron \|\| hayProblema\}/.test(miCuenta) &&
  /if \(guardando \|\| hayProblema \|\| !datosCambiaron\) return;/.test(miCuenta));

/* Y el que se apretó una vez con éxito no se puede volver a apretar con los
   MISMOS datos: la comparación va contra lo último guardado y no contra la prop,
   que no cambia sin recargar la página. */
chequear("después de guardar, el botón queda apagado",
  /guardadoComo/.test(miCuenta) && /setGuardadoComo\(guardadoAhora\)/.test(miCuenta));

chequear("probar el plan se apaga mientras trabaja", /disabled=\{probando !== null\}/.test(miCuenta));
chequear("el link de contraseña no se puede mandar dos veces",
  /disabled=\{mandandoLink\}/.test(miCuenta) && /linkMandado \?/.test(miCuenta));

/* ── 10. Los renglones ─────────────────────────────────────────────────────── */
console.log("\n10) Nada se desborda ni empuja la pantalla");

/* Un correo largo sin cortar ensancha la tarjeta entera y aparece la barra de
   desplazamiento horizontal en el celular. `break-all` es feo pero es lo único
   que corta una dirección que no tiene espacios. */
chequear("el correo se corta", /break-all/.test(miCuenta));
/* En la barra el nombre vive en 240 px y no se puede cortar en dos renglones. */
chequear("el nombre en la barra se recorta con puntos", /truncate/.test(barra));
/* El `<main>` no puede desbordar a lo ancho: si lo hace, la página entera se
   mueve para los costados en el celular y la barra lateral se despega. */
chequear("el contenido no desborda a lo ancho", /overflow-x-hidden/.test(layout));

console.log(fallos === 0
  ? "\nok — el panel de Productos Digitales sigue en pie"
  : `\nFALLA — ${fallos} chequeo(s) del panel de Productos Digitales`);
process.exit(fallos === 0 ? 0 : 1);
