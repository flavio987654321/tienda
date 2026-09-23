/**
 * Chequeos de las rutas que mueven la plata de las suscripciones. Se corre
 * a mano con:
 *
 *   npx tsx src/lib/pagos-suscripcion.check.ts
 *
 * La cuenta del prorrateo ya la vigila `subscription.check.ts`, que la ejecuta
 * de verdad. Este archivo cuida otra cosa: los **frenos que viven adentro de las
 * rutas** y no se pueden importar sin arrastrar Prisma, Mercado Pago y la sesión.
 * Se leen como texto y se verifica que sigan ahí.
 *
 * Es un chequeo tosco a propósito. No prueba que funcionen: prueba que **no
 * desaparecieron**. Todos los agujeros que cubre tienen la misma forma —no
 * rompen nada, no tiran ningún error, y se descubren en la liquidación del mes
 * siguiente o el día que a alguien se le cierra la tienda sola.
 *
 * Los cuatro salieron de leer el camino del dinero antes de sumar el tercer
 * ecosistema (Productos Digitales). Ver ECOSISTEMA-DIGITALES.md, Fase 2.
 */

import { readFileSync } from "node:fs";
import { PLANES, planDe, ecosistemaDeRol, tierDelMismoEcosistema, planesDelEcosistema } from "./planLimits";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/**
 * El archivo sin sus comentarios.
 *
 * Hace falta porque varios de estos chequeos verifican que algo **no esté**, y
 * los comentarios de esas mismas rutas explican el error viejo citándolo textual
 * ("antes esto decía plan.startsWith..."). Sin sacarlos, el chequeo se dispara
 * con su propia documentación y obliga a elegir entre explicar bien o pasar la
 * prueba.
 *
 * Sólo se descartan las líneas que son comentario enteras. Las URLs con `//` en
 * el medio de una línea de código quedan intactas, que es lo que importa acá.
 */
