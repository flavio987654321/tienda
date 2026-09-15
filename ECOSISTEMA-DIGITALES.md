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
| **Escribe el ebook** | 40 páginas | **US$0,22** ⚠️ medido 07/09/26 | **Cupo contado.** Es el único número que va en la tabla de precios |
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
> `planLimits.ts` es `ebooksIA` (0/4/6 desde el 08/09/26; eran 0/2/5), que es el
> número que dibuja la tarjeta.


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

### ✅ HECHO (05/09/26) — y NO se copió el modelo de tiendas

⚠️ La frase de arriba —"todo esto ya existe"— era una trampa. Sí existe, pero
**del lado de tiendas, y ahí un carrito abandonado es otra cosa**.

Allá `AbandonedCart` se llena mientras la persona mete cosas en el carrito, antes
de ir a pagar. **Acá no hay carrito**: se aprieta comprar, se escribe el correo y
se sale derecho a Mercado Pago. En ese momento ya existe una `Order` en PENDING
con el correo, el producto y el monto.

O sea que el dato que del otro lado hay que ir a juntar, **acá ya está** — y es
mejor dato: no es alguien que miró, es alguien que llegó hasta la pantalla de
pago. Copiar el modelo habría significado guardar dos veces lo mismo y tener dos
verdades que se pueden contradecir.

**Acá un carrito abandonado ES una orden que nunca se pagó.**

#### ⚠️ Lo que casi rompe esto: el pago en efectivo

Mercado Pago deja pagar en un kiosco, con un cupón que dura días. Esa compra
queda pendiente y **se va a pagar**. Contarla como abandonada es escribirle *"te
olvidaste de pagar"* a alguien que tiene el cupón en la mano — y el mail sale con
el nombre de quien vende en el asunto.

Y en nuestra base **eran indistinguibles**: el webhook tiraba a la basura todo lo
que no fuera `approved`, así que "no quiso pagar" y "va a pagar mañana" quedaban
las dos como una orden PENDING a secas. Ahora el webhook anota ese estado en la
fila de pago —sin tocar la orden, que sigue PENDING— y los que están en camino se
cuentan aparte y **nunca reciben el mail**.

#### Qué recibe cada plan

- ✅ **Ver la lista** — los tres planes, en `/digitales/carritos`. Con el correo
  para copiar y un enlace que abre el programa de correo **de quien vende**, con
  su propia dirección como remitente. Nosotros no mandamos nada ahí.
- ✅ **El recordatorio automático** — sólo Pro, con el plan al día. Sale del cron
  diario, **una sola vez por compra**, con el enlace a la dirección propia del
  producto. No promete descuentos ni pone relojes: "última oportunidad" a alguien
  que abandonó hace un rato es mentira escrita con el nombre de quien vende.

Y la marca de "ya se le escribió" se pone **salga o no salga el mail**: marcando
sólo al salir bien, una dirección rota se reintentaría todos los días para
siempre, gastando cuota de envío.

#### ⚠️ Y hubo que escribir la política ANTES de que saliera el primer mail

La solapa digital de `/privacidad` **no tenía una sola mención a la palabra
"carrito"**, y la función que le escribe a esa gente ya estaba escrita. Se agregó
la sección "3 bis. Compras que alguien empezó y no terminó" con qué se guarda,
con qué base legal (interés legítimo, art. 5 inc. f de la 25.326), que se manda
una sola vez y que nunca se le escribe a quien tiene el pago en camino.

Y ahí apareció otra: **esas compras sin pagar no se borraban nunca.** Quedaban
para siempre con el correo de alguien que ni siquiera llegó a comprar. La
política promete 45 días —los mismos que los carritos de tienda— así que se
escribió la limpieza que lo cumple, y sólo para cuentas digitales: una orden
PENDING de tienda ya descontó stock al crearse, y borrarla dejaría el inventario
mal para siempre.

32 chequeos nuevos en `carritos-digitales.check.ts`.

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
acepta.

⚠️ **Este recuadro decía "con el ebook a US$3 de API" y estaba 13 veces por
encima. Medido el 07/09/26: US$0,22** —US$0,44 contando el rehacer gratis, que
tampoco estaba contado—. Con el número de verdad, al dólar de $1.520 (08/09/26):

| | Abono | Costo máximo de IA | Se da vuelta con el dólar a |
|---|---|---|---|
| **Starter** ($30.000, 4 ebooks) | US$19,7 | **US$1,76** | ~$170.000 |
| **Pro** ($89.000, 6 ebooks) | US$58,6 | **US$2,64** | ~$337.000 |

> ⚠️ **ESA TABLA ESTABA INCOMPLETA, Y LA CORRECCIÓN ES DEL DÍA SIGUIENTE.**
>
> Contaba **sólo la bolsa mensual**. Al día siguiente —08/09/26, nosotros— se
> duplicó la **bolsa de bienvenida** (Starter 3→6, Pro 6→12) y nadie volvió acá.
> La bienvenida es más grande que el mensual, así que el primer mes es el que
> manda y era el que faltaba.
>
> Y el 08/09/26 se corrigió además el mensual, contando de verdad cuántos
> archivos tiene un producto completo (ver más abajo). Los números de hoy:
>
> | | Abono | **1er mes** (todo gastado) | **En régimen** | % del abono |
> |---|---|---|---|---|
> | **Free** | $0 | US$0,09 | — | — |
> | **Starter** (6+5 ebooks) | US$19,7 | **US$4,84** | US$2,35 | 25% → **12%** |
> | **Pro** (12+9 ebooks) | US$58,6 | **US$9,90** | US$4,26 | 17% → **7%** |
>
> **La conclusión de fondo se sostiene**: el primer mes es un pico por diseño
> —para eso existe la bolsa de bienvenida— y en régimen los dos planes están
> holgados. Lo que no se sostenía era el número: era **tres veces más chico** que
> el real, y sobre él se dijo "el riesgo no existe".
>
> La lección no es el número, es el hábito: **este recuadro no se actualizó solo
> cuando se tocaron los cupos.** Si se vuelven a tocar, se vuelve acá.

O sea que **el riesgo que este recuadro describía no existe**: haría falta un
dólar de seis cifras para dar vuelta un plan. Lo que sí queda es lo otro:

- 🔲 **Revisar estos precios cada tanto**, pero por la INFLACIÓN y no por la IA.
  Nuestros precios están en pesos y los de la competencia en dólares: el de ellos
  sube solo y el nuestro se licúa. Decidido el 08/09/26: se dejan en pesos y se
  revisan a mano. La referencia para saber si quedó viejo está en
  `PRECIOS_DIGITALES`.
- ❌ **Bajar `TOPES_DIGITALES.PRO.ebooksIA` ya no es una palanca**: son dos
  dólares y medio. Si algún día hay que recortar Pro, el costo que de verdad
  escala es el **tráfico de los bonos** —cada venta se lleva el principal más
  todos sus bonos, 6 archivos en Pro— y eso pega en el egress de Supabase.

### ✅ Cuántas generaciones da cada plan, y si alcanzan — MEDIDO EL 08/09/26

Contado de verdad, en vez de estimado. **Son dos bolsas separadas**: gastar una
no toca la otra. Las generaciones pagan el embudo, un bono o upsell suelto, y la
página de venta; los ebooks pagan el PDF entero (los capítulos no cobran aparte).

| | Free | Starter | Pro |
|---|---|---|---|
| Abono | $0 | $30.000 | $89.000 |
| Productos | 1 | 2 | 5 |
| Bonos · upsells *por producto* | 1 · 1 | 2 · 2 | 5 · 3 |
| **Archivos a entregar** | **3** | **10** | **45** |
| Generaciones: bienvenida + mes | 3 + 0 | 6 + 5 | 12 + 10 |
| Ebooks: bienvenida + mes | 0 + 0 | 6 + **5** | 12 + **9** |

**¿Alcanza para llenar el plan?** Una generación de embudo da producto + 1 bono
+ 1 upsell + la página; cada bono o upsell extra es otra.

| | Generaciones que necesita | Tiene el 1er mes | |
|---|---|---|---|
| Free | 1 | 3 | ✅ sobran 2 |
| Starter | 6 | 11 | ✅ sobran 5 |
| Pro | **35** | 22 | ⚠️ tres meses |

⚠️ **Y ACÁ ESTABA EL ERROR QUE ESTE CONTEO ENCONTRÓ.** El mensual de ebooks era
4 en Starter y 6 en Pro, copiados del plan equivalente de la competencia **sin
mirar cuántos archivos tiene el nuestro**. Un producto completo de Pro son
**nueve** archivos: con 6 por mes, el plan más caro no podía terminar ni un
producto por mes. Starter estaba a uno de distancia.

Corregido el 08/09/26: **el mensual es `1 + bonos + upsells`** —Starter 5, Pro
9— y hay un chequeo que lo exige, así que tocar `bonos` obliga a decidir en vez
de dejar el número viejo callado.

Cuesta US$1,32 más por mes en Pro y US$0,44 en Starter. El comentario de
`EBOOKS_IA_ARRANQUE` decía además *"un producto lleno son 6 archivos"* y sobre
ese 6 se concluyó que Pro llenaba cuatro productos el primer mes: **llena dos.**

**Cómo queda cada plan, en una línea:**

- **Free** — sobrado y sin ebooks a propósito (un ebook con IA sirve fuera de la
  plataforma y Free no pide tarjeta). Su único problema es el 🔲 de abajo.
- **Starter** — calibrado casi exacto: llena su plan completo el primer mes.
- **Pro** — dos productos completos el primer mes y uno por mes después. Cinco
  productos en cinco meses, que es el ritmo real de un catálogo que se arma una
  vez y después se vende.

- ✅ ~~**La página gratis no tenía techo.**~~ **SACADA EL 08/09/26.** Era el
  único agujero de los cinco caminos de IA. `ia/pagina` la regalaba cuando
  `paginaVenta` estaba en null —o sea **por producto**— y crear un producto a
  mano no gasta generaciones, así que el bucle era: crear a mano → página gratis
  → borrar → repetir, sin fin.
  - El comentario de la ruta decía que no se podía abusar *"porque borrar uno
    para recrearlo cuesta una generación en el embudo"*. Era cierto **sólo si se
    recrea con el embudo**; a mano no costaba nada.
  - Lo único que lo frenaba eran los topes de ráfaga (8 cada 10 minutos por
    cuenta, 150 por día para todo Free junto), así que la plata estaba acotada
    —unos US$6 el peor día—. **El daño real era que una sola cuenta se comiera
    el presupuesto diario de Free y dejara sin IA a las demás.**
  - ⚠️ **Se sacó la regla en vez de ponerle un techo.** Un techo hubiera sido un
    contador más que mantener; sin la excepción no queda ningún camino gratis,
    así que no hay nada que farmear, nada que contar y nada que bloquear. Y esa
    gratis ya no tenía motivo: existía porque el embudo NO escribía la página
    —tener todo costaba dos generaciones—, y **el mismo día el embudo pasó a
    escribirla en el mismo paso**. El parche sobrevivió al problema que parchaba.
  - **Contrapartida, y es la única**: un embudo completo pasó a costar **2**
    generaciones —una por las tres fichas, otra por la página— así que **Free
    pasó de 3 a 4**, para que entren dos embudos completos. Starter y Pro no se
    tocaron: ya les sobraba (11 y 22 el primer mes).
  - `RUT-D` es el chequeo que impide que vuelva. Si algún día se reintroduce una
    página gratis, lo primero que hay que mirar es si el embudo sigue
    escribiendo la página, porque ése era el único motivo.

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
contenido del ebook lo trae la persona. El ebook es la llamada cara —US$0,22
medidos— y los textos de una landing son centavos: estábamos regalando lo caro y
cobrando lo barato. Y Free no pide tarjeta: un ebook escrito con IA sirve fuera
de la plataforma y se puede cosechar; una página generada no le sirve a nadie
afuera. Ver 2.4 bis.

| | **Free** *validar* | **Starter** *vender* | **Pro** *escalar* |
|---|---|---|---|
| **Abono mensual** | $0 | **$30.000** | **$89.000** |
| **Abono anual** (−25%) | — | $270.000 → *$22.500/mes* | $801.000 → *$66.750/mes* |
| **Comisión por venta** | **8%** | **6%** | **2%** |
| Productos = páginas de venta | 1 | 2 | 5 |
| **Ebooks con IA por mes** | ❌ | **4** | **6** |
| **Ebooks de regalo al arrancar** | ❌ | **6** | **12** |
| Bonos por producto | 1 | 2 | 5 |
| Upsells por producto | 1 | 2 | 3 |
| Página de venta armada con IA | ✅ | ✅ | ✅ |
| Textos y mails con IA | ❌ | ✅ | ✅ |
| Sasha | ❌ | ✅ | ✅ |
| ~~Pagos con transferencia~~ (sacada el 14/09/26: sólo Mercado Pago) | ❌ | ❌ | ❌ |
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
- ⚠️ **Los topes de ebooks eran 2 y 5 "a propósito, porque definen el costo del
  plan". Eso era falso y se corrigió el 08/09/26**: un ebook sale US$0,22, no los
  US$2 a 4 que se habían estimado sin medir. Ahora son **4 y 6 — los mismos que
  da la competencia** — y el regalo de arranque se duplicó a 6 y 12, que es donde
  de verdad hace falta: *el embudo se arma una vez y después se vende*.
- ⚠️ **Y el precio de Pro pasó de $60.000 a $89.000**, también el 08/09/26.
  Puesto al lado de la competencia con el dólar a $1.520, resultó que **nuestro
  Pro no equivale a su Pro sino a su Max** —5 páginas, 5 bonos, 3 upsells, 2% de
  comisión, ficha por ficha— que ellos cobran **US$100 = $152.000**. Estábamos
  vendiendo su plan de $152.000 a $60.000: el 39%. Los $89.000 quedan justo abajo
  de los $91.200 que sale su plan *Pro*, y ése es el argumento entero: *por menos
  de lo que sale su Pro, te damos todo lo de su Max*.
- **Margen en el peor caso** (alguien que quema todos sus ebooks todos los meses):
  **94% en Starter y 96% en Pro**. El costo de IA dejó de ser un factor.
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
- ✅ **El captcha del login anda** (revisado el 04/09/26). Esto decía que estaba
  trabado en local y en producción y quedó escrito de una tarde en que falló;
  después se arregló y la línea se quedó. Se corrige acá porque una lista de
  pendientes con cosas que ya andan es peor que no tener lista: se deja de leer.

---

## 7. Lo que TODAVÍA falta decidir

- ✅ **RESUELTO (03/09/26). El bono SÍ viaja como línea del pedido**, con precio
  0 (`armarItems`). Así cada bono tiene su propio permiso de descarga con sus 5
  bajadas, que era justo el agujero que se temía. La pregunta original decía: El permiso de descarga es **uno por
  línea comprada**, con 5 descargas cada uno. Si el bono es su propia línea, cada
  uno tiene su token y sus 5 descargas y está todo bien. Si no lo es, hay un solo
  token para 6 archivos y **el comprador no llega ni a bajar una vez cada cosa**:
  pagó y no puede tener todo. Es el tipo de agujero que aparece el día que alguien
  compra, no antes. Sale de contar los archivos por venta (ver Fase 3, el archivo
  del producto).
- ✅ **RESUELTO (04/09/26): el cupo mensual no usado SE PIERDE**, y la bolsa de
  bienvenida NO. Por eso se gasta **primero la del mes** —es la que vence— y
  recién después la de bienvenida. La pantalla lo dice con todas las letras y
  avisa fuerte cuando se empieza a comer la que no vuelve.
- ✅ **RESUELTO (04/09/26): las generaciones de página SÍ se cuentan**, del mismo
  cupo que el embudo, **menos la primera de cada producto**. Se dio vuelta la
  postura de 2.4 bis con el número medido en la mano: la página salió US$0,041
  —tres veces el embudo— y es el botón que todo el mundo aprieta de nuevo. Lo que
  no se cuenta es empezar.
- ✅ ~~**El tope anti-abuso de páginas de venta**, por arriba de las 5 de Pro.~~
  Hecho el 14/09/26, pero contando OTRA cosa: ver *El techo duro cuenta los
  borrados*. "Por arriba de las 5" no frenaba a nadie, porque en digitales el
  tope del plan ya es el techo de lo vivo; el agujero estaba en los borrados.
- ✅ **RESUELTO (01/09/26): cómo se unen Free, trial y gracia** (sección 3). Está
  en `subscription.ts`: un plan que no vence contesta `ACTIVE` y listo, y una
  cuenta digital que deja de pagar **vuelve a Free** en vez de cerrarse. Por eso
  Free es `ACTIVE` y no `TRIAL` — que es lo que casi deja a las cuentas gratis
  afuera del tope global de IA.
- ✅ **NO APLICA (03/09/26).** La duda era qué avisarle al comprador cuando paga
  por transferencia, porque ahí la entrega no es automática. **En digitales no hay
  transferencia**: el único medio es Mercado Pago y la entrega sale sola cuando el
  pago se aprueba. Si algún día se agrega otro medio, esta duda vuelve a abrirse.

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

- ✅ ~~**Los botones dicen "Próximamente" y están apagados.**~~ Resuelto con la
  Fase 2: los planes digitales se eligen y el alta anda (`DIGITALES_ABIERTO`
  decide si se muestran). Quedó sin tachar.
- ✅ ~~**Las preguntas frecuentes del pie** siguen siendo sólo de tiendas.~~
  Resuelto hace tiempo (`FAQ_DIGITAL` cambia con la vista); quedó sin tachar.
- ✅ ~~**El encabezado dice "7 días de prueba gratis, sin tarjeta"**~~ Hecho el
  14/09/26: en la vista de digitales el cartel y la bajada dicen lo que es —Free
  para siempre, y Starter y Pro con 7 días de prueba sin tarjeta; si no pagás,
  volvés a Free—. En la de tiendas siguen igual.

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

- ✅ ~~**Lo que falta y no se puede escribir todavía**: despublicar las páginas de
  venta que pasen el tope de Free cuando alguien cae.~~ Hecho el 14/09/26, ver
  *Caer a Free apaga las páginas de más*. Esperaba la Fase 5 y la Fase 5 terminó
  hace dos semanas sin que nadie volviera a esta línea.
- ✅ ~~El mail de "bajaste a Free".~~ Hecho el mismo día, en la misma vuelta del
  cron: `sendCaidaAFreeEmail`, con la lista de lo que se apagó.

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

- ✅ ~~**Los pasos de creación antes de entrar al panel.**~~ Resuelto hace
  tiempo: `/digitales` es el panel, con los primeros pasos como pantalla entera
  hasta que la cuenta está armada (ver Fase 3, el recibimiento). Quedó sin
  tachar; tachado el 14/09/26.

**Lo que sigue abierto:**

- ✅ La comisión **congelada al momento del pedido** — HECHA con el checkout
  (03/09/26). `Order.lockedCommissionRate` guarda el porcentaje que regía cuando
  se compró, y `comisionCongelada()` es la que leen las dos pantallas de ventas.
  `comisionDeLaVenta()` mira el plan de hoy y sólo sirve para cobrar en el
  momento. Si alguien vende con Pro (2 %) y después cae a Free (8 %), esa venta ya
  hecha se sigue liquidando al 2 %.
- ✅ La comisión de plataforma sumada a `marketplaceFee` — HECHA (03/09/26), y el
  choque con el afiliado revisado ruta por ruta: **una orden digital nunca tiene
  afiliado**, así que las dos cosas no se pisan. Está anotado en el código, no
  sólo acá.
- ✅ ~~El tope anti-abuso de páginas de venta, junto al código que lo aplica.~~
  Hecho el 14/09/26 (`MAX_PRODUCTOS_DIGITALES_CREADOS`). **La Fase 2 queda
  cerrada.**


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
- ✅ ~~**`pruebaYaUsada` no tiene llamador todavía**~~: lo usan
  `/api/digitales/prueba` (rechaza la segunda prueba) y Mi cuenta (esconde el
  botón). Quedó sin tachar; tachado el 14/09/26.
- ✅ ~~Despublicar las páginas de más al caer a Free.~~ Hecho el 14/09/26.


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
- ✅ ~~**El Site URL de Supabase sigue apuntando a `tienda-six-ecru.vercel.app`.**~~
  Cambiado el 14/09/26 a `https://www.tiendaapps.com` (sin `/**`: ahí no van
  comodines), verificado recargando la pantalla.

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
- ✅ ~~**NO se copiaron las barras de "Tu uso actual"** (Tiendas 1/1,
  Almacenamiento 92 KB…), que es lo mejor que tienen.~~ Hechas el 14/09/26,
  cuando ya había qué contar: la tarjeta **Tu uso** de Mi cuenta (ver el
  apartado del 14/09 al final).
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

- ✅ **Subir el archivo del producto** — HECHO. Bucket privado en Supabase con
  permiso firmado, igual que `/api/upload/firma`: `deposito-digital`,
  `subida-digital` y `/api/digitales/archivo/*`, con sus chequeos. Los bytes van
  derecho del navegador al depósito, así que no los topea el techo de 4,5 MB de
  las funciones. *(Marcado tarde: ya estaba hecho y la línea se quedó en 🔲.)*

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
- ✅ **App y avisos de ventas** — HECHO (05/09/26). Y el pendiente estaba mal
  escrito: los avisos **sí se escribían** desde el 03/09 —la venta, la
  devolución, la entrega que falló y la caída a Free—. Lo que faltaba era poder
  leerlos.

  ⚠️ **La campanita existía sólo en la barra del celular.** En la computadora no
  se veía ninguno, y armar un producto se hace en una computadora: alguien vendía
  un viernes y se enteraba el lunes. Cuatro avisos escritos que nadie leía.

  Ahora la campanita está también en escritorio —adentro del contenido y no
  flotando, que es el molde de `DashboardLayout`: empuja en vez de tapar, y el
  desplegable no lo recorta el `overflow-hidden` de la franja lateral—. Y los
  cuatro tipos tienen su icono: caían todos en el de por defecto, así que una
  VENTA se veía igual que una devolución.

  **Y se prendió el push**, que estaba apagado con este motivo escrito: *"pedirle
  permiso a alguien que después no va a recibir ninguna es prometer algo que no
  se cumple; cuando haya una venta que justifique interrumpirlo, se saca esta
  bandera"*. Ya la hay.

  ⚠️ **Se manda UNO SOLO: el de la venta.** Ni la devolución, ni la entrega
  fallida, ni la caída a Free — esos se leen al entrar. Un push es una
  interrupción, y gastarla en algo que la persona no puede resolver en el momento
  es la forma más rápida de que revoque el permiso, y entonces la próxima —la que
  sí importa— no llega. Y dice **lo que le queda** después de la comisión, no el
  bruto: el bruto ya lo ve en Mercado Pago.

  14 chequeos en `avisos-digitales.check.ts`, y uno de ellos **busca los tipos en
  el árbol** en vez de listarlos: el día que se agregue un aviso nuevo sin icono,
  salta solo.
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
- ✅ **Dominio propio** — HECHO (04/09/26) en la Fase 5 bis: uno por producto, con
  Pro. Con esto **se destraba la verificación de dominio en Meta**, que era lo
  único que la bloqueaba.

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

1. **El costo está al revés de lo que parece.** El ebook es la llamada cara
   —US$0,22 medidos— y los textos de una landing son centavos. Estábamos
   regalando lo caro y cobrando lo barato.

   > ⚠️ **MEDIDO EL 07/09/26 — el número que estaba escrito era inventado.**
   >
   > Acá decía **US$2 a 4**, y nunca se había generado un ebook. Uno de verdad
   > —8 capítulos, 4817 palabras, `claude-sonnet-5`, 9 llamadas— salió
   > **US$0,2223**: 22.437 tokens de entrada y 17.742 de salida. El techo, con
   > los 10 capítulos que permite el esquema y todas las llamadas agotando su
   > `max_tokens`, es **US$0,38**. El peor caso posible queda cinco veces por
   > debajo del piso que decía este documento.
   >
   > **Qué NO cambia:** el orden. El ebook sigue siendo lo caro y la página lo
   > barato, así que qué se regala y qué se cobra se mantiene. Y el motivo 2 —lo
   > cosechable— nunca dependió del costo.
   >
   > **Qué SÍ cambia:** la escala, y con ella el argumento de que los topes de
   > `ebooksIA` responden a un costo que aprieta. Diez ebooks de Pro son US$2,22,
   > no US$20 a 40. **Queda para decidir** si los topes se aflojan: el número que
   > los justificaba era diez veces más grande que el real.
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
- ✅ **Ventas** — HECHA (03/09/26), con el detalle de cada venta y el registro de
  envíos.
- ✅ **El panel** — HECHO (04/09/26). Era "Inicio" y estaba vacío: tres atajos y
  una frase. Ahora tiene **dos niveles** —todo junto o un producto a la vez—, la
  plata del mes, las direcciones de cada página para copiar y los accesos rápidos
  a un costado. *(Y los carritos abandonados, hechos el 05/09/26, tienen su
  propia pantalla y su aviso en el panel.)*
- ✅ ~~**Estadísticas**, cuando haya qué mostrar.~~ Hechas el 14/09/26 (ver el
  apartado "Estadísticas" al final): por producto y en general, con visitas,
  conversión, embudo y origen, bloqueadas por plan.
- ✅ ~~**El asistente de la primera vez** (los 5 pasos de la competencia).~~ Es
  **el recibimiento**: la pantalla entera hasta que la cuenta está armada
  (04/09/26), y desde el 10/09/26 termina en un cierre que elige el aspecto.
  Ver *El recibimiento termina en algo*, en la Fase 4.


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
- ✅ **Las capas de topes** — HECHAS (04/09/26) en `ia-digitales.ts`, pero
  quedaron **tres y no cuatro**: ráfaga, global de cuentas sin abono y global
  total. **El diario por cuenta se sacó a propósito** — el cupo persistente
  (`cupo-ia.ts`) ya es el freno que la persona ve, y sumarle un tope diario
  invisible arriba era frenar dos veces lo mismo y cobrar caro por explicarlo.
- ✅ **La capa de cuentas Free es la crítica**: es gratis, no pide tarjeta y da
  acceso a IA. Veinte cuentas truchas son la misma persona y ningún tope por
  usuario se entera.
