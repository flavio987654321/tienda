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
 */
export function irASeccion(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth" });
  const corregir = () => {
    const margen = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (Math.abs(el.getBoundingClientRect().top - margen) > 8) el.scrollIntoView({ behavior: "smooth" });
  };
  // `scrollend` avisa justo cuando terminó; donde no existe (Safari viejo), un tiempo prudente.
  if ("onscrollend" in window) window.addEventListener("scrollend", corregir, { once: true });
  else setTimeout(corregir, 900);
}
