import { prisma } from "@/lib/prisma";
import { getSubscriptionStatus, SUB_STATUS_SELECT, type SubscriptionStatus } from "@/lib/subscription";
import { comisionCongelada } from "@/lib/compra-digital";
import { PRECIOS_DIGITALES } from "@/lib/planLimits";
import { DIAS_DE_DOMINIO_EN_FREE } from "@/lib/configuracion-digital";
import { diaArgentino, inicioDiaArgentino } from "@/lib/fechas-comerciales";
import { TIERS_DIGITALES, type TierDigital } from "@/lib/planes-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   PRODUCTOS DIGITALES, VISTO DESDE ADMIN
   ══════════════════════════════════════════════════════════════════════════

   Qué contesta esta pantalla, y por qué esas preguntas y no otras:

     - Cuántas cuentas hay y en qué plan. Sin esto, el ecosistema entero es
       invisible: hasta hoy una cuenta digital no aparecía en ningún contador
       del panel.
     - Cuánto entra. Dos plata distintas y no se pueden sumar: lo FIJO (las
       suscripciones) y la COMISIÓN de cada venta. Una cuenta Free no paga
       nada fijo y aun así puede ser la que más deja.
     - A quién hay que mirar esta semana: la prueba que se termina, la que
       está en gracia, la que se cayó a Free y está por perder su dominio.

   ⚠️ Los números salen de las MISMAS fuentes que el panel de la dueña: una
   venta cobrada es una orden CONFIRMED, el bruto es `Order.total` y la
   comisión sale de `comisionCongelada` con la tasa que quedó congelada en esa
   orden. Si acá se contara distinto, dos pantallas de la misma plata dirían
   números distintos y no habría forma de saber cuál miente. */

/**
 * Cuántas cuentas trae la pantalla.
 *
 * Hoy hay dos (el registro de Productos Digitales está apagado), así que traer
 * todas y resolver el estado vivo en memoria es gratis y es exacto.
 *
 * ⚠️ Es exacto justamente porque NO se agrupa por la columna `status`: una
 * suscripción puede decir ACTIVE en la base y estar vencida hace una semana
 * —el cron la corrige una vez por día—, así que el único estado que no miente
 * es el que calcula `getSubscriptionStatus`. Eso obliga a mirar fila por fila.
 *
 * El día que esto no entre, la pantalla lo va a DECIR en vez de mostrar un
 * número corto sin avisar (ver `hayMas`). Ahí habrá que mover el estado vivo a
 * una columna que el cron mantenga, y recién entonces se podrá contar en la
 * base.
 */
export const TOPE_DE_CUENTAS = 500;

export type CuentaDigital = {
  userId: string;
  nombre: string | null;
  email: string;
  banned: boolean;
  storeId: string | null;
  tier: TierDigital;
  plan: string;
  /**
   * Si alguna vez entró un pago de Mercado Pago por esta suscripción.
   *
   * Viaja como sí/no y no como el número del pago: al panel le alcanza con
   * saber si paga, y un identificador de pago no tiene por qué andar dando
   * vueltas en el HTML de una pantalla.
   */
  pago: boolean;
  /** El vivo, no el crudo de la columna. */
  estado: SubscriptionStatus;
  trialEndsAt: Date;
  currentPeriodEnd: Date | null;
  /** Desde cuándo está en Free POR HABER CAÍDO. `null` si nació Free. */
  freeDesde: Date | null;
  productos: number;
  publicados: number;
  ventasDelMes: number;
  brutoDelMes: number;
  comisionDelMes: number;
  comisionTotal: number;
};

export type FotoDigitales = {
  cuentas: CuentaDigital[];
  /** Hay más cuentas que el tope: la pantalla lo dice en vez de callarse. */
  hayMas: boolean;
  porPlan: Record<TierDigital, number>;
  enPrueba: number;
  /** Lo fijo del mes: lo que pagan las suscripciones al día, mensualizado. */
  fijoDelMes: number;
  /** Cuentas con plan pago activo y ningún pago registrado: regaladas. */
  regaladas: number;
  comisionDelMes: number;
  comisionTotal: number;
  ventasDelMes: number;
  brutoDelMes: number;
  /** El primero de este mes en hora argentina, para poder decirlo en pantalla. */
  desde: Date;
};

