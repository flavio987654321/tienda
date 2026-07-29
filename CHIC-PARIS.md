# Chic Paris — revisión del template

Revisión completa de `src/components/store/templates/ChicParis.tsx` (1860 líneas), hecha el
22/07/2026 leyendo el archivo entero y verificando cada punto contra el código que lo rodea
(`useCartLogic`, `useStorefront`, `promoDisplay`, la página de listado y la API de vistas).

**Los 13 quedaron cerrados el 23/07/2026.**

| # | Qué pasa | Gravedad | Estado |
|---|---|---|---|
| ~~CP-1~~ | ~~El mismo producto muestra dos precios distintos en la misma página~~ | Alta | **hecho** |
| ~~CP-2~~ | ~~El dueño infla sus propias vistas desde el editor~~ | Alta | **hecho** |
| ~~CP-3~~ | ~~La barra de anuncios queda en blanco si el dueño borra mensajes~~ | Baja | **hecho** |
| ~~CP-4~~ | ~~En desktop el carrusel del hero se congela~~ | Media | **hecho** |
| ~~CP-5~~ | ~~Un producto sin variantes nunca dice "Sin stock"~~ | Media | **hecho** (no era del template) |
| ~~CP-6~~ | ~~Las categorías pueden llevar a listados vacíos~~ | Media | **hecho** |
| ~~CP-7~~ | ~~`activeCategory` no se puede cambiar — filtro muerto~~ | Fantasma | **hecho** |
| ~~CP-8~~ | ~~`visibleCount` es una constante disfrazada de estado~~ | Fantasma | **hecho** |
| ~~CP-9~~ | ~~El botón de desktop no dice cuánto vas a pagar~~ | Mejora | **hecho** |
| ~~CP-10~~ | ~~Ofertas ignora las promos también en el `%`~~ | Mejora | **hecho** (venía pegado a CP-1) |
| ~~CP-11~~ | ~~Borrar una reseña no pregunta ni avisa si falla~~ | Mejora | **hecho** |
| ~~CP-12~~ | ~~El formulario de reseña falla en silencio~~ | Mejora | **hecho** |
| ~~CP-13~~ | ~~`accentText` ya está calculado y no se usa~~ | Mejora | **hecho** |

---

## Bugs

### ~~CP-1~~ — El mismo producto muestra dos precios distintos en la misma página ✅

Solo **dos** de los siete lugares que muestran precio consultan las promociones:

| Dónde | Línea | ¿Aplica la promo? |
|---|---|---|
| Grilla del catálogo | 889 | ✅ `resolveProductPromo` |
| Modal de producto | 270 | ✅ `resolveProductPromo` |
| Ofertas | 985 | ❌ `fmt(p.price)` |
| Lo más visto | 1064 | ❌ `fmt(p.price)` |
| Buscador | 1396 | ❌ `fmt(p.price)` |
| Productos similares | 1741 | ❌ `fmt(p.price)` |
| Favoritos | 1793 | ❌ `fmt(product.price)` |

Con una promo de 20% activa, la misma remera aparece a **$8.000 tachando $10.000** en la grilla, y a
**$10.000 a secas** tres bloques más abajo en "Lo más visto". El comprador ve las dos al mismo tiempo.

La página de listado (`/tienda/[slug]/productos`) sí lo hace bien en todas sus tarjetas — el problema
es solo de las secciones de la home de este template.

**Por qué no se ve todavía:** las cuatro tiendas activas tienen **0 promociones activas**
(verificado contra la base). Aparece el día que alguien cree la primera. Es decir: se rompe justo
cuando estrenemos la Fase 6.

#### Cómo quedó

Componente nuevo `PromoPrice`, en `src/components/store/PromoDisplay.tsx`, al lado de `PromoTag` y
`PromoBlock`. **Los siete lugares** de Chic Paris pasan por él.

No unifica el diseño —cada sección sigue eligiendo tamaño, peso y separación— sino la **cuenta**: no
hay forma de pintar un precio sin haber preguntado por las promos primero. Adentro llama a
`resolveProductPromo`, que reusa el motor, así que el número que se ve es el que cobra el checkout.

De paso salieron dos cosas más del mismo bloque:

