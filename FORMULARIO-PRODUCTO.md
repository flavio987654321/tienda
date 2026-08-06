# Revisión del formulario de producto — variantes

Revisión pedida antes de arrancar los templates nuevos. Cubre arquitectura,
jerarquía, y cada input y botón de la sección de variantes.

**Archivos:** `src/app/dashboard/productos/nuevo/page.tsx` (3035 líneas),
`src/components/dashboard/VariantBuilder.tsx`, `src/lib/opcionSugerida.ts`.

---

## 0. El resumen

El refactor de opciones arregló **cómo se guardan y cómo se venden** las
variantes. No tocó **cómo se cargan**. Y ahí la arquitectura quedó partida en
dos: hay *dos formularios distintos* para la misma cosa, con capacidades
distintas, y pasar de uno al otro **borra datos sin avisar**.

Shopify, Tienda Nube y WooCommerce tienen los tres **un solo modelo**. Nosotros
tenemos dos, y ninguno de los dos es el de ellos.

---

## 1. Lo que está roto (verificado)

### 1.0 — Al EDITAR, el constructor arranca vacío 🔴🔴 (el peor)

`page.tsx:658`

```js
if (["ROPA", "HOGAR_TECH"].includes(store.tipoTienda || "")) {
  // ...acá se llenan builderColors, builderSizes y variantStockRef
}
```

Ese `if` está **adentro del `.then()` del fetch del producto**, cuyo efecto
depende de `[editingId, productCategories]` (línea 711). El `store` que lee es el
**capturado por el closure**, no el de ahora. Y `store` arranca sin `tipoTienda`
(línea 414-425: la propiedad ni existe en el estado inicial).

La carrera:

1. Monta. El efecto corre con `productCategories = []` → **fetch A**, con un
   `store` sin `tipoTienda`.
2. `/api/configuracion` responde → `setProductCategories(...)` → el efecto vuelve
   a correr → resetea `loadedRef = false` → **fetch B**, ahora sí con `tipoTienda`.
3. Fetch **A** llega primero (salió antes) → carga todo → el `if` da **falso**
   (`["ROPA","HOGAR_TECH"].includes("")`) → **el bloque se saltea** → `.finally`
   pone `loadedRef = true`.
4. Fetch B llega → línea 583 `if (loadedRef.current) return` → **se descarta**.

Resultado: `builderColors`, `builderSizes` y `variantStockRef` quedan **vacíos**
cada vez que editás un producto.

**Se ve en la captura de Flavio (2026-08-05):** "Remera basica" abierta para
editar. Abajo, `VARIANTES CREADAS (4)` con Negro·L, Negro·M, Verde·L, Verde·M y
sus fotos. Arriba, **ningún color marcado** y **ningún talle marcado** — los 16
botones de color y los 8 de talle están todos en gris.

Y lo que sigue es lo grave: **tocar cualquier color o talle dispara**
`buildVariantsFromBuilder(colors, sizes)` con los arrays vacíos, que **rehace las
combinaciones desde cero**. Se pierden las 4 variantes, y como `variantStockRef`
también quedó vacío, **el stock vuelve a 0**.

O sea: entrás a editar una remera, tocás "Azul" para sumar un color, y te
quedaste sin Negro, sin Verde y sin stock.

> **No es del refactor.** `git log -L 656,660` muestra que la línea del `if` ya
> estaba antes de `50874cc`; ese commit sólo borró el `getBuilderConfig` de
> adentro. El bug es anterior.

### 1.1 — Cambiar de modo borra las variantes 🔴

`page.tsx:2296`

```js
if (turningOn) setVariants(buildVariantsFromBuilder(builderColors, builderSizes));
```

Al volver al **Modo constructor**, las filas se rearman desde `builderColors` y
`builderSizes` — que el modo manual **nunca actualiza**. Todo lo que se cargó a
mano desaparece.

Corrí la función tal cual está, con dos escenarios:

| Escenario | Resultado |
|---|---|
| Producto nuevo en ROPA → "Modo manual" → cargar 3 filas → "Modo constructor" | `[]` — **las tres filas se borran** |
| Producto editado (Negro S/M) → manual → agregar fila Negro/L → constructor | La fila **L desaparece**; vuelven sólo S y M |

