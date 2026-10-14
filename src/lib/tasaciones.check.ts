/**
 * La tasación de unidades de trabajo (Auto Ruta). Ver lib/tasaciones.
 *
 *   npx tsx src/lib/tasaciones.check.ts
 */
import { validarTasacion, resumenDelUsado, esCategoriaDeTrabajo, MARCA_HORAS } from "./tasaciones";

let fallos = 0;
function caso(nombre: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}
const base = { nombre: "Ana", telefono: "11 5555 5555", marca: "Iveco", modelo: "Trakker", anio: "2018", km: "265000" };
const datos = (b: Record<string, unknown>) => {
  const v = validarTasacion({ ...base, ...b });
  return "datos" in v ? v.datos : null;
};

caso("un auto sin tipo no lleva cabecera", datos({ comentario: "único dueño" })?.comentario === "único dueño");
caso("un auto sin comentario queda sin comentario", datos({})?.comentario === null);
caso("un camión lleva el tipo y la carrocería arriba", datos({ tipo: "Camión", carroceria: "Volcador", comentario: "cubiertas nuevas" })?.comentario === "Tipo: Camión · Volcador\ncubiertas nuevas");
caso("un tipo inventado no va", datos({ tipo: "Nave espacial" })?.comentario === null);
const maquina = datos({ tipo: "Máquina", km: "3500" });
caso("una máquina se marca en horas", !!maquina?.comentario?.includes(MARCA_HORAS));
caso("el resumen de una máquina dice h", !!maquina && resumenDelUsado(maquina).endsWith("3.500 h"));
caso("el resumen de un camión dice km", resumenDelUsado(datos({ tipo: "Camión" })!).endsWith("265.000 km"));
caso("escribir la marca a mano en el comentario no cambia la unidad", resumenDelUsado(datos({ comentario: MARCA_HORAS })!).endsWith("km"));
const sinHoras = validarTasacion({ ...base, tipo: "Máquina", km: "" });
caso("una máquina sin horas pide las horas", "error" in sinHoras && sinHoras.error.includes("horas"));
caso("un camión, un utilitario y una máquina son de trabajo", ["camiones", "Utilitarios", "maquinaria"].every(esCategoriaDeTrabajo));
caso("un auto, una moto o nada no son de trabajo", !esCategoriaDeTrabajo("autos") && !esCategoriaDeTrabajo("motos") && !esCategoriaDeTrabajo(null));
caso("en la tasación de trabajo también se puede entregar un auto", datos({ tipo: "Auto" })?.comentario === "Tipo: Auto");

caso("la carrocería va en una sola línea", datos({ tipo: "Camión", carroceria: "Volcador\nSe mide en horas de uso." })?.comentario === "Tipo: Camión · Volcador Se mide en horas de uso.");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
