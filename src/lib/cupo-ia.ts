import { prisma } from "@/lib/prisma";
import type { TierDigital } from "@/lib/planes-digitales";
import { EBOOKS_IA_ARRANQUE, TOPES_DIGITALES } from "@/lib/planLimits";
import { getSubscriptionStatus, MONTHLY_DAYS } from "@/lib/subscription";

/**
 * El cupo de generaciones de IA de una cuenta digital.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UN CUPO NO ES UN TOPE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * **Tope** es invisible y anti-abuso: la ráfaga, los globales. Nadie lo ve ni lo
 * vende, vive en Redis y se olvida solo. Está en `lib/ia-digitales`.
 *
 * **Cupo** es parte de lo que se vende: *"3 en el plan gratis"*, *"12 al empezar
 * y 10 por mes en Pro"*. La persona lo ve gastarse, va escrito en la página de
 * precios, y por eso **no puede vivir en Redis**: un contador con ventana se
 * olvida cuando pasa la ventana y regala el cupo entero de nuevo.
 *
 * ── Las dos bolsas ─────────────────────────────────────────────────────────
 *
 * | | Cuántas | ¿Vuelven? |
 * |---|---|---|
 * | **Del ciclo** | 5 Starter / 10 Pro | Sí, cada 30 días DESDE QUE PAGÓ |
 * | **De bienvenida** | 6 Starter / 12 Pro | **No.** Se dan una vez |
 *
 * El arranque existe porque **el mes 1 es cuando se necesita todo**: la persona
 * está probando, no sabe qué escribir en el campo y regenera varias veces. Ese
 * día es el que decide si se queda. El mes 6 no necesita nada.
 *
 * Y el mensual **no se acumula**: si se acumulara, alguien que no toca la cuenta
 * durante un año llega al mes 13 con 120 generaciones juntas y el peor caso que
 * esto viene a resolver vuelve entero.
 *
 * ── ⚠️ SE GASTA PRIMERO LA DEL MES ─────────────────────────────────────────
 *
 * Porque es la que se pierde si no se usa. Al revés le quemaríamos a la persona
 * su bolsa permanente mientras se le vencen sin usar las del mes — una estafa
 * silenciosa, de las que nadie nota hasta que le faltan.
 *
 * ── Por qué no hay ningún cron ─────────────────────────────────────────────
 *
 * `mesClave` guarda la clave del CICLO (ver `cuentaDelCupo`). Cuando llega un
 * pedido y la clave no es la del ciclo actual, el contador se pone en cero **en
 * ese momento**. Así el reinicio no depende de que un proceso nocturno corra —
 * y en este plan de Vercel el cron es uno solo por día.
 *
 * ── ⚠️ EL CICLO ES DESDE QUE PAGÓ, NO EL MES DEL CALENDARIO ────────────────
 *
 * Hasta el 03/10/26 la bolsa se llenaba el 1° de cada mes. Eso daba tres
 * agujeros, encontrados con Flavio:
 *   - Quien pagaba el 25 recibía la bolsa entera y el 1°, seis días después,
 *     OTRA entera. Quien pagaba el 2 esperaba casi un mes.
 *   - Una prueba que cruzaba el 1° se rellenaba sola: Pro sacaba 32
 *     generaciones en vez de 22 sólo por empezar a fin de mes.
 *   - Peor: la prueba vencida y sin pagar seguía siendo Starter o Pro hasta que
 *     el cron diario la bajaba a Free (hasta un día). En ese rato ya no estaba
 *     "en prueba", así que recibía la bolsa ENTERA de ebooks del plan pago —11
 *     en Starter, 21 en Pro— sin haber pagado nunca. Cada ebook cuesta dólares.
 *
 * Ahora la cuenta sale de la suscripción, acá adentro, y no de lo que diga el
 * que llama: el plan que vale, si está en prueba y desde cuándo pagó.
 */

/**
 * Para qué es el cupo.
 *
 * Son dos bolsas **completamente separadas**, una fila por concepto. No es un
 * detalle de implementación: gastar todas las páginas de venta no puede dejar a
 * nadie sin poder escribir su ebook, y al revés tampoco. Cuestan cosas
 * distintas —centavos contra dólares— y se venden como dos renglones distintos
 * en la página de precios.
 */
export type ConceptoIA = "EMBUDO" | "EBOOK";

