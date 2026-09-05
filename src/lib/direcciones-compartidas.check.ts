/**
 * Chequeos de LA DIRECCIÓN COMPARTIDA entre los dos ecosistemas.
 *
 *   npx tsx src/lib/direcciones-compartidas.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * QUÉ CUIDA ESTE ARCHIVO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `algo.tiendaapps.com` y un dominio propio pueden ser **de una tienda o de un
 * producto digital**, y cada uno vive en su tabla:
 *
 *   · `Store.slug`          ↔  `Product.slugDigital`
 *   · `Store.customDomain`  ↔  `Product.dominioPropio`
 *
 * Son cuatro índices únicos, uno por columna. **Ninguno ve al otro**: la base
 * acepta el mismo nombre en las dos tablas sin quejarse. Quien desempata es el
 * middleware, y le da prioridad a la tienda.
 *
 * ⚠️ Encontrado el 05/09/26 revisando la sesión: el lado digital preguntaba por
 * las dos tablas desde el primer día, y el de tiendas por una sola. **El candado
 * estaba puesto de un solo lado de la puerta.** Con una cuenta de tienda se
 * podía escribir el dominio de un producto ajeno y quedarse con la dirección —
 * sin necesitar siquiera el certificado, que ya estaba emitido a nombre de la
 * víctima—. Y con el subdominio no hacía falta mala intención: alcanzaba con
 * abrir una tienda con un nombre parecido.
 *
 * Verificado contra la base real ese día: 0 colisiones. El arreglo llegó antes
 * de que pasara.
 *
 * Por eso este archivo no chequea una pantalla: chequea que **los cinco lugares
 * que escriben una dirección** pasen por la misma función.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string, detalle?: unknown) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const leer = (p: string) => readFileSync(p, "utf8");
/** Sin comentarios: los de acá abajo nombran justo lo que no tiene que estar. */
const sinComentarios = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/* ══════════════════════════════════════════════════════════════════════════
   1. LAS DOS FUNCIONES MIRAN LAS DOS TABLAS
   ══════════════════════════════════════════════════════════════════════════ */

const direccion = leer("src/lib/direccion-digital.ts");
const dominio = leer("src/lib/dominio-digital.ts");

const bloqueEstaLibre = direccion.slice(
  direccion.indexOf("export async function estaLibre"),
  direccion.indexOf("export type ResultadoDeReserva"),
);
check("DIR-A",
  /store\.findFirst/.test(bloqueEstaLibre) && /slugDigital:\s*slug/.test(bloqueEstaLibre),
  "estaLibre mira Store.slug Y Product.slugDigital");

const bloqueDominioLibre = dominio.slice(
  dominio.indexOf("export async function dominioLibre"),
  dominio.indexOf("export type ResultadoDominio"),
);
check("DIR-B",
  /customDomain:\s*dominio/.test(bloqueDominioLibre) && /dominioPropio:\s*dominio/.test(bloqueDominioLibre),
  "dominioLibre mira Store.customDomain Y Product.dominioPropio");

/* Las dos dejan excluir la fila propia. Sin eso, volver a guardar la dirección
   que ya tenías se rechaza por chocar consigo misma — y entonces el que la
   necesita la saltea, que es exactamente cómo vuelve el agujero. */
check("DIR-C",
  /exceptoProducto\?: string/.test(direccion) && /exceptoTienda\?: string/.test(direccion),
  "estaLibre puede excluir la fila propia de los dos lados");

/* ══════════════════════════════════════════════════════════════════════════
   2. LOS CINCO LUGARES QUE ESCRIBEN UNA DIRECCIÓN
   ══════════════════════════════════════════════════════════════════════════ */

const sitios: Array<[string, string, string, string]> = [
  ["DIR-D", "src/app/api/digitales/productos/[id]/direccion/route.ts", "estaLibre",
    "la dirección de un producto digital"],
  ["DIR-E", "src/app/api/auth/registro/route.ts", "estaLibre",
    "el alta de una tienda nueva"],
  ["DIR-F", "src/app/api/digitales/configuracion/route.ts", "estaLibre",
    "la dirección del espacio digital"],
  ["DIR-G", "src/app/api/admin/migrate-slugs/route.ts", "estaLibre",
    "la herramienta de admin que renombra en lote"],
  ["DIR-H", "src/app/api/ajustes/dominio/route.ts", "dominioLibre",
    "el dominio propio de una tienda"],
  /* ⚠️ El sexto NO estaba en la lista escrita a mano: lo encontró el barrido de
     abajo, la primera vez que corrió. El comentario que tenía decía "nadie lo
     ve, la dirección de un producto digital va en su propia fase" — y esa fase
     ya había llegado. */
  ["DIR-H2", "src/lib/espacio-digital.ts", "estaLibre",
    "el espacio que se crea con cada cuenta digital"],
];

