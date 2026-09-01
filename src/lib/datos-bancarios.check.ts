/**
 * Chequeos de los datos bancarios. Se corre con:
 *
 *   npx tsx src/lib/datos-bancarios.check.ts
 *
 * Acá vive el único campo de toda la Configuración donde un error de tipeo
 * cuesta plata de verdad: un dígito mal en el CBU manda la plata de una venta a
 * otro lado y no vuelve.
 */

import {
  cbuChecksumOk, validarCBU, validarAlias, validarTransferencia, soloDigitos,
  LARGO_ALIAS,
} from "./datos-bancarios";
import { TRANSFERENCIA_DIGITAL } from "./planLimits";
import { TIERS_DIGITALES } from "./planes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El dígito verificador del CBU ────────────────────────────────────────── */

/* Dos CBUs de documentación pública de bancos argentinos. Están acá para que el
   algoritmo no se pueda romper en silencio: una cuenta mal escrita da igual, un
   ALGORITMO mal escrito rechaza a todo el mundo y nadie puede cobrar. */
const REALES = ["0170099220000067797370", "2850590940090418135201"];

check("CBU-A", REALES.every((c) => cbuChecksumOk(c)),
  "los CBUs reales de prueba pasan el verificador");

/* ⚠️ EL chequeo de este archivo. El dígito verificador existe para atrapar el
   error de tipeo, que es el único que la gente comete de verdad al copiar un
   CBU. Si esto bajara de 100%, algún tipeo pasaría derecho. */
const mutacionesRechazadas = (() => {
  const base = REALES[0];
  let rotos = 0, total = 0;
  for (let i = 0; i < 22; i++) {
    for (let d = 0; d < 10; d++) {
      if (String(d) === base[i]) continue;
      total++;
      if (!cbuChecksumOk(base.slice(0, i) + d + base.slice(i + 1))) rotos++;
    }
  }
  return { rotos, total };
})();
check("CBU-B", mutacionesRechazadas.rotos === mutacionesRechazadas.total,
  `cambiar UN dígito lo rompe siempre (${mutacionesRechazadas.rotos}/${mutacionesRechazadas.total})`);

check("CBU-C", !cbuChecksumOk("1234567890123456789012"), "un número inventado no pasa");

/* ⚠️ 22 ceros SÍ pasa el dígito verificador: la suma da 0 y el verificador que
   le corresponde es 0. Y no es un caso de laboratorio — es lo que se escribe
   para saltear un campo obligatorio. Por eso se rechaza aparte. */
check("CBU-D", cbuChecksumOk("0000000000000000000000"),
  "22 ceros pasa el verificador (por eso hace falta el chequeo de abajo)");
check("CBU-D2", validarCBU("0000000000000000000000") !== null,
  "pero se rechaza igual: nadie tiene esa cuenta");
check("CBU-D3", validarCBU("1111111111111111111111") !== null, "ni ningún número repetido 22 veces");

/* ── Qué CBU se acepta ────────────────────────────────────────────────────── */

check("CBU-E", validarCBU(REALES[0]) === null, "un CBU válido pasa");
check("CBU-F", validarCBU("") === null, "vacío pasa: se puede tener sólo alias");

/* La gente copia el CBU del homebanking y viene con espacios o guiones. Retarla
   por eso sería retarla por copiar bien. */
check("CBU-G", validarCBU("0170 0992 2000 0067 7973 70") === null,
  "con espacios también: se limpia solo");
check("CBU-H", validarCBU("0170-0992-2000-0067-7973-70") === null, "y con guiones");

check("CBU-I", (validarCBU("123") ?? "").includes("3"),
  "uno corto avisa CUÁNTOS números escribiste, no sólo que está mal");
check("CBU-J", validarCBU("0170099220000067797371") !== null,
  "uno con el último dígito cambiado se rechaza");
check("CBU-K", [null, undefined, 5, {}].every((v) => validarCBU(v) !== null),
  "lo que no es texto tampoco");

