/**
 * Para qué uso sirve cada vehículo (16/10/26, template Auto Drive).
 *
 * Es la versión de todos los días de `trabajoVehiculo` (la de Auto Ruta): Ruta
 * pregunta por el trabajo —reparto, ruta larga, campo, obra— porque vende
 * camiones; Drive vende autos, motos y camionetas, y quien compra piensa en la
 * ciudad, la familia o las vacaciones. Flavio pidió llevar el "¿Para qué lo
 * necesitás?" de Ruta a Drive, con opciones propias.
 *
 * Como en Ruta, no hay un campo nuevo: se deduce de lo que la agencia ya carga
 * —tipo, subtipo, carrocería y tracción— y un vehículo puede servir para varios
 * usos (un SUV es de familia y de viaje; con 4x4, también de aventura). Los
 * repuestos no sirven para ninguno.
 */
import type { StorefrontProduct } from "@/hooks/useStorefront";

export const USOS = ["ciudad", "familia", "viajes", "trabajo", "aventura"] as const;
export type Uso = (typeof USOS)[number];

export const NOMBRE_USO: Record<Uso, { titulo: string; bajada: string }> = {
  ciudad: { titulo: "Para la ciudad", bajada: "Chicos, gastan poco y se estacionan fácil: hatchbacks, sedanes, scooters y motos urbanas." },
  familia: { titulo: "Para la familia", bajada: "Espacio y baúl para todos: SUV, rurales, monovolúmenes y vans." },
  viajes: { titulo: "Para viajar", bajada: "Cómodos en la ruta: sedanes, SUV y motos para hacer kilómetros." },
  trabajo: { titulo: "Para trabajar", bajada: "Pickups, furgones, utilitarios y camiones para la carga de todos los días." },
  aventura: { titulo: "Para salir del asfalto", bajada: "4x4, cuatris y motos trail para el barro, la arena y el campo." },
};

export function esUso(v: unknown): v is Uso {
  return typeof v === "string" && (USOS as readonly string[]).includes(v);
}

type Vehiculo = Pick<StorefrontProduct, "category" | "subcategory" | "attributes">;
const minus = (v: string | null | undefined) => (v ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const dato = (p: Vehiculo, clave: string) => minus(p.attributes?.find((a) => minus(a.key) === minus(clave))?.value);

export function usosDe(p: Vehiculo): Uso[] {
  const tipo = minus(p.category);
  const forma = `${minus(p.subcategory)} ${dato(p, "Carrocería")}`;
  const traccion = dato(p, "Tracción");
  const u = new Set<Uso>();
  const tiene = (...xs: string[]) => xs.some((x) => forma.includes(x));

  if (tipo === "autos") {
    if (tiene("hatch", "coupe", "convertible", "cabrio")) u.add("ciudad");
    if (tiene("sedan")) { u.add("ciudad"); u.add("viajes"); }
    if (tiene("suv")) { u.add("familia"); u.add("viajes"); }
    if (tiene("rural", "familiar", "monovolumen", "minivan")) u.add("familia");
    if (u.size === 0) u.add("ciudad");
  }
  if (tipo === "camionetas") {
    if (tiene("van", "utilitario", "furgon")) u.add("trabajo");
    else if (tiene("suv")) { u.add("familia"); u.add("viajes"); }
    else u.add("trabajo"); // una pickup, o una camioneta de la que no se sabe la forma
    if (tiene("doble")) u.add("familia");
  }
  if (tipo === "utilitarios" || tipo === "camiones" || tipo === "maquinaria") u.add("trabajo");
  if (tipo === "cuatriciclos") u.add("aventura");
  if (tipo === "motos") {
    if (tiene("trail", "enduro", "cross", "adventure")) { u.add("aventura"); u.add("viajes"); }
    else if (tiene("touring", "custom", "chopper")) u.add("viajes");
    else u.add("ciudad"); // scooter, naked, street o sin dato
  }
  if (traccion.includes("4x4") || traccion.includes("awd") || traccion.includes("4wd")) u.add("aventura");

  return USOS.filter((x) => u.has(x));
}

/** Cuántos vehículos hay para cada uso (los que no sirven para ninguno no cuentan). */
export function cuantosPorUso(lista: Vehiculo[]): Record<Uso, number> {
  const c = Object.fromEntries(USOS.map((x) => [x, 0])) as Record<Uso, number>;
  for (const p of lista) for (const x of usosDe(p)) c[x]++;
  return c;
}
