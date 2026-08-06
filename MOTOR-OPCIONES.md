# Revisión del motor de opciones

Lo que salió del refactor: `lib/opciones.ts`, `lib/variantMatch.ts`,
`lib/variantAttrs.ts` y la parte del modal de `hooks/useCartLogic.ts`.
Buscando bugs, código muerto y validaciones que falten.

Revisado el 2026-08-05. Contrastado contra los 107 productos activos de
producción donde hacía falta.

---

## 0. Primero, lo que está bien

Lo reviso porque conviene saber qué NO hay que volver a mirar:

- **`parseVariantAttrs`** aguanta todo lo que se le tire: un `name` que es
  `"5"` parsea a número y devuelve `null` (no lo confunde con atributos); un
  array queda afuera; `"null"` queda afuera; texto suelto tira excepción y
  devuelve `null`. Once líneas sin agujeros.
- **`varianteTiene`** gasta una opción por valor buscado, así que
  `["único","único"]` no coincide con una variante que tiene un solo "único".
- **`buscarVariante`** devuelve `null` en vez de adivinar cuando hay varias
  variantes y ninguna casa. Ante la duda, no resuelve — es lo correcto, y es lo
  que arregló que se vendiera siempre la primera.
- **`valoresSinStock`** usa una sola regla simétrica, y la clave lleva el nombre
  de la opción adelante: un "Negro" de Color y un "Negro" de Material no se
  tachan juntos.
- **`reacomodarSeleccion`** puntúa por cuántas opciones conserva, así que con
  tres opciones no mueve más de lo necesario.
- **No puede existir una opción con cero valores**: `opcionesDeVariantes` filtra
  los vacíos al armarlas, así que `combinaciones` nunca se queda sin nada que
  multiplicar.

---

## 1. El bug que importa 🟠

### Se puede vender sin descontar stock

Cadena completa, cada paso verificado en el código:

1. Una variante se guarda con **una opción llena y otra vacía** —
   `{"Talle":"M","Color":""}`. El formulario lo permite:
   `prepareVariantsForSubmit` filtra las CLAVES vacías, no los VALORES, y arma
   `value: "M"`. El servidor valida `!v.name || !v.value` — las dos tienen
   contenido, así que **pasa** (`lib/products.ts:395`).
2. El comprador elige `Talle M` + `Color Negro` (Negro es el único color, así
   que viene preseleccionado).
3. Ninguna variante coincide → **`buscarVariante` devuelve `null`**. Correcto:
   es justamente lo que evita vender la equivocada.
4. `resolveVariantStock` → `null`. Y `null` se trata como **disponible**
   (`primerComboConStock` lo dice explícito). El botón de comprar queda
   **prendido** y sin techo de cantidad.
5. `resolveVariantId` → `null`.
6. En la caja, `checkout/route.ts:309`:

```js
const variant = item.variantId ? product.variants.find(...) : null;
if (item.variantId && !variant) throw new Error("Variante no disponible");

if (variant) {
  // decremento atómico de stock
}
```

`variantId` es `null`, así que **no entra al `if`**: el pedido se crea, se cobra,
y **el stock no se toca**. Ni siquiera falla — falla sólo si `variantId` viene
con un id que no existe.

**Qué queda:** una venta cobrada, el stock intacto, y un pedido que le llega a la
dueña sin saber qué variante mandar.

### ¿Está pasando hoy?

No. Contado en producción sobre los 107 productos activos:

```
con una fila que tiene una opcion vacia y otra llena: 0
con filas que tienen DISTINTAS opciones entre si    : 0
con el mismo valor en dos opciones de una variante  : 0
variantes sin attrs JSON (formato viejo)            : 0
```

Los datos están impecables. Pero el camino está abierto: se llega **cargando un
producto en modo manual y dejando un casillero vacío**. El constructor no puede
producirlo (siempre llena las dos), el manual sí.

### Cómo lo cerraría

Dos candados, y pondría los dos:

**El que protege la plata** — que `null` deje de significar "disponible" cuando
el producto tiene más de una variante. Si ninguna casa, la combinación no
existe: el botón se apaga en vez de dejar comprar algo que no está. Hoy
`buscarVariante` ya devuelve la única variante cuando hay una sola, así que
`null` con dos o más significa exactamente "esto no existe".

