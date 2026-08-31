import { prisma } from "@/lib/prisma";
import { PRICES, PLANES, planDe, planDeSuscripcion, type PlanKey } from "@/lib/planLimits";

// Los precios se mudaron a planLimits (este archivo importa Prisma y las pantallas
// del navegador los necesitan). Se re-exportan para no romper a quien ya los pedía
// de acá, que es el lugar natural para buscarlos.
export { PRICES };

// Compatibilidad con código existente que usa PRICES["OWNER"] o PRICES["AFFILIATE"]
export function getPriceForRole(role: string, tier: string, billing: "MONTHLY" | "ANNUAL"): number {
  if (role === "OWNER") {
    const key = tier === "PREMIUM" ? "OWNER_PREMIUM" : "OWNER_BASIC";
    return PRICES[key][billing];
  }
  return PRICES.AFFILIATE[billing];
}

export const TRIAL_DAYS = 7;
/** Días con el panel accesible después de vencer. No es lo mismo que el cierre. */
export const GRACE_DAYS = 4;
export const MONTHLY_DAYS = 30;
export const ANNUAL_DAYS = 365;

// Días desde el vencimiento hasta que la tienda se cierra sola. Es una etapa
// posterior a GRACE_DAYS: primero se bloquea el panel (gracia) y la tienda sigue
// online, y recién después se cierra. Mismo esquema que Tiendanube, que da 2+8=10
// días a las tiendas nuevas y 10+10=20 a las que ya venían pagando.
//
// La diferencia es deliberada: quien viene pagando se ganó el beneficio de la
// duda; quien salió del trial sin pagar nunca, no.
export const TRIAL_CLOSURE_DAYS = 10;
export const PAID_CLOSURE_DAYS = 20;
/** Días antes del cierre en que se manda el último aviso. */
export const CLOSURE_WARNING_DAYS = 2;

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";

/**
 * Fechas del período de una suscripción activa, derivadas de su facturación.
 *
 * `plan` y `currentPeriodEnd` son dos mitades del mismo dato: todo lo que active
 * una suscripción (webhook de MP, alta con cupón 100% off, panel de admin) tiene
 * que sacarlas de acá. Cuando el admin escribía `plan` sin la fecha quedaban
 * estados que un pago real no puede producir —ANNUAL venciendo mañana, o ACTIVE
 * sin vencimiento, que no expiraba nunca.
 */
export function periodFor(plan: string, from: Date = new Date()) {
  const days = plan === "ANNUAL" ? ANNUAL_DAYS : MONTHLY_DAYS;
  const currentPeriodEnd = new Date(from.getTime() + days * 86400000);
  return {
    currentPeriodStart: from,
    currentPeriodEnd,
    gracePeriodEndsAt: new Date(currentPeriodEnd.getTime() + GRACE_DAYS * 86400000),
    // Un período nuevo borra los avisos del anterior: si renovó, los "se te venció"
    // y "tu tienda cierra en 2 días" que ya recibió no aplican más, y cuando le
    // vuelva a vencer tiene que recibirlos de nuevo. Va acá y no en cada llamador
    // por lo mismo de siempre: son parte del mismo dato y separarlos los
    // desincroniza.
    expiredNotifiedAt: null,
    closingNotifiedAt: null,
    // Un período nuevo es una suscripción viva: quien pagó de nuevo después de
    // haber cerrado su tienda no arrastra el "no renovar" del período anterior.
    cancelAtPeriodEnd: false,
  };
}

/**
 * `now` es opcional y por defecto es la hora real, así que ningún llamador
 * cambia de comportamiento por existir este parámetro.
 *
 * Está para que quien ya recibe una fecha se la pueda pasar. Antes esta función
 * la ignoraba y preguntaba el reloj por su cuenta, o sea que `cotizarCambioDePlan`
 * calculaba media cuenta en la fecha que le pasaron y la otra mitad en la de hoy.
 * En producción las dos son la misma y no se notaba, pero hacía imposible testear
 * cualquier cosa que dependa del tiempo: el chequeo PAGO-E armaba un trial que
 * vencía 5 días después de su fecha fija y empezó a fallar solo el día que esa
 * fecha quedó en el pasado de verdad.
 */
