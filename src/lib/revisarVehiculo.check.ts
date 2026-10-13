/**
 * Chequeos de la revisión de vehículos antes de guardar. Se corre a mano:
 *
 *   npx tsx src/lib/revisarVehiculo.check.ts
 *
 * El caso que la originó es la Hilux de qrdreamcar (13/10/26): todo lo que
 * tenía mal tiene que aparecer, y un vehículo bien cargado no tiene que
 * mostrar ningún aviso (un aviso de más enseña a apretar "guardar igual").
 */
import { aniosEn, kmsEn, revisarVehiculo } from "./revisarVehiculo";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const CAMPOS = ["Marca", "Modelo", "Versión", "Año", "Kilómetros", "Motor", "Combustible", "Transmisión", "Tracción", "Carrocería", "Color", "Puertas", "Provincia", "Localidad"];
const con = (v: Record<string, string>, extra: Partial<Parameters<typeof revisarVehiculo>[0]> = {}) =>
  revisarVehiculo({ valor: (l) => v[l] ?? "", campos: CAMPOS, categoria: "camionetas", condicion: "Usado", descripcion: "", ...extra });

const hilux = con(
  { Marca: "Toyta", Modelo: "Hilux", Año: "2024", Kilómetros: "50000", Transmisión: "Automática", Carrocería: "Pickup cabina simple", Color: "blanco", Provincia: "Buenos Aires" },
  { descripcion: "<p>Toyota Hilux 2005, usado, 380000 km, pick-up 4x2 cabina simple DX 2.5 TD, con motor 2.5 TD, transmisión manual, diésel.</p>" },
);
const campos = hilux.map((a) => a.campo);
chequear("Hilux: avisa la marca", campos.includes("Marca") && hilux.find((a) => a.campo === "Marca")!.texto.includes("Toyota"), hilux);
chequear("Hilux: avisa el año (2024 vs 2005)", campos.includes("Año"));
chequear("Hilux: avisa los km (50.000 vs 380.000)", campos.includes("Kilómetros"));
chequear("Hilux: avisa la transmisión", campos.includes("Transmisión"));

const bien = con(
  { Marca: "Toyota", Modelo: "Corolla", Año: "2022", Kilómetros: "28.000", Transmisión: "CVT", Carrocería: "Sedán", Color: "Gris", Provincia: "Córdoba" },
  { descripcion: "<p>Corolla 2022 con 28.000 km, caja automática CVT, único dueño. Service al día.</p>" },
);
chequear("un vehículo bien cargado no muestra avisos", bien.length === 0, bien);

chequear("0 km con 25.000 km cargados avisa", con({ Marca: "Ford", Kilómetros: "25000", Carrocería: "SUV", Color: "Azul", Provincia: "CABA" }, { condicion: "0 km" }).some((a) => a.campo === "Kilómetros"));
chequear("0 km con 0 km no avisa", con({ Marca: "Ford", Kilómetros: "0", Carrocería: "SUV", Color: "Azul", Provincia: "CABA" }, { condicion: "0 km" }).length === 0);
chequear("usado con 0 km avisa", con({ Marca: "Ford", Kilómetros: "0", Carrocería: "SUV", Color: "Azul", Provincia: "CABA" }).some((a) => a.campo === "Kilómetros"));
chequear("sin color ni provincia avisa lo del catálogo de Meta", con({ Marca: "Ford", Kilómetros: "1000", Carrocería: "SUV" }).some((a) => a.texto.includes("Facebook")));
chequear("si el tipo no lleva carrocería, no la pide", !revisarVehiculo({ valor: () => "x", campos: ["Marca", "Color", "Provincia"], categoria: "maquinaria", condicion: "Usado", descripcion: "" }).some((a) => a.texto.includes("carrocería")));
chequear("una marca que no conocemos y no se parece a ninguna, no avisa", !con({ Marca: "Zanella", Kilómetros: "1000", Carrocería: "Naked", Color: "Rojo", Provincia: "CABA" }).some((a) => a.campo === "Marca"));

chequear("años en el texto", JSON.stringify(aniosEn("modelo 2019, patentado en 2020, 12345 km")) === "[2019,2020]");
chequear("km con punto, con 'mil' y con 'kms'", JSON.stringify(kmsEn("85.000 km, 120 mil km y 3000kms")) === "[85000,120000,3000]", kmsEn("85.000 km, 120 mil km y 3000kms"));
chequear("km parecidos (±10 %) no avisan", !con({ Marca: "Ford", Kilómetros: "85000", Carrocería: "SUV", Color: "Azul", Provincia: "CABA" }, { descripcion: "Tiene 86.500 km reales" }).some((a) => a.campo === "Kilómetros"));

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
