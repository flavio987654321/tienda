# ECOSISTEMA — PRODUCTOS DIGITALES

> Documento vivo. Se tacha ítem por ítem al terminar cada cosa, no al final.
> Arrancado el 31/08/2026.
>
> **Reemplaza a `PRODUCTOS-DIGITALES.md`**, que queda como registro histórico del
> intento de hacerlo un rubro de tienda. Ese plan no se sigue más, pero **no se
> borra**: ahí vive lo que se midió y lo que salió mal, y buena parte se hereda
> (ver sección 5).

> ## 🚫 NO SE DEPLOYA
>
> Todo este ecosistema se trabaja y se mira **en local**. Commitear sí; deployar
> no, hasta nuevo aviso. Nada de esto tiene que llegarle a una tienda real
> mientras esté a medio hacer.

---

## 1. Qué estamos construyendo

El **cuarto ecosistema** de TiendaApps, al lado de los tres que ya existen:

| Ecosistema | Panel | Suscripción |
|---|---|---|
| Dueño de Tienda | `/dashboard` | Tienda Pro / Tienda Premium (paga) |
| Afiliado | `/afiliados` | Gratis |
| Cliente | `/mi-cuenta` | Gratis |
| **Productos Digitales** | **`/digitales`** *(a construir)* | **Free / Starter / Pro** |

**No es un rubro de tienda.** Se probó así y se retiró: quien vende archivos no
necesita variantes, talles, stock ni un checkout que pida dirección. Es otro
producto, no otra categoría — igual que pasó con afiliados y clientes.

**Conserva la apariencia de TiendaApps.** Las imágenes de referencia de la
competencia sirven para decidir *qué funciones* tiene, no para copiar el diseño
ni los números. El panel nuevo es el cuarto de la misma familia: mismo lenguaje
visual, mismo splash, mismo nav, distinto contenido.

---

## 2. DECISIONES CERRADAS (31/08/2026) — no volver a discutirlas

### 2.1 Hay plan gratis, y se paga con comisión

**Free para siempre, sin tarjeta, con la comisión más alta.**

El razonamiento: si no vende, no nos cuesta casi nada; si vende, cobramos. Es un
embudo muchísimo más ancho que un trial, y encima se autofinancia.

**Con transferencia BLOQUEADA en Free**, y eso no es mezquindad — ver 2.2.

### 2.2 Se cobra comisión por venta, escalonada e inversa al abono

Más abono, menos comisión. Al que vende mucho le conviene subir de plan, y
nosotros crecemos con él.

**Esto ya está cableado y andando.** No hay que construir infraestructura:

- `src/lib/mp.ts:79` ya manda `marketplace_fee` a Mercado Pago.
- `src/app/api/mp/checkout/route.ts:76-79` ya lo calcula sobre cada venta.
- Ya hay OAuth de Mercado Pago, token cifrado por tienda (`mpAccessToken`) y el
  vendedor cobra en su propia cuenta.

Hoy ese número es **100% la comisión del afiliado**. Cobrar comisión de
plataforma es **sumarle un sumando a un número que ya viaja**.

> #### ⚠️ La comisión SOLO existe con Mercado Pago
>
> `marketplace_fee` es un mecanismo de MP: la plata se retiene en la venta misma,
> antes de llegar al vendedor. Con **transferencia** y **efectivo** no pasa un
> peso por nosotros, así que **no hay nada que retener**.
>
> Por eso Free no lleva transferencia. Si se la damos, el del plan gratis se
> saltea la comisión entera y el plan deja de pagarse solo. La competencia hace
> exactamente esto (en su tabla, "Pagos con transferencia" está ❌ en Free y ✅
> desde el plan siguiente), y en esto sí les copiamos el mecanismo — no el precio.

### 2.3 Los planes se separan por CANTIDAD DE PRODUCTOS

**Una vidriera por cuenta, y cada producto con su propia página de venta.** Los
planes se diferencian por cuántos productos digitales podés tener.

#### Qué es una "tienda" en la plataforma de la foto (revisado 31/08)

Mirando una hecha de verdad (`detodo.impultienda.ar`, un ebook de mecánica) quedó
claro que **su "tienda" NO es una tienda: es la página de venta de UN producto**.
Larga, de arriba a abajo, y armada entera para convertir:

> barra de oferta con contador → gancho de dolor → el ebook con su rating →
> precio tachado y % de descuento → bonos gratis con su valor → cupos restantes →
> botón de compra → entrega inmediata / pago seguro / garantía → "qué vas a
> encontrar adentro" → "¿te sentís identificado?" (los dolores) → testimonios en
> formato captura de WhatsApp → "todo lo que incluye tu compra" (el apilado de
> valor) → cómo lo vas a aprovechar en 3 pasos → garantía de 7 días → preguntas
> frecuentes → cierre con el precio otra vez → **barra fija abajo** con contador,
> precio y botón

Un ebook = una página. Por eso venden "1 / 2 / 3 / 5 tiendas": **es cuántos
productos podés tener**, nada más. Le dicen "tienda" a lo que nosotros llamamos
ficha de producto.

#### Su "tienda" tiene UN producto (confirmado el 31/08 en su panel)

Su panel muestra *"Todas las tiendas — 1 de 1 usada"* en el plan Free, y en el
Ranking aparece **"Detodo"**, que es exactamente la página de
`detodo.impultienda.ar`. O sea: **su "5 tiendas" y nuestro "5 productos" son casi
lo mismo.** La única diferencia real es la dirección:

- Ellos: `detodo.impultienda.ar` — dirección propia, sirve para pautar.
- Nosotros: `mitienda.tiendaapps.com/producto/3` — cuelga de la marca.

Esa dirección propia **sí vale**, y no por vanidad: cuando se paga publicidad, se
manda la gente a un dominio limpio del nicho, no a una subcarpeta de otra marca.

**Las tres formas de resolverlo, y la elegida:**

| | Qué es | Qué cuesta |
|---|---|---|
| **A. Elegida ahora** | 1 tienda, N productos, cada uno con su página | Nada, ya casi está |
| **B. Descartada** | N tiendas por cuenta, cada una su subdominio | Romper `ownerId @unique` + selector de tienda + panel general + ranking. Transversal y caro |
| **C. Para después** | 1 tienda, N productos, y **cada producto con su propio subdominio** | Una columna de slug en `Product` y una regla más en el middleware, que **ya mapea subdominio → tienda** |

**C da lo único que B tiene de valioso** —la dirección propia para pautar— sin
tocar `ownerId @unique` ni obligarnos a construir el selector, el panel general y
el ranking, que del otro lado existen **sólo porque tienen multi-tienda**. B sería
pagar por adelantado una estructura que todavía no sabemos si alguien va a usar.

> #### ⚠️ C no es "para después": es lo que hace que Pro tenga sentido
>
> Ampliado el 01/09/26. Acá decía "una columna de slug" y es bastante más — y
> sobre todo, **no es opcional**. El caso que lo destapa: alguien vende un ebook de
> mecánica y después uno de tortas. La publicidad se hace **por producto**, y el
> que compra no se casa con el negocio sino con el ebook. Con una sola dirección
> por cuenta, **los 5 productos de Pro sólo sirven si los 5 son del mismo nicho**.
>
> El alcance completo, el dibujo y la medición de por qué B es cara (116 archivos,
> 245 lugares) están en la **Fase 5 bis**.

> #### 🚫 NUNCA escribir "tiendas" en nuestra página de precios
>
> Sería prometer lo de ellos y entregar lo nuestro. Se dice **"páginas de
> venta"**.
>
> *(Acá decía "y además suena a más: 5 páginas contra sus 2 tiendas, 25 contra
> sus 5". Se cayó el 01/09/26 con los topes en 1/3/5 — ver abajo. Empatamos, no
> les ganamos, y está bien: lo nuestro se diferencia por la comisión y por la IA,
> que ellos no tienen.)*

#### Y eso destraba lo que dábamos por caro

**La página de venta cuelga del PRODUCTO, no de la tienda.** La ruta ya existe:
`/tienda/[slug]/producto/[id]`. Entonces:

- **No hace falta romper `ownerId String @unique`** (`prisma/schema.prisma:310`),
  que es una restricción de la base que asumen el middleware (subdominio →
  tienda), el layout de los paneles, los roles y el registro.
- Una cuenta, una vidriera, y **cada producto con su página de venta completa**.
- Nuestro "cuántos productos digitales" y su "cuántas tiendas" **son el mismo
  número con otro nombre**. Estábamos alineados sin saberlo.

#### Lo que sí es construcción nueva

- 🔲 **El formato de página de venta entero.** No existe nada parecido: la ficha
  de producto de hoy es una ficha, no un embudo.
- 🔲 **Bonos y upsells.** Buscados en el proyecto: **no hay nada**. Ni el modelo,
  ni la pantalla, ni el checkout que los sume.

> #### ⚠️ La escasez de esa página tiene que ser REAL
>
> El contador de "oferta termina en 13:00", los "quedan 7 cupos a este precio" y
> las notificaciones flotantes de "Matías H. de Córdoba compró hace 1 minuto":
> **si eso se reinicia solo al recargar la página, es publicidad engañosa**, y en
> Argentina cae bajo la Ley 24.240 — la misma que obligó a poner el botón de
> arrepentimiento (ver `LEGALES.md`).
>
> Es el mismo criterio que ya se aplicó con los textos de fábrica de los
> templates: *"no rompen nada, la tienda carga, se ve linda y vende. Solamente
> mienten, que es peor, porque nadie lo va a reportar como error."*
>
> **Se construye el mecanismo, atado a datos reales**: fecha real de fin de
> oferta, cupos que de verdad se descuentan, ventas que de verdad ocurrieron. Se
> ve igual y no expone ni a la dueña ni a la plataforma.

### 2.4 La IA hace las cuatro cosas

1. **Genera la vidriera entera** — describís tu negocio y arma la página: textos,
   secciones, colores, orden. Es el gancho principal.
2. **Escribe el contenido del ebook/PDF** — el producto que se vende.
3. **Escribe los textos de venta y los mails** — descripciones, títulos, el mail
   de entrega, el de carrito abandonado.
4. **Sasha adaptada a digitales** — el asistente que ya existe, pero que entiende
   de embudos, descargas y conversión en vez de stock y envíos.

> #### ⚠️ Los dos avisos sobre la IA, escritos antes de entusiasmarnos
>
> Ya hay una lección cara aprendida en `src/lib/asistente-limites.ts`: *"cada
> mensaje le cuesta plata a TiendaApps, así que esto no es un tope de cortesía:
> es el único freno entre una cuenta trucha y la factura de Anthropic"*. Ahí hay
> cuatro capas de topes (ráfaga, diario por dueño, global de pruebas, global
> total) y la nota honesta de que el techo real es el spending limit de Anthropic,
> que vive fuera del repo.
>
> **1. Un ebook con IA no es un mensaje de chat: son miles de veces más tokens.**
> "4 ebooks por mes" es una promesa con costo directo. Hay que ponerle número y
> **medirlo** antes de escribirlo en una página de precios.
>
> **2. Ninguna función de IA sale sin tope, ni en el plan más caro.** La foto de
> la competencia dice "Todos los ebooks con IA" en su plan más caro. Eso es
> ilimitado, y es una bomba. El plan más caro lleva el tope más alto, no ninguno.
>
> El plan Free es el que más expuesto queda: es gratis, no pide tarjeta y da
> acceso a IA. Necesita la capa de "global de cuentas gratis" que ya existe para
> las de prueba, por el mismo motivo exacto: veinte cuentas truchas son la misma
> persona y ninguna capa por-usuario se entera.

### 2.4 bis Cómo se reparte la IA — CERRADO (01/09/26)

**La regla: se cuenta lo que cuesta.** Los cuatro usos de la IA cuestan cosas
ridículamente distintas; meterlos en una bolsa sola sería cobrar caro lo barato y
regalar lo caro.

| Qué hace | Qué produce | Cuánto cuesta | Cómo se limita |
|---|---|---|---|
| **Escribe el ebook** | 40 páginas | **US$2 a 4** | **Cupo contado.** Es el único número que va en la tabla de precios |
| **Arma la página de venta** | textos de una landing | centavos | Ráfaga y tope diario. 🔲 Hoy no tiene ninguno |
| **Títulos, descripciones, mails** | frases sueltas | casi nada | Sólo ráfaga |
| **Sasha** | conversación | por mensaje | Ya resuelto en `asistente-limites.ts` |

Lo barato no se cuenta, se protege del script: contar las regeneraciones de un
título pone fricción donde no hay costo y llena la tabla de precios de números
que no le importan a nadie.

#### El cupo del ebook

| | Al contratar (una vez) | Por mes | Reintentos por ebook |
|---|---|---|---|
| Free | — | — | — |
| Starter | **3** | 2 | 1 |
| Pro | **6** | 5 | 1 |

**El arranque existe porque el mes 1 es cuando se necesita todo y el mes 6 no se
necesita nada.** El embudo se arma una vez y después se vende; un cupo mensual da
poco justo cuando más falta hace. El arranque es exactamente un producto entero
—el principal más sus bonos (Starter 1+2, Pro 1+5)— y **se paga una sola vez**:
es costo de conseguir el cliente, no un costo que corre para siempre.

**El mensual no se toca** (2 y 5), así que el peor caso —alguien que quema todo,
todos los meses— deja el margen donde lo midió 3 bis.

#### ⚠️ Se cuentan EBOOKS, con techo de reintentos

Lo que cuesta plata es cada vez que se aprieta el botón, no el ebook que queda al
final. Contando ebooks a secas, alguien genera diez veces hasta que le guste: en
Pro serían **50 llamadas en vez de 5**, con el mismo abono, y ese plan pasa a
perder plata sin que nos enteremos hasta la factura.

La salida: **N ebooks, y cada uno se puede volver a generar 1 vez.** El cartel
dice la verdad —son 5 ebooks, no 5 intentos— y el costo tiene fondo.

Y es justo por otro lado: **si la primera salida sale mal es más culpa nuestra que
de la persona.** Cobrarle un ebook entero por una generación mala trae reclamos;
una segunda oportunidad incluida los evita.

⚠️ Duplicar las llamadas baja el margen del peor caso de **71 % / 65 %** a
**~42 % / ~30 %**. Pro es el que se da vuelta primero si el dólar se mueve: con 1
reintento aguanta, con 2 no.

#### La prueba de 7 días: el plan entero, UNA generación

**No podemos copiar cómo se cubren ellos.** Su prueba de 15 días pide tarjeta
(Stripe, nombre, número y CVC): la tarjeta es una pared que se construye sola —
veinte cuentas piden veinte tarjetas y Stripe detecta la repetida. Nosotros
prometemos **7 días SIN tarjeta**, y cobramos con Mercado Pago, que en nuestro
esquema **no tiene suscripción recurrente**: no hay ninguna tarjeta guardada a la
cual cobrarle en 7 días. Su modelo entero depende de una infraestructura que no
tenemos.

Y la prueba sin tarjeta **es una ventaja acá**, no un descuido: pedir la tarjeta
de entrada mata la conversión en Argentina. No se tira — se hace que la prueba
nos salga barata.

| Durante los 7 días | Con el primer cobro |
|---|---|
| **Todo el plan**: productos, bonos, upsells, transferencia, Sasha, página armada con IA | Se libera el cupo completo: el arranque y el mensual |
| **1 sola generación de ebook** | |

**El recorte va sobre la IA, no sobre el plan.** Los lugares no cuestan nada;
recortarlos hace que la prueba se sienta mutilada sin ahorrar un peso. Con una
generación alcanza para lo que la prueba tiene que probar —si la IA escribe
bien—, y el embudo se completa igual subiendo PDFs propios, así que se puede
recorrer la cadena entera: crear, vender, entregar.

Baja la exposición de una cuenta trucha de **US$15 a US$3**.

#### Las cinco paredes, en orden

1. **Lo caro está detrás del cobro.** La estructural, y la única que no depende de
   detectar a nadie: no importa cuántas cuentas se abran, en ninguna hay algo caro
   que llevarse.
2. **El tope global de las cuentas en prueba** — la capa 3 de Sasha, que existe
   justo para esto: veinte cuentas truchas tienen cada una su tope intacto y
   ninguna capa por-usuario se entera de que son la misma persona. Va **separado**
   del tope de las que pagan, para que el que abusa no deje sin IA al que paga.
3. **La prueba es de una sola vez por cuenta.** Ya resuelto (`pruebaYaUsada`).
4. **OTP antes de la primera generación** — 🔲 opcional. Encarece cosechar
   (veinte teléfonos, no veinte mails) sin pedir tarjeta. Se prende si aparece
   abuso real, no antes.
5. **El spending limit de Anthropic.** El único techo que de verdad garantiza que
   no llegue una factura de US$500. Vive fuera del repo.

> #### 🔲 Nada de esto se escribe en código todavía
>
> No existe el contador que lo aplique, y acá la regla es que **una constante que
> no lee nadie es código muerto** — por eso mismo se sacó el tope anti-abuso en su
> momento. Va en la Fase 4, junto al código que lo use. Lo único que ya está en
> `planLimits.ts` es `ebooksIA` (0/2/5), que es el número que dibuja la tarjeta.


### 2.5 Son TRES planes: Free + Starter + Pro

La competencia tiene cuatro. Nosotros arrancamos con tres, y la decisión se tomó
mirando el pago, no la tabla de ellos.

**Free no toca el pago.** Es el mismo caso que Afiliado, que ya se rechaza
explícitamente en `preferencia/route.ts:38` (*"El plan de afiliados es gratuito,
no requiere pago"*). Una guarda y listo. Así que la pregunta real no era 3 o 4:
era **dos planes pagos o tres**.

| | **Free + 2 pagos** | Free + 3 pagos |
|---|---|---|
| Entradas en `PRICES` | +2 | +3 |
| `COMBINACIONES` en `cotizar` | 4 → 8 | 4 → 10 |
| Caminos de cambio de plan | **1** (Starter↔Pro) | 3 (Starter↔Pro, Starter↔Max, Pro↔Max) |
| El selector de la tarjeta | 2 botones, **el que ya anda** | 3 botones, hay que rediseñarlo |

Las cuatro razones:

1. **El prorrateo es donde se rompen estas cosas.** Con dos planes pagos hay un
   solo camino de cambio; con tres hay tres, cada uno por mensual y por anual.
   Es exactamente la parte que ya falló una vez —la pantalla decía $200.000 y MP
   cobraba $225.000— y multiplicar los casos multiplica la chance de repetirlo.
2. **A 360px no entran tres botones.** El selector de hoy son dos `flex-1` y
   "Tienda Pro" / "Tienda Premium" ya llenan la fila
   (`src/app/precios/page.tsx:321-333`). Un tercero obliga a rediseñar el
   componente, no a agregarle un `<button>`.
3. **Coherencia**: dos planes pagos en Tiendas, dos en Digitales. La página de
   precios se lee como un producto, no como dos.
4. **Agregar un cuarto escalón después es una línea; sacarlo, no.** Sumar Max más
   adelante es una entrada en `PRICES` y un botón. Eliminarlo cuando ya hay gente
   pagando es una migración, un prorrateo hacia atrás y un mail de disculpas.

La escalera de comisión funciona igual con tres: Free la más alta → Starter → Pro
la más baja. Alcanza para que se vea el incentivo de subir.

> **Lo que se resigna, dicho en voz alta:** un escalón caro arriba (tipo Max) es
> donde suele estar el margen. Se deja para cuando haya usuarios de verdad — hoy,
> con cero, cuatro escalones es adivinar tres precios en vez de uno.

### 2.6 Los roles NO se mezclan: una cuenta es una sola cosa

**Confirmado el 31/08/26.** Se mantiene la regla que ya rige en todo el proyecto:
*"Una cuenta es una sola cosa —tienda, afiliado o cliente—, cada una tiene su
panel y no se cruzan"* (`src/app/afiliados/layout.tsx:36`).

Quien ya tiene una tienda en TiendaApps y además quiere vender productos
digitales **se registra con otro email**. No se comparte usuario entre
ecosistemas.

**Esto es una decisión, no una limitación heredada** — y tiene la ventaja de que
no cuesta nada: el rol nuevo entra por el mismo camino que los tres que ya
existen, sin tocar login, ni middleware, ni el modelo de usuario.

### 2.7 Los carritos abandonados se VEN en los tres planes; se paga el mail

La competencia pone "Remarketing de carritos" entero detrás del plan. Nosotros
no, y por un motivo escrito en nuestro propio código.

`src/lib/planLimits.ts` dice: *"se limita lo que la dueña crea (cupones, promos,
afiliados), no lo que le pasa. Los carritos abandonados los generan sus clientes,
así que ponerles tope sería cobrarle por tener tráfico — y encima son la función
para recuperar esas ventas."*

