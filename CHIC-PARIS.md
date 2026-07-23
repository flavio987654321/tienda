# Chic Paris — revisión del template

Revisión completa de `src/components/store/templates/ChicParis.tsx` (1860 líneas), hecha el
22/07/2026 leyendo el archivo entero y verificando cada punto contra el código que lo rodea
(`useCartLogic`, `useStorefront`, `promoDisplay`, la página de listado y la API de vistas).

Nada de esto está corregido todavía. Vamos de a uno y se tacha acá.

| # | Qué pasa | Gravedad | Estado |
|---|---|---|---|
| ~~CP-1~~ | ~~El mismo producto muestra dos precios distintos en la misma página~~ | Alta | **hecho** |
| ~~CP-2~~ | ~~El dueño infla sus propias vistas desde el editor~~ | Alta | **hecho** |
| CP-3 | La barra de anuncios queda en blanco si el dueño borra mensajes | Baja | pendiente |
| CP-4 | En desktop el carrusel del hero se congela | Media | pendiente |
| CP-5 | Un producto sin variantes nunca dice "Sin stock" | Media | pendiente |
| CP-6 | Las categorías pueden llevar a listados vacíos | Media | pendiente |
| CP-7 | `activeCategory` no se puede cambiar — filtro muerto | Fantasma | pendiente |
| CP-8 | `visibleCount` es una constante disfrazada de estado | Fantasma | pendiente |
| CP-9 | El botón de desktop no dice cuánto vas a pagar | Mejora | pendiente |
| ~~CP-10~~ | ~~Ofertas ignora las promos también en el `%`~~ | Mejora | **hecho** (venía pegado a CP-1) |
| CP-11 | Borrar una reseña no pregunta ni avisa si falla | Mejora | pendiente |
| CP-12 | El formulario de reseña falla en silencio | Mejora | pendiente |
| CP-13 | `accentText` ya está calculado y no se usa | Mejora | pendiente |

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

### CP-3 — La barra de anuncios queda en blanco si el dueño borra mensajes

`announcementIdx` (línea 95) no se reinicia cuando cambia la cantidad de mensajes. Si está en el 3ro
y el dueño deja 2, `announcementMessages[2]` es `undefined` → franja negra vacía arriba de todo. El
efecto de la línea 178 corta antes (`length <= 1`) y ni siquiera la rota para salir del estado.

Se ve en vivo mientras edita.

---

### CP-4 — En desktop el carrusel del hero se congela

La `<section id="hero">` mide `100vh` y tiene `onMouseEnter={() => setHeroPaused(true)}` (línea 717).
Apenas el visitante mueve el mouse ya está encima del hero, y el auto-avance se corta hasta que
scrollee lo suficiente como para que el puntero salga.

En la práctica: la mayoría de los visitantes de desktop ven solo el slide 1 y nunca los otros dos.
"Pausar al pasar el mouse" tiene sentido en un carrusel chico, no en uno que ocupa toda la pantalla.

---

### CP-5 — Un producto sin variantes nunca dice "Sin stock"

Línea 902:

```ts
const isSoldOut = product.variants.length > 0 && product.variants.reduce(...) === 0;
```

Un producto simple —sin talles ni colores— y sin stock no muestra el cartel, y el botón "Agregar al
carrito" queda habilitado porque `selectedVariantStock` es `null`. `StorefrontProduct` no tiene
`stock` a nivel producto: el dato existe en la base pero no llega al template.

Está igual en BohoTerra, FashionNoir y UrbanPulse.

---

### CP-6 — Las categorías pueden llevar a listados vacíos

`categoryList` (línea 140):

```ts
const base = cats.length > 0 ? cats : defaultCategories.slice(0, 6);
```

`defaultCategories` son las categorías **genéricas del rubro** (`storeTypeConfig.categorias`), no las
de la tienda. Si ningún producto tiene categoría propia (todos en `"general"`), el navbar muestra
categorías del rubro y cada una lleva a un listado vacío.

Es el mismo problema que arreglamos ayer en el footer, un nivel más arriba — y **mi arreglo del
footer heredó el agujero**, porque ahora la columna "Colecciones" también sale de `categoryList`.

---

## Código fantasma

### CP-7 — `activeCategory` no se puede cambiar

`setActiveCategory` se llama en **un solo lugar**, la línea 440, y siempre con `"Todos"`. El dropdown
del navbar no filtra: navega con `window.location.href` al listado. Entonces `activeCategory !== "Todos"`
es **siempre falso**, y estas tres cosas nunca corren:

- el filtro por categoría de `allFiltered` (línea 444)
- el título dinámico de la sección productos (línea 871)
- el resaltado de la categoría activa en el menú mobile (línea 691)

### CP-8 — `visibleCount` es una constante disfrazada de estado

Arranca en `8` y lo único que hace `setVisibleCount` es volver a ponerlo en `8`. No hay botón de
"ver más": la home muestra 8 fijos y manda al listado completo. Pero arriba dice
`{allFiltered.length} piezas` — o sea "24 piezas" encima de 8 productos, sin manera de ver las otras
16 ahí mismo.

---

## Mejoras

### CP-9 — El botón de desktop no dice cuánto vas a pagar

Los otros tres templates de moda dicen `Agregar al Carrito · $24.000`, con la promo ya aplicada.
Chic Paris dice solo "Agregar al carrito" (línea 1618); el total con promo aparece **solo en mobile**
(línea 1751). En desktop, con un 3×2 activo, el comprador no ve el número final hasta el carrito.

### ~~CP-10~~ — Ofertas ignora las promos también en el `%` ✅

El círculo "-30%" se calculaba solo con `comparePrice`. Si además había una promo de tienda encima,
el porcentaje no era el descuento real.

Se arregló junto con CP-1 porque quedaba peor si no: con el precio ya corregido, el círculo hubiera
dicho "-30%" al lado de un precio con 20% de promo. Ahora si hay promo de tienda manda ella
(`promoP.pctOff`), y si no, sale de `comparePrice` como antes.

### CP-11 — Borrar una reseña no pregunta ni avisa si falla

`deleteHomeReview` (línea 1093) no pide confirmación —un clic al lado y la reseña se fue— y saca la
reseña de la pantalla **aunque el fetch haya fallado**. El dueño cree que la borró; vuelve mañana y
sigue ahí.

### CP-12 — El formulario de reseña falla en silencio

`submitReview` (línea 408): si `res.ok` es `false` no pasa nada. Se apaga el "Publicando...", el
botón vuelve a estar habilitado y el comprador no sabe si se publicó o no. El `catch {}` de la línea
426 hace lo mismo con los errores de red.

### CP-13 — `accentText` ya está calculado y no se usa

La línea 266 define `accentText`. Después hay ~12 lugares que vuelven a escribir
`getContrastColor(ACC) === "light" ? "#fff" : "#111"` inline. Misma cuenta, doce veces.
