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
import { PLANES, planDe, ecosistemaDeRol } from "./planLimits";

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

console.log(fallos === 0
  ? "\nok — los frenos de las rutas de pago siguen en su lugar"
  : `\nFALLA — ${fallos} chequeo(s) de las rutas de pago`);
process.exit(fallos === 0 ? 0 : 1);
