# PLAN — SECCIÓN DE PROMOCIONES

> Creado: 2026-07-17 | Workflow: 🔲 pendiente | 🔄 en progreso | ✅ hecho | ❌ descartado con justificación
> Objetivo: sacar los descuentos de adentro del formulario de producto y convertirlos en una
> entidad propia del panel, con reglas de combinación explícitas y una sola cuenta compartida.

## 📍 ESTADO ACTUAL (se actualiza a medida que avanzamos)

- ✅ **Fase 1 — Motor único de precios. COMMITEADO (`25a649d`, 17/07), sin deploy.**
  - `src/lib/pricing.ts` (función pura) + `pricing.check.ts` (11 casos verdes).
  - Enchufado en las 4 puntas: checkout, useCartLogic, CartDrawer, preview del modal.
  - `resolveBasePrice` unifica mayorista + escalones.
  - `OrderItem.lineTotal` nuevo (migración aditiva nullable). ✅ APLICADA a la base (prisma migrate deploy, 17/07).
  - Bugs cerrados: B-01, B-03, B-04, B-05. B-06 documentado (intencional).
- ✅ **Fase 2 — Modelo `StorePromotion` + sección + MOTOR. COMPLETA (17/07, sin deploy).**
  - ✅ Prototipo visual aprobado por Flavio (fondo claro, redondeado, indigo, íconos lucide, tabs
    Activas/Historial, flujo de 5 pasos, explicación de cada tipo, selector cat/productos).
  - ✅ Modelo `StorePromotion` + migración `20260717010000_add_promotion` (tsc/validate ok).
    ✅ APLICADA a la base (prisma migrate deploy, 17/07) — la tabla ya existe y la sección carga.
    FK vuelta idempotente (DO block) por si se corre 2 veces. Registrada, el deploy real la saltea.
    OJO: se llama StorePromotion, no Promotion — ya existe un `Promotion` (banners del admin marketplace).
  - ✅ API CRUD: `src/lib/promotions.ts` (validación+estado, autoridad server) +
    `/api/dashboard/promociones` GET/POST + `[id]` PATCH(editar/pausar/archivar)/DELETE.
    OJO: va en `/api/dashboard/promociones`, NO `/api/promociones` (ese es de los flyers del
    marketplace). Coherencia de inputs por tipo ya implementada en validatePromotionBody. tsc+eslint ok.
  - ✅ Sección real `/dashboard/promociones`: `page.tsx` (server) + `PromocionesClient.tsx` (lista,
    tabs Activas/Historial, wizard de 5 pasos con selector cat/productos, toggle/archivar/restaurar/
    eliminar). Ítem en el sidebar (DashboardLayout, ícono BadgePercent). Estilo Tailwind del panel
    real. build ✓. Se puede crear/listar/pausar/archivar promos de verdad.
  - ✅ Motor: `priceCart(items, { promotions })` resuelve StorePromotion → precio (scope ALL/CAT/PRODUCTS,
    fechas, compra mínima sobre subtotal SIN promo; PERCENT/FIXED por unidad con piso en 0/N_PAY_M mismo
    producto/FREE_SHIPPING). **best-of por línea**: entre la promo del producto y las de tienda gana la
    más barata, NUNCA se apilan (apilar dos promos = combinesWithPromotions, Fase 3). Devuelve también
    `freeShipping` y `couponsAllowed`. 12 casos nuevos en pricing.check.ts (SP-A..L), todos verdes; los
    congelados de Fase 1 (A–J) intactos.
  - ✅ Enchufado en las puntas: checkout (autoridad, relee promos de la base dentro de la transacción,
    cobra con promo, envío gratis a 0, gate de cupón) · `/api/public/[slug]` expone las vigentes ·
    useStorefront/useCartLogic/CartDrawer/CheckoutModal + páginas /productos y detalle de producto.
    El carrito muestra el mismo total que cobra el checkout (invariante de Fase 1). tsc + eslint + build ✓.
  - ✅ `combinesWithCoupons` RESPETADO ya (el wizard lo promete): si una promo activa no combina, el
    cupón no entra —ni en el server ni en el cliente, que oculta el campo—. `combinesWithPromotions` no
    lo expone el wizard (default false → best-of ya lo respeta).
  - ⏭️ Lo que NO entra acá (a propósito): el **piso de costo** (aviso a la dueña, no frena al comprador)
    y el **panel de "qué se aplicó y qué no"** son Fase 3. Los **badges/tachado/contador en las cards y
    modales** son Fase 4.5 (hoy el descuento se ve en el TOTAL del carrito y el checkout, no en la ficha).
  - Decisiones cerradas: N×M mismo producto (mezclar = Fase 5); se caducan solas por fecha; se archivan
    no se borran (salvo las nunca usadas); coherencia de inputs form+server.
- 🔲 **Decisión combinación (17/07)**: NO apilamos dos promos sobre el mismo producto → **gana la más
  barata** (estilo Shopify: "un descuento de producto por ítem"). El apilado con casilla (estilo
  Tiendanube, `combinesWithPromotions`) queda para más adelante SOLO si una dueña real lo pide. Motivo:
  protege el margen y no confunde a emprendedoras. Verificado en la doc de las dos plataformas.
- ✅ **Fase 3 — Piso de costo. COMPLETA. COMMITEADO (`0d353f5`, 18/07), sin deploy.**
  - `promotions.ts`: `promoEffectiveUnitPrice` (reusa el MOTOR, no duplica la cuenta) + `costFloorCheck(promo, products)`
    → `{ below[], missingCost, inScope }`. FREE_SHIPPING corta antes (no toca precio). 7 casos en pricing.check.ts (CF-A..F), verdes.
  - Wizard (paso Confirmar): cartel ámbar con los productos que quedan bajo costo (queda $X / cuesta $Y) + nota de
    "N sin costo cargado". **NO bloquea crear** (gancho/liquidación es válido) — es la regla de Flavio.
  - Lista: chip "bajo costo" en las promos vivas que venden algo bajo costo.
  - `page.tsx` trae `costPrice`. Aviso a la dueña, NUNCA candado al comprador (el checkout no cambió). tsc+eslint+build ✓.
  - Aviso "aviso en pedidos" (notificar cuando un pedido real vende bajo costo) queda como opción C aditiva, NO hecho.
- ✅ **Fase 4.5 — Display de la promo en TODA la tienda. COMMITEADO (`d610115`, 18/07), sin deploy.**
  - Componente compartido `PromoDisplay.tsx` (`PromoTag` naranja + `PromoBlock` explicativo) + `describePromo()`
    en `promoDisplay.ts` (headline + alcance + condiciones, estilo Tiendanube). Promo (naranja) ≠ Oferta (rojo).
  - En /productos (cards+modal), los **8 templates** (homes + modales de Moda) y el **detalle** (genérico + los 4
    temáticos vía `productDetail/shared.tsx`). `resolveProductPromo` devuelve `primaryPromo` para describir la que gana.
  - Bugs cerrados: redondeo a peso entero (`roundCents`→`roundMoney`, mostrado==cobrado); botón "Agregar al carrito"
    mostraba precio de lista; "29 productos elegidos" (GET parsea arrays); validación de inputs del wizard.
  - Extras dashboard: emoji picker en el nombre; marca Promo/Oferta en la lista de productos (tabla+grilla);
    grilla con acciones a igual ancho + "Editar" solo ícono; filtro "En promoción" en /productos.
- 🔄 **Post-4.5 (en curso, sin commit):**
  - ✅ **Ver/Editar promo**: el wizard reusado en modo edición (pre-cargado), abre en el paso 5 (= DETALLE de lo
    elegido), "Atrás" para cambiar cualquier paso, "Guardar cambios" vía PATCH. Lápiz ✏️ en cada promo activa. build ✓.
  - ✅ **3×2 en vivo**: cartel en el modal que cambia con la cantidad ("sumá 1 más y una gratis" → "🎉 Llevás 3,
    pagás 2"); el total del botón refleja el N×M. En /productos + los 4 modales de Moda + el detalle (genérico y temático). build ✓.
  - ✅ **Envío gratis en vivo**: helper `freeShippingProgress(items, promotions)` en pricing.ts (reusa `promoMatchesCart`,
    mismo preSubtotal que el motor) → `useCartLogic` expone `freeShippingGoal` → cartel en el CartDrawer compartido
    (8 templates + detalle) y en /productos: "🚚 Agregá $X y el envío es gratis" / "🎉 ¡Tenés envío gratis!". 4 casos FS-A..D verdes.
- 🔄 **Fase 6 — Repaso funcional tipo por tipo (22/07, EN ESTO con Flavio).** Ver la sección de la
  fase para la cola de trabajo completa. Resumen: la suite congelada corre entera en verde; los
  hallazgos salieron de sondear casos que **no** cubría. Abiertos: 🔴 **B-07** (`FIXED` puede dejar el
  producto en $0) · 🟠 **B-08** (promo sin descuento igual bloquea el cupón) · 🟠 **B-09** (el wizard
  limita a una categoría y al editar trunca) · debates **#11** y **#12** (envío gratis) · dos textos
  confusos del wizard (**F6-C1**, **F6-C2**). Ninguno tocado: primero se ordena y se debate. Todo lo que
  salga de esta ronda entra en la Fase 6.
- 🔲 **ANOTADO — pendientes / decisiones (18/07):**
  - **Stats reales** ("ventas con promo" / "ahorro"): hoy $0 placeholder. Necesitan **vínculo Order↔promo** (columna
    nueva en Order con el ahorro). Requiere **migración → solo funciona post-deploy** (base local = producción).
    **Decisión de Flavio: dejarlo para el deploy** (no meterlo en main local para no romper pedidos).
  - **Black Friday**: NO es un tipo de promo — es una **capa visual** sobre una promo normal. Diseño acordado:
    un **interruptor "Evento Black Friday"** en el wizard (apagado por defecto; la FECHA no lo decide, el interruptor sí)
    → el `PromoTag`/`PromoBlock` se pintan **negros** automáticamente en TODA la tienda (leverage del componente compartido)
    + banner con **countdown** opcional (usa `endsAt`). **Requiere migración** (columna `isBlackFriday`/`eventType` en
    StorePromotion) → mismo caso que stats: **va en el batch de deploy**, no se testea en local.
  - **Mix & match** ("llevá 3 productos DISTINTOS de la misma/otra categoría y pagá 2"): **NO existe.** El N×M actual es
    del **mismo producto**. Es **Fase 5** (la más cara, la menos pedida). No arrancar por acá.
- 🔲 Pendiente aparte: B-02 (mayorista puerta de una vía), **deploy de Fase 1+2+3+4.5** (commiteadas local
  `25a649d`/`64ac3da`/`0d353f5`/`d610115`, sin pushear).

---

## POR QUÉ — el diagnóstico, con evidencia

Flavio: *"no me cierra, tenemos ofertas y promociones en el formulario"*. Tenía razón, y al abrir
el código el problema es más grande que la sensación.

### 1. Los descuentos son atributos del producto, no entidades

Hoy conviven **cuatro sistemas** de descuento sin un lugar común:

| Sistema | Dónde vive | Qué hace | ¿Motor o cartel? |
|---|---|---|---|
| **Oferta** | campos del producto (`comparePrice`, `offerBadge`, `offerNote`, `offerEndsAt`) | precio tachado + badge | **cartel** — no calcula nada |
| **Promo por cantidad** | campos del producto (`promoQtyMin`, `promoType`, `promoQtyDiscount`, `promoPayQty`) | % o N×M en el carrito | motor |
| **Mayorista** | campos del producto (`precioMayorista`, `cantMinMayorista`, `preciosEscalonados`) | precio por volumen | motor |
| **Cupones** | tabla propia (`Coupon`) + sección propia del panel | código en el checkout | motor |

**Consecuencia directa**: para hacer *"20% off en todas las remeras"* hay que entrar **producto por
producto** y editar el precio a mano. Con 80 productos es impracticable — y para levantar la promo,
otra vez los 80. Es exactamente lo que Flavio describió: *"nuestras ofertas son individuales, las
cargamos a mano una por una"*.

### 2. La cuenta del descuento está escrita en 20 archivos

`grep promoQtyMin` → **145 apariciones en 20 archivos**:

```
src/hooks/useStorefront.ts                41   ← el más pesado
src/app/dashboard/productos/nuevo/page.tsx 16
src/hooks/useCartLogic.ts                 12
src/app/api/checkout/route.ts             11   ← el único que manda
FashionNoir / ChicParis / BohoTerra        8 c/u
src/app/tienda/[slug]/productos/page.tsx   8
UrbanPulse                                 6
src/lib/email.ts                           6
CartDrawer                                 4
ProductDetailClient                        4
...
```

Es la misma enfermedad que acabamos de curar con los reels (6 copias), pero **sobre la plata** y con
el triple de tamaño. Si mañana cambia una regla de descuento, hay que tocar 20 lugares y el que se
olvide uno hace que el carrito muestre un precio distinto al que cobra el checkout.

### 3. Todo se acumula, siempre, y no hay interruptor

El orden de aplicación real ([checkout/route.ts:336-441](src/app/api/checkout/route.ts)):

```
basePrice (variante o producto)
  → mayorista        si qty >= cantMinMayorista
  → promo cantidad   × (1 - pct/100)
  → subtotal
  → cupón            - discountAmount
  → total
```

Los tres motores se aplican **en cascada, siempre**. No existe forma de decir *"esta promo no se
combina con cupones"*. El propio formulario lo admite en un cartel amarillo:
*"el cliente que compra N+ unidades obtiene ambos beneficios acumulados"*.

**Riesgo real**: oferta 30% + promo 3×2 + cupón 24% puede dejar el producto **abajo del costo**. Hoy
nada lo frena, y el dueño se entera cuando mira la rentabilidad.

### 4. La promo solo entiende "el mismo producto"

El schema es explícito: *"aplica cuando el cliente suma promoQtyMin o más unidades **del mismo
producto**"*. No existe *"llevá un pantalón + una remera + una campera y tenés 20%"*. Shopify (Buy X
get Y sobre colecciones) y Tiendanube (promos por categoría) sí lo hacen.

### 5. Los topes son números mágicos locales e inconsistentes

```ts
const MAX_COUPON_DISCOUNT = 50_000;   // checkout/route.ts:407
const MAX_REWARD_DISCOUNT = 100_000;  // checkout/route.ts:434
```

Declarados **adentro de la función**, sin explicación, y un cupón de premio puede descontar **el
doble** que uno normal. Nadie decidió eso: quedó así.

### 6. Lo que SÍ está bien (y hay que no romper)

**El servidor recalcula todo desde la base y nunca le cree al cliente.** Precio, mayorista, promo y
cupón se revalidan en `checkout/route.ts` dentro de una transacción, con decremento atómico de stock.
Es una base sólida: el motor nuevo tiene que vivir ahí, no reemplazarla.

---

## LA FOTO REAL DE LA BASE (consultada 17/07/2026 — no supuesta)

| | Cantidad |
|---|---|
| Productos activos | **58** |
| Con **promo por cantidad** (`promoQtyMin`) | **1** — `PERCENT`, min 3, 25% |
| Con **oferta** (`comparePrice`) | **16** |
| Con **precio mayorista** | **0** |
| Con **costo cargado** (`costPrice`) | **0** 🚨 |
| Cupones activos | 2 |

### ⚠️ Contexto imprescindible para leer esta tabla

Los 58 productos son de **las cuentas de la hermana y la amiga de Flavio, que todavía no entraron con
las actualizaciones nuevas: nunca vieron la sección de promociones ni de ofertas**. Y la única promo
cargada **es una prueba que hizo Flavio** en la cuenta de Laura.

**Entonces estos números NO son datos de uso.** No dicen que la promo "no guste" ni que "sea
incómoda": dicen que **nadie la vio todavía**. Cualquier conclusión sobre comportamiento de usuarios
sacada de acá sería inventada.

> Nota de honestidad: en la primera versión de este documento se concluyó *"la promo no se usa porque
> es incómoda"* a partir del 1 vs 16. Era una teoría de comportamiento apoyada en datos que no la
> sostienen. Queda registrada como error para no repetirlo: **los números decían cuántos, no por qué.**

### Lo que sí se puede concluir

**1. No hay absolutamente nada que migrar.** La única promo es una prueba → se borra. **Cero backfill,
cero red de seguridad, cero columnas que sobrevivan.** Se elimina todo junto: código y columnas, en el
mismo commit. (La cautela que se había propuesto era para proteger un registro de prueba.)

**2. El piso de costo hoy no tiene con qué funcionar.** Cero de 58 productos tienen `costPrice` — pero
ojo, **tampoco vieron ese campo**, así que no es que se nieguen a cargarlo. El piso no se puede
construir hasta que el dato exista; no porque la gente no quiera, sino porque el producto todavía no
se lo pidió a nadie.

🔲 **Consecuencia**: el piso **se difiere**. Construir una alarma desconectada no protege a nadie.

