// ─────────────────────────────────────────────────────────────────────────────
// Selección de "Lo más visto" para la tienda pública.
//
// Vive acá y no en cada template porque los 4 de Moda (ChicParis, FashionNoir,
// BohoTerra, UrbanPulse) tenían la MISMA lógica copiada, con el mismo problema:
// arrancaban filtrando por `featured` y solo caían al catálogo completo si no
// había ninguno destacado. O sea que marcando un solo producto como destacado, la
// sección dejaba de ser "lo más visto" y pasaba a ser "mis destacados" —
// silenciosamente, y sin que el título ni el kicker ("Tendencia") cambiaran.
//
// Destacado y más visto son dos cosas distintas: uno lo elige la dueña, el otro lo
// eligen los compradores. Mezclarlos hacía que la sección afirmara algo que no
// estaba midiendo.
//
// La casilla "Destacado" del formulario de producto ya no existe (se sacó entera:
// qué muestra un bloque de la portada se decide desde el editor de diseño). Este
// módulo no cambia por eso — nunca la miró, justamente.
// ─────────────────────────────────────────────────────────────────────────────

export type ProductoConVistas = { id: string; name: string; viewCount?: number };

/**
 * Mínimo de productos con vistas reales para mostrar la sección.
 *
 * Con menos que esto el "ranking" no dice nada —y encima la grilla de 4 columnas
 * queda coja—, así que es preferible no mostrarla. Aparece sola cuando la tienda
 * junta tráfico de verdad.
 */
export const MIN_MAS_VISTOS = 3;

/** Tope de la grilla; el resto se ve con "Ver más". */
export const MAX_MAS_VISTOS = 8;

export type MasVistosResult<T> = {
  /** Los que se muestran, del más visto al menos visto. */
  lista: T[];
  /** Cuántos productos tienen al menos una vista (para decidir el "Ver más"). */
  conVistas: number;
  /** true cuando no hay datos reales y se está rellenando para el editor. */
  esRelleno: boolean;
};

/**
 * Los productos más vistos por los compradores.
 *
 * `relleno` es para el EDITOR: ahí la dueña necesita ver la sección para poder
 * configurarla aunque su tienda todavía no tenga vistas. En la tienda real nunca
 * se rellena — mostrar productos cualesquiera bajo el título "Lo más visto" es
 * afirmar algo falso.
 */
export function masVistos<T extends ProductoConVistas>(
  products: T[],
  opts?: { relleno?: boolean }
): MasVistosResult<T> {
  // Desempate por nombre: con casi todo el catálogo en 0 o 1 vista los empates son
  // la norma, y sin un criterio estable el orden cambiaba entre recargas según
  // cómo viniera la consulta.
  const ordenar = (list: T[]) =>
    [...list].sort(
      (a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0) || a.name.localeCompare(b.name)
    );

  const vistos = products.filter((p) => (p.viewCount ?? 0) > 0);

  if (vistos.length >= MIN_MAS_VISTOS) {
    return { lista: ordenar(vistos).slice(0, MAX_MAS_VISTOS), conVistas: vistos.length, esRelleno: false };
  }

  return {
    lista: opts?.relleno ? ordenar(products).slice(0, MAX_MAS_VISTOS) : [],
    conVistas: vistos.length,
    esRelleno: true,
  };
}