Meter la sección entera en Pro sería hacer justo lo que ese comentario dice que
no. Así que se parte en dos:

- **Ver la lista de carritos** — los tres planes. Es ver lo que te pasó.
- **El mail automático de recuperación** — sólo Pro. Es trabajo del sistema: cron,
  envío y plata nuestra. Se cobra lo que cuesta.

**Y de paso es el mejor argumento de venta que vamos a tener.** Una dueña en Free
entra y ve *"3 carritos abandonados, $51.000 sin cobrar"*, con el botón de
recuperar apagado. Eso convence más que cualquier tabla de precios, y es honesto:
es plata suya de verdad.

Todo esto **ya existe**: modelo `AbandonedCart` (con `reminderSentAt` y
`recoveredAt`), la pantalla `/dashboard/carritos-abandonados` y su API.

---

## 3. ⚠️ Cómo se unen el Free, los 7 días y el período de gracia

**Este es el nudo del diseño y hay que resolverlo antes de tocar código.** Hoy
las tiendas tienen un ciclo que termina en cierre; con un Free para siempre, ese
final deja de existir. No se pueden pegar los dos esquemas sin pensarlo.

### Lo que hay hoy (`src/lib/subscription.ts`)

    TRIAL_DAYS = 7            prueba, sin tarjeta
    GRACE_DAYS = 4            vencida: panel bloqueado, tienda todavía online
    TRIAL_CLOSURE_DAYS = 10   nunca pagó → la tienda se cierra
    PAID_CLOSURE_DAYS = 20    venía pagando → se ganó el beneficio de la duda
    CLOSURE_WARNING_DAYS = 2  último aviso antes del cierre

El ciclo completo: `TRIAL → ACTIVE → GRACE → EXPIRED → cierre`.

### El choque

**No se puede "probar gratis 7 días" algo que ya es gratis para siempre.** Y
**cerrarle la cuenta a alguien que puede quedarse en Free es absurdo**: le
estaríamos apagando la vidriera a un usuario que todavía nos puede generar
comisión.

### La propuesta

> **El trial deja de ser la puerta de entrada y pasa a ser la prueba de los planes
> PAGOS. Y el final del camino deja de ser el cierre: es caer a Free.**

- **El piso siempre es Free**, sin tarjeta. Ningún camino cobra nada por entrar.
- **Los 7 días son la prueba de los planes PAGOS, no de la cuenta.** Y se pueden
  arrancar en dos momentos, que terminan igual:
  - **En el registro**, eligiendo Starter o Pro en vez de Free. *(Corregido el
    31/08/26: la primera versión decía que entrar era siempre Free y que la
    prueba sólo se activaba desde adentro. Se probó y no cerraba: en /precios se
    ofrecían tres planes y el registro no dejaba elegir ninguno — dos puertas
    contando historias distintas. Ahora la tarjeta dice "Elegir plan" y muestra
    los tres, igual que la de tienda elige entre Pro y Premium.)*
  - **Desde adentro**, estando en Free.
- **Elegir un plan pago NUNCA cobra en el alta.** La cuenta nace en `TRIAL`, jamás
  en `ACTIVE`, y eso está puesto en el código y vigilado por VIDA-L: el tier lo
  elige la persona en el navegador, así que si el alta pudiera dejar una cuenta
  activa, cualquiera pediría Pro y se llevaría el plan más caro sin pagar.
- **Al vencer no se cierra nada: se cae a Free.** No se pierde la vidriera, ni los
  productos, ni las ventas, ni los compradores. Sube la comisión y se apagan las
  funciones del plan pago.
- **La gracia sigue existiendo, pero cambia de significado.** Hoy es "el panel se
  bloquea"; acá es el colchón antes de bajar de plan, para que un pago demorado no
  te apague las funciones de golpe. 🔲 ¿Siguen siendo 4 días?
- **`TRIAL_CLOSURE_DAYS` y `PAID_CLOSURE_DAYS` no aplican a este ecosistema.**
  Nunca cerramos una cuenta digital por falta de pago.

### Lo que hay que resolver de esa caída

- 🔲 **¿Qué pasa con los productos de más?** Si tenías 20 en Pro y caés a Free
  (que permite muchos menos): **no se borran**. Se despublican todos menos los que
  entren en el plan, y la dueña elige cuáles quedan visibles. Mismo criterio que
  ya usa `planLimits.ts`: *se cuenta lo que está VIVO, no lo que se creó alguna
  vez* — apagar o archivar libera lugar al toque.
- 🔲 **La comisión al momento de caer.** `Order` ya tiene `lockedCommissionRate`,
  que congela el porcentaje cuando se crea el pedido. La comisión de plataforma
  tiene que congelarse igual: una venta hecha en Pro se liquida con la comisión de
  Pro, aunque el cobro llegue después de caer a Free.
- 🔲 **Los avisos.** El modelo `Subscription` ya trae `expiredNotifiedAt` y
  `closingNotifiedAt` para no mandar dos veces el mismo mail. Acá hace falta el
  aviso nuevo de "bajaste a Free y esto es lo que cambia", que no existe.
- ✅ **¿Se puede volver a probar?** RESUELTO: **una sola vez por cuenta**. Sin esta
  regla, alguien prueba Pro 7 días, cae a Free, y vuelve a probar Pro para
  siempre. Lo recuerda `pruebaYaUsada` sin columna nueva —la distancia entre
  `createdAt` y `trialEndsAt`— y caer a Free no la reinicia (VIDA-G, VIDA-O). Es
  el lado seguro para equivocarse; si se quiere abrir, se abre en esa función y
  en ningún otro lado.

---

## 3 bis. Lo que nos cuesta de verdad (medido el 31/08/26)

Antes de poner un precio hubo que saber cuánto sale atender a cada plan. Son tres
cosas y sólo una importa.

### El ebook con IA es el único costo que mueve la aguja

Con los precios de la API de Anthropic (Claude Opus 5: US$5 por millón de tokens
de entrada, US$25 de salida):

| Qué genera | Costo real |
|---|---|
| **Un ebook** de ~46 páginas | **US$2 a US$4** |
| Una página de venta | ~US$0,15 |
| Textos de producto y mails | centavos |
| Una charla con Sasha | centavos |

**Todo lo que no sea el ebook es ruido.** Por eso el tope de ebooks es lo único
que define el precio de un plan; los demás topes son comerciales, no de costo.

**El modelo es Claude Opus 5.** No importa qué use la competencia: el SDK de
Anthropic ya está instalado y Sasha ya corre con sus cuatro capas de topes —
reusar eso vale más que igualar a nadie. Si algún día hay que bajar el costo, la
palanca es Sonnet 5 (lo baja a la mitad), y **esa es una decisión de Flavio**, no
del código.

### El egress de Supabase escala con las VENTAS, no con las cuentas

Un ebook de 10 MB con sus 5 descargas permitidas son **50 MB por venta**. La
cuota gratis son 5 GB: **cien ventas en todo el ecosistema y se acabó**. Ya pasó
una vez con las fotos (5,865 GB de 5 — ver `supabase-se-pasa-por-egress`).

Pero acá la cuenta cierra sola: **8% de un ebook de AR$17.000 son AR$1.360 por
venta**, y eso paga el egress con muchísimo margen. **Es lo que sostiene al plan
Free.**

Vercel y los mails son despreciables al lado de estos dos.

---

## 3 ter. Los precios van en PESOS (y por qué se dio la vuelta dos veces)

**Cerrado el 31/08/26, después de dar una vuelta completa.** Vale dejar el
recorrido escrito porque el razonamiento del medio sigue siendo válido.

### La vuelta, en tres pasos

1. **Arrancaron en pesos**, como todo TiendaApps.
2. **Se pasaron a dólares**, porque el costo del ecosistema es en dólares
   (Anthropic por la IA, Supabase por el egress, Vercel) y cada devaluación se
   comía el margen sin que nadie tocara nada.
3. **Volvieron a pesos**, al averiguar que Stripe no acepta cuentas argentinas y,
   sobre todo, al caer en la cuenta de quién es el cliente.

### El motivo de la vuelta atrás

> **El cliente es un vendedor argentino que paga con tarjeta argentina.**

Un abono en dólares cobrado desde el exterior le suma **percepciones
impositivas**: no paga $30.000, paga bastante más — y esa diferencia **no la
vemos nosotros**, se la queda AFIP. Le encarecemos el producto sin ganar un peso.

Cobrando en pesos por Mercado Pago le sale **exactamente lo que dice la
pantalla**, con la tarjeta que ya usa y en cuotas si quiere. Y del lado del
código: `currency_id: "ARS"` ya está donde tiene que estar, no hay cotización que
buscar, ni congelar, ni explicar en los Términos.

### ⚠️ Lo que se resigna, y hay que vigilarlo

**Se cobra en pesos pero se gasta en dólares.** Ese problema no desaparece: se
acepta. Con el ebook a US$3 de API:

| | Abono | Costo máximo de IA | Se da vuelta con el dólar a |
|---|---|---|---|
| **Starter** ($30.000, 2 ebooks) | ~US$21 hoy | US$6 | ~$15.000 |
| **Pro** ($60.000, 5 ebooks) | ~US$43 hoy | US$15 | **~$4.000** |

**Pro se da vuelta primero y por lejos**, porque es el que más IA regala. Con el
dólar a $4.000 —menos de tres veces el de hoy— un cliente de Pro que use sus 5
ebooks todos los meses no deja nada. Si el ebook sale US$4, ese punto se adelanta
a **$3.000**.

- 🔲 **Revisar estos precios cada tanto.** No es una tarea opcional: sin revisión,
  el plan caro pasa a perder plata en silencio y nadie se entera hasta la factura
  de Anthropic.
- 🔲 La otra palanca es bajar `TOPES_DIGITALES.PRO.ebooksIA`, que duele menos que
  subir el precio.

### Qué queda de la etapa "en dólares"

Nada en el código —el formateador `usd`, `pesosAprox` y `DOLAR_PROVISORIO` se
borraron— pero sí una conclusión que vale para el futuro:

> **Stripe se reabre sólo si algún día se vende fuera de Argentina.** Ahí el
> vendedor extranjero no puede pagar con Mercado Pago y hace falta otra cosa. Y
> haría falta una sociedad en el exterior, porque Argentina no está en la lista
> de países de Stripe (ver Fase 2).

**La comisión por venta no entra en nada de esto**: es un porcentaje de una venta
en pesos y se ajusta sola.

### Lo que se vio del checkout de la competencia (31/08)

Capturas de su cobro real, no de su página de precios:

- La URL es `checkout.stripe.com/c/pay/cs_live_…` — **`cs_live`, o sea producción**,
  no una prueba. Cobran de verdad con Stripe.
- Suscripción **recurrente en USD**: *"Prueba Plan Starter · 15 días gratis · Luego
  USD 20.00 por mes a partir del 15 de septiembre de 2026"*.
- Usan **Link** (el guardado de tarjeta de Stripe), con verificación por código al
  correo.
- **"Total adeudado hoy USD 0.00" pero igual les pide la tarjeta** (les pide el
  CVC). Su prueba de 15 días **no es sin tarjeta**.

**Qué prueba y qué no.** Prueba que hay un competidor de este mercado cobrando
suscripciones en dólares con Stripe en producción. **No prueba que su cuenta de
Stripe sea argentina** — puede estar facturando con una sociedad de afuera.

### "¿Pero cómo pueden usarlo si son argentinos?"

La pregunta vuelve sola, así que queda contestada acá.

**Stripe no limita quién PAGA, limita quién COBRA.** Cualquiera en el mundo puede
pagarle a Stripe con su tarjeta. Lo que Stripe restringe es quién puede abrir una
cuenta para *recibir* la plata. (Y "Link" no es otra plataforma: es la función de
Stripe para guardar la tarjeta, viene incluida.)

Así que **su cuenta casi seguro no es argentina**: lo habitual es tener una
sociedad en Estados Unidos —una LLC con su EIN, su domicilio y su cuenta bancaria
allá— y ahí Stripe los ve como empresa estadounidense. Es legal y bastante común.
Que el dominio sea `.ar` y la gente sea argentina no dice nada sobre qué empresa
cobra.

> **Y eso no es una ventaja que tengan: es un costo que arrastran.** Mantener la
> LLC cuesta plata y trámite todos los años. Y cuando un argentino paga esos
> USD 20 con tarjeta local, **no paga el equivalente de 20 dólares: paga eso más
> las percepciones** por consumo en moneda extranjera — que se queda AFIP, no
> ellos.
>
> O sea que **su cliente paga más de lo que dice la pantalla, y el nuestro paga
> exactamente $30.000.** Eso es una ventaja nuestra, no una carencia.

> #### ⚠️ Sumar Stripe NO reemplaza a Mercado Pago
>
> Son **dos flujos de plata distintos** y conviene no confundirlos:
>
> | | Quién paga | A quién | Por dónde |
> |---|---|---|---|
> | **Abono** | la vendedora | a nosotros | acá entraría Stripe |
> | **Venta del ebook** | el comprador | a la vendedora | sigue por Mercado Pago |
>
> La **comisión por venta vive en el segundo flujo** (`marketplace_fee`), así que
> se queda en Mercado Pago pase lo que pase. Stripe sólo tocaría el abono.
>
> **Esto se escribió cuando los precios iban en dólares**, y en ese momento Stripe
> parecía una simplificación. Con los precios en pesos (ver 3 ter) ya no simplifica
> nada: Mercado Pago cobra pesos, que es lo que hay que cobrar. Se deja anotado
> para el día que se venda fuera de Argentina.
>
> **Ojo con la prueba gratis:** Stripe hace fácil el trial *con* tarjeta y
> incómodo el trial *sin* tarjeta. Hoy TiendaApps promete 7 días sin tarjeta. Eso
> choca, y hay que resolverlo junto con el ciclo de vida de la sección 3.


---

## 4. El modelo comercial

**Cerrado el 31/08/26.** Los números salen de la cuenta de costo de 3 bis, no de
copiar a la competencia. La estructura de escalones sí se le tomó prestada.

### Cómo entran cuatro escalones en tres

La tabla de la competencia reparte por cuatro ejes (tiendas, ebooks con IA,
bonos/upsells, y dos sí/no: transferencia y remarketing). Su problema es que **el
medio queda flojo**: de su Starter a su Pro sólo sumás 1 tienda, 2 ebooks y 1
bono. Con tres escalones no nos podemos dar ese lujo.

> **La regla: cada salto tiene que cambiar el TIPO de cosa que podés hacer, no
> sólo el número.**
>
> - **Free → Starter**: pasás de *validar* a *vender de verdad*. Lo que se compra
>   es la IA.
> - **Starter → Pro**: pasás de *vender* a *escalar*. Lo que se compra es el
>   alcance: remarketing, dominio propio y el tope alto de IA.

Free sí lleva IA, pero **la barata**: le arma la página y las fichas, y el
contenido del ebook lo trae la persona. El ebook son US$2 a 4 de API y los textos
de una landing son centavos — estábamos regalando lo caro y cobrando lo barato. Y
Free no pide tarjeta: un ebook escrito con IA sirve fuera de la plataforma y se
puede cosechar; una página generada no le sirve a nadie afuera. Ver 2.4 bis.

| | **Free** *validar* | **Starter** *vender* | **Pro** *escalar* |
|---|---|---|---|
| **Abono mensual** | $0 | **$30.000** | **$60.000** |
| **Abono anual** (−25%) | — | $270.000 → *$22.500/mes* | $540.000 → *$45.000/mes* |
| **Comisión por venta** | **8%** | **6%** | **2%** |
| Productos = páginas de venta | 1 | 2 | 5 |
| **Ebooks con IA por mes** | ❌ | **2** | **5** |
| Bonos por producto | 1 | 2 | 5 |
| Upsells por producto | 1 | 2 | 3 |
| Página de venta armada con IA | ✅ | ✅ | ✅ |
| Textos y mails con IA | ❌ | ✅ | ✅ |
| Sasha | ❌ | ✅ | ✅ |
| Pagos con transferencia | ❌ | ✅ | ✅ |
| **Ver carritos abandonados** | ✅ | ✅ | ✅ |
| **Mail automático de recuperación** | ❌ | ❌ | ✅ |
| Dominio propio **por producto** | ❌ | ❌ | ✅ |
| Entrega automática con token | ✅ | ✅ | ✅ |
| Descargas y estadísticas | ✅ | ✅ | ✅ |

**Free tiene que servir de verdad, o nadie llega a Starter.** Por eso se lleva la
entrega automática, las estadísticas de descargas, su página de venta (con
plantilla) y ver quién dejó el carrito.

### De dónde salen esos números

- **El −25% anual es el que ya usa Tienda Pro**, y acá da equivalentes redondos
  ($22.500 y $45.000 por mes).
- **Conviven con los precios de las tiendas** ($20.000 Pro / $25.000 Premium), que
  es de lo que se trataba: la página de precios se lee como un producto, no como
  dos.
- **Los topes de ebooks son bajos a propósito** — 2 y 5, no 4 y 6 como la
  competencia. Es lo único que define el costo del plan (ver 3 bis).
- **Margen en el peor caso** (alguien que quema todos sus ebooks todos los meses):
  **71% en Starter y 65% en Pro** al dólar de hoy. ⚠️ Ese margen **se mueve con el
  dólar** — ver el recuadro de 3 ter, que dice cuándo se da vuelta cada plan.
- **Menos comisión que la competencia** (8/6/2 contra su 10/8/6/2) **y menos
  ebooks**. Es un canje honesto y una buena posición para entrar.
- **Las páginas bajaron de 1/5/25 a 1/3/5 el 01/09/26.** El 25 no era generoso:
  era inerte. Un techo que nadie toca **no genera ni una sola mejora de plan** —
  un límite sólo hace plata cuando alguien se choca contra él—, y además dejaba
  una caída de plan sin solución posible (20 páginas publicadas cayendo a 1).
  Que el techo de Pro sea 5 y no 10: el que paga Pro no escala con más productos,
  escala con más publicidad y más upsells sobre el embudo que ya le funciona, y
  eso ya lo cubren `bonos` y `upsells`, que son **por producto**. Si a los
  mejores clientes de la competencia les quedara corto el 5, tendrían un plan de
  10 — tienen cuatro planes y terminan en cinco.
  Y arrancar apretado es reversible: subirle el tope a una cuenta es un renglón;
  bajárselo a alguien que ya publicó es ir a despublicarle páginas.

### Los puntos de equilibrio de 8 / 6 / 2

Con ebooks a ~AR$17.000, cuándo le conviene a la dueña subir de plan:

| Salto | Ahorro | Ventas para que se pague |
|---|---|---|
| Free → Starter | 2 puntos | abono ÷ 0,02 |
| Starter → Pro | 4 puntos | (Pro − Starter) ÷ 0,04 |

**El escalón del medio es la mitad de grande que el de arriba.** O sea que
**Starter no se vende por la comisión, se vende por la IA** — que es exactamente
la escalera definida arriba, así que es coherente. Si algún día se quiere que los
tres saltos pesen igual, sería 8 / 5 / 2.

### Dos cosas que no hay que olvidar

1. **La comisión se SUMA a la de Mercado Pago**, que ya se queda con lo suyo. Al
   vendedor hay que mostrarle el número completo, no el nuestro solo, o lo
   descubre en su primera liquidación.
