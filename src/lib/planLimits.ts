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
/**
 * ⚠️ PRO PASÓ DE $60.000 A $89.000 EL 08/09/26, Y NO POR INFLACIÓN.
 *
 * El precio viejo estaba puesto a ojo, sin mirar el mercado. Puesto al lado de
 * la competencia con el dólar a $1.520, la cuenta daba esto:
 *
 * | Plan de ellos | En pesos  | Qué da                        |
 * |---------------|-----------|-------------------------------|
 * | Starter US$20 | $30.400   | 2 tiendas, 2 bonos, 1 upsell  |
 * | Pro US$60     | $91.200   | 3 tiendas, 3 bonos, 2 upsells |
 * | **Max US$100**| **$152.000** | **5 tiendas, 5 bonos, 3 upsells, 2% de comisión** |
 *
 * **Nuestro Pro no equivale a su Pro: equivale a su Max**, ficha por ficha —5
 * páginas, 5 bonos, 3 upsells, 2% de comisión—. O sea que estábamos vendiendo
 * su plan de $152.000 a $60.000: **el 39%**.
 *
 * $89.000 queda **justo abajo de los $91.200 que sale su plan Pro**, y ese es el
 * argumento entero: *por menos de lo que sale su Pro, te damos todo lo de su
 * Max*. Sigue siendo 41% más barato que el plan que iguala.
 *
 * Starter NO se toca: sus $30.000 contra los $30.400 de su Starter están bien
 * puestos, y encima le ganamos en upsells (2 contra 1) y en comisión (6% contra
 * 8%).
 *
 * ── ⚠️ Y ACÁ HAY UNA DECISIÓN PENDIENTE QUE SE VA A OLVIDAR ────────────────
 *
 * **Ellos cobran en dólares y nosotros en pesos.** Su precio sube solo; el
 * nuestro se licúa todos los meses sin que nadie haga nada. Se decidió el
 * 08/09/26 **dejarlo en pesos y revisarlo a mano**, porque un abono que cambia
 * todos los meses incomoda al comprador argentino.
 *
 * El costo de esa decisión es que hay que acordarse. La referencia para revisar:
 * al 08/09/26, con el dólar a $1.520, Pro estaba al 59% del Max de ellos. Si esa
 * proporción cae mucho por debajo, el precio quedó viejo.
 */
