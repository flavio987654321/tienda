/**
 * Chequeos de la pantalla de Productos Digitales en el panel de admin. Se corre
 * con:
 *
 *   npx tsx src/lib/admin-digitales.check.ts
 *
 * Es una pantalla para DECIDIR: a quién escribirle esta semana, si el producto
 * da plata, si conviene seguir. Un número inflado acá no rompe nada —no hay
 * error, no hay pantalla en blanco— y sin embargo es lo peor que puede pasar,
 * porque las decisiones se toman igual.
 *
 * Por eso lo que se vigila es:
 *
 *   - Que el "fijo del mes" sea plata que entró DE VERDAD: ni las pruebas, ni
 *     las cuentas en gracia, ni los planes que pusimos a mano.
 *   - Que la comisión salga de la tasa congelada en cada orden, que es la
 *     misma cuenta que hace el panel de la dueña.
 *   - Que nadie que necesite atención se quede afuera de las listas.
 */

import { readFileSync } from "node:fs";
import {
  fijoMensual, diasParaPerderElDominio, necesitanAtencion, ordenarCuentas,
  type CuentaDigital,
} from "./admin-digitales";
import { PRECIOS_DIGITALES } from "./planLimits";
import { DIAS_DE_DOMINIO_EN_FREE } from "./configuracion-digital";
import type { SubscriptionStatus } from "./subscription";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

const AHORA = new Date("2026-09-23T12:00:00Z");
const dias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000);

let n = 0;
function cuenta(x: Partial<CuentaDigital> = {}): CuentaDigital {
  n++;
  return {
    userId: `u${n}`, nombre: `Cuenta ${n}`, email: `c${n}@ejemplo.com`, banned: false,
    storeId: `s${n}`, tier: "PRO", plan: "MONTHLY", pago: true, estado: "ACTIVE",
    trialEndsAt: dias(-30), currentPeriodEnd: dias(10), freeDesde: null,
    productos: 1, publicados: 1, ventasDelMes: 0, brutoDelMes: 0,
    comisionDelMes: 0, comisionTotal: 0,
    ...x,
  };
}

/* ── Lo fijo: qué cuenta como plata que entra ───────────────────────────── */

check("ADM-A",
  fijoMensual(cuenta({ tier: "STARTER", plan: "MONTHLY" })) === PRECIOS_DIGITALES.DIGITAL_STARTER.MONTHLY
  && fijoMensual(cuenta({ tier: "PRO", plan: "MONTHLY" })) === PRECIOS_DIGITALES.DIGITAL_PRO.MONTHLY,
  "una suscripción mensual al día suma su precio");

/* ⚠️ El anual dividido por doce. Sin esto, el mes en que alguien paga un año
   entero parece diez veces mejor que el anterior, y el número deja de servir
   justo para lo único que sirve: comparar un mes con otro. */
check("ADM-B",
  fijoMensual(cuenta({ tier: "PRO", plan: "ANNUAL" })) === Math.round(PRECIOS_DIGITALES.DIGITAL_PRO.ANNUAL / 12),
  "el plan anual entra mensualizado y no de golpe");

check("ADM-C", fijoMensual(cuenta({ tier: "FREE" })) === 0,
  "Free no suma: no paga nada");

/* Ni la prueba ni la gracia son plata que entró. La gracia es, literalmente,
   el mes que NO se cobró todavía. */
check("ADM-D",
  (["TRIAL", "GRACE", "EXPIRED", "CANCELLED"] as SubscriptionStatus[])
    .every((estado) => fijoMensual(cuenta({ estado })) === 0),
  "sólo suma lo que está al día: ni prueba, ni gracia, ni vencida");

/* ⚠️ EL QUE EVITA QUE EL PANEL SE INFLE SOLO. Un plan puesto a mano desde
   Usuarios —una cuenta nuestra, una regalada, una de prueba— queda ACTIVE
   igual que una que paga. Hoy mismo hay una Pro activa sin ningún pago
   registrado: sin este freno el panel decía que entran $89.000 que nadie pagó,
   y ese número se usa para decidir si el producto va o no va. */
