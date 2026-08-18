/**
 * Chequeos de la regla de contraseñas. Se corre a mano:
 *
 *   npx tsx src/lib/password-policy.check.ts
 *
 * Esta regla decide quién puede abrir una cuenta. El error que motivó el archivo
 * no fue que la regla estuviera mal, sino que había TRES y no decían lo mismo —
 * y la del servidor, la única que importa, no tenía mínimo. Por eso los casos de
 * abajo prueban la función, que ahora es la única que existe.
 */

import { validarContrasena, LARGO_MINIMO } from "./password-policy";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const rechaza = (valor: unknown, titulo: string) =>
  chequear(titulo, validarContrasena(valor) !== null, validarContrasena(valor));
const acepta = (valor: unknown, titulo: string) =>
  chequear(titulo, validarContrasena(valor) === null, validarContrasena(valor));

console.log("\n1) Lo que no llega al largo");
rechaza("", "vacia");
rechaza("a", "un caracter — lo que se podia registrar por la API");
rechaza("abc123", "seis: lo que pedia el formulario viejo");
rechaza("abc1234", "siete, una menos que el minimo");
acepta("frutilla", `ocho, el minimo (${LARGO_MINIMO})`);
rechaza("abc12345", "ocho pero esta en la lista de las mas usadas");

console.log("\n2) Lo que no es texto");
rechaza(null, "null");
rechaza(undefined, "undefined");
rechaza(12345678, "un numero");
rechaza({ password: "abc12345" }, "un objeto");
rechaza(["abc12345"], "un array");

console.log("\n3) Las que ya estan en las listas");
rechaza("password", "password");
rechaza("PASSWORD", "en mayusculas — se compara sin distinguir");
rechaza("Password123", "password123 con mayuscula");
rechaza("  password123  ", "con espacios alrededor");
rechaza("12345678", "12345678");
rechaza("bocajuniors", "bocajuniors");
rechaza("tiendaapps", "el nombre de la plataforma");
acepta("passwordista", "una que solo EMPIEZA parecido si sirve");

console.log("\n4) Un mismo caracter repetido");
rechaza("aaaaaaaa", "ocho veces la a");
rechaza("00000000", "ocho ceros");
acepta("aaaaaaab", "casi todas iguales pero no todas");

console.log("\n5) El techo de bcrypt se mide en bytes");
acepta("ab".repeat(36), "72 caracteres comunes = 72 bytes");
rechaza("ab".repeat(36) + "c", "73 caracteres comunes");
// Cada acento ocupa 2 bytes: 40 letras = 80 bytes, aunque "midan" 40.
rechaza("áé".repeat(20), "40 acentos = 80 bytes, contando letras habria pasado");
acepta("áé".repeat(15), "30 acentos = 60 bytes, entra");
// Un emoji ocupa 4 bytes.
rechaza("🔒🔑".repeat(10), "20 emojis = 80 bytes");

console.log("\n6) Las que tienen que entrar");
acepta("mi-tienda-2026", "una normal con guiones");
acepta("Flavio!Pinamar9", "con mayuscula, signo y numero");
acepta("caballo correcto grapa", "una frase con espacios");
acepta("ñandú en la vía", "con eñe y acento");

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