2. ⚠️ **Los precios están citados en los Términos.** Lo dice el comentario de
   `planLimits.ts`: si cambian los importes hay que actualizar
   `CURRENT_TERMS_VERSION` en `lib/legal`, porque **un cambio de precio es un
   cambio de contrato** y la gente tiene que volver a aceptar. Y estos precios se
   van a tener que revisar cada tanto (ver 3 ter), así que va a pasar seguido.

---

## 5. Lo que se hereda del intento viejo (y NO se rehace)

Todo esto ya está resuelto, medido y en varios casos aplicado a producción:

- ✅ **El diseño de la entrega**: token, vencimiento a 30 días, tope de 5
  descargas, **un permiso por línea comprada** (no por producto — si colgara del
  producto, agotar el tope de uno se lo agotaría al otro).
- ✅ **`DigitalDownload` y las columnas `archivoPath/Nombre/Peso` de `Product`
  YA ESTÁN EN LA BASE DE PRODUCCIÓN** (migradas el 29/08). Están declaradas en
  `schema.prisma` a propósito: sacarlas del esquema no las saca de la base, y
  haría que la próxima migración de cualquier cosa pida un reset de producción.
- ✅ **La subida directa navegador → Supabase.** El servidor no toca los bytes
  (Next corta el cuerpo del pedido en 10 MB y producción antes). La validación
  vive en el bucket (`file_size_limit` + `allowed_mime_types`), que la aplica
  Supabase sobre el archivo real y es más difícil de saltear que un `if` nuestro.
- ✅ **La ruta la elige el servidor, nunca el cliente** — si la eligiera el
  navegador podría pisar el archivo de otra cuenta.
- ⚠️ **El techo real es 50 MB y lo pone Supabase**, no nosotros. Medido: 50 entra,
  100 no. Un bucket pedido con más ni siquiera se crea.
- ✅ **Los 7 agujeros ya encontrados y cerrados** — el stock que dejaba vender una
  sola vez, la duplicación que perdía el archivo, el CSV que se salteaba la
  validación entera, el respaldo local que escribía en una carpeta pública, y los
  tres de la entrega.

---

## 6. Seguridad — lo que no se negocia

- **El archivo es la mercadería.** Bucket privado, ruta elegida por el servidor,
  y **el token nunca viaja al panel**: el token ES el archivo, traerlo a la
  pantalla lo dejaría escrito en el HTML, en el historial y en cualquier captura.
- **Todo lo que sale mal en la descarga devuelve el MISMO 404.** No se distingue
  "no existe" de "vencido" de "sin descargas": contestar distinto convierte la
  ruta en un oráculo para averiguar qué tokens existen.
- **El contador sube ANTES de firmar, con un UPDATE condicional.** Dos pedidos
  simultáneos y sólo uno pasa. Una firma fallida gasta una descarga, y ese es el
  lado correcto para equivocarse.
- **La emisión es idempotente.** Mercado Pago reintenta los webhooks; sin esto
  una compra termina con dos tokens vivos y el tope de 5 pasa a ser de 10.
- **El gatillo es el pago acreditado, no el pedido creado.** Entregar antes es
  regalarle el archivo a quien abandonó el pago.
- **Topes de IA en cuatro capas**, incluida la global de cuentas gratis (ver 2.4).
- 🔲 **El login sigue trabado por el captcha**, en local y en producción. Si vamos
  a probar de punta a punta, esto se destraba primero.

---

## 7. Lo que TODAVÍA falta decidir

- 🔲 **¿El bono viaja como línea del pedido?** El permiso de descarga es **uno por
  línea comprada**, con 5 descargas cada uno. Si el bono es su propia línea, cada
  uno tiene su token y sus 5 descargas y está todo bien. Si no lo es, hay un solo
  token para 6 archivos y **el comprador no llega ni a bajar una vez cada cosa**:
  pagó y no puede tener todo. Es el tipo de agujero que aparece el día que alguien
  compra, no antes. Sale de contar los archivos por venta (ver Fase 3, el archivo
  del producto).
- 🔲 **¿El cupo mensual de IA no usado se acumula o se pierde?** Perderlo es más
  barato para nosotros y más molesto para la persona. Si se acumula, va con techo.
  Se decide junto con el contador, en la Fase 4.
- 🔲 **¿Las generaciones de página se cuentan, o alcanza con ráfaga y diario?** La
  postura de 2.4 bis es que no se cuentan —cuestan centavos y contarlas pone
  fricción donde no hay costo—, pero eso vale mientras el número de la factura le
  dé la razón. Se revisa con la medición de la Fase 4.
- 🔲 **El tope anti-abuso de páginas de venta**, por arriba de las 5 de Pro.
  Mismo criterio que `MAX_PRODUCTS_POR_TIENDA` (5.000) en `planLimits.ts`, que
  existe porque el plan se elige en el formulario de registro y **un tope que
  sólo mira el plan no frena justo al que lo quiere evadir**. Va en la Fase 2,
  junto con el código que lo aplique: se escribió en la Fase 1 y se sacó, porque
  una constante que no lee nadie es código muerto.
- 🔲 **Cómo se unen Free, trial y gracia** (sección 3) — hay propuesta, falta
  confirmarla.
- 🔲 **Qué se le muestra al comprador antes de comprar** sobre los medios de pago:
  con transferencia la entrega NO es automática (la dueña confirma a mano). Eso
  hay que decirlo antes, no dejar que lo descubra esperando un mail que no llega.

---

## FASE 1 — La página de precios — HECHA (31/08/26)

> ### 🛑 HECHA no quiere decir PUBLICABLE
>
> Anotado el 01/09/26, mirando la tarjeta de planes que dibuja `featuresDigital`.
> La página está armada y anda, pero **casi todo lo que promete todavía no
> existe**: los ebooks con IA, la página armada con IA, los textos y mails con IA,
> Sasha adaptada, el mail de recuperación, el dominio propio. Y la entrega
> automática con token está **escrita y nunca corrió**.
>
> Es el mismo criterio que ya se aplicó con los textos de fábrica de los
> templates: *"no rompen nada, la tienda carga, se ve linda y vende. Solamente
> mienten, que es peor, porque nadie lo va a reportar como error."*
>
> **Nada de esto se publica hasta que exista**, o cada fila apagada de esa tarjeta
> es una venta hecha sobre algo que no está. Cuando llegue el momento de
> deployar, esta lista se recorre fila por fila contra el código.

### ⚠️ Corregido el 31/08/26 — la tarjeta decía "comisión desde 2%"

El 2% es el de **Pro**, que sale $60.000 por mes: era el número más lindo pegado
al plan más caro, y puesto justo abajo de la palabra **Gratis**. Quien entra
gratis paga **8%**.

