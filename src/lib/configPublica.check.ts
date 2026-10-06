/**
 * Chequeo de `configPublica`. Se corre con:
 *
 *   npx tsx src/lib/configPublica.check.ts
 *
 * Los datos bancarios de la dueña (CBU, alias, CUIL…) viven dentro de
 * `storeConfig` y no pueden salir al navegador. Esto vigila el recorte y que
 * los dos caminos públicos lo sigan usando.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { configPublica, configPublicaTexto, esWhatsappDeEjemplo } from "./configPublica";
import { DEFAULT_CONFIG, WHATSAPP_DE_EJEMPLO } from "../types/store-config";
import { mediosHabilitados } from "./mediosDePago";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const completo = {
  template: "aire",
  paymentInfo: {
    transferencia: { enabled: true, titular: "Ana", cbu: "0000003100000000000001", alias: "ana.mp", banco: "X", cuil: "27-12345678-9", instrucciones: "…" },
    efectivo: { enabled: false, instrucciones: "Retirá en Calle 123" },
  },
};
const pub = JSON.stringify(configPublica(completo));
for (const dato of ["0000003100000000000001", "ana.mp", "27-12345678-9", "Ana", "Calle 123"]) {
  chequear(`no sale "${dato}"`, !pub.includes(dato), pub);
}
chequear("sí sale qué medios están activos", pub.includes('"transferencia":{"enabled":true}') && pub.includes('"efectivo":{"enabled":false}'), pub);
chequear("el resto del diseño queda igual", (configPublica(completo) as { template: string }).template === "aire");
chequear("sin paymentInfo no rompe", JSON.stringify(configPublica({ template: "x" })) === '{"template":"x"}');
/* El carrito decide los botones con la versión PÚBLICA y el servidor acepta con
   la COMPLETA: las dos tienen que dar los mismos medios. Un `paymentInfo: {}`
   recortado a "los dos apagados" dejaba el carrito sin medios. */
for (const pi of [undefined, {}, { transferencia: { enabled: true, cbu: "1" } }, { efectivo: { enabled: false } }, completo.paymentInfo]) {
  for (const hasMercadoPago of [false, true]) {
    const servidor = mediosHabilitados({ paymentInfo: pi, hasMercadoPago });
    const carrito = mediosHabilitados({ paymentInfo: (configPublica({ paymentInfo: pi }) as { paymentInfo?: typeof pi }).paymentInfo, hasMercadoPago });
    chequear(`mismos medios ${JSON.stringify(pi)} mp=${hasMercadoPago}`, JSON.stringify(servidor) === JSON.stringify(carrito), { servidor, carrito });
  }
}
// El WhatsApp de muestra grabado en una tienda real sale apagado (06/10/26).
const conEjemplo = configPublica({ whatsapp: { enabled: true, number: WHATSAPP_DE_EJEMPLO, message: "hola" } }) as { whatsapp: { enabled: boolean; number: string; message: string } };
chequear("WhatsApp de muestra → apagado y sin número", conEjemplo.whatsapp.enabled === false && conEjemplo.whatsapp.number === "" && conEjemplo.whatsapp.message === "hola", conEjemplo);
const conReal = configPublica({ whatsapp: { enabled: true, number: "+54 9 2254 605521" } }) as { whatsapp: { enabled: boolean; number: string } };
chequear("un WhatsApp real queda igual", conReal.whatsapp.enabled === true && conReal.whatsapp.number === "+54 9 2254 605521", conReal);
chequear("la configuración de fábrica no trae el de muestra prendido", !(DEFAULT_CONFIG.whatsapp?.enabled && esWhatsappDeEjemplo(DEFAULT_CONFIG.whatsapp?.number)));
chequear("texto roto → {}",configPublicaTexto("{no es json") === "{}");
chequear("texto vacío → igual", configPublicaTexto("") === "" && configPublicaTexto(null) === null);

const raiz = process.cwd();
const usa = (archivo: string, fn: string) => readFileSync(join(raiz, archivo), "utf8").includes(`${fn}(`);
chequear("la API pública recorta", usa("src/app/api/public/[slug]/route.ts", "configPublicaTexto"));
chequear("la página de la tienda recorta", usa("src/app/tienda/[slug]/page.tsx", "configPublica"));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
