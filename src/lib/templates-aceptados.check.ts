/**
 * Chequeo: todo template que se puede elegir en el editor también se puede
 * GUARDAR. Se corre con:
 *
 *   npx tsx src/lib/templates-aceptados.check.ts
 *
 * Pasó con Aurora (04/10/26): estaba en el registro de templates y en el tipo
 * `TemplateId`, se podía elegir y editar, pero la lista de `storeConfigSchema`
 * (lib/store-config) no lo tenía. Al tocar "Guardar" el servidor contestaba 400
 * y el editor decía "Hay un dato que el sistema no acepta en: template". Nadie
 * pudo guardar nunca una tienda en Aurora.
 *
 * Son tres listas escritas a mano en tres archivos, y vienen tres templates
 * nuevos: este chequeo es para que la próxima vez falle acá y no en la cara
 * de una dueña.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

// Los que se pueden elegir: los `id` del registro de templates.
const registro = leer("src/lib/templateRegistry.ts");
// Los templates van en una línea con `desc:`; las categorías ("moda",
// "autos") también tienen `id` y `name` pero no `desc`, y no son templates.
const elegibles = [...registro.matchAll(/\{ *id: *"([a-z-]+)", *name: *"[^"]*", *desc:/g)].map(m => m[1]);

// El tipo.
const tipos = leer("src/types/store-config.ts");
const union = /export type TemplateId\s*=\s*([^;]+);/.exec(tipos)?.[1] ?? "";
const delTipo = [...union.matchAll(/"([a-z-]+)"/g)].map(m => m[1]);

// Los que el servidor acepta al guardar.
const esquema = leer("src/lib/store-config.ts");
const lista = /template:\s*z\.enum\(\[([^\]]+)\]\)/.exec(esquema)?.[1] ?? "";
const aceptados = [...lista.matchAll(/"([a-z-]+)"/g)].map(m => m[1]);

console.log("\n1) Las listas se pudieron leer");
chequear("el registro tiene templates", elegibles.length >= 10, elegibles);
chequear("el tipo TemplateId tiene templates", delTipo.length >= 10, delTipo);
chequear("el esquema de guardado tiene templates", aceptados.length >= 10, aceptados);

console.log("\n2) Todo lo que se puede elegir se puede guardar");
for (const id of elegibles) chequear(`"${id}" se acepta al guardar`, aceptados.includes(id));
for (const id of delTipo) chequear(`"${id}" (del tipo) se acepta al guardar`, aceptados.includes(id));

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
