/**
 * Chequeo del registro de capas. Se corre a mano:
 *
 *   npx tsx src/lib/capas-tienda.check.ts
 *
 * ── La historia ──────────────────────────────────────────────────────────────
 *
 * `CAPAS` existe justamente para que nadie tenga que inventar un z-index. Pero
 * quedaba media escala afuera: la del template dibujado ADENTRO del editor.
 *
 * Esa parte existe por algo que no se adivina leyendo el código: los botones de
 * edición no están en el marco del editor, están dibujados adentro del template.
 * O sea que compiten con las capas de la tienda, en el mismo contexto de
 * apilado. De ahí salieron los números grandes — del commit que los trajo: "en
 * el editor, los botones de edición flotaban sobre el nav sticky al scrollear
 * mínimamente".
 *
 * Desde ahí, cada cosa del template que tenía que verse en la previa se fue
 * sumando un número a mano. Al escribir esto había **45 lugares en los once
 * templates** con literales tipo `isPreview ? 20000 : 600`, y ninguno decía
 * contra qué estaba compitiendo — que es exactamente el problema que `CAPAS`
 * vino a resolver.
 *
 * Ahora tienen nombre. Los valores son los mismos: se verificó archivo por
 * archivo, contra producción, que ninguna capa cambiara de número.
 *
 * ── Qué se cuida acá ─────────────────────────────────────────────────────────
 *
 * 1. Que el orden de la escala del editor siga siendo el que resuelve el bug
 *    original. Si el nav de la previa quedara por debajo de los botones de
 *    edición, vuelve el problema de 2026: la barra tapada al scrollear.
 * 2. Que no vuelvan los literales a los templates.
 * 3. Que los modales que abre un visitante desde un template queden por debajo
 *    de los carteles de la plataforma. Es la razón por la que el catálogo
 *    embebido usa `modalTemplate` y no el 600 que Boho Terra usa a mano.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CAPAS } from "./capas-tienda";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

console.log("1) El orden de la escala del editor");

/* El bug original: los botones de edicion tapaban la barra del template. */
chequear("el nav de la previa le gana a los botones de edición",
  CAPAS.previaNav > CAPAS.edicionBoton && CAPAS.previaNav > CAPAS.edicionVelo,
  { previaNav: CAPAS.previaNav, edicionBoton: CAPAS.edicionBoton });

chequear("lo que cuelga del nav le gana al nav",
  CAPAS.previaNavAlto > CAPAS.previaNav);

chequear("un modal le gana al nav de la previa",
  CAPAS.previaModal > CAPAS.previaNav);

chequear("la foto ampliada le gana al modal",
  CAPAS.previaModalAlto > CAPAS.previaModal);

chequear("un modal abierto SOBRE otro le gana a los dos",
  CAPAS.previaModalSobreModal > CAPAS.previaModalAlto);

/* Los globitos del editor son lo unico que tiene que ganarle a todo: son la
   etiqueta que dice QUE se esta por editar. */
chequear("los globitos del editor le ganan a todo lo demás",
  CAPAS.edicionGlobito > CAPAS.previaModalSobreModal);

console.log("\n2) El orden de la tienda publicada");

chequear("un modal del template le gana a la barra",
  CAPAS.modalTemplate > CAPAS.nav);

/* Y pierde contra los carteles de la plataforma. Un aviso que aparece solo
   --el flyer, el cartel de novedades-- no puede quedar atras de un producto,
   y sobre todo: una confirmacion no puede quedar tapada. */
for (const [nombre, valor] of [["los avisos", CAPAS.aviso], ["los modales de la plataforma", CAPAS.modal], ["lo crítico", CAPAS.critico]] as const) {
  chequear(`y pierde contra ${nombre}`, valor > CAPAS.modalTemplate, { modalTemplate: CAPAS.modalTemplate, [nombre]: valor });
}

console.log("\n3) Nadie volvió a escribir un número a mano");

const DIR = "src/components/store/templates";
const templates = readdirSync(join(RAIZ, DIR)).filter(f => f.endsWith(".tsx"));
let conLiterales = 0;
for (const f of templates) {
  const src = leer(`${DIR}/${f}`);
  /* Lo que se prohibe es la forma que tenia el problema: un z-index de cuatro
     cifras o mas escrito ahi mismo. Los `zIndex: 1` y `zIndex: 10` de adentro de
     una tarjeta no compiten con nada de afuera y siguen estando bien. */
  const literales = src.match(/zIndex:\s*(?:isPreview \? )?[0-9]{4,}/g) ?? [];
  if (literales.length) { conLiterales++; console.log(`  FALLA ${f}: ${literales.join(", ")}`); fallos++; }
}
chequear(`ninguno de los ${templates.length} templates tiene capas escritas a mano`, conLiterales === 0);

const edit = leer("src/contexts/EditContext.tsx");
chequear("y el editor tampoco",
  !/zIndex:\s*[0-9]{4,}/.test(edit),
  "volvió un número suelto en EditContext");

console.log(fallos === 0
  ? "\nTodo bien: una sola escala, con nombres, y el orden que resuelve el bug.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
