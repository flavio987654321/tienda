import { comisionCongelada } from "@/lib/compra-digital";
import { sumarDiasCalendario, diasEntreDias } from "@/lib/fechas-comerciales";
import { granoPara, serieParaGrafico, type Grano, type Punto } from "@/lib/serie-grafico";
import { ORIGENES, ordenarOrigenes, type Origen } from "@/lib/origen-visita";
import type { PasoDigital } from "@/lib/visitas-digitales";
import type { TierDigital } from "@/lib/planes-digitales";

/* ══════════════════════════════════════════════════════════════════════════
   ESTADÍSTICAS DE PRODUCTOS DIGITALES — la cuenta, sin la base
   ══════════════════════════════════════════════════════════════════════════

   Todo lo que la pantalla muestra sale de acá, y acá no se toca la base: la
   página trae las filas crudas y esto las convierte en números. Es una cuenta
   de plata y de porcentajes, y una cuenta así tiene que poder probarse sin
   levantar Postgres.

   Se mira POR PRODUCTO o EN GENERAL, como el inicio del panel: alguien en Pro
   con un ebook de mecánica y uno de tortas necesita saber cuál de los dos
   anda. Un número solo no le sirve.

   ── Qué se cuenta, y de dónde ──────────────────────────────────────────────

   - Las VENTAS salen de `Order`: una orden CONFIRMED es una venta; una
     REFUNDED es una venta que se deshizo (arrepentimiento o contracargo). El
     bruto y la comisión se calculan con la tasa congelada de cada orden, la
     misma cuenta que hace la pantalla de Ventas — dos pantallas que muestran
     la misma plata no pueden decir números distintos.
   - Las VISITAS y los CHECKOUTS salen de `DigitalVisita`, una por navegador
     por día. Y la CONVERSIÓN es ventas ÷ visitas, que es el número que decide
     si una página sirve.
   - El ORIGEN de las visitas sale de `DigitalVisitaOrigen`, con la misma
     lista cerrada de etiquetas que las tiendas.

   ── Qué ve cada plan ───────────────────────────────────────────────────────

   Free ve las ventas: es lo que ya paga con su comisión. Starter suma las
   visitas y la conversión. Pro suma el embudo y el origen. Los bloques
   bloqueados se muestran igual, borrosos y con el candado: esconderlos deja
   la pantalla de Free igual de vacía que si no existieran, y no se ve qué se
   gana al cambiar. Es donde la competencia pone el candado, y es lo que le
   da al de Free un motivo para subir. */

/* ── El rango ────────────────────────────────────────────────────────────── */

export const RANGOS = ["hoy", "7", "30", "90", "todo"] as const;
export type RangoClave = (typeof RANGOS)[number];

export const NOMBRE_RANGO: Record<RangoClave, string> = {
  hoy: "Hoy",
  "7": "7 días",
  "30": "30 días",
  "90": "90 días",
  todo: "Todo",
};

/**
 * Hasta dónde llega "Todo". Es la retención de las visitas (`lib/retencion`,
 * 730 días): las ventas viven para siempre, pero mostrar ventas de hace tres
 * años contra visitas de hace dos daría una conversión inventada.
 */
export const DIAS_DE_TODO = 730;

export type Rango = {
  clave: RangoClave;
  /** "YYYY-MM-DD" argentino, inclusive. */
  desde: string;
  hasta: string;
  dias: number;
};

/** Lo que vino en la URL, resuelto. Cualquier cosa rara cae en 30 días. */
export function resolverRango(param: string | undefined, hoy: string): Rango {
  const clave: RangoClave = (RANGOS as readonly string[]).includes(param ?? "") ? (param as RangoClave) : "30";
  const dias = clave === "hoy" ? 1 : clave === "todo" ? DIAS_DE_TODO : Number(clave);
  return { clave, desde: sumarDiasCalendario(hoy, -(dias - 1)), hasta: hoy, dias };
}

/* ── Qué ve cada plan ────────────────────────────────────────────────────── */

export type Bloque = "ventas" | "visitas" | "embudo" | "origenes";

