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

/* ══════════════════════════════════════════════════════════════════════════
   PRODUCTOS DIGITALES — el cuarto ecosistema
   Ver ECOSISTEMA-DIGITALES.md
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Los abonos de Productos Digitales, en pesos.
 *
 * Viven en su propia constante y no adentro de `PRICES` porque son otra familia
 * de planes: `PRICES` lo consume `getPriceForRole`, que sólo entiende de OWNER y
 * AFFILIATE. Separarlos evita tener que tocar esa función para agregar un
 * ecosistema.
 *
 * El anual es −25%, el mismo descuento que Tienda Pro.
 *
 * ⚠️ **SE COBRA EN PESOS PERO SE GASTA EN DÓLARES — hay que revisarlos.**
 *
 * Estuvieron un rato listados en dólares (US$20 y US$40) justamente por esto, y
 * el 31/08 se decidió pasarlos a pesos: el cliente es un vendedor argentino que
 * paga con tarjeta argentina, y un cobro en dólares desde el exterior le suma
 * percepciones impositivas que encarecen el producto sin que nosotros veamos un
 * peso de esa diferencia.
 *
 * El costo, en cambio, **sigue siendo en dólares** (Anthropic por la IA, Supabase
 * por el egress, Vercel). Con el ebook a US$3 de API:
 *
 *   - Starter ($30.000, 2 ebooks = US$6) se da vuelta con el dólar a ~$15.000.
 *   - Pro ($60.000, 5 ebooks = US$15) se da vuelta con el dólar a **~$4.000**,
 *     y a ~$3.000 si el ebook sale US$4.
 *
 * **Pro es el que se da vuelta primero y por lejos**, porque es el que más IA
 * regala. Si el dólar se mueve fuerte y estos números no, el plan caro pasa a
 * perder plata en silencio. Los topes de `TOPES_DIGITALES` son la otra palanca.
 */
export const PRECIOS_DIGITALES = {
  DIGITAL_STARTER: { MONTHLY: 30000, ANNUAL: 270000 },
  DIGITAL_PRO:     { MONTHLY: 60000, ANNUAL: 540000 },
} as const;

/**
 * La comisión que retiene la plataforma por venta, en por ciento.
 *
 * No es infraestructura nueva: `marketplace_fee` ya viaja en cada preferencia de
 * Mercado Pago (`lib/mp.ts`) llevando la comisión del afiliado. Esto se suma a
 * ese número.
 *
 * ⚠️ Sólo funciona con Mercado Pago. Con transferencia y efectivo no pasa un peso
 * por la plataforma, así que no hay nada que retener — por eso el plan Free no
 * lleva transferencia: se saltearía la comisión entera.
 */
export const COMISION_DIGITAL = {
  FREE: 8,
  STARTER: 6,
  PRO: 2,
} as const;

/**
 * Los topes de cada plan.
 *
 * `paginas` son productos: cada producto digital tiene su propia página de venta,
 * así que son el mismo número. **En la pantalla se dice "páginas de venta" y
 * nunca "tiendas"** — la competencia vende tiendas (una por subdominio) y
 * nosotros no, y prometer lo de ellos sería mentir.
 *
 * `ebooksIA` es el único tope que responde a un costo real: un ebook generado
 * cuesta entre US$2 y US$4 de API. Los otros tres son comerciales.
 */
export const TOPES_DIGITALES = {
  /* Free va con `upsells: 0` y no con `null`: es un tope, no una ausencia. La
     pantalla lo dibuja tachado y sin el número — "0 upsells por producto" se lee
     como un error de programación, no como una función que no tenés. */
  FREE:    { paginas: 1,  bonos: 1, upsells: 0, ebooksIA: 0 },
  STARTER: { paginas: 5,  bonos: 3, upsells: 1, ebooksIA: 2 },
  PRO:     { paginas: 25, bonos: 5, upsells: 3, ebooksIA: 5 },
} as const;
