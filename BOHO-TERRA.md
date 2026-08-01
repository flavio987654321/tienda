# Boho Terra — revisión del template

Mismo formato que `URBAN-PULSE.md` y `FASHION-NOIR.md`: un hallazgo por sección,
numerado (`BT-n` para la portada, `BL-n` para la página de productos), con el porqué
escrito y cerrado con ✅ cuando se arregla.

Son 1793 líneas, contra las 3140 de Urban Pulse.

## Lo que YA está bien (no re-auditar)

Verificado en el primer barrido, buscando los patrones que en Urban Pulse fueron
hallazgos:

- **Cero acento crudo.** No hay un solo `background: A` sin pasar por los helpers de
  contraste. Toda la familia UP-3 / UP-11 / PL-4 / UP-21 —cinco hallazgos separados en
  Urban Pulse— acá está limpia de entrada.
- **El carrito y el checkout son los compartidos** (`CartDrawer`, `CheckoutModal`), no
  copias escritas a mano. Es PL-1 ya resuelto.
- **Las reseñas de producto usan el hook compartido** (`useResenasProducto`), con el
  comentario que explica los tres bugs que evita. Bien.
- **El bloque de prueba social no inventa gente.** Las tres reseñas de ejemplo se
  muestran **sólo en el editor**; en la tienda pública, si no hay reales, el bloque no
  se dibuja. Es UP-10 ya resuelto.
- **El cartel de verificada distingue `auto` de `owner`**, que era justo el que mentía
  en la auditoría anterior.
- **El filtro por género NO deja la colección vacía** en el caso normal. Se verificó en
  el schema: `gender String @default("unisex")` y el filtro deja pasar los unisex
  (`p.gender !== activeGender && p.gender !== "unisex"`). Una tienda que nunca toca el
  género muestra todo bajo los dos botones. Era sospechoso y no lo es.

## Bugs

### BT-1 — El encabezado de la colección promete más piezas de las que se pueden ver ✅

El encabezado dice cuántas piezas hay:

```tsx
<p>{allFiltered.length} piezas</p>
```

…pero el carrusel muestra `allFiltered.slice(0, CAROUSEL_LIMIT)`, y `CAROUSEL_LIMIT`
es **8**. Una tienda con 50 productos dice **"50 piezas"** y el carrusel se planta en
la octava, sin ninguna señal de que ahí se terminó lo que ese bloque puede mostrar.

No es que las otras 42 sean inalcanzables —abajo hay un link al catálogo completo—,
pero el número está al lado del título y se lee como una promesa de ese bloque. O el
número dice lo que se puede ver acá, o el bloque tiene que decir que hay más.

### BT-2 — Filtrar hasta dejarla vacía no muestra nada, ni siquiera un cartel ✅

No hay ningún `allFiltered.length === 0` en todo el archivo. Cuando el filtro no deja
nada, el encabezado dice **"0 piezas"** y abajo queda el hueco del carrusel, vacío.
Sin "no encontramos nada", sin ofrecer volver a "Toda la colección".

Es alcanzable: los botones **Mujer** y **Hombre** están siempre en el menú —en
escritorio y en celular— sin chequear si la tienda tiene productos de ese género. Una
tienda que **sí** carga género y vende sólo para mujer tiene un botón "Hombre" en la
navegación principal que lleva a la nada. No es el callejón sin salida de UP-22
—porque el default es `unisex` y ahí no pasa—, pero es la misma sensación para quien
lo toca.

### BT-3 — En el modal, los botones de compartir se meten entre el nombre y el precio ✅

El panel del modal arranca: rubro → nombre → **Copiar link / WhatsApp** → … y recién
después el precio.

Es exactamente lo que se corrigió en el modal de Urban Pulse, y el motivo es el mismo:
**compartir es lo último que hace alguien que todavía no sabe cuánto cuesta.** Puestos
ahí empujan el precio para abajo en la parte del panel que más se mira.

## Identidad — lo que lo separa del resto

Los tres de arriba son bugs. Estos son otra cosa: el template ya se **veía**
distinto, pero **hablaba** igual que los otros nueve. Cada uno usa un mecanismo
que ya existía y estaba a medio usar, así que es poco código.