**3. Es el mejor momento posible para rehacerlo.** 58 productos, 0 promos reales, 0 mayorista, y los
usuarios todavía no vieron la versión vieja. **No hay nada que desaprender ni nadie a quien romperle
una costumbre.** Con 5.000 productos y usuarios acostumbrados, esta conversación sería otra.

**4. El diseño no puede apoyarse en datos de uso, porque no existen.** Las decisiones salen del
criterio de Flavio sobre el mercado y de lo que hacen Shopify y Tiendanube — no de esta tabla.

---

## 🚨 BUG ENCONTRADO AL EMPEZAR LA FASE 1 — el carrito le miente al checkout

Al comparar la primera pareja de "papeles" (el carrito vs. la caja), apareció una desincronización
real. **De plata, y en contra del comprador.**

### Los hechos verificados

- `getEffectiveWholesalePrice()` —la función que aplica los escalones de precio mayorista— existe en
  **un solo archivo**: [useCartLogic.ts:355](src/hooks/useCartLogic.ts). Solo en el navegador.
- `src/app/api/checkout/route.ts` —el único código que **de verdad cobra**— tiene **cero** menciones a
  `preciosEscalonados`. No sabe que los escalones existen. Su cuenta es:
  ```ts
  const wholesaleOrBasePrice = (wholesale && minQty && item.quantity >= minQty) ? wholesale : basePrice;
  ```
  Usa `precioMayorista` a secas, sin mirar las bandas.
- El schema obliga a que el escalón sea **menor** que `precioMayorista`
  ([schema.prisma:363](prisma/schema.prisma)) → la diferencia **siempre** perjudica al comprador.
- La migración `20260630200000_add_wholesale_tiers` agregó los escalones **a la vidriera y nunca a la
  caja**.

### El síntoma

Tienda con mayorista $1.000 y escalón *"desde 10 unidades, $800"*. El comprador lleva 10:

| | Cuenta |
|---|---|
| **Carrito** (lo que ve) | 10 × **$800** = $8.000 |
| **Checkout** (lo que se cobra) | 10 × **$1.000** = $10.000 |

**Se le cobran $2.000 de más.**

### Por qué no explotó

**Cero de los 58 productos tienen `precioMayorista` cargado** — pero no porque nadie lo quiera: la
sección entera de mayorista (precio + escalones) solo aparece en el formulario si la tienda tiene
`tieneVentaMayorista` activado ([nuevo/page.tsx:1943](src/app/dashboard/productos/nuevo/page.tsx)), y
ninguna de las dos tiendas lo prendió. **El campo ni existe hasta que activás mayorista en el modal de
rubro o en Configuración.**

Es una mina enterrada con **dos seguros** (activar mayorista + cargar un escalón), no un incendio. Pero
sigue armada: el día que una tienda active mayorista y configure escalones, empieza a cobrar de más
sin que se entere nadie — ni ella ni la compradora, hasta que alguien reclame. Está a un toggle de
distancia, no desactivado para siempre.

> Otra vez la misma lección: el "0" no significa "no lo quieren", significa "no llegaron al switch".
> El dato dice cuántos, nunca por qué.

### 🐛 Bug aparte encontrado acá: el mayorista es una puerta de una sola dirección

Verificando por qué está en 0 apareció otro problema, **no relacionado con promociones** pero real:

El toggle que **prende** el mayorista solo aparece en **un** lugar: el modal de tipo de tienda la
**primera vez** (`isEditing=false`, [layout.tsx:79](src/app/dashboard/layout.tsx)). En las otras dos
puertas no se puede prender:

- **"Cambiar tipo de tienda"** ([ChangeStoreTypeButton:46](src/app/dashboard/productos/ChangeStoreTypeButton.tsx))
  abre el modal con `isEditing=true` → el toggle está oculto ([StoreTypeModal:393](src/app/dashboard/productos/StoreTypeModal.tsx)).
- **Cambio de rubro** ([reset:213](src/app/api/store/reset/route.ts)) **apaga** el mayorista a la
  fuerza (`tieneVentaMayorista: false`).
- **Configuración** ([:775](src/app/dashboard/configuracion/page.tsx)) solo muestra los ajustes de
  mayorista **si ya está prendido** — no es un switch para prenderlo.

**Consecuencia**: si no elegiste mayorista al crear la tienda, o si alguna vez cambiaste de rubro,
**no hay forma en toda la UI de volver a activarlo** — solo tocando la base. Es una decisión
irreversible tomada en el peor momento (al registrarte, cuando todavía no sabés si vas a vender por
mayor). 🔲 A resolver aparte del plan de promociones: un toggle de mayorista en Configuración.

### Qué se hace con esto

**No se parchea suelto.** Arreglarlo hoy en el checkout sería escribir la cuenta por vigesimoprimera
vez, que es exactamente el problema. **Se arregla solo, y para siempre, cuando la Fase 1 deje una sola
lista de precios en la pared.**

> Este bug es la mejor defensa del plan: se había escrito *"no sabemos si los 20 papeles ya están
> desincronizados; nada garantiza que coincidan"*. **La primera comparación encontró uno.**

🔲 **A verificar en la Fase 1**: quedan 18 "papeles" más sin comparar. Este apareció en el primero.

---

## CÓMO LO HACEN LOS DEMÁS (verificado en su documentación)

| | Shopify | Tiendanube | Nosotros hoy |
|---|---|---|---|
| **Dónde se crea** | sección **Discounts** propia | sección **Promociones** propia | campos en cada producto |
| **A qué apunta** | productos, colecciones, pedido, envío | productos, categorías, toda la tienda | un producto |
| **Combinación** | elegís **con qué clases** combina (producto/pedido/envío) | casillas **"Combinar con"**, por defecto NO combina | **siempre combina, sin opción** |
| **Candados** | un producto en Buy X get Y **no acepta** otro descuento de producto; un solo descuento de envío por pedido | reglas por promo | ninguno |
| **Precio tachado** | `compare-at price`, **separado del motor** (necesita app de terceros para el tachado) | precio promocional | `comparePrice` |

**El dato que valida a Flavio**: Shopify dice explícitamente que *"los descuentos son distintos del
precio de oferta con compare-at price"*. O sea: **"Oferta" (cartel) y el motor de descuentos son dos
cosas distintas, y está bien que lo sean.** Lo raro no es tener "Oferta" en el producto — lo raro es
que **el motor** también viva ahí.