No hay confirmación, no hay deshacer, y el botón que lo dispara es un link gris
subrayado de 12px al lado de "Agregar".

En un producto nuevo de ROPA el modo arranca en **constructor** (`page.tsx:526`),
así que el camino "voy a manual porque me resulta más claro, cargo todo, vuelvo
a mirar el constructor" es el camino natural — y pierde todo.

### 1.2 — El SKU existe en los datos pero no hay dónde escribirlo 🟠

`sku` está en el tipo `Variant`, se carga del producto (`page.tsx:636`), se
manda al guardar (`page.tsx:342`), lo valida el servidor y lo guarda Prisma.

**No hay un solo input de SKU en toda la pantalla.** Ni en manual ni en el
constructor. El dato viaja de ida y vuelta y nadie lo puede tocar.

> **Corrección (2026-08-05).** Acá decía que era código muerto y que había que
> borrarlo. Era falso. El SKU **se manda a Google** en los datos estructurados
> de cada ficha (`structured-data.ts:141`), y el comentario de ahí explica para
> qué: *"le sirve a Google para juntar la misma prenda vendida en distintos
> lados"*. No era código muerto sino una función a medio conectar — la salida
> existía, la entrada no. **Resuelto**: se le dio la columna, de `lg` para
> arriba, en el constructor y en el manual.

### 1.3 — La tabla del constructor se desborda en celular 🟠

`VariantBuilder.tsx:306`

```js
style={{ gridTemplateColumns: "32px 56px 1fr 72px 88px 72px" }}
```

Las columnas fijas suman **320px**, más 5 huecos de `gap-3` (60px), más `px-3`
(24px) = **404px mínimo**, antes de la columna del nombre. En un celular de
360px el ancho útil adentro de la tarjeta es ~280px.

El encabezado sí es responsive (`hidden sm:grid`, línea 287) — **las filas no**.
O sea que en celular se esconden los títulos pero la tabla sigue siendo igual de
ancha, sin títulos y desbordada.

> Calculado del CSS, no medido: el panel está detrás del login y no lo puedo
> recorrer con un script. Conviene verificarlo a 360 antes de tocarlo.

### 1.4 — Una fila vacía frena el guardado sin decir cuál 🟠

Si tocás "Agregar" y no completás la fila, `prepareVariantsForSubmit`
(`page.tsx:346`) la conserva —porque `stock: "0"` es un string y da verdadero— y
el servidor la rechaza (`lib/products.ts:395`):

> "Cada variante debe tener nombre y valor"

Un cartel rojo arriba de todo, sin marcar **qué fila** está mal. Con 12
combinaciones cargadas, encontrarla es a ojo.

Lo bueno: no se guarda basura. Lo malo: el error llega tarde y no ubica.

### 1.5 — Nada impide dos filas idénticas 🟡

Podés cargar dos veces `Talle S + Color Negro`. Nadie avisa. En la tienda
`buscarVariante` encuentra la primera, así que **el stock de la segunda queda
inalcanzable**: nunca se vende y nunca se descuenta.

Shopify no te deja crear la combinación repetida, directamente.

---

## 2. Lo que está mal pensado (arquitectura)

### 2.1 — "Color" es una string mágica clavada en el código

El refactor sacó la lista blanca de la tienda: ahora una opción se puede llamar
como quiera. **El formulario no se enteró.** `"Color"` está escrito a mano en:

| Lugar | Qué hace |
|---|---|
| `page.tsx:746` | La clave que guarda el stock entre rearmados |
| `page.tsx:769,776` | Lo que escribe el constructor en cada fila |
| `page.tsx:649` | Cómo detecta cuál es la *otra* opción al editar |
| `page.tsx:844` | Qué valores se ofrecen para asignarle una foto |
| `VariantBuilder.tsx:55` | La segunda dimensión es `sizeDim`; la primera es Color y punto |
| `VariantBuilder.tsx:203` | `otros={["Color"]}` — no podés llamarle "Color" a la otra |
| `VariantBuilder.tsx:298,301` | `v.attrs["Color"]` para el círculo y la foto |

