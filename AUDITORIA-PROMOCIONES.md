# Auditoría completa — Promociones de punta a punta

**Fecha:** 22/07/2026 · **Alcance:** todo el recorrido de una promoción, desde que se crea en el panel
hasta que aparece en el mail que recibe el comprador.
**Método:** lectura del código real, con cita de archivo y línea. Ningún código fue modificado.
**Estado del sistema auditado:** commit `c9685bb`, en producción.

---

## 0. Resumen ejecutivo

**Lo que está sano:** el precio se calcula **una sola vez**, en un solo lugar (`priceCart`), y todas las
pantallas leen de ahí. Verificado numéricamente: motor, card de la tienda, asistente y formulario de
productos dan el **mismo número** para el mismo caso. El desglose de promos viaja **congelado** en el
pedido (`promoSummary`), así que el comprobante no cambia si después se edita la promo.

**Lo que encontré, ordenado por gravedad:**

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| **A-01** | Mercado Pago puede cobrar **$1 más** que el total del pedido en promos N×M | 🔴 plata | ✅ **ARREGLADO** |
| **A-02** | El mail de "pago acreditado" por **transferencia** llega sin ningún desglose | 🟠 confianza | ✅ **ARREGLADO** |
| **A-03** | El webhook de MP **no valida** que lo pagado coincida con el pedido | 🟠 seguridad | ✅ **ARREGLADO** |
| **A-04** | El detalle del pedido en el panel **no muestra** qué promo se aplicó | 🟡 visibilidad | ✅ **ARREGLADO** |
| **A-05** | Con envío bonificado + Envíopack, la tienda absorbe la **tarifa real** sin aviso previo | 🟡 diseño | ✅ **ARREGLADO** |

Ninguno de estos rompía el sitio. **A-01 era el único que movía plata**, y solo en una combinación
concreta que se detalla abajo.

> **Los cinco se arreglaron el 22/07**, después de esta auditoría. El detalle de cada arreglo está al pie
> de su sección. La auditoría se deja escrita **con el problema y con la solución**: sirve más para
> entender por qué el código es como es que una descripción del estado final.

---

## 1. El motor: una sola cuenta

Todo el sistema de precios pasa por `priceCart` ([pricing.ts](src/lib/pricing.ts)). No hay una segunda
implementación en ningún lado — esto se logró en la Fase 6 al matar B-10 (el checkout tenía su propia
copia) y se sostiene porque cada pantalla nueva consume el resultado en vez de recalcular.

**Quiénes lo llaman:**

| Consumidor | Para qué |
|---|---|
| [useCartLogic.ts:377](src/hooks/useCartLogic.ts) | carrito y checkout de las 8 tiendas |
| [checkout/route.ts:392](src/app/api/checkout/route.ts) | **la cuenta que cobra** — dentro de la transacción |
| [promoDisplay.ts:137](src/lib/promoDisplay.ts) | precio mostrado en cards, modales y detalle |
| [promotions.ts](src/lib/promotions.ts) | avisos del panel (piso de costo, impacto del monto fijo) |

**Regla de oro verificada:** el cliente nunca es autoridad del precio. El checkout **relee las promos de
la base** dentro de la transacción ([checkout/route.ts:366-389](src/app/api/checkout/route.ts)) y vuelve a
calcular. Un carrito manipulado desde el navegador no cambia lo que se cobra.

**Vigencia:** activa + sin archivar + dentro de `[startsAt, endsAt]`. Se evalúa contra la hora del
servidor en el momento de cobrar, no contra lo que dijo el navegador.

### Los cinco tipos y qué hace cada uno

| Tipo | Qué hace | Se acumula |
|---|---|---|
| `PERCENT` | % menos sobre el precio de cada unidad | ❌ mejor de todas |
| `FIXED` | monto fijo menos **por unidad** | ❌ mejor de todas |
| `N_PAY_M` | llevá N del **mismo** producto, pagá M | ❌ mejor de todas |
| `MIX_N_PAY_M` | llevá N **mezclando**, los más baratos gratis | ❌ una sola por carrito |
| `FREE_SHIPPING` | el envío pasa a $0 | ✅ **se suma** a las demás |

