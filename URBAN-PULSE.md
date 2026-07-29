# Urban Pulse — revisión del template

Revisión completa de `src/components/store/templates/UrbanPulse.tsx` (1.813 líneas), hecha el
27/07/2026 leyendo el archivo entero y verificando cada punto contra el código que lo rodea
(`useCartLogic`, `PromoDisplay`, `promoDisplay.ts`, `EditContext` y lo ya arreglado en Chic Paris).

Los números de línea son los del día de la revisión: se corren a medida que se arregla.

| # | Qué pasa | Gravedad | Estado |
|---|---|---|---|
| ~~UP-1~~ | ~~El producto destacado muestra un precio que no es el que se cobra~~ | Alta | **hecho** 27/07 |
| ~~UP-2~~ | ~~El bloque Ofertas ignora las promociones~~ | Alta | **hecho** 27/07 |
| ~~UP-3~~ | ~~El acento no se adapta: se pierde el texto o se pierde él~~ | Alta | **hecho** 27/07 |
| ~~UP-4~~ | ~~El selector de color se traba y deja de sincronizar~~ | Media | **hecho** 27/07 |
| ~~UP-5~~ | ~~Seis de ocho lugares no dicen que el producto tiene promo~~ | Media | **hecho** 27/07 |
| ~~UP-6~~ | ~~El panel de favoritos se sale de la pantalla en 360px~~ | Baja | **hecho** 27/07 |
| ~~UP-7~~ | ~~Un `0` suelto arriba de la foto en Ofertas~~ | Baja | **hecho** 27/07 |
| ~~UP-8~~ | ~~El buscador usa dos columnas fijas también en celular~~ | Baja | **hecho** 27/07 |
| ~~UP-9~~ | ~~Con un fondo en degradado, el botón "Ver colección completa" queda sin texto~~ | Alta | **hecho** 27/07 |
| ~~UP-10~~ | ~~El bloque de opiniones son cuatro personas inventadas en el código~~ | Alta | **hecho** 28/07 |
| ~~UP-11~~ | ~~Quedaban 5 lugares donde el acento no se adapta, y las promos se ven iguales a Chic Paris~~ | Alta | **hecho** 28/07 |
| ~~UP-12~~ | ~~La ficha de producto era la de Chic Paris con otra ropa~~ | Alta | **hecho** 28/07 |
| ~~UP-13~~ | ~~El bloque destacado muestra el octavo producto de la lista, con una ficha inventada~~ | Alta | **hecho** 28/07 |
| ~~UP-14~~ | ~~El precio se pinta de ocho maneras distintas, con dos rojos que nadie eligió juntos~~ | Alta | **hecho** 28/07 |
| ~~UP-15~~ | ~~En celular el footer apila las tres columnas de links, y quedan casi dos pantallas~~ | Media | **hecho** 28/07 |