export function getSubscriptionStatus(sub: {
  status: string;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
  /* Opcionales porque hay llamadores que traen la suscripción con un `select`
     recortado. Sin ellos el comportamiento es exactamente el de antes: sólo
     habilitan la pregunta de si el plan se cobra. Ver `planVence`. */
  role?: string | null;
  tier?: string | null;
}, now: Date = new Date()): SubscriptionStatus {

  // CANCELLED es un estado terminal y acá no se interpreta: quien cierra su
  // tienda conservando días pagos vuelve a ACTIVE en /api/tienda/reactivar, o
  // sea que la base dice la verdad y esta función no tiene que adivinarla.
  if (sub.status === "CANCELLED") return "CANCELLED";

  /* Un plan que no se cobra no puede vencer por falta de pago. Es el Free de
     Productos Digitales: no tiene `currentPeriodEnd` porque no se renueva nunca,
     y sin esta rama la lógica de abajo lo daba por EXPIRED al instante.

     Los planes de tienda no pasan por acá: todos tienen precio. Y un llamador
     que no trae `role`/`tier` tampoco, porque `planVence` falla cerrado. */
  if (!planVence(sub)) return "ACTIVE";

  if (sub.status === "TRIAL") {
    return now <= sub.trialEndsAt ? "TRIAL" : "EXPIRED";
  }
  if (sub.status === "ACTIVE") {
    // Una suscripción ACTIVE sin vencimiento no la puede producir ningún pago.
    // Antes esta rama pedía `&& sub.currentPeriodEnd`, así que esos casos caían
    // al `return sub.status` de abajo y quedaban ACTIVE para siempre: no
    // expiraban nunca y el banner del dashboard mostraba "vence en menos de
    // 24 hs" de forma permanente (usa `currentPeriodEnd ?? trialEndsAt`).
    // Se falla cerrado: sin fecha, vencida.
    if (!sub.currentPeriodEnd) return "EXPIRED";
    if (now <= sub.currentPeriodEnd) return "ACTIVE";
    const graceEnd = sub.gracePeriodEndsAt ?? new Date(sub.currentPeriodEnd.getTime() + GRACE_DAYS * 86400000);
    return now <= graceEnd ? "GRACE" : "EXPIRED";
  }
  return sub.status as SubscriptionStatus;
}

export function isSubscriptionActive(sub: Parameters<typeof getSubscriptionStatus>[0]): boolean {
  const status = getSubscriptionStatus(sub);
  return status === "TRIAL" || status === "ACTIVE" || status === "GRACE";
}

/**
 * Los campos mínimos para saber si un plan está vigente. Va como constante para
 * que ningún llamador se olvide uno: con `select: { tier: true }` la función de
 * abajo no puede hacer su trabajo, y TypeScript lo avisa recién si el tipo coincide.
 */
export const SUB_STATUS_SELECT = {
  role: true,
  tier: true,
  status: true,
  trialEndsAt: true,
  currentPeriodEnd: true,
  gracePeriodEndsAt: true,
} as const;

/**
 * Premium DE VERDAD: el plan es Premium y además está al día.
 *
 * Los topes de cupones, promociones y afiliados miraban solo `tier`, así que un
 * Premium vencido se quedaba con el ilimitado para siempre. El panel se le
 * bloquea, pero las APIs no: seguían respondiendo sin tope.
 *
 * Vive acá y no en planLimits a propósito: planLimits lo importan pantallas del
 * cliente ("Mi plan", la página de precios) y este archivo importa Prisma, así
 * que meterlo allá arrastraría el cliente de base de datos al navegador.
 *
 * Incluye TRIAL y GRACE, igual que isSubscriptionActive: quien está probando
 * Premium tiene que ver Premium, y a quien se le venció ayer no se le rompe la
 * tienda en el acto.
 */