**Nunca se apilan descuentos de producto**: cada línea toma la promo que más le conviene al comprador
(*best-of*). Dos promos sobre la misma categoría **se reparten** los productos — el monto fijo gana en los
baratos y el porcentaje en los caros — sin que nadie lo configure.

El envío gratis es la excepción y es correcta: no toca el precio del producto, así que convive con
cualquier otra promo.

### El piso: nada se vende regalado

```ts
Math.max(it.basePrice * MIN_PRICE_RATIO, it.basePrice - p.value)   // pricing.ts
```

Ningún descuento directo puede dejar un producto por debajo del **10% de su precio**. Es el espejo del
tope de 90 que el `PERCENT` ya tenía. **No aplica** al 3×2 ni al combo: ahí la unidad gratis es la promesa
explícita de la promo.

Efecto lateral relevante: **Mercado Pago rechaza una preferencia con `unit_price: 0`**, así que antes del
piso un pedido en $0 no era solo plata regalada — reventaba en el pago.

---

## 2. Cómo se ve cada promoción en la tienda

Una sola función decide qué se muestra por producto: `resolveProductPromo`
([promoDisplay.ts:144](src/lib/promoDisplay.ts)), y **reusa el motor** para el precio. Prioridad:

1. Descuento directo **sin** mínimo → precio tachado + nuevo + `-20%`
2. Descuento directo **con** mínimo → **no se tacha** (no está garantizado), nota *"20% desde $50.000"*
3. `N×M` / combo → badge `3×2`, sin cambiar el precio unitario
4. Envío gratis → badge *"Envío gratis"*

**Por qué el caso 2 importa:** si hay compra mínima, el descuento **no se promete tachando el precio**.
Es una decisión correcta — tachar algo que el comprador puede no conseguir es una promesa falsa.

### Dónde aparece

| Lugar | Qué muestra |
|---|---|
| Card del listado | `PromoTag` naranja + precio tachado |
| Modal de vista rápida | Tag + **`PromoBlock`** (qué es, dónde vale, condiciones) |
| Detalle del producto | Ídem, [ProductDetailClient.tsx:246-362](src/app/tienda/[slug]/producto/[id]/ProductDetailClient.tsx) |
| Carrito | Precio tachado + **nombre de la promo** por línea |
| Checkout | **Una fila por promo** con su ahorro |

**El código de colores es deliberado:** la promoción de tienda va en **naranja** (`PromoTag`) y la oferta
del producto en **rojo** (`OfferBadge`), para que el comprador distinga de un vistazo dos cosas distintas.

**Cobertura:** los **8** templates con carrito usan `shared/CartDrawer` y `shared/CheckoutModal`, así que
un cambio los alcanza a todos. AutoDrive y AutoMotor no tienen carrito (venden por consulta) — las promos
no aplican ahí, y es correcto.

---

## 3. Envíos

### Cómo se decide el costo

`resolveShipping` ([checkout/route.ts:52-82](src/app/api/checkout/route.ts)):

| Caso | Costo |
|---|---|
| Retiro en local | `0` |
| Método "a coordinar" | `0` |
| Tarifa plana | el precio configurado |
| Cotización en vivo (Envíopack) | la tarifa cotizada |
| Envíopack falla | cae a *"(a coordinar)"* con `0` — **no bloquea la venta** |

### Cuando la promo bonifica el envío

```ts
const effectiveShippingCost = pricing.freeShipping ? 0 : shipping.cost;
const shippingWaived        = pricing.freeShipping ? shipping.cost : 0;
```

El pedido queda diciendo *"cobré $0 de envío, pero regalé $8.000"*. Antes ese costo **desaparecía del
sistema** y Métricas lo contaba como ganancia — una promo de envío gratis *mejoraba* las métricas en vez
de costar.

