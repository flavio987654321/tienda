import type { StoreType } from "@/lib/storeTypes";
import { ARTICULOS } from "./articulos";
import { PANTALLAS } from "./pantallas";
import { GRUPOS, type Articulo, type Grupo } from "./tipos";

export { ARTICULOS, GRUPOS };
export type { Articulo, Grupo };
export type { Bloque, Clase } from "./tipos";

export function buscarArticulo(slug: string): Articulo | undefined {
  return ARTICULOS.find((a) => a.slug === slug);
}

/* Filtro por rubro, con la misma regla que el menú del panel: `onlyFor` y
 * `hiddenFor`. Si el panel no le muestra Promociones a una inmobiliaria, la
 * ayuda tampoco puede explicárselas — mandarla a una pantalla que no tiene es
 * peor que no decirle nada.
 *
 * Sin rubro (la ayuda pública, donde el lector todavía no tiene tienda) devuelve
 * todo: ahí no hay a quién filtrarle nada. */
export function articulosDe(rubro?: StoreType): Articulo[] {
  if (!rubro) return ARTICULOS;
  return ARTICULOS.filter((a) => {
    if (a.soloPara && !a.soloPara.includes(rubro)) return false;
    if (a.exceptoPara?.includes(rubro)) return false;
    return true;
  });
}

/* El índice agrupado. Se saltean los grupos vacíos: un título con nada abajo
 * hace pensar que la página se rompió. */
export function porGrupo(rubro?: StoreType) {
  const disponibles = articulosDe(rubro);
  return GRUPOS.map((g) => ({
    ...g,
    articulos: disponibles.filter((a) => a.grupo === g.key),
  })).filter((g) => g.articulos.length > 0);
}

/* Que la tabla liviana de `pantallas.ts` no se separe de los artículos.
 *
 * Esa tabla existe para que el `?` del panel no se baje los diecisiete
 * artículos enteros, y el precio de tenerla es el slug y el título repetidos.
 * Repetido no es problema; repetido y desactualizado en silencio, sí — una
 * ayuda que promete un artículo y abre otro es peor que no ofrecer nada.
 *
 * Corre solo fuera de producción, cuando se renderiza el centro de ayuda.
 * No tira: avisa por consola, que es lo que se ve mientras se trabaja. */
function verificarPantallas() {
  if (process.env.NODE_ENV === "production") return;
  for (const p of PANTALLAS) {
    const articulo = buscarArticulo(p.slug);
    if (!articulo) {
      console.warn(`[ayuda] ${p.href} apunta a "${p.slug}", que no existe.`);
    } else if (articulo.titulo !== p.titulo) {
      console.warn(`[ayuda] el título de "${p.slug}" cambió — actualizá pantallas.ts.`);
    } else if (articulo.pantalla?.href !== p.href) {
      console.warn(`[ayuda] "${p.slug}" ya no declara la pantalla ${p.href}.`);
    }
  }
}
verificarPantallas();

export function relacionadosDe(articulo: Articulo): Articulo[] {
  return (articulo.relacionados ?? [])
    .map(buscarArticulo)
    .filter((a): a is Articulo => Boolean(a));
}
