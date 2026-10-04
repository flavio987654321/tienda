/**
 * Chequeos de los puntos del lookbook. Se corre con:
 *
 *   npx tsx src/lib/lookbook.check.ts
 *
 * El texto de los puntos viene de la base, así que se vigila que leerlo no
 * rompa nunca la tienda:
 *
 *   - JSON roto, vacío o que no es una lista → sin puntos;
 *   - puntos a medias (sin id, sin x/y) → se saltean;
 *   - fuera de la foto → se traen al borde;
 *   - más del máximo → se cortan;
 *   - y lo que se escribe se vuelve a leer igual.
 */

import { leerPuntos, escribirPuntos, MAX_PUNTOS } from "./lookbook";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

chequear("sin texto, sin puntos", leerPuntos(undefined).length === 0);
chequear("JSON roto, sin puntos", leerPuntos("[{").length === 0);
chequear("un objeto suelto, sin puntos", leerPuntos(`{"id":"a","x":1,"y":2}`).length === 0);
const mezcla = leerPuntos(JSON.stringify([{ id: "a", x: 10, y: 20 }, { x: 5, y: 5 }, { id: "b", x: "3", y: 4 }, null, { id: "c", x: -8, y: 140 }]));
chequear("saltea los puntos a medias", mezcla.map(p => p.id).join() === "a,c", mezcla);
chequear("trae al borde lo que se sale", mezcla[1]?.x === 0 && mezcla[1]?.y === 100, mezcla[1]);
const muchos = leerPuntos(JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ id: String(i), x: i, y: i }))));
chequear(`corta en ${MAX_PUNTOS}`, muchos.length === MAX_PUNTOS);
const ida = [{ id: "p1", x: 12.345, y: 67.891 }, { id: "", x: 50, y: 50 }];
const vuelta = leerPuntos(escribirPuntos(ida));
chequear("escribir y leer da lo mismo (con un decimal)", vuelta[0].x === 12.3 && vuelta[0].y === 67.9 && vuelta[1].id === "", vuelta);

console.log(fallos === 0 ? "\n✓ todo bien\n" : `\n✗ ${fallos} falla(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