check("CBU-L", soloDigitos(" 12-34 ab") === "1234", "soloDigitos saca todo lo que no es número");

/* ── El alias ─────────────────────────────────────────────────────────────── */

check("ALIAS-A", validarAlias("mis.guias.mp") === null, "un alias normal pasa");
check("ALIAS-B", validarAlias("") === null, "vacío pasa");
check("ALIAS-C", validarAlias("corto") !== null, "uno de menos de 6 no");
check("ALIAS-D", validarAlias("x".repeat(LARGO_ALIAS + 1)) !== null, "ni uno de más de 20");
check("ALIAS-E", validarAlias("con espacio") !== null, "ni uno con espacios");
check("ALIAS-F", validarAlias("alias@raro") !== null, "ni con signos que no van");
check("ALIAS-G", validarAlias("mi-alias-2026") === null, "guiones y números sí");

/* ── Cuándo se puede PRENDER ──────────────────────────────────────────────── */

const completa = {
  enabled: true, titular: "Juan Pérez", cbu: REALES[0], alias: "", banco: "", instrucciones: "",
};

check("TR-A", validarTransferencia(completa) === null, "con titular y CBU se puede activar");
check("TR-B", validarTransferencia({ ...completa, cbu: "", alias: "mis.guias.mp" }) === null,
  "con alias en vez de CBU también");

/* ⚠️ Prendida sin datos le muestra al comprador una forma de pagar que no dice a
   dónde transferir. Esa venta se pierde entera. */
check("TR-C", validarTransferencia({ ...completa, cbu: "", alias: "" }) !== null,
  "prendida sin CBU ni alias NO: sería una forma de pago que no dice a dónde pagar");

/* El titular no es un adorno: quien transfiere ve ese nombre en su homebanking
   antes de confirmar, y si no coincide con nadie, no manda la plata. */
check("TR-D", validarTransferencia({ ...completa, titular: "" }) !== null,
  "ni prendida sin titular");
check("TR-E", validarTransferencia({ ...completa, titular: "J" }) !== null,
  "ni con un titular de una letra");

/* Apagada puede estar a medio llenar: alguien que empezó a cargarla y la dejó no
   rompe nada. */
check("TR-F", validarTransferencia({ ...completa, enabled: false, titular: "", cbu: "", alias: "" }) === null,
  "apagada puede estar vacía: no rompe nada");

/* Pero un CBU MAL escrito se rechaza siempre, prendida o apagada: guardarlo
   apagado sólo posterga el problema para el día que la prenda. */
check("TR-G", validarTransferencia({ ...completa, enabled: false, cbu: "0170099220000067797371" }) !== null,
  "un CBU mal escrito se rechaza aunque esté apagada");

/* ── El candado del plan ──────────────────────────────────────────────────── */

/* ⚠️ Free no puede cobrar por transferencia, y NO es una función recortada para
   empujar a pagar: Free no cobra abono, así que lo único que deja es la comisión
   —que se retiene adentro del cobro de Mercado Pago—. En una transferencia no
   pasa un peso por la plataforma. Un Free con transferencia no paga nada por
   nada. */
check("PLAN-A", TRANSFERENCIA_DIGITAL.FREE === false, "Free NO puede cobrar por transferencia");
check("PLAN-B", TRANSFERENCIA_DIGITAL.STARTER && TRANSFERENCIA_DIGITAL.PRO,
  "Starter y Pro sí: ahí el abono ya está pago");
check("PLAN-C", TIERS_DIGITALES.every((t) => typeof TRANSFERENCIA_DIGITAL[t] === "boolean"),
  "los tres planes tienen una respuesta, ninguno queda indefinido");

console.log(fallos === 0
  ? "\nok — los datos bancarios se sostienen"
  : `\nFALLA — ${fallos} chequeo(s) de datos bancarios`);
process.exit(fallos === 0 ? 0 : 1);