**El que evita crear el problema** — que el formulario no deje guardar una fila
con una opción completa y otra vacía. Es la misma validación que ya estaba
pendiente para las filas vacías del todo.

---

## 2. Código muerto

### `addingToCartRef` no puede dispararse nunca

`useCartLogic.ts:212, 767-785`

```js
if (!modalProduct || addingToCartRef.current) return;
addingToCartRef.current = true;
...                      // nada asíncrono acá en el medio
addingToCartRef.current = false;
```

No hay un solo `await` entre el `true` y el `false` — verificado. La bandera se
prende y se apaga dentro del mismo tick, así que cuando llega el segundo click ya
está en `false`. La guarda contra el doble click **no protege de nada**.

Tampoco hace falta: `setCartItems` junta por `claveItem`, así que dos clicks
suman cantidad, que es lo que la persona pidió. **Se borra el ref.**

---

## 3. Duplicación que quedó

### `seleccionDesdeValores` reimplementa `opcionDelValor`

`useCartLogic.ts:67`

```js
const op = p.opciones.find(o => o.valores.some(v => v.toLowerCase() === valor.toLowerCase()));
```

`opciones.ts:189`

```js
const op = opciones.find(o => o.valores.some(v => v.toLowerCase() === valor.toLowerCase()));
```

**Palabra por palabra.** Y las dos están en el camino del carrito guardado. Es
exactamente el tipo de copia que el refactor vino a sacar. `seleccionDesdeValores`
tiene que llamar a `opcionDelValor`.

### `reacomodarSeleccion` inlina `valoresElegidos`

`opciones.ts:151` escribe `Object.values(seleccion).filter(Boolean)` a mano,
teniendo `valoresElegidos` exportada **veinte líneas más arriba, en el mismo
archivo**.

---

## 4. Dónde viven las cosas

### `combinaciones` está del lado equivocado

Vive en `useCartLogic.ts:45`. Es una función **pura** —opciones entran,
combinaciones salen— y es la que decide con qué combinación abre cada ficha.
Pertenece a `lib/opciones.ts` con las otras seis.

Importa por algo concreto: donde está no se puede probar sin montar el hook
entero. En `lib/opciones.ts` se prueba con un script, como todo lo demás.

---

## 5. La validación que está en un solo lado

`opcionesAElegir` existe para preguntar "¿el comprador ya eligió todo?". Se usa
como guarda en **una** de las seis pantallas que dibujan opciones:

| Pantalla | Usa la guarda |
|---|---|
| `ProductDetailClient` | ✅ `canAdd` |
| `UrbanPulse` | ⚠️ sólo para el TEXTO del botón |
| Fashion Noir · Boho Terra · Chic Paris | ❌ |
| El modal del catálogo (`productos/page.tsx`) | ❌ |

No es un bug hoy: `openModal` deja **todo preseleccionado** con
`primerComboConStock`, así que la selección nunca está incompleta. Pero entonces
la guarda o sobra en una pantalla o falta en cinco. Hay que elegir una de las
dos — si no, el día que algo abra una ficha sin preseleccionar, cinco pantallas
dejan comprar sin elegir y una no.

---

## 6. Un borde chico 🟡

### `fotoAutomaticaRef` puede quedarse prendida

`openModal` la pone en `true` y después llama a `setModalImg`. El efecto que la
consume depende de `[modalImg, modalProduct?.id]`. Si se llama a `openModal` con
**el mismo producto** y la foto que toca es **la misma** que ya estaba, ninguna
de las dos cambia: el efecto no corre y la bandera queda prendida. La próxima vez
que el comprador pase de foto, ese cambio se traga y la selección no lo sigue.

Cerrar el modal lo limpia solo (`modalProduct` pasa a `null`, el efecto corre y
consume la bandera), así que el único camino es volver a abrir el mismo producto
sin cerrar — por ejemplo si el efecto del deep link se redispara porque cambió
`products`. Es raro, y el daño es un click perdido.

---

## Resumen

