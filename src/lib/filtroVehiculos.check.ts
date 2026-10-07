/**
 * Chequeo de los filtros de vehículos. Se corre con:
 *
 *   npx tsx src/lib/filtroVehiculos.check.ts
 */
import { filtrarVehiculos, filtroVacio, opcionesDeFiltro, filtroDesdeUrl, filtroAUrl, cuantosFiltros, entero, linkAVehiculos, type FiltroVehiculos } from "./filtroVehiculos";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };

const v = (id: string, price: number, category: string, a: Record<string, string>) =>
  ({ id, name: `${a.Marca ?? ""} ${a.Modelo ?? id}`.trim(), price, category, attributes: Object.entries(a).map(([key, value]) => ({ key, value })) });

const lista = [
  v("ford1", 20_000_000, "autos", { Marca: "Ford", Modelo: "Focus", "Año": "2018", "Kilómetros": "80.000", Combustible: "Nafta", "Transmisión": "Manual", Localidad: "Rosario" }),
  v("ford2", 25_000_000, "camionetas", { Marca: "FORD ", Modelo: "Ranger", "Año": "2020", "Kilómetros": "60000 km", Combustible: "diesel", "Transmisión": "Automática", Localidad: "rosario" }),
  v("vw", 15_000, "autos", { Marca: "VW", Modelo: "Gol Trend", "Año": "2015", Combustible: "Nafta", "Transmisión": "Manual", Moneda: "USD" }),
  v("vw2", 18_000_000, "autos", { Marca: "Volkswagen", Modelo: "Golf", "Kilómetros": "5000", "Transmisión": "Automática (CVT)" }),
  v("jd", 185_000, "maquinaria", { Marca: "John Deere", Modelo: "6145J", "Año": "2018", "Horas de uso": "3.500", Moneda: "USD" }),
  v("sinprecio", 0, "motos", { Marca: "Honda", Modelo: "CB", "Año": "2022", "Kilómetros": "0" }),
];
const F = (o: Partial<FiltroVehiculos>): FiltroVehiculos => ({ ...filtroVacio("ARS"), ...o });
const ids = (o: Partial<FiltroVehiculos>) => filtrarVehiculos(lista, F(o), "ARS").map((x) => x.id).join(",");

ok("entero", entero("80.000") === 80000 && entero("60000 km") === 60000 && entero("28.000,5") === 28000 && entero("") === null && entero("s/d") === null);
ok("sin filtros: todos, en el orden de la base", ids({}) === "ford1,ford2,vw,vw2,jd,sinprecio", ids({}));

const op = opcionesDeFiltro(lista, "ARS");
const ford = op.marcas.find((m) => m.valor === "ford");
ok("marca: 'Ford' y 'FORD ' son una sola, con 2", ford?.cuantos === 2 && (ford.label === "FORD" || ford.label === "Ford"), op.marcas);
ok("marca: 'VW' y 'Volkswagen' son una sola", op.marcas.filter((m) => m.valor === "volkswagen").length === 1 && op.marcas.find((m) => m.valor === "volkswagen")?.cuantos === 2, op.marcas);
ok("marca en minúscula se muestra con mayúscula inicial", opcionesDeFiltro([v("x", 1, "autos", { Marca: "john deere" }), v("y", 1, "otros", { Marca: "BMW" })], "ARS").marcas.map((m) => m.label).join() === "BMW,John Deere"
  && opcionesDeFiltro([v("y", 1, "otros", {})], "ARS").tipos[0].label === "Otros");
ok("filtrar por marca ford trae las dos", ids({ marca: "ford" }) === "ford1,ford2");
ok("tipos en el orden del rubro", op.tipos.map((t) => t.valor).join(",") === "autos,camionetas,motos,maquinaria", op.tipos);
ok("transmisión: CVT cuenta como Automática", op.transmisiones.map((t) => `${t.label}:${t.cuantos}`).join(",") === "Automática:2,Manual:2", op.transmisiones);
ok("combustible sin distinguir mayúsculas", ids({ combustible: "Diesel" }) === "ford2");
ok("ciudad sin distinguir mayúsculas", ids({ ciudad: "Rosario" }) === "ford1,ford2" && op.ciudades.length === 1);
ok("años", op.anioMin === 2015 && op.anioMax === 2022 && op.hayHoras && op.monedas.join() === "ARS,USD", op);

