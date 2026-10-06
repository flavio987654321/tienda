/**
 * Chequeo de la rentabilidad y los días en stock. Se corre con:
 *
 *   npx tsx src/lib/rentabilidadAutos.check.ts
 *
 * Lo que no se puede romper: sin gastos no hay margen (nunca un 100 % falso),
 * los días cuentan desde la compra si se cargó, un vendido cuenta hasta el
 * día de la venta, y "estancado" sigue la regla de 60 días o 30 sin consultas.
 */
import { numerosDeUnidad, inicioEnStock, estancado, textoEstancado, resumenDeStock, resumenDeVendidos } from "./rentabilidadAutos";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };
const ahora = new Date("2026-10-06T15:00:00Z");
const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000);
const base = { price: 10_000_000, createdAt: hace(10), gastos: [], vehicleStatus: "AVAILABLE", soldAt: null, soldPrice: null };

const sin = numerosDeUnidad(base, ahora);
ok("sin gastos → sin costo, sin ganancia, sin margen", sin.costo === null && sin.ganancia === null && sin.margenPct === null, sin);
ok("días desde el alta si no hay compra", sin.dias === 10);

const con = numerosDeUnidad({ ...base, gastos: [{ concepto: "Compra", monto: 8_000_000, fecha: hace(45) }, { concepto: "Lavado", monto: 50_000, fecha: null }] }, ahora);
ok("costo = suma de gastos", con.costo === 8_050_000, con.costo);
ok("ganancia al precio publicado", con.ganancia === 1_950_000);
ok("margen sobre el precio", Math.round(con.margenPct!) === 20, con.margenPct);
ok("días desde la COMPRA (45), no desde el alta (10)", con.dias === 45, con.dias);

ok("compra con fecha en un futuro absurdo se ignora", inicioEnStock(hace(10), [{ concepto: "compra", monto: 1, fecha: new Date("2030-01-01") }]).getTime() === hace(10).getTime());
ok("'compra' en minúsculas cuenta igual", inicioEnStock(hace(10), [{ concepto: " compra ", monto: 1, fecha: hace(30) }]).getTime() === hace(30).getTime());
ok("compra sin fecha → desde el alta", inicioEnStock(hace(10), [{ concepto: "Compra", monto: 1, fecha: null }]).getTime() === hace(10).getTime());

const perdida = numerosDeUnidad({ ...base, gastos: [{ concepto: "Compra", monto: 11_000_000, fecha: null }] }, ahora);
ok("vendiendo a pérdida → ganancia negativa", perdida.ganancia === -1_000_000 && perdida.margenPct! < 0);

const gastoCero = numerosDeUnidad({ ...base, gastos: [{ concepto: "Otro", monto: 0, fecha: null }] }, ahora);
ok("gastos que suman 0 → sin costo (no 100 %)", gastoCero.costo === null && gastoCero.margenPct === null);

const vendido = numerosDeUnidad({ ...base, createdAt: hace(90), vehicleStatus: "SOLD", soldAt: hace(30), soldPrice: 9_500_000, gastos: [{ concepto: "Compra", monto: 8_000_000, fecha: null }] }, ahora);
ok("vendido: días hasta la venta (60), no hasta hoy", vendido.dias === 60, vendido.dias);
ok("vendido: ganancia con el precio de VENTA", vendido.ganancia === 1_500_000 && vendido.precio === 9_500_000);
const vendidoSinPrecio = numerosDeUnidad({ ...base, vehicleStatus: "SOLD", soldAt: hace(1), soldPrice: null }, ahora);
ok("vendido sin precio cargado → usa el publicado", vendidoSinPrecio.precio === 10_000_000);

ok("59 días con consultas → no", estancado(59, 3) === null);
ok("60 días → estancado aunque tenga consultas", estancado(60, 3) === "dias");
ok("30 días y 0 consultas → sin interés", estancado(30, 0) === "sinInteres");
ok("29 días y 0 consultas → todavía no", estancado(29, 0) === null);
ok("texto del aviso", textoEstancado("sinInteres", 35, 0) === "Lleva 35 días y nadie consultó en el último mes. ¿Revisás el precio o las fotos?");

const r = resumenDeStock([sin, con, perdida]);
ok("resumen: invertido sólo de los que tienen costo", r.invertido === 19_050_000 && r.sinCosto === 1, r);
ok("resumen: ganancia esperada suma pérdidas", r.gananciaEsperada === 950_000, r.gananciaEsperada);
ok("resumen: días promedio", r.diasPromedio === Math.round((10 + 45 + 10) / 3));
ok("resumen vacío", resumenDeStock([]).diasPromedio === null && resumenDeStock([]).invertido === 0);
const rv = resumenDeVendidos([vendido, vendidoSinPrecio]);
ok("vendidos: ganancia sólo con costo, y cuántos tenían", rv.ganancia === 1_500_000 && rv.conCosto === 1 && rv.facturado === 19_500_000, rv);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
