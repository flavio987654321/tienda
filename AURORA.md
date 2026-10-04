# Aurora — revisión del template

Revisión completa de `src/components/store/templates/Aurora.tsx` (2.237 líneas), hecha el
03/10/2026 leyendo el archivo entero. Es el template **futurista** de moda: oscuro, luz viva,
vidrio y profundidad. Regla de Flavio para todo lo que se agregue: **bloques propios, con ese
lenguaje y que se vean pro; nada traído de Aire, Boho, Chic, Urban ni de ningún otro**. Lo único
que se comparte es la lógica (carrito, checkout, promos, stock).

Sus piezas de escena (`HeroFoto`, `Coverflow`, `GrillaProfunda`, `Materia`, `vueloDeFicha`)
ya son solo de Aurora: ningún otro template las usa. Bien.

Se tacha cada ítem al terminarlo, no al final.

## Lo que está mal

| # | Qué pasa | Gravedad | Estado |
|---|---|---|---|
| ~~AU-1~~ | ~~Restos del dorado de Fashion Noir en toda la tienda~~ | Alta (se ve) | **hecho** |
| ~~AU-2~~ | ~~El precio con promo en la ficha es ilegible~~ | Alta | **hecho** |
| ~~AU-3~~ | ~~Si la dueña elige un acento oscuro, la mitad de los botones quedan ilegibles~~ | Alta | **hecho** |
| ~~AU-4~~ | ~~Foto de stock en Nosotros~~ | Media | **hecho** |
| ~~AU-5~~ | ~~Tipografía Georgia (serif clásica) en un template futurista~~ | Media (diseño) | **hecho** |
| ~~AU-6~~ | ~~Mezcla de botones redondos y cuadrados~~ | Media (diseño) | **hecho** |
| ~~AU-7~~ | ~~Redes sociales como letras ("IG", "FB") en vez de íconos~~ | Baja | **hecho** |
| ~~AU-8~~ | ~~En el celular, el precio de abajo de la ficha confunde con cantidad > 1~~ | Baja | **hecho** (ficha nueva) |
| ~~AU-9~~ | ~~Arrastre lateral de 39px en Contacto entre 1099 y 1101 de ancho~~ | Baja (heredado) | **ya no pasa** |
| ~~AU-10~~ | ~~Código muerto y restos~~ | Fantasma | **hecho** |

### ~~AU-1~~ — Restos del dorado de Fashion Noir ✅
**Hecho el 03/10/26.** Los bordes de estructura son un filo de vidrio neutro (`LINEA`, `LINEA_FUERTE`) y los estados salen del acento de la dueña (`luz(a)`). También se fue el blanco crema `240,235,227` (39 lugares), los menús pasaron a vidrio oscuro y el tema de Aurora en `CatalogoGenerico` perdió el dorado.

`rgba(201,168,76,…)` es el dorado de Fashion Noir y aparece en unos 30 lugares: el menú de
categorías y sus hover, el menú del celular, el menú de la cuenta, los bordes del buscador, el
borde de los campos de Contacto, el talle elegido en la ficha, los botones apagados y "Sin
stock", la barra de la ficha en celular, el `BotonVolver`. Aurora es violeta (`G`): en pantalla
quedan detalles amarillentos que no son de esta tienda. Tienen que salir del acento.

### ~~AU-2~~ — El precio con promo de la ficha no se lee ✅
**Hecho el 03/10/26.** `REBAJA` y `TACHADO`, iguales en la grilla y en la ficha; el "% OFF" es una pastilla verde para fondo oscuro.

Ficha, líneas ~1826-1835: precio rebajado en `#dc2626`, precio tachado en `#444` (gris oscuro
sobre fondo casi negro: no se ve) y el "% OFF" en una pastilla verde clara que es de un diseño
claro. En la grilla el mismo precio va en `#f87171`. Hay que darle un tratamiento único y
legible en oscuro.

### ~~AU-3~~ — Texto fijo encima del acento ✅
**Hecho el 03/10/26.** El texto sobre el acento es `textoSobreAcento` en todos lados; el acento usado como texto es `GT`, que cae a la tinta si no llega a 3:1 contra el fondo; los botones apagados se ven apagados (`APAGADO_FONDO` / `APAGADO_TEXTO`).

El botón principal del hero usa `textoSobreAcento` (bien). Pero "Ver toda la colección",
Mayorista, Contacto, Newsletter, Favoritos, "Agregar al carrito", el toast y la barra de anuncios
llevan `color: BG` fijo. Con el violeta de fábrica se lee; si la dueña pone un acento oscuro
(azul marino, bordó), el texto negro sobre fondo oscuro desaparece.

