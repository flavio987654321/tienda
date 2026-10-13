/**
 * El catálogo de VEHÍCULOS para Meta (13/10/26), aparte del de productos.
 *
 * El feed de siempre (`/api/store/feed`) está pensado para ropa: un vehículo
 * entraba como producto común, "nuevo" aunque fuera usado, con la tienda como
 * marca y sin año ni km. Meta tiene un tipo de catálogo propio para vehículos
 * (los anuncios de inventario de autos) con sus campos obligatorios:
 * https://developers.facebook.com/docs/marketing-api/auto-ads/reference
 *
 *   vehicle_id, title, description, url, make, model, year, mileage.value,
 *   mileage.unit, image[0].url, body_style, price, exterior_color,
 *   state_of_vehicle + de la agencia: address, latitude, longitude.
 *
 * Va en CSV: es el formato que Meta documenta con estos nombres de columna
 * tal cual ("mileage.value", "image[0].url").
 *
 * Lo que no se puede mandar bien NO se manda: sin marca, modelo, año o foto,
 * el vehículo queda afuera y se cuenta en `salteados` (Meta lo rechazaría
 * igual, y uno rechazado ensucia el diagnóstico del catálogo entero).
 * Tampoco van las máquinas agrícolas —se miden en horas, no en km—, los
 * repuestos, los accesorios ni lo vendido.
 */

import { fotoParaMeta } from "@/lib/metaFeed";

export type ProductoParaFeed = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string;
  category: string | null;
  attributes: string;
  vehicleStatus: string | null;
};

export type Ubicacion = { lat: number; lng: number };

/** Lo que no son unidades a la venta, o no se miden en km. */
const AFUERA = new Set(["repuestos", "accesorios", "maquinaria"]);

/** La capital de cada provincia: la ubicación cuando no se pudo afinar por localidad. */
export const CENTRO_DE_PROVINCIA: Record<string, Ubicacion> = {
  "Buenos Aires": { lat: -34.921, lng: -57.955 }, "CABA": { lat: -34.604, lng: -58.382 },
  "Catamarca": { lat: -28.469, lng: -65.779 }, "Chaco": { lat: -27.451, lng: -58.987 },
  "Chubut": { lat: -43.300, lng: -65.102 }, "Córdoba": { lat: -31.420, lng: -64.188 },
  "Corrientes": { lat: -27.469, lng: -58.830 }, "Entre Ríos": { lat: -31.732, lng: -60.529 },
  "Formosa": { lat: -26.185, lng: -58.173 }, "Jujuy": { lat: -24.186, lng: -65.299 },
  "La Pampa": { lat: -36.617, lng: -64.290 }, "La Rioja": { lat: -29.413, lng: -66.856 },
  "Mendoza": { lat: -32.890, lng: -68.845 }, "Misiones": { lat: -27.367, lng: -55.896 },
  "Neuquén": { lat: -38.952, lng: -68.059 }, "Río Negro": { lat: -40.813, lng: -62.997 },
  "Salta": { lat: -24.783, lng: -65.412 }, "San Juan": { lat: -31.537, lng: -68.536 },
  "San Luis": { lat: -33.301, lng: -66.338 }, "Santa Cruz": { lat: -51.623, lng: -69.216 },
  "Santa Fe": { lat: -31.633, lng: -60.700 }, "Santiago del Estero": { lat: -27.795, lng: -64.262 },
  "Tierra del Fuego": { lat: -54.801, lng: -68.303 }, "Tucumán": { lat: -26.808, lng: -65.217 },
};

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function atributos(json: string): Record<string, string> {
  try {
    const lista = JSON.parse(json || "[]") as { key?: string; value?: unknown }[];
    const out: Record<string, string> = {};
    for (const a of Array.isArray(lista) ? lista : []) if (a?.key && a.value != null && String(a.value).trim()) out[a.key] = String(a.value).trim();
    return out;
  } catch {
    return {};
  }
}