**"A coordinar" no cuenta como envío regalado**, y está bien: su costo ya era 0, no se regaló nada porque
nunca se iba a cobrar nada.

### 🟡 A-05 — la tienda absorbe la tarifa real de Envíopack

Con envío gratis + cotización en vivo, `shipping.cost` es **la tarifa real que cotizó Envíopack**, que
varía por destino y peso. La tienda la absorbe entera, y el asistente de promociones **no avisa** que un
envío gratis sin tope puede costar mucho más a Ushuaia que a 20 cuadras.

Hoy es teórico (Envíopack marketplace todavía no está habilitado). Pero cuando se active, una promo de
*"envío gratis desde $50.000"* puede costar bastante más de lo que la dueña imaginó.

✅ **ARREGLADO (22/07)** — el paso de reglas del envío gratis ahora avisa con **los envíos reales de esa
tienda**, mismo criterio que el monto fijo:

> ⚠️ Cada envío que regales te lo pagás vos. Los **12** que ya despachaste costaron **$7.400 en promedio**
> y hasta **$14.200** el más caro. Con esa plata en juego, conviene poner una compra mínima que la cubra.

Si la tienda **todavía no despachó nada**, no se inventa un número: se muestra la advertencia sin cifras,
explicando que con cotización en vivo la tarifa la pone el transportista y cambia por destino.

Y se agregó un segundo aviso, que resultó ser el más importante: **sin compra mínima, TODOS los pedidos
van con envío gratis**, incluso uno de un solo producto barato — el caso donde el envío se come la
ganancia entera. Ese aviso no dependía de Envíopack y no existía.

### El empujón al comprador

`freeShippingProgress` ([useCartLogic.ts:389](src/hooks/useCartLogic.ts)) calcula cuánto falta para el
envío gratis y el carrito muestra *"Agregá $X más y el envío es gratis"*. Es la única función de promos
que empuja a subir el ticket, y está bien resuelta: desaparece sola cuando ya se alcanzó.

**Con dos promos de envío gratis vigentes**, gana la del umbral **más alto ya superado** — la que mejor
explica el beneficio. Antes dependía del orden en que la base devolvía las filas.

---

## 4. Pagos

### El recorrido

1. El checkout crea el pedido en **`PENDING`** con el precio ya calculado y congelado.
2. Según el medio:
   - **Mercado Pago** → se crea una preferencia y el comprador va a pagar. El webhook confirma.
   - **Transferencia / efectivo** → el pedido queda `PENDING` y la dueña lo confirma a mano desde el panel.

**Los pedidos con link de afiliada solo pueden pagarse con MP**
([checkout/route.ts:152](src/app/api/checkout/route.ts)) — la comisión necesita el split del pago.

### 🔴 A-01 — Mercado Pago puede cobrar $1 más que el pedido

**El hallazgo más importante de esta auditoría.**

En [mp/checkout/route.ts:49-64](src/app/api/mp/checkout/route.ts):

```ts
const hasAdjustments = (order.discountAmount ?? 0) > 0 || (order.shippingCost ?? 0) > 0;
const items = hasAdjustments
  ? [{ ..., unit_price: order.total, quantity: 1 }]      // ✅ total exacto
  : order.items.map((item) => ({ unit_price: item.price, quantity: item.quantity }));  // ⚠️
```

Cuando **no hay cupón ni costo de envío**, la preferencia se arma **ítem por ítem**, con
`item.price × item.quantity`. Y el propio checkout deja escrito que esa cuenta **no cierra** en un N×M
([checkout/route.ts:399](src/app/api/checkout/route.ts)):

> *"El total exacto de la línea — para el N×M no coincide con price × qty."*

**El caso concreto:**

| Dato | Valor |
|---|---|
| 3 unidades de $10.000 con un 3×2 | |
| `lineTotal` (lo que vale la línea) | **$20.000** |
| `price` (unitario redondeado) | `round(20000/3)` = **$6.667** |
| Lo que MP cobra: `6.667 × 3` | **$20.001** |
| Lo que dice el pedido | **$20.000** |