### BT-4 — Las promos salían fucsia y naranja en una tienda de tinturas vegetales ✅

`PALETA_POR_TEMPLATE`, en `PromoDisplay.tsx`, existe desde Urban Pulse y tenía
**un solo inquilino**. Todo lo demás caía a la clásica: el 20% en naranja
peleando con el terracota del acento, y el descuento en pesos en **fucsia** —el
color más lejano que existe de lo que la tienda dice ser.

Se agregó `PALETA_PROMO_TIERRA` con los dos criterios de siempre medidos
(contraste 7.02 el más justo contra el mínimo de 5; separación de tono de 52° a
108° contra el mínimo de 49) y uno propio: **la saturación va de 36% a 60%,
contra el 72–88% de la clásica**. Esa es toda la diferencia. Un tono al 80% se
lee como tinta industrial por más terroso que sea el nombre que le pongamos.

La página de catálogo no hizo falta tocarla: ya consultaba `paletaDeTemplate`
con el `?t=` de la URL, así que sigue el color sola.

### BT-5 — La voz se cortaba al abrir el carrito ✅

El template dice **"piezas"** y **"Ver pieza"** en toda la portada —es el único
de los diez que tiene vocabulario propio—, pero el carrito es compartido y ahí
volvía a decir *"3 productos"*, *"Quitar del carrito"*, *"Finalizar compra"*. El
comprador cambiaba de tienda justo en el paso donde decide.

`CartDrawer` ahora acepta `vocabulario`, parcial y opcional: lo que no se pasa
queda como siempre, así que **los otros ocho templates no cambian un carácter**.
Boho dice "Tu selección", "Llevar estas piezas", "Sacar de la selección".

