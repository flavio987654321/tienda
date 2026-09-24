/**
 * Chequeos del listado de links del nav público. Se corre a mano:
 *
 *   npx tsx src/lib/nav-publico.check.ts
 *
 * Por qué existe: este listado estuvo escrito TRES veces (en `SiteNav`, en el
 * nav de escritorio de la home y en el menú de hamburguesa de la home). Al
 * agregar "Productos digitales" apareció en todas las pantallas menos en la
 * home, y hubo que salir a buscar las dos copias que faltaban. Ahora hay un
 * solo array; estos chequeos cuidan que siga siendo uno solo.
 */

import { readFileSync } from "node:fs";
import { LINKS_PUBLICOS } from "./nav-publico";
import { DIGITALES_ABIERTO } from "./planLimits";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── El listado en sí ─────────────────────────────────────────────────────── */
console.log("\n1) El listado");

chequear("tiene links", LINKS_PUBLICOS.length > 0);

const llaves = LINKS_PUBLICOS.map((l) => l.key);
chequear("no hay llaves repetidas", new Set(llaves).size === llaves.length, llaves);

const hrefs = LINKS_PUBLICOS.map((l) => l.href);
chequear("no hay destinos repetidos", new Set(hrefs).size === hrefs.length, hrefs);

chequear(
  "todos los destinos son rutas internas",
  LINKS_PUBLICOS.every((l) => l.href.startsWith("/")),
  LINKS_PUBLICOS.filter((l) => !l.href.startsWith("/")).map((l) => l.href),
);

chequear(
  "ninguno quedó sin texto",
  LINKS_PUBLICOS.every((l) => l.label.trim().length > 0),
);

// Que la llave y el destino no se despeguen: pasó una vez que quienes-somos
// apuntaba a /tiendas.
chequear(
  "cada llave coincide con su destino",
  LINKS_PUBLICOS.every((l) => l.href === `/${l.key}` || l.key === "digitales"),
  LINKS_PUBLICOS.filter((l) => l.href !== `/${l.key}` && l.key !== "digitales"),
);

/* ── La persiana de Productos Digitales ───────────────────────────────────── */
console.log("\n2) Productos Digitales sigue la llave del producto");

const estaDigitales = LINKS_PUBLICOS.some((l) => l.key === "digitales");
chequear(
  DIGITALES_ABIERTO ? "el producto está abierto y el link aparece" : "el producto está cerrado y el link no aparece",
  estaDigitales === DIGITALES_ABIERTO,
);

/* ── Que no vuelvan a aparecer las copias ─────────────────────────────────── */
console.log("\n3) Nadie escribe los links a mano");

// Se normalizan los finales de línea: la copia de trabajo mezcla CRLF y LF.
const leer = (ruta: string) => readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");

const PANTALLAS = ["src/app/page.tsx", "src/components/SiteNav.tsx"];
// Los destinos que SÓLO existen como link del nav. /productos-digitales,
// /tiendas y /precios quedan afuera a propósito: la home también los usa en
// botones de adentro de la página, que no son el nav y tienen que poder
// escribirse a mano.
const SOLO_DEL_LISTADO = ["/quienes-somos", "/seguimiento"];


for (const ruta of PANTALLAS) {
  const src = leer(ruta);
  chequear(`${ruta} usa LINKS_PUBLICOS`, src.includes("LINKS_PUBLICOS"));
  for (const destino of SOLO_DEL_LISTADO) {
    const aMano = new RegExp(`href=["']${destino}["']`).test(src);
    chequear(`${ruta} no escribe ${destino} a mano`, !aMano);
  }
}

/* ── Resultado ────────────────────────────────────────────────────────────── */
if (fallos === 0) {
  console.log("\nOK — el nav público sale de un solo lugar\n");
} else {
  console.log(`\nFALLA — ${fallos} chequeo(s) del nav público\n`);
  process.exit(1);
}