export function hasActivePremium(
  sub: (Parameters<typeof getSubscriptionStatus>[0] & { tier: string }) | null
): boolean {
  if (!sub || sub.tier !== "PREMIUM") return false;
  return isSubscriptionActive(sub);
}

/**
 * Cuándo se cierra sola la tienda por falta de pago, o `null` si no corresponde
 * (la suscripción está viva).
 *
 * El reloj arranca en el vencimiento real, no en el día que el cron la mira: si
 * el cron no corrió una semana, la fecha de cierre no se corre una semana.
 *
 * `currentPeriodEnd` distingue los dos casos sin necesidad de un campo nuevo:
 * existe solo si alguna vez tuvo un período de verdad (pagado o regalado por el
 * admin). Si es null, nunca pasó del trial.
 */
export function closureDeadline(sub: Parameters<typeof getSubscriptionStatus>[0]): Date | null {
  const status = getSubscriptionStatus(sub);
  if (status !== "GRACE" && status !== "EXPIRED") return null;

  const expiredAt = sub.currentPeriodEnd ?? sub.trialEndsAt;
  const days = sub.currentPeriodEnd ? PAID_CLOSURE_DAYS : TRIAL_CLOSURE_DAYS;
  return new Date(expiredAt.getTime() + days * 86400000);
}


/* ══════════════════════════════════════════════════════════════════════════
   EL CICLO DE VIDA DE PRODUCTOS DIGITALES

   Es distinto del de las tiendas y conviene tenerlo claro antes de leer el
   código, porque la diferencia no es un detalle:

     TIENDA    trial de 7 días → si no paga, se le CIERRA la tienda.
     DIGITAL   entra en Free → si no paga, VUELVE A FREE. No cierra nada.

   El motivo es que el Free es para siempre y lo paga la comisión por venta: no
   hay ninguna deuda que cobrar, así que no hay nada que cerrar. Quien deja de
   pagar Starter o Pro no pierde su cuenta, ni sus productos, ni sus ventas —
   sube la comisión y se apagan las funciones pagas.

   Los 7 días de prueba siguen existiendo, pero cambian de lugar: no son la
   puerta de entrada, son la prueba de Starter o Pro DESDE ADENTRO.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ¿Este plan puede vencer por falta de pago?
 *
 * Un plan que no se cobra, no. Suena obvio y sin embargo sin esta pregunta el
 * Free quedaba EXPIRED al día siguiente de crearse: `getSubscriptionStatus`
 * falla cerrado ante un ACTIVE sin `currentPeriodEnd`, que es exactamente la
 * forma que tiene una suscripción gratuita —no tiene período porque no se
 * renueva nunca.
 *
 * Se pregunta por el precio y no por el nombre del plan a propósito: la regla
 * real es "no se cobra", no "se llama Free".
 */
export function planVence(sub: { role?: string | null; tier?: string | null }): boolean {
  if (!sub.role || !sub.tier) return true; // sin datos, se asume que vence: falla cerrado
  const plan = planDeSuscripcion({ role: sub.role, tier: sub.tier });
  if (!plan) return true;
  return PLANES[plan].precios !== null;
}

/**
 * Si la prueba de 7 días ya se usó.
 *
 * No hay una columna que lo diga y no se agrega una: `trialEndsAt` ya lo cuenta.
 * Una cuenta digital nace con `trialEndsAt` en el mismo momento que
 * `createdAt` —o sea, con la prueba en cero— y empezar la prueba la empuja siete
 * días hacia adelante. Si la fecha quedó muy por delante del alta, la prueba se
 * usó; si no, sigue disponible.
 *
 * El minuto de margen es por las milésimas entre el `new Date()` nuestro y el
 * `now()` de la base. La distancia real que separa los dos casos es de siete
 * días, así que el margen puede ser generoso sin arriesgar nada.
 *
 * 🔲 DECISIÓN ABIERTA: hoy la prueba se toma **una sola vez**. Es el lado seguro
 * para equivocarse —una prueba repetible es Starter gratis para siempre, de a
 * siete días— y si se quiere abrir, se abre acá y en ningún otro lado.
 */