export const PRECIOS_DIGITALES = {
  DIGITAL_STARTER: { MONTHLY: 30000, ANNUAL: 270000 },
  DIGITAL_PRO:     { MONTHLY: 89000, ANNUAL: 801000 },
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

/* Acá vivió `TRANSFERENCIA_DIGITAL` (qué planes podían cobrar por transferencia)
   del 01/09 al 14/09/26. Se sacó con la transferencia entera: el único medio de
   cobro de Productos Digitales es Mercado Pago. Ver `TabPagos`. */

/**
 * Los topes de cada plan.
 *
 * `paginas` son productos: cada producto digital tiene su propia página de venta,
 * así que son el mismo número. **En la pantalla se dice "páginas de venta" y
 * nunca "tiendas"** — la competencia vende tiendas (una por subdominio) y
 * nosotros no, y prometer lo de ellos sería mentir.
 *
 * `ebooksIA` es el único tope que responde a un costo real: un ebook generado
 * cuesta **US$0,22** de API, medidos el 07/09/26 (acá decía "entre US$2 y US$4",
 * que era una estimación que nunca se midió — ver el bloque de `ebooksIA` más
 * abajo). Los otros tres son comerciales.
 *
 * ⚠️ Sigue siendo el único con costo real detrás, pero **el costo ya no aprieta
 * como se creía**: los 6 de Pro son US$1,32 al mes, no US$20 a 40. Esa
 * generosidad ya se sacó de acá el 08/09/26 — ver `EBOOKS_IA_ARRANQUE`.
 *
 * ⚠️ Y hay un multiplicador que no estaba contado: **el primer rehacer es
 * gratis** (`reintentos < 1` en la ruta del temario). O sea que una unidad de
 * cupo puede costar DOS generaciones enteras. El número honesto por unidad es
 * US$0,44 y no US$0,22, y el techo duro —10 capítulos más los 6 reintentos, dos
 * veces— es US$1,16. Con eso, Pro son US$2,64 al mes y Starter US$1,76.
 *
 * El rehacer gratis se deja igual: quien recibe un ebook malo y no puede
 * rehacerlo pide devolución, y eso cuesta muchísimo más que 22 centavos.
 *
 * ⚠️ **Las páginas bajaron de 1/5/25 a 1/3/5 el 01/09/26.** El 25 no era generoso,
 * era inerte: un techo que nadie toca no genera ni una sola mejora de plan, y un
 * límite sólo hace plata cuando alguien se choca contra él. De paso desactivaba
 * el argumento entero de la tabla — la competencia vende 1/2/3/5 en CUATRO
 * planes, así que nuestro Starter empataba su plan más caro y Pro lo
 * quintuplicaba. Un número que nadie alcanza no convence a nadie que esté
 * pensando, y a quien sí piensa le avisa que la tabla está inventada.
 *
 * Que el techo de Pro sea 5 y no 10 salió de una discusión que perdí: el que paga
 * Pro no escala con más productos sino con más publicidad y más upsells sobre el
 * embudo que ya le funciona — y eso ya lo cubren `bonos` y `upsells`, que son por
 * producto. Si a los mejores clientes de la competencia les quedara corto el 5,
 * tendrían un plan de 10; tienen cuatro planes y terminan en cinco.
 *
 * Y arrancar apretado es reversible: subirle el tope a una cuenta es un renglón,
 * bajárselo a alguien que ya publicó es ir a despublicarle páginas.
 *
 * En Pro `paginas` y `ebooksIA` ahora coinciden (5 y 5): no existe una página que
 * la IA no pueda llenar. En Starter no coinciden a propósito — que una de las
 * tres la traiga la persona nos evita pagar generación por cada página publicada.
 *
 * ⚠️ **La IA existe en los tres planes; lo que cambia es PARA QUÉ.** Decisión de
 * Flavio (01/09/26), corregida el mismo día mirando la tabla de la competencia.
 *
 * A Free la IA le arma **la página y las fichas** —la cáscara—, y el contenido
 * del ebook lo trae la persona. `ebooksIA: 0` en Free no es negarle la IA: es
 * darle la barata y cobrarle la cara.
 *
 * Los dos motivos, y ninguno es copiarlos:
 *
 *   1. **El costo está al revés de lo que parece.** El ebook es la llamada cara
 *      —**US$0,22 medidos**, ver abajo— y los textos de una página de venta son
 *      centavos. Estábamos regalando lo caro y cobrando lo barato.
 *
 *      ⚠️ MEDIDO EL 07/09/26, y acá decía **US$2 a 4**: un número que nunca se
 *      midió y que estaba entre 9 y 18 veces por encima. Un ebook de verdad —8
 *      capítulos, 4817 palabras, `claude-sonnet-5`— salió **US$0,2223** en 9
 *      llamadas (22.437 tokens de entrada, 17.742 de salida). El techo, con las
 *      10 capítulos que permite el esquema y todas las llamadas agotando su
 *      `max_tokens`, es **US$0,38**: o sea que el PEOR caso posible sigue
 *      estando cinco veces por debajo del piso que decía esta línea.
 *
 *      Qué cambia y qué no: el orden se mantiene —el ebook sigue siendo lo caro
 *      y la página lo barato—, así que la decisión de qué regalar no se mueve.
 *      Lo que cambia es la ESCALA, y con ella el argumento de que los topes de
 *      `ebooksIA` responden a un costo que aprieta: diez ebooks de Pro son
 *      US$2,22, no US$20 a 40.
 *   2. **Free no pide tarjeta.** Un ebook escrito con IA sirve FUERA de la
 *      plataforma: alguien abre diez cuentas y se lleva diez ebooks. Una página
 *      generada no le sirve a nadie afuera. Lo que se regala tiene que ser lo
 *      que no se puede cosechar.
 *
 * Y el gancho de Free no se pierde: lo que impresiona al entrar es ver la tienda
 * armada sola, y eso lo dan los centavos de texto, no los dólares del ebook.
 */
/**
 * El lote de ebooks con IA que se entrega UNA vez, al empezar.
 *
 * Existe porque el mes 1 es cuando se necesita todo y el mes 6 no se necesita
 * nada: el embudo se arma una vez y después se vende. Un cupo mensual da poco
 * justo cuando más falta hace. El número es exactamente **un producto entero** —
 * el principal más sus bonos (Starter 1+2, Pro 1+5).
 *
 * ⚠️ **No se entrega en la prueba, se entrega con el PRIMER COBRO.** Los 7 días
 * son sin tarjeta: darle las 6 generaciones de Pro a alguien del que no tenemos
 * un solo dato de cobro es regalar hasta US$48 por cuenta, tantas veces como
 * cuentas quiera abrir. Durante la prueba va el plan entero con UNA generación.
 *
 * Vive acá y no sólo en el documento porque la tarjeta de planes lo dibuja, y un
 * número que vive nada más que en un `.md` se desincroniza del código — ya pasó
 * dos veces con este mismo archivo el 01/09/26. Cuando la Fase 4 construya el
 * contador, lee esta misma constante.
 */
/**
 * ⚠️ SUBIÓ EL 08/09/26 — Y ES ACÁ DONDE HAY QUE SER GENEROSO, NO EN EL MENSUAL.
 *
 * Starter 3 → 6, Pro 6 → 12. El motivo es el que ya decía este comentario y no
 * se estaba aplicando: **el embudo se arma una vez y después se vende.** El mes
 * 1 se necesita todo y el mes 6 no se necesita nada.
 *
 * Se llegó acá descartando la idea de subir el MENSUAL a 12 en Pro, que fue lo
 * primero que se propuso. Estaba mal por tres motivos:
 *
 *   1. Un tope que nadie alcanza es inerte, y **un límite sólo hace plata
 *      cuando alguien se choca contra él** — el mismo error de las 25 páginas.
 *   2. La competencia da 6 en su plan equivalente. No hay motivo para dar el
 *      doble.
 *   3. Quien genera 12 ebooks por mes no está armando un negocio: está
 *      cosechando ebooks para vender afuera, que es el motivo por el que Free
 *      quedó en 0.
 *
 * ⚠️ ACÁ DECÍA "cuatro productos completos el primer mes (un producto lleno son
 * 6 archivos)". **Son 9** —el principal, 5 bonos y 3 upsells— así que con 12 + 6
 * = 18 llena DOS, no cuatro. El error se encontró el 08/09/26 contando de verdad
 * lo que hace falta para llenar cada plan, y no es inofensivo: sobre ese 6 se
 * había concluido que el mensual alcanzaba, y el mensual de Pro no alcanzaba ni
 * para terminar un producto por mes. Por eso `TOPES_DIGITALES.PRO.ebooksIA` pasó
 * de 6 a 9 el mismo día.
 *
 * Con los números corregidos: un Pro llena **dos productos completos el primer
 * mes** (18 ebooks ÷ 9 archivos) y **uno por mes** después. Cinco productos en
 * cinco meses, que para un catálogo que se arma una vez y después se vende es el
 * ritmo real — nadie carga cinco embudos el mismo día.
 */
export const EBOOKS_IA_ARRANQUE = {
  FREE: 0,
  STARTER: 6,
  PRO: 12,
} as const;

export const TOPES_DIGITALES = {
  /* ⚠️ **Free lleva un upsell, y no es generosidad: es el único tope que en cero
     jugaba en contra nuestra.** En Free no cobramos abono — lo único que
     entra es el 8 % de comisión—, y un upsell SUBE EL TICKET, o sea que sube esa
     comisión. Bloquearlo nos costaba plata a nosotros. Estuvo en 0 hasta el
     01/09/26.

     El mismo argumento explica por qué los upsells suben en los tres escalones
     (1 → 2 → 3) y no se estancan: la comisión baja de 8 % a 6 % a 2 %, así que
     el upsell nos rinde MÁS justo en los planes donde menos abono cobramos.

     ⚠️ Acá decía que `ebooksIA: 1` en Free era "provisorio hasta medir un ebook
     de verdad". **Ya se midió —US$0,22— y Free se revisó el 08/09/26: queda en
     0.** Y no por plata: 22 centavos no le hacen daño a nadie. Queda en 0 porque
     un ebook escrito con IA **sirve fuera de la plataforma**, y Free no pide
     tarjeta: alguien abre diez cuentas y se lleva diez ebooks para vender en
     otro lado. Ese motivo no depende del costo, así que medirlo no lo cambió.

     Free sigue teniendo la IA: le arma la página y las fichas —la cáscara, que
     es lo que impresiona al entrar— y el contenido del ebook lo trae la persona. */
  /* ══════════════════════════════════════════════════════════════════════════
     ⚠️ `ebooksIA` ES "UN PRODUCTO COMPLETO POR MES": 1 + bonos + upsells.
     ══════════════════════════════════════════════════════════════════════════

     Starter 4 → 5 · Pro 6 → 9, el 08/09/26. Y el número dejó de ser una
     opinión: **cada archivo que se entrega necesita su ebook.** Un producto
     completo de Pro son el principal, sus 5 bonos y sus 3 upsells: NUEVE
     archivos. Con 6 por mes no se podía terminar ni un producto por mes en el
     plan más caro. Starter estaba a uno de distancia: 5 archivos, 4 ebooks.

     Se encontró contando de verdad lo que hace falta para llenar cada plan
     (08/09/26), y de paso salió que el comentario de `EBOOKS_IA_ARRANQUE`
     decía **"un producto lleno son 6 archivos"** y son 9. Sobre ese 6 se había
     concluido que Pro llenaba cuatro productos el primer mes; llena dos.

     ⚠️ Antes acá decía "son los mismos números que da la competencia (4 en su
     Starter, 6 en su Pro)". Copiar el número del vecino **sin mirar cuántos
     archivos tiene nuestro plan** es lo que dejó a Pro sin poder completar lo
     que le vendimos: nuestro Pro lleva 5 bonos y 3 upsells, y si el suyo lleva
     menos, el mismo número de ebooks no significa lo mismo.

     El costo de la corrección: tres ebooks más por mes en Pro son **US$1,32**,
     sobre un abono de US$58. Uno más en Starter son US$0,44 sobre US$19,7.

     Free se queda en 0 por el motivo de siempre, que no es la plata: un ebook
     escrito con IA sirve fuera de la plataforma y Free no pide tarjeta.

     ⚠️ Hay un chequeo que exige esta cuenta en los planes pagos. Si algún día se
     tocan `bonos` o `upsells`, falla y obliga a decidir en vez de dejar el
     número viejo callado, que es exactamente lo que pasó acá.

     Lo que de verdad se agrandó el 08/09/26 es el regalo de bienvenida —ver
     `EBOOKS_IA_ARRANQUE`—, que es cuando hace falta.

     Los `bonos` de Pro se quedan en 5, y eso también se revisó el 08/09/26: se
     había propuesto bajarlos a 3 comparando contra el plan *Pro* de la
     competencia, y era la columna equivocada. **Nuestro Pro equivale a su Max**,
     que da exactamente 5 bonos y 3 upsells. Ver `PRECIOS_DIGITALES`.

     ⚠️ Pero el costo de los bonos es real y **no es la IA: es el tráfico.** El
     bono va gratis con la compra, así que CADA VENTA se lleva el principal más
     todos sus bonos —en Pro son 6 archivos—. Eso pega en el egress de Supabase,
     que es donde ya sabemos que aprieta. Si algún día hay que recortar algo de
     Pro, es acá y no en los ebooks. */
  FREE:    { paginas: 1, bonos: 1, upsells: 1, ebooksIA: 0 },
  STARTER: { paginas: 2, bonos: 2, upsells: 2, ebooksIA: 5 },
  PRO:     { paginas: 5, bonos: 5, upsells: 3, ebooksIA: 9 },
} as const;

/* ══════════════════════════════════════════════════════════════════════════
   EL REGISTRO DE PLANES — la única tabla que dice qué planes existen
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A qué producto pertenece cada plan. Dos planes de ecosistemas distintos NUNCA
 * se mezclan: una cuenta es una sola cosa, y su suscripción también.
 */
export type Ecosistema = "TIENDA" | "AFILIADO" | "DIGITAL";

export type DefinicionPlan = {
  ecosistema: Ecosistema;
  /** Lo que se guarda en `Subscription.role`. */
  role: string;
  /** Lo que se guarda en `Subscription.tier`. */
  tier: string;
  /** `null` = no se cobra nunca. La ruta de pago tiene que rechazarlo. */
  precios: { MONTHLY: number; ANNUAL: number } | null;
  /** El nombre que ve la persona: en el checkout de MP, en el mail y en Mi Plan. */
  label: string;
};

/**
 * Todos los planes que existen, con su ecosistema, su rol, su tier y su precio.
 *
 * **Por qué existe esta tabla.** Antes el rol y el tier se deducían mirando el
 * TEXTO de la clave del plan, en el webhook que activa la suscripción:
 *
 *     const safeRole = plan.startsWith("OWNER") ? "OWNER" : "AFFILIATE";
 *     const safeTier = plan === "OWNER_PREMIUM" ? "PREMIUM" : "BASIC";
 *
 * Eso funciona mientras existan dos familias de planes. Con la tercera se rompe
 * en silencio y del peor modo posible: `DIGITAL_PRO` no empieza con "OWNER", así
 * que alguien que paga un plan digital quedaba registrado como **AFILIADO**, y
 * con el tier en "BASIC" recibía los topes del plan chico habiendo pagado el
 * grande. Nadie lo reporta como error: la persona simplemente ve menos de lo que
 * compró.
 *
 * Con la tabla, el rol y el tier son una búsqueda, no una adivinanza. Y agregar
 * un plan es agregar una fila, no acordarse de tres `if` repartidos.
 *
 * **Los precios NO se copian acá**: salen de `PRICES` y `PRECIOS_DIGITALES`, que
 * siguen siendo la única fuente del número. Esta tabla dice qué plan usa cuál.
 */
export const PLANES = {
  OWNER_BASIC:     { ecosistema: "TIENDA",   role: "OWNER",     tier: "BASIC",   precios: PRICES.OWNER_BASIC,                label: "Tienda Pro" },
  OWNER_PREMIUM:   { ecosistema: "TIENDA",   role: "OWNER",     tier: "PREMIUM", precios: PRICES.OWNER_PREMIUM,              label: "Tienda Premium" },
  AFFILIATE:       { ecosistema: "AFILIADO", role: "AFFILIATE", tier: "BASIC",   precios: null,                              label: "Afiliado" },
  DIGITAL_FREE:    { ecosistema: "DIGITAL",  role: "DIGITAL",   tier: "FREE",    precios: null,                              label: "Free" },
  DIGITAL_STARTER: { ecosistema: "DIGITAL",  role: "DIGITAL",   tier: "STARTER", precios: PRECIOS_DIGITALES.DIGITAL_STARTER, label: "Starter" },
  DIGITAL_PRO:     { ecosistema: "DIGITAL",  role: "DIGITAL",   tier: "PRO",     precios: PRECIOS_DIGITALES.DIGITAL_PRO,     label: "Pro" },
} as const satisfies Record<string, DefinicionPlan>;

export type PlanKey = keyof typeof PLANES;

/**
 * La definición de un plan, o `null` si la clave no existe.
 *
 * **Falla cerrado a propósito**, y el `hasOwnProperty` no es paranoia de más: la
 * clave llega del navegador y va directo a buscar un precio. Sin él, un `plan`
 * con valor `"constructor"` o `"__proto__"` devuelve un objeto heredado en vez de
 * `undefined`, y a partir de ahí la validación cree que el plan existe.
 */
export function planDe(key: unknown): DefinicionPlan | null {
  if (typeof key !== "string") return null;
  return Object.prototype.hasOwnProperty.call(PLANES, key)
    ? (PLANES as Record<string, DefinicionPlan>)[key]
    : null;
}

/**
 * El camino inverso: de una suscripción guardada, qué plan es.
 *
 * Lo necesita el prorrateo para saber **cuánto pagó de verdad** quien cambia de
 * plan. Antes eso se deducía del tier solo (`tier === "PREMIUM" ? PREMIUM :
 * BASIC`), o sea que cualquier tier desconocido caía en el plan de tienda más
 * barato: a alguien con plan Starter se le acreditaba el precio de Tienda Pro,
 * plata que nunca pagó.
 */
export function planDeSuscripcion(sub: { role: string; tier: string } | null): PlanKey | null {
  if (!sub) return null;
  const entrada = Object.entries(PLANES).find(
    ([, def]) => def.role === sub.role && def.tier === sub.tier
  );
  return (entrada?.[0] as PlanKey | undefined) ?? null;
}

/**
 * El ecosistema al que pertenece un rol guardado, o `null` si no se reconoce.
 *
 * Mira SÓLO el rol y no el par rol+tier a propósito. Es la pregunta que hace el
 * candado que impide mezclar suscripciones, y ahí conviene ser robusto: una fila
 * vieja con un tier raro tiene que seguir identificándose como "de tienda" en vez
 * de caer en "no sé qué es". Para el prorrateo, que necesita el precio exacto,
 * está `planDeSuscripcion`, que sí exige el par completo.
 */
export function ecosistemaDeRol(role: string | null | undefined): Ecosistema | null {
  if (!role) return null;
  return Object.values(PLANES).find((def) => def.role === role)?.ecosistema ?? null;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL INTERRUPTOR DE PRODUCTOS DIGITALES
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ¿Está abierto Productos Digitales?
 *
 * Vive acá y no copiado en cada pantalla porque no es sólo una decisión de
 * dibujo: **también decide si sus planes se pueden cobrar**. Estaba escrito a
 * mano en cuatro archivos y ninguno de los tres que mueven plata lo miraba, así
 * que con el producto apagado igual se podía pagar un plan digital pegándole
 * derecho a la ruta de pago. Se cobraba de verdad, y lo que se recibía era una
 * pantalla que dice "el panel se está construyendo".
 */
export const DIGITALES_ABIERTO = process.env.NEXT_PUBLIC_DIGITALES_ENABLED === "1";

/**
 * Un plan que existe en el registro pero **todavía no se puede comprar**, porque
 * su producto no está abierto al público.
 *
 * Es distinto de un plan sin precio: éste tiene precio y algún día se va a
 * cobrar. Hoy no.
 */
export function planCerrado(def: DefinicionPlan): boolean {
  return def.ecosistema === "DIGITAL" && !DIGITALES_ABIERTO;
}
