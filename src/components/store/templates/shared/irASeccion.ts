/**
 * Bajar a una sección desde el menú (08/10/26), compartido por los templates de
 * autos.
 *
 * Dos cosas que `scrollIntoView` solo no resolvía:
 *
 * 1. La barra de arriba es fija. Sin `scroll-margin-top` en las secciones (lo
 *    pone cada template con la altura de SU barra), el título quedaba debajo de
 *    ella: se tocaba "Vehículos" y no se veía "Vehículos".
 * 2. Lo de arriba puede terminar de cargar mientras se baja (el catálogo pasa
 *    del esqueleto a las tarjetas, entran las fotos) y corre la sección: se
 *    llegaba 2000px antes de "Nosotros". Al terminar de bajar se mira dónde
 *    quedó y, si se movió, se corrige una vez.
 *
 * Quién hace el scroll no es siempre la ventana: en el editor de Diseño la
 * tienda vive adentro de un recuadro con su propia barra. Se mide contra el
 * que corresponda.
 */

/** El recuadro con scroll más cercano, o null si el que baja es la ventana. */
function contenedorConScroll(el: HTMLElement): HTMLElement | null {
  for (let n = el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

export function irASeccion(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const caja = contenedorConScroll(el);

  /* Si está donde tiene que estar. La última sección (Contacto) nunca llega
     arriba de todo: la página se termina antes. Por eso se compara contra
     hasta dónde SE PUEDE bajar, no contra el borde de arriba. */
  const fuera = () => {
    const margen = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const posicion = caja ? caja.scrollTop : window.scrollY;
    const arriba = caja ? caja.getBoundingClientRect().top : 0;
    const tope = caja ? caja.scrollHeight - caja.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
    const destino = Math.min(Math.max(0, posicion + el.getBoundingClientRect().top - arriba - margen), tope);
    return Math.abs(destino - posicion) > 8;
  };
  // Ya está ahí: no se mueve nada, y no hay que esperar a que "termine de bajar".
  if (!fuera()) return;
  el.scrollIntoView({ behavior: "smooth" });

  /* La corrección espera a que termine de bajar, pero no para siempre: si se
     quedara colgada, el próximo scroll de la persona (con el dedo, a otra parte)
     la devolvería de golpe a esta sección. A los 2 segundos se olvida. */
  const quien: HTMLElement | Window = caja ?? window;
  let hecho = false;
  const corregir = () => {
    if (hecho) return;
    hecho = true;
    quien.removeEventListener("scrollend", corregir);
    if (fuera()) el.scrollIntoView({ behavior: "smooth" });
  };
  if ("onscrollend" in window) {
    quien.addEventListener("scrollend", corregir, { once: true });
    setTimeout(() => { hecho = true; quien.removeEventListener("scrollend", corregir); }, 2000);
  } else {
    // Sin `scrollend` (Safari viejo): un tiempo prudente.
    setTimeout(corregir, 900);
  }
}