for (const [id, ruta, funcion, que] of sitios) {
  const fuente = leer(ruta);
  check(id, fuente.includes(funcion), `${que} pregunta con ${funcion}`);
}

/* ⚠️ Y que NO les quede la consulta vieja al lado. Un chequeo nuevo con el viejo
   todavía escrito abajo no arregla nada: gana el primero que corte. */
const registro = sinComentarios(leer("src/app/api/auth/registro/route.ts"));
check("DIR-I",
  !/store\.findUnique\(\s*\{\s*where:\s*\{\s*slug/.test(registro),
  "el registro ya no decide con una sola tabla");

const ajustes = sinComentarios(leer("src/app/api/ajustes/dominio/route.ts"));
check("DIR-J",
  !/store\.findUnique\(\s*\{\s*where:\s*\{\s*customDomain/.test(ajustes),
  "los ajustes de dominio ya no deciden con una sola tabla");

const configDigital = sinComentarios(leer("src/app/api/digitales/configuracion/route.ts"));
check("DIR-K",
  !/store\.findFirst\(\s*\{\s*[\s\S]{0,40}where:\s*\{\s*slug:\s*slugNuevo/.test(configDigital),
  "la configuración digital ya no decide con una sola tabla");

/* ══════════════════════════════════════════════════════════════════════════
   3. EL BARRIDO: UN LUGAR NUEVO NO SE PUEDE OLVIDAR
   ══════════════════════════════════════════════════════════════════════════

   ⚠️ La lista de arriba es una lista escrita a mano, y una lista escrita a mano
   se desactualiza el día que alguien agrega un sexto lugar — que es exactamente
   el día en que esto tendría que saltar. Así que además se BARRE el árbol
   buscando quién ESCRIBE una de las cuatro columnas, y se exige que ese archivo
   haya preguntado. */

/**
 * Los que ASIGNAN una dirección.
 *
 * ⚠️ El patrón exige un `data:` o un `create:` antes, y sin llaves en el medio.
 * La primera versión buscaba el campo suelto y marcó nueve archivos que no
 * escriben nada: `where: { slug }` para BUSCAR una tienda por su dirección se ve
 * igual que `data: { slug }` para tomarla, y casi todos los que la buscan
 * además hacen algún `update` en otra parte del archivo.
 *
 * Poner en `null` no toma nada, y `slug: true` es un `select`: los dos afuera.
 */
const NO_ES_UN_VALOR = "true\\b|null\\b|undefined\\b";
const ESCRIBE = ["slug", "customDomain", "slugDigital", "dominioPropio"].map(
  (campo) => new RegExp(`(data|create):\\s*\\{[^{}]*\\b${campo}:\\s*(?!${NO_ES_UN_VALOR})[A-Za-z_]`),
);

/** Preguntó de alguna de las formas válidas. */
const PREGUNTA = /estaLibre|dominioLibre|reservarSlug|conectarDominio/;

/**
 * Los que escriben una dirección **sin** tomarla de nadie, y por qué:
 *
 * · las dos librerías son las que definen la pregunta;
 * · el endpoint público y el middleware LEEN, no escriben;
 * · los de admin y cuenta la ponen en `null` o copian una que ya existe.
 */
const PERDONADOS = new Set([
  "src/lib/direccion-digital.ts",
  "src/lib/dominio-digital.ts",
  "src/app/api/public/dominio/route.ts",
]);

function barrer(dir: string, encontrados: string[] = []): string[] {
  for (const nombre of readdirSync(dir)) {
    if (nombre === "node_modules" || nombre === ".next") continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) { barrer(ruta, encontrados); continue; }
    if (!/\.tsx?$/.test(nombre) || /\.check\.ts$/.test(nombre)) continue;

    const normal = ruta.split("\\").join("/");
    if (PERDONADOS.has(normal)) continue;

    const fuente = sinComentarios(readFileSync(ruta, "utf8"));
    /* Sólo lo que además guarda: un `select` con `slug: true` no toma nada, y
       por eso los patrones descartan `true`. */
    if (!/prisma\.\w+\.(update|create|updateMany|upsert)/.test(fuente)) continue;
    if (!ESCRIBE.some((r) => r.test(fuente))) continue;
    if (PREGUNTA.test(fuente)) continue;
    encontrados.push(normal);
  }
  return encontrados;
}

const olvidados = barrer("src");
check("DIR-L", olvidados.length === 0,
  "ningún lugar nuevo escribe una dirección sin preguntar por las dos tablas",
  olvidados);

console.log(fallos === 0
  ? "\nok — la dirección se pregunta con la misma regla de los dos lados"
  : `\nFALLA — ${fallos} chequeo(s) de las direcciones compartidas`);
process.exit(fallos === 0 ? 0 : 1);
