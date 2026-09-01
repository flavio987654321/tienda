/**
 * Chequeos del limpiador de texto. Se corre con:
 *
 *   npx tsx src/lib/texto-limpio.check.ts
 *
 * Lo que entra por acá termina en la base, en los mails y en las páginas
 * públicas. Y la regla es UNA sola para las cuatro puertas que escriben texto:
 * el perfil, la configuración y las dos de productos.
 */

import { readFileSync } from "fs";
import { limpiarTexto, campoTexto } from "./texto-limpio";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const NULO = String.fromCharCode(0);
const SALTO = "\n";
const TAB = "\t";
const DEL = String.fromCharCode(127);

/* ── Lo que saca ──────────────────────────────────────────────────────────── */

check("LIMP-A", limpiarTexto("Juan Pérez", 50) === "Juan Pérez", "un texto normal pasa igual");

/* ⚠️ El byte nulo rompe Postgres: no lo acepta adentro de un texto, así que el
   guardado falla con un error que nadie sabe leer. */
check("LIMP-B", limpiarTexto(`Juan${NULO}Pérez`, 50) === "Juan Pérez",
  "el byte nulo se va: Postgres no lo acepta y rompería el guardado");

/* ⚠️ Un salto de línea adentro de un nombre se arrastra a los mails y a sus
   encabezados, donde una línea nueva puede separar un encabezado del siguiente. */
check("LIMP-C", limpiarTexto(`Juan${SALTO}Pérez`, 50) === "Juan Pérez",
  "el salto de línea también: se arrastraría a los encabezados de los mails");
check("LIMP-D", limpiarTexto(`Juan${TAB}Pérez`, 50) === "Juan Pérez", "y la tabulación");
check("LIMP-E", limpiarTexto(`Juan${DEL}Pérez`, 50) === "Juan Pérez", "y el 127");

/* Se reemplazan por un ESPACIO y no por nada: si no, "Juan\nPérez" quedaría
   "JuanPérez", que es una palabra distinta. */
check("LIMP-F", limpiarTexto(`a${SALTO}b`, 50) === "a b",
  "se reemplazan por un espacio, no se borran: si no, dos palabras se pegarían");

/* ── El orden de las operaciones ──────────────────────────────────────────── */

/* ⚠️ Se limpia ANTES de medir. Al revés, un texto de puros invisibles pasaría
   cualquier largo mínimo y quedaría guardado como si fuera algo. */
check("LIMP-G", limpiarTexto(NULO + SALTO + TAB, 50) === null,
  "un texto de puros invisibles queda en null, no en algo que parece cargado");
check("LIMP-H", limpiarTexto("   ", 50) === null, "y uno de puros espacios también");

/* Y se recorta antes del último `trim()`, porque el corte puede dejar un espacio
   colgando justo al final. */
/* El tope 5 hace que el corte caiga JUSTO en el espacio ("hola "). Ese es el
   caso que importa: sin el `trim()` de después del recorte, quedaría guardado un
   texto terminado en espacio. */
check("LIMP-I", limpiarTexto("hola mundo", 5) === "hola",
  "cuando el corte cae en un espacio, no queda colgando");
check("LIMP-J", limpiarTexto("hola", 4) === "hola", "el borde exacto del tope entra entero");

check("LIMP-K", [null, undefined, 5, {}, []].every((v) => limpiarTexto(v, 10) === null),
  "lo que no es texto devuelve null");

/* ── "No vino" vs "vino vacío" ────────────────────────────────────────────── */

/* Un PATCH parcial necesita esa diferencia: sin ella, no mandar un campo y
   mandarlo vacío harían lo mismo, y borrar sería imposible. */
check("CAMP-A", campoTexto(undefined, 10) === undefined, "undefined es 'de eso no te hablo'");
check("CAMP-B", campoTexto(null, 10) === null, "null es 'borralo'");
check("CAMP-C", campoTexto("", 10) === null, "y vacío también borra");
check("CAMP-D", campoTexto("hola", 10) === "hola", "un valor se limpia y se devuelve");

/* ── Una sola regla, para todas las puertas ───────────────────────────────── */

/* ⚠️ EL chequeo de este archivo. La regla estaba escrita SOLO adentro de
   `/api/perfil`: el nombre que esa ruta limpiaba se guardaba sucio entrando por
   Configuración o por Productos. Es el mismo agujero que ya tuvimos con el
   teléfono, y aparece siempre igual — dos copias que se desincronizan de a una. */
const PUERTAS = [
  "src/app/api/perfil/route.ts",
  "src/app/api/digitales/configuracion/route.ts",
  "src/app/api/digitales/productos/route.ts",
  "src/app/api/digitales/productos/[id]/route.ts",
];
for (const f of PUERTAS) {
  const src = readFileSync(f, "utf8");
  check(`PUERTA-${f.split("/").slice(-2).join("/")}`,
    /from "@\/lib\/texto-limpio"/.test(src),
    `${f} usa la regla compartida`);
}

/* Y ninguna se quedó con su propia copia del rango de control. */
for (const f of PUERTAS) {
  const src = readFileSync(f, "utf8");
  check(`COPIA-${f.split("/").slice(-2).join("/")}`,
    !/u0000-/.test(src),
    `${f} ya no declara el rango por su cuenta`);
}

console.log(fallos === 0
  ? "\nok — el texto que entra se limpia igual en todas las puertas"
  : `\nFALLA — ${fallos} chequeo(s) del limpiador de texto`);
process.exit(fallos === 0 ? 0 : 1);
