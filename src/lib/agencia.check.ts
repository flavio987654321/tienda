/**
 * Chequeos de la página "La agencia" (13/10/26). Se corre a mano:
 *
 *   npx tsx src/lib/agencia.check.ts
 *
 * Cuida tres cosas:
 *   1. La lógica: horarios agrupados, "abierto ahora" en hora argentina, y las
 *      validaciones.
 *   2. Que guardar el DISEÑO no borre la dirección (es de preferencias) y que
 *      guardar preferencias no borre la agencia (es del diseño).
 *   3. Que TODO template de autos/motos dibuje la página. Un template nuevo del
 *      rubro sin ella deja a la concesionaria con datos que nadie ve.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { estadoAhora, horariosResumidos, problemaDeHorarios, hayDireccion, agenciaLimpia, type Horarios } from "./agencia";
import { storeConfigSchema, storePreferencesSchema, mergeDesignConfig, mergeStorePreferences } from "./store-config";
import { TEMPLATE_TIPO_TIENDA, TEMPLATES_CON_AGENCIA, type TemplateId } from "../types/store-config";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const semana: Horarios = {
  lun: [{ abre: "09:00", cierra: "13:00" }, { abre: "16:00", cierra: "20:00" }],
  mar: [{ abre: "09:00", cierra: "13:00" }, { abre: "16:00", cierra: "20:00" }],
  mie: [{ abre: "09:00", cierra: "13:00" }, { abre: "16:00", cierra: "20:00" }],
  jue: [{ abre: "09:00", cierra: "13:00" }, { abre: "16:00", cierra: "20:00" }],
  vie: [{ abre: "09:00", cierra: "13:00" }, { abre: "16:00", cierra: "20:00" }],
  sab: [{ abre: "09:00", cierra: "13:00" }],
};

console.log("\n1) La lógica");
const res = horariosResumidos(semana);
chequear("lunes a viernes juntos", res[0]?.dias === "Lun a Vie" && res[0].incluye.length === 5, res);
chequear("sábado aparte y domingo cerrado", res[1]?.dias === "Sáb" && res[2]?.horas === "Cerrado", res);
chequear("sin horarios no muestra nada", horariosResumidos({}).length === 0);

// 13/10/26 es martes. Hora argentina = UTC−3.
const ar = (iso: string) => new Date(`${iso}-03:00`);
chequear("martes 10:00 → abierto, cierra 13:00", estadoAhora(semana, ar("2026-10-13T10:00:00"))?.texto === "Abierto · cierra 13:00", estadoAhora(semana, ar("2026-10-13T10:00:00")));
chequear("martes 14:00 → cerrado, abre hoy 16:00", estadoAhora(semana, ar("2026-10-13T14:00:00"))?.texto === "Cerrado · abre hoy 16:00");
chequear("martes 21:00 → abre mañana 09:00", estadoAhora(semana, ar("2026-10-13T21:00:00"))?.texto === "Cerrado · abre mañana 09:00");
chequear("sábado 15:00 → abre el lunes", estadoAhora(semana, ar("2026-10-17T15:00:00"))?.texto === "Cerrado · abre lunes 09:00", estadoAhora(semana, ar("2026-10-17T15:00:00")));
chequear("a las 13:00 en punto ya cerró", estadoAhora(semana, ar("2026-10-13T13:00:00"))?.abierto === false);
chequear("sin horarios no inventa nada", estadoAhora({}) === null);

chequear("cierre antes de apertura se rechaza", problemaDeHorarios({ lun: [{ abre: "19:00", cierra: "09:00" }] }) !== "");
chequear("franjas que se pisan se rechazan", problemaDeHorarios({ lun: [{ abre: "09:00", cierra: "14:00" }, { abre: "13:00", cierra: "18:00" }] }) !== "");
chequear("una semana bien cargada pasa", problemaDeHorarios(semana) === "");
chequear("sin localidad no hay mapa", !hayDireccion({ calle: "Bunge 1234" }) && hayDireccion({ calle: "Bunge 1234", localidad: "Pinamar" }));
chequear("la agencia limpia saca miembros sin nombre", agenciaLimpia({ equipo: [{ nombre: "" }, { nombre: "Ana" }] }).equipo.length === 1);

console.log("\n2) Cada dato en su lugar");
// Sólo la parte de la agencia: el schema entero pide todo el diseño, y un rechazo por OTRO campo haría pasar de casualidad los "no pasa".
const agenciaSch = storeConfigSchema.shape.agencia;
const diseno = agenciaSch.safeParse({ pagos: ["contado"], salon: ["https://x.supabase.co/a.webp"] });
chequear("el diseño acepta la agencia", diseno.success, diseno.success ? undefined : diseno.error.flatten());
chequear("una foto con javascript: no pasa", !agenciaSch.safeParse({ salon: ["javascript:alert(1)"] }).success);
chequear("la descripción de una persona tiene tope de 140", agenciaSch.safeParse({ equipo: [{ nombre: "Ana", bio: "x".repeat(140) }] }).success && !agenciaSch.safeParse({ equipo: [{ nombre: "Ana", bio: "x".repeat(141) }] }).success);
chequear("un medio de pago inventado no pasa", !agenciaSch.safeParse({ pagos: ["trueque"] }).success);
chequear("las preferencias aceptan la ubicación", storePreferencesSchema.safeParse({ ubicacion: { calle: "Bunge 1234", horarios: semana } }).success && agenciaSch.safeParse({ equipo: [{ nombre: "Ana", foto: "https://x/a.webp" }] }).success);
chequear("una hora mal escrita no pasa", !storePreferencesSchema.safeParse({ ubicacion: { horarios: { lun: [{ abre: "9", cierra: "25:00" }] } } }).success);

const guardado = JSON.stringify({ template: "auto-volt", ubicacion: { calle: "Bunge 1234", localidad: "Pinamar" }, agencia: { garantia: "3 meses" } });
const trasDiseno = JSON.parse(mergeDesignConfig(guardado, { template: "auto-volt", agencia: { garantia: "6 meses" } } as never));
chequear("guardar el diseño NO borra la dirección", trasDiseno.ubicacion?.calle === "Bunge 1234", trasDiseno);
chequear("guardar el diseño sí cambia la agencia", trasDiseno.agencia?.garantia === "6 meses");
const trasPrefs = JSON.parse(mergeStorePreferences(guardado, { ubicacion: { calle: "Otra 1", localidad: "Pinamar" } }));
chequear("guardar preferencias NO borra la agencia", trasPrefs.agencia?.garantia === "3 meses", trasPrefs);

console.log("\n3) Todos los templates de autos tienen su página");
const raiz = join(__dirname, "..");
const renderer = readFileSync(join(raiz, "components/store/StorefrontTemplateRenderer.tsx"), "utf8");
const deAutos = (Object.entries(TEMPLATE_TIPO_TIENDA) as [TemplateId, string[]][]).filter(([, r]) => r.includes("AUTOS")).map(([id]) => id);
chequear("hay templates de autos", deAutos.length >= 3, deAutos);
for (const id of deAutos) {
  chequear(`${id}: está en TEMPLATES_CON_AGENCIA`, TEMPLATES_CON_AGENCIA.includes(id));
  const comp = new RegExp(`"${id}":\\s*(\\w+)`).exec(renderer)?.[1];
  const ruta = comp && new RegExp(`import ${comp} from "\\./([^"]+)"`).exec(renderer)?.[1];
  const fuente = ruta ? readFileSync(join(raiz, "components/store", `${ruta}.tsx`), "utf8") : "";
  chequear(`${id}: dibuja una página de agencia`, /<Agencia\w+\b/.test(fuente), ruta);
  chequear(`${id}: la muestra en /nosotros`, /enNosotros|useVistaAgencia/.test(fuente));
  chequear(`${id}: tiene "La agencia" en el menú`, /"La agencia"/.test(fuente));
}

console.log(fallos ? `\n${fallos} con problemas` : "\nTodo bien");
if (fallos) process.exit(1);
