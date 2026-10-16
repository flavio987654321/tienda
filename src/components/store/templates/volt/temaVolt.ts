/**
 * Los colores de la portada de Auto Volt, para usarla también sobre fondo claro.
 *
 * Nació oscura, con los colores escritos a mano. El 16/10/26 Flavio pidió la
 * portada de Volt en Auto Drive, que es claro: en vez de copiarla (dos copias
 * que se desincronizan), la portada recibe un tema. A Volt no le cambia nada: queda
 * con el oscuro de siempre. (Se probaron también el showroom y el comparador en
 * claro, y se sacaron: Drive no tenía que quedar igual a Volt.)
 */
export type TemaVolt = {
  claro: boolean;
  /** El fondo de la portada. */
  fondo: string;
  /** Las opciones de los desplegables. */
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