ok("año desde: el sin año queda afuera", ids({ anioDesde: 2018 }) === "ford1,ford2,jd,sinprecio");
ok("año hasta", ids({ anioHasta: 2016 }) === "vw");
ok("km hasta: sin dato y maquinaria afuera; 0 km entra", ids({ kmHasta: 60000 }) === "ford2,vw2,sinprecio", ids({ kmHasta: 60000 }));
ok("horas hasta", ids({ horasHasta: 4000 }) === "jd" && ids({ horasHasta: 3000 }) === "");
ok("precio en pesos: dólares y 'consultar' afuera", ids({ precioHasta: 20_000_000 }) === "ford1,vw2");
ok("precio en dólares: sólo los en dólares", ids({ precioHasta: 20_000, moneda: "USD" }) === "vw");
ok("buscar: palabras en cualquier orden", ids({ q: "ranger 2020" }) === "ford2" && ids({ q: "gol" }) === "vw,vw2" && ids({ q: "golf" }) === "vw2");
ok("buscar: por tipo en castellano", ids({ q: "camioneta" }) === "ford2");
ok("buscar: no encuentra el atributo interno", ids({ q: "usd" }) === "");

ok("menos usado: sin km al final, la maquinaria después de todos", ids({ orden: "km_asc" }) === "sinprecio,vw2,ford2,ford1,jd,vw", ids({ orden: "km_asc" }));
ok("año: sin año al final", ids({ orden: "anio_desc" }).endsWith(",vw2") && ids({ orden: "anio_desc" }).startsWith("sinprecio"));
ok("precio ↑: pesos, después dólares, 'consultar' al final", ids({ orden: "precio_asc" }) === "vw2,ford1,ford2,vw,jd,sinprecio", ids({ orden: "precio_asc" }));
ok("precio ↓: pesos, después dólares, 'consultar' al final", ids({ orden: "precio_desc" }) === "ford2,ford1,vw2,jd,vw,sinprecio", ids({ orden: "precio_desc" }));

const sp = new URLSearchParams("tipo=Camionetas&marca=FORD&desde=2019&km=abc&precio=-5&moneda=EUR&orden=hackeo&q=" + "x".repeat(200));
const desde = filtroDesdeUrl(sp, "ARS");
ok("dirección: lo raro no se cree", desde.tipo === "camionetas" && desde.marca === "ford" && desde.anioDesde === 2019 && desde.kmHasta === null && desde.precioHasta === null && desde.moneda === "ARS" && desde.orden === "recientes" && desde.q.length === 80, desde);
const ida = F({ tipo: "autos", marca: "volkswagen", precioHasta: 20000, moneda: "USD", orden: "km_asc" });
const vuelta = filtroDesdeUrl(filtroAUrl(ida, "ARS"), "ARS");
ok("dirección: ida y vuelta", JSON.stringify(vuelta) === JSON.stringify(ida), [filtroAUrl(ida, "ARS").toString(), vuelta]);
ok("dirección: vacía queda vacía", filtroAUrl(filtroVacio("ARS"), "ARS").toString() === "");
ok("cuantosFiltros", cuantosFiltros(ida) === 3 && cuantosFiltros(filtroVacio()) === 0);
ok("linkAVehiculos", linkAVehiculos("mi-tienda", { tipo: "camiones" }) === "/tienda/mi-tienda/vehiculos?tipo=camiones" && linkAVehiculos("x", {}, true) === "/tienda/x/vehiculos?from=editor");

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
if (fallos) process.exit(1);