**Se cobra $1 de más.** Es el mismo error que B-11 (que se arregló en el motor), sobreviviendo en el
camino de MP porque ahí el total se **reconstruye** desde el unitario en vez de usarse directo.

**Cuándo se dispara** — hacen falta las tres condiciones a la vez:
- promo `N_PAY_M` o `MIX_N_PAY_M` aplicada (donde el unitario no divide exacto),
- **sin cupón**, y
- **sin costo de envío** (retiro en local, "a coordinar", o **envío gratis por promo**).

Retiro en local + 3×2 es una combinación perfectamente normal en una tienda de ropa.

✅ **ARREGLADO (22/07)** — se consolida **siempre** en un ítem con `order.total`. Se eligió esto y no
"agregar `promoSavings` a la condición" porque elimina la **clase entera** de error: nunca más se
reconstruye un número que ya estaba calculado, que es la causa de fondo (la misma de B-10 y B-11).

Se pierde el detalle por ítem en la pantalla de MP — pero eso ya pasaba en la mayoría de los pedidos
(cualquiera con cupón o envío pago), y el comprador tiene el desglose completo en el mail.

### 🟠 A-03 — el webhook no valida el monto pagado

[mp/webhook/route.ts](src/app/api/mp/webhook/route.ts) confirma el pedido si `payment.status === "approved"`,
**sin comparar `payment.transaction_amount` contra `order.total`**.

Contrasta con el webhook de suscripciones, que **sí** valida
([suscripcion/webhook/route.ts:93](src/app/api/suscripcion/webhook/route.ts)):

```ts
if (expectedAmt !== null && payment.transaction_amount < expectedAmt * 0.95) { ... }
```

O sea: el patrón correcto ya existe en el repo, pero no se aplicó a los pedidos de tienda. Hoy nadie
detectaría una diferencia — incluido el peso de A-01.

✅ **ARREGLADO (22/07)** — mismo criterio que suscripciones, tolerancia del 5%:

- **Pagó de menos** (bajo el 95%) → **no se confirma** el pedido y se registra el desvío.
- **Pagó de más** (sobre el 105%) → se confirma igual (puede ser un ajuste de MP) pero queda registrado.

La tolerancia no es capricho: las cuotas con recargo las liquida MP y no siempre coinciden al peso.

### Comisión de afiliadas

```ts
const commissionBase = Math.max(0, (order.subtotal ?? order.total) - (order.discountAmount ?? 0));
```

La comisión se calcula sobre el subtotal **ya con promos aplicadas**, menos el cupón. **Es correcto**: la
afiliada cobra sobre lo que la tienda efectivamente vendió, no sobre precios de lista que nadie pagó. El
envío no entra en la base, que también es correcto.

---

## 5. Emails

### Qué mail se manda y cuándo

| Mail | Cuándo | ¿Lleva las promos? |
|---|---|---|
| Confirmación al comprador | al crear el pedido | ✅ **completo** |
| Aviso a la dueña | al crear el pedido | ✅ **completo** |
| Pago acreditado (**MP**) | webhook de MP | ✅ **completo** |
| Pago acreditado (**transferencia**) | la dueña confirma a mano | ❌ **solo el total** |

Los dos primeros salen para **todos** los medios de pago ([checkout/route.ts:796-825](src/app/api/checkout/route.ts)),
con el `emailPayload` completo: ítems, subtotal, `appliedPromos`, `freeShippingPromo`, ahorro, envío.

### Cómo se ven las promos en el mail

- **Una fila por promo**: `🎉 Verano en remeras · 20% OFF — $2.000` ([email.ts:536](src/lib/email.ts))
- **Fila de envío que distingue** *"¡Gratis!"* por promo de *"Sin cargo"* por retiro
  ([email.ts:554](src/lib/email.ts)) — una distinción fina y bien hecha
- **Banner de ahorro total** sumando ofertas + promos + cupón

