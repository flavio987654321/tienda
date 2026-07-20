import type { Prisma } from "@prisma/client";

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

export const isPremiumTier = (tier?: string | null) => tier === "PREMIUM";

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
