/**
 * Las únicas medidas de ícono que se componen, y por qué es una lista y no un
 * rango.
 *
 * Son las que piden los manifiestos (192 y 512) y la metadata de iOS (180). Todo
 * lo demás cae a 512.
 *
 * Antes las rutas aceptaban cualquier número entre 16 y 1024, y eso traía dos
 * problemas, los dos comprobados pegándole a la ruta:
 *
 *   - `?size=abc` o `?size=` daban NaN. El clamp no lo arregla —`Math.max(NaN,
 *     16)` sigue siendo NaN— así que fallaba la composición Y fallaba el ícono de
 *     respaldo, y la ruta contestaba 500.
 *
 *   - Cada medida distinta es una imagen distinta, así que la CDN no la tiene
 *     guardada y hay que componerla de cero: leer el logo, recortarlo, escalarlo
 *     y recorrerlo píxel por píxel para centrarlo — y en el ícono de las tiendas,
 *     además, salir a la red a buscar el logo del comerciante. Pidiendo
 *     `size=1023`, `1022`, `1021`… cualquiera hace trabajar al servidor todo lo
 *     que quiera, sin sesión y sin límite.
 *
 * Con una lista corta el conjunto de respuestas es finito: la CDN las guarda
 * todas y la basura no cuesta nada. Agregar una medida es agregarla acá.
 *
 * Vive en su propio archivo y no junto al compositor para que las rutas que sólo
 * necesitan validar la medida no se arrastren `sharp` en el bundle.
 */

const MEDIDAS = [180, 192, 512] as const;
const POR_DEFECTO = 512;

export function medidaPermitida(crudo: string | null): number {
  const n = Number(crudo);
  return MEDIDAS.includes(n as (typeof MEDIDAS)[number]) ? n : POR_DEFECTO;
}