Todo sale de `promoSummary`, el JSON **congelado en la venta**. Si la promo después cambia, se pausa o se
archiva, **el comprobante sigue diciendo la verdad de lo que se cobró**. Y el parseo es tolerante: si el
dato viniera roto, el mail simplemente no muestra promos en vez de fallar.

### 🟠 A-02 — el mail de transferencia llega vacío

[orderActions.ts:140-147](src/lib/orderActions.ts):

```ts
sendOrderPaymentConfirmedEmail({
  buyerEmail, buyerName, orderId, storeName, storeSlug,
  total: order.total,     // ← y nada más
});
```

Comparado con el mismo mail por MP ([mp/webhook/route.ts:243-266](src/app/api/mp/webhook/route.ts)), que
manda ítems, subtotal, cupón, envío, `appliedPromos`, `freeShippingPromo` y `promoSavings`.

**La plantilla soporta todos esos campos** (son opcionales), así que no falla: **degrada en silencio** a un
mail con el total pelado.

**Por qué importa más de lo que parece:** el comentario de la propia plantilla dice que es *"el mail que el
comprador guarda como comprobante"*. Un comprador que paga por transferencia recibe un comprobante sin
detalle, sin lo que compró y **sin la promo que lo convenció de comprar**. Y transferencia es el medio más
usado en tiendas chicas.

✅ **ARREGLADO (22/07)** — ahora manda el **mismo** payload que el webhook de MP: ítems con variante,
subtotal, cupón, envío, `appliedPromos`, `freeShippingPromo` y el ahorro. Se agregó `coupon` a la consulta
de `runOrderAction`, que era el único dato que no venía.

Nada se recalcula: todo sale de la orden tal como se cobró, con las promos congeladas en la venta.

---

## 6. Panel de la dueña

### El asistente de 5 pasos

| Paso | Qué resuelve |
|---|---|
| 1 · Tipo | qué clase de descuento, con ejemplos neutros |
| 2 · Alcance | toda la tienda / categorías / productos — **la pregunta cambia según el tipo** |
| 3 · Reglas | el monto, con **la consecuencia en vivo** |
| 4 · Vigencia | fechas, evento comercial, combinación con cupones |
| 5 · Revisá | resumen + todos los avisos juntos |

**Los avisos, y cuál es el único que bloquea:**

| Aviso | ¿Frena? |
|---|---|
| Piso de costo (queda bajo su costo) | ❌ avisa |
| Descuento profundo (más de la mitad) | ❌ avisa |
| Promo que nunca va a aplicar | ❌ avisa |
| Combo con un solo producto | ❌ avisa |
| **Producto que quedaría casi regalado (>90%)** | ✅ **bloquea** |

El único bloqueo no es una opinión de negocio: es que el motor **no puede honrar** esa configuración, así
que se frena en vez de recortar en silencio.

### Estadísticas

[promociones/page.tsx:26-48](src/app/dashboard/promociones/page.tsx) — un pedido cuenta como "con promo"
si tiene `promoSummary`, **no si ahorró plata**. Es la definición correcta: una promo de envío gratis no
toca `promoSavings` y aun así se aplicó.

### 🟡 A-04 — el detalle del pedido no muestra la promo

`promoSummary` se guarda en cada pedido y se usa en los mails y en el conteo de la sección Promociones,
pero **ninguna pantalla del panel lo muestra**. Abriendo un pedido, la dueña ve el total y el ahorro, pero
no **qué promo** lo produjo.

El comprador lo ve en su mail; la dueña no lo ve en su panel. Cuando alguien pregunte *"¿por qué este
pedido salió más barato?"*, el dato está guardado y no está a la vista.

✅ **ARREGLADO (22/07)** — el desglose del pedido ahora muestra **una fila por promo** (`🎉 Verano ·
20% OFF −$2.000`) y, cuando el envío fue bonificado, **cuánto le costó**
(`🚚 Envío gratis · Verano — te costó $8.000`), usando `shippingWaived`.

Se corrigió además algo que salió al implementarlo: el bloque de desglose solo aparecía si había cupón o
envío pago. **Con una promo sin cupón y con envío gratis no se mostraba nada** — ni siquiera el subtotal.
Ahora también aparece cuando hay promo.

