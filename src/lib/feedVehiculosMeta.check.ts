/**
 * Chequeos del feed de vehículos para Meta. Se corre a mano:
 *
 *   npx tsx src/lib/feedVehiculosMeta.check.ts
 *
 * Meta rechaza la fila entera si un valor no está en su lista (body_style,
 * state_of_vehicle) y no da error de nuestro lado: el vehículo simplemente no
 * aparece en el catálogo.
 */
import { aCsv, bodyStyle, combustible, estadoDelVehiculo, filaDeVehiculo, tipoDeVehiculo, transmision, traccion, COLUMNAS, type ProductoParaFeed } from "./feedVehiculosMeta";
import { PROVINCIAS_ARGENTINA } from "./provincias";
import { CENTRO_DE_PROVINCIA } from "./feedVehiculosMeta";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const BODY = ["CONVERTIBLE", "COUPE", "HATCHBACK", "MINIVAN", "TRUCK", "SUV", "SEDAN", "VAN", "WAGON", "CROSSOVER", "SMALL_CAR", "OTHER"];
const opciones = ["Sedán", "SUV", "Hatchback", "Coupé", "Convertible", "Rural / Familiar", "Monovolumen", "Pickup cabina simple", "Pickup cabina doble", "Van",
  "Chasis", "Caja seca", "Furgón", "Furgón techo alto", "Combi / pasajeros", "Chasis cabina", "Minibús", "Naked", "Scooter", "Cuatriciclo", ""];
for (const o of opciones) chequear(`carrocería "${o}" → valor de Meta`, BODY.includes(bodyStyle(o, null)), bodyStyle(o, null));
chequear("Sedán → SEDAN", bodyStyle("Sedán", "autos") === "SEDAN");
chequear("Pickup cabina doble → TRUCK", bodyStyle("Pickup cabina doble", "camionetas") === "TRUCK");
chequear("camión sin carrocería → TRUCK", bodyStyle(undefined, "camiones") === "TRUCK");
chequear("moto → MOTORCYCLE", tipoDeVehiculo("motos") === "MOTORCYCLE");
chequear("0 km → NEW", estadoDelVehiculo("0 km") === "NEW" && estadoDelVehiculo("0km") === "NEW");
chequear("Usado / Muy bueno → USED", estadoDelVehiculo("Usado") === "USED" && estadoDelVehiculo("Muy bueno") === "USED" && estadoDelVehiculo(undefined) === "USED");
chequear("Nafta → GASOLINE, Diésel → DIESEL", combustible("Nafta") === "GASOLINE" && combustible("Diésel") === "DIESEL");
chequear("CVT → Automatic, Manual → Manual", transmision("CVT") === "Automatic" && transmision("Manual") === "Manual" && transmision("Secuencial") === null);
chequear("todas las provincias tienen ubicación", PROVINCIAS_ARGENTINA.every((p) => CENTRO_DE_PROVINCIA[p.name]), PROVINCIAS_ARGENTINA.filter((p) => !CENTRO_DE_PROVINCIA[p.name]).map((p) => p.name));

const base: ProductoParaFeed = {
  id: "v1", name: "Toyota Corolla XEI", description: "<p>Impecable, \"único dueño\"</p>", price: 28500000, comparePrice: null,
  images: JSON.stringify(["https://x.supabase.co/a.webp"]), category: "autos", vehicleStatus: null,
  attributes: JSON.stringify([{ key: "Marca", value: "Toyota" }, { key: "Modelo", value: "Corolla" }, { key: "Año", value: "2022" }, { key: "Kilómetros", value: "28.000" },
    { key: "Provincia", value: "Córdoba" }, { key: "Condición", value: "Usado" }, { key: "Carrocería", value: "Sedán" }]),
};
const opts = { urlBase: "https://www.tiendaapps.com", slug: "t", tienda: "Agencia", moneda: () => "ARS", ubicacionDe: (p: string) => CENTRO_DE_PROVINCIA[p] ?? null };
const r = filaDeVehiculo(base, opts);
const fila = "fila" in r ? r.fila : null;
chequear("un vehículo completo entra", !!fila, r);
chequear("km sin el punto de miles", fila?.["mileage.value"] === "28000", fila?.["mileage.value"]);
chequear("precio con la moneda", fila?.price === "28500000.00 ARS", fila?.price);
chequear("sin color cargado va 'Otro' (Meta lo pide)", fila?.exterior_color === "Otro");
chequear("descripción sin HTML", fila?.description === "Impecable, \"único dueño\"", fila?.description);
chequear("dirección con país AR", !!fila?.address.includes("country: 'AR'"));
const sinMarca = filaDeVehiculo({ ...base, attributes: JSON.stringify([{ key: "Año", value: "2022" }, { key: "Provincia", value: "Córdoba" }]) }, opts);
chequear("sin marca queda afuera, con motivo", "salteado" in sinMarca);
chequear("lo vendido queda afuera", "salteado" in filaDeVehiculo({ ...base, vehicleStatus: "SOLD" }, opts));
chequear("lo reservado va como no disponible", "fila" in filaDeVehiculo({ ...base, vehicleStatus: "RESERVED" }, opts) && (filaDeVehiculo({ ...base, vehicleStatus: "RESERVED" }, opts) as { fila: Record<string, string> }).fila.availability === "not_available");
chequear("la maquinaria agrícola no va (se mide en horas)", "salteado" in filaDeVehiculo({ ...base, category: "maquinaria" }, opts));
const csv = fila ? aCsv([fila]) : "";
chequear("el CSV trae las columnas obligatorias", ["vehicle_id", "make", "model", "year", "mileage.value", "mileage.unit", "image[0].url", "body_style", "price", "exterior_color", "state_of_vehicle", "address", "latitude", "longitude"].every((c) => (COLUMNAS as readonly string[]).includes(c)));
chequear("las comillas del texto se duplican en el CSV", csv.includes('""único dueño""'));

chequear("tracción: 4x4 y doble van como 4X4", traccion("4x4") === "4X4" && traccion("Doble (4x4)") === "4X4");
chequear("tracción: delantera es FWD y trasera RWD", traccion("Delantera") === "FWD" && traccion("Trasera") === "RWD");
chequear("tracción: los ejes de camión van como OTHER", traccion("6x4") === "OTHER" && traccion("8x4") === "OTHER");
chequear("tracción: sin cargar no va", traccion("") === null && traccion(undefined) === null);
chequear("el CSV trae la tracción", (COLUMNAS as readonly string[]).includes("drivetrain"));

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
