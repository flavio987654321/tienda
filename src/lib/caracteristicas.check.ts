/* El teléfono en dos partes. Correr: npx tsx src/lib/caracteristicas.check.ts */
import { armarTelefono, separarTelefono, queFalta, buscarCaracteristica, largoDelNumero } from "./caracteristicas";
import { validarTelefono } from "./telefono";
import { numeroWhatsApp } from "./whatsappTienda";

let fallas = 0;
function check(id: string, ok: boolean, que: string, ver?: unknown) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${que}${ok ? "" : `  → ${JSON.stringify(ver)}`}`);
  if (!ok) fallas++;
}
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const t = armarTelefono("341", "5551234");
check("TEL-A", t === "+54 9 341 555-1234", "se guarda siempre igual", t);
check("TEL-B", validarTelefono(t) === null && numeroWhatsApp(t) === "5493415551234", "pasa la regla de toda la plataforma y arma el link de WhatsApp", numeroWhatsApp(t));
check("TEL-C", armarTelefono("11", "5555-1234") === "+54 9 11 5555-1234" && armarTelefono("2254", "447183") === "+54 9 2254 44-7183", "11 lleva 8, 2254 lleva 6");
check("TEL-D", armarTelefono("341", "15 5551234") === "+54 9 341 555-1234", "el 15 de adelante se saca");
for (const [entrada, esperado] of [
  ["+54 9 341 555-1234", { pais: "AR", codigo: "341", numero: "5551234" }],
  ["0341 15 555-1234", { pais: "AR", codigo: "341", numero: "5551234" }],
  ["1155551234", { pais: "AR", codigo: "11", numero: "55551234" }],
  ["2254447183", { pais: "AR", codigo: "2254", numero: "447183" }],
  ["+598 99 123 456", { pais: "otro", texto: "+598 99 123 456" }],
] as const) {
  const p = separarTelefono(entrada);
  check("TEL-E", igual(p, esperado), `lee "${entrada}"`, p);
}
check("TEL-F", igual(separarTelefono(""), { pais: "AR", codigo: "", numero: "" }), "vacío");
check("TEL-G", queFalta("341", "55512") === "Faltan 2 números." && queFalta("11", "555512345") !== null && queFalta("341", "5551234") === null && queFalta("", "555") === "Elegí la característica.", "dice qué falta");
check("TEL-H", buscarCaracteristica("rosa")[0]?.codigo === "341" && buscarCaracteristica("cordoba")[0]?.codigo === "351" && buscarCaracteristica("0225").some((c) => c.codigo === "2252"), "busca por ciudad sin tildes y por código con o sin 0");
check("TEL-I", largoDelNumero("11") === 8 && largoDelNumero("2254") === 6, "característica + número = 10");

if (fallas) { console.log(`\n${fallas} fallaron.`); process.exit(1); }
console.log("\nTodo bien.");
