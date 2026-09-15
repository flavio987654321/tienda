import { celda } from "@/lib/exportar-estadisticas";
import type { VentaEnPantalla } from "@/app/digitales/ventas/VentasClient";

/* ══════════════════════════════════════════════════════════════════════════
   EXPORTAR TUS VENTAS A UNA PLANILLA
   ══════════════════════════════════════════════════════════════════════════

   Una fila por venta: fecha, estado, quién, qué, cuánto y si lo bajó. Para lo
   que se hace con eso: mandarle el próximo producto a los que ya compraron,
   cotejar contra Mercado Pago, o dársela al contador.

   ⚠️ El nombre lo escribió quien compró, en el checkout. Va por `celda`, que
   desactiva una celda que empiece con `=`, `+`, `-` o `@`: una planilla la
   ejecutaría. Mismo motivo y misma defensa que en Estadísticas.

   Es puro: recibe las ventas ya armadas y devuelve texto. Probado en
   `exportar-ventas.check.ts`. */

const SEP = ";";
const BOM = "﻿";
const fila = (...celdas: (string | number | null | undefined)[]) => celdas.map(celda).join(SEP);

const ESTADO = { COBRADA: "cobrada", ESPERANDO: "sin pagar", CANCELADA: "cancelada" } as const;

/** "sí" si bajó al menos un archivo, "no" si tenía y no lo bajó, vacío si no había nada para bajar. */
function bajo(v: VentaEnPantalla): string {
  const conArchivo = v.lineas.filter((l) => l.bajadas !== null);
  if (conArchivo.length === 0) return "";
  return conArchivo.some((l) => (l.bajadas ?? 0) > 0) ? "sí" : "no";
}

export function csvVentas(ventas: VentaEnPantalla[], titulo: string, recortado: boolean): string {
  const lineas: string[] = [
    fila(titulo),
    "",
    fila("Fecha", "Estado", "Correo", "Nombre", "Producto", "Bonos y upsell", "Cobrado", "Comisión", "Te quedó", "Bajó el archivo", "Venta"),
  ];
  for (const v of ventas) {
    const principal = v.lineas.find((l) => !l.esBono && !l.esUpsell) ?? v.lineas[0];
    const extras = v.lineas.filter((l) => l !== principal).map((l) => l.producto).join(", ");
    lineas.push(fila(
      v.fecha, ESTADO[v.estado], v.comprador, v.nombre, principal?.producto ?? "", extras,
      v.total, v.estado === "COBRADA" ? v.comision : null, v.estado === "COBRADA" ? v.neto : null,
      v.estado === "COBRADA" ? bajo(v) || null : null, v.id,
    ));
  }
  if (recortado) {
    lineas.push("", fila("Hay más ventas de las que entran en un archivo. Elegí un rango de fechas más corto."));
  }
  return BOM + lineas.join("\r\n") + "\r\n";
}

/** El nombre del archivo: sin acentos ni espacios, con el rango adentro. */
export function nombreDelArchivoDeVentas(rango: { clave: string; desde: string | null; hasta: string | null }, hoy: string): string {
  const periodo = rango.desde && rango.hasta ? `${rango.desde}-a-${rango.hasta}` : `todo-al-${hoy}`;
  return `ventas-${periodo}.csv`;
}