function soloCodigo(fuente: string): string {
  return fuente
    .split("\n")
    .filter((linea) => {
      const t = linea.trim();
      return !(t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"));
    })
    .join("\n");
}

const preferencia = soloCodigo(readFileSync("src/app/api/suscripcion/preferencia/route.ts", "utf8"));
const webhook = soloCodigo(readFileSync("src/app/api/suscripcion/webhook/route.ts", "utf8"));
const cotizar = soloCodigo(readFileSync("src/app/api/suscripcion/cotizar/route.ts", "utf8"));
/* La cuarta puerta que escribe una suscripción, y la última en aparecer: el
   panel de admin. No cobra, pero escribe lo mismo que el webhook. */
const adminSub = soloCodigo(readFileSync("src/app/api/admin/suscripciones/[userId]/route.ts", "utf8"));
const adminPantalla = soloCodigo(readFileSync("src/app/admin/usuarios/UsuariosAdmin.tsx", "utf8"));

/* ── 1. El monto lo decide el servidor ─────────────────────────────────────── */
console.log("\n1) El importe nunca lo manda el navegador");

// Lo que se le cobra sale de `cotizarCambioDePlan`, que lee la base. Si algún día
// alguien toma un importe del cuerpo del pedido, se cobra lo que diga el cliente.
chequear("la preferencia cotiza contra la base y no lee un importe del pedido",
  /cotizarCambioDePlan\(subActual/.test(preferencia) &&
  !/(amount|precio|importe|monto)\s*[:=]\s*(body|req\.|datos)/i.test(preferencia));

// El webhook compara contra el esperado que fijó el servidor en metadata.
chequear("el webhook compara el monto cobrado contra el esperado",
  /expectedAmount/.test(webhook) && /transaction_amount\s*<\s*expectedAmt/.test(webhook));

/* ── 2. El plan sale del registro, no de mirar el texto de la clave ────────── */
console.log("\n2) El rol y el tier no se adivinan del nombre del plan");

// Este es el error que rompía en silencio: `plan.startsWith("OWNER")` mandaba
// cualquier plan digital a AFFILIATE, y el tier caía al del plan más chico. La
// persona pagaba el plan grande y recibía los topes del chico.
chequear("el webhook NO deduce el rol mirando el prefijo del plan",
  !/startsWith\(\s*["']OWNER["']\s*\)/.test(webhook));
chequear("el webhook toma rol y tier del registro de planes",
  /const safeRole = defPlan\.role/.test(webhook) &&
  /const safeTier = defPlan\.tier/.test(webhook));
chequear("la preferencia toma rol y tier del registro de planes",
  /const role = defPlan\.role/.test(preferencia) &&
  /const tier = defPlan\.tier/.test(preferencia));

/* ── 3. Los planes gratis no pueden llegar al cobro ────────────────────────── */
console.log("\n3) Un plan sin precio nunca se da por pagado");

// La ruta tiene una rama que activa la suscripción SIN pasar por Mercado Pago
// cuando el total da cero. Un plan gratis cotiza en cero, así que sin este freno
// entraría por ahí y quedaría activado.
chequear("la preferencia rechaza los planes sin precio",
  /if\s*\(!defPlan\.precios\)/.test(preferencia));
chequear("el webhook también exige que el plan tenga precio",
  /!defPlan\s*\|\|\s*!defPlan\.precios/.test(webhook));
chequear("sigue existiendo la rama de activación sin pago (por eso importa el freno)",
  /finalAmount === 0/.test(preferencia));

/* ── 4. El candado de ecosistema ───────────────────────────────────────────── */
console.log("\n4) Una suscripción no puede pisar a la de otro producto");

// `Subscription.userId` es único y las dos escrituras son un upsert por userId.
// Sin candado, una dueña de tienda que tocara un plan digital se quedaba sin la
// suscripción de su tienda, y el cron diario se la cerraba sola.
chequear("la preferencia corta si el plan cruza el borde de DIGITAL",
  /ecosistemaDeRol\(subActual\?\.role\)/.test(preferencia) &&
  /=== "DIGITAL" \|\| defPlan\.ecosistema === "DIGITAL"/.test(preferencia));

// Y va también en el webhook porque ES el que escribe: entre que se crea la
// preferencia y se acredita el pago, el estado de la cuenta puede cambiar.
chequear("el webhook vuelve a verificarlo antes de escribir",
  /ecosistemaDeRol\(subActual\?\.role\)/.test(webhook) &&
  /PAGO QUE CRUZA ECOSISTEMAS/.test(webhook));

/* ── 5. El registro se sostiene ────────────────────────────────────────────── */
console.log("\n5) El registro de planes no miente");

chequear("todo plan con precio tiene los dos ciclos y son positivos",
  Object.values(PLANES).every((p) =>
    p.precios === null ||
    (p.precios.MONTHLY > 0 && p.precios.ANNUAL > 0)));

chequear("el anual nunca sale más caro que doce meses sueltos",
  Object.values(PLANES).every((p) =>
    p.precios === null || p.precios.ANNUAL <= p.precios.MONTHLY * 12));

chequear("cada rol pertenece a un solo ecosistema",
  Object.values(PLANES).every((p) => ecosistemaDeRol(p.role) === p.ecosistema));

chequear("una clave inventada o del prototipo no devuelve un plan",
  ["__proto__", "constructor", "valueOf", "NO_EXISTE"].every((k) => planDe(k) === null));

/* ── 6. La cotización cubre todos los planes que se cobran ─────────────────── */
console.log("\n6) Ningún plan pago se queda sin precio en pantalla");

// El modal de pago busca su plan en lo que devuelve /cotizar. Si un plan pago no
// está en esa lista no encuentra su precio, muestra "no se pudo calcular" y deja
// el botón apagado: un plan que no se puede comprar, sin ningún error visible.
// Por eso la lista se deriva del registro en vez de escribirse a mano.
chequear("la cotización deriva sus combinaciones del registro",
  /Object\.entries\(PLANES\)/.test(cotizar) &&
  /def\.precios !== null/.test(cotizar) &&
  !/plan: "OWNER_BASIC"/.test(cotizar));

/* ── 7. Un producto cerrado no se cobra ────────────────────────────────────── */
console.log("\n7) Los planes de un producto que no está abierto no llegan al cobro");

// El interruptor de Productos Digitales no es sólo de dibujo. Sin este freno, con
// el producto apagado se podía pagar igual pegándole derecho a la ruta: la
// pantalla no ofrecía el botón, pero la ruta lo aceptaba. Se cobraba de verdad, y
// lo que se recibía era una pantalla que dice "el panel se está construyendo".
chequear("la preferencia rechaza un plan de un producto cerrado",
  /if \(planCerrado\(defPlan\)\)/.test(preferencia));
chequear("el webhook también lo rechaza antes de escribir",
  /if \(planCerrado\(defPlan\)\)/.test(webhook));
chequear("la cotización no publica los precios de un producto cerrado",
  /!planCerrado\(def\)/.test(cotizar));

/* ── 8. El panel de admin no muda cuentas de un producto a otro ────────────── */
console.log("\n8) Cambiar el plan a mano no puede convertir una cuenta en otra cosa");

/* ⚠️ ES LA MISMA PUERTA QUE LA DEL PAGO, CON OTRA LLAVE. Hay UNA suscripción
   por persona, así que escribirle el tier de otro ecosistema no le agrega nada:
   le reemplaza lo que tenía. El admin le tocaba el plan a una cuenta de
   Productos Digitales y la cuenta pasaba a ser una tienda —otro panel, sin su
   plan, y el cron tratándola con las reglas del otro producto—. La ruta de pago
   ya tenía este candado desde el día uno; ésta no, porque se escribió cuando el
   único producto con planes era la tienda. */
chequear("el tier sale del ecosistema de la cuenta y no de una lista escrita en la ruta",
  /tierDelMismoEcosistema\(sub, tier\)/.test(adminSub) &&
  !/tier === "BASIC" \|\| tier === "PREMIUM"/.test(adminSub) &&
  !/data\.role = "OWNER"/.test(adminSub));

/* Y falla cerrado: un tier que no es de este ecosistema corta con 400 en vez de
   guardarse igual o de ignorarse en silencio. */
chequear("un tier de otro ecosistema corta el pedido",
  /if \(!destino\)/.test(adminSub) && /status: 400/.test(adminSub));

/* La regla, ejecutada de verdad (lo de arriba es leer texto). */
const subTienda = { role: "OWNER" };
const subDigital = { role: "DIGITAL" };

chequear("una cuenta digital no acepta los tiers de tienda",
  tierDelMismoEcosistema(subDigital, "PREMIUM") === null &&
  tierDelMismoEcosistema(subDigital, "BASIC") === null);

chequear("una tienda no acepta los tiers de digitales",
  ["FREE", "STARTER", "PRO"].every((t) => tierDelMismoEcosistema(subTienda, t) === null));

chequear("cada una sí acepta los suyos, y devuelve el plan entero",
  tierDelMismoEcosistema(subTienda, "PREMIUM")?.label === "Tienda Premium" &&
  tierDelMismoEcosistema(subDigital, "PRO")?.ecosistema === "DIGITAL" &&
  tierDelMismoEcosistema(subDigital, "FREE")?.tier === "FREE");

chequear("un rol desconocido o una clave del prototipo no abren nada",
  tierDelMismoEcosistema({ role: "LO_QUE_SEA" }, "PREMIUM") === null &&
  tierDelMismoEcosistema(null, "PREMIUM") === null &&
  ["__proto__", "constructor", "valueOf"].every((t) => tierDelMismoEcosistema(subDigital, t) === null));

/* El orden de la escalera decide si el aviso dice "subiste" o "bajaste", y es
   el orden de la tabla. Si alguien reordena `PLANES`, un ascenso a Pro se le
   avisa a la persona como una bajada. */
chequear("los planes de cada ecosistema vienen del más chico al más grande",
  planesDelEcosistema("DIGITAL").map((p) => p.tier).join() === "FREE,STARTER,PRO" &&
  planesDelEcosistema("TIENDA").map((p) => p.tier).join() === "BASIC,PREMIUM");

/* Free digital no tiene período: es donde queda la cuenta cuando no paga. Sin
   `caidaAFree` acá, bajar a Free a mano dejaba la fecha de la caída en null y el
   cron nunca soltaba el dominio propio de esa cuenta. */
chequear("bajar a Free digital usa la misma caída que el cron",
  /destino\?\.ecosistema === "DIGITAL"/.test(adminSub) &&
  /Object\.assign\(data, caidaAFree\(\)\)/.test(adminSub) &&
  /data\.freeDesde = null/.test(adminSub));

/* Y la pantalla, que es de donde salen esos pedidos: los botones se dibujan con
   los planes del ecosistema de la cuenta. Escritos a mano, a una cuenta digital
   se le ofrecía "Tienda Premium" —y el botón de su fila no abría nada—. */
chequear("el panel dibuja los planes del ecosistema de la cuenta",
  /planesDelEcosistema\(eco\)/.test(adminPantalla) &&
  /ecoGestionable\(subModal\.subscription\)/.test(adminPantalla) &&
  !/label: "Tienda Premium", body/.test(adminPantalla));

chequear("la etiqueta del plan sale del registro y no de adivinar el tier",
  /planDeSuscripcion\(sub\)/.test(adminPantalla) &&
  !/tier === "PREMIUM" \? "Tienda Premium" : "Tienda Pro"/.test(adminPantalla) &&
  /DIGITAL: \{ label: "Digital"/.test(adminPantalla));

console.log(fallos === 0
  ? "\nok — los frenos de las rutas de pago siguen en su lugar"
  : `\nFALLA — ${fallos} chequeo(s) de las rutas de pago`);
process.exit(fallos === 0 ? 0 : 1);