export function pruebaYaUsada(sub: { trialEndsAt: Date; createdAt: Date }): boolean {
  return sub.trialEndsAt.getTime() > sub.createdAt.getTime() + 60000;
}

/**
 * Los campos de una cuenta digital recién creada: Free, sin tarjeta y sin
 * vencimiento.
 *
 * `plan: "MONTHLY"` no significa que se le cobre por mes: la columna es
 * obligatoria y sólo describe el ciclo de facturación cuando hay algo que
 * facturar. `currentPeriodEnd` en null es lo que la hace para siempre.
 */
export function altaDigitalFree(now: Date = new Date()) {
  return {
    role: "DIGITAL",
    tier: "FREE",
    plan: "MONTHLY",
    status: "ACTIVE",
    // La prueba nace sin usar: misma fecha que el alta. Ver `pruebaYaUsada`.
    trialEndsAt: now,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    gracePeriodEndsAt: null,
  } as const;
}

/**
 * Los campos que devuelven una cuenta digital a Free.
 *
 * Se usa cuando se termina la prueba sin pagar y cuando se vence un plan pago
 * después de su gracia. **No borra nada**: ni la cuenta, ni los productos, ni
 * las ventas. Sube la comisión y apaga las funciones pagas, y eso es todo.
 *
 * `trialEndsAt` no se toca a propósito: es lo que recuerda que la prueba ya se
 * usó, y reiniciarlo la regalaría de nuevo en cada caída.
 */
export function caidaAFree() {
  return {
    tier: "FREE",
    status: "ACTIVE",
    currentPeriodStart: null,
    currentPeriodEnd: null,
    gracePeriodEndsAt: null,
    // Los avisos eran de la suscripción que se venció. La próxima vez que pague
    // y se le venza, tiene que volver a recibirlos.
    expiredNotifiedAt: null,
    closingNotifiedAt: null,
    cancelAtPeriodEnd: false,
  } as const;
}

/**
 * Qué recupera una dueña al reactivar su tienda, o `null` si no recupera nada y
 * va a tener que suscribirse.
 *
 * Cerrar la tienda deja la suscripción en CANCELLED pero no toca las fechas: los
 * días ya estaban en la base y nadie los miraba, así que cerrar el día 30 de un
 * plan anual y volver el día 60 pedía pagar el año entero de nuevo. Es lo que
 * hace Shopify: si volvés dentro del ciclo que ya pagaste, no se te cobra otra vez.
 *
 * El trial cuenta igual. Alguien que está probando, cierra y se arrepiente no
 * tiene por qué pasar a pagar: los días que le quedaban son suyos. No se puede
 * estirar cerrando y reabriendo porque `trialEndsAt` es una fecha fija — el reloj
 * corre igual mientras la tienda está cerrada, acá no se congela nada.
 *
 * `cancelAtPeriodEnd` es lo que separa esto de una cancelación del admin, que es
 * un corte deliberado y no se revierte sola por reabrir la tienda.
 */
export function reactivationCredit(sub: {
  status: string;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
} | null): { status: "ACTIVE" | "TRIAL"; until: Date } | null {
  if (!sub || sub.status !== "CANCELLED" || sub.cancelAtPeriodEnd !== true) return null;
  const now = new Date();
  if (sub.currentPeriodEnd && sub.currentPeriodEnd > now) {
    return { status: "ACTIVE", until: sub.currentPeriodEnd };
  }
  if (sub.trialEndsAt > now) return { status: "TRIAL", until: sub.trialEndsAt };
  return null;
}

/* La lista de planes vive en `planLimits` (que no importa Prisma, así que la
   pueden leer las pantallas del navegador). Se re-exporta desde acá para no
   romper a quien ya la pedía de este archivo. */
export type { PlanKey };
export type Billing = "MONTHLY" | "ANNUAL";

