/**
 * Chequeos del código de pedido. Se corre a mano:
 *
 *   npx tsx src/lib/codigo-pedido.check.ts
 *
 * El primer bloque es el agujero de verdad que había en `/api/seguimiento`:
 * Prisma no escapa los comodines de `LIKE`, así que lo que llegaba por la URL
 * entraba crudo al patrón y `?codigo=______` devolvía el pedido de cualquiera
 * —con nombre, email, teléfono y dirección— sin login y desde cualquier lado.
 *
 * Se probó contra la base real antes de arreglarlo: devolvía un pedido de otra
 * tienda con los datos de una persona de verdad.
 */

import {
  normalizarCodigoPedido, LARGO_MINIMO, LARGO_MAXIMO,
} from "./codigo-pedido";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── Los comodines ────────────────────────────────────────────────────────── */
console.log("\n1) Ningun comodin de LIKE pasa");

// Estos dos son los que funcionaban. Los dos miden 6, asi que el control de
// largo que habia antes los dejaba pasar enteros.
for (const ataque of [
  "______",            // seis "cualquier caracter"
  "%%%%%%",            // seis "cualquier cosa"
  "%_%_%_",
  "ABC%DE",            // el comodin en el medio
  "ABCDE_",
  "____________________",
  "%",                 // corto, pero por las dudas
]) {
  chequear(`"${ataque}" se rechaza`, normalizarCodigoPedido(ataque) === null, normalizarCodigoPedido(ataque));
}

/* ── Los codigos de verdad ────────────────────────────────────────────────── */
console.log("\n2) Los codigos reales siguen andando");

// El de los mails: los ultimos 8 del id, en mayuscula.
chequear("el de 8 del mail", normalizarCodigoPedido("4Q5XASA1") === "4q5xasa1", normalizarCodigoPedido("4Q5XASA1"));
// El del panel: los ultimos 6.
chequear("el de 6 del panel", normalizarCodigoPedido("4WB1AH") === "4wb1ah", normalizarCodigoPedido("4WB1AH"));
chequear("en minuscula tambien", normalizarCodigoPedido("4wb1ah") === "4wb1ah");
chequear("con espacios alrededor", normalizarCodigoPedido("  4WB1AH  ") === "4wb1ah");
chequear("un id entero de 25", normalizarCodigoPedido("cmqucgkft0006xo0l84q5xasa") === "cmqucgkft0006xo0l84q5xasa");
chequear("solo numeros", normalizarCodigoPedido("123456") === "123456");

/* ── El largo ─────────────────────────────────────────────────────────────── */
console.log("\n3) El largo");

chequear(`${LARGO_MINIMO - 1} caracteres no alcanzan`, normalizarCodigoPedido("ABCDE") === null);
chequear(`${LARGO_MINIMO} si`, normalizarCodigoPedido("ABCDEF") === "abcdef");
chequear(`${LARGO_MAXIMO} es el tope`, normalizarCodigoPedido("A".repeat(LARGO_MAXIMO)) !== null);
chequear("uno mas no", normalizarCodigoPedido("A".repeat(LARGO_MAXIMO + 1)) === null);
// Sin tope, alguien manda un "codigo" de dos megas y la base se come el patron.
chequear("uno de 100k no explota", normalizarCodigoPedido("A".repeat(100_000)) === null);

/* ── Lo que puede mandar cualquiera ───────────────────────────────────────── */
console.log("\n4) Basura");

for (const basura of [
  "", "   ", "'; DROP TABLE Order;--", "<script>alert(1)</script>",
  "../../etc/passwd", "ABC-DEF", "ABC DEF", "ABC.DEF", "ñañaña", "🙂🙂🙂🙂🙂🙂",
]) {
  chequear(`${JSON.stringify(basura)} se rechaza`, normalizarCodigoPedido(basura) === null, normalizarCodigoPedido(basura));
}
chequear("null no explota", normalizarCodigoPedido(null) === null);
chequear("undefined tampoco", normalizarCodigoPedido(undefined) === null);
chequear("un objeto tampoco", normalizarCodigoPedido({ toString: () => "%%%%%%" } as unknown as string) === null);

/* ── Lo que sale ──────────────────────────────────────────────────────────── */
console.log("\n5) Lo que sale va derecho a una query");

// Todo lo que devuelva esta funcion se mete en el `endsWith`. Si alguna vez
// dejara pasar un caracter que no sea de un cuid, el agujero vuelve.
const salidas = new Set<string>();
for (const entrada of ["4WB1AH", "  abc123  ", "ZZZZZZZZ", "cmqucgkft0006xo0l84q5xasa", "999999"]) {
  const r = normalizarCodigoPedido(entrada);
  if (r !== null) salidas.add(r);
}
chequear("todo lo que sale es minuscula y alfanumerico",
  [...salidas].every((s) => /^[a-z0-9]+$/.test(s)), [...salidas]);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
