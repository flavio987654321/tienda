/**
 * Filtrar y ordenar vehículos en la tienda (06/10/26). Lo comparten
 * `/vehiculos` y todos los templates de autos: cada template arma su portada
 * como quiera, pero el catálogo filtra igual en todos.
 *
 * Lo que arregla (grupo 5.1 de AUDITORIA-AUTOS-OCT26.md):
 * - La marca no distingue mayúsculas ni espacios ("Ford" = "FORD "), ni el
 *   apodo ("VW" = "Volkswagen").
 * - Año, km (u horas de uso en maquinaria), precio en SU moneda, combustible y
 *   transmisión.
 * - Ordenar por km, año o precio deja AL FINAL los que no tienen el dato (antes
 *   un vehículo sin km contaba como 0 y quedaba primero en "menor km").
 *
 * El filtro viaja en la dirección (`?tipo=camiones&marca=ford`): los templates
 * linkean a `/vehiculos` con el filtro puesto y el comprador puede compartirlo.
 *
 * Sin nada de servidor ni de React.
 */
import { CATEGORIAS_VEHICULO, NOMBRE_TIPO, esAtributoInterno, usaHoras, type CategoriaVehiculo } from "./fichaVehiculo";
import { monedaDe, type Moneda } from "./monedaVehiculo";
import { marcaCanonica, normalizar } from "./busquedas";

type Atributo = { key: string; value: string };
export type VehiculoFiltrable = { id: string; name: string; price: number; category?: string | null; attributes?: Atributo[] | null };

/* ── Lo que se lee de cada vehículo ─────────────────────────────────────────── */

