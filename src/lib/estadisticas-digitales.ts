import { comisionCongelada } from "@/lib/compra-digital";
import { sumarDiasCalendario, diasEntreDias } from "@/lib/fechas-comerciales";
import { granoPara, serieParaGrafico, type Grano, type Punto } from "@/lib/serie-grafico";
import { ORIGENES, ordenarOrigenes, type Origen } from "@/lib/origen-visita";
import type { PasoDigital, Dispositivo } from "@/lib/visitas-digitales";
import { MEDIOS, OTRAS, NOMBRE_MEDIO, type Medio } from "@/lib/utm-digital";
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

   - Las VENTAS salen de `Order`: una orden CONFIRMED es una venta. Una
     DEVUELTA es una venta que se deshizo —arrepentimiento o contracargo— y
     ⚠️ en la base NO tiene estado propio: queda CANCELLED con el pago en
     REFUNDED, y el motivo en `OrderStatusLog.changedBy`. La página lo
     traduce a `estado: "DEVUELTA"` antes de llegar acá; buscarlas por un
     estado "REFUNDED" que no existe las contaba como cero.
   - El bruto y la comisión se calculan con la tasa congelada de cada orden,
     la misma cuenta que hace la pantalla de Ventas — dos pantallas que
     muestran la misma plata no pueden decir números distintos.
   - Las VISITAS y los CHECKOUTS salen de `DigitalVisita`, una por navegador
     por día. La CONVERSIÓN es ventas ÷ visitas, que es el número que decide
     si una página sirve.
   - El ORIGEN de las visitas sale de `DigitalVisitaOrigen`; el de cada VENTA
     viaja en la orden (`origenVisita`). Con los dos se dice "Instagram trajo
     500 visitas y 12 ventas", que es lo que decide dónde poner publicidad.
   - Lo de DESPUÉS de la venta —si bajaron el archivo, si lo devolvieron, si
     llevaron el upsell, si el mail salió— sale de la orden y sus permisos.

   ── Qué ve cada plan — por PREGUNTA, no por número ─────────────────────────

   Un bloque a medias en un plan es peor que no tenerlo: cada bloque entra
   entero en el plan donde entra, o entra con candado.

   - Free responde "¿vendí y entregué bien?": las ventas y todo lo de después
     de la venta. Es operar sus propias ventas, y Free también vende y también
     tiene que atender al que compró.
   - Starter responde "¿la página funciona?": visitas, conversión, desde qué
     dispositivo, cuándo se vende.
   - Pro responde "¿dónde invierto?": el embudo, de dónde vienen las visitas y
     las ventas, y los carritos que recuperó el mail automático (que es de Pro,
     así que el número que lo mide también).

   Los bloques bloqueados se muestran igual, borrosos y con el candado: es
   donde la competencia pone el candado y lo que le da al de Free un motivo
   para subir. */

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

export type Bloque =
  | "ventas"      // los cuatro números, ventas por día, por producto
  | "posventa"    // descargas, devoluciones, upsell, mails, compradores que repiten
  | "visitas"     // visitas por día, conversión, dispositivo
  | "cuando"      // por día de la semana y por hora
  | "embudo"
  | "origenes"    // visitas y ventas por origen
  | "campanias"   // visitas y ventas por campaña y anuncio (UTM)
  | "carritos"    // recuperados por el mail automático
  | "exportar";   // bajar la solapa como planilla

/** El plan más bajo que ve cada bloque. */
export const DESDE_QUE_PLAN: Record<Bloque, TierDigital> = {
  ventas: "FREE",
  posventa: "FREE",
  visitas: "STARTER",
  cuando: "STARTER",
  embudo: "PRO",
  origenes: "PRO",
  campanias: "PRO",
  carritos: "PRO",
  /* Exportar es lo que se cobra, no los números: Free los ve en pantalla. La
     competencia lo apaga en su plan gratis, y es donde va el candado. */
  exportar: "STARTER",
};

const ORDEN: TierDigital[] = ["FREE", "STARTER", "PRO"];

export function puedeVer(tier: TierDigital, bloque: Bloque): boolean {
  return ORDEN.indexOf(tier) >= ORDEN.indexOf(DESDE_QUE_PLAN[bloque]);
}

