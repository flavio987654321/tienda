// ─────────────────────────────────────────────────────────────────────────────
// El filtro Mujer / Hombre del menú, decidido por el catálogo real.
//
// Los cuatro templates de Moda tenían los dos botones escritos a mano, siempre
// visibles. Con el filtro que usan:
//
//     if (activeGender && p.gender !== activeGender && p.gender !== "unisex") ...
//
// una tienda cuyos productos están todos en `unisex` —el valor por defecto, o
// sea cualquiera que no haya tocado ese campo— tenía DOS BOTONES MUERTOS en el
// lugar más visible del menú: tocar "Mujer" mostraba todo y tocar "Hombre"
// mostraba todo. Es el caso de cualquier marca de joyas, lentes o bolsos.
//
// Al revés pasa en lencería: casi todo es "mujer", y "Hombre" deja la pantalla
// vacía.
//
// Un filtro sirve cuando puede partir el catálogo en dos. Si no puede, no va.
// ─────────────────────────────────────────────────────────────────────────────

import { isDemoProductId } from "./demoProducts";

export type ProductoConGenero = { id: string; gender?: string };

/**
 * ¿Vale la pena mostrar el filtro de género?
 *
 * Solo si hay productos de mujer Y de hombre. Con uno solo de los dos —o con
 * todo en unisex— el filtro no separa nada: "Mujer" y "Hombre" devuelven
 * exactamente lo mismo, porque los unisex pasan siempre.
 *
 * Se decide con los productos REALES, no con los de relleno del editor. En el
 * editor los demos se AGREGAN a los reales (`[...real, ...demoPool]`) y el pool
 * de moda trae mujer y hombre: sin esto, una tienda de joyas veía los botones
 * mientras la acomodaba y no los veía en su tienda publicada. El editor no puede
 * mostrar algo distinto de lo que van a ver los clientes.
 *
 * Con cero productos reales sí se mira el relleno: es una tienda recién creada,
 * todavía no hay catálogo del que deducir nada, y lo que se ve en pantalla en
 * ese momento son justamente los demos.
 */
export function catalogoTieneGeneros(products: ProductoConGenero[]): boolean {
  const reales = products.filter(p => !isDemoProductId(p.id));
  const base = reales.length > 0 ? reales : products;

  let hayMujer = false;
  let hayHombre = false;
  for (const p of base) {
    if (p.gender === "mujer") hayMujer = true;
    else if (p.gender === "hombre") hayHombre = true;
    if (hayMujer && hayHombre) return true;
  }
  return false;
}