---

## 7. Métricas

El envío bonificado se resta en un bloque propio: *"Envíos que regalaste −$X"* y *"Ganancia después de los
envíos"*, tanto en pantalla ([metricas/page.tsx](src/app/dashboard/metricas/page.tsx)) como en el **CSV**
([metricas/export/route.ts](src/app/api/dashboard/metricas/export/route.ts)).

**Va aparte de la rentabilidad por producto a propósito:** el envío es un costo **por pedido** y la
rentabilidad se calcula **por ítem**. Repartirlo entre los productos del carrito sería inventar un número
que después aparecería en *"Rentabilidad por producto"* como si fuera real.

**Límite conocido y aceptado:** `shippingWaived` guarda lo que la tienda **cobra** por ese envío, no lo que
le **cuesta**. Es una aproximación — pero es el único número que el sistema conoce, y el precio que la
dueña le pone a un envío de tarifa plana ya es su propia estimación del costo. Se revisará cuando Envíopack
entregue la tarifa real con la cotización.

---

## 8. La red de seguridad

`npx tsx src/lib/pricing.check.ts` — **120 casos congelados**, sin runner de tests en el repo. Sale con
código 1 si algún número se movió.

| Familia | Qué protege |
|---|---|
| `SP-*` | los cinco tipos, mínimos, best-of, alcance |
| `PISO-*` | el piso del 10%, y que el 3×2 y el combo **sí** sigan regalando |
| `FI-*` / `PP-*` | el impacto del monto fijo, desde la promo y desde el producto |
| `LP-*` | que cada línea nombre la promo que **ganó** |
| `DM-*` | la promo que nace muerta — **8 de 11 verifican que se calle** |
| `MP-*` | montos escritos a mano ("5.000" son cinco mil) |
| `CG-*` | el gate de cupones |

**Dos casos que valen más que el resto:**

- **`PISO-A`** ata el piso del motor con el tope del porcentaje. Si alguien cambia uno sin el otro, la
  suite falla. Sin eso, el sistema podía volver a quedar incoherente en silencio — que es exactamente
  cómo nació el bug del producto gratis.
- **`PP-I`** verifica que el asistente y el formulario de productos digan **el mismo número**. Es el
  antídoto contra la enfermedad que causó B-10.

---

## 9. Cierre

**Los cinco hallazgos quedaron arreglados el 22/07**, en el mismo día de la auditoría. `tsc` y `eslint`
limpios, suite congelada de 120 casos en verde, build limpio desde cero.

**El hilo que conecta A-01 con los bugs de la Fase 6.** B-10 fue una copia del cálculo de precio en el
checkout. B-11 fue reconstruir el total de una línea sumando unitarios redondeados. A-01 fue reconstruir
el total del pedido sumando unitarios redondeados **otra vez**, en el camino de Mercado Pago. Es el mismo
error tres veces, en tres lugares distintos:

> **Cada vez que un número ya calculado se vuelve a derivar en otro lado, tarde o temprano las dos
> versiones se separan.** El patrón correcto es exponer el número, no recalcularlo — y cuando no se puede,
> congelar un caso que ate las dos puntas (`PISO-A`, `PP-I`).

**Lo que no cambió, y es lo que más importa:** la cuenta sigue estando en un solo lugar. Ninguno de estos
arreglos agregó una segunda implementación — A-01 sacó una, A-02 y A-04 consumen datos ya guardados, y
A-05 muestra números que ya estaban en los pedidos.

### Deuda que queda abierta, a conciencia

- **`shippingWaived` guarda lo que la tienda cobra por el envío, no lo que le cuesta.** Es el único número
  que el sistema conoce. Se revisa cuando Envíopack marketplace entregue la tarifa real con la cotización.
- **El detalle por ítem se perdió en la pantalla de Mercado Pago** (A-01). Es el precio de la corrección;
  el comprador tiene el desglose completo en el mail.