function fotos(json: string): string[] {
  try {
    const lista = JSON.parse(json || "[]") as unknown[];
    return (Array.isArray(lista) ? lista : [])
      .map((x) => (typeof x === "string" ? x : (x as { url?: string })?.url ?? ""))
      .filter((u) => /^https:\/\//.test(u));
  } catch {
    return [];
  }
}

/** La carrocería de la ficha → la lista cerrada de Meta. */
export function bodyStyle(carroceria: string | undefined, categoria: string | null): string {
  const c = sinAcentos(carroceria ?? "");
  if (c.startsWith("sedan")) return "SEDAN";
  if (c === "suv") return "SUV";
  if (c.startsWith("hatchback")) return "HATCHBACK";
  if (c.startsWith("coupe")) return "COUPE";
  if (c.startsWith("convertible")) return "CONVERTIBLE";
  if (c.startsWith("rural") || c.includes("familiar")) return "WAGON";
  if (c.startsWith("monovolumen") || c.includes("minivan")) return "MINIVAN";
  if (c.startsWith("pickup")) return "TRUCK";
  if (c.startsWith("van") || c.startsWith("furgon") || c.startsWith("combi") || c.startsWith("minibus") || c.startsWith("chasis cabina")) return "VAN";
  if (categoria === "camiones") return "TRUCK";
  if (categoria === "utilitarios") return "VAN";
  if (categoria === "camionetas") return "TRUCK";
  return "OTHER";
}

/** Qué clase de vehículo es, para Meta. */
export function tipoDeVehiculo(categoria: string | null): string {
  switch (categoria) {
    case "motos": return "MOTORCYCLE";
    case "cuatriciclos": return "POWERSPORT";
    case "camiones": case "utilitarios": return "COMMERCIAL";
    case "autos": case "camionetas": return "CAR_TRUCK";
    default: return "OTHER";
  }
}

export function combustible(v: string | undefined): string | null {
  const c = sinAcentos(v ?? "");
  if (!c) return null;
  if (c.startsWith("nafta")) return "GASOLINE";
  if (c.startsWith("diesel")) return "DIESEL";
  if (c.startsWith("electric")) return "ELECTRIC";
  if (c.startsWith("hibrid")) return "HYBRID";
  return "OTHER";
}

/** Meta sólo distingue manual de automática. Lo que no se puede ubicar, no va. */
export function transmision(v: string | undefined): string | null {
  const c = sinAcentos(v ?? "");
  if (c.startsWith("manual") || c.startsWith("mecanica")) return "Manual";
  if (c.startsWith("automat") || c === "cvt" || c.startsWith("automatica")) return "Automatic";
  return null;
}

/** "0 km" es nuevo; cualquier otra condición, usado. */
export const estadoDelVehiculo = (condicion: string | undefined) => (/^0\s*km$/i.test((condicion ?? "").trim()) ? "NEW" : "USED");

const numero = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export type FilaVehiculo = Record<string, string>;

export const COLUMNAS = [
  "vehicle_id", "title", "description", "url", "make", "model", "year", "trim",
  "mileage.value", "mileage.unit", "image[0].url", "image[1].url", "image[2].url", "image[3].url", "image[4].url",
  "body_style", "vehicle_type", "price", "sale_price", "exterior_color", "state_of_vehicle",
  "transmission", "fuel_type", "availability", "address", "latitude", "longitude", "dealer_name",
] as const;

/**
 * Un vehículo de la tienda → una fila del feed, o el motivo por el que no va.
 * `ubicacionDe` resuelve la provincia + localidad a coordenadas (ver la ruta).
 */
export function filaDeVehiculo(
  p: ProductoParaFeed,
  { urlBase, slug, moneda, tienda, ubicacionDe }: {
    urlBase: string; slug: string; moneda: (p: ProductoParaFeed) => string; tienda: string;
    ubicacionDe: (provincia: string, localidad: string | undefined) => Ubicacion | null;
  },
): { fila: FilaVehiculo } | { salteado: string } {
  if (AFUERA.has(p.category ?? "")) return { salteado: "no es un vehículo con km" };
  if (p.vehicleStatus === "SOLD") return { salteado: "vendido" };
  const a = atributos(p.attributes);
  const imgs = fotos(p.images);
  const anio = numero(a["Año"]);
  if (!a["Marca"] || !a["Modelo"]) return { salteado: "le falta marca o modelo" };
  if (!(anio >= 1900 && anio <= 2100)) return { salteado: "le falta el año" };
  if (!imgs.length) return { salteado: "no tiene foto" };
  if (!(p.price > 0)) return { salteado: "no tiene precio" };
  const provincia = a["Provincia"];
  const ubicacion = provincia ? ubicacionDe(provincia, a["Localidad"]) : null;
  if (!provincia || !ubicacion) return { salteado: "le falta la provincia" };

  const km = numero(a["Kilómetros"] ?? a["Km"]);
  const mon = moneda(p);
  const oferta = !!p.comparePrice && p.comparePrice > p.price;
  const descripcion = (p.description ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  /* La dirección como la documenta Meta: un solo campo con las partes. Sin
     calle cargada en la ficha, la localidad hace de primera línea. */
  const partes = [`addr1: '${(a["Localidad"] ?? provincia).replace(/'/g, "")}'`, `city: '${(a["Localidad"] ?? provincia).replace(/'/g, "")}'`,
    `region: '${provincia.replace(/'/g, "")}'`, `country: 'AR'`, ...(a["Código Postal"] ? [`postal_code: '${a["Código Postal"].replace(/'/g, "")}'`] : [])];

  const fila: FilaVehiculo = {
    vehicle_id: p.id,
    title: p.name.slice(0, 200),
    description: (descripcion || p.name).slice(0, 5000),
    url: `${urlBase}/tienda/${slug}/producto/${encodeURIComponent(p.id)}`,
    make: a["Marca"],
    model: a["Modelo"],
    year: String(anio),
    trim: a["Versión"] ?? "",
    "mileage.value": String(Number.isFinite(km) ? km : 0),
    "mileage.unit": "KM",
    body_style: bodyStyle(a["Carrocería"], p.category),
    vehicle_type: tipoDeVehiculo(p.category),
    price: `${(oferta ? p.comparePrice! : p.price).toFixed(2)} ${mon}`,
    sale_price: oferta ? `${p.price.toFixed(2)} ${mon}` : "",
    // Obligatorio para Meta y opcional en nuestra ficha: sin color cargado, "Otro".
    exterior_color: a["Color"] ?? "Otro",
    state_of_vehicle: estadoDelVehiculo(a["Condición"]),
    transmission: transmision(a["Transmisión"]) ?? "",
    fuel_type: combustible(a["Combustible"]) ?? "",
    availability: p.vehicleStatus === "RESERVED" ? "not_available" : "available",
    address: `{${partes.join(", ")}}`,
    latitude: ubicacion.lat.toFixed(5),
    longitude: ubicacion.lng.toFixed(5),
    dealer_name: tienda,
  };
  // En JPG: Meta no acepta WebP. Ver /api/feed-foto.
  imgs.slice(0, 5).forEach((u, i) => { fila[`image[${i}].url`] = fotoParaMeta(u, urlBase); });
  return { fila };
}

/** Una celda de CSV: entre comillas, con las comillas de adentro duplicadas. */
const celda = (v: string | undefined) => `"${(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

export function aCsv(filas: FilaVehiculo[]): string {
  return [COLUMNAS.join(","), ...filas.map((f) => COLUMNAS.map((c) => celda(f[c])).join(","))].join("\n") + "\n";
}