export type Bolsa = "mes" | "bienvenida";

export type TopeDelCupo = { bienvenida: number; mes: number };

/**
 * Cuántas generaciones da cada plan para armar el embudo.
 *
 * Los números salen de los productos, no del aire: **3 por producto**. Starter
 * puede tener 2 → 6 para arrancar; Pro puede tener 5 → 12, con margen. El
 * mensual alcanza para rehacer todo el catálogo dos veces.
 *
 * ⚠️ **Free no tiene bolsa mensual, y es la única decisión de plata acá.** En
 * Starter y Pro hay un abono pagando la cuenta; en Free **no entra un peso hasta
 * que la persona vende algo**, y Free no vence nunca ni pide tarjeta. Con cupo
 * mensual, veinte cuentas truchas serían un gasto para siempre. Con 3 de por
 * vida, una cuenta trucha nos cuesta cuatro centavos de dólar, una sola vez.
 */
export const CUPO_EMBUDO: Record<TierDigital, TopeDelCupo> = {
  /* ⚠️ 3 → 4 el 08/09/26, y es la contrapartida de haber sacado la primera
     página gratis. Un embudo completo pasó a costar DOS generaciones —una por
     las tres fichas, otra por la página— así que con 3 alcanzaba para uno y
     medio: quien no quedaba conforme con el primero no podía rehacerlo entero.
     Con 4 entran dos embudos completos, que es el margen para equivocarse una
     vez. Ver el porqué largo en `ia/pagina`. */
  FREE:    { bienvenida: 4,  mes: 0 },
  STARTER: { bienvenida: 6,  mes: 5 },
  PRO:     { bienvenida: 12, mes: 10 },
};

/**
 * Cuántos ebooks completos escribe la IA en cada plan.
 *
 * ⚠️ **Estos números NO se escriben acá: se leen de `planLimits`.** Son los
 * mismos que dibuja la tarjeta de planes y los mismos que la página de precios
 * ya está prometiendo. Escribirlos de nuevo sería la tercera copia del mismo
 * número, y este archivo ya se desincronizó dos veces por eso (01/09/26). Si hay
 * que cambiarlos, se cambian en `planLimits` y acá llegan solos.
 *
 * **Free tiene cero, y es a propósito.** Un ebook cuesta dólares, no centavos, y
 * en Free no entra un peso hasta que la persona vende. Free igual puede publicar
 * su producto: sube el PDF que ya tenía. Lo que no hace es pedirnos que se lo
 * escribamos nosotros.
 */
export const CUPO_EBOOK: Record<TierDigital, TopeDelCupo> = {
  FREE:    { bienvenida: EBOOKS_IA_ARRANQUE.FREE,    mes: TOPES_DIGITALES.FREE.ebooksIA },
  STARTER: { bienvenida: EBOOKS_IA_ARRANQUE.STARTER, mes: TOPES_DIGITALES.STARTER.ebooksIA },
  PRO:     { bienvenida: EBOOKS_IA_ARRANQUE.PRO,     mes: TOPES_DIGITALES.PRO.ebooksIA },
};

const CUPOS: Record<ConceptoIA, Record<TierDigital, TopeDelCupo>> = {
  EMBUDO: CUPO_EMBUDO,
  EBOOK: CUPO_EBOOK,
};

/**
 * Lo que le toca a una cuenta que **todavía no pagó nunca**.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ EL REGALO DE BIENVENIDA NO SE ENTREGA EN LA PRUEBA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Los días de prueba son **sin tarjeta**: no tenemos un solo dato de cobro de
 * esa cuenta, y nada impide abrir otra. Entregarle ahí el arranque de Pro —12
 * generaciones— es regalar hasta 12 ebooks por cuenta abierta, **tantas veces
 * como cuentas quiera abrir alguien**. Y un ebook escrito con IA sirve fuera de
 * la plataforma: es exactamente lo que se puede cosechar.
 *
 * Esta regla estaba escrita en `planLimits.ts` desde el 01/09/26 —"no se
 * entrega en la prueba, se entrega con el PRIMER COBRO"— y **no estaba en el
 * código**. `consumirDelCupo` recibía la cuenta y el plan, y nunca preguntaba si
 * había pagado. Encontrado el 08/09/26, mirando por qué subir el arranque de 6 a
 * 12 daba miedo.
 *
 * ── Sólo toca los EBOOKS ───────────────────────────────────────────────────
 *
 * El embudo y la página son centavos de texto corto, **y son el gancho de la
 * prueba**: lo que impresiona al entrar es ver la tienda armada sola. Apretar
 * eso sería apagar justo lo que hace que alguien pague. El ebook es lo caro y lo
 * único que sirve afuera.
 *
 * ── Una, y no cero ─────────────────────────────────────────────────────────
 *
 * Cero dejaría el botón más importante del producto apagado durante toda la
 * prueba, y quien está evaluando no llegaría a ver lo que compra. Con una, lo ve
 * entero; el resto llega con el primer cobro.
 */
