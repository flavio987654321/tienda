import { getStoreType, type StoreType } from "@/lib/storeTypes";
import { ARTICULOS } from "./articulos";
import { PANTALLAS } from "./pantallas";
import { GRUPOS, type Articulo, type Grupo } from "./tipos";

export { ARTICULOS, GRUPOS };
export type { Articulo, Grupo };
export type { Bloque, Clase } from "./tipos";

export function buscarArticulo(slug: string): Articulo | undefined {
  return ARTICULOS.find((a) => a.slug === slug);
}

/* Los artículos que le sirven a una tienda, según venda con carrito o por
 * consulta. El modo sale de la config del rubro, no de una lista escrita acá.
 *
 * Sin rubro —la ayuda pública, donde el lector todavía no tiene tienda—
 * devuelve todo: ahí no hay a quién filtrarle nada, y esconderle la mitad a
 * alguien que está evaluando la plataforma sería peor. */
export function articulosDe(rubro?: StoreType): Articulo[] {
  if (!rubro) return ARTICULOS;
  const modo = getStoreType(rubro).checkoutMode;
  return ARTICULOS.filter((a) => !a.checkout || a.checkout === modo);
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
