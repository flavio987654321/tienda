# MÉTRICAS — bloques nuevos, errores de medición, exportación y resumen

> Creado: 2026-07-29 | Workflow: 🔲 pendiente | 🔄 en progreso | ✅ hecho | ❌ descartado con justificación
> Objetivo: que Métricas mida lo que dice medir, que el CSV y el PDF sirvan de verdad, y que
> arriba de todo haya una respuesta en castellano a "¿cómo me fue?".

## 📍 ESTADO ACTUAL

Todo lo de abajo está **hecho y verificado (tsc + eslint + next build), sin pushear ni deployar**
(pedido expreso de Flavio: "no pushees ni deployes porque tenemos que cambiar varias cosas").

---

## ✅ 1. Tres bloques nuevos: carritos, cupones, promociones

`src/lib/metricas-marketing.ts` + `metricas-marketing.check.ts` (30 chequeos verdes).

Las cuentas viven en un archivo aparte, puro, porque **la pantalla y el CSV tienen que salir de la
misma función**. Si cada uno recalculara por su cuenta, el día que se ajuste una regla el archivo y
la pantalla dirían cosas distintas y no habría forma de saber cuál miente.

Las tres trampas que resuelve —las tres se equivocan **en silencio**:

| Trampa | Qué pasaba | Regla |
|---|---|---|
| Etapas de carrito | Un carrito recuperado **también** tiene recordatorio, así que caía en dos etapas y los porcentajes pasaban el 100% | Etapas **excluyentes**: `if recoveredAt … else if reminderSentAt … else` |
| Usos de cupón | `Coupon.usedCount` es histórico: en "últimos 30 días" mostraba usos de hace un año | Los usos se cuentan desde **los pedidos del período** |
| Pedidos con promo | Un pedido con dos promos aparece en dos filas; sumando la columna daba 6 sobre 4 pedidos reales | `pedidosConPromo` se cuenta **sobre pedidos**, con dedupe por pedido |

Dos detalles finos: dentro de un mismo pedido la misma promo repetida cuenta **un** pedido pero suma
los dos ahorros; y la clave es `promo.name || promo.label`, así dos campañas distintas que comparten
la etiqueta visible ("20% OFF") **no se mezclan**.

**El bloque entero se esconde** si no hay ni un carrito, ni un cupón usado, ni una promo (`hayMarketing`).
Tres tarjetas vacías seguidas no informan, sólo hacen scrollear.

### `BarrasRanking`
Las barras se miden contra el **máximo**, no contra el total: contra el total, el primero se lleva
toda la barra y el resto queda en hilitos ilegibles. Un solo color para todas las filas — un color
por fila haría creer que el color significa algo.

---

## ✅ 2. Tres errores de medición que ya estaban

Ninguno de los tres es nuevo; se encontraron auditando el resto de la pantalla.

- **Ticket promedio.** Arriba sumaba plata de pedidos **confirmados** y abajo dividía por **todos**
  los no cancelados. Con 10 pedidos de los cuales 5 confirmados, un ticket real de $100.000 se
  mostraba como $50.000 — y empeoraba solo: cuantos más pendientes hubiera, más se hundía.
- **Productos más vendidos.** No filtraba por fecha: en una pantalla que dice "últimos 30 días"
  mostraba toda la historia. El más engañoso — un producto que vendió mucho hace ocho meses y hoy
  nada seguía primero.
- **Pedidos por estado.** Mismo problema, misma corrección.

Los dos últimos se notaban moviendo el selector de rango: eran los únicos dos bloques que no cambiaban.
Ambos ganaron subtítulo `Últimos N días` y vacío que menciona el período.

---

## ✅ 3. Exportar CSV

`src/app/api/dashboard/metricas/export/route.ts`

- Tres secciones nuevas (carritos, cupones, promociones) desde **las mismas funciones** que la pantalla.
- Cada sección **se saltea entera si está vacía**: un archivo con tres títulos vacíos hace pensar que
  la exportación falló.