/** Por qué no se descuenta nada, para poder decirlo en pantalla en vez de callarlo. */
export type SinCredito =
  | "TRIAL"
  | "VENCIDA"
  | "MISMA_SUSCRIPCION"
  | "SIN_SUSCRIPCION"
  /** Viene de otro producto: una suscripción de tienda no acredita en una digital. */
  | "OTRO_ECOSISTEMA"
  /** El plan destino no se cobra (Free, Afiliado) o la clave no existe. */
  | "PLAN_SIN_PRECIO";

export type CotizacionCambio = {
  destino: { plan: PlanKey; billing: Billing };
  /** Precio de lista del plan al que va. */
  precioLista: number;
  /** Lo que se le descuenta por los días que pagó y no usó. */
  credito: number;
  /** Lo que se le cobra hoy. Nunca negativo: acá no se devuelve plata. */
  aPagar: number;
  /** Días que le quedaban del período anterior (para el texto en pantalla). */
  diasRestantes: number;
  motivoSinCredito: SinCredito | null;
};

type SubParaCotizar = {
  /* `role` es obligatorio y no está de adorno: sin él no se puede saber de qué
     producto viene la suscripción, y el crédito se calcularía cruzando
     ecosistemas. Ver el guard de OTRO_ECOSISTEMA más abajo. */
  role: string;
  tier: string;
  plan: string;
  status: string;
  trialEndsAt: Date;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
} | null;

/**
 * Cuánto se le cobra a alguien que cambia de plan, descontándole los días que ya
 * pagó y no usó.
 *
 * UNA sola regla para los cuatro cambios posibles (a Premium, a anual, o las dos
 * cosas): se calcula qué parte del período que pagó le queda sin usar y esa plata
 * se le descuenta del plan nuevo. La alternativa —cobrar solo la diferencia y no
 * mover la fecha de renovación— no sirve para pasar a anual, así que obligaría a
 * tener dos reglas distintas según el caso.
 *
 * Esta función es la ÚNICA fuente del número: la cotiza el servidor y la piden
 * las dos pantallas. Antes cada una calculaba lo suyo y por eso la página de
 * precios prometía un descuento que el cobro no hacía.
 *
 * Cuidados que no son opcionales:
 *
 * - El crédito sale de lo que REALMENTE pagó (su tier y su ciclo actual), no del
 *   precio del plano al que va. Con el precio del destino, pasar de Pro a Premium
 *   le acreditaba $25.000 de un mes que le costó $20.000.
 *
 * - La duración del período se mide de verdad (`currentPeriodStart` a
 *   `currentPeriodEnd`), no se asume que son 30 días. Un anual con 300 días por
 *   delante dividido por 30 daba diez veces el crédito real: Premium casi gratis.
 *
 * - En TRIAL no hay crédito: no pagó nada todavía. Vencida o en gracia tampoco:
 *   ese período ya se consumió.
 *
 * - Renovar el mismo plan no acredita: se está extendiendo, no cambiando.
 *
 * - `aPagar` nunca baja de cero. Bajar de plan puede generar más crédito que el
 *   precio nuevo; eso da un período sin cargo, no un reembolso.
 */
