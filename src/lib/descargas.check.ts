/**
 * Chequeo de la validación de rutas de archivo digital. Se corre a mano:
 *
 *   npx tsx src/lib/descargas.check.ts
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * `rutaDeArchivoValida` es lo único que separa el bucket de los productos
 * digitales del resto del storage. La primera versión sólo exigía que la ruta
 * empezara con `supabase://`, y con eso una dueña podía escribir a mano
 *
 *     supabase://affiliate-docs/affiliate-docs/loquesea.pdf
 *
 * en su propio producto, comprárselo, y hacer que `/api/descargas/[token]` le
 * firmara un link al bucket donde viven los DOCUMENTOS DE IDENTIDAD de los
 * afiliados. El bug no rompía nada visible: la tienda seguía andando igual.
 *
 * Por eso está acá y no en la cabeza de nadie. Los casos de abajo son ataques
 * concretos, no ejemplos: si alguno vuelve a pasar, el bucket vuelve a quedar
 * abierto y ninguna pantalla se va a poner roja para avisarlo.
 *
 * ── La otra mitad ────────────────────────────────────────────────────────────
 *
 * La función la preguntan DOS lugares que no se conocen entre sí —la validación
 * del producto y la ruta de entrega—, así que el chequeo también verifica que
 * los dos sigan llamándola. Con que uno afloje, por ahí se cuela.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rutaDeArchivoValida, PREFIJO_ARCHIVO_DIGITAL, DIGITAL_BUCKET, MAX_DESCARGAS, DIAS_DE_VIGENCIA } from "./descargas";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

console.log("\nRutas de archivo digital\n");

// ── Lo que SÍ tiene que pasar ────────────────────────────────────────────────
const rutaLegitima = `${PREFIJO_ARCHIVO_DIGITAL}producto-digital/1756400000000-abc123.pdf`;
chequear("acepta la ruta que arma /api/upload", rutaDeArchivoValida(rutaLegitima) === true, rutaLegitima);
chequear(
  "acepta un nombre con puntos que no son un salto de directorio",
  rutaDeArchivoValida(`${PREFIJO_ARCHIVO_DIGITAL}producto-digital/guia.v2.final.pdf`) === true
);

// ── El ataque que motivó todo esto ───────────────────────────────────────────
chequear(
  "RECHAZA el bucket de documentos de afiliados (DNI)",
  rutaDeArchivoValida("supabase://affiliate-docs/affiliate-docs/dni.pdf") === false
);
chequear(
  "RECHAZA el bucket público de fotos de producto",
  rutaDeArchivoValida("supabase://product-images/products/foto.jpg") === false
);
chequear(
  "RECHAZA un bucket que EMPIEZA igual que el nuestro",
  rutaDeArchivoValida(`supabase://${DIGITAL_BUCKET}-viejo/x.pdf`) === false,
  `supabase://${DIGITAL_BUCKET}-viejo/x.pdf`
);

// ── Salir del prefijo por otro lado ──────────────────────────────────────────
chequear(
  "RECHAZA el salto de directorio con ..",
  rutaDeArchivoValida(`${PREFIJO_ARCHIVO_DIGITAL}../affiliate-docs/dni.pdf`) === false
);
chequear(
  "RECHAZA .. en el medio de la ruta",
  rutaDeArchivoValida(`${PREFIJO_ARCHIVO_DIGITAL}carpeta/../../otro/x.pdf`) === false
);
chequear(
  "RECHAZA la barra al principio",
  rutaDeArchivoValida(`${PREFIJO_ARCHIVO_DIGITAL}/absoluta.pdf`) === false
);
chequear("RECHAZA el prefijo pelado, sin archivo", rutaDeArchivoValida(PREFIJO_ARCHIVO_DIGITAL) === false);

// ── Lo que puede llegar de un cliente cualquiera ─────────────────────────────
chequear("RECHAZA una URL pública https", rutaDeArchivoValida("https://cualquier.cosa/archivo.pdf") === false);
chequear(
  "RECHAZA una URL pública del propio Supabase",
  rutaDeArchivoValida("https://xxx.supabase.co/storage/v1/object/public/product-images/a.pdf") === false
);
chequear("RECHAZA vacío", rutaDeArchivoValida("") === false);
chequear("RECHAZA null", rutaDeArchivoValida(null) === false);
chequear("RECHAZA undefined", rutaDeArchivoValida(undefined) === false);
chequear("RECHAZA otro esquema", rutaDeArchivoValida("file:///etc/passwd") === false);

// ── Que los dos lados sigan preguntando ──────────────────────────────────────
console.log("\nQuién la usa\n");

const validacion = leer("src/lib/products.ts");
const entrega = leer("src/app/api/descargas/[token]/route.ts");

chequear(
  "la validación del producto llama a rutaDeArchivoValida",
  validacion.includes("rutaDeArchivoValida(")
);
chequear(
  "la ruta de entrega llama a rutaDeArchivoValida",
  entrega.includes("rutaDeArchivoValida(")
);
/* El bucket que se firma tiene que ser la CONSTANTE. Si alguien vuelve a
   sacarlo de la ruta guardada —`const bucket = sinEsquema.slice(...)`— el
   ataque de arriba se reabre aunque la validación siga en su lugar. */
chequear(
  "la entrega firma el bucket constante, no el que dice la ruta",
  entrega.includes("const bucket = DIGITAL_BUCKET")
);

// ── Los números acordados ────────────────────────────────────────────────────
console.log("\nVigencia y tope\n");
chequear("el link vive 30 días", DIAS_DE_VIGENCIA === 30, DIAS_DE_VIGENCIA);
chequear("el tope es de 5 descargas", MAX_DESCARGAS === 5, MAX_DESCARGAS);
/* El tope sólo sirve si la base impide un segundo permiso por línea comprada:
   sin el índice único, dos webhooks en paralelo emiten dos tokens y el tope
   real pasa a ser 10. */
chequear(
  "orderItemId es único en el esquema (si no, el tope se puede duplicar)",
  /orderItemId\s+String\s+@unique/.test(leer("prisma/schema.prisma"))
);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
