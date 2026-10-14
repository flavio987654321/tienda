/**
 * Para qué trabajo sirve cada unidad. Ver lib/trabajoVehiculo.
 *
 *   npx tsx src/lib/trabajoVehiculo.check.ts
 */
import { trabajosDe, tamanoDe, capacidadDe, cuantosPorTrabajo, CLAVE_CAPACIDAD } from "./trabajoVehiculo";

let fallos = 0;
function caso(nombre: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}
const v = (category: string, subcategory = "", attrs: Record<string, string> = {}) =>
  ({ category, subcategory, attributes: Object.entries(attrs).map(([key, value]) => ({ key, value })) });
const igual = (a: unknown[], b: unknown[]) => JSON.stringify(a) === JSON.stringify(b);

caso("un auto no sirve para ningún trabajo", trabajosDe(v("autos", "sedán")).length === 0);
caso("una moto tampoco", trabajosDe(v("motos")).length === 0);
caso("un furgón es reparto", igual(trabajosDe(v("utilitarios", "furgón")), ["reparto"]));
caso("un chasis cabina es reparto y obra", igual(trabajosDe(v("utilitarios", "chasis cabina")), ["reparto", "obra"]));
caso("un tractor agrícola es campo", igual(trabajosDe(v("maquinaria", "tractor")), ["campo"]));
caso("una pickup 4x4 es campo y obra", igual(trabajosDe(v("camionetas", "pickup", { "Tracción": "4x4" })), ["campo", "obra"]));
caso("una van es reparto", igual(trabajosDe(v("camionetas", "van")), ["reparto"]));
caso("un camión mediano con caja seca es reparto y ruta", igual(trabajosDe(v("camiones", "mediano", { "Carrocería": "Caja seca" })), ["reparto", "ruta"]));
caso("un semi es ruta", igual(trabajosDe(v("camiones", "tractor (semi)")), ["ruta"]));
caso("un volcador pesado es ruta y obra", igual(trabajosDe(v("camiones", "pesado", { "Carrocería": "Volcador" })), ["ruta", "obra"]));
caso("una jaula suma campo", trabajosDe(v("camiones", "pesado", { "Carrocería": "Jaula" })).includes("campo"));
caso("un camión sin datos igual es de trabajo (ruta)", igual(trabajosDe(v("camiones")), ["ruta"]));

caso("capacidad: «8.000» son 8000 kg", capacidadDe(v("camiones", "", { [CLAVE_CAPACIDAD]: "8.000" })) === 8000);
caso("capacidad: «8 t» son 8000 kg", capacidadDe(v("camiones", "", { [CLAVE_CAPACIDAD]: "8 t" })) === 8000);
caso("capacidad: «1,5 tn» son 1500 kg", capacidadDe(v("camiones", "", { [CLAVE_CAPACIDAD]: "1,5 tn" })) === 1500);
caso("capacidad vacía o rara no cuenta", capacidadDe(v("camiones", "", { [CLAVE_CAPACIDAD]: "consultar" })) === null);
caso("la capacidad manda sobre el subtipo", tamanoDe(v("camiones", "pesado", { [CLAVE_CAPACIDAD]: "3000" })) === "liviano");
caso("sin capacidad, el subtipo decide", tamanoDe(v("camiones", "mediano")) === "mediano");
caso("un semi es pesado", tamanoDe(v("camiones", "tractor (semi)")) === "pesado");
caso("un utilitario es liviano", tamanoDe(v("utilitarios", "furgón")) === "liviano");
caso("una máquina no tiene tamaño de carga", tamanoDe(v("maquinaria", "tractor")) === null);
caso("con 13 t de capacidad un mediano pasa a ruta sola", igual(trabajosDe(v("camiones", "mediano", { [CLAVE_CAPACIDAD]: "13000" })), ["ruta"]));

const c = cuantosPorTrabajo([v("utilitarios", "furgón"), v("camiones", "mediano"), v("autos")]);
caso("el conteo por trabajo suma cada unidad en cada trabajo que sirve", c.reparto === 2 && c.ruta === 1 && c.campo === 0 && c.obra === 0);

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
