import type { ColorTextoRango } from "@/types/store-config";

function normalizar(rangos: ColorTextoRango[]): ColorTextoRango[] {
  const ordenados = rangos
    .filter((r) => Number.isInteger(r.inicio) && Number.isInteger(r.fin) && r.inicio >= 0 && r.fin > r.inicio && /^#[\da-f]{6}$/i.test(r.color))
    .sort((a, b) => a.inicio - b.inicio);
  const salida: ColorTextoRango[] = [];
  for (const rango of ordenados) {
    const anterior = salida[salida.length - 1];
    if (anterior && anterior.fin === rango.inicio && anterior.color.toLowerCase() === rango.color.toLowerCase()) {
      salida[salida.length - 1] = { ...anterior, fin: rango.fin };
    } else {
      salida.push(rango);
    }
  }
  return salida;
}

/** Pinta una selección y conserva las partes que quedaban fuera de ella. */
export function colorearRangoTexto(
  rangos: ColorTextoRango[] | undefined,
  inicio: number,
  fin: number,
  color?: string,
): ColorTextoRango[] {
  if (fin <= inicio) return rangos ?? [];
  const salida: ColorTextoRango[] = [];
  for (const rango of rangos ?? []) {
    if (rango.fin <= inicio || rango.inicio >= fin) {
      salida.push(rango);
      continue;
    }
    if (rango.inicio < inicio) salida.push({ ...rango, fin: inicio });
    if (rango.fin > fin) salida.push({ ...rango, inicio: fin });
  }
  if (color && /^#[\da-f]{6}$/i.test(color)) salida.push({ inicio, fin, color });
  return normalizar(salida);
}

/** Ajusta los rangos al texto nuevo; lo que se editó pierde sólo su formato local. */
export function ajustarRangosColorTexto(
  rangos: ColorTextoRango[] | undefined,
  anterior: string,
  nuevo: string,
): ColorTextoRango[] {
  if (!rangos?.length || anterior === nuevo) return rangos ?? [];
  let prefijo = 0;
  while (prefijo < anterior.length && prefijo < nuevo.length && anterior[prefijo] === nuevo[prefijo]) prefijo++;
  let sufijo = 0;
  while (sufijo < anterior.length - prefijo && sufijo < nuevo.length - prefijo &&
    anterior[anterior.length - 1 - sufijo] === nuevo[nuevo.length - 1 - sufijo]) sufijo++;
  const finAnterior = anterior.length - sufijo;
  const cambio = nuevo.length - anterior.length;
  const salida: ColorTextoRango[] = [];
  for (const rango of rangos) {
    const finAntes = Math.min(rango.fin, prefijo);
    if (rango.inicio < finAntes) salida.push({ ...rango, fin: finAntes });
    const inicioDespues = Math.max(rango.inicio, finAnterior);
    if (rango.fin > inicioDespues) salida.push({ ...rango, inicio: inicioDespues + cambio, fin: rango.fin + cambio });
  }
  return normalizar(salida);
}
