/**
 * Chequeo de la moneda por vehículo. Se corre con:
 *
 *   npx tsx src/lib/monedaVehiculo.check.ts
 */
import { monedaDe, monedaDeTienda, precioEn, compararPrecio, conPuntos, sinPuntos } from "./monedaVehiculo";
import { coincide } from "./busquedas";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };
const conMoneda = (m: string) => ({ attributes: [{ key: "Marca", value: "Toyota" }, { key: "Moneda", value: m }] });

ok("sin atributo → la principal", monedaDe({ attributes: [] }, "USD") === "USD");
ok("con atributo USD en tienda en pesos → USD", monedaDe(conMoneda("USD"), "ARS") === "USD");
ok("atributos como texto JSON (desde la base)", monedaDe({ attributes: JSON.stringify(conMoneda("USD").attributes) }, "ARS") === "USD");
ok("valor inventado → la principal", monedaDe(conMoneda("EUR"), "ARS") === "ARS");
ok("JSON roto → la principal", monedaDe({ attributes: "{roto" }, "USD") === "USD");
ok("tienda: storeConfig texto", monedaDeTienda('{"currency":"USD"}') === "USD" && monedaDeTienda("{roto") === "ARS" && monedaDeTienda(null) === "ARS");
ok("precioEn", precioEn(25000, "USD") === "USD 25.000" && precioEn(30000000, "ARS") === "$30.000.000" && precioEn(-500000, "ARS") === "-$500.000");
const l = [{ price: 25000, moneda: "USD" as const }, { price: 30000000, moneda: "ARS" as const }, { price: 9000000, moneda: "ARS" as const }, { price: 18000, moneda: "USD" as const }];
ok("orden ↑: pesos primero, después dólares", JSON.stringify([...l].sort((a, b) => compararPrecio(a, b, true)).map((x) => x.price)) === "[9000000,30000000,18000,25000]");
ok("orden ↓: pesos primero, adentro de mayor a menor", JSON.stringify([...l].sort((a, b) => compararPrecio(a, b, false)).map((x) => x.price)) === "[30000000,9000000,25000,18000]");
ok("conPuntos", conPuntos("30000000") === "30.000.000" && conPuntos("0025000") === "25.000" && conPuntos("") === "" && conPuntos("999") === "999");
ok("sinPuntos", sinPuntos("30.000.000") === "30000000" && sinPuntos("USD 25.000") === "25000");

const sinFiltros = { categoria: null, marca: null, modelo: null, anioDesde: null };
const v = { categoria: "autos", marca: "Toyota", modelo: "Hilux", nombre: "Toyota Hilux", anio: 2020, precio: 25000 };
ok("búsqueda con tope: vehículo en otra moneda NO coincide", !coincide({ ...sinFiltros, precioHasta: 40_000_000 }, { ...v, enOtraMoneda: true }));
ok("búsqueda sin tope: vehículo en otra moneda SÍ coincide", coincide({ ...sinFiltros, marca: "toyota", precioHasta: null }, { ...v, enOtraMoneda: true }));
ok("misma moneda: el tope se compara como siempre", coincide({ ...sinFiltros, precioHasta: 30000 }, v) && !coincide({ ...sinFiltros, precioHasta: 20000 }, v));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
