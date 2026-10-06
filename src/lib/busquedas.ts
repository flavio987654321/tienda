/**
 * "Avisame si entra" (06/10/26).
 *
 * Alguien busca un auto que la concesionaria no tiene. En vez de irse, deja
 * qué busca y su teléfono; cuando entra uno que coincide, la dueña se entera y
 * le avisa por WhatsApp (con el mensaje y el link armados). Además, sumadas,
 * las búsquedas dicen qué se está pidiendo: sirve para saber qué comprar.
 *
 * Por qué avisa la DUEÑA y no nosotros: no hay permiso de WhatsApp de Meta
 * para mandar mensajes automáticos, y el comprador no tiene cuenta. Un aviso
 * de la concesionaria, además, ya es el primer contacto de la venta.
 *
 * Este archivo no importa nada de servidor.
 */
import { CATEGORIAS_VEHICULO, NOMBRE_TIPO, type CategoriaVehiculo } from "./fichaVehiculo";

/** Todos los tipos de vehículo (ver lib/fichaVehiculo), con su nombre en singular. */
export const CATEGORIAS_BUSQUEDA = CATEGORIAS_VEHICULO.map((id) => ({ id, label: NOMBRE_TIPO[id].uno }));
export type CategoriaBusqueda = CategoriaVehiculo;

/** Una búsqueda que no encontró nada en 90 días se cierra sola. */
export const DIAS_VIGENCIA = 90;

export type DatosBusqueda = {
  nombre: string;
  telefono: string;
  categoria: CategoriaBusqueda | null;
  marca: string | null;
  modelo: string | null;
  anioDesde: number | null;
  precioHasta: number | null;
  comentario: string | null;
};

function texto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}
function entero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
  if (typeof v !== "string") return null;
  const d = v.replace(/,\d{1,2}$/, "").replace(/\D/g, "");
  return d && Number(d) > 0 ? Number(d) : null;
}

/** Lo que llega de la tienda, validado. Al menos UN criterio además del contacto. */
export function validarBusqueda(b: Record<string, unknown> | null | undefined, anioActual = new Date().getFullYear()): { datos: DatosBusqueda } | { error: string } {
  if (!b || typeof b !== "object") return { error: "Faltan datos." };
  const nombre = texto(b.nombre, 80);
  const telefono = texto(b.telefono, 30);
  if (!nombre || nombre.length < 2) return { error: "Poné tu nombre." };
  if (!telefono || telefono.replace(/\D/g, "").length < 8) return { error: "Poné un teléfono con característica, así te pueden avisar." };

  const categoria = CATEGORIAS_BUSQUEDA.some((c) => c.id === b.categoria) ? (b.categoria as CategoriaBusqueda) : null;
  /* Una marca "-" o "..." no es un criterio: normalizada queda vacía y
     coincidía con TODOS los vehículos (un aviso por cada auto del stock). */
  const conLetras = (s: string | null) => (s && normalizar(s) ? s : null);
  const marca = conLetras(texto(b.marca, 40));
  const modelo = conLetras(texto(b.modelo, 60));
  const anioDesde = entero(b.anioDesde);
  const precioHasta = entero(b.precioHasta);
  if (anioDesde != null && (anioDesde < 1950 || anioDesde > anioActual + 1)) return { error: `El año tiene que estar entre 1950 y ${anioActual + 1}.` };
  if (precioHasta != null && precioHasta > 10_000_000_000) return { error: "Revisá el precio máximo." };
  if (!categoria && !marca && !modelo && anioDesde == null && precioHasta == null) {
    return { error: "Contanos qué buscás: al menos la marca, el modelo o hasta cuánto querés gastar." };
  }
  return { datos: { nombre, telefono, categoria, marca, modelo, anioDesde, precioHasta, comentario: texto(b.comentario, 300) } };
}

/* ── Si un vehículo coincide ───────────────────────────────────────────── */