- ✅ **El lote de arranque** — HECHO (04/09/26): es la bolsa de `bienvenida` de
  `CUPO_EMBUDO`, separada de la del mes. Los 7
  días son sin tarjeta: entregar ahí las 6 generaciones de Pro es regalarle hasta
  US$48 a alguien del que no tenemos un solo dato de cobro. En la prueba va el
  plan entero con **una** generación. Ver 2.4 bis.
- 🔲 **El reintento incluido por ebook.** Se cuentan ebooks —es lo que dice el
  cartel— pero cada uno se regenera una sola vez, si no el costo no tiene fondo.
- ✅ **El tope de la página de venta con IA** — HECHO (04/09/26). Regenerar gasta
  del mismo cupo que el embudo; **la primera vez de cada producto es gratis**
  (`esLaPrimera`), porque cobrarle a alguien por la página que todavía no existe
  es cobrarle por empezar.
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

### El orden en que se hace la Fase 4 — DECIDIDO (04/09/26)

| # | Qué | Por qué ahí |
|---|---|---|
| **1** | **Armar el embudo** (3 fichas) | Cuesta centavos, lo tienen los tres planes, y valida toda la plomería —topes, esquema, limado— **antes** de gastar US$4 por tiro |
| 2 | La página de venta con IA | También barata, y el catálogo cerrado ya está hecho justo para poder validar lo que devuelva |
| 3 | El ebook | US$2–4 cada uno. Necesita el cupo persistente, que todavía no existe |
| 4 | Sasha adaptada | La que menos bloquea: el asistente ya funciona, hay que cambiarle el cerebro |

### ✅ 4.1 ARMAR EL EMBUDO CON IA — el motor, HECHO (04/09/26)

`POST /api/digitales/ia/embudo`. Le contás de qué es tu negocio y devuelve tres
fichas: principal, bono y upsell, cada una con título, bajada y precio.

#### ⚠️ PROPONE. NO GUARDA NADA.

Podría crear los tres productos de una y sería un botón más lindo. Pero entonces
una generación mala deja tres productos para borrar a mano y —lo que importa—
**el texto de un modelo entraría a la base sin que ninguna persona lo haya
leído**. Lo que se publica en una página que cobra lo firma quien vende: tiene
que haberlo visto antes.

De yapa, los topes del plan y la validación de campos siguen viviendo en un solo
lugar —la ruta de crear— en vez de duplicados y desincronizándose de a uno.

#### El modelo: Sonnet 5, no Haiku

Sasha usa Haiku 4.5 y está bien: es un chat de mucho volumen donde cada mensaje
pesa poco. Esto corre **una vez por producto** y es lo primero que la persona ve
de todo el ecosistema — acá el texto de venta *es* el producto. A este tamaño la
diferencia de costo es una fracción de centavo; la de calidad, no.

#### Lo que costó de verdad (medido, no estimado)

**~2.100 tokens de entrada y ~480 de salida por generación: alrededor de 1,3
centavos de dólar.** Confirma el "centavos" que decía 2.4 bis, ahora con número.
El `console.log` de la ruta lo deja anotado en cada llamada para poder revisarlo
cuando haya uso real.

#### La forma la garantiza la API, no una frase

La respuesta entra por una **herramienta de esquema fijo** con `tool_choice`
forzado. Pidiendo "contestame en JSON" el modelo contesta en JSON **casi**
siempre, y el "casi" acá es una pantalla rota.

⚠️ **Eso no reemplaza validar.** El esquema garantiza que `precio` sea un número,
no que sea un número sensato. Todo lo que vuelve pasa por `normalizarEmbudo`:

- Los textos por **el mismo limpiador que usa lo que escribe una persona** — lo
  que vuelve termina dibujado en una página pública, y un salto de línea adentro
  de un título rompe el mismo renglón lo haya escrito quien lo haya escrito.
- **El bono va en 0 aunque el modelo le ponga precio.** Un bono que se cobra no
  es un regalo.
- `NaN` e `Infinity` **son números** para el esquema, y pasan cualquier
  comparación hasta que el total de un pedido sale en "NaN".
- Un precio fuera de rango se **acomoda al borde**, no tira las tres fichas: el
  modelo no conoce el dólar de hoy, así que su precio es una sugerencia para
  editar y no un número para publicar.
- Si falta una ficha entera o un título queda vacío, **no se muestra nada**:
  media pantalla con una tarjeta buena y dos vacías es peor que "probá de nuevo".

#### Lo que el propio ensayo encontró

Con dos nichos de prueba salió muy bien —rioplatense, concreto, sin promesas— y
apareció **un error que no se veía leyendo el prompt**: al mecánico le propuso un
upsell de *"videos cortos donde te muestro…"*. **La plataforma entrega un archivo
que se descarga, no videos.** Quedaba quien vende prometiendo algo que el sistema
no le iba a mandar a nadie. El prompt ahora lo dice con todas las letras, y
también que no proponga clases en vivo, comunidades ni acompañamiento.

