# PLAN — OPCIONES DE PRODUCTO Y MODA COMO RUBRO GENÉRICO

> Creado: 2026-08-04 | Workflow: 🔲 pendiente | 🔄 en progreso | ✅ hecho | ❌ descartado con justificación
> Objetivo: que una tienda pueda vender joyas, lencería, bolsos o lentes dentro de "Moda y ropa"
> sin que el sistema la trate como una tienda de remeras — y recién ahí sumar templates nuevos.
>
> Complementa [TEMPLATES-NUEVOS.md](TEMPLATES-NUEVOS.md), que define rubros nuevos desde cero.
> Acá se destildan supuestos de un rubro que ya existe, funciona y tiene tiendas publicadas.

---

## 1. LA PREGUNTA QUE ORDENA TODO

> *"Si un template tiene imágenes demo de joyería, ¿alguien puede usarlo para ropa porque le
> gustó más ese diseño?"*

**Sí, y hoy ya funciona así.** Los templates se habilitan por **RUBRO**, no por lo que se vende
adentro (`dashboard/configuracion/page.tsx:263`):

```js
const isDisabled = !!storeTipoTienda && !t.tipoTiendas.includes(storeTipoTienda);
```

Los cuatro de Moda declaran `["ROPA", ...]`, así que **cualquier tienda de moda puede elegir
cualquier diseño de moda**. Una joyería puede usar Urban Pulse.

Es también como funcionan Shopify y Tiendanube: **ningún theme está atado a un rubro.**

### ❌ DESCARTADO — sub-rubro ("joyería", "lencería") al crear la cuenta

Es lo primero que uno piensa y rompe justo el caso de arriba.

1. **Volvería a encerrar los diseños.** Si el sub-rubro filtra templates, la joyería no puede
   elegir el diseño deportivo. Hoy sí puede.
2. **Crea una segunda fuente de verdad que puede contradecir al catálogo.** La tienda diría
   "soy joyería" y adentro habría remeras. ¿Cuál gana?
3. **Ya hay algo más fino: la categoría de cada producto.** El sistema se adapta por PRODUCTO,
   lo que permite vender ropa *y* joyas en la misma tienda. Un sub-rubro lo haría imposible.

**Lo que falta no es un sub-rubro. Son las opciones de producto y los textos por categoría.**

---

## 2. CÓMO LO HACEN SHOPIFY Y TIENDANUBE

En los dos, **el nombre de la opción lo escribe el vendedor**. Sugieren Size / Color / Material,
pero son editables: podés poner "Largo", "Capacidad", "Sabor".

Y el theme imprime lo que el vendedor escribió, recorriendo las opciones del producto:

```
para cada opción del producto:
    mostrar  opción.nombre
    mostrar  sus valores
```

**El theme no sabe que existe algo llamado "Talle".** Sólo sabe que hay opciones y las dibuja.

Shopify además tiene una taxonomía de categorías que define qué atributos pide cada una — que es
exactamente nuestro `extraFieldsByCategory`, ya implementado y usado sólo por Hogar & Tecnología.

**Conclusión: el modelo que hay que copiar existe y está probado. No es una idea nueva.**

---

## 3. EL PROBLEMA REAL — la lista blanca

Nuestro equivalente de "opciones" está clavado a dos, en **tres lugares encadenados**:

| Paso | Qué hace | Dónde |
|---|---|---|
| 1. Formulario | Para Moda ofrece **sólo** "Talle" y "Color" | `productos/nuevo/page.tsx:43` |
| 2. Storefront | Sólo reconoce una **lista blanca** de ~15 nombres | `useStorefront.ts:87` (`SIZE_ATTRS`) |
| 3. Pantallas | Imprimen las palabras a mano | cada modal / la ficha |

El paso 2 es el grave. `mapProduct` recibe las opciones **con su nombre** y las aplana en dos
listas planas, `sizes[]` y `colors[]`, tirando el nombre.

La lista blanca tiene: `talle, size, talla, talles, sizes, tamaño, tamano, almacenamiento, ram,
versión, version, formato, variante, material, sabor, peso/tamaño, peso`.

**"Largo" no está. "Medida" tampoco.** Si alguien nombra una opción "Largo" para un collar, el
valor **desaparece de la tienda en silencio** — no se ve mal, no se ve.

### 3.1 — El dato ya está bien. Sólo la lectura está mal

`ProductVariant.name` guarda el JSON con el nombre adentro: `{"Talle":"S","Color":"Negro"}`.

**No hace falta migrar nada.** La base ya tiene la información; es `mapProduct` el que la tira.

### 3.2 — Estado real de la base (2026-08-04)

| | |
|---|---|
| Tiendas | 4 |
| Productos | 109 |
| Variantes | 249 |
| Nombres de opción usados | **`Talle` (243) y `Color` (231). Nada más.** |