### ~~AU-4~~ — Foto de stock en Nosotros ✅
**Hecho el 03/10/26.** Sin foto subida usa una de los productos; sin ninguna, la luz de la escena.

`nosotrosImageUrl` cae en `picsum.photos` si no subió foto. El propio hero dice "nunca una foto
de stock: una imagen de un desconocido haciéndose pasar por la colección es peor que no tener
foto". Nosotros tiene que seguir la misma regla.

### ~~AU-5~~ — Georgia en un template futurista ✅
**Hecho el 03/10/26.** Unbounded en los títulos y Sora en el texto (`aurora/fuentes.ts`), con `preload: false` para que sólo las bajen las tiendas con Aurora. Tamaños y pesos ajustados porque Unbounded es más ancha; la frase de marca dejó la cursiva.

Los títulos de la frase de marca, Nosotros, Mayorista, Contacto, el título de la ficha, el pie y
Favoritos van en Georgia (serif de diario). Es lo más "clásico" que tiene la tienda y es lo que
más la aleja de futurista. Una sola familia moderna (geométrica o grotesca, de Google Fonts).

### ~~AU-6~~ — Botones redondos y cuadrados mezclados ✅
Hecho el 03/10/26: "Ver toda la colección", Mayorista, el formulario de Contacto (campos de 14px y botón píldora, adentro de un panel de vidrio) y el newsletter del pie (una cápsula con el botón adentro). La cantidad, los talles y las flechas ya eran redondos en la ficha nueva.

El hero y las tarjetas son de vidrio redondeado (pill de 999px, tarjetas de 18px), pero "Ver
toda la colección", Mayorista, Contacto, la cantidad, los talles, las flechas de la galería y
"Agregar al carrito" son rectángulos con esquina viva, del lenguaje de Fashion Noir.

### ~~AU-7~~ — Redes como letras ✅
Hecho el 03/10/26: logos de verdad (`shared/redesSociales.ts`, los mismos trazos que Aire) en esferas de vidrio que se encienden con el acento.

El pie muestra "IG", "FB", "TK", "YT", "PT" en cuadraditos. Íconos de verdad.

### AU-8 — Precio de abajo en celular
Muestra el TOTAL (precio × cantidad) y al lado "× 2", que se lee como "este precio, dos veces".
Y el tachado es el `comparePrice` aunque haya una promo.

### ~~AU-9~~ — Arrastre lateral en Contacto ✅
Medido el 03/10/26 después del rediseño de Contacto: a 1099, 1100 y 1101 la página mide exactamente el ancho de la pantalla. Ya no pasa.

Anotado en el código (pie, ~línea 1517): entre 1099 y 1101 de ancho, solo en Contacto, la
página se arrastra 39px de costado. No se encontró la causa.

### AU-10 — Código muerto
- ~~`import {  } from "@/hooks/useStorefront"` vacío~~ (sacado).
- ~~`activeCategory` nunca se cambia (solo se resetea): el filtro por categoría de la portada no
  hace nada. Lo mismo `visibleCount`: es siempre 8.~~ (sacados: queda `VISTOS_EN_PORTADA = 8`).
- ~~Comentario de "Nosotros y Contacto NO están" repetido dos veces~~ (sacado).
- ~~`GARANTIAS[i].svg` no se usa: los íconos salen de `AU_STRIP_ICONS`.~~ (sacado).

## ~~AU-11~~ — El catálogo es el de todos, con otros colores ✅

**Hecho el 03/10/26.** El cerebro salió a `useFiltrosCatalogo` (verificado: el catálogo compartido quedó idéntico píxel por píxel en 9 templates, a 1280 y 360). Aurora dibuja el suyo en `aurora/CatalogoAurora.tsx`: escena de luz con el título de lo que se mira, barra de vidrio pegada debajo del menú (buscar, ordenar, filtros), categorías y subcategorías como cápsulas que se encienden, las mismas piezas de la portada (`aurora/TarjetaAurora.tsx`), una línea de luz con "Mostrar más" en vez de páginas, y los filtros finos en un panel de vidrio (al costado en la compu, desde abajo en el celular). Tocar una pieza abre la ficha de Aurora con su vuelo y el carrito es el mismo de la portada.

