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

**Los nueve puntos están cerrados.** UP-9 no salió de la auditoría: lo reportó Flavio con una
captura de su propia tienda. Lo que queda anotado no es de este template: está en
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

**Arreglado el 27/07.** Se agregó `productosBgSolido = colorRepresentativo(productosBgUp)` y se usa
en el `color:` y en el `onMouseLeave`. `colorRepresentativo` ya existía en `section-bg.ts` y devuelve
el punto medio del degradado — que es exactamente contra el que se eligió `productosTextUp`, así que
el contraste queda garantizado por la misma construcción de antes.

#### Estaba igual en Boho Terra

Al buscar el patrón apareció en `BohoTerra.tsx:762` y `:942`, en los botones "Ver Colección" y "Ver
colección completa". Ahí el estado normal está bien —fondo transparente— y la inversión ocurre **al
pasar el mouse**, así que la etiqueta desaparecía en el hover. Mismo arreglo, con `heroLeftBgSolido`
y `coleccionBgSolido`. Los dos fondos que toca (`bgHeroLeft`, `bgColeccion`) están efectivamente
usados por tiendas reales.

⚠️ **Queda un caso menor sin tocar, a la espera de decisión.** Seis templates (TechNova, CasaClara,
AutoMotor, AutoDrive, HomeStudio, ElectroPrime) hacen `border: 2px solid ${navBg}` en el anillo del
puntito de notificaciones. Con un `navBg` en degradado el borde se descarta igual, pero ahí se pierde
un anillo decorativo de 2px, no un texto: el puntito rojo se sigue viendo. Es el mismo arreglo de una
palabra en cada uno.

---

## Notas para cuando se arregle

- **Cerrados los nueve puntos**, del UP-1 al UP-9.
- **El degradado como `color:` (UP-9) es una clase de bug, no un caso.** La regla: el valor de
  `sectionColors` sirve para `background:` y para nada más. Cualquier otro lugar que lo reciba
  —`color`, `border`, `fill`, `stroke`— necesita pasar antes por `colorRepresentativo`. Quedan sin
  tocar los seis `border: 2px solid ${navBg}` descritos en UP-9.
- **UP-4 está igual en BohoTerra y FashionNoir.** Antes de arreglar el modal de otro template de
  moda, evaluar extraerlo a `shared/`: los cuatro lo tienen copiado y pegado.
- **El `accentText` invertido (UP-3D) puede estar en más templates.** Se detectó de casualidad acá.
  Vale revisar CasaClara, ElectroPrime, HomeStudio y TechNova, que declaran esa constante con la
  misma forma sospechosa (`getContrastColor(accent) === "light" ? "#111" : "#fff"`).
- Todo cambio visual se revisa en **360 / 768 / 1280**. 768 es donde más se rompe.

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
Boho Terra y se arregló igual. `tsc` limpio, eslint sin errores nuevos, `/preview/urban-pulse` y
`/preview/boho-terra` en 200, log sin errores. Nada pusheado ni deployado.
