/**
 * Chequeos de la exportación de Tus ventas. Se corre con:
 *
 *   npx tsx src/lib/exportar-ventas.check.ts
 */

import { csvVentas, nombreDelArchivoDeVentas } from "./exportar-ventas";
import type { VentaEnPantalla } from "@/app/digitales/ventas/VentasClient";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const venta = (x: Partial<VentaEnPantalla> = {}): VentaEnPantalla => ({
  id: "ord1", fecha: "10/09/26, 21:15", estado: "COBRADA", total: 10000, comision: 800, neto: 9200,
  comprador: "ana@mail.com", nombre: "Ana", telefono: null,
  lineas: [
    { id: "l1", producto: "Mecánica; fácil", esBono: false, esUpsell: false, bajadas: 2, tope: 5, ultima: "11/09", vencido: false },
    { id: "l2", producto: "Checklist", esBono: true, esUpsell: false, bajadas: null, tope: null, ultima: null, vencido: false },
  ],
  ...x,
});

const csv = csvVentas([
  venta(),
  venta({ id: "ord2", nombre: "=HYPERLINK(\"http://malo\")", lineas: [{ id: "l3", producto: "Mecánica; fácil", esBono: false, esUpsell: false, bajadas: 0, tope: 5, ultima: null, vencido: false }] }),
  venta({ id: "ord3", estado: "ESPERANDO", comision: 0, neto: 10000, nombre: null }),
], "Tus ventas — Todo", false);

check("CSV-A", csv.startsWith("﻿") && /\r\n/.test(csv), "empieza con la marca de orden de bytes y las filas terminan en CRLF");
check("CSV-B", /"Fecha";"Estado";"Correo";"Nombre";"Producto";"Bonos y upsell";"Cobrado";"Comisión";"Te quedó";"Bajó el archivo";"Venta"\r\n/.test(csv), "la cabecera está");
check("CSV-C", /"10\/09\/26, 21:15";"cobrada";"ana@mail.com";"Ana";"Mecánica; fácil";"Checklist";10000;800;9200;"sí";"ord1"\r\n/.test(csv),
  "una cobrada: producto principal aparte de los bonos, comisión, neto y si bajó");
check("CSV-D", csv.includes("\"'=HYPERLINK(\"\"http://malo\"\")\"") && !/;"=HYPERLINK/.test(csv), "un nombre que es una fórmula sale desactivado");
check("CSV-E", /;"no";"ord2"\r\n/.test(csv), "la que tenía archivo y no lo bajó dice no");
check("CSV-F", /"sin pagar";"ana@mail.com";;"Mecánica; fácil";"Checklist";10000;;;;"ord3"\r\n/.test(csv), "una sin pagar no inventa comisión, neto ni descarga");
check("CSV-G", !/Hay más ventas/.test(csv) && /Hay más ventas de las que entran/.test(csvVentas([venta()], "t", true)), "el aviso de recorte sólo cuando se llegó al techo");
check("RUTA-A", nombreDelArchivoDeVentas({ clave: "mes", desde: "2026-09-01", hasta: "2026-09-15" }, "2026-09-15") === "ventas-2026-09-01-a-2026-09-15.csv"
  && nombreDelArchivoDeVentas({ clave: "todo", desde: null, hasta: null }, "2026-09-15") === "ventas-todo-al-2026-09-15.csv",
  "el nombre lleva el rango, o la fecha de hoy si es todo");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
