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

import { existsSync, readFileSync } from "node:fs";
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
const nav = readFileSync("src/app/digitales/DigitalesNav.tsx", "utf8");
const layout = soloCodigo(readFileSync("src/app/digitales/layout.tsx", "utf8"));
const miPlan = soloCodigo(readFileSync("src/app/digitales/mi-plan/MiPlanDigitalClient.tsx", "utf8"));
const modal = soloCodigo(readFileSync("src/components/subscription/PaymentModal.tsx", "utf8"));
const cron = soloCodigo(readFileSync("src/app/api/cron/daily/route.ts", "utf8"));

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
const rutasDelNav = [...nav.matchAll(/href: "(\/digitales[^"]*)"/g)].map((m) => m[1]);
chequear("el nav declara al menos dos pantallas", rutasDelNav.length >= 2, rutasDelNav);
for (const ruta of rutasDelNav) {
  const archivo = `src/app${ruta}/page.tsx`;
  chequear(`${ruta} tiene su page.tsx`, existsSync(archivo));
}

// Y el aviso del cron —el único que le llega a una cuenta digital— tiene que
// caer en la pantalla que explica lo que pasó, no en la raíz del panel.
chequear("el aviso de baja a Free lleva a Mi Plan",
  /link: "\/digitales\/mi-plan"/.test(cron) && existsSync("src/app/digitales/mi-plan/page.tsx"));

/* ── 3. Después de pagar, cada uno vuelve a su panel ───────────────────────── */
console.log("\n3) La vuelta de Mercado Pago");

// Estaba fijo en /dashboard/mi-plan. Con los planes digitales, el que pagaba
// Starter terminaba en el panel de tiendas, que le contesta "esta no es tu
// cuenta" — justo después de pagar.
chequear("las back_urls dependen del ecosistema del plan",
  /defPlan\.ecosistema === "DIGITAL" \? "\/digitales\/mi-plan" : "\/dashboard\/mi-plan"/.test(preferencia));

// El nombre del plan en el checkout salía de un `? :` escrito a mano: cualquier
// plan que no fuera de tienda se anunciaba como "Afiliado".
chequear("el modal de pago toma el nombre del registro",
  /PLANES\[plan\]\.label/.test(modal) && !/plan === "OWNER_PREMIUM" \?/.test(modal));

/* ── 4. La pantalla dice lo mismo que la base ──────────────────────────────── */
console.log("\n4) Mi Plan no inventa números");

// Los tres números que se muestran salen de las constantes que los hacen cumplir.
// Copiados a mano se desincronizan solos, y esta es la pantalla donde se decide
// pagar.
chequear("la comisión sale de COMISION_DIGITAL", /COMISION_DIGITAL\[tier\]/.test(miPlan));
chequear("el precio sale de PRECIOS_DIGITALES", /PRECIOS_DIGITALES\[PLAN_KEY\[tier\]\]\[billing\]/.test(miPlan));
chequear("las funciones salen de featuresDigital", /featuresDigital\(tier\)/.test(miPlan));

// Con el producto cerrado no se ofrece pagar: la ruta lo rechaza igual, así que
// sería un botón que no puede funcionar.
chequear("no ofrece pagar con el producto cerrado", /\{DIGITALES_ABIERTO && \(/.test(miPlan));

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

console.log(fallos === 0
  ? "\nok — el panel de Productos Digitales sigue en pie"
  : `\nFALLA — ${fallos} chequeo(s) del panel de Productos Digitales`);
process.exit(fallos === 0 ? 0 : 1);