/* ── Las filas crudas ────────────────────────────────────────────────────── */

export type MotivoDevolucion = "arrepentimiento" | "contracargo";

export type OrdenCruda = {
  estado: "CONFIRMED" | "DEVUELTA";
  /** Sólo en una devuelta; `null` si no quedó anotado. */
  motivo: MotivoDevolucion | null;
  total: number;
  tasa: number | null;
  /** El día argentino en que se creó, "YYYY-MM-DD". */
  dia: string;
  /** Día de la semana (0 domingo … 6 sábado) y hora (0–23), argentinos. */
  diaSemana: number;
  hora: number;
  /** El principal al que pertenece, o `null` si no se pudo saber. */
  principal: string | null;
  comprador: string;
  /** Plata de los upsells que llevó. Cero si no llevó ninguno. */
  upsell: number;
  /** Si el comprador bajó algo: `null` si todavía no tiene permiso (no se acreditó). */
  bajo: boolean | null;
  /** Tiene al menos un permiso vencido sin ninguna descarga. */
  vencidoSinBajar: boolean;
  /** El último mail de entrega: salió, falló, o no hubo todavía. */
  mail: "ENVIADO" | "FALLO" | null;
  /** Le llegó el recordatorio de compra a medias antes de pagar. */
  recordada: boolean;
  /** De dónde vino la visita que terminó acá. */
  origen: string | null;
  /** Y de qué campaña, si la traía. */
  campania: { medio: string; campania: string; anuncio: string } | null;
};

export type VisitaCruda = { productId: string; date: string; paso: PasoDigital; dispositivo: Dispositivo; count: number };
export type OrigenCrudo = { productId: string; date: string; paso: PasoDigital; source: string; count: number };
export type CampaniaCruda = { productId: string; date: string; medio: string; campania: string; anuncio: string; count: number };
export type PrincipalCrudo = { id: string; name: string; publicada: boolean };

/** Una compra que quedó a medias: llegó al pago y no pagó. */
export type CarritoCrudo = { dia: string; principal: string | null; recordado: boolean };

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
  pctCheckout: number | null;
  pctVenta: number | null;
};

export type Posventa = {
  descargas: { conPermiso: number; bajaron: number; sinBajar: number; vencidosSinBajar: number; pctBajaron: number | null };
  devoluciones: { total: number; arrepentimiento: number; contracargo: number; tasa: number | null };
  upsell: { ventas: number; pct: number | null; plata: number };
  mails: { enviados: number; fallados: number };
  compradores: { unicos: number; repiten: number };
};

export type Cuando = { porDiaSemana: number[]; porHora: number[] };

/**
 * Cuánto de un canal, un medio o una campaña fue a cada producto. Sólo se llena
 * mirando "Todos" con más de un producto: una cuenta Pro tiene hasta cinco
 * páginas, cada una con su dominio, y "Instagram trajo 150" sin decir a cuál
 * no sirve para decidir nada. Con un producto, o con uno elegido, va vacío.
 */
export type Reparto = { productId: string; producto: string; visitas: number; ventas: number; neto: number };

/** Un canal con su embudo: entraron, abrieron el pago, pagaron. */
export type FilaDeOrigen = {
  origen: Origen;
  visitas: number;
  pct: number;
  checkouts: number;
  ventas: number;
  /** Lo que dejaron las ventas de ese canal, después de la comisión. */
  neto: number;
  /** Checkouts ÷ visitas y ventas ÷ visitas, en porcentaje. */
  pctCheckout: number | null;
  conversion: number | null;
  porProducto: Reparto[];
};

/** Un medio (pago, orgánico, mail…) con lo suyo. */
export type FilaDeMedio = { medio: Medio; nombre: string; visitas: number; ventas: number; neto: number; conversion: number | null; porProducto: Reparto[] };

/** Los números de cabecera de la solapa Campañas: sólo lo que vino etiquetado. */
export type KpisDeCampanias = {
  visitas: number;
  ventas: number;
  neto: number;
  conversion: number | null;
  ticket: number | null;
};