Lo que **no** entra ahí a propósito: los avisos del sistema ("No disponible para
el dueño", el mínimo mayorista). Esos no son la voz de la marca, es la app
hablando, y tienen que sonar igual en todas.

### BT-6 — El material estaba abajo del todo ✅

La ficha de atributos se dibujaba **después** de la descripción, como letra
chica. Es el mismo error en los tres templates de ropa, pero acá duele distinto:
una tienda que vende fibras naturales y tinturas vegetales tiene el material, el
origen y el taller como **argumento de venta**, no como dato técnico. Es la
razón por la que alguien paga más que en fast fashion, y estaba abajo de todo.

Subió arriba de la descripción, y con dibujo propio: Chic Paris y Fashion Noir
usan la tabla rayada, acá van filas al aire con el valor en la serif itálica del
template. Los datos son los que la dueña ya carga —no hay campo nuevo— y si no
cargó ninguno el bloque no se dibuja.

### BT-7 — El acento crudo sobre el panel blanco del modal ✅

Salió mientras se hacía BT-6, y es de los que no se ven hasta que alguien cambia
el color. En el modal, **el precio**, el rubro, "Consultá precio" y el sello de
condición se pintaban con el acento tal cual. Con el terracota de fábrica se
leen perfecto; con un acento claro —arena, crema, marfil, de los que la dueña
puede elegir— el precio quedaba escrito en blanco sobre blanco.

Van con `getReadableAccentText`, que devuelve el acento cuando se despega del
fondo y cae al color de texto del template cuando no.

Y la otra mitad, que es una pregunta distinta: los bordes que **marcan** el
color, el talle y la miniatura elegidos no necesitan leerse, necesitan
distinguirse como superficie. Esos van con `getReadableAccentFill`. Además el
relleno del chip seleccionado estaba clavado en `rgba(181,101,42,0.08)` —el
terracota de fábrica escrito a mano—, así que con cualquier otro acento el
borde decía un color y el fondo decía otro.

### BT-8 — El modal del catálogo era el de Chic Paris con la ropa de Boho ✅

Era el pendiente número uno, el mismo UP-12 / PL-11 de las auditorías anteriores:
`/tienda/[slug]/productos` tiene **un** modal para los cuatro templates de moda, y
la forma de fábrica es la de Chic Paris. Abrir el mismo producto desde el home y
desde el catálogo daba dos fichas distintas.

**No se resolvió como la vez anterior, a propósito.** Urban Pulse se había
arreglado con un booleano `esUP` repartido en unas treinta ternarias. Funcionó
para uno. Para el segundo, cada `esUP ? A : B` había que convertirla en una de
tres ramas, y para el cuarto en una de cinco: un arreglo que se pone **más caro**
con cada template en vez de más barato.

Así que la diferencia pasó a ser **dato**, en la tabla `THEMES` que ya definía el
tema de cada template. Cada uno declara en `modal` sólo lo que cambia y hereda el
resto de `VESTIDO_BASE`, que es la forma de Chic Paris. Urban Pulse dejó de ser un
caso especial y pasó a ser una fila; Boho Terra es otra; Fashion Noir tiene la suya
vacía esperando su auditoría, y agregarla será escribir lo que cambia y nada más.

La separación que el mecanismo obliga a respetar, que es la que se había perdido:

- el **vestido** (tipografía, medidas, glifos) va en los **tres anchos** — era el
  bug que reportó Flavio, que en celular el vestido se caía junto con la forma;
- la **forma** (`panelClavado`, `barraCompraCelular`) depende del ancho, porque
  necesita dos columnas para existir;
- los **colores no entran**: salen del tema y del acento que eligió la dueña.
  Clavarlos ahí sería justo el bug que se viene arreglando hace tres auditorías.

Lo que Boho Terra declara: 920 de ancho, dos columnas iguales, velo marrón en vez
de negro, nombre en Georgia itálica, miniaturas cuadradas de 52 y sus medidas de
chip. Y `fichaPrimero`, para que el catálogo respete el orden de BT-6 — si no, los
mismos dos bloques salían al revés en una pantalla y en la otra.

De paso, tres valores del tema de Boho en esta página no eran los del template:
`MID` estaba en `#999` —un gris neutro— cuando el template usa `#9a8070`, un topo
cálido, y MID pinta **todo** el texto secundario del modal.

### BT-9 — Igualado al revés: ahora el que estaba mal era el del template ✅

Con BT-8 el modal del catálogo pasó a tener la ropa de Boho Terra, y ahí se vio
que **el desordenado era el del home**. Seis diferencias, todas en el mismo panel:

| | template (antes) | catálogo | quedó |
|---|---|---|---|
| orden de chips | Color → Talle | Talle → Color | Talle → Color |
| títulos | "TALLE: 32" | "TALLE" | "TALLE" |
| qué va primero | leer, después comprar | comprar, después leer | comprar primero |
| superficie del panel | blanca | arena (`S`) | blanca en los dos |
| botón en celular | barra fija al pie | dentro del panel | barra fija en los dos |
| talles vacíos | rótulo "TALLE" solo | no se dibuja | no se dibuja |

Sobre **"comprar primero"**: parece pelearse con BT-6, y no. Son dos criterios que
conviven — el bloque de compra va arriba del todo (antes había que pasar la
descripción entera para llegar a elegir el talle), y **dentro de lo que se lee**,
la ficha va antes que la descripción, que es lo que BT-6 pedía. El catálogo ya lo
hacía así con `fichaPrimero`.

Las dos últimas filas se resolvieron del lado del catálogo, agregándole a su
vestido `superficie`, `barraCompraCelular` y las medidas de la barra — o sea que
la tabla de BT-8 ya está pagando: fueron tres líneas de datos y ningún `if`.

**Y apareció un bug de verdad**: el botón de comprar del modal —los cuatro, entre
escritorio, celular y modo consulta— se pintaba con `background:A, color:"#fff"`,
el acento crudo con la tinta clavada. Con un acento claro es blanco sobre blanco
en el botón que cierra la venta. Es la familia de BT-7, en el peor lugar posible.

Un detalle medido, porque el criterio no es obvio: la tinta va con
`getContrastColor` y **no** con `textoSobre`. Sobre el terracota de fábrica los dos
candidatos empatan —4.32 el blanco, 4.37 el negro—, así que `textoSobre` daría
vuelta la tinta a negro ganando 0.05 de contraste y cambiándole el aspecto a todas
las tiendas que no tocaron el acento. `getContrastColor` es además el criterio que
el catálogo ya usaba para ese mismo botón.

De paso, el "0" suelto de UP-7 estaba esperando otra vez en la barra de celular:
`comparePrice &&` con el precio anterior en 0 dibuja un `0` al lado del total.

### BT-10 — Lo que quedaba, viendo las dos fichas una al lado de la otra ✅

Con el orden ya igualado, poner las dos capturas juntas dejó ver el resto. Todo
del lado del template, que era el que estaba mal:

- **Las reseñas vivían DENTRO de la columna de compra**, que en escritorio es la
  mitad del modal. Eran lo más largo del panel: lo estiraban muy por debajo de la
  foto y dejaban media pantalla de aire muerto a la izquierda. Ahora van a lo
  ancho, abajo, como en el catálogo. Es lo que más se notaba.
- **El panel no tenía el scroll interno.** Se recorta al alto de la columna de la
  foto y scrollea por dentro con la barra escondida, con degradados arriba y abajo
  que reponen la señal de "hay más para leer". El mecanismo ya existía —lo usan
  Chic Paris y el catálogo—, sólo había que conectarlo: `useSombrasScroll` más el
  alto medido con un `ResizeObserver`.
- **El reel salía de 104px**, el ancho de fábrica, que es exactamente el caso que
  `ProductReels` documenta como "queda de estampilla al lado de una foto de 470".
  El catálogo ya pasaba `ancho`; ahora los dos pasan 160/120.
- **La foto iba pegada al borde del modal** y la tira de miniaturas se dibujaba
  sobre una banda arena a todo lo ancho. El catálogo la tiene metida 28px y sin
  banda.
- **Los similares salían pelados**, sin el 3×2 ni el sello de oferta que sí se ven
  en el catálogo. Y era raro, porque el precio de abajo ya venía descontado: el
  descuento estaba aplicado pero sin decir por qué.
- **Cinco títulos, cinco estilos.** "VIDEOS" contra "VIDEOS DEL PRODUCTO", las
  reseñas en Georgia itálica de 14 contra versalitas, la descripción con otra
  opacidad. Ahora hay un solo `tituloModal` para todo el modal, que además es el
  mismo que arma el catálogo para este template.
- **Al panel le faltaba `minWidth:0`.** Una columna de grid mide por su contenido:
  un nombre largo sin espacios le robaba ancho a la foto en vez de partirse.

El rótulo de la ficha se unificó al revés, hacia el template: el catálogo decía
"CARACTERÍSTICAS" y ahora dice **"La pieza"**, vía `rotuloFicha` en su vestido.
Esa es la voz de Boho Terra y es justo lo que BT-5 vino a defender.

### BT-11 — El formulario de reseñas seguía siendo el viejo ✅

El bloque de reseñas del template tenía el **formulario escrito al final, siempre
abierto**. El catálogo ya no funciona así: tiene un botón *"Escribí tu reseña"*
arriba de la lista que abre el formulario en **su propio modal**. El motivo está
escrito ahí: con varias reseñas cargadas había que bajarlas todas para llegar a
escribir la propia.

El template quedó con la versión vieja y ahora usa la misma: botón arriba, modal
aparte, con el zIndex entre medio de la ficha y el lightbox, que es el que
siempre tiene que ganar.

Dos cosas que aparecieron al mover el formulario, y que **también le faltaban al
catálogo** — se arreglaron en los dos:

- publicar no cerraba el modal, así que quedaba abierto y vacío **tapando la
  reseña recién publicada**, que es justo lo que la persona quiere ver;
- al abrir otra ficha con el formulario abierto, el formulario aparecía encima
  antes de que se viera el producto nuevo.

### BT-12 — Las reseñas de la portada, a `useHomeReviews` ✅

Era el pendiente que quedaba. Boho Terra tenía su propio `useState`, su propio
fetch y su propio borrar; el hook decía textual que la lógica "estaba escrita
adentro de ChicParis, y **a medias en BohoTerra**". Ahora usa el compartido.

Se trajo la **función**, no el diseño: el bloque sigue siendo el de este template
—la comilla grande en Georgia, la reseña en itálica, los puntitos y las flechas—.
Lo que cambió es qué datos recibe y qué se puede hacer con ellos.

Qué le faltaba a esa mitad, que es lo que el cambio destapa:

- **Las reseñas de TIENDA se tiraban a la basura.** El fetch propio leía sólo
  `d.reviews` —las de producto— y el servidor mandaba además `d.storeReviews`, las
  que hablan de la atención y del envío. Llegaban y se descartaban sin que nadie
  se enterara. Ahora están, en su pestaña.
- **No había forma de dejar una.** El bloque hacía `return null` con cero reseñas,
  y el botón para dejar la primera vive adentro del bloque: una tienda nueva no
  tenía **nunca** cómo conseguir la primera reseña de tienda. Ahora el bloque se
  dibuja siempre y con cero cambia el texto — deja de afirmar que los clientes
  dicen algo y pasa a invitar, que es de lo único que se puede hablar ahí.
- **Borrar no miraba si el servidor había contestado que sí.** Sacaba la tarjeta
  de la pantalla y listo: con el fetch fallando, el dueño la veía desaparecer, se
  quedaba tranquilo, y al día siguiente seguía publicada. `resenas.borrar`
  pregunta antes y la saca recién con la confirmación en la mano.
- Las de ejemplo estaban escritas adentro del bloque y hablaban de vestidos y
  blazers. Ahora son `EJEMPLOS_RESENAS`, con la voz de esta tienda —el lino, la
  tintura, la nota escrita a mano— y propias del template a propósito: compartidas,
  las previews de los diez se verían clonadas.

El modal de "Dejá tu opinión" es nuevo acá y está dibujado con la ropa de Boho,
pero la lógica es la del hook: confirmación antes de mandar, honeypot, captcha
propio, el aviso de que nace pendiente de aprobación, y el cartel que explica por
qué el botón está apagado —que son dos motivos distintos, dueño o vista previa, y
ninguno se adivina mirándolo.

### BT-13 — Sobre la foto de contacto, el texto no seguía a la capa ✅

Bajando la capa oscura al 10% sobre la foto de contacto, el título quedaba marrón
sobre marrón y se perdía. El bloque se pintaba con el color de texto del **color**
de la sección —el que se usaría si no hubiera foto— y ese color no se movía nunca,
tapara lo que tapara.

Sobre una foto el contraste **no se puede medir**: tiene zonas claras y oscuras a
la vez, cambia con cada tienda y el navegador no nos deja leerla. Lo único que sí
sabemos es la **capa** que puso el dueño, y eso es una declaración de intención:
capa oscura ⇒ está empujando la superficie al negro ⇒ texto claro. Con la capa en
"ninguna" no hay ninguna señal y se deja el color del template — adivinar sería
peor que no hacer nada.

Pero la intención sola no alcanza con la capa al 10%, que es justo el caso del
reporte: ahí la foto sigue mandando y **ningún color de texto gana** contra un
farol encendido al lado de una sombra. Por eso va acompañado de un halo detrás del
texto, en la dirección contraria a la tinta. Eso es lo que de verdad salva ese caso.

Las dos cosas viven en `section-bg.ts` —`tintaSobreFoto` y `sombraSobreFoto`—
porque **Urban Pulse tiene exactamente el mismo bug** en su sección de contacto
(`contactUpText` sale del color y se queda fijo con la foto encima). Está sin
arreglar: le toca en su vuelta.

De paso, el botón "Enviar mensaje" del formulario era otro `background:A,
color:"#fff"` — el acento crudo con la tinta clavada, familia de BT-7.

### BT-14 — El título de la colección no se podía editar ✅

El bloque más grande de la portada era el único cuyo título no estaba envuelto en
`EditableZone`: no había forma de tocarlo desde el editor. Tampoco el botón "Ver
colección completa".

El título se puede editar **sólo cuando dice el texto de fábrica**. Cuando el
visitante filtra, pasa a ser el nombre del filtro —"Mujer", "Camperas"— y eso es un
dato, no una frase de la tienda: dejarlo editable ahí sería ofrecerle a la dueña
cambiar un texto que desaparece apenas alguien toca un botón.

No hizo falta registrar los campos nuevos en ningún lado: `textOverrides` es un
`z.record(z.string(), …)`, sin lista blanca.

### BT-15 — "Ver más" en la descripción, en celular ✅

Idea de Flavio, y buena: en el celular la descripción es lo más largo de la
ficha. Una de cuatro párrafos empuja el precio, los talles y el botón de comprar
tan abajo que hay que scrollear varias pantallas para volver a encontrarlos.

Vive en `DescripcionPlegable`, compartido, porque lo usan el modal del template y
el del catálogo — y les va a servir a los otros ocho cuando les toque.

Dos decisiones que parecen detalle y no lo son:

- **El botón aparece sólo si el texto de verdad no entra.** Un "Ver más" debajo de
  una descripción de dos renglones no agrega nada y encima hace dudar de si falta
  algo. Por eso se **mide** el elemento (`scrollHeight` contra `clientHeight`) en
  vez de contar caracteres, que depende del ancho, del tamaño de letra y de si la
  dueña escribió listas o negritas.
- **Se pliega por LÍNEAS y no por altura fija**: con una altura en píxeles el
  recorte cae en cualquier parte y a veces parte un renglón por la mitad.

En escritorio no se pliega: ahí el panel ya scrollea por dentro (BT-10) y el
problema no existe. Y al pasar de un producto a otro vuelve a plegarse sola, si no
la ficha siguiente abría desplegada porque alguien había abierto la anterior.

### BT-16 — Tocar un producto similar dejaba la ficha nueva abierta por el pie ✅

Los "productos similares" están al final del modal, así que **el que toca uno está
siempre abajo de todo**. Cambiaba el producto pero el contenedor seguía scrolleado
donde estaba: aparecía el pie de la ficha nueva —las reseñas, los similares otra
vez— sin ver nunca la foto, el nombre ni el precio. Se leía como si no hubiera
pasado nada.

Se arregló en `openModal`, dentro de `useCartLogic`, y no en cada template: es
exactamente lo mismo que las cuatro líneas que ya estaban ahí —la foto en la
primera, el talle y el color al primer combo con stock, la cantidad en uno—, o sea
qué hay que dejar en cero al abrir otro producto. El hook expone un
`modalScrollRef` y cada template se lo cuelga al contenedor que scrollea.

Suelto en los templates habría que acordarse en cada uno, y hoy **no lo hacía
ninguno**. Quedó conectado en los cuatro que tienen bloque de similares adentro
del modal —Boho Terra, Chic Paris, Fashion Noir, Urban Pulse— más el catálogo. Los
otros seis no tienen ese bloque, así que no hay desde dónde cambiar de producto
estando abajo: no les aplica.

### BT-17 — Las tarjetas de los carruseles se iban de borde a borde ✅

Los carruseles de **Colección** y **Ofertas** no tenían el `maxWidth:1280` que usa
todo el resto del template — y que tienen sus **propios encabezados**. En una
pantalla ancha eso se veía de dos formas:

- la línea del título terminaba bastante antes que las tarjetas, o sea que el
  encabezado y su contenido no estaban alineados entre sí;
- tres tarjetas repartiéndose ~1700px son unos **550px cada una**, contra los
  ~300 de "Lo más visto". El mismo producto se veía de dos tamaños muy distintos
  según en qué bloque apareciera.

Las flechas van pegadas al borde de ese contenedor, así que se acomodaron solas.

Sólo con el ancho las tarjetas quedaban en ~386px: ya no rotas, pero con
proporción 3/4 son ~515px de alto, o sea una fila por pantalla. Así que los
carruseles pasaron además a **4 por vista en pantallas anchas**, con lo que quedan
en ~273 — la medida de las de "Lo más visto".

Hizo falta un segundo corte de ancho, en 1200. `isMobile` (768) no alcanzaba:
entre 768 y 1200 tres tarjetas entran cómodas pero cuatro quedarían de ~210px y la
prenda no se ve.

Y con eso apareció algo que había que atender: al ensancharse la ventana entran
más tarjetas por vista y **el tope del carrusel baja**. Con 8 productos, en 3 por
vista el último índice es 5 y en 4 es 4; si el visitante estaba en el 5 y agrandaba,
el carrusel se corría de más y mostraba un hueco al final. El índice se acota al
dibujar y no con un `setState` en un efecto: no hace falta guardar el número
corregido, sólo usarlo.

### BT-18 — Las flechas de los carruseles, afuera de las tarjetas ✅

Estaban encima de la prenda, y el motivo es sutil: el espacio de las flechas era
el `padding` del **carril de adentro**, el que tiene `overflow:hidden`. Ese
recorte pasa en el borde del padding, no antes, así que las tarjetas se asomaban
justo en la franja donde vivían las flechas.

El espacio pasó a ser un **pasillo del contenedor de afuera**: el carril ahora
termina donde termina la última tarjeta y las flechas quedan al costado.

El pasillo se reserva aunque la flecha de ese lado no esté dibujada —en la primera
vista no hay "anterior"—. Si el espacio apareciera y desapareciera con la flecha,
el carrusel entero se correría de lugar al pasar de página.

En celular no cambia nada: ahí las tarjetas se asoman a propósito (85% de ancho,
para que se vea que hay más al costado) y el gesto es el swipe.

### BT-19 — En el editor, la vista rápida no mostraba reseñas de ejemplo ✅

Lo notó Flavio comparando con Chic Paris. `useResenasProducto` acepta `ejemplos` e
`isPreview`, y **sólo Chic Paris se los pasaba**: Boho Terra, Urban Pulse y Fashion
Noir lo llamaban pelado, así que en el editor el bloque de reseñas de la vista
rápida aparecía vacío y no había forma de ver cómo queda lleno — que es justo para
lo que sirve el editor.

Los tres pasaron a pasarlos, cada uno con **sus propios textos**: las de Boho
hablan del lino y de la nota escrita a mano, las de Urban Pulse del entrenamiento,
las de Fashion Noir de la caída de la tela. Compartidas, las previews de los diez
templates se verían clonadas — es el mismo criterio que ya seguían las de la
portada.

Va con el cartel de "estas reseñas son de ejemplo", dibujado en la ropa de cada
uno. No es decorativo: tres reseñas con nombre, estrellas y fecha en su propia
tienda se leen como clientas de verdad si nadie aclara lo contrario. Y la regla de
fondo no cambia — el hook las muestra **sólo** con `isPreview`, y desaparecen solas
en cuanto llega la primera real.

### BT-20 — Auditoría de seguridad del formulario de reseña de producto ✅

Preguntó Flavio si el formulario tiene antibots, captcha, bloqueo de doble clic y
validaciones. Se auditó de punta a punta.

**El servidor ya estaba bien**, que es lo único que un bot no puede saltear
(`/api/public/[slug]/reviews`):

- límite de **3 reseñas por IP cada 10 minutos** (429);
- honeypot mirado del lado del servidor, y responde un **201 falso** para no
  avisarle al bot que lo detectaron;
- validación de **tipos** antes de tocar nada: con `reviewer: 5` en el JSON, el
  `.trim()` tiraba TypeError y contestaba 500 — hoy es 400;
- rating acotado a 1–5, `productId` obligado a ser texto;
- comentario **recortado a `COMENTARIO_MAX`**, y el tope está en el servidor
  justamente porque el del formulario se saltea mandando el POST directo;
- verificación de **Turnstile**, y va al final a propósito: un error de campos no
  consume el token, que es de un solo uso.

**Lo que faltaba estaba en el cliente**, y no era parejo. Chic Paris tenía el
tratamiento completo (CP-12); los otros tres no:

| | doble envío | error visible | topes de largo |
|---|---|---|---|
| Chic Paris | ✅ | ✅ | ✅ |
| Urban Pulse | ✅ | ❌ → ✅ | ✅ |
| Fashion Noir | ❌ → ✅ | ❌ → ✅ | ✅ |
| Boho Terra | ❌ → ✅ | ❌ → ✅ | ❌ → ✅ |

Sobre el **doble envío**: no alcanza con `disabled` mientras se envía. Poner estado
no es inmediato, así que entre el primer submit y el re-render que apaga el botón
entran dos; y el submit también sale con Enter desde un campo, que ni pasa por el
botón. Corta un **ref**, que se cierra en la misma vuelta.

Sobre el **error invisible**: era el peor de los tres. Se apagaba el
"Publicando…", el botón volvía a habilitarse y el comprador no sabía si se había
publicado. El servidor manda el motivo —captcha vencido, nombre corto, demasiadas
seguidas— y ahora se muestra tal cual.

El captcha ya estaba en los cuatro; no había nada que agregar ahí.

### BT-21 — Aviso al ocultar el bloque de reseñas ✅

Preguntó Flavio si ocultar el bloque debería avisar. Sí, pero **no con un "¿estás
seguro?" genérico**: ocultar es reversible, el bloque se queda a la vista en el
editor con el cartel de "bloque oculto" y el botón se pone rojo. Preguntar en los
ocho bloques de cada uno de los diez templates sería ruido, y el ruido se aprende
a ignorar — el día que el aviso importe, ya nadie lo lee.

El de reseñas sí lo necesita, y por un motivo concreto: **el botón para dejar una
opinión vive adentro del bloque**. Ocultarlo no esconde contenido, corta la
entrada de reseñas nuevas. Eso no se deduce mirando la pantalla.

`SectionBlock` acepta `avisoAlOcultar`. Sin la prop no pregunta nada, así que los
demás bloques no cambian. Con la prop: confirma sólo al **ocultar** —volver a
mostrarlo no rompe nada— y además repite el texto **dentro del cartel de bloque
oculto**, para el que abre el editor una semana después y no entiende por qué no
le entran reseñas.

**Dos correcciones que salieron de una repregunta de Flavio** ("¿el botón del panel
dejaría de funcionar?"). El primer texto decía de más, y verificarlo en el código
mostró dos cosas:

- son las reseñas **de la tienda** las que se cortan. Las de cada producto se
  escriben desde el modal, que no vive adentro de este bloque, y siguen andando.
  El aviso ahora lo dice;
- **Fashion Noir no tiene ese botón** en su bloque: sólo muestra reseñas. Ahí el
  aviso habría sido falso, así que no lo lleva. Quedó anotado que su prueba social
  todavía usa un `deleteHomeReview` propio en vez de `useHomeReviews`, como estaba
  Boho Terra antes de BT-12.

### Verificación

`npx tsx src/lib/promoPaletas.check.ts` — audita las tres paletas contra las
reglas que los comentarios prometían y que hasta ahora no comprobaba nadie:
contraste, separación de tono, que ninguna invada el rojo (reservado para la
oferta del producto) y que las tres cubran los mismos tipos de promo.

Encontró dos cosas de la **clásica**, que ya estaba en la calle:

- la lima da **4.99** contra el blanco, no 5 — el comentario decía "5:1 o más" y
  al lado anotaba "(4.99)": la regla se escribió redondeando. Pasa AA de sobra
  (el mínimo real es 4.5) y está pintando promos en ocho templates, así que
  cambiarla por 0.01 repinta media tienda a cambio de nada. Queda anotada como
  tolerada, con el motivo, en vez de bajarle el umbral a todos.
- el teal contra el azul da **49° exactos**, justo el mínimo. No es un problema:
  era comparación en flotante (48.999…) contra un valor anotado en enteros.

## Pendiente de revisar

Lo que todavía no se miró, en orden de sospecha:

- ~~Las reseñas de la portada escritas a mano~~ — resuelto en BT-12.
- **Lo que sigue pendiente:** Chic Paris y Urban Pulse usan
  `useHomeReviews` —los dos templates ya auditados—; Boho Terra tiene su propio
  `useState`, su propio fetch y su propio borrar. El hook dice textual que esto
  "estaba escrito adentro de ChicParis, y **a medias en BohoTerra**". Falta comparar
  qué le falta a esa mitad.
- **Ocho `picsum`** de relleno. Ya no cuestan cuota de Vercel (desde el arreglo de
  `FadeImage`), pero siguen siendo fotos de stock en una tienda real.
- El recorrido de compra completo y el barrido de anchos (360 / 768 / 1280).