check("ADM-E",
  fijoMensual(cuenta({ tier: "PRO", pago: false })) === 0
  && fijoMensual(cuenta({ tier: "PRO", pago: true })) > 0,
  "un plan regalado no cuenta como plata que entra");

/* ── El dominio de quien se cayó a Free ─────────────────────────────────── */

check("ADM-F",
  diasParaPerderElDominio({ tier: "FREE", freeDesde: dias(-10) }, AHORA) === DIAS_DE_DOMINIO_EN_FREE - 10,
  "el plazo del dominio se cuenta desde la caída, con el plazo del cron");

/* El que NACIÓ en Free no tiene fecha de caída y no está perdiendo nada:
   aparecer en esa lista sería inventarle un problema. */
check("ADM-G",
  diasParaPerderElDominio({ tier: "FREE", freeDesde: null }, AHORA) === null
  && diasParaPerderElDominio({ tier: "PRO", freeDesde: dias(-10) }, AHORA) === null,
  "el que nació Free, o el que volvió a un plan pago, no están en riesgo");

/* ── A quién hay que mirar ──────────────────────────────────────────────── */

const pruebaCerca = cuenta({ estado: "TRIAL", trialEndsAt: dias(2) });
const pruebaLejos = cuenta({ estado: "TRIAL", trialEndsAt: dias(20) });
const enGracia = cuenta({ estado: "GRACE" });
const vencida = cuenta({ estado: "EXPIRED" });
const cayo = cuenta({ tier: "FREE", estado: "ACTIVE", freeDesde: dias(-85) });
const lista = [pruebaLejos, cayo, vencida, pruebaCerca, enGracia];
const atencion = necesitanAtencion(lista, AHORA);

check("ADM-H",
  atencion.pruebaPorVencer.length === 1 && atencion.pruebaPorVencer[0]?.userId === pruebaCerca.userId,
  "la prueba que se termina esta semana aparece, y la que recién arrancó no");

check("ADM-I",
  atencion.enGracia.length === 1 && atencion.vencidas.length === 1
  && atencion.dominioEnRiesgo.length === 1 && atencion.dominioEnRiesgo[0]?.dias === DIAS_DE_DOMINIO_EN_FREE - 85,
  "gracia, vencidas y dominios en riesgo caen cada una en su lista, con su plazo");

/* ⚠️ El borde de los siete días, que es donde viven los errores de a uno. La
   que vence justo el séptimo día TIENE que aparecer: es el último día en que
   escribirle sirve de algo. */
/* (Una prueba ya vencida no llega hasta acá como prueba: `getSubscriptionStatus`
   la devuelve EXPIRED y cae en la lista de vencidas. Por eso el borde de
   arriba es el único que importa.) */
const enElBorde = necesitanAtencion([
  cuenta({ userId: "recien", estado: "TRIAL", trialEndsAt: dias(8) }),
  cuenta({ userId: "justo", estado: "TRIAL", trialEndsAt: dias(7) }),
  cuenta({ userId: "manana", estado: "TRIAL", trialEndsAt: dias(1) }),
], AHORA);
check("ADM-J",
  enElBorde.pruebaPorVencer.map((c) => c.userId).join() === "manana,justo",
  "la prueba que vence el séptimo día entra, la del octavo no, y primero la más urgente");

/* ── El orden de la tabla ───────────────────────────────────────────────── */

check("ADM-K",
  ordenarCuentas([
    cuenta({ userId: "poco", comisionDelMes: 10 }),
    cuenta({ userId: "mucho", comisionDelMes: 900 }),
    cuenta({ userId: "nada", comisionDelMes: 0, brutoDelMes: 500 }),
  ]).map((c) => c.userId).join() === "mucho,poco,nada",
  "arriba la cuenta que más comisión dejó este mes");

/* ── Lo que no se puede leer de una función ─────────────────────────────── */

const lib = leer("src/lib/admin-digitales.ts");
const pantalla = leer("src/app/admin/digitales/page.tsx");

/* ⚠️ La misma definición de venta cobrada que el panel de la dueña. Si acá
   contara los PENDING, o sumara los ítems en vez del total de la orden, dos
   pantallas de la misma plata dirían números distintos y no habría forma de
   saber cuál miente. */