/** "Citroën  C4" → "citroen c4". Sin acentos, minúsculas, un espacio. */
export function normalizar(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Cómo se dice en la calle → cómo se carga. */
const ALIAS_MARCA: Record<string, string> = {
  vw: "volkswagen", volks: "volkswagen", chevy: "chevrolet", chevrolet: "chevrolet",
  mercedes: "mercedes benz", mb: "mercedes benz", "mercedes benz": "mercedes benz",
  citroen: "citroen", alfa: "alfa romeo", land: "land rover",
};
const marcaCanonica = (s: string | null | undefined) => {
  const n = normalizar(s);
  return ALIAS_MARCA[n] ?? n;
};

/** Lo que se compara (desde la base la categoría llega como texto común). */
export type CriteriosBusqueda = { categoria: string | null; marca: string | null; modelo: string | null; anioDesde: number | null; precioHasta: number | null };

export type VehiculoParaBuscar = {
  categoria: string;
  marca: string | null;
  modelo: string | null;
  nombre: string;
  anio: number | null;
  precio: number;
  /** Publicado en otra moneda que la principal de la tienda (ver lib/monedaVehiculo).
      El "hasta cuánto" de la búsqueda está en la principal: sin tipo de cambio,
      contra ese tope no se puede comparar. */
  enOtraMoneda?: boolean;
};

export function coincide(b: CriteriosBusqueda, v: VehiculoParaBuscar): boolean {
  if (b.categoria && normalizar(v.categoria) !== b.categoria) return false;
  // Lo que se lee del vehículo: marca, modelo y nombre juntos (muchos sólo
  // completan el nombre, "Gol Trend 1.6 2015").
  const todo = ` ${marcaCanonica(v.marca)} ${normalizar(v.modelo)} ${normalizar(v.nombre)} `;
  const m = marcaCanonica(b.marca);
  if (m) {
    if (!todo.includes(` ${m} `) && marcaCanonica(v.marca) !== m) return false;
  }
  if (b.modelo) {
    // Cada palabra del modelo buscado tiene que estar, ENTERA ("gol trend" →
    // gol y trend). Aceptar el comienzo de una palabra hacía que "Gol" encontrara
    // un "Golf" (lo atrapó el chequeo).
    const palabras = normalizar(b.modelo).split(" ").filter(Boolean);
    if (!palabras.every((p) => todo.includes(` ${p} `))) return false;
  }
  if (b.anioDesde != null && (v.anio == null || v.anio < b.anioDesde)) return false;
  if (b.precioHasta != null && (v.enOtraMoneda || !(v.precio > 0 && v.precio <= b.precioHasta))) return false;
  return true;
}

/** "Volkswagen Gol Trend · 2015 en adelante · hasta $9.000.000" */
export function resumenDeBusqueda(b: CriteriosBusqueda, moneda = "ARS"): string {
  const cat = CATEGORIAS_BUSQUEDA.find((c) => c.id === b.categoria)?.label;
  const que = [b.marca, b.modelo].filter(Boolean).join(" ") || (cat ? `${cat} (cualquier marca)` : "Cualquier vehículo");
  const partes = [cat && (b.marca || b.modelo) ? `${que} (${cat.toLowerCase()})` : que];
  if (b.anioDesde) partes.push(`${b.anioDesde} en adelante`);
  if (b.precioHasta) partes.push(`hasta ${moneda === "USD" ? "USD " : "$"}${b.precioHasta.toLocaleString("es-AR")}`);
  return partes.join(" · ");
}

/** El mensaje para avisarle al comprador, con el link al vehículo. */
export function mensajeDeAviso(nombre: string, vehiculo: string, precio: string, link: string, tienda: string): string {
  return `Hola ${nombre.trim().split(/\s+/)[0]}! Te escribo de ${tienda}: nos dejaste tu búsqueda y entró un ${vehiculo} a ${precio}. Te paso el link para que lo veas: ${link}`;
}

/** Lo que más se pide: marca (y modelo si lo dijeron), contado. */
export function demanda(busquedas: Pick<DatosBusqueda, "marca" | "modelo">[], tope = 6): { que: string; marca: string | null; modelo: string | null; cuantas: number }[] {
  const cuenta = new Map<string, { que: string; marca: string | null; modelo: string | null; cuantas: number }>();
  for (const b of busquedas) {
    if (!b.marca && !b.modelo) continue;
    const clave = `${marcaCanonica(b.marca)}|${normalizar(b.modelo)}`;
    const que = [b.marca, b.modelo].filter(Boolean).join(" ");
    const e = cuenta.get(clave) ?? { que, marca: b.marca, modelo: b.modelo, cuantas: 0 };
    e.cuantas++;
    cuenta.set(clave, e);
  }
  return [...cuenta.values()].sort((a, b) => b.cuantas - a.cuantas).slice(0, tope);
}