const CUPO_DE_PRUEBA: TopeDelCupo = { bienvenida: 0, mes: 1 };

/**
 * El tope que corresponde, mirando **las tres** cosas: el plan, para qué es, y
 * si la cuenta ya pagó alguna vez.
 *
 * ⚠️ Existe porque las funciones de abajo recibían `concepto`, lo usaban para
 * elegir la FILA y después leían el tope de `CUPO_EMBUDO` a secas. Con un solo
 * concepto nadie lo notaba; el día que entrara el segundo, pedir el cupo de
 * ebooks iba a contestar con el del embudo —12 en Pro en vez de 6, y 3 en Free
 * en vez de 0, o sea la IA cara abierta justo en el plan que no la paga—.
 */
export function topeDelCupo(
  tier: TierDigital,
  concepto: ConceptoIA,
  enPrueba = false,
): TopeDelCupo {
  const tope = CUPOS[concepto][tier];
  if (!enPrueba || concepto !== "EBOOK") return tope;
  /* ⚠️ El mínimo con el tope del plan: un plan que no tiene ebooks —Free— no
     pasa a tener uno por estar en prueba. */
  return {
    bienvenida: 0,
    mes: Math.min(CUPO_DE_PRUEBA.mes, tope.mes + tope.bienvenida),
  };
}

/** Cada cuánto se rellena la bolsa del ciclo, contado desde el pago. */
export const DIAS_DEL_CICLO = MONTHLY_DAYS;
const DIA_MS = 86_400_000;

/**
 * Lo que el cupo necesita saber de una cuenta, sacado de su suscripción.
 *
 * - `tier`: el plan que VALE ahora. Una prueba o un plan pago vencidos valen
 *   Free en el instante en que vencen, sin esperar al cron que los baja.
 * - `enPrueba`: probando sin haber pagado. Ver `CUPO_DE_PRUEBA`.
 * - `ciclo`: la clave de la bolsa que se está usando. Mientras es la misma,
 *   la bolsa no se rellena.
 * - `renuevaEl`: cuándo se rellena (ISO), o `null` si no se rellena sola.
 */
export type CuentaDelCupo = {
  tier: TierDigital;
  enPrueba: boolean;
  ciclo: string;
  renuevaEl: string | null;
};

type SuscripcionParaElCupo = {
  role?: string | null;
  tier?: string | null;
  status: string;
  trialEndsAt: Date;
  currentPeriodStart?: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
};

const SIN_CICLO: CuentaDelCupo = { tier: "FREE", enPrueba: false, ciclo: "free", renuevaEl: null };

/**
 * El plan y el ciclo de una cuenta, para el cupo. Pura: se prueba sola.
 *
 * ── Las reglas ─────────────────────────────────────────────────────────────
 *
 * - **Free, vencida o cancelada** → Free. Free no tiene bolsa por ciclo, así
 *   que la clave da igual.
 * - **En prueba** → el plan que prueba, con UNA sola clave para toda la prueba
 *   ("prueba"): la bolsa no se rellena nunca mientras prueba, empiece el día
 *   que empiece. Se rellena recién con el primer pago.
 * - **Pagando** (activo, o en el período de gracia) → un ciclo cada
 *   `DIAS_DEL_CICLO` desde el pago (`currentPeriodStart`). Un plan anual son
 *   doce ciclos dentro del mismo pago. ⚠️ Con tope en los ciclos PAGADOS: en
 *   la gracia —ya venció y todavía no pagó— no se abre un ciclo nuevo; el
 *   próximo lo abre el pago.
 */
