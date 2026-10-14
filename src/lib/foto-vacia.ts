/**
 * Lo que se ve en lugar de la foto de un vehículo que no tiene (14/10/26).
 *
 * Antes era una foto de Unsplash de un auto cualquiera, con el nombre del
 * vehículo de la tienda como texto alternativo: el comprador veía OTRO auto
 * presentado como el que está a la venta. Ahora es un recuadro gris neutro que
 * dice "Sin foto", liviano (va en línea, no se descarga nada) y que queda bien
 * sobre fondo claro u oscuro.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice">`
  + `<rect width="160" height="110" fill="#3a3f47"/>`
  + `<text x="80" y="59" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="9" letter-spacing="1.5" fill="#c3c8d0">SIN FOTO</text>`
  + `</svg>`;

export const FOTO_VACIA = `data:image/svg+xml,${encodeURIComponent(SVG)}`;