Queda para después:
- En `CatalogoGenerico` quedó sin uso el acomodo "muro" y el tema `aurora`: Aurora ya no pasa por ahí. **A propósito para más adelante (04/10/26):** no se ve ni cambia nada, y son muchos cambios chicos en el archivo que usan todas las tiendas. Se saca cuando Boho, Urban y Chic tengan su catálogo propio, que es cuando ese archivo cambia de verdad.
- ~~El carrito y el checkout (`CartDrawer`, `CheckoutModal`) siguen siendo los compartidos con la paleta de Aurora.~~ ✅ 04/10/26: siguen siendo los compartidos (la cuenta es una sola), pero su `CartTheme` acepta una `forma` opcional —redondeo de botones, campos y fotos, y brillo del botón principal— y Aurora pasa sus píldoras. Sin `forma`, los otros templates quedan exactamente igual. El aviso de "agregado al carrito" pasa a ser una cápsula de vidrio.
- ~~`BotonVolver` en Nosotros y Contacto es el compartido; el catálogo ya tiene el suyo.~~ ✅ 04/10/26: los tres usan `aurora/VolverAurora.tsx`.

Al tocar "Ver colección", Aurora muestra `CatalogoGenerico` (el catálogo compartido, 3.262
líneas). Tiene un acomodo propio, el "muro" (sin título, más ancho y con la barra de filtros
de vidrio flotando abajo), pero las **tarjetas, los filtros, el orden y la ficha del producto
son los mismos de todos los templates** con la paleta de Aurora. Encima, la ficha que se abre
desde el catálogo no es la de Aurora (la que vuela desde la tarjeta): es la genérica. La
portada promete una tienda futurista y el catálogo la deja de cumplir. Flavio: "eso me la baja".

**Cómo se arregla:**
1. Separar el **cerebro** del catálogo (traer productos, filtrar, ordenar, paginar, la
   dirección compartible) en un hook, sin cambiar nada de lo que se ve en los otros
   templates. Es el paso delicado: el archivo lo usan todos.
2. Dibujar un **catálogo propio de Aurora** con ese cerebro: las mismas piezas de vidrio de
   la portada que llegan en profundidad (`GrillaProfunda`), filtros como luz y vidrio, y la
   **ficha de Aurora** con su vuelo, en vez de la genérica.

## ~~AU-12~~ — La ficha del producto era la de todos ✅

**Hecha el 03/10/26** en `aurora/FichaAurora.tsx`, a pedido de Flavio ("el modal es siempre el mismo que los otros templates"). El fondo es la foto del producto difuminada con la luz; foto en marco redondeado con flechas de vidrio, contador y miniaturas que se encienden; talles en cápsulas y colores en esferas con anillo de luz; cantidad y comprar en una fila de vidrio (en el celular, barra fija abajo con el total y las unidades); detalles y reseñas en paneles, el formulario se despliega cuando se pide; "También te puede gustar" con `TarjetaAurora`. La lógica no cambió (opciones, stock, promos, 3×2 y reseñas salen de los mismos hooks) y el vuelo desde la tarjeta sigue andando. Probada a 1280, 768 y 360.

## Bloques heredados que no son futuristas

Funcionan, pero son los mismos bloques que tienen los templates clásicos, con otro color:

- ~~**Garantías**: tira de 4 íconos con borde. Es la de Fashion Noir.~~ ✅ `aurora/GarantiasAurora.tsx`: paneles de vidrio sobre un haz de luz, íconos en esferas.
- ~~**Frase de marca**: cita en serif cursiva centrada.~~ ✅ `aurora/FraseAurora.tsx`: la frase escrita en luz (un destello la recorre) sobre un horizonte iluminado.
- ~~**Mayorista**: cartel centrado con botón.~~ ✅ `aurora/MayoristaAurora.tsx`: panel de vidrio con un filo de luz que gira.
- ~~**Nosotros**: foto a la izquierda y texto con 4 números a la derecha.~~ ✅ foto en marco de vidrio que se inclina, texto en panel, números en paneles con su cifra en luz.

Son los candidatos a rehacerse con el lenguaje de Aurora (luz, vidrio, profundidad,
movimiento). No hace falta cambiar qué dicen, sino cómo se ven.

## Lo que le falta a la portada (estudio del 03/10/26)

Hoy la portada es: portada con carrusel 3D, Garantías, Mayorista (solo mayoristas), frase de
marca y la grilla de productos. Una tienda de moda de verdad necesita contar más cosas, y hoy
Aurora no tiene dónde. Lo que falta, por orden de importancia para vender:

