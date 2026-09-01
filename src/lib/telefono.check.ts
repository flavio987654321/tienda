/**
 * Chequeos de la regla del teléfono. Se corre a mano con:
 *
 *   npx tsx src/lib/telefono.check.ts
 *
 * Esta regla estaba escrita sólo en el registro, y la ruta que EDITA el teléfono
 * después no la tenía: el número que no se podía cargar al crear la cuenta se
 * guardaba igual entrando por `/api/perfil`. Ahora sale de un solo lado, y esto
 * cuida que ese lado siga diciendo lo mismo.
 */

import { validarTelefono, DIGITOS_MINIMOS, DIGITOS_MAXIMOS, LARGO_MAXIMO } from "./telefono";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const vale = (v: string) => validarTelefono(v) === null;

/* ── Los que tienen que entrar ─────────────────────────────────────────────── */
check("TEL-A", vale("+54 9 11 5555 5555"), "un celular argentino escrito como lo escribe la gente");
check("TEL-B", vale("2254605521"), "el mismo número sin nada en el medio");
check("TEL-C", vale("+54 (2254) 60-5521"), "con paréntesis y guiones");
check("TEL-D", vale(""), "vacío: el teléfono es opcional en todas partes");
check("TEL-E", vale("   "), "sólo espacios cuenta como vacío, no como error");

/* ── Los que NO ───────────────────────────────────────────────────────────── */
check("TEL-F", !vale("1234567"), "siete dígitos: abajo del mínimo de la norma E.164");
check("TEL-G", !vale("1".repeat(DIGITOS_MAXIMOS + 1)), "un dígito más que el máximo");

/* El que más importa. Sin la lista de caracteres permitidos entraba cualquier
   texto que tuviera ocho dígitos adentro, y quedaba guardado como si fuera un
   teléfono. Se descubre el día que soporte necesita llamar. */
check("TEL-H", !vale("llamame al 1155556666 y preguntá por Juan"),
  "una frase con un número adentro no es un teléfono");
check("TEL-I", !vale("<script>alert(1)</script>"), "nada que parezca código entra");
check("TEL-J", !vale("11555566661@x.com"), "una dirección de correo tampoco");

/* El largo se mide sobre el texto entero, no sobre los dígitos: entre los dígitos
   entran espacios, guiones y paréntesis, y sin tope alguien manda 10.000
   caracteres de separadores con ocho números perdidos adentro. */
check("TEL-K", !vale("+" + " ".repeat(LARGO_MAXIMO) + "12345678"),
  "el largo total también tiene tope, no sólo los dígitos");

/* ── Los dos números que la regla promete ──────────────────────────────────── */
check("TEL-L", vale("1".repeat(DIGITOS_MINIMOS)) && vale("1".repeat(DIGITOS_MAXIMOS)),
  "los dos bordes del rango entran, no quedan afuera por un uno de más");
check("TEL-M", DIGITOS_MINIMOS === 8 && DIGITOS_MAXIMOS === 15,
  "el rango sigue siendo el de la norma E.164 (8 a 15)");

/* El mensaje se muestra tal cual al lado del campo. Si algún día vuelve en
   inglés o vacío, la persona ve un borde rojo sin ninguna explicación. */
check("TEL-N",
  (validarTelefono("123") ?? "").includes("dígitos") &&
  (validarTelefono("abc") ?? "").length > 10,
  "los errores vuelven explicados en castellano");

console.log(fallos === 0
  ? "\nok — la regla del teléfono se sostiene"
  : `\nFALLA — ${fallos} chequeo(s) del teléfono`);
process.exit(fallos === 0 ? 0 : 1);