const attr = (p: VehiculoFiltrable, ...keys: string[]) => {
  for (const k of keys) {
    const v = p.attributes?.find((a) => a.key.toLowerCase() === k.toLowerCase())?.value;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

/** "28.000", "28000 km", "28.000,5" → 28000. Sin dígitos → null. */
export function entero(v: string): number | null {
  const d = v.replace(/,\d{1,2}\s*\D*$/, "").replace(/\D/g, "");
  return d ? Number(d) : null;
}

/** Automática, "Automática (CVT)", "automatica" → "Automática". */
function grupoTransmision(v: string): string {
  const n = normalizar(v);
  if (!n) return "";
  if (n.includes("autom") || n.includes("cvt") || n.includes("dsg")) return "Automática";
  if (n.includes("manual")) return "Manual";
  return v.trim();
}

export type DatosVehiculo = {
  tipo: string;
  /** Para comparar: sin acentos, minúsculas, apodo resuelto ("vw" → "volkswagen"). */
  claveMarca: string;
  marca: string;
  anio: number | null;
  km: number | null;
  horas: number | null;
  combustible: string;
  transmision: string;
  ciudad: string;
  moneda: Moneda;
};

export function datosDe(p: VehiculoFiltrable, principal: string): DatosVehiculo {
  const marca = attr(p, "Marca");
  const anio = entero(attr(p, "Año"));
  return {
    tipo: (p.category ?? "").toLowerCase().trim(),
    claveMarca: marcaCanonica(marca),
    marca,
    anio: anio && anio > 1900 && anio < 2200 ? anio : null,
    km: entero(attr(p, "Kilómetros", "Km")),
    horas: entero(attr(p, "Horas de uso")),
    combustible: attr(p, "Combustible"),
    transmision: grupoTransmision(attr(p, "Transmisión")),
    ciudad: attr(p, "Localidad", "Ciudad / Zona", "Ciudad", "Ubicación"),
    moneda: monedaDe(p, principal),
  };
}

/* ── El filtro ──────────────────────────────────────────────────────────────── */

export type OrdenVehiculos = "recientes" | "precio_asc" | "precio_desc" | "km_asc" | "anio_desc" | "nombre";

export const ORDENES: { id: OrdenVehiculos; label: string }[] = [
  { id: "recientes", label: "Más recientes" },
  { id: "precio_asc", label: "Menor precio" },
  { id: "precio_desc", label: "Mayor precio" },
  { id: "km_asc", label: "Menos usado" },
  { id: "anio_desc", label: "Más nuevo (año)" },
  { id: "nombre", label: "Nombre A-Z" },
];

export type FiltroVehiculos = {
  q: string;
  tipo: string | null;
  /** Clave de marca (ver `claveMarca`). */
  marca: string | null;
  anioDesde: number | null;
  anioHasta: number | null;
  kmHasta: number | null;
  horasHasta: number | null;
  precioHasta: number | null;
  /** La moneda de `precioHasta`. Sin tipo de cambio: los de la otra moneda quedan afuera. */
  moneda: Moneda;
  combustible: string | null;
  transmision: string | null;
  ciudad: string | null;
  orden: OrdenVehiculos;
};

export const filtroVacio = (moneda: Moneda = "ARS"): FiltroVehiculos => ({
  q: "", tipo: null, marca: null, anioDesde: null, anioHasta: null, kmHasta: null, horasHasta: null,
  precioHasta: null, moneda, combustible: null, transmision: null, ciudad: null, orden: "recientes",
});

/** Cuántos filtros hay puestos (el orden y la moneda no cuentan). */
export function cuantosFiltros(f: FiltroVehiculos): number {
  return [f.q.trim(), f.tipo, f.marca, f.anioDesde, f.anioHasta, f.kmHasta, f.horasHasta, f.precioHasta, f.combustible, f.transmision, f.ciudad]
    .filter((x) => x !== null && x !== "").length;
}

const igual = (a: string, b: string) => normalizar(a) === normalizar(b);

export function pasaFiltro(p: VehiculoFiltrable, d: DatosVehiculo, f: FiltroVehiculos): boolean {
  if (f.tipo && d.tipo !== f.tipo) return false;
  if (f.marca && d.claveMarca !== f.marca) return false;
  // Un filtro de año, km o precio deja afuera al que no tiene el dato: no se
  // sabe si cumple, y mostrarlo sería mentirle al que filtró.
  if (f.anioDesde != null && (d.anio == null || d.anio < f.anioDesde)) return false;
  if (f.anioHasta != null && (d.anio == null || d.anio > f.anioHasta)) return false;
  if (f.kmHasta != null && (usaHoras(d.tipo) || d.km == null || d.km > f.kmHasta)) return false;
  if (f.horasHasta != null && (d.horas == null || d.horas > f.horasHasta)) return false;
  if (f.precioHasta != null && (d.moneda !== f.moneda || !(p.price > 0) || p.price > f.precioHasta)) return false;
  if (f.combustible && !igual(d.combustible, f.combustible)) return false;
  if (f.transmision && d.transmision !== f.transmision) return false;
  if (f.ciudad && !igual(d.ciudad, f.ciudad)) return false;
  const q = normalizar(f.q);
  if (q) {
    const texto = " " + normalizar([p.name, d.marca, NOMBRE_TIPO[d.tipo as CategoriaVehiculo]?.uno ?? d.tipo,
      ...(p.attributes ?? []).filter((a) => !esAtributoInterno(a.key)).map((a) => a.value)].join(" ")) + " ";
    // Cada palabra tiene que empezar alguna palabra del vehículo, en cualquier orden:
    // "hilux 2021" encuentra la Hilux 2021; "hil" también.
    if (!q.split(" ").every((w) => texto.includes(" " + w))) return false;
  }
  return true;
}

/** Los que no tienen el dato van al final, siempre (en las dos direcciones). */
function porDato(a: number | null, b: number | null, sube: boolean): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return sube ? a - b : b - a;
}

/**
 * Filtrar y ordenar. `lista` llega en el orden de "más recientes" (el que da la
 * base): ese orden se respeta para los empates.
 */
export function filtrarVehiculos<T extends VehiculoFiltrable>(lista: T[], f: FiltroVehiculos, principal: string): T[] {
  const con = lista.map((p, i) => ({ p, d: datosDe(p, principal), i })).filter((x) => pasaFiltro(x.p, x.d, f));
  const uso = (x: { d: DatosVehiculo }) => (usaHoras(x.d.tipo) ? null : x.d.km);
  const precio = (x: { p: T }) => (x.p.price > 0 ? x.p.price : null);
  con.sort((a, b) => {
    let r = 0;
    switch (f.orden) {
      case "precio_asc":
      case "precio_desc":
        // Sin tipo de cambio: primero pesos, después dólares; los "consultar" al final.
        if (precio(a) != null && precio(b) != null && a.d.moneda !== b.d.moneda) r = a.d.moneda === "ARS" ? -1 : 1;
        else r = porDato(precio(a), precio(b), f.orden === "precio_asc");
        break;
      case "km_asc": {
        // Por km; la maquinaria (horas) después de todo lo que tiene km, por horas.
        const ka = uso(a), kb = uso(b);
        r = ka != null || kb != null ? porDato(ka, kb, true) : porDato(a.d.horas, b.d.horas, true);
        break;
      }
      case "anio_desc": r = porDato(a.d.anio, b.d.anio, false); break;
      case "nombre": r = a.p.name.localeCompare(b.p.name, "es"); break;
    }
    return r || a.i - b.i;
  });
  return con.map((x) => x.p);
}

/* ── Las opciones que se ofrecen (sólo lo que hay en la tienda) ─────────────── */

export type Opcion = { valor: string; label: string; cuantos: number };

/** Agrupa sin distinguir mayúsculas; el nombre que se muestra es el que más se repite. */
function agrupar(valores: { clave: string; label: string }[]): Opcion[] {
  const m = new Map<string, { labels: Map<string, number>; cuantos: number }>();
  for (const { clave, label } of valores) {
    if (!clave) continue;
    const g = m.get(clave) ?? { labels: new Map(), cuantos: 0 };
    g.cuantos++;
    g.labels.set(label, (g.labels.get(label) ?? 0) + 1);
    m.set(clave, g);
  }
  return [...m.entries()]
    .map(([valor, g]) => ({ valor, label: [...g.labels.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0], cuantos: g.cuantos }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/** "honda" → "Honda": lo cargado todo en minúscula se muestra con mayúscula inicial.
    Lo que trae mayúsculas propias ("BMW", "McLaren") queda como está. */
function prolijo(v: string): string {
  const t = v.trim();
  return t && t === t.toLowerCase() ? t.replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : t;
}

export type OpcionesDeFiltro = {
  tipos: Opcion[];
  marcas: Opcion[];
  combustibles: Opcion[];
  transmisiones: Opcion[];
  ciudades: Opcion[];
  anioMin: number | null;
  anioMax: number | null;
  monedas: Moneda[];
  hayHoras: boolean;
};

export function opcionesDeFiltro(lista: VehiculoFiltrable[], principal: string): OpcionesDeFiltro {
  const ds = lista.map((p) => datosDe(p, principal));
  const tipos = agrupar(ds.map((d) => ({ clave: d.tipo, label: NOMBRE_TIPO[d.tipo as CategoriaVehiculo]?.varios ?? prolijo(d.tipo) })));
  // Los tipos en el orden del rubro (autos, camionetas, motos…), no alfabético.
  const orden = (v: string) => { const i = (CATEGORIAS_VEHICULO as readonly string[]).indexOf(v); return i < 0 ? 99 : i; };
  tipos.sort((a, b) => orden(a.valor) - orden(b.valor) || a.label.localeCompare(b.label, "es"));
  const anios = ds.map((d) => d.anio).filter((a): a is number => a != null);
  return {
    tipos,
    marcas: agrupar(ds.map((d) => ({ clave: d.claveMarca, label: prolijo(d.marca) }))),
    combustibles: agrupar(ds.map((d) => ({ clave: normalizar(d.combustible), label: d.combustible }))),
    transmisiones: agrupar(ds.map((d) => ({ clave: d.transmision, label: d.transmision }))),
    ciudades: agrupar(ds.map((d) => ({ clave: normalizar(d.ciudad), label: d.ciudad }))),
    anioMin: anios.length ? Math.min(...anios) : null,
    anioMax: anios.length ? Math.max(...anios) : null,
    monedas: [...new Set(ds.map((d) => d.moneda))].sort((a) => (a === "ARS" ? -1 : 1)),
    hayHoras: ds.some((d) => usaHoras(d.tipo)),
  };
}

/* ── En la dirección ────────────────────────────────────────────────────────── */

const num = (v: string | null, min: number, max: number) => {
  const n = v && /^\d{1,12}$/.test(v) ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const texto = (v: string | null, largo = 60) => (v ? v.trim().slice(0, largo) || null : null);

/** Lo que viene en la dirección nunca se cree: números con rango, textos cortos. */
export function filtroDesdeUrl(sp: { get(k: string): string | null } | null | undefined, principal: Moneda): FiltroVehiculos {
  const f = filtroVacio(principal);
  if (!sp) return f;
  const orden = sp.get("orden");
  const moneda = sp.get("moneda");
  return {
    ...f,
    q: texto(sp.get("q"), 80) ?? "",
    tipo: texto(sp.get("tipo"), 30)?.toLowerCase() ?? null,
    marca: sp.get("marca") ? marcaCanonica(sp.get("marca")) || null : null,
    anioDesde: num(sp.get("desde"), 1900, 2200),
    anioHasta: num(sp.get("hasta"), 1900, 2200),
    kmHasta: num(sp.get("km"), 0, 10_000_000),
    horasHasta: num(sp.get("horas"), 0, 1_000_000),
    precioHasta: num(sp.get("precio"), 1, 1e12),
    moneda: moneda === "USD" || moneda === "ARS" ? moneda : principal,
    combustible: texto(sp.get("combustible")),
    transmision: texto(sp.get("transmision")),
    ciudad: texto(sp.get("ciudad")),
    orden: ORDENES.some((o) => o.id === orden) ? (orden as OrdenVehiculos) : "recientes",
  };
}

/** Sólo lo que está puesto, para que la dirección quede corta. */
export function filtroAUrl(f: FiltroVehiculos, principal: Moneda): URLSearchParams {
  const sp = new URLSearchParams();
  const pon = (k: string, v: string | number | null) => { if (v !== null && v !== "") sp.set(k, String(v)); };
  pon("q", f.q.trim());
  pon("tipo", f.tipo);
  pon("marca", f.marca);
  pon("desde", f.anioDesde);
  pon("hasta", f.anioHasta);
  pon("km", f.kmHasta);
  pon("horas", f.horasHasta);
  pon("precio", f.precioHasta);
  if (f.precioHasta != null && f.moneda !== principal) sp.set("moneda", f.moneda);
  pon("combustible", f.combustible);
  pon("transmision", f.transmision);
  pon("ciudad", f.ciudad);
  if (f.orden !== "recientes") sp.set("orden", f.orden);
  return sp;
}

/** El link a `/vehiculos` con un filtro puesto, para las portadas de los templates. */
export function linkAVehiculos(slug: string, filtro: Partial<Record<"tipo" | "marca" | "q", string>> = {}, deEditor = false): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filtro)) if (v) sp.set(k, v);
  if (deEditor) sp.set("from", "editor");
  const s = sp.toString();
  return `/tienda/${slug}/vehiculos${s ? `?${s}` : ""}`;
}