Mientras tanto la tienda usa `esOpcionDeColor()`, que acepta *color, colour,
colores, colors, tono*. **Son dos definiciones distintas de "esto es un color".**
Si en manual le ponés "Tono", la tienda le dibuja el puntito de color y el
constructor no la reconoce.

### 2.2 — El constructor sólo sabe hacer Color × Otra cosa

`MAX_OPCIONES = 3`, pero el constructor llega a **2 fijas**, y una tiene que ser
Color. Consecuencias:

- Una joyería que vende por **Largo + Material** no puede usar el constructor.
- Para una tercera opción hay que ir a manual — y **volver borra todo** (1.1).
- Si el producto no tiene colores, quedan **dos columnas muertas** en cada fila:
  el círculo de color vacío y la cámara deshabilitada (`disabled={!color}`,
  `VariantBuilder.tsx:324`).

### 2.3 — Las fotos se asignan sólo a colores

`assignPhotoToColor` y el desplegable de la sección de imágenes
(`page.tsx:1458`) se alimentan de `colorValues`, que filtra por
`key.includes("color") || key.includes("tono")`.

Pero **la tienda ya sincroniza la foto con cualquier opción** — eso lo cambiamos
en el refactor, la foto sigue al *valor*, no al color. Una joyería con fotos por
largo (45cm / 60cm se ven distinto) **no tiene cómo asignarlas**.

El formulario quedó una versión atrás de la tienda.

### 2.4 — Dos modos = dos modelos mentales

| | Constructor | Manual |
|---|---|---|
| Opciones | 2 fijas, una es Color | Hasta 3, cualquier nombre |
| Valores | Chips, se tocan | Se escriben fila por fila |
| Combinaciones | Automáticas | A mano, una por una |
| Renombrar | Sólo la segunda | Todas |
| Foto por fila | Sí | No |
| Quién lo tiene | Sólo ROPA y HOGAR_TECH (`page.tsx:2288`) | Todos |

Gastronomía y General **no tienen constructor**: escriben las 12 combinaciones a
mano, una por una. Shopify no le pide eso a nadie.

Y el nombre de la opción aparece **dos veces** en manual: en la barra de arriba y
como etiqueta de cada fila (`page.tsx:2376`). Con 12 filas, la palabra "Talle"
está escrita 13 veces en pantalla.

---

## 3. Jerarquía: el orden de la página está al revés

Orden actual de las 11 secciones:

```
1. Información básica          6. Venta mayorista
2. Condición del producto      7. Cuotas sin interés
3. Imágenes del producto *     8. Envío
4. Reels / Videos              9. VARIANTES Y STOCK   ← noveno
5. Historial de servicios     10. Ficha técnica
                              11. Programar publicación
```

**Variantes y stock es la anteúltima cosa que ves.** Está después de mayorista,
cuotas y envío — tres secciones que la mayoría de los productos no usa. Y es lo
único que *todo* producto necesita sí o sí: sin variante no hay stock, y sin
stock no hay venta.

En Shopify el orden es: título → media → precio → **inventario/variantes** →
envío. Las variantes van **antes** que el envío, porque el peso y el precio
pueden ser por variante.

### El bug de orden que el propio código confiesa

Las imágenes están en la posición 3. La asignación foto→color sólo aparece
**si ya hay colores definidos** (`page.tsx:1458`), y los colores se definen en la
posición 9.

O sea: subís las fotos, no ves ningún desplegable, bajás nueve secciones, cargás
los colores, y tenés que **volver a subir**. Tanto es así que hay un cartel ámbar
en la sección de variantes que dice, textual (`page.tsx:2442`):

> "Scrolleá a **Imágenes del producto** (arriba) para asignar cada foto a su color."

Cuando la interfaz necesita darte indicaciones para navegarse a sí misma, el
problema no es el cartel.

---

## 4. Cómo lo hacen los demás

### Shopify

Un solo flujo, sin modos:

1. **"+ Agregar opciones como talle o color"** — un botón, no dos caminos.
2. Cada opción: **nombre** (con sugerencias: Size, Color, Material, Style) +
   **valores** como chips (escribís y Enter).
