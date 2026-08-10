/**
 * Qué período mira Métricas, y contra qué lo compara.
 *
 * Hasta acá eran tres botones —7, 30 y 90 días— y una regla fija: se compara
 * contra los N días inmediatamente anteriores. Eso deja afuera las dos preguntas
 * que más se hacen en una tienda:
 *
 *   "¿cómo me fue del 1 al 15 de marzo?"  → no había forma de pedirlo
 *   "¿cómo venimos contra el año pasado?" → el dato está guardado y no se podía
 *                                            mirar
 *
 * La segunda es la que más duele: una tienda de ropa comparando diciembre contra
 * noviembre siempre va a parecer un éxito, y no dice nada. Contra el diciembre
 * anterior sí.
 *
 * Todo son funciones puras: entran strings de la URL, sale un período resuelto.
 * Los chequeos están en `rango-fechas.check.ts`.
 *
 * ── Por qué todo pasa por acá ────────────────────────────────────────────────
 * La pantalla de Métricas deriva TODO de estas fechas: las queries, el eje de
 * los gráficos, el día a día, el resumen en texto, el CSV y el PDF. Con la
 * cuenta desparramada, un rango a medida hubiera necesitado tocar veinte lugares
 * y alguno se hubiera quedado con la vieja — y no avisaría: mostraría un número
 * de otro período, perfectamente creíble.
 */

/** Contra qué se compara el período elegido. */
export type Comparacion = "anterior" | "anio";

/** Los tres botones de siempre. Siguen siendo el camino corto. */
export const PRESETS = [7, 30, 90] as const;
export type Preset = (typeof PRESETS)[number];
export const NOMBRE_PRESET: Record<Preset, string> = { 7: "7 días", 30: "30 días", 90: "90 días" };

/**
 * El rango más largo que se acepta.
 *
 * No es una restricción de la base —los pedidos están todos— sino de la
 * pantalla: el día a día dibuja una fila por día, y arriba de un año son más de
 * 366 filas en una tarjeta. Además el `cleanup` borra las visitas de más de un
 * año, así que un rango más largo mostraría ingresos sin las visitas al lado y
 * la conversión daría cualquier cosa.
 */
export const MAX_DIAS = 366;

export type Periodo = {
  /** "YYYY-MM-DD" argentino, inclusive. */
  desde: string;
  /** "YYYY-MM-DD" argentino, inclusive. */
  hasta: string;
  /** Días de calendario que abarca, contando los dos extremos. */
  dias: number;
};

export type RangoResuelto = {
  actual: Periodo;
  anterior: Periodo;
  comparacion: Comparacion;
  /** El preset elegido, o `null` si es un rango a medida. */
  preset: Preset | null;
  /**
   * `true` si el período llega hasta hoy, o sea que el último día va por la
   * mitad. Con un período cerrado del pasado no hay medio día que descontar y
   * varias correcciones de la pantalla dejan de aplicar.
   */
  incluyeHoy: boolean;
  /** Cómo nombrarlo arriba de los KPI. */
  etiqueta: string;
  /**
   * Qué se tuvo que corregir de lo que vino en la URL. `null` si estaba todo
   * bien. Se muestra: un rango recortado en silencio son números de un período
   * distinto al que la persona pidió.
   */
  aviso: string | null;
};

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/** ¿Es un "YYYY-MM-DD" que además existe en el calendario? */
export function esDiaValido(dia: string | undefined | null): dia is string {
  if (!dia || !FORMATO.test(dia)) return false;
  const [y, m, d] = dia.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  // El día 0 del mes siguiente es el último del mes pedido, sin tabla de meses
  // y con los bisiestos ya resueltos.
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= ultimo && y >= 2000 && y <= 2999;
}