Ahora la tarjeta dice el 8% y nombra los planes pagos ("Starter y Pro desde
$30.000/mes") en vez de esconderlos detrás de un "desde". "Gratis" se queda
porque es verdad —hay un plan gratuito para siempre— pero deja de ser la única
cosa que se lee.

**No se deployó.** Se mira en local con `NEXT_PUBLIC_DIGITALES_ENABLED="1"`.

### Cómo quedó (cambió sobre la marcha)

El plan era una cuarta tarjeta con un sub-selector Starter/Pro adentro, como el
de Tienda Pro/Premium. **Se hizo distinto**: las cuatro tarjetas se **reemplazan**
por los tres planes al tocar "Ver los planes", y se vuelve con una flecha.

Es mejor por dos motivos: los tres planes se comparan de un vistazo en vez de a
través de un interruptor, y no hace falta apretar nada para ver qué trae Free.

- ✅ **Cuarta tarjeta "Productos Digitales"** en la fila, con su ícono, su bajada
  y el cartelito "Nuevo".
- ✅ **Al tocarla, la fila de cuatro se reemplaza** por Free / Starter / Pro.
- ✅ **En la paleta del sitio** (naranja), no en una propia: Free en gris como
  Cliente, Starter en naranja suave como Afiliado, Pro con borde fuerte y corona
  como Tienda Premium.
- ✅ **Los precios salen de `PRECIOS_DIGITALES`**, nunca escritos a mano en la
  pantalla.
- ✅ **En pesos, con el `money` que ya existía.** Estuvieron un rato en dólares
  —con su propio formateador `usd`, `pesosAprox` y `DOLAR_PROVISORIO`— y el 31/08
  se volvió a pesos (ver 3 ter). Los tres se borraron: no quedó código muerto.
- ✅ **La comisión de cada plan**, visible en las tres tarjetas, y el aviso al pie
  de que se suma a lo que cobra Mercado Pago.
- ✅ **Los tres anchos, verificados con capturas reales** (360 / 768 / 1280).

### Lo que hubo que tocar de lo que ya existía

Dos cosas, las dos forzadas por pasar de tres tarjetas a cuatro:

1. ✅ **La página pasó de `max-w-6xl` a `max-w-7xl`** y las tarjetas de `p-8` a
   `p-6`. Con cuatro columnas los textos se partían por todos lados.
2. ✅ **El selector "Tienda Pro / Tienda Premium" bajó a `lg:text-xs`.** A 1280
   con cuatro columnas se partía en dos renglones. **Verificado con captura antes
   y después** — a 768 sigue en `text-sm` y entra igual.
3. ✅ **La tarjeta de Cliente perdió el centrado `md:w-1/2 md:mx-auto`.** Existía
   porque tres tarjetas en una grilla de dos columnas dejaban una huérfana abajo.
   Con cuatro son 2×2 y no sobra ninguna: dejarlo la habría dejado flotando en el
   medio de su fila.

### Detalles que sólo se vieron mirando

- ✅ Free decía **"0 upsells por producto"**, que se lee como un error de
  programación y no como una función que no tenés. Ahora dice "Upsells por
  producto", tachado.

### Lo que quedó pendiente a propósito

- 🔲 **Los botones dicen "Próximamente" y están apagados.** El alta y el cobro son
  la Fase 2; un botón que no lleva a ningún lado es peor que uno que avisa.
- 🔲 **Las preguntas frecuentes del pie** siguen siendo sólo de tiendas.
- 🔲 **El encabezado dice "7 días de prueba gratis, sin tarjeta"**, que ahora es
  incompleto: Productos Digitales tiene un Free para siempre. Hay que rever ese
  texto cuando la Fase 2 defina el ciclo (ver sección 3).

## FASE 2 — La suscripción por detrás

### ✅ La averiguación de Stripe — RESUELTA (31/08/26)

**Stripe NO acepta cuentas de Argentina.** Verificado en la propia lista de países
de Stripe (`stripe.com/global`): Argentina **no figura**, ni siquiera como
"próximamente" o por invitación. La única forma de usarlo desde acá es **armar una
sociedad en el exterior** (típicamente una LLC en Estados Unidos, con su EIN, su
domicilio y su cuenta bancaria allá).

**Entonces la competencia factura con una sociedad de afuera.** Su `cs_live` es
real, pero no sale de una cuenta argentina.

**Las alternativas, con lo que se sabe de cada una:**

| | Estado |
|---|---|
| **Stripe** | ❌ Argentina no está en la lista de países |
| **Lemon Squeezy** | ❌ Usa Stripe por debajo, así que arrastra el mismo problema |
| **Paddle** | ⚠️ Dice pagar "a cualquier parte del mundo" salvo países sancionados, pero **su documentación no aclara las reglas del país del VENDEDOR** y avisa que piden datos extra por cumplimiento. Habría que preguntarles directamente |
| **dLocal** | ⚠️ Es de LatAm y cobra en la región desde una sola cuenta. Sin confirmar para este caso |

> #### 🔑 Pero la conclusión NO es "busquemos otro Stripe"
>
> **Nuestros clientes son vendedores argentinos que pagan con tarjeta argentina.**
> Un abono en dólares cobrado desde el exterior a una tarjeta local **arrastra
> percepciones impositivas**: el vendedor no paga US$20, paga bastante más, y esa
> diferencia no la vemos nosotros — se la queda AFIP.
>
> 🔲 Confirmar qué percepciones aplican hoy (cambian seguido). Pero el sentido va
> a seguir siendo el mismo.
>
> **Cobrar en pesos por Mercado Pago no es el plan B: para este cliente es el
> mejor plan.** Le sale exactamente lo que dice la pantalla, paga con la tarjeta
> que ya usa, y en cuotas si quiere.
>
> **Esta averiguación fue la que terminó de decidir los precios en pesos** (ver
> 3 ter). El abono se cobra igual que el de las tiendas y no hay cotización que
> buscar, ni congelar, ni explicar en los Términos.
>
> Stripe/Paddle se reabre **sólo si algún día se vende fuera de Argentina**. Ahí
> sí el vendedor de afuera no puede pagar con Mercado Pago y hace falta otra cosa.

En cualquier caso **la comisión por venta sigue por Mercado Pago**: vive en
`marketplace_fee`, que está en el flujo del comprador, no en el del abono.

**Y lo mejor de la vuelta a pesos: esta fase se simplificó sola.** Ya no hay que
elegir fuente de cotización, ni congelarla por período, ni explicar en los
Términos que el monto cambia en cada renovación. `currency_id: "ARS"` ya está
donde tiene que estar y el cobro es el mismo que el de las tiendas.


### ✅ Los cimientos de seguridad — HECHOS (31/08/26)

Antes de sumar un solo plan nuevo se cerraron los agujeros que el ecosistema
nuevo abría en el camino del dinero. Todos tienen la misma forma: **no
rompen nada, no tiran ningún error**, y se descubren en la liquidación del mes
siguiente o el día que a alguien se le cierra la tienda sola.

- ✅ **El registro de planes** (`PLANES` en `planLimits.ts`): la única tabla que
  dice qué planes existen, con su ecosistema, rol, tier, precio y nombre.
  Reemplaza a `plan.startsWith("OWNER")`, que mandaba cualquier plan digital a
  `AFFILIATE` y le daba los topes del plan más chico a quien pagó el grande.
  Agregar un plan ahora es agregar una fila.
  - `planDe()` **falla cerrado**: `plan` llega del navegador, así que una clave
    heredada del prototipo (`"constructor"`, `"__proto__"`) devuelve `null`.
- ✅ **El candado de ecosistema**, en las DOS rutas. `Subscription.userId` es
  único y las dos escrituras son un `upsert` por `userId`: sin candado, una dueña
  de tienda que tocara un plan digital **se quedaba sin la suscripción de su
  tienda** y el cron diario se la cerraba sola.
  - En `preferencia`: corta con 409 y un mensaje en castellano llano.
  - En `webhook`: **se vuelve a verificar antes de escribir**, porque ésa es la
    ruta que escribe y entre crear la preferencia y acreditar el pago pasa
    tiempo. Si cruza, no se aplica y se registra fuerte: queda un pago cobrado
    sin activar, que se resuelve a mano. Mejor eso que cerrarle la tienda a
    alguien que está pagando.
- ✅ **El prorrateo con su freno** (`cotizarCambioDePlan`): el plan actual se
  busca por rol + tier en el registro, no se deduce del tier solo — así cualquier
  tier desconocido caía en `OWNER_BASIC` y le acreditaba a un plan Starter los
  $20.000 de Tienda Pro. Y el crédito **no cruza ecosistemas**: un anual de
  Tienda Premium por delante generaba un crédito enorme contra un plan digital,
  el total daba cero, y la rama de "activar sin pasar por MP" regalaba el plan.
- ✅ **Los planes sin precio se rechazan antes del cobro**, en las dos rutas. Free
  y Afiliado cotizan en cero, y esa rama de activación sin pago los daba por
  pagados.
- ✅ **Los chequeos**: 9 nuevos en `subscription.check.ts` (PAGO-N/Ñ/O, PLAN-A/B/C)
  y un archivo nuevo, `pagos-suscripcion.check.ts`, que lee las tres rutas como
  texto y verifica que los frenos sigan ahí. Es tosco a propósito: no prueba que
  funcionen, prueba que **nadie los borró**.
  - Los 17 chequeos de plata que ya existían pasan con **los mismos números**: el
    refactor no movió un peso de las tiendas.

### ✅ Los planes digitales, enchufados — HECHOS (31/08/26)

- ✅ `Subscription.role` acepta `"DIGITAL"`: es un `String` libre, así que **no
  hubo migración**. Se corrigieron los comentarios del schema, que decían
  `AFFILIATE | OWNER` y `BASIC | PREMIUM` y ya mentían.
- ✅ Los precios (`PRECIOS_DIGITALES`) y los topes (`TOPES_DIGITALES`) en
  `planLimits.ts`, al lado de los que ya estaban.
- ✅ Las dos claves nuevas en el registro, o sea en la lista blanca de
  `preferencia`: se valida contra la tabla, nunca con un cast.
- ✅ **Free rechazado en el pago**, con su mensaje propio.
- ✅ `COMBINACIONES` en `cotizar/route.ts`: **ya no es una lista escrita a mano**.
  Se deriva del registro filtrando los planes con precio, así que pasó de 4 a 8
  sola y el próximo plan entra sin tocar el archivo. Si un plan pago faltara ahí,
  el modal de pago no encuentra su precio, muestra "no se pudo calcular" y deja
  el botón apagado — un plan que no se puede comprar, sin ningún error visible.

### ✅ El ciclo de vida — HECHO (31/08/26), menos una pieza que depende de la Fase 5

La diferencia con las tiendas no es un detalle y conviene tenerla escrita:

| | Tienda | Digital |
|---|---|---|
| Entrada | prueba de 7 días | **Free**, sin tarjeta |
| Si no paga | **se le cierra la tienda** | **vuelve a Free**, no se cierra nada |
| Los 7 días | son la puerta de entrada | son la prueba de Starter o Pro **desde adentro** |

- ✅ **Un plan que no se cobra no puede vencer** (`planVence`). Sin esto el Free
  quedaba EXPIRED al instante: `getSubscriptionStatus` falla cerrado ante un
  ACTIVE sin `currentPeriodEnd`, que es exactamente la forma de una suscripción
  que no se renueva nunca.
  - La excepción **no le afloja el vencimiento a nadie más**: se pregunta por el
    precio del plan, no por su nombre, y un llamador que no trae rol ni tier
    sigue fallando cerrado. Lo vigilan VIDA-C y VIDA-D.
- ✅ **`altaDigitalFree()` y `caidaAFree()`**: los dos únicos lugares donde se
  escribe el estado de una cuenta digital.
  - Caer a Free **no borra nada** y **no reinicia la prueba** (VIDA-G):
    reiniciarla sería regalar siete días de Starter en cada caída, para siempre.
- ✅ **La prueba se toma una sola vez** (`pruebaYaUsada`), sin columna nueva: lo
  recuerda la distancia entre `createdAt` y `trialEndsAt`. Es el lado seguro para
  equivocarse; si se quiere abrir, se abre en esa función y en ningún otro lado.
- ✅ **La sección 7 bis del cron diario**: busca las digitales que ya vencieron y
  las devuelve a Free con su aviso. GRACE no se toca — son los días de colchón y
  el plan pago sigue andando.
- ✅ **11 chequeos nuevos** (VIDA-A a VIDA-K).

- 🔲 **Lo que falta y no se puede escribir todavía**: despublicar las páginas de
  venta que pasen el tope de Free cuando alguien cae. El modelo de producto
  digital no existe hasta la Fase 5. El lugar exacto está marcado en el cron.
  Mientras tanto una cuenta que cae de Pro a Free se queda con más páginas
  publicadas de las que le tocan — de más y no de menos, que es el lado correcto
  para equivocarse.
- 🔲 El mail de "bajaste a Free". Hoy es un aviso dentro de la app, que necesita
  el panel de la Fase 3 para poder verse.

### ✅ La puerta de entrada — HECHA (31/08/26)

- ✅ **La cuarta tarjeta en `/registro`**, "Vendo productos digitales". No lleva
  derecho al formulario: dice **"Elegir plan"** y muestra los tres, igual que la
  de tienda elige entre Pro y Premium. Recién elegido el plan se va al
  formulario, y la cuenta se crea con `altaDigitalFree()` o con
  `altaDigitalConPrueba()` según lo que haya elegido.
  - **Mensual / Anual también se elige ahí**, con el mismo interruptor que ya
    tiene el formulario de tienda. No se cobra nada —arranca una prueba— pero el
    ciclo queda guardado y es el que va a estar puesto al pagar: quien venía de
    `/precios` con "Anual" prendido perdía el −25% en el camino, en silencio
    (VIDA-P). El número grande es **por mes en los dos ciclos**: un $540.000
    gigante al lado de un $30.000 parece dieciocho veces más caro cuando en
    realidad es más barato.
  - **Los tres botones de `/precios` ahora funcionan** y llevan al mismo lado:
    `/registro?plan=digital&tier=…`. Antes los tres decían "Próximamente" y el
    registro no ofrecía ninguno — dos puertas contando historias distintas.
  - Naranja y con el mismo ícono que la tarjeta de `/precios` a propósito: es el
    mismo producto visto dos veces. Queda en la punta opuesta a "Tengo una
    tienda", que es la otra naranja.
  - Anchos revisados en los tres: 360 apiladas, **768 en dos y dos** —cuatro
    tarjetas con lista adentro no entran en esa pantalla—, 1280 las cuatro en
    fila.
- ✅ **El default de la ruta de registro era una trampa**: `accountType`
  desconocido caía en `OWNER`. Sin su rama escrita, pedir una cuenta digital
  creaba una cuenta **de tienda**, con su tienda vacía y su prueba de 7 días
  corriendo.
- ✅ **El interruptor se mira también del lado del servidor.** El formulario se
  puede saltear pegándole directo a la ruta; apagarlo en la pantalla no alcanzaba.
- ✅ **La cara propia del ingreso**: el panel del login pasa de "tres formas de
  usarla" a cuatro, con su tarjeta, y el aviso de cuenta creada tiene su texto
  —dice que quedó en Free.
- ✅ **El mail de bienvenida** del rol digital.
- ✅ **`panelDeRol` manda `DIGITAL` a `/digitales`.** Y de paso: los dos layouts
  de panel tenían **esa misma decisión copiada a mano**, cada uno con su `? :`.
  Con el rol nuevo mandaban una cuenta digital a "Mi cuenta", que es el panel de
  los clientes. Ahora los dos preguntan en un solo lugar.
- ✅ **`/digitales` existe**, con su guarda de sesión y de rol en el layout. Es
  sólo la puerta: adentro dice que el panel se está construyendo. Sin ella,
  `panelDeRol` mandaba a una ruta que da 404.
  - **Todavía sin manifest ni ícono ni `PWAManager`**: un manifiesto a medias
    instala una app rota. Va con el panel de verdad, en la Fase 3.

> **Lo que NO se pudo probar de punta a punta.** Crear una cuenta de prueba
> escribiría en la Supabase **de producción** —es la que usa `.env.local`— y el
> ingreso está roto en local por el captcha. Así que el circuito está leído y
> revisado, pero no ejecutado. Ver `login-roto-por-captcha`.

### 🔲 Lo que queda de la Fase 2

- 🔲 **Los pasos de creación antes de entrar al panel.** Hay imágenes de
  referencia para esto; van cuando lleguen. Su lugar es `/digitales`, que hoy es
  una pantalla sola que dice que el panel se está construyendo.

**Lo que sigue abierto:**

- 🔲 La comisión **congelada al momento del pedido**, no leída del plan de hoy.
  Si alguien vende con Pro (2 %) y después cae a Free (8 %), esa venta ya hecha se
  liquida al 2 %: cobrarle la diferencia después sería cambiarle el precio a algo
  que ya pasó. Va con el modelo de pedido digital.
- 🔲 El tope anti-abuso de páginas de venta, junto al código que lo aplica.
- 🔲 La comisión de plataforma sumada a `marketplaceFee`, y **qué pasa cuando una
  venta tiene afiliado Y comisión de plataforma** (las dos salen del mismo
  número).


## REVISIÓN COMPLETA — 31/08/26, antes de seguir con la Fase 3

Se revisaron los 13 commits de la rama, con foco en tres preguntas: ¿quedó algo a
medias?, ¿quedamos vulnerables?, ¿se entiende lo que decimos?

### Lo que apareció y se arregló

- ✅ **Con el producto apagado, sus planes se podían pagar igual.** El interruptor
  estaba escrito a mano en cuatro pantallas y **ninguna de las tres rutas que
  mueven plata lo miraba**. Pegándole derecho a `/api/suscripcion/preferencia` se
  cobraba un plan digital de verdad, y lo que se recibía era la pantalla que dice
  "el panel se está construyendo". Ahora el interruptor vive en `planLimits`
  (`DIGITALES_ABIERTO` + `planCerrado`), lo miran las tres rutas, y lo vigilan
  PLAN-D, PLAN-E y la sección 7 de `pagos-suscripcion.check.ts`.
- ✅ **El aviso de "bajaste a Free" llevaba a un 404.** Apuntaba a
  `/digitales/mi-plan`, que es de la Fase 3 y no existe. Justo al que acaba de
  perder su plan.
- ✅ **La regla de "no vence" tocaba a los afiliados sin querer.** Estaba escrita
  como "todo plan sin precio", y Afiliado también figura sin precio: una
  suscripción de afiliado vencida pasaba a estar activa para siempre, en silencio.
  Ahora la excepción es sólo de Productos Digitales (VIDA-Q, VIDA-R).
- ✅ **El cron hacía dos consultas por cuenta.** Corre **una vez por día con 60
  segundos** (plan gratis de Vercel) y lo que se corta si se acaba el tiempo es lo
  de abajo, sin ningún error. Ahora son tres consultas en total, no importa
  cuántas cuentas haya.
- ✅ **`/digitales` prometía un mail que nadie manda.** Decía "te avisamos por
  email cuando el panel esté abierto" y no hay código que lo mande. Ahora dice
  sólo lo que es cierto.
- ✅ **`esPlanPago` era código muerto** — cero llamadores. Borrado.

### Lo que se revisó y está bien

- Las tres rutas de pago: monto del servidor, candado de ecosistema en las dos
  que escriben, planes sin precio rechazados, y el alta de un plan pago que
  devuelve `TRIAL` y nunca `ACTIVE`.
- El alta: captcha, tope de ritmo, contraseña, términos, edad, email único y
  rollback del usuario de Supabase si falla la base. Todo corre **antes** de mirar
  qué tipo de cuenta es, así que lo hereda igual.
- Las guardas de los tres paneles, ahora las tres preguntando a `panelDeRol`.
- Ninguna ruta `/digitales/...` referenciada que no exista.

### Lo que queda sabido y anotado

- 🔲 **Nada impide abrir muchas cuentas Free** con correos distintos. Hoy no
  cuesta nada; **pasa a importar el día que se encienda la IA** (Fase 4).
- 🔲 **El correo no se verifica** (`email_confirm: true` sin mandar nada). Es así
  para los cuatro roles desde antes; no lo trajo esto.
- 🔲 **`pruebaYaUsada` no tiene llamador todavía**: la va a usar el botón de
  "probar Starter" del panel. La otra mitad de la regla ya está viva.
- 🔲 Despublicar las páginas de más al caer a Free: necesita el modelo de producto
  digital (Fase 5). El lugar exacto está marcado en el cron.


## CONFIRMACIÓN DE CORREO — HECHA (31/08/26)

No es de Productos Digitales: **toca a los cuatro roles**. Se anota acá porque se
hizo en esta rama y porque salió de revisar la seguridad del alta.

### El agujero

El alta le decía a Supabase `email_confirm: true`, que significa literalmente
*"creá esta cuenta y dala por confirmada"*. **Nunca se le escribía a la
dirección.** Alguien podía registrarse con el correo de otra persona y quedárselo:

- el dueño real **no podía volver a usar su propio correo**, quedaba ocupado;
- los mails de esa cuenta —**los pedidos incluidos**, si era una tienda— le
  llegaban a un desconocido;
- y al revés, quien escribía mal su correo nunca recibía nada y no se enteraba
  de por qué.

Prender "Confirm email" en el panel de Supabase **no lo arreglaba**: esa opción
vale para la puerta normal, y nosotros entramos por la de administrador, que se
saltea el paso a propósito.

### Cómo quedó

- ✅ El alta usa `generateLink` de tipo `signup`: crea la cuenta **sin confirmar**
  y devuelve el link. Es la misma función que usa la recuperación de contraseña
  desde siempre.
- ✅ El link viaja en el mail de bienvenida, **por Resend y con nuestro diseño**,
  no con la plantilla de Supabase. Un solo mail, no dos.
- ✅ **Ese mail dejó de ser informativo: es la llave.** Ahora se espera, y si no
  sale la pantalla lo dice y ofrece el reenvío. Antes iba sin `await` y sin clave
  de Resend se callaba: eso ahora dejaría cuentas creadas sin poder entrar.
- ✅ El ingreso distingue **"falta confirmar"** de "contraseña equivocada". Sin
  eso, la persona se ponía a cambiar una contraseña que estaba perfecta.
- ✅ **"No me llegó, reenviármelo"**, en las dos pantallas de ingreso —incluida la
  de la app instalada, que es la que no tiene links ni forma de salir.
- ✅ 13 chequeos nuevos en `confirmacion-correo.check.ts`.

### Lo que hay que saber

- **Las cuentas viejas no se rompen**: todas se crearon con el sello puesto y
  siguen entrando igual. Esto sólo aplica a las nuevas.
- 🔲 **El reenvío tiene DOS caminos** —el nuestro con link mágico, y el de
  Supabase como respaldo— porque no se pudo probar contra un Supabase de prueba y
  el peor final acá es alguien que se registra y **se queda afuera para siempre**.
  Cuando se confirme cuál anda, **se borra el otro**.
- 🔲 **El Site URL de Supabase sigue apuntando a `tienda-six-ecru.vercel.app`.**
  Funciona, pero los links de los mails llevan a esa dirección en vez de a
  `tiendaapps.com`. Cambiarlo es su propio movimiento, con su prueba.

### ✅ Lo que ya está hecho en el panel de Supabase

Redirect URLs cargadas (Total: 4): las dos que ya estaban, más
`http://localhost:3000/**` y `https://www.tiendaapps.com/**`. **Sin la de
localhost el link no se puede probar en local**: Supabase manda a producción.

## FASE 3 — El panel `/digitales`

### ✅ El esqueleto y Mi Plan — HECHOS (31/08/26)

- ✅ **La barra del panel** (`DigitalesNav`), con **dos entradas y no más**:
  Inicio y Mi plan. No hay entradas apagadas ni "próximamente" — un menú que
  nombra pantallas que no están se lee como "el panel está roto", no como "eso
  viene después". Lo vigila un chequeo que abre cada `href` del nav y verifica
  que exista su `page.tsx`.
  - **Una sola lista** para la barra ancha y para el menú del celular. Es la
    corrección que ya se le había hecho a `AfiliadosNav`, donde eran dos y cuatro
    pantallas enteras y andando no tenían botón en la computadora.
  - El corte va en **768** y no en 1024 como afiliados: son dos links, entran
    cómodos mucho antes.
  - Adentro de la app instalada, el logo lleva al inicio DEL PANEL y el botón de
    "ir al sitio principal" no existe. Mismo motivo que en los otros dos: los
    `<Link>` de Next navegan del lado del cliente, así que el `scope` del
    manifiesto no encierra a nadie y se terminaba navegando tiendaapps.com
    adentro de la app, sin barra de direcciones y sin forma de volver.
- ✅ **El manifiesto, el ícono y `DIGITALES_VERSION`.** Ya pueden ir: estaban
  escritos desde antes pero sin enchufar, porque un manifiesto a medias instala
  una app rota. Ahora el panel tiene adentro una pantalla que funciona.
  - El ícono va en **petróleo** (`#0c3b44`). Los otros dos ya se llevaron los
    extremos —blanco el de tiendas, grafito el de afiliados— y un tercero en
    cualquier neutro sería el del medio: a 48 píxeles no se distinguiría. No se
    usó el naranja del producto porque el logo YA es naranja.
  - `disableNotifPrompt`, igual que afiliados: hoy a una cuenta digital no le
    llega ningún push. Pedir permiso de notificaciones a quien no va a recibir
    ninguna es prometer algo que no se cumple.
- ✅ **Mi Plan** (`/digitales/mi-plan`), la primera pantalla que dice la verdad
  entera: el plan, el estado, los días que quedan y qué pasa cuando se terminan.
  - **No es una copia de la del panel de tiendas**, y no puede serlo: el plan de
    acá se comporta al revés. Una tienda que no paga se cierra; una cuenta
    digital vuelve a Free y sigue andando. La pantalla del dueño avisa un cierre;
    ésta tiene que sacar el miedo, porque el miedo acá sería mentira. Por eso el
    cartel de **"tu cuenta no se cierra" está en los cinco estados**.
  - **La comisión en su propia tarjeta**, no perdida entre las funciones: es lo
    único de la pantalla que le sale plata en cada venta.
  - Los tres números —comisión, precio y funciones— salen de `COMISION_DIGITAL`,
    `PRECIOS_DIGITALES` y `featuresDigital`. Ninguno escrito a mano.
  - Las cuentas se hacen en el **servidor** y bajan resueltas. La pantalla del
    dueño hace lo contrario —le pasa la suscripción cruda al componente de
    navegador, que importa `@/lib/subscription`, que arrastra Prisma— y esa
    cadena no había por qué volver a tenderla.
- ✅ **El botón de probar 7 días desde adentro** (`/api/digitales/prueba`).
  `pruebaYaUsada` estaba escrita desde la Fase 2 y **no la llamaba nadie**: ésta
  es su primera puerta.
  - ⚠️ Es la **única ruta del proyecto que regala un plan pago**. No cobra, así
    que no pasa por el webhook ni por ninguno de los controles que ya existen:
    los suyos son todos propios. Siete frenos, uno por cada forma de romperla —
    sesión, tope de intentos, el tier de una tabla con `hasOwnProperty` (nunca un
    cast), el producto tiene que estar abierto, la suscripción tiene que ser
    DIGITAL, hay que venir de Free, y la prueba tiene que estar sin usar.
  - La escritura es un `updateMany` con la condición adentro del `where` y no un
    `update` por id: así un doble click no empuja `trialEndsAt` catorce días.
  - El estado que queda es **TRIAL y nunca ACTIVE**. El tier lo elige el
    navegador; un ACTIVE acá sería el plan más caro, gratis y para siempre.
- ✅ **El aviso del cron ya apunta a Mi Plan.** Estuvo yendo a la raíz del panel
  mientras esa pantalla no existía, para no mandar a un 404 justo al que acababa
  de perder su plan.

**Dos cosas que se arreglaron de paso, y son del camino del dinero:**

- ✅ **Las `back_urls` de Mercado Pago dependen del ecosistema.** Estaban fijas en
  `/dashboard/mi-plan`, que era cierto mientras los únicos planes pagos fueran
  los de tienda. El que pagaba Starter volvía al panel de tiendas, que le mira el
  rol y le contesta "esta no es tu cuenta" — justo después de pagar.
- ✅ **El nombre del plan en el modal de pago sale del registro.** Era un `? :`
  escrito a mano con los tres planes de entonces, así que **cualquier plan nuevo
  caía en el `else` y se anunciaba como "Afiliado"**: se le pedía plata por un
  plan con el nombre de otro.
- ✅ Y un tercero, interno: quien está en Free y compra Starter ya no sale
  etiquetado como `VENCIDA` en la cotización, sino como `PLAN_GRATIS` (PAGO-P).
  El importe siempre fue el correcto; el motivo se vería el día que una pantalla
  lo cuente, y ahí le estaría diciendo "tu suscripción venció" a alguien que
  tiene un plan que no vence.

- ✅ **Los chequeos**: `panel-digitales.check.ts` (10 secciones) y `telefono.check.ts`
  (TEL-A a TEL-N) y `mails-escapados.check.ts`, más PAGO-P en `subscription.check.ts`.
  Total: **60 pruebas**.

### ✅ La barra lateral y Mi cuenta — HECHOS (01/09/26)

Al verlo andando aparecieron dos cosas.

**La barra estaba copiada del panel equivocado.** Era horizontal, calcada de
`/afiliados`. El panel que manda en esta plataforma es el de tiendas, y ese es
**lateral**. Dos paneles del mismo producto con el menú en lugares distintos se
sienten dos programas distintos.

- ✅ `DigitalesSidebar`: franja de 56 px que se abre a 240 al pasar el mouse,
  mismo molde que `DashboardLayout`. No la dejé fija en 240 porque lo que viene
  —productos, ventas, estadísticas— son tablas anchas, y esos píxeles se los come
  todo el tiempo para mostrar dos palabras que el ícono ya dice.
- ✅ En el celular: barra arriba y cajón, que es lo único que entra.
- ✅ La tarjeta de abajo dice **en qué plan estás** sin entrar a ninguna pantalla.
  Sin nombre cargado cae al correo y recién después a un texto fijo: decía "Mi
  cuenta", que es el nombre de la pantalla a la que la propia tarjeta lleva, y
  quedaba el menú repetido.
- ✅ **Botón de volver** arriba de cada pantalla de adentro. En escritorio parece
  de más —el panel de tiendas se lo sacó por eso— pero en el celular el menú vive
  atrás de una hamburguesa, y hay un caso peor: **el aviso del cron linkea DERECHO
  a Mi cuenta**, así que se puede caer en una pantalla de adentro sin haber pasado
  nunca por el inicio. Un chequeo recorre las pantallas y falla si alguna se queda
  sin salida.

**"Mi plan" pasó a ser "Mi cuenta"**, juntando el plan con los datos de la
persona, como lo tiene la competencia. Se miran juntos y el panel todavía no
tiene tantas pantallas como para partirlos.

- ✅ Nombre y celular editables, correo y fecha de alta a la vista.
- 🔲 **NO se copiaron las barras de "Tu uso actual"** (Tiendas 1/1,
  Almacenamiento 92 KB…), que es lo mejor que tienen. Hoy no hay qué contar: el
  modelo de producto digital no existe, y una barra clavada en 0 es un número
  inventado esperando a mentir. Van apenas exista el modelo.
- ✅ **La contraseña se cambia por un link al correo, no con un formulario.** Un
  formulario ahí deja que cualquiera con la sesión abierta —el teléfono
  desbloqueado arriba de la mesa— te cambie la contraseña y te deje afuera de tu
  propia cuenta. Pedir la vieja tampoco alcanza: para verificarla hay que volver a
  iniciar sesión contra Supabase, que según cómo esté configurado exige captcha y
  contestaría "contraseña incorrecta" siempre. El link reusa el circuito de
  "olvidé mi contraseña", que ya está hecho y probado.

### ✅ La revisión antes de commitear — cuatro defectos (01/09/26)

Los tres primeros son de seguridad y **ninguno lo introdujo esta pantalla**: ya
estaban, y hacer el nombre y el teléfono editables los puso al alcance.

1. ⚠️ **Dos mails metían el nombre CRUDO adentro del HTML.**
   `sendVerificationReceivedEmail` y `sendVerificationApprovedEmail` eran las dos
   únicas de `resend.ts` sin `escapeHtml`. Con el nombre editable desde el panel,
   eso es HTML puesto por la persona dentro de un correo que mandamos nosotros.
2. ⚠️ **La regla del teléfono estaba sólo en el registro.** O sea que el número
   que el alta rechazaba se guardaba igual entrando por `/api/perfil`. Es el mismo
   error que ya había pasado con la contraseña. Ahora vive en `lib/telefono` y la
   usan los tres: registro, ruta y pantalla (14 chequeos, TEL-A a TEL-N).
   - El que más importa es TEL-H: sin lista de caracteres permitidos entraba
     *"llamame al 1155556666 y preguntá por Juan"* como si fuera un teléfono. Se
     descubre el día que soporte necesita llamar.
3. ⚠️ **`/api/perfil` pisaba los tres campos siempre** (`city?.trim() || null`).
   Quien mandara sólo nombre y teléfono —exactamente lo que hace esta pantalla—
   **le borraba la ciudad a la persona** sin tocarla ni nombrarla. Nunca se vio
   porque la única pantalla que existía mandaba los tres juntos. Ahora distingue
   "no vino" de "vino vacío", limpia caracteres de control, tiene topes de largo,
   mínimo de nombre y tope de intentos.
4. **El botón de guardar se podía apretar de nuevo con los mismos datos.**
   Comparaba contra la prop, que no cambia sin recargar. Ahora compara contra lo
   último guardado, y la pantalla se queda con lo que devolvió la base y no con lo
   que se escribió.

**Verificado en 360 / 768 / 1280** con capturas reales y midiendo el DOM: cero
desborde horizontal en los tres, ningún texto cortado en la barra abierta.

### ✅ El barrido de los mails — HECHO (01/09/26)

Se revisaron las **130 interpolaciones** de `resend.ts` y `email.ts` una por una.

- ✅ **13 agujeros más en `resend.ts`**, además de los dos del nombre: la denuncia
  de una tienda (`storeName`, `storeSlug`, `reason`, **`description`** —el texto
  libre de quien denuncia— y `reporterEmail`) y toda la canasta solidaria
  (`campaignName`, `donorName`, **`message`** y `campaignUrl`). Los dos en negrita
  son texto libre escrito por una persona.
- ✅ Uno en `email.ts`: el `storeSlug` de un link, ahora con `encodeURIComponent`.
- ✅ **`email.ts` estaba bien.** Todo lo que viene de una persona ya pasaba por
  `escapeHtml` al armarse — direcciones, políticas de la tienda, datos bancarios,
  el color del newsletter (que además se valida como hexadecimal antes de entrar a
  un `style=`). Las 20 marcas que quedaban eran la **pregunta** de un ternario, no
  el valor.
- ✅ **Los `subject:` NO se escapan**, y es correcto: son texto plano, no HTML.
  Escaparlos haría que a alguien le llegue "Tienda &amp; Co" en el asunto.

**El chequeo nuevo** (`mails-escapados.check.ts`) recorre los dos archivos, saca lo
que ya está protegido —`escapeHtml`, `encodeURIComponent`, los formateadores de
plata, los textos entre comillas y la condición de los ternarios— y falla si lo que
queda nombra algo que suele venir de una persona.

Probado al revés: destapando a mano uno de los agujeros recién arreglados, falla y
lo señala con archivo y línea. Total: **60 pruebas**.


### ✅ El modelo de producto digital — HECHO (01/09/26)

Era la decisión que destrababa todo lo demás. **Un producto, un bono y un upsell
son la misma cosa con distinto papel**, así que van en la misma tabla y se
separan por `rolDigital`. No hay tablas nuevas a propósito: dos tablas más serían
dos copias del mismo formulario, de la misma subida y de la misma entrega, y se
desincronizan de a una.

- ✅ Dos columnas en `Product`: `rolDigital` (PRINCIPAL / BONO / UPSELL) y
  `padreId`, que cuelga los hijos de su principal con borrado en cascada.
- ✅ Migración `20260901120000_add_embudo_digital`, escrita a mano, comparada
  contra `prisma migrate diff` antes de aplicarla. Después: 115 productos, 0 con
  rol y 0 con padre — no tocó nada de lo que ya estaba.
- ✅ `productos-digitales.ts`, sin Prisma adentro para que la pantalla lo pueda
  importar: `rolDe`, `topeDe`, `loQueFalta`, `validarCampos`, `imagenValida`.
- ✅ `espacio-digital.ts` crea la `Store` que le presta el motor a la cuenta
  **recién al guardar el primer producto**, y nunca se le dice "tienda" en
  pantalla. Entrar a mirar no deja una tienda vacía colgando.

### ✅ Productos — crear, editar, publicar — HECHO (01/09/26)

- ✅ Una sola pantalla para los tres roles, con el principal arriba y sus bonos y
  upsells anidados, cada grupo con su contador contra el tope del plan.
- ✅ Portada por `/api/upload`, con lista blanca al guardar: una dirección ajena
  adentro de la página de venta es un rastreador de un tercero mirando quién
  entra.
- ✅ **Publicar está bloqueado hasta que exista el archivo**, en la pantalla y
  otra vez en el servidor. Es el peor final posible de este ecosistema: se cobra
  la plata y no llega nada.
- ✅ Los frenos de las rutas: rol DIGITAL, tope de intentos, el rol sale de una
  lista y no de un cast, **el padre se verifica contra la cuenta que pide**, el
  tope se cuenta en la base, y nace despublicado siempre.
- ✅ Borrado suave que arrastra bonos y upsells: borrar de verdad dejaría pedidos
  viejos sin poder decir qué se vendió, y con ellos los permisos de descarga de
  gente que ya pagó.
- ✅ Doble clic cortado con un ref y no con estado: el estado se ve recién en el
  dibujo siguiente, así que dos clics en el mismo cuadro pasaban los dos.
- ✅ 20 pruebas nuevas (`productos-digitales.check.ts` y el bloque 11 de
  `panel-digitales.check.ts`).

- 🔲 **Subir el archivo del producto** — bucket privado en Supabase con permiso
  firmado, igual que `/api/upload/firma`. Hasta que exista, publicar queda
  cerrado a propósito.

  **Cerrado el 01/09/26, mirando el panel de ellos:**

  - **Va en la tarjeta del producto, no en una pantalla aparte.** Ellos tienen un
    "Diseño de ebooks" separado, pero sus tarjetas son las mismas que las de
    productos: una pantalla nueva mostraría las mismas tarjetas dos veces. El
    renglón del archivo ya está dibujado en nuestra pantalla de Productos, y
    cuando llegue la IA su botón va al lado del de subir.
  - ⚠️ **Su propio cartel del "Pegar link" nos da la razón** (visto el 01/09/26).
    El modal avisa: *"Asegurate de que el link esté con permisos públicos
    ('cualquiera con el link puede ver'), sino tus compradores no van a poder
    acceder."* Están diciendo en voz alta que **el archivo queda público en
    internet**: sin token, sin vencimiento, sin tope de descargas, y el comprador
    lo comparte y listo. Y abajo aclaran para qué existe — *"Útil para archivos
    >50MB"*: **tienen nuestro mismo techo** y el link es su salida de emergencia.
    Nosotros ya tenemos otra salida para ese caso y es mejor: pedir el PDF
    exportado en calidad de pantalla (el de 117 MB baja a unos pocos).
  - ⚠️ **"Generar con IA" no escribe texto: arma un PDF DISEÑADO.** Su modal no
    pregunta de qué se trata —eso ya lo sabe del título y la descripción—, sino
    **cómo se ve**: *"Todos generan un ebook premium con portada, imágenes y
    maquetación profesional"*, con cuatro estilos a elegir.
    **Esto puede dejar corta la cuenta de 3 bis.** Los US$2–4 estimados son para
    escribir texto; portada e imágenes generadas se pagan aparte. Si el mercado
    espera *eso* cuando lee "ebook con IA", el número de la Fase 4 cambia. Va a la
    medición.
  - **El aviso del peso va ANTES de elegir el archivo, no después.** Su botón abre
    el explorador directo y no dice el límite hasta que ya elegiste: con la guía
    de 117 MB eso es esperar la subida entera para que falle. Y el texto no puede
    ser "máximo 50 MB" —eso no le dice a nadie qué hacer— sino **"exportá el PDF
    en calidad para pantalla"**, que es la instrucción que resuelve el problema.
  - **Qué NO se copia de sus pantallas.** La función no es de nadie —"subir un
    PDF" no se registra—; la expresión sí. No se copian sus textos literales
    (*"Elegí el estilo de tu ebook"* y las descripciones de cada estilo) ni su
    curaduría: **Revista / Editorial / Notas al margen / Collage** por separado son
    genéricos, pero los cuatro juntos son su selección. Nuestros estilos, nuestros
    nombres, nuestros textos.
  - **Dos caminos, no tres: "Subir PDF" y "Generar con IA".** Ellos ofrecen
    además **"Pegar link"** y nosotros no: toda nuestra entrega es un token que se
    canjea por un link firmado de vida corta, y un link pegado a Drive **no
    vence, no se agota, no se revoca y lo puede cambiar la vendedora después de
    haber cobrado**. Es tirar el único diseño que ya costó una auditoría entera.
  - **Sólo PDF para empezar.** Es lo que se vende en este mercado, se abre en
    cualquier lado y es la superficie más angosta. Se amplía si alguien lo pide.
  - **Cada bono y cada upsell es un archivo aparte.** No es una etiqueta ni un
    descuento: es otro ebook con su propio contenido. En Pro son hasta **45
    archivos por cuenta** (5 productos × 1 principal + 5 bonos + 3 upsells).
  - ⚠️ **Y el bono va incluido y gratis, así que una venta arrastra varios
    archivos**: en Pro, el principal más 5 bonos son **6 descargas de una sola
    compra**, hasta 9 si acepta los upsells. A 25 MB cada uno son 150 MB por
    venta, y ese tráfico lo paga la plataforma — es egress, que es justo por
    donde se va la cuota de Supabase. El aviso de los 25 MB no es "tu archivo es
    grande": es **"tu archivo se multiplica por seis en cada venta"**.

### ✅ Configuración — HECHA a medias, y a propósito (01/09/26)

El orden es el de la competencia, que fue lo que pidió Flavio expresamente
("lo que más me interesa es cómo está ordenado"). Menos **Idioma**: ellos venden
en todo el mundo y nosotros en Argentina, así que sería un selector con una sola
opción.

**Pestañas:** General · Pagos · Meta/Tracking · Dominio.

Anda de verdad:

- ✅ **Tus datos** — logo, nombre, **nombre en el checkout** (separado, vacío =
  usa el de la marca), dirección y **mail de soporte**.
- ✅ **Contexto para la IA** — `iaProducto` e `iaDescripcion`: el **nicho** de la
  cuenta, que es lo que va a leer todo lo que genere la IA. Es la pieza que
  faltaba y la que conecta esta pantalla con la Fase 4.
- ✅ **Pagos** — Mercado Pago con la comisión del plan al lado del botón.
- ✅ Migración `20260901160000_config_digital`: 4 columnas nullables en `Store`,
  comparadas contra `migrate diff` antes de aplicar.
- ✅ El callback de Mercado Pago vuelve **al panel del que salió**. Antes iba
  siempre a `/dashboard/pagos`. El destino se traduce contra una lista fija: la
  redirección lleva nuestro dominio, y guardar la dirección entera habría hecho
  una redirección abierta.
- ✅ **Un botón de guardar por sección.** La competencia tiene "Guardar cambios"
  arriba Y "Guardar contexto" abajo, y no se puede saber cuál guarda qué.
- ✅ 47 pruebas nuevas entre `configuracion-digital.check.ts` y los bloques 12 y
  13 de `panel-digitales.check.ts`.

Dibujado pero **apagado, con el motivo escrito en pantalla** — está así para que
no se olvide, no porque falte poco:

- ❌ **Zona horaria** — **sacada** (01/09/26). Vendemos en Argentina: era un
  selector con una sola respuesta posible. El corte del día queda fijo en Buenos
  Aires.
- ✅ **Apariencia** (Automático / Claro / Oscuro) — **anda** (01/09/26). Ver
  abajo.
- 🔲 **App y avisos de ventas** — a una cuenta digital todavía no le llega ningún
  push.
- 🔲 **Zona de peligro** — ⚠️ la que menos se puede apurar: de la cuenta cuelgan
  pedidos y **permisos de descarga de gente que ya pagó**.
### ✅ Apariencia: claro y oscuro — HECHA (01/09/26)

Las tres opciones andan y la preferencia queda en **este aparato**, no en la
base: es de quien mira, no de la cuenta.

#### ⚠️ Por qué NO se usó `dark:`

`next-themes` está en la raíz con `defaultTheme="dark"`, así que **`<html>` lleva
la clase `.dark` casi siempre**. Los paneles se veían claros nada más que porque
usaban clases de un solo tono: en cuanto uno escribiera `dark:bg-gray-900`
adentro del panel, se aplicaría **siempre** y sin forma de apagarlo desde
Apariencia.

Por eso el panel tiene **su propia variante**, `panel-oscuro:`, sobre un atributo
`data-panel-tema` en `<html>`. Maneja su tema sin tocar el del resto del sitio.

#### El parpadeo, que es la mitad del trabajo

Sin un `<script>` **sincrónico**, entrar en oscuro es un flash blanco de pantalla
completa: el HTML llega claro, React hidrata, y recién ahí se lee la preferencia.
Ningún efecto de React corre antes del primer dibujo; un script en línea sí.

Medido con Playwright: al recargar con "oscuro" guardado, **el atributo ya vale
"oscuro" en `DOMContentLoaded`** — o sea, antes de que React exista.

- ✅ El valor guardado siempre es "claro" u "oscuro", nunca "auto": lo automático
  se resuelve en JS y se escribe ya decidido. Una sola fuente de verdad.
- ✅ Todo el script va en un `try`: leer `localStorage` **tira** con el
  almacenamiento bloqueado, y ese error cortaría el script dejando la página a
  medio pintar.
- ✅ Se acompaña con `color-scheme`, que no es decorativo: es lo que hace que las
  barras de scroll y los desplegables salgan oscuros. Sin eso, adentro de un
  panel oscuro se abre un menú blanco.
- ✅ **361 clases emparejadas** en las 6 pantallas del panel, con un mapa único —
  si cada archivo eligiera su propio gris, el panel se vería de seis colores.
- ✅ Verificado en los dos temas a 360 / 768 / 1280, sin desborde.

### ✅ Meta / Tracking — HECHA (01/09/26)

Estuvo a punto de quedar apagada por un error de análisis: se habían mezclado dos
cosas distintas.

| | Necesita | Estado |
|---|---|---|
| **Pegar el ID** de un píxel que ya tenés | nada de Meta | ✅ hecho |
| **Elegir o crear** el píxel desde el panel | `ads_management` | 🔲 nunca se pidió |

`facebook.ts` pide `business_management, catalog_management`. Crear un píxel es
`POST /{businessId}/adspixels`, que pide `ads_management` — **ese permiso ni
siquiera está en el diálogo**. No es que Meta lo rechazó: no se solicitó. El
código del píxel ya está escrito.

- ✅ **Píxel de Meta** y **Google Analytics**, pegando el ID.
- ✅ **Microsoft Clarity** — grabaciones de pantalla y mapas de calor, gratis y
  sin límite. Acepta el **script de instalación entero** y le saca el ID: Clarity
  no muestra el ID pelado en ningún lado cómodo.
- ✅ Los formatos de ID viven en **`tracking-ids.ts`, una sola definición**, que
  usan la pantalla que los deja escribir y el componente que los inyecta. Estaban
  declarados sueltos adentro del inyector; ese valor entra literal en un
  `<script>` público, y dos copias de la regla se desincronizan de a una.
- ✅ El píxel de la plataforma y el de la vendedora ya estaban separados por ruta,
  y `/tienda` está en `RUTAS_EXCLUIDAS_PIXEL` — o sea que la página de venta de un
  producto digital queda cubierta sola. Verificado con `meta-pixel.check.ts`.

#### ⚠️ Clarity: el agujero que casi se cuela

`analytics` es una clave de **diseño**, así que el editor de templates la
reescribe entera al guardar, y **zod descarta las claves que no conoce**. Un
`clarityProjectId` no declarado en el esquema se guardaría bien, se vería bien, y
desaparecería la primera vez que alguien tocara el diseño — sin error y sin
rastro. Hay que tocar los tres archivos juntos, siempre:
`lib/store-config.ts`, `types/store-config.ts` y el inyector. Un chequeo lo
verifica para los tres IDs.

#### 🔲 Lo que NO se copió, y por qué

- 🔲 **API de Conversiones (CAPI)** — sí vale, y bastante: el píxel del navegador
  lo comen los bloqueadores y el iPhone; CAPI le avisa a Meta desde el servidor.
  **Media base ya está**: `StoreTrackingScripts` manda el `Purchase` con
  `eventId` y `emHash`, y ese `eventId` es justo lo que CAPI necesita para no
  contar la venta dos veces. No es pegar un token: es mandar el evento.
- 🔲 **Verificación de dominio** — sólo sirve con dominio propio (Fase 5 bis).
- ❌ **Utmify y UTMIFLOW** — dos servicios del ambiente de infoproductos
  brasileño. El texto de ayuda de la competencia quedó **en portugués**
  (*"Generalo en Integrações > Webhooks"*), así que ni lo tradujeron: lo
  heredaron de una plantilla. Si Flavio no las conoce, sus vendedoras tampoco.
- 🔲 **Dominio propio** — depende de la Fase 5 bis.

### Qué cambia en Configuración según el plan — CERRADO (01/09/26)

La regla que ordena todo el panel, y que da vuelta el instinto de trabar por
trabar:

> **En Free ganamos por comisión, así que todo lo que lo ayude a vender nos hace
> ganar a nosotros. Se traba SOLO lo que nos saltea la comisión o lo que nos
> cuesta plata recurrente. Nada más.**

| Sección | Free | Starter | Pro |
|---|---|---|---|
| Datos, dirección, mail de soporte | igual | igual | igual |
| **Contexto para la IA** | **sí** | sí | sí |
| Comisión de Mercado Pago | 8 % | 6 % | 2 % |
| **Transferencia** | **🔒 no** | sí | sí |
| **Píxel de Meta y Analytics** | **sí** | sí | sí |
| App y notificaciones | sí | sí | sí |
| **Dominio propio por producto** (cuando exista) | **🔒 no** | **🔒 no** | sí |

Los cuatro porqués:

- **Transferencia trabada en Free**, y no es para empujar a pagar: Free no paga
  abono, así que lo único que deja es el 8 % que se retiene adentro del cobro de
  Mercado Pago. En una transferencia no pasa un peso por la plataforma. Un Free
  con transferencia prendida no paga nada por nada.
- **Píxel y Analytics para los tres.** No nos cuesta un peso —es el píxel de la
  vendedora— y sin medir vende menos, o sea que cobramos menos. Trabarlo en Free
  es pegarnos un tiro en el pie.
- **App y notificaciones para los tres**, igual que la competencia.
- **Dominio propio sólo en Pro**, y es **por producto**, no por cuenta. Esta tabla
  decía "sí" también en Starter y contradecía a la tabla de planes de la sección 4
  y al código (`featuresDigital` lo prende sólo en Pro). Corregido el 01/09/26.
  Que sea por producto es lo que hace que los 5 productos de Pro puedan ser de 5
  nichos distintos — ver Fase 5 bis.

#### ⚠️ La IA en Free — decidido el 01/09/26, falta el número

**Free NO se queda sin IA.** Decisión de Flavio, con este argumento: *"por algo
nos cobramos la comisión"*. Una cuenta que no arranca no vende, y si no vende no
hay 8 % de nada.

**⚠️ Corregido el mismo día: lo que cambia no es el tope, es PARA QUÉ.**

La primera forma fue "la IA existe en los tres planes y lo que cambia es el
número", y a Free le tocaba `ebooksIA: 1`. Mirando la tabla de la competencia se
vio que estaba al revés de lo que conviene:

| | Free | Starter | Pro |
|---|---|---|---|
| `ebooksIA` | **0** (estuvo un rato en 1) | 2 | 5 |
| Página y fichas armadas con IA | **✅** | ✅ | ✅ |

A Free la IA le arma **la cáscara** —la página y las fichas— y el contenido del
ebook lo trae la persona. Los dos motivos:

1. **El costo está al revés de lo que parece.** El ebook son US$2 a 4 de API; los
   textos de una landing son centavos. Estábamos regalando lo caro y cobrando lo
   barato.
2. **Free no pide tarjeta.** Un ebook escrito con IA sirve FUERA de la
   plataforma: diez cuentas, diez ebooks. Una página generada no le sirve a nadie
   afuera. **Lo que se regala tiene que ser lo que no se puede cosechar.**

Y el gancho de Free no se pierde: lo que impresiona al entrar es ver la tienda
armada sola, y eso lo dan los centavos de texto, no los dólares del ebook.

El reparto completo —el lote de arranque, el reintento incluido, la prueba de 7
días y las cinco paredes— está en **2.4 bis**.

Por eso **Contexto para la IA se le muestra a los tres**: es lo que la IA lee
para generar.

- 🔲 **Sigue provisorio hasta medir un ebook de verdad** (Fase 4). Si sale US$4,
  un Free que nunca vende nos cuesta eso y no lo recuperamos nunca.
- 🔲 Y sigue en pie que **la capa de cuentas Free es la crítica**: es gratis, no
  pide tarjeta, y veinte cuentas truchas son la misma persona. El tope por
  usuario no se entera.

### 🔲 Lo que sigue
- 🔲 **Inicio de verdad**: las URLs y los próximos pasos. Hoy es una pantalla que
  dice que el panel se está construyendo, con un solo link a Mi cuenta.
- 🔲 **Ventas**, y recién después **Estadísticas**, cuando haya qué mostrar.
- 🔲 **El asistente de la primera vez** (los 5 pasos de la competencia). Se diseña
  ahora, se construye último: depende de las Fases 4 y 5.


## FASE 4 — La IA

Las cuatro cosas están decididas en 2.4. Lo que falta acá es **cómo se pagan y
cómo se frenan**, y eso va antes que cualquier pantalla: el tope no se agrega
después, porque hasta que exista la factura de Anthropic no tiene techo.

- ⚠️ **Medir qué es "un ebook", no sólo cuánto sale.** Su modal PROMETE un PDF
  *"premium con portada, imágenes y maquetación profesional"*.
  **Ojo: eso es su cartel, no algo que hayamos visto andar.** En Free el botón
  está frenado, así que nadie lo pudo correr. Si de verdad es eso lo que el
  mercado entiende por "ebook con IA", la medición tiene que ser de eso —las
  imágenes se pagan aparte— y el número de abajo queda corto. Si es marketing, no
  cambia nada. Hay que verlo antes de creerlo.
- 🔲 **Medir un ebook de verdad** antes de prometer un número. La estimación de
  hoy es US$2–4 por ebook con Opus 5, y está sin verificar. `ebooksIA` en
  `TOPES_DIGITALES` (0 / 2 / 5) es provisorio hasta esa medición.
- 🔲 **Las cuatro capas de topes**, calcadas de `asistente-limites.ts`: ráfaga,
  diario por cuenta, global de cuentas Free, global total. Ninguna función sale
  sin tope, tampoco en Pro.
- 🔲 **La capa de cuentas Free es la crítica**: es gratis, no pide tarjeta y da
  acceso a IA. Veinte cuentas truchas son la misma persona y ningún tope por
  usuario se entera.
- 🔲 **El lote de arranque, y que llegue con el COBRO y no con la prueba.** Los 7
  días son sin tarjeta: entregar ahí las 6 generaciones de Pro es regalarle hasta
  US$48 a alguien del que no tenemos un solo dato de cobro. En la prueba va el
  plan entero con **una** generación. Ver 2.4 bis.
- 🔲 **El reintento incluido por ebook.** Se cuentan ebooks —es lo que dice el
  cartel— pero cada uno se regenera una sola vez, si no el costo no tiene fondo.
- 🔲 **El tope de la página de venta con IA.** Hoy `paginas` limita cuántas se
  pueden TENER y nada limita cuántas veces se pide regenerarla. Volver a generar
  es lo primero que hace todo el mundo, y Free tiene ese botón.
- ✅ **Qué es la "cáscara", visto de primera mano en su Free (02/09/26).** La IA
  crea **SÓLO TEXTO**: título, descripción y precio del principal, del bono y del
  upsell. **Ni PDF ni imagen** — la portada que se ve en las capturas la subió
  Flavio a mano. O sea que la cáscara cae exactamente en la pantalla de Productos
  que ya existe: tres tarjetas, las tres en rojo con "falta el archivo", y en cada
  una el botón de subir el PDF. No hay que construir nada nuevo para recibirla.
- ✅ **La cáscara se arma POR PRODUCTO, no por cuenta — CERRADO (02/09/26).**

  Siempre **un embudo completo**: el principal, un bono y un upsell. Nunca se
  llena el plan de una.

  El motivo no es que 9 tarjetas vacías sean un mal primer día —eso es
  cosmética—. Es que **una descripción es un nicho**: si alguien escribe "vendo
  cosas de mecánica" y la IA arma los 5 productos de Pro, **los 5 van a ser de
  autos**. Y eso es lo contrario de para qué sirve Pro — los 5 productos existen
  justamente para ser de nichos distintos, que es la misma razón por la que cada
  uno necesita su dominio (Fase 5 bis). Generarlos todos de un texto deja cuatro
  de sobra.

  Y de acá se cae una duda que estaba anotada: *"¿qué pasa si la persona ya tiene
  productos cuando la IA corre?"*. **Deja de existir.** No hay ningún momento
  especial "la primera vez": la primera vez es simplemente "tenés 0 productos,
  hagamos uno", y después es el mismo botón siempre.

  ```
  cuenta vacía   →  contás tu nicho      →  1 embudo (producto + bono + upsell)
  querés otro    →  "Crear producto"     →  contás EL OTRO nicho  →  otro embudo
  ```

  Free no necesita el botón del segundo: su tope es 1 y la pantalla ya dice
  "llegaste al tope".

  Los números del arranque acompañan sin haberlo buscado: Starter tiene 3
  generaciones y un embudo son 3 ebooks —justo—; Pro tiene 6, o sea un embudo
  entero y medio del siguiente.

  Y refuerza la Fase 5 bis desde otro lado: si cada producto se arma con su
  propio nicho, su título, su descripción y su cara **son de ese nicho**. Lo de
  ayer y lo de hoy son la misma idea mirada de dos lados — **el producto es la
  unidad, no la cuenta**.
- 🔲 **Son DOS botones de IA distintos, y conviene no mezclarlos.** Se ven
  parecidos y cuestan cosas completamente distintas:

  | | Dónde va | Qué hace | Cuánto cuesta | Quién lo tiene |
  |---|---|---|---|---|
  | **Armar el embudo** | adentro de "Crear producto" | 3 fichas con título, descripción y precio | centavos, es texto corto | los tres planes |
  | **Escribir el ebook** | en cada tarjeta, al lado de "Subir PDF" | el PDF de ESA ficha | US$2–4 | Starter y Pro |

  El primero corre **una vez por producto**; el segundo, **una por tarjeta**. El
  cupo de `ebooksIA` es del segundo nada más — el primero no se cuenta, por lo
  mismo que no se cuentan los títulos: contar lo barato pone fricción donde no
  hay costo (ver 2.4 bis).

  Y el orden es el que se ve en el panel de la competencia: primero aparece la
  cáscara, y recién ahí cada tarjeta tiene su botón de generar el contenido.
- 🔲 Generar la vidriera entera (el gancho principal).
- 🔲 Escribir el contenido del ebook/PDF.
- 🔲 Los textos de venta y los mails (entrega, carrito abandonado).
- 🔲 Sasha adaptada: embudos, descargas y conversión en vez de stock y envíos.

## FASE 5 — La página de venta y el checkout

Anotado ahora que se sabe qué forma tiene (ver 2.3). Cuelga del producto, en
`/tienda/[slug]/producto/[id]`, y reemplaza a la ficha común para este ecosistema.

- 🔲 El armado de la página: gancho, producto, precio tachado, bonos, prueba
  social, dolores, testimonios, apilado de valor, 3 pasos, garantía, preguntas
  frecuentes, cierre y **barra fija abajo**. → **el catálogo de secciones ya
  está**, ver abajo; falta dibujarlas.

### ✅ Qué es una página de venta — el catálogo, HECHO (02/09/26)

Vive en `src/lib/pagina-venta.ts`, con 34 chequeos en su `.check.ts`. No dibuja
nada: declara **qué secciones existen, con qué campos, con qué topes y cuáles no
se pueden apagar**. Salió de mirar el "Diseño de tienda → Contenido" de la
competencia, que tiene 13 secciones con ocultar y reordenar, y una vista previa
que se edita desde los dos lados.

**Por qué un catálogo cerrado y no bloques libres.** No es por ahorrar trabajo:
esta página la va a llenar la IA (Fase 4). Con un catálogo fijo, lo que la IA
devuelve se compara campo por campo contra la lista antes de guardarse — sobra
algo, se tira; falta algo, se ve. Con bloques libres no hay contra qué comparar.
De yapa, la pantalla se dibuja leyendo la misma lista, así que un campo nuevo no
se olvida en ningún lado.

**Las 13 secciones**, en orden de guion de venta: portada · qué te llevás ·
bonos · beneficios · esto te suena · cómo funciona · opiniones · precio ·
garantía · preguntas frecuentes · oferta con fecha · aviso de ventas · pie.

**Lo que NO se puede apagar, y por qué cada uno:**

| Sección | Motivo |
|---|---|
| **Precio** | En el de la competencia sí se puede ocultar, y esa combinación arma una página que dice "Comprar ahora" sin mostrar cuánto sale hasta el checkout. Acá el precio se ve antes de pagar, siempre. |
| **Qué te llevás** | Una página que cobra tiene que decir qué entrega. |
| **Pie** | Ahí está el contacto de quien vende: a quién reclamarle no es una preferencia de diseño. |
| **Portada** | Es la primera pantalla. Sin ella la página arranca en el medio de una explicación. |

Y no alcanza con no dibujar el botón: mandar `visible: false` a mano tampoco
funciona, está chequeado (NOR-D).

**Lo que se decidió de paso:**

- **El producto no se copia a la página.** Nombre, descripción, imagen y precio
  salen del producto; en la sección va sólo el encabezado. Si se copiaran, el día
  que se corrige el precio en Productos la página seguiría mostrando el viejo — y
  ese número es el que la persona lee antes de pagar.
- **Sin saltos de línea.** Todo pasa por `limpiarTexto`. Dos ideas separadas son
  dos campos o dos ítems, no un campo con Enter adentro. (La competencia llegó a
  lo mismo: su Hero tiene bloques de texto sueltos, no un campo con saltos.)
- **Las imágenes, sólo `https:`.** Un `javascript:` o un `data:` acá terminan
  adentro de un atributo de la página pública.
- **Opiniones, garantía y las dos de urgencia nacen apagadas.** Una página recién
  creada no tiene ninguna opinión de verdad; encenderla de fábrica es pedir que
  se inventen tres. La garantía es una obligación que se asume, no una decoración
  que se prende sin leer.
- **SEO no es una sección**: el producto ya tiene `seoTitle` y `seoDescription`.
- **Una sección nueva del catálogo aparece sola en las páginas viejas, pero
  apagada.** No se le cambia la página a nadie sin avisar.

**Descartado de lo que tienen ellos:**

- 🚫 **Código (CSS)** y 🚫 **Secciones HTML insertadas** — la segunda es la
  primera entrando por la ventana, y peor: con HTML se meten formularios y
  scripts, no sólo colores. En una página que cobra, no.
- 🚫 **Recursos** como sección aparte — su propio cartel dice que existe "para
  usarlos en el código HTML/CSS personalizado". Sin CSS se queda sin motivo. Las
  imágenes de la página se suben desde adentro de Contenido.

**✅ DECIDIDO (03/09/26): la urgencia va con fecha real, y sin cupos.**

En el de ellos las tres son mentira configurable — el reloj se reinicia (probado
con sus propias capturas: 13:44 → 04:32 → 02:59), "Quedan 7 cupos" es un número
escrito a mano que no cuenta nada, y "Fulana compró hace 5 minutos" es una
sección que se llena sola con nombres inventados.

**El reloj ya era honesto y estaba a mitad de camino.** Contaba hacia una fecha
guardada, la misma para todo el mundo, y al llegar a cero desaparecía. Pero
**pasada la fecha el precio tachado seguía ahí**, con su "Ahorrás $X" y su sello
de descuento: la página seguía pregonando una rebaja cuyo propio final ya había
anunciado. Encontrado el 03/09/26 al ir a cerrar la decisión.

Ahora, cuando la fecha pasa, se apaga **el descuento del producto**: sin tachado,
sin "Ahorrás" y sin sello. Los bonos no se tocan —siguen viniendo y siguen
valiendo lo que valen— así que el ahorro no desaparece, se achica a lo que sigue
siendo cierto. **Lo que dejó de valer deja de contar; lo que sigue valiendo sigue
contando.**

**Y no sube el precio.** Se cobra lo mismo: lo que se apaga es el argumento, no
la caja. Subirle el precio a alguien porque se le venció una fecha que quizás
olvidó actualizar es decisión del vendedor, no nuestra. El incentivo igual queda
fuerte: quien la deja vencer pierde el tachado y el sello hasta poner una nueva.

**Sin campo de cupos, a propósito.** Un PDF no tiene stock —hay infinitas
copias— así que "quedan 7" es falso **siempre**. Es el mismo motivo por el que no
hay campo de estrellas. La única forma honesta sería que el checkout cortara la
venta de verdad en 7; el día que exista, el campo se agrega y no antes.

**Dos cosas se arreglaron de paso**, y las dos eran bugs que ya estaban:

- `LoQueIncluye` **tenía su propia copia** de la fórmula del precio regular. Con
  la oferta vencida las dos daban números distintos en la misma pantalla. Ahora
  la cuenta toma un solo argumento (`datos`) y devuelve el regular: no queda nada
  que olvidarse en uno de los cuatro lugares que dibujan precio. Es exactamente
  la forma del bug de los bonos, donde una decía $20.000 y la otra $34.000.
- `BarraDeOferta` tenía **`bg-amber-400` escrito a mano**: elegías Violeta y la
  barra seguía amarilla, y en Nocturno era una franja clara sobre página oscura.
  El mismo error del recuadro de bonos — **y el chequeo que lo cuida (TON-H)
  miraba un solo archivo**, así que este de al lado le quedaba afuera. Ahora mira
  la carpeta entera, y saca los comentarios antes de mirar: ya falló dos veces
  porque el comentario que explica el error contenía la palabra buscada.

El aviso de ventas queda como estaba: no tiene nada para escribir porque muestra
**compras reales** de ese producto.

**🔲 Lo que sigue**, en este orden: la página pública (una sola pieza dibuja la
página, usada también como vista previa — si son dos se separan solas y la previa
termina mintiendo, ya pasó con los templates de tienda) → el editor con ocultar y
ordenar → la previa PC/celular al lado → tocar a la derecha y que se abra la
casilla a la izquierda.

### ✅ La página pública y el editor — HECHOS (02/09/26)

- **`components/digitales/PaginaDeVenta.tsx`** — la única pieza que dibuja la
  página. Se mira en `/p/<id>` (dirección **provisoria**: la definitiva es el
  subdominio por producto, Fase 5 bis). Vive fuera de `/digitales` porque ese
  layout trae barra lateral, tema del panel y guarda de rol, y quien compra no
  tiene cuenta.
- **`digitales/productos/[id]/pagina`** — el editor, con las secciones a la
  izquierda y la página de verdad al lado.
- **`api/digitales/productos/[id]/pagina`** — guarda. Todo pasa por
  `normalizarContenido` y se guarda el resultado, **nunca el cuerpo del pedido**.

**Dónde vive el editor — CERRADO (02/09/26).** Se entra desde la tarjeta del
producto, botón "Página de venta". **No hay ítem nuevo en la barra lateral**, y
el motivo es nuestro modelo: la competencia puede poner "Diseño de tienda" suelto
en su menú porque arriba tiene un selector de tienda y cada tienda es un embudo;
acá una cuenta Pro tiene hasta 5 páginas con 5 direcciones, así que un "Diseño"
suelto no diría **cuál de las 5** edita. Y se llama "Página de venta", no "Diseño
de tienda": con ese nombre heredábamos su forma sin querer y terminábamos con una
vidriera que nadie visita, cuando en nuestro modelo la gente entra desde un
anuncio derecho a UN producto.

**La página no se crea: nace con el producto.** `paginaVenta` en `null` quiere
decir "todavía no la tocaron" y se dibuja con los textos de fábrica. No existe el
estado "producto sin página", ni un paso de "crear la página". Eso contesta la
duda de qué pasa en Pro: **la IA no crea 5 páginas**, crea un embudo y llena su
página; los otros 4 productos nacen después, cada uno con la suya en blanco y con
otra descripción, que es lo que evita que los 5 hablen del mismo nicho.

**La previa es un `iframe` a la página real, y se refresca al guardar.** No es
prolijidad: un recuadro angosto adentro del panel **no reacomoda el diseño**,
porque las medidas de Tailwind miran el ancho de la ventana y no el del recuadro.
Una "previa de celular" hecha así mostraría el diseño de escritorio apretado —
algo que ningún visitante ve nunca. El `iframe` tiene su propia ventana.

> **Corregido el 02/09/26.** Este párrafo decía que la previa muestra lo
> GUARDADO y no lo que se está tipeando. Ya no: sigue el borrador en vivo. Ver
> más abajo *La previa sigue lo que se escribe*.

**Lo que la página se niega a dibujar:** una sección encendida pero sin contenido
(un "Además te llevás gratis" sin ningún bono abajo es peor que no tenerlo), y una
oferta con fecha ya vencida.

**La migración — `20260902120000_add_pagina_venta`, aplicada el 02/09/26.**
Una sola columna `TEXT` que acepta vacío, en `Product`. Se **separó** de la de la
Fase 5 bis, contra lo que decía este documento: mirada de cerca, agregar una
columna nullable es instantáneo y no reescribe filas, así que "tocar la base dos
veces" no cuesta nada — y meter `slug` y `customDomain` antes de decidir cómo
funcionan (¿único global o por cuenta?, ¿qué pasa con los anuncios si cambia?)
sería ponerlos mal con datos adentro.

**✅ Los dos que faltaban de esta pantalla — HECHOS (02/09/26):** que la previa
siga lo que se tipea sin guardar, y el ida y vuelta (tocar un texto en la previa
y que se abra su casilla).

**🔲 Lo que sigue de la Fase 5:**

- ✅ **Bonos** — modelo, pantalla y checkout. Hechos.
- ✅ **Upsell** — hecho, y en dos lugares: antes de pagar (al lado del resumen) y
  después de pagar (en la pantalla de gracias).

### ✅ EL CHECKOUT — HECHO (03/09/26)

De punta a punta: `comprar → Mercado Pago → cobro → permiso → descargar → mail`.

**No hizo falta rehacer el camino del dinero.** `espacioDigital` ya había montado
digitales sobre `Order`, `OrderItem` y `createCheckoutPreference`, justamente
para eso. La comisión se retiene sola dentro del cobro (`marketplace_fee`), que
es lo que sostiene que Free exista sin abono.

**El checkout no se configura, hereda.** Los colores, la letra y la forma salen
de `variablesDePagina`, la misma función que dibuja la página de venta. No hay
editor de checkout y no lo va a haber: cada cosa configurable en la pantalla
donde entra la plata es una forma de romperla. El de la competencia es uno solo
para toda la tienda, así que un producto violeta lleva a un checkout genérico.

**Un solo campo obligatorio**, el mail, porque es a donde va el archivo. Ellos
piden cuatro. El nombre está y es opcional.

**Lo que se encontró escribiéndolo, en orden de gravedad:**

1. **`Infinity > 0` da `true`.** El filtro de importes era `> 0`, así que un
   precio infinito salía como **comisión infinita** rumbo a Mercado Pago. Y
   `price` es un `Float`: una columna de doble precisión de Postgres guarda
   `Infinity` y `NaN` sin quejarse. Lo destapó su propio chequeo (COM-E).
2. **La firma de Mercado Pago estaba escrita en un solo webhook.** Con una copia
   en cada uno alcanzaba con arreglar uno para que el otro se quedara con el
   agujero. Se sacó a `lib/mp-firma`, sin tocarle una línea al cuerpo.
3. **La pantalla de pago heredaba `frame-ancestors 'self'`** de `/p/`, que la
   página de venta necesita para su previa. Ahora tiene su propia regla, DESPUÉS
   de la general porque en Next gana la última. Verificado en vivo.
4. **El mail no puede linkear a la ruta de descarga**: abrirla gasta una de las
   cinco, y los enlaces de un correo los visitan solos Outlook Safe Links y los
   antivirus. Linkea a la pantalla de gracias, que tiene botones.
5. **La fila `Payment` no nacía con la orden**, así que el aviso de pago no tenía
   qué actualizar y la venta quedaba sin comprobante.
6. **En un agregado la orden no tiene principal**, así que buscar el principal
   para armar el mail dejaba esas compras sin entrega.

**Tres carreras, y las tres las gana la base, no el código:** el permiso va con
`upsert` sobre `orderItemId` (dos avisos en paralelo darían dos tokens y diez
descargas donde debía haber cinco — lo advertía el propio modelo); el contador de
descargas lleva la condición adentro del `where` (dos pestañas leen las dos "van
4 de 5"); y una orden pendiente reciente se reusa en vez de crear otra.

**La espera de la pantalla de gracias no es un adorno.** La preferencia va con
`auto_return: "approved"`, así que Mercado Pago devuelve a la persona **antes**
de que llegue el aviso que emite los permisos. La pantalla pregunta cada dos
segundos y los botones aparecen solos; a los dos minutos deja de preguntar y
explica que el mail llega igual.

**Decisiones de esta tanda:** el archivo se baja en pantalla **y** se manda por
mail (cada una tapa el agujero de la otra); sólo Mercado Pago por ahora; y el
upsell post-pago se apoya en el identificador de la compra ya pagada, no en una
bandera del navegador — con el correo saliendo de esa orden y nunca del pedido.

🔲 **El upsell de UN SOLO CLICK** —sin volver a poner la tarjeta— necesita
guardar la tarjeta del comprador (tokenización de MP): credenciales de cada
vendedor manejando datos de tarjeta y consentimiento explícito. Es una función
aparte y bastante más delicada. Lo que hay es la oferta en el momento exacto con
su propio cobro: dos clics y la tarjeta otra vez.
- ✅ **La escasez atada a datos reales** — resuelto el 02/09/26, y en los tres
  casos por el mismo criterio: la herramienta existe, vacía. El **contador**
  termina de verdad y desaparece solo, así que nace apagado —es para una promo
  real, no un adorno que hay que renovar—; el **aviso de ventas** existe pero
  no dibuja nada hasta que haya una venta (chequeo DIB-F); y los **cupos** no
  existen y no se van a hacer. Medido con sus propias capturas, el reloj de la
  competencia se reinicia: 13:44 marcaba 04:32, 16:07 marcaba 02:59 y después
  marcaba 09:02 — subió.
- 🔲 El aviso de que **con transferencia la entrega no es automática**, antes de
  comprar y no después.

### ✅ LA PANTALLA DE VENTAS — HECHA (03/09/26)

Todo el ecosistema cobraba, entregaba y mandaba el mail solo, y quien vendía **no
tenía un solo lugar donde ver que eso hubiera pasado**. La plata entraba a su
cuenta de Mercado Pago y el resto era fe.

`/digitales/ventas`, tercera del menú —después de Productos y antes de
Configuración, porque es la que se abre todos los días—. Contesta tres cosas:

1. **Cuánto te quedó.** No cuánto vendiste: cuánto te quedó **después de la
   comisión**. Es el número que la gente busca y el que nadie muestra.
2. **Quién compró.** El correo, para poder escribirle. Con búsqueda por correo o
   nombre, que es lo que se tiene a mano cuando alguien escribe "no me llegó".
3. **Si lo bajó.** Una compra cobrada que nunca se descargó es un reclamo que
   todavía no llegó —el mail se fue a spam, el enlace venció—. Verlo antes es la
   diferencia entre resolverlo y enterarse por una queja. Hay un aviso arriba
   cuando hay archivos pagos sin bajar.

**⚠️ La comisión sale de la ORDEN, no del plan de hoy.** Alguien que vendió diez
veces en Free al 8% y hoy está en Pro vería esas diez recalculadas al 2%: números
que nunca existieron. Cada orden guarda su `lockedCommissionRate` al cobrarse y
la pantalla lee ese número — `comisionCongelada`, que es la misma cuenta que
`comisionDeLaVenta` pero con el porcentaje congelado en vez del plan actual.

**Pagina en el servidor**, y el filtro, la búsqueda y la página viajan en la
dirección: el link se comparte, el botón atrás funciona y recargar no pierde
nada. Traer todo y filtrar en el navegador anda con veinte ventas y se cae con
dos mil.

**Las fechas se formatean en el servidor con la zona de Argentina escrita.** En
el navegador, el mismo texto sale distinto en el servidor (que corre en UTC) y en
la máquina de quien mira: React avisa de la hidratación y una venta de las 22:30
aparece con la fecha del día siguiente.

### ✅ El editor en pantalla chica — HECHO (03/09/26)

La única pantalla del panel donde hay que mostrar **dos cosas a la vez** —el
formulario y la previa— y a 360 px entra una. Las solapas *Editar / Vista previa*
ya estaban; lo que faltaba era poder usarlas.

**Dos problemas, y los dos eran el mismo: todo vivía arriba.**

1. **Las solapas estaban quietas en el encabezado.** Este formulario mide varias
   pantallas, así que mirar cómo quedó una sección de abajo era scrollear hasta
   el techo, tocar, y scrollear de vuelta. Nadie hace eso dos veces.
2. **El botón de guardar también**, y eso es peor: para guardar había que subir.
   Con el aviso de "tenés cambios sin guardar" esperando en la puerta, esa
   combinación es una trampa — se sale, salta el cartel, y no se sabe por qué.

Ahora los tres viajan juntos en una barra pegada arriba, sólo abajo de `lg`. El
guardar del encabezado desaparece ahí: dos botones que hacen lo mismo se leen
como que uno hace otra cosa.

**`top-14` y no `top-0`**, que es el detalle que casi se come todo: el contenedor
que scrollea arranca en el borde de la pantalla y los primeros 56 px se los tapa
la barra fija del celular. Pegada en 0, la barra quedaba escondida atrás.

**Y cambiar de solapa ya no pierde dónde estabas.** Las dos columnas se esconden
con `display: none`, así que al pasar a la previa el formulario desaparece de
golpe y el navegador recorta el scroll a lo que quedó: se caía a la previa por el
medio, y al volver a Editar el formulario arrancaba en cualquier lado menos donde
se estaba escribiendo. Se guarda la posición del formulario antes de irse y se la
devuelve al volver; la previa siempre arranca de arriba, que es como se mira una
página.

Va en un efecto y no en el `onClick` porque hay que esperar a que React redibuje:
apenas se toca la solapa, el alto del contenedor todavía es el viejo y cualquier
`scrollTop` que se escriba lo recorta el navegador. Y se cuelga de un **ancla**
—un `div` vacío— y no de la barra: `scrollIntoView` sobre algo `sticky` usa la
posición donde está pegado, o sea que no scrollea nada.

🔲 Lo que sigue sin resolverse, y no tiene solución: **en el celular no se pueden
ver las dos al mismo tiempo.** Es el ancho, no el código. Esto hace que
alternar cueste un toque en vez de dos scrolls.

### ✅ Reenviar el mail de entrega — HECHO (03/09/26)

El agujero que tapa, dicho como pasa de verdad:

> Alguien paga. El mail se va a spam. Cierra la pantalla de gracias.
> Te escribe: *"no me llegó nada"*.
> **Y no podés hacer absolutamente nada.**

No tiene cuenta, así que no puede recuperar el enlace solo; y en Ventas la venta
se veía pero no se podía tocar. Terminaba en devolución, o en una captura de
pantalla. Es la razón por la que esto se hizo antes que arreglar el editor en
pantallas chicas: aquello lo sufre quien vende, que tiene una computadora al
lado; esto lo sufre quien ya pagó.

**Renueva el vencimiento y NO el contador**, y esa distinción es todo el diseño:
son dos límites con dueños distintos. El vencimiento protege contra un enlace
vivo para siempre, no contra la persona — si venció y quien vende decide
ayudarla, renovarlo es exactamente lo que hay que hacer. El contador protege
contra que el enlace se reparta a diez amigos, y eso no cambia porque el mail se
reenvíe. Si ya se usaron las cinco **no se manda nada**: un mail con un botón que
devuelve error es peor que no mandarlo, y además casi siempre significa que la
persona sí tiene el archivo.

Y sólo renueva los que **estaban** vencidos, con la condición adentro del
`where`: reenviar no le puede regalar treinta días a un enlace que estaba por la
mitad.

Los frenos: la venta tiene que ser suya —una ajena contesta lo mismo que una que
no existe—, tres reenvíos por venta por día, veinte por cuenta por hora, y el
freno del doble click, que acá cuesta dos mails al mismo comprador y dos de sus
tres reenvíos del día.

**Espera al mail antes de contestar**, al revés que el aviso de pago: allá la
respuesta va para Mercado Pago y el mail sale con `despues`; acá va para una
persona que apretó un botón. Decirle "listo" sin haber esperado es mentirle justo
cuando está tratando de resolverle un problema a un cliente.

De paso, cómo se arma el mail se mudó a `armadoDelMail` en `entrega-digital`:
ahora lo arman dos lugares y el reenviado se prueba mucho menos, así que escrito
en los dos se separaban solos.

🔲 **No queda anotado en la base cuántas veces se reenvió** — hoy eso lo lleva el
limitador, que se olvida cuando pasa la ventana. Para mostrar "reenviado hace 5
minutos" hace falta una columna. Va con el detalle de la venta.

### ✅ Los avisos al vendedor — HECHOS (03/09/26)

Hasta acá **no había un solo `createNotification` en ninguna ruta de digitales**:
una venta y una devolución pasaban las dos en silencio. Ahora los dos escriben en
la campanita del panel:

- **"¡Vendiste!"** — con lo que le QUEDA después de la comisión, no el bruto. El
  bruto ya lo ve en Mercado Pago; el número que nadie le muestra es el otro.
- **"Devolución"** / **"Contracargo"** — que la plata salió y que se cortó el
  acceso, porque son dos cosas graves que pasaron sin que las pidiera.

Van a la campanita y no como push: una cuenta digital hoy no tiene pedido el
permiso de notificaciones (`disableNotifPrompt` en el layout, a propósito). El
día que se saque esa bandera, la venta es el primer aviso que justifica
interrumpir a alguien.

### ✅ El inicio del panel dejó de mentir — HECHO (03/09/26)

Decía *"estamos terminando las pantallas para cargar tu primer producto
digital"*. Era cierto el día que se escribió y dejó de serlo cuando aparecieron
Productos, la página de venta, el checkout y Ventas — pero el texto se quedó. La
primera pantalla del panel le decía a alguien que acababa de pagar que todavía no
podía hacer nada, con todo andando al lado.

Es el segundo error de la misma forma en la misma pantalla (el primero fue "te
avisamos por email", sin ningún código que mandara ese mail). Por eso ahora no
describe el estado de la obra: sólo lleva a lo que hay.

### ✅ La previa sigue lo que se escribe, y se toca — HECHO (02/09/26)

Los dos que quedaban de la pantalla anterior.

- **Sigue lo que se tipea.** El editor le manda el borrador al `iframe` por
  `postMessage`, con 150 ms de respiro —sin eso se manda un aviso por tecla y en
  un párrafo largo son cientos de dibujos de la página entera—. La previa **no se
  recarga**: si se recargara perdería el scroll en cada letra.
- **Lo que llega se comprueba las dos veces.** El aviso tiene que venir de nuestro
  propio origen, y el borrador pasa por `normalizarContenido` igual que si viniera
  del servidor. Un `message` lo puede mandar cualquier ventana: sin esto, una
  página ajena que nos meta en un iframe suyo le cambia el precio y el botón a la
  página de venta de otro. La CSP ya es una cerradura; ésta es la segunda.
- **Se toca el bloque y se abre su casilla.** Se toca **el texto**, no un cartelito
  de 20 píxeles arriba a la derecha: apuntarle a la chapita es puntería, tocar el
  párrafo que querés cambiar sale solo. Si el clic cae sobre algo que ya hace otra
  cosa —el botón de comprar, un enlace del pie, una pregunta que se abre— gana
  eso, o la página se comería sus propios controles adentro de la previa.

### ✅ El diseño: estilo, paleta, fondo por bloque y letra — HECHO (02/09/26)

**La plataforma pone el diseño, la IA pone el texto.** Quedó cerrado el 02/09/26
mirando la página de la competencia: lo que se ve ahí no lo diseñó su IA, viene de
fábrica y la persona lo cambia. Es lo mismo que vamos a hacer.

- **5 estilos** — Clásico, Marcado, Suave, Editorial, Nocturno. Lo que los separa,
  en orden de cuánto se nota: **el aire** (Suave respira el doble que Clásico), el
  borde, la sombra y el título. Hay un chequeo que falla si dos comparten la cara
  (PAL-H) y otro si dos respiran igual (PAL-I): el primer intento tenía Clásico y
  Suave con la misma cara y no se distinguían.
- **6 paletas**, no un selector de colores. Con colores libres alguien elige
  amarillo sobre blanco y el botón de comprar desaparece — y no lo ve, porque en
  su pantalla se distingue. Un chequeo calcula el contraste de cada una.
- **3 fondos por bloque** — Fondo / Suave / Fuerte, elegidos sección por sección.
  También lista cerrada: con tres tonos medidos de antemano se puede **probar** que
  todo texto se lee sobre todo fondo; con un color elegido en el momento no hay
  nada que probar.
- **3 letras** — Moderna (la de la plataforma, ya cargada: elegirla no baja ni un
  archivo), Clásica (Lora) y Marcada (Outfit). Van sin preload: el `@font-face`
  queda declarado y el navegador se baja **sólo la que aparece en pantalla**. Con
  el preload de fábrica se bajaría siempre las dos, en la pantalla donde cada
  milésima decide si compran.

`5 × 6 × 3 = 90 caras`, y encima cada una con el fondo de sus quince bloques
elegido aparte. La pregunta que lo originó era "¿qué hacemos cuando haya 50
vendedores?".

**Dos colores se oscurecieron, y en ese orden, porque el segundo dependía del
primero.** Los fondos con color no entraban sin esto:

| | antes | ahora | por qué |
| --- | --- | --- | --- |
| gris tenue | `#64748b` | `#475569` | daba **4,33** sobre el tono suave, contra un mínimo de 4,5 |
| verde del ahorro | `#047857` | `#065f46` | daba **3,55** sobre el tono fuerte |

Y salió a la luz un agujero del chequeo viejo: comparaba el gris contra el fondo
blanco pero **nunca contra el tono suave**. Por eso nadie se había enterado.

**✅ DECIDIDO (03/09/26): Editorial se queda con los títulos, y lo dice.** Ese
estilo fuerza serifas, así que ahí la Letra sólo cambia el cuerpo — un control
que no hace lo que dice es un error aunque el diseño esté bien.

Se evaluó separarlos —estilo = forma, letra = letra, y que Editorial se distinga
por sus filetes— y **se descartó**: la serifa ES lo que lo separa de los otros
cuatro. Sacándosela quedan cinco estilos más parecidos entre sí, que es lo
contrario de lo que hace falta el día que haya cincuenta vendedores eligiendo
entre los mismos.

Así que el acoplamiento se queda y se avisa, con un renglón abajo del selector.
**El texto es un dato del estilo (`avisoDeLetra`), no un `if` que diga
"editorial" en la pantalla**: el día que otro estilo imponga su letra, pone su
aviso y aparece solo. Hay chequeo (LET-J) que falla si un estilo con serifas se
olvida de avisar.

### ✅ La oferta se ve, sin inventar nada — HECHO (02/09/26)

La ficha de precio parecía muerta al lado de la de ellos, y la diferencia no era
el color: el descuento estaba susurrado.

- **Sello de oferta**, sacado de la **resta** entre los dos precios. Sin precio
  tachado no hay sello.
- **El precio viejo al lado del nuevo**, no abajo: pegados, el ojo hace la resta
  solo.
- **"Ahorrás $X"** en renglón propio, grande y verde. Era el dato que más empuja y
  estaba en letra chica gris.
- **Tres sellos** en vez de dos. El de garantía aparece **sólo si esa sección se va
  a ver** y con los días que ella dice: un sello de garantía en una página sin
  garantía es una promesa que nadie escribió y que después hay que cumplir igual.

**Lo que no se copia, y por qué nosotros no podemos.** El de ellos es un campo de
texto libre: se puede escribir "80% OFF" arriba de un precio que nunca bajó. Acá
**no hay dónde escribirlo** — ninguna sección tiene campo de descuento ni de
precio, y hay un chequeo (OFE-C) que falla si alguien agrega uno.

### ✅ Lo que no se puede inventar — HECHO (02/09/26)

**Visto de primera mano en su editor el 02/09/26.** Su IA llena la prueba social
sola con tres personas inventadas —nombre, texto y un `Rating (1-5)` tipeado a
mano— y la dibuja como una **captura de WhatsApp**, con hora, señal, "en línea" y
doble tilde de leído. Arriba del bloque el título dice **"TESTIMONIOS REALES"**.

Un testimonio dice "esto me dijeron". Una captura dice "acá está la conversación,
mirala". La segunda se cree mucho más, y es falsa. Y **el que responde por lo que
dice la página no es la plataforma: es quien vende**.

- **Las opiniones nacen apagadas** y avisan antes de la primera letra: *"Sólo
  opiniones que te hayan dicho de verdad. Una inventada es publicidad engañosa, y
  el que responde sos vos."*
- **No hay campo de rating ni de cantidad de ventas.** Un promedio de estrellas es
  un dato estadístico: sin ventas no hay estadística. De ahí sale su ⭐4,9 con cero
  ventas.
- **Se dibujan como cita firmada** (`<blockquote>` + `<figcaption>`), no como
  prueba de que algo pasó.
- **La garantía también avisa**: *"Lo que prometas acá lo vas a tener que cumplir
  con tu plata. Por ley ya tenés 10 días de arrepentimiento, escribas esto o no."*

**Dos avisos en quince secciones, y hay un chequeo que deja poner hasta tres.** Si
los llevaran todas, no se leería ninguno.

**Sobre el riesgo legal de parecernos — mirado el 02/09/26.** Las ideas, las
funcionalidades y la estructura de una página de venta no se protegen: "portada →
beneficios → precio → preguntas" es el guion estándar desde antes de internet. Sí
se protegen el código fuente (nunca lo vimos), la marca (no usamos nada suyo) y
los textos literales (los nuestros son propios). Y la vuelta importa: **las cosas
que no copiamos son justo las que tienen riesgo** — el precio tachado que nunca se
cobró (Lealtad Comercial, Decreto 274/2019), las opiniones inventadas, y la
imitación de la interfaz de WhatsApp, que es marca de Meta.

### ✅ Cuatro errores encontrados y arreglados (02/09/26)

Los cuatro estaban rotos **antes** de esta tanda; salieron de mirar la página en
serio, no de una prueba que falló.

1. **La previa salía en blanco.** La bloqueaba nuestra propia CSP: la política base
   del sitio es `frame-ancestors 'none'`. Se aflojó **sólo** para `/p/` y **sólo** a
   `'self'` — nunca a `*`: en esa pantalla se aprieta el botón de pagar, y un
   iframe ajeno encima es exactamente cómo se roba ese clic.
2. **Una palabra sin espacios rompía la página.** Visto roto **en la de ellos**, y
   lo teníamos igual: la palabra no puede cortarse en ningún lado y empuja el ancho
   de toda la página. Se tapa en un solo lugar porque `overflow-wrap` se hereda.
3. **El estilo Nocturno tenía texto invisible.** Los pasos de "Cómo funciona", cada
   pregunta frecuente, el "+" que las abre y el precio de la barra fija tenían
   `text-slate-900` escrito a mano; sobre la tarjeta oscura de Nocturno quedaban
   **negro sobre negro**.
4. **El recuadro de bonos era amarillo siempre.** `amber` fijo: elegías Violeta y
   seguía amarillo.

Ahora un chequeo (TON-H) falla si vuelve a aparecer un color de texto o de fondo
escrito a mano en el dibujante.

### 🔲 La pasada bloque por bloque — EMPEZADA (02/09/26)

Con la página llena de contenido de prueba se ve qué le falta a cada bloque, que
vacío no se notaba. Se va en el orden de la página.

- ✅ **Beneficios** y ✅ **Esto te suena** — ícono propio por ítem. Antes los cuatro
  beneficios eran cuatro renglones con el mismo tilde verde. El campo es libre pero
  lo que llega se limpia: queda **un** símbolo, no se parte por la mitad —una
  bandera son dos caracteres y uno con tono de piel son cuatro— y las letras y
  números se descartan, así que escribir "hola" no deja una "h" adentro del
  círculo. Y una fila de sugerencias de un clic, que no es adorno: el teclado de
  emojis de Windows es Win+punto y mucha gente no lo sabe.
- 🔲 Portada · Qué te llevás · Bonos · Opiniones · Preguntas · Oferta con fecha ·
  Cierre · Barra · Pie
- 🔲 **Cómo funciona** — los círculos numerados en fila.
- 🔲 **Precio** — el resumen como lista de lo que incluye, con la cuenta del valor
  total.
- 🔲 **Garantía** — el sello.
- 🔲 **Qué pasa si se borra el título de una sección.** En el editor de ellos dice
  "si los dejás vacíos se usa el texto por defecto". Hay que ver si la nuestra
  dibuja un hueco.

### Lo que la entrega tiene que resolver del archivo (visto el 02/09/26)

Los dos salieron de repasar la subida, y los dos **van con la entrega y no antes**
—las dos respuestas dependen de un plazo y de un modelo que todavía no existen—.

- ✅ **Barrer el PDF de un producto borrado, 30 días después — HECHO (03/09/26).**
  Se adelantó a la entrega por una pregunta: *"¿y si quiero cambiar de embudo?"*.

  Borrar un producto es un borrado BLANDO y sus bonos y upsells se van con él,
  pero **el PDF se queda, y tiene que quedarse**: quien ya compró tiene un permiso
  de descarga que le dura 30 días, y borrar el archivo le rompe una compra que ya
  pagó. El problema era que después **nadie lo limpiaba** — verificado, el cron
  diario no tocaba el storage.

  **Y era peor de lo anotado.** Lo escrito hablaba de *el* PDF, en singular; el
  borrado se lleva de arrastre a los bonos y upsells, **que tienen PDF propio**.
  Cambiar de embudo dejaba cuatro o cinco archivos muertos, no uno. A 50 MB de
  tope cada uno, contra **1 GB** de depósito del plan gratis, unas pocas pasadas
  lo llenan. No es un agujero de seguridad —el bucket es privado y el enlace
  firmado sale sólo de una compra— es plata.

  Va colgado de `limpiar()`, que ya corre una vez por día, y filtra por dos cosas:

  1. Borrado hace más de `DIAS_CUARENTENA_ARCHIVO` (30).
  2. **Sin ningún permiso de descarga vivo.**

  **La segunda parece sobrar, y casi sobra.** Un producto borrado no se puede
  comprar, así que la última venta es anterior al borrado y su permiso vence, como
  mucho, 30 días después: la cuarentena sola ya alcanza. Salvo en un caso — un
  pago que se acredita DESPUÉS del borrado (Mercado Pago avisa cuando avisa) emite
  el permiso tarde, y ése vence después del barrido. Cuesta una condición más en
  la consulta y evita el único caso en que alguien paga y se queda sin nada.
  `DigitalDownload` está vacía hoy, así que no filtra nada; está escrita para que
  el día que exista el checkout esto ya lo respete, en vez de tener que acordarse.

  Tres decisiones que no se ven pero sostienen todo:

  - **Se suelta `archivoPath` DESPUÉS de borrar, nunca antes.** Al revés, un
    borrado que falla deja el archivo en el depósito sin nadie que lo nombre:
    exactamente lo que esto vino a arreglar, pero ahora sin forma de encontrarlo.
  - **Un objeto que ya no está cuenta como hecho, no como falla.** Si contara como
    error nunca se soltaría la referencia y el cron le pegaría a Supabase por ese
    archivo todas las noches, para siempre.
  - **Tope de 50 por noche.** El cron diario entero tiene 60 segundos —el techo de
    Vercel— y esto va último. Lo que queda afuera se barre mañana.

  De paso, el borrado del depósito quedó en un solo lugar (`lib/deposito-digital`)
  y lo usan los dos que borran: el reemplazo y el barrido. Escrito dos veces, el
  día que Supabase cambie qué contesta se entera uno y el otro no. Va aparte de
  `subida-digital` a propósito: ese archivo lo importa una pantalla, y la llave de
  servicio no puede rozar algo que se manda al navegador (chequeo BAR-H).

  Probado en la base real en modo lectura: la consulta corre, 0 para barrer hoy, y
  1 producto borrado con archivo — el bono de prueba, cuyo objeto ya se sacó a
  mano. En 30 días va a contestar `noEstaba` y soltar la referencia sola.

- 🔲 **Reemplazar el PDF de un producto YA VENDIDO le cambia el archivo a quien lo
  compró antes.** El token no guarda la ubicación: pide un link firmado del
  archivo que el producto tiene AHORA. Para corregir una errata o publicar una
  versión 2 está perfecto; para vender una cosa y entregar otra, no tanto. Hay
  que decidir si se avisa, si se congela lo vendido, o si se acepta como está.

### 🔲 Las devoluciones y el arrepentimiento (mirado el 02/09/26)

La pregunta que lo destapó, y es la correcta: *"¿no es medio tramposo? Compran,
descargan, y a los 10 días ponen arrepentimiento: nosotros devolvemos la plata y
ellos se quedan con el producto."*

**Sí, es asimétrico, y no hay forma limpia de esquivarlo.**

#### Lo que hay que entender primero

El derecho de arrepentimiento **no lo crea la sección de Garantía de la página**.
Sale del art. 34 de la Ley 24.240 y corre desde la compra, haya o no un cartel.
Apagar la sección no lo apaga: sólo hace que quien compra no se entere, y que la
página muestre una promesa más corta que la que ya rige.

Por eso el piso del campo pasó de 1 a 10 días. **No se agregó una obligación: se
sacó una mentira.**

#### ⚠️ CORRECCIÓN (03/09/26): la excepción SÍ existe en Argentina

Acá decía: *"En la Unión Europea la norma contempla justamente eso (Directiva
2011/83, art. 16 m). **En Argentina esa excepción no existe**, así que quien vende
queda expuesto."*

**Era falso, y era el párrafo que más pesaba de toda esta sección.**

El **art. 1116 inc. b del Código Civil y Comercial** dice, textual, que el derecho
de revocar no se aplica a los contratos de

> *"...suministro de grabaciones sonoras o de video, de discos y de programas
> informáticos que han sido decodificados por el consumidor, así como de ficheros
> informáticos, suministrados por vía electrónica, susceptibles de ser descargados
> o reproducidos con carácter inmediato para su uso permanente"*

O sea: **exactamente un ebook que se baja.** Es el equivalente argentino de la
directiva europea, y estaba desde 2015.

Tres cosas que sí siguen siendo ciertas, y que son la letra chica de la buena
noticia:

1. **El artículo arranca con "excepto pacto en contrario".** Si los términos o la
   página prometen devolución, la promesa gana y la excepción se cae. Por eso la
   sección de Garantía de la página **le gana al art. 1116**, y por eso el texto
   que se acepta en el pago la nombra en vez de contradecirla.
2. **La excepción se activa con la DESCARGA, no con la compra.** Si todavía no lo
   bajó, el arrepentimiento corre completo y se devuelve sin discutir. La
   pantalla de Ventas muestra "sin bajar" justo para poder ver esa línea.
3. **Hay debate doctrinario** sobre si el art. 1116 del Código limita al art. 34
   de la Ley 24.240, que es más específica y más protectoria. Y los jueces de
   consumo fallan para el lado del consumidor ante la duda. Por eso las PRUEBAS
   importan más que el texto.

#### ⚠️ Y la ley no es la exposición real: Mercado Pago sí

Tener razón no frena un contracargo. Si la persona reclama a Mercado Pago o a la
tarjeta, deciden ellos, mirando pruebas, y por defecto le creen a quien reclama.
Todo lo de acá abajo existe para tener qué mostrar en ese momento.

#### Por qué igual conviene mostrarla

- **Es raro.** Los pedidos de devolución en infoproductos son un porcentaje bajo.
  Pasa, pero no es lo normal.
- **Mostrar la garantía suele dar más ventas de las que cuesta en devoluciones.**
  Es el resultado más repetido en venta directa. Y esconderla no baja las
  devoluciones —el derecho existe igual— sólo baja las ventas.

O sea que quien la esconde paga los dos costos.

#### Lo que sí se puede hacer, y va con la entrega

Ninguna anula el derecho. Cambian el incentivo del que abusa.

- ✅ **La casilla del art. 1116, antes de pagar** — HECHO (03/09/26). Es la que
  más cubre por lo que cuesta. Convierte "él dice / yo digo" en un consentimiento
  con fecha, hora, IP y **el texto exacto que esa persona leyó**, guardado en la
  orden (`digitalConsentAt/Ip/Texto`). Se guarda el texto entero y no un `true`
  ni un número de versión: si mañana se cambia la redacción, una venta vieja
  tiene que seguir mostrando la que su comprador leyó. Un booleano no prueba
  nada. Y el texto lo elige el SERVIDOR — si viajara desde el navegador sería un
  campo que cualquiera reescribe. Ver `lib/consentimiento-digital`.
- ✅ **Registro de la descarga** — HECHO (03/09/26): cuándo, desde qué IP y con
  qué navegador, una fila por descarga (`DigitalDownloadLog`). Se anota DESPUÉS
  de firmar el enlace —anotarlo antes dejaría escrito "se lo bajó" en una
  descarga que terminó en error— y nunca frena la entrega: un registro que falla
  no puede negar un archivo ya pagado. Se guarda la PRIMERA, que es la entrega,
  no sólo la última.
- ✅ **El enlace de descarga vence** — el permiso dura 30 días. Ya está.
- ✅ **Cortar el acceso ante devolución o contracargo** — HECHO (03/09/26, commit
  `98cb8101`). Con un PDF ya bajado no recupera nada, pero corta las descargas
  que faltan. `in_mediation` queda afuera a propósito: una mediación no está
  resuelta, y cortarle el archivo a alguien mientras reclama es castigarlo por
  reclamar.
- ❌ **Marcar el PDF con el mail de quien compró** — DESCARTADO (03/09/26).
  Estaba anotada como "la que más rinde" y no lo es. **Se saca con cualquier app
  gratis**: hay decenas que quitan marcas de agua de un PDF en dos minutos. O sea
  que es trabajo, procesamiento y depósito duplicado a cambio de una molestia
  menor para el único que la querría sacar.

  Y además chocaba con dos límites que ya nos aprietan: el archivo hoy baja
  **derecho de Supabase al navegador**, así que marcarlo obligaría a pasarlo por
  nosotros —contra el techo de 4,5 MB de la plataforma— y a **guardar una copia
  por comprador**, multiplicando el egress de Supabase, que es justo por donde ya
  nos pasamos una vez. Costaba caro y no servía.

  Lo que sí protege contra la reventa es el registro de descargas más el tope de
  5: se ve quién lo hace de sistema.

#### ✅ DECIDIDO (02/09/26): la comisión se devuelve entera

Si alguien se arrepiente, **la plataforma devuelve su comisión completa**. La
competencia no lo aclara en ningún lado; nosotros lo escribimos antes de cobrar el
primer peso.

El motivo: si la venta se deshizo no hay servicio prestado, y quedarse con la
comisión de una venta anulada es lo primero que alguien captura de pantalla y
publica. El costo de esa foto es mucho más alto que lo que se junta reteniendo.

🔲 **Falta escribirlo donde se lee**: en la pantalla de suscripción y en el
detalle de la venta cuando la devolución exista de verdad. En los **términos** ya
está (03/09/26): punto **6 ter** del apartado Cliente, más la excepción nombrada
en el punto 7 de derechos del consumidor. Los plazos de ahí salen de
`DIAS_DEL_PERMISO` y `MAX_DESCARGAS`, no escritos a mano: lo que vale para un
reclamo es lo que dicen los términos, así que no pueden prometer un número
distinto del que el sistema aplica.

⚠️ **Falta que lo lea un abogado de consumo.** El texto está escrito para
defenderse solo, pero nadie del proyecto es abogado. Es media hora y es la parte
más barata de todo esto.

🔲 **Falta el apartado del VENDEDOR digital en los términos.** Hoy están los tres
de siempre —Dueño de tienda, Vendedor/Afiliado, Cliente— y una cuenta DIGITAL no
es ninguno de esos. El punto 6 ter cubre al comprador, que es el lado del que
sale un reclamo por devolución; falta el lado de quien vende (comisión, qué pasa
con una devolución, qué puede subir).

## FASE 5 bis — La dirección propia por producto

La opción C de 2.3. **Estaba escrita como "una columna de slug" y es bastante más
que eso** — ampliada el 01/09/26.

### Por qué no es opcional

El caso que lo destapa: alguien vende un ebook de **mecánica** y después quiere
vender uno de **tortas**. Hoy los dos cuelgan de la misma dirección y de la misma
marca, así que el anuncio de tortas cae en una página que arriba dice "Detodo" y
vive en un dominio de mecánica. **La publicidad se hace por producto, y el que
compra no se casa con el negocio: se casa con el ebook.**

> **Sin esta fase, los 5 productos de Pro sólo sirven si los 5 son del mismo
> nicho.** Eso no es un detalle técnico: es lo que Pro vende. Alguien que paga
> $60.000 por 5 productos y descubre que los 5 tienen que ser de mecánica entendió
> otra cosa de la que le vendimos.

### Cómo es hoy

```
Cuenta "Detodo"
   └─ una sola dirección: detodo.tiendaapps.com
        ├─ /producto/1  → ebook de mecánica
        ├─ /producto/2  → ebook de tortas
        └─ /producto/3  → ebook de guitarra
```

### Cómo queda

```
Cuenta "Detodo"  ←  nadie la ve nunca. Es donde se administra.
   ├─ Producto 1  →  mecanicafacil.com        (dominio propio)
   ├─ Producto 2  →  tortascaseras.com        (dominio propio)
   └─ Producto 3  →  guitarra.tiendaapps.com  (subdominio, si no compra dominio)
```

Cada producto pasa a ser **su propio sitio**: su dirección, su nombre y su cara.
La cuenta se vuelve invisible para el que compra. El que llega desde un anuncio de
tortas ve tortas y nada más.

- **Ellos:** 5 oficinas, cada una con un local.
- **Nosotros:** 1 oficina con 5 locales, cada uno con su vidriera y su dirección.

Desde la vereda se ve igual. Desde adentro, el nuestro es mucho más simple.

### Qué recibe cada plan — CERRADO (01/09/26)

| | Dirección del producto | Dominio propio |
|---|---|---|
| **Free** | `mecanica.tiendaapps.com` | ❌ |
| **Starter** | `mecanica.tiendaapps.com` | ❌ |
| **Pro** | `mecanica.tiendaapps.com` | ✅ `mecanicafacil.com` |

**El subdominio va en los tres planes. Lo que Pro compra es la calle, no la
casa.** Dos motivos, y el segundo es el que manda:

1. **Si el subdominio fuera sólo de Pro, Starter se queda con el mismo problema
   que esta fase viene a arreglar**: dos productos, dos nichos, una sola
   dirección. Y no nos cuesta nada — una columna y una regla en un middleware que
   ya existe. Cobrarlo no suma un peso y le rompe la promesa a Starter.
2. ⚠️ **Si el slug del producto apareciera recién al mejorar el plan, la dirección
   CAMBIA.** Alguien en Free pauta dos meses contra `detodo.tiendaapps.com`, junta
   historial de píxel y la gente comparte el link; pasa a Starter y el producto se
   muda. Se pierden los anuncios corriendo, el historial de conversiones y todos
   los links compartidos. **Cambiarle la URL a algo que ya se está publicitando es
   de lo peor que se le puede hacer a alguien.** Con el slug desde el día uno, la
   dirección no cambia nunca: mejorar el plan le SUMA un dominio encima y el de
   abajo sigue funcionando.

Y el argumento de venta de Pro queda más limpio que "te damos dominio": es *"tu
anuncio va a tu dominio, y ese dominio lo podés verificar en Meta"*.

La competencia lo tiene igual — su panel dice *"Función disponible en plan Pro o
superior"* para conectar el dominio.

### Qué hay que tocar

- 🔲 **Slug propio en `Product`**, único y **en los tres planes** — le da el
  subdominio, y tiene que existir desde que el producto se crea.
- 🔲 **Dominio propio en `Product`.** Hoy `customDomain` está en `Store` y es
  `@unique`: **uno por cuenta**. Para tener dos dominios en la misma cuenta, el
  dominio tiene que colgar del producto.
- 🔲 **Identidad propia del producto** — nombre y aspecto de esa página, sin
  heredar la marca de la tienda.
- 🔲 **La regla en el middleware**, que ya sabe traducir *dominio → tienda*: falta
  el caso *dominio → producto*.
- 🔲 **Qué pasa si el slug del producto choca con el de una tienda.** Con el
  subdominio en los tres planes esto deja de ser un caso raro y pasa a ser el
  caso normal: hay muchos más productos que tiendas, y comparten el mismo espacio
  de nombres.

⚠️ **"Poder cambiar el nombre y el dominio" NO lo resuelve** — y fue la primera
idea. Si se cambian, se rompe el producto anterior. No es *cambiable*: es **uno
por producto**.

### Por qué el subdominio solo no alcanza

**No se puede verificar en Meta un dominio que no es tuyo.** Si el ebook vive en
`tortas.tiendaapps.com`, ese dominio es NUESTRO: la persona no lo puede verificar
en su Business Manager, y sin dominio verificado la atribución de sus anuncios se
degrada — sobre todo en iPhone. Para el que paga publicidad, que es todo el
público de este ecosistema, **el dominio propio no es vanidad: es medición**.
(Esto ata la "verificación de dominio" que quedó anotada en Meta / Tracking.)

### Por qué es la opción barata — medido el 01/09/26

La alternativa era la opción B, romper la cuenta en 5 tiendas. **Medido en el
repo: 116 archivos y 245 lugares dan por sentado que una cuenta tiene UNA
tienda.** No es tocar el esquema: es que en 245 lugares donde dice "la tienda de
esta persona" habría que preguntar "¿cuál de las cinco?", y cada uno es una chance
de equivocarse. Más el selector de tienda, el panel general y el ranking, que del
otro lado existen sólo porque tienen multi-tienda.

**Con la opción C no se toca ninguno de esos 116 archivos.** Quedan intactos
`ownerId @unique`, el panel, la conexión de Mercado Pago, la suscripción, los
roles, el registro y los layouts. Lo único que gana el producto es una dirección y
una cara.

Y el middleware sale más barato de lo que parece: **ya resuelve dominio propio →
tienda y ya está depurado.** Hay un comentario ahí contando que durante un tiempo
ningún dominio propio resolvió jamás, porque la consulta iba contra PostgREST y
fallaba en silencio. Ese error ya está pagado.

**Para mantenerlo no cuesta nada:** el dominio lo compra y lo paga el comerciante;
no hay servidor nuevo, ni base nueva, ni deploy nuevo. Son N direcciones que entran
por la misma puerta a la misma aplicación.

### El orden está forzado

```
archivo del producto  →  la página de venta (Fase 5)  →  su dirección (5 bis)
```

No se le puede dar dirección a una página que todavía no existe. Lo único que
conviene adelantar es **la migración**: agregarle a `Product` el slug y el dominio
en la MISMA migración que la página de venta, para no tocar la base dos veces.

### 🔲 Lo único que hay que chequear antes de prometerlo

Pasamos de **1 dominio por cuenta** a **hasta 5**. Multiplicar por cinco los
dominios apuntados a un mismo proyecto de Vercel es lo único que puede tener un
límite de plataforma. No cuesta plata nuestra, pero hay que mirarlo **antes** de
escribirlo en la página de precios.

## FASE 6 — Legales