- **La grilla tachaba de más.** El badge de oferta chequeaba `comparePrice > price`, pero el precio
  tachado de al lado solo chequeaba `comparePrice` a secas: un producto con `comparePrice` igual o
  menor al precio mostraba un tachado absurdo. Ahora es una sola regla, adentro del componente.
- **CP-10**, abajo: el círculo del `%` en Ofertas.

Verificado con el motor, un producto de $10.000 con un 20% de tienda:

```
ANTES  · grilla del catalogo ......... $8000  (tachando $10000)
ANTES  · lo mas visto / ofertas ...... $10000  <-- SIN la promo
ANTES  · buscador / favoritos ........ $10000  <-- SIN la promo
ANTES  · productos similares ......... $10000  <-- SIN la promo

AHORA  · los 7 lugares ............... $8000  (tachando $10000)

Lo que cobra el checkout ............. $8000
OK   el precio que se ve = el que se cobra
```

Los 120 casos de `pricing.check.ts` siguen dando el número congelado.

**Queda pendiente:** BohoTerra, FashionNoir y UrbanPulse tienen exactamente el mismo agujero (dos de
siete). Ahora es cambiar cinco bloques por `<PromoPrice/>` en cada uno.

---

### ~~CP-2~~ — El dueño infla sus propias vistas desde el editor ✅

`useCartLogic.ts:430` llama:

```ts
registrarVista(p.id, slug, isOwner);   // ← falta el 4to parámetro, isPreview
```

`registrarVista` acepta `isPreview` justamente para esto, y nadie se lo pasa. Y el `isOwner` que
recibe tampoco sirve en el editor:

- `/dashboard/configuracion:1893` arma el config como `{ ...config, previewFill: true, ... }`,
  partiendo de `DEFAULT_CONFIG` y agregándole `slug: store.slug` (línea 1439).
- `isOwner` **nunca se setea ahí** → `useStorefront` devuelve `isOwner: config?.isOwner ?? false`.

Resultado: el dueño abriendo la vista rápida de sus productos para acomodar la tienda dispara
`POST /api/public/{slug}/product-view` con el slug real. Y la API no valida nada de esto del lado
servidor — solo chequea que el producto exista y sume.

Es exactamente lo que pediste que no pasara ("no tienen q contar los vistos del dueño"), y el guard
que escribimos no llega a activarse en el único lugar donde el dueño mira productos todo el día.

#### Cómo quedó

Arreglado en la cañería, no en el template — así queda cubierto para los 8 templates de una vez:

1. `useStorefront` ahora devuelve `isPreview: previewFill`.
2. `useCartLogic` lo acepta y se lo pasa a `registrarVista` como 4to argumento.
3. La página de listado (`/tienda/[slug]/productos`) le pasa `isPreview: fromEditor`.

Los 8 templates llaman `useCartLogic(storefront)` con el objeto entero, así que los 8 lo heredan sin
tocarles una línea. La página de detalle de producto ya lo hacía bien por su cuenta.

El comentario en `useStorefront` deja anotado el porqué, que es la parte que se olvida: **en el
editor `isOwner` no alcanza**, porque el config del dashboard se arma desde `DEFAULT_CONFIG` y nunca
lo setea. `previewFill` es lo único que distingue "estoy acomodando mi tienda" de "un comprador está
navegando".

---

### ~~CP-3~~ — La barra de anuncios queda en blanco si el dueño borra mensajes ✅

**Corregido con `announcementMessages[announcementIdx % announcementMessages.length]`**, y el mismo
módulo en los puntitos. Se acota **al leer**, no con un efecto que reinicie el índice: el efecto
necesita un render más, y **en ese render la franja ya se dibujó vacía**. El parpadeo se vería igual.

<details><summary>Qué pasaba</summary>


`announcementIdx` (línea 95) no se reinicia cuando cambia la cantidad de mensajes. Si está en el 3ro
y el dueño deja 2, `announcementMessages[2]` es `undefined` → franja negra vacía arriba de todo. El
efecto de la línea 178 corta antes (`length <= 1`) y ni siquiera la rota para salir del estado.

Se ve en vivo mientras edita.
</details>

---

### ~~CP-4~~ — En desktop el carrusel del hero se congela ✅

