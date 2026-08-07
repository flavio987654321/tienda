import type { Prisma } from "@prisma/client";

/**
 * Los precios de los planes, en pesos.
 *
 * Viven acá y no en lib/subscription porque ese archivo importa Prisma y estos
 * números los necesitan pantallas del navegador (registro, precios, mi plan).
 * Por eso estaban copiados a mano en tres lugares: cambiar un precio obligaba a
 * acordarse de todos, y cualquier olvido mostraba un número y cobraba otro.
 *
 * OJO: los Términos citan estos importes (sección de planes). Si cambian, hay que
 * actualizar CURRENT_TERMS_VERSION en lib/legal para que la gente vuelva a
 * aceptarlos — un cambio de precio es un cambio de contrato.
 */
export const PRICES = {
  OWNER_BASIC:   { MONTHLY: 20000, ANNUAL: 180000 },
  OWNER_PREMIUM: { MONTHLY: 25000, ANNUAL: 225000 },
  AFFILIATE:     { MONTHLY: 0, ANNUAL: 0 },
} as const;

// Topes del plan Tienda Pro. Premium no tiene límite.
//
// Se cuenta lo que está VIVO, no lo que se creó alguna vez: apagar o archivar
// libera lugar al toque. Un tope por mes calendario no se auto-libera (borrás
// todo y seguís bloqueada hasta el mes que viene), que es puro reclamo.
//
// Estos números se reflejan en los Términos (sección de planes) — si cambian
// acá, hay que actualizarlos allá.
export const PRO_MAX_ACTIVE_COUPONS = 10;
export const PRO_MAX_LIVE_PROMOTIONS = 5;
export const PRO_MAX_AFFILIATES = 6;
export const PRO_MAX_PRODUCTS = 1000;

/**
 * Techo de productos por tienda que se aplica a TODOS los planes, Premium
 * incluido. No es un límite comercial: es un freno anti-abuso.
 *
 * Por qué hace falta uno aparte y no alcanza con `PRO_MAX_PRODUCTS`: el tier se
 * ELIGE en el formulario de registro (`tier === "PREMIUM" ? "PREMIUM" : "BASIC"`)
 * y la prueba de 7 días no pide tarjeta. O sea que cualquiera que quiera pasar
 * por arriba del tope de Pro solo tiene que marcar Premium al anotarse. Un tope
 * que solo mira el plan no frena justo al que lo quiere evadir.
 *
 * El número es alto a propósito: tiene que ser imposible de alcanzar usando la
 * app de verdad (hoy la tienda más grande tiene 58 productos) y molesto de
 * alcanzar con un script. No es una promesa comercial y no va en los Términos.
 */
export const MAX_PRODUCTS_POR_TIENDA = 5000;

/**
 * Notificaciones push por semana. No es un tope de Pro: la función entera es
 * Premium, esto es cuánto puede mandar quien ya la tiene. Vive acá para que la
 * página de precios no pueda prometer un número distinto al que se aplica —
 * decía 2 cuando el sistema siempre permitió 3.
 */
export const PUSH_CAMPAIGNS_PER_WEEK = 3;

/**
 * Los tres topes de arriba son los ÚNICOS límites numéricos que existen. El
 * criterio es: se limita lo que la dueña crea (cupones, promos, afiliados), no
 * lo que le pasa. Los carritos abandonados los generan sus clientes, así que
 * ponerles tope sería cobrarle por tener tráfico — y encima son la función para
 * recuperar esas ventas. Productos, métricas, diseños, reseñas y el badge de
 * verificación son idénticos en los dos planes.
 *
 * Lo demás que separa Premium no es un número sino un sí/no: app instalable
 * (PWA), notificaciones push, dominio propio y flyer.
 */

// Acá NO va un `isPremiumTier(tier)`. Existía y era la trampa: miraba el plan sin
// mirar si estaba al día, así que un Premium vencido conservaba el ilimitado en
// cupones, promociones y afiliados. Para saber si alguien tiene Premium de verdad
// se usa `hasActivePremium(sub)` de lib/subscription, que además chequea el estado.

/**
 * "Mis cupones": los que la dueña creó a mano y todavía sirven.
 *
 * Deja afuera los de la ruleta a propósito. Hay dos clases y las dos se crean
 * solas: la plantilla de cada premio (gamification/widget) y el cupón personal
 * de cada ganador (gamification/spin, con winnerEmail). Contarlos hacía que
 * configurar una ruleta de 5 premios te comiera media cuota antes de crear un
 * solo cupón propio, y que cada persona que ganara te acercara al tope.
 */
export const myActiveCouponsWhere = (storeId: string, now = new Date()): Prisma.CouponWhereInput => ({
  storeId,
  winnerEmail: null,
  gamificationPrizes: { none: {} },
  isActive: true,
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

/**
 * "Promos vivas": las que ocupan lugar — activas, programadas o pausadas.
 * Archivadas y vencidas no cuentan. Misma definición de `isLive` que usa la
 * lista del panel, para que el número del contador coincida con lo que se ve.
 */
export const livePromotionsWhere = (storeId: string, now = new Date()): Prisma.StorePromotionWhereInput => ({
  storeId,
  archivedAt: null,
  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
});
