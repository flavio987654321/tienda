/**
 * Chequeos de las fotos del ebook. Se corre con:
 *
 *   npx tsx src/lib/fotos-pexels.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ACÁ NO SE PRUEBA QUE LAS FOTOS SEAN LINDAS: SE PRUEBA QUE NO ROMPAN NADA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cuando este código corre, el ebook **ya está escrito y ya se cobró**. Que no
 * se consiga una foto tiene que salir un PDF sin foto. Cualquier excepción que
 * se escape de acá deja a la persona sin el archivo por el que pagó, y el
 * cupo ya gastado.
 *
 * ⚠️ Ninguna prueba de este archivo toca la red. La clave se saca del entorno
 * a propósito —incluso si se corrió con `dotenv`— para probar el camino que
 * importa: el de una instalación sin clave, que es el que tiene que seguir
 * entregando ebooks como antes de que las fotos existieran.
 */

import { readFileSync } from "fs";
import { buscarFoto, buscarFotos } from "./fotos-pexels";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* Fuera la clave, y fuera el `fetch`: si alguna prueba llegara a pedir algo a
   la red, queremos que se note como un error acá y no como una demora. */
delete process.env.PEXELS_API_KEY;
const fetchDeVerdad = globalThis.fetch;
let huboRed = false;
globalThis.fetch = (async () => {
  huboRed = true;
  throw new Error("una prueba intentó salir a la red");
}) as typeof fetch;

async function pruebas() {
  /* ── Sin clave ─────────────────────────────────────────────────────────── */

  const sinClave = await buscarFoto("pan casero");
  check("FOT-A", sinClave === null,
    "sin clave de Pexels devuelve null, no una excepción");

  check("FOT-B", !huboRed,
    "sin clave ni se sale a la red: se corta antes de pedir nada");

  /* ── Consultas que no sirven ───────────────────────────────────────────── */

  process.env.PEXELS_API_KEY = "clave-de-mentira-para-la-prueba";
  huboRed = false;

  check("FOT-C", (await buscarFoto("")) === null && !huboRed,
    "una consulta vacía se corta sin salir a la red");

  check("FOT-D", (await buscarFoto("   ")) === null && !huboRed,
    "una consulta de puros espacios tampoco sale a la red");

  /* ── Cuando la red falla ───────────────────────────────────────────────── */

  /* Con clave puesta sí intenta salir, y nuestro `fetch` de mentira revienta.
     Tiene que volver `null` igual: es lo que pasa un día que Pexels esté
     caído, y ese día los ebooks se tienen que seguir entregando. */
  const conRedRota = await buscarFoto("pan casero");
  check("FOT-E", conRedRota === null && huboRed,
    "si la red falla devuelve null en vez de tirar la excepción hacia arriba");

  /* ── El largo del arreglo ──────────────────────────────────────────────── */

  /* ⚠️ LA MÁS IMPORTANTE DE TODAS. Quien dibuja empareja la foto con el
     capítulo POR POSICIÓN. Si esto devolviera un arreglo más corto —salteando
     las que no se consiguieron— cada capítulo saldría con la foto del
     siguiente, y el último sin ninguna. Los huecos van como `null`. */
  const tres = await buscarFotos(["uno", "dos", "tres"]);
  check("FOT-F", Array.isArray(tres) && tres.length === 3 && tres.every((f) => f === null),
    "devuelve una entrada por capítulo, con null en las que no se consiguieron");

  check("FOT-G", (await buscarFotos([])).length === 0,
    "sin capítulos devuelve un arreglo vacío y no se cuelga");

  /* ── Lo que el código promete por escrito ──────────────────────────────── */

  const fuente = readFileSync("src/lib/fotos-pexels.ts", "utf8");

  /* Los dos topes de tiempo. Sin ellos, una foto que se cuelga se lleva puesto
     el armado entero: la función tiene 60 segundos para todo. */
  check("FOT-H", /AbortSignal\.timeout\(ESPERA_BUSQUEDA\)/.test(fuente) &&
    /AbortSignal\.timeout\(ESPERA_BAJADA\)/.test(fuente),
    "la búsqueda y la bajada tienen su tope de tiempo");

  /* ⚠️ Y el tope de peso, cortando MIENTRAS baja. Sin esto, una respuesta
     enorme se guarda entera en memoria y se lleva puesta la función. */
  check("FOT-I", /total > PESO_MAXIMO/.test(fuente),
    "la bajada se corta por peso mientras baja, no después");

  /* Las fotos se buscan todas juntas. Una atrás de otra, diez fotos se comen
     los 60 segundos. */
  check("FOT-J", /Promise\.all\(/.test(fuente),
    "las fotos de todos los capítulos se buscan en paralelo");

  globalThis.fetch = fetchDeVerdad;
}

pruebas()
  .then(() => {
    console.log(fallos === 0
      ? "\nok — las fotos nunca voltean un ebook: sin clave, sin red o sin resultados, sale sin fotos"
      : `\nFALLA — ${fallos} chequeo(s) de las fotos`);
    process.exit(fallos === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.log(`\nFALLA — una prueba de fotos tiró una excepción: ${e?.message ?? e}`);
    process.exit(1);
  });