**Corregido**: se sacaron `onMouseEnter`/`onMouseLeave` de la `<section>` de 100vh y la pausa quedó
solo en las flechas y en el contenedor de puntitos — donde el mouse está porque el visitante *quiere*
frenar el carrusel, no porque pasó por ahí.

<details><summary>Qué pasaba</summary>


La `<section id="hero">` mide `100vh` y tiene `onMouseEnter={() => setHeroPaused(true)}` (línea 717).
Apenas el visitante mueve el mouse ya está encima del hero, y el auto-avance se corta hasta que
scrollee lo suficiente como para que el puntero salga.

En la práctica: la mayoría de los visitantes de desktop ven solo el slide 1 y nunca los otros dos.
"Pausar al pasar el mouse" tiene sentido en un carrusel chico, no en uno que ocupa toda la pantalla.
</details>

---

### ~~CP-5~~ — Un producto sin variantes nunca dice "Sin stock" ✅ (el diagnóstico estaba mal)

**Esta ficha decía que `StorefrontProduct` no traía el `stock` del producto, que "el dato existe en la
base pero no llega al template". Es falso: `Product` no tiene columna `stock`.** El stock vive
entero en `ProductVariant` — en el schema, en el checkout (solo descuenta si hay variante) y en el
panel (suma `p.variants`). No había nada que "traer".

Lo que sí había era un producto en tres estados a la vez:

| Dónde | Qué dice un producto con 0 variantes |
|---|---|
| Panel del dueño | **sin stock** — `variants.reduce(...)` sobre lista vacía da 0 |
| Tienda | **disponible** — el cartel exige `variants.length > 0` |
| Checkout | **se vende** — solo valida stock si hay variante |

Verificado contra la base de producción antes de tocar nada: **90 productos activos, 90 con
variantes, 0 sin variantes.** No le pasaba a nadie. Pero se llega vaciando los campos de la única
fila de variante en el formulario, y el `some(v => !v.value)` que valida eso pasa de largo con un
array vacío.

**Corregido en `normalizeVariants` (`src/lib/products.ts`)**, que es por donde pasan el alta y la
edición: si no queda ninguna variante, se devuelve una fila "Único" con stock 0. Un solo lugar, y las
diez plantillas quedan afuera del problema en vez de repetir el parche cuatro veces. El stock 0 no es
un invento: es exactamente lo que el panel ya venía mostrando.

---

### ~~CP-6~~ — Las categorías pueden llevar a listados vacíos ✅

**Corregido**: el fallback a las genéricas del rubro quedó **solo en el editor** (`isPreview`), donde
son relleno visual para que el navbar no se vea vacío mientras se diseña. En la tienda real, sin
categorías propias no se muestra ninguna — y el desplegable "Categorías" del navbar se esconde
entero, porque con la lista vacía quedaba un recuadro blanco al pasar el mouse.

La decisión de fondo: una categoría que lleva a un listado vacío es **peor** que ninguna. El
visitante no lee "todavía no cargaron las categorías", lee "no tienen nada". Dejarlas sin link es
igual de malo: una palabra que parece clickeable y no hace nada.

Esto arregla de paso la columna "Colecciones" del footer, que heredaba el mismo agujero.

<details><summary>Qué pasaba</summary>


`categoryList` (línea 140):

```ts
const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
```

`defaultCategories` son las categorías **genéricas del rubro** (`storeTypeConfig.categorias`), no las
de la tienda. Si ningún producto tiene categoría propia (todos en `"general"`), el navbar muestra
categorías del rubro y cada una lleva a un listado vacío.

Es el mismo problema que arreglamos ayer en el footer, un nivel más arriba — y **mi arreglo del
footer heredó el agujero**, porque ahora la columna "Colecciones" también sale de `categoryList`.
</details>

---

## Código fantasma

### ~~CP-7~~ — `activeCategory` no se puede cambiar ✅

**Borrado**: el estado, el filtro de `allFiltered`, la rama del título y el resaltado del menú
mobile. Eran cuatro lugares sosteniendo una condición que siempre daba `false`.

<details><summary>Qué era</summary>

`setActiveCategory` se llamaba en **un solo lugar** y siempre con `"Todos"`. El dropdown del navbar
no filtra: navega con `window.location.href` al listado. Entonces `activeCategory !== "Todos"` era
**siempre falso**, y esas tres cosas nunca corrían.
</details>

