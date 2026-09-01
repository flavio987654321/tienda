/* ══════════════════════════════════════════════════════════════════════════
   LOS DATOS BANCARIOS
   ══════════════════════════════════════════════════════════════════════════

   Acá el error no se puede deshacer. Si alguien se equivoca un dígito del CBU,
   la plata de una venta se va a otro lado y no vuelve. No es un campo más de un
   formulario: es el único de toda la Configuración donde un error de tipeo
   cuesta plata de verdad.

   Por eso el CBU se valida con su **dígito verificador** y no sólo contando 22
   números. Medido sobre un CBU real: de las 198 formas de equivocarse en UN
   dígito, las 198 se detectan. O sea que el error de tipeo más común —el único
   que la gente comete de verdad al copiar un CBU— no pasa. */

export const LARGO_TITULAR = 120;
export const LARGO_ALIAS = 20;
export const LARGO_BANCO = 80;
export const LARGO_INSTRUCCIONES = 500;

/** Sólo los números. La gente escribe el CBU con espacios y guiones. */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * El dígito verificador de un bloque del CBU.
 *
 * El CBU son dos bloques con su propio verificador:
 *
 *   - **Bloque 1**, 8 números: 3 de banco, 4 de sucursal y 1 verificador.
 *   - **Bloque 2**, 14 números: 13 de cuenta y 1 verificador.
 *
 * Cada dígito se multiplica por su peso, se suman todos y el verificador es lo
 * que le falta a esa suma para llegar a la próxima decena.
 */
function verificador(digitos: string, pesos: number[]): number {
  const suma = digitos
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  return (10 - (suma % 10)) % 10;
}

const PESOS_BLOQUE_1 = [7, 1, 3, 9, 7, 1, 3];
const PESOS_BLOQUE_2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

/** Si los dos dígitos verificadores de un CBU de 22 números dan bien. */
export function cbuChecksumOk(cbu: string): boolean {
  if (!/^\d{22}$/.test(cbu)) return false;
  const bloque1 = cbu.slice(0, 8);
  const bloque2 = cbu.slice(8);
  return (
    verificador(bloque1.slice(0, 7), PESOS_BLOQUE_1) === Number(bloque1[7]) &&
    verificador(bloque2.slice(0, 13), PESOS_BLOQUE_2) === Number(bloque2[13])
  );
}

/**
 * `null` si el CBU sirve; el problema en castellano si no.
 *
 * El vacío es válido: se puede tener sólo alias. Quien necesite al menos uno de
 * los dos lo exige afuera — ver `validarTransferencia`.
 */
export function validarCBU(valor: unknown): string | null {
  if (typeof valor !== "string") return "El CBU no es válido";
  const v = soloDigitos(valor);
  if (v.length === 0) return null;
  if (v.length !== 22) return `El CBU tiene 22 números y escribiste ${v.length}`;
  /* Todos ceros PASA el dígito verificador —la suma da 0 y el verificador que le
     corresponde es 0— así que hay que rechazarlo aparte. No es un caso raro: es
     lo que se escribe para saltear un campo obligatorio. Mismo criterio para
     cualquier número repetido 22 veces. */
  if (/^(\d)\1{21}$/.test(v)) return "Ese no es un CBU real. Copialo de tu homebanking.";
  /* El mensaje dice "revisalo" y no "es inválido": el dígito verificador falla
     casi siempre por un número mal tipeado, así que lo útil es mandarla a
     mirarlo de nuevo, no informarle un veredicto. */
  if (!cbuChecksumOk(v)) return "Ese CBU no existe. Revisá que no se te haya escapado un número.";
  return null;
}

/**
 * `null` si el alias sirve; el problema en castellano si no.
 *
 * Las reglas son las del Banco Central: entre 6 y 20 caracteres, letras,
 * números, puntos y guiones. No se valida contra nada real —no hay forma de
 * consultarlo— así que esto sólo atrapa lo que no puede ser un alias.
 */
export function validarAlias(valor: unknown): string | null {
  if (typeof valor !== "string") return "El alias no es válido";
  const v = valor.trim();
  if (v.length === 0) return null;
  if (v.length < 6) return "El alias tiene al menos 6 caracteres";
  if (v.length > LARGO_ALIAS) return `El alias no puede pasar de ${LARGO_ALIAS} caracteres`;
  if (!/^[A-Za-z0-9.-]+$/.test(v)) return "El alias sólo lleva letras, números, puntos y guiones";
  return null;
}

export type Transferencia = {
  enabled?: unknown;
  titular?: unknown;
  cbu?: unknown;
  alias?: unknown;
  banco?: unknown;
  instrucciones?: unknown;
};

/**
 * Qué está mal en los datos de transferencia, o `null`.
 *
 * ⚠️ **Sólo se exige cuando está PRENDIDA.** Apagada puede estar a medio llenar
 * —alguien que empezó a cargarla y la dejó— y eso no rompe nada. Prendida sin
 * datos sí: le muestra al comprador una forma de pagar que no le dice a dónde
 * transferir, y esa venta se pierde entera.
 */
export function validarTransferencia(t: Transferencia): string | null {
  const problemaCbu = validarCBU(t.cbu ?? "");
  if (problemaCbu) return problemaCbu;

  const problemaAlias = validarAlias(t.alias ?? "");
  if (problemaAlias) return problemaAlias;

  if (typeof t.titular === "string" && t.titular.trim().length > LARGO_TITULAR) {
    return `El titular no puede pasar de ${LARGO_TITULAR} caracteres`;
  }
  if (typeof t.banco === "string" && t.banco.trim().length > LARGO_BANCO) {
    return `El banco no puede pasar de ${LARGO_BANCO} caracteres`;
  }
  if (typeof t.instrucciones === "string" && t.instrucciones.length > LARGO_INSTRUCCIONES) {
    return `Las indicaciones no pueden pasar de ${LARGO_INSTRUCCIONES} caracteres`;
  }

  if (!t.enabled) return null;

  /* De acá para abajo, lo que se exige para poder PRENDERLA. */
  const cbu = typeof t.cbu === "string" ? soloDigitos(t.cbu) : "";
  const alias = typeof t.alias === "string" ? t.alias.trim() : "";
  if (!cbu && !alias) {
    return "Para activar transferencia necesitás cargar el CBU o el alias.";
  }
  const titular = typeof t.titular === "string" ? t.titular.trim() : "";
  /* El titular no es un adorno: quien transfiere ve ese nombre en su homebanking
     antes de confirmar, y si no coincide con nadie, no manda la plata. */
  if (titular.length < 2) {
    return "Para activar transferencia necesitás poner a nombre de quién está la cuenta.";
  }
  return null;
}
