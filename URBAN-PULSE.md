# Urban Pulse — revisión del template

Revisión completa de `src/components/store/templates/UrbanPulse.tsx` (1.813 líneas), hecha el
27/07/2026 leyendo el archivo entero y verificando cada punto contra el código que lo rodea
(`useCartLogic`, `PromoDisplay`, `promoDisplay.ts`, `EditContext` y lo ya arreglado en Chic Paris).

Los números de línea son los del día de la revisión: se corren a medida que se arregla.

| # | Qué pasa | Gravedad | Estado |
|---|---|---|---|
| UP-1 | El producto destacado muestra un precio que no es el que se cobra | Alta | pendiente |
| UP-2 | El bloque Ofertas ignora las promociones | Alta | pendiente |
| UP-3 | El acento no se adapta: se pierde el texto o se pierde él | Alta | pendiente |
| UP-4 | El selector de color se traba y deja de sincronizar | Media | pendiente |
| UP-5 | Cinco de siete lugares no dicen que el producto tiene promo | Media | pendiente |
| UP-6 | El panel de favoritos se sale de la pantalla en 360px | Baja | pendiente |
| UP-7 | Un `0` suelto arriba de la foto en Ofertas | Baja | pendiente |
| UP-8 | El buscador usa dos columnas fijas también en celular | Baja | pendiente |

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

### UP-1 — El producto destacado muestra un precio que no es el que se cobra

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

**Cómo se arregla:** reemplazar el precio a mano por `<PromoPrice>` y agregar el aviso de promo.
Ojo con el fondo: este bloque es `featuredBg`, editable, así que el `accent` tiene que ser el
legible (ver UP-3) y hay que pasarle `sobre={featuredText}`.

---

### UP-2 — El bloque Ofertas ignora las promociones

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

**Cómo se arregla:** copiar ese filtro. Y mantener la regla de Chic Paris: las promos que **no**
tocan el precio (3×2, envío gratis) NO entran, porque al lado se mostraría el precio de lista sin
nada tachado y parece un error de la página.

---

### UP-3 — El acento no se adapta: se pierde el texto o se pierde él

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

**Cómo se arregla:** el mismo camino que Chic Paris y la página de productos.

- Para el relleno: una constante `accentText = textoSobre(ACC)` y usarla en los 13 lugares en vez
  de `DARK`. `textoSobre` elige por contraste real de WCAG, no por umbral de luminosidad.
- Para el texto: `accentSobre(bg, texto) = getReadableAccentText(ACC, bg, texto)`, que cae al color
  de texto del tema cuando el acento no se distingue del fondo.
- Para el tachado: pasar `sobre={<el color de texto de esa sección>}` en las cinco llamadas.

---

### UP-4 — El selector de color se traba y deja de sincronizar

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

**Cómo se arregla:** levantar la bandera solo cuando la imagen de verdad va a cambiar.

```tsx
if (imgIdx !== -1 && imgIdx !== modalImg) { colorSyncingRef.current = true; setModalImg(imgIdx); }
```

Está igual en BohoTerra y FashionNoir: conviene arreglar los tres de una.

---

### UP-5 — Cinco de siete lugares no dicen que el producto tiene promo

| Dónde | Línea | ¿Avisa? |
|---|---|---|
| Grilla del catálogo | 897 | ✅ `PromoTag` / `OfferBadge` |
| Modal de producto | 1452 | ✅ |
| Ofertas | 1022 | ❌ |
| Lo más visto | 1078 | ❌ |
| Buscador | 1390 | ❌ |
| Favoritos | 1418 | ❌ |
| Productos similares | 1761 | ❌ |

Con un descuento en porcentaje el precio en rojo todavía lo delata. Pero una promo **3×2** o de
**envío gratis** no toca el precio: en esos cinco lugares el producto se ve idéntico a uno sin
ninguna promo.

Chic Paris resolvió esto con un helper `avisoPromo(p, modo)` —un solo lugar que decide entre tag
sobre la foto y chip aparte— y lo llama desde las siete secciones. Acá nunca llegó.

**Cómo se arregla:** portar `avisoPromo` (está en `ChicParis.tsx`, cerca de la línea 463) y llamarlo
en las cinco secciones que faltan. En las miniaturas chicas (buscador 56px, favoritos 68px) va en
modo `"chip"`, que es para lo que se creó ese modo.

---

### UP-6 — El panel de favoritos se sale de la pantalla en 360px

`src/components/store/templates/UrbanPulse.tsx:1409`

```tsx
<div style={{ position:"absolute", right:0, top:0, bottom:0, width:400, ... }}>
```

Ancho fijo sin `maxWidth`. En un teléfono de 360px sobresale 40px por el borde izquierdo.

**Cómo se arregla:** `width:400, maxWidth:"100vw"`. Verificar en los tres anchos de siempre —
360 / 768 / 1280.

---

### UP-7 — Un `0` suelto arriba de la foto en Ofertas

`src/components/store/templates/UrbanPulse.tsx:1024`

```tsx
{pct && <span style={{ ... }}>-{pct}%</span>}
```

Con `pct === 0` el `&&` no devuelve `false`, devuelve el número, y React dibuja un **"0" suelto**
arriba de la foto, sin badge ni nada. Se llega con una oferta de menos del 0,5%: un precio anterior
de $10.040 contra $10.000 redondea a 0%.

**Cómo se arregla:** `{!!pct && ...}`. Es el mismo arreglo que se hizo en Chic Paris el 27/07.

---

### UP-8 — El buscador usa dos columnas fijas también en celular

`src/components/store/templates/UrbanPulse.tsx:1387`

```tsx
<div style={{ marginTop:40, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
```

Dos columnas siempre, con `padding:"80px 40px 40px"` en el contenedor. En 360px quedan 140px por
tarjeta para una foto de 56px más el nombre y el precio.

**Cómo se arregla:** una columna en celular (`isMobile ? "1fr" : "1fr 1fr"`) y bajar el padding
lateral, como hacen el resto de las secciones (`isMobile ? 16 : 40`).

---

## Notas para cuando se arregle

- **El orden que conviene:** UP-1 y UP-2 son de plata y se ven hoy con las promos de prueba
  activas. UP-4 es funcional y se dispara siempre. UP-3 es el más grande en cantidad de líneas
  pero es mecánico una vez definidas las dos constantes.
- **UP-3 y UP-5 se tocan:** los dos pasan por las mismas cinco secciones. Conviene hacerlos en la
  misma pasada para no leer el archivo dos veces.
- **UP-4 está igual en BohoTerra y FashionNoir.** Antes de arreglar el modal de otro template de
  moda, evaluar extraerlo a `shared/`: los cuatro lo tienen copiado y pegado.
- Todo cambio visual se revisa en **360 / 768 / 1280**. 768 es donde más se rompe.
