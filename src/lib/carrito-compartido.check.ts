/**
 * Chequeo del carrito compartido. Se corre a mano:
 *
 *   npx tsx src/lib/carrito-compartido.check.ts
 *
 * ── La historia ──────────────────────────────────────────────────────────────
 *
 * `useCartLogic` guardaba el carrito en un `useState`, o sea uno por cada copia
 * del hook. Eso alcanzaba mientras hubiera una sola copia por pantalla. Dejó de
 * alcanzar cuando Boho Terra empezó a dibujar el catálogo ADENTRO del template:
 * ahí quedaban dos copias vivas al mismo tiempo, cada una con su carrito.
 *
 * Medido en Amaranta, agregando un vestido desde el catálogo:
 *
 *     guardado en el navegador ............. 1 producto
 *     numerito del carrito de la barra ..... (ninguno)
 *
 * El cliente cargaba cosas y la barra de la tienda le seguía mostrando el
 * carrito vacío. Las dos copias sólo se ponían de acuerdo al RECARGAR, porque
 * las dos leen `localStorage` al montar.
 *
 * Ahora el carrito vive en el módulo y se comparte con `useSyncExternalStore`.
 * Medido después, en la misma pantalla:
 *
 *     inicio        barra:0  guardado:0
 *     + producto 1  barra:1  guardado:1
 *     + producto 2  barra:2  guardado:2
 *     tras recargar barra:2  guardado:2
 *
 * ── Qué se prueba acá ────────────────────────────────────────────────────────
 *
 * Lo de arriba se verifica con el navegador, que es donde se ve. Este chequeo
 * cuida las tres reglas que hacen que eso siga siendo cierto, y que se pueden
 * romper sin que falle nada visible:
 *
 *   1. El estado del carrito NO vuelve a un `useState`.
 *   2. El valor que se le da al servidor es SIEMPRE el mismo objeto. Si fuera un
 *      `[]` nuevo en cada llamada, `useSyncExternalStore` lo compara por
 *      identidad, nunca coincide, y el navegador entra en un bucle de dibujado.
 *      Es un cuelgue de la tienda entera, no un detalle.
 *   3. El carrito guardado se lee UNA sola vez por carga. Con el carrito
 *      compartido, una copia que monta tarde —el catálogo al abrirse— estaría
 *      pisando el carrito VIVO con lo último que se alcanzó a guardar.
 *
 * Y de paso, que el catálogo embebido no vuelva a dibujar su propia barra
 * arriba de la del template.
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

const HOOK = "src/hooks/useCartLogic.ts";
const hook = leer(HOOK);

console.log("1) El carrito es uno por pestaña, no uno por copia del hook");

chequear("el estado sale de un store del módulo, no de un `useState`",
  /const cartItems = useSyncExternalStore\(suscribirseAlCarrito, leerCarrito, leerCarritoEnElServidor\);/.test(hook),
  "volvió a `useState`: con dos pantallas a la vez, cada una tendría su carrito");

chequear("no quedó ningún `useState` para los items",
  !/useState<CartItem\[\]>/.test(hook),
  "hay un `useState<CartItem[]>` de nuevo");

chequear("escribir avisa a todas las copias vivas",
  /for \(const avisar of oyentesDelCarrito\) avisar\(\);/.test(hook));

console.log("\n2) El valor del servidor es estable (si no, se cuelga la tienda)");

chequear("hay una constante de carrito vacío",
  /const CARRITO_VACIO: CartItem\[\] = \[\];/.test(hook));

chequear("y el lector del servidor devuelve ESA constante, no un `[]` nuevo",
  /function leerCarritoEnElServidor\(\): CartItem\[\] \{\s*return CARRITO_VACIO;\s*\}/.test(hook),
  "devolver `[]` acá es un bucle infinito de dibujado: useSyncExternalStore compara por identidad");

/* La demostración de por qué. Dos `[]` nunca son el mismo objeto. */
const unoNuevoCadaVez = () => [] as unknown[];
chequear("y es cierto que dos `[]` distintos nunca coinciden",
  unoNuevoCadaVez() !== unoNuevoCadaVez());

console.log("\n3) Lo guardado se lee una sola vez por carga");

chequear("hay un candado de restauración",
  /let carritoYaRestaurado = false;/.test(hook) && /function marcarCarritoRestaurado\(\)/.test(hook));

chequear("y la lectura de `localStorage` pasa por él",
  /marcarCarritoRestaurado\(\) \? localStorage\.getItem\("storefront_cart"\) : null/.test(hook),
  "la restauración volvió a correr por cada copia: la que monta tarde pisa el carrito vivo");

chequear("`localStorage` sigue guardando en cada cambio",
  /localStorage\.setItem\("storefront_cart", JSON\.stringify\(cartItems\)\)/.test(hook),
  "sin esto el carrito no sobrevive a cerrar la pestaña");

console.log("\n4) El catálogo embebido no repite lo que el template ya puso");

const CATALOGO = "src/app/tienda/[slug]/productos/CatalogoGenerico.tsx";
const catalogo = leer(CATALOGO);
const boho = leer("src/components/store/templates/BohoTerra.tsx");

for (const [prop, que] of [["sinPie", "el pie"], ["sinBarra", "la barra de arriba"]] as const) {
  chequear(`el catálogo sabe apagar ${que} (\`${prop}\`)`,
    new RegExp(`${prop}\\?: boolean;`).test(catalogo));
  chequear(`y Boho Terra se lo pide`,
    new RegExp(`${prop}: true`).test(boho));
}

/* La barra que se apaga es la que tenía el botón muerto: "Volver al editor" es un
   link a la pantalla en la que ya estás cuando el catálogo vive adentro del
   editor. Suelto, el catálogo la sigue dibujando y ahí el botón sí sirve. */
chequear("suelto, el catálogo sigue teniendo su barra",
  /\{!embebido\?\.sinBarra && \(<>/.test(catalogo),
  "la barra se apagó para todos, no sólo para el embebido");

console.log(fallos === 0
  ? "\nTodo bien: un carrito por pestaña, y una sola barra arriba.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