/** Días entre dos "YYYY-MM-DD", contando los dos extremos. */
export function diasDelRango(desde: string, hasta: string): number {
  const a = Date.UTC(...(desde.split("-").map(Number) as [number, number, number]));
  const b = Date.UTC(...(hasta.split("-").map(Number) as [number, number, number]));
  // Se arma con Date.UTC sobre las partes ya separadas y no con `new Date(str)`,
  // que es medianoche UTC y en Argentina vuelve como el día anterior.
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Suma (o resta) días de calendario a un "YYYY-MM-DD". */
function sumarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/**
 * El mismo día del año anterior.
 *
 * El 29 de febrero no existe en un año común, y `new Date` lo empuja al 1 de
 * marzo sin decir nada: un informe del 29/2 se compararía contra el 1/3 y nadie
 * se enteraría. Se cae al 28, que es el último día de ese febrero.
 */
export function mismoDiaElAnioPasado(dia: string): string {
  const [y, m, d] = dia.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return `${y - 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
}

/** "12/8/2026" */
export function fechaLarga(dia: string): string {
  const [y, m, d] = dia.split("-");
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
}

export type ParamsRango = {
  range?: string;
  desde?: string;
  hasta?: string;
  comparar?: string;
};

/**
 * Resuelve lo que vino en la URL a un período concreto y su comparación.
 *
 * Nunca falla ni redirige: cualquier cosa rara cae al preset de 30 días con un
 * aviso. Es una pantalla de sólo lectura y romperla porque alguien editó la
 * barra de direcciones sería peor que mostrarle otro rango y decírselo.
 */
export function resolverRango(params: ParamsRango, hoy: string): RangoResuelto {
  const comparacion: Comparacion = params.comparar === "anio" ? "anio" : "anterior";
  const avisos: string[] = [];

  let desde: string;
  let hasta: string;
  let preset: Preset | null = null;

  const pidioRangoAMedida = params.desde !== undefined || params.hasta !== undefined;

  if (pidioRangoAMedida) {
    // Sin uno de los dos extremos no hay rango. Se avisa en vez de adivinar el
    // que falta: adivinar da un período que la persona no pidió y que se ve
    // igual de creíble que el correcto.
    if (!esDiaValido(params.desde) || !esDiaValido(params.hasta)) {
      avisos.push("Las fechas no se entendieron, así que se muestran los últimos 30 días.");
      preset = 30;
      hasta = hoy;
      desde = sumarDias(hoy, -29);
    } else {
      desde = params.desde;
      hasta = params.hasta;

      // Al revés: se dan vuelta en vez de rechazar. Es lo que la persona quiso.
      if (desde > hasta) {
        [desde, hasta] = [hasta, desde];
        avisos.push("La fecha de inicio era posterior a la de fin, así que se dieron vuelta.");
      }

      // Un rango que termina en el futuro no tiene datos y hunde todos los
      // promedios con días vacíos que todavía no pasaron.
      if (hasta > hoy) {
        hasta = hoy;
        avisos.push("La fecha de fin era futura, así que se recortó a hoy.");
      }
      if (desde > hoy) {
        desde = hoy;
      }

      if (diasDelRango(desde, hasta) > MAX_DIAS) {
        desde = sumarDias(hasta, -(MAX_DIAS - 1));
        avisos.push(`El rango era de más de ${MAX_DIAS} días, así que se recortó a ${MAX_DIAS}.`);
      }
    }
  } else {
    const pedido = Number(params.range);
    preset = (PRESETS as readonly number[]).includes(pedido) ? (pedido as Preset) : 30;
    hasta = hoy;
    desde = sumarDias(hoy, -(preset - 1));
  }

  const dias = diasDelRango(desde, hasta);

  // ── El período contra el que se compara ──
  let anterior: Periodo;
  if (comparacion === "anio") {
    // Mismas fechas, un año antes, y con la MISMA cantidad de días. Conservar
    // el largo importa más que caer en la fecha exacta: si un año trae un día
    // más que el otro, la comparación le regala una jornada de ventas a uno de
    // los dos lados.
    const antDesde = mismoDiaElAnioPasado(desde);
    anterior = { desde: antDesde, hasta: sumarDias(antDesde, dias - 1), dias };
  } else {
    const antHasta = sumarDias(desde, -1);
    anterior = { desde: sumarDias(antHasta, -(dias - 1)), hasta: antHasta, dias };
  }

  return {
    actual: { desde, hasta, dias },
    anterior,
    comparacion,
    preset,
    incluyeHoy: hasta === hoy,
    etiqueta: preset !== null ? NOMBRE_PRESET[preset] : `${fechaLarga(desde)} a ${fechaLarga(hasta)}`,
    aviso: avisos.length > 0 ? avisos.join(" ") : null,
  };
}

/** Cómo se nombra el período de comparación en pantalla. */
export function etiquetaComparacion(r: RangoResuelto): string {
  if (r.comparacion === "anio") return "el mismo período del año pasado";
  return r.preset !== null
    ? `los ${r.actual.dias} días anteriores`
    : `los ${r.actual.dias} días anteriores (${fechaLarga(r.anterior.desde)} a ${fechaLarga(r.anterior.hasta)})`;
}