**Cero variedad heredada.** Si mañana leemos el nombre real en vez de la lista blanca, sale
"Talle" y "Color" — exactamente lo que está escrito a mano hoy. **La pantalla no cambia para
ninguna de las 4 tiendas publicadas.**

---

## 4. ¿AHORA O DESPUÉS DE LANZAR?

### 🔴 RECOMENDACIÓN: ahora. Y es el momento más barato que va a haber.

**A favor de hacerlo ya:**

1. **No hay migración de datos.** El nombre ya está guardado (3.1).
2. **Es invisible para lo que ya existe.** Las 249 variantes usan Talle y Color; leerlas por su
   nombre real dibuja lo mismo (3.2).
3. **El costo crece solo.** Hoy son 4 modales de Moda. Con los dos templates nuevos son 6.
4. **Después de lanzar, cambiar el modelo de variantes toca tiendas con pedidos reales.** Ahora
   son 4 tiendas conocidas; después son las que haya.
5. **Bloquea lo demás.** Cualquier template nuevo hecho antes de esto nace con "Talle" clavado.

**En contra (honesto):**

- Toca ~10 archivos y el carrito, que es la parte más delicada del sistema.
- No es visible para el usuario: nadie va a notar la mejora hasta que exista una joyería.
- Se puede posponer sin que nada se rompa hoy. Es deuda, no incendio.

**El desempate:** el punto 2. Un cambio que no altera ninguna pantalla existente es lo más
seguro que se puede hacer, y esa ventana se cierra apenas entre la primera tienda con una opción
que no sea Talle o Color.

---

## 5. QUÉ HAY QUE CAMBIAR

### 🔲 5.1 — Que las opciones viajen con su nombre *(el cambio de fondo)*

Reemplazar `sizes[]` / `colors[]` por algo como:

```ts
opciones: { nombre: string; valores: string[] }[]
```

`mapProduct` deja de aplanar y devuelve lo que ya tiene.

#### Cómo migrar: de una, sin período de convivencia

La tentación es agregar `opciones` **conservando** `sizes`/`colors` derivados y migrar pantalla
por pantalla. **No se hace así.** Eso deja dos sistemas paralelos haciendo lo mismo, y el "y al
final borramos los viejos" no llega nunca. Terminás con código muerto que nadie se anima a tocar
porque no sabe cuál de los dos está en uso.

Se hace **de una sola vez**, y hay una razón técnica por la que es seguro:

1. Se **borran** `sizes` y `colors` del tipo `StorefrontProduct`.
2. `tsc` devuelve **la lista exacta y completa** de cada lugar que las usaba. No se puede olvidar
   ninguno: el compilador no deja compilar hasta que estén todos.
3. Se arreglan los ~10 archivos en el mismo commit.
4. Se verifica que las 4 tiendas se ven igual (con las 249 variantes en Talle/Color, tienen que
   dibujar idéntico — ver 3.2).

Sin paso intermedio no hay nada que limpiar después.

Archivos que leen `sizes`/`colors` hoy:

| Archivo | Ocurrencias |
|---|---|
| `app/tienda/[slug]/producto/[id]/ProductDetailClient.tsx` | 7 |
| `app/tienda/[slug]/productos/page.tsx` | 7 |
| `hooks/useCartLogic.ts` | 5 |
| `templates/BohoTerra.tsx` | 5 |
| `templates/ChicParis.tsx` | 5 |
| `templates/UrbanPulse.tsx` | 5 |
| `templates/FashionNoir.tsx` | 3 |
| `templates/productDetail/shared.tsx` | 2 |
| `store/auto/AutoVehicleShared.tsx` | 1 |
| `app/diseno-propio/page.tsx` | 1 |

**Ventaja de arranque:** Hogar & Tech y Autos **no tienen modal** — van directo a la ficha. Así
que los modales a tocar son sólo los 4 de Moda, y la ficha se arregla una vez para los 10.

#### Código que DESAPARECE con este cambio

No es sólo agregar: este cambio **borra** cosas. Es parte del objetivo, no un efecto secundario.

| Se borra | Dónde | Por qué muere |
|---|---|---|
| `SIZE_ATTRS` (17 nombres) | `useStorefront.ts:87` | Ya no hay lista blanca que decidir |
| `COLOR_ATTRS` | `useStorefront.ts:103` | idem |
| `isSize()` / `isColor()` | `useStorefront.ts:164` | 5 usos, todos dentro de `mapProduct` |
| `sizes` / `colors` del tipo | `useStorefront.ts:48` | Reemplazados por `opciones` |
| `defaultVariantName` (5 rubros) | `storeTypes.ts:58` | Ya era código muerto **hoy** (5.6) |