/**
 * Lo que paga POR MES una suscripción, sea mensual o anual.
 *
 * El anual se divide por doce a propósito: si no, un mes con dos pagos anuales
 * parece diez veces mejor que el anterior y el número deja de servir para
 * comparar. Es la cuenta de siempre para esto (lo que se suele llamar MRR).
 *
 * Devuelve 0 para Free —no paga nada— y para cualquier plan que no esté al
 * día: una prueba no es plata que entra, y una cuenta en gracia es plata que
 * justamente NO entró.
 *
 * ⚠️ Y DEVUELVE 0 SI NUNCA ENTRÓ UN PAGO. Un plan puesto a mano desde el panel
 * —una cuenta de prueba, una regalada, la nuestra— queda ACTIVE igual que una
 * que paga, y sin este freno aparecía como plata que entra. Hoy mismo pasa:
 * hay una cuenta Pro activa sin ningún pago registrado, y el número decía
 * $89.000 que nadie pagó. Un panel que se infla solo no sirve para decidir
 * nada. Esas cuentas se cuentan aparte, como lo que son: regaladas.
 */
export function fijoMensual(
  cuenta: { tier: TierDigital; plan: string; estado: SubscriptionStatus; pago: boolean },
): number {
  if (cuenta.estado !== "ACTIVE" || !cuenta.pago) return 0;
  const precios = cuenta.tier === "STARTER"
    ? PRECIOS_DIGITALES.DIGITAL_STARTER
    : cuenta.tier === "PRO"
      ? PRECIOS_DIGITALES.DIGITAL_PRO
      : null;
  if (!precios) return 0;
  return cuenta.plan === "ANNUAL" ? Math.round(precios.ANNUAL / 12) : precios.MONTHLY;
}

/**
 * A cuántos días está de perder su dominio propio, o `null` si no corre.
 *
 * Sólo corre para quien CAYÓ a Free teniendo un dominio conectado: el que
 * nació Free no tiene `freeDesde` y no está perdiendo nada. Es el plazo que
 * aplica el cron (`DIAS_DE_DOMINIO_EN_FREE`), no un número copiado, así que la
 * pantalla no puede quedar diciendo un plazo que el sistema ya no usa.
 */
export function diasParaPerderElDominio(
  cuenta: { tier: TierDigital; freeDesde: Date | null },
  ahora: Date,
): number | null {
  if (cuenta.tier !== "FREE" || !cuenta.freeDesde) return null;
  const pasados = Math.floor((ahora.getTime() - cuenta.freeDesde.getTime()) / 86_400_000);
  return DIAS_DE_DOMINIO_EN_FREE - pasados;
}

/**
 * Las cuentas que hay que mirar esta semana, y por qué.
 *
 * Una cuenta puede estar en dos listas a la vez y está bien: son motivos, no
 * categorías. Lo que no puede es estar en ninguna cuando le pasa algo.
 */
export function necesitanAtencion(cuentas: CuentaDigital[], ahora: Date) {
  const enDias = (d: Date) => Math.ceil((d.getTime() - ahora.getTime()) / 86_400_000);
  return {
    /* La prueba que se termina. Siete días es el plazo en el que todavía se
       puede hacer algo: escribirle, llamarla, preguntarle qué le falta. */
    pruebaPorVencer: cuentas
      .filter((c) => c.estado === "TRIAL" && enDias(c.trialEndsAt) <= 7)
      .sort((a, b) => a.trialEndsAt.getTime() - b.trialEndsAt.getTime()),
    /* Gracia: pagó y se le venció, pero todavía no perdió nada. Es el momento
       en que un mensaje sirve de verdad. */
    enGracia: cuentas.filter((c) => c.estado === "GRACE"),
    /* Vencida: ya perdió las funciones del plan. */
    vencidas: cuentas.filter((c) => c.estado === "EXPIRED"),
    /* Cayó a Free y su dominio propio tiene fecha de corte. */
    dominioEnRiesgo: cuentas
      .map((c) => ({ cuenta: c, dias: diasParaPerderElDominio(c, ahora) }))
      .filter((x): x is { cuenta: CuentaDigital; dias: number } => x.dias !== null)
      .sort((a, b) => a.dias - b.dias),
  };
}