### ~~CP-8~~ — `visibleCount` es una constante disfrazada de estado ✅

**Ahora es estado de verdad.** Se agregó **"Ver más (16)"** al lado de "Ver colección completa", que
suma `PASO_PRODUCTOS` (8) por clic, y el contador de arriba pasó a decir **"Mostrando 8 de 24
piezas"** mientras queden productos — cuando ya están todos vuelve a decir "24 piezas" a secas.

Sale gratis porque **los productos ya vienen todos en la misma respuesta** de `/api/public/[slug]`
(`take: 500`): "Ver más" no pide nada al servidor, solo deja de recortar la lista. Es instantáneo y
no agrega una llamada que pueda fallar.

El número entre paréntesis es a propósito: "Ver más" a secas no dice si faltan 2 o 200.

---

## Mejoras

### ~~CP-9~~ — El botón de desktop no dice cuánto vas a pagar ✅

**Igualado a los otros tres templates de moda**: el botón de desktop dice
`Agregar al carrito · $24.000`, con la misma cuenta que ya usaba el de mobile (N×M primero, después
promo con baja de precio, después precio × cantidad).

En mobile no se tocó nada: ahí el total ya está en grande arriba del botón, y ponerlo dos veces es
ruido. Lo que se emparejó es la incoherencia entre las dos vistas **del mismo template**.

### ~~CP-10~~ — Ofertas ignora las promos también en el `%` ✅

El círculo "-30%" se calculaba solo con `comparePrice`. Si además había una promo de tienda encima,
el porcentaje no era el descuento real.

Se arregló junto con CP-1 porque quedaba peor si no: con el precio ya corregido, el círculo hubiera
dicho "-30%" al lado de un precio con 20% de promo. Ahora si hay promo de tienda manda ella
(`promoP.pctOff`), y si no, sale de `comparePrice` como antes.

### ~~CP-11~~ — Borrar una reseña no pregunta ni avisa si falla ✅

**Corregido**: `deleteHomeReview` pide confirmación primero y saca la tarjeta **recién cuando el
servidor contesta OK**. También la limpia de `storeReviews`, que era otra lista donde podía quedar.

### ~~CP-12~~ — El formulario de reseña falla en silencio ✅

**Corregido**: rama `else` que lee el `error` que manda el servidor, `catch` con mensaje en vez de
vacío, y un cartel rojo arriba del formulario.

⚠️ **Y el formulario de reseñas de tienda que escribí el 23/07 tenía el mismo defecto**: copié el
`if (res.ok) {...}` con el `catch {}` vacío de este mismo archivo, dos líneas más abajo de donde esta
ficha lo explicaba. Se arregló en el mismo commit. Vale como recordatorio: copiar un patrón de al
lado también copia sus agujeros.

### ~~CP-13~~ — `accentText` ya está calculado y no se usa ✅

**Corregido**: los ~14 lugares usan `accentText`.

⚠️ Y el reemplazo masivo se comió **su propia definición** (`const accentText = accentText;`). Lo
cazó `tsc` al instante (TS7022 + TS2448), pero la lección queda: un buscar-y-reemplazar sobre una
expresión incluye la línea donde esa expresión **se define**.

---

## 28/07/2026 — El botón de cambiar ícono de la franja estaba tapado

Salió arreglando el mismo bug en Urban Pulse (ver `URBAN-PULSE.md`). Flavio pidió corregirlo también
acá.

`SectionBlock` planta sus controles con `zIndex:200`: "Ocultar bloque" abajo a la derecha y las
flechas de orden abajo y al centro. La franja de garantías mide unos 80px de alto, así que **esas
flechas caen sobre la esquina de abajo del ícono del tercer beneficio** y le comen parte del área de
clic.

Subirle el `zIndex` al botón habría sido peor: es transparente (`opacity:0`), así que se quedaría con
el mouse encima de las flechas y las dejaría **a ellas** sin clic. La salida fue correrlo a la esquina
de arriba del ícono, fuera de la banda que usa el editor.