3. Hasta 3 opciones, **todas iguales** — ninguna es especial.
4. La tabla de combinaciones **se genera sola** con el producto cartesiano.
5. Cada fila: precio, stock, SKU, código de barras y **su propia imagen**.
6. Podés **borrar combinaciones sueltas** (el vestido rojo no viene en XL).
7. Edición masiva: seleccionás filas y cambiás el precio de todas juntas.
8. Las opciones se **colapsan** a un resumen cuando terminás de definirlas, y la
   tabla se agrupa por la primera opción.

### Tienda Nube

Casi igual, y en castellano: "Propiedad" con nombre libre (sugiere Talle/Color),
valores como chips, tabla automática con stock, precio, SKU, peso y dimensiones
por fila. Hasta 3 propiedades.

### Mercado Libre

Distinto a propósito: los atributos son **fijos por categoría** y muchos
**obligatorios**. Le sirve al buscador de ML, no al vendedor — y es una de las
causas conocidas de abandono al publicar. **No es el modelo a copiar**, pero sí
la idea de sugerir según la categoría, que ya tenemos en `sugerirOpcion`.

### Dónde estamos parados

| | Shopify | Tienda Nube | Nosotros |
|---|---|---|---|
| Un solo flujo | ✅ | ✅ | ❌ dos modos |
| Nombre libre | ✅ | ✅ | ✅ (manual) / ⚠️ (constructor) |
| Todas las opciones iguales | ✅ | ✅ | ❌ Color es especial |
| Combinaciones automáticas | ✅ | ✅ | ⚠️ sólo ROPA/HOGAR_TECH |
| Foto por variante | ✅ | ✅ | ⚠️ sólo por color |
| SKU editable | ✅ | ✅ | ❌ |
| Borrar una combinación | ✅ | ✅ | ⚠️ sólo en manual |
| Edición masiva | ✅ | ✅ | ❌ |
| Sugerencia por categoría | ⚠️ genérica | ⚠️ genérica | ✅ **mejor que ellos** |

Lo único donde estamos adelante es `sugerirOpcion`: un collar sugiere "Largo" con
centímetros. Shopify sugiere "Size" para todo.

---

## 5. Qué dice la base (2026-08-05, producción)

Antes de priorizar, los números reales:

```
TIENDAS: 4, todas ROPA          → 0 tiendas sin constructor
PRODUCTOS activos: 107          → 13 con 1 opción, 94 con 2, NINGUNO con 3
NOMBRES usados: Talle (223), Color (219), Media (6)
SKU cargado: 0 variantes
Combinaciones duplicadas: 0     Valores vacíos: 0
Fotos: 107 productos, 98 con foto asignada a un valor
```

Qué cambia esto:

- **La asignación de fotos es lo más usado de toda la sección**: 98 de 107. Y
  sólo funciona con colores.
- **El "Coilar" de tiendaapps ya es el caso perdido.** Usa `Media` (40/50/70cm) +
  `Color`, y sus 2 fotos están asignadas a *Rojo* y *Blanco*. Un collar de 40cm y
  uno de 70cm se ven distinto, pero no hay forma de darle una foto a cada largo.
- **El SKU está en 0 variantes** — pero no porque no sirva: porque no hay dónde
  escribirlo. Va a los datos estructurados de Google. Se le da el campo (ver 1.2).
- **La tercera opción no la usa nadie** y **ningún rubro se quedó sin
  constructor**. Bajan de prioridad: son correctos, pero no urgentes.
- **Las filas duplicadas y vacías nunca pasaron.** Los agujeros son reales, pero
  hasta hoy no mordieron.

## 6. Qué haría

### Fase A — Los agujeros que importan hoy

| # | Qué | Dónde | A quién le pega |
|---|---|---|---|
| A1 | Que cambiar a constructor **no borre**: recalcular `builderColors/Sizes` desde las filas | `page.tsx:2296` | Cualquiera, hoy |
| A2 | Asignar foto a **cualquier valor**, no sólo a colores | `page.tsx:844,1458` | 98/107 productos |
| A3 | Que la fila del constructor sea responsive (apilada < 640px) | `VariantBuilder.tsx:306` | Quien carga del celular |
| A4 | **Darle la columna al SKU** — 0 usos porque no hay dónde escribirlo, y Google lo espera | ambos | SEO de fichas |