/** El orden de la tabla: primero la que más deja. */
export function ordenarCuentas(cuentas: CuentaDigital[]): CuentaDigital[] {
  return [...cuentas].sort((a, b) =>
    b.comisionDelMes - a.comisionDelMes ||
    b.brutoDelMes - a.brutoDelMes ||
    b.comisionTotal - a.comisionTotal ||
    (a.nombre ?? a.email).localeCompare(b.nombre ?? b.email, "es"),
  );
}

export async function fotoDeDigitales(ahora: Date = new Date()): Promise<FotoDigitales> {
  /* El mes en curso en hora argentina, igual que el panel de la dueña: con la
     hora del servidor (UTC) los primeros días del mes cuentan mal. */
  const desde = inicioDiaArgentino(`${diaArgentino(ahora).slice(0, 7)}-01`);

  const filas = await prisma.subscription.findMany({
    /* ⚠️ Sin las cuentas eliminadas. Al borrar una cuenta se le cambia el mail
       por uno terminado en `.invalid` (es la marca que usa todo el panel: no
       hay una columna de borrado), pero la suscripción queda. Sin este filtro
       una cuenta eliminada seguía contando como cuenta viva, seguía apareciendo
       en la tabla, y si había llegado a pagar seguía sumando al fijo del mes
       **para siempre**: plata que no entra más, en el número que se mira para
       decidir si el producto va. */
    where: { role: "DIGITAL", user: { email: { not: { endsWith: ".invalid" } } } },
    take: TOPE_DE_CUENTAS + 1,
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      plan: true,
      freeDesde: true,
      mpPaymentId: true,
      ...SUB_STATUS_SELECT,
      user: {
        select: {
          name: true, email: true, banned: true,
          store: { select: { id: true } },
        },
      },
    },
  });

  const hayMas = filas.length > TOPE_DE_CUENTAS;
  const subs = hayMas ? filas.slice(0, TOPE_DE_CUENTAS) : filas;
  const storeIds = subs.map((s) => s.user?.store?.id).filter((x): x is string => !!x);

  /* Sin una sola tienda no hay nada más que preguntar: las tres consultas que
     siguen filtran por `in: []` y traerían cero igual, pagando el viaje. */
  const [productos, publicados, delMes, deSiempre] = storeIds.length === 0
    ? [[], [], [], []]
    : await Promise.all([
        prisma.product.groupBy({
          by: ["storeId"],
          where: { storeId: { in: storeIds }, rolDigital: "PRINCIPAL", deletedAt: null },
          _count: { _all: true },
        }),
        /* "Publicado" es lo mismo que en el panel de la dueña: `isActive`. */
        prisma.product.groupBy({
          by: ["storeId"],
          where: { storeId: { in: storeIds }, rolDigital: "PRINCIPAL", deletedAt: null, isActive: true },
          _count: { _all: true },
        }),
        /* ⚠️ Agrupado también por la tasa congelada: la comisión no se puede
           sacar del total de la tienda, porque una misma tienda puede tener
           ventas con 8%, 6% y 2% si cambió de plan en el medio. Agrupar por la
           tasa es lo que hace que cada venta se cuente con la suya. */
        prisma.order.groupBy({
          by: ["storeId", "lockedCommissionRate"],
          where: { storeId: { in: storeIds }, status: "CONFIRMED", createdAt: { gte: desde } },
          _sum: { total: true },
          _count: { _all: true },
        }),
        prisma.order.groupBy({
          by: ["storeId", "lockedCommissionRate"],
          where: { storeId: { in: storeIds }, status: "CONFIRMED" },
          _sum: { total: true },
        }),
      ]);

  const porTienda = <T extends { storeId: string }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) m.set(x.storeId, [...(m.get(x.storeId) ?? []), x]);
    return m;
  };
  const conteo = (xs: Array<{ storeId: string; _count: { _all: number } }>) =>
    new Map(xs.map((x) => [x.storeId, x._count._all]));

  const cuantos = conteo(productos);
  const cuantosVivos = conteo(publicados);
  const mes = porTienda(delMes);
  const siempre = porTienda(deSiempre);

  const cuentas: CuentaDigital[] = subs.map((s) => {
    const storeId = s.user?.store?.id ?? null;
    const delMesAca = storeId ? mes.get(storeId) ?? [] : [];
    const deSiempreAca = storeId ? siempre.get(storeId) ?? [] : [];
    const sumar = (xs: Array<{ lockedCommissionRate: number | null; _sum: { total: number | null } }>) =>
      xs.reduce((t, x) => t + comisionCongelada(x._sum.total ?? 0, x.lockedCommissionRate), 0);

    return {
      userId: s.userId,
      nombre: s.user?.name ?? null,
      email: s.user?.email ?? "",
      banned: s.user?.banned ?? false,
      storeId,
      /* ⚠️ UN TIER QUE NINGÚN PLAN DIGITAL DEFINE SE MUESTRA COMO FREE.
         No es cosmética: la pantalla le pide a `topeDe` cuántas páginas
         permite ese plan, y `topeDe` lo busca en la tabla de topes. Con un
         tier que no está —una fila vieja, un dato escrito a mano— devuelve
         undefined y explota al leerle una propiedad: se cae la pantalla
         ENTERA, no esa fila.
         Y Free además es lo que esa cuenta puede hacer de verdad: con un tier
         desconocido, el panel de digitales no le abre ninguna función. */
      tier: TIERS_DIGITALES.includes(s.tier as TierDigital) ? (s.tier as TierDigital) : "FREE",
      plan: s.plan,
      pago: s.mpPaymentId !== null,
      estado: getSubscriptionStatus(s, ahora),
      trialEndsAt: s.trialEndsAt,
      currentPeriodEnd: s.currentPeriodEnd,
      freeDesde: s.freeDesde,
      productos: storeId ? cuantos.get(storeId) ?? 0 : 0,
      publicados: storeId ? cuantosVivos.get(storeId) ?? 0 : 0,
      ventasDelMes: delMesAca.reduce((t, x) => t + x._count._all, 0),
      brutoDelMes: delMesAca.reduce((t, x) => t + (x._sum.total ?? 0), 0),
      comisionDelMes: sumar(delMesAca),
      comisionTotal: sumar(deSiempreAca),
    };
  });

  const porPlan: Record<TierDigital, number> = { FREE: 0, STARTER: 0, PRO: 0 };
  for (const c of cuentas) if (c.tier in porPlan) porPlan[c.tier]++;

  return {
    cuentas: ordenarCuentas(cuentas),
    hayMas,
    porPlan,
    enPrueba: cuentas.filter((c) => c.estado === "TRIAL").length,
    fijoDelMes: cuentas.reduce((t, c) => t + fijoMensual(c), 0),
    regaladas: cuentas.filter((c) => c.estado === "ACTIVE" && c.tier !== "FREE" && !c.pago).length,
    comisionDelMes: cuentas.reduce((t, c) => t + c.comisionDelMes, 0),
    comisionTotal: cuentas.reduce((t, c) => t + c.comisionTotal, 0),
    ventasDelMes: cuentas.reduce((t, c) => t + c.ventasDelMes, 0),
    brutoDelMes: cuentas.reduce((t, c) => t + c.brutoDelMes, 0),
    desde,
  };
}
