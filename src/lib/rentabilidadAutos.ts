/**
 * Rentabilidad y días en stock de una concesionaria (06/10/26).
 *
 * Una agencia vive de la rotación: un auto parado es plata parada. Estadísticas
 * ya mostraba la ganancia de lo VENDIDO en un período; esto mira cada unidad:
 * cuánto hay invertido, cuánto deja al precio publicado, cuántos días lleva y
 * si está estancada.
 *
 * Todo sale de datos que ya existían: los gastos del vehículo (con la
 * "Compra" adentro), el precio, y el precio y la fecha de venta. Sin columnas
 * nuevas.
 *
 * ⚠️ Sin gastos cargados no hay costo, y sin costo no hay margen: se muestra
 * "sin costo", NUNCA un margen del 100 %. Es la misma regla que ya usaba
 * Estadísticas (ver `calcVehicleProfit` y su uso ahí).
 *
 * Sin nada de servidor: lo usan la pantalla y su chequeo.
 */
import { calcVehicleCostTotal } from "@/lib/margin";

export const DIA_MS = 86_400_000;
/** Un auto con estos días en stock está estancado, tenga consultas o no. */
export const DIAS_ESTANCADO = 60;
/** Y con estos días, si en los últimos 30 nadie consultó por él. */
export const DIAS_SIN_INTERES = 30;

export type Gasto = { concepto: string; monto: number; fecha: Date | string | null };

/**
 * Desde cuándo está el auto en la agencia: la fecha del gasto "Compra" si se
 * cargó (es el día que entró de verdad), y si no, el día que se publicó.
 * Un auto comprado en marzo y cargado al sistema en octubre no lleva "0 días".
 */
export function inicioEnStock(createdAt: Date, gastos: Gasto[]): Date {
  const compra = gastos
    .filter((g) => g.concepto.trim().toLowerCase() === "compra" && g.fecha)
    .map((g) => new Date(g.fecha as string | Date))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() <= createdAt.getTime() + 365 * DIA_MS)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return compra ?? createdAt;
}

export const diasEntre = (desde: Date, hasta: Date) => Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / DIA_MS));

export type Unidad = {
  price: number;
  createdAt: Date;
  gastos: Gasto[];
  vehicleStatus: string | null;
  soldAt: Date | null;
  soldPrice: number | null;
};

export type NumerosDeUnidad = {
  /** null = sin gastos cargados: no se sabe cuánto costó. */
  costo: number | null;
  /** Días en stock (o los que tardó en venderse, si ya se vendió). */
  dias: number;
  /** Lo que deja (o dejaría al precio publicado). null sin costo. */
  ganancia: number | null;
  /** Sobre el precio de venta (o el publicado). */
  margenPct: number | null;
  /** El precio con el que se calcula: el de venta si se vendió, si no el publicado. */
  precio: number;
};

export function numerosDeUnidad(u: Unidad, ahora: Date): NumerosDeUnidad {
  const costo = u.gastos.length > 0 ? calcVehicleCostTotal(u.gastos) : null;
  const vendido = u.vehicleStatus === "SOLD";
  const precio = vendido && u.soldPrice != null && u.soldPrice > 0 ? u.soldPrice : u.price;
  const hasta = vendido && u.soldAt ? u.soldAt : ahora;
  const dias = diasEntre(inicioEnStock(u.createdAt, u.gastos), hasta);
  const ganancia = costo != null && costo > 0 && precio > 0 ? precio - costo : null;
  const margenPct = ganancia != null && precio > 0 ? (ganancia / precio) * 100 : null;
  return { costo: costo != null && costo > 0 ? costo : null, dias, ganancia, margenPct, precio };
}

export type MotivoEstancado = "dias" | "sinInteres" | null;

/** Por qué un auto en stock está estancado, o null si no lo está. */
export function estancado(dias: number, consultas30: number): MotivoEstancado {
  if (dias >= DIAS_ESTANCADO) return "dias";
  if (dias >= DIAS_SIN_INTERES && consultas30 === 0) return "sinInteres";
  return null;
}

export function textoEstancado(m: MotivoEstancado, dias: number, consultas30: number): string | null {
  if (m === "dias") return `Lleva ${dias} días${consultas30 === 0 ? " y nadie consultó en el último mes" : ""}. ¿Revisás el precio o las fotos?`;
  if (m === "sinInteres") return `Lleva ${dias} días y nadie consultó en el último mes. ¿Revisás el precio o las fotos?`;
  return null;
}

/** Los totales de arriba de la pantalla, sobre las unidades en stock. */
export function resumenDeStock(enStock: NumerosDeUnidad[]) {
  const conCosto = enStock.filter((n) => n.costo != null);
  return {
    unidades: enStock.length,
    invertido: conCosto.reduce((s, n) => s + (n.costo ?? 0), 0),
    valorPublicado: enStock.reduce((s, n) => s + n.precio, 0),
    gananciaEsperada: conCosto.reduce((s, n) => s + (n.ganancia ?? 0), 0),
    sinCosto: enStock.length - conCosto.length,
    diasPromedio: enStock.length ? Math.round(enStock.reduce((s, n) => s + n.dias, 0) / enStock.length) : null,
  };
}

/** Los totales de lo vendido. */
export function resumenDeVendidos(vendidos: NumerosDeUnidad[]) {
  const conCosto = vendidos.filter((n) => n.ganancia != null);
  return {
    unidades: vendidos.length,
    facturado: vendidos.reduce((s, n) => s + n.precio, 0),
    ganancia: conCosto.reduce((s, n) => s + (n.ganancia ?? 0), 0),
    conCosto: conCosto.length,
    diasPromedio: vendidos.length ? Math.round(vendidos.reduce((s, n) => s + n.dias, 0) / vendidos.length) : null,
  };
}