| # | Bloque | Para qué | Cómo sería en Aurora |
|---|---|---|---|
| ~~B-1~~ ✅ | **Colección en foco** (hecho 03/10/26, `aurora/ColeccionEnFoco.tsx`) | Mostrar UNA colección o categoría ("Otoño", "Denim") con su portada y sus productos, en vez de todo mezclado | La colección como una escena propia: su foto de fondo con la luz de Aurora y los productos de esa colección entrando en profundidad. La dueña elige qué categoría. |
| ~~B-2~~ ✅ | **Producto en foco** (hecho 03/10/26, `aurora/ProductoEnFoco.tsx`; "Ver y comprar" abre la ficha en vez de comprar acá, para no duplicar la lógica de talles y stock) | Empujar UN producto (el más vendido, el lanzamiento) | Un solo producto enorme, la luz sigue al mouse (en el celular, al inclinar), precio y talles flotando en paneles de vidrio, y "agregar al carrito" ahí mismo. |
| ~~B-3~~ ✅ | **Recién llegado** (hecho 03/10/26, `aurora/RecienLlegado.tsx`: línea de tiempo de luz con cuándo entró cada uno; se desliza y las piezas giran hacia el centro) | Que el cliente que vuelve vea lo nuevo sin buscar | Automático (los últimos que entraron), en una franja que se desliza con profundidad. |
| ~~B-4~~ ✅ | **Lo que dicen** (hecho 03/10/26, `aurora/ResenasAurora.tsx`: medidor de luz con el promedio, pista de vidrio que gira y el formulario de reseña de tienda) | Confianza: hoy las reseñas solo están adentro de cada ficha | Las mejores reseñas como tarjetas de vidrio en órbita. Solo aparece si hay reseñas reales. |
| ~~B-5~~ ✅ | **Preguntas frecuentes** (hecho 03/10/26, `aurora/PreguntasAurora.tsx`: las respuestas salen de los envíos, pagos y políticas cargados; editables una por una) | Envíos, cambios, talles, medios de pago: lo que todos preguntan por WhatsApp | Acordeón de vidrio; las respuestas salen de lo que la tienda ya cargó (envíos, políticas) para no escribirlo dos veces. |
| ~~B-6~~ ✅ | **Lanzamiento** (hecho 04/10/26, `aurora/LanzamientoAurora.tsx`: imagen velada que se revela sola en la fecha, cuenta regresiva en vidrio; fecha y producto se eligen en el editor, sin fecha no aparece) | Generar expectativa por algo que sale en una fecha | Cuenta regresiva en vidrio; después de la fecha se convierte en "Ya disponible". |
| ~~B-7~~ ✅ | **Lookbook** (hecho 04/10/26, `aurora/LookbookAurora.tsx`: hasta 3 looks con puntos de luz sobre cada prenda y la lista "En este look"; los puntos se marcan tocando la foto en el editor) | Looks completos, comprables desde la foto | Fotos de looks en la pista 3D con los productos marcados. |

B-1 y B-2 son los dos que pidió Flavio y los que más faltan. Todos se pueden ocultar y
reordenar desde el editor, como los bloques de hoy.

## Tipografía propia ✅ (hecha, ver AU-5)

Hoy Aurora usa Georgia (títulos) y Helvetica (texto). **Ningún template tiene tipografía
propia**: casi todos usan la del sistema o Georgia, así que se parecen también por la letra.
Para Aurora: **Unbounded** en los títulos (geométrica, ancha, futurista sin ser de juguete) y
**Sora** en el texto (limpia, técnica, muy legible chica). Se cargan con `next/font` (desde
nuestro dominio, sin pegarle a Google) y solo en las tiendas con Aurora. Cada template tiene
que tener su par propio; Aurora es el primero.

## Ideas de bloques nuevos (propios de Aurora)

Para elegir, no para hacer todos:

1. **Lanzamiento** — una colección o producto que "sale" en una fecha, con cuenta regresiva
   en vidrio y la luz de la escena que se intensifica al acercarse. Después de la fecha se
   convierte solo en "Ya disponible".
2. **Producto en foco** — un solo producto enorme, la luz sigue al mouse (en el celular, al
   inclinar el teléfono) y los datos flotan alrededor en paneles de vidrio.
3. **Franja de luz** — reemplazo de Garantías: los beneficios corren en una banda con brillo
   que cruza la pantalla, en vez de cuatro cajas quietas.
4. **Reseñas en órbita** — las mejores reseñas como tarjetas de vidrio en profundidad que se
   acercan al scrollear, en lugar de una lista.
5. **Lookbook 3D** — fotos de looks completos en la misma pista del coverflow, con los
   productos de cada look marcados y comprables desde la foto.