Y en la segunda pasada el texto se fue para el lado del lunfardo ("no te la
claven", "te están afanando"). Es rioplatense, pero **esto lo firma con su nombre
quien vende**: se le agregó el freno. Esa línea no se volvió a ensayar contra el
modelo — es la única parte de este bloque que está escrita y no probada.

#### Los topes, que es la parte que no se negocia

`lib/ia-digitales.ts`, con la misma forma que los de Sasha, porque **lo que ya se
aprendió caro no se vuelve a aprender**:

| Capa | Qué tapa |
|---|---|
| Ráfaga (8 / 10 min) | Que nadie dispare un script contra el endpoint |
| Global de cuentas sin abono (150/día) | **Veinte cuentas truchas son la misma persona**, y ninguna capa por-usuario se entera |
| Global total (600/día) | El corta-corriente |

- **Archivo aparte del de Sasha, a propósito.** Si compartieran presupuesto, una
  tarde de charla con el asistente dejaría a alguien sin poder armar su producto.
- ⚠️ **Los globales van ÚLTIMOS.** Los contadores suman aunque el pedido se
  rechace —así es `INCR`—: si fueran primero, alguien ya bloqueado por su cupo
  personal seguiría comiéndose el presupuesto de todos con cada intento.
- ⚠️ **Si Redis no contesta, se FRENA.** Del otro lado hay algo que se paga, así
  que "no pude contar" tiene que cortar y nunca dejar pasar.

### ✅ 4.1 bis EL CUPO — HECHO (04/09/26)

**Salió de una pregunta.** Contando cuánto costaba cada generación aparecieron dos
cosas que no cerraban, y las dos las destapó comparar con la competencia.

#### El primer agujero: los números del tope diario

Había un tope diario por plan (10/20/40). **40 por día × 30 días × 1,35 centavos
son US$16 al mes, de un plan Pro de US$43.** El botón barato terminaba costando
como el caro en el peor caso, y el cálculo de márgenes de 2.4 bis no lo tenía en
cuenta porque asumía que esto "no se contaba". Sumado a los ebooks, el margen del
peor caso de Pro caía de 30% a ~16%.

#### El segundo, y el serio: **Free quedaba afuera del único freno que ve las cuentas en serie**

La capa "global de pruebas" está copiada de Sasha y mira `status === "TRIAL"`.
Pero **una cuenta Free digital es `ACTIVE`** —no vence nunca, porque no se cobra—,
así que no la contaba nadie.

Y Free es la **más** expuesta de las dos, no la menos:

| | Prueba | Free |
|---|---|---|
| Dura | 7 días | **para siempre** |
| Pide tarjeta | no | no |
| Se puede repetir | no (`pruebaYaUsada`) | **sí, las cuentas que quieras** |

20 cuentas Free truchas × 10 por día = **~US$81 por mes** de gente que no paga un
peso, y ninguna capa se enteraba porque quedaban por debajo del corta-corriente.

Lo destapó el usuario contando cómo lo resuelve la competencia: **en su plan
gratis te dan UNA generación y nunca más.** Nosotros teníamos 10 por día, para
siempre, sin querer.

#### La solución: cupo, no tope

Son cosas distintas y conviene no mezclarlas nunca más:

- **Tope** — invisible, anti-abuso. Nadie lo ve ni lo vende. Vive en Redis y se
  olvida solo, que es lo correcto para una ráfaga.
- **Cupo** — **parte de lo que se vende**. La persona lo ve gastarse y va escrito
  en la página de precios, así que **no puede vivir en Redis**: un contador con
  ventana se olvida y regala el cupo entero de nuevo.

| | Al empezar (una vez, no vence) | Por mes (no se acumula) |
|---|---|---|
| **Free** | **3** | — |
| **Starter** | **6** | **5** |
| **Pro** | **12** | **10** |

**El tope diario se sacó**: con un cupo mensual no agrega nada, es un segundo
número que explicar para frenar algo que el cupo ya frenó, y **cuanto más números
hay en pantalla menos se entiende cuál se está gastando**.

Los números salen de los productos: **3 por producto**. Starter tiene 2 → 6 para
arrancar; Pro tiene 5 → 12, con margen. Y el arranque es más grande que el
mensual a propósito — el mes 1 es cuando la persona está probando, no sabe qué
escribir y regenera varias veces, y **ese día es el que decide si se queda**.

**Free no tiene bolsa mensual, y es la única decisión de plata acá.** En Starter y
Pro hay un abono pagando la cuenta; en Free no entra un peso hasta que vende algo.
Con cupo mensual, veinte cuentas truchas serían un gasto para siempre; con 3 de
por vida, una cuenta trucha cuesta **cuatro centavos de dólar, una sola vez**.

**Peor caso, después:** Pro pasa de US$16 a **US$0,14 por mes**. El margen queda
intacto — la cáscara es 0,3% del plan en vez de 14%.

#### ⚠️ Se gasta primero la del mes

Porque es la que se vence. Al revés le quemaríamos a la persona su bolsa
permanente mientras se le pierden sin usar las del mes: **una estafa silenciosa,
de las que nadie nota hasta que le faltan.**

Y el mensual **no se acumula**: si se acumulara, alguien que no toca la cuenta
durante un año llega al mes 13 con 120 generaciones juntas y el peor caso vuelve
entero.

#### Cómo se cuenta sin que se rompa

- **La condición va adentro del `where`, nunca en un `if` después de leer.** Leer
  "¿le quedan?" y después restar es la carrera clásica: dos pedidos en paralelo
  leen los dos "te queda 1" y los dos gastan. Con el "todavía le queda" adentro
  del `UPDATE`, la base decide quién gana y el que pierde recibe `count: 0`.
- **La fila se crea con `upsert`** sobre la clave única. Un "¿existe? entonces
  creá" deja dos filas cuando llegan dos pedidos juntos, o sea **el doble de
  cupo**.
- **Devolver no puede dejar el contador en negativo** — eso sería cupo infinito.
- **El mes se reinicia al gastar, sin cron.** `mesClave` guarda "2026-09"; si no
  es la del mes actual, el contador se pone en cero en ese momento. En este plan
  de Vercel el cron es uno por día, y un cupo que depende de que corra es un cupo
  que algún día no vuelve.
- **El cupo se gasta ANTES de llamar al modelo**, y se devuelve si la llamada
  falla. Después sería tarde: ocho pedidos en paralelo pasarían todos el control
  —porque ninguno gastó todavía— y generarían los ocho.

#### Probado contra la base de verdad, no sólo leyendo el código

Los chequeos leen fuente; esto cuenta plata. Se corrió contra la Supabase real y
después se borró la fila:

- 22 iniciales en Pro (10 del mes + 12 de bienvenida) ✓
- gasta primero las del mes ✓
- devolver suma una y no pasa del tope ✓
- **10 pedidos EN PARALELO gastaron exactamente 10** — 8 del mes (las que
  quedaban) y 2 de bienvenida. Ni una de más ni una perdida ✓
- con el cupo vacío devuelve `null` ✓
- con la clave del mes vieja, el mes vuelve solo ✓
- Free: tres, y la cuarta es `null` ✓

La migración `20260904120000_cupo_ia` es aditiva —una tabla nueva— e idempotente,
**corrida contra la base real el 04/09/26**. Sin deploy.

45 chequeos en `embudo-ia.check`, y los de los topes corren de verdad contra un
contador falso, no mirando el código.

### ✅ 4.1 ter EL BOTÓN — HECHO (04/09/26)

`EmbudoIA.tsx`. Tres pasos, y ninguno se puede saltear:

1. **Contás tu nicho** — con el cupo a la vista antes de apretar nada.
2. **Leés y editás las tres fichas.** Acá está el punto de todo: **lo que se
   publica en una página que cobra lo firma quien vende**, así que tiene que
   haberlo visto antes de que exista.
3. **Se crean**, por `POST /api/digitales/productos` — la de siempre, la que
   cuenta los topes del plan y valida los campos. Esta pantalla no reimplementa
   ninguno de los dos controles.

#### Dónde va el botón, y por qué no donde estaba dibujado

El hueco de "Próximamente" estaba **adentro del formulario de crear producto**, y
ahí no podía ir: la IA devuelve **tres** fichas y ese formulario crea **una**.
Metido ahí habría que decidir qué hacer con las otras dos mientras hay un
formulario a medio llenar encima. Vive afuera, arriba de la lista, en su propia
ventana.

**Y va primero, con "a mano" al lado.** En la pantalla vacía es el botón grande y
cargar a mano es un enlace abajo: la pantalla vacía es el momento exacto del *"no
sé qué escribir"*, que es el problema que esto resuelve. Escribir a mano sigue
estando y sin castigo.

#### El cupo, dicho como se entiende

El número grande es el total —que es lo que la persona busca— y abajo, en chico,
**las dos bolsas por separado**: *"8 de este mes (vuelven a ser 10 el 1°) · 6 de
bienvenida (no se renuevan)"*. Con sólo el total, alguien gasta su bolsa
permanente creyendo que se le renueva.

**En Free el texto es otro**, porque no tiene bolsa mensual: *"En el plan gratis
son 3 en total y no se renuevan"*. Decir "se renuevan" ahí sería mentir.

Y **el momento que importa**: cuando una generación sale de la bolsa de
bienvenida, se avisa arriba de las fichas. Es el único momento en que esta
pantalla interrumpe, porque es el único cambio que no se puede deshacer.

#### Tres cosas del repaso antes de commitear

- ⚠️ **Si falla en el medio de crear los tres, el botón NO vuelve.** Los tres se
  crean en orden —el principal primero, porque el bono y el upsell cuelgan de su
  id— y si el segundo falla, el primero **ya quedó**. Apretar de nuevo crearía el
  principal por segunda vez y gastaría otro lugar del plan. Se reemplaza por "Ver
  qué quedó en la lista", que recarga. Cerrar con la X o el fondo también recarga
  en ese caso: la lista de atrás está vieja.
- **"Probar de nuevo" gasta otra generación, y se dice ANTES de apretarlo.**
  Editar a mano no gasta ninguna, y también se dice.
- **Los precios llevan su aviso**: la IA no conoce el mercado de hoy, así que son
  una sugerencia para revisar antes de publicar.

10 chequeos más (VEN-A … VEN-J), 55 en total en `embudo-ia.check`.

🔲 **`IA_LISTA` sigue en `false`, y está bien:** esa bandera ahora es sólo del
botón del **ebook**, que es el caro y no existe. Armar el embudo no pasa por ahí.

### ✅ EL PANEL DE DOS NIVELES — HECHO (04/09/26)

La pantalla de Inicio se reemplazó por el panel. Sale del mismo lugar que la Fase
5 bis: **una cuenta Pro puede ser cinco negocios de cinco nichos distintos**, y
un solo número de "ventas" no le dice a nadie cuál de los cinco anda.

#### Los dos niveles

Arriba un selector —**Todos**, o un producto— y todo lo de abajo cambia con él.
Viaja en la dirección (`/digitales?p=<id>`) y no en un estado: así el link se
comparte, el botón atrás funciona, recargar no pierde nada y **el panel entero
anda sin JavaScript**. Es la misma decisión que ya se tomó en Ventas.

En la vista de un producto está lo que esta pantalla venía a resolver de verdad:
**su dirección y su dominio, con botón de copiar**. Esa es la operación real —se
pega en un anuncio, en un mensaje, en una historia— y hasta ahora había que ir a
buscarla a otra pantalla. Se muestran **las dos** cuando hay dos: mostrar sólo el
dominio propio haría pensar que la de tiendaapps se apagó, y no se apaga nunca.

#### ⚠️ La plata tiene que dar LO MISMO que en Ventas

Dos pantallas que muestran la misma plata no pueden decir números distintos: el
que ve $170.000 en una y $168.000 en la otra deja de creerle a las dos.

Por eso **el total sale de las ÓRDENES agrupadas por su porcentaje de comisión**,
que es exactamente la cuenta que hace Ventas — y hay un chequeo que corre las dos
al lado y se pone en rojo si alguna se mueve. Lo que sale de los ítems es sólo el
reparto POR PRODUCTO, donde los bonos y los upsells suman al principal del que
cuelgan: el que pregunta cuánto le dejó mecánica quiere el upsell adentro.

Sumar ítems para el total no servía: alcanzaba un producto borrado para separar
las dos pantallas.

#### Los accesos rápidos, a la derecha

Como los tiene la competencia. En pantalla grande son una columna al costado; en
un teléfono se apilan **abajo** de los números, que es el orden correcto ahí:
primero cómo va, después qué hacer.

### ✅ LOS PRIMEROS PASOS — HECHOS (04/09/26), Y MUDADOS

⚠️ **Ya no viven en el medio del panel** (04/09/26). Estaban ahí y ahí no van:
alguien que ya vendió cuarenta veces no tiene por qué seguir viendo una lista de
tareas de arranque ocupándole la pantalla entera.

Ahora son **el recibimiento**: mientras la cuenta no está armada, los pasos SON
la pantalla entera —mostrar tres ceros y una lista vacía es peor que no mostrar
nada—. Sin barra lateral, sin Configuración, sin Mi cuenta y sin números.

⚠️ Corregido el 07/09/26: acá decía que *"en cuanto hay un producto se corren a
la columna de la derecha, chiquitos"*. Eso era el diseño anterior. La compuerta
del 06/09 lo reemplazó: la pantalla entera se sostiene hasta que la cuenta está
armada, y recién ahí aparece el panel. Adentro, la lista chiquita sigue
existiendo (`PrimerosPasos`) para el paso que queda.

Lo que NO cambió es de dónde salen, que es lo que sigue abajo.

El inicio del panel tenía escrito, desde el 03/09, que *"los pasos de bienvenida
—el asistente de la primera vez— van justo acá cuando exista"*. Existen.

Salió de mirar cómo lo hace la competencia: ni bien entrás al panel te da una
serie de pasos, y adentro de ese recorrido está la IA que arma la cáscara.

#### ⚠️ Se calcula del estado REAL, sin ninguna bandera guardada

No hay ningún `onboardingCompletado` en la base, y es la decisión de fondo de
esta pantalla. Una bandera guardada **se desincroniza**: el día que alguien borra
su producto o desconecta Mercado Pago, la lista sigue diciendo "listo" con la
cuenta rota — y esto es lo primero que ve alguien que se acaba de registrar.

Calculado del dato de verdad **no puede mentir**, y si algo se rompe el paso
vuelve a aparecer solo, que es justo lo que hay que ver.

El costo es que no se puede cerrar. Tampoco hace falta: se va sola cuando están
los cinco, y hasta entonces **cada uno que falta impide vender de verdad**. No
hay pasos de cortesía — uno que se puede saltear entrena a saltearlos todos.

#### Los cinco, y por qué en ese orden

| # | Paso | Qué pasa si falta |
|---|---|---|
| 1 | **Armá tu producto** | No hay nada que vender. Y el botón dice *"Armarlo con IA"*: es el camino que resuelve la pantalla en blanco |
| 2 | **Subí el archivo** | ⚠️ El peor de los cinco: **es el único que falla DESPUÉS de que alguien pagó**. Se cobra y no se puede entregar |
| 3 | **Armá tu página de venta** | Es lo que la persona lee antes de decidir. Con el texto de fábrica se vende bastante menos |
| 4 | **Conectá Mercado Pago** | El botón de comprar no cobra nada |
| 5 | **Publicá** | Está todo listo y no lo ve nadie, ni con el link |

##### ⚠️ La puerta son DOS, no cinco (08/09/26)

Los cinco impiden vender. Pero para **entrar al panel** alcanzan dos: el
producto y la página. Los otros tres quedaron adentro, y cada uno por su motivo.

**La regla, en una línea: a la puerta va lo que no se puede hacer de otra forma
ni más tarde.**

- **Publicar** se decide mirando. Pedirlo para entrar obliga a poner la página a
  la vista **antes de haberla visto**, así que lo primero que verían los
  compradores es la versión que la dueña nunca revisó.
- **El archivo** (07/09) tiene dos caminos —subir un PDF, o que la IA escriba el
  ebook— y el segundo vive adentro del panel. La puerta le pedía un PDF que no
  tiene justo a quien pagó para que se lo escribamos.
- **El cobro** (08/09) es el mismo error, peor. **La pantalla donde se conecta
  Mercado Pago está adentro del panel** (Configuración → Pagos): la puerta lo
  pedía y escondía el lugar donde se resuelve. Y no es un clic — quien todavía
  no tiene cuenta tiene que crearla y verificar identidad, que puede llevar
  días, **de los siete de la prueba, que corren igual mientras está afuera**.
  Alguien que se anotó a probar el producto se quedaba mirando una pantalla que
  le pedía un trámite bancario.

**Ninguno se pierde**: la lista del panel (`PrimerosPasos`) los sigue mostrando
con su botón hasta que estén hechos, y esa lista sí mira los cinco.

**⚠️ Y ninguno se saca sin poner su red antes.** Es la mitad de la decisión:

| Paso que salió | Qué lo sigue frenando |
|---|---|
| Archivo | `loQueFalta` no deja publicar ni comprar sin él |
| Cobro | `loQueFalta` **no deja publicar sin él** (nuevo el 08/09), y comprar lo rechaza con un mensaje escrito para el comprador |

Sin la red del cobro, alguien pondría a la vista una página con dirección
propia, la metería en un anuncio, y el botón de comprar contestaría *"probá más
tarde"*: la plata de la publicidad gastada contra una página que no puede
cobrar. Lo cuidan `PUB-I` a `PUB-L` y `PAS-X` — y `PAS-X` está escrito
justamente para avisar si esa red se cae.

Tampoco se hizo un botón de **"saltar"**, que era la otra forma. Un paso que se
puede saltear entrena a saltearlos todos; sacarlo de la puerta no inventa un
verbo nuevo y la lista de adentro lo sigue reclamando igual.

Quién decide cuáles abren la puerta es `pasosDeLaPuerta`, y está nombrado en un
solo lugar: la puerta se define como "todos menos `PASOS_DE_ADENTRO`" y no como
una lista de claves escrita aparte, que el día del sexto paso hay que acordarse
de tocar en dos lados. Lo cuidan `PAS-Q` a `PAS-U`.

⚠️ **En la lista de los cinco, Mercado Pago sigue yendo cuarto y no primero.**
Es el paso que más gente abandona —te saca de la aplicación, te pide iniciar
sesión—, y ponerlo antes es perder a quien todavía no vio nada de lo suyo
armado. Primero se ve el producto propio hecho; después se pide el trámite.

#### Un solo botón, no cinco

Sólo el primero que falta muestra su llamado a la acción. Cinco a la vez parecen
más útiles y no llaman a ninguno — y el orden importa de verdad: subir el archivo
de un producto que no existe no se puede. Pero **salta los que ya están**: si
alguien conectó Mercado Pago antes de subir el archivo, el botón es el que de
verdad falta y no el primero de la lista.

Y abajo de cada paso pendiente va **la consecuencia, no la tarea**. La tarea ya
está en el título; el motivo es lo que hace que alguien lo haga hoy.

#### Lo que hubo que arreglar de paso

**El paso de cobro llevaba a una solapa que nadie abría.** Configuración sólo
abría Pagos cuando se volvía de Mercado Pago (`?mp=`), así que `?tab=pagos` habría
dejado a la persona en General buscando. Ahora se lee, comparado contra la lista
de solapas nuestra —una inventada dibujaría una pantalla vacía— y el aviso de
Mercado Pago le sigue ganando: si volvés de conectar, lo primero que ves es cómo
salió.

16 chequeos en `primeros-pasos.check`, y corren la lógica de verdad contra fotos
armadas a mano, no leyendo el archivo. **72 pruebas** en total.

#### ✅ El recibimiento termina en algo, y elige el aspecto — 10/09/26

Tres cosas, y las tres salieron de probarlo en pantalla y no de leer el código.

**1. La barra mentía.** El asistente hace DOS pasos de una —crea el producto y
escribe la página—, así que la barra prometía dos, se apretaba un botón y se
caía en el panel sin que nada dijera que había terminado. Reportado tal cual:
*"cuando puse generar se saltó el último paso y me llevó directo al panel, ni
siquiera me dijo listo"*. No se salteaba nada: se tildaban los dos juntos y no
había nada después. Ahora los cuatro círculos están desde el principio
—**Producto, Página, Estilo, Listo**— así que se VE que el asistente tacha dos
de una.

**2. Un paso para elegir cómo se ve.** Los cinco estilos y las seis paletas, con
una muestra que se repinta a cada toque. Los colores salen de
`variablesDePagina`, la misma función que pinta la página pública y el
checkout, así que la muestra no puede quedarse vieja el día que cambie un tono.

⚠️ Va como pantalla de **cierre** (`Cierre.tsx`) y no como paso de la puerta.
La puerta se calcula del estado real, y *"¿ya eligió un estilo?"* no se le puede
preguntar a la base —toda página nace con estilo y paleta—. Hacerlo paso
obligaba a inventar una bandera, que es justo lo que el recibimiento no tiene a
propósito (ver arriba, *Se calcula del estado REAL*).

Guardar la elección usa el `PATCH` de la página, que nació para esto: ver *Cambiar
el aspecto sin reescribir la página*, al final del documento.

**3. La bienvenida y los consejos.** La primera pantalla era una tarjeta chica en
una hoja gris, sin el logo: *"me da tristeza ver esa imagen"*. Ahora lleva el
saludo por su nombre y las tres cosas que la plataforma hace sola, y los cuatro
pasos tienen un consejo en el costado (`Consejo.tsx`) que antes estaba vacío.
Los consejos no traen ni un dato inventado: cada uno tiene la razón adentro de
la misma frase.

Lo que se cuidó en pantalla chica: **todo lo secundario va DEBAJO y no arriba**
—la bienvenida, el consejo—, porque puesto arriba empuja abajo del pliegue el
único botón de la pantalla. La excepción es el paso del estilo, donde la muestra
va arriba y pegada: con once opciones apiladas antes se elegía a ciegas.

Dos cosas de código: `BarraDePasos` salió a un archivo propio porque la dibujan
tres pantallas seguidas del mismo recorrido —escrita tres veces, se renombra una
y la barra cambia a mitad de camino—; y `estadoDelRecibimiento` devuelve las tres
claves del aspecto SIN llamar a `normalizarContenido`, que rearma la página
entera, porque corre en el layout: una vez por cada pantalla del panel que
alguien abra.

Con esto **el asistente de la primera vez está terminado**: la lista de la Fase 3
lo tenía en 🔲 desde el 01/09 y quedó tachado.


### ✅ 4.2 LA PÁGINA DE VENTA CON IA — HECHA (04/09/26)

`POST /api/digitales/ia/pagina` + el botón **"Escribir con IA"** en el editor.

#### ⚠️ Hay secciones que la IA NO puede tocar, y es lo más importante de acá

No es una decisión de alcance: **es la línea entre escribir una página y
fabricar prueba.**

| Sección | Por qué queda afuera |
|---|---|
| **Opiniones** | Serían testimonios inventados de gente que no compró. Es lo primero que alguien captura de pantalla y publica, y es publicidad engañosa. La sección nace apagada justo por esto |
| **Garantía** | Es una **obligación que se asume**, no un texto de venta. Y **le gana al art. 1116**: la promesa de la página vale más que la excepción del Código. Una IA prendiéndola le crea a quien vende un compromiso de devolución que nadie leyó |
| **Oferta con fecha** | Es una fecha real. Inventarla es la cuenta regresiva mentirosa de la competencia, que ya se descartó por escrito |
| **Aviso de ventas** | Se llenaría con compras que no pasaron |
| **Precio** | Sale del producto. Copiado, el día que se corrige el precio la página sigue mostrando el viejo — y ese número es el que la persona lee antes de pagar |
| **Barra y Pie** | No son texto de venta, y el pie lleva el contacto y los legales de quien vende |

Escribe las **ocho de copy**: portada, qué te llevás, bonos, beneficios, esto te
suena, cómo funciona, preguntas frecuentes y cierre.

Y es una **lista blanca, no una negra**: con una negra, una sección nueva del
catálogo entraría sola en lo que la IA escribe, y la próxima que se agregue puede
ser otra "opiniones".

#### El esquema se DERIVA del catálogo

Escrito a mano se desincroniza: alguien agrega un campo a una sección y la IA no
lo llena nunca, sin que falle nada. Derivado, un campo nuevo entra solo y uno que
se saca deja de pedirse. **Es exactamente para lo que se hizo el catálogo
cerrado** — está escrito en la Fase 5: *"con un catálogo fijo, lo que la IA
devuelve se compara campo por campo contra la lista"*.

Y lo que vuelve pasa por `normalizarContenido`, **la misma puerta que usa el
editor**: descarta secciones que no existen, descarta campos que no existen y
recorta lo largo con el tope del catálogo.

⚠️ De paso, al modelo **se le dice** el tope de cada campo además de recortarlo
después: recortado a secas, una frase de 200 caracteres en un campo de 90 queda
cortada a la mitad de una palabra.

#### ⚠️ Es un MERGE, no un reemplazo

Regenerar el texto **no puede borrar el diseño** — el editor no tiene deshacer.
Lo que no se toca: el estilo, la paleta, la tipografía, el orden de las
secciones, qué secciones estaban prendidas, y los textos de las prohibidas.

Y un campo que el modelo no mandó conserva el que había, en vez de quedar hueco.

#### Lo que costó de verdad (medido)

**3.811 tokens de entrada, 1.963 de salida: US$0,041.** La mitad de lo que había
estimado (US$0,066). O sea:

| | Medido | En pesos |
|---|---|---|
| Las 3 fichas del embudo | US$0,0135 | ~$19 |
| La página | **US$0,041** | ~$57 |
| **Las dos juntas** | **US$0,054** | **~$76** |

Peor caso mensual, suponiendo que **todas** las generaciones sean de las caras:
Free US$0,16 una vez, Starter US$0,27/mes, Pro **US$0,54/mes** — el **1,3%** del
plan.

#### ✅ DECIDIDO (04/09/26): la primera página de cada producto no gasta cupo

Es lo que hace que *"armá tu embudo con IA"* entregue lo que promete. Sin esto,
armar el embudo y escribir su página cuesta dos generaciones, y quien prueba el
producto por primera vez se queda a mitad de camino sin entender por qué.

**No se puede abusar**, y por dos motivos que se sostienen solos:

1. La condición la verifica **el servidor contra la base** (`paginaVenta` en
   `null`), no la manda el navegador.
2. Hay **una página por producto del plan**: 1 en Free, 2 en Starter, 5 en Pro.
   O sea que las páginas gratis de una cuenta tienen un techo duro igual al de
   sus productos, y borrar uno para recrearlo cuesta una generación del cupo en
   el embudo.

Peor caso: 5 páginas gratis en Pro, unos **20 centavos de dólar** en toda la vida
de la cuenta.

#### El botón pregunta antes

Porque **pisa texto** y el editor no tiene deshacer. La ventana dice qué escribe,
**qué no toca** —lo que tranquiliza justo a quien ya tiene la página armada, que
es el que no se anima— y avisa fuerte si hay cambios sin guardar.

Y lo que devuelve entra **como borrador**: se ve en la previa que ya existe, y se
guarda con el botón de siempre. Si no gusta, se sale sin guardar y vuelve lo de
antes. La ruta del editor sigue siendo la única que escribe `paginaVenta`.

32 chequeos en `pagina-ia.check`. **73 pruebas** en total.

🔲 **Falta encadenarlo con el embudo**: hoy son dos botones en dos pantallas. El
"armar todo" de una sola vez va con el asistente de bienvenida.

### ✅ Dos correcciones salidas de mirar el asistente de la competencia (04/09/26)

Flavio creó una cuenta allá y mandó las pantallas. Antes de copiar nada,
aparecieron dos cosas que estaban mal de nuestro lado.

#### 1. ⚠️ Había DOS personas y sólo atendíamos a una

Su paso 3 pide **el título y la descripción del ebook escritos por la persona**,
y el botón dice *"Generar copys con IA"*: la IA de ellos **no propone el
producto**, redacta la landing de un producto que ya existe.

Eso destapa que hay dos situaciones distintas y las dos son reales:

| | Qué necesita | A quién servía |
|---|---|---|
| **"No tengo nada"** | Que le propongan el producto entero | ✅ el nuestro |
| **"Ya tengo el ebook"** | Ayuda para **venderlo**, no otro nombre | ❌ nadie |

A la segunda le inventábamos otro título y tenía que pisarlo a mano — al revés
de lo que le sirve. Ahora hay un campo **opcional** de título: *"Si ya lo tenés
escrito lo dejamos tal cual. Si no, te lo proponemos nosotros."*

⚠️ Y si viene, **se impone al normalizar**, no sólo se le pide al prompt. Un
modelo puede "mejorar" un título aunque se le diga que no, y el resultado sería
que alguien ve cambiado el nombre de un ebook que ya escribió. Pedirlo es una
sugerencia; escribirlo de vuelta es la garantía.

El bono y el upsell los sigue proponiendo la IA — eso ellos no lo hacen.

#### 2. El campo de la descripción estaba corto

Era de **600** caracteres. El de ellos acepta **10.000**, y tienen razón: quien
ya escribió su ebook quiere **pegar el índice entero**, y con 600 no entra ni la
mitad. Más texto de entrada es mejor salida y cuesta casi nada — 2.500 caracteres
son unos 600 tokens, menos de un quinto de centavo.

Subido a **2.500**. No a 10.000 porque pasado cierto punto lo que se agrega es
relleno, y el tope existe para que nadie mande un libro por el precio de un
párrafo.

#### Lo que se decidió NO copiar de su asistente

- **Su paso 1 (el selector Tienda / Checkout / Quiz).** Existe porque ellos
  venden tres productos; nosotros vendemos uno. Un selector con una sola opción
  es un clic de más y dos huecos a la vista.
- **El panel de 8 tutoriales en video.** Se contradice con su propia promesa:
  *"en menos de 5 minutos"* al lado de 50 minutos de video.
- **"landing page de alta conversión".** Es una promesa de resultados —
  exactamente lo que le prohibimos a nuestra IA escribir. No se puede prohibir
  adentro y ponerlo en la propia pantalla.
- **El selector de idioma**, con su *"no se puede cambiar después"*. Vendemos
  sólo en Argentina y el prompt está en rioplatense a mano; y una puerta de una
  sola dirección en el paso 2 es una trampa.

#### 🔲 Y lo que quedó anotado para cuando se haga el asistente

- **Su subdominio es de la CUENTA; el nuestro es de cada PRODUCTO.** Está
  decidido desde el 01/09 y es la Fase 5 bis. Por eso ellos piden la dirección en
  el paso 2 —con el marcador `mi-ebook`, porque no tienen con qué proponerla— y
  nosotros la podemos **proponer sola** desde el nombre del producto, en el paso
  final.
- ⚠️ **El asistente no se puede hacer antes que la Fase 5 bis**: terminaría
  entregando una dirección `/p/<id>` que después cambia, y todo lo que la persona
  compartió deja de andar.
- **Su paso 5 se llama "Listo" y promete "checkout con Mercado Pago… todo
  listo"** — pero conectar Mercado Pago saca de la aplicación y es un trámite
  aparte. El nuestro **no puede decir "listo" con el cobro sin conectar**.
- 🔲 **Ellos venden "Checkout solo"**, sin landing, para quien ya tiene tráfico y
  su propia página. Nosotros tenemos toda la maquinaria —checkout, cobro,
  entrega, pantalla de gracias— y no lo ofrecemos. Es una decisión comercial, no
  de diseño.

### ✅ 4.3 EL EBOOK CON IA — HECHO (04/09/26)

Lo que `/precios` vende y lo único por lo que alguien deja Free. Anda de punta
a punta: se pide desde la tarjeta del producto y termina con el PDF cargado
como su archivo.

**La pared que decidió todo el diseño.** Una función de este plan de Vercel
tiene 60 segundos. Un ebook son varios minutos, así que **no entra en un
pedido**. Quedó partido en tres rutas:

| | Qué hace | ¿Cobra? |
|---|---|---|
| `/ia/ebook` | arma el temario | sí, uno del cupo |
| `/ia/ebook/paso` | escribe **un** capítulo | no |
| `/ia/ebook/armar` | hace el PDF y lo cuelga del producto | no |

De yapa sale mejor escrito: a un modelo al que se le pide "escribime 40
páginas" de una se le afloja la mano a la mitad y termina resumiendo.

**Cerrar la pestaña no cuesta plata.** Cada capítulo se guarda apenas se
escribe (`EbookIA`), y volver a pedir el ebook de ese producto devuelve el
borrador donde estaba sin gastar nada. Es todo el motivo por el que el borrador
vive en la base.

**El candado, y por qué no alcanza con tomarlo.** Dos pedidos a la vez
escribirían dos veces el mismo capítulo. Pero el candado tiene que vencer —un
pedido muerto no puede trabar el ebook para siempre— y ahí aparece el caso feo:
el que tardó de más vuelve y guarda la lista que leyó ANTES, borrando el
capítulo del que lo reemplazó. Por eso al guardar se comprueba que el candado
siga siendo nuestro. Si no lo es, se tira lo escrito: costó plata, pero está
peor perder lo del otro.

**El único agujero sin fondo.** Escribir capítulos no gasta cupo —se pagó al
empezar—, así que un bucle mal escrito puede pedir "escribime el que falta"
para siempre: no le cuesta nada a la persona y nos cuesta a nosotros. El freno
es un presupuesto de llamadas **por ebook**, contra el id de ese ebook y no
contra la cuenta.

**Un tope que lo habría cortado por la mitad.** La ráfaga eran 8 llamadas cada
10 minutos, escrita para un botón de una sola llamada. Un ebook de 10 capítulos
son 11 llamadas seguidas: se cortaba en el capítulo 7 y la culpa parecía
nuestra. Los capítulos tienen ahora su propia ráfaga y no tocan los globales.

**Free tiene cero, y el cartel dice qué SÍ puede hacer:** subir su propio PDF y
venderlo igual. "No disponible en tu plan" deja a alguien pensando que no puede
vender.

**El PDF se arma con pdfkit, sin navegador.** Un Chrome adentro de una función
serverless pesa más de 100 MB y tarda segundos en arrancar. Las tipografías de
fábrica sólo entienden un byte, así que todo el texto pasa por un limpiador
antes de dibujarse: un emoji adentro de un párrafo saldría como un garabato en
un archivo ya cobrado. Medido: 19 páginas pesaron **21 KB** — el techo de
4,5 MB de la plataforma no lo roza.

#### Dos cosas que aparecieron haciéndolo

- 🔴 **La IA mandaba textos a un tercero sin declararlo.** La política de
  privacidad de digitales no nombraba a Anthropic ni mencionaba la IA, con el
  botón del embudo y el de la página de venta **ya andando**. Saltó recién al
  prender el del ebook, porque el seguro estaba puesto en ese botón y no en el
  primero. No llegó a producción —el ecosistema está detrás de una bandera
  apagada allá—, pero la declaración tenía que existir antes del primer botón.
  Entra el punto "2 ter" de la solapa digital.
- 🔴 **Un callejón sin salida al volver.** El bucle no arranca solo al reabrir
  una ventana dejada a medias, y el botón de seguir estaba sólo cuando había
  habido un error. Volver con todos los capítulos escritos y el PDF sin armar
  dejaba la lista tildada y nada que apretar: el ebook pago quedaba a un paso
  del final. Ahora el botón está siempre, y dice qué va a hacer.

#### 🔲 Lo único que queda

**Medir un ebook de verdad.** Nunca se generó uno completo: la estimación de
US$2–4 sigue sin verificar y `EBOOKS_IA_ARRANQUE` / `ebooksIA` siguen siendo
provisorios hasta esa medición. Cuesta plata real, así que se hace a pedido.

⚠️ Y desde este commit, **el botón anda en local**: apretarlo gasta de verdad.

### 4.3.1 EL DISEÑO DEL PDF — en curso (07/09/26)

**Por qué se abrió esto.** El ebook andaba, pero el archivo era texto negro
sobre blanco. Comparado contra un recetario real hecho en Canva —46 hojas, una
foto por hoja— la diferencia no eran los colores: eran **fotos, moldes por tipo
de hoja, y contenido con estructura** en vez de párrafos sueltos.

**Lo que ya está:**

- ✅ **Tapa con foto**, tema claro y oscuro, sello con la cantidad de capítulos.
- ✅ **Portadilla por capítulo**: número grande, foto y una caja "En este
  capítulo" armada con los subtítulos que el modelo ya escribía y se tiraban —
  no costó ni una llamada más.
- ✅ **Muebles en cada hoja**: encabezado con el capítulo, franja al pie con la
  marca de quien vende, número de página.
- ✅ **Fotos de Pexels** (`src/lib/fotos-pexels.ts`). Todo devuelve `null` ante
  cualquier problema: un ebook sin fotos es el que se entregaba antes, un ebook
  que no se arma es plata cobrada sin nada que entregar. Tope: 25.000 búsquedas
  por mes, y un ebook usa 9.
- ✅ **Hoja de créditos**. ⚠️ No es cortesía: las reglas de la API de Pexels
  piden enlace visible y acreditar al fotógrafo, y esto se vende.
- ✅ **Tipografías propias** (Playfair Display + Lora, OFL, en `fuentes/`).
  Declaradas en `next.config.ts` — sin eso no viajan a producción.

**Tres errores que aparecieron y ya están arreglados**, anotados porque los tres
sólo se ven en un ebook largo y ninguno lo hubiera encontrado una prueba corta:

1. El pie de página se dibujaba abajo del margen, pdfkit lo tomaba como "no
   entra", abría otra hoja, y eso disparaba otro pie: **recursión infinita**.
2. Los muebles cambian la tipografía en el medio de un párrafo, así que **el
   resto de cada párrafo cortado salía con la letra del pie**.
3. Las viñetas de dos renglones volvían al margen (`indent` en pdfkit corre
   sólo el primer renglón).

**Lo que falta, en orden:**

- ✅ **Las pruebas del código nuevo** (07/09/26). `ebook-pdf.check.ts` y
  `fotos-pexels.check.ts`: el contraste de las 6 paletas contra los dos fondos,
  el respaldo de tipografías, que una foto rota no voltee el armado, y que las
  viñetas no filtren hojas. Esa última se probó rompiendo el código a propósito:
  con el error da 14 hojas contra 11.
- ✅ **El cambio a lo que se le pide al modelo** (07/09/26). Las dos cosas en el
  mismo lugar, verificadas con **una sola llamada de US$0,046** en vez de un
  ebook entero:
  - qué foto buscar en cada capítulo. Antes se buscaba por el título y salía
    cualquier cosa. **Medido: de 5 fotos del tema sobre 8, a 10 sobre 10.**
  - `aviso`, el cuarto tipo de bloque, que sale como recuadro de color.
- ✅ **Elegir formato, tema y color** (07/09/26). `ebook-opciones.ts` y los
  botones en `EbookIA.tsx`. ⚠️ Se guardan **adentro del JSON de `indice`, no en
  columnas**: agregar columnas es una migración y esta base es la de producción.
  Cuando haya deploy, mudarlo es cambiar `leerOpciones` y dónde escribe la ruta.
  - El color sale de las 6 paletas y **no hay selector libre**: cada paleta trae
    el acento y el texto que va encima medidos entre sí. Con un color a
    elección, una franja ilegible queda adentro de algo ya vendido.
  - Por defecto, "el de tu página": si no elige, el ebook sigue a la página que
    lo vendió, como hasta ahora.
- ✅ **Que el modelo escriba recetas** (07/09/26). `INSTRUCCIONES_RECETAS`,
  `ESQUEMA_DE_RECETAS`, `normalizarRecetas` y `pedidoDeRecetas` en
  `ebook-ia.ts`. Probado con una llamada de verdad y dibujado en el molde: sale
  con cantidades en gramos, temperaturas y palabras de acá (manteca, repasador,
  mesada). ⚠️ Se le tuvo que decir **aparte** que los números SÍ van: con las
  reglas del ebook de texto puestas —que le prohíben inventar cifras— devolvía
  "harina, cantidad necesaria" y la receta no servía. Ver `REGLAS_DE_RECETA`.
  - **Tres recetas por llamada, no cinco.** Medido: cinco se cortaron en
    `max_tokens` y **no volvió ninguna** —se pagaron US$0,046 por nada—; tres
    salieron completas en 28,9 s por US$0,035. Una receta son ~950 tokens, no
    los 400 estimados. El techo que muerde primero **no es la plata, es el
    reloj**: la función se corta a los 60 segundos.
  - **Cuánto sale un recetario:** ~1 centavo por receta. 10 → US$0,12;
    20 → US$0,23; **30 → US$0,35**, lo mismo que hoy sale un ebook de texto.
- ✅ **Que una receta entre en UNA hoja, siempre** (07/09/26). Es la promesa
  entera del formato: quien cocina apoya el teléfono y lee de ahí. Con las tres
  recetas de verdad salieron **9 hojas para 3 recetas**. Cuatro causas, las
  cuatro medidas y las cuatro arregladas:
  1. La foto cuadrada de al lado del título medía siempre 148 puntos y empujaba
     todo 160 abajo — **más que la banda ancha que no había entrado**. Ahora
     mide lo que mide el título más lo que de verdad sobre.
  2. Ocho pasos de tres renglones no entran a tamaño normal. La hoja ahora
     **aprieta** en vez de partirse: tres densidades (`HOLGADA`, `APRETADA`,
     `AL_LIMITE`) y se toma la primera que da.
  3. `lineBreak: false` **no impide que pdfkit parta el renglón** cuando hay
     `width`. El segundo pedazo caía encima del renglón siguiente: se leía
     "1 cucharadi" y abajo, superpuesto a "300 ml", un "ta". Se recorta antes
     de dibujar (`recortarAlAncho`), y el cuerpo se achica antes de recortar.
  4. La descripción se limaba con 400 caracteres —el largo del resumen de un
     capítulo— y ocupaba cinco renglones. Ahora tiene el suyo (120).
  - `PASOS_MAX` bajó de 9 a 8 y `LARGO_PASO` de 200 a 160, porque con los de
    antes **la receta más grande que el limado dejaba pasar no entraba ni con la
    maqueta más apretada**: faltaban 32 puntos. Un tope que el molde no puede
    cumplir no es un tope.
  - Candados nuevos: **PDF-W** (la receta más grande posible entra en una hoja),
    **PDF-X** (una corta no desperdicia), **PDF-Y** (la del medio, que es la que
    se rompió — con una foto que se puede abrir de verdad). PDF-Y se verificó
    rompiendo el código a propósito: con la foto fija da 9 hojas contra 6.
- ✅ **Que no se le coma una letra al nombre de nadie** (07/09/26). La hoja de
  créditos mostró "dil Ceren Çelikler": `soloLoQueEntra` descartaba entera
  cualquier letra latina con un acento que la tipografía no tiene. Los nombres
  del banco de imágenes son de todo el mundo, y esa hoja existe **justamente
  para acreditarlos**. Ahora cae a la letra sin el adorno (PDF-Z).
- ✅ **El recetario enchufado de punta a punta** (07/09/26). `"recetario"` ya
  está en `FORMATOS_LISTOS`: se puede elegir en la pantalla y sale un recetario.
  **Probado de verdad: 10 recetas, 5 llamadas, US$0,1308, 106 segundos, 13 hojas
  —tapa, contenido, una hoja por receta y créditos—.**
  - **El número de recetas lo elige quien vende** (10 / 20 / 30), no el modelo.
    Va en la tapa —"10 RECETAS"— y es lo que justifica el precio. El control
    aparece sólo cuando se elige Recetario; en un ebook de texto no significa
    nada.
  - ⚠️ Los tres números no son redondeos lindos: **caen justo** con lo que el
    resto aguanta. Cada llamada escribe `RECETAS_POR_LLAMADA` (3) y el temario
    no pasa de `CAPITULOS_MAX` (10) secciones, así que 30 es el techo real. Con
    40, `leerIndice` cortaría cuatro secciones **sin decir nada** y se cobraría
    un recetario de 40 para entregar uno de 30. Lo cuida OPC-S.
  - **El bucle de las tres rutas no cambió.** Una sección = una llamada = una
    entrada del temario, igual que un capítulo en un ebook de texto, y las dos
    cosas se guardan en la misma columna con la misma forma de afuera. Por eso
    "¿cuál sigue?", el candado, el presupuesto por ebook y la barra de la
    pantalla siguen siendo los mismos.
  - Y la última sección pide **el resto**, no tres: con 10 elegidas son 3, 3, 3 y
    1. Si pidiera tres igual, saldrían 12 adentro de algo vendido como de diez.
- ✅ **Dos cosas que aparecieron al mirar el recetario terminado** (07/09/26):
  1. **La tapa salió sin la línea de abajo del título.** El prompt se
     contradecía solo: las reglas de receta prohíben las promesas y el temario
     pedía "una promesa". El modelo obedeció la prohibición y la dejó vacía.
     Ahora dice con todas las letras que esa línea es una descripción del
     contenido y que nunca va vacía. Verificado por **US$0,0089** (REC-O).
  2. **Un paso terminaba a mitad de frase**: "…enfriando 10 minutos **en**".
     `limpiarTexto` corta en el carácter que toca, y en una receta eso deja a
     quien está amasando sin saber qué seguía. Ahora corta en el último punto
     (`cortarEnUnaIdea`) **y** el prompt le dice al modelo cuántos caracteres
     entran, que es lo que de verdad evita el corte (REC-K a REC-N).
- ✅ **Lo que la pantalla dice mientras escribe** (08/09/26). Tres cosas que
  estaban mal y ninguna se ve leyendo el código: se ven usándolo.
  1. **El cartel prometía que seguía solo.** Decía *"Podés cerrar esta ventana…
     cuando vuelvas sigue desde donde iba"*, y eso se lee como que hay alguien
     escribiendo del otro lado. **No lo hay**: el bucle vive en la pantalla, así
     que irse a otro panel FRENA la escritura. Alguien se iba creyendo que su
     ebook se estaba escribiendo y volvía media hora después al mismo lugar.
     Ahora dice las dos cosas —que hay que quedarse, y que si igual se va no
     pierde nada y retoma con un botón— (PAN-E, PAN-E2).
  2. **La barra contaba secciones en un recetario.** A alguien que eligió 10
     recetas le decía "2 de 4". Ahora `EstadoDelBorrador` cuenta **en la unidad
     que eligió la persona** (PAN-E4, REC-F).
  3. **La tarjeta decía "capítulos" en un recetario**, que no tiene. Ahora sale
     de `COMO_SE_LLAMA`, con el formato que viaja en el estado (PAN-J).
  - Y de paso se sacó *"Vas a poder leerlo y cambiarlo antes de publicar"*, que
    prometía un editor que no existe. Vuelve cuando el editor exista (PAN-E3).
- ✅ ~~**Que la escritura no dependa de la pestaña abierta.**~~ **HECHO
  (08/09/26).** Cada capítulo llama al siguiente del lado del servidor, y el
  último llama a armar el PDF (`lib/ebook-cadena.ts`). La pantalla pasó a
  **empujar el primer eslabón y después mirar**: pregunta el estado cada cuatro
  segundos contra `ia/ebook/estado` —una ruta nueva que sólo lee— para dibujar
  la barra. Cerrar la ventana ya no frena nada, y el cartel dice eso.
  - **La cadena reenvía la cookie del pedido**, no un secreto de servidor. Un
    secreto obligaba a una puerta aparte en la ruta y a dar vuelta el control de
    dueño —sacarlo de la fila que se va a escribir en vez de meterlo en el
    `where`—; con la cookie, el eslabón siguiente entra por la misma puerta que
    el navegador y no hubo que tocar una sola guarda (CAD-A, CAD-B).
  - **No hacía falta un cron**: en este plan corren una vez por día, así que un
    ebook habría tardado diez días. Y `after()` solo no alcanza: alarga la
    función pero no le regala tiempo, sigue atada a los 60 segundos.
  - ⚠️ **El eslabón del final es el que más caro salía de olvidar.** La pantalla
    armaba el PDF al salir del bucle; sin encadenar hasta `armar`, la cadena
    escribiría los diez capítulos con la pestaña cerrada y el archivo no
    existiría igual — un ebook pago sin nada que entregar (CAD-C).
  - Y hay red por si un eslabón se muere sin dejar error: a los 90 segundos sin
    que avance el contador, la pantalla vuelve a mostrar el botón de seguir a
    mano (PAN-P2). Sin eso, un ebook trabado se vería "escribiéndose" para
    siempre y sin salida.
- ✅ ~~**Formato infografía**: foto a sangre por hoja con el texto encima. Es el
  barato: **usa el texto que ya se genera, tal cual**.~~ HECHO el 14/09/26, y
  **no como decía acá**: lo "barato" ya lo hacía `cartel`, y lo que faltaba era
  un formato de verdad, una idea por hoja. Ver *La infografía: el tercer
  formato*, al final del documento.
- ✅ ~~**Más de un diseño de hoja.**~~ HECHO el 09/09/26. Ver *Los cuatro moldes*
  más abajo.
- ✅ ~~**Poder leer y corregir EL TEXTO.**~~ HECHO el 09/09/26, para el ebook de
  texto. Ver *El editor del texto* más abajo.
  - 🔲 **Falta el del recetario.** Una receta no son párrafos: son campos, y los
    topes son del molde del PDF y no perdonan —un paso son 160 caracteres, 8
    pasos, 14 ingredientes—. Un campo libre deja que alguien arregle una frase y
    **rompa el PDF sin que nada avise**, y se entere después de venderlo. Cada
    campo va con su tope y su contador a la vista. Por eso el botón hoy no
    aparece en un recetario, y la ruta lo dice con todas las letras.

### ✅ El editor del temario — HECHO (08/09/26)

El primero de los dos editores, y **a propósito el primero**: es el único
momento en que corregir sale gratis. Cada capítulo se escribe leyendo su título
y su resumen del temario y nada más, así que un renglón cambiado acá cambia el
capítulo entero **antes de que exista**. La misma corrección después de escrito
cuesta rehacer el ebook.

**Lo que cambió de fondo: la pantalla FRENA.** Antes el temario se armaba y el
bucle arrancaba solo — se escribían diez capítulos sobre un temario que nadie
había leído. Ahora sale un paso nuevo (`revisar`) entre armar y escribir. Y se
puede volver al temario a media escritura, para corregir **lo que falta**.

Se puede tocar el título del ebook, la promesa de la tapa, y de cada capítulo el
título, el resumen y **qué foto buscar** — el campo que arregló las fotos de otro
tema. Agregar, borrar y reordenar, en un ebook de texto.

- **`lib/ebook-temario`** — la regla, aparte de la ruta: entra lo que mandó el
  navegador, sale un temario limado o un motivo escrito. No toca la base, así
  que se prueba entera sin base ni claves (TEM-A … TEM-V).
- **`/api/digitales/ia/ebook/indice`** — GET para leerlo, POST para guardarlo.
  Es la cuarta ruta del ebook y **la única que no gasta un peso**.
- **La pantalla decide con la MISMA función que el servidor.** Escribir acá una
  versión parecida de las reglas es el camino conocido a que el botón se prenda
  y el servidor conteste que no (TEM-AB).

**⚠️ Las tres cosas que no se pueden hacer, y por qué.**

1. **Tocar lo que ya está escrito.** El capítulo escrito Nº 3 es el de la
   entrada Nº 3 **por su posición y por nada más**. Moverla deja el texto de uno
   abajo del título de otro — y eso *no falla*: sale un PDF perfecto que dice
   cualquier cosa. Por eso el prefijo sale de la base y no de lo que llegó: ni
   un pedido hecho a mano puede correr las posiciones (TEM-D, TEM-E).
2. **Cambiar cuántas secciones tiene un recetario.** No son capítulos: son el
   reparto de las recetas que se eligieron y se pagaron. Sacar una de uno de 30
   entrega 27 con "30 RECETAS" en la tapa (TEM-G).
3. **Guardar sin las opciones que ya estaban.** Formato, tema, color y cantidad
   de recetas viven adentro del mismo JSON que el temario: reescribirlo sin
   leerlas las borraría —un recetario volvería a ser un ebook de texto a mitad
   de camino— y tomarlas del cuerpo dejaría cambiar por acá lo que se cobró
   (TEM-W).

**El candado, dos veces.** Se toma antes de guardar —`/paso` está leyendo de
acá— y **con el candado en la mano se vuelve a leer la fila**: entre el primer
`SELECT` y el candado puede haberse escrito un capítulo, y ese ya no se toca
(TEM-X, TEM-Y).

**Y avisa antes de perder lo escrito a mano.** Esta ventana se cierra con un
clic en el fondo, y hasta acá eso no tenía nada que perder. Usa la misma guarda
del editor de la página de venta, que además tapa la barra lateral.

### ✅ El editor del texto — HECHO (09/09/26)

El segundo de los dos, del otro lado de la escritura. **La quinta ruta del ebook
y la segunda que no gasta un peso**: acá no vuelve a escribir la IA, corrige la
persona.

**Es una pantalla, no una ventanita — y esto se corrigió el mismo día.** Nació
como un quinto paso adentro del modal del ebook y estaba mal: un modal de 576 px
es para decidir una cosa —*"¿lo escribo?"*, *"¿lo rehago?"*—, no para sentarse a
corregir diez capítulos de novecientas palabras en algo que se cierra con un clic
al costado. Vive en **`productos/[id]/ebook`**, con su "volver" y la barra
lateral al lado, que es el mismo molde del editor de la página de venta. Y por
eso el texto se lee **del lado del servidor**, en el mismo viaje en que se arma
la página: pedirlo desde el navegador era una pantalla en blanco con un reloj
girando mientras viajaban decenas de miles de caracteres.

**Y antes que nada: el archivo ahora se puede bajar.** En la tarjeta había un
renglón de texto gris —*"Archivo: guia.pdf · 2,1 MB"*— y nada más. O sea que
cuando la IA terminaba de escribir un ebook, lo que acababa de costar una
generación aparecía como una línea entre otras y **la única forma de ver el
propio ebook era comprárselo** — mientras la ventana pedía "leelo antes de
publicarlo". Ahora es una caja con las dos cosas que se hacen con un archivo:
**Descargar** y **Editar el contenido**. La descarga va por
`/api/digitales/productos/[id]/archivo`, que **no es la ruta de entrega**: pide
sesión, el dueño va adentro del `where`, no descuenta ninguna de las cinco
descargas del comprador y devuelve un enlace firmado de cinco minutos, sin caché.

Existe porque la ventana termina diciendo *"leelo antes de publicarlo, quien
vende es quien responde por lo que dice"* — y hasta ayer, quien lo leía y
encontraba una macana no tenía con qué arreglarla: el único botón era
**Rehacerlo**, que tira el ebook entero y cobra otra generación por una palabra.

**Lo que cuida, por orden de gravedad:**

1. **No se puede guardar un capítulo con menos de `BLOQUES_MIN` pedazos.** Es la
   regla con la que `leerCapitulos` descarta, y por eso el `3` dejó de estar
   suelto adentro de `normalizarCapitulo`: guardar un capítulo corto no falla en
   ningún lado, el capítulo **desaparece la próxima vez que se lee** y todo lo de
   abajo se corre un lugar. Sale un PDF perfecto con el texto del 4 abajo del
   título del 3. Es el mismo desastre que cuida el editor del temario, entrando
   por la otra puerta — y por eso el botón de borrar **se apaga en el mínimo** en
   vez de dejar borrar y avisar después.
2. **Lo que la cadena escribió mientras alguien corregía no se borra.** El
   editor abierto no frena nada del lado del servidor: lo que llega del navegador
   pisa los primeros capítulos y los de abajo se mantienen tal cual.
3. **Nada se descarta en silencio.** `normalizarCapitulo` sí lo hace, y ahí está
   bien: del otro lado hay un modelo. Acá hay una persona que acaba de escribir
   eso.
4. **El PDF colgado del producto es el de antes.** Guardar baja el ebook de
   `LISTO` a `COMPLETO` —que es lo que de verdad es, escrito y sin archivo— y el
   editor lo rehace enseguida, con un solo botón. Si el armado falla, el texto ya
   quedó guardado y se vuelve a la pantalla del avance, que es la que sabe
   reintentarlo. **El archivo viejo no se borra**: hasta que esté el nuevo, quien
   compre recibe ése. Un ebook con una falta de ortografía es mejor que un
   producto cobrado sin nada que entregar.

La prueba que resume todo es la de ida y vuelta (`TXT-J`/`TXT-K`): lo que el
editor deja guardar, el lector lo lee **igual**, ni un pedazo ni un tipo cambian.

---

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
- ✅ ~~El aviso de que **con transferencia la entrega no es automática**, antes de
  comprar y no después.~~ Ya no hace falta: la transferencia se sacó del
  ecosistema el 14/09/26. Ver *Sólo Mercado Pago*.

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

### ✅ Cada vendedor publica SUS documentos — HECHO (03/09/26)

Lo encontró una auditoría que salió de una pregunta suya: *"¿cubrimos a los
dueños de tiendas de productos digitales, o ellos mismos tienen que armar sus
políticas como hicimos con las tiendas?"*. La respuesta era **ni una cosa ni la
otra**, y era el peor de los dos mundos.

**El pie de cada página de venta linkeaba a `/terminos` y `/privacidad`: los
documentos de TiendaApps.** O sea que quien compraba un ebook leía NUESTROS
términos creyendo que eran los de quien se lo vendía. Y contradecía de frente lo
que esos mismos términos dicen —"TiendaApps no es parte de esa relación de
consumo"—, porque el pie de esa misma venta afirmaba que los nuestros la rigen.
En una denuncia gana lo que el comprador vio, no lo que el contrato afirma.

En tiendas nunca pasó: cada dueña escribe las suyas desde el primer día.

**No hizo falta infraestructura nueva.** Las columnas viven en `Store` y una
cuenta digital ya tiene la suya —la invisible que le presta el motor—, así que
fue elegir tres de las cuatro que ya estaban. **Tres y no cuatro: no hay envíos
que declarar**, y una "Política de envíos" en la página de un ebook le hace creer
a quien compra que hay un despacho en el medio.

Lo nuevo: la solapa **Legales** en Configuración, y `/p/<id>/legales` para el
público.

**Cuelga del PRODUCTO y no de la tienda** porque la tienda de una cuenta digital
es invisible y su dirección no lleva a ningún lado. Lo que la persona conoce es
el producto: llegó por `/p/<id>`. Es además la dirección que va a heredar el
dominio propio de la Fase 5 bis, sin mudar nada.

**Se dibuja con los colores y la letra de SU página**, no con los del panel: un
salto a otro diseño se siente como haberse ido del sitio de quien vendió, que es
lo contrario de lo que esta página existe para dejar claro.

**Y los nuestros no desaparecen: quedan abajo y etiquetados** como "De la
plataforma", con la aclaración de que no reemplazan a los de quien vende.
Existen —el cobro y la entrega los hacemos nosotros— pero no rigen esa venta.

**Los ejemplos son borradores, no plantillas que se guardan solas.** Hay que
copiarlos, editarlos y apretar Guardar, y el cartel dice "lo que quede escrito te
obliga a vos". Un documento legal que nadie leyó es peor que ninguno: promete
cosas que no se piensan cumplir, y responde quien vende.

⚠️ **El chequeo viejo daba verde justo por el error.** PIE-D exigía
`href="/terminos"` — o sea, exigía que el pie mandara a los documentos de la
plataforma. Ahora exige lo contrario.

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

**⚠️ El desplazamiento me lo mandé mal la primera vez, y él lo vio a 768.** Puse
`top-14`, razonando que el contenedor que scrollea arranca en el borde de la
pantalla y que los primeros 56 px se los tapa la barra fija del celular. Pero ese
contenedor (`<main>`) **ya tiene `pt-14` justamente para eso**, y el
desplazamiento de lo pegado se cuenta desde donde arranca su contenido. O sea que
los 56 px se sumaban dos veces: la barra quedaba flotando 56 px abajo de la del
celular, con contenido asomando en el medio — que es exactamente como se ve algo
que NO se pega. Va `top-0`, y el chequeo ahora prohíbe cualquier otro
desplazamiento en vez de exigir uno.

**Y la grilla se estiraba con su contenido, cortando el editor a 360.** Abajo de
`lg` no declaraba ninguna columna, así que la única que hay se dimensionaba sola:
una columna `auto` mide **al menos el contenido más ancho que tenga adentro**, y
no le importa que el contenedor sea más angosto. Con un solo hijo que no supiera
achicarse, la columna entera se estiraba y arrastraba a todo lo demás — a cada
tarjeta de sección le quedaban los botones afuera de la pantalla, cortados por el
`overflow-x-hidden` del panel. `grid-cols-1` de Tailwind es
`repeat(1, minmax(0, 1fr))`: mínimo **cero**. Es la misma cuenta que ya hacían
los `minmax(0, …)` del `lg:` de al lado; faltaba para pantalla chica.

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

✅ **Cada reenvío queda anotado** (03/09/26). Ver la sección siguiente: estudiando
si hacía falta un contador apareció algo más grande, y se resolvió con una tabla.

### ✅ EL DETALLE DE UNA VENTA — HECHO (03/09/26)

`/digitales/ventas/<id>`. **Es la carpeta que se abre cuando alguien reclama.**

#### El agujero que tapa

El sistema venía guardando dos pruebas y **no había ninguna pantalla que las
mostrara**: la casilla del art. 1116 —con su fecha, su IP y el texto exacto que
esa persona leyó— y una fila por cada descarga. Guardadas y mudas. *Una prueba
que no se puede mostrar no es una prueba.*

Y contra un contracargo de Mercado Pago no se gana con la ley: se gana pegando en
el formulario de la disputa que el 3 de septiembre a las 14:02, desde tal IP, esa
persona aceptó una frase que decía que no iba a poder devolverlo, y que a las
14:03 bajó el archivo. Eso es esta pantalla.

#### Qué muestra

- **Los importes**, con el porcentaje de comisión **de la orden** y dicho: *"8%
  de tu plan de ese día"*. Sin eso, alguien que pasó de Free a Pro ve un
  descuento que no coincide con su plan de hoy y cree que le cobramos de más.
- **Quién compró** — correo, nombre y teléfono si lo hay.
- **Cada línea con su permiso** — descargas usadas sobre el tope, cuándo vence el
  enlace, y el aviso de "nunca lo bajó" cuando corresponde.
- **Cada descarga, una por una** — fecha con segundos, IP y navegador. El
  `User-Agent` se muestra resumido (*"Chrome en Android"*) con la cadena entera
  plegada abajo, para poder pegarla.
- **Qué aceptó antes de pagar** — el texto **guardado en la orden**, no la
  constante de hoy. Si leyera la constante, una venta de hace seis meses mostraría
  una frase que su comprador nunca vio, que es exactamente lo contrario de una
  prueba.
- **Los dos números que se piden en un reclamo** — el de la venta y el del pago en
  Mercado Pago, con botón de copiar **y a la vista**: `navigator.clipboard` no
  existe fuera de un contexto seguro, así que tiene que poder copiarse a mano.
- **Qué le fue pasando** — los `OrderStatusLog`, traducidos. Y las marcas que no
  se conocen se muestran crudas: inventarles una frase sería tapar información en
  la única pantalla donde importa que esté completa.

#### Las tres decisiones que se cuidaron

1. **El `storeId` va DENTRO del `where`, no en un `if` después de leer.** Es la
   única línea que separa esta pantalla de *"poné el id de la venta de otro y
   mirale el correo del comprador"*. Buscando con los dos, una venta ajena
   directamente no existe: no hay nada que filtrar mal más abajo.
2. **El token de descarga no se muestra en ningún lado.** Quien vende no lo
   necesita —para ayudar está "Reenviar el mail", que va al correo de la venta— y
   a la vista en el panel es un archivo que se reparte por fuera del tope de 5, y
   encima con la cara de quien vendió.
3. **El navegador no se adivina.** Si la cadena no se reconoce se muestra cruda:
   escribir "Chrome" donde no se sabe es fabricar prueba. Y el orden de las
   preguntas importa —Edge y Opera también dicen "Chrome" en su cadena, y Chrome
   dice "Safari"—, así que preguntando al revés todo termina siendo Chrome.

#### Lo que se acomodó de paso

**"Reenviar el mail" pasó a ser un componente compartido** (`BotonReenviar`).
Estaba metido adentro de la tarjeta de la lista, y el detalle lo necesitaba
igual: copiado, el día que cambie el aviso cambia en uno de los dos, y el freno
del doble click se copia mal en el otro. En el detalle además refresca la
pantalla al terminar, porque ahí se muestra el vencimiento del enlace y si no
seguiría diciendo la fecha vieja.

**Y la lista linkea al detalle desde TODAS las filas**, no sólo las cobradas: una
devuelta es justo la que hay que poder abrir.

13 chequeos nuevos (sección 19 de `panel-digitales.check`).

### ✅ EL REGISTRO DE ENVÍOS — HECHO (03/09/26)

**La pregunta era chica y la respuesta salió grande.** Faltaba anotar cuántas
veces se había reenviado un mail. Estudiando dónde ponerlo apareció esto:

> **Nadie podía contestar "¿salió el mail?".**

El mail de entrega se manda con `despues`, fuera de la respuesta al aviso de
Mercado Pago. Si fallaba, `despues` se lo tragaba en un `console.error` que nadie
lee. Resultado: **la venta figuraba Cobrada, quien compró no recibía nada, y no
quedaba un solo rastro en la base.** Quien vende se entera cuando le reclaman — o
no se entera nunca y pierde al cliente sin saber por qué.

#### ⚠️ Y había algo peor: el SDK de Resend no tira error, lo devuelve

`resend.emails.send()` (v6) contesta `{ data, error }`. Cuando la API rechaza el
mail —dirección inválida, dominio sin verificar, cuota agotada— **la promesa se
resuelve igual**, con el error adentro. O sea que el `try/catch` que había
alrededor **no se enteraba de nada** y el código seguía como si el mail hubiera
salido.

Eso vale para **todos los mails del proyecto**, no sólo para éste.

✅ **El barrido de los otros senders** — HECHO (04/09/26). Ver la sección
siguiente. Y con una corrección de tamaño: eran **22 senders en un solo archivo**,
no ~30 repartidos por el proyecto. `lib/email.ts` ya lo miraba desde julio.

#### Cómo quedó

`DigitalEnvioLog`: una fila por mail de entrega, con motivo (**ENTREGA**, el
automático del cobro, o **REENVIO**, el botón), estado (**ENVIADO** o **FALLO**),
a qué dirección salió y qué dijo el error.

- **Los dos caminos pasan por la misma función** (`mandarLaEntrega`, en
  `lib/envio-digital`). Escritos por separado, uno de los dos se olvida de anotar
  y el agujero vuelve por la mitad.
- **Se anotan los fallos igual que los éxitos.** Un registro que sólo guarda los
  éxitos no contesta la única pregunta por la que existe.
- **Sin la clave de Resend también es un FALLO**, no un silencio: para quien
  compró, un mail que no salió porque falta una variable de entorno y uno que
  Resend rechazó son la misma cosa — no le llegó.
- **Anotar no puede voltear una entrega ya pagada.** Misma regla que el registro
  de descargas: un apunte que falla no puede negar un archivo cobrado.
- **Si la entrega automática falla, le llega un aviso a quien vendió** con el link
  a **esa** venta, que es donde está el botón de reenviar. Un fallo anotado en una
  tabla que nadie mira no arregla nada.
- **No se reintenta solo.** Un reintento automático de un mail rechazado por
  dirección inválida son dos rechazos en vez de uno; y si la cuota se agotó, el
  segundo tampoco entra. El camino de vuelta es el botón, que lo aprieta una
  persona cuando ya sabe qué pasó.

#### Un texto que había quedado mintiendo

El aviso de la campanita decía *"Ya le mandamos el archivo a quien compró"* — y se
escribe **antes** de que el mail salga. Es a propósito que se escriba antes: si
esperara al mail, una entrega fallida dejaría a quien vende sin enterarse de que
vendió. Pero entonces no puede afirmar algo que todavía no pasó. Ahora dice *"Le
estamos mandando el archivo por mail"*, y si no sale, llega un segundo aviso
diciéndolo.

#### En el detalle de la venta

Una sección nueva con cada mail y su resultado. Y cuando alguien pagó y **ningún**
mail salió, el aviso va **arriba de todo**, en rojo y con `role="alert"`: es lo
único de esa pantalla que no puede esperar a que se scrollee, porque cada hora que
pasa es una hora en la que esa persona cree que la estafaron.

⚠️ Y **sin filas no se afirma nada**: una venta anterior al 03/09/26 no tiene
registro, y lo único cierto ahí es que no sabemos. Decir "no salió" mandaría a
quien vende a molestar a un cliente contento.

#### La migración

`20260903180000_registro_de_envios`. Aditiva —una tabla nueva, nada existente
cambia de forma ni de significado— e idempotente. **Corrida contra la base real
el 03/09/26**, con permiso expreso. Sin deploy.

8 chequeos nuevos (ENV-A … ENV-H en `entrega-digital.check`) y 3 más en el panel.

### ✅ EL BARRIDO DE LOS MAILS — HECHO (04/09/26)

**Esto no es de digitales, y por eso se hizo primero.** Los 22 senders de
`lib/resend.ts` son los de **tiendas**: confirmar la cuenta, recuperar la
contraseña, los pedidos, la suscripción, las denuncias, la canasta. Están
andando en producción con gente real. Digitales todavía no vendió nada; tiendas
sí. Así que el mismo agujero que en digitales era un pendiente, acá era un
problema vivo.

#### Lo que se midió antes de tocar

Dos correcciones sobre el tamaño que había estimado:

- **No eran ~30 repartidos por el proyecto: eran 22 en un solo archivo.**
- **`lib/email.ts` ya lo miraba bien.** Sus 25 mails pasan por un adaptador que
  convierte el `error` en excepción. Se arregló en julio de 2026, cuando el SMTP
  de Gmail devolvía EAUTH 535 y el error se perdía en un `.catch()`: 25 mails
  muertos en silencio durante días. **`lib/resend.ts` se quedó afuera de aquella
  corrección y nadie lo notó** — porque un mail que no llega no hace ruido en
  ningún lado.

#### Cómo se arregló: envolviendo el cliente

En vez de tocar los 22 senders uno por uno, el cliente de Resend queda envuelto:
`clienteResend` es el de verdad y se usa **en un solo lugar**, adentro de un
envoltorio que mira el `error` y lo deja escrito con el **asunto** y el
**destinatario**. Las 22 funciones no cambiaron una línea y ninguna puede volver
a fallar callada.

#### Por qué se loguea y no se tira, al revés que en `email.ts`

Porque los llamadores son distintos. Los de `email.ts` venían de nodemailer, que
tiraba: ya estaban escritos para que un mail fallido no voltee nada. Los de
`resend.ts` se escribieron contra una función que **nunca** tiraba, y hay varios
`await sendLoQueSea(...)` sueltos adentro de rutas sin `try`. Convertirlos de
golpe en excepciones haría que **un registro fallara entero porque no salió el
mail de bienvenida**. Eso es peor que el problema.

El piso es "nunca más en silencio". Arriba de ese piso van los que sí tienen que
avisar.

#### Un respaldo que estaba escrito y era inalcanzable

`api/auth/reenviar-confirmacion` tiene **dos caminos**: el mail propio y, si
falla, el reenvío de Supabase con su plantilla. El camino 2 estaba escrito,
andando… y no se probaba nunca para este fallo: como el envío no tiraba, la ruta
contestaba "listo" apenas mandaba. La persona veía *"te lo reenviamos"*, no le
llegaba nada, y **el respaldo que existía justo para eso no se ejecutaba**.

Ahora `sendConfirmEmail` devuelve si salió, y si no salió se cae al camino 2. Sin
ese mail la persona **no puede entrar nunca**: no hay otra forma de confirmar la
cuenta que acaba de crear.

#### La excepción decidida: recuperar la contraseña

`api/auth/reset-password` contesta lo mismo pase lo que pase, para no revelar si
esa dirección tiene cuenta. Cuando el envío falla ya se sabe que la cuenta
existe, así que contestar un error convertiría la respuesta en un *"esta
dirección existe"* — justo lo que las tres salidas genéricas de arriba evitan.

**Se deja como está, a propósito**, y escrito en el código: se cambiaría una
propiedad que vale siempre por un mensaje mejor en un fallo raro. El fallo igual
ya queda registrado. Si algún día se quiere avisar, hay que hacerlo **sin que la
respuesta cambie** — reintentando, o con un segundo camino como el de
confirmación.

#### El chequeo que lo sostiene

`mails-que-no-salen.check` (9 chequeos). El que más importa es el primero: que el
cliente real se use **una sola vez**. Un segundo `clienteResend.emails.send` en
cualquier lado —o un `new Resend(...)` en otro archivo— es un envío que se salteó
el control, y el agujero vuelve por ahí.

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

### ✅ La pasada bloque por bloque — TERMINADA (05/09/26)

Con la página llena de contenido de prueba se ve qué le falta a cada bloque, que
vacío no se notaba. Se va en el orden de la página.

- ✅ **Beneficios** y ✅ **Esto te suena** — ícono propio por ítem. Antes los cuatro
  beneficios eran cuatro renglones con el mismo tilde verde. El campo es libre pero
  lo que llega se limpia: queda **un** símbolo, no se parte por la mitad —una
  bandera son dos caracteres y uno con tono de piel son cuatro— y las letras y
  números se descartan, así que escribir "hola" no deja una "h" adentro del
  círculo. Y una fila de sugerencias de un clic, que no es adorno: el teclado de
  emojis de Windows es Win+punto y mucha gente no lo sabe.
- ✅ **Portada · Cómo funciona · Precio · Garantía · Oferta con fecha · Barra ·
  Pie** — se habían hecho entre el 02 y el 03/09 y esta lista quedó sin tachar.
  Están en sus commits: la portada que dice qué cosa es y contesta antes de que
  bajen, los pasos en fila con el tope que esa fila aguanta, el resumen de
  precio con la lista que suma de verdad, la garantía con su escudo, la oferta
  que ahora termina de verdad, la barra que contaba los bonos distinto que el
  resto, y el pie con los documentos de quien vende.

- ✅ **Bonos, Opiniones y el hueco del título — HECHOS (05/09/26).** Lo que
  faltaba de verdad de la pasada. Se dibujó la página entera con contenido de
  prueba a 360, 768 y 1280, en los cinco estilos.

  ⚠️ **Los bonos no mostraban su tapa.** Cada bono es un producto y tiene su
  imagen cargada; la sección la tenía a mano y dibujaba texto pelado. Un regalo
  que no se ve no parece un regalo. Ahora va la tapa, chica y al costado —arriba
  y grande, la sección se hace de dos pantallas de alto justo en el medio de la
  página—, cada bono numerado por su POSICIÓN (no hay campo que escribir a mano
  y que quede mintiendo al borrar uno), y abajo la suma: *"los 3 bonos valen
  $18.500 y van incluidos"*, sacada de `valorDeLosBonos`, la misma que usan el
  resumen y la barra.

  ⚠️ **La misma lista de bonos aparecía dos veces pegada.** La versión corta
  adentro de la ficha del producto y, tres centímetros más abajo, la larga con
  foto y descripción. Repetir la oferta al final está bien —la página es
  larga—; repetirla pegada no es insistir, es que sobra. Ahora la ficha la
  esconde **si la sección de Bonos se va a dibujar**, y si alguien la apaga la
  lista vuelve sola a la ficha: el dato no se pierde, cambia de lugar.

  ⚠️ **Y el resumen de precio decía el valor total dos veces seguidas**: la
  lista cierra con "Valor total $38.500" y el tachado de abajo repetía el mismo
  número con la misma palabra, dos renglones después. Hicieron falta DOS
  banderas distintas y no una: en la ficha la lista va aparte pero el tachado se
  queda —ahí es lo único que compara—, en el resumen es al revés.

  **Las opiniones** ahora llevan la inicial de quien la dijo, y la última de una
  cantidad impar toma el ancho entero en vez de dejar media columna vacía (los
  bonos, igual). Sin estrellas, sin puntaje y sin foto, y eso es a propósito: la
  sección de la competencia dibuja esto como una captura de WhatsApp —con hora,
  señal y doble tilde— abajo de un título que dice "TESTIMONIOS REALES", y su IA
  la llena sola con tres personas inventadas. Una inicial es lo máximo que se
  puede dibujar sin agregarle a la opinión una prueba que nadie dio.

- ✅ **Qué pasa si se borra el título de una sección — CONTESTADO (05/09/26): sí,
  dibujaba un hueco.** El título no se dibuja —eso estaba bien, acá vacío es
  vacío y no se inventa un texto por defecto como hace el editor de ellos— pero
  el margen de arriba del contenido quedaba colgando de nada: 32 píxeles de aire
  que se leen como un error de la página, no como una decisión de quien la armó.
  Ahora ese aire existe sólo si hay encabezado. Chequeado dibujando la página
  con TODOS los títulos borrados.

- ✅ **Y apareció un bug que no estaba anotado: el precio se partía al medio.**
  Medido a 768 en la ficha del producto: *"$ 15.0"* en un renglón y *"00"* en el
  siguiente. La página lleva `overflow-wrap: anywhere` para que un título pegado
  sin espacios no le rompa el ancho —eso se queda, es la red contra algo que
  vimos roto en la página de la competencia— y entre dos `span` seguidos JSX no
  deja ningún espacio: el tachado y el precio eran UNA sola palabra larguísima,
  así que cortar adentro del número era el único lugar que le habíamos dejado al
  navegador. Ahora cada importe es indivisible y hay dónde cortar entre uno y
  otro. **Es el número que la persona lee antes de pagar.**

  22 chequeos en `pagina-venta-dibujo.check.ts`, y **dibujan la página de
  verdad** en vez de buscar texto en el componente: ninguna de estas tres cosas
  se ve leyendo el código, se ven mirando el HTML que sale.

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

- ✅ ~~**Reemplazar el PDF de un producto YA VENDIDO le cambia el archivo a quien lo
  compró antes.**~~ Decidido el 14/09/26: **se acepta como está y se avisa.** Es
  lo que hacen Hotmart y Gumroad —el enlace entrega el archivo actual— y sirve
  para corregir. Congelar lo vendido castigaba al vendedor honesto que corrige
  una errata; el caso malo (pisar mecánica con literatura) sólo lastima al
  vendedor que lo hace, porque el comprador ya tiene lo suyo y encima se lleva
  lo nuevo. Ver *Reemplazar un archivo ya vendido, y los términos 1.9*.

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

✅ **Escrito en el detalle de la venta** (03/09/26). Cuando una venta vuelve
—devolución o contracargo— el detalle lo dice con todas las letras: *"Nuestra
comisión se devuelve entera — de una venta que se deshizo no nos quedamos con
nada"*. Y no aparece en cualquier cancelada: una que nadie pagó y una que se
devolvió dicen las dos `CANCELLED` en `status`, así que se distinguen por
`Payment.status === "REFUNDED"` y por la marca que dejó el webhook
(`digital_devolucion` / `digital_contracargo`).

✅ ~~**Falta escribirlo en la pantalla de suscripción.**~~ Hecho el 14/09/26: en
Mi cuenta, debajo de la comisión, dice que si una venta se devuelve la comisión
vuelve entera. En los **términos** ya
estaba (03/09/26): punto **6 ter** del apartado Cliente, más la excepción nombrada
en el punto 7 de derechos del consumidor. Los plazos de ahí salen de
`DIAS_DEL_PERMISO` y `MAX_DESCARGAS`, no escritos a mano: lo que vale para un
reclamo es lo que dicen los términos, así que no pueden prometer un número
distinto del que el sistema aplica.

⚠️ **Falta que lo lea un abogado de consumo.** El texto está escrito para
defenderse solo, pero nadie del proyecto es abogado. Es media hora y es la parte
más barata de todo esto.

✅ **El apartado del VENDEDOR digital en los términos** — HECHO (03/09/26,
commits `e12e9648` y `43d807c8`). Estaban los tres de siempre —Dueño de tienda,
Vendedor/Afiliado, Cliente— y una cuenta DIGITAL no era ninguno: al registrarse
firmaba **el documento del Cliente**, o sea el que promete 10 días de
arrepentimiento, que es justo lo contrario de lo que le conviene a quien vende.
Ahora tiene su propio apartado de 16 puntos: qué somos en su venta (art. 40 de la
24.240, con el aviso de que es orden público y no se puede recortar), la
comisión, los impuestos, que su contenido sigue siendo suyo, la licencia para
alojarlo y entregarlo, las devoluciones y la suspensión.

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

- ✅ **Slug propio en `Product`**, único y **en los tres planes** — le da el
  subdominio, y tiene que existir desde que el producto se crea. *(04/09/26. El
  producto principal nace con su dirección; se puede cambiar desde su pantalla.)*
- ✅ **Dominio propio en `Product`.** Hoy `customDomain` está en `Store` y es
  `@unique`: **uno por cuenta**. Para tener dos dominios en la misma cuenta, el
  dominio tiene que colgar del producto. *(04/09/26. `Product.dominioPropio`,
  único, sólo Pro y con el pago al día. Ver `dominio-digital.ts`.)*
- 🔲 **Identidad propia del producto** — nombre y aspecto de esa página, sin
  heredar la marca de la tienda.
- ✅ **La regla en el middleware**, que ya sabe traducir *dominio → tienda*: falta
  el caso *dominio → producto*. *(04/09/26. Los dos casos —subdominio y dominio
  propio— pasan por la misma consulta, y si no contesta se deja pasar igual que
  antes: una tienda que ya andaba no se puede romper por una consulta caída.)*
- ✅ **Qué pasa si el slug del producto choca con el de una tienda.** Con el
  subdominio en los tres planes esto deja de ser un caso raro y pasa a ser el
  caso normal: hay muchos más productos que tiendas, y comparten el mismo espacio
  de nombres. *(04/09/26. Un candado de Postgres sobre el NOMBRE, no sobre la
  cuenta: ningún índice único puede ver dos tablas a la vez.)*

#### ⚠️ El candado estaba puesto de un solo lado de la puerta — ARREGLADO (05/09/26)

Salió del repaso de la sesión, no de un error que se haya visto. **El lado
digital preguntaba por las dos tablas desde el primer día. El de tiendas
preguntaba por una sola.**

Son cuatro columnas y cuatro índices únicos, uno por columna:

| | Tienda | Producto digital |
|---|---|---|
| Subdominio | `Store.slug` | `Product.slugDigital` |
| Dominio propio | `Store.customDomain` | `Product.dominioPropio` |

**Ninguno ve al otro**: la base acepta el mismo nombre en las dos tablas sin
quejarse. Quien desempata es el middleware, y le da prioridad a la tienda.

Lo que eso permitía:

- **El dominio.** Alguien con Tienda Premium escribía el dominio propio de un
  producto digital ajeno y se quedaba con la dirección. Ni siquiera necesitaba
  el certificado: ya estaba emitido, **a nombre de la víctima**. Es la página
  contra la que está pautando.
- **El subdominio, y es peor.** Viene con los TRES planes, no sólo con Pro, y no
  hacía falta mala intención: el slug de una tienda sale de su nombre, así que
  alcanzaba con que alguien abriera "Mecánica Fácil" para llevarse puesta la
  dirección del ebook de mecánica.

**Verificado contra la base real ese día: 0 colisiones.** El arreglo llegó antes
de que pasara.

**Eran SEIS lugares que escriben una dirección, no dos.** Los cinco de la lista
escrita a mano más uno que apareció solo:

1. La dirección de un producto digital *(ya preguntaba bien)*.
2. El alta de una tienda nueva — `uniqueStoreSlug` en el registro.
3. La dirección del espacio digital.
4. La herramienta de admin que renombra slugs **en lote** — la peor forma de que
   pase.
5. El dominio propio de una tienda.
6. ⚠️ **`espacio-digital.ts`, el que crea la tienda de cada cuenta digital.**
   Éste no estaba en la lista: **lo encontró el barrido del chequeo, la primera
   vez que corrió**. Su comentario decía *"nadie lo ve, la dirección pública de
   un producto digital es otra cosa, y va en su propia fase"* — y esa fase ya
   había llegado.

Los seis pasan ahora por `estaLibre` o `dominioLibre`, que miran las dos tablas.

**13 chequeos en `direcciones-compartidas.check.ts`**, y el último **barre el
árbol** en vez de confiar en la lista: cualquier archivo nuevo que escriba una de
las cuatro columnas sin preguntar hace fallar la prueba. Probado con un archivo
falso: lo detecta. Es lo que evita que el séptimo lugar vuelva a empezar.

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

### ✅ Lo único que había que chequear antes de prometerlo — MIRADO (04/09/26)

Pasamos de **1 dominio por cuenta** a **hasta 5**. Multiplicar por cinco los
dominios apuntados a un mismo proyecto de Vercel era lo único que podía tener un
límite de plataforma. **Lo tiene, y se puede prometer igual.**

| Plan de Vercel | Dominios por proyecto |
|---|---|
| **Hobby** *(el que tenemos)* | **50**, y es un tope duro |
| Pro (US$20/mes) | Sin tope; hay un freno anti-abuso en 100.000 y se puede subir |

Además, su API deja **100 altas de dominio por hora, y son POR EQUIPO**: uno
martillando un botón deja sin altas a todos los demás. Por eso la ruta que
conecta tiene freno propio de 10 por hora por cuenta.

**Qué significa el 50 en la práctica.** Ahí adentro entran `tiendaapps.com`,
`www.tiendaapps.com` y el dominio propio de cada tienda que ya conectó uno. Si
cada cuenta Pro trae sus 5, **el techo se toca cerca de las 10 cuentas Pro** —y
antes, contando las tiendas—. O sea que no frena el lanzamiento, pero **es una
cuenta que hay que mirar de vez en cuando**: el día que se llene, ningún dominio
nuevo levanta y el error no se ve desde acá, se ve en Vercel.

**Y se destapa con US$20 por mes**, el día que haya 10 cuentas Pro pagando. No es
una decisión que haya que tomar hoy.

⚠️ **Lo que sí hubo que arreglar para que el 50 alcance:** del lado de tiendas, un
dominio desconectado **quedaba pegado al proyecto de Vercel para siempre** —se
daba de alta y nunca de baja—. Con 1 dominio por cuenta casi no se notaba; con 5
por cuenta se llenaba solo de dominios que ya nadie usa. Ahora se da de baja al
desconectarlo y al borrar el producto.

✅ ~~**Queda pendiente:** soltar los dominios de las cuentas dadas de baja hace
mucho.~~ Resuelto el 14/09/26 con una regla para todos los casos: ver *El
dominio cuando ya no hay Pro*. Dar de baja la cuenta los suelta en el acto, y
llevar 90 días en Free también.

## FASE 6 — Legales

⚠️ **Este título estuvo vacío hasta el 04/09/26, y eso hizo creer que la fase no
existía.** No era así: la mayor parte del trabajo legal de este ecosistema ya
estaba hecha y escrita en otro lado —en `/terminos`, en `/privacidad` y en la
página legal de cada producto—, sólo que nadie lo había anotado acá. Un título
vacío es peor que uno con una lista: da por perdido algo que está.

### Lo que YA existe (auditado el 04/09/26)

| Documento | Dónde | Estado |
|---|---|---|
| Términos, solapa **Productos Digitales** | `/terminos?role=digital` | ✅ 19 secciones |
| Privacidad, solapa digital | `/privacidad` | ✅ incluye la IA y a Anthropic |
| Página legal de cada producto | `/p/<id>/legales` | ✅ las políticas de quien vende + el formulario de arrepentimiento |
| Consentimiento del art. 1116 | en cada orden | ✅ fecha, IP y **el texto exacto que esa persona leyó** |
| Botón de arrepentimiento | Resolución 424/2020 | ✅ siempre presente, no depende de que se haya cargado nada |

Lo del art. 1116 merece el subrayado: **no se guarda un `true`, se guarda el
texto entero**. Si mañana se cambia la redacción, una venta vieja tiene que
seguir mostrando la que su comprador leyó de verdad. Un booleano no prueba nada.

### ✅ Lo que se agregó el 04/09/26 — versión 1.8 de los términos

Tres huecos que el producto ya hacía y el documento no decía. Los tres salen de
la Fase 5 bis y de la 4.3, o sea de funciones que se encendieron después de que
el texto se escribió.

- ✅ **"2 ter. La dirección de tu producto, y tu dominio"** — no existía nada. La
  sección 4 del apartado de Dueño habla de dominio propio, pero es de otro
  apartado y de otro producto: allá es **uno por cuenta** y acá **uno por
  producto**. Una cuenta digital que conectaba su dominio no tenía una línea que
  dijera de quién es, quién lo paga ni qué pasa si lo desconecta.
  Y falta lo más delicado: **la dirección de tiendaapps es NUESTRA y se presta**.
  Quien va a pautar contra ella durante meses tiene que saberlo antes de gastar
  el primer peso, y saber que cambiarla rompe todo lo repartido.
- ✅ **"4 quater. El ebook escrito con IA"** — el 4 ter habla de la IA que escribe
  los TEXTOS de la página. Esto es otra cosa: un archivo escrito por una máquina
  que después **se vende a un tercero por plata**. Lo que allá es un borrador que
  se revisa antes de publicar, acá es la mercadería.
- ✅ **Los bonos y los upsells**, en la sección 5. No aparecían en ninguna parte
  del documento aunque se entregan en cada compra. Un bono es un archivo que
  alguien recibe por haber pagado, **aunque su precio sea cero**: le corren las
  mismas reglas de entrega, devolución y responsabilidad que al principal. Era el
  archivo que más se regala y el único sin reglas escritas.

Y se subió `CURRENT_TERMS_VERSION` a **1.8** con su resumen en criollo, que es lo
que dispara el aviso de re-aceptación. Un cambio de documento sin subir la
versión es un cambio que nadie re-acepta.

### 🔲 Las tres decisiones que son del titular, no del que escribe

Están anotadas desde la versión 1.7 y **siguen sin escribirse**. No es olvido: no
las puede tomar nadie más.

- 🔲 **Ley aplicable y jurisdicción.** Qué tribunales entienden si hay un juicio.
  ⚠️ Ojo: contra un consumidor argentino, la Ley 24.240 es de orden público y una
  cláusula que lo mande a litigar lejos se puede tener por no escrita. Sirve para
  la relación con el VENDEDOR, no para tapar al comprador.
- 🔲 **Tope de responsabilidad.** Hasta cuánto responde TiendaApps si algo sale
  mal. Lo habitual es atarlo a lo cobrado en los últimos meses. Sin un número, el
  techo es el que decida un juez.
- 🔲 **Garantía de resultados.** Decir con todas las letras que no se garantiza
  que nadie venda nada. Es la cláusula que más falta hace en un producto que se
  vende con la promesa de "armá tu negocio digital".

### 🔲 Y esto lo tiene que leer un abogado de consumo

No es una formalidad y no lo reemplaza ninguna revisión de acá. Los documentos
están escritos con criterio y en castellano llano, y se apoyan en artículos
concretos (24.240, art. 1116 inc. b del CCyC, Resolución 424/2020), pero **quien
los redactó no es abogado**. Antes de encender el cobro de verdad, esto se
revisa.

Lo que conviene llevarle, además del texto: las tres decisiones de arriba ya
tomadas, para que las escriba él y no queden como están.


---

## Auditoría del panel de Productos — 09/09/26

Repaso completo de las 25 rutas de `/api/digitales`, las 16 pantallas del panel
y las bibliotecas del ecosistema, buscando cuatro cosas: límites y abuso,
seguridad, funciones a medias y código muerto.

### Lo que se arregló en el acto

- 🟥 **La portada podía dejar el armado a mitad de camino.** Escrita el día
  anterior: se dibujaba y se subía ENTRE la subida del PDF y la escritura en la
  base, con el `images` viajando adentro de la misma transacción. Todo eso corre
  en una función con techo de 60 segundos, así que un Supabase lento se comía el
  tiempo que le faltaba al armado y la función moría **con el PDF ya arriba y
  sin escribir la base**: el producto seguía entregando el archivo viejo y
  quedaba uno huérfano que pagamos igual. Ahora la portada va DESPUÉS de que el
  archivo quedó colgado; si falla, el producto queda sin foto y nada más.
- 🟧 **Ninguna subida al depósito tenía tiempo máximo.** `subirAlDeposito` (el
  PDF, hasta 50 MB) y `guardarImagen` usaban `fetch` sin plazo. Eran los dos
  únicos pedidos a un tercero de este ecosistema sin él —los de Pexels y el del
  modelo ya lo tenían—. 30 y 20 segundos.
- 🟧 **La cadena mandaba la cookie a la dirección que decía el pedido.**
  `req.url` se arma con la cabecera `Host`. El daño práctico era acotado (la
  cookie que viaja es la de quien hizo el pedido), pero es un `fetch` a un lugar
  que elige un tercero, con un secreto en la mano, en una plataforma que además
  sirve dominios propios. Ahora se comprueba contra los nuestros.
- 🟨 **`ventas/[orden]/reenviar` comprobaba el dueño en un `if`,** no adentro del
  `where`. Funcionaba —404 en los dos casos— pero era la única ruta del
  ecosistema que rompía la regla, y la regla existe para que la protección no
  dependa de que ese `if` siga estando.

### Lo que se revisó y está bien

No es una lista de cortesía: son los lugares donde un error se cobra caro.

- **Permisos.** Las 25 rutas piden sesión salvo las cuatro que son públicas a
  propósito (el aviso de pago, la compra, la descarga por token y el estado de
  una compra). Todas las de panel piden además rol DIGITAL, y todas las que
  tocan un producto llevan el dueño **adentro del `where`**.
- **El aviso de pago** verifica la firma de Mercado Pago, contesta 200 siempre
  —para que no reintente al infinito— y es idempotente.
- **El contador de descargas** decide en el `where` (`descargas < maxDescargas`),
  así que dos pedidos a la vez no dan seis descargas de cinco. Y si nuestra firma
  falla, la descarga se devuelve.
- **La subida directa**: la ruta la elige el servidor, y al confirmar se
  comprueba que empiece con `<usuario>/<producto>/` y que no tenga `..`.
- **Los topes de IA** son cuatro capas —ráfaga, cupo en la base, global de
  cuentas sin abono, corta-corriente— y los números están razonados. La ráfaga
  del ebook va aparte (30) porque un ebook son once llamadas de un solo pedido.
- **Sin XSS en digitales**: no hay un solo `dangerouslySetInnerHTML` en este
  ecosistema; todo sale por JSX.
- **Origen** verificado en el `middleware` para toda la API.
- **Sin código muerto** en las bibliotecas del ecosistema: ni un solo exporte sin
  usar, ni una ruta que no llame nadie.

### 🔲 Lo que queda anotado

- ✅ **El recetario no se puede corregir a mano.** Hecho el 09/09/26. Tiene su
  propio editor —`RecetarioTexto`— con los campos que de verdad son: título,
  bajada, las tres fichas, los ingredientes en dos columnas, los pasos numerados
  que se pueden mover, el consejo y la foto. Entra por la MISMA ruta que el
  texto, con el mismo candado y la misma relectura fresca; lo que cambia es qué
  se revisa. Y ahora una receta también puede tener su foto elegida a mano: sin
  eso, cada vez que se rehacía el PDF cambiaban las treinta.

  Lo que más se cuidó: el lector descarta una receta ENTERA si se queda sin
  título, con menos de dos ingredientes o con menos de dos pasos. Guardar así no
  falla en ningún lado — la receta se pierde en la próxima lectura y el
  recetario de treinta entrega veintinueve. 33 chequeos en `recetario-texto`,
  incluida la ida y vuelta contra el lector de verdad.
- ✅ **Sentry sin `global-error` ni `onRequestError`.** Hecho el 09/09/26. Eran
  tres agujeros, no dos: los errores del servidor no llegaban (Next los atrapa
  para dibujar la pantalla de error, así que Sentry no los ve), no había red
  para cuando se rompe el armazón mismo, y las tres pantallas de error que ya
  existían sólo escribían en la consola del navegador de quien tuvo el
  problema. La de métricas ni siquiera recibía el error. De paso, el panel de
  digitales no tenía red propia: cualquier error subía hasta el armazón y la
  persona perdía la barra lateral. Catorce chequeos en `avisos-de-error`.
- ✅ **El techo de gasto de verdad vive fuera del repo.** Verificado el 10/09/26:
  hay un límite de **50 dólares** puesto en la cuenta de Anthropic. El
  corta-corriente de acá (600 llamadas y 40 ebooks por día) frena lo nuestro,
  pero el que garantiza que no llegue una factura grande es ése, y no se puede
  poner desde el repo.
- ❌ **Dos campos de archivo sin teclado**: era una falsa alarma, revisada el
  09/09/26. Se miraron los 25 `input type="file"` del proyecto entero: los que
  usan `className="hidden"` tienen al lado un `<button>` de verdad que los
  dispara con `.click()`, y a ese botón se llega con el tabulador. Los del
  panel digital van con `sr-only`, que es otro caso: ahí la etiqueta ES el
  botón y el campo tiene que seguir siendo enfocable. Ninguno está roto.
- ✅ **La etiqueta "Muy pronto" de los formatos es código inalcanzable**, y se
  deja así a propósito (decidido el 14/09/26): `FORMATOS_LISTOS` y
  `ESTILOS_LISTOS` son la guarda para el próximo formato o molde que se
  empiece a medias. Sacarla es ganar diez líneas y perder la red.

## Los cuatro moldes de la hoja — 09/09/26

**Lo que faltaba era un eje, no unos dibujos.** Había dos elecciones —el
*formato* (de qué se trata: texto o recetario) y el *tema* con la *paleta* (de
qué color sale)— y ninguna decía **cómo está armada la hoja**. Eso era uno solo
y no se elegía. Ahora son cuatro, en `ebook-estilos`:

| | Qué hace con la hoja | Qué le cuesta |
|---|---|---|
| **Libro** | Una columna, con aire; cada capítulo abre con su foto y su número | Es el más largo en hojas |
| **Compacto** | Dos columnas de verdad, el título sobre la foto, entrada en bastardilla | En el celular se lee peor |
| **Manual** | Columna angosta y una franja al costado con los subtítulos, afuera del texto | El renglón es corto: se estira |
| **Cartel** | Títulos enormes, foto a toda la hoja, subtítulos resaltados en color | Gasta mucha tinta impreso |

**Nuestros nombres y nuestra selección.** Está decidido más arriba y se sostuvo:
los cuatro de la competencia por separado son genéricos, pero los cuatro juntos
son su curaduría. Estos cuatro se llaman por lo que le hacen a la hoja.

### ⚠️ Es GRATIS cambiarlo, y eso es la mitad de la función

El estilo **no toca una sola palabra del texto**. Así que cambiarlo es volver a
armar el PDF con lo que ya está pago — el mismo camino que cambiar el color — y
no una generación nueva. Por eso el selector está **dos veces**:

- en el modal, antes de generar, donde todavía no hay texto que mirar;
- y **en la tarjeta, con el ebook ya escrito**, que es donde de verdad se puede
  juzgar. Ahí van las cuatro miniaturas, se aprieta una y el archivo se rehace.

El renglón que dice *"Es gratis"* no es un adorno: sin él nadie prueba, por
miedo a que se le vaya un ebook del cupo.

### Una tabla, un dibujante

Cuatro moldes podían salir como cuatro funciones que dibujan la hoja entera, o
como **una que lee números de una tabla**. Va la segunda: `ebook-pdf` tiene
adentro seis arreglos que costaron ebooks rotos —la hoja en blanco de la viñeta,
el párrafo que salía con la letra del pie, el número perdido sobre una foto
clara—. Con cuatro copias, esos arreglos viven en una sola y los otros tres
estilos vuelven a tener los bugs de julio.

Lo que sí es código nuevo son las dos columnas: **pdfkit no sabe cortar un
párrafo entre columnas** —para él la hoja es una caja— así que `escribirParrafo`
mide y parte a mano. Los otros tres moldes **no pasan por ahí**: con una sola
columna cae en el mismo `doc.text` de siempre, para no poner el camino nuevo
abajo del estilo que ya usa todo el mundo.

### Lo que se cuidó

- **`libro` es el molde de antes, número por número.** Comparado contra la
  versión anterior de `ebook-pdf`, sale con el texto en las mismas coordenadas,
  las mismas letras y los mismos colores. Lo único que cambió son las curvas de
  una esquina: el recuadro de aviso se dibujaba con radio 9 y la caja de la
  portadilla con 10, siendo la misma caja; ahora las dos leen el molde. Quien
  vendió un ebook en agosto y hoy rehace el PDF recibe el mismo archivo.
- **Las tres puntas dibujan el mismo molde**: el PDF, la vista previa del editor
  y **la imagen de portada** que se cuelga del producto. Esa imagen es lo que se
  ve en la página de venta y en el enlace que se manda por WhatsApp: si el
  archivo abriera a sangre y la portada mostrara el corte al 52 %, la foto del
  producto sería de un ebook que no existe.
- **Un problema que sólo se vio mirando**: con `cartel` la tapa a sangre sale
  también en tema **claro**, y ahí el acento de la paleta —medido contra papel—
  cae sobre un velo casi negro y desaparece. Se corrige con `acentoSobreLaFoto`.
  En el código no se veía; en la hoja, enseguida.
- **90 chequeos** (`ebook-estilos.check.ts` son 40 nuevos). Dos de ellos abren
  el PDF armado y miran **dónde arranca cada renglón**: que `compacto` use las
  dos columnas y que en `manual` los subtítulos caigan en la franja. Que
  `columnas: 2` esté en la tabla no quiere decir que el archivo las use.

### Lo que falta

- 🔲 **Mirarlo en los tres anchos.** El selector del modal, las miniaturas de la
  tarjeta y la previa a dos columnas no se vieron en 360 / 768 / 1280.
- 🔲 **La previa no corta las hojas**, y con `compacto` tampoco reparte las dos
  columnas como el archivo: las balancea el navegador sobre el capítulo entero.
  Lo que sí muestra —y es lo que se necesita para elegir— es el ancho del
  renglón. Fingir el corte sería peor: alguien acomodaría su texto para una
  hoja que después no es.
- ✅ **Los moldes adentro del recetario.** Hecho el 09/09/26. Ver la sección de
  abajo.

## Los cuatro moldes ADENTRO de la receta — 09/09/26

**El estado del día anterior, medido.** Se generó un recetario con los cuatro
estilos y se miraron las hojas: **eran la misma**. Cambiaban el margen y el
redondeo del recuadro del tip, nada más. El estilo le cambiaba a un recetario la
tapa y se terminaba ahí, porque `hojaDeReceta` tenía su acomodo escrito adentro
y no leía el molde.

Ahora lo lee. El campo nuevo es `receta` en `ebook-estilos`, y son cuatro
acomodos:

| | La receta | Qué gana |
|---|---|---|
| **Libro** | Foto ancha arriba, fichas en fila, ingredientes y pasos abajo | Es el de siempre. **No se tocó.** |
| **Compacto** | Foto cuadrada al lado del título, y el título adentro de una franja de acento | Gana el alto de la banda: entra una receta más larga sin apretar la letra |
| **Manual** | Rinde, tiempo y cocción **apilados en la franja del costado**, arriba de los ingredientes | Es como se lee cocinando: el tiempo a la vista mientras bajás por los pasos |
| **Cartel** | Foto a sangre arriba con el título de la receta encima | La misma idea que su portadilla de capítulo |

### ⚠️ Lo que había que cuidar, que era una sola cosa

**Que no se parta una receta.** Es la promesa entera del formato —quien cocina
apoya el teléfono y lee de ahí— y se rompe en silencio: un acomodo nuevo que
mueve la foto sin rehacer la medición no falla en ningún lado, sale un archivo
mal cortado y nada más. Ya pasó el 07/09/26: nueve hojas para tres recetas.

Por eso el acomodo nuevo **no toca las dos columnas**. Los anchos de la columna
de ingredientes (168) y la de los pasos son los que `alturaDeLosPasos` usa para
decidir si la receta entra, y son iguales en los cuatro. Lo único que se movió
es lo de ARRIBA y dónde caen las tres fichas — y las dos cosas están adentro de
la cuenta:

- con la franja, las fichas dejan de empujar a las dos columnas y pasan a contar
  **contra la columna de los ingredientes**, adentro del mismo `Math.max`. Si los
  pasos son más largos, las fichas no le cuestan un punto a la hoja. Eso es lo
  que le hace ganar alto a `manual`;
- la franja de fichas **la mide y la dibuja la misma función**. El tip tiene la
  altura en `alturaDelTip` y el dibujo en `dibujarAviso`, con tres números que
  hay que mantener iguales a mano; acá no puede pasar;
- el relleno de la franja de título de `compacto` viaja en `aireDelTitulo` y lo
  leen las cuatro cuentas del encabezado, no sólo el dibujo.

### `libro` da EXACTAMENTE el mismo archivo

Comprobado, no supuesto: se sacó la huella de los flujos de dibujo
descomprimidos del PDF —los bytes enteros no sirven, pdfkit le mete la fecha de
armado— antes y después de todo esto. **Mismo hash.** Quien vendió un recetario
en agosto y hoy rehace el PDF recibe el archivo de siempre.

Por eso también quedaron congelados dos números que se veían feos: el redondeo 8
de la fila de fichas y el 168 de la banda. Los otros tres acomodos sí leen el
molde, y por eso en `compacto` y en `cartel` la caja de fichas sale recta, igual
que el recuadro del tip. Con una redonda y la otra recta la hoja se veía a medio
terminar.

### ⚠️ `compacto` casi sale igual que `libro`, y sólo se vio mirando

Con el plan cumplido al pie de la letra —"foto cuadrada al lado del título"—
`compacto` y `libro` daban **la misma hoja**. No por un error: cuando la receta
es larga, `libro` cambia solo la banda ancha por el cuadrado al costado, que es
justo lo que `compacto` hace siempre. O sea que en toda receta larga —la
mayoría— las dos quedaban iguales salvo el margen.

En el código no se veía; en la hoja, enseguida. Se corrigió metiendo el título
adentro de una franja de acento que arranca en el borde y se corta antes de la
foto: es lo mismo que hacen su tapa y su portadilla, y es lo que lo hace ver de
diario. Es el mismo tipo de hallazgo que el `acentoSobreLaFoto` de `cartel` la
semana pasada: **hay que generar los cuatro y mirarlos.**

### El parche de la pantalla se sacó

Mientras la receta no leía el molde, el selector de un recetario mostraba **la
tapa** —lo único que cambiaba— y los textos hablaban de la tapa. Eso ya no va:
la miniatura vuelve a la hoja y dibuja **una receta** (fichas, dos columnas,
tip), y los textos dicen qué le hace a la receta. Se fueron con el parche
`QUE_ES_CADA_ESTILO[x].tapa`, `MiniaturaDeEstilo muestra="tapa"` y su función
`LaTapa`.

La vista previa del editor ahora también dibuja el acomodo elegido. La regla
sigue siendo la misma y está anotada allá: **muestra lo que decide el MOLDE, no
lo que decide la medición.** Dónde cae la foto y dónde caen las fichas no
dependen de lo que escribió el modelo; qué tan apretada sale la hoja, sí.

### ⚠️ A quién le cambia el archivo

A nadie que use `libro`, que son todos los que se armaron antes del 09/09/26 —el
estilo de fábrica— y está comprobado arriba. Pero un recetario al que se le haya
elegido `compacto`, `manual` o `cartel` **el día que el estilo sólo cambiaba la
tapa** y que se vuelva a armar hoy, sale con la hoja de adentro distinta. Es lo
que se buscaba: hasta ayer esa elección no hacía nada adentro. Se anota porque no
hay forma de avisarlo desde el panel y porque el único caso real es el banco de
pruebas.

### Los chequeos

Además de los de antes: **EST-AF** arma un recetario con cada estilo y cuenta
las hojas —una receta, una hoja, en los cuatro—; **EST-AG** abre los flujos del
PDF y compara dónde arranca cada renglón, así que dos acomodos que salen iguales
lo hacen fallar; **EST-AH** mira que en `manual` las fichas caigan en la franja
y **no** en la fila de arriba; **EST-AI**, que en `libro` sigan en la fila.
**PDF-W** y **PDF-Y**, que probaban una sola hoja, ahora corren con los cuatro
estilos: la receta más grande que el limado deja pasar entra en una hoja en los
cuatro.

### ✅ Los tres anchos — 10/09/26

Mirado en 360 / 768 / 1280: el selector del modal (2×2 en el celular, 4 en
línea desde 640), las miniaturas de la tarjeta y la previa del recetario con los
cuatro acomodos. Nada se desborda ni se pisa.

Como el panel había quedado sin ningún recetario, se montó una pantalla
temporal —sólo desarrollo, sin login— que dibuja las miniaturas y la previa con
las clases de la grilla **copiadas tal cual** de `EbookIA` y `ProductosClient`.
Se sacaron las capturas y se borró.

**Y encontró algo que en el código no se veía.** La franja de acento del título
de `compacto` se le agregó al archivo DESPUÉS de escribir la miniatura y la
previa, y ninguna de las dos la dibujaba: las dos mostraban la misma cabeza que
`libro`, que es exactamente el problema que la franja vino a resolver. Con las
cuatro miniaturas juntas a 768 se ve en un segundo. Arreglado en las dos, y de
paso el redondeo del recuadro del tip y de las fichas —que la previa tenía
escrito a mano— ahora sale del molde, así que `compacto` y `cartel` se ven
rectos como en el archivo.

### Lo que falta

- 🔲 **La previa no corta las hojas.** Sigue igual, y sigue siendo a propósito.

---

## Lo del 10/09/26 — Marketing, la barra, y dos arreglos de paso

### ✅ Marketing en el panel, con contenido para reels

Quien vende un producto digital tiene que mostrarlo y no tiene con qué filmar
un taller mecánico. Termina bajando algo de Google y subiéndolo a un reel, con
el riesgo de que le tiren la publicación por derechos.

Es **el mismo banco y la misma clave** que las fotos de los ebooks: Pexels tiene
`/videos/search` al lado de `/v1/search`. No se contrata nada. Vive en
`src/lib/videos-pexels.ts`, la ruta en `api/digitales/marketing/videos` y la
pantalla en `/digitales/marketing/reels`.

#### ⚠️ La descarga no pasa por nuestro servidor, y eso es el diseño entero

Son 8 MB por video y dos docenas en pantalla: proxearlos sería ancho de banda
nuestro, el mismo problema que ya nos costó plata con el egress del depósito.
Y un `<a download>` al CDN no sirve, porque `download` **no funciona entre
dominios**: abriría el video en una pestaña, que en un celular es no poder
bajarlo.

Lo baja el NAVEGADOR: `fetch` al CDN —que manda `access-control-allow-origin: *`,
comprobado el 10/09 con un pedido de rango—, blob, y descarga con nombre propio.
Los megas van de Pexels a la persona.

⚠️ Eso pedía tocar la CSP, y **se descubrió apretando el botón, no leyendo el
código**: `connect-src` bloqueaba `videos.pexels.com` y el `fetch` caía en el
plan B en silencio. La única señal era que el archivo bajaba con el nombre del
CDN en vez del nuestro. Si algún día Pexels saca esa cabecera pasa lo mismo, y
por eso el plan B —abrir el video en una pestaña— es explícito y no un `catch`
vacío.

#### La búsqueda va en castellano

Parecía que convenía traducir al inglés: sin `locale`, "car mechanic" trae
7.100 y "mecanica del automotor" 1.400. Es tramposo: la biblioteca de fotos ya
manda `locale: es-ES`, y con eso la misma búsqueda pasa a 3.100. Medido con dos
rubros, el inglés trae MÁS y no mejor —"home bakery bread" devuelve "close up of
breads" cuatro veces contra el amasado artesanal y el horno de barro que trae
"panaderia casera"—. Lo que decide es que la frase sea corta y visual, la misma
lección que ya está anotada en `ebook-ia` sobre la frase de la foto.

Y la pantalla entra con **la búsqueda ya hecha en el servidor** sobre el
producto que hay cargado: abrir vacío es pedirle a la persona que apriete
Buscar para ver lo que ya sabemos que quiere ver.

#### ⚠️ Lo que gasta cuota es el PEDIDO, no los videos

Dos números salieron mal la primera vez, los dos por la misma confusión.

- **El freno por cuenta bajó de 60 a 20 por hora.** El tope de Pexels son **200
  pedidos por hora para TODA la plataforma**, y con 60 por cuenta alcanzaban
  tres personas buscando fuerte en la misma hora para dejarla seca. El que se
  quedaba sin nada no era el que miraba videos: era alguien armando su ebook,
  que necesita las fotos del mismo banco con la misma llave, **y que ya pagó**.
- **La búsqueda trae 80 —el máximo de la API— y no 24.** Cuestan exactamente lo
  mismo: un pedido. Se tiraban 56 videos gratis y se obligaba a otro pedido
  para ver más. El motivo de los 24 era bueno —ochenta miniaturas de golpe son
  ochenta descargas en el teléfono de alguien para mirar cuatro— pero se
  resolvía en el lugar equivocado: ahora la pantalla **dibuja de a 24** y el
  resto se destapa con "Ver más", sin salir a pedir nada.

Verificado contra la documentación de Pexels el 10/09/26: 200 pedidos por hora
y 20.000 por mes por defecto, 80 resultados por página como máximo, y límite
ampliado gratis para quien cumple las condiciones de atribución.

#### ⚠️ Son DOS botones y no uno, porque cuestan distinto

| Botón | Qué hace | Qué cuesta |
|---|---|---|
| **Ver N más** | destapa los que ya vinieron | nada |
| **Traer más videos del banco** | pide la página siguiente | un pedido contra el tope compartido |

El segundo aparece recién cuando ya no queda nada por destapar. Ofrecerlo antes
haría gastar un pedido a alguien que todavía tiene cincuenta videos sin mirar en
la misma pantalla. Dos botones que parecen lo mismo y cuestan distinto son una
trampa.

Se piden hasta diez páginas: 800 videos de una misma búsqueda. Quien no encontró
nada en 800 tiene un problema de palabras y no de cantidad, así que ahí se corta.
Tres detalles que se cuidaron:

- La página va en la clave del guardarropas: sin eso, la página 2 se servía con
  lo guardado de la 1 y "traer más" devolvía los mismos ochenta para siempre.
- El tope de páginas se acota en `buscarVideos` y no en la ruta, que es la única
  puerta al banco: un `?pagina=99999` desde afuera sería gastarnos la cuota de a
  un clic.
- Los videos nuevos se SUMAN filtrando por id —una página que repite algo rompía
  la grilla entera con dos claves iguales—, y si el pedido falla no se borra lo
  que ya estaba en pantalla, que costó su propio pedido.

Medido en el navegador, contando qué páginas se piden:

    buscar          →  24 tarjetas · pidió ["1"]
    todo destapado  →  80 tarjetas · pidió ["1"]
    traer del banco → 120 tarjetas · pidió ["1","2"]

#### Lo demás

- La ruta pide sesión y rol `DIGITAL` aunque los videos sean públicos: lo que se
  protege es **nuestra clave**, y el tope de pedidos por hora lo compartimos con
  las fotos de los ebooks.
- Se ofrece 1080 y no 4K: Instagram recomprime igual, y son 90 MB contra 12
  bajados con los datos del celular.
- El crédito a quien filmó y el enlace a Pexels van visibles, que es lo que
  piden las reglas de su API —la misma condición que obliga a la hoja de
  créditos del ebook—. Sin autor y enlace, el video se descarta.
- **Marketing es UN link a una sección, no un árbol desplegable**: la barra de
  escritorio es un riel de íconos y un árbol serían dos íconos sin nombre.
  Adentro está también el acceso a los **upsells post-compra**, que ya existían
  desde el checkout y estaban enterrados en la tarjeta del producto, tres
  pantallazos abajo. La tarjeta no lleva a una pantalla nueva: lleva a
  Productos, que es donde se cargan. Lo que se arregló es el camino, no la
  función.
- ⚠️ En Marketing **no van tarjetas de herramientas que no existen**. Una
  tarjeta apagada que dice "próximamente" se lee como panel a medio hacer. La
  lista es corta y es honesta; cuando haya otra herramienta, se agrega.

### ✅ Cambiar el aspecto sin reescribir la página

El `PUT` de `api/digitales/productos/[id]/pagina` **reemplaza**: guarda
`normalizarContenido(lo que llegó)`. Mandarle sólo `{ estilo, paleta }` hace que
esa función no vea ninguna sección y arme una página nueva con los textos de
fábrica — o sea que **elegir un color habría borrado lo que escribió la IA y lo
que la persona editó a mano**.

Medido antes de escribir la pantalla que lo usa:

    PATCH → estilo: nocturno | paleta: violeta | texto: "LO QUE ESCRIBIO LA IA"
    PUT   → estilo: nocturno | paleta: violeta | texto: "EBOOK"

El `PATCH` lee lo que hay guardado, le cambia esas tres claves (estilo, paleta,
tipografía) y guarda el resultado. Las tres pasan igual por
`normalizarContenido`, así que una paleta inventada cae en la de fábrica en vez
de quedar escrita en la base; y lo que no es una palabra no toca nada, para que
un cuerpo mal armado no le cambie el aspecto a la página en vez de dejarlo como
estaba.

Van dos chequeos (RUTA-F y RUTA-G) en `pagina-venta.check` porque **el daño no
se ve probándolo**: la página sigue existiendo y sigue teniendo precio. Lo que
protegen es el contenido, no la forma. Es lo que usa el cierre del recibimiento.

### ✅ La barra lateral se agrupa en vez de ser una lista corrida

Eran siete entradas con el mismo peso: "Mi cuenta" se leía igual de importante
que "Productos". Ahora son tres bloques — **Inicio** suelto, **Tu negocio** con
las cuatro que se abren todos los días, y **Tu cuenta** con las dos que se tocan
una vez y no se vuelven a mirar.

⚠️ **El título del grupo NO puede ser lo que agrupa.** En escritorio la barra es
un riel de 56 píxeles que se abre al pasar el mouse, o sea que casi siempre está
cerrada, y ahí no entra "Tu negocio" —recortada a tres letras es peor que
ninguna—. Lo que agrupa es la **raya**, que se ve en los dos estados; el título
aparece sólo cuando la barra se abre. En el cajón del celular no hay riel, así
que ahí los títulos se ven siempre.

El título va con `max-h-0` y no con `hidden`: con `hidden` aparecía de golpe
mientras la barra todavía se estaba abriendo y daba un salto. Medido después
del cambio, los dos anchos siguen iguales: 56 cerrada, 240 abierta.

No se copiaron los grupos desplegables de la competencia: esconden pantallas
atrás de un clic de más, y con siete entradas no hay nada que esconder.

### ✅ La tarjeta de ejemplo ahora se pide con `?ejemplo=1`

Se dibujaba sola en desarrollo, arriba de todo, así que trabajar sobre los
productos de verdad era pasarle por encima a una tarjeta falsa en cada carga —
y en el teléfono empujaba los propios abajo del pliegue. Ahora el panel se ve
como en producción y el ejemplo se abre a propósito:

    /digitales/productos?ejemplo=1

No se borró porque sigue siendo la única forma de ver una tarjeta con el ebook
terminado —y de abrir el editor de ebook con contenido— sin gastar una
generación de IA contra la base de producción. Es lo que se usa para probar los
cuatro moldes de la hoja.

⚠️ Los dos candados suman, no se reemplazan. El que protege de verdad sigue
siendo `NODE_ENV`, que borra el bloque del build; el `?ejemplo=1` sólo saca del
camino algo que estorbaba. Va un chequeo nuevo (TXT-AJ3) sobre la otra punta, de
donde sale el dato: si alguien deja sólo `conEjemplo`, la tarjeta inventada
queda a un parámetro de distancia de los productos reales de cualquiera.

---

## La infografía: el tercer formato — 14/09/26

### Qué es, y para quién

Hoy la IA arma dos clases de ebook: el de **texto** (capítulos de 900
palabras, para leer) y el **recetario** (una receta por hoja, con campos). La
infografía es la tercera: **una idea por hoja**. Cada hoja tiene una foto
grande, un título corto que es la idea ("Regar de noche es un error"), dos o
tres frases que la explican y hasta tres datos cortos. Se hojea en el celular
como diapositivas, no se lee como un libro.

Es el formato del **lead magnet y del bono**: "10 errores al arrancar con
airfryer", "Checklist para tu primer viaje en moto", "15 posturas para el dolor
de espalda". Lo que se regala o se vende barato para enganchar, porque se lee
en cinco minutos y se ve lindo. En el mercado de productos digitales son
muchísimos los que venden esto y no un libro.

### ⚠️ Por qué es un FORMATO y no un quinto molde

La nota del 07/09 la tenía como *"foto a sangre por hoja con el texto encima,
el barato: usa el texto que ya se genera tal cual"*. Esa nota es de antes de los
cuatro moldes: **`cartel` ya hace eso** —tapa a sangre, portadilla a sangre con
el título encima—. Lo que quedaba de la nota era poner la foto detrás de cada
hoja de texto corrido, y eso son 400 palabras sobre un velo (ilegible en el
celular) y una foto por hoja (veinte fotos `large` contra el techo de 4,5 MB).

Una infografía de verdad **no usa el texto tal cual**: una idea por hoja son
textos cortos, y eso hay que pedírselo al modelo. Cambia lo que se le pide, así
que es un formato como el recetario: se elige antes de generar y gasta una
generación. Decidido el 14/09/26, con la explicación en la mano: *"si lo vamos
a hacer lo vamos a hacer bien, no importa si tarda más"*.

### Las decisiones

- **La unidad es la lámina.** Título (hasta 70 caracteres), texto (hasta 280,
  cortado en una idea entera como los pasos de receta), hasta 3 datos cortos
  (hasta 80 cada uno), y la frase para buscar la foto. La foto elegida a mano
  vive adentro de la lámina, igual que en la receta y por el mismo motivo.
- **Los topes son del molde y no perdonan**, como en la receta: una lámina es
  una hoja y la hoja no se estira. Pero al revés que la receta, **la lámina más
  grande posible entra en las cuatro hojas por construcción** —no hay
  ingredientes variables—, así que no hace falta la medición HOLGADA / APRETADA:
  hay UNA medida de texto, y lo único que cede es la foto de `libro` y de
  `manual`, que se achica hasta un tercio de la hoja si el texto la necesita y
  crece hasta más de la mitad si sobra. Lo que sí hay es un candado (LAM-PDF,
  ocho variantes: cuatro moldes, con y sin foto) que arma la lámina más grande
  posible y verifica que salga UNA hoja.
- **Cinco por llamada** (`LAMINAS_POR_LLAMADA`). Una lámina son unos 170 tokens
  de salida; cinco caben holgadas en una llamada y no se degrada la quinta como
  se degradaría un segundo capítulo. Se mide con la primera generación real.
- **10 / 20 / 30 láminas**, elige quien vende, y va en la tapa como "10
  LÁMINAS". De fábrica 10: una guía rápida es corta. Con cinco por llamada son
  2 / 4 / 6 secciones, adentro de `CAPITULOS_MAX`.
- **El temario tiene secciones**, como el recetario: "Antes de empezar",
  "Errores comunes", "Lo que nadie te dice". La hoja de contenido lista las
  láminas, no las secciones.
- **Se guarda igual que el recetario**: grupos por sección en la misma columna
  `capitulos`, cada elemento una llamada cobrada. El bucle de las tres rutas no
  cambia.
- **Los cuatro moldes le cambian la hoja**, con un campo `lamina` en `Molde`:
  `libro` → foto de banda arriba y el texto en el papel; `compacto` → la foto
  ocupa la mitad izquierda a toda altura y el texto va a la derecha; `manual`
  → el número enorme en la franja del costado, foto baja y el texto en la
  columna angosta; `cartel` → la foto tapa la hoja y el texto va encima del
  velo, abajo.
- **El lector descarta la lámina entera** sin título o sin texto —media hoja en
  blanco adentro de algo vendido—, y por eso el editor avisa antes de guardar,
  con la misma regla. Los datos pueden ir vacíos.

### Las piezas, en orden — HECHAS (14/09/26), menos la última

- ✅ `ebook-opciones`: el formato, la cantidad, cómo se llama cada cosa. Y dos
  funciones que faltaban para no seguir escribiendo ternarios: `unidadesElegidas`
  (cuántas cosas tiene que tener el ebook terminado, según el formato) acá, y
  `seccionesElegidas` en `ebook-ia`.
- ✅ `ebook-ia`: la lámina, los topes, los dos prompts, los esquemas, el lector.
  Y **`partesEscritas`**, que cuenta secciones y unidades en los tres formatos:
  hasta hoy esa cuenta estaba escrita siete veces con un `esRecetario ? … : …`
  cada una, y el tercer formato la convertía en siete ternarios de tres ramas.
- ✅ `ebook-estilos`: el campo `lamina` del molde, su explicación por estilo y
  `HOJA_DE_LAMINA` (fracciones de la hoja, para el archivo, la miniatura y la
  previa).
- ✅ `ebook-pdf`: `hojaDeLamina` con los cuatro acomodos, en UNA función de
  bloque de texto con los colores y el ancho como parámetros —escrita cuatro
  veces, el día que se toque el aire del título en `cartel` los otros tres se
  quedan viejos—. La hoja de contenido y el sello dicen "LÁMINAS".
- ✅ `ebook-borrador`: cuenta con `partesEscritas` y `unidadesElegidas`.
- ✅ Las cinco rutas. `paso` ya no tiene tres ternarios por línea: arma un
  `plan` por formato —instrucciones, esquema, pedido, lector y mensaje de
  error— y la llamada al modelo es una sola.
- ✅ El editor: `infografia-texto` (revisa con las reglas del lector y avisa
  antes de guardar) e `InfografiaTexto` (cada campo con su contador a la vista,
  los datos se mueven y se borran sin mínimo). En `EditorClient` el guardado de
  los formatos por hoja salió a `guardarPorHoja`, uno para los dos.
- ✅ La previa (`VistaPreviaInfografia`), la miniatura (`LaLamina`) y la tarjeta.
- ✅ El modal: la tercera tarjeta, en tres columnas, y el selector de 10 / 20 /
  30 láminas.
- ✅ Los chequeos: 8 LAM-PDF, 5 EST-L*, 18 LAM-* en `ebook-ia`, 5 OPC-L* y el
  archivo nuevo `infografia-texto.check` con 24. Los 91 archivos pasan.
- 🔲 **La primera generación real, medida.** Cuesta centavos y se hace a pedido:
  hay que anotar tokens de salida por lámina, segundos por llamada y dólares,
  y con eso confirmar o corregir `LAMINAS_POR_LLAMADA` y el `max_tokens` de
  3.000.
- ✅ ~~**Mirar la pantalla.**~~ No hay cuenta digital para entrar en local desde
  acá, así que el modal con las tres tarjetas, el selector de láminas y las
  miniaturas los miró el dueño en su navegador (14/09/26): se ven bien en los
  tres anchos. El editor de láminas con contenido queda para después de la
  primera generación real, porque hasta ahí no hay nada que mostrar.

### Lo que apareció haciéndolo

- ⚠️ **Los créditos se metían en la última lámina.** En `compacto` el texto va
  centrado y en `manual` es corto, así que abajo sobra papel y la caja de
  créditos lo tomaba como lugar libre: se dibujaba encima de la foto de la
  izquierda. Se vio con el candado LAM-PDF, que esperaba una hoja más y no la
  encontraba. Ahora cada lámina deja el cursor al pie de la hoja: lo que siga
  abre hoja nueva.
- ⚠️ **El velo de `cartel` era flojo para una lámina.** Con la tapa alcanza,
  porque es un título de tres palabras; acá el texto ES la hoja, y con una
  foto clara (se probó con quesos sobre fondo blanco) el blanco flotaba sobre
  gris. El velo de la lámina arranca antes y llega más oscuro que el de la
  tapa.
- **La foto cede, y también crece.** Con la foto fija en la mitad, `manual`
  dejaba media hoja de papel vacío con una lámina corta. Ahora `libro` y
  `manual` miden el bloque de texto y le dan a la foto todo lo que sobra, entre
  un tercio y algo más de la mitad de la hoja.
- **Las hojas se miraron de verdad**, no sólo se contaron: se dibujaron los
  cuatro PDF con pdf.js adentro del Chromium de Playwright (no había
  `pdftoppm` en la máquina) y se revisaron a ojo. El guion quedó en el
  scratchpad de la sesión, no en el repo.
- **`SEL-K` de `ebook-texto.check` fallaba desde antes** en esta máquina:
  `EbookTexto.tsx` está en CRLF en la copia de trabajo y el regex pedía `\n`
  pelado. Ahora acepta `\r?\n`.
- El ejemplo de desarrollo (`?ejemplo=1`) sigue siendo un ebook de texto: para
  ver el editor de láminas con contenido hace falta una infografía generada de
  verdad.

---

## Caer a Free apaga las páginas de más — 14/09/26

Estaba anotado dos veces como "no se puede escribir todavía, falta el modelo
de producto" (Fase 5). La Fase 5 terminó el 02/09 y nadie volvió a esas
líneas: una cuenta que caía de Pro a Free seguía con **cinco páginas
publicadas en un plan que vende una**, para siempre. No era el lado seguro:
era el plan de arriba gratis para quien deje de pagar.

### Qué hace

En la misma vuelta del cron que escribe la caída (`7 bis`):

1. **Apaga las de más.** `despublicarLasDeMas` (en `caida-a-free.ts`) lee lo
   publicado de la tienda, cuenta las ventas de cada uno y **despublica** —no
   borra— lo que pasa el tope de Free. Se quedan **las que más vendieron, y a
   igual venta la más antigua** (`lasQueSobran`). Es la regla que la persona
   hubiera elegido si le preguntaran; entre las que no vendieron nada, la
   primera que armó es la principal casi siempre.
2. **Los bonos y los upsells también**, con la misma regla y por producto, que
   es como los cuenta el plan. Se revisan los hijos de TODOS los principales
   publicados, incluidos los que se acaban de apagar: si después cambia cuál
   queda prendida, la que prende ya tiene que estar dentro del tope.
3. **El aviso de adentro nombra lo que se apagó**, y sale **el mail**
   (`sendCaidaAFreeEmail`) con la lista, para quien no entra al panel hace
   semanas — que es justo el que dejó de pagar. Si apagar falla, el estado ya
   cayó, el aviso y el mail salen igual, y el error queda escrito.

### ⚠️ La segunda puerta, que es la que lo sostiene

El tope del plan se cobraba en UNA puerta: crear (`topeDe`, contando los que
existen). Alcanzaba mientras un plan sólo podía subir. Con la caída hay que
cerrar la otra: **no se publica uno si ya hay tantos publicados como permite
el plan** (`porQueNoSePublica`). Sin esto, el cron apaga a la noche y ella
vuelve a publicar a la mañana, y el cron ni siquiera vuelve a mirarla —sólo
corre para las que cayeron ese día—.

Está en los dos lados con la MISMA función: la ruta `PATCH` cuenta los
publicados del grupo en la base y corta con 409; la pantalla apaga el botón
con el mismo texto en una franja ámbar —no roja: al producto no le pasa nada,
es el plan el que no tiene lugar— y arriba dice "tu plan publica una y tenés
3: 1 publicada, el resto en borrador". Sólo se ve en una cuenta que cayó;
con el plan de siempre nunca hay más publicados que el tope.

Sin candado en publicar, a propósito: dos pestañas apretadas en el mismo
instante consiguen UNA página de más en su propio plan. El alta sí lo lleva
porque ahí la IA crea tres de una sentada.

### Lo que se cuidó

- **El mail se miró dibujado**, con y sin páginas apagadas, y con un nombre con
  `<b>` adentro para ver que se escapa. El panel también, con una Free de tres
  páginas y dos bonos, a 1100 y a 360.
- 24 chequeos nuevos en `productos-digitales.check` (PUB-*, SOBRA-*, CAIDA-*):
  las dos funciones puras se ejecutan; la ruta, el cron y la pantalla se leen.

### ✅ Lo que apareció y era una decisión — tomada el mismo día

- ~~**El dominio propio sigue andando después de caer a Free.**~~ Se decidió y
  se hizo en la sección siguiente: sin Pro redirige, y a los 90 días se suelta.

---

## El dominio cuando ya no hay Pro — 14/09/26

Salió de la pregunta de Flavio al terminar lo anterior: *"en Pro son 5
productos, o sea 5 dominios; ¿qué pasa cuando elimina el producto? ¿y cuando
baja de plan? ¿y si vuelve a pagar? ¿avisamos?"*. Cada caso estaba resuelto
distinto, o no estaba resuelto:

| Caso | Antes | Ahora |
|---|---|---|
| Borra el producto | ✅ se soltaba (base, Vercel, captcha) | igual |
| Lo despublica | el dominio no contesta; queda anotado | igual |
| Cae a Free con la página publicada | **el dominio seguía andando como en Pro** | redirige a la dirección de tiendaapps |
| Lleva mucho en Free | nada, para siempre | a los 90 días se suelta, con aviso 7 días antes |
| Da de baja la cuenta | 🔲 quedaban tomados en Vercel | se sueltan en el acto, y todo queda despublicado |
| Vuelve a Pro | — | el dominio vuelve solo (nunca se desconectó); si ya pasaron los 90, lo conecta de nuevo en un clic |

### La regla, una sola

> El dominio se conecta con Pro y **vive mientras haya Pro**. Sin Pro no se
> rompe: **redirige** a la dirección de tiendaapps, que nunca se apaga. Se
> suelta de Vercel sólo cuando ya no va a volver.

Por qué redirigir y no apagar: los anuncios y los links que apuntan al dominio
siguen llegando a la página. Lo que la persona pierde es la marca en la barra
del navegador, que es exactamente lo que pagaba Pro. Y por qué no dejarlo
andando: es la función más visible de Pro, gratis para siempre para quien deje
de pagar.

Por qué 90 días y no nunca: Vercel gratis da **50 dominios por proyecto** y
cada Pro puede traer 5. Diez cuentas Pro y se acabó, salvo que se suelten los
que dejaron de servir.

### Las piezas

- **`Subscription.freeDesde`** (columna nueva, migración `20260914150000`):
  desde cuándo está en Free por haber caído. La escribe `caidaAFree()`; probar
  o pagar la borra. Las cuentas que cayeron antes de la columna quedan en
  `null` y el cron les pone hoy la primera vez que las ve: cuentan desde ahí,
  no desde una fecha que no se guardó.
- **`aDondeRedirige`** en `dominio-digital`: pura, mira el tier y nada más. Una
  Pro en gracia sigue siendo Pro; una vencida la baja el cron ese mismo día.
- **`/api/public/dominio`** devuelve `redirigir` cuando la dueña no tiene Pro,
  y **el middleware** hace el salto con **307 y no 308**: cuando vuelva a Pro
  tiene que dejar de redirigir, y un 308 el navegador lo recuerda para
  siempre. Conserva la ruta y la búsqueda: un link de anuncio con `?utm=`
  llega entero. Con el cache de 5 minutos del middleware, volver a Pro tarda
  eso en verse.
- **El cron, sección 7 ter**: sólo las Free CON dominio (filtra por la tienda,
  así que las Free que nunca conectaron nada ni se leen). `momentoDelDominio`
  dice "nada", "avisar" o "soltar". El aviso sale una vez por caída, y la
  marca es el aviso de adentro del panel (`DIGITAL_DOMINIO_AVISO` posterior a
  `freeDesde`): no hizo falta otra columna. Soltar es `soltarLosDominiosDe`,
  fail-soft de a uno; lo que falló queda para mañana.
- **Dar de baja la cuenta** (`/api/cuenta` DELETE): una cuenta digital ahora
  despublica todo y suelta sus dominios. El cierre completo de la cuenta
  digital —anonimizar la tienda, qué pasa con las descargas de quien pagó—
  sigue siendo la "zona de peligro" anotada más arriba.
- **Tres avisos**: en la pantalla del dominio, ANTES de conectarlo ("anda
  mientras tengas Pro; sin Pro redirige, y a los 90 días se desconecta solo");
  en el mail de la caída a Free, con cada dominio y a dónde manda; y el mail
  del dominio (`sendDominioEnFreeEmail`, uno solo con dos tiempos: "se
  desconecta el 13 de diciembre" y "ya no apunta acá").
- **La pantalla del dominio sin Pro y con dominio** —la cuenta que cayó— antes
  ESCONDÍA el dominio que seguía conectado (caía en la rama "viene con Pro").
  Ahora lo muestra "Redirigiendo", con la fecha en que se suelta y las dos
  salidas: volver a Pro, o desconectarlo ya (sin pedir plan: el dominio es de
  la persona).
- 25 chequeos nuevos en `dominio-digital.check` (FREE-A..Y). Los tres mails y
  la pantalla se miraron dibujados, a 768 y 360.

### ⚠️ Para el deploy

La migración es aditiva (una columna que admite nulos) y la aplica el build de
producción solo (`migrar-solo-en-produccion`). Hasta ese deploy, en local el
cron y la pantalla del dominio fallarían al leer `freeDesde` contra la base
real; el resto anda igual. Si hace falta probarlo en local antes:
`npx dotenv -e .env.local -- npx prisma migrate deploy`.

---

## Sólo Mercado Pago — 14/09/26

El ítem pendiente era "avisar antes de comprar que con transferencia la entrega
no es automática". Al ir a ponerlo apareció que **la transferencia no existía
del lado del comprador**: Configuración → Pagos dejaba prenderla y cargar CBU,
alias e indicaciones (Starter y Pro), la tabla de planes y la pregunta
frecuente de precios la prometían, y el checkout sólo ofrecía Mercado Pago. La
casilla decía "quien te compra ve tus datos y te deposita" y eso no pasaba
nunca.

### La decisión

Se pensó construirla entera —código de compra en el concepto, "Ya transferí"
con comprobante, confirmar en Ventas, mails, cancelación a los 7 días— y se
descartó. Decisión de Flavio: **el único medio de cobro es Mercado Pago.** Los
motivos, en orden:

1. **La comisión no se puede retener.** Vive adentro del cobro de MP
   (`marketplace_fee`); en una transferencia no pasa un peso por nosotros.
   Cobrarla igual obligaba a anotar deudas y descontarlas en la venta
   siguiente: invisible para el vendedor y esquivable vendiendo sólo por
   transferencia. No.
2. **Rompe lo mejor del producto digital**: la entrega automática. Con
   transferencia alguien paga un sábado y recibe el archivo cuando el vendedor
   mira el banco, y los reclamos "pagué y no me llegó" son nuestros.
3. **Es más problema que plata.** Confirmar a mano, comprobantes falsos,
   soporte. El ecosistema se armó para que no haya nada de eso.

La palanca que se pierde —"desde Starter podés cobrar por transferencia"— se
acepta perderla. Starter y Pro se venden por las páginas, la IA, la comisión
más baja y el dominio.

### Lo que se sacó

- La sección "Transferencia bancaria" de `TabPagos`, con su candado de Free,
  el tipo `DatosTransferencia`, y todo lo que la sostenía en
  `ConfiguracionClient`, `configuracion/page` y la ruta (que ahora ignora
  `transferencia` si llega de un navegador con JS viejo).
- `TRANSFERENCIA_DIGITAL` de `planLimits`, la fila de la tabla de planes, y
  `datos-bancarios.ts` con su chequeo (validación de CBU: no la usaba nadie
  más; está en el historial si vuelve a hacer falta).
- La pregunta frecuente de precios ahora contesta **no**, con el motivo de la
  entrega.
- Los chequeos del candado se dieron vuelta: ahora cuidan que no vuelva a
  medias (ni un campo de CBU en la pantalla, ni una rama en la ruta, ni la
  fila en la tabla).

Lo que ya estaba guardado en `storeConfig.paymentInfo.transferencia` de alguna
cuenta digital queda ahí, muerto: nada lo lee.

### ⚠️ Lo que sigue siendo cierto

"Al instante" sigue sin estar en los sellos de la página de venta, pero ya no
por la transferencia: adentro de Mercado Pago se puede pagar en efectivo
(Rapipago, Pago Fácil) y ahí el pago queda pendiente hasta que la persona va a
pagar. La entrega sale sola apenas se aprueba; el "instante" no es siempre.

---

## El techo duro cuenta los borrados — 14/09/26

Era lo único abierto de la Fase 2: "un tope anti-abuso por arriba de las 5
páginas de Pro, como `MAX_PRODUCTS_POR_TIENDA`". Al ir a escribirlo, no tenía
sentido tal cual: en tiendas hace falta porque el plan se elige en el registro
y Premium no tiene tope; **en digitales el tope del plan ya es el techo de lo
vivo** —Pro son 5 aunque te marques Pro sin tarjeta—. Un número por arriba de
5 era la constante muerta que el plan mismo decía que no había que escribir.

**El agujero estaba en otro lado: los borrados.** Un producto borrado no se
borra (queda con `deletedAt`, porque los pedidos apuntan a él) y deja de
contar para el plan. "Crear 5, borrar 5" en bucle no choca con nada, y con el
límite de 60 creaciones por hora un script deja 1.440 productos por día, cada
uno con su PDF en el depósito de Supabase — que es el que se pasa por egress.

**Lo que se hizo:** `MAX_PRODUCTOS_DIGITALES_CREADOS = 200`, contando los
creados *alguna vez* por la cuenta, borrados incluidos. Va adentro de la misma
transacción con candado que el tope del plan, después de contar los vivos y
antes de crear, y contesta 409 con "escribinos" sin decir el número. Lo máximo
vivo en Pro son 45 (5 páginas + 25 bonos + 15 upsells); una cuenta real que
rehace y borra en un año no llega a 100. No es comercial, no va en los
términos ni en ninguna pantalla. Cinco chequeos (TECHO-A..E).

Aclarado con Flavio, porque se prestaba a confusión: **nada de esto es por
mes**. El tope del plan es "cuántos podés tener a la vez" (Pro: 5, siempre, no
5 nuevos cada mes; pagar de nuevo no da ni saca); lo único mensual en
digitales es el cupo de IA. Y el techo de 200 es de toda la vida de la cuenta.

---

## Reemplazar un archivo ya vendido, y los términos 1.9 — 14/09/26

Las preguntas de Flavio, en orden, y lo que se contestó mirando el código:

- *"¿No debería ser una descarga y listo?"* No lo hace nadie, porque la
  descarga falla: se corta el wifi, el celular la guarda donde no se encuentra,
  se bajó en el teléfono y se quiere en la computadora. Damos **5 descargas en
  30 días**, que ya estaba decidido. Hotmart da un área de miembros permanente;
  Gumroad, una biblioteca para siempre; los dos entregan el archivo *actual*
  y, si el vendedor lo cambia, todos ven el nuevo.
- *"¿Y si compro mecánica y el dueño lo cambia por literatura?"* El que compró
  mecánica **ya la tiene**; mientras le dure el enlace, además se baja
  literatura. Pierde el dueño, no el comprador. Y es un caso que casi no
  existe: para vender otra cosa se crea otro producto (tiene su página, su
  precio y su dirección). Reemplazar es para corregir o sacar la versión 2.
- *"¿Y si elimina el producto que ya se vendió?"* El comprador no pierde nada:
  borrar es una marca, el archivo queda **30 días en cuarentena** —el mismo
  plazo que el permiso más largo posible—, y ya estaba en los términos.
- *"¿Cómo nos cubrimos legalmente, y cómo sabemos cuánto descargó?"* Ya
  estaba: 2 bis (la venta es del vendedor, art. 40 dicho en voz alta) y 5 (30
  días, 5 descargas, y de cada descarga fecha, IP y navegador, "para poder
  defender un cobro"). El vendedor ve en Ventas cuántas veces bajó cada uno y
  cuándo; la IP la tenemos nosotros.

### Lo que se hizo

**No se toca la entrega.** Se le dice al vendedor, tres veces:

- **En la tarjeta**, sólo si el producto ya tuvo una venta cobrada (se cuenta
  en la misma consulta, `_count` de `orderItems` con orden `CONFIRMED`): *"Ya
  se vendió: si lo reemplazás, quien compró baja el archivo nuevo mientras le
  dure el enlace. Sirve para corregir; para vender otra cosa, creá otro
  producto."*
- **Al reemplazar**, una confirmación con lo mismo. Sólo con archivo y con
  ventas; a un producto nuevo no se le pregunta nada.
- **Al borrar** un producto vendido, el aviso agrega que quien lo compró lo
  sigue bajando hasta que le venza el enlace.
- **En los términos**, sección 5: el enlace entrega el archivo actual; pisar
  un producto con otro distinto es responsabilidad del vendedor frente a quien
  compró.

### ⚠️ Los términos suben a 1.9, y no por esto solo

Al ir a escribir la línea de arriba apareció que **2 ter contradecía lo hecho
a la mañana**: decía *"si tu plan Pro se vence, el dominio que ya tenías
conectado sigue funcionando"*, y desde hoy redirige y a los 90 días se
suelta. Un vendedor que cae a Free tenía un contrato que le prometía lo
contrario de lo que le pasaba. Se reescribió con los números saliendo de la
misma constante que los aplica (`DIAS_DE_DOMINIO_EN_FREE`,
`DIAS_DE_AVISO_DEL_DOMINIO`).

Subir la versión dispara el banner de re-aceptación para todos y el mail del
cron a quien no vuelva a entrar; el resumen del mail cuenta sólo lo de 1.9.
**Es parte de lo que sale con el deploy**, junto con la migración de
`freeDesde`: el día que se deploye, la gente va a ver el banner.

Seis chequeos nuevos en `panel-digitales.check` (18 bis).

### Y las estadísticas

Flavio preguntó si para estadísticas hay que guardar todo esto. **Ya se
guarda**: cada venta con su fecha y monto, cada descarga con su fecha, y los
carritos que no terminaron. La pantalla de estadísticas sigue pendiente
"cuando haya qué mostrar", y cuando se haga va a leer eso mismo; no hace
falta anotar nada más por ahora.

---

## Deploy del 14/09/26 — cerrado

Doce commits a producción (`7c158609..034c2342`), en verde en 2m 28s. Antes
del push: relectura del diff entero (salió un arreglo: los bonos y upsells de
la caída a Free se revisan por cada principal, publicado o no), `tsc`, eslint,
los 90 chequeos y la compilación de producción completa en local.

Verificado desde afuera después del deploy: `/terminos` muestra las dos líneas
de 1.9. Lo de `/precios` para digitales se dibuja al tocar la tarjeta, así que
se mira en el navegador.

Lo que corre solo a partir de acá, y conviene mirar la primera vez:
- La migración `freeDesde` la aplicó el build.
- El banner de términos 1.9 les aparece a todos al entrar; el cron manda el
  mail a quien no vuelva.
- El cron de la noche: `result.digitales` ahora trae `caidasAFree`,
  `despublicadas`, `dominiosAvisados` y `dominiosSoltados`.

---

## ⚠️ Supabase: cuota pasada, y el Site URL — 14/09/26

Visto en el panel de Supabase (Authentication → URL Configuration) al ir a
verificar el Site URL:

- ✅ ~~**El Site URL seguía en `tienda-six-ecru.vercel.app`.**~~ Flavio creía
  haberlo cambiado; no. Cambiado a `https://www.tiendaapps.com` el mismo día.
  Sólo importa como respaldo —todos nuestros mails pasan su propio
  `redirectTo`—, pero un mail de Supabase con la dirección vieja parece
  phishing y depende de que esa dirección siga viva.
- 🔲 **"Organization exceeded its quota in the previous billing cycle. Projects
  will be restricted from 28 Sep, 2026."** Mirado el mismo día en *Usage*: el
  ciclo actual (14 sep – 14 oct) recién arranca, **39,5 MB de Cached Egress en
  el día** → ~1,2 GB proyectados sobre 5 GB. Lo que se pasó fue el ciclo
  anterior, Cached Egress, con las dos semanas previas al arreglo de las
  imágenes del 31/08. Base 7%, depósito 28%. **Decisión: no pagar el Pro por
  ahora.** 🔲 **El 25/09** volver a mirar la misma pantalla: si Cached Egress
  pasa de 3 GB, pagar el Pro ese día (US$25/mes) y buscar qué lo consume —el
  Pro también tiene cuota (250 GB) y cada venta de un PDF es egress—.

---

## "Tu uso" en Mi cuenta — 14/09/26

La tarjeta que la competencia pone en "Mi plan" (Tiendas 1/1, Almacenamiento
92 KB…) y que acá se había postergado porque no había qué contar. Ahora sí:
va entre la comisión y la lista de funciones, porque "cuánto me queda" se
mira más que "qué incluye".

Qué muestra, y por qué así:

- **Páginas de venta: creadas de tope**, con barra. Se cuentan las CREADAS y
  no las publicadas porque el tope cierra la puerta de crear; cuántas están
  publicadas y cuántas en borrador va escrito debajo. Si hay más creadas que
  el tope —cayó de plan—, la barra se pone ámbar y un texto dice que no se
  borró nada, que las de más quedaron en borrador y que no puede crear otra
  hasta borrar alguna o subir de plan.
- **Bonos y upsells, por página**, un renglón cada una con `3/5 bonos · 1/3
  upsells`. No van en una barra sola porque el tope es POR PRODUCTO, no por
  cuenta. Las páginas en borrador figuran igual, marcadas.
- **Archivos subidos: cantidad y peso** ("9 · 37,4 MB"), sin barra: no hay
  tope por plan contra qué medir, y una barra sin tope es una barra contra
  nada. Los huérfanos —bonos cuyo padre se borró— no cuentan en ninguna
  página pero sí pesan: están en el depósito igual.
- **Las dos bolsas de IA por separado** (armar la página / escribir ebooks):
  cuántas quedan, la barra de lo gastado, y debajo de dónde salen —"8 de este
  mes (vuelven en octubre) · 12 de bienvenida"—. Un plan sin cupo dice "No
  viene con Free" debajo del título. El cupo de ebooks se lee con `enPrueba`,
  igual que la ruta que lo gasta: el número de la pantalla tiene que ser el
  que aplica el servidor.

Dónde vive: `lib/uso-digital.ts` es puro —`armarUso`, `pesoLegible`,
`nombreDelMes`— y **no toca la base a propósito**: lo importa la tarjeta, que
es un componente de navegador, y un import de Prisma desde ahí arrastra el
cliente entero al bundle. La consulta está en `mi-cuenta/page.tsx`, con el
mismo techo de filas que la pantalla de productos. Chequeos en
`uso-digital.check.ts` (USO-*, PESO-*, TARJ-*). Mirado en 360, 768 y 1280 con
tres cuentas: Pro llena, Free caída con tres páginas, y Free vacía.

También se tacharon dos pendientes viejos que ya estaban resueltos: los
pasos de creación en `/digitales` y el llamador de `pruebaYaUsada`.

---

## Estadísticas — 14/09/26

Mirada la pantalla "General" de la competencia (Impultienda) captura por
captura, y decidido qué se copia y qué no:

| Ellos | Nosotros |
|---|---|
| Hoy / 7 / 30 / 90 / Todo | Igual. "Todo" son 730 días: la retención de las visitas; más atrás la conversión sería inventada. |
| Ingresos · Ventas · Ticket promedio · Conversión | Los cuatro números. "Te quedó" es el destacado: bruto menos la comisión congelada de cada orden, la misma cuenta que Ventas. |
| Visitas por día · Ingresos por día | Visitas y ventas por día, barras en SVG servidas del servidor. Por semana o por mes cuando el rango es largo (`serie-grafico`). |
| Embudo (bloqueado en Pro) | Entraron → abrieron el pago → pagaron. |
| Productos más vendidos | "Por producto": ventas, neto, visitas y conversión de cada página, de más a menos plata. |
| Estado de órdenes | No: acá son cobradas o devueltas, y las devueltas van en "Después de la venta". |
| Métodos de pago · Ventas por país | No: un solo medio (MP) y un solo país. |
| Visitantes en vivo | No por ahora: consulta abierta contra el egress de Supabase, que es lo que aprieta. |
| Campañas UTM (pantalla aparte) | "De dónde vienen", en la misma pantalla, con la lista cerrada de `origen-visita` que ya usan las tiendas — y con las VENTAS por canal, no sólo las visitas. |

**Por producto y en general**, con el mismo selector que el inicio: cada
principal es su propio sitio y una cuenta Pro tiene cinco. Con un solo
producto no hay selector ni tabla "Por producto": aparecen con el segundo.

### Lo propio de un producto digital (lo que la competencia no tiene)

Pensado el mismo día: lo copiado era de tienda genérica. Lo que importa
después de vender un archivo es otra cosa, y todo esto ya estaba guardado:

- **Descargas** por compra: bajaron / no bajaron / se les venció sin bajar.
  El que pagó y no bajó es el que va a escribir "no me llegó".
- **Devoluciones**: tasa (sobre cobradas + devueltas) y motivo, arrepentimiento
  o contracargo. ⚠️ Una devolución **no tiene estado propio en la base**:
  queda `CANCELLED` con el pago en `REFUNDED` y el motivo en
  `OrderStatusLog.changedBy`. La primera versión de la pantalla las buscaba
  por un `REFUNDED` que no existe y las contaba como cero; hay chequeo.
- **Upsell**: cuántas ventas lo llevaron y cuánta plata extra dejó. El
  embudo entero existe por esto y no había un número que dijera si anda.
- **Mail de entrega**: salidos y fallados (lo que Resend rechazó; los rebotes
  posteriores no se saben sin webhook).
- **Compradores que repiten**: distintos, y cuántos compraron más de una vez.
- **Cuándo se vende**: por día de la semana y por hora, en hora argentina.
- **Celular vs computadora**: va en la clave de `DigitalVisita`
  (`dispositivo`), decidido por el servidor con "puntero grueso".
- **De dónde vino cada VENTA**: la página anota referente y utm al entrar
  (`anotarOrigen`, en localStorage, pisado en cada entrada con algo que decir),
  el checkout lo manda al comprar y `/api/digitales/comprar` lo clasifica y lo
  guarda en `Order.origenVisita`. Sin nada anotado queda null, no "directo".
- **Carritos recuperados**: los que quedaron en la puerta, a cuántos les
  escribió el mail automático y cuántos volvieron a pagar.

Afuera: tiempo entre visita y compra (pide guardar demasiado por visitante).

### Qué ve cada plan — por PREGUNTA, no por número

Regla de Flavio, y es la correcta: un bloque a medias en un plan es peor que
no tenerlo. Cada bloque entra entero en el plan donde entra, o entra con
candado (`DESDE_QUE_PLAN` en `estadisticas-digitales`):

- **Free — "¿vendí y entregué bien?"**: los cuatro números, ventas por día,
  Por producto (ventas y plata) y **todo "Después de la venta"**. Free
  también vende y también tiene que atender al que compró.
- **Starter — "¿la página funciona?"**: visitas por día, conversión, Por
  producto con visitas y conversión, celular vs computadora, cuándo se vende.
- **Pro — "¿dónde invierto?"**: embudo, de dónde vienen (visitas y ventas
  por canal), carritos recuperados (el mail es de Pro, el número también).

Los bloqueados se dibujan borrosos con "Disponible desde Starter/Pro",
**pero con números de muestra**: borroso con los reales, cualquiera los lee
con el inspector. `featuresDigital` promete lo mismo en /precios, el registro
y Mi cuenta, y un chequeo lo exige.

### Cómo se cuentan las visitas

Dos tablas nuevas, `DigitalVisita` (producto, día, paso "pagina"/"pagar",
dispositivo, cuenta) y `DigitalVisitaOrigen` (producto, día, origen, cuenta),
calcadas de `StoreView` + `StoreFunnelStep` + `StoreViewSource` pero colgadas
del producto. El ping lo manda `VisitaDigital` desde la página pública y el
checkout, nunca desde la previa del editor. Mismas reglas que tiendas: una
por navegador por día argentino, bots y tope por IP con `visitaLegitima`, la
dueña descartada mirando la sesión sólo si hay cookie —quien compra no tiene
cuenta, así que casi nunca la hay—. Retención igual que tiendas en el cron de
limpieza.

⚠️ La migración la aplica el build de producción. Hasta ese build la ruta
del ping contesta "no contada" y la pantalla dice cero visitas, sin caerse:
las dos tienen su try. **La historia arranca el día del deploy**, no antes.

Dónde vive: `lib/estadisticas-digitales.ts` es la cuenta, pura y probada
(`estadisticas-digitales.check.ts`: RANGO-*, PLAN-*, CUENTA-*, POSV-*,
CUANDO-*, ORIG-*, CARR-*, PANT-*, ORDEN-*); `lib/visitas-digitales.ts` el
ping y el origen anotado (`visitas-digitales.check.ts`); la consulta en
`digitales/estadisticas/page.tsx`, con techo en cada lista. Mirado en 360,
768 y 1100 con Pro, Pro mirando un producto, Starter y Free.

- 🔲 **Lo que queda para después:** exportar a PDF/CSV como Métricas de
  tiendas; comparar contra el período anterior; los rebotes reales del mail
  (webhook de Resend).

---

## Campañas UTM — 14/09/26 (noche)

Flavio trajo la pantalla "Campañas UTM" de la competencia y preguntó qué era.
Un UTM son las etiquetas del link (`?utm_source=instagram&utm_medium=pago&
utm_campaign=lanzamiento&utm_content=video2`): la persona no nota nada, la
página lo lee al entrar y anota de dónde vino y de qué anuncio. Para el que
paga publicidad es LA métrica: "el anuncio 'video2' trajo 3 ventas y el
'foto' ninguna" es lo que le dice qué apagar. Nosotros teníamos sólo el
`utm_source` (el canal); esto baja un escalón: **campaña y anuncio**, con
visitas **y ventas**.

Hecho **de a un paso, con la cabeza en el abuso** (pedido explícito: nada
de apuro, nada que abra la puerta a bots), porque acá lo que se guarda es
texto que manda un desconocido desde la URL y termina en la clave de una
tabla y en la pantalla de la dueña:

1. **La base** — `DigitalVisitaCampania` (producto, día, medio, campaña,
   anuncio, cuenta) y `Order.utmMedio/utmCampania/utmAnuncio`. Migración
   comparada contra la base real antes de escribirla.
2. **La limpieza** — `lib/utm-digital`, pura y probada con lo que mandaría
   un bot (`utm-digital.check.ts`, 26 chequeos):
   - el **medio va a lista cerrada** (pago / orgánico / mail / historia /
     otro), con las palabras que ponen Meta, Google y la gente;
   - campaña y anuncio se **limpian** (sin control, sin ángulos ni
     comillas, espacios juntos, minúsculas, 80 caracteres);
   - **campaña sólo si vino con `utm_source`**: una campaña sin fuente es
     alguien jugando con la URL;
   - **techo de 50 combinaciones por producto y por día**; la 51 cae en una
     sola fila `(otras)`, y `(otras)` no se puede mandar desde la URL —lo
     agarró el chequeo TECHO-E: como los paréntesis están permitidos,
     alguien podía mandarlo y mezclarse con la bolsa.
3. **El ping y la orden** — el navegador manda las cuatro etiquetas crudas
   al entrar y las anota con el origen; la ruta del ping aplica el techo
   (una que ya existe suma, una nueva entra si hay lugar), aparte y después
   del origen, en su propio try; la ruta de comprar guarda la campaña
   limpia en la orden, o null.
4. **La cuenta y la pantalla** — bloque **"Campañas"** en Estadísticas,
   **sólo Pro** (con el origen, el embudo y los carritos: "¿dónde
   invierto?"): campaña → anuncio → visitas, ventas, conversión, te quedó,
   de más a menos ventas, `(otras)` al final. Arriba el cuadro **"Si hacés
   anuncios en Meta, pegá esto una sola vez"** con
   `utm_source=facebook&utm_medium=pago&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`
   y botón de copiar: Meta completa los comodines, así cada anuncio se
   etiqueta solo. Mirado en 1100, 768 y 360 (la tabla desplaza de costado).

Lo que **no** se hizo, a propósito: conectar la cuenta de Meta Ads para ver
el gasto y el ROAS (lo que ellos llaman UTMIFLOW y cobran en su plan más
caro). Es una integración con la API de Meta, pide permisos que no
tenemos, y no hay nadie que la pida todavía. Queda anotado.

- 🔲 **Cuando haya una cuenta con publicidad real**: mirar si 50
  combinaciones por día alcanzan (una cuenta normal usa 15) y si el
  "(otras)" aparece alguna vez.
- ✅ **Relectura antes del deploy (paso 5):** la tabla de campañas no estaba
  en el cron de limpieza —se habría acumulado para siempre— y las claves de
  las filas de la tabla podían chocar con nombres con guión. Las dos
  corregidas. Lo que queda abierto y es inherente a cualquier UTM: un bot
  con IPs de sobra puede meter hasta 50 nombres inventados por producto y
  por día; se van al fondo de la lista (se ordena por ventas y visitas) y
  los borra la limpieza a los 2 años.

---

## Estadísticas en dos solapas, y el embudo por canal — 15/09/26 (madrugada)

Flavio vio que la competencia separa "General" de "Campañas UTM" y nosotros
lo teníamos todo en una página larga donde "¿vendí?" y "¿me rinde el
anuncio?" se pisaban. Ahora son **dos solapas** arriba de Estadísticas
—**General** y **Campañas**—, con el mismo selector de producto y de rango,
y la solapa en la URL. Solapas y no submenú de la barra: la barra de
digitales es un riel de íconos y un árbol adentro serían dos íconos sin
nombre (está escrito en la propia barra).

- **General**: los cuatro números, visitas y ventas por día, después de la
  venta, cuándo se vende, embudo, por producto, carritos recuperados.
- **Campañas** (Pro): de dónde vienen, campañas por anuncio, el texto para Meta.

Y con la separación entró lo que ellos tienen y nos faltaba: **el embudo
por canal** — de los que vinieron de Instagram, cuántos abrieron el pago y
cuántos pagaron. Pedía saber el origen también en el paso "pagar", y el
referente de ese pedido no sirve (es nuestra propia página): el navegador
manda el que la página **anotó al entrar**, así los dos pasos miden lo
mismo. `DigitalVisitaOrigen` ganó la columna `paso` (por defecto "pagina",
que es lo que era todo lo escrito) y la clave pasó a incluirla. Migración
comparada contra la base real.

Las tres barras de cada canal van sobre la misma escala, así se ve a simple
vista dónde se cae cada uno: Instagram trae mucho y pocos abren el pago;
WhatsApp trae menos y casi todos pagan. Mirado en 1000 y 360.

---

## Campañas: números arriba, plata por canal, por medio y exportar — 15/09/26

Flavio comparó nuestra solapa Campañas vacía con la de la competencia: la
nuestra decía "todavía no hay nada" dos veces y parecía rota; la de ellos
muestra los números en cero y parece lo que es, esperando datos. Y tienen
exportar, apagado en Free.

- **Cuatro números arriba de Campañas, siempre**: visitas con campaña,
  ventas atribuidas, te quedó por campañas, conversión (con el ticket). En
  cero también. Son sólo lo que vino ETIQUETADO; lo que no trae etiqueta
  está en General.
- **La plata por canal**: cada canal del embudo dice cuánto dejó.
- **Por medio**: pago / orgánico / mail / historia, chips arriba de la tabla
  de campañas. Es la primera pregunta de quien paga anuncios: ¿lo pago rinde
  más que lo gratis?
- **Exportar** la solapa que se está mirando como planilla (CSV con punto y
  coma y BOM, que Excel en castellano abre sin preguntar). **Desde Starter**
  (es la exportación lo que se cobra: Free ve los números en pantalla);
  Campañas sólo Pro porque el bloque es de Pro. El botón sigue la regla y la
  ruta la vuelve a mirar. Tope de 30 por hora: armar el archivo es la
  consulta entera.

⚠️ **Lo importante de exportar es `celda`**, en `lib/exportar-estadisticas`.
Los nombres de campaña los escribió un desconocido desde la URL, y una
planilla EJECUTA una celda que empieza con `=`, `+`, `-` o `@`. Un bot que
visite con `utm_campaign==cmd|...` dejaría una bomba esperando a que la
dueña abra su propio archivo. Toda celda así se antepone con un apóstrofo
(adentro de las comillas), y hay chequeo con esa bomba exacta
(`exportar-estadisticas.check.ts`, CEL-* y CSV-E).

Para que la pantalla y el archivo digan lo mismo, la consulta salió de la
página a `lib/estadisticas-digitales-db.ts` (`cargarEstadisticas`), y las
dos salidas la comparten. Mirado en 1000 lleno, vacío y en Free.

---

## Consejos en cada bloque, y Tus ventas por producto, por fecha, escribirle y exportar — 15/09/26

Flavio miró Estadísticas y Tus ventas en su cuenta (vacía) y las vio flojas:
"se ven muy vacíos todos". Parte es que están en cero —nada reemplaza a ver
una venta real ahí—, y parte era cierto: cada bloque decía "todavía no hay
nada" y no enseñaba para qué sirve ni qué hacer con él.

### Consejos en Estadísticas

Cada bloque (nueve) tiene UN consejo abajo, con lamparita, elegido mirando
los datos en `lib/consejos-estadisticas.ts` (puro, 35 chequeos):

- **Sin datos** explica para qué sirve el bloque y cómo hacer que se mueva:
  "se cuenta una visita por persona por día, las tuyas no cuentan con la
  sesión abierta; poné el link en la bio de Instagram y el estado de WhatsApp".
- **Con datos** dice lo que los números piden: "2 compras cobradas siguen sin
  bajar → Ir a Tus ventas"; "la mayoría paga los martes cerca de las 21 h,
  publicá un par de horas antes"; "abren el pago y no pagan: sólo 20 de cada
  100 terminan"; "Instagram trae más gente, pero en WhatsApp es donde más
  pagan"; "«foto precio» trajo 60 visitas y ninguna venta: la primera para
  apagar".
- **Con pocos datos no inventa**: "todavía son pocas ventas para sacar una
  regla". Los umbrales están arriba de cada regla, con su motivo.
- Los bloques **bloqueados por plan no llevan consejo**: sería un consejo
  sobre números de muestra (chequeo PANT-B).
- De paso quedó dicho en pantalla que **las visitas se guardan dos años**
  (era un 🔲 pendiente).

### Tus ventas

- ✅ **Por producto**: con más de un principal, fila Todos / producto. Filtra
  la lista Y los números de arriba.
- ✅ **Por fecha**: Todo · Hoy · 7 días · Este mes · Mes pasado. Los rangos de
  quien hace cuentas contra lo que liquidó Mercado Pago. Los cuatro números
  pasaron a ser del período: Te quedó · Ventas · Sin bajar · Sin pagar (el
  "Este mes" que era una tarjeta ahora es un chip).
- ✅ **Escribirle** en cada venta cobrada y en el detalle: un `mailto:` con el
  mensaje ya escrito, distinto si bajó el archivo ("¿te llegó el mail?") o no
  ("¿cómo te fue?"), y **WhatsApp** si dejó un celular que parece argentino
  (se normaliza +54 / 0 / 15; si no parece un celular, no hay botón). No manda
  nada solo: abre el borrador y la persona lo cambia.
- ✅ **Exportar** la lista que se está mirando (mismos filtros) como CSV: fecha,
  estado, correo, nombre, producto, bonos, cobrado, comisión, te quedó, si lo
  bajó, id. Desde Starter, misma regla que el de Estadísticas
  (`DESDE_QUE_PLAN.exportar`); la ruta vuelve a mirar el plan; 30 por hora;
  techo de 5.000 filas con aviso adentro del archivo. El nombre lo escribió el
  comprador: pasa por la misma `celda` que desactiva fórmulas.

Para que la pantalla y el archivo filtren igual, lo puro salió a
`lib/ventas-digitales.ts` (rangos, lectura limpia de la dirección, el
`where`, el mensaje y los enlaces; 38 chequeos) y lo que toca la base a
`lib/ventas-digitales-db.ts` (`contextoDeVentas`, el `select` y el mapeo
compartidos). La página quedó en la mitad. Mirado en 360 y 768, vacío y lleno.

Auditoría del commit (antes de deployar) encontró y corrigió cuatro cosas que
los chequeos no veían: el embudo con visitas, gente al pago y CERO ventas
decía "sano"; "De dónde vienen" tomaba la primera fila como el canal que más
trae, pero Directo va último aunque traiga más (y "exprimí Directo" no es un
consejo: ahora manda a etiquetar); 100 % celular decía "10 de cada 10"; un
nombre de puros espacios saludaba "Hola ,". Cada una con su chequeo.

🔲 Que la persona pueda cambiar el texto del mensaje de "Escribirle" desde
Ajustes, en vez del nuestro.
🔲 Bajar sólo los correos (una columna) para pegar en un envío masivo.

---

## Campañas y canales por producto, mirando "Todos" — 15/09/26

Flavio preguntó cómo funciona la campaña UTM en cada producto y si en los
gráficos se distingue qué producto trajo qué. La respuesta era "a medias":
con un producto elegido sí; en "Todos" la tabla sumaba la misma etiqueta de
dos páginas en una fila. Un agujero real para una cuenta Pro con hasta cinco
páginas, cada una con su dominio.

Regla que quedó: **una campaña es de un producto**. En "Todos" con más de un
producto:

- Cada fila de Campañas es "campaña + producto" (la misma etiqueta en dos
  páginas son dos filas, nunca una suma), con su producto en naranja debajo
  del medio y sus anuncios colgando.
- Cada canal de "De dónde vienen" y cada medio de "Por medio" reparten por
  producto: "Mecánica fácil 150 visitas · 2 ventas · $ 23.920 — Guía de
  frenos 20 visitas · 0 ventas".
- El CSV lleva columna Producto en las tres tablas: fila "(todos)" y una por
  producto debajo, y la campaña con el suyo.
- El consejo de campañas nombra el producto ("«foto precio» de Guía de frenos
  trajo 60 visitas y ninguna venta").

Con un solo producto, o con uno elegido arriba, nada de esto aparece: no hay
entre qué repartir. Vive en `armarEstadisticas` (`Reparto`, `repartir`), con
chequeos UTM-K a UTM-P y CSV-I a CSV-K. Mirado en 1000 y 360.

De paso: las claves de las filas de la tabla tenían un byte NUL literal
adentro (el archivo era "binario" para grep); ahora es el escape `\u0000`.

---

## Marketing, paso 1: el píxel que se guardaba y nadie leía — 15/09/26

Flavio pidió revisar Marketing ("está re flojo"). Antes de agregar nada se
miró qué había, y apareció el hueco más grave de todos:

⚠️ **Configuración → Meta guardaba el píxel de Meta, GA y Clarity y NINGUNA
página digital lo leía.** `StoreTrackingScripts` estaba montado sólo en
`/tienda/...`. Alguien pegaba su píxel, corría anuncios, y Meta no veía ni un
PageView. El plan decía "queda cubierta sola" desde el 01/09 y era falso.

Y el segundo, del mismo tema: el píxel **de la plataforma** (el nuestro, en el
root layout) sí cargaba en `/p/...` —no estaba en `RUTAS_EXCLUIDAS_PIXEL`— y
en un dominio propio la ruta que ve el navegador es `/`, así que tampoco lo
excluía. Con el de la vendedora ahora puesto, los dos convivirían y
`fbq('track','Purchase')` le pegaría a los dos.

### Lo que quedó

- `lib/medicion-digital.ts`: lee los tres IDs de `storeConfig` (una sola
  función, que ahora usa también Configuración) y `marcarCompraEnElNavegador`.
- Los tres pasos miden: `/p/[id]` PageView + ViewContent (sólo publicada; la
  previa del editor no); `/pagar` PageView + InitiateCheckout (sólo cuando se
  puede comprar); `/gracias` PageView, y **Purchase cuando la compra se
  confirma de verdad**: la persona vuelve de Mercado Pago antes del aviso de
  pago, así que Purchase sale del navegador cuando `estado-compra` dice
  "listo", una sola vez por orden (el navegador se acuerda), con el id de la
  orden como `eventID` por si un día se suma la API de conversiones.
- `estado-compra` devuelve el `total` con "listo". **Sin el correo
  hasheado**: es una ruta pública por id de orden y un hash de un correo se
  revierte por diccionario; el chequeo GRA-E de `compra-digital` lo frenó.
  Las coincidencias avanzadas, si algún día, van por el servidor.
- `StoreTrackingScripts` ganó el prop opcional `initiateCheckout` (tiendas
  no lo usa; no cambia nada ahí), con la misma lista blanca que ViewContent.
- Píxel de plataforma: `/p` en la lista de excluidas, y `pixelHabilitadoEn`
  ahora también mira el **host**: si no es el nuestro (subdominio o dominio
  propio), no carga. `MetaPixel` toma el host con `useSyncExternalStore`
  recién en el navegador. Esto arregla de paso las tiendas con dominio
  propio, donde el nuestro también cargaba encima del del comerciante.

Chequeos: `medicion-digital.check.ts` (20) y `meta-pixel.check.ts` con las
rutas digitales y los hosts. En local no se pudo ver en vivo: el único
producto es un borrador y un borrador no mide. Se prueba con la compra real.

🔲 Marketing tiene que mostrar el estado del píxel ("puesto / falta") con el
link a Configuración, cuando se arme la pantalla como centro.

### Y por producto — 15/09/26

Flavio: "el píxel y cada uno de esos también debe funcionar con cada
producto". Tenía razón: era uno por cuenta. Con un solo píxel Meta igual
distingue productos (todos los eventos llevan `content_ids` con el id del
producto; Purchase no lo llevaba y ahora sí), pero una cuenta Pro con cinco
páginas y cinco dominios puede ser cinco negocios con cinco cuentas de
anuncios. Entonces:

- `Product.medicion` (JSON, migración `20260915150000_medicion_por_producto`,
  comparada contra la base real): el píxel, el GA y el Clarity de ESA página.
  Reemplazan al de la cuenta **campo por campo**; vacío = el de la cuenta.
  `medicionDelProducto(delProducto, storeConfig)` es lo que leen las tres
  páginas públicas.
- Se edita en la pantalla de **Dirección del producto**, abajo del dominio
  propio: es lo mismo, cosas de ESTA página y no de la cuenta. Dice qué usa
  hoy ("vacío: usa el de la cuenta (111111…)").
- Ruta `PATCH /api/digitales/productos/[id]/medicion`: sesión digital, tope
  de ritmo, `validarMedicion` (mismas reglas de `tracking-ids` que
  Configuración: lo que se guarda va adentro de un <script> público),
  `updateMany` con el dueño en el `where`.

Chequeos PROD-*, VAL-*, RUTA-*, BASE-A en `medicion-digital.check.ts` (33).
Build local ok.

---

## Marketing, paso 2: enlaces para compartir con la etiqueta puesta — 15/09/26

Se construyó todo Campañas y no había ningún lugar donde sacar un link
etiquetado: nadie escribe `?utm_source=instagram&utm_medium=bio` a mano en el
celular. `/digitales/marketing/enlaces` es el otro extremo del cable.

- Un producto (selector si hay más de uno), un nombre de campaña opcional
  (pasa por `limpiarUtm` y se muestra cómo va a quedar: lo que se ve es lo
  que se cuenta), y **un link por canal** con botón de copiar: Instagram
  biografía, Instagram historia/reel, WhatsApp, Facebook, TikTok, YouTube,
  Mail. Cada canal lleva un `utm_source` que `clasificarOrigen` conoce y un
  `utm_medium` que `medioDe` entiende: el chequeo CANAL-* hace entrar cada
  link por las mismas funciones que la visita real y exige que se cuente
  como se ve.
- La dirección base con la misma prioridad que Productos: dominio propio,
  si no `slug.tiendaapps.com`, si no la larga. Un dominio pelado lleva la
  barra antes del `?`.
- Sin publicar lo avisa arriba: repartir el link de un borrador es repartir
  un 404.
- El texto para Meta también está acá, con la aclaración de NO usar un link
  de arriba en un anuncio.
- Es de todos los planes: el link es un link. Lo que se paga es ver los
  números (Campañas es de Pro).

Marketing pasó de dos tarjetas a cuatro: Enlaces, **Píxel** (con estado:
"puesto" o "todavía no", y a dónde ir), Reels, Upsells. Lo pendiente de arriba
(mostrar el estado del píxel en Marketing) quedó hecho.

`lib/enlaces-compartir.ts` puro, con `enlaces-compartir.check.ts` (19).
Mirado en 720 y 360.

---

## Marketing, paso 3: cupones de descuento — 15/09/26

Un código que la persona escribe en el checkout. Es de la CUENTA (una Pro
tiene hasta cinco páginas) y vale para todas o para un producto. De todos los
planes: el descuento lo pone la vendedora de su margen, la comisión se calcula
sobre lo que se cobra.

### Dónde se decide la plata

⚠️ **El navegador manda el CÓDIGO, nunca un monto.** La ruta de compra lee el
cupón de la base en ese momento, decide con `porQueNoAplica` (apagado,
vencido, agotado, de otro producto, o deja la compra por debajo de
`MINIMO_A_COBRAR` = $ 100 porque Mercado Pago no cobra cero), calcula con
`descuentoDe` y resta. Si no aplica, no cobra y dice por qué: cobrar el
precio entero a quien creyó tener descuento es la queja más segura que existe.
El checkout muestra el precio nuevo con la MISMA `descuentoDe` (ruta pública
`/api/digitales/cupon`, con tope por IP, que contesta lo mínimo: ni usos ni
vencimiento). La oferta de después de pagar no lleva cupón.

- `usos` se suma **al confirmarse el pago**, en la misma transacción del
  webhook: un carrito abandonado con cupón no gasta nada.
- `Order.cuponCodigo` + `Order.descuento`: `total` ya viene descontado, esto
  es la explicación. El detalle de la venta lo muestra.
- Reglas en `lib/cupones-digitales`: código 3–20 [A-Z0-9-] normalizado,
  porcentaje hasta 90 (el 100 % es un regalo, se hace mandando el archivo),
  monto fijo, vence al final del día argentino, tope de usos, 50 cupones por
  cuenta.
- Pantalla `/digitales/marketing/cupones`: crear (valida con la misma función
  que la ruta, avisa antes de mandar), lista con estado (activo / apagado /
  vencido / agotado), apagar / prender, borrar con confirmación. Apagar es lo
  normal: las ventas que ya lo usaron lo nombran.
- Checkout: campo chico adentro del resumen del precio ("¿Tenés un cupón?").
  El chequeo PAN-E de `compra-digital` (dos campos, uno obligatorio) lo
  excluye a propósito: no está entre el botón y el pago, y quien tiene un
  cupón lo busca.

Migración `20260915180000_cupones_digitales` (tabla nueva con FKs adentro,
dos columnas con default en Order), comparada contra la base real.
`cupones-digitales.check.ts` (28). Build local ok. Mirado en 720 y 360.

🔲 Cupón automático en el mail de carrito abandonado ("volvé con 10 %").
🔲 Cupones en Estadísticas: cuántas ventas con cupón y cuánto se descontó.
