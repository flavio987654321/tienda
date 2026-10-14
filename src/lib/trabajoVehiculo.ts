/**
 * Para qué trabajo sirve cada unidad (15/10/26, template Auto Ruta).
 *
 * Quien compra un camión no piensa en la marca: piensa en el trabajo. La
 * portada de Ruta pregunta "¿para qué lo necesitás?" y muestra lo que sirve.
 * No hay un campo "trabajo": se deduce de lo que la agencia ya carga —tipo de
 * vehículo, subtipo, carrocería y tracción— así funciona con el stock que ya
 * está publicado, sin pedirle nada nuevo a nadie.
 *
 * Una unidad puede servir para varios trabajos (un mediano con caja seca hace
 * reparto y ruta). Un auto o una moto no sirven para ninguno: en Ruta aparecen
 * en "Todo el stock", no en un trabajo.
 *
 * El TAMAÑO sale de la capacidad de carga si la cargaron (campo opcional desde
 * el 15/10/26) y, si no, del subtipo (liviano, mediano, pesado, semi).
 */
import type { StorefrontProduct } from "@/hooks/useStorefront";

export const TRABAJOS = ["reparto", "ruta", "campo", "obra"] as const;
export type Trabajo = (typeof TRABAJOS)[number];

export const NOMBRE_TRABAJO: Record<Trabajo, { titulo: string; bajada: string }> = {
  reparto: { titulo: "Reparto urbano", bajada: "Furgones, utilitarios y camiones livianos para moverse en la ciudad." },
  ruta: { titulo: "Ruta larga", bajada: "Camiones medianos, pesados y semis para hacer kilómetros con carga." },
  campo: { titulo: "Campo", bajada: "Tractores, maquinaria, pickups 4x4 y jaulas para el trabajo rural." },
  obra: { titulo: "Obra", bajada: "Volcadores, playos y chasis para la construcción." },
};

export const TAMANOS = ["liviano", "mediano", "pesado"] as const;
export type Tamano = (typeof TAMANOS)[number];

export const NOMBRE_TAMANO: Record<Tamano, { titulo: string; detalle: string }> = {
  liviano: { titulo: "Liviano", detalle: "Hasta 3,5 t" },
  mediano: { titulo: "Mediano", detalle: "De 3,5 a 12 t" },
  pesado: { titulo: "Pesado", detalle: "Más de 12 t" },
};

/** La clave con la que el formulario del panel guarda la capacidad. */
export const CLAVE_CAPACIDAD = "Capacidad de carga (kg)";

type Vehiculo = Pick<StorefrontProduct, "category" | "subcategory" | "attributes">;

const minus = (v: string | null | undefined) => (v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const dato = (p: Vehiculo, clave: string) => minus(p.attributes?.find((a) => minus(a.key) === minus(clave))?.value);

/** Los kilos de carga, si los cargaron. "8.000", "8000 kg" y "8 t" dan 8000. */
export function capacidadDe(p: Vehiculo): number | null {
  const crudo = dato(p, CLAVE_CAPACIDAD) || dato(p, "Capacidad de carga");
  if (!crudo) return null;
  const toneladas = /^\s*([\d.,]+)\s*(t|tn|ton|toneladas?)\s*$/.exec(crudo);
  if (toneladas) {
    const n = Number(toneladas[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : null;
  }
  const d = crudo.replace(/,\d+$/, "").replace(/\D/g, "");
  const n = d ? Number(d) : 0;
  return n > 0 && n < 100_000 ? n : null;
}

export function tamanoDe(p: Vehiculo): Tamano | null {
  const kg = capacidadDe(p);
  if (kg != null) return kg <= 3500 ? "liviano" : kg <= 12000 ? "mediano" : "pesado";
  const tipo = minus(p.category);
  const sub = minus(p.subcategory);
  if (tipo === "camiones") {
    if (sub.includes("liviano")) return "liviano";
    if (sub.includes("mediano")) return "mediano";
    if (sub.includes("pesado") || sub.includes("tractor") || sub.includes("semi")) return "pesado";
    return null;
  }
  if (tipo === "utilitarios" || tipo === "camionetas") return "liviano";
  return null;
}

export function trabajosDe(p: Vehiculo): Trabajo[] {
  const tipo = minus(p.category);
  const sub = minus(p.subcategory);
  const carroceria = dato(p, "Carrocería");
  const traccion = dato(p, "Tracción");
  const t = new Set<Trabajo>();

  if (tipo === "maquinaria" || tipo === "cuatriciclos") t.add("campo");

  if (tipo === "camionetas") {
    if (sub.includes("van") || sub.includes("utilitario") || carroceria.includes("van")) t.add("reparto");
    else {
      if (traccion.includes("4x4") || traccion.includes("awd")) t.add("campo");
      if (sub.includes("pickup") || carroceria.includes("pickup")) { t.add("obra"); t.add("campo"); }
    }
  }

  if (tipo === "utilitarios") {
    t.add("reparto");
    if (sub.includes("chasis") || carroceria.includes("chasis")) t.add("obra");
  }

  if (tipo === "camiones") {
    const tam = tamanoDe(p);
    if (tam === "liviano") t.add("reparto");
    if (tam === "mediano") { t.add("reparto"); t.add("ruta"); }
    if (tam === "pesado") t.add("ruta");
    if (sub.includes("volcador") || carroceria.includes("volcador")) t.add("obra");
    if (sub.includes("chasis") || carroceria.includes("chasis") || carroceria.includes("playo")) t.add("obra");
    if (carroceria.includes("jaula")) t.add("campo");
    if (carroceria.includes("tanque") || carroceria.includes("semi") || sub.includes("semi")) t.add("ruta");
    if (carroceria.includes("termica") || carroceria.includes("refrigerad")) { t.add("reparto"); t.add("ruta"); }
    // Un camión del que no se sabe nada igual es de trabajo: va a ruta.
    if (t.size === 0) t.add("ruta");
  }

  return TRABAJOS.filter((x) => t.has(x));
}

/** Cuántas unidades hay para cada trabajo (las que no sirven para ninguno no cuentan). */
export function cuantosPorTrabajo(lista: Vehiculo[]): Record<Trabajo, number> {
  const c: Record<Trabajo, number> = { reparto: 0, ruta: 0, campo: 0, obra: 0 };
  for (const p of lista) for (const t of trabajosDe(p)) c[t]++;
  return c;
}

export function esTrabajo(v: unknown): v is Trabajo {
  return typeof v === "string" && (TRABAJOS as readonly string[]).includes(v);
}
export function esTamano(v: unknown): v is Tamano {
  return typeof v === "string" && (TAMANOS as readonly string[]).includes(v);
}