- **Escapado de verdad.** Los nombres de cupones y promos los escribe la dueña y pueden traer comas:
  `3x2, solo pantalones` corría todas las columnas de esa fila. Ahora `csv()` envuelve entre comillas
  y duplica las de adentro.
- En promociones se aclara por escrito que la columna Pedidos suma más que el total, porque un pedido
  con dos promos aparece en dos filas. Sin esa línea alguien suma a mano y cree que el archivo está mal.

- ✅ **El resumen en texto ya va arriba de todo**, como líneas de comentario (`# …`). Metido en celdas,
  cada coma de una frase abriría una columna nueva; como comentario, Excel y Sheets lo muestran en la
  primera columna y las cuentas de abajo no se tocan.
- ✅ **Todos los productos vendidos** (09/08/2026), con unidades, facturado y ganancia. En pantalla eso
  son dos tarjetas cortadas —los 5 que más unidades vendieron y los 8 que más ganancia dejaron— y en
  el PDF llegan a 30. **El archivo es el único de los tres formatos donde la lista puede estar
  entera**, y es justamente en el que alguien va a hacer cuentas: un ranking cortado en una planilla
  es una planilla que da mal. Se ordena por unidades y no por ganancia, porque la ganancia de la
  mitad de las filas puede estar vacía y ordenar por una columna que a veces no existe deja un orden
  que no se entiende — para ordenar por ganancia está la planilla, es un clic.

---

## ✅ 4. Guardar PDF

**No había ningún estilo de impresión en todo el proyecto.** `window.print()` imprimía la pantalla
entera. Se resolvió en `src/app/globals.css`, en un `@media print` global —sirve para cualquier
pantalla del panel, no sólo Métricas.

Cuatro problemas, no uno:

1. **El mueble del panel se imprimía** — menú, barra, botones, el globo de Sasha, y la fila de
   favoritos/ayuda/campanita. Se marcan con `data-print="ocultar"` en el **contenedor**, no botón por
   botón, así sirve si mañana se agrega otro.
2. **Sólo salía lo que entraba en pantalla.** El panel es una caja del alto de la ventana con el
   scroll adentro (`h-screen` + `overflow-hidden` + un `<main>` con scroll propio). Impreso eso
   significa una hoja: lo que estaba abajo del scroll no existía. Se abre **toda la cadena** vía
   `[data-panel-root]` (marcado en `DashboardLayout.tsx`).
3. **Las barras y los puntos de color salían en blanco** — el navegador descarta fondos al imprimir
   salvo `print-color-adjust: exact`.
4. **Las tarjetas se partían entre hojas.** `break-inside: avoid` se ignora dentro de una caja
   recortada (ver 2) y encima adentro de una grilla el navegador no puede mover una sola tarjeta sin
   arrastrar la fila. Las grillas se aplanan a bloque en papel, salvo `grid-cols-2` (los KPI, que
   entran de a dos y ahorran media hoja).

Encabezado sólo-papel con **fecha y período**: un PDF suelto dentro de tres meses no tiene otra forma
de ubicarse.

### ⚠️ Dos trampas que costaron un rato

- **`box-shadow` y `ring-*` no se pintan en `<tr>`** cuando la tabla es `border-collapse: collapse`
  (que es lo que pone el preflight de Tailwind). Nada de resaltados por sombra en filas de tabla.
- **Una regla de layout puede *desocultar* algo.** `[data-panel-root] > main > div { display: block !important }`
  le ganaba en especificidad al `display: none` y hacía reaparecer impresa la fila de iconos (que es
  hijo directo del `<main>`), encima en columna. Los hijos del `<main>` **no llevan `display`**: sólo
  sueltan alto y recorte.
- **Turbopack sirvió CSS viejo.** Los cambios de `globals.css` no se habían recompilado y el navegador
  cargaba una versión anterior. Se detecta así:
  `curl -s localhost:3000/_next/static/chunks/src_app_globals_*.css | grep data-print`

### ✅ 4b. El PDF estaba cortado (09/08/2026)

