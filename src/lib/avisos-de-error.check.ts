/**
 * Chequeos de los avisos de error. Se corre con:
 *
 *   npx tsx src/lib/avisos-de-error.check.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LO QUE SE CUIDA ACÁ: QUE UN ERROR NO SE PIERDA EN SILENCIO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Este proyecto tiene Sentry configurado desde hace rato, y aun así había tres
 * agujeros por los que un error se iba sin que nadie se enterara. Los tres se
 * encontraron en la auditoría del panel del 09/09/26, y ninguno se ve probando:
 * la aplicación anda perfecto, hasta que algo falla y **no pasa nada**.
 *
 *   1. **Los errores del servidor.** `Sentry.init` engancha solo lo que nadie
 *      atrapó; del lado del servidor, Next atrapa todo para poder dibujar la
 *      pantalla de error. Sin `onRequestError`, un 500 en una ruta de pago se
 *      veía sólo en los registros de Vercel.
 *   2. **Cuando se rompe el armazón.** Ahí ningún `error.tsx` se dibuja, porque
 *      todos viven adentro de él. Sin `global-error`, eso es la pantalla en
 *      blanco de Next y ningún aviso.
 *   3. **Las pantallas que ya tenían red pero sólo escribían en la consola.**
 *      Un `console.error` vive en el navegador de quien tuvo el problema.
 *
 * Un aviso que no llega es peor que no tener aviso: se cree que no pasó nada.
 */

import { readFileSync, existsSync } from "fs";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const leer = (f: string) => (existsSync(f) ? readFileSync(f, "utf8") : "");

/* ── 1) Los errores del servidor ─────────────────────────────────────────── */

const instrumentacion = leer("src/instrumentation.ts");

check("ERR-A",
  /export const onRequestError = Sentry\.captureRequestError/.test(instrumentacion),
  "los errores del servidor se le cuentan a Sentry");

/* Y que las tres configuraciones sigan estando: `onRequestError` sin `init` no
   manda nada, y el que se olvida es siempre el de `edge`. */
for (const [id, archivo] of [
  ["ERR-B", "sentry.server.config.ts"],
  ["ERR-C", "sentry.edge.config.ts"],
  ["ERR-D", "sentry.client.config.ts"],
] as const) {
  const s = leer(archivo);
  check(id, /Sentry\.init\(/.test(s) && /beforeSend: scrubPii/.test(s),
    `${archivo} arranca Sentry y limpia los datos personales`);
}

/* ⚠️ El limpiador NO es opcional. Por acá pasan pedidos de gente que compra: su
   correo, su nombre y, en el ecosistema de tiendas, su dirección. Un aviso de
   error con eso adentro es un dato personal mandado a un tercero. */
const limpiador = leer("sentry.scrub.ts");
check("ERR-E",
  /email/.test(limpiador) && /token/.test(limpiador) && /cookie/.test(limpiador),
  "el limpiador tapa correo, credenciales y cookies");

/* ── 2) Cuando se rompe el armazón ───────────────────────────────────────── */

const global = leer("src/app/global-error.tsx");

check("ERR-F", global.length > 0, "existe la red de último recurso");

/* ⚠️ REEMPLAZA al layout raíz, no se mete adentro: es el único componente de la
   aplicación que tiene que traer `<html>` y `<body>` propios. Sin ellos no se
   dibuja nada, y el caso que ataja es justamente el que ya no dibuja nada. */
check("ERR-G",
  /<html/.test(global) && /<body/.test(global),
  "y trae su propio <html> y <body>, porque reemplaza al armazón");

check("ERR-H",
  /Sentry\.captureException\(error\)/.test(global),
  "y avisa antes de dibujar");

/* ⚠️ No importa NADA nuestro: ni Tailwind, ni el proveedor de tema, ni un
   ícono. Esto corre cuando algo de eso se rompió, así que cualquier cosa que
   importe podría ser justamente la que falló — y ahí la pantalla de error
   también falla, que es quedarse sin nada. */
check("ERR-I",
  !/from "@\/components/.test(global) && !/from "@\/lib/.test(global),
  "y no depende de ningún componente nuestro para dibujarse");

/* ── 3) Las redes de cada sección ────────────────────────────────────────── */

/* ⚠️ El panel de digitales no tenía ninguna. Cualquier error de dibujo subía
   hasta el `global-error`, que reemplaza el armazón entero: la persona perdía
   la barra lateral y de dónde volver. */
for (const [id, archivo, quien] of [
  ["ERR-J", "src/app/digitales/error.tsx", "el panel de Productos Digitales"],
  ["ERR-K", "src/app/dashboard/error.tsx", "el panel de tiendas"],
  ["ERR-L", "src/app/mi-cuenta/error.tsx", "mi cuenta"],
  ["ERR-M", "src/app/dashboard/metricas/error.tsx", "las métricas"],
] as const) {
  const s = leer(archivo);
  check(id,
    s.length > 0 && /Sentry\.captureException\(error\)/.test(s),
    `${quien} tiene su red, y avisa`);
}

/* ⚠️ Y la del panel dice que NO SE PERDIÓ NADA. Es lo primero que piensa quien
   estaba escribiendo un ebook, y en este panel es cierto: lo que se guarda se
   guarda solo. Sin esa frase, un error de dibujo se lee como "perdí el trabajo"
   y la respuesta es cerrar todo y empezar de nuevo. */
check("ERR-N",
  /está\s*\n?\s*guardado/.test(leer("src/app/digitales/error.tsx")),
  "la del panel aclara que lo guardado sigue guardado");

console.log(fallos === 0
  ? "\nok — un error no se pierde: llega, y quien lo vio sabe qué hacer"
  : `\nFALLA — ${fallos} chequeo(s) de los avisos de error`);
process.exit(fallos === 0 ? 0 : 1);
