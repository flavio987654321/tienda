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

> #### 🚫 NUNCA escribir "tiendas" en nuestra página de precios
>
> Sería prometer lo de ellos y entregar lo nuestro. Se dice **"páginas de
> venta"** — que además suena a más: 5 páginas contra sus 2 tiendas, 25 contra
> sus 5.

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

Free no lleva IA, y ése es justamente el motivo por el que puede ser gratis sin
fundirnos (ver 2.4).

| | **Free** *validar* | **Starter** *vender* | **Pro** *escalar* |
|---|---|---|---|
| **Abono mensual** | $0 | **$30.000** | **$60.000** |
| **Abono anual** (−25%) | — | $270.000 → *$22.500/mes* | $540.000 → *$45.000/mes* |
| **Comisión por venta** | **8%** | **6%** | **2%** |
| Productos = páginas de venta | 1 | 5 | 25 |
| **Ebooks con IA por mes** | ❌ | **2** | **5** |
| Bonos por producto | 1 | 3 | 5 |
| Upsell | ❌ | 1 | 3 |
| Página de venta | plantilla fija | **armada con IA** | armada con IA |
| Ebooks con IA por mes | ❌ | 🔲 tope | 🔲 tope alto |
| Textos y mails con IA | ❌ | ✅ | ✅ |
| Sasha | ❌ | ✅ | ✅ |
| Pagos con transferencia | ❌ | ✅ | ✅ |
| **Ver carritos abandonados** | ✅ | ✅ | ✅ |
| **Mail automático de recuperación** | ❌ | ❌ | ✅ |
| Dominio propio | ❌ | ❌ | ✅ |
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

- 🔲 **El tope anti-abuso de páginas de venta**, por arriba de las 25 de Pro.
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

## FASE 3 — El panel `/digitales`

- 🔲 Layout calcado del patrón de `/afiliados`: guarda de sesión Y de rol en el
  layout, no en la página — desde la página el panel alcanza a dibujarse un
  segundo antes de patearte, y parece que se rompe.
- 🔲 Su manifest, su ícono y su clave de localStorage propia (`DIGITALES_VERSION`
  en `src/lib/app-versions.ts`).
- 🔲 Las pantallas, decidiendo una por una qué se copia de `/dashboard`.

## FASE 4 — La IA

Las cuatro cosas están decididas en 2.4. Lo que falta acá es **cómo se pagan y
cómo se frenan**, y eso va antes que cualquier pantalla: el tope no se agrega
después, porque hasta que exista la factura de Anthropic no tiene techo.

- 🔲 **Medir un ebook de verdad** antes de prometer un número. La estimación de
  hoy es US$2–4 por ebook con Opus 5, y está sin verificar. `ebooksIA` en
  `TOPES_DIGITALES` (0 / 2 / 5) es provisorio hasta esa medición.
- 🔲 **Las cuatro capas de topes**, calcadas de `asistente-limites.ts`: ráfaga,
  diario por cuenta, global de cuentas Free, global total. Ninguna función sale
  sin tope, tampoco en Pro.
- 🔲 **La capa de cuentas Free es la crítica**: es gratis, no pide tarjeta y da
  acceso a IA. Veinte cuentas truchas son la misma persona y ningún tope por
  usuario se entera.
- 🔲 Generar la vidriera entera (el gancho principal).
- 🔲 Escribir el contenido del ebook/PDF.
- 🔲 Los textos de venta y los mails (entrega, carrito abandonado).
- 🔲 Sasha adaptada: embudos, descargas y conversión en vez de stock y envíos.

## FASE 5 — La página de venta y el checkout

Anotado ahora que se sabe qué forma tiene (ver 2.3). Cuelga del producto, en
`/tienda/[slug]/producto/[id]`, y reemplaza a la ficha común para este ecosistema.

- 🔲 El armado de la página: gancho, producto, precio tachado, bonos, prueba
  social, dolores, testimonios, apilado de valor, 3 pasos, garantía, preguntas
  frecuentes, cierre y **barra fija abajo**.
- 🔲 **Bonos** — modelo, pantalla y checkout. No existe nada en el proyecto.
- 🔲 **Upsell** — idem.
- 🔲 **La escasez atada a datos reales** (contador, cupos, avisos de compra). Ver
  el recuadro de 2.3: si se reinicia sola es publicidad engañosa.
- 🔲 El aviso de que **con transferencia la entrega no es automática**, antes de
  comprar y no después.

## FASE 5 bis — La dirección propia por producto

La opción C de 2.3, separada a propósito: da lo único valioso de multi-tienda sin
romper nada.

- 🔲 Columna de slug en `Product`, única.
- 🔲 Una regla más en el middleware, que **ya sabe mapear subdominio → tienda**:
  falta el caso subdominio → producto digital.
- 🔲 Qué pasa si el slug del producto choca con el de una tienda.

## FASE 6 — Legales
