/**
 * Cuándo una curva deja de leerse por día y hay que juntarla por semana.
 *
 * El lienzo de los gráficos mide 382 unidades de ancho útil, y esas 382 se
 * reparten entre los días del período. Con 90 días le tocan poco más de 4
 * unidades a cada uno —que en un escritorio son unos 5 píxeles y se lee bien—,
 * pero el rango a medida llega hasta 366:
 *
 *     90 días  → 4,3 unidades por día  (≈5 px en escritorio, 3,4 en un teléfono)
 *    366 días  → 1,0 unidad  por día  (≈1,2 px, y 0,7 en un teléfono)
 *
 * Abajo de un píxel por día la línea deja de ser una línea: los altibajos
 * diarios se pisan entre sí y queda una mancha llena. Se sigue viendo la
 * tendencia general y nada más, que es justo lo que un gráfico no tiene que
 * hacer — parecer que dice algo sin decirlo.
 *
 * Juntando por semana, un año son 53 puntos: la misma densidad que tiene hoy la
 * vista de 90 días, que se lee bien.
 *
 * ── Lo que NO se toca ────────────────────────────────────────────────────────
 * La tabla del "día a día" sigue siendo una fila por día. Son dos preguntas
 * distintas: el gráfico contesta "¿cómo vengo?" y la tabla contesta "¿cuánto
 * vendí el 14?". La segunda no se puede contestar con un promedio semanal, y en
 * una tabla no molesta tener 366 filas porque se scrollea y se busca.
 *
 * Todo son funciones puras. Los chequeos están en `serie-grafico.check.ts`.
 */

export type Punto = { label: string; value: number };

/**
 * A partir de cuántos días se junta por semana.
 *
 * 120 y no 90 a propósito: los tres presets —7, 30 y 90— tienen que seguir
 * dibujándose exactamente igual que siempre. Sólo cambia el rango a medida
 * cuando se pide largo de verdad. A 120 días todavía son 3,2 unidades por día,
 * que se banca; de ahí para arriba ya no.
 */
export const DIAS_PARA_AGRUPAR = 120;

export function convieneAgrupar(dias: number): boolean {
  return dias > DIAS_PARA_AGRUPAR;
}

/**
 * Junta una serie diaria en semanas de 7, arrancando por el principio.
 *
 * Las semanas se cuentan desde el primer día del período y no desde el lunes: el
 * período empieza donde la persona lo pidió, y correr el primer bloque hasta el
 * lunes anterior metería días que quedaron afuera del rango. La última puede
 * tener menos de 7 días y se etiqueta igual.
 *
 * Los valores se SUMAN, no se promedian. Son pesos y cantidades: la suma de la
 * semana es una plata que existió. Un promedio diario sería un número que no le
 * pasó a nadie, y encima haría que el eje de un gráfico semanal no se pueda
 * comparar contra el mismo gráfico en 30 días.
 */
export function agruparPorSemana(datos: Punto[]): Punto[] {
  const salida: Punto[] = [];
  for (let i = 0; i < datos.length; i += 7) {
    const bloque = datos.slice(i, i + 7);
    salida.push({
      // La etiqueta es el primer día del bloque. En el eje ya se venía mostrando
      // una fecha suelta cada tantos puntos, así que no cambia cómo se lee.
      label: bloque[0].label,
      value: bloque.reduce((s, d) => s + d.value, 0),
    });
  }
  return salida;
}

/** La serie lista para dibujar: por día si entra, por semana si no. */
export function serieParaGrafico(datos: Punto[]): { puntos: Punto[]; porSemana: boolean } {
  return convieneAgrupar(datos.length)
    ? { puntos: agruparPorSemana(datos), porSemana: true }
    : { puntos: datos, porSemana: false };
}