export function cuentaDelCupo(sub: SuscripcionParaElCupo | null, ahora: Date = new Date()): CuentaDelCupo {
  if (!sub || !sub.tier || sub.tier === "FREE") return SIN_CICLO;
  const tier = sub.tier as TierDigital;
  const estado = getSubscriptionStatus({ ...sub, role: sub.role ?? "DIGITAL", tier: sub.tier }, ahora);

  if (estado === "TRIAL") return { tier, enPrueba: true, ciclo: "prueba", renuevaEl: null };
  if (estado !== "ACTIVE" && estado !== "GRACE") return SIN_CICLO;
  if (!sub.currentPeriodEnd) return SIN_CICLO;

  const fin = sub.currentPeriodEnd.getTime();
  /* Las suscripciones viejas pueden no tener el inicio: se deduce del fin. */
  const inicio = sub.currentPeriodStart?.getTime() ?? fin - DIAS_DEL_CICLO * DIA_MS;
  const largo = DIAS_DEL_CICLO * DIA_MS;
  const ciclos = Math.max(1, Math.round((fin - inicio) / largo));
  const n = Math.min(ciclos - 1, Math.max(0, Math.floor((ahora.getTime() - inicio) / largo)));
  const renueva = n < ciclos - 1 ? inicio + (n + 1) * largo : fin;
  return {
    tier,
    enPrueba: false,
    ciclo: `pago:${new Date(inicio).toISOString()}:${n}`,
    renuevaEl: new Date(renueva).toISOString(),
  };
}

/** `cuentaDelCupo` leyendo la suscripción de la base. */
export async function cuentaDelCupoDe(userId: string, ahora: Date = new Date()): Promise<CuentaDelCupo> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      role: true, tier: true, status: true, trialEndsAt: true,
      currentPeriodStart: true, currentPeriodEnd: true, gracePeriodEndsAt: true,
    },
  });
  return cuentaDelCupo(sub, ahora);
}

export type EstadoDelCupo = {
  /** Lo que queda en total: el número grande, el que la persona busca. */
  quedan: number;
  quedanDelMes: number;
  quedanDeBienvenida: number;
  topeDelMes: number;
  topeDeBienvenida: number;
  /**
   * Cuándo se rellena la bolsa del ciclo (ISO). `null` si no se rellena sola:
   * Free, o en prueba. Para decirlo, `cuandoVuelven` de `cupo-ia-texto`.
   */
  renuevaEl: string | null;
};

/**
 * Cuánto le queda, sin gastar nada.
 *
 * Lo lee la pantalla para dibujar el cartel. No crea la fila: una cuenta que
 * nunca generó nada no necesita una fila para saber que tiene todo.
 */
export async function estadoDelCupo(
  userId: string,
  concepto: ConceptoIA = "EMBUDO",
): Promise<EstadoDelCupo> {
  /* El plan, la prueba y el ciclo salen de la suscripción, igual que en
     `consumirDelCupo`: así la pantalla y el servidor no pueden decir números
     distintos. */
  const cuenta = await cuentaDelCupoDe(userId);
  const tope = topeDelCupo(cuenta.tier, concepto, cuenta.enPrueba);
  const mes = cuenta.ciclo;

  const fila = await prisma.cupoIA.findUnique({
    where: { userId_concepto: { userId, concepto } },
    select: { bienvenidaUsadas: true, mesUsadas: true, mesClave: true },
  });

  /* Si la fila es de un mes viejo, las del mes ya volvieron aunque nadie las
     haya reiniciado todavía: el reinicio pasa al gastar, pero mostrarlas usadas
     mientras tanto sería mentirle a quien mira. */
  const usadasDelMes = fila && fila.mesClave === mes ? fila.mesUsadas : 0;
  const usadasDeBienvenida = fila?.bienvenidaUsadas ?? 0;

  const quedanDelMes = Math.max(0, tope.mes - usadasDelMes);
  const quedanDeBienvenida = Math.max(0, tope.bienvenida - usadasDeBienvenida);

  return {
    quedan: quedanDelMes + quedanDeBienvenida,
    quedanDelMes,
    quedanDeBienvenida,
    topeDelMes: tope.mes,
    topeDeBienvenida: tope.bienvenida,
    renuevaEl: tope.mes > 0 ? cuenta.renuevaEl : null,
  };
}