Lo que **sí queda** —y hay que ser honesto con esto— es una lista chiquita para saber qué opción
lleva el puntito de color (`colorToSwatch`, usado en 7 archivos). Pero cambia de rol por completo:

- **Hoy** la lista decide si el dato **existe**. Un "Largo" desaparece de la tienda.
- **Después** sólo decide si se dibuja un puntito. Un "Largo" se ve igual, sin puntito.

De filtro que borra datos a detalle de presentación. Esa diferencia es todo el punto.

#### ✅ DECIDIDO — tres opciones por producto

Hoy el formulario da 2 para Moda. Shopify históricamente permitió 3. Vamos a **3**: cubre
"Talle + Color + Material" sin convertirse en un ABM. Si algún día hacen falta más, subir el
número es un cambio de una línea; bajarlo después de que alguien cargó 5 no.

---

### 🔲 5.2 — Que el formulario deje nombrar la opción

Hoy `getVariantOptions("ROPA")` devuelve `["Talle", "Color", "Otro"]`. "Otro" existe pero cae en
el pozo de la lista blanca del punto 3.

Con 5.1 resuelto, "Otro" pasa a funcionar de verdad.

#### ✅ DECIDIDO — el nombre se sugiere por categoría, no se adivina

`getTalleSuggestions` ya sabe que un collar se mide en centímetros y un anillo en números. Esa
misma función pasa a sugerir también **el nombre** de la opción, no sólo sus valores — así hay
**un solo criterio** en vez de dos (hoy el nombre sale del rubro y los valores de la categoría).

Sugerir, no imponer: el campo queda editable siempre. La dueña de una joyería ve "Largo"
precargado y puede escribir otra cosa.

---

### 🔲 5.3 — Una sola opción no es una opción

En los tres lugares:

```js
needsSize = product.sizes.length > 0
```

Con un solo valor igual se dibuja el selector. Por eso una camisa sin talles muestra
**"TALLE / [Único]"**: un cuadro para elegir lo único que hay.

Es el mismo criterio que ya aplicamos al filtro Mujer/Hombre: **si no hay nada que elegir, no va
el selector.** El valor se sigue mandando al carrito, sólo no se pide que lo elijan.

#### ✅ DECIDIDO — depende de si el valor dice algo

Un solo valor nunca va como botón, porque no hay nada que elegir. Pero no todos los valores
únicos son iguales:

| Valor único | Qué se hace | Por qué |
|---|---|---|
| "Único", "Unico" | **No se muestra nada** | La palabra sólo dice "no hay opciones". Es ruido |
| "45cm", "Plata 925" | Se muestra como **texto**, sin botón | Informa algo del producto, pero no hay qué elegir |

En los dos casos el valor se sigue mandando al carrito igual: cambia lo que se ve, no lo que se
compra.

---

### 🔲 5.4 — Faltan campos por categoría en Moda

Moda pide un solo campo para todo: **Material**. Hogar & Tecnología pide Capacidad para una
heladera y BTU para un aire.

| Categoría | Campos propuestos |
|---|---|
| joyas | Piedra · Baño / pureza (plata 925, oro 18k) |
| bolsos | Medidas · Cierre · Compartimentos |
| calzado | Tipo de suela · Material interior |
| lentes *(en `accesorios`)* | Protección UV · Tipo de lente |
| ropa | Material *(ya está)* · Cuidado de lavado |

El mecanismo (`extraFieldsByCategory`) ya existe y es genérico: **son datos, cero código nuevo.**

**🔴 A DEBATIR:** qué campos exactamente. Los de arriba son propuesta, no verdad.

---

### 🔲 5.5 — Los ejemplos del formulario son todos de ropa

`storeTypes.ts:114-115`:

```
namePlaceholder:  "Ej: Remera oversize negra talle M"
tagsPlaceholder:  "negro, oversize, algodon"
```

El que abre una joyería ve un ejemplo de remera. Primera señal de "esto no fue pensado para mí".

**Ojo:** el placeholder aparece **antes** de elegir la categoría, así que cambiarlo por categoría
puede no llegar a tiempo. Hay que mirar el orden real del formulario.

---

### 🔲 5.6 — Bugs sueltos encontrados en el camino

- **Typo `"Outro"`** en `productos/nuevo/page.tsx:665`: filtra `o !== "Outro"` cuando el valor es
  `"Otro"`. Todos los demás lugares lo filtran bien (ej. línea 816). Por eso, al **editar un
  producto sin variantes**, se abre una tercera dimensión vacía llamada literalmente "Otro" — y
  si se completa, el valor cae en el pozo del punto 3.
- **`defaultVariantName` es código muerto.** `storeTypes.ts:58` lo declara y los 5 rubros lo
  completan. No lo lee nadie: el rótulo real sale de `getBuilderConfig`. Es una trampa para el
  próximo que quiera cambiar el rótulo.