check("ADM-L",
  /status: "CONFIRMED"/.test(lib) && !/PENDING/.test(lib) && /_sum: \{ total: true \}/.test(lib),
  "una venta cobrada es lo mismo acá que en el panel de la dueña");

/* ⚠️ Y la comisión sale de la tasa CONGELADA en cada orden, agrupada por esa
   tasa. Una tienda que cambió de plan tiene ventas al 8%, al 6% y al 2% en el
   mismo mes: sacando la comisión del total de la tienda, todas esas ventas se
   cobrarían al mismo porcentaje. */
check("ADM-M",
  /comisionCongelada\(/.test(lib) && /by: \["storeId", "lockedCommissionRate"\]/.test(lib),
  "la comisión se calcula con la tasa que quedó congelada en cada venta");

/* El estado vivo, no el crudo de la columna: una suscripción dice ACTIVE en la
   base hasta que pasa el cron, o sea hasta un día después de vencerse. */
check("ADM-N",
  /getSubscriptionStatus\(s, ahora\)/.test(lib) && !/by: \["tier", "status"\]/.test(lib),
  "el estado de cada cuenta es el vivo y no el que quedó escrito en la base");

/* Si algún día no entran todas, la pantalla lo dice. Mostrar de menos sin
   avisar es peor que no mostrar: los números parecen completos. */
check("ADM-O",
  /hayMas/.test(lib) && /foto\.hayMas &&/.test(pantalla),
  "si hay más cuentas de las que entran, la pantalla lo avisa");

/* Las regaladas se muestran aparte y siempre que haya alguna: es la única
   forma de que el "fijo del mes" no parezca más chico de lo esperado sin
   explicación. */
check("ADM-P",
  /foto\.regaladas > 0 &&/.test(pantalla) && /sin ningún pago registrado/.test(pantalla),
  "las cuentas regaladas se dicen, no se esconden");

/* ── Lo que la pantalla de Tiendas NO puede hacerle a una cuenta digital ── */

const tiendasPagina = leer("src/app/admin/tiendas/page.tsx");
const tiendasLista = leer("src/app/admin/tiendas/TiendasAdmin.tsx");
const tiendasRuta = leer("src/app/api/admin/tiendas/[id]/route.ts");

/* ⚠️ EL PEOR BOTÓN DE TODOS. Las cuentas de Productos Digitales tienen una fila
   en `Store` —ahí viven sus productos— pero sus páginas públicas exigen que esa
   tienda NO esté publicada: `/p/[id]`, `/pagar`, `/gracias` y `/legales` hacen
   `notFound()` si lo está. Publicarlas desde el listado de tiendas les apagaba
   la página de venta, el checkout y la pantalla de gracias al mismo tiempo, sin
   ningún error y sin que nadie se entere hasta que dejan de entrar ventas. */
check("ADM-Q",
  /owner\?\.role === "DIGITAL" && data\.isPublished === true/.test(tiendasRuta)
  && /status: 400/.test(tiendasRuta),
  "publicar la tienda de una cuenta digital se rechaza: le devolvería 404 en todas sus páginas");

/* Y el botón tampoco se ofrece: un botón que existe y falla es peor que uno que
   no está, porque el admin lo aprieta igual y se queda sin saber qué pasó. */
check("ADM-R",
  /\{s\.esDigital \? \(/.test(tiendasLista) && /Por producto/.test(tiendasLista),
  "en el listado, la columna de publicar de una cuenta digital no es un botón");

/* Resetear el diseño le vacía `storeConfig`, que en digitales guarda los
   píxeles de medición que leen su página de venta, su checkout y su pantalla de
   gracias: le apagaba el seguimiento de sus anuncios en silencio. */
check("ADM-S",
  /store\.owner\?\.role === "DIGITAL"/.test(tiendasRuta)
  && /Ver en Digitales/.test(tiendasLista),
  "resetear el diseño de una cuenta digital se rechaza, y en su lugar hay un link a su pantalla");

/* ⚠️ En digitales, cada bono y cada upsell es su propia fila de `Product`
   colgando del principal. Contando filas, una cuenta con un ebook y dos bonos
   figuraba con "3 productos" cuando tiene UNO — y ese número es el que se mira
   para saber si la cuenta se está usando. */
check("ADM-T",
  /rolDigital: "PRINCIPAL"/.test(tiendasPagina) && /principalesDe\.get\(s\.id\)/.test(tiendasPagina),
  "a una cuenta digital se le cuentan las páginas principales, no los bonos y upsells");

/* ⚠️ Y en la pantalla de Digitales, el segundo número es EL TOPE DEL PLAN.
   Cuando era "publicadas / cargadas", un "1 / 1" al lado de la chapita de Pro
   se leía como que Pro permite una sola página. */
check("ADM-U",
  /topeDe\(c\.tier, "PRINCIPAL"\)/.test(pantalla) && /publicadas · \{c\.productos\} cargada/.test(pantalla),
  "el segundo número de Páginas es el tope del plan, y lo cargado se dice aparte");

/* ⚠️ Cada tarjeta del resumen tiene que contar EXACTAMENTE lo que muestra su
   filtro. Las digitales salieron del filtro "Sin publicar" —para ellas eso no
   es un pendiente, es su estado correcto— y por un rato siguieron contadas en
   la tarjeta: el número decía una cosa y la lista que abría mostraba otra. */
check("ADM-V",
  /total:\s+initial\.filter\(s => !isDeletedStore\(s\) && !s\.esDigital\)/.test(tiendasLista)
  && /inactivas:\s+initial\.filter\(s => !isDeletedStore\(s\) && !s\.esDigital &&/.test(tiendasLista)
  && /digitales:\s+initial\.filter\(s => s\.esDigital/.test(tiendasLista)
  && /f=digitales/.test(tiendasLista),
  "los contadores de arriba cuentan lo mismo que abre cada filtro");

/* ⚠️ El botón "Activa" no le hacía NADA a una cuenta digital: `Store.isActive`
   no lo lee nadie en su camino —ni sus páginas, ni su panel, ni el cron—. Se
   apretaba, se guardaba la columna, y la cuenta seguía igual. Lo que sí dice
   si está andando es si está cerrada. */
check("ADM-W",
  /s\.cerradaEl \? "Cerrada" : "Abierta"/.test(tiendasLista)
  && /cerradaEl: s\.closedAt/.test(tiendasPagina),
  "a una cuenta digital no se le ofrece un botón que no hace nada: se le muestra si está abierta");

/* ⚠️ Una cuenta eliminada no es una cuenta. Al borrarla se le cambia el mail
   por uno terminado en `.invalid` —es la marca que usa todo el panel— pero la
   suscripción queda: sin filtrarla seguía contando como viva y, si había
   llegado a pagar, seguía sumando al fijo del mes para siempre. */
check("ADM-X",
  /email: \{ not: \{ endsWith: "\.invalid" \} \}/.test(lib),
  "las cuentas eliminadas no cuentan como cuentas ni como plata que entra");

/* El link de cada fila va con la búsqueda sola: el filtro de digitales deja
   afuera a las baneadas, así que la fila que uno toca para ir a ver un
   problema abría una lista vacía. */
check("ADM-Y",
  /admin\/usuarios\?q=\$\{encodeURIComponent/.test(pantalla)
  && !/f=digitales&q=/.test(pantalla),
  "desde Digitales se cae siempre en la persona, incluso si está baneada");

/* ⚠️ EL QUE EVITA QUE SE CAIGA LA PANTALLA ENTERA. La pantalla le pregunta a
   `topeDe` cuántas páginas permite el plan de cada cuenta, y `topeDe` lo busca
   en la tabla de topes: con un tier que ahí no está —una fila vieja, un dato
   escrito a mano— devuelve undefined y explota al leerle una propiedad. No se
   rompe esa fila: se cae la pantalla completa, con todas las demás cuentas
   adentro. Por eso el tier se normaliza antes de salir de la consulta. */
check("ADM-Z",
  /TIERS_DIGITALES\.includes\(s\.tier as TierDigital\) \? \(s\.tier as TierDigital\) : "FREE"/.test(lib),
  "un tier que ningún plan define se muestra como Free en vez de voltear la pantalla");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
