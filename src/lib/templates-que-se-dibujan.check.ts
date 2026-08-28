/**
 * Chequeo de "el template que se puede elegir, se puede ver". Se corre a mano:
 *
 *   npx tsx src/lib/templates-que-se-dibujan.check.ts
 *
 * ── Qué se cuida ─────────────────────────────────────────────────────────────
 *
 * Hay DOS listas de templates y ninguna sabe de la otra:
 *
 *   `templateRegistry.ts`                 — la que ve la dueña para elegir, con
 *                                           nombre, descripción, paleta y previa.
 *   `StorefrontTemplateRenderer.tsx`      — la que dibuja la TIENDA PUBLICADA.
 *
 * Si un id está en la primera y no en la segunda, `TEMPLATES[id]` da `undefined`
 * y el renderizador devuelve `null`: la dueña elige el template, lo ve en la
 * previa, lo guarda contenta, y su tienda queda EN BLANCO. Sin error, sin 404,
 * sin nada en la consola. Una página vacía.
 *
 * No es hipotético: le pasó a `aurora`, que estuvo en el selector con su
 * componente y todo, y afuera de la lista del renderizador. Se descubrió de
 * casualidad al probar otra cosa. El propio archivo tiene un comentario que avisa
 * de este agujero —puesto cuando pasó con "fashion-noir"— y volvió a pasar igual.
 *
 * Un comentario no frena esto. Un chequeo sí.
 *
 * ── Al revés también ─────────────────────────────────────────────────────────
 *
 * Un id que se dibuja pero que nadie puede elegir no rompe ninguna tienda, así
 * que no se falla por eso: se avisa nomás. Los alias viejos —"fashion-noir" para
 * Aire— viven ahí a propósito, para las tiendas cuyo JSON quedó con el id de
 * antes.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

const REGISTRO   = "src/lib/templateRegistry.ts";
const RENDERIZADOR = "src/components/store/StorefrontTemplateRenderer.tsx";

/* Los ids que la dueña puede elegir. Se piden CON `component:` en el mismo
   renglón a propósito: el registro también trae los rubros —"moda", "autos",
   "hogar-tech"— que tienen `id` pero son la carpeta, no el template, y no los
   dibuja nadie. */
const elegibles = leer(REGISTRO)
  .split(/\r?\n/)
  .filter(l => l.includes("component:"))
  .map(l => l.match(/id:\s*"([^"]+)"/)?.[1])
  .filter((id): id is string => !!id);

/** Los ids que la tienda publicada sabe dibujar: las claves del mapa TEMPLATES. */
const cuerpo = leer(RENDERIZADOR).match(/const TEMPLATES[^=]*=\s*\{([\s\S]*?)\n\};/);
const dibujables = [...(cuerpo?.[1] ?? "").matchAll(/^\s*"([^"]+)"\s*:/gm)].map(m => m[1]);

let fallos = 0;
const chequear = (titulo: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

console.log(`1) Las dos listas se leyeron`);
chequear("el registro tiene templates elegibles", elegibles.length > 0, { elegibles: elegibles.length });
chequear("el renderizador tiene templates dibujables", dibujables.length > 0, { dibujables: dibujables.length });

console.log(`\n2) Todo lo que se puede elegir, se puede dibujar (${elegibles.length})`);
for (const id of elegibles) {
  chequear(`"${id}" lo sabe dibujar la tienda publicada`, dibujables.includes(id));
}

console.log("\n3) Lo que se dibuja pero no se ofrece (avisos, no fallas)");
const sueltos = dibujables.filter(id => !elegibles.includes(id));
console.log(sueltos.length === 0
  ? "  (ninguno)"
  : `  aviso  ${sueltos.join(", ")} — alias viejos, o ids que ya nadie puede elegir`);

console.log(fallos === 0
  ? "\nTodo bien: el template que se puede elegir, se puede ver.\n"
  : `\n${fallos} chequeo(s) fallando. Una tienda con ese template quedaría EN BLANCO.\n`);
process.exit(fallos === 0 ? 0 : 1);
