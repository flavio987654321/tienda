/**
 * El detalle diario del período, y —lo que importa— la conclusión que se saca
 * de mirarlo.
 *
 * Existía sólo en el CSV: en pantalla estaban las curvas, que muestran la forma
 * pero no dejan responder "¿cuánto vendí el 14?". Y una tabla de treinta filas
 * puesta y listo tampoco resuelve nada: es honesta y no la lee nadie, y el que
 * la lee saca la conclusión equivocada porque no sabe qué mirar. Por eso acá
 * arriba se calcula lo que hay que decirle antes de mostrarle los números.
 *
 * Todo son funciones puras. Los chequeos están en `dia-a-dia.check.ts`.
 */

/** Un día del período, ya con todo junto. `dia` es "YYYY-MM-DD" argentino. */
export type DiaCrudo = {
  dia: string;
  ingresos: number;
  pedidos: number;
  visitas: number;
  /** `null` = ese día no hay ningún producto con costo cargado. Nunca 0. */
  ganancia: number | null;
};

const NOMBRE_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Día de la semana de un "YYYY-MM-DD", sin pasar por la zona horaria.
 *
 * `new Date("2026-08-12")` se interpreta como medianoche UTC y en Argentina
 * (UTC-3) vuelve como el día anterior: un sábado se informaría como viernes. Con
 * `Date.UTC` sobre las partes ya separadas, la cuenta es sobre el día calendario
 * que se quiso nombrar y no sobre un instante.
 */
export function diaDeLaSemana(dia: string): string {
  const [y, m, d] = dia.split("-").map(Number);
  return NOMBRE_DIA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "12/8" — corto, para las filas de la tabla. */
export function fechaCorta(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
}

/**
 * Cuántas veces tiene que haber caído un día de la semana para hablar de él. Con
 * dos sábados medidos, un solo sábado bueno inventa un patrón que no existe.
 */
export const MINIMO_POR_DIA_SEMANA = 3;

/**
 * Cuánto tiene que despegarse el mejor día de la semana del promedio para
 * nombrarlo. Las ventas son irregulares por naturaleza: si el mejor día vende un
 * 10% más que el promedio, eso es ruido, no un patrón sobre el que valga la pena
 * mover una campaña.
 */
export const DESPEGUE_MINIMO = 1.5;

export type ResumenDias = {
  /** El mejor día por ingresos. `null` si no hubo una sola venta. */
  mejor: DiaCrudo | null;
  /** Promedio de ingresos por día, sobre TODOS los días del período. */
  promedio: number;
  /** Días que cerraron sin una sola venta. */
  sinVentas: number;
  /**
   * El día de la semana que se despega, si hay con qué afirmarlo. `null` cuando
   * faltan repeticiones o cuando ninguno se despega lo suficiente — que es el
   * caso normal, y decir "no hay patrón" es mejor que inventar uno.
   */
  mejorDiaSemana: { nombre: string; promedio: number; veces: number } | null;
};

export function resumirDias(dias: DiaCrudo[]): ResumenDias {
  if (dias.length === 0) {
    return { mejor: null, promedio: 0, sinVentas: 0, mejorDiaSemana: null };
  }

  const totalIngresos = dias.reduce((s, d) => s + d.ingresos, 0);
  const promedio = totalIngresos / dias.length;

  const conVentas = dias.filter((d) => d.ingresos > 0);
  const mejor = conVentas.length > 0
    ? conVentas.reduce((a, b) => (b.ingresos > a.ingresos ? b : a))
    : null;

  // Por día de la semana. Se promedia sobre las veces que ese día CAYÓ en el
  // período, no sobre los que tuvieron venta: un lunes en cero es información
  // sobre los lunes, y sacarlo del promedio los haría ver mejores de lo que son.
  const porDiaSemana = new Map<string, { suma: number; veces: number; conVenta: number }>();
  for (const d of dias) {
    const nombre = diaDeLaSemana(d.dia);
    const acum = porDiaSemana.get(nombre) ?? { suma: 0, veces: 0, conVenta: 0 };
    acum.suma += d.ingresos;
    acum.veces++;
    if (d.ingresos > 0) acum.conVenta++;
    porDiaSemana.set(nombre, acum);
  }

  let mejorDiaSemana: ResumenDias["mejorDiaSemana"] = null;
  if (promedio > 0) {
    const candidatos = [...porDiaSemana.entries()]
      .filter(([, a]) =>
        a.veces >= MINIMO_POR_DIA_SEMANA &&
        // Y que haya vendido la MAYORÍA de las veces que cayó. Sin esto, un lunes
        // de $200.000 y tres lunes en cero promedian $50.000 y se anuncian como
        // "tu mejor día": un pico no es un patrón, y el promedio solo no los
        // distingue. Un patrón es algo que se repite.
        a.conVenta * 2 > a.veces
      )
      .map(([nombre, a]) => ({ nombre, promedio: a.suma / a.veces, veces: a.veces }))
      .sort((a, b) => b.promedio - a.promedio);
    const top = candidatos[0];
    if (top && top.promedio >= promedio * DESPEGUE_MINIMO) mejorDiaSemana = top;
  }

  return {
    mejor,
    promedio,
    sinVentas: dias.filter((d) => d.ingresos === 0).length,
    mejorDiaSemana,
  };
}