Fuentes: [Shopify — Combining discounts](https://help.shopify.com/en/manual/discounts/discount-combinations) ·
[Shopify — Discount types](https://help.shopify.com/en/manual/discounts/discount-types) ·
[Tiendanube — Reglas para combinar descuentos](https://ayuda.tiendanube.com/es_ES/123465-cupones-y-promociones/cuales-son-las-reglas-para-combinar-descuentos-en-tiendanube)

---

## ENVÍO GRATIS — qué se puede y qué no (verificado)

Flavio: *"con el tema de envíos gratis cómo vamos a hacer eso, si nuestro sistema de envío ni
existe"*. **Sí existe**, y esto cambia la respuesta.

### Lo que hay hoy y funciona

Cada tienda configura sus métodos ([types/store-config.ts:30](src/types/store-config.ts)):

```ts
type ShippingMethod = {
  id, label, price,        // precio FIJO que pone el dueño
  coordinar: boolean,      // true = se arregla por afuera, price = 0
  enabled, isPickup,
  liveQuote?: boolean,     // cotización en vivo — hoy apagada
}
```

Por defecto: retiro en local, envío estándar, envío nacional. El checkout resuelve el método, suma
`shipping.cost` al total, y **eso ya anda**.

### Lo que NO funciona, y está apagado a propósito

La cotización automática por código postal (Envíopack). Está construida (`src/lib/enviopack.ts`,
`cotizarEnvio`) pero `LIVE_QUOTE_SHIPPING_METHODS` viene con `enabled: false`, y el comentario del
código explica por qué:

> *"Envíopack requiere resolver el ID de localidad (no alcanza con el código postal) y eso todavía no
> está implementado. Ofrecer ese método ahora haría que se cobre $0 siempre, sin que la tienda lo sepa."*

Alguien ya tomó la decisión correcta: **apagarlo antes que cobrar mal**. No lo tocamos.

### Conclusión: envío gratis SÍ entra, y no depende de los correos

*"Envío gratis a partir de $50.000"* = si el subtotal supera X, `shipping.cost = 0`. Como los métodos
**ya tienen precio fijo**, esto se puede hacer hoy sin resolver nada de Envíopack.

⚠️ **La trampa**: en un método con `coordinar: true` el precio es $0 y se arregla por afuera. Ahí
"envío gratis" no significa nada — hay que impedir la promo o avisarle al dueño. Es fácil de pisar.

🔲 **A decidir**: ¿`FREE_SHIPPING` entra como tipo de promoción en la Fase 2, o se difiere?
Mi recomendación: **entra**. Es de las promos que más venden, y el trabajo es chico porque la
infraestructura de precio fijo ya está.

> Nota aparte: cuando Envíopack habilite la cuenta marketplace y se implemente el ID de localidad, el
> envío gratis sigue funcionando igual — pone en 0 lo que sea que devuelva el cotizador. No hay que
> rehacerlo.

---

## MÉTRICAS — la regla que no se puede romper (verificado)

Flavio: *"acordate que todas estas promos, a la hora de sacar cálculos en las métricas, tienen que
coincidir"*. **Hoy coinciden**, y hay que entender por qué para no romperlo.

### Cómo funciona hoy

- La **promo por cantidad** viene horneada en `OrderItem.price` (checkout/route.ts:364-372), con
  `costAtSale` congelado al momento de la venta. Si después editás el costo, el pedido viejo no cambia.
- El **cupón** descuenta a nivel pedido (`Order.discountAmount`), no por ítem. Para que la
  rentabilidad por producto no mienta, `calcItemNetRevenue` ([margin.ts:50](src/lib/margin.ts))
  **reparte ese descuento proporcionalmente** al peso de cada ítem en el subtotal:

```ts
const share = itemRevenue / orderSubtotal;
return Math.max(0, itemRevenue - orderDiscount * share);
```

> *"El total general (sumando todos los productos) siempre da exacto — el prorrateo solo afecta el
> desglose por producto individual cuando ese pedido puntual tuvo cupón."*

### La regla para cualquier promo nueva

| Tipo de promo | Dónde tiene que terminar | ¿Las métricas la ven? |
|---|---|---|
| Por ítem (%, N×M, por categoría) | `OrderItem.price` | ✅ solo |
| Del pedido entero (% off total) | `Order.discountAmount` | ✅ solo, prorrateada |
| **Envío gratis** | `shipping.cost` | ❌ **NO — agujero** |

### ⚠️ El agujero del envío gratis

El envío **no entra en el margen**. Si regalás el envío, lo pagás vos, y en Métricas la ganancia sale
**inflada**: nadie registra lo que le pagás al correo. Hoy `Order.shippingCost` guarda lo que pagó el
*comprador*, no lo que te cuesta a *vos*.

🔲 **A decidir**: ¿el envío gratis se registra como un costo del pedido para que la rentabilidad no
mienta? Requiere saber cuánto te cuesta el envío de verdad — dato que hoy no existe en ningún lado.
Opción mínima honesta: marcar el pedido como "envío bonificado $X" y **restarlo del profit**, usando
el precio del método que se bonificó (que sí lo sabemos: es el precio fijo configurado).

---

## CUPONES + PROMO ACTIVA

Flavio: *"si tenemos una promo activa, ¿podemos activar los cupones?"*

**Hoy**: se apilan siempre, sin opción. `promo por ítem → subtotal → cupón sobre el subtotal rebajado`.

### La propuesta de Flavio (mejor que la original): avisar al activar el cupón

> *"¿no es mejor no poder activarlos si hay una promo activa? Por ejemplo, si quiero activar, que
> salga un cartel 'tenés una promo activa bla bla bla'"*

Es el **mismo principio del piso** — frenar al dueño, no al comprador — aplicado a los cupones. Va.

Matiz: bloquear del todo es demasiado. Una promo puede ser **solo de una categoría** (3×2 en Remeras),
y el dueño puede querer un cupón para otra cosa. Si prohibimos el cupón cada vez que hay *cualquier*
promo activa, las dos cosas no conviven nunca.

**Dos capas, no una:**

1. **Al activar el cupón** (panel): cartel *"Tenés 2 promociones activas (3×2 en Remeras). Este cupón
   se va a sumar encima. ¿Querés que se combinen?"* → sí/no. Eso setea `combinesWithCoupons` en la
   promo (o el flag equivalente en el cupón).
2. **En el checkout**: si el dueño dijo que no, y el carrito tiene un producto con esa promo, el cupón
   se rechaza con un mensaje que nombra el conflicto: *"Este cupón no se puede usar con la promo 3×2
   que ya tenés en el carrito"*.

La capa 2 hace falta igual: el cupón se usa **después**, en un carrito que al activarlo no conocíamos.

🔲 **A decidir — qué hace el checkout cuando el cupón NO combina:**

- **Opción A (simple)**: se rechaza el cupón **entero**, con mensaje claro. Predecible y explicable.
- **Opción B (justa)**: el cupón se aplica **solo a los ítems sin promo**. Más justo, más complejo, y
  más difícil de explicar en la caja.

**Recomendación: A.** Y hay una razón técnica además de la de UX: con la B el cupón deja de ser
"descuento del pedido" y pasa a ser por ítem → **rompe el prorrateo de `calcItemNetRevenue`** y las
métricas dejan de coincidir. La B no es solo más trabajo: arrastra la rentabilidad.

---

## EL PISO DE COSTO — que no lo pague el comprador

Flavio: *"y poner un piso, ¿cómo debería funcionar?"*

### El problema, con números

Una remera que **te cuesta $10.000** y vendés a **$20.000**:

| Paso | Precio final | Tu ganancia |
|---|---|---|
| Precio normal | $20.000 | +$10.000 ✅ |
| + oferta 30% | $14.000 | +$4.000 ✅ |
| + promo 3×2 (efectivo por unidad) | $9.333 | **−$667** ❌ |
| + cupón del cliente 20% | $7.466 | **−$2.534** ❌ |

Vendés 30 y **perdés $76.000**. Cada venta te saca plata. Hoy **nada te frena**: las tres se activan
por separado y ninguna sabe de la otra.

### Las tres formas de poner el piso — dos son malas

| | Qué hace | Veredicto |
|---|---|---|
| Bloquear en el checkout | el cliente llega con su cupón y le tira error | ❌ perdés la venta por un error **tuyo** de configuración |
| Recortar el descuento callado | el cupón dice 30% y da 12% | ❌ el cliente siente que le mentiste |
| **Frenar al dueño al crear la promo** | el panel calcula y avisa: *"esta promo + tus cupones activos deja 12 productos abajo del costo"*, y muestra cuáles | ✅ |

**El comprador nunca debería comerse nuestro error de configuración.** El freno va antes, en el panel.

Complemento: una alerta después del hecho (*"3 pedidos de esta semana se vendieron bajo costo"*), que
se apoya en `costAtSale` que ya se guarda.

⚠️ **El límite honesto**: el piso **solo existe si el producto tiene el costo cargado**, y hoy
`costPrice` es opcional. Las métricas ya contemplan el "sin dato" y nunca muestran ganancia 0 cuando
falta el costo (`profit: null`). En un producto sin costo **no hay piso posible** — y eso no se puede
inventar. La respuesta correcta es empujar a que carguen el costo, no fingir que lo sabemos.

---

## DECISIONES A DEBATIR (antes de tocar código)

| # | Pregunta | Mi recomendación | Estado |
|---|---|---|---|
| 1 | ¿"Oferta" se queda en el producto? | **Sí.** Es el `compare-at` de Shopify: un cartel del producto, no una promo. Sacarlo sería copiar mal | 🔲 |
| 2 | ¿La promo por cantidad sale del producto? | **Sí.** Es un motor y tiene que ser una entidad. Es el corazón del cambio | 🔲 |
| 3 | ¿Mayorista sale del producto? | **No.** Es una lista de precios, no una promoción. Otro problema, otro plan | 🔲 |
| 4 | ¿Los cupones se unifican con Promociones? | **No ahora.** Ya funcionan y tienen su sección. Que el motor los contemple, pero no migrarlos | 🔲 |
| 5 | Por defecto, ¿las promos combinan? | **No** (como Tiendanube). Es el default seguro: que acumular sea una decisión, no un accidente | 🔲 |
| 6 | ¿Qué pasa con las promos ya cargadas? | Migrar cada producto con `promoQtyMin` a una `Promotion` que apunte solo a él. **Nadie pierde nada** | 🔲 |
| 7 | ¿Piso de precio? | **Sí, avisando al dueño al crear la promo — nunca bloqueando al comprador.** Best effort: protege los productos con costo y **dice en voz alta** cuáles no puede proteger | ✅ |
| 7d | ¿El costo pasa a ser obligatorio? | **No.** Shopify también lo tiene opcional y su reporte degrada igual que el nuestro. Obligarlo rompe a las 58 fichas que ya existen | ✅ |
| 7b | ¿Cupón con promo no-combinable? | **Opción A**: se rechaza el cupón entero con mensaje claro. La B rompe el prorrateo de las métricas | 🔲 |
| 7c | ¿El envío bonificado se resta del profit? | **Sí** — si no, regalás el envío y Métricas te miente la ganancia. Ver el agujero en la sección de Métricas | 🔲 |
| 8 | ¿Promos por categoría en la Fase 1? | **Sí.** Es el 80% del valor: *"20% off en remeras"* con un click | 🔲 |
| 9 | ¿Mix & match (pantalón + remera + campera)? | **Fase 5.** Es lo más caro de construir y lo menos pedido. No arrancar por acá | 🔲 |
| 10 | ¿`FREE_SHIPPING` como tipo de promoción? | **Sí, Fase 2.** No depende de Envíopack: los métodos ya tienen precio fijo. Ver sección de envío | 🔲 |
| 11 | ¿Qué pasa con envío gratis en métodos `coordinar`? | Impedir la promo o avisar: ahí el precio es $0 y se arregla por afuera, "gratis" no significa nada. **Verificado 22/07**: no es un bug de plata (`cost: found.coordinar ? 0 : found.price`, checkout:77 → poner 0 sobre 0 no cambia nada). Es de **comunicación**: la tienda anuncia "envío gratis" sobre algo que nunca cobró, y el comprador puede entender que el flete de afuera va incluido | 🔲 |
| 12 | Envío gratis con alcance `PRODUCTS`/`CATEGORY`: ¿libera el envío de TODO el pedido? | **Hoy sí**: `promoMatchesCart` devuelve true si alcanza a **algún** ítem, así que con el producto A en promo y B fuera, el envío del pedido entero sale gratis (verificado 22/07). Es defendible —el envío es del pedido, no del ítem— pero conviene que sea a propósito y no un efecto secundario. La alternativa (exigir que TODO el carrito esté en alcance) es más restrictiva y más difícil de explicar | 🔲 |

---

## ARQUITECTURA PROPUESTA

### Principio rector

> **Una sola cuenta, en un solo lugar, que el servidor manda.**

Hoy la cuenta está en 20 archivos. El objetivo NO es agregar un motor más: es que exista **uno solo**
que usen el carrito (para mostrar), el checkout (para cobrar) y el panel (para previsualizar).

### Prisma (aditivo, no rompe nada)

```prisma
model Promotion {
  id          String   @id @default(cuid())
  storeId     String
  store       Store    @relation(...)

  name        String              // "20% off en remeras" — lo ve el dueño
  label       String?             // lo que ve el comprador en el carrito
  isActive    Boolean  @default(true)

  // QUÉ descuenta
  type        String              // PERCENT | FIXED | N_PAY_M | TIERED
  value       Float?              // % o monto
  minQty      Int?                // N de "llevá N"
  payQty      Int?                // M de "pagá M"

  // A QUÉ apunta  — el corazón del cambio
  scope       String              // ALL | CATEGORY | PRODUCTS
  categories  String[]            // si scope=CATEGORY
  productIds  String[]            // si scope=PRODUCTS

  // CUÁNDO
  startsAt    DateTime?
  endsAt      DateTime?

  // CON QUÉ SE COMBINA  — lo que hoy no existe
  combinesWithCoupons     Boolean @default(false)
  combinesWithPromotions  Boolean @default(false)
  priority                Int     @default(0)   // desempate

  createdAt   DateTime @default(now())
  @@index([storeId, isActive])
}
```

Notas:
- `scope` + `categories`/`productIds` es lo que rompe el techo actual. Una promo, N productos.
- `combinesWith*` en `false` por defecto = el default conservador de Tiendanube.
- **No se toca ningún campo existente del producto en esta fase.** `promoQtyMin` y compañía siguen
  vivos hasta que la migración esté probada (ver Fase 4).

### El motor único

Un módulo nuevo: `src/lib/pricing.ts`

```ts
computeCartPricing(items, products, promotions, coupon?) → {
  lines: [{ productId, variantId, qty, unitPrice, appliedPromotionId, savings }],
  subtotal, discountAmount, total,
  applied: [{ promotionId, label, savings }],
  blocked: [{ promotionId, reason }],   // por qué NO se aplicó (para el panel)
}
```

Reglas:
- **Función pura**: sin Prisma adentro, sin fetch. Recibe datos, devuelve números. Así la puede usar
  el cliente (para mostrar) y el server (para cobrar) **sin duplicar la cuenta**.
- El checkout la llama con los datos leídos de la DB dentro de la transacción → sigue siendo la
  autoridad. El cliente la llama con los datos del storefront → muestra lo mismo que se va a cobrar.
- Resolución de conflictos: si dos promos aplican y ninguna combina, **gana la que más le conviene al
  cliente** (como Shopify: *"the best discount automatically applies"*), desempate por `priority`.

### El orden de la cascada (explícito, hoy es implícito)

```
1. precio base (variante ?? producto)
2. mayorista        — si califica por cantidad
3. promociones      — la mejor aplicable; otras solo si combinesWithPromotions
4. cupón            — solo si la promo tiene combinesWithCoupons
5. piso de costo    — freno nuevo: nunca abajo de costPrice sin aviso
6. envío
```

### Panel

- Sección nueva `/dashboard/promociones` — lista + alta/baja, con el patrón de Cupones (que ya
  existe y funciona).
- En el **formulario de producto**: la tarjeta "Promoción por cantidad" se reemplaza por un cartel de
  solo lectura: *"Este producto tiene 2 promociones activas → ver"*. Que no se editen desde dos lados.
- **"¿Está en oferta?" se queda donde está.** Es el cartel, no el motor.

---

## EL COSTO — decidido: sigue opcional ✅

Flavio: *"con respecto a los costos hay que dejarlo bien, de última les digo que actualicen los costos
y listo"*.

**Decisión: el costo sigue opcional.** Motivos, en orden de peso:

1. **Shopify hace exactamente lo mismo**, y su reporte de ganancias lo dice textual: *"Profit is
   reported only for products and variants that had cost recorded at the time they were sold."* Su
   fórmula de margen —`([price - cost] / price) × 100`— es **idéntica** a nuestro `calcMargin`
   ([margin.ts:14](src/lib/margin.ts)). Ya estamos alineados con el estándar sin haberlo buscado.
2. **Obligatorio rompe a las que ya están**: los 58 productos no tienen costo. La próxima vez que la
   hermana de Flavio edite un producto, el formulario le exigiría un dato que no tiene a mano.
3. **Hay vendedoras que genuinamente no lo saben** (reventa con lotes mezclados, artesanal).
4. **El sistema no puede depender de que Flavio insista.** Si funciona solo cuando él va y les pide
   que carguen los costos, no es un ecosistema: es una persona haciendo de pegamento.

**En cambio, el sistema tiene que ser explícito sobre lo que se pierde**, y en el momento en que
importa. Al crear una promo:

> *"De los 40 productos afectados, 28 no tienen costo cargado → no puedo avisarte si quedan bajo
> costo. Cargalos acá."*

Que el que no cargó el costo **sepa qué protección está resignando**, justo cuando entiende para qué
sirve. Eso es mejor que trabarlo al cargar el producto, que es cuando todavía no le importa.

→ Esto vuelve a habilitar el **piso** (decisión #7), pero como **best effort honesto**: protege lo que
puede y dice en voz alta lo que no. No como una alarma que finge cubrir todo.

### Texto explícito en el campo de Costo (pedido de Flavio) 🔲

> *"hay que dejar un texto explícito en costos avisándole al dueño qué pasa si no lo pone"*

Hoy el campo dice "Costo" y nada más. El dueño no tiene forma de saber qué se está perdiendo. Va un
texto que lo diga sin vueltas, **en el propio campo**:

```
Costo del producto  (opcional)

Si lo cargás, TiendaApps puede:
  ✓ mostrarte tu ganancia real en Métricas
  ✓ avisarte si una promoción deja este producto abajo del costo

Si lo dejás vacío:
  · este producto no va a sumar a tu ganancia — vas a ver "sin dato"
  · no te vamos a poder avisar si lo estás vendiendo con pérdida
```

Principio: **no rogar, informar**. No se lo bloquea ni se lo presiona — se le dice exactamente qué
protección resigna, y decide. Es la misma idea del aviso al crear la promo, pero en el momento en que
el dato se carga.

⚠️ Nota: el campo hoy es opcional y **así se queda** (ver arriba). Este texto no lo vuelve
obligatorio: lo vuelve **una decisión informada** en vez de un campo vacío que nadie entiende.

Fuente: [Shopify — Profit reports](https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/default-reports/profit-reports)

---

## "DE UNA VEZ" Y "POR FASES" NO SE CONTRADICEN

Flavio: *"no quiero volver a repararlo, quiero que si lo hacemos, lo hagamos bien y de una vez"*.
De acuerdo. Y por eso mismo, aclaración importante:

**Ninguna fase se tira después. No hay andamios provisorios.**

- **Fase 1 es el cimiento, no un parche.** El motor único de precios que reemplaza las 20 copias se
  queda para siempre. Todo lo demás se apoya ahí.
- Las fases siguientes **agregan** encima. Nada se rehace.

La alternativa —modelo + 8 promos + panel + motor en un solo commit gigante— **no es "hacerlo bien de
una vez"**: es hacerlo a ciegas y descubrir los errores todos mezclados, sin saber cuál rompió qué.
Y son precios.

> **"De una vez"** = no lo abandonamos por la mitad ni dejamos dos sistemas conviviendo.
> **"Por fases"** = lo verificamos mientras lo construimos.

---

## REGLAS TRANSVERSALES — aplican a CADA fase, sin excepción

> Pedido explícito de Flavio: *"corregir los bugs que vamos encontrando en el paso, validaciones en
> los inputs, bloqueo de doble click, seguridad ante todo — que no se metan a modificar código por la
> consola ni con código malicioso"*. Esto no es una tarea: es el estándar de todo lo que se toque.

### 1. El servidor es el único que decide el precio (anti-consola/anti-hacker)

El miedo de Flavio: alguien abre la consola del navegador (F12) y manda datos falsos.

**La respuesta ya existe y NO se puede romper**: el checkout **ignora** cualquier precio que mande el
cliente y **recalcula todo desde la base** dentro de una transacción
([checkout/route.ts:294-441](src/app/api/checkout/route.ts)). Un atacante puede POSTear
`{ price: 1 }` — el server lee el precio real del producto en la DB y cobra eso.

- ❌ **Nunca** confiar en un precio, descuento, total o subtotal que venga del cliente.
- ✅ El cliente manda **qué** productos y **cuántos**; el server pone **a cuánto**.
- ✅ Toda promo nueva se aplica **en el server, leyendo la promo de la DB**, nunca desde un flag del
  request. El motor `pricing.ts` es una función pura que corre en las dos puntas, pero **la punta que
  cobra siempre re-lee de la base**.

### 2. Cada endpoint que escribe va con candado de dueño

- Escribir/editar/borrar una promoción → `getCurrentUser()` + verificar que la promo **es de la tienda
  de ese usuario**. Sin eso, cualquiera con la URL de la API edita las promos de otra tienda (lo mismo
  que ya pasa con productos vía `getOwnerStore`).
- El checkout es **público a propósito** (el comprador no está logueado) — por eso la regla #1 es
  vital ahí: es la única defensa.
- Filtrar **siempre** por `storeId`. Una promo, un cupón, un producto: nunca cruzar tiendas.

### 3. Validación de inputs — en el server, no solo en el form

El form valida para UX; **el server valida para seguridad**. El patrón que ya usa `validateProductBody`
([products.ts:195-223](src/lib/products.ts)) es el molde:

- **Números**: rechazar `NaN`, negativos, cero cuando no corresponde, y validar **rango** (un
  descuento de 0-100%, no 5000%). Ya se hace con precio/comparePrice/mayorista — copiarlo.
- **Relaciones entre campos**: comparePrice > price, mayorista < price, `payQty < minQty`. Las promos
  nuevas suman las suyas (ej: un % entre 1 y 90, un monto fijo menor al precio).
- **Strings**: cortar longitud (`.slice()`) y escapar antes de renderizar. Nombres de promo, labels.
- **URLs**: validar esquema `http(s)://` — como se arregló en `parseReel` tras el hallazgo del
  `javascript:`. Toda URL que termine en un `href` o `src`.
- **Fechas**: `startsAt < endsAt`, y validar que sean fechas reales.

**Coherencia por tipo de promoción (pregunta de Flavio 17/07 — el input NO es libre):**
Cada tipo tiene reglas duras que el form frena y el server rechaza. Nadie serio (Shopify/Tiendanube)
deja input libre; el form guía y el server es la autoridad.

| Tipo | Regla |
|---|---|
| `PERCENT` | `1 ≤ value ≤ 90` (o el tope que se fije). Ni negativo ni >100 |
| `FIXED` | `value > 0`; el descuento se topea al precio del producto → el precio nunca queda negativo (`Math.min`, ya en el motor) |
| `N_PAY_M` | `minQty ≥ 2`, `payQty ≥ 1`, `payQty < minQty`. No existe "llevá 2 pagá 3" |
| `FREE_SHIPPING` | `minAmount ≥ 0` |
| Todos | `startsAt ≤ endsAt`; `minOrderAmount ≥ 0`; nombre no vacío y con longitud tope |

Más el **piso de costo** (decisión #7): al crear/editar, si la promo deja productos bajo costo, se
avisa (no bloquea) y se listan cuáles — coherencia de negocio, no solo matemática.

### 4. Bloqueo de doble submit — en toda acción que muta

Cada botón que crea/edita/borra:
- Se **deshabilita** mientras corre (`disabled={saving}`), y
- Re-chequea la condición **dentro del updater** de estado, no contra el valor del render — como se
  arregló en `addReelUrl` (dos clicks leían el mismo largo viejo y duplicaban).
- En el server, las operaciones críticas van en **transacción** con guardas atómicas (el checkout ya
  decrementa stock con `updateMany ... where stock >= qty`; las promos con uso limitado, igual).

### 5. Los bugs que aparezcan se arreglan de raíz, no se parchean

Regla que Flavio fijó desde el arranque de la sesión: nada de código muerto, nada de parches, nada de
dos sistemas conviviendo. Si un bug aparece durante una fase y **es de esta cuenta de precios**, se
arregla dentro del motor único (no un remiendo suelto). Si es de otra cosa, se anota en el REGISTRO de
abajo y se decide aparte — no se mezcla en el mismo commit.

---

## REGISTRO DE BUGS ENCONTRADOS EN EL CAMINO

> Se completa a medida que avanzamos. Cada uno: qué es, si corre hoy, y cómo se resuelve.

| # | Bug | ¿Corre hoy? | Resolución |
|---|---|---|---|
| B-01 | **Escalones mayoristas: el checkout los ignora.** El carrito aplica `preciosEscalonados`, la caja cobra `precioMayorista` a secas → le cobra de más al comprador | No (0 productos con mayorista, y mayorista está doblemente gateado) | Se arregla **solo** con el motor único de Fase 1. No parchear suelto |
| B-02 | **Mayorista es puerta de una sola dirección.** El toggle para activarlo solo aparece al crear la tienda; cambiar de rubro lo apaga y no hay forma de reactivarlo por UI | Sí, pero es un bug de config, no de plata | **Aparte del plan de promos**: agregar toggle de mayorista en Configuración |
| B-03 | **N×M calculado distinto en carrito vs checkout.** Carrito: `(grupos×M + resto) × precio`. Checkout: convierte a % y redondea por unidad → diferencia de centavos (3×2 de $1.000: carrito $2.000, checkout $2.000,01) | Sí, pero es sub-peso y solo con N×M activo (0 productos hoy) | Se arregla **solo** con el motor único de Fase 1 — las dos puntas usan la misma función |
| B-05 | **OrderItem.price × qty ≠ subtotal cobrado en N×M.** Se guarda el precio unitario redondeado; en un N×M no divisible, price×quantity da un centavo más que el lineTotal. El CARGO es correcto (usa pricing.subtotal), pero el desglose por ítem en email/métricas miente por centavos | Sí, pero solo con N×M activo (0 productos) | **Documentado, no se toca ahora.** Arreglarlo bien pide guardar el lineTotal en OrderItem (cambio de schema + métricas). El cargo real es correcto. Se revisa cuando N×M se use de verdad |
| B-06 | **Se quitó el gate `isWholesale` del carrito.** Ahora el mayorista aplica siempre que el producto tenga precioMayorista y qty≥min, sin mirar el modo mayorista de la tienda | Cambio de comportamiento, 0 productos | **Intencional, no es bug.** El checkout nunca tuvo ese gate; mantenerlo en el carrito re-crearía la desincronización que la Fase 1 elimina. Se deja documentado |
| B-07 | 🔴 **`FIXED` puede regalar el producto.** `validatePromotionBody` solo exige `value > 0`, nunca lo compara contra el precio. El motor pisa en 0 (`Math.max(0, base - value)`) → con `FIXED $15.000` sobre un producto de $10.000 el subtotal da **$0**. No hace falta un tipeo: una tienda con productos de $2.000 a $50.000 que ponga *"$5.000 off en toda la tienda"* regala todo lo que valga menos de $5.000. **Incoherencia**: `PERCENT` está topeado en 90 justamente porque *"un 100% regala el producto"*, y `FIXED` puede hacer eso mismo sin ningún candado. El aviso de piso de costo no lo cubre (necesita `costPrice`, hoy 0 de 58 productos) | Sí — alcanza con crear la promo desde el panel | 🔲 **A decidir**: ¿tope duro (rechazar si `value ≥` el precio del producto más barato del alcance), o aviso fuerte estilo piso de costo? Ojo: el alcance `ALL` incluye productos futuros, así que un chequeo solo al crear no alcanza |
| B-08 | 🟠 **Una promo que NO descuenta nada igual bloquea el cupón.** `couponsAllowed` mira si la promo **alcanza** el carrito (`promoMatchesCart`, por scope), no si **efectivamente descontó**. Con un 3×2 `combinesWithCoupons=false` y el cliente llevando 1 sola unidad: ahorro $0 y el cupón igual queda bloqueado → se queda sin las dos cosas. Pasa igual con `MIX_N_PAY_M`. Verificado: con una promo de categoría fuera de alcance el cupón SÍ se permite, así que el filtro por scope anda; lo que falta es preguntar por el descuento real | Sí, en cuanto haya un N×M que no combine con cupones | 🔲 Gatear por "esta promo aportó ahorro en este carrito" en vez de por alcance. Ojo con `FREE_SHIPPING`: ahí no hay ahorro de línea pero el beneficio SÍ se otorga, así que no puede ser solo `savings > 0` |
| B-09 | 🟠 **El wizard limita el alcance a UNA categoría, aunque todo lo de abajo soporta varias.** El selector es un radio (`const [cat, setCat] = useState<string \| null>`, [PromocionesClient.tsx:361](src/app/dashboard/promociones/PromocionesClient.tsx)) y al guardar manda `categories: cat ? [cat] : []` (:437). Pero el modelo guarda una lista, `parseStringArray` acepta hasta 500 y el motor hace `p.categories.includes(...)` → *"20% en remeras y buzos"* obliga a crear **dos promociones** por una limitación solo del formulario. **Arista peor**: al editar lee `editPromo.categories[0]` (:361), así que si una promo tuviera 2 categorías, abrirla y guardarla **borra la segunda sin avisar** | Sí — el límite se sufre siempre; la truncación solo si algo llegara a crear una promo multi-categoría (hoy el wizard no puede, pero la API sí lo acepta) | ✅ **DECIDIDO (Flavio, 22/07): se puede elegir MÁS DE UNA categoría.** Motivo: dejarlo en una **no era gratis** —había que *agregar* una validación en el server que rechace >1, porque la API ya las acepta—, o sea que mantener el límite costaba más que sacarlo y dejaba menos. Además *"20% en remeras y buzos"* es un caso normal de temporada que hoy obliga a crear 2 promos separadas. Falta implementar: (a) selector multi (reusar el patrón del de productos, que ya es multi), (b) sacar el `[0]` de la precarga al editar, (c) tarjeta *"Una categoría"* → *"Categorías"*, (d) plural en `describePromo` (*"en la categoría:"* → *"en las categorías:"* cuando hay más de una). `scopeDetail` y el resumen del wizard YA hacen `join(", ")`, no hay que tocarlos |
| B-11 | 🔴 **El N×M cobra de más cuando el producto va en varios talles.** `storePromoLineTotal` reparte el beneficio por línea con `roundMoney(basePrice * quantity * (paid / totalQty))` ([pricing.ts:207-214](src/lib/pricing.ts)): **cada línea redondea su fracción por separado y siempre hacia arriba**. Misma remera de $10.000 con 3×2: 3 unidades en 1 línea → $20.000 ✅ · en 2 líneas (1+2) → $20.000 ✅ · **en 3 líneas (talles S, M, L) → $20.001** ❌. Escala: 6 talles → **+$2**, 9 talles → **+$3**. Va **en contra del comprador** (se le prometió "llevá 3, pagá 2" y paga 2 + $1) | Sí, y en el caso más común de una tienda de ropa: la misma prenda en varios talles son líneas distintas del carrito con el mismo `productId` | 🔲 Repartir el total del grupo entre las líneas **sin redondear cada una por su cuenta** (calcular el total exacto del producto y asignar el resto a una sola línea, tipo mayor-resto), de modo que Σ líneas == total correcto. **Agregar el caso a `pricing.check.ts` con 3 líneas de 1 unidad** — la suite tiene N×M pero no parte el producto en 3+ líneas, por eso no lo agarró |
| B-04 | **Mayorista bajo el mínimo: el carrito muestra precio, el checkout rechaza.** Carrito devuelve precio de lista si `qty < cantMinMayorista`; checkout **tiraba error** ("requiere un mínimo de N") | Sí, pero solo con mayorista activo (0 productos) | ✅ **RESUELTO (Flavio, opción 1)**: el mínimo mayorista es un umbral de descuento, no un candado. Se sacó el `throw`; bajo el mínimo se vende al precio retail. `soloMayorista` es solo visibilidad, no enforcea mínimo. Carrito y checkout ahora coinciden |

---

## FASES

### Fase 0 — Debate 🔲
Cerrar la tabla de decisiones de arriba. **No se escribe código hasta que esté.**

### INVENTARIO DE SITIOS DE CÁLCULO (mapeado 17/07 — la base de la Fase 1)

De los 20 archivos que mencionan `promoQtyMin`, **solo 3 CALCULAN el precio**. El resto solo muestra
un cartel, carga el dato, o define el tipo. Fuera de alcance: los 2 de `suscripcion/*` (precio del
plan, otro dominio).

**Los 3 sitios que calculan — y en qué difieren:**

| | Escalones mayoristas | Redondeo del N×M |
|---|---|---|
| `checkout/route.ts` (SERVER, **cobra**) | ❌ **NO los aplica** (B-01) | convierte a %, redondea **por unidad**: `round(base × (1−pct/100))` |
| `useCartLogic.ts` (cliente, total del carrito) | ✅ sí (`getEffectiveWholesalePrice`) | multiplica directo: `(grupos×M + resto) × precio` |
| `CartDrawer.tsx` (cliente, precio por línea) | ✅ sí (`itemBaseUnitPrice`) | proporcional por ítem: `round((pagadas/total) × base × qty)` |

**Dos ejes de desacuerdo, confirmados leyendo el código:**
1. **Escalones**: 2 de 3 los aplican; el que cobra, no → B-01.
2. **N×M**: 3 redondeos distintos → B-03. En números redondos casi coinciden; con centavos, no.

**Sitios que solo MUESTRAN** (no tocar la cuenta, solo consumir lo que da el motor): los 8 templates,
`ProductDetailClient`, `promoLabel.ts` (textos), los emails, `opengraph-image`, `useStorefront`
(tipos + datos demo).

→ **`pricing.ts` reemplaza los 3 de arriba con una función.** Los tres pasan a llamarla. Ahí mueren
B-01 y B-03 juntos, sin parchear ninguno por separado.

**Cuál comportamiento gana (validado contra Shopify y Tiendanube):**
- **Escalones: se aplican.** Shopify hace igual ("volume pricing", precio fijo por banda) y confirma
  que cuando aplica, **no se stackea** otro descuento encima → refuerza la decisión #5. El checkout
  (que hoy los ignora) es el que está mal.
- **N×M: cuenta directa** (`unidades pagadas × precio`), no el % con redondeo. Coincide con el modelo
  de Tiendanube ("el más barato gratis") cuando son del mismo producto al mismo precio. El % del
  checkout es una aproximación que mete centavos → B-03.

**Consecuencia honesta**: la Fase 1 **no es "cero cambios"** — los 3 sitios ya difieren hoy, no hay un
comportamiento único que preservar. Es **"un solo comportamiento, el correcto"**, y como efecto el
checkout empieza a cobrar bien donde hoy cobra mal. Nadie lo nota (0 productos con mayorista/N×M), pero
queda bien de entrada. ✅ **APROBADO por Flavio (17/07)**: escalones se aplican + N×M cuenta directa.

---

## TABLA DE CASOS CONGELADA — la red de seguridad de la Fase 1

Estos son los números que `pricing.ts` **tiene que reproducir**. Se calcularon con el comportamiento
**correcto ya aprobado** (escalones aplicados, N×M cuenta directa). Producto base: **precio $10.000,
costo $6.000**, salvo que se aclare.

### Nivel ítem (lo que va a `OrderItem.price × quantity`)

| # | Config del producto | Cantidad | Total ítem correcto | Nota |
|---|---|---|---|---|
| A | sin promo | 1 | **$10.000** | base |
| B | sin promo | 3 | **$30.000** | base |
| C | PERCENT: min 3, 25% | 2 | **$20.000** | bajo el mínimo → sin promo |
| D | PERCENT: min 3, 25% | 3 | **$22.500** | $7.500 × 3 |
| E | N×M: 3×2 | 3 | **$20.000** | paga 2 unidades |
| F | N×M: 3×2 | 4 | **$30.000** | `floor(4/3)×2 + 4%3 = 3` unidades pagas |
| G | N×M: 3×2 | 6 | **$40.000** | paga 4 |
| H | mayorista $8.000, min 5 | 4 | **$40.000** | bajo el mínimo → precio lista $10.000 |
| I | mayorista $8.000, min 5 | 5 | **$40.000** | $8.000 × 5 |
| J | mayorista $8.000 + escalón desde 10 = $7.000 | 10 | **$70.000** | ⚠️ **CORRECCIÓN**: hoy el checkout cobra $80.000 (B-01) |

### Nivel pedido (subtotal → cupón → + envío)

| # | Escenario | Cálculo | Total antes de envío |
|---|---|---|---|
| K | subtotal $22.500 + cupón 20% | −$4.500 | **$18.000** |
| L | subtotal $30.000 + cupón fijo $5.000 | −$5.000 | **$25.000** |
| M | subtotal $300.000 + cupón 20% (=$60.000) | −$50.000 (**tope** `MAX_COUPON_DISCOUNT`) | **$250.000** |
| N | ítem D ($22.500) + cupón 20% | −$4.500 sobre subtotal ya con promo | **$18.000** | stack actual (hasta que existan las reglas de combinación) |
| O | cualquiera + `Math.max(0, …)` | subtotal − descuento nunca < 0 | **$0** mínimo |

**Reglas de la cascada que la tabla fija** (checkout/route.ts:336-441):
1. base (variante ?? producto)
2. mayorista con escalones — si `qty ≥ cantMinMayorista`
3. promo — PERCENT o N×M directo
4. subtotal = Σ(ítems)
5. cupón — % (con tope $50.000) o fijo (tope = subtotal); cupón de premio solo si no hubo cupón normal (tope $100.000)
6. total = `max(0, subtotal − descuento + envío)`

🔲 **Antes de escribir `pricing.ts`**: esta tabla se convierte en un test (`pricing.test.ts` o script
tsx) que corre contra la función nueva. Verde = el refactor no rompió nada y aplicó las 2 correcciones.
Los casos J (escalón) y F/G (N×M) son los que **deben cambiar** respecto al checkout viejo; todos los
demás deben quedar **idénticos**.

🔲 **A verificar aparte (no bloquea)**: la **comisión de afiliada** debe calcularse sobre el precio
**cobrado** (con promo/cupón aplicados), no sobre el precio de lista. Es plata y baja del mismo pedido
— confirmar contra qué base se computa hoy.

---

### Fase 1 — El motor único, sin cambiar comportamiento 🔲

**Qué es, en criollo**: hoy la lista de precios está escrita en **20 papeles** repartidos por el
local. Uno en la caja, uno en el mostrador, uno en cada vidriera. Cada vez que cambia una regla hay
que corregir los 20 — y si te olvidás de uno, **el cliente ve un precio en la vidriera y le cobrás
otro en la caja**.

La cuenta de "cuánto sale esto con la promo" hoy vive en: el carrito, el checkout, la página de
producto, los 4 templates de Moda (una copia cada uno), la página de productos, los emails, y la API
del checkout — la única que de verdad cobra.

**Fase 1 = sacar los 20 papeles y dejar una sola lista en la pared.** Extraer todo a
`src/lib/pricing.ts` y que los 20 lugares la llamen.

**Para el usuario no cambia NADA**: mismos precios, mismas promos, misma pantalla. Es puramente por
dentro. Por eso se puede verificar al 100%: el resultado tiene que ser **idéntico**, caso por caso.

**Por qué primero**: si agregamos "20% off en remeras" con la cuenta viviendo en 20 lugares, hay que
agregarla en los 20. El que nos olvidemos va a mostrar un precio distinto al que cobra la caja.

⚠️ **Lo que todavía no sabemos**: si los 20 papeles **ya están desincronizados hoy**. No se compararon.
Nada garantiza que coincidan. La tabla de casos de la Verificación sirve para dos cosas: probar que el
refactor no rompe nada, y **descubrir si alguno ya venía mintiendo**.

### Fase 2 — El modelo y la sección 🔲
Migración de `Promotion`, `/dashboard/promociones`, y el motor que las lee. Las promos viejas del
producto **siguen funcionando en paralelo**.

### Fase 3 — Piso de costo (aviso a la dueña) 🔄

**Regla de oro de Flavio**: *"nunca vender bajo costo, pero AVISAR a la dueña, no frenar al comprador —
sería un cliente menos"*. O sea: el piso de costo es un **aviso al que configura**, NUNCA un candado
en el checkout. El comprador siempre paga el precio de la promo.

**Qué hace, en criollo**: cuando la dueña arma "30% off en camperas", si alguna campera con eso queda
**por debajo de su costo**, se lo decimos ahí mismo — "ojo, la Campera X quedaría a $8.000 y te cuesta
$9.500". Ella decide: la baja igual (liquidación / gancho) o ajusta el descuento.

**Alcance (lo que voy a construir)**:
1. **Aviso en vivo en el wizard** (paso de reglas / confirmar): calcula, para cada producto en alcance,
   el precio con la promo y lo compara con `costPrice`. Si alguno cae bajo costo, muestra un cartel
   ámbar con **cuáles** y por cuánto. **No bloquea guardar** — la dueña puede seguir (loss-leader válido).
2. **Señal en la lista de promos**: un chip discreto en las promos que hoy venden algo bajo costo, para
   que lo pueda ver después, no solo al crearla.
3. Reusar el cálculo del motor (precio efectivo por unidad bajo la promo), no inventar otra cuenta.

**Casos de borde**:
- **Producto sin costo cargado** (`costPrice` null): no se puede avisar → se **omite** (no cuenta como
  "bajo costo"). Se aclara "N productos sin costo cargado, no los pudimos chequear". (Flavio ya venía
  diciéndoles que carguen costos.)
- N×M: el costo se mide sobre el **precio efectivo por unidad** en el combo (ej. 3×2 = pagar 2/3 del precio).
- FREE_SHIPPING: no toca el precio del producto → nunca hay bajo costo por esta vía.

**Fuera de Fase 3** (por la decisión de arriba): el apilado de dos promos (`combinesWithPromotions`) y
el panel de "qué se aplicó y qué NO (blocked)" — este último tenía sentido cuando había combinación
compleja; con "gana la más barata" no hay nada "bloqueado" que explicar. Se retoma solo si vuelve el apilado.

### Fase 4 — Migrar y limpiar ✅ (código) · 🔲 drop de columnas (deploy)
**No hubo nada real que migrar.** Verificado contra la base de prod (19/07): un solo producto tenía la
promo vieja cargada (`promoQtyMin`) y era de prueba (girly-store, "Camiseta Hanes"). Las StorePromotion
"remeras"/"holaaa mundo" también eran de prueba. Así que Fase 4 = limpieza de código sin backfill.

**Hecho (código, sin deployar):** se retiró TODO el sistema viejo "Promoción por cantidad" del producto:
- `pricing.ts`: fuera `PromoConfig`, `PricingItem.promo`, `promoApplies`, bloque "Candidato 1" legado.
- `promoLabel.ts`: **borrado** (era 100% del sistema viejo).
- `useCartLogic`: fuera el flujo de "multi-selección" (pendientes) que solo existía para esa promo, y
  `discountPct` del carrito. Decisión de Flavio (19/07): sacarlo (el modal queda con un solo botón).
- Templates (Boho/Chic/FashionNoir/UrbanPulse), `/productos`, detalle, CartDrawer, CheckoutModal: fuera
  el badge/hint viejo. El display NUEVO (`PromoTag`/`PromoBlock`/tachado) queda intacto.
- Server: `products.ts` (validate), `api/productos` POST+PATCH, `api/public/[slug]`, `checkout`, `email.ts`.
- Formulario del producto: la tarjeta "Promoción por cantidad" → **nota de solo lectura** que linkea a
  la sección Promociones.
- Verificado: `tsc` limpio, motor 34/34 verde, `next build` OK, sin variables sin uso.

**Pendiente para el DEPLOY:** las 4 columnas siguen en `schema.prisma` (`promoQtyMin`, `promoQtyDiscount`,
`promoType`, `promoPayQty` en `Product`) pero ya **nadie las lee ni escribe** — quedan inertes. En el deploy:
quitarlas del schema + migración `DROP COLUMN`. El producto de prueba con datos viejos desaparece solo al
dropear la columna.

### Fase 4.5 — Que el descuento se VEA en la tienda (pedido de Flavio) 🔄 EN ESTO

> *"que los templates rendericen bien las promociones, en los modales y en los productos, que resalte,
> que se vea notorio el descuento o el texto"*.

> **Visión ampliada de Flavio (18/07) — "la parte más crítica, lo mejor de lo mejor":**
> - **Claridad ante todo.** Estilo + calidad. Es lo que se ve y lo que vende.
> - En las **cards** de los bloques de productos de CADA template (no solo el precio: el badge, el tachado).
> - En los **modales** de vista rápida.
> - **En vivo al agregar al carrito**: si tiene 3×2 y el comprador va sumando cantidad, mostrar el
>   progreso/beneficio en el momento ("llevás 2, sumá 1 y pagás 2"). Esto engancha con el `pendingCartValue`
>   del modal (hoy solo mira la promo por producto, hay que sumarle las de tienda).
> - **Black Friday / evento** entra acá (badge distinto + contador). Ver "Capa de evento" abajo.

> **Cómo se construye (18/07):** resolver puro `resolveProductPromo(product, promotions)` en
> [src/lib/promoDisplay.ts](src/lib/promoDisplay.ts) → { precio tachado, efectivo, `pctOff`, `nxm`,
> envío gratis, `minOrder`, `badge` }. Reusa el MOTOR (mismo precio que cobra el checkout). Prioridad de
> señal: descuento directo sin mínimo (tacha) > con mínimo (badge condicional) > 3×2 > envío gratis.
> **Se prueba en UN template primero** (para que Flavio apruebe el estilo) y recién ahí se replica en los 8
> + modales + detalle + /productos. El preview en vivo del 3×2 y Black Friday son incrementos siguientes.

**Va acá, no antes**: no se puede renderizar una promo que todavía no existe como entidad. El render
consume lo que produce el motor (Fase 1) sobre las promos que crea la sección (Fase 2). Antes de eso
sería pintar una caja vacía.

**Y es el mismo problema que los reels — a medio resolver:**
- Existe `OfferBadge` ([src/components/store/OfferBadge.tsx](src/components/store/OfferBadge.tsx)) pero
  solo lo usan 4 templates (Boho, Chic, Fashion, Urban).
- El precio tachado + "% OFF" está **desparramado en 8 templates, 84 apariciones**, cada uno su copia.

→ Mismo tratamiento que `ProductReels`: **un componente compartido de precio/descuento** que muestre
tachado, badge, "llevá N pagá M", "envío gratis desde $X", y que los 8 templates + los modales + la
página de producto lo usen. No renderizar promos a mano en cada template.

**Capa de evento (Black Friday / Hot Sale / CyberMonday)** 🔲 — pregunta de Flavio 17/07.
Black Friday **NO es un tipo de promoción**: es una promo normal (casi siempre `PERCENT` scope `ALL`)
con un rango de fechas. El motor + la sección **ya lo resuelven** (se crea con fecha, arranca y se
apaga sola). Lo que SÍ agregaría valor es una capa opcional de "evento" sobre una promo cualquiera:
- un flag `isFeatured` (o `eventLabel`) en `Promotion` → en la tienda muestra un **badge distinto**
  (ej. "BLACK FRIDAY" en vez del "20% OFF" genérico) + opcional **contador regresivo** hasta `endsAt`.
- opcional: un banner de evento arriba de la tienda.
No es un mecanismo nuevo — es render + un campo. Va acá (Fase 4.5) porque es decoración de tienda.
En Argentina Hot Sale/CyberMonday mueven muchísimo, así que el contador + badge tienen ROI real.

Alcance: card del producto, modal de vista rápida (los 4 de Moda), página de detalle, y el carrito.
Que el descuento **resalte** — es lo que convierte la promo en venta.

### Fase 5 — Mix & match ("mezclar categorías") ✅ (19/07)
"Llevá un pantalón + una remera + una campera → el más barato gratis".

**Implementado como un tipo nuevo `MIX_N_PAY_M`** que reusa `minQty`/`payQty`/`scope` de la
`StorePromotion` → **no necesitó columna nueva** (por eso se pudo construir y testear entero sin deployar).

- **Motor** ([pricing.ts](src/lib/pricing.ts)): es una promo a **nivel carrito**, no por línea. `applyMixPromos`
  junta TODAS las unidades que la promo alcanza (mezclando productos), y por cada grupo completo de N
  regala las (N−M) **más baratas del pool**. Aplica UNA sola promo mix (la que más ahorra) y solo si
  mejora lo que el conjunto ya tenía con las promos por-ítem → **best-of a nivel conjunto, sin apilar**,
  coherente con el resto del sistema. `priceCart` quedó en 3 pasos: por-ítem → mix → derivados.
- **Validación** ([promotions.ts](src/lib/promotions.ts)): mismas reglas que N×M (N≥2, M≥1, M<N).
- **Piso de costo**: simula el grupo completo, igual que el N×M (caso CF-G).
- **Display**: badge `N×M` en la card (si el comprador lleva N del MISMO producto el pool las cuenta
  igual, así que el badge y el total del botón son correctos) + el bloque explicativo aclara que se
  pueden **combinar productos distintos** y que **el más barato sale gratis**.
- **Wizard**: tarjeta nueva "Combo: llevá N mezclando" (violeta), con su propia nota explicativa.
- **Tests**: 7 casos `MX-*` en [pricing.check.ts](src/lib/pricing.check.ts) — incluye precios distintos
  (se regala el más barato), 2 grupos, alcance por categoría, y los dos sentidos del best-of contra
  una promo por ítem. Verificado: tsc limpio, `next build` OK, lint limpio.

Lo que se muestra es lo que se cobra: el checkout lee las promos sin filtro de tipo y usa el MISMO
`priceCart`, así que el mix se cobra igual que se muestra.

> **Decisión Flavio 17/07**: el N×M de la Fase 2 es **del mismo producto** ("llevá 3 remeras iguales,
> pagá 2"). Mezclar productos/categorías distintos (el "cualquiera del combo, el más barato gratis")
> queda confirmado para esta Fase 5, no descartado. El prototipo ya aclara esto en el texto del 3×2.

**Cómo debe funcionar (verificado en Tiendanube)**: un N×M real cruza **productos distintos** del
mismo grupo de promo y **bonifica el más barato**, no aplica un %. Ejemplo de su doc: A=$100, B=$80,
C=$50 → pagás A+B=$180, **C gratis**. Nuestro N×M de hoy solo entiende "N del mismo producto", que es
el subconjunto donde "el más barato gratis" = "pagás M unidades × precio". El motor de Fase 1 debe
dejar la puerta abierta a esta generalización (recibir un grupo de ítems, no un solo producto).

> Fuente: [Tiendanube — "llevá X pagá Y"](https://ayuda.tiendanube.com/es_AR/123465-cupones-y-promociones/como-ofrecer-promociones-de-x-y-x)

---

### Fase 6 — Repaso funcional tipo por tipo 🔄 EN ESTO (22/07)

Revisión de cada promoción ya construida, buscando huecos de comportamiento. **Todo lo que salga de
acá entra en esta fase**: los bugs, los debates y lo que Flavio vaya marcando.

**Punto de partida (22/07):** la suite congelada corre entera en verde
(`npx tsx src/lib/pricing.check.ts`). Los hallazgos NO son casos rotos de la suite — salieron de
sondear escenarios que la suite no cubría. Eso importa para no perder la confianza en la red de
seguridad: sigue siendo válida, simplemente tenía menos alcance del que creíamos.

#### Cola de trabajo

| Orden | Qué | Tipo | Estado |
|---|---|---|---|
| ~~1~~ | ~~**B-07** — `FIXED` puede dejar el producto en $0~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: `fixedFloorError` en `promotions.ts`, enchufado en **crear y editar**. Nombra el producto: *"Con $12.000, «Llavero» ($4.000) quedaría gratis"*. Casos **FF-A/B/C/D** |
| ~~2~~ | ~~**B-08** — promo sin descuento igual bloquea el cupón~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: el gate mira las promos que **realmente aplicaron** (ganaron línea, o son el envío gratis que se activó), no las que alcanzan por scope. Casos **CG-A/B/C/D** |
| 3 | **Decisión #12** — envío gratis por producto libera el pedido entero | 🤔 debate | ✅ **CERRADO (22/07): queda como está** |
| 4 | **Decisión #11** — envío gratis sobre método "a coordinar" | 🤔 debate | ✅ **CERRADO (22/07): lo resuelve #7c** — al registrar el envío bonificado, en `coordinar` da $0 (la verdad: no se regaló nada). No hace falta prohibir ni avisar |
| ~~5~~ | ~~**B-09** — el wizard limita a UNA categoría, y al editar trunca~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: selector multi (`cats: string[]`), sin el `[0]` de la precarga. Tarjeta → *"Categorías · uno o varios rubros"*, plural en `describePromo` y `scopeDetail`, y el conteo de alcance ahora suma todas. **Ya se puede armar el Combo cruzando categorías** |
| ~~6~~ | ~~**F6-C1** — el ejemplo del tipo mete una categoría en el paso del tipo~~ | ✅ **HECHO** | **APLICADO (22/07)**: ejemplos neutros en `PERCENT` y `FIXED`; la aclaración del alcance quedó en el encabezado del paso 1, no repetida en los cinco tipos |
| ~~7~~ | ~~**F6-C2** — "Se aplica solo en la tienda" tiene dos lecturas~~ | ✅ **HECHO** | **APLICADO (22/07)**: *"Se aplica solo con entrar a tu tienda: no tiene que escribir ningún cupón."* — "código" pasó a "cupón" |
| ~~8~~ | ~~**F6-C3** — el selector de categoría no muestra el rango de precios~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: `catSub` muestra *"14 productos · $55.000 a $99.000"* en cada categoría. Salió junto con B-09, es el mismo selector |
| ~~9~~ | ~~**F6-C4** — guiar al que arma la promo, con sus propios números (idea de Flavio)~~ | ✅ **HECHO** | **APLICADO (22/07)**: `fixedImpact` en `promotions.ts` + línea viva bajo el campo del monto (*"El más barato en alcance, Llavero ($4.000), queda en $1.000 — 75% de descuento"*), gris/ámbar/rojo según profundidad, y cartel con la lista en Revisá. El caso "gratis" ahora **frena en el paso 3** en vez de recién al guardar. Casos **FI-A…FI-F** |
| ~~10~~ | ~~**F6-C5** — el paso 3 no aclara la unidad~~ | ✅ **HECHO** | **APLICADO (22/07)**: *"Monto de descuento **por producto**"* + ayuda *"se resta a cada unidad: en un carrito con 3 productos descuenta 3 veces"*. El % aclara que se calcula sobre el precio de venta |
| ~~11~~ | ~~**F6-C6** — el checkout no muestra QUÉ producto tiene la promo, ni cuál promo es~~ | ✅ **HECHO** | **APLICADO (22/07)**: `PricedLine.promo` expone la ganadora que el motor ya elegía y tiraba. Carrito: el nombre bajo cada producto. Checkout: **una fila por promo** con su ahorro, en vez de un "Promoción aplicada" único. Casos **LP-A…LP-F** |
| ~~12~~ | ~~**B-10** — el CheckoutModal tiene su PROPIA cuenta del precio base~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: ahora usa `resolveBasePrice` del motor. Se borró la copia local (y el `isWholesale` que quedó sin uso). tsc + eslint limpios |
| ~~13~~ | ~~**F6-C7** — avisar cuando una promo nueva nunca va a aplicar (tapada por otra)~~ | ✅ **HECHO** | **APLICADO (22/07)**: `deadPromoCheck` + cartel ámbar en Revisá. Solo afirma "nunca" con las tres condiciones cumplidas (tipos comparables, mínimo igual o menor, vigencia cubierta entera). Casos **DM-A…DM-K**, la mayoría verificando que se CALLE |
| ~~14~~ | ~~**F6-C8** — "Compra mínima" no dice que se mide sobre TODO el pedido~~ | ✅ **HECHO** | **APLICADO (22/07)**: *"Compra mínima **del pedido**"* + *"Cuenta el total del carrito, no solo los productos en promoción."* |
| ~~15~~ | ~~**F6-C9** — avisar al crear un PRODUCTO que cae bajo una promo fija peligrosa~~ | ✅ **HECHO** | **APLICADO (22/07)**: `deepestFixedOnProduct` + endpoint `/api/dashboard/promociones/vigentes`; aviso bajo el campo de precio en el formulario de productos, ámbar desde 50% y rojo si queda gratis. **Avisa, no frena.** Casos **PP-A…PP-I** |
| ~~16~~ | ~~**B-11** — el N×M cobra $1 de más por cada 3 talles distintos~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: reparto con redondeo acumulado (`repartirNxM`), la suma cierra siempre. Casos **SP-M / SP-N / SP-O / SP-P** en la suite |
| ~~17~~ | ~~**F6-C10** — el alcance significa distinto según el tipo y la pantalla era la misma~~ | ✅ **HECHO** | **APLICADO (22/07)**: el paso 2 cambia de pregunta según el tipo (*"¿En qué productos vale el 3×2?"* / *"¿Qué productos se pueden mezclar?"*) + aviso en el N×M de que cada producto arma su grupo y **los talles cuentan juntos**. Requería B-11 arreglado, y lo estaba |
| ~~18~~ | ~~**F6-C11** — Combo con UN solo producto~~ | ✅ **HECHO** | **APLICADO (22/07)**: aviso ámbar (`WarnNote`) al elegir un único producto con el combo. Avisa, no bloquea |
| ~~19~~ | ~~**B-12** — con dos promos de envío gratis, cuál se nombra depende del orden de la base~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: gana el umbral **más alto ya superado**, desempate por nombre. Mismo criterio que `resolveStoreEvent`. Caso **SP-Q** |
| 20 | **#7c** — el envío bonificado NO se resta de la ganancia (Métricas miente) | 🔴 plata | ✅ **SOLUCIÓN ACORDADA (22/07)**, falta implementar — requiere migración |
| ~~21~~ | ~~**F6-C12** — el paso 4 apila 19 chips de evento para un campo opcional~~ | ✅ **HECHO** | **APLICADO (22/07)**: toggle apagado por defecto + desplegable al prenderlo. Se borró `EventChip` (quedó sin uso). Además avisa cuando completa las fechas solo, y deja de avisar si las tocás |
| ~~22~~ | ~~**B-13** — un monto escrito con separador de miles se guarda ÷1000~~ | ✅ **HECHO** | **ARREGLADO (22/07)**: `parseMoneyInput` en `promotions.ts` lee a la argentina (punto = miles, coma = decimal), y `moneyInputValue` hace el camino de vuelta al editar. Casos **MP-A…MP-I** |
| — | *(lo que agregue Flavio en esta ronda)* | | |

#### B-13 — "$5.000" se guarda como $5 (encontrado 22/07)

El campo del monto acepta puntos y comas (`digitsMoney`), pero `parseNum` los interpreta como **decimales**:
`parseNum("5.000")` → `parseFloat("5.000")` → **5**. Lo mismo `"5,000"`. Solo sale bien si se tipea `50000`
sin separadores — y el placeholder del campo dice justamente `$ 5.000`, o sea que **el ejemplo enseña la
forma que se rompe**. Afecta al monto fijo y a la compra mínima (los dos usan `digitsMoney` + `parseNum`).

**No es nuevo** — está desde que existe el campo. Aparece ahora porque la línea viva de F6-C4 lo hace
visible: escribiendo `5.000` el panel contesta *"Con $5 de descuento…"*, que es la primera vez que el
sistema dice en voz alta lo que entendió.

→ Arreglo: `parseNum` tiene que distinguir separador de miles de separador decimal (en es-AR el decimal es
la **coma** y el punto es de miles), o el campo tiene que formatear mientras se tipea. **Ojo**: `parseNum`
también la usa el % — ahí no molesta porque son enteros de 1 a 90, pero el arreglo tiene que no romperlo.

✅ **ARREGLADO (22/07)**. Al medirlo en vivo resultó **peor de lo estimado** — no era solo `"5.000" → 5`:

| Escrito | Se guardaba | Ahora |
|---|---|---|
| `5.000` | **$5** | $5.000 |
| `1.234.567` | **$1,234** | $1.234.567 |
| `$ 12.000` | **$12** | $12.000 |
| `1.234,56` | **$1,234** | $1.234,56 |

`parseMoneyInput` (en `promotions.ts`, no en la pantalla, para poder congelarlo en la suite): con coma
presente, ella es el decimal y los puntos son de miles; sin coma, todos los puntos son de miles.

**Lo que casi se rompe al arreglarlo**: la precarga al **editar** hacía `String(editPromo.value)`, que da
formato inglés (`"5000.5"`) — con el parseo nuevo eso se leería como **50005**. O sea que el arreglo,
solo, convertía un bug de tipeo en uno peor: *abrir una promo y guardarla sin tocar nada le multiplicaba
el monto por mil*. Por eso existe `moneyInputValue`, el camino de vuelta, y el caso **MP-I** lo congela
como ida y vuelta (`parseMoneyInput(moneyInputValue(n)) === n`).

El `%` no se tocó y no podía romperse: su campo filtra con `onlyDigits`, así que nunca tiene separadores.

#### #7c — cómo se entera Métricas del envío regalado (acordado 22/07)

**El dato ya existe y se está tirando.** En [checkout/route.ts:412](src/app/api/checkout/route.ts):

```ts
const effectiveShippingCost = pricing.freeShipping ? 0 : shipping.cost;
```

`shipping.cost` es **exactamente lo que se bonificó**: se calcula, se compara y se descarta.

**Solución mínima honesta** (la que ya proponía el plan, ahora con el punto de enganche identificado):

1. Columna nueva en `Order` (ej. `shippingWaived Float?`) — **requiere migración → va en un lote de deploy**
2. Al cobrar: si `pricing.freeShipping`, guardar ahí `shipping.cost` (lo que **iba** a cobrarse)
3. En Métricas: restarlo del profit

El pedido queda diciendo *"cobré $0 de envío, pero regalé $8.000"* y la ganancia deja de salir inflada.

⚠️ **Límite que hay que decir en voz alta**: es lo que la tienda **cobra** por ese envío, no lo que le
**cuesta**. Es una aproximación — pero es el único número que el sistema conoce de verdad, y es mucho
mejor que el $0 de hoy. Mismo criterio de honestidad que el piso de costo (proteger lo que se puede y
decir en voz alta lo que no).

✅ **Resuelve también el debate #11**: en un método `coordinar: true` el precio es $0, así que el envío
bonificado da $0 — que es **la verdad**, ahí no se regaló nada. El mismo dato responde las dos preguntas,
sin necesidad de prohibir la promo ni de un aviso especial.

#### F6-C12 — el paso 4 apila 19 chips para un campo opcional (22/07)

Flavio: *"no me gusta que esté todo apilado, ¿y si pones para activarlo con un toggle y que aparezca un
selector?"*. **De acuerdo**: 19 chips ocupan media pantalla para un campo **opcional** que la mayoría de
las promos no usa; quien solo quiere poner fechas se come todo eso.

**Decidido**: toggle apagado por defecto → al prenderlo, un **desplegable** (no chips). Motivos:
19 chips siguen siendo mucho aunque se abran, el desplegable escala si se agregan fechas, y quien pone un
evento **ya sabe cuál** — no necesita explorar. Contra honesto: con chips se **descubre** que existe la
opción; se compensa con el texto del toggle (*"Black Friday, Día de la Madre, Hot Sale…"*) como pista.

**Agregar además**: hoy `elegirEventoDelCalendario` ([PromocionesClient.tsx:387-394](src/app/dashboard/promociones/PromocionesClient.tsx))
**completa las fechas sin decirlo** — es una ayuda escondida. → *"Elegiste Black Friday — completamos las
fechas. Podés cambiarlas."* Ojo: solo completa si están **vacías** (`if (!endsAt)` / `if (!startsAt)`),
así que no pisa lo que ya cargaste. Está bien que no pise, pero hoy no se entiende por qué a veces las
fechas cambian y a veces no.

#### Revisión de `FREE_SHIPPING` (22/07) — cierra la ronda

✅ **El empujón del carrito es correcto**: $20.000 → *"faltan $30.000"* · $49.000 → *"faltan $1.000"* ·
$50.000 → gratis, sin empujón. `freeShippingProgress` elige el umbral **más bajo no alcanzado**, con
regla determinista.

✅ **El cruce con cupones es el mejor resuelto de los cinco tipos** — y esto **condiciona el arreglo de
B-08**:

| Carrito (promo `combinesWithCoupons=false`, mínimo $50.000) | Envío gratis | Cupón |
|---|---|---|
| $20.000 (no llega) | no | ✅ permitido |
| $60.000 (llega) | sí | ❌ bloqueado — **correcto** |

El filtro de `minOrderAmount` ya saca la promo de `eligiblePromos` cuando no aplica, así que acá no hay
falso bloqueo. ⚠️ **Por eso B-08 no se puede arreglar con "bloquear solo si `savings > 0`"**: el envío
gratis **otorga el beneficio sin generar ahorro de línea**, y ese criterio lo rompería. Confirmado con
números.

**B-12 — no determinismo al nombrar la promo de envío.** `priceCart` toma la promo de envío con
`eligiblePromos.find(...)` ([pricing.ts:387-389](src/lib/pricing.ts)): **la primera del array**, sin
regla de desempate. Con dos promos de envío vigentes, invertir el orden cambia el nombre reportado
(*"Promo vieja"* vs *"Black Friday envío gratis"*). El envío queda gratis igual → **no hay error de
plata**, pero el comprador puede leer un motivo que no es el real, y depende del `orderBy` de la
consulta.

> Incoherencia interna: el proyecto **ya resolvió exactamente esto** para los eventos —`resolveStoreEvent`
> tiene desempate explícito (gana el que termina antes) con el comentario *"sin una regla escrita… un bug
> que aparece meses después y no se puede reproducir"*. El envío gratis no tiene esa regla.
> → Aplicar el mismo criterio: umbral más alto alcanzado, o el que termina antes. Lo importante es que
> **haya una regla escrita**.

**#7c sigue sin decidir y es el ítem con más plata de la sección.** El envío bonificado no entra al
margen: `Order.shippingCost` guarda lo que pagó el **comprador**, no lo que le cuesta a la tienda. Si se
regala el envío, lo paga la dueña y **Métricas muestra la ganancia inflada** — cuanto mejor funciona la
promo, más miente. Es el único de los cinco tipos con un agujero en las métricas. Opción mínima honesta
ya propuesta en el plan: registrar *"envío bonificado $X"* usando el precio del método que se bonificó
(que **sí** se conoce: es el precio fijo configurado) y restarlo del profit.

#### `N_PAY_M` vs `MIX_N_PAY_M` — por qué se confunden (22/07)

Flavio: *"no le encuentro la diferencia, los dos se llevan uno gratis"*. Tiene una explicación exacta:
**con 3 unidades del mismo producto los dos tipos dan idéntico resultado** (verificado: −$50.000 los
dos). La diferencia aparece **solo al mezclar**:

| El cliente lleva | `N_PAY_M` | `MIX_N_PAY_M` |
|---|---|---|
| Remera + pantalón + campera (3 distintos) | paga los 3 | **paga 2** (regala el más barato) |
| 3 remeras iguales | **paga 2** | **paga 2** |

**Por qué existen los dos** (no es redundancia): el 3×2 obliga a llevar 3 **iguales** → vacía un modelo
puntual, sirve para liquidar stock. El Combo deja llevar uno de cada cosa → sube el ticket promedio pero
no limpia ningún modelo. Empujan compras distintas.

→ Esto refuerza **F6-C10**: si el panel explicara la diferencia **donde se elige** (y no solo en el paso
1), la confusión no aparecería. Es el mismo problema de *momento*.

✅ **Sano — el alcance es obligatorio**: `canNext` del paso 2 exige categoría elegida (`!!cat`) o al
menos un producto (`prodIds.length > 0`), y `validatePromotionBody` lo vuelve a rechazar en el server
(*"Elegí al menos una categoría/producto"*). No hay agujero ahí.

**F6-C11** — pero con `MIX_N_PAY_M` y **un solo producto** elegido, el wizard **deja seguir**. La promo
no puede mezclar nada y termina comportándose igual que un `N_PAY_M`. No está rota, pero no hace lo que
la persona cree. → Aviso (sin bloquear): *"Elegiste un solo producto. El combo sirve para que el cliente
mezcle varios — con uno solo funciona igual que 'Llevá N, pagá M'."*

#### Revisión de `N_PAY_M` (22/07)

Verificado con el motor (remeras de $10.000, promo 3×2 con `scope=CATEGORY`):

| Caso | Resultado |
|---|---|
| 3 remeras **distintas** (negra + blanca + roja) | ahorro **$0** — correcto, es del mismo producto |
| 3 unidades de la **misma** remera | ahorro $10.000 ✅ |
| La misma remera en talles **S, M, L** | ahorro $9.999 ❌ → **B-11** |
| 4 unidades (un grupo + 1 suelta) | paga 3 ✅ |
| 6 unidades (dos grupos) | paga 4 ✅ |
| 1 unidad, promo que no combina con cupones | ahorro $0 y **cupón bloqueado** → **B-08** |

✅ **Sano**: los talles/variantes del mismo producto **suman** para el N×M (`totalQtyByProduct` agrupa por
`productId`, no por variante), que es lo que uno espera. Los grupos parciales se resuelven bien.

**F6-C10 — el alcance SIGNIFICA distinto según el tipo, y la pantalla es idéntica en los cinco.**

Flavio, sobre el paso 2 con `N_PAY_M`: *"¿acá solo me debería dar la opción de elegir por producto? si
elijo tres categorías y llevo una de cada una, ¿estaría haciendo lo del combo?"*

Verificado — misma config (3 categorías, 3×2), cambiando solo el tipo:

| Carrito | `N_PAY_M` | `MIX_N_PAY_M` |
|---|---|---|
| Un pantalón + una campera + una remera | **$0** | **−$45.000** (regala la campera) |
| 3 remeras iguales | −$50.000 | −$50.000 |

→ **No, no es lo mismo que el combo.** Y con 3 iguales los dos tipos coinciden: la diferencia aparece
**solo al mezclar**.

**¿Restringir `N_PAY_M` a `PRODUCTS`? NO.** Elegir una categoría acá es un **atajo para habilitar muchos
productos**: con 20 modelos de remera, `CATEGORY` los habilita los 20 de una (cada uno con su propio
3×2). Sacarlo obligaría a tildar 20 productos para algo que hoy son dos clics.

**El problema real es la pregunta, no las opciones:**

| Tipo | Qué significa elegir "remeras" |
|---|---|
| `PERCENT` / `FIXED` | dónde **se aplica** el descuento |
| `N_PAY_M` | qué productos pueden **armar su propio grupo** de 3 |
| `MIX_N_PAY_M` | qué productos se pueden **mezclar entre sí** |

Los tres usan el mismo título *"¿A qué se aplica?"*. → **Cambiar la pregunta del paso 2 según el tipo.**
Para `N_PAY_M`: *"¿En qué productos vale el 3×2?"* + nota:

> *"Cada producto arma su propio grupo de 3 — los talles y colores del mismo producto cuentan juntos.
> Para que el cliente pueda mezclar productos distintos, usá 'Combo: llevá N mezclando'."*

**Las dos mitades de la nota importan** y responden dos confusiones distintas que tuvo Flavio:

1. *"elegir muchos productos"* ≠ *"combinarlos"*. El alcance dice **qué productos tienen su propio 3×2**,
   no "llevá estos tres juntos". Con un 3×2 sobre [remera negra, remera blanca, pantalón]: 1 de cada uno
   → **sin descuento**; 3 remeras negras → sí. **La categoría no interviene**: dos remeras distintas de
   la misma categoría siguen siendo productos distintos; lo único que agrupa es el `productId`.
2. **Los talles/colores SÍ suman** (son variantes del mismo `productId`): remera negra en S+M+L cuenta
   como 3. Para una tienda de ropa esto es lo primero que necesita saber, y hoy no está dicho en ningún
   lado. ⚠️ Es exactamente el caso de **B-11** (cobra $1 de más), así que al documentarlo conviene tener
   ese bug arreglado — si no, el panel promete algo que se cobra con un peso de sobra.

> El texto del **tipo** (paso 1) ya lo explica bien y hasta deriva al Combo. El problema es **dónde**: se
> lee en el paso 1 y la decisión que lo contradice se toma en el paso 2. No es un problema de redacción
> (como F6-C1/C2) sino de **momento** — el recordatorio tiene que estar donde se decide.

✅ **Sano — el comprador no tiene que buscar**: cada producto alcanzado muestra su badge `3×2` en la
tarjeta, el modal y el detalle (Fase 4.5, caso DP-C de la suite). Lo que no ve es **cuál** promo le tocó
cuando hay varias → F6-C6.

#### ⬆️ B-09 sube de prioridad: bloquea el caso estrella del Combo (22/07)

`B-09` entró como una comodidad ("*20% en remeras y buzos* obliga a crear 2 promos"). Revisando
`N_PAY_M`/`MIX_N_PAY_M` resulta ser más que eso.

La explicación del Combo en el propio panel dice:

> *"el cliente combina lo que quiera de lo que elijas **(una remera + un pantalón + una campera)** y el
> más barato de cada 3 le sale gratis"*

Ese ejemplo **cruza tres categorías**, y el selector deja elegir **una sola**. → **El panel describe algo
que el panel no deja configurar.** Es la promo insignia del tipo y no se puede armar por categorías.

Y no es una limitación del motor: en la corrida de F6-C10 se le pasaron las 3 categorías y funcionó
perfecto (−$45.000, regaló la campera). **Solo falta el selector.**

**Rodeos que existen hoy** (por eso no es un bloqueo total, pero sí una mala experiencia):
`scope=PRODUCTS` tildando cada prenda una por una — en Girly Store serían **24 productos a mano** para lo
que deberían ser 3 clics — o `scope=ALL`, más amplio de lo que se quería.

→ Al implementar B-09, **priorizar**: no es solo comodidad, habilita el caso de uso principal de
`MIX_N_PAY_M`.

**B-08 se confirma acá, y es su peor escenario**: el 3×2 es el tipo donde más va a pasar, porque casi
todos los carritos empiezan con **una** unidad — o sea que el cupón queda bloqueado justo cuando la promo
todavía no dio nada.

#### Diseño propuesto para B-07 (cómo avisar, planteo de Flavio 22/07)

*"¿cómo le hacemos saber que ese producto no se puede aplicar por el monto fijo cuando estamos creando
la promo?"*

**Ya existe el molde**: el paso 5 (Confirmar) muestra un cartel ámbar con los productos que quedan bajo
costo (Fase 3). Mismo lugar, mismo formato, mismos datos — `page.tsx` ya trae los productos con precio.

**(a) Paso 3, línea viva bajo el campo del monto** (solo `FIXED`):
> Con **$12.000**, el más barato (Remera $22.000) queda en **$10.000** — *55% de descuento*

Se recalcula al tipear. Normal <50%, ámbar ≥50%, rojo si algo llega a $0. (Esto **es** F6-C4.)

**(b) Paso 5, cartel con la lista**, calcado del de piso de costo:
> ⚠️ **3 productos quedan con más de la mitad de descuento** · Remera $22.000 → $10.000 (55%) · …

**(c) 🔴 El caso `$0` SÍ se bloquea — recomendación, y el motivo importa:**
el resto de los avisos no bloquean (regla de Flavio, y se respeta), pero *"producto gratis"* es
distinto **por coherencia interna del sistema**: `PERCENT` ya está topeado en 90 y **no** en 100
justamente porque *"un 100% regala el producto"* — y ese tope **sí es un bloqueo duro que ya existe en
el código**. Si el porcentaje no puede llegar al 100%, el monto fijo tampoco debería.

> **B-07 no es "falta un aviso": es que falta el mismo candado que el otro tipo ya tiene.**

Mensaje al rechazar, nombrando el producto: *"Con $12.000, la Remera básica ($10.000) quedaría gratis.
Bajá el monto o sacala del alcance."*

#### F6-C9 — el hueco de los productos futuros

Todo lo de arriba mira **el catálogo de hoy**. Con `scope=ALL`, si mañana se carga un producto de $8.000
bajo una promo fija de $12.000 activa, entra a una promo que le da 100% de descuento y **nadie revisó
nada** — el chequeo pasó cuando se creó la promo.

→ El aviso tiene que estar **en la otra puerta**: al crear/editar un **producto**, si cae bajo una promo
`FIXED` activa que lo dejaría gratis o casi, avisar ahí. Mismo principio de siempre (avisarle al dueño,
nunca frenar al comprador), en el otro extremo del flujo.

⚠️ Sin esto, el candado de (c) da una **falsa sensación de cobertura**: protege el momento de crear la
promo y deja abierto el de crear el producto.

✅ **APLICADO (22/07)**. `deepestFixedOnProduct` es el **espejo** de `fixedImpact`: allá es una promo contra
el catálogo, acá es un producto contra las promos vigentes. Los dos usan el mismo cálculo por dentro, y el
caso **PP-I** congela justamente eso — que las dos pantallas digan el mismo número. Si cada una hiciera su
cuenta, tarde o temprano una diría *"queda en $4.000"* y la otra *"queda en $3.995"*.

El aviso vive bajo el campo de precio del formulario de productos y se recalcula al tipear. Ámbar desde
50%, rojo si el producto queda gratis.

**Decisiones al implementarlo:**

- **Solo promos `active`** — una pausada o programada no le está descontando nada a nadie hoy. Avisar por
  ellas sería una alarma por algo que no está pasando.
- **Endpoint propio** (`/vigentes`) y no el GET de la lista: ese pagina, incluye pausadas y archivadas y
  devuelve la promo entera para pintarla. El formulario de productos no tiene por qué arrastrar todo eso.
- **Avisa, no frena** — el precio del producto es una decisión del dueño, y la promo se arregla del otro
  lado. ⚠️ **Queda un hueco consciente**: un producto puede terminar mostrándose gratis si el dueño ignora
  el cartel rojo. Frenarlo es una decisión de Flavio, no mía: bloquear el guardado de un producto por una
  promo ajena es mucho más molesto que bloquear la promo, que es donde el candado ya está.
- **En producto NUEVO no matchea `scope=PRODUCTS`** y está bien: todavía no tiene id, así que no puede
  estar en una lista de elegidos. Al **editar** sí (caso PP-F).

#### F6-C8 — la compra mínima se mide sobre el carrito entero (22/07)

Revisado el último campo del paso 3. **No está roto**, pero tiene la misma falla que F6-C5: el campo no
dice contra qué se mide.

`minOrderAmount` se compara contra `preSubtotal`, que es el subtotal de **todo el carrito** sin promos
([pricing.ts:319-324](src/lib/pricing.ts)) — no contra los ítems en alcance. Verificado con
*"20% en remeras, comprando $50.000 o más"*:

| Carrito | ¿Aplica? |
|---|---|
| Una remera de $10.000 | ❌ no |
| Una remera de $10.000 **+ un pantalón de $45.000** | ✅ **sí** (compró $10.000 de remeras y se llevó el 20%) |
| Solo pantalones por $60.000 | ❌ no (no hay remeras en alcance) |

**Es una interpretación válida** —"compra mínima del pedido", que es lo que hace Shopify— y medirla sobre
el pre-subtotal evita la circularidad (el descuento no se muerde la cola). No se cambia el
comportamiento. Pero el campo dice solo *"Compra mínima (opcional)"* y quien arma *"20% en remeras desde
$50.000"* puede estar pensando *"el que me compre $50.000 **de remeras**"*.

→ **Propuesta**: `Compra mínima del pedido (opcional)` + ayuda: *"Cuenta el total del carrito, no solo
los productos en promoción."*

> Patrón que se repite en el paso 3: **los tres campos son números sin unidad declarada** — el monto fijo
> no dice "por producto" (F6-C5), el porcentaje no dice que es sobre el precio de lista, y la compra
> mínima no dice que es del pedido. Conviene resolverlos juntos, es el mismo arreglo.

#### F6-C7 — promos superpuestas: NO bloquear, avisar (22/07)

Planteo de Flavio: *"si hago una promo de % en pantalones y después una de $, ¿me debería dejar elegir
pantalones o tacharlo como ocupado?"*.

**Respuesta: no se bloquea.** Verificado con el motor — dos promos sobre la misma categoría **no se
pisan, se reparten**: cada producto toma la que más le conviene al comprador.

Con `20% en pantalones` + `$12.000 en pantalones`, sobre los pantalones reales de Girly Store:

| Pantalón | Con 20% | Con $12.000 | Gana | Paga |
|---|---|---|---|---|
| $53.000 | $42.400 | **$41.000** | el fijo | $41.000 |
| $68.000 | **$54.400** | $56.000 | el % | $54.400 |
| $80.000 | **$64.000** | $68.000 | el % | $64.000 |

El barato toma el monto fijo, los caros toman el porcentaje, **sin que nadie lo configure**. Bloquear
mataría eso. Y además:

- `10% en toda la tienda` + `30% en pantalones` es de las combinaciones **más útiles** que hay (la
  general hace de piso, la específica gana donde aplica). Es como funciona Shopify. Bloquear `ALL`
  porque existe una promo de categoría mataría el caso más común. **`ALL` no queda inútil: queda como piso.**
- Las promos tienen **fechas**: una de diciembre y otra de enero sobre la misma categoría no se pisan
  nunca. Bloquear mirando solo el alcance ignora el tiempo. (Y también pueden estar pausadas.)

**Lo que sí hay que avisar — el hallazgo real:** se puede crear una promo que **nunca va a aplicar**.
Con `30% en pantalones` ya activa, crear `20% en pantalones` da una promo muerta: el motor siempre
elige la del 30%, pero la del 20% aparece en la lista como *"Activa"*, con su nombre y su fecha, y es un
adorno. Verificado: `producto $60.000 → paga $42.000 · aplicó: 30% OFF`.

→ Propuesta: en el paso **Confirmar**, avisar *"Ya tenés '30% en pantalones' activa. Esta promo no se va
a aplicar nunca porque la otra siempre conviene más."* Sin bloquear — misma filosofía que el piso de
costo. ⚠️ Ojo al calcularlo: "nunca aplica" depende del **precio de cada producto** (el ejemplo de
arriba muestra que un fijo puede ganar en los baratos y perder en los caros), así que solo es "muerta"
si pierde en **todos** los productos del alcance. Y hay que contemplar fechas que no se solapan.

✅ **APLICADO (22/07)** — `deadPromoCheck`, cartel ámbar en Revisá.

**El riesgo de este aviso no es dejar pasar una promo muerta: es la falsa alarma.** Decirle *"esto no va
a aplicar nunca"* a alguien que armó una promo perfectamente buena rompe la confianza en **todos** los
demás avisos del panel. Por eso la función es deliberadamente conservadora y **8 de los 11 casos
congelados verifican que se calle**, no que hable.

**Tres condiciones para animarse a decir "nunca", y las tres tienen su caso:**

| Condición | Por qué | Caso |
|---|---|---|
| Solo entre `PERCENT` y `FIXED` | Un 3×2 da o no da según **cuántas** unidades lleve el comprador: con una sola no da nada y el % sí. No se puede afirmar "nunca" sobre algo que depende de la cantidad | **DM-I** |
| La rival pide un carrito **igual o más chico** | Si pide más, hay compras donde la nueva es la única que aplica | **DM-E** |
| La rival cubre la vigencia nueva **entera** | Solaparse a medias la tapa un rato, no siempre | **DM-G** / **DM-H** |

Y el caso que da nombre a todo esto: **DM-C** confirma con los pantalones reales que un `%` y un monto
fijo **se reparten** los productos —el fijo gana en el barato, el % en los caros— así que ninguna de las
dos está muerta y el panel **no dice nada**. Ese es el que hubiera dado la falsa alarma si el chequeo
mirara solo "cuál descuenta más".

**Extras que salieron solos**: `DM-J` (crear dos veces la misma promo sin darse cuenta también avisa,
porque empatar tampoco aporta) y `DM-K` (dos promos que **entre las dos** cubren todo el catálogo — se
nombran las dos).

#### F6-C6 — carrito mixto: qué ve el comprador (22/07)

Pregunta de Flavio: *"si selecciono 3 productos y 2 están con la promo y el otro no, ¿qué pasa? ¿cómo
se ve? ¿y en el checkout?"*. Verificado en el código:

| Pantalla | Qué muestra |
|---|---|
| **Carrito** ([CartDrawer.tsx:80-91](src/components/store/templates/shared/CartDrawer.tsx)) | ✅ **Bien**: por línea. El producto con promo muestra el precio viejo tachado + el nuevo en color; el que no tiene promo muestra su precio normal. Abajo, *"Promoción aplicada −$X"* |
| **Checkout** ([CheckoutModal.tsx:191-207](src/components/store/templates/shared/CheckoutModal.tsx)) | ⚠️ **Sin detalle**: cada ítem se lista a precio de lista (`itemEffectiveUnitPrice × qty`) y el descuento aparece **solo como un total** al pie. No se ve cuál de los 3 productos tenía la promo |

Además, **ninguna de las dos dice QUÉ promo se aplicó** — las dos dicen *"Promoción aplicada"* a secas.
El motor ya calcula `appliedPromos` (nombre + etiqueta + ahorro de cada una) y hoy eso **solo se usa en
el email**. Con dos promos distintas en el mismo carrito, el comprador ve un número y ningún motivo.

→ Propuesta: en el checkout, marcar la línea con promo igual que el carrito; y en las dos pantallas,
nombrar la promo cuando hay una sola (*"3×2 en remeras −$10.000"*), o listar las dos si hay varias.

**¿Y si el comprador eligiera qué promo aplicar?** (planteo de Flavio, 22/07) — **No.** Elegir solo
puede empeorarle el precio (el motor ya le da el más barato de todos, cualquier otra opción es igual o
peor), agrega una decisión sin respuesta correcta en el momento de mayor abandono, y no lo hace ni
Shopify ni Tiendanube. Lo que falta no es la elección, es el aviso.

**El habilitador técnico (chico, y cambia el tamaño del trabajo):** `priceCart` **ya sabe** qué promo
ganó cada línea — lo guarda en `winnerByLine` mientras calcula ([pricing.ts:330-349](src/lib/pricing.ts))
— pero **no lo devuelve**: `PricedLine` sale con `{ unitPrice, lineTotal, promoApplied, savings }` y sin
identidad de la promo. `appliedPromos` existe pero está **agregado a nivel carrito**, así que sirve para
el pie del total y no para etiquetar una línea.

Por eso el carrito puede tachar el precio pero no puede decir el motivo. → Agregar el nombre/etiqueta de
la promo ganadora a `PricedLine`. **No hay que recalcular nada ni tocar la cuenta**: es exponer un dato
que el motor ya tuvo en la mano. Con eso las tres pantallas (card, carrito, checkout) pueden nombrarla
desde la misma fuente, sin una segunda cuenta (que es justo lo que causó B-10).

✅ **APLICADO (22/07)**, y salió tal cual estaba previsto: `PricedLine.promo` expone lo que el motor ya
elegía. **Ningún número de la suite se movió** — es dato nuevo, no una cuenta nueva.

- **Carrito**: el nombre de la promo bajo cada producto, en el color de acento.
- **Checkout**: **una fila por promo** con su ahorro (`appliedPromos`, la misma lista que sale en el email)
  en vez del *"Promoción aplicada"* único. Si por lo que fuera no llegara el detalle, cae en la fila
  genérica de antes: el ahorro nunca deja de mostrarse.

**Alcance real, verificado**: los **8** templates de tienda usan `shared/CartDrawer` y `shared/CheckoutModal`,
así que un solo cambio los cubre a los ocho. (AutoDrive y AutoMotor no tienen carrito — son de vehículos.)

⚠️ **Efecto colateral que hubo que arreglar**: el paso 5 del asistente decía *"Ponele un nombre **(lo ves
solo vos)**"*. Eso **ya era falso antes** de este cambio — el email del pedido viene mostrando
`nombre · etiqueta` al comprador desde la Fase 4 ([email.ts:543](src/lib/email.ts)) — y F6-C6 lo empeoraba
llevándolo a dos pantallas más. Ahora dice: *"Ponele un nombre y confirmá. Lo van a ver tus clientes en el
carrito y en el mail del pedido."* Si un nombre suena interno, conviene revisarlo: **lo lee el cliente**.

#### B-10 — el CheckoutModal reimplementa el precio base (a verificar antes de tocar)

[CheckoutModal.tsx:33-44](src/components/store/templates/shared/CheckoutModal.tsx) define
`itemEffectiveUnitPrice`, que resuelve variante + mayorista + escalones **por su cuenta**, en vez de
usar `resolveBasePrice` del motor. Es una segunda cuenta del precio viviendo fuera de `pricing.ts` —
exactamente lo que la Fase 1 existía para eliminar.

**Y no es una copia idéntica**: tiene un gate `if (!isWholesale || ...)` que el motor **no tiene a
propósito** (ver **B-06**: *"el checkout nunca tuvo ese gate; mantenerlo en el carrito re-crearía la
desincronización que la Fase 1 elimina"*). Se sacó del carrito y quedó vivo acá.

Se usa en dos lugares que importan: el precio por ítem que se lista (:100) y el `fullTotal` del que sale
`promoSavings = fullTotal − cartTotal` (:193-194) — o sea que el *"Promoción aplicada −$X"* del checkout
**mezcla un número propio con uno del motor**. Si los dos caminos no coinciden, ese ahorro se muestra mal.

✅ **VERIFICADO (22/07) — la divergencia es real, pero está dormida.**

`useCartLogic` ([:359-368](src/hooks/useCartLogic.ts)) llama a `resolveBasePrice` **sin gate**, y el
comentario del código lo dice explícito: *"Mismo resolvedor que el checkout … **Sin gate de modo (como el
checkout)**"*. El `CheckoutModal` sí lo tiene. **No es un descuido de copia**: la Fase 1 lo removió de las
otras dos puntas y esta tercera copia quedó atrás.

**Qué pasaría si se despertara** (producto que califica por cantidad + tienda con el modo mayorista
apagado): el motor usa el precio mayorista y el `CheckoutModal` muestra el retail → precios por ítem que
no coinciden con lo cobrado, y la diferencia cae dentro de *"Promoción aplicada"*, **atribuyendo a una
promo lo que es descuento mayorista**. El **cobro sigue siendo correcto** (el total sale del motor); lo
que miente es el desglose en pantalla.

**¿Corre hoy? NO** — consultado en la base: `precioMayorista` cargado en **0** productos ·
`cantMinMayorista` en **0** · `tieneVentaMayorista=true` en **0 de 4** tiendas. Tan dormido como B-01 y
por el mismo motivo (nadie llegó al switch).

→ **Baja urgencia, pero NO bajar de prioridad dentro de la tanda 1**: es una **tercera copia** de la
cuenta del precio, y mientras exista, cualquier arreglo del motor **no llega a esa pantalla**. El arreglo
es chico: reemplazar `itemEffectiveUnitPrice` por `resolveBasePrice`, que es lo que ya usan las otras dos
puntas.

#### F6-C5 — "Monto de descuento" no dice por unidad (22/07)

Flavio, leyendo el formulario, entendió que `FIXED` descontaba **del total del pedido**: *"junta todos
los productos, los suma, y el descuento lo hace con respecto a eso"*. No es así, y el formulario nunca
lo aclara.

**Comportamiento real** (verificado con el motor, promo de $10.000):

| Carrito | Sin promo | Con promo | Descontó |
|---|---|---|---|
| 3 productos distintos, 1 c/u | $155.000 | $125.000 | **$30.000** |
| 1 producto × 3 unidades | $150.000 | $120.000 | **$30.000** |
| 1 unidad | $50.000 | $40.000 | $10.000 |

Es `Math.max(0, basePrice - value) * quantity` ([pricing.ts:205](src/lib/pricing.ts)): **por unidad**,
sin tope de pedido. Una promo llamada *"$10.000 de descuento"* descuenta $10.000 **× la cantidad de
unidades en alcance** — con 10 prendas son **$100.000 en un solo pedido**.

**El campo hoy** ([PromocionesClient.tsx:562](src/app/dashboard/promociones/PromocionesClient.tsx)) dice
solo `Monto de descuento`, placeholder `$ 5.000`. El de `PERCENT`, en cambio, sí se explica
(`Porcentaje de descuento (1 a 90)`).

→ **Propuesta**: `Monto de descuento por producto` + ayuda debajo: *"Se resta a cada unidad. En un
carrito con 3 productos, descuenta 3 veces."*

⚠️ **Ojo al implementar**: esto NO es lo mismo que B-07. B-07 es que el descuento puede superar el
precio (producto gratis); esto es que **se multiplica por la cantidad**. Son dos formas distintas de
crecer y se suman: un producto barato comprado de a muchos combina las dos. Un aviso que solo mire el
precio unitario no cubre este caso.

#### F6-C4 — ayudar a armar la promo (planteo de Flavio, 22/07)

> *"si es riesgoso, ¿no deberíamos ayudar al usuario a armar su promoción? ¿poner recomendado en alguno
> de los tres: tienda, categoría o producto?"*

El instinto es correcto: avisar en el paso Confirmar (piso de costo, Fase 3) llega tarde — hay que
guiar **mientras** se arma. Pero un badge fijo de *"Recomendado"* por alcance **no sirve**, y el motivo
importa: **el alcance riesgoso depende del tipo**. Para `PERCENT`, `ALL` es perfectamente seguro (siempre
da el mismo %, sin importar el rango de precios); recomendar ahí "mejor por categoría" sería un consejo
falso. El mismo cartel no puede servir para los cinco tipos.

**Propuesta: mostrarle sus propios números en vez de nuestra opinión.** Dos lugares:

1. **Paso 2 (alcance)** — cada opción con su rango, igual que el selector de productos que ya muestra
   precio: *"Toda la tienda · 44 productos · $22.000 a $130.000"* / *"remeras · 5 productos · $22.000 a
   $38.000"*. Esto **es** F6-C3, extendido a las tres opciones.
2. **Paso 3 (monto)** — línea viva mientras escribe, solo en `FIXED`: *"Con $10.000, el más barato
   ($45.000) queda en $35.000 — 22% de descuento."* Color según severidad: normal hasta ~50%, ámbar más
   allá, rojo si algún producto llega a $0.

Se apoya en la regla ya derivada (`monto ÷ precio del más barato del alcance`) y en datos que el server
**ya trae** (los productos con precio, para el piso de costo). Es coherente con el patrón del panel:
avisar sin bloquear, que es la regla de Flavio desde la Fase 3.

⚠️ Pendiente de definir: en `scope=ALL` el alcance incluye **productos futuros**, así que la línea del
paso 3 describe el catálogo de hoy, no el de mañana. No invalida el aviso, pero no puede presentarse
como una garantía (mismo límite que B-07).

#### Dato real del catálogo (consultado 22/07, no supuesto)

Consultado en vivo mientras se analizaba el alcance del monto fijo:

| Tienda | Productos activos | Rango de precios |
|---|---|---|
| Girly Store | 44 | $22.000 → $130.000 (**x5,9**) |
| Amaranta | 42 | $33.000 → $170.000 (**x5,2**) |

Pero **dentro de cada categoría el rango se achica**: remeras x1,7 · camperas x1,8 · Sweater x1,5 ·
pantalones x1,5 (la excepción es *vestidos* de Amaranta, x4,9).

**Por qué importa**: confirma con datos que `FIXED` es sano por categoría y riesgoso en `ALL`. Con
$20.000 off en toda Girly Store, **10 productos** quedarían con más del 50% de descuento sin que nadie
lo haya pedido. Ninguna tienda tiene hoy productos tan baratos como para que un monto típico los deje
gratis — o sea que **B-07 no está explotando hoy**, pero está a un producto barato de distancia.

**Regla que sale de acá para el aviso de B-07**: el descuento más profundo de una promo `FIXED` es
`monto ÷ precio del producto MÁS BARATO del alcance`. Un solo número mide el riesgo, y se puede calcular
al crear la promo con los productos que ya están en alcance. (Ojo: en `scope=ALL` el alcance incluye
productos futuros, así que el chequeo al crear no cubre todo — ver B-07.)

- **F6-C3** — el selector de **productos** muestra el precio al lado de cada uno, pero el de
  **categorías** solo dice *"N productos"*. Con `FIXED` esa es justo la información que hace falta para
  no equivocarse. → Mostrar el rango: *"remeras · 5 productos · $22.000 a $38.000"*. Barato de hacer (el
  server ya trae los productos con precio para el piso de costo) y ataca la causa de B-07 antes de que
  ocurra, en vez de avisar después.

#### Detalle de los de texto (revisión del % con Flavio, 22/07)

- **F6-C1** — `TYPE_META` ([PromocionesClient.tsx:41-46](src/app/dashboard/promociones/PromocionesClient.tsx)):
  `PERCENT` dice *"Ej. 20% off en las remeras"* y `FIXED` *"Ej. $5.000 off en camperas"*. Los dos nombran
  una categoría en el **paso 1**, que es donde se elige el TIPO; el alcance se decide recién en el paso 2.
  Da a entender que esos tipos son para categorías.
  ✅ **DECIDIDO (Flavio, 22/07)**: el paso 1 responde QUÉ tipo de descuento es; el DÓNDE es el paso 2, y
  no se mezclan. Ejemplos neutros: `PERCENT` → *"Ej. 20% de descuento"*, `FIXED` → *"Ej. $5.000 de
  descuento"*. La duda de "¿dónde se aplica?" que dispara el ejemplo se responde con una línea aparte en
  la explicación del tipo y no metiéndola en el ejemplo.
  ✅ **DECIDIDO (22/07), redactado y listo para aplicar — NO implementado todavía** (se probó y se
  revirtió: la ronda es de análisis, se toca código recién cuando esté toda la cola ordenada).

  **Textos finales acordados** (`TYPE_META`, [PromocionesClient.tsx:41-46](src/app/dashboard/promociones/PromocionesClient.tsx)):

  | Campo | Queda |
  |---|---|
  | `PERCENT.short` | `Ej. 20% de descuento` |
  | `PERCENT.ed` | `El cliente ve el precio original tachado y el nuevo debajo. Se aplica solo con entrar a tu tienda: no tiene que escribir ningún cupón.` |
  | `FIXED.short` | `Ej. $5.000 de descuento` |
  | `FIXED.ed` | `Se resta la misma plata a cada producto, cueste lo que cueste. Ideal para liquidar: en uno de $30.000 son $5.000 menos, y en uno de $8.000 también.` |
  | Encabezado paso 1 | `Elegí cómo querés que se descuente — abajo te explico cada una. En el paso siguiente elegís dónde se aplica: toda la tienda, categorías o productos sueltos.` |

  Notas de la redacción: (a) la aclaración del alcance va en el **encabezado del paso 1**, no en cada
  tipo — vale para los cinco y repetirla era ruido; (b) la explicación de `FIXED` también nombraba una
  categoría (*"$5.000 menos en toda campera"*), misma falla que el ejemplo, y el reemplazo muestra lo que
  hace **único** al tipo (el descuento no cambia con el precio), que es justo lo que lo vuelve peligroso
  (ver B-07); (c) el encabezado conserva el *"abajo te explico cada una"* original; (d) los otros tres
  tipos ya tenían ejemplos neutros y no se tocan.
- **F6-C2** — mismo lugar: *"Se aplica solo en la tienda, sin escribir ningún código"*. La intención (por
  la segunda mitad) es "automático, sin cupón", pero *"solo en la tienda"* se lee como "solo en la tienda
  online, no en otro lado" — y esa lectura **tampoco es falsa** (un pedido armado a mano por WhatsApp no
  pasa por el motor). Dos significados verdaderos y ninguno claro. → *"Se aplica solo con entrar a tu
  tienda: el cliente no tiene que escribir ningún cupón."*

#### Verificado sano en este repaso (no tocar)

- **N×M repartido en 2 variantes** del mismo producto: $6.667 + $13.333 = **$20.000 exacto**, sin
  deriva de redondeo. Era sospecha propia y quedó descartada.
- **Mix & match**: regala las unidades más baratas del conjunto y solo si mejora el total. No apila.
- **Alcance por categoría**: no toca lo que está fuera, ni bloquea cupones de más (es el control que
  prueba que B-08 es un problema del gate y no del scope).
- **Autoridad del server**: el checkout relee las promos de la base dentro de la transacción. Un POST
  por consola no puede inventar un precio.

#### Veredicto sobre el diseño de combinación (22/07)

Flavio: *"¿y está bien que funcione así?"* (best-of, sin apilar, sin poder habilitar el apilado).

**El motor está bien. Lo que falta es la comunicación.** No hay que cambiar la regla:

- El comprador siempre paga lo más barato de lo que la tienda ofreció, y se explica en una frase.
- No apilar protege el margen — el ejemplo del propio plan (oferta 30% + 3×2 + cupón 24% → bajo costo,
  $76.000 de pérdida en 30 unidades) es exactamente lo que evita.
- Shopify y Tiendanube arrancan sin combinar, por separado y por el mismo motivo.
- El público real (2 tiendas de conocidos, 58 productos, **0 con `costPrice`**) no está para un
  interruptor de apilado: sería una trampa, no una función.

**Pero el best-of decide en silencio, y hoy nadie se entera de lo que decidió.** Ese es el costo del
diseño y no está pagado:

- El comprador no sabe **qué** promo se le aplicó (**F6-C6**). Si la tienda anunció un 3×2 y el motor le
  dio un 20% porque convenía más, el comprador cree que perdió el 3×2.
- La dueña no sabe **cuál perdió** (**F6-C7**): una promo tapada figura como *"Activa"* y no hace nada.

→ Los ítems 11 y 13 de la cola **no son extras: son la contracara del diseño**. Si el sistema decide
solo, tiene que contar qué decidió.

**Nota menor**: `combinesWithPromotions` existe en la base, siempre vale `false` y el wizard nunca lo
muestra. Está documentado como decisión consciente (esperando que una dueña real lo pida), pero es un
campo que hoy no hace nada — tenerlo presente contra la regla del proyecto de "nada de código muerto".

#### 🎯 PRINCIPIO RECTOR DE LA FASE (Flavio, 22/07)

> *"acordate que esto de promociones tiene que ser un sistema inteligente para que ayude a la hora de
> crear una promoción"*

No alcanza con que el motor calcule bien. **El panel tiene que ayudar a decidir**, no solo impedir
errores. Qué significa "inteligente" acá, en concreto:

| No es | Es |
|---|---|
| Validar que el número sea válido | Mostrar **qué va a pasar** con ese número |
| Consejos genéricos ("cuidado con los descuentos") | **Sus propios productos y precios**, calculados |
| Avisar después de guardar | Avisar **mientras decide**, en el paso donde elige |
| Un mensaje de error | Un mensaje que **nombra el producto** y qué hacer |
| Bloquear por las dudas | Avisar; bloquear **solo** donde el sistema ya decidió que algo es inválido (ver B-07/c) |

**La cola de la Fase 6 ya responde a esto** — conviene leerla con esta lente:

- **F6-C3** (rango de precios en el selector) → le da el dato **mientras** elige el alcance
- **F6-C4** (línea viva al escribir el monto) → le muestra la consecuencia **antes** de guardar
- **F6-C7** (promo tapada por otra) → detecta una configuración **inútil**, no inválida
- **F6-C9** (aviso al crear el producto) → cierra la puerta que el chequeo de la promo no ve
- **F6-C6** (nombrar la promo aplicada) → la misma idea, del lado del comprador

**Ideas candidatas que salen de aplicar este principio** (🔲 sin decidir, para evaluar):

1. **Sugerir el tipo según el catálogo real**: si la categoría elegida tiene precios parejos (x1,5), el
   monto fijo es sano; si están desparramados (x5), recomendar porcentaje. Se apoya en el dato que ya
   consultamos (rango por categoría) y no en una opinión genérica.
2. **Resumen de impacto al confirmar**: *"Alcanza 14 productos · descuento real entre 17% y 22% ·
   ahorro promedio $9.400 por unidad"*. Responde "¿qué acabo de crear?" de un vistazo, con sus números.
3. **Aviso de solapamiento de fechas**: dos promos sobre el mismo alcance corriendo a la vez — no para
   bloquear (ver F6-C7), sino para que sepa que conviven y cuál va a ganar.

#### 🚦 QUÉ FALTA PARA ARRANCAR (22/07)

**Ya decidido, listo para implementar (6):** B-09 · F6-C1 · F6-C2 · F6-C12 · #7c · #11 *(cerrado por #7c)*.

**✅ Las 4 definiciones pendientes quedaron CERRADAS (Flavio, 22/07 — aceptó las recomendaciones):**

| # | Decisión | Motivo registrado |
|---|---|---|
| 1 | **B-07: el caso "$0" se BLOQUEA**, no se avisa | Único lugar de la fase donde se traba, y no es criterio nuevo: `PERCENT` ya está topeado en 90 para que nada quede gratis. Es la misma regla aplicada al tipo que no la tenía. El resto de los avisos siguen sin bloquear |
| 2 | **#12: queda como está** — el envío gratis por producto/categoría **libera el pedido entero** | El envío es del pedido, no del ítem. La alternativa (exigir que TODO el carrito esté en alcance) es más restrictiva y más difícil de explicar al comprador |
| 3 | **La fase va por TANDAS**, no todo junto | 21 ítems en un solo lote es imposible de verificar y de revertir |
| 4 | **La migración de #7c viaja sola o al final**, nunca mezclada con los arreglos del motor | La base local ES producción: una migración solo se prueba post-deploy. Mezclarla con cambios de precios haría imposible saber qué rompió qué |

**Tarea previa a estimar (no es una decisión):** verificar **B-10**. Está marcado "a verificar" y hasta
saber si los dos caminos divergen no se puede dimensionar. Es lo primero que haría.

**Orden sugerido, en tres tandas:**

1. **Lo que hoy cobra o bloquea mal** (sin migración, todo dentro del motor + su caso en la suite):
   **B-11** (único que ya cobra de más) → **B-07** → **B-08** → **B-12**.
2. **El wizard** (sin migración): **B-09** (desbloquea el caso estrella del Combo) → textos y momentos
   (**F6-C1, C2, C5, C8, C10, C11, C12**) → los números en vivo (**F6-C3 + C4**, que son el mismo trabajo)
   → los avisos (**F6-C7, C9, C11**).
3. **Con migración, en un lote de deploy**: **#7c** (envío bonificado en Métricas).

**F6-C6** (nombrar la promo aplicada) puede ir en la tanda 1 o 2: el habilitador es chico (exponer la
promo ganadora en `PricedLine`) pero toca las 3 pantallas del storefront.

⚠️ **Dependencia que no se puede invertir**: **B-11 antes que F6-C10**. La nota de C10 documenta que "los
talles cuentan juntos", que es justo el caso que B-11 cobra con $1 de más. Documentarlo antes de
arreglarlo pone por escrito una promesa que se cobra mal — y hoy el bug está oculto solo porque nadie
sabe que esa combinación funciona.

#### Regla de esta fase

Cada arreglo entra con **su caso en `pricing.check.ts`**. Los dos bugs existen justamente porque la
suite no cubría esos escenarios; cerrarlos sin agregar el caso deja la puerta abierta a que vuelvan.

---

## SEGURIDAD

| Riesgo | Hoy | Con el plan |
|---|---|---|
| Cliente manda precios falsos | ✅ cubierto — el server recalcula desde la DB | igual, no se toca |
| Descuentos que se acumulan sin freno | ❌ **abierto** | `combinesWith*` + piso de costo |
| Promo vencida que sigue aplicando | ⚠️ `offerEndsAt` es solo visual; la promo de cantidad **no tiene fecha** | `startsAt`/`endsAt` validados en el server |
| Tope de descuento | ⚠️ magic numbers locales (50k vs 100k, inconsistentes) | constantes con nombre y justificación |
| Promo de otra tienda | ✅ el checkout filtra por `storeId` | mantener: `Promotion` siempre filtrada por `storeId` |
| Total negativo | ✅ `Math.max(0, ...)` | mantener + piso de costo |

**Regla que no se negocia**: el cliente puede *proponer* un precio; el server siempre lo *recalcula*.
El motor es una función pura justamente para que las dos puntas usen la misma cuenta sin que el
cliente sea la autoridad.

---

## VERIFICACIÓN

1. **Antes de tocar nada**: una tabla de casos con los números de hoy (producto simple, con promo %,
   con N×M, con mayorista, con cupón, y todas las combinaciones). Es la red de seguridad de la Fase 1:
   el refactor tiene que dar **exactamente** lo mismo.
2. `npx tsc --noEmit` + `npx eslint` + `npx next build` (nunca `npm run build` — corre migraciones
   contra la base de producción).
3. Migración: mostrar el SQL antes de aplicar.
4. Matriz de estados en el navegador: promo por categoría → agregar al carrito → checkout → que el
   precio cobrado sea el mostrado.
5. **Nada se deploya sin que Flavio lo pruebe.**

---

## FUERA DE ALCANCE

- Migrar los cupones a Promociones (ya funcionan, tienen su sección).
- Mayorista (es una lista de precios, no una promoción).
- Descuento por medio de pago (Tiendanube lo tiene; nosotros no, y no se pidió).
- Tocar "¿Está en oferta?" — se queda como el `compare-at` que es.
- **Arreglar la cotización en vivo de Envíopack** (falta el ID de localidad y la cuenta marketplace).
  Está apagada a propósito y así se queda. El envío gratis no la necesita.

---

## POR QUÉ ESTE PLAN ES TAN CONSERVADOR

Flavio: *"no quiero jugar con la plata de los demás"*.

Eso es exactamente la columna vertebral del plan, y explica las dos decisiones que más van a molestar:

1. **La Fase 1 no agrega ninguna feature.** Unificar 20 copias de la cuenta antes de construir arriba.
   Se siente como no avanzar. Pero si las promos nuevas se apoyan en 20 copias, el bug no va a salir
   en el código nuevo: va a salir en la copia que nos olvidamos, y se ve como un precio mal cobrado.
2. **El default es no combinar.** Como Tiendanube. Que acumular descuentos sea una decisión del dueño
   y no un accidente del sistema.

Y hay un tercer motivo que Flavio marcó y es cierto: **no tenemos ecosistema de apps**. Shopify y
Tiendanube se apoyan en terceros para tapar los huecos (el tachado de Shopify lo hace una app de
terceros). Nosotros no tenemos a quién delegarle nada: lo que no construimos bien, no existe. Eso es
un argumento para hacerlo bien una vez, no para hacerlo rápido.
