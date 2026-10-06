/**
 * Chequeo de `numeroWhatsApp`. Se corre con:
 *
 *   npx tsx src/lib/whatsappTienda.check.ts
 *
 * Cómo se arma el número de wa.me desde lo que escribe la dueña: con país se
 * respeta, sin país se lee como celular argentino, y el de muestra no sirve.
 */
import { numeroWhatsApp } from "./whatsappTienda";
const casos: [string, string | null][] = [
  ["+54 9 11 5555-1234", "5491155551234"],
  ["011 15 5555-1234", "5491155551234"],
  ["11 5555-1234", "5491155551234"],
  ["2254 15 605521", "5492254605521"],
  ["+54 2254-587642", "542254587642"],
  ["+5492254605521", "5492254605521"],
  ["0054 9 11 5555 1234", "5491155551234"],
  ["+54 9 11 0000-0000", null],
  ["5491100000000", null],
  ["123", null],
  ["", null],
  ["+1 415 555 2671", "14155552671"],
];
let f = 0;
for (const [e, s] of casos) { const r = numeroWhatsApp(e); const okk = r === s; if (!okk) f++; console.log(okk ? "  ok   " : "  FALLA", JSON.stringify(e), "→", r, okk ? "" : `(esperado ${s})`); }
console.log(f === 0 ? "\n✓ todo bien\n" : `\n✗ ${f} falla(s)\n`);
process.exit(f ? 1 : 0);
