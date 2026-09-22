import { celda } from "@/lib/exportar-estadisticas";
import { celularArgentino } from "@/lib/ventas-digitales";
import type { ClienteEnPantalla } from "@/lib/clientes-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   BAJAR TUS CLIENTES
   ══════════════════════════════════════════════════════════════════════════

   Dos archivos distintos, porque son para dos cosas distintas:

   **La planilla** (`planilla`): una fila por persona con todo lo que la
   pantalla sabe. Para mirar, para el contador, para cruzar con lo que sea.
   Con `;` y coma decimal, como el Excel en castellano.

   **La lista para Meta** (`meta`): el archivo que Meta Ads acepta para armar
   un público personalizado. Dos usos que valen plata:
     - EXCLUIR a quien ya compró de los anuncios: hoy se paga por mostrarle
       el ebook a gente que ya lo tiene.
     - PÚBLICO SIMILAR: Meta busca gente parecida a quienes compraron, que
       es el mejor público frío que existe.
   Meta pide columnas con nombres fijos (`email`, `phone`, `fn`, `ln`,
   `country`), separadas por coma, y el teléfono con el código de país y sin
   signos: el 549 argentino se lo ponemos nosotros, con la misma limpieza
   que el botón de WhatsApp. Lo que no parece un celular va vacío: Meta
   ignora la celda, y un número mal armado no encuentra a nadie.

   ⚠️ Lo que escribió la gente va por `celda` en la planilla (una celda que
   empieza con `=` se ejecuta). En la lista para Meta no: Meta no es una
   planilla y esos caracteres rompen la coincidencia; ahí va sin comillas y
   sin lo que no sea una letra.

   Es puro: recibe los clientes ya armados y devuelve texto. Probado en
   `exportar-clientes.check.ts`. */

export const FORMATOS_DE_CLIENTES = ["planilla", "meta"] as const;
export type FormatoDeClientes = (typeof FORMATOS_DE_CLIENTES)[number];
export const esFormatoDeClientes = (v: unknown): v is FormatoDeClientes => typeof v === "string" && (FORMATOS_DE_CLIENTES as readonly string[]).includes(v);

const BOM = "﻿";

/* ── La planilla ─────────────────────────────────────────────────────────── */

const SEP = ";";
const fila = (...celdas: (string | number | null | undefined)[]) => celdas.map(celda).join(SEP);

export function csvClientes(clientes: ClienteEnPantalla[], titulo: string, recortado: boolean): string {
  const lineas: string[] = [
    fila(titulo),
    "",
    fila("Correo", "Nombre", "Teléfono", "Compras", "Devoluciones", "Pagó", "Te quedó", "Primera compra", "Última compra", "Productos", "Archivos sin bajar", "Pidió no recibir mails"),
  ];
  for (const c of clientes) {
    lineas.push(fila(
      c.email, c.nombre, c.telefono, c.compras, c.devoluciones, c.gasto, c.neto, c.primera, c.ultima,
      c.productos.join(", "), c.sinBajar, c.dioDeBaja ? "sí" : "no",
    ));
  }
  if (recortado) lineas.push("", fila("Hay más clientes de los que entran en un archivo. Usá un filtro."));
  return BOM + lineas.join("\r\n") + "\r\n";
}

/* ── La lista para Meta ──────────────────────────────────────────────────── */

/** Sólo letras (con acentos) y espacios, en minúscula: es lo que Meta compara. */
const soloLetras = (s: string | null) => (s ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Una fila para Meta: mail, teléfono con 549, nombre, apellido, país. */
export function filaParaMeta(c: { email: string; nombre: string | null; telefono: string | null }): string[] {
  const partes = soloLetras(c.nombre).split(" ").filter(Boolean);
  const fn = partes[0] ?? "";
  const ln = partes.slice(1).join(" ");
  const cel = celularArgentino(c.telefono);
  return [c.email.trim().toLowerCase(), cel ? `549${cel}` : "", fn, ln, "ar"];
}

export function csvParaMeta(clientes: { email: string; nombre: string | null; telefono: string | null }[]): string {
  const lineas = ["email,phone,fn,ln,country"];
  for (const c of clientes) {
    /* Sin comillas ni comas adentro: las celdas ya no las tienen (el mail no
       las admite; el nombre quedó sólo con letras). */
    lineas.push(filaParaMeta(c).map((v) => v.replace(/,/g, " ")).join(","));
  }
  return lineas.join("\r\n") + "\r\n";
}

/** El nombre del archivo: dice para qué es y de cuándo. */
export function nombreDelArchivoDeClientes(formato: FormatoDeClientes, hoy: string): string {
  return formato === "meta" ? `clientes-para-meta-${hoy}.csv` : `clientes-${hoy}.csv`;
}
