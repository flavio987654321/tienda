/**
 * Con qué grano se dibuja un período: por día, por semana o por mes.
 *
 * El lienzo de los gráficos mide 382 unidades de ancho útil, y esas 382 se
 * reparten entre los puntos del período. Con 90 días le tocan poco más de 4
 * unidades a cada uno —que en un escritorio son unos 5 píxeles y se lee bien—,
 * pero abajo de un píxel por punto la línea deja de ser una línea: los altibajos
 * se pisan entre sí y queda una mancha llena. Se sigue viendo la tendencia
 * general y nada más, que es justo lo que un gráfico no tiene que hacer —
 * parecer que dice algo sin decirlo.
 *
 *     rango      grano     puntos   unidades por punto
 *      90 días    día         90        4,3   ✓
 *       1 año     semana      53        7,3   ✓
 *       3 años    semana     157        2,4   ✗  ← por esto hace falta el mes
 *       3 años    mes         36       10,9   ✓
 *
 * Con el mes, tres años se leen MEJOR que los noventa días de hoy.
 *
 * ── El mismo grano manda en la tabla ─────────────────────────────────────────
 * La tabla del día a día usa esto también, y no por prolijidad: 366 filas son
 * unas nueve hojas de PDF y 1.096 son veintisiete. Nadie lee eso.
 *
 * En los tres presets —7, 30 y 90— no cambia nada: sigue siendo una fila por
 * día, que es exactamente lo que se quiere ver en un mes. El grano recién se
 * mueve cuando se pide un rango largo, donde día por día no se puede leer igual.
 *
 * Lo que NUNCA se agrupa es la cuenta de la que sale la conclusión ("tu mejor
 * día fue el sábado 16/5", "los sábados rinden más"): esa se sigue haciendo
 * sobre los días sueltos. Agruparla primero borraría justamente el patrón que
 * busca.
 *
 * Todo son funciones puras. Los chequeos están en `serie-grafico.check.ts`.
 */

export type Grano = "dia" | "semana" | "mes";

/**
 * Un punto de la curva.
 *
 * Lleva el día crudo ADEMÁS de la etiqueta, y hace falta: `label` es lo que se
 * dibuja en el eje —"12/8"— y con eso no se puede agrupar por mes, porque no
 * dice de qué año es. Agrupando por la etiqueta, el 12/8 de 2025 y el de 2026
 * caerían en el mismo bloque y el gráfico sumaría dos años en un punto.
 */
export type Punto = { dia: string; label: string; value: number };

/**
 * Hasta cuántos días se dibuja punto por día.
 *
 * 120 y no 90 a propósito: los tres presets tienen que seguir dibujándose
 * exactamente igual que siempre. A 120 días todavía son 3,2 unidades por punto,
 * que se banca; de ahí para arriba ya no.
 */
export const DIAS_PARA_SEMANA = 120;

/**
 * A partir de cuántos días se pasa de semana a mes.
 *
 * 550 días por semana son 79 puntos —la misma densidad que la vista de 90 días,
 * que se lee bien—. Más que eso, las semanas empiezan a apretarse.
 */
export const DIAS_PARA_MES = 550;

export function granoPara(dias: number): Grano {
  if (dias > DIAS_PARA_MES) return "mes";
  if (dias > DIAS_PARA_SEMANA) return "semana";
  return "dia";
}

/** Cómo se nombra el grano en pantalla. `null` cuando es por día: ahí no hace falta aclarar nada. */
export function nombreGrano(g: Grano): string | null {
  return g === "mes" ? "por mes" : g === "semana" ? "por semana" : null;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "ago 2026" — corto, para el eje y para la primera columna de la tabla. */
export function etiquetaMes(dia: string): string {
  const [y, m] = dia.split("-").map(Number);
  return `${MESES[m - 1].slice(0, 3)} ${y}`;
}

/**
 * Junta filas en bloques, con el grano pedido.
 *
 * `clave` saca el "YYYY-MM-DD" de cada fila. Se usa igual para las curvas y para
 * la tabla, así el gráfico y las filas de abajo nunca pueden estar cortados en
 * lugares distintos — que sería la peor forma de equivocarse acá, porque los dos
 * se ven bien por separado.
 *
 * ── Semana ──
 * Bloques de 7 arrancando por el PRINCIPIO del período, no por el lunes: el
 * período empieza donde la persona lo pidió, y correr el primer bloque hasta el
 * lunes anterior metería días que quedaron afuera del rango. El último puede
 * tener menos de 7.
 *
 * ── Mes ──
 * Meses de calendario de verdad, no bloques de 30: "julio" es lo que la gente
 * espera ver, y un bloque de 30 días que arranca el 12 no es ningún mes. El
 * primero y el último pueden estar incompletos, y está bien: son el pedazo de
 * ese mes que entra en el período.
 */
export function agrupar<T>(filas: T[], grano: Grano, clave: (f: T) => string): T[][] {
  if (grano === "dia" || filas.length === 0) return filas.map((f) => [f]);

  if (grano === "semana") {
    const bloques: T[][] = [];
    for (let i = 0; i < filas.length; i += 7) bloques.push(filas.slice(i, i + 7));
    return bloques;
  }

  const porMes = new Map<string, T[]>();
  for (const f of filas) {
    const mes = clave(f).slice(0, 7); // "2026-08"
    const bloque = porMes.get(mes);
    if (bloque) bloque.push(f);
    else porMes.set(mes, [f]);
  }
  return [...porMes.values()];
}

/**
 * La serie lista para dibujar.
 *
 * Los valores se SUMAN, no se promedian. Son pesos y cantidades: la suma del
 * bloque es plata que existió. Un promedio diario sería un número que no le pasó
 * a nadie, y encima haría que el eje de un gráfico mensual no se pueda comparar
 * contra el mismo gráfico en 30 días.
 */
export function serieParaGrafico(
  datos: Punto[],
  grano: Grano
): { puntos: Punto[]; grano: Grano } {
  if (grano === "dia") return { puntos: datos, grano };
  const bloques = agrupar(datos, grano, (p) => p.dia);
  return {
    puntos: bloques.map((b) => ({
      dia: b[0].dia,
      // Por semana alcanza con la fecha del primer día —el eje ya mostraba una
      // fecha suelta cada tantos puntos—, pero por mes tiene que decir el mes:
      // "1/8" en un gráfico de tres años no ubica a nadie.
      label: grano === "mes" ? etiquetaMes(b[0].dia) : b[0].label,
      value: b.reduce((s, d) => s + d.value, 0),
    })),
    grano,
  };
}