El paso 4 resolvió que el informe **se imprimiera bien**. Faltaba que fuera **el informe completo**.

Cada ranking de la pantalla es un podio de cinco filas con un link al final: *"y 12 más → Ver
cupones"*. En una tarjeta de 296px en un teléfono no hay otra. **En papel esa salida no existe:**
no hay adónde hacer clic, y el PDF terminaba nombrando doce campañas que después no se podían
mirar. Peor: el recorte es por ranking, así que lo primero que se caía del informe era lo que
menos rindió — lo único sobre lo que hay algo para hacer.

Ahora **el papel se expande hasta 30 filas** y recién ahí avisa cuántas quedaron afuera. Un PDF de
ochenta páginas tampoco lo lee nadie. Alcanza a las seis listas: cupones, promociones, la ruleta,
cupones y promos sin usar, productos más vendidos y rentabilidad por producto. `Productos más
vendidos` traía `take: 5` de la base — se subió a 30, que son 30 filas de un `groupBy` que ya se
estaba haciendo, no una query más.

Tres detalles que se veían recién en el papel:

- **El separador colgado.** El `print:hidden` estaba en el link y no en el párrafo: el papel
  terminaba en *"y 12 más ·"* con un punto medio que no separa nada.
- **Las tarjetas largas gastaban una hoja.** `break-inside: avoid` en una tarjeta más alta que la
  página hace que el navegador primero la empuje a una hoja nueva —dejando la anterior a medio
  llenar— y después la corte igual. Las que pueden ser largas se marcan `data-print="largo"` y se
  dejan cortar. El día a día en 90 días son noventa renglones.
- **El encabezado pegajoso flotaba.** El `sticky top-0` de la tabla del día a día es para el scroll
  de la pantalla; en papel quedaba encima de la primera fila. En print, `.sticky` pasa a `static` y
  `thead` a `table-header-group`, así el encabezado se repite en cada hoja.

