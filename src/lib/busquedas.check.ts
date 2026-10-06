/**
 * Chequeo de "Avisame si entra". Se corre con:
 *
 *   npx tsx src/lib/busquedas.check.ts
 *
 * Lo delicado es `coincide`: demasiado estricta y nunca avisa (la gente
 * escribe "vw", "gol trend", sin acentos); demasiado floja y avisa cualquier
 * cosa ("Gol" no puede encontrar un "Golf").
 */
import { validarBusqueda, coincide, resumenDeBusqueda, mensajeDeAviso, demanda, normalizar, type VehiculoParaBuscar } from "./busquedas";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };
const sinFiltros = { categoria: null, marca: null, modelo: null, anioDesde: null, precioHasta: null };
const gol: VehiculoParaBuscar = { categoria: "autos", marca: "Volkswagen", modelo: "Gol Trend", nombre: "VW Gol Trend 1.6 Highline", anio: 2016, precio: 9_000_000 };
const golf: VehiculoParaBuscar = { categoria: "autos", marca: "Volkswagen", modelo: "Golf", nombre: "Volkswagen Golf GTI", anio: 2019, precio: 25_000_000 };
const soloNombre: VehiculoParaBuscar = { categoria: "camionetas", marca: null, modelo: null, nombre: "Toyota Hilux SRX 4x4 2020", anio: null, precio: 40_000_000 };
const citroen: VehiculoParaBuscar = { categoria: "autos", marca: "Citroën", modelo: "C4 Cactus", nombre: "C4 Cactus", anio: 2021, precio: 20_000_000 };

const v = (b: object) => validarBusqueda(b as Record<string, unknown>, 2026);
ok("válida con marca", "datos" in v({ nombre: "Juan", telefono: "11 5555-1234", marca: "Toyota" }));
ok("sin nombre → error", "error" in v({ telefono: "11 5555-1234", marca: "Toyota" }));
ok("teléfono corto → error", "error" in v({ nombre: "Juan", telefono: "123", marca: "Toyota" }));
ok("sin ningún criterio → error", "error" in v({ nombre: "Juan", telefono: "11 5555-1234" }));
ok("sólo precio máximo alcanza", "datos" in v({ nombre: "Juan", telefono: "11 5555-1234", precioHasta: "15.000.000" }));
ok("precio '15.000.000' → 15000000", (v({ nombre: "Juan", telefono: "11 5555-1234", precioHasta: "15.000.000" }) as { datos: { precioHasta: number } }).datos.precioHasta === 15_000_000);
ok("año 1900 → error", "error" in v({ nombre: "Juan", telefono: "11 5555-1234", anioDesde: "1900" }));
ok("categoría inventada → null", (v({ nombre: "Juan", telefono: "11 5555-1234", categoria: "aviones", marca: "x" }) as { datos: { categoria: null } }).datos.categoria === null);

const c = (b: object, veh: VehiculoParaBuscar) => coincide({ ...sinFiltros, ...b }, veh);
ok("'vw' encuentra Volkswagen", c({ marca: "vw" }, gol));
ok("'VOLKSWAGEN' en mayúsculas", c({ marca: "VOLKSWAGEN" }, gol));
ok("'gol trend' encuentra el Gol Trend", c({ modelo: "gol trend" }, gol));
ok("'Gol' NO encuentra un Golf", !c({ modelo: "Gol" }, golf));
ok("'Golf' NO encuentra un Gol", !c({ modelo: "Golf" }, gol));
ok("marca y modelo sólo en el nombre: 'Toyota Hilux'", c({ marca: "toyota", modelo: "hilux" }, soloNombre));
ok("sin acentos: 'citroen' encuentra Citroën", c({ marca: "citroen" }, citroen));
ok("categoría distinta → no", !c({ categoria: "motos", marca: "vw" }, gol));
ok("año desde 2017 → el 2016 no", !c({ marca: "vw", anioDesde: 2017 }, gol));
ok("año desde, vehículo sin año → no (no se sabe)", !c({ anioDesde: 2015 }, soloNombre));
ok("precio hasta 10M → el de 9M sí", c({ precioHasta: 10_000_000 }, gol));
ok("precio hasta 8M → el de 9M no", !c({ precioHasta: 8_000_000 }, gol));
ok("otra marca → no", !c({ marca: "Ford" }, gol));
ok("'Toyota' no encuentra 'Toyotomi' por un pedazo", !c({ marca: "toyo" }, soloNombre));

ok("resumen", resumenDeBusqueda({ ...sinFiltros, marca: "Volkswagen", modelo: "Gol", anioDesde: 2015, precioHasta: 9_000_000 }) === "Volkswagen Gol · 2015 en adelante · hasta $9.000.000",
  resumenDeBusqueda({ ...sinFiltros, marca: "Volkswagen", modelo: "Gol", anioDesde: 2015, precioHasta: 9_000_000 }));
ok("resumen sólo tipo", resumenDeBusqueda({ ...sinFiltros, categoria: "motos" }) === "Moto (cualquier marca)");
ok("resumen tipo y marca", resumenDeBusqueda({ ...sinFiltros, categoria: "camionetas", marca: "Toyota" }) === "Toyota (camioneta)");
ok("mensaje", mensajeDeAviso("Juan Pérez", "VW Gol Trend", "$9.000.000", "https://x/y", "Autos Sur")
  === "Hola Juan! Te escribo de Autos Sur: nos dejaste tu búsqueda y entró un VW Gol Trend a $9.000.000. Te paso el link para que lo veas: https://x/y");
const d = demanda([{ marca: "Toyota", modelo: "Hilux" }, { marca: "toyota", modelo: "HILUX" }, { marca: "VW", modelo: null }, { marca: "Volkswagen", modelo: null }, { marca: null, modelo: null }]);
ok("demanda: junta mayúsculas y alias, ignora vacías", d.length === 2 && d[0].cuantas === 2 && d[1].cuantas === 2, d);
ok("normalizar", normalizar("  Citroën   C4 ") === "citroen c4");

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
