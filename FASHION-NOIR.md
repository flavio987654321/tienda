# Fashion Noir — revisión del template

Este archivo es el registro de la revisión de Fashion Noir, con el mismo formato que
`URBAN-PULSE.md` y `CHIC-PARIS.md`: un hallazgo por sección, numerado (`FN-n` para la
portada, `FL-n` para la página de productos), con el porqué escrito y cerrado con ✅
cuando se arregla.

**La auditoría de punta a punta todavía NO se hizo.** Lo único cerrado hasta ahora es
FN-1, que salió de la auditoría de Urban Pulse: se encontró de refilón, se anotó como
"sigue abierto" en `URBAN-PULSE.md` y se arregló aparte porque eran links muertos en
producción y no podía esperar a que a este template le tocara el turno.

## Bugs

### FN-1 — Las tres colecciones de la portada llevaban a un listado vacío ✅

El bloque más grande de la portada de Fashion Noir son tres baldosas verticales con
foto. Los nombres estaban **escritos a mano en el código**:

```tsx
{ label:"Mujer",      img: catMujerUrl,      field:"catMujer" },
{ label:"Hombre",     img: catHombreUrl,     field:"catHombre" },
{ label:"Accesorios", img: catAccesoriosUrl, field:"catAccesorios" },
```

…y el link se armaba con ese mismo texto: `?categoria=Mujer`. **Ninguna tienda tiene
esas categorías salvo por casualidad.** Una tienda de ropa con "remeras", "pantalones"
y "camperas" mostraba tres baldosas grandes, con foto y con "Ver más →", que llevaban a
un listado **vacío**. Tres callejones sin salida en el lugar más visible de la página.

Y las fotos eran tres `picsum.photos` fijos: fotos de stock de un desconocido
haciéndose pasar por la colección de la tienda.

**Es exactamente UP-22**, el mismo bug que ya se había arreglado en Urban Pulse. Quedó
vivo acá porque en su momento se arregló un template y no el patrón.

#### Lo que se hizo

Adoptar `src/lib/categoryTiles.ts`, el helper que se extrajo en UP-27 justamente para
esto. Fashion Noir es el **único otro template** con este bloque y con las mismas tres
ranuras de imagen (`catMujer` / `catHombre` / `catAccesorios`) — Chic Paris tiene una
tira de categorías sólo de texto, sin ranuras de foto, y Boho Terra no tiene bloque
equivalente.

Con eso entran, de una, todos los arreglos que en Urban Pulse fueron cuatro hallazgos:

| | antes | ahora |
|---|---|---|
| Qué categoría | "Mujer"/"Hombre"/"Accesorios" a mano | las reales, y **las elige el dueño** con un selector por baldosa |
| La foto | `picsum.photos` fijo | la subida → la del producto destacado → la de otro producto (desempate por `id`) → el fondo del template con el nombre |
| Menos de 3 categorías | `repeat(3,1fr)` fijo, con un tercio vacío | las columnas siguen a la cantidad |
| El selector | no existía | sólo categorías **reales** (los productos demo del editor no cuentan) |
| El panel de imagen | "Imagen categoría Hombre" arriba de una baldosa de otra cosa | el nombre real, y avisa si la foto es prestada de un producto |

**Se comparte la cuenta, no el vestido.** El bloque sigue viéndose como Fashion Noir:
proporción 2/3 (no la 3/4 de Urban Pulse), el nombre en serif centrado abajo, "Ver más
→" en dorado y la foto que se agranda al pasar el mouse. Lo único que se movió afuera
es *qué* mostrar, nunca *cómo*.

Detalle del fallback: sin foto, la baldosa queda con la superficie del template más el
degradado y el nombre en serif — no en el negro que usa Urban Pulse. Cada uno cae a lo
suyo.

**La lección:** cuando un bug se arregla en un template y el mismo bloque vive en otro,
el arreglo no está terminado hasta que el segundo lo usa. El helper existía desde UP-27
y tenía un solo consumidor; un helper con un solo consumidor es una intención, no una
solución.

## Pendiente — la auditoría de verdad

No se miró nada más de este template. Lo que se sabe de refilón y habría que revisar
cuando le toque:

- **Las reseñas de la portada.** Chic Paris y Urban Pulse usan el hook compartido
  `useHomeReviews`; falta confirmar qué hace Fashion Noir.
- **Dos `picsum` más**, en el hero y en "Nuestra historia".
- **El modal del catálogo.** En `productos/page.tsx` la forma propia la tiene sólo
  `urban-pulse`; Fashion Noir cae al modal genérico, que es el de Chic Paris. Es el
  mismo UP-12 / PL-11, sin verificar todavía.
- El recorrido de compra completo y el barrido de anchos (360 / 768 / 1280).
