// Verificación ejecutable de las baldosas de categoría de la portada. No hay
// runner de tests en el repo, así que corre con:
//   npx tsx src/lib/categoryTiles.check.ts
// Sale con código 1 si algún caso no da lo esperado.
//
// Los casos cubren las tres cosas que se rompían antes de que existiera el helper:
// la categoría elegida por nadie, la foto de un stock ajeno, y el hueco cuando hay
// menos categorías que baldosas.

import { resolverBaldosas, fotoDesdeProductos, type ProductoParaBaldosa } from "./categoryTiles";
import type { ImageOverride } from "@/types/store-config";

let fallos = 0;
function chk(nombre: string, real: unknown, esperado: unknown) {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) { console.log(`  ok   ${nombre}`); return; }
  console.error(`  FALLA ${nombre}\n        esperado: ${b}\n        real:     ${a}`);
  fallos++;
}

const p = (id: string, category: string, img: string | null, featured = false): ProductoParaBaldosa =>
  ({ id, category, images: img ? [img] : [], featured });

const PRODUCTOS: ProductoParaBaldosa[] = [
  p("p3", "Remeras",    "/rem-c.jpg"),
  p("p1", "Remeras",    "/rem-a.jpg"),
  p("p2", "Remeras",    "/rem-b.jpg", true),
  p("p4", "Pantalones", "/pan-a.jpg"),
  p("p5", "Camperas",   null),
];
const LISTA = ["Remeras", "Pantalones", "Camperas"];
const cats = (bs: ReturnType<typeof resolverBaldosas>) => bs.map(b => b.cat);
const imgs = (bs: ReturnType<typeof resolverBaldosas>) => bs.map(b => b.img);
const orig = (bs: ReturnType<typeof resolverBaldosas>) => bs.map(b => b.origen);

console.log("\nfotoDesdeProductos — estable y con el destacado adelante");
// Gana p2 por `featured` aunque venga tercero en la lista: si ganara "el primero",
// la foto cambiaría con el orden en que vino la consulta.
chk("el destacado gana", fotoDesdeProductos("Remeras", PRODUCTOS), "/rem-b.jpg");
chk("sin destacado, el id más chico", fotoDesdeProductos("Remeras", PRODUCTOS.map(x => ({ ...x, featured: false }))), "/rem-a.jpg");
chk("mismo resultado con la lista al revés", fotoDesdeProductos("Remeras", [...PRODUCTOS].reverse()), "/rem-b.jpg");
chk("categoría sin fotos", fotoDesdeProductos("Camperas", PRODUCTOS), null);
chk("categoría que no existe", fotoDesdeProductos("Zapatos", PRODUCTOS), null);

console.log("\nresolverBaldosas — la categoría la elige el dueño");
chk("sin elegir nada, el orden de la lista",
  cats(resolverBaldosas(undefined, LISTA, PRODUCTOS, {})), ["Remeras", "Pantalones", "Camperas"]);
chk("elegidas, en el orden del dueño",
  cats(resolverBaldosas(["Camperas", "Remeras", "Pantalones"], LISTA, PRODUCTOS, {})), ["Camperas", "Remeras", "Pantalones"]);
// El caso que motivó todo: 10 categorías, 3 baldosas, y las 3 las elige el dueño.
const DIEZ = ["Remeras","Pantalones","Camperas","Buzos","Gorras","Medias","Shorts","Camisas","Sacos","Bufandas"];
chk("con 10 categorías manda la elección, no el orden de los productos",
  cats(resolverBaldosas(["Bufandas", "Sacos", "Gorras"], DIEZ, PRODUCTOS, {})), ["Bufandas", "Sacos", "Gorras"]);
chk("una posición vacía se rellena sin repetir la elegida",
  cats(resolverBaldosas(["", "Remeras", ""], LISTA, PRODUCTOS, {})), ["Pantalones", "Remeras", "Camperas"]);
chk("una categoría borrada cae al relleno, no deja la baldosa muerta",
  cats(resolverBaldosas(["Zapatos", "Remeras", ""], LISTA, PRODUCTOS, {})), ["Pantalones", "Remeras", "Camperas"]);

console.log("\nresolverBaldosas — una elección válida no se pierde por una posición vacía");
// El caso que rompía: la tienda quedó con UNA categoría y el dueño la tenía puesta
// en la baldosa del MEDIO (le borró productos a las otras dos). La posición 0 no
// tiene con qué rellenarse, y con `break` se cortaba el recorrido ahí — o sea que
// la elección válida de la posición 1 no se dibujaba y el bloque quedaba VACÍO.
chk("elegida en la posición 1 con la 0 sin relleno",
  cats(resolverBaldosas(["", "Remeras", ""], ["Remeras"], PRODUCTOS, {})), ["Remeras"]);
chk("elegida en la última, con las dos primeras sin relleno",
  cats(resolverBaldosas(["", "", "Remeras"], ["Remeras"], PRODUCTOS, {})), ["Remeras"]);
// Y la ranura de imagen sigue siendo la de SU posición, no la de la primera libre:
// si no, al quedarse sin categorías el dueño perdería de vista la foto que subió.
chk("la ranura la manda la posición, no el orden de salida",
  resolverBaldosas(["", "Remeras", ""], ["Remeras"], PRODUCTOS, {})[0].field, "catHombre");
// `pos` es lo que usa el selector del editor para escribir `catTile${pos}`. Si acá
// saliera el índice del array (0), al cambiar esa baldosa se le escribiría a la
// baldosa 0 — que no es la que está viendo el dueño.
chk("y `pos` dice la posición REAL, no el índice del array",
  resolverBaldosas(["", "Remeras", ""], ["Remeras"], PRODUCTOS, {})[0].pos, 1);
chk("con todo lleno, pos coincide con el índice",
  resolverBaldosas(undefined, LISTA, PRODUCTOS, {}).map(b => b.pos), [0, 1, 2]);

console.log("\nresolverBaldosas — el hueco cuando hay menos que 3");
chk("dos categorías devuelven DOS baldosas",
  cats(resolverBaldosas(undefined, ["Remeras", "Pantalones"], PRODUCTOS, {})), ["Remeras", "Pantalones"]);
chk("una categoría devuelve UNA",
  cats(resolverBaldosas(undefined, ["Remeras"], PRODUCTOS, {})).length, 1);
chk("sin categorías no devuelve baldosas",
  resolverBaldosas(undefined, [], PRODUCTOS, {}).length, 0);

console.log("\nresolverBaldosas — la cascada de la foto");
const SUBIDA: Record<string, ImageOverride> = { catMujer: { url: "/mia.jpg" } };
chk("la subida gana",
  imgs(resolverBaldosas(undefined, LISTA, PRODUCTOS, SUBIDA)), ["/mia.jpg", "/pan-a.jpg", null]);
chk("y se sabe de dónde salió cada una",
  orig(resolverBaldosas(undefined, LISTA, PRODUCTOS, SUBIDA)), ["subida", "producto", "ninguna"]);
chk("la ranura es por posición, no por categoría",
  resolverBaldosas(["Camperas", "Remeras", "Pantalones"], LISTA, PRODUCTOS, SUBIDA)[0].img, "/mia.jpg");
chk("sin overrides, todas de los productos",
  imgs(resolverBaldosas(undefined, LISTA, PRODUCTOS, undefined)), ["/rem-b.jpg", "/pan-a.jpg", null]);

console.log(fallos === 0 ? "\n✓ todo en orden\n" : `\n✗ ${fallos} caso(s) mal\n`);
process.exit(fallos === 0 ? 0 : 1);
