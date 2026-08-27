/**
 * Chequeo de "el catálogo no es otra página". Se corre a mano:
 *
 *   npx tsx src/lib/catalogo-en-el-lugar.check.ts
 *
 * ── Qué se cuida ─────────────────────────────────────────────────────────────
 *
 * Un template puede llegar a su catálogo de dos maneras. Una es irse a otra
 * dirección —`window.location.href = ...`, o un `<a href>` al catálogo— y eso
 * recarga la página entera: en la tienda publicada es un parpadeo, y en el
 * EDITOR saca a la dueña de Diseño y encima le muestra el catálogo del template
 * GUARDADO en vez del que está mirando. La otra es dibujarlo en el lugar, entre
 * su propia barra y su propio pie, con `useVistaTemplate`.
 *
 * Los que ya lo dibujan en el lugar están anotados en `CON_CATALOGO_PROPIO`, en
 * la ruta del catálogo. Este chequeo dice: si estás en esa lista, no te puede
 * quedar ni una navegación de verdad al catálogo. Sin esto, alguien agrega un
 * botón nuevo copiando el de otro template y la mitad de las entradas vuelve a
 * recargar sin que se note hasta que alguien lo mira en el editor.
 *
 * ── Los que faltan ───────────────────────────────────────────────────────────
 *
 * Aurora y Chic Paris todavía no se pasaron, y no están en la lista, así que no
 * se les exige nada. Igual se cuentan y se muestran: es el trabajo que queda, y
 * un número que baja solo cuando alguien lo hace es mejor recordatorio que un
 * renglón en un documento.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

const DIR = "src/components/store/templates";
const RUTA_CATALOGO = "src/app/tienda/[slug]/productos/page.tsx";

/* Los ids que la ruta declara como "dibuja su propio catálogo". Se lee del
   archivo y no se copia acá: una lista copiada se desactualiza sola, y el día
   que alguien suma un template a la ruta este chequeo tiene que enterarse. */
const decl = leer(RUTA_CATALOGO).match(/CON_CATALOGO_PROPIO = new Set\(\[([^\]]*)\]\)/);
const conCatalogoPropio = (decl?.[1] ?? "")
  .split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);

/** De qué archivo es cada id. `fashion-noir` es un alias de Aire y no un archivo. */
const ARCHIVO: Record<string, string> = {
  "aire": "Aire.tsx",
  "fashion-noir": "Aire.tsx",
  "boho-terra": "BohoTerra.tsx",
  "urban-pulse": "UrbanPulse.tsx",
  "chic-paris": "ChicParis.tsx",
  "aurora": "Aurora.tsx",
};

/* Irse de verdad al catálogo. Las dos formas que aparecían en los templates.
   Un `<a href>` al catálogo TAMBIÉN cuenta, salvo que le hayan puesto un
   `onClick` que lo atienda — eso se mira aparte, abajo. */
const SALTOS = [
  /window\.location\.href\s*=\s*`\/tienda\/[^`]*\/productos/g,
  /<a[^>]*href=\{`\/tienda\/[^`]*\/productos/g,
];

const contarSaltos = (src: string) =>
  SALTOS.reduce((n, re) => n + (src.match(re) ?? []).length, 0);

let fallos = 0;
const chequear = (titulo: string, ok: boolean, detalle?: unknown) => {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

console.log(`1) Los ${conCatalogoPropio.length} que dibujan su catálogo en el lugar`);
const yaVistos = new Set<string>();
for (const id of conCatalogoPropio) {
  const archivo = ARCHIVO[id];
  chequear(`"${id}" está mapeado a un archivo`, !!archivo, id);
  if (!archivo || yaVistos.has(archivo)) continue;
  yaVistos.add(archivo);
  const src = leer(`${DIR}/${archivo}`);
  const saltos = contarSaltos(src);
  chequear(`${archivo} no se va a otra página para mostrar el catálogo`, saltos === 0, { saltos });
  /* El USO, no el import: la version vieja de UrbanPulse importaba
     `urlParaCompartirProducto` del mismo archivo, asi que un `/useVistaTemplate/`
     suelto daba verde sin que el template usara el hook. */
  chequear(`${archivo} llama a useVistaTemplate`, /=\s*useVistaTemplate\(/.test(src));
  chequear(`${archivo} marca su raíz con data-template-raiz`, /data-template-raiz/.test(src));
}

console.log("\n2) Los que todavía no se pasaron");
const pasados = new Set(Object.entries(ARCHIVO).filter(([id]) => conCatalogoPropio.includes(id)).map(([, a]) => a));
let pendientes = 0;
for (const f of readdirSync(join(RAIZ, DIR)).filter(f => f.endsWith(".tsx")).sort()) {
  if (pasados.has(f)) continue;
  const saltos = contarSaltos(leer(`${DIR}/${f}`));
  if (saltos > 0) { pendientes += saltos; console.log(`  pendiente  ${f}: ${saltos} link(s) que recargan la página`); }
}
console.log(pendientes === 0
  ? "  (ninguno: todos los templates muestran su catálogo en el lugar)"
  : `  total pendiente: ${pendientes}`);

console.log(fallos === 0
  ? "\nTodo bien: el que dice dibujar su catálogo, lo dibuja.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