/** El plan más bajo que ve cada bloque. */
export const DESDE_QUE_PLAN: Record<Bloque, TierDigital> = {
  ventas: "FREE",
  visitas: "STARTER",
  embudo: "PRO",
  origenes: "PRO",
};

const ORDEN: TierDigital[] = ["FREE", "STARTER", "PRO"];

export function puedeVer(tier: TierDigital, bloque: Bloque): boolean {
  return ORDEN.indexOf(tier) >= ORDEN.indexOf(DESDE_QUE_PLAN[bloque]);
}

/* ── Las filas crudas ────────────────────────────────────────────────────── */

export type OrdenCruda = {
  estado: "CONFIRMED" | "REFUNDED";
  total: number;
  tasa: number | null;
  /** El día argentino en que se creó, "YYYY-MM-DD". */
  dia: string;
  /** El principal al que pertenece, o `null` si no se pudo saber. */
  principal: string | null;
};

export type VisitaCruda = { productId: string; date: string; paso: PasoDigital; count: number };
export type OrigenCrudo = { productId: string; date: string; source: string; count: number };

export type PrincipalCrudo = { id: string; name: string; publicada: boolean };

/* ── Lo que sale ─────────────────────────────────────────────────────────── */

export type Kpis = {
  ventas: number;
  bruto: number;
  comision: number;
  neto: number;
  devueltas: number;
  /** Bruto ÷ ventas, o `null` sin ventas. */
  ticket: number | null;
  visitas: number;
  checkouts: number;
  /** Ventas ÷ visitas en porcentaje, o `null` sin visitas. */
  conversion: number | null;
};

export type Serie = { grano: Grano; visitas: Punto[]; ventas: Punto[]; bruto: Punto[] };

export type Embudo = {
  visitas: number;
  checkouts: number;
  ventas: number;
  /** Checkouts ÷ visitas y ventas ÷ checkouts, en porcentaje. `null` sin base. */
  pctCheckout: number | null;
  pctVenta: number | null;
};

export type FilaDeOrigen = { origen: Origen; visitas: number; pct: number };

export type Estadisticas = {
  rango: Rango;
  kpis: Kpis;
  serie: Serie;
  embudo: Embudo;
  /** Cuánto dejó cada página, de más a menos. Vacío si se mira un producto solo. */
  porProducto: { id: string; name: string; publicada: boolean; ventas: number; neto: number; visitas: number; conversion: number | null }[];
  origenes: { filas: FilaDeOrigen[]; conocidas: number };
};

/** Un día está adentro del rango. Las fechas son "YYYY-MM-DD", comparables como texto. */
const enRango = (dia: string, r: Rango) => dia >= r.desde && dia <= r.hasta;

const pct = (parte: number, total: number): number | null =>
  total > 0 ? Math.round((parte / total) * 1000) / 10 : null;

