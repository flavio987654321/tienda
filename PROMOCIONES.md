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
- ✅ **Fase 3 — Piso de costo. COMPLETA (18/07, sin commit todavía).**
  - `promotions.ts`: `promoEffectiveUnitPrice` (reusa el MOTOR, no duplica la cuenta) + `costFloorCheck(promo, products)`
    → `{ below[], missingCost, inScope }`. FREE_SHIPPING corta antes (no toca precio). 7 casos en pricing.check.ts (CF-A..F), verdes.
  - Wizard (paso Confirmar): cartel ámbar con los productos que quedan bajo costo (queda $X / cuesta $Y) + nota de
    "N sin costo cargado". **NO bloquea crear** (gancho/liquidación es válido) — es la regla de Flavio.
  - Lista: chip "bajo costo" en las promos vivas que venden algo bajo costo.
  - `page.tsx` trae `costPrice`. Aviso a la dueña, NUNCA candado al comprador (el checkout no cambió). tsc+eslint+build ✓.
  - Aviso "aviso en pedidos" (notificar cuando un pedido real vende bajo costo) queda como opción C aditiva, NO hecho.
- 🔲 Fases 4, 4.5, 5 — pendientes.
- 🔲 Pendiente aparte: B-02 (mayorista puerta de una vía), **deploy de Fase 1 + Fase 2** (ambas commiteadas
  local, `25a649d` y `64ac3da`, sin pushear).

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
| 11 | ¿Qué pasa con envío gratis en métodos `coordinar`? | Impedir la promo o avisar: ahí el precio es $0 y se arregla por afuera, "gratis" no significa nada | 🔲 |

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

### Fase 4 — Migrar y limpiar 🔲
Backfill: cada producto con `promoQtyMin` → una `Promotion` que apunta a él. Recién ahí se borran los
campos del producto y el cartel de "Promoción por cantidad" del formulario.

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

### Fase 5 — Mix & match ("mezclar categorías") 🔲
"Llevá un pantalón + una remera + una campera → el más barato gratis". Lo más caro y lo menos urgente.

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
