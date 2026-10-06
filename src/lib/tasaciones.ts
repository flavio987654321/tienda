/**
 * Pedidos de tasación de un usado (06/10/26).
 *
 * En la tienda de autos, alguien carga el auto que quiere entregar en parte de
 * pago —o vender— y la concesionaria le contesta con un número desde el panel.
 * En Argentina casi toda venta de usado viene con permuta: cada tasación es un
 * comprador que todavía no eligió auto.
 *
 * Este archivo no importa nada de servidor: lo usan el formulario de la
 * tienda, la ruta que lo recibe y la pantalla del panel.
 *
 * Sin fotos a propósito: subir archivos pide sesión, y abrir una subida
 * anónima es abrir el depósito a cualquiera. Las fotos se piden después, por
 * WhatsApp, que es donde la charla sigue igual.
 */

export const ESTADOS_DEL_USADO = ["Excelente", "Muy bueno", "Bueno", "Regular", "Para reparar"] as const;
export const COMBUSTIBLES = ["Nafta", "Diesel", "GNC", "Eléctrico", "Híbrido"] as const;
export const TRANSMISIONES = ["Manual", "Automática"] as const;

export type ModalidadTasacion = "PERMUTA" | "VENTA";
export type EstadoTasacion = "PENDIENTE" | "OFERTADA" | "ACEPTADA" | "DESCARTADA";

export const ESTADO_TASACION: Record<EstadoTasacion, { etiqueta: string; clase: string }> = {
  PENDIENTE: { etiqueta: "Sin responder", clase: "bg-amber-100 text-amber-800 panel-oscuro:bg-amber-500/15 panel-oscuro:text-amber-300" },
  OFERTADA: { etiqueta: "Oferta enviada", clase: "bg-indigo-100 text-indigo-800 panel-oscuro:bg-indigo-500/15 panel-oscuro:text-indigo-300" },
  ACEPTADA: { etiqueta: "Aceptó", clase: "bg-green-100 text-green-800 panel-oscuro:bg-green-500/15 panel-oscuro:text-green-300" },
  DESCARTADA: { etiqueta: "Descartada", clase: "bg-gray-100 text-gray-600 panel-oscuro:bg-gray-800 panel-oscuro:text-gray-400" },
};

export function esEstadoTasacion(s: unknown): s is EstadoTasacion {
  return typeof s === "string" && s in ESTADO_TASACION;
}

export const ANIO_MINIMO = 1950;
export const anioMaximo = () => new Date().getFullYear() + 1;
export const KM_MAXIMO = 2_000_000;

export type DatosTasacion = {
  nombre: string;
  telefono: string;
  marca: string;
  modelo: string;
  version: string | null;
  anio: number;
  km: number;
  combustible: string | null;
  transmision: string | null;
  estado: string | null;
  comentario: string | null;
  modalidad: ModalidadTasacion;
};

/** Texto libre: sin caracteres de control, recortado y con tope. `null` si quedó vacío. */
function texto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
  return t || null;
}

/** "120.000", "120000 km", 120000 → 120000. Punto de miles, como en todo el rubro. */
export function enteroDe(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  if (typeof v !== "string") return null;
  const d = v.replace(/,\d{1,2}$/, "").replace(/\D/g, "");
  return d ? Number(d) : null;
}

const deLista = <T extends string>(v: unknown, lista: readonly T[]): T | null =>
  typeof v === "string" && (lista as readonly string[]).includes(v) ? (v as T) : null;

/**
 * Lo que llega del formulario, validado. Devuelve los datos o el primer
 * problema en castellano (es lo que ve la persona que lo está llenando).
 */
export function validarTasacion(b: Record<string, unknown> | null | undefined): { datos: DatosTasacion } | { error: string } {
  if (!b || typeof b !== "object") return { error: "Faltan los datos del auto." };
  const nombre = texto(b.nombre, 80);
  const telefono = texto(b.telefono, 30);
  const marca = texto(b.marca, 40);
  const modelo = texto(b.modelo, 60);
  const anio = enteroDe(b.anio);
  const km = enteroDe(b.km);

  if (!nombre || nombre.length < 2) return { error: "Poné tu nombre." };
  if (!telefono || telefono.replace(/\D/g, "").length < 8) return { error: "Poné un teléfono con característica, así te pueden contestar." };
  if (!marca) return { error: "Poné la marca de tu auto." };
  if (!modelo) return { error: "Poné el modelo de tu auto." };
  if (anio == null || anio < ANIO_MINIMO || anio > anioMaximo()) return { error: `El año tiene que estar entre ${ANIO_MINIMO} y ${anioMaximo()}.` };
  if (km == null || km < 0 || km > KM_MAXIMO) return { error: "Poné los kilómetros (sólo números)." };

  return {
    datos: {
      nombre, telefono, marca, modelo,
      version: texto(b.version, 60),
      anio, km,
      combustible: deLista(b.combustible, COMBUSTIBLES),
      transmision: deLista(b.transmision, TRANSMISIONES),
      estado: deLista(b.estado, ESTADOS_DEL_USADO),
      comentario: texto(b.comentario, 600),
      modalidad: b.modalidad === "VENTA" ? "VENTA" : "PERMUTA",
    },
  };
}

/** "VW Gol Trend 1.6 · 2015 · 98.000 km" */
export function resumenDelUsado(t: { marca: string; modelo: string; version?: string | null; anio: number; km: number }): string {
  return `${[t.marca, t.modelo, t.version].filter(Boolean).join(" ")} · ${t.anio} · ${t.km.toLocaleString("es-AR")} km`;
}

/** El mensaje de WhatsApp con la oferta, listo para mandar desde el panel. */
export function mensajeDeOferta(t: { nombre: string; marca: string; modelo: string; anio: number; productoNombre?: string | null; modalidad: string },
  monto: number, moneda: string, tienda: string): string {
  const precio = (moneda === "USD" ? "USD " : "$") + monto.toLocaleString("es-AR");
  const auto = `${t.marca} ${t.modelo} ${t.anio}`;
  const destino = t.modalidad === "PERMUTA" && t.productoNombre ? ` como parte de pago del ${t.productoNombre}` : "";
  return `Hola ${t.nombre.split(/\s+/)[0]}, te escribimos de ${tienda} por la tasación de tu ${auto}. ` +
    `Te lo podemos tomar en ${precio}${destino}, sujeto a revisión del vehículo. ¿Te parece si coordinamos para verlo?`;
}
