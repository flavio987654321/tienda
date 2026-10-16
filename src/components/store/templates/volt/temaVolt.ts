/**
 * Los colores de las piezas de Auto Volt (portada, showroom, comparador, tira),
 * para poder usarlas también sobre fondo claro.
 *
 * Nacieron oscuras, con los colores escritos a mano. El 16/10/26 Flavio pidió
 * llevar la portada, el showroom que gira y el comparador a Auto Drive, que es
 * claro: en vez de copiarlas (dos copias que se desincronizan), cada pieza
 * recibe un tema. Volt no pasa nada y queda con el oscuro de siempre.
 */
export type TemaVolt = {
  claro: boolean;
  /** El fondo de la portada y del showroom. */
  fondo: string;
  /** Tablas y tarjetas (el comparador). */
  panel: string;
  /** Lo que se ve detrás de una foto mientras carga o si no hay. */
  hondo: string;
  /** El texto principal. */
  tinta: string;
  /** Texto secundario: etiquetas, bajadas, lo tachado. */
  tenue: (a: number) => string;
  /** Bordes y líneas. */
  linea: (a: number) => string;
  /** Fondos translúcidos sobre la foto: campos, flechas, carteles de datos. */
  vidrio: (a: number) => string;
  /** El resplandor del acento detrás de textos y precios: en claro ensucia. */
  brillo: boolean;
};

export const TEMA_OSCURO: TemaVolt = {
  claro: false,
  fondo: "#05070d",
  panel: "#0a0e19",
  hondo: "#03040a",
  tinta: "#ffffff",
  tenue: (a) => `rgba(232,236,246,${a})`,
  linea: (a) => `rgba(255,255,255,${a})`,
  vidrio: (a) => `rgba(8,11,21,${a})`,
  brillo: true,
};

/* En claro, los mismos pesos se ven más flojos sobre blanco: el texto tenue
   sube un poco y los bordes bajan, para que se lean igual que en oscuro. */
export const TEMA_CLARO: TemaVolt = {
  claro: true,
  fondo: "#f4f7fb",
  panel: "#ffffff",
  hondo: "#e2e8f0",
  tinta: "#0f172a",
  tenue: (a) => `rgba(15,23,42,${Math.min(1, a + 0.12).toFixed(2)})`,
  linea: (a) => `rgba(15,23,42,${(a * 0.75).toFixed(3)})`,
  vidrio: (a) => `rgba(255,255,255,${Math.min(1, a + 0.12).toFixed(2)})`,
  brillo: false,
};