De paso, lo que Flavio llamó "dificultad": el botón vivía encima del ícono con `opacity:0` y solo
aparecía si le pegabas justo con el mouse — nada avisaba que existía. Ahora la fichita se ve siempre
en modo edición y el globo de ayuda dice **"Cambiar ícono (2 de 5)"**, así se sabe cuántos hay y en
cuál se está. Antes se avanzaba a ciegas y sin forma de volver sin dar la vuelta entera.

**Está igual en otros cuatro templates**, todos con la misma forma —botón `inset:0`, `opacity:0`, sin
`zIndex`, adentro de un `SectionBlock`—: `FashionNoir` (garantías), `ElectroPrime` (confianza),
`TechNova` (confianza, dos lugares) y `AutoDrive` (filtros rápidos, dos lugares). Que choque o no
depende del alto de cada sección. No se tocaron.

**Corrección del mismo día.** La primera versión quedó mal: la fichita se puso a la DERECHA del ícono
y acá el ícono va pegado al texto, así que caía justo encima de las primeras letras del título. Se
movió a la izquierda, donde se mete en el aire que separa un beneficio del otro. (En Urban Pulse va a
la derecha porque allá cada beneficio es un bloque con su propia esquina libre — la misma decisión no
sirve para los dos.)

---

## Revisión posterior — el carrito compartido cambió DESPUÉS de cerrar este template

Chic Paris se cerró el **28/07**. El carrito compartido se tocó el **28 y el 29**, o sea después. Como
`ChicParis.tsx` usa `CartDrawer`, `CheckoutModal` y `useCartLogic` —los tres compartidos con los otros
nueve templates—, había que confirmar que nada de eso lo hubiera roto. Se revisó punto por punto.

**Los tres cambios de comportamiento le llegan, y le llegan bien.** Son agnósticos del template:

| commit | qué hace | efecto en Chic Paris |
|---|---|---|
| `9d5047f` / `56a6c05` | la ficha abre en una pareja talle+color que tenga stock | mejora: antes podía abrir con el botón apagado |
| `7f0e7ba` | el `+` no pasa del stock, y avisa | mejora, **y el aviso se ve** (ver abajo) |

**El aviso se muestra.** `CartDrawer` no dibuja el `toastMsg` —lo dibuja cada template—, así que había
que verificarlo acá: `ChicParis.tsx` lo tiene en `zIndex:99999` y el carrito va en `9700`, o sea que el
aviso queda **por encima** del panel abierto. Se ve.

**El arreglo del acento no le cambia ni un color.** `getReadableAccentFill` sólo reemplaza el acento si
el contraste contra el fondo baja de 1.25. El acento de Chic Paris es `#5e7c6f` (verde salvia) sobre
`#f0eeea`:

```
luminancia(#5e7c6f) = 0.1794      luminancia(#f0eeea) = 0.8562
ratio = (0.8562 + 0.05) / (0.1794 + 0.05) = 3.95
```

**3.95 contra un mínimo de 1.25**: devuelve el acento tal cual. El salvia queda intacto. El arreglo sólo
actuaría si la dueña eligiera un acento casi blanco — que es exactamente para lo que está.

**El acento personalizado se respeta en las dos pantallas.** En el catálogo, `G = accentOverride ?? th.G`:
si la dueña eligió un color, manda el suyo. No quedó clavado el de fábrica.

`tsc --noEmit` limpio.

### Lo único que apareció: el carrito se ve distinto en el home y en el catálogo

No es un bug —los dos se leen bien— pero son dos paletas para el mismo carrito de la misma tienda:

| | panel | campos | borde | tipografía |
|---|---|---|---|---|
| Home (`ChicParis.tsx:469`) | `#ffffff` | `#fafafa` | `#e5e5e5` gris | ninguna |
| Catálogo (`productos/page.tsx:1019`) | `#f0eeea` beige | `#ffffff` | salvia al 20% | Garamond |

Vienen de que el home tiene la paleta escrita a mano y el catálogo la deriva del tema del template.
Están casi invertidas: el panel del home es blanco con campos grises, el del catálogo es beige con
campos blancos.

**Sin decidir.** La del catálogo es más "Chic Paris" (usa la paleta real y el Garamond); la del home ya
está aprobada a la vista y tocarla es más riesgoso. Queda a criterio de Flavio si se unifican y hacia
cuál.