| # | Qué | Gravedad | Estado |
|---|---|---|---|
| 1 | Venta sin descontar stock si ninguna variante casa | 🟠 | ✅ **cerrado** |
| 2 | `addingToCartRef` no puede dispararse | ⚪ código muerto | ✅ **borrado** |
| 3 | `seleccionDesdeValores` copia `opcionDelValor` | 🟡 | ✅ **cerrado** |
| 4 | `reacomodarSeleccion` inlina `valoresElegidos` | ⚪ | ✅ **cerrado** |
| 5 | `combinaciones` fuera de `lib/opciones.ts` | 🟡 no se puede probar | ✅ **cerrado** |
| 6 | La guarda de "elegiste todo" en 1 de 6 pantallas | 🟡 | ✅ **cerrado** |
| 7 | `fotoAutomaticaRef` se queda prendida | 🟡 | ✅ **cerrado** |

Lo único que toca plata es el **1**. El resto es prolijidad — pero el 3 y el 5
son justo lo que el refactor vino a sacar, así que dejarlos es dejar la puerta
abierta a que vuelvan a divergir.

---

## Lo que se hizo (2026-08-05)

**Candado de la tienda.** `resolveVariantStock` devuelve **0**, no `null`, cuando
hay varias variantes y ninguna coincide. Esa combinación no existe, y cero es la
respuesta honesta. Lo entienden solas las seis pantallas: todas apagan el botón y
escriben "Sin stock" con `selectedVariantStock === 0`. Con una sola variante
`buscarVariante` siempre la devuelve, así que el `null` que queda es únicamente
el del producto sin variantes, que se sigue tratando como disponible.

**Y una octava copia que se descubrió en el camino.** `productos/page.tsx:925`
tenía su propio `useMemo` rearmando la cuenta. Usaba el buscador compartido, sí,
pero la cuenta era propia — así que se hubiera quedado afuera del arreglo y esa
pantalla seguiría dejando comprar. Ahora toma `selectedVariantStock` del hook.

**Segundo candado, en `addToCart`.** Si el stock es 0 no se agrega, y se avisa.
Las seis pantallas ya apagan el botón; esto protege la caja igual si mañana
aparece una séptima.

**Candado del formulario.** `filasIncompletas` (en `lib/opcionSugerida.ts`, para
poder probarla) detecta las filas con una opción llena y otra vacía. El error
dice **cuál fila** y **qué le falta**, en vez del cartel genérico de arriba.

**El mensaje del carrito.** Con stock 0, `updateQty` decía "Solo quedan 0
unidades", que se lee como un error de la página. Ahora dice que esa combinación
ya no está disponible.

16 pruebas nuevas, incluidas las que verifican que **no** se rompió lo que ya
andaba: producto de una sola variante, producto sin variantes, y sin elegir nada.

## Y la prolijidad (mismo día)

**Las dos copias.** `seleccionDesdeValores` ahora llama a `opcionDelValor` en vez
de reescribir su `find`. Y `reacomodarSeleccion` usa `valoresElegidos`, que estaba
exportada veinte líneas más arriba en su mismo archivo.

**`combinaciones` se mudó a `lib/opciones.ts`.** Era la única del motor que había
quedado adentro del hook, donde no se podía probar. Se le escribieron 6 pruebas
apenas llegó — entre ellas que una opción sin valores se saltea en vez de vaciar
todo, que era el borde que nadie había mirado.

**La guarda de "elegiste todo" se puso en `addToCart`.** Ahí la tienen las seis
pantallas sin tocar un solo template.

> **Corrección.** Antes acá se proponía SACARLA, con el argumento de que era
> redundante porque `openModal` preselecciona todo. Estaba mal: cubre un caso que
> el candado del stock **no** cubre. Con una selección incompleta —sólo el talle,
> sin color— `buscarVariante` busca por los valores que hay, encuentra la primera
> variante con ese talle y devuelve stock mayor que cero. El botón queda prendido
> y el pedido sale con un color que el comprador nunca eligió. Son dos agujeros
> distintos, y el segundo sólo lo tapa la guarda.

**`fotoAutomaticaRef`.** `openModal` ahora la prende **sólo si el efecto va a
correr**: `fotoNueva !== modalImg || p.id !== modalProduct?.id`. Si se reabre el
mismo producto con la misma foto, ninguno de los dos cambia, el efecto no corre —
y antes la bandera quedaba prendida esperando a que la consumiera el próximo
cambio de foto del comprador, que esa vez no movía la selección.

`OpcionProducto` quedó sin uso en `useCartLogic` al mudar `combinaciones`; lo
levantó el lint.

**59 pruebas en total, todas pasan.**