export type Carritos = { abandonados: number; recordados: number; recuperados: number; pctRecuperados: number | null };

/**
 * Una campaña con sus anuncios adentro, de más a menos ventas y después visitas.
 * Mirando "Todos" con más de un producto, UNA CAMPAÑA ES DE UN PRODUCTO: la
 * misma etiqueta en el link del ebook y en el del curso son dos filas, cada
 * una con su producto puesto. Sumarlas escondería cuál rinde.
 */
export type FilaDeCampania = {
  medio: Medio;
  campania: string;
  /** El producto de la fila, sólo en "Todos" con más de un producto; si no, null. */
  productId: string | null;
  producto: string | null;
  visitas: number;
  ventas: number;
  neto: number;
  conversion: number | null;
  anuncios: { anuncio: string; visitas: number; ventas: number; neto: number; conversion: number | null }[];
};

export type Estadisticas = {
  rango: Rango;
  kpis: Kpis;
  serie: Serie;
  dispositivos: { movil: number; escritorio: number; pctMovil: number | null };
  embudo: Embudo;
  posventa: Posventa;
  cuando: Cuando;
  /** Cuánto dejó cada página, de más a menos. Vacío si se mira un producto solo. */
  porProducto: { id: string; name: string; publicada: boolean; ventas: number; neto: number; visitas: number; conversion: number | null }[];
  origenes: { filas: FilaDeOrigen[]; conocidas: number; ventasSinOrigen: number };
  /** Las campañas del período. `conVisitas` es cuántas visitas traían campaña. */
  campanias: { filas: FilaDeCampania[]; conVisitas: number; ventasConCampania: number; kpis: KpisDeCampanias; porMedio: FilaDeMedio[] };
  carritos: Carritos;
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
  carritos?: CarritoCrudo[];
  campanias?: CampaniaCruda[];
}): Estadisticas {
  const { rango, elegido } = entrada;
  const esDelElegido = (id: string | null) => elegido === null || id === elegido;
  /* Se reparte por producto sólo cuando hay entre qué repartir. */
  const repartir = elegido === null && entrada.principales.length > 1;
  const nombreDe = (id: string | null) => entrada.principales.find((p) => p.id === id)?.name ?? "Otro producto";
  type Reparte = Map<string, Reparto>;
  const sumarReparto = (m: Reparte, id: string | null, d: { visitas?: number; ventas?: number; neto?: number }) => {
    if (!repartir || id === null) return;
    const r = m.get(id) ?? { productId: id, producto: nombreDe(id), visitas: 0, ventas: 0, neto: 0 };
    r.visitas += d.visitas ?? 0; r.ventas += d.ventas ?? 0; r.neto += d.neto ?? 0;
    m.set(id, r);
  };
  const repartoOrdenado = (m: Reparte): Reparto[] => [...m.values()].sort((a, b) => b.visitas - a.visitas || b.ventas - a.ventas);
  const carritosDelRango = (entrada.carritos ?? []).filter((c) => enRango(c.dia, rango) && esDelElegido(c.principal));

  const ordenes = entrada.ordenes.filter((o) => enRango(o.dia, rango) && esDelElegido(o.principal));
  const visitas = entrada.visitas.filter((v) => enRango(v.date, rango) && esDelElegido(v.productId));
  const origenes = entrada.origenes.filter((v) => enRango(v.date, rango) && esDelElegido(v.productId));
  const campaniasDelRango = (entrada.campanias ?? []).filter((v) => enRango(v.date, rango) && esDelElegido(v.productId));
  const cobradas = ordenes.filter((o) => o.estado === "CONFIRMED");
  const devueltas = ordenes.filter((o) => o.estado === "DEVUELTA");

  /* ── Los días, de punta a punta ── */
  const dias: string[] = [];
  for (let d = rango.desde; d <= rango.hasta; d = sumarDiasCalendario(d, 1)) dias.push(d);
  const porDia = new Map(dias.map((d) => [d, { visitas: 0, checkouts: 0, ventas: 0, bruto: 0 }]));

  /* ── Ventas ── */
  let bruto = 0, comision = 0;
  for (const o of cobradas) {
    bruto += o.total;
    comision += comisionCongelada(o.total, o.tasa);
    const d = porDia.get(o.dia);
    if (d) { d.ventas++; d.bruto += o.total; }
  }
  const ventas = cobradas.length;

  /* ── Visitas, checkouts y dispositivo ── */
  let totalVisitas = 0, totalCheckouts = 0, movil = 0, escritorio = 0;
  for (const v of visitas) {
    const d = porDia.get(v.date);
    if (v.paso === "pagina") {
      totalVisitas += v.count;
      if (d) d.visitas += v.count;
      if (v.dispositivo === "movil") movil += v.count; else escritorio += v.count;
    } else {
      totalCheckouts += v.count;
      if (d) d.checkouts += v.count;
    }
  }

  const kpis: Kpis = {
    ventas, bruto, comision, neto: bruto - comision, devueltas: devueltas.length,
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

  /* ── Después de la venta ──
     Todo sobre las COBRADAS, salvo las devoluciones, que son las otras. Las
     descargas se cuentan por compra y no por archivo: una compra con tres
     archivos de los que bajó uno es alguien que ya tiene lo suyo. */
  const conPermiso = cobradas.filter((o) => o.bajo !== null);
  const bajaron = conPermiso.filter((o) => o.bajo === true).length;
  const conUpsell = cobradas.filter((o) => o.upsell > 0);
  const porComprador = new Map<string, number>();
  for (const o of cobradas) porComprador.set(o.comprador, (porComprador.get(o.comprador) ?? 0) + 1);
  const posventa: Posventa = {
    descargas: {
      conPermiso: conPermiso.length,
      bajaron,
      sinBajar: conPermiso.length - bajaron,
      vencidosSinBajar: cobradas.filter((o) => o.vencidoSinBajar).length,
      pctBajaron: pct(bajaron, conPermiso.length),
    },
    devoluciones: {
      total: devueltas.length,
      arrepentimiento: devueltas.filter((o) => o.motivo === "arrepentimiento").length,
      contracargo: devueltas.filter((o) => o.motivo === "contracargo").length,
      /* Sobre todo lo que se cobró alguna vez: las cobradas más las que se
         deshicieron. Sobre las cobradas solas, 3 devueltas de 3 ventas darían
         100 % y se leería como "todas". */
      tasa: pct(devueltas.length, ventas + devueltas.length),
    },
    upsell: {
      ventas: conUpsell.length,
      pct: pct(conUpsell.length, ventas),
      plata: conUpsell.reduce((s, o) => s + o.upsell, 0),
    },
    mails: {
      enviados: cobradas.filter((o) => o.mail === "ENVIADO").length,
      fallados: cobradas.filter((o) => o.mail === "FALLO").length,
    },
    compradores: {
      unicos: porComprador.size,
      repiten: [...porComprador.values()].filter((n) => n > 1).length,
    },
  };

  /* ── Cuándo se vende ── */
  const cuando: Cuando = { porDiaSemana: Array(7).fill(0), porHora: Array(24).fill(0) };
  for (const o of cobradas) {
    if (o.diaSemana >= 0 && o.diaSemana < 7) cuando.porDiaSemana[o.diaSemana]++;
    if (o.hora >= 0 && o.hora < 24) cuando.porHora[o.hora]++;
  }

  /* ── Por producto, sólo mirando todo ── */
  const porProducto: Estadisticas["porProducto"] = [];
  if (elegido === null) {
    for (const p of entrada.principales) {
      let v = 0, n = 0, vis = 0;
      for (const o of cobradas) {
        if (o.principal !== p.id) continue;
        v++; n += o.total - comisionCongelada(o.total, o.tasa);
      }
      for (const x of visitas) if (x.productId === p.id && x.paso === "pagina") vis += x.count;
      porProducto.push({ id: p.id, name: p.name, publicada: p.publicada, ventas: v, neto: n, visitas: vis, conversion: pct(v, vis) });
    }
    porProducto.sort((a, b) => b.neto - a.neto || b.ventas - a.ventas || b.visitas - a.visitas);
  }

  /* ── De dónde vinieron: visitas y ventas por origen ──
     Una venta con un origen que no está en la lista se descarta como una
     visita con uno inventado; una SIN origen (de antes de que se guardara, o
     con el almacenamiento bloqueado) se cuenta aparte y se dice. */
  const esOrigen = (s: string): s is Origen => (ORIGENES as readonly string[]).includes(s);
  const porOrigen = new Map<Origen, { visitas: number; checkouts: number; ventas: number; porProducto: Reparte }>();
  const cajon = (o: Origen) => {
    let c = porOrigen.get(o);
    if (!c) { c = { visitas: 0, checkouts: 0, ventas: 0, porProducto: new Map() }; porOrigen.set(o, c); }
    return c;
  };
  let conocidas = 0;
  for (const o of origenes) {
    if (!esOrigen(o.source)) continue;
    if (o.paso === "pagar") { cajon(o.source).checkouts += o.count; continue; }
    cajon(o.source).visitas += o.count;
    sumarReparto(cajon(o.source).porProducto, o.productId, { visitas: o.count });
    conocidas += o.count;
  }
  let ventasSinOrigen = 0;
  const netoDeOrigen = new Map<Origen, number>();
  for (const o of cobradas) {
    if (o.origen === null || !esOrigen(o.origen)) { ventasSinOrigen++; continue; }
    cajon(o.origen).ventas++;
    const netoDeEsta = o.total - comisionCongelada(o.total, o.tasa);
    netoDeOrigen.set(o.origen, (netoDeOrigen.get(o.origen) ?? 0) + netoDeEsta);
    sumarReparto(cajon(o.origen).porProducto, o.principal, { ventas: 1, neto: netoDeEsta });
  }
  const filas = ordenarOrigenes(
    [...porOrigen.entries()].map(([origen, c]) => ({
      origen, visitas: c.visitas, pct: pct(c.visitas, conocidas) ?? 0,
      checkouts: c.checkouts, ventas: c.ventas, neto: netoDeOrigen.get(origen) ?? 0,
      pctCheckout: pct(c.checkouts, c.visitas), conversion: pct(c.ventas, c.visitas),
      porProducto: repartoOrdenado(c.porProducto),
    })),
  );

  /* ── Carritos: los que quedaron en la puerta y los que volvieron por el mail ──
     Se filtran por producto como todo lo demás: un carrito es de la página
     donde quedó. Los recordados son los que siguen sin pagar más los que
     volvieron a pagar después del mail (ésos ya son cobradas). */
  const recuperados = cobradas.filter((o) => o.recordada).length;
  const recordados = carritosDelRango.filter((c) => c.recordado).length + recuperados;
  const carritos: Carritos = {
    abandonados: carritosDelRango.length,
    recordados,
    recuperados,
    pctRecuperados: pct(recuperados, recordados),
  };

  /* ── Las campañas: visitas y ventas por campaña, y adentro por anuncio ──
     Una campaña es (medio, nombre); sus anuncios cuelgan. Las visitas salen de
     la tabla sumada; las ventas de la orden. Un medio fuera de la lista se
     descarta, como un origen inventado. "(otras)" —las que pasaron el techo—
     figura como una campaña más, al final. */
  const esMedio = (m: string): m is Medio => (MEDIOS as readonly string[]).includes(m);
  type Acum = { visitas: number; ventas: number; neto: number };
  const nuevo = (): Acum => ({ visitas: 0, ventas: 0, neto: 0 });
  /* En "Todos" con varios productos, el producto es parte de la clave: la
     misma etiqueta en dos páginas son dos campañas. Si no, la clave no lo
     lleva y las filas salen sin producto. */
  const porCampania = new Map<string, { medio: Medio; campania: string; productId: string | null; total: Acum; anuncios: Map<string, Acum> }>();
  const cajonDe = (medio: Medio, campania: string, anuncio: string, productId: string | null): Acum => {
    const prod = repartir ? productId : null;
    const k = `${medio}\u0000${campania}\u0000${prod ?? ""}`;
    let c = porCampania.get(k);
    if (!c) { c = { medio, campania, productId: prod, total: nuevo(), anuncios: new Map() }; porCampania.set(k, c); }
    let a = c.anuncios.get(anuncio);
    if (!a) { a = nuevo(); c.anuncios.set(anuncio, a); }
    return a;
  };
  let conVisitas = 0;
  for (const v of campaniasDelRango) {
    if (!esMedio(v.medio)) continue;
    cajonDe(v.medio, v.campania, v.anuncio, v.productId).visitas += v.count;
    conVisitas += v.count;
  }
  let ventasConCampania = 0;
  let brutoConCampania = 0;
  for (const o of cobradas) {
    if (!o.campania || !esMedio(o.campania.medio)) continue;
    const a = cajonDe(o.campania.medio, o.campania.campania, o.campania.anuncio, o.principal);
    a.ventas++;
    a.neto += o.total - comisionCongelada(o.total, o.tasa);
    ventasConCampania++;
    brutoConCampania += o.total;
  }
  const ordenar = <T extends { ventas: number; visitas: number }>(xs: T[]) =>
    xs.sort((a, b) => b.ventas - a.ventas || b.visitas - a.visitas);
  const filasDeCampania: FilaDeCampania[] = [...porCampania.values()].map((c) => {
    const anuncios = ordenar([...c.anuncios.entries()].map(([anuncio, a]) => ({
      anuncio, ...a, conversion: pct(a.ventas, a.visitas),
    })));
    const total = anuncios.reduce((s, a) => ({ visitas: s.visitas + a.visitas, ventas: s.ventas + a.ventas, neto: s.neto + a.neto }), nuevo());
    return {
      medio: c.medio, campania: c.campania,
      productId: c.productId, producto: c.productId === null ? null : nombreDe(c.productId),
      ...total, conversion: pct(total.ventas, total.visitas), anuncios,
    };
  });
  ordenar(filasDeCampania);
  /* "(otras)" siempre al final: es una bolsa, no una campaña que se pueda mover. */
  filasDeCampania.sort((a, b) => Number(a.campania === OTRAS) - Number(b.campania === OTRAS));

  /* Por medio: pago, orgánico, mail, historia. Es la misma cuenta que por
     campaña, sumada por el primer nivel. Sólo los medios con algo; "otro" al
     final como bolsa. */
  const porMedioMap = new Map<Medio, Acum & { porProducto: Reparte }>();
  for (const f of filasDeCampania) {
    const m = porMedioMap.get(f.medio) ?? { ...nuevo(), porProducto: new Map() };
    m.visitas += f.visitas; m.ventas += f.ventas; m.neto += f.neto;
    sumarReparto(m.porProducto, f.productId, { visitas: f.visitas, ventas: f.ventas, neto: f.neto });
    porMedioMap.set(f.medio, m);
  }
  const porMedio: FilaDeMedio[] = ordenar(
    [...porMedioMap.entries()].map(([medio, a]) => ({
      medio, nombre: NOMBRE_MEDIO[medio], visitas: a.visitas, ventas: a.ventas, neto: a.neto,
      conversion: pct(a.ventas, a.visitas), porProducto: repartoOrdenado(a.porProducto),
    })),
  ).sort((a, b) => Number(a.medio === "otro") - Number(b.medio === "otro"));

  const netoConCampania = filasDeCampania.reduce((s, f) => s + f.neto, 0);
  const kpisDeCampanias: KpisDeCampanias = {
    visitas: conVisitas,
    ventas: ventasConCampania,
    neto: netoConCampania,
    conversion: pct(ventasConCampania, conVisitas),
    ticket: ventasConCampania > 0 ? brutoConCampania / ventasConCampania : null,
  };

  return {
    rango, kpis, serie,
    dispositivos: { movil, escritorio, pctMovil: pct(movil, movil + escritorio) },
    embudo, posventa, cuando, porProducto,
    origenes: { filas, conocidas, ventasSinOrigen },
    campanias: { filas: filasDeCampania, conVisitas, ventasConCampania, kpis: kpisDeCampanias, porMedio },
    carritos,
  };
}

/** Cuántos días abarca un rango; expuesto para los chequeos. */
export function diasDelRango(r: Rango): number {
  return diasEntreDias(r.desde, r.hasta) + 1;
}