**Pie de informe sólo-papel: "Cómo se calcularon estos números".** En pantalla cada aclaración está
pegada al número que corrige y con eso alcanza. Un PDF se manda por mail y se abre tres meses
después sin nadie al lado. Son cuatro: qué cuenta como venta confirmada, **qué porcentaje de lo
facturado cubre la ganancia** (si cubre el 40%, no es "lo que ganaste" sino "lo que ganaste en la
parte que se puede medir"), contra qué se compara, y que las visitas se guardan por día entero —más
el aviso del corte UTC del 29/07/2026 si el período lo cruza.

> Verificado en el CSS compilado, no asumido: `.hidden{display:none}` está en el byte 27859 y
> `.print\:block{display:block}` en el 209817, así que el print gana. Es el mismo chequeo que la
> trampa de Turbopack de más arriba.

---

## ✅ 5. Resumen del mes en texto

`src/lib/resumen-mes.ts` + `resumen-mes.check.ts` (35 chequeos verdes).

**Decisión: reglas en código, sin IA.** Es instantáneo, gratis, sale igual siempre y es imposible que
invente un dato. Queda enganchado el lugar donde después Sasha podría reescribir el texto final sin
tocar ningún número, si alguna vez se quiere.

El resumen **no tiene números propios**: recibe los ya calculados y no recalcula nada. Si mañana se
ajusta el ticket promedio o qué cuenta como venta confirmada, el texto se mueve solo.

### La parte que le sirve a alguien: el porqué

Los ingresos son siempre, exactamente:

```
ingresos = visitas × conversión × ticket promedio
```

(conversión = confirmados ÷ visitas, ticket = ingresos ÷ confirmados: los factores se cancelan, la
igualdad es exacta). Eso permite decir **cuál de los tres movió la aguja**:

- visitas → funcionó (o faltó) difusión
- conversión → funcionó (o falla) la tienda
- ticket → vendiste más caro, o más cosas por pedido

"Vendiste 18% más" no le dice a nadie qué hacer. "Le vendiste a la misma gente pero más caro" sí.

El dominante se elige por **el logaritmo de la razón**, no por diferencia de porcentajes: los tres se
multiplican, y en una multiplicación caer a la mitad (−50%) pesa lo mismo que duplicar (+100%). Con
porcentajes crudos el que sube siempre parecería el más grande.

### Cuándo se calla

| Situación | Qué hace |
|---|---|
| Cambio menor a ±5% | "Cerró parejo" — con pocos pedidos un solo cliente mueve más que eso |
| Menos de 5 ventas confirmadas | Titular sí, **explicación no**: con 3 ventas atribuir el mes es adivinar |
| Período anterior en 0 | Informa el número solo, **sin porcentaje** — "subiste ∞%" no es información |
| Sin ventas y sin período anterior | Tono **neutro**, no "mal". No haber vendido recién arrancando es normal |

### El caso que un resumen ingenuo arruina

Sube la plata pero se pierden clientes. Sin la línea de advertencia, el texto felicita por un mes que
en realidad perdió gente:

> El mes cerró 18% arriba — $1.240.000 contra $1.050.000.
> Lo que más pesó fue cuánto gasta cada uno: el ticket promedio pasó de $8.400 a $11.273. No le
> vendiste a más gente, le vendiste más caro.
> **Ojo con festejarlo entero:** en el mismo período las visitas bajaron 6% y la conversión bajó 6%.
> El total subió igual, pero eso no se sostiene solo.

### "Para revisar"

Ordenado **por plata en juego**, no por lo que sea más fácil de calcular. Lo que no es dinero concreto
(costos sin cargar, cupones vencidos) va con `plata: 0` para que nunca le gane a lo que sí lo es.

`confirmadosSinDespachar` **no filtra por período** a propósito: un pedido trabado hace dos meses es
peor que uno de esta semana, y filtrando desaparecería del aviso justo cuando más viejo se pone.
Umbral: `DIAS_SIN_DESPACHAR = 5` (deja pasar un fin de semana largo).

### Gramática

Los chequeos incluyen concordancia, porque es lo primero que delata un texto automático:
`las visitas bajaron` (no `bajó`), y el cupón vencido conjuga **la frase entera**
("Si no **lo** vas a renovar, conviene borrar**lo**"), no sólo el sustantivo.

**Sólo en tiendas con carrito.** AUTOS vende por consulta y sus números (leads, vehículos vendidos)
no entran en esa cuenta.

---

## ✅ 6. Auditoría de exactitud (29/07/2026)

Pedido de Flavio: *"cada medición de métricas tiene que ser exacta, no podemos dar
cualquier resumen"*. Se revisó cada número de la pantalla contra el código.

### 🔴 Dos bugs, arreglados

**El gráfico "Ingresos confirmados" incluía pedidos sin confirmar.** El título mostraba el
total confirmado y la curva de abajo sumaba `ordersPeriod` entero —pendientes incluidos—.
Eran dos cuentas distintas en la misma tarjeta, y cuantos más pedidos sin confirmar
hubiera, más se separaban. El CSV ya filtraba bien, así que archivo y pantalla tampoco
coincidían.

**El ticket promedio del CSV dividía mal.** El mismo error del divisor que ya se había
corregido en la pantalla, pero en el export seguía vivo: arriba plata de confirmados, abajo
todos los no cancelados. Con 10 pedidos y 5 confirmados, un ticket de $100.000 salía
$50.000. Se agregó la fila `Pedidos confirmados` para poder verificar la división a mano.

### 🟡 Tres sesgos sistemáticos

**Los días corrían en UTC.** Cada "día" iba de las 21:00 a las 21:00 hora argentina: una
venta de las 22:00 de un martes figuraba como del miércoles, justo las horas de más venta.
El módulo para esto **ya existía** (`fechas-comerciales.ts`) y su comentario advertía de este
bug exacto — Métricas no lo usaba.

Se agregaron `diaArgentino()`, `inicioDiaArgentino()` y `sumarDiasCalendario()`, y se
enchufaron en la pantalla, el CSV y el registro de visitas (13 chequeos nuevos, `DIA-A` a
`DIA-M`, incluido uno que avisa si alguna vez vuelve el horario de verano).

> ⚠️ **Las filas de `StoreView` escritas antes del 29/07/2026 tienen el día en UTC** y no se
> pueden reclasificar: la fila guarda "fecha + cantidad", sin hora, así que repartirla sería
> inventar a qué hora pasó cada visita. Se decidió corregir de acá en adelante.

**El período actual iba por la mitad y comparaba contra uno completo.** Hoy termina "ahora";
el período anterior estaba entero. La comparación siempre le jugaba en contra al presente:
hasta 7% de castigo en el rango de 7 días, de sobra para dar vuelta el veredicto del resumen
(el umbral de ruido es 5%). Ahora el período anterior **se corta en el mismo momento**: si
hoy son las 15:00, el anterior llega hasta las 15:00 de su último día.

**Las visitas se contaban de más.** Ver la sección 7 — se arregló aparte.

### El guardarraíl de las visitas

Los pedidos tienen hora exacta, así que su comparación quedó exacta. Las visitas se guardan
por día entero, así que ahí el recorte no se puede aplicar y hoy entra a medias contra un día
completo. `incertidumbreVisitasPct` mide ese pedazo de día que falta; si el movimiento de
visitas cabe adentro, **el resumen no lo menciona** —ni para atribuirle la causa ni en la
advertencia—. Preferimos callar antes que afirmar algo que la forma de guardar el dato no
aguanta.

### Verificado y correcto

- **`margin.ts`** — el prorrateo del cupón por peso de línea es correcto y el total general da
  exacto; los productos sin costo son `null`, nunca 0.
- Los envíos bonificados van aparte de la ganancia por producto, a propósito.
- La ventana doble de rentabilidad, el top de productos, los carritos por `lastActivityAt`.
- **Aclarado:** "Pedidos por estado" incluye cancelados y el KPI "Pedidos" no. Los dos números
  eran correctos, pero juntos parecían un error; ahora el bloque lo dice.
- **Renombrado:** la conversión del resumen es *"terminan en venta confirmada"*. La tarjeta
  cuenta todos los pedidos y el resumen sólo los confirmados — iban a mostrar 1,6% al lado de
  2,0% sin ninguna explicación.

---

## ✅ 7. Las visitas se contaban de más

Salió de la auditoría de arriba. Eran **cuatro** problemas, no uno.

### 🔴 Cualquiera podía inflar las visitas de una tienda

El más grave y el que nadie había mirado: `POST /api/store-views/[slug]` era público y no
pedía nada. Con la consola del navegador abierta, un bucle de una línea le ponía a cualquier
tienda las visitas que se le antojaran. Y no es sólo un número feo — la **conversión** sale de
ahí, y ahora también el resumen en texto.

Ahora: se exige que el `origin` sea el nuestro (frena el bucle de una línea; un header se
falsifica, pero para eso está lo de abajo) y hay **límite de 5 por IP por hora** para la misma
tienda, con `checkRateLimit`. Cinco deja lugar a una familia o una oficina que salen por la
misma IP; una persona real dispara una por día.

Si Redis no está disponible **se cuenta igual**: esto son métricas, no un control de acceso, y
perder visitas reales durante una caída sería peor que dejar pasar algunas de más.

### 🟡 Los bots entraban como gente

`src/lib/bots.ts` + `bots.check.ts` (**43 chequeos**).

Googlebot renderiza JavaScript, así que llegaba hasta el endpoint igual que una persona. Lo
mismo Ahrefs, Semrush, GPTBot, ClaudeBot, Bytespider, Lighthouse y los monitores de uptime.
Nunca compran: inflaban las visitas y hundían la conversión.

Los chequeos cubren las **dos** formas de fallar, porque las dos importan:

- 11 navegadores reales que **tienen que pasar** — incluidos los navegadores internos de
  Instagram y Facebook, que es por donde entra media tienda.
- 26 bots que **tienen que quedar afuera**, con User-Agent textuales.
- Sin User-Agent = bot. Todos los navegadores mandan uno; que falte significa que del otro lado
  hay un script.

### 🟡 La misma persona contaba varias veces

La deduplicación era `sessionStorage`, que es **por pestaña** y se borra al cerrarla. Tres
pestañas abiertas = tres visitas. Volver más tarde el mismo día = otra. Ahora es
`localStorage`, que es del navegador entero y sobrevive al cierre — que es lo que "una visita
por día" quiere decir. Las claves de días viejos se limpian solas.

### 🔴 Un bug que introdujo el cambio de zona horaria

Al pasar el servidor a días argentinos, el cliente seguía calculando su clave de dedup en UTC.
La clave del navegador cambiaba a las **21:00** mientras el servidor seguía en el mismo día:
**entre las 21:00 y las 00:00 cada visitante se contaba dos veces.** Las dos puntas usan ahora
el día argentino.

### Y una bandera más

`navigator.webdriver` — los navegadores manejados por script (Puppeteer, Playwright, Selenium)
lo declaran. El filtro del servidor mira el User-Agent, que ésos suelen disfrazar; esta
bandera es más difícil de sacar.

---

## ✅ 8. Sasha decía otra cosa que Métricas

Salió de preguntarse si había que actualizarla. Había, y no era cosmético: preguntarle a Sasha
*"¿cómo vengo de ventas?"* y abrir Métricas daba **dos números distintos para el mismo
período**, sacados de la misma base. Tres causas:

| | Sasha decía | Métricas dice |
|---|---|---|
| Qué cuenta como venta | todo lo no cancelado (**PENDING incluido**) | sólo confirmado |
| El período | 30×24 horas desde este instante | 30 días argentinos |
| Umbral de "estable" | ±10% | ±5% |

Con el umbral distinto, un mes que subía 7% le salía **"estable" a Sasha y "7% arriba" a
Métricas**, las dos al mismo tiempo y las dos convencidas.

Se emparejó todo: mismas ventanas, mismos estados, mismo umbral (`RUIDO_PCT`, ahora exportado
desde `resumen-mes.ts`). El "más vendido" de Sasha también pasó a ventas confirmadas — con
pedidos pendientes, uno que después se cancela podía poner un producto en el podio.

### `src/lib/order-status.ts`

La lista `["CONFIRMED", "SHIPPED", "DELIVERED"]` estaba **copiada y pegada en una docena de
archivos**. Eso funciona hasta que dos copias dejan de coincidir, y ahí no falla nada: dos
pantallas muestran plata distinta y no hay forma de saber cuál miente. Ya había pasado entre
Métricas y Sasha.

Ahora hay una sola definición y **la usan las 17**: Métricas, el CSV, Sasha, Inicio, Pedidos,
Vendedoras, el panel de afiliadas, checkout, reseñas y la API pública.

Dos listas parecidas **no** se tocaron porque no son ésta:

- `FILTERABLE_STATUSES` (Pedidos) incluye PENDING y CANCELLED — es "todos los estados", para el filtro.
- `STATUS_ORDER` (seguimiento) es el orden del recorrido, no qué cuenta como venta.

Confundirlas y reemplazarlas sería el mismo error al revés.

---

## ✅ 9. De dónde viene la gente (09/08/2026)

Hasta acá el panel sabía **cuántas** visitas hubo y ninguna otra cosa. *"¿Esto lo trajo Instagram
o el WhatsApp que mandé?"* —la primera pregunta que hace cualquiera que vende por internet— no se
podía contestar.

Va **primero de los cinco pendientes** por un motivo que no es el valor: nuevos vs. que vuelven,
comparar contra el año pasado y el rango libre leen historia que ya está guardada y salen completos
el día que se hagan. **Esto sólo mide desde el día que se prende.** Cada semana de demora es una
semana de datos que no se recupera nunca.

### Tabla aparte, no una columna

`StoreViewSource(storeId, date, source, count)`. Meterle el origen a `StoreView` obligaba a cambiarle
la clave única, a rellenar el historial con un "desconocido" inventado y a tocar los seis lugares que
la leen.

El precio es que las dos cuentas no dan iguales hasta que pase un período entero. **Eso no se
esconde:** la tarjeta dice *"de las 1.240 visitas del período se sabe de dónde vinieron 890"*, y los
porcentajes van sobre las 890. Dividir por el total achicaría todos los canales a la vez y daría la
impresión de que la tienda se cayó cuando lo único que falta es la etiqueta.

### La lista es cerrada

Diez etiquetas fijas en `src/lib/origen-visita.ts`, no el dominio crudo del referente. Con el dominio,
una tienda linkeada desde cincuenta agregadores tendría cincuenta filas por día **para siempre** —y
`source` es parte de la clave de la tabla. Se pierde el detalle de quién es "otro"; sirve más saber
que el 8% viene de afuera que tener el 8% repartido en treinta filas de 0,2%.

**Clasifica el servidor, no el cliente.** Lo que sale de ahí se escribe en la base y se compara con lo
ya escrito: tiene que salir de una lista cerrada y no de lo que decida mandar un navegador.

### 🔴 El agujero de WhatsApp, que hay que decir en voz alta

**WhatsApp abre los links en un navegador que en la mayoría de los teléfonos no manda el referente.**
Buena parte de lo que vino de un WhatsApp cae en "directo". En Argentina, donde WhatsApp es *el*
canal de una tienda chica, eso es la diferencia entre leer bien el número y sacar la conclusión al
revés.

No se puede arreglar desde el código: se arregla mandando el link con `?utm_source=whatsapp`. Por eso
**los `utm_*` le ganan al referente** —cuando alguien se tomó el trabajo de decir de dónde viene, se
le cree— y por eso la tarjeta lo explica en vez de esconderlo.

### Tres decisiones que se ven en los chequeos

- **Gmail no es Google.** `mail.google.com` engancha con la regla de Google. Con el orden al revés,
  cada click desde un mail que la dueña mandó se le acreditaba al buscador.
- **Un `utm_source` que no reconocemos NO es directo.** La dueña etiquetó el link a propósito: decir
  "directo" borraría una campaña real. Va a "otro".
- **"Directo" y "otro" van al final del ranking aunque sean los más grandes.** Son bolsas, no
  canales: nadie decide invertir más en directo. Arriba tienen que quedar los que sí se pueden mover.

### Qué NO hace

Cuenta **visitas, no ventas**. Que un canal traiga más gente no quiere decir que traiga más plata, y
hoy no hay forma de saberlo: el pedido no guarda de dónde venía la persona.

### Retención

El cron `cleanup` borra `StoreView` de más de 1 año, y ahora `StoreViewSource` **con el mismo corte**.
Si el desglose sobreviviera al total, la pantalla tendría que mostrar "de 0 visitas, 40 vinieron de
Instagram". Ojo: ese cron **no está en `vercel.json`**, así que hoy no corre nunca.

---

## ✅ 10. Dónde se te cae la gente (09/08/2026)

El panel tenía los dos extremos —visitas arriba, pedidos abajo— y una división entre ellos llamada
**"conversión"**. Con eso se sabe que de cada cien compran dos, y **nada** sobre las otras noventa y
ocho: si no encontraron nada, si el envío las espantó, o si llenaron todo el formulario y se cayeron
al pagar. Son tres problemas distintos y ninguno se arregla igual.

Seis escalones. **Cuatro ya estaban en la base y nadie los había puesto uno abajo del otro:**

| Escalón | De dónde sale |
|---|---|
| Entraron | `StoreView` |
| Pusieron algo en el carrito | 🆕 `StoreFunnelStep` |
| Abrieron el checkout | 🆕 `StoreFunnelStep` |
| Escribieron sus datos | `AbandonedCart` |
| Hicieron el pedido | `Order` |
| Pagaron | `Order` confirmado |

`AbandonedCart` no es sólo "los que abandonaron": la fila se crea apenas escriben un email válido en
el checkout y se le marca `recoveredAt` si después compran. Son **todos** los que dejaron sus datos,
que es justo el escalón que hacía falta.

### 🔴 Señalar la caída correcta

Ésta es la decisión que decide si la tarjeta sirve o estorba, porque manda a la dueña a mirar un lugar.

**Por porcentaje crudo gana siempre el primer escalón.** En todas las tiendas del mundo la mayoría
entra, mira y se va. Señalar eso todos los meses es no señalar nada. Por cabezas gana también el
primero, porque tiene el denominador más grande.

Cada escalón tiene su `caidaNormalPct` de referencia (90 / 50 / 35 / 30 / 20) y se señala **el que
más se despega de lo normal para ese escalón**, no el que más pierde.

**Y se compara la retención como proporción, no la caída como resta.** Lo descubrió un chequeo: 1000
entraron y 5 pusieron algo en el carrito es perder el 99,5%, apenas **nueve puntos y medio** peor que
el 90% normal — restando quedaba por debajo del umbral y el catálogo más inservible del mundo pasaba
como "todo en orden". Cerca del 100% la resta se comprime y esconde justo los desastres. Por
proporción da 5% de lo normal, que es lo que realmente pasó.

Tres guardas para no inventar problemas: mínimo 50 visitas, mínimo 3 personas caídas, y retención por
debajo del 60% de lo normal.

### Un escalón nunca muestra más que el de arriba

Los seis **no se cuentan igual** y no hay forma de que lo hagan sin ponerle una cookie de seguimiento
a cada persona: los tres primeros van por navegador por día, los datos por email, y los dos últimos
por pedido. En los bordes del período eso da vuelta el orden —alguien que entra el lunes y compra el
jueves suma arriba un día y abajo otro—.

Un embudo que se ensancha en el medio no se lee como "acá el conteo es aproximado": **se lee como que
el panel está roto**, y arrastra la desconfianza a todo lo demás de la pantalla. Se recorta lo que se
**muestra**, nunca el dato: en la base quedan los números crudos. Y la tarjeta dice que los
porcentajes son aproximados en vez de presentarlos como una cuenta exacta.

### Los guardas, ahora compartidos

`src/lib/visita-legitima.ts` — bots, `origin` propio y límite por IP. Estaban adentro de
`/api/store-views/[slug]`, que era el único endpoint de este tipo. Con el segundo, copiarlos era
garantizar que un día se arregle un agujero en uno y no en el otro, **y el que quede abierto no avisa:
una métrica inflada sale por pantalla como un número perfectamente creíble.**

El embudo tiene su propio cupo por IP (10/hora) y no comparte clave con las visitas: si fuera el
mismo, alguien mirando mucho la tienda se quedaría sin visitas contadas.

### El dedup, del lado del cliente

`src/lib/registrarPaso.ts`, mismo molde que `registrarVista`. Una vez por navegador por día, con el
día **argentino** y no el del reloj del visitante. Que los pasos y las visitas usen la **misma** regla
no es prolijidad: el embudo divide uno por el otro, y si las visitas fueran por día y el carrito por
sesión el porcentaje no querría decir nada.

`registrarPaso("checkout")` va como efecto sobre `checkoutOpen` y no pegado a cada
`setCheckoutOpen(true)`: el botón de finalizar está en seis templates más el carrito compartido, así
que enganchar cada llamada era garantizar que la próxima pantalla que se agregue no cuente.

---

## Cómo correr los chequeos

```
npx tsx src/lib/fechas-comerciales.check.ts
npx tsx src/lib/metricas-marketing.check.ts
npx tsx src/lib/resumen-mes.check.ts
npx tsx src/lib/dia-a-dia.check.ts
npx tsx src/lib/origen-visita.check.ts
npx tsx src/lib/embudo.check.ts
npx tsx src/lib/bots.check.ts
```