/** "2026-09-14" → "14/9". */
function etiquetaDia(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${d}/${m}`;
}

/**
 * La cuenta. Recibe las filas del rango (o de más: filtra igual) y el producto
 * elegido, y devuelve todo lo que la pantalla dibuja.
 *
 * ⚠️ Las series traen TODOS los días del rango, con cero donde no pasó nada.
 * Un gráfico que salta de un día con ventas al siguiente con ventas esconde
 * los diez del medio en que no vendió nada, que es justo lo que hay que ver.
 */
export function armarEstadisticas(entrada: {
  rango: Rango;
  ordenes: OrdenCruda[];
  visitas: VisitaCruda[];
  origenes: OrigenCrudo[];
  principales: PrincipalCrudo[];
  elegido: string | null;
}): Estadisticas {
  const { rango, elegido } = entrada;
  const esDelElegido = (id: string | null) => elegido === null || id === elegido;

  const ordenes = entrada.ordenes.filter((o) => enRango(o.dia, rango) && esDelElegido(o.principal));
  const visitas = entrada.visitas.filter((v) => enRango(v.date, rango) && esDelElegido(v.productId));
  const origenes = entrada.origenes.filter((v) => enRango(v.date, rango) && esDelElegido(v.productId));

  /* ── Los días, de punta a punta ── */
  const dias: string[] = [];
  for (let d = rango.desde; d <= rango.hasta; d = sumarDiasCalendario(d, 1)) dias.push(d);
  const porDia = new Map(dias.map((d) => [d, { visitas: 0, checkouts: 0, ventas: 0, bruto: 0 }]));

  /* ── Ventas ── */
  let ventas = 0, bruto = 0, comision = 0, devueltas = 0;
  for (const o of ordenes) {
    if (o.estado === "REFUNDED") { devueltas++; continue; }
    ventas++;
    bruto += o.total;
    comision += comisionCongelada(o.total, o.tasa);
    const d = porDia.get(o.dia);
    if (d) { d.ventas++; d.bruto += o.total; }
  }

  /* ── Visitas y checkouts ── */
  let totalVisitas = 0, totalCheckouts = 0;
  for (const v of visitas) {
    const d = porDia.get(v.date);
    if (v.paso === "pagina") { totalVisitas += v.count; if (d) d.visitas += v.count; }
    else { totalCheckouts += v.count; if (d) d.checkouts += v.count; }
  }

  const kpis: Kpis = {
    ventas, bruto, comision, neto: bruto - comision, devueltas,
    ticket: ventas > 0 ? bruto / ventas : null,
    visitas: totalVisitas,
    checkouts: totalCheckouts,
    conversion: pct(ventas, totalVisitas),
  };

  /* ── Las series, agrupadas si el rango es largo ── */
  const grano = granoPara(rango.dias);
  const punto = (campo: "visitas" | "ventas" | "bruto"): Punto[] =>
    dias.map((dia) => ({ dia, label: etiquetaDia(dia), value: porDia.get(dia)![campo] }));
  const serie: Serie = {
    grano,
    visitas: serieParaGrafico(punto("visitas"), grano).puntos,
    ventas: serieParaGrafico(punto("ventas"), grano).puntos,
    bruto: serieParaGrafico(punto("bruto"), grano).puntos,
  };

  /* ── El embudo ── */
  const embudo: Embudo = {
    visitas: totalVisitas,
    checkouts: totalCheckouts,
    ventas,
    pctCheckout: pct(totalCheckouts, totalVisitas),
    pctVenta: pct(ventas, totalCheckouts),
  };

  /* ── Por producto, sólo mirando todo ── */
  const porProducto: Estadisticas["porProducto"] = [];
  if (elegido === null) {
    for (const p of entrada.principales) {
      let v = 0, n = 0, vis = 0;
      for (const o of ordenes) {
        if (o.principal !== p.id || o.estado !== "CONFIRMED") continue;
        v++; n += o.total - comisionCongelada(o.total, o.tasa);
      }
      for (const x of visitas) if (x.productId === p.id && x.paso === "pagina") vis += x.count;
      porProducto.push({ id: p.id, name: p.name, publicada: p.publicada, ventas: v, neto: n, visitas: vis, conversion: pct(v, vis) });
    }
    porProducto.sort((a, b) => b.neto - a.neto || b.ventas - a.ventas || b.visitas - a.visitas);
  }

  /* ── De dónde vinieron ── */
  const porOrigen = new Map<Origen, number>();
  let conocidas = 0;
  for (const o of origenes) {
    if (!(ORIGENES as readonly string[]).includes(o.source)) continue;
    porOrigen.set(o.source as Origen, (porOrigen.get(o.source as Origen) ?? 0) + o.count);
    conocidas += o.count;
  }
  const filas = ordenarOrigenes(
    [...porOrigen.entries()].map(([origen, v]) => ({ origen, visitas: v, pct: pct(v, conocidas) ?? 0 })),
  );

  return { rango, kpis, serie, embudo, porProducto, origenes: { filas, conocidas } };
}

/** Cuántos días abarca un rango; expuesto para los chequeos. */
export function diasDelRango(r: Rango): number {
  return diasEntreDias(r.desde, r.hasta) + 1;
}