- **`TEMPLATES-NUEVOS.md` quedó desactualizado**: dice que `extraFields` "son globales para todo
  el rubro, no cambian por categoría". `extraFieldsByCategory` se agregó después.

---

## 6. LOS DOS TEMPLATES NUEVOS

### 🔲 6.1 — El contenido demo es todo de ropa, en dos capas

1. **Los 8 productos demo** (`useStorefront.ts:107`) son por **rubro**, no por template: remera,
   jeans, hoodie, cargo, vestido, cinturón, campera, cartera. Un diseño de joyería se
   previsualizaría con remeras.
2. **Las imágenes de portada** están escritas a mano en cada template
   (`picsum.photos/seed/terra-h1`…).

| Opción | Qué implica |
|---|---|
| **A.** Dejarlo | El diseño de joyería se presenta con remeras. Cero trabajo, mala primera impresión |
| **B.** Pool por template | Cada diseño se muestra con lo suyo. Fiel, hay que mantener N pools |
| **C.** Pool mixto | Sumar 2-3 joyas a los 8 actuales, que ya traen cinturón y cartera |

**🔴 A DEBATIR.** Mi voto: **B sólo para los templates nuevos**, dejando los 4 actuales como
están.

**Lo que NO cambia:** el pool es sólo relleno de vista previa. En la tienda real se ven los
productos de la dueña, así que elegir un diseño "de joyería" para vender ropa sigue funcionando.

### 🔲 6.2 — Definir las dos estéticas

Los cuatro actuales, para no repetir:

| Template | Estética |
|---|---|
| Fashion Noir | Oscuro · dorado · editorial de lujo |
| Boho Terra | Tierra · artesanal · Georgia itálica |
| Urban Pulse | Negro · lima flúor · deportivo |
| Chic Paris | Blanco · rojo · editorial limpio |

Hay lugar para algo **romántico/suave** (lencería: pastel, tipografía fina) y algo **mínimo de
lujo** (joyería: mucho blanco, foto grande, casi sin texto).

**🔴 A DEBATIR:** que salga de qué tiendas esperás, no de mi gusto.

### 🔲 6.3 — Ficha propia para cada template nuevo

Regla ya establecida: **cada template tiene su diseño propio pero funcionan igual.** Cada uno
necesita su archivo en `templates/productDetail/` con su `vestido`.

También siguen pendientes las de `fashion-noir` y `chic-paris`, que caen en la genérica.

---

## 6.4 — REGLA DE ORO DE ESTE PLAN: no dejar nada a medias

Cada paso **termina cerrado**. Nada de "por ahora dejamos los dos y después limpiamos":

- Si un paso reemplaza algo, **borra lo viejo en el mismo commit**.
- Si algo queda sin usar, **se borra** — aunque parezca que "puede servir" (`defaultVariantName`
  parecía que servía y lleva meses sin que nadie lo lea).
- `tsc` es la red: sacando el campo del tipo, el compilador enumera todo lo que hay que tocar.
- Antes de cerrar cada paso: `tsc` + `eslint` + `next build` + las 4 tiendas verificadas.

---

## 7. ORDEN PROPUESTO

1. **5.1 + 5.3** — opciones con nombre y el selector de una sola opción. El cambio de fondo, y el
   más barato de hacer *ahora* (sección 4).
2. **5.2 + 5.6** — el formulario y los bugs sueltos.
3. **5.4 + 5.5** — campos y textos por categoría.
4. **6.1** — decidir el contenido demo.
5. **6.2 + 6.3** — las dos estéticas y sus fichas.

Al revés no sirve: si armamos los diseños primero, salen con "Talle" clavado y pasamos de 4
lugares a arreglar a 6. Es la misma razón por la que el filtro Mujer/Hombre se arregló antes que
nada.

---

## 8. YA HECHO

- ✅ **Filtro Mujer/Hombre según catálogo** (2026-08-04, commit `be98737`). Los cuatro templates
  tenían los dos botones fijos; con todo en `unisex` no filtraban nada. Ahora aparecen sólo si el
  catálogo tiene de los dos. `lib/generos.ts`.

---

## 9. FUERA DE ALCANCE (anotado para no perderlo)

- 🔲 Desborde horizontal en `fashion-noir` (+24 a 360px, +136 a 768px), `tech-nova`,
  `electro-prime` y `casa-clara`. Ver commit `a5f6fe1`.
- 🔲 Urban Pulse en celular recorta el nombre de la tienda a "TIENDAAP…". Para que entre entero
  habría que sacar un ícono de la barra, y el candidato (cuenta) es hoy el único acceso al login
  en celular, porque el menú hamburguesa no tiene esa sección.
