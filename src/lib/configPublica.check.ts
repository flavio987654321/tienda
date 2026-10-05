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
import { configPublica, configPublicaTexto } from "./configPublica";

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
chequear("texto roto → {}", configPublicaTexto("{no es json") === "{}");
chequear("texto vacío → igual", configPublicaTexto("") === "" && configPublicaTexto(null) === null);

const raiz = process.cwd();
const usa = (archivo: string, fn: string) => readFileSync(join(raiz, archivo), "utf8").includes(`${fn}(`);
chequear("la API pública recorta", usa("src/app/api/public/[slug]/route.ts", "configPublicaTexto"));
chequear("la página de la tienda recorta", usa("src/app/tienda/[slug]/page.tsx", "configPublica"));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
