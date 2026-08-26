/**
 * Chequeo del catálogo dibujado adentro de un template. Se corre a mano:
 *
 *   npx tsx src/lib/catalogo-embebido.check.ts
 *
 * ── La historia ──────────────────────────────────────────────────────────────
 *
 * `/tienda/<slug>/productos` es una sola dirección y mostraba DOS páginas
 * distintas según cómo llegaras. Medido en Amaranta:
 *
 *   tocando "Ver colección completa"  →  la barra de Amaranta entera:
 *                                        promo, CATEGORÍAS, MUJER, HOMBRE,
 *                                        NUESTRA HISTORIA, buscador, campanita,
 *                                        favoritos, cuenta
 *
 *   entrando por el link, o de Google →  ← VOLVER A LA TIENDA   Amaranta   🛒
 *
 * De la mitad para abajo eran idénticas —los mismos 64 productos, los mismos
 * filtros—. Lo que se perdía era la barra entera, justo para el que llega de
 * afuera, que es el que menos sabe dónde está.
 *
 * El catálogo propio de Boho Terra ya estaba escrito; lo que faltaba era
 * anotarlo en `CON_CATALOGO_PROPIO`, la lista que la ruta consulta para decidir
 * si delega en el template o dibuja el genérico.
 *
 * ── Y lo que apareció al anotarlo ────────────────────────────────────────────
 *
 * El catálogo daba por sentado que estar embebido adentro de un template
 * significaba estar en el EDITOR:
 *
 *     const fromEditor = !!embebido || searchParams?.get("from") === "editor";
 *
 * Era cierto mientras el único que lo embebía era la previa. Boho Terra lo
 * embebe en la tienda PUBLICADA. O sea que los clientes reales de Amaranta eran
 * tratados como la dueña acomodando la vidriera, y eso apagaba tres cosas: las
 * métricas, el formulario de reseñas, y le pegaba `?from=editor` a los links de
 * producto. Medido antes del arreglo: abrir un producto desde ese catálogo
 * disparaba **cero** llamadas a `product-view`. Después: una.
 *
 * Ahora `enEditor` viaja explícito adentro de `embebido`. Este chequeo cuida que
 * nadie lo vuelva a deducir.
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

const RUTA = "src/app/tienda/[slug]/productos/page.tsx";
const CATALOGO = "src/app/tienda/[slug]/productos/CatalogoGenerico.tsx";

console.log("1) Los templates con catálogo propio están anotados en la ruta");

const ruta = leer(RUTA);
const lista = /const CON_CATALOGO_PROPIO = new Set\(\[([^\]]*)\]\)/.exec(ruta)?.[1] ?? "";
const anotados = [...lista.matchAll(/"([^"]+)"/g)].map(m => m[1]);
console.log(`        anotados hoy: ${anotados.join(", ") || "(ninguno)"}`);

/* Un template está en la lista si —y sólo si— dibuja el catálogo por su cuenta.
   Si dibuja el suyo y NO está anotado, la misma dirección muestra dos páginas.
   Si está anotado y NO lo dibuja, el visitante ve una pantalla vacía. */
const DIBUJAN_SU_CATALOGO: [string, string][] = [
  ["aire",       "src/components/store/templates/Aire.tsx"],
  ["boho-terra", "src/components/store/templates/BohoTerra.tsx"],
];
for (const [id, archivo] of DIBUJAN_SU_CATALOGO) {
  const src = leer(archivo);
  chequear(`${id}: el template mira si está en el catálogo`, /vista\.enCatalogo|enCatalogo/.test(src));
  chequear(`${id}: y la ruta lo sabe`, anotados.includes(id),
    `falta "${id}" en CON_CATALOGO_PROPIO: entrando por el link se ve el catálogo genérico`);
}

/* El id viejo de Aire. Hay tiendas cuyo JSON todavía lo dice; sin él, esas
   caen al genérico mientras su portada se dibuja con Aire. */
chequear('el alias viejo "fashion-noir" sigue anotado', anotados.includes("fashion-noir"));

console.log("\n2) Estar embebido NO significa estar en el editor");

const catalogo = leer(CATALOGO);

chequear("`fromEditor` sale de quien embebe, no de que haya embebido",
  /const fromEditor\s+= embebido \? !!embebido\.enEditor : searchParams\?\.get\("from"\) === "editor";/.test(catalogo),
  "volvió el `!!embebido`: eso trata a los clientes de una tienda publicada como si fueran el editor");

chequear("`enEditor` está declarado en el tipo de lo embebido",
  /enEditor\?: boolean;/.test(catalogo));

/* Y que quien embebe lo conteste. Sin esto queda `undefined`, que es "no soy el
   editor" — bien para la tienda, MAL para la previa, que volvería a contar
   visitas falsas y a dejar publicar reseñas de mentira. */
for (const [id, archivo] of DIBUJAN_SU_CATALOGO) {
  const src = leer(archivo);
  if (!/<CatalogoGenerico/.test(src)) { console.log(`  --    ${id}: no embebe el catálogo genérico (dibuja el suyo)`); continue; }
  chequear(`${id}: le dice al catálogo si es el editor`,
    /enEditor: isPreview/.test(src),
    "embebe el catálogo sin pasarle `enEditor`: la previa va a contar visitas que no son");
}

console.log("\n3) Lo que `fromEditor` apaga sigue colgando de él");

/* Si alguno de estos tres se desengancha, el arreglo de arriba deja de servir
   sin que nada falle. Son los tres que estaban rotos. */
chequear("las métricas de la ficha (`registrarVista`) siguen mirando `isPreview`",
  /if \(isOwner \|\| isPreview \|\| !slug\) return;/.test(leer("src/lib/registrarVista.ts")));
chequear("las del embudo (`registrarPaso`), también",
  /if \(isOwner \|\| isPreview \|\| !slug\) return;/.test(leer("src/lib/registrarPaso.ts")));
chequear("el carrito del catálogo recibe `isPreview: fromEditor`",
  /isPreview: fromEditor/.test(catalogo));

console.log(fallos === 0
  ? "\nTodo bien: una dirección, una pantalla, y la tienda publicada no se cree el editor.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
