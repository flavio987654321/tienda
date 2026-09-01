// Verificación ejecutable de la cuenta que decide CUÁNTA PLATA se le cobra a
// alguien que cambia de plan. No hay runner de tests en el repo, así que corre con:
//   npx tsx src/lib/subscription.check.ts
// Sale con código 1 si algún caso no da el número esperado.
//
// Esto se testea y no otras cosas porque es lo único acá que mueve dinero real:
// un error de un factor de 10 en el crédito regala una suscripción entera, y no
// se nota hasta que aparece en la facturación.

import {
  cotizarCambioDePlan, getSubscriptionStatus, PRICES,
  altaDigitalFree, altaDigitalConPrueba, caidaAFree, pruebaYaUsada,
} from "./subscription";
import { PLANES, PRECIOS_DIGITALES, planDe, planDeSuscripcion, planCerrado, DIGITALES_ABIERTO } from "./planLimits";

let failed = 0;
function check(id: string, ok: boolean, desc: string) {
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${id.padEnd(7)} ${desc}`);
}

const DIA = 86_400_000;
const HOY = new Date("2026-07-20T12:00:00Z");
const hace = (dias: number) => new Date(HOY.getTime() - dias * DIA);
const dentro = (dias: number) => new Date(HOY.getTime() + dias * DIA);

/** Una suscripción activa que arrancó hace `usados` días y dura `total`. */
function sub(
  /* Los tiers de los tres ecosistemas, no sólo los de tienda: PAGO-Ñ necesita
     armar una suscripción digital para probar que el guard corta en las dos
     direcciones. */
  tier: "BASIC" | "PREMIUM" | "FREE" | "STARTER" | "PRO",
  plan: "MONTHLY" | "ANNUAL",
  usados: number,
  total: number,
  /* El rol va como parámetro y no fijo en "OWNER" porque es lo que decide de qué
     producto es la suscripción, y eso es justo lo que hay que poder cruzar en
     los casos PAGO-N y PAGO-O de abajo. */
  role: string = "OWNER"
) {
  return {
    role,
    tier,
    plan,
    status: "ACTIVE",
    trialEndsAt: hace(usados + 1),
    currentPeriodStart: hace(usados),
    currentPeriodEnd: dentro(total - usados),
    gracePeriodEndsAt: dentro(total - usados + 4),
  };
}

const aPremiumMensual = { plan: "OWNER_PREMIUM", billing: "MONTHLY" } as const;
const aProAnual = { plan: "OWNER_BASIC", billing: "ANNUAL" } as const;
const aPremiumAnual = { plan: "OWNER_PREMIUM", billing: "ANNUAL" } as const;
const aProMensual = { plan: "OWNER_BASIC", billing: "MONTHLY" } as const;

// ── El caso que preguntó Flavio ────────────────────────────────────────────
{
  // Pagó $20.000 el día 1. El día 5 quiere Premium. Le quedan 25 de 30 días.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aPremiumMensual, HOY);
  check("PAGO-A", q.credito === 16667 && q.aPagar === 8333,
    `Pro mensual día 5 → Premium: descuenta $${q.credito} y cobra $${q.aPagar}`);
}
{
  // El desglose que se muestra en pantalla tiene que cerrar exacto, siempre.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aPremiumMensual, HOY);
  check("PAGO-B", q.precioLista - q.credito === q.aPagar,
    "precio de lista − descuento = total, sin diferencias de redondeo");
}

// ── El error que hubiera regalado plata ────────────────────────────────────
{
  // Un ANUAL con 300 días por delante. La cuenta vieja dividía por 30 fijo:
  // (300/30) × 25.000 = $250.000 de crédito → Premium anual gratis.
  const q = cotizarCambioDePlan(sub("BASIC", "ANNUAL", 65, 365), aPremiumAnual, HOY);
  check("PAGO-C", q.aPagar > 0 && q.credito < PRICES.OWNER_BASIC.ANNUAL,
    `anual con 300 días: cobra $${q.aPagar}, no lo regala`);
}
{
  // El crédito sale de lo que pagó, no del precio del plan al que va: un mes de
  // Pro cuesta $20.000 y no puede acreditar como si hubiera pagado Premium.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 0, 30), aPremiumMensual, HOY);
  check("PAGO-D", q.credito <= PRICES.OWNER_BASIC.MONTHLY,
    "el descuento nunca supera lo que la persona realmente pagó");
}

// ── Cuándo NO corresponde descontar ────────────────────────────────────────
{
  const enPrueba = { ...sub("BASIC", "MONTHLY", 2, 30), status: "TRIAL", trialEndsAt: dentro(5) };
  const q = cotizarCambioDePlan(enPrueba, aPremiumMensual, HOY);
  check("PAGO-E", q.credito === 0 && q.motivoSinCredito === "TRIAL",
    "en período de prueba no hay descuento: todavía no pagó nada");
}
{
  const vencida = { ...sub("BASIC", "MONTHLY", 40, 30), gracePeriodEndsAt: hace(6) };
  const q = cotizarCambioDePlan(vencida, aPremiumMensual, HOY);
  check("PAGO-F", q.credito === 0 && q.aPagar === PRICES.OWNER_PREMIUM.MONTHLY,
    "una suscripción vencida no acredita: ese período ya se consumió");
}
{
  // Renovar lo mismo extiende, no cambia. Sin esto se podría renovar todos los
  // días acreditando el período entero cada vez.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aProMensual, HOY);
  check("PAGO-G", q.credito === 0 && q.motivoSinCredito === "MISMA_SUSCRIPCION",
    "renovar el mismo plan no descuenta nada");
}
{
  const q = cotizarCambioDePlan(null, aPremiumMensual, HOY);
  check("PAGO-H", q.aPagar === PRICES.OWNER_PREMIUM.MONTHLY && q.credito === 0,
    "sin suscripción se cobra el precio de lista");
}
{
  // Datos incompletos: se falla cerrado, cobrando de más y no de menos.
  const rota = { ...sub("BASIC", "MONTHLY", 5, 30), currentPeriodStart: null };
  const q = cotizarCambioDePlan(rota, aPremiumMensual, HOY);
  check("PAGO-I", q.credito === 0,
    "sin fecha de inicio no se inventa un descuento");
}

// ── Bordes ────────────────────────────────────────────────────────────────
{
  // Último día: casi no queda nada sin usar.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 30, 30), aPremiumMensual, HOY);
  check("PAGO-J", q.credito === 0 && q.aPagar === PRICES.OWNER_PREMIUM.MONTHLY,
    "el último día del período no queda nada para descontar");
}
{
  // Bajar de plan puede dar más crédito que el precio nuevo: eso es un período
  // sin cargo, nunca un total negativo ni una devolución.
  const q = cotizarCambioDePlan(sub("PREMIUM", "MONTHLY", 1, 30), aProMensual, HOY);
  check("PAGO-K", q.aPagar === 0 && q.credito === PRICES.OWNER_BASIC.MONTHLY,
    "al bajar de plan el total queda en cero, nunca en negativo");
}
{
  // El otro cambio que ya estaba roto en producción: mensual → anual.
  const q = cotizarCambioDePlan(sub("BASIC", "MONTHLY", 5, 30), aProAnual, HOY);
  check("PAGO-L", q.credito === 16667 && q.aPagar === PRICES.OWNER_BASIC.ANNUAL - 16667,
    `Pro mensual → Pro anual: cobra $${q.aPagar}`);
}
{
  // Todas las combinaciones: nunca negativo, nunca más caro que la lista.
  const combos = [aProMensual, aProAnual, aPremiumMensual, aPremiumAnual];
  const subs = [
    sub("BASIC", "MONTHLY", 5, 30), sub("BASIC", "ANNUAL", 100, 365),
    sub("PREMIUM", "MONTHLY", 15, 30), sub("PREMIUM", "ANNUAL", 200, 365),
  ];
  const malos = subs.flatMap((s) =>
    combos.map((c) => cotizarCambioDePlan(s, c, HOY))
  ).filter((q) => q.aPagar < 0 || q.aPagar > q.precioLista || q.credito < 0);
  check("PAGO-M", malos.length === 0,
    "en las 16 combinaciones el total siempre queda entre cero y el precio de lista");
}

// ── El reloj: una sola fecha para toda la cuenta ────────────────────────────
//
// Todo este archivo congela el tiempo en HOY para que las cuentas den siempre
// igual. Eso sólo sirve si TODAS las funciones respetan la fecha que se les pasa.
//
// `getSubscriptionStatus` no lo hacía: preguntaba el reloj por su cuenta. O sea
// que `cotizarCambioDePlan` resolvía el estado en el día de hoy de verdad y el
// crédito en HOY. En producción las dos fechas son la misma y no se veía, pero
// PAGO-E empezó a fallar solo el día que su trial inventado venció en la vida
// real — y un test que falla siempre enseña a ignorar el rojo.
{
  // Un trial que sigue vivo en HOY pero que hace rato venció en el mundo real.
  const trialViejo = {
    status: "TRIAL",
    trialEndsAt: dentro(3),
    currentPeriodEnd: null,
    gracePeriodEndsAt: null,
  };

  check("RELOJ-A", getSubscriptionStatus(trialViejo, HOY) === "TRIAL",
    "con la fecha puesta, un trial vigente en esa fecha da TRIAL");

  // Sin el parámetro tiene que seguir usando el reloj real, que es de lo que
  // dependen los 15 lugares que la llaman con un solo argumento.
  check("RELOJ-B", getSubscriptionStatus(trialViejo) === "EXPIRED",
    "sin fecha usa la hora real: ese mismo trial ya venció");

  // El que importa: las dos mitades de la cuenta mirando el mismo momento.
  const q = cotizarCambioDePlan(
    { ...sub("BASIC", "MONTHLY", 2, 30), status: "TRIAL", trialEndsAt: dentro(5) },
    aPremiumMensual,
    HOY
  );
  check("RELOJ-C", q.motivoSinCredito === "TRIAL",
    "cotizarCambioDePlan resuelve el estado con la fecha que recibe, no con hoy");

  // Y que el congelado sirva de verdad: con una fecha bien en el futuro, el mismo
  // trial tiene que estar vencido. Si `now` se ignorara, esto daría TRIAL.
  check("RELOJ-D", getSubscriptionStatus(trialViejo, dentro(400)) === "EXPIRED",
    "con una fecha futura, el mismo trial da vencido");
}

// ── El crédito no cruza productos ──────────────────────────────────────────
//
// Los tres casos de acá abajo cubren el agujero más caro que apareció al sumar
// el tercer ecosistema, y ninguno se ve usando la aplicación: se ven recién en
// la liquidación del mes siguiente.
//
// El crédito por días no usados salía del tier a secas: `tier === "PREMIUM"`
// daba el precio de Tienda Premium y CUALQUIER OTRA COSA daba el de Tienda Pro.
// O sea que una suscripción digital de plan Starter acreditaba $20.000 —el
// precio de Tienda Pro— que esa persona nunca pagó.
//
// Y encima la ruta de pago tiene una rama que activa la suscripción SIN pasar
// por Mercado Pago cuando el total da cero. Las dos cosas juntas son un camino
// para llevarse un plan pago de arriba: con un anual de tienda por delante, el
// crédito tapaba el precio del plan digital y la suscripción se activaba sola.
{
  // Anual de Tienda Premium con 300 días por delante — el crédito más grande
  // que puede existir— pedido contra un plan digital.
  const tienda = sub("PREMIUM", "ANNUAL", 65, 365);
  const q = cotizarCambioDePlan(tienda, { plan: "DIGITAL_PRO", billing: "MONTHLY" }, HOY);
  check("PAGO-N",
    q.credito === 0 &&
    q.aPagar === PRECIOS_DIGITALES.DIGITAL_PRO.MONTHLY &&
    q.motivoSinCredito === "OTRO_ECOSISTEMA",
    "una suscripción de tienda NO acredita nada contra un plan digital");
}
{
  // Y al revés, que el guard no esté puesto en una sola dirección.
  const digital = sub("PRO", "ANNUAL", 65, 365, "DIGITAL");
  const q = cotizarCambioDePlan(digital, aPremiumMensual, HOY);
  check("PAGO-Ñ",
    q.credito === 0 && q.aPagar === PRICES.OWNER_PREMIUM.MONTHLY,
    "una suscripción digital NO acredita nada contra un plan de tienda");
}
{
  // Un plan que no se cobra nunca no se cotiza. Lo que importa acá no es el cero
  // sino el motivo: es la señal de la que se agarra la ruta de pago para
  // rechazarlo antes de crear una preferencia en Mercado Pago.
  const q = cotizarCambioDePlan(null, { plan: "DIGITAL_FREE", billing: "MONTHLY" }, HOY);
  check("PAGO-O", q.motivoSinCredito === "PLAN_SIN_PRECIO",
    "un plan gratis no se cotiza y se puede distinguir del resto");
}

// ── El registro de planes se sostiene solo ─────────────────────────────────
{
  // Rol + tier tiene que identificar UN plan y no dos. Si dos filas comparten el
  // par, `planDeSuscripcion` devuelve la primera que encuentra y el crédito sale
  // del plan equivocado — que es exactamente el error que esta tabla vino a
  // cerrar, reaparecido por otra puerta.
  const pares = Object.values(PLANES).map((p) => `${p.role}|${p.tier}`);
  check("PLAN-A", new Set(pares).size === pares.length,
    "cada combinación de rol y tier identifica un solo plan");
}
{
  // La vuelta completa: de un plan a una suscripción y de vuelta al plan.
  const malos = (Object.keys(PLANES) as (keyof typeof PLANES)[]).filter(
    (key) => planDeSuscripcion({ role: PLANES[key].role, tier: PLANES[key].tier }) !== key
  );
  check("PLAN-B", malos.length === 0,
    "toda suscripción guardada se puede volver a mapear a su plan");
}
{
  // Una clave que no existe tiene que dar null, no un objeto heredado del
  // prototipo. `plan` llega del navegador: sin el hasOwnProperty, mandar
  // "constructor" devolvía una función y la validación creía que el plan existe.
  const sucias = ["__proto__", "constructor", "toString", "PLAN_QUE_NO_EXISTE", ""];
  check("PLAN-C", sucias.every((k) => planDe(k) === null),
    "una clave de plan inventada o heredada del prototipo devuelve null");
}


// ── El ciclo de vida de Productos Digitales ────────────────────────────────
//
// La regla que cambia todo: el Free no se cobra, así que no puede vencer. Sin
// eso, una cuenta gratis nacía y quedaba EXPIRED en el acto —`getSubscriptionStatus`
// falla cerrado ante un ACTIVE sin `currentPeriodEnd`, que es exactamente la
// forma de una suscripción que no se renueva nunca.
//
// Y el otro lado, más importante todavía: eso NO puede aflojarle el vencimiento
// a las tiendas. VIDA-B y VIDA-C están para eso.
{
  const free = { ...altaDigitalFree(HOY), createdAt: HOY };

  check("VIDA-A", getSubscriptionStatus(free, dentro(3650)) === "ACTIVE",
    "el Free digital sigue activo diez años después: no se cobra, no vence");

  check("VIDA-B", planDeSuscripcion(free) === "DIGITAL_FREE",
    "una cuenta digital recién creada se identifica como el plan Free");

  // Los mismos datos, sin role ni tier: es lo que ve un llamador con un `select`
  // recortado, y tiene que comportarse igual que antes de todo esto.
  const sinRol = { status: "ACTIVE", trialEndsAt: HOY, currentPeriodEnd: null, gracePeriodEndsAt: null };
  check("VIDA-C", getSubscriptionStatus(sinRol, dentro(1)) === "EXPIRED",
    "sin rol ni tier se falla cerrado: un ACTIVE sin vencimiento sigue dando vencido");

  // Y una tienda con esa misma forma tampoco se salva: su plan sí se cobra.
  const tiendaSinFecha = { role: "OWNER", tier: "BASIC", status: "ACTIVE", trialEndsAt: HOY, currentPeriodEnd: null, gracePeriodEndsAt: null };
  check("VIDA-D", getSubscriptionStatus(tiendaSinFecha, dentro(1)) === "EXPIRED",
    "un plan de tienda sin vencimiento sigue dando vencido: la excepción es sólo para lo que no se cobra");
}
{
  // La prueba de 7 días vencida es lo que el cron busca para devolverla a Free.
  const probando = {
    role: "DIGITAL", tier: "PRO", status: "TRIAL",
    trialEndsAt: dentro(7), currentPeriodEnd: null, gracePeriodEndsAt: null,
  };
  check("VIDA-E",
    getSubscriptionStatus(probando, HOY) === "TRIAL" &&
    getSubscriptionStatus(probando, dentro(8)) === "EXPIRED",
    "la prueba de un plan digital vence como cualquier otra");
}
{
  // Caer a Free no borra nada y, sobre todo, no reinicia la prueba: reiniciarla
  // sería regalar siete días de Starter en cada caída, para siempre.
  const antes = {
    ...altaDigitalFree(HOY),
    tier: "PRO", status: "ACTIVE",
    trialEndsAt: dentro(7),
    currentPeriodEnd: dentro(30),
  };
  const despues = { ...antes, ...caidaAFree() };

  check("VIDA-F",
    despues.tier === "FREE" && despues.status === "ACTIVE" && despues.currentPeriodEnd === null,
    "caer a Free deja la cuenta viva, sin plan pago y sin vencimiento");

  check("VIDA-G", despues.trialEndsAt === antes.trialEndsAt,
    "caer a Free NO reinicia la prueba de 7 días");

  check("VIDA-H", getSubscriptionStatus(despues, dentro(3650)) === "ACTIVE",
    "y la cuenta caída a Free tampoco vence después");
}
{
  // La prueba se toma una sola vez, y lo que lo recuerda es la distancia entre
  // el alta y `trialEndsAt`. Sin columna nueva.
  const reciente = { ...altaDigitalFree(HOY), createdAt: HOY };
  check("VIDA-I", pruebaYaUsada(reciente) === false,
    "una cuenta recién creada todavía tiene su prueba disponible");

  const yaProbo = { ...reciente, trialEndsAt: dentro(7) };
  check("VIDA-J", pruebaYaUsada(yaProbo) === true,
    "arrancar la prueba queda registrado, así no se puede tomar dos veces");

  // El margen de un minuto existe por las milésimas entre nuestro reloj y el de
  // la base. Un segundo de diferencia no puede leerse como una prueba usada.
  const porMilesimas = { ...reciente, trialEndsAt: new Date(HOY.getTime() + 1000) };
  check("VIDA-K", pruebaYaUsada(porMilesimas) === false,
    "un segundo de diferencia entre relojes no cuenta como prueba usada");
}

{
  /* El alta eligiendo un plan pago. Lo único que importa acá es que NO quede
     activa: el tier lo elige la persona en el navegador y viaja en el pedido, así
     que si esto pudiera dar ACTIVE, cualquiera pediría Pro y se llevaría el plan
     más caro sin pagar. */
  const conPrueba = altaDigitalConPrueba("PRO", "MONTHLY", HOY);

  check("VIDA-L", conPrueba.status === "TRIAL",
    "elegir un plan pago en el alta arranca una PRUEBA, nunca una suscripción activa");

  check("VIDA-M", conPrueba.currentPeriodEnd === null && conPrueba.currentPeriodStart === null,
    "y no inventa un período pago: no se cobró nada");

  check("VIDA-N",
    getSubscriptionStatus(conPrueba, dentro(3)) === "TRIAL" &&
    getSubscriptionStatus(conPrueba, dentro(8)) === "EXPIRED",
    "la prueba vale 7 días y después queda vencida, que es lo que el cron busca");

  check("VIDA-Ñ", pruebaYaUsada({ ...conPrueba, createdAt: HOY }) === true,
    "la prueba queda gastada desde el alta: no se puede volver a pedir desde adentro");

  // Y al vencer cae a Free como cualquier otra, sin perder la marca de usada.
  const caida = { ...conPrueba, ...caidaAFree() };
  // El ciclo elegido se guarda: quien vino con "Anual" desde precios no pierde
  // el descuento en el camino al formulario.
  check("VIDA-P",
    altaDigitalConPrueba("STARTER", "ANNUAL", HOY).plan === "ANNUAL" &&
    altaDigitalConPrueba("STARTER", "MONTHLY", HOY).plan === "MONTHLY",
    "la prueba se queda con el ciclo de facturación que se eligió");

  check("VIDA-O",
    caida.tier === "FREE" && caida.status === "ACTIVE" &&
    pruebaYaUsada({ ...caida, createdAt: HOY }) === true,
    "al vencer vuelve a Free y la prueba sigue contando como usada");
}

{
  /* La excepción de "no vence" tiene que valer SÓLO para Productos Digitales.
     Afiliado también figura sin precio en el registro, así que una regla escrita
     como "todo plan sin precio no vence" le cambiaba el comportamiento de
     callado: una suscripción de afiliado vencida pasaba a estar activa para
     siempre. Hoy el alta de afiliado no crea suscripción, pero las viejas y las
     que carga el admin existen igual. */
  const afiliadoVencido = {
    role: "AFFILIATE", tier: "BASIC", status: "ACTIVE",
    trialEndsAt: hace(90), currentPeriodEnd: hace(60), gracePeriodEndsAt: hace(56),
  };
  check("VIDA-Q", getSubscriptionStatus(afiliadoVencido, HOY) === "EXPIRED",
    "una suscripción de afiliado vencida sigue vencida: la excepción es sólo de digitales");

  const afiliadoSinFecha = {
    role: "AFFILIATE", tier: "BASIC", status: "ACTIVE",
    trialEndsAt: hace(90), currentPeriodEnd: null, gracePeriodEndsAt: null,
  };
  check("VIDA-R", getSubscriptionStatus(afiliadoSinFecha, HOY) === "EXPIRED",
    "y una sin fecha de vencimiento también, igual que antes de todo esto");
}
{
  /* El interruptor no es sólo de dibujo: decide si los planes se pueden cobrar.
     Con el producto apagado, sus planes no tienen que llegar nunca al cobro. */
  const cerrados = (Object.keys(PLANES) as (keyof typeof PLANES)[])
    .filter((k) => planCerrado(PLANES[k]));
  const digitalesPagos = (Object.keys(PLANES) as (keyof typeof PLANES)[])
    .filter((k) => PLANES[k].ecosistema === "DIGITAL" && PLANES[k].precios !== null);

  check("PLAN-D",
    DIGITALES_ABIERTO ? cerrados.length === 0 : digitalesPagos.every((k) => cerrados.includes(k)),
    DIGITALES_ABIERTO
      ? "con el producto abierto, ningún plan queda cerrado"
      : "con el producto apagado, sus planes pagos no se pueden cobrar");

  check("PLAN-E",
    (Object.keys(PLANES) as (keyof typeof PLANES)[])
      .filter((k) => PLANES[k].ecosistema !== "DIGITAL")
      .every((k) => !planCerrado(PLANES[k])),
    "el interruptor no toca a los planes de los otros productos");
}

console.log(failed === 0 ? "\n✅ La cuenta da bien en todos los casos." : `\n❌ ${failed} caso(s) fallan.`);
process.exit(failed === 0 ? 0 : 1);
