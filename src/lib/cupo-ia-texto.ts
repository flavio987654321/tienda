/**
 * Cómo se dice cuándo vuelve la bolsa de IA. Aparte de `cupo-ia` porque lo usan
 * las pantallas del navegador, y `cupo-ia` habla con la base.
 *
 * Desde el 03/10/26 la bolsa vuelve cada 30 días desde que se pagó, no el 1°
 * del mes: por eso se dice la fecha —"el 25 de noviembre"— y no "el 1°".
 */
export function cuandoVuelven(renuevaEl: string): string {
  const fecha = new Date(renuevaEl);
  if (Number.isNaN(fecha.getTime())) return "con el próximo ciclo";
  return `el ${fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" })}`;
}