**Los quince puntos están cerrados.** Del UP-9 en adelante ya no salieron de la auditoría original:
los reportó Flavio mirando su propia tienda o los pidió él. UP-9 lo vio con una captura, y UP-10 fue
un pedido suyo — traer las reseñas de verdad
al bloque de opiniones. Lo que queda anotado no es de este template: está en
[Notas para cuando se arregle](#notas-para-cuando-se-arregle).

---

## Lo que YA está bien (no re-auditar)

- **Usa `CartDrawer` y `CheckoutModal` compartidos** (líneas 1799-1800). Todos los arreglos de
  cupones del 27/07 —el descuento que sigue al carrito, el techo relativo, el cupón bloqueado que
  se avisa en vez de desaparecer— le aplican sin tocar nada acá.
- **La foto del modal es `3/4` en todas las medidas** (línea 1446). No tiene el bug de Chic Paris,
  que en celular usaba `4/3` y recortaba la prenda.
- **`PromoTag` ya recibe `tipo`** (líneas 897 y 1452), así que la paleta de un color por tipo de
  promo funciona.
- **La grilla del catálogo y el modal calculan el precio con el motor** (`resolveProductPromo`,
  líneas 892 y 251). El número que muestran es el que se cobra.

---

## Bugs

### ~~UP-1~~ — El producto destacado muestra un precio que no es el que se cobra ✅

`src/components/store/templates/UrbanPulse.tsx:865`

```tsx
<span style={{ color:ACC, fontSize:36, fontWeight:900 }}>{fmt(featuredProduct.price)}</span>
```

`featuredProduct` **nunca pasa por `resolveProductPromo`** — se puede confirmar grepeando la
variable: aparece en 8 líneas y en ninguna se consultan las promociones.

Con una promo del 20% vigente:

```
Bloque "Producto destacado"   $50.000     ← precio de lista, crudo
Grilla del catálogo           $40.000     ← correcto
El carrito cobra              $40.000
```

Las dos cifras son visibles en la misma página, y la equivocada está en el bloque más grande.
Tampoco lleva el tag de la promo, así que ni siquiera se anuncia.

Es exactamente el caso que `PromoPrice` existe para impedir; su comentario lo describe palabra por
palabra: *"el mismo producto aparecía a $8.000 en la grilla y a $10.000 tres bloques más abajo"*.

**Arreglado el 27/07.** El precio pasa por `<PromoPrice>`, que hace imposible mostrar un número sin
haber consultado las promos. Se le pasa además `sobre={featuredText}` para que el tachado se atenúe
contra el fondo de esta sección —que es editable— en vez del gris fijo pensado para fondo blanco.

Queda pendiente de otras tareas: el `accent` sigue siendo `ACC` crudo (lo barre **UP-3**) y el
bloque todavía no muestra QUÉ promo es (lo barre **UP-5**).

---

### ~~UP-2~~ — El bloque Ofertas ignora las promociones ✅

`src/components/store/templates/UrbanPulse.tsx:1000`

```tsx
const allOfertas = products.filter(p => p.comparePrice && p.comparePrice > p.price);
```

Solo entran los productos con precio anterior propio. Un producto al que una **promoción de tienda**
le baja el precio no aparece en Ofertas, aunque para el comprador sea exactamente eso.

Es el mismo caso que ya se cerró en Chic Paris. Allá el filtro quedó así:

```tsx
products.filter(p =>
  (p.comparePrice && p.comparePrice > p.price) || resolveProductPromo(p, promotions).hasPriceDrop
);
```

**Arreglado el 27/07.** Se copió ese filtro. Se mantiene la regla de Chic Paris: las promos que
**no** tocan el precio (3×2, envío gratis) NO entran, porque al lado se mostraría el precio de lista
sin nada tachado y parecería un error de la página.

---

### ~~UP-3~~ — El acento no se adapta: se pierde el texto o se pierde él ✅

El acento es editable (`storeConfig?.colors.accent`, línea 146, con `#d4ff00` de fábrica). Hay
**40 usos** y ninguno pasa por los helpers de legibilidad que ya existen en `EditContext`
(`getReadableAccentText`, `getReadableAccentFill`, `textoSobre`). Falla en las dos direcciones.

#### A) El acento como RELLENO — se pierde el texto de arriba (13 lugares)

El patrón repetido es texto **fijo** encima del acento:

```tsx
style={{ background:ACC, color:DARK, ... }}   // DARK = "#0f0f0f", hardcodeado
```

Con el neón de fábrica, negro encima se lee perfecto. Con un acento oscuro elegido por la dueña,
queda **negro sobre negro**. Este template ni siquiera tiene una variable `accentText`: Chic Paris
la calcula, acá está escrito a mano en cada lugar.

Afecta a los botones principales: "Agregar al carrito" (869 y 1634), el CTA del hero (703), el de
mayorista (824), el de contacto (1186) y el badge de descuento de Ofertas (1024).

#### B) El acento como TEXTO — se pierde él (27 lugares)

```tsx
style={{ color:ACC, ... }}
```

Varios caen sobre fondos de sección **editables**, así que la dueña puede aclararlos y el acento
desaparece. Los peores son los que llevan información:

| Línea | Qué es | Fondo |
|---|---|---|
| 865 | el precio del producto destacado | `featuredBg`, editable |
| 1009 | kicker "Aprovechá" de Ofertas | `bgOfertas`, editable |
| 1061 | kicker "Tendencia" de Lo más visto | `bgMasVisto`, editable |
| 1154 | kicker de Contacto | editable |
| 816-818 | titular de mayorista | editable |

Medido con el acento de fábrica sobre un fondo claro:

```
#d4ff00 sobre blanco  →  contraste 1,16     (mínimo legible: 4,5)
```

Prácticamente invisible. Los fondos vienen oscuros de fábrica, así que hoy no se ve el problema:
aparece el día que alguien aclara una sección.

#### C) El precio tachado tampoco se adapta

Ninguna de las cinco llamadas a `PromoPrice` (1028, 1083, 1395, 1423, 1765) pasa la prop `sobre`,
así que el tachado usa el `#aaa` fijo pensado para fondo blanco. Sobre un fondo claro da 2,32 de
contraste y se pierde justo cuando es la prueba de que hay descuento.

#### D) Y había un `accentText` inverso alimentando el carrito

Apareció al arreglar lo anterior: `tsc` avisó que la constante ya existía, declarada más abajo solo
para el `cartTheme`. Estaba **al revés**:

```tsx
const accentText = getContrastColor(ACC) === "light" ? DARK : "#fff";
```

`getContrastColor(X) === "light"` significa *"sobre X va texto claro"*, y la rama devolvía `DARK`.
Con el acento de fábrica —el neón `#d4ff00`— terminaba pidiendo **blanco sobre amarillo**:

```
accentText viejo → #fff    contraste 1,16
accentText nuevo → #111    contraste 16,28
```

Y no era decorativo: ese valor viaja en `cartTheme` al `CartDrawer` y al `CheckoutModal`
compartidos, así que afectaba al carrito y al checkout enteros.

**Arreglado el 27/07.** Se agregaron las dos constantes que faltaban y se barrieron los 40 usos:

- `accentText = textoSobre(ACC)` para el texto **sobre** el acento — 13 lugares, más el `cartTheme`,
  que ahora usa esta misma y no la invertida.
- `accentSobre(bg, texto) = getReadableAccentText(ACC, bg, texto)` para el acento **como** texto, con
  el fondo real de cada sección. Se derivaron además `accSobreDark` y `accSobreClaro` para los dos
  fondos que se repiten (el negro de la marca y el gris de adentro del modal).
- Las seis llamadas a `PromoPrice` reciben ahora el acento legible **y** `sobre`, así el tachado se
  atenúa contra el fondo de su sección en vez del gris fijo.

**Queda afuera a propósito:** los bordes decorativos que usan el acento (las rayitas del nav, los
`borderTop` de sección, la sombra de los links del footer). Si el acento se parece al fondo se
pierde una línea, no información. Los tres bordes que **sí** llevaban información —el tilde de
"mensaje enviado", el botón de ver más reseñas y el de publicar— sí se corrigieron.

---

### ~~UP-4~~ — El selector de color se traba y deja de sincronizar ✅

`src/components/store/templates/UrbanPulse.tsx:313` (y el mismo patrón en 357)

```tsx
if (imgIdx !== -1) { colorSyncingRef.current = true; setModalImg(imgIdx); }
```

La bandera avisa al efecto de `[modalImg]` (línea 367) que ese cambio de imagen lo originó un
cambio de color, para que no rebote sincronizando el color de vuelta.

El problema: si `imgIdx` **ya es** el valor de `modalImg`, React descarta el `setState` y el efecto
de `[modalImg]` no corre. La bandera queda en `true` para siempre. El siguiente cambio de foto
*manual* —flecha o miniatura— la encuentra levantada, se la come y sale sin sincronizar: el
comprador cambia de foto y el color elegido se queda en el anterior.

Y se dispara en el caso más común de todos: al abrir el modal `modalImg` es 0 y la imagen del primer
color suele ser justamente la 0, así que la bandera queda trabada desde el arranque y **el primer
clic en una miniatura ya no sincroniza**.

**Arreglado el 27/07.** La bandera se levanta solo cuando la imagen de verdad va a cambiar, en los
dos lugares donde se sincroniza (por color y por talle):

```tsx
if (imgIdx !== -1 && imgIdx !== modalImg) { colorSyncingRef.current = true; setModalImg(imgIdx); }
```

⚠️ **Sigue igual en BohoTerra y FashionNoir.** Antes de tocarlos, evaluar extraer el modal a
`shared/`: los cuatro templates de moda lo tienen copiado y pegado, así que este mismo arreglo va a
haber que hacerlo tres veces más.

---

### ~~UP-5~~ — Seis de ocho lugares no dicen que el producto tiene promo ✅

| Dónde | Línea | ¿Avisa? |
|---|---|---|
| Grilla del catálogo | 897 | ✅ `PromoTag` / `OfferBadge` |
| Modal de producto | 1452 | ✅ |
| **Producto destacado** | **864** | ❌ *(se sumó al arreglar UP-1)* |
| Ofertas | 1022 | ❌ |
| Lo más visto | 1078 | ❌ |
| Buscador | 1390 | ❌ |
| Favoritos | 1418 | ❌ |
| Productos similares | 1761 | ❌ |

El destacado entró a esta lista al cerrar UP-1: ahí se arregló el **precio**, que era el problema de
plata, pero el bloque sigue sin decir qué promo se lo baja. Y tiene una particularidad — la foto ya
lleva el `badge` propio del producto arriba a la izquierda, justo donde `PromoTag` se posiciona. Ahí
conviene el modo `"chip"` al lado del precio, que además es donde se explica solo.

Con un descuento en porcentaje el precio en rojo todavía lo delata. Pero una promo **3×2** o de
**envío gratis** no toca el precio: en esos cinco lugares el producto se ve idéntico a uno sin
ninguna promo.

Chic Paris resolvió esto con un helper `avisoPromo(p, modo)` —un solo lugar que decide entre tag
sobre la foto y chip aparte— y lo llama desde las siete secciones. Acá nunca llegó.

**Arreglado el 27/07.** Se portó `avisoPromo(p, modo)` y ahora las ocho secciones avisan:

| Modo | Dónde | Por qué |
|---|---|---|
| `"foto"` | Lo más visto, similares | la foto está libre, el tag va en la esquina como en el catálogo |
| `"chip"` | destacado, Ofertas, buscador, favoritos | ver abajo |

Los cuatro `"chip"` no son por gusto: en el **destacado** esa esquina ya la ocupa el `badge` propio
del producto y `PromoTag` se posiciona justo ahí; en **Ofertas** la ocupa el badge del `%`; y el
**buscador** y **favoritos** son miniaturas de 56 y 68px, donde un tag encima tapa media foto.

En Ofertas conviven el `%` y el chip a propósito: no dicen lo mismo. El `%` dice cuánto baja el
precio de ESE producto, el chip dice cuál promo se lo baja — un descuento de $10.000 es −20% en una
remera de $50.000 y −10% en una campera de $100.000.

---

### ~~UP-6~~ — El panel de favoritos se sale de la pantalla en 360px ✅

`src/components/store/templates/UrbanPulse.tsx:1409`

```tsx
<div style={{ position:"absolute", right:0, top:0, bottom:0, width:400, ... }}>
```

Ancho fijo sin `maxWidth`. En un teléfono de 360px sobresale 40px por el borde izquierdo.

**Arreglado el 27/07.** Se le agregó `maxWidth:"100vw"`. El `width:400` se deja: es el ancho que se
quiere cuando la pantalla da, y `maxWidth` lo recorta sola cuando no. En 768 y 1280 no cambia nada.

---

### ~~UP-7~~ — Un `0` suelto arriba de la foto en Ofertas ✅

`src/components/store/templates/UrbanPulse.tsx:1024`

```tsx
{pct && <span style={{ ... }}>-{pct}%</span>}
```

Con `pct === 0` el `&&` no devuelve `false`, devuelve el número, y React dibuja un **"0" suelto**
arriba de la foto, sin badge ni nada. Se llega con una oferta de menos del 0,5%: un precio anterior
de $10.040 contra $10.000 redondea a 0%.

**Arreglado el 27/07.** `{!!pct && ...}`, el mismo arreglo que en Chic Paris. El `!!` fuerza el `0` a
`false`, y `false` React no lo dibuja.

---

### ~~UP-8~~ — El buscador usa dos columnas fijas también en celular ✅

`src/components/store/templates/UrbanPulse.tsx:1387`

```tsx
<div style={{ marginTop:40, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
```

Dos columnas siempre, con `padding:"80px 40px 40px"` en el contenedor. En 360px quedan 140px por
tarjeta para una foto de 56px más el nombre y el precio.

**Arreglado el 27/07.** Una columna en celular y el padding lateral a 16, como el resto de las
secciones:

```tsx
padding: isMobile ? "72px 16px 32px" : "80px 40px 40px"
gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"
```

Cuentas en 360px: antes quedaban **140px** por tarjeta para una foto de 56 más el nombre y el precio.
Ahora la tarjeta ocupa los 328 de ancho útil y al texto le sobran 230.

---

### ~~UP-9~~ — Con un fondo en degradado, el botón "Ver colección completa" queda sin texto ✅

No salió de la auditoría. Lo reportó Flavio con una captura de su tienda: el botón se veía como un
**rectángulo negro liso, sin una letra adentro**.

`src/components/store/templates/UrbanPulse.tsx:1030`

```tsx
style={{ background:productosTextUp, color:productosBgUp, ... }}
```

El botón es **la sección al revés**: se pinta con el color del texto y se escribe con el del fondo.
Como los dos colores salen del mismo par, por construcción siempre contrastan… mientras el fondo sea
un color.

Pero el fondo de una sección **puede ser un degradado**. El panel lo guarda como el string de CSS ya
armado y va derecho a `background:`, que lo acepta — esa es justamente la gracia del diseño, según el
comentario de `src/lib/section-bg.ts`. El problema es que este era el único lugar del template donde
ese valor terminaba en un **`color:`**, y `color:` no acepta degradados: el navegador **descarta la
declaración entera** y el texto se queda con el color que herede.

Medido con el fondo real de la tienda `tiendaapps`:

```
bgProductos guardado : linear-gradient(90deg, #6e5b5b 0%, #c5bdbd 100%)
punto medio          : #9a8c8c        →  relleno del botón: #0f0f0f

ANTES    color: <el degradado>   → CSS inválido, se descarta
         el texto hereda #0f0f0f → sobre #0f0f0f   contraste 1.00
DESPUÉS  color: #9a8c8c                            contraste 5.94
```

#### El primer arreglo se quedó corto

El primer intento fue `colorRepresentativo(productosBgUp)`: el punto medio del degradado, que sí es
un color válido. El texto volvió a aparecer, pero Flavio lo miró y dijo que seguía mal — y tenía
razón. **Copiar el fondo no es adaptarse.** Con un fondo de tono intermedio la etiqueta sale de ese
tono intermedio y apenas se despega del relleno: 5.94 donde se podía tener 19.17.

La regla buena es la misma que el resto del template: **elegir el texto midiendo contra la superficie
que tiene atrás**, que acá es el relleno del propio botón, no el fondo de la sección.

```tsx
const productosBotonText = textoSobre(productosTextUp);
```

Medido en los cinco casos que puede armar el panel:

| Fondo de la sección | Relleno | Antes (copiaba el fondo) | Ahora (mide el relleno) |
|---|---|---|---|
| degradado mauve (el de la tienda) | `#0f0f0f` | `#9a8c8c` **5.94** | `#fff` **19.17** |
| claro liso | `#0f0f0f` | `#ffffff` 19.17 | `#fff` 19.17 |
| oscuro liso | `#ffffff` | `#0f0f0f` 19.17 | `#111` 18.88 |
| degradado claro | `#0f0f0f` | `#f8f4f4` 17.56 | `#fff` 19.17 |
| degradado oscuro | `#ffffff` | `#252525` 15.33 | `#111` 18.88 |

Nunca es peor y en el caso que se reportó es tres veces mejor. Como efecto secundario ya no hace
falta `colorRepresentativo` acá: el fondo de la sección **dejó de entrar a un `color:`**, que era la
causa raíz.

#### Estaba igual en Boho Terra

Al buscar el patrón apareció en `BohoTerra.tsx:762` y `:942`, en los botones "Ver Colección" y "Ver
colección completa". Ahí el estado normal está bien —fondo transparente— y la inversión ocurre **al
pasar el mouse**, así que la etiqueta desaparecía en el hover. Mismo arreglo, con `heroLeftBotonText`
y `coleccionBotonText`. Los dos fondos que toca (`bgHeroLeft`, `bgColeccion`) están efectivamente
usados por tiendas reales.

⚠️ **Queda un caso menor sin tocar, a la espera de decisión.** Seis templates (TechNova, CasaClara,
AutoMotor, AutoDrive, HomeStudio, ElectroPrime) hacen `border: 2px solid ${navBg}` en el anillo del
puntito de notificaciones. Con un `navBg` en degradado el borde se descarta igual, pero ahí se pierde
un anillo decorativo de 2px, no un texto: el puntito rojo se sigue viendo. Es el mismo arreglo de una
palabra en cada uno.

---

### ~~UP-10~~ — El bloque de opiniones son cuatro personas inventadas ✅

`src/components/store/templates/UrbanPulse.tsx:42`

```tsx
const TESTIMONIALS = [
  { name:"Valentina R.", text:"La calidad es increíble...", stars:5 },
  ...
];
```

El bloque "Lo que dicen nuestros clientes" no leía ninguna reseña: eran cuatro textos fijos, iguales
para **todas** las tiendas que usaran Urban Pulse. Y las reseñas de verdad existían — pero escondidas
adentro del modal de producto, a un clic de distancia.

Las cinco estrellas también estaban escritas a mano, así que una tienda con promedio 3,2 publicaba
cinco estrellas llenas arriba de sus propias opiniones.

Cómo estaba repartido antes de tocar nada:

| Template | Bloque de reseñas |
|---|---|
| Chic Paris | completo: dos pestañas, promedio real, borrar, formulario |
| Boho Terra | a medias: solo las de producto |
| Fashion Noir | a medias |
| **Urban Pulse** | **ninguno** |

**Arreglado el 28/07.** Se separó la **función** del **diseño**, que es lo que pidió Flavio:

- **`src/hooks/useHomeReviews.ts`** (nuevo) — de dónde salen las reseñas, las dos pestañas y su
  respaldo, el promedio, borrar con confirmación del servidor, y el formulario de reseña de tienda con
  su captcha propio. **Compartido.**
- **`shared/ResenaComentario.tsx`** (nuevo) — el recorte del comentario y el "leer todo". Vivía dentro
  de Chic Paris. Se le sacó el Playfair que traía de fábrica: hacía que cualquier template que lo
  usara sin pensarlo apareciera escrito con la letra de otro. Ahora cada uno pasa la suya.
- **El diseño queda en cada template.** Chic Paris es un carrusel horizontal de tarjetas claras con
  Playfair en itálica; Urban Pulse es la grilla dura del resto del template — bordes rectos,
  mayúsculas, estrellas dibujadas en SVG, sin curvas.

**Chic Paris migró al hook** en la misma pasada: si no, la lógica quedaba escrita dos veces igual que
antes. Es refactor puro, sin cambio visual.

#### Qué se ve, y dónde

| Dónde | Qué muestra |
|---|---|
| Editor y galería de templates | reseñas **de ejemplo**, con un cartel que aclara que lo son |
| Tienda publicada, con reseñas | las **reales** |
| Tienda publicada, sin ninguna | el bloque **vacío**, invitando a dejar la primera |

El bloque **no se esconde** cuando está vacío. Adentro está el botón para dejar la primera reseña de
la tienda: escondido, una tienda nueva no tendría nunca cómo recibirla. Lo que sí cambia con cero
reseñas es el título, que deja de afirmar que los clientes dicen algo.

Los ejemplos son **propios de cada template**. Antes Urban Pulse tenía los suyos fijos y Chic Paris
los suyos; ahora siguen separados a propósito — si se compartieran, las previews de la galería se
verían clonadas.

#### Segunda pasada: el diseño todavía se parecía al de Chic Paris

Flavio lo miró y marcó tres cosas. Las tres eran ciertas:

**1. Las estrellas salían negras.** Estaban dibujadas con `ACC` **crudo** — el mismo descuido que
barrió UP-3, que se me escapó en el bloque nuevo. Con un acento oscuro sobre una sección oscura no se
veían. Medido:

| Acento | Fondo | Antes (`ACC` crudo) | Ahora (`accentSobre`) |
|---|---|---|---|
| neón `#d4ff00` | oscuro | 16.52 | **16.52** (conserva el acento) |
| negro `#000000` | oscuro | **1.10** | **19.17** |
| blanco `#ffffff` | claro | 1.09 | 17.58 |
| vino `#722F37` | oscuro | 1.99 | 19.17 |

Nunca peor: cuando el acento se distingue del fondo, lo deja.

**2. La tarjeta era igual a la de Chic Paris.** Ahora la foto va **a la izquierda y a toda la altura**
de la tarjeta, con el texto a la derecha. Y la grilla bajó de 4 a **2 columnas**: con cuatro por fila
quedaban ~220px para el texto y la foto no podía crecer — es el ancho lo que la agranda.

Una reseña de **tienda** no tiene producto, así que en su lugar va la inicial de quien escribe en un
cuadrado del acento. Sin eso, la pestaña "La tienda" quedaba con tarjetas de otra forma.

**3. La reseña no llevaba al producto.** Preguntó si al hacer clic iba a la ficha, y no: lo único que
llevaba era el link "Ver reseña →", que `ResenaComentario` solo dibuja cuando el comentario es largo y
se corta. Con comentarios cortos no aparecía nunca — y con la foto grande, la tarjeta *parece*
clickeable.

Primero se hicieron clickeables la foto y el nombre. Flavio marcó que no alcanzaba, y tenía razón:
son blancos chicos y nada indica que el resto no responda. **Ahora lleva la tarjeta entera**, con el
borde pasando al acento al pasar por encima. Una reseña de **tienda** no apunta a ningún producto, así
que ahí la tarjeta no es clickeable y no finge serlo.

Tres cosas que hicieron falta para que no se pisen los clics:

- El **botón de borrar** del dueño hace `stopPropagation`. Sin eso, borrar la reseña abría además la
  ficha del producto.
- **`ResenaComentario` también**, y va en el componente compartido porque es correcto en general. Pesa
  sobre todo en el caso de "Leer todo": ahí el botón despliega el texto en el lugar, y que además se
  abriera el modal sería justo lo contrario de lo pedido.
- El **nombre del producto** volvió a ser texto plano. Como botón dentro de una tarjeta clickeable, el
  clic se disparaba dos veces.

La foto conserva `role`/`tabIndex`/`onKeyDown`: para quien no usa mouse, ese es el punto de entrada.

#### Tercera pasada: revisión de los 20 commits de la sesión

Flavio pidió revisar todo lo tocado buscando bugs, código muerto, duplicado, validaciones y dobles
clics. La suite congelada de precios pasa entera, no quedó código muerto y no hay ningún
`{numero && ...}` nuevo. Aparecieron cuatro cosas, las cuatro arregladas:

**R-1 — El botón "Dejá tu opinión" era inalcanzable.** El más grave, y rompía justo lo que se había
pedido. El respaldo de pestaña corregía **también** la pestaña que el visitante había tocado a mano:

| Reseñas | Pestaña pedida | Efectiva | ¿Botón? |
|---|---|---|---|
| 0 y 0 | producto (por defecto) | producto | ❌ |
| 3 de producto, 0 de tienda | producto | producto | ❌ |
| 3 de producto, 0 de tienda | **tienda** (tocada) | **producto** ← rebote | ❌ |

O sea: **el botón solo aparecía si ya existía una reseña de tienda**, y como es el único lugar desde
donde se deja una, nunca podía existir la primera. Es exactamente la pescadilla que el comentario de
Chic Paris decía estar evitando.

Ahora el respaldo solo acomoda la pestaña que abrió sola; **si el visitante eligió, manda su
elección**. Y sin ninguna reseña abre en "La tienda", que es la única accionable. Verificado con los
siete casos posibles.

**R-2 — El dueño apretaba y no pasaba nada.** `enviar` corta en seco con `isOwner`, pero el botón solo
se apagaba en vista previa: el dueño mirando su tienda publicada escribía todo, apretaba y no ocurría
nada — sin error, sin cerrar. El hook ahora expone `bloqueo` (`"dueño"` / `"preview"`) y los dos
templates lo dicen.

**R-3 — El formulario de reseña de producto de Urban Pulse no tenía guarda contra doble envío.**
`reviewSubmitting` apaga el botón, pero es un `setState`: no se aplica hasta el próximo render, así
que dos clics rápidos entran los dos. Chic Paris ya tenía el ref y el honeypot; acá faltaban los dos.
Es pre-existente, no lo introdujo esta tanda.

**R-4 — El promedio del editor estaba escrito a mano.** Chic Paris anunciaba **5,0** mientras sus
propios ejemplos promedian **4,8** y una tarjeta de 4★ estaba a la vista. Ahora sale del hook,
calculado sobre los ejemplos.

**Queda anotado y sin hacer** (refactor, no bug): la UI del cupón está escrita dos veces
(`CheckoutModal` y `productos/page.tsx`), Urban Pulse tiene dos formularios de reseña casi idénticos
—el de producto y el de tienda, ~110 líneas cada uno—, y `accentSobre(testimonialsBgUp,
testimonialsText)` se recalcula 6 veces por tarjeta pudiendo ser una constante.

#### Y el cartel de Chic Paris mentía

Al migrar apareció esto. El aviso del editor le decía al dueño:

> *"Hasta que llegue la primera, este bloque **no se muestra** en la tienda publicada."*

**Es falso.** El bloque siempre se muestra — no hay un solo `return null` en todo el camino, y el
`SectionBlock` solo esconde lo que el dueño esconde a mano. Lo decía en dos de sus tres casos. Se
corrigió el texto para que describa lo que el código hace de verdad, y de paso se sumó a la cuenta lo
que faltaba: las reseñas **de tienda** aprobadas también suben a la portada, y el cartel solo contaba
las de producto.

---

### UP-11 — El acento seguía perdiéndose, y las promos se veían iguales a Chic Paris ✅

Flavio marcó tres cosas con capturas. Las tres eran ciertas.

#### A) Cinco lugares más donde el acento no se adaptaba

UP-3 barrió 40 usos pero se le escaparon estos, porque no son `color:ACC` a secas:

| Dónde | Qué pasaba |
|---|---|
| Badge del producto ("NUEVO") | `color: p.badge === "Sale" ? WHITE : ACC` sobre fondo `DARK` — acento oscuro = **negro sobre negro** |
| Menú de categorías, y 3 más | el hover pintaba `background = ACC` y el texto quedaba en `DARK` fijo |
| Estrellas del **promedio** | `fill={ACC}` crudo — se arreglaron las de las tarjetas y estas quedaron |
| Estrellas del formulario | `fill={ACC}` sobre el blanco del modal |
| Cuadradito de la inicial | `background:${ACC}18` + `color:ACC` sobre blanco: con acento claro se perdían letra y borde |

La lección: el patrón peligroso no es solo `color:ACC`. También lo son **el ternario**
(`? WHITE : ACC`) y **el hover que pinta el fondo sin tocar el texto**, que no aparecen si uno
grepea `color:\s*ACC`.

#### B) "✓ Compra verificada" con un verde fijo

Era `#22c55e` escrito a mano y el fondo de la sección lo elige la dueña: sobre un fondo verdoso el
sello quedaba casi invisible. Ahora pasa por `getReadableAccentText`, que conserva el verde mientras
se despegue del fondo y cae al color de texto de la sección cuando no. El sello se sigue
distinguiendo por el ✓ y la negrita.

#### C) Urban Pulse tiene su propia paleta de promos

Las promos usaban la misma tabla de colores para los diez templates, así que los chips de Urban Pulse
se veían idénticos a los de Chic Paris. La paleta pasó a ser un parámetro (`coloresPromo(tipo,
paleta)`), y Urban Pulse estrena una neón, calculada con **los mismos dos criterios** que la clásica —
no elegida a ojo:

| Tipo | Clásica | Neón (Urban Pulse) | Contraste del chip |
|---|---|---|---|
| PERCENT | `#c2410c` | `#ffd91a` amarillo | 13.66 |
| N_PAY_M | `#4d7c0f` | `#2bee4b` verde | 12.08 |
| FREE_SHIPPING | `#0f766e` | `#10d2f9` cyan | 10.44 |
| MIX_N_PAY_M | `#1d4ed8` | `#9674fb` violeta | 5.56 |
| FIXED | `#a21caf` | `#fb51c2` magenta | 6.35 |

Separación en la rueda: 90° · 80° · 60° · 65° · 65° — todos ≥49°, así no se confunden a 10px de alto.
La clásica **no se movió**: los otros nueve templates quedan igual (verificado, peor caso 4.99, el
mismo de antes).

**Lo que hubo que resolver además:** `PromoBlock` usa el color de la promo **como texto** sobre un
tinte casi blanco. Los tonos profundos se leen; los neón no —el amarillo sobre blanco da 1.4—. Se
agregó `paraTexto`, que oscurece el color lo justo y **deja intactos** los que ya se leen. Peor caso
del titular neón: 4.81.

**Y la página de listado.** Se pinta con los colores del template del que viene (`?t=`), pero dibujaba
las promos con la clásica: el mismo 3×2 se veía violeta en la portada y azul una pantalla después, al
tocar "Ver colección completa". Ahora hay una tabla `template → paleta` en un solo lugar.

---

### UP-12 — La ficha de producto era la de Chic Paris con otra ropa ✅

Pedido de Flavio: *"vamos con los modales de urban pulse, ¿cómo podemos hacer para que sean
diferentes a Chic Paris? Obvio que tenemos que pensar en todo: los reels, descripción, productos
similares, etc. Las imágenes, las miniaturas, agrandar más el modal"* y, enseguida: *"tenemos que
pensar qué va a pasar cuando hay más descripción o más reseñas, que no rompa el modal"*.

**El diagnóstico.** Cambiaban los bordes y la tipografía; el esqueleto era el mismo. Foto a la
izquierda, **todo** lo demás apilado en la columna derecha, similares abajo a lo ancho. Y más chico:
860px contra los 980 de Chic Paris.

Esa estructura es justo la que se rompe con contenido largo. Todo lo pesado —descripción, ficha,
videos, reseñas y el formulario— vivía en una columna de ~370px:

- con un producto real esa columna mide varios miles de píxeles;
- el botón de comprar se va de pantalla a los dos scrolls y no vuelve;
- al lado de la foto queda un vacío enorme, porque la foto ocupa 500px de una columna de 3000.

**La estructura nueva** (elegida por Flavio entre tres): **panel de compra fijo**. La derecha lleva
solo lo que hace falta para comprar y queda clavada (`position:sticky`) mientras la izquierda —foto,
descripción, ficha, videos, reseñas, similares— corre por debajo. El precio y el botón están siempre
a la vista y **el modal mide lo mismo con dos reseñas que con doscientas**.

```
┌──────────────────────────────────────────────┐
│ ▪ ┌────────────────┐  │ REMERA OVERSIZE   ✕ │
│ ▪ │      FOTO      │  │ $24.900             │
│ ▪ │     GRANDE     │  │ ★★★★★ 4.6 · 47      │
│ ▪ └────────────────┘  │ TALLE / COLOR / CANT│
│ ──────────────────    │ [ AGREGAR ]         │
│ ▌ DESCRIPCIÓN ────    │                     │
│ ▌ FICHA TÉCNICA ──    │  ← el panel queda   │
│ ▌ VIDEOS ─────────    │     fijo mientras   │
│ ▌ RESEÑAS (47) ───    │     la izquierda    │
│ ▌ TAMBIÉN TE PUEDE…   │     scrollea        │
└──────────────────────────────────────────────┘
```

| | Antes | Ahora |
|---|---|---|
| Ancho | 860 | **1080** |
| Columna de compra | 50% (~400px) | `clamp(300px, 36%, 400px)` |
| Miniaturas | fila abajo, 58×68, **sin `overflow`** | tira **vertical** al costado, 72×90 |
| Descripción | ~370px de ancho | ~640px, plegada a 200px con *Leer todo* |
| Videos | ~370px | ~640px, `ancho` de miniatura 148 |
| Reseñas | columna de compra | sección propia, comentario a 5 líneas |
| En celular | flotando a 92vh | pantalla completa, barra de comprar abajo |

**Por qué la tira de miniaturas va en `position:absolute`.** El alto de la fila lo tiene que fijar la
foto. Si la tira fuera un hermano flex, diez miniaturas estirarían la fila a 1000px y la foto se iría
con ellas. Con `top:0 bottom:0` mide exactamente lo que la foto y scrollea sola cuando no entran.

**Por qué `minmax(0,1fr)` y no `1fr`.** La descripción la escribe el dueño en un editor de texto rico
y puede traer una tabla ancha o un link larguísimo sin espacios. Con `1fr` eso estira la columna y
descuadra el modal entero.

**Por qué el panel además scrollea por dentro.** `sticky` no alcanza si el panel llega a ser más alto
que la pantalla —un producto con doce talles y ocho colores en un portátil bajito—: el botón de
comprar quedaría abajo, fuera de alcance.

#### Los cinco desbordes que ya existían

| Dónde | Qué pasaba |
|---|---|
| Miniaturas | `display:flex` sin `overflow-x`. Con ocho fotos se salían del modal. Chic Paris sí lo tenía. |
| Descripción | `.product-rte` no tenía `img{max-width:100%}`. Una imagen pegada en el editor rompía el ancho; un link largo sin espacios, igual. |
| Ficha técnica | un valor sin espacios (un código de barras, una URL) empujaba la tabla. |
| Comentario de reseña | sin recorte. Una reseña de 2000 caracteres, con diez más abajo, es un muro. |
| Formulario de reseña | **sin `maxLength`** — el de la tienda sí los tenía. Se podía escribir un comentario de cincuenta mil caracteres para que el servidor lo rechazara al final. |

El de `.product-rte` se arregló en `globals.css`, así que **vale para los diez templates**.

#### Tres cosas de contraste que aparecieron de paso

- **Los botones de compartir eran invisibles.** Fondo `rgba(255,255,255,0.06)` y borde
  `rgba(255,255,255,0.12)` sobre el **blanco** del modal —colores heredados de un template oscuro— y
  el hover pintaba el texto de blanco: al pasar el mouse desaparecían. El verde de WhatsApp al 70%
  daba 2,0 de contraste (el de marca entero da 1,8).
- **Cinco usos del acento crudo adentro del modal.** UP-11 barrió la portada y estos quedaron: las
  estrellas del promedio, las de cada reseña, las del formulario, la barra de distribución y el borde
  del sello *Verificada*. Con un acento claro se borran sobre el blanco de la ficha. Y las estrellas
  **vacías** estaban en `DARK`, o sea más marcadas que las llenas.
- **El texto de la descripción estaba en `#777`**, que sobre blanco da 4,48 y el mínimo para texto
  normal es 4,5. Para una etiqueta suelta da igual; para un párrafo de veinte líneas, no.

## Notas para cuando se arregle

- **Cerrados los once puntos**, del UP-1 al UP-11.
- ~~**`/plantillas/[id]` tira `useAuth debe usarse dentro de AuthProvider`.**~~ **Falso, revisado el
  28/07.** No hay nada que arreglar y el diagnóstico que había acá estaba mal en la premisa:
  `AuthProvider` **sí** envuelve esa ruta — `Providers` está en el layout raíz
  (`src/app/layout.tsx:59`) y desde ahí cubre toda la aplicación.
  Los 24 errores del log están todos entre 00:19:09 y 00:19:29, **justo después** de un error de
  sintaxis JSX en `UrbanPulse.tsx` a las 00:19:02, mientras se reescribía el modal. Cuando un módulo
  no compila, el árbol se rompe y el `useAuth` de adentro del template salta por eso: es un síntoma
  del error de compilación, no una falta de proveedor. En los 36 minutos siguientes de log, con el
  archivo ya sano, no volvió a aparecer ni una vez.
- **Boho Terra y Fashion Noir todavía no usan `useHomeReviews`.** Tienen el bloque a medias, escrito
  a mano: solo reseñas de producto, sin pestañas, sin promedio y sin forma de dejar una de la tienda.
  Migrarlos es lo que falta para que los cuatro queden parejos, y ahora es barato — el hook ya está.
- **UP-9 es una clase de bug, no un caso.** La regla: el valor de `sectionColors` sirve para
  `background:` y para nada más — puede ser un degradado, y `color`/`border`/`fill`/`stroke` no los
  aceptan. Y donde hacía falta un color de texto, la respuesta no era convertir el degradado a color
  sino **no mirar el fondo de la sección**: el texto se elige midiendo contra la superficie que tiene
  detrás. Quedan sin tocar los seis `border: 2px solid ${navBg}` descritos en UP-9, que sí necesitan
  la conversión porque ahí el color de la sección es lo que se quiere dibujar.
- **UP-4 está igual en BohoTerra y FashionNoir.** ~~Evaluar extraer el modal a `shared/`.~~
  **Descartado el 28/07 para el layout**: con UP-12 la ficha de Urban Pulse dejó de tener la
  estructura de las otras tres a propósito —panel de compra fijo contra columna única—, y Flavio
  quiere que cada template se vea distinto. Un componente compartido que aguante las dos estructuras
  sería más difícil de leer que las dos copias. Lo que sí conviene compartir es la **lógica**: el
  `colorSyncingRef` de UP-4, el recorte del comentario (`ResenaComentario`, ya hecho) y el `fetch` de
  reseñas del producto, que están escritos igual en los cuatro.
- ~~**El `accentText` invertido (UP-3D) puede estar en más templates.**~~ **Revisado el 28/07: estaba
  en SEIS.** Ver abajo.
- **El `<div>` de las redes sociales que se dibuja vacío sigue en dos templates.** Ver UP-15: el
  contenedor se renderiza aunque el `.map()` de adentro devuelva todos `null`, y deja su `marginTop`
  de aire suelto en el footer de cualquier tienda que no cargó ninguna red — que son casi todas al
  empezar. Falta el `.some()` en **Fashion Noir** (`marginTop: 24`, agujero visible) y en **Boho
  Terra** (sin `marginTop`, cuesta sólo una separación de la grilla). Los otros ya lo tienen.
- Todo cambio visual se revisa en **360 / 768 / 1280**. 768 es donde más se rompe.

### El `accentText` estaba mal en seis templates ✅

Se salió a buscar el patrón de UP-3D al resto de los templates. Estaba en **seis**, no en cuatro.
`accentText` es el color del texto que va **encima** de un relleno pintado con el acento, y viaja en
`cartTheme` al `CartDrawer` y al `CheckoutModal` compartidos: si está mal, se rompen el carrito y el
checkout enteros.

Cinco lo tenían **invertido** — `getContrastColor(X) === "light"` significa *"sobre X va texto
CLARO"*, y la rama devolvía el oscuro:

```tsx
CasaClara, ElectroPrime, HomeStudio, TechNova   getContrastColor(accent) === "light" ? "#111" : "#fff"
FashionNoir                                     getContrastColor(G)      === "light" ? BG     : T
```

Y **BohoTerra** era un caso distinto: `accentText:"#fff"` escrito a mano. No estaba invertido —
directamente no miraba el acento.

Medido con el acento **de fábrica** de cada uno, que es lo que ve cualquier tienda hoy:

| Template | Acento | Antes | Ahora | |
|---|---|---|---|---|
| CasaClara | `#0f172a` | **1.06** | **17.85** | negro sobre negro |
| FashionNoir | `#c9a84c` | **1.93** | **8.26** | claro sobre dorado |
| TechNova | `#7c3aed` | 3.31 | 5.70 | |
| ElectroPrime | `#ea580c` | 5.30 | 5.30 | acertaba de casualidad |
| HomeStudio | `#b5652a` | 4.37 | 4.37 | acertaba de casualidad |
| BohoTerra | `#b5652a` | 4.32 | 4.37 | |

**CasaClara y Fashion Noir tenían el carrito y el checkout ilegibles de fábrica** — no hacía falta que
nadie tocara nada. Los tres que acertaban lo hacían por casualidad: se rompían apenas la dueña
cambiara el color.

Los seis pasaron a `textoSobre(acento)`, que mide con el ratio real de WCAG y no puede equivocarse de
lado. Comprobado también con seis acentos elegidos a mano (blanco, negro, neón, vino, azul, crema):
todos quedan por encima de 5.

⚠️ **Lo que el arreglo NO puede resolver.** `textoSobre` elige el mejor de los dos colores posibles,
pero con la **terracota `#b5652a`** —el acento de fábrica de HomeStudio y BohoTerra— el mejor da
**4.37**, apenas debajo del mínimo de 4.5 para texto normal. No es un error del código: ni el blanco
ni el negro llegan sobre ese naranja. Para el texto de los botones —mayúsculas y en negrita— el
mínimo aplicable es 3.0 y sí lo pasa, pero si se quiere cumplir 4.5 en todos lados hay que oscurecer
un poco ese acento por defecto. Es decisión de diseño, no se tocó.

### Registro

**27/07/2026 — UP-1, UP-2 y UP-4.** `tsc` limpio, eslint sin errores nuevos, `/preview/urban-pulse`
carga en 200 y el log del dev server no reporta errores de runtime. Al cerrar UP-1 apareció una
consecuencia que se anotó en UP-5: el bloque destacado se sumó a la lista de los que no avisan qué
promo tienen.

**27/07/2026 — UP-3 y UP-5**, en la misma pasada porque tocan las mismas secciones. 40 usos del
acento revisados uno por uno contra el fondo real de cada lugar; ocho secciones avisando la promo.
En el camino apareció UP-3D, el `accentText` invertido que alimentaba el carrito: no estaba en la
auditoría original, lo destapó `tsc` al chocar con la constante nueva. Verificado igual que la
tanda anterior: `tsc`, eslint, preview en 200 y sin errores de runtime.

**27/07/2026 — UP-6, UP-7 y UP-8**, los tres de responsive y de una línea cada uno, en una sola
pasada. Con esto quedan cerrados los ocho puntos de la auditoría. Verificado igual que las tandas
anteriores: `tsc` limpio, eslint sin errores nuevos, `/preview/urban-pulse` en 200 y el log del dev
server sin errores de runtime. Nada pusheado ni deployado.

**27/07/2026 — UP-9**, reportado por Flavio con una captura, ya cerrada la auditoría. Se confirmó
leyendo la config real de la tienda en la base (consulta de solo lectura) en vez de deducirlo: el
fondo de la sección estaba guardado como `linear-gradient(...)`, y ese string llegaba a un `color:`,
donde el CSS es inválido. El contraste medido pasó de **1.00 a 5.94**. El mismo patrón apareció en
Boho Terra y se arregló igual.

Segunda pasada el mismo día: Flavio miró el resultado y avisó que el botón seguía sin adaptarse. El
primer arreglo solo había hecho válido el color, no legible — copiaba el fondo de la sección en vez
de medir. Se cambió por `textoSobre(<relleno del botón>)` y se midieron los cinco fondos que puede
armar el panel: **5.94 → 19.17** en el caso reportado, y nunca peor en los otros cuatro. `tsc`
limpio, eslint sin errores nuevos, `/preview/urban-pulse` y `/preview/boho-terra` en 200, log sin
errores. Nada pusheado ni deployado.

**28/07/2026 — UP-10.** Las reseñas de la portada. Se extrajo la función a `useHomeReviews` y a
`shared/ResenaComentario`, Urban Pulse estrenó el hook con diseño propio, y Chic Paris migró en la
misma pasada para que la lógica no quedara escrita dos veces. En el camino apareció que el cartel del
editor de Chic Paris afirmaba algo que el código no hace. `tsc` limpio, eslint sin errores nuevos,
`/plantillas/urban-pulse` y `/plantillas/chic-paris` en 200 con sus ejemplos, sus promedios y los dos
tipos de sello, log sin errores de runtime. Nada pusheado ni deployado.

Segunda pasada el mismo día, con Flavio mirando el resultado: las estrellas salían negras porque las
dibujé con el acento crudo (1.10 de contraste con su acento; ahora 19.17), la tarjeta seguía
pareciéndose a la de Chic Paris —se pasó la foto a la izquierda y a toda la altura, y la grilla de 4
a 2 columnas para que la foto pueda crecer—, y la reseña no llevaba a la ficha del producto, que
ahora se abre desde la foto y desde el nombre. `tsc` y eslint limpios, `/plantillas/urban-pulse` en
200, log sin errores después del último compilado.

**28/07/2026 — UP-11.** Reportado por Flavio con tres capturas. Aparecieron cinco usos más del acento
que UP-3 no había agarrado —el badge del producto, cuatro hovers y tres juegos de estrellas— porque
ninguno tiene la forma `color:ACC` que se había grepeado: son ternarios (`? WHITE : ACC`) y hovers que
pintan el fondo sin tocar el texto. Además el sello de compra verificada tenía un verde fijo sobre un
fondo editable. Y se le dio a Urban Pulse su propia paleta de promos, medida con los mismos dos
criterios que la clásica, que quedó sin tocar (verificado: peor caso 4.99, el mismo de antes).

`tsc` y eslint limpios —el error de `setState` en efecto de `productos/page.tsx` es pre-existente, se
comprobó contra HEAD—, `/plantillas/urban-pulse` y el listado con `?t=urban-pulse` en 200. Nada
pusheado ni deployado.

**28/07/2026 — UP-12.** La ficha de producto. Flavio eligió, entre tres estructuras, la del **panel
de compra fijo**: la derecha lleva solo lo necesario para comprar y queda clavada mientras la
izquierda —foto grande con la tira de miniaturas al costado, descripción, ficha, videos, reseñas y
similares— corre por debajo. El modal pasa de 860 a 1080 y, en celular, a pantalla completa.

La pregunta que vino junto con el pedido —*"qué va a pasar cuando hay más descripción o más
reseñas"*— destapó cinco desbordes que ya existían: las miniaturas sin `overflow-x`, la descripción
sin tope para imágenes ni links largos, un valor de ficha sin espacios que empuja la tabla, el
comentario de reseña sin recorte y el formulario del producto sin `maxLength` (el de la tienda sí los
tenía). El de la descripción se arregló en `globals.css`, así que vale para los diez templates.

De paso: los dos botones de compartir eran invisibles —colores de un template oscuro sobre el blanco
del modal, y el hover pintaba el texto de blanco— y quedaban cinco usos del acento crudo adentro del
modal que el barrido de UP-11 no había tocado.

`tsc` y eslint limpios, `/plantillas/urban-pulse` en 200. **La revisión visual en 360 / 768 / 1280
queda pendiente de Flavio**: en esta sesión no había herramienta de navegador, así que el layout está
verificado por cálculo, no visto. Nada pusheado ni deployado.

**28/07/2026 — el acento, cuarta pasada.** Flavio: *"quedó muy lindo, pero mirá cuando selecciono el
talle se pone oscuro"*. El botón del talle elegido pinta el fondo de `DARK` y escribía el número con
el acento crudo: con un acento oscuro, negro sobre negro — y el talle seleccionado era justo el único
que no se leía.

Se barrieron los **40 usos** de `ACC` del archivo separando los dos casos. El acento como **relleno o
borde decorativo** (la bolita de favoritos, los `borderTop` de sección, el círculo del carrito, que ya
lleva `stroke={accentText}`) no tiene texto encima y está bien. El acento como **texto sobre un fondo
conocido** fallaba en tres lugares más, todos con la misma forma `? ACC : DARK`:

| Línea | Qué es | Fondo | Ahora |
|---|---|---|---|
| 1984 | el talle seleccionado | `DARK` | `accSobreDark` |
| 828 | el género activo en el menú de celular | `DARK` | `accSobreDark` |
| 809 | la categoría activa en el menú de celular | `#f5f5f5` | `accSobreClaro` |

De paso, un ternario muerto: `color: activeGender==="mujer" ? DARK : DARK`.

**Verificado que es solo de Urban Pulse.** Los otros tres templates de moda y la página de listado ya
resolvían bien el mismo botón: Chic Paris con `accentRellenoText`, Boho Terra y Fashion Noir con un
fondo tintado y el texto en el color normal, y el listado con el par `chipBg`/`chipText`.

**28/07/2026 — qué pasa con muchas reseñas.** Pregunta de Flavio. El layout aguanta: el modal está
clavado a 92vh, se dibujan 5 y el comentario se recorta a 5 líneas, así que mide lo mismo con 3 que
con 300. Pero había un techo silencioso.

`GET /api/public/[slug]/reviews?productId=X` tenía un `take: 50` pelado y **sin paginación**. Con 200
reseñas, el comprador llegaba a la 50 y el botón "Ver más" desaparecía sin decir que faltaban 150.

Y peor: el promedio, el total y las barras de la ficha se calculaban **en el navegador sobre las
reseñas que habían llegado**. Con 300 reseñas eso es *el promedio de las últimas 50* publicado como
si fuera el del producto — mientras la portada, que sí usa el agregado de la base, mostraba otro
número para la misma tienda. Es el mismo bug que UP-1: dos cifras distintas de lo mismo en la misma
página, y la equivocada en el lugar más visible.

Arreglado en los dos lados:

- **El endpoint** acepta `skip` y devuelve `stats: { promedio, total, distribucion }`, sacados de un
  `groupBy` por puntaje — una sola consulta da las tres cosas. La página sigue midiendo 50 para no
  cambiarle nada a quien llamaba sin `skip`.
- **El modal** muestra esos números y "Ver más" primero destapa las cargadas y después va a buscar la
  página siguiente. Al publicar una reseña propia, el promedio y el total se recalculan en el momento
  en vez de pedir todo de nuevo.

También se corrigió una carrera que ya existía: abrir un producto y saltar enseguida a otro podía
dejar las reseñas del primero pegadas en la ficha del segundo. Ahora un `ref` guarda a qué producto
pertenece la lista y descarta la respuesta que llega tarde.

**Verificación.** No hay ni una reseña en toda la base (se comprobó con un `groupBy` de solo lectura),
así que no se pudo probar con datos reales sin escribir en producción. Se probó lo que sí se podía:
el endpoint responde bien con `skip` vacío, negativo, no numérico y absurdamente grande —ningún 500—;
y la paginación se simuló con 0, 1, 5, 6, 50, 51, 60, 127, 300 y 1000 reseñas: en las diez llega a
todas, sin fetches de más (con ≤50 no hace ninguno) y sin bucles.

Con 1000 reseñas son 100 clics de "Ver más". Si algún día hace falta, el paso es agrandar el salto a
medida que se avanza, no cambiar la estructura.

**Queda pendiente en los otros:** Chic Paris, Boho Terra, Fashion Noir y la página de listado siguen
promediando sobre la página cargada. No se rompieron —el cambio del endpoint es aditivo y ellos
ignoran `stats`— pero les falta el mismo arreglo.

**28/07/2026 — el mismo arreglo en los otros cuatro.** Flavio: *"tocalos ahora para no olvidarnos"*.
Chic Paris, Boho Terra, Fashion Noir y la página de listado tenían los tres bugs de arriba, porque
tenían el mismo código copiado.

En vez de escribir el arreglo cuatro veces más, la lógica salió a **`src/hooks/useResenasProducto.ts`**
y la usan los cinco. El hook no decide nada de diseño: devuelve `lista`, `mostradas`, `total`,
`promedio`, `distribucion`, `hayMas`, `faltan`, `verMas()` y `agregar()`, y cada template los dibuja
como quiera. También se llevó las reseñas de ejemplo del editor, que estaban en Chic Paris y en el
listado con la misma lógica de "si es preview y no hay ninguna, mostrar tres inventadas".

Se fueron **cinco copias** de: el `useState` de reseñas, el `fetch` al abrir la ficha, el contador de
"cuántas mostrar", el promedio a mano y el alta local al publicar. Las reseñas de ejemplo, además,
se subieron a nivel de módulo: adentro del componente se rearmaban en cada render.

Cada template conserva su propio `useEffect` chico para lo suyo —el formulario, el aviso de gracias,
los bloques plegables de Urban Pulse—, que es estado de la vista y no de los datos.

De paso desapareció el error de eslint `set-state-in-effect` de `productos/page.tsx:816`, que estaba
anotado como pre-existente: era justo ese efecto.

`tsc` limpio y eslint sin errores en los seis archivos —quedan los `<img>` del listado, que son
pre-existentes—. Las cinco páginas afectadas responden 200. Sigue sin poder probarse con reseñas
reales: no hay ninguna en la base.

**28/07/2026 — los `<img>` del listado, y un diagnóstico mío que estaba mal.**

**Los `<img>`.** `productos/page.tsx` dibujaba siete imágenes con `<img>` suelto en vez de
`next/image`, así que el navegador se bajaba el archivo original —el JPG que salió de la cámara— sin
redimensionar ni convertir a WebP. Es la página que muestra el catálogo entero, o sea donde más pesa.
Seis pasaron a `FadeImage`, el mismo envoltorio que usan los diez templates: las tarjetas de la
grilla, la foto del modal, las miniaturas, los similares y los dos renglones de producto del carrito
y del checkout.

La séptima **se queda como `<img>` a propósito**, con su `eslint-disable` y el motivo escrito al
lado: es la vista de zoom, que se abre justamente para ver la foto entera al tamaño original y con
pinch-zoom. Redimensionarla sería lo contrario de lo que pidió quien la abrió.

Dos detalles que aparecieron al hacerlo: dos contenedores necesitaban `aspectRatio` propio, porque
con `fill` el alto lo pone el contenedor y antes lo ponía la imagen; y la tarjeta del catálogo
necesitaba repetir su `transition` en el `style` inline, porque el fundido de `FadeImage` se escribe
ahí y le gana a la hoja de estilos — sin eso, el acercamiento al pasar el mouse pasaba a ser un
salto.

**El `useAuth`: no había nada que arreglar, y lo que yo había anotado estaba mal.** Ver la nota
corregida en *Notas para cuando se arregle*. En resumen: `AuthProvider` **sí** envuelve
`/plantillas/[id]` —`Providers` está en el layout raíz— y los 24 errores del log salieron todos en
los veinte segundos posteriores a un error de sintaxis JSX en `UrbanPulse.tsx`, mientras se
reescribía el modal. Era un síntoma de que el módulo no compilaba, no una falta de proveedor.

`tsc` limpio y **eslint sin un solo aviso** en el listado, por primera vez. La página responde 200
con `?t=urban-pulse` y con `?t=chic-paris`.

**28/07/2026 — la franja de garantías.** Flavio: *"lo que no me gusta es que es igual que la de Chic
Paris"*. Tenía razón, y era literal: **el mismo bloque**. Los dos hacían ícono a la izquierda, título
en negrita, descripción al 60% de opacidad, cuatro en fila. Chic Paris pinta el ícono con el acento y
apila en celular; Urban Pulse engordaba el borde. Nada más.

Lo que había que romper era eso: *ícono + dos renglones chicos, cuatro veces*. Se eligió, entre tres
propuestas, el **damero**: cuatro bloques macizos pegados, sin líneas separadoras —separa el color—,
alternando el fondo de la sección con el acento. El ícono deja de ser una viñeta y pasa a ser una
marca de agua grande y casi transparente detrás del texto, que se sale por el borde derecho. El
título crece de 11 a 15 y el bloque pasa a tener alto propio.

**El fondo sigue siendo editable.** Los bloques pares llevan el color que elige la dueña, así que el
control `bgGarantias` no queda de adorno; los impares llevan el acento.

**Cuándo entra el acento y cuándo no.** Medido con la función real: el neón de fábrica sobre blanco
da **1,16** —dos bloques que se ven iguales, no hay damero— y sobre un fondo oscuro, **16,52**. Con
menos de 1,6 el bloque alterno se va al extremo opuesto al fondo: blanco si el fondo es oscuro,
negro si es claro. No es siempre negro a propósito: una tienda con la franja en negro y un acento
casi negro se habría quedado con los ocho bloques del mismo color.

| Fondo | Acento | Contraste | Bloque alterno |
|---|---|---|---|
| blanco | neón `#d4ff00` | 1,16 | negro |
| blanco | terracota `#b5652a` | 4,32 | **acento** |
| blanco | azul `#1d4ed8` | 6,70 | **acento** |
| blanco | amarillo pastel | 1,25 | negro |
| negro | neón `#d4ff00` | 16,52 | **acento** |
| negro | casi negro `#111` | 1,02 | blanco |

**En celular alterna distinto.** Son 2 columnas, y con la cuenta de escritorio (`i % 2`) quedarían
dos franjas verticales —la primera columna toda oscura, la segunda toda clara— en vez de un damero.
Ahí alterna por fila + columna.

De paso, dos cosas del bloque viejo: el color del texto salía de `getContrastColor(garantiasUpBg)`,
que con un degradado no puede leer la luminosidad y devuelve "dark" por descarte —texto oscuro sobre
un degradado oscuro, la regla de UP-9—; ahora mide contra `colorRepresentativo`. Y la opacidad de la
marca de agua va en un span interno: si fuera en el contenedor, el botón de cambiar ícono del editor
quedaría translúcido también.

`tsc` y eslint limpios. `/plantillas/urban-pulse` y `/tienda/tiendaapps` en 200. **La revisión visual
en 360 / 768 / 1280 queda de Flavio**: acá no hay navegador.

**28/07/2026 — el damero, corregido.** Flavio con una captura del editor: *"creo que hay un bug,
queda medio mal, además se tiene que adaptar a todo tipo de pantallas"*.

**El bug.** El primer bloque parecía el doble de ancho que los otros tres. No lo era: el contenedor
tenía `maxWidth:1200` centrado, así que a los costados quedaba el fondo de la SECCIÓN —del mismo
color que los bloques pares— y el primero se fundía con el margen izquierdo. Un damero solo se lee si
los cuadros miden todos lo mismo, y para eso tiene que llegar al filo. Ahora va a sangre, igual que
el hero.

**Lo de las pantallas.** Yendo a sangre, el ancho de cada bloque pasa a depender de la pantalla: 480px
en un monitor de 1920 y 190px en una notebook de 768. Con medidas fijas, el ícono le comía media celda
a la más chica y se perdía en la más grande. Todo lo que ocupa lugar se mide ahora en `clamp` —crece
con la pantalla pero con piso y techo— y el texto lleva un `paddingRight` en porcentaje para no
meterse debajo de la marca de agua.

Cuentas a los cuatro anchos que importan, con el bloque más largo ("30 días de cambio"):

| Ancho | Bloque | Ícono | Texto termina en | Ícono empieza en |
|---|---|---|---|---|
| 1920 | 480 | 104 | 344 | 385 |
| 1280 | 320 | 83 | 227 | 243 |
| 768 | 192 | 52 | 134 | 144 |
| 360 (2 col) | 180 | 54 | 119 | 130 |

En ninguno se pisan. En 768 y 360 el título se parte en dos renglones, que entran en el alto mínimo.

Dos correcciones más: el ícono ya no recibe un número de píxeles —un SVG con `width` fijo no escala—
sino que el contenedor pone la medida con `aspectRatio` y el SVG la llena al 100%; y se le baja el
`strokeWidth` de 1,8 a 1,2, porque estirado a 104px ese trazo terminaba en casi 8px, un garabato
grueso en vez de una marca de agua. En el editor la opacidad baja de 0,30 a 0,22: al 30% el ícono
parecía contenido y no fondo.

Dos cosas más que reportó Flavio mirando el editor:

**Los íconos no tenían respiro.** Estaban en `right:-2%`, saliéndose por el filo, y con un tamaño que
casi igualaba el alto del bloque: apretados contra la esquina y, en el último, cortados contra el
borde de la pantalla. Ahora tienen margen propio a la derecha y miden bastante menos que el alto, así
que les queda aire arriba y abajo también — a 1920, 84 de ícono en 132 de alto.

**La franja se fundía con lo de arriba.** El filo era `3px solid DARK` en la sección: un filo negro
debajo de un hero oscuro no tiene dónde empezar, y el bloque negro se pegaba a la imagen como si
fueran lo mismo. Y ningún color único lo arregla, porque los bloques alternan claro y oscuro: lo que
se despega de uno se pierde en el otro.

Ahora **el filo lo elige cada bloque contra su propio fondo**: el acento si ahí se distingue, y si no
el color de su texto, que por definición contrasta. Con el neón de fábrica queda negro sobre los
claros y **neón sobre los oscuros** — y es justo el neón el que despega el bloque negro del hero.

Se usa `getReadableAccentFill` y no `getReadableAccentText`: el filo es una superficie de 4px, no una
letra. La pregunta no es *"¿se lee el acento acá?"* sino *"¿se distingue del fondo?"*, y con la regla
de texto un naranja o un dorado sobre blanco se descartan sin motivo aunque pintados se vean
perfecto. El repo tiene un helper para cada pregunta y el comentario de `getReadableAccentFill` avisa
exactamente de esta confusión.

**El filo doble.** Flavio, con la barra ya funcionando: *"el diseño sí, pero la diferencia entre la
imagen y la barra no me termina de cerrar"*. Y tenía razón otra vez, con un problema más fino que el
anterior.

El filo por bloque contrastaba con **su propio bloque**, pero no con lo que la franja tiene **encima**.
Recorriendo el borde de arriba de izquierda a derecha: la línea negra del bloque blanco se borraba
contra el hero negro; la blanca del bloque de al lado sí se veía; la siguiente negra volvía a verse
contra la foto clara del musgo. No era un borde, eran pedazos de borde. Y ningún color único lo
arregla: arriba puede haber cualquier imagen y no se sabe de qué color es.

Ahora van **dos líneas pegadas, una blanca y una negra de 3px cada una**, a lo ancho de toda la
franja, arriba y abajo. Contra algo oscuro trabaja la blanca; contra algo claro, la negra; sobre una
foto que tiene de las dos, siempre hay una recortándose. El borde pasa a ser uno solo y parejo de
punta a punta. La blanca va del lado de afuera y la negra pegada a los bloques. Es además el recurso
de las cintas de peligro y de las tipografías de carrera: dos filos opuestos, sin degradado.

Los filos por bloque se sacaron: con este, sobraban.

**El botón de cambiar ícono estaba tapado.** Flavio: *"hay un pequeño bug o dificultad a la hora de
cambiar el ícono"*. Eran las dos cosas.

**El bug.** `SectionBlock` planta sus controles con `zIndex:200` — "👁 Ocultar bloque" en
`bottom:10 right:10` y las flechas de orden en `bottom:10 left:50%`. La franja mide poco más de 100px
de alto, así que esos botones caen justo encima del ícono del **cuarto** bloque y del **segundo**. El
botón de cambiar ícono no tenía `zIndex`, así que ahí estaba tapado: no era que costara, es que no se
podía.

**La dificultad.** Aunque no estuviera tapado, el botón vivía encima de la marca de agua con
`opacity:0` y solo aparecía si le pegabas justo con el mouse. Nada avisaba que existía, y menos ahora
que el ícono es una marca de agua al 22%.

Ahora es una fichita fija arriba a la derecha de cada bloque —esquina que el editor no usa, porque la
de arriba a la izquierda se la queda el chip de "Fondo"—, con `zIndex` por encima de los controles de
sección y con la cuenta en el globo de ayuda (*"Cambiar ícono (2 de 5)"*), así se sabe cuántos hay y
en cuál se está. La marca de agua pasa a `pointerEvents:"none"` siempre, así no le roba un clic al
texto de al lado.

**Ojo, lo mismo pasa en Chic Paris.** Su franja también vive en un `SectionBlock` y también es baja:
las flechas de orden le pisan la esquina inferior del ícono del tercer beneficio. Es más leve —sus
íconos son viñetas visibles y se aciertan fácil— y no se tocó, para no cambiarle el editor a otro
template sin que lo pidan. Queda anotado.

**Los controles de sección, al filo.** Flavio, mirando el editor: *"las flechas que hacen subir o
bajar el bloque tapan el editor, o sea el texto"*. No era de un template: `SectionBlock` les pone los
controles a **todas** las secciones de los diez, con las flechas centradas abajo y el ojo abajo a la
derecha, flotando a 10px del borde. En una sección alta no molesta; en una franja de 80px con el
contenido repartido a lo ancho, caen encima del texto.

Se propusieron dos salidas —que aparecieran al pasar el mouse, o sacarlos afuera en una barrita— y
Flavio descartó las dos con un argumento mejor: *"si hacemos lo que decís no van a saber"*. Y propuso
la que se implementó: **achicarlas y pegarlas al filo del bloque**.

Primer intento, corregido en el acto por él: se movieron las flechas a la esquina de abajo a la
izquierda **y** se tocó el botón de ocultar. Las dos cosas estaban mal. *"El de ocultar bloque no lo
tenías que tocar, estaba bien ese"* — quedó **idéntico al original**, verificado con el diff contra la
versión anterior. Y *"tienen que ir en el centro, no en la izquierda las flechas"*.

Cómo quedó: **una sola pastilla con las dos flechas adentro**, centrada abajo y apoyada en el filo.
Eran dos botones cuadrados de 26×26 separados, flotando a 10px del borde; juntas ocupan casi la mitad
de alto (20 contra 26) y, apoyadas en el filo, se corren del medio de la franja, que es donde vive el
contenido. El filo entre dos secciones es además donde estos botones significan algo: mueven el
bloque respecto del de al lado.

Las dos flechas van siempre, aunque una esté deshabilitada: si desapareciera la que no se puede usar,
la pastilla cambiaría de ancho al mover un bloque y la otra flecha se correría de abajo del mouse.

Le llega a los diez templates de una.

### UP-13 — El bloque destacado mostraba el octavo producto de la lista, con una ficha inventada ✅

Flavio, mirando el bloque: *"tenemos que hacer que ese bloque sea editable, no solamente el fondo;
que podamos elegir qué producto mostrar, y con la opción de que sea aleatorio cada 6, 12 o 24 horas"*.

**Lo que había.** Cuatro cosas, y ninguna era de diseño:

1. **El producto era `products[7] ?? products[0]`** — el octavo de la lista. La dueña no podía
   elegirlo, y cambiaba solo, sin avisar, cada vez que agregaba o borraba un producto y ese lugar
   pasaba a ser otro.
2. **La ficha técnica estaba escrita a mano en el código**: `[["Material","87% Nylon · 13% Elastane"],
   ["Tecnología","4-Way Stretch"],["Uso","Gym · Running · Training"]]`. Ni salía del producto ni era
   editable. Un **vestido midi** se anunciaba como ropa de compresión para gimnasio, y una tienda de
   muebles habría mostrado exactamente lo mismo.
3. **La descripción tampoco era la del producto**: un texto fijo sobre tecnología de compresión.
4. **El botón decía "Agregar al Carrito" y no agregaba nada**: abre la ficha.

**Dónde se guarda la elección.** En `textOverrides`, igual que el índice de ícono de las garantías, y
se configura **desde el bloque mismo** — no hay pantalla nueva en el dashboard. Dos claves:
`featuredProductId` y `featuredRotacion` (horas: 0, 6, 12 o 24).

Se evaluó atarlo a la marca **"destacado"** que ya tiene la ficha de cada producto y que usan Casa
Clara, Electro Prime y Home Studio. **Se descartó**: esa marca es global y cada template la usa a su
manera —allá arma una grilla entera—, así que tocar una cosa habría movido la otra. Flavio lo pidió
explícitamente: *"este es para este template, tiene que ser personal para este template"*.

**La rotación.** Cada 6, 12 o 24 horas, a elección, y apagada por defecto.

- No hay temporizador. Nadie deja la página abierta seis horas, así que la ventana se calcula una vez
  y listo. Y no debe cambiar mientras alguien mira: el bloque tiene precio y botón de comprar.
- **No rompe la hidratación**, que era la duda inicial: `products` llega por `fetch` en el cliente
  (`useStorefront`), así que en el servidor este bloque directamente no existe.
- El reloj se lee con el **inicializador perezoso de `useState`**, no suelto en el render ni en un
  efecto. El linter de React rechaza las dos: leerlo suelto es impuro y en un efecto encadena un
  render de más. Las dos veces tenía razón.
- Va **en ciclo y no sorteando**: sorteando cada ventana, el mismo producto puede salir tres veces
  seguidas y otro no salir nunca. Así todos tienen su turno y ninguno se repite pegado.

**La ficha y la descripción, ahora del producto.** Los atributos que la dueña ya carga —los mismos que
muestra la vista rápida— y su descripción. Si el producto no tiene atributos, la tabla **no aparece**:
mejor un bloque más corto que tres datos inventados. El texto editable que había sigue existiendo,
pero pasa a ser el respaldo para cuando el producto no trae descripción, así nadie pierde lo que ya
escribió. Sin esto, la rotación habría empeorado el problema: mañana rota a otra prenda y sigue
diciendo "4-Way Stretch".

De la descripción se muestra **solo lo básico: el texto sin etiquetas, recortado a tres renglones**.
La escribe la dueña en un editor de texto rico y puede traer listas, una imagen pegada o veinte
renglones; ahí adentro eso estira la columna y descuadra el bloque. Con la rotación sería peor: cada
producto la tiene de un largo distinto y el bloque cambiaría de alto solo, cada seis horas. No lleva
"ver más" — el botón de abajo ya va a la ficha, y dos salidas al mismo lugar le comen fuerza a la
principal.

**El botón.** No es que faltara implementar el agregar: `addToCart` lee el producto, el talle y el
color del estado del modal, así que fuera de él no tiene qué agregar. Y tampoco debería —en un
template de moda todo tiene talle, y meter "el que venga" es un cambio, un reclamo o una venta
perdida—. Dice lo que hace, pero sin apagarse: *"Ver producto"* es flojo para el botón más grande de
la página. Se arma con lo que el producto realmente pide elegir: **"Elegir talle y comprar"**,
**"Elegir color y comprar"** o **"Comprar"**.

El panel de edición lleva buscador: una tienda con doscientos productos no se resuelve scrolleando una
lista de 340px.

`tsc` y eslint limpios, `/plantillas/urban-pulse` y `/tienda/tiendaapps` en 200. **La revisión visual
queda de Flavio**, acá no hay navegador.

### UP-14 — El precio se pintaba de ocho maneras, con dos rojos distintos ✅

Flavio: *"noto que el acento está desentendido con todo el template, como que siento que hay un bug, y
en algunos lados el precio está en rojo, ¿por qué? No sé si me gusta mucho eso"*. Las dos cosas eran
el mismo bug.

| Bloque | Precio normal | Precio rebajado |
|---|---|---|
| Grilla del catálogo | negro | rojo `#e63329` |
| Vista rápida | negro | rojo `#e63329` |
| Destacado | **acento** | rojo `#dc2626` |
| Ofertas | **acento** | rojo `#dc2626` |
| Lo más visto | **acento** | rojo `#dc2626` |
| Buscador | **acento** | rojo `#dc2626` |
| Favoritos | negro | rojo `#dc2626` |
| Similares | negro | rojo `#dc2626` |

**Por qué el acento se sentía suelto.** Aparecía en el precio de **4 lugares de 8** y en los otros 4
el precio era negro, sin ninguna regla: dependía de si ese bloque usaba `PromoPrice` o tenía el precio
escrito a mano. No era una impresión.

**Los dos rojos.** `#e63329` estaba escrito en el template y `#dc2626` adentro de `PromoPrice`. Nadie
los eligió juntos: son dos caminos distintos que nadie cruzó. Y los dos son fijos — ignoran el fondo
de la sección, que es editable. Medidos daban entre 3,97 y 4,83: nunca ilegibles, porque son números
grandes y en negrita, pero nunca bien tampoco.

**La regla nueva, una sola para los ocho:** el precio normal usa el color de texto de su sección, y el
rebajado usa el **acento**. El acento pasa a significar una sola cosa en toda la tienda.

`PromoPrice` recibe una prop `rebajado` que por defecto sigue siendo el rojo de siempre, así que **los
otros nueve templates no cambian en nada**.

**Los dos agujeros que aparecieron al verificarlo**, los dos encontrados midiendo y no mirando:

1. **El acento no siempre puede ser el precio.** Si es casi blanco o casi negro coincide con el color
   del texto de la sección y el descuento deja de notarse. Para esos casos queda el rojo — pero
   aclarado u oscurecido hasta despegarse de ESE fondo, no el fijo de antes.
2. **El contraste de WCAG no sirve para preguntar "¿se ven distintos?".** Mide solo luminosidad: dice
   que el neón `#d4ff00` y el blanco son casi el mismo color (1,16) cuando a la vista no se parecen en
   nada. Con ese criterio el acento no habría entrado nunca. Se compara la distancia en RGB, que sí
   toma el tono: 60 sobre un máximo de 441.

Verificado con cinco acentos sobre las dos superficies reales. En las diez combinaciones el precio
rebajado se lee sobre su fondo **y** se distingue del normal:

| Acento | Tarjeta (blanca) | Ofertas (negro) |
|---|---|---|
| neón `#d4ff00` | rojo — el neón sobre blanco da 1,16 | **acento** (16,52) |
| blanco | rojo | rojo — el acento sería el mismo color que el precio normal |
| casi negro | rojo | rojo |
| terracota `#b5652a` | **acento** (4,32) | **acento** (4,44) |
| azul `#1d4ed8` | **acento** (6,70) | rojo — el azul sobre negro da 2,86 |

O sea: **con un acento blanco el precio nunca puede llevarlo**, porque es el color del texto. Para
verlo en los precios hace falta un acento con color; con el neón de fábrica aparece en las secciones
oscuras.

De paso, el `% OFF` de la vista rápida era verde sobre verde claro —un tercer color en el mismo
renglón, sin relación con nada— y pasa a usar el mismo color del precio rebajado. El rojo queda en un
solo lugar de todo el template: el fondo del sello "Sale", que es una etiqueta y no un precio.

`tsc` y eslint limpios. `/plantillas/urban-pulse`, `/plantillas/chic-paris` y `/tienda/tiendaapps` en
200, verificados en un servidor propio que quedó apagado.

---

### UP-15 — En celular el footer apilaba las tres columnas de links ✅

Flavio, mirando su tienda en 360: *"todo se pone en una fila y no me gusta, me gustaría que sea dos
filas como hicimos con Chic Paris"*.

**Lo que había.** El footer tiene cuatro bloques: la marca y tres listas de links (Tienda, Ayuda,
Empresa — cinco, cinco y cuatro links). En escritorio van en `2fr 1fr 1fr 1fr`; en celular la grilla
pasaba a `1fr` y los cuatro quedaban uno abajo del otro.

Medido a 360px, con 20px de padding a cada lado (320px útiles):

| Bloque | Alto |
|---|---|
| Marca (título 24px + descripción de dos renglones + redes) | ~136px |
| Tienda — título + 5 links | ~155px |
| Ayuda — título + 5 links | ~155px |
| Empresa — título + 4 links | ~130px |
| 3 separaciones de 28px | 84px |
| **Total** | **~660px** |

Casi dos pantallas de scroll de puro footer, y las tres listas leídas en fila daban la sensación de
una sola lista larga de catorce links, porque lo único que las separaba era un título de 10px.

**Lo que quedó.** Las tres listas van de a dos. La marca sí ocupa el ancho entero: su título es de
24px y en media columna (~148px) se partiría en dos o tres renglones. La grilla queda:

```
┌─────────────────────────────┐
│ MARCA                       │   ancho entero
├──────────────┬──────────────┤
│ TIENDA       │ AYUDA        │
├──────────────┼──────────────┤
│ EMPRESA      │              │
└──────────────┴──────────────┘
```

De 660px a ~477px: 183px menos, casi media pantalla. La celda vacía de abajo a la derecha es a
propósito — es lo que hace cualquier footer de tres listas en celular, y la alternativa (estirar
"Empresa" a lo ancho y poner sus links en dos sub-columnas) la deja con una forma distinta a las
otras dos sin ganar casi nada de alto.

**Que entren los links.** A 360, con 24px de separación entre columnas, cada una da 148px. El link
más largo es "Sustentabilidad": 15 caracteres a 13px, ~93px. A 320px —la pantalla más chica que se
usa— las columnas dan 128px y sigue entrando. Ninguno se parte.

**El agujero de al lado, el mismo de Chic Paris.** En la captura, entre la descripción y "TIENDA" hay
un salto de aire que no es de ningún elemento. El `<div>` de las redes sociales se dibujaba siempre,
aunque las cuatro estuvieran vacías: el `.map()` devolvía cuatro `null` pero el contenedor seguía ahí
con su `marginTop: 18`. Es exactamente el bug que ya se había tapado en el footer de Chic Paris —
Urban Pulse tenía la misma copia y nadie la había mirado. Ahora el contenedor sólo aparece si hay al
menos una red cargada (o si es la vista previa del editor, donde se muestran las cuatro apagadas para
que la dueña sepa que existen).

Ojo con esto: **no es un bug de este footer, es un patrón copiado.** Se revisaron los diez templates
y quedan **dos** sin el `.some()`: **Fashion Noir** (`marginTop: 24`, el mismo agujero exacto) y
**Boho Terra** (sin `marginTop`, así que ahí sólo cuesta una separación de la grilla). Casa Clara,
Electro Prime, Home Studio, Chic Paris y la ficha de producto compartida ya lo tienen. Anotado en
[Notas para cuando se arregle](#notas-para-cuando-se-arregle); no se tocaron porque esos dos
templates todavía no entraron a revisión.

`tsc` y eslint limpios. `/tienda/tiendaapps` y `/plantillas/urban-pulse` en 200 — verificados contra
el servidor que ya tenía Flavio levantado, sin levantar ninguno propio.