### Fase A′ — Los que todavía no mordieron (mismo viaje, baratos)

| # | Qué | Dónde |
|---|---|---|
| A5 | Marcar en rojo **la fila** incompleta en vez del cartel genérico | `page.tsx:346` |
| A6 | Avisar cuando dos filas son la misma combinación | `page.tsx` (nuevo) |

### Fase B — Un solo modelo (el cambio de fondo)

Unificar en el flujo de Shopify: **opciones con chips arriba, tabla generada
abajo**. Eso borra el modo manual, borra `buildVariantsFromBuilder`, borra el
`"Color"` clavado, y de paso les da constructor a Gastronomía y General.

- La tabla se genera para cualquier cantidad de opciones (1 a 3).
- Se puede borrar una combinación suelta.
- La foto se asigna a cualquier valor, no sólo a colores — que es lo que la
  tienda **ya hace**.
- `sugerirOpcion` sigue igual: es lo mejor que tenemos.

### Fase C — Reordenar la página

Mover **Variantes y stock** arriba, justo después de Imágenes. Eso resuelve solo
el problema de las fotos y borra el cartel ámbar. Mayorista, cuotas y envío bajan.

---

## 6. Riesgo

La Fase A es acotada y no cambia lo que se guarda: son arreglos.

La Fase B toca la carga de **todos** los productos que ya existen. Los datos no
cambian de forma —las variantes ya se guardan como `{"Talle":"S","Color":"Negro"}`
desde el refactor— así que es un cambio de pantalla, no de base. Pero hay que
probarlo contra productos reales de las tres tiendas antes de subirlo.

---

## Apéndice — El contador de productos (46 vs 44)

Aparte del formulario. Lo notó Flavio: la tarjeta de Girly Store en el
directorio dice **46 productos** y el panel dice **44**.

Contado en producción:

```
_count del directorio (sin filtro): 46
panel  (deletedAt: null)          : 44
tienda (isActive + no borrado)    : 44
borrados (deletedAt != null)      :  2
pausados (isActive:false, vivos)  :  0
```

Los dos de más son **productos borrados**:

- `Copia de Camiseta Hanes 5180 Unisex Beefy Tallas S-5XL`
- `Camiseta Hanes 5180 Unisex Beefy Tallas S-5XL`

**El panel tiene razón; el directorio miente.** El borrado es lógico
(`deletedAt`), la fila sigue en la base, y `_count` la cuenta igual.

`lib/tiendasDirectorio.ts:70`

```js
_count: { select: { products: true, orders: true } },   // ← sin where
```

Dos líneas más abajo, la consulta de la foto de tapa **sí** filtra
(`where: { isActive: true }`). O sea que en la misma query una parte filtra y la
otra no.

### No es un solo lugar

El mismo `_count` sin filtro está en **seis**:

| Archivo | Qué muestra |
|---|---|
| `lib/tiendasDirectorio.ts:70` | "46 productos" en el directorio público |
| `api/vendedoras/route.ts:68` | "X productos disponibles para compartir" (afiliadas) |
| `dashboard/page.tsx:26` | El total del panel principal |
| `api/asistente/route.ts:99` | Con qué decide el asistente si falta cargar productos |
| `api/asistente/acciones/route.ts:27` | Idem |
| `admin/tiendas/page.tsx:17` | El panel de administración |

Prisma 5 soporta contar filtrado, así que el arreglo es la misma línea en los
seis:

```js
_count: { select: { products: { where: { deletedAt: null, isActive: true } } } }
```

Con el matiz de que cada uno quiere un filtro distinto:

- **Directorio y afiliadas** (público): `deletedAt: null, isActive: true` — es lo
  que el comprador va a encontrar. Prometer 46 y mostrar 44 es publicidad falsa.
- **Panel y asistente** (dueño): `deletedAt: null` — los pausados son suyos y los
  tiene que ver.
- **Admin**: `deletedAt: null`, o dejarlo crudo a propósito y aclararlo.
