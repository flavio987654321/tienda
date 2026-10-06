/**
 * Chequeo de la ficha técnica de un vehículo. Se corre con:
 *
 *   npx tsx src/lib/fichaVehiculo.check.ts
 *
 * Lo que no se puede romper: que un JSON roto o viejo no tumbe el modal, que
 * el folleto sólo pueda ser un archivo nuestro, y que los datos se guarden y
 * se muestren con la regla de siempre (punto de miles, coma decimal).
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
import {
  leerFicha, fichaComoAtributo, bloquesDeFicha, limpiarDato, tipoDeFicha, esAtributoInterno,
  esFolletoNuestro, CLAVE_FICHA, FICHA_VACIA, LARGO_MAXIMO_FICHA, EQUIPAMIENTO, PAPELES, MOTOR, MEDIDAS,
  esVehiculo, usaHoras, CATEGORIAS_VEHICULO, NOMBRE_TIPO, type TipoDeFicha, type CampoNumerico,
} from "./fichaVehiculo";

let fallos = 0;
const ok = (t: string, c: unknown, d?: unknown) => { if (c) console.log("  ok   ", t); else { fallos++; console.log("  FALLA", t, d ?? ""); } };
const attr = (v: unknown) => [{ key: CLAVE_FICHA, value: typeof v === "string" ? v : JSON.stringify(v) }];

ok("sin ficha → vacía", JSON.stringify(leerFicha([])) === JSON.stringify(FICHA_VACIA));
ok("JSON roto → vacía, sin tirar", JSON.stringify(leerFicha(attr("{roto"))) === JSON.stringify(FICHA_VACIA));
ok("null / número → vacía", leerFicha(attr("null")).equipamiento.length === 0 && leerFicha(attr("5")).papeles.length === 0);

const f = leerFicha(attr({ equipamiento: ["aire", "inventado", "aire", 3], papeles: ["vtv", "x"], datos: { potencia: "150 CV", largo: "4.630", consumo: "6.8", raro: "1", tanque: "" } }));
ok("ids desconocidos y repetidos fuera", f.equipamiento.join() === "aire" && f.papeles.join() === "vtv", f);
ok("datos limpios: 150 / 4630 / 6,8", f.datos.potencia === "150" && f.datos.largo === "4630" && f.datos.consumo === "6,8", f.datos);
ok("campo inventado y vacío fuera", !("raro" in f.datos) && !("tanque" in f.datos), f.datos);

ok("folleto del depósito: sí", esFolletoNuestro("https://abc.supabase.co/storage/v1/object/public/product-images/fichas/a.pdf"));
ok("folleto local: sí", esFolletoNuestro("/uploads/a.pdf"));
ok("folleto de otro sitio: no", !esFolletoNuestro("https://malo.com/a.pdf"));
ok("folleto javascript: no", !esFolletoNuestro("javascript:alert(1)"));
ok("folleto con // : no", !esFolletoNuestro("//malo.com/a.pdf"));
ok("folleto de otro supabase: no", !esFolletoNuestro("https://otro.supabase.co/storage/v1/object/public/x.pdf"));
ok("folleto ajeno se descarta al leer", leerFicha(attr({ folleto: { url: "https://malo.com/a.pdf", nombre: "x" } })).folleto === null);

ok("ficha vacía no se guarda", fichaComoAtributo(FICHA_VACIA) === null);
const todo = {
  equipamiento: [...new Set([...EQUIPAMIENTO.auto, ...EQUIPAMIENTO.moto].map((i) => i.id))],
  papeles: PAPELES.map((i) => i.id),
  datos: Object.fromEntries([...MOTOR.auto, ...MOTOR.moto, ...MEDIDAS.auto, ...MEDIDAS.moto].map((c) => [c.id, c.decimal ? "999,99" : "999999"])),
  folleto: { url: "https://abc.supabase.co/storage/v1/object/public/product-images/fichas/" + "x".repeat(80) + ".pdf", nombre: "n".repeat(80) },
};
const largo = fichaComoAtributo(todo)!.value.length;
ok(`todo cargado entra en el tope (${largo} ≤ ${LARGO_MAXIMO_FICHA})`, largo <= LARGO_MAXIMO_FICHA);
const ida = leerFicha([fichaComoAtributo(todo)!]);
ok("ida y vuelta sin pérdida", JSON.stringify(ida) === JSON.stringify(todo));

const b = bloquesDeFicha(leerFicha(attr({ equipamiento: ["techo", "abs", "baul"], datos: { largo: "4630", consumo: "6,8", plazas: "5" } })), "auto");
ok("en un auto no aparece el baúl de moto", b.equipamiento.join() === "Frenos ABS,Techo solar", b.equipamiento);
ok("4.630 mm / 6,8 l/100 km / 5", b.medidas.map((m) => m.valor).join("|") === "4.630 mm|5" && b.motor[0]?.valor === "6,8 l/100 km", b);
const m = bloquesDeFicha(leerFicha(attr({ equipamiento: ["techo", "abs", "baul"] })), "moto");
ok("en una moto no aparece el techo solar", m.equipamiento.join() === "Frenos ABS,Baúl", m.equipamiento);

ok("limpiar entero", limpiarDato("largo", "4.630 mm") === "4630");
ok("limpiar decimal con punto", limpiarDato("consumo", "6.85") === "6,85");
ok("limpiar decimal con dos comas", limpiarDato("consumo", "6,8,5") === "6,85");
ok("tipo: autos/camionetas/motos/repuestos", tipoDeFicha("autos") === "auto" && tipoDeFicha("Camionetas") === "auto" && tipoDeFicha("motos") === "moto" && tipoDeFicha("repuestos") === null);
ok("atributos internos", esAtributoInterno(CLAVE_FICHA) && esAtributoInterno("Servicios") && !esAtributoInterno("Marca"));

// ── Tipos de vehículo nuevos (06/10/26) ──
ok("tipo: camiones/utilitarios/maquinaria/cuatriciclos", tipoDeFicha("camiones") === "camion" && tipoDeFicha("utilitarios") === "utilitario" && tipoDeFicha("maquinaria") === "agro" && tipoDeFicha("cuatriciclos") === "cuatri");
ok("esVehiculo: los 7 tipos sí, repuestos y accesorios no", CATEGORIAS_VEHICULO.every((c) => esVehiculo(c)) && esVehiculo(" Camiones ") && !esVehiculo("repuestos") && !esVehiculo("accesorios") && !esVehiculo(null));
ok("cada tipo de vehículo tiene ficha y nombre", CATEGORIAS_VEHICULO.every((c) => tipoDeFicha(c) !== null && NOMBRE_TIPO[c]?.uno));
ok("horas de uso sólo en maquinaria", usaHoras("maquinaria") && !usaHoras("camiones") && !usaHoras("autos"));
// Un mismo id en varios tipos tiene que significar lo mismo: misma unidad y misma regla de decimales.
const porId = new Map<string, CampoNumerico>();
let distintos = "";
for (const c of [...Object.values(MOTOR).flat(), ...Object.values(MEDIDAS).flat()]) {
  const otro = porId.get(c.id);
  if (otro && (otro.unidad !== c.unidad || !!otro.decimal !== !!c.decimal)) distintos += c.id + " ";
  porId.set(c.id, c);
}
ok("un dato con el mismo id tiene la misma unidad en todos los tipos", distintos === "", distintos);
for (const t of Object.keys(EQUIPAMIENTO) as TipoDeFicha[]) {
  const lleno = { equipamiento: EQUIPAMIENTO[t].map((i) => i.id), papeles: PAPELES.map((i) => i.id),
    datos: Object.fromEntries([...MOTOR[t], ...MEDIDAS[t]].map((c) => [c.id, c.decimal ? "999,99" : "999999"])), folleto: todo.folleto };
  const attrLleno = fichaComoAtributo(lleno)!;
  const bl = bloquesDeFicha(leerFicha([attrLleno]), t);
  ok(`${t}: todo cargado entra en el tope y vuelve entero`, attrLleno.value.length <= LARGO_MAXIMO_FICHA && bl.equipamiento.length === EQUIPAMIENTO[t].length && bl.motor.length === MOTOR[t].length && bl.medidas.length === MEDIDAS[t].length, attrLleno.value.length);
}
const cam = bloquesDeFicha(leerFicha(attr({ equipamiento: ["retarder", "techo"], datos: { cargaUtil: "15000", ejes: "3" } })), "camion");
ok("camión: retarder sí, techo solar no; 15.000 kg y 3 ejes", cam.equipamiento.join() === "Retarder" && cam.medidas.map((x) => x.valor).join("|") === "3|15.000 kg", cam);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
