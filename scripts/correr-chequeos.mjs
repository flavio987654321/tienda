// ─────────────────────────────────────────────────────────────────────────────
// Corre TODAS las pruebas `*.check.ts` del proyecto, de una.
//
// Por qué existe: había 40 archivos de prueba escritos y NINGÚN comando que los
// corriera. Se corrían a mano, de a uno, cuando alguien se acordaba — o sea casi
// nunca. Resultado medido: `atribucion-afiliado.check.ts` estuvo fallando en
// silencio desde que el listado se mudó de archivo, y la que cuida que la
// comisión del afiliado viaje con la venta. No estaba rota la comisión, pero
// nadie lo sabía: nadie la había corrido.
//
// Cada prueba se corre en su propio proceso a propósito. Comparten nombres de
// variables globales y algunas pisan `localStorage` o `window`; en un solo
// proceso se ensucian entre ellas y el resultado depende del orden.
//
// El código de salida es 1 si falla alguna, para que sirva de portón: `npm run
// check` antes de deployar contesta sí o no, sin leer cuarenta salidas.
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const RAIZ = process.cwd();

/** Busca los `*.check.ts` en todo `src`, no sólo en `src/lib`. */
function buscar(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...buscar(p));
    else if (e.name.endsWith(".check.ts")) out.push(p);
  }
  return out;
}

const archivos = buscar(join(RAIZ, "src")).sort();
if (archivos.length === 0) {
  console.error("No encontré ninguna prueba (*.check.ts). ¿Se movieron de lugar?");
  process.exit(1);
}

console.log(`Corriendo ${archivos.length} pruebas…\n`);

const fallaron = [];
const saltadas = [];

for (const archivo of archivos) {
  const nombre = relative(RAIZ, archivo).replace(/\\/g, "/");
  const r = spawnSync("npx", ["tsx", archivo], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const salida = (r.stdout ?? "") + (r.stderr ?? "");

  /* Algunas piden variables de entorno (ej. el pixel de Meta) y no se pueden
     correr sin `.env.local`. Eso NO es una falla: es "no aplica acá". Se listan
     aparte para que se vean, en vez de contarlas como rotas —que sería el camino
     más corto a que se ignore la salida entera— o esconderlas.

     Las DOS condiciones hacen falta, y la segunda es la que importa. Decidirlo
     sólo por el texto era un agujero justo en la herramienta que existe para que
     nada falle en silencio: una prueba que se rompiera de verdad y que en algún
     mensaje dijera "corré con:" se habría reportado como salteada, y nadie se
     entera nunca.

     Una prueba que falla SIEMPRE imprime "FALLA" —lo hace `chequear`, que es por
     donde pasan las 41—, así que si aparece esa palabra no es una salteada, sea
     lo que sea lo demás que diga. */
  const pareceFalta = /Falta [A-Z_]+ —|corré con:/.test(salida);
  const hayFallas = salida.includes("FALLA") || salida.includes("fallando");
  if (r.status !== 0 && pareceFalta && !hayFallas) {
    saltadas.push({ nombre, motivo: salida.trim().split("\n")[0] });
    console.log(`—  ${nombre}  (necesita variables de entorno)`);
    continue;
  }

  if (r.status === 0) {
    console.log(`ok ${nombre}`);
  } else {
    fallaron.push({ nombre, salida });
    console.log(`✗  ${nombre}`);
  }
}

if (saltadas.length > 0) {
  console.log(`\n${saltadas.length} salteada(s) por falta de variables de entorno:`);
  for (const s of saltadas) console.log(`  ${s.nombre}`);
  console.log("  Para incluirlas: npx dotenv -e .env.local -- npm run check");
}

if (fallaron.length === 0) {
  console.log(`\n✓ Pasaron las ${archivos.length - saltadas.length} pruebas que se pudieron correr.\n`);
  process.exit(0);
}

// La salida completa de las que fallaron va al final y no mezclada con el
// listado: si se imprime en el momento, el resumen queda enterrado arriba de
// cientos de líneas y hay que scrollear para saber qué pasó.
console.log(`\n${"─".repeat(70)}`);
for (const f of fallaron) {
  console.log(`\n✗ ${f.nombre}\n`);
  console.log(f.salida.trimEnd());
}
console.log(`\n${"─".repeat(70)}`);
console.log(`\n✗ Fallaron ${fallaron.length} de ${archivos.length - saltadas.length}:`);
for (const f of fallaron) console.log(`  ${f.nombre}`);
console.log("");
process.exit(1);