/**
 * Gastar una generación. Devuelve de qué bolsa salió, o `null` si no queda.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA CONDICIÓN VA ADENTRO DEL `where`, NUNCA EN UN `if` DESPUÉS DE LEER
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Leer "¿le quedan?" y después restar es la carrera clásica: dos pedidos en
 * paralelo leen los dos "te queda 1" y los dos gastan, y la cuenta terminó con
 * -1. Acá el "todavía le queda" es parte del `UPDATE`, así que la base decide
 * quién gana y el que pierde recibe `count: 0`. No hace falta transacción.
 *
 * ⚠️ Y el orden: **primero la del mes**, que es la que se vence.
 */
export async function consumirDelCupo(
  userId: string,
  concepto: ConceptoIA = "EMBUDO",
): Promise<Bolsa | null> {
  /* ⚠️ Lo decide la suscripción, no el que llama: ver `cuentaDelCupo`. */
  const cuenta = await cuentaDelCupoDe(userId);
  const tope = topeDelCupo(cuenta.tier, concepto, cuenta.enPrueba);
  const mes = cuenta.ciclo;

  /* Un plan que no tiene NADA de esto —Free y los ebooks— se contesta sin tocar
     la base. No es sólo ahorrarse una escritura: sin esto, cada clic de una
     cuenta Free en un botón que no le corresponde deja una fila de cupo en cero
     que no sirve para nada y que después hay que explicar mirando la tabla. */
  if (tope.bienvenida <= 0 && tope.mes <= 0) return null;

  /* La fila tiene que existir para poder actualizarla. `upsert` sobre la clave
     única y no un "¿existe? entonces creá": dos pedidos en paralelo leen los dos
     "todavía no" y crean dos filas, o sea el doble de cupo. */
  await prisma.cupoIA.upsert({
    where: { userId_concepto: { userId, concepto } },
    update: {},
    create: { userId, concepto, mesClave: mes },
  });

  /* El reinicio del ciclo, sin cron: si la clave guardada no es la del ciclo de
     ahora, se pone en cero acá mismo. Con la clave vieja en el `where`, dos pedidos a la
     vez no lo reinician dos veces — el segundo ya no encuentra la clave vieja. */
  if (tope.mes > 0) {
    await prisma.cupoIA.updateMany({
      where: { userId, concepto, NOT: { mesClave: mes } },
      data: { mesUsadas: 0, mesClave: mes },
    });

    const delMes = await prisma.cupoIA.updateMany({
      where: { userId, concepto, mesClave: mes, mesUsadas: { lt: tope.mes } },
      data: { mesUsadas: { increment: 1 } },
    });
    if (delMes.count === 1) return "mes";
  }

  const deBienvenida = await prisma.cupoIA.updateMany({
    where: { userId, concepto, bienvenidaUsadas: { lt: tope.bienvenida } },
    data: { bienvenidaUsadas: { increment: 1 } },
  });
  if (deBienvenida.count === 1) return "bienvenida";

  return null;
}

/**
 * Devolver una generación que no llegó a usarse.
 *
 * Se gasta ANTES de llamar al modelo —si no, ocho pedidos en paralelo pasan
 * todos el control y generan todos— así que cuando la llamada falla hay que
 * devolverla: la persona no recibió nada y el fallo fue nuestro.
 *
 * ⚠️ Con el piso adentro del `where`. Sin él, un bug que llame a esto de más
 * deja el contador en negativo, o sea cupo infinito para esa cuenta.
 */
export async function devolverAlCupo(
  userId: string,
  bolsa: Bolsa,
  concepto: ConceptoIA = "EMBUDO",
): Promise<void> {
  try {
    if (bolsa === "mes") {
      await prisma.cupoIA.updateMany({
        where: { userId, concepto, mesUsadas: { gt: 0 } },
        data: { mesUsadas: { decrement: 1 } },
      });
    } else {
      await prisma.cupoIA.updateMany({
        where: { userId, concepto, bienvenidaUsadas: { gt: 0 } },
        data: { bienvenidaUsadas: { decrement: 1 } },
      });
    }
  } catch (e) {
    /* Que no se pueda devolver no puede tumbar la respuesta de error que ya
       estamos por darle a la persona: quedaría un 500 encima de un 502. Se
       pierde una generación y se anota. */
    console.error("[cupo-ia] no se pudo devolver la generación", { userId, bolsa, e });
  }
}
