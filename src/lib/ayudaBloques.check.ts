/**
 * Chequeo de `ayudaBloques`. Se corre con:
 *
 *   npx tsx src/lib/ayudaBloques.check.ts
 *
 * Cada bloque de los templates de moda tiene que tener su "¿para qué sirve?"
 * (el ⓘ del editor). Si alguien suma un bloque y se olvida del texto, el ⓘ no
 * aparece y nadie se entera: esto lo agarra. Lee los ids de los
 * `<SectionBlock id="…">` directo de los archivos, así no hay una lista aparte
 * que mantener. También vigila que ningún texto quede vacío o larguísimo.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ayudaDeBloque, idDeSuperficie } from "./ayudaBloques";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const MODA = ["Aire", "BohoTerra", "UrbanPulse", "ChicParis", "Aurora"];
const dir = join(process.cwd(), "src/components/store/templates");

for (const t of MODA) {
  const fuente = readFileSync(join(dir, `${t}.tsx`), "utf8");
  const ids = [...fuente.matchAll(/<SectionBlock id="([a-z-]+)"/g)].map(m => m[1]);
  const sin = ids.filter(id => !ayudaDeBloque(id));
  chequear(`${t}: los ${ids.length} bloques tienen su ayuda`, ids.length > 0 && sin.length === 0, sin);
  const nombres = [...fuente.matchAll(/nombreBloque="([^"]+)"/g)].map(m => m[1]);
  const sinSup = [...new Set(nombres)].filter(n => !ayudaDeBloque(idDeSuperficie(n)));
  chequear(`${t}: las superficies tienen su ayuda`, sinSup.length === 0, sinSup);
}

chequear("un id que no existe no tiene ayuda (no aparece el ⓘ)", ayudaDeBloque("zz-no-existe") === undefined);
chequear("el prefijo del template no importa", ayudaDeBloque("ai-resenas") === ayudaDeBloque("au-resenas"));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
