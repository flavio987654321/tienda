import type { ImageOverride } from "@/types/store-config";

/* ── Las baldosas de categoría de la portada ───────────────────────────────────
   El bloque de tres baldosas grandes con la foto de una categoría. Hoy lo usa SÓLO
   Urban Pulse: se extrajo acá para que Fashion Noir lo adopte, que es el único otro
   template con este bloque y las mismas tres ranuras de imagen —y que todavía tiene
   las categorías escritas a mano ("Mujer"/"Hombre"/"Accesorios") llevando a un
   listado vacío, o sea el bug UP-22 vivo. Chic Paris tiene una tira de categorías
   sólo de texto, sin ranuras de foto, y Boho Terra no tiene bloque equivalente.
   Este helper es el único lugar donde se decide qué categoría va en cada baldosa y
   de dónde sale su foto.

   Los dos problemas que arregla, los dos por la misma causa (nadie eligió nada):

   1. QUÉ categoría. El bloque tomaba las 3 primeras de `categoryList`, que sale
      de `[...new Set(products.map(p => p.category))]` — o sea del orden en que
      vinieron los PRODUCTOS. Las tres baldosas más grandes de la portada podían
      cambiar solas al cargar un producto, y con 10 categorías se veían 3 elegidas
      por nadie. Ahora manda `categoryTiles`, que el dueño elige en el editor.

   2. QUÉ foto. Si el dueño no había subido una, la baldosa mostraba un
      `picsum.photos` — un stock de un desconocido. En la portada de Flavio,
      "PANTALONES" era el Empire State y "REMERAS" un señor con gorro de lana.
      Ahora, antes de rendirse, busca una foto entre los productos DE ESA
      categoría: la tienda ya tiene fotos de su propia ropa.

   Lo que este helper NO hace, a propósito: elegir la foto por "el primer producto"
   o por "el más visto". Las dos se mueven solas —la primera con el orden de la
   consulta, la segunda con lo que hacen los visitantes— y una portada que cambia
   sin que nadie la toque es el bug del producto destacado que rotaba a las 21:00,
   otra vez. El desempate es por `id`, que no se mueve nunca. */

export type ProductoParaBaldosa = {
  id: string;
  category: string;
  images: string[];
};

export type BaldosaCategoria = {
  /** En qué baldosa va, de 0 a 2. NO es el índice en el array que se devuelve: una
   *  posición sin categoría se saltea, así que el array puede ser más corto y salir
   *  corrido. Quien escriba la elección del dueño tiene que usar ESTO
   *  (`catTile${pos}`) y no el índice del `map`, o le escribe a otra baldosa. */
  pos: number;
  /** La categoría que se muestra, tal como la escribió el dueño. */
  cat: string;
  /** Ranura de `imageOverrides` de esta posición. Se conserva para no perder las
   *  fotos ya subidas: los nombres quedaron feos por dentro (ver UP-22) pero son
   *  invisibles para el dueño. */
  field: string;
  /** La foto ya resuelta, o `null` si no hubo ninguna en toda la cascada — ahí
   *  decide el template con qué placeholder rellenar (cada uno tiene el suyo). */
  img: string | null;
  /** De dónde salió la foto. El editor lo usa para avisarle al dueño que la está
   *  tomando prestada de un producto y que puede subir la suya. */
  origen: "subida" | "producto" | "ninguna";
};

/** Las tres ranuras históricas de imagen, por POSICIÓN. No se renombran: hay
 *  tiendas con fotos guardadas en ellas y renombrarlas se las borra de la vista. */
export const RANURAS_BALDOSA = ["catMujer", "catHombre", "catAccesorios"] as const;

/** Cuántas baldosas tiene el bloque. Son 3 porque son 3 ranuras de foto, y porque
 *  el bloque son 3 piezas de composición y no una grilla de categorías. */
export const MAX_BALDOSAS = RANURAS_BALDOSA.length;

/**
 * La foto de una categoría sacada de sus propios productos.
 *
 * Orden: gana el `id` más chico. Es arbitrario pero ESTABLE: la misma tienda con
 * los mismos productos da siempre la misma foto, sin importar en qué orden
 * vinieron ni cuántas visitas tenga cada uno.
 *
 * Antes el desempate miraba primero la casilla "Destacado" del producto. Esa
 * casilla se sacó del formulario, así que el criterio pasó a ser un dato que
 * nadie puede cambiar: en una tienda que ya tenía destacados marcados, la foto de
 * la baldosa seguiría saliendo de ellos para siempre y sin explicación. Se cae al
 * desempate por `id`, que es el que ya se usaba cuando no había ninguno marcado.
 */
export function fotoDesdeProductos(cat: string, products: ProductoParaBaldosa[]): string | null {
  const deLaCat = products
    .filter(p => p.category === cat && !!p.images[0])
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return deLaCat[0]?.images[0] ?? null;
}

/**
 * Resuelve las baldosas del bloque de categorías.
 *
 * @param categoryTiles  Lo que eligió el dueño en el editor, por posición. Una
 *                       entrada vacía o de una categoría que ya no existe cae al
 *                       comportamiento viejo para ESA posición: así una tienda que
 *                       nunca abrió el editor se sigue viendo igual, y una que
 *                       borró una categoría no queda con una baldosa muerta.
 * @param categoryList   Las categorías reales de la tienda (la misma lista del
 *                       menú del navbar), que es el relleno de las posiciones sin
 *                       elegir.
 */
export function resolverBaldosas(
  categoryTiles: string[] | undefined,
  categoryList: string[],
  products: ProductoParaBaldosa[],
  imageOverrides: Record<string, ImageOverride> | undefined,
): BaldosaCategoria[] {
  const elegidas = categoryTiles ?? [];
  // El relleno no puede repetir una categoría que ya está elegida en otra
  // posición: si el dueño puso "Camperas" en la baldosa 2 y dejó la 1 en
  // automático, la 1 no tiene que ser también Camperas.
  const yaElegidas = new Set(elegidas.filter(c => c && categoryList.includes(c)));
  const relleno = categoryList.filter(c => !yaElegidas.has(c));
  let iRelleno = 0;

  const out: BaldosaCategoria[] = [];
  for (let i = 0; i < MAX_BALDOSAS; i++) {
    const elegida = elegidas[i];
    const cat = (elegida && categoryList.includes(elegida)) ? elegida : relleno[iRelleno++];
    /* Menos categorías que baldosas: se devuelven MENOS de 3. El bloque tiene que
       seguir a la cantidad — con `repeat(3,1fr)` fijo y 2 categorías quedaban dos
       baldosas de un tercio de ancho y un tercio vacío al costado.

       `continue` y NO `break`. Con `break` esta posición vacía se llevaba puestas a
       las que venían después, incluso si tenían una categoría elegida y válida: una
       tienda que quedó con UNA categoría, puesta por el dueño en la baldosa del
       medio, no tenía con qué rellenar la posición 0, cortaba ahí y **el bloque
       entero quedaba vacío**. Saltear la posición deja pasar a las siguientes. */
    if (!cat) continue;

    const field = RANURAS_BALDOSA[i];
    const subida = imageOverrides?.[field]?.url;
    if (subida) {
      out.push({ pos: i, cat, field, img: subida, origen: "subida" });
      continue;
    }
    const delProducto = fotoDesdeProductos(cat, products);
    out.push({
      pos: i, cat, field,
      img: delProducto,
      origen: delProducto ? "producto" : "ninguna",
    });
  }
  return out;
}
