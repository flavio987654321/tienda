import { NOMBRE_ORIGEN } from "@/lib/origen-visita";
import { NOMBRE_MEDIO, OTRAS } from "@/lib/utm-digital";
import type { Estadisticas } from "@/lib/estadisticas-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   EXPORTAR ESTADÍSTICAS A UNA PLANILLA
   ══════════════════════════════════════════════════════════════════════════

   Un CSV que abre Excel, Google Sheets y Numbers. Con punto y coma —que es
   lo que entiende el Excel en castellano sin preguntar nada— y con la marca
   de orden de bytes al principio para que los acentos no salgan rotos.

   ⚠️ LO IMPORTANTE DE ESTE ARCHIVO ES `celda`. Los nombres de campaña y de
   anuncio los escribió un desconocido desde la URL. Una planilla EJECUTA una
   celda que empieza con `=`, `+`, `-` o `@`: `=HYPERLINK(...)`, o peor, un
   comando en versiones viejas de Excel. Un bot que visite la página con
   `utm_campaign==cmd|...` dejaría una bomba esperando a que la dueña abra su
   propio archivo. Por eso toda celda que empieza con uno de esos caracteres
   se antepone con un apóstrofo, que la planilla muestra como texto. Y todo
   texto se encierra entre comillas, con las comillas de adentro dobladas.

   Es puro: recibe la cuenta ya hecha y devuelve texto. Probado en
   `exportar-estadisticas.check.ts`. */

const SEP = ";";
const BOM = "﻿";

/** Una celda segura para una planilla. */
export function celda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") {
    /* Coma decimal, como el Excel en castellano. Sin separador de miles: la
       planilla lo agrega si quiere; en el archivo confundiría 1.234 con 1,234. */
    return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace(".", ",");
  }
  let texto = valor.replace(/[\r\n\t]+/g, " ");
  /* La defensa contra la celda que se ejecuta. El apóstrofo va ADENTRO de las
     comillas: así la planilla lo lee como texto y no como fórmula. */
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, "\"\"")}"`;
}

const fila = (...celdas: (string | number | null | undefined)[]) => celdas.map(celda).join(SEP);

const pctOVacio = (n: number | null) => (n === null ? "" : n);

/**
 * La solapa General: los números del período, la serie por día y por producto.
 */
export function csvGeneral(d: Estadisticas, titulo: string): string {
  const k = d.kpis;
  const lineas: string[] = [
    fila(titulo),
    fila("Período", `${d.rango.desde} a ${d.rango.hasta}`),
    "",
    fila("Ventas", k.ventas),
    fila("Devueltas", k.devueltas),
    fila("Cobrado (bruto)", k.bruto),
    fila("Comisión", k.comision),
    fila("Te quedó (neto)", k.neto),
    fila("Ticket promedio", k.ticket),
    fila("Visitas", k.visitas),
    fila("Abrieron el pago", k.checkouts),
    fila("Conversión %", pctOVacio(k.conversion)),
    "",
    fila("Después de la venta"),
    fila("Compras con permiso de descarga", d.posventa.descargas.conPermiso),
    fila("Bajaron el archivo", d.posventa.descargas.bajaron),
    fila("Sin bajar", d.posventa.descargas.sinBajar),
    fila("Vencidas sin bajar", d.posventa.descargas.vencidosSinBajar),
    fila("Devoluciones por arrepentimiento", d.posventa.devoluciones.arrepentimiento),
    fila("Devoluciones por contracargo", d.posventa.devoluciones.contracargo),
    fila("Compras con upsell", d.posventa.upsell.ventas),
    fila("Plata extra por upsell", d.posventa.upsell.plata),
    fila("Mails de entrega enviados", d.posventa.mails.enviados),
    fila("Mails de entrega fallados", d.posventa.mails.fallados),
    fila("Compradores distintos", d.posventa.compradores.unicos),
    fila("Compraron más de una vez", d.posventa.compradores.repiten),
    "",
    fila("Por día", "Visitas", "Ventas", "Cobrado"),
  ];
  d.serie.visitas.forEach((p, i) => {
    lineas.push(fila(p.dia, p.value, d.serie.ventas[i]?.value ?? 0, d.serie.bruto[i]?.value ?? 0));
  });
  if (d.porProducto.length > 0) {
    lineas.push("", fila("Producto", "Publicado", "Ventas", "Te quedó", "Visitas", "Conversión %"));
    for (const p of d.porProducto) {
      lineas.push(fila(p.name, p.publicada ? "sí" : "no", p.ventas, p.neto, p.visitas, pctOVacio(p.conversion)));
    }
  }
  return BOM + lineas.join("\r\n") + "\r\n";
}

/**
 * La solapa Campañas: por canal, por medio, y por campaña y anuncio.
 */
export function csvCampanias(d: Estadisticas, titulo: string): string {
  const c = d.campanias;
  const lineas: string[] = [
    fila(titulo),
    fila("Período", `${d.rango.desde} a ${d.rango.hasta}`),
    "",
    fila("Visitas con campaña", c.kpis.visitas),
    fila("Ventas atribuidas", c.kpis.ventas),
    fila("Te quedó por campañas", c.kpis.neto),
    fila("Conversión %", pctOVacio(c.kpis.conversion)),
    "",
    fila("Canal", "Producto", "Entraron", "Abrieron el pago", "Pagaron", "Te quedó", "Al pago %", "Conversión %"),
  ];
  /* Mirando "Todos" con varios productos, debajo de cada canal y cada medio va
     una fila por producto (sin embudo: sólo entraron, pagaron y te quedó). */
  for (const f of d.origenes.filas) {
    lineas.push(fila(NOMBRE_ORIGEN[f.origen], "(todos)", f.visitas, f.checkouts, f.ventas, f.neto, pctOVacio(f.pctCheckout), pctOVacio(f.conversion)));
    for (const r of f.porProducto) {
      lineas.push(fila(NOMBRE_ORIGEN[f.origen], r.producto, r.visitas, null, r.ventas, r.neto, null, null));
    }
  }
  lineas.push("", fila("Medio", "Producto", "Visitas", "Ventas", "Te quedó", "Conversión %"));
  for (const m of c.porMedio) {
    lineas.push(fila(m.nombre, "(todos)", m.visitas, m.ventas, m.neto, pctOVacio(m.conversion)));
    for (const r of m.porProducto) {
      lineas.push(fila(m.nombre, r.producto, r.visitas, r.ventas, r.neto, null));
    }
  }
  lineas.push("", fila("Medio", "Campaña", "Producto", "Anuncio", "Visitas", "Ventas", "Te quedó", "Conversión %"));
  for (const f of c.filas) {
    const nombre = f.campania === OTRAS ? "Otras campañas" : f.campania;
    lineas.push(fila(NOMBRE_MEDIO[f.medio], nombre, f.producto, "(toda la campaña)", f.visitas, f.ventas, f.neto, pctOVacio(f.conversion)));
    for (const a of f.anuncios) {
      lineas.push(fila(NOMBRE_MEDIO[f.medio], nombre, f.producto, a.anuncio || "(sin anuncio)", a.visitas, a.ventas, a.neto, pctOVacio(a.conversion)));
    }
  }
  return BOM + lineas.join("\r\n") + "\r\n";
}

/** El nombre del archivo: sin acentos ni espacios, con el rango adentro. */
export function nombreDelArchivo(vista: "general" | "campanias", d: Estadisticas): string {
  return `estadisticas-${vista}-${d.rango.desde}-a-${d.rango.hasta}.csv`;
}