export function cotizarCambioDePlan(
  sub: SubParaCotizar,
  destino: { plan: PlanKey; billing: Billing },
  now: Date = new Date()
): CotizacionCambio {
  const defDestino = planDe(destino.plan);

  /* Un plan sin precio (Free, Afiliado) o una clave que no existe no se cotiza.
     Devuelve cero y el motivo, pero NO es la puerta por la que alguien se lleva
     algo gratis: la ruta de pago rechaza los planes sin precio antes de llamar
     acá, y `pagos-suscripcion.check.ts` vigila que ese rechazo siga estando. */
  if (!defDestino?.precios) {
    return {
      destino,
      precioLista: 0,
      credito: 0,
      aPagar: 0,
      diasRestantes: 0,
      motivoSinCredito: "PLAN_SIN_PRECIO",
    };
  }

  const precioLista = defDestino.precios[destino.billing];
  const sinCredito = (motivo: SinCredito | null): CotizacionCambio => ({
    destino,
    precioLista,
    credito: 0,
    aPagar: precioLista,
    diasRestantes: 0,
    motivoSinCredito: motivo,
  });

  if (!sub) return sinCredito("SIN_SUSCRIPCION");

  /* El plan que REALMENTE tiene hoy, buscado por rol + tier en el registro. No
     se deduce del tier solo: cualquier tier desconocido caía en OWNER_BASIC y le
     acreditaba a un plan digital el precio de Tienda Pro. */
  const planActual = planDeSuscripcion(sub);
  if (!planActual) return sinCredito("SIN_SUSCRIPCION");

  /* ⚠️ El guard que impide que el crédito cruce productos.
     Una suscripción de tienda no acredita nada contra un plan digital ni al
     revés: son negocios distintos y ni siquiera se pueden tener a la vez (ver
     el candado de ecosistema en `preferencia`). Sin esto, alguien con un anual
     de Tienda Premium por delante generaba un crédito enorme contra un plan
     digital, el total daba cero, y la rama de "activar sin pasar por MP" le
     regalaba el plan entero. */
  if (PLANES[planActual].ecosistema !== defDestino.ecosistema) {
    return sinCredito("OTRO_ECOSISTEMA");
  }

  // Con `now`, no con la hora real: toda esta función tiene que mirar el mismo
  // momento. Más abajo el crédito se calcula contra `now`, así que si el estado
  // saliera de otro reloj se podría dar el caso de acreditar días de un período
  // que, para la otra mitad de la cuenta, ya está vencido.
  const estado = getSubscriptionStatus(sub, now);
  if (estado === "TRIAL") return sinCredito("TRIAL");
  if (estado !== "ACTIVE") return sinCredito("VENCIDA");

  // Renovar lo mismo extiende el período, no lo reemplaza: no hay nada sin usar
  // que devolver. Sin esto, renovar todos los días acreditaría el período entero
  // cada vez.
  if (planActual === destino.plan && sub.plan === destino.billing) {
    return sinCredito("MISMA_SUSCRIPCION");
  }

  const inicio = sub.currentPeriodStart?.getTime();
  const fin = sub.currentPeriodEnd?.getTime();
  // Sin fechas completas no se puede medir el período. Se falla cerrado: se cobra
  // el precio de lista, que es el peor caso para nosotros pero nunca regala plata
  // por una cuenta con datos incompletos.
  if (inicio == null || fin == null) return sinCredito("VENCIDA");

  const duracion = fin - inicio;
  const restante = fin - now.getTime();
  if (duracion <= 0 || restante <= 0) return sinCredito("VENCIDA");

  /* Lo que pagó de verdad: el precio de SU plan, no el del plan al que va. Con el
     precio del destino, pasar de Pro a Premium acreditaba $25.000 de un mes que
     costó $20.000. El `?? 0` no debería ocurrir nunca —un plan sin precio no
     llega hasta acá porque no genera una suscripción paga— y si ocurriera,
     acreditar cero es el lado correcto para equivocarse. */
  const preciosActuales = PLANES[planActual].precios;
  const precioPagado = preciosActuales?.[sub.plan === "ANNUAL" ? "ANNUAL" : "MONTHLY"] ?? 0;

  // La proporción se toma sobre el período real y se acota a [0,1] por las dudas:
  // una fecha futura mal cargada no puede acreditar más de lo que se pagó.
  const proporcion = Math.min(1, Math.max(0, restante / duracion));
  const sinUsar = Math.min(precioPagado, Math.round(proporcion * precioPagado));

  // Se acota al precio del plan nuevo para que el desglose de pantalla siempre
  // cierre: precioLista − credito = aPagar, exacto. Al bajar de plan lo no usado
  // puede superar lo que cuesta el plan nuevo; eso da un período sin cargo, y
  // mostrar un descuento mayor que el precio se leería como que va a haber
  // devolución de plata, que no la hay.
  const credito = Math.min(sinUsar, precioLista);

  return {
    destino,
    precioLista,
    credito,
    aPagar: precioLista - credito,
    diasRestantes: Math.ceil(restante / 86400000),
    motivoSinCredito: null,
  };
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } });
}

export function daysRemaining(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}
