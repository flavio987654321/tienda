/**
 * Chequeos de la vitrina de la portada. Se corre con el resto:
 *
 *   npm run check
 *
 * Qué se cuida acá
 * ----------------
 * Los tres modos fallan en silencio si fallan. Nadie recibe un error: la portada
 * simplemente muestra otra cosa, o nada. Y "nada" es el caso peligroso — un
 * bloque vacío arriba de todo se lee como una tienda rota, y la dueña no tiene
 * cómo saber que fue porque borró un producto que había elegido hace dos meses.
 *
 * El sorteo se prueba con fecha fija: sin eso, la prueba diría cosas distintas
 * según el día en que se corra, que es exactamente lo que no queremos del sorteo.
 */

import {
  productosDeLaVitrina, leerElegidos, escribirElegidos, leerModo,
  semillaDelDia, MAX_ELEGIDOS,
} from "./vitrina";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* Comparar LISTAS necesita su propia función, y no es un detalle: pasarle una
   lista a `chequear` la convierte en "verdadero" por ser un objeto, así que el
   chequeo daba "ok" sin haber comparado nada. Ocho de estas pruebas nacieron así
   —pasando siempre, dijeran lo que dijeran— hasta que el typecheck las delató.
   Una prueba que no puede fallar es peor que ninguna: ocupa el lugar de la que sí
   miraría. */
const chequearIgual = (titulo: string, real: unknown, esperado: unknown) => {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}\n        esperado: ${b}\n        real:     ${a}`); }
};

const P = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));
const ids = (l: { id: string }[]) => l.map(p => p.id);

console.log("\n1) Sin elegir nada, lo de siempre: los últimos cargados");

chequearIgual("agarra los primeros", ids(productosDeLaVitrina(P(10), 6)), ["p1","p2","p3","p4","p5","p6"]);
chequearIgual("con menos productos que lugares, no inventa",
  ids(productosDeLaVitrina(P(3), 6)), ["p1","p2","p3"]);
chequear("sin productos devuelve vacío", productosDeLaVitrina([], 6).length === 0);

console.log("\n2) Elegidos a mano: manda el orden en que los eligió");

chequearIgual("respeta el orden elegido, no el de la lista",
  ids(productosDeLaVitrina(P(10), 6, { modo: "elegidos", elegidos: ["p7","p2","p9"] })),
  ["p7","p2","p9"]);

chequearIgual("un id borrado se saltea sin dejar hueco",
  ids(productosDeLaVitrina(P(10), 6, { modo: "elegidos", elegidos: ["p7","BORRADO","p9"] })),
  ["p7","p9"]);

chequear("no se pasa de los lugares del bloque",
  productosDeLaVitrina(P(20), 4, { modo: "elegidos", elegidos: ["p1","p2","p3","p4","p5","p6"] }).length === 4);

/* El caso que rompe una portada de verdad: eligió tres, los borró, y el bloque
   se queda vacío arriba de todo sin que nada lo explique. */
chequearIgual("si NINGUNO existe ya, cae a los recientes en vez de quedar vacío",
  ids(productosDeLaVitrina(P(10), 3, { modo: "elegidos", elegidos: ["viejo1","viejo2"] })),
  ["p1","p2","p3"]);

chequearIgual("y con la lista vacía, también",
  ids(productosDeLaVitrina(P(10), 3, { modo: "elegidos", elegidos: [] })),
  ["p1","p2","p3"]);

console.log("\n3) Al azar: distinto cada día, igual todo el día");

const HOY    = new Date(2026, 7, 24);
const HOY_2  = new Date(2026, 7, 24, 23, 59);
const MANANA = new Date(2026, 7, 25);

const a = ids(productosDeLaVitrina(P(30), 6, { modo: "azar", hoy: HOY }));
const b = ids(productosDeLaVitrina(P(30), 6, { modo: "azar", hoy: HOY_2 }));
const c = ids(productosDeLaVitrina(P(30), 6, { modo: "azar", hoy: MANANA }));

chequear("dos cargas del mismo día dan lo mismo", JSON.stringify(a) === JSON.stringify(b), { a, b });
chequear("y al día siguiente cambia", JSON.stringify(a) !== JSON.stringify(c), { a, c });
chequear("devuelve la cantidad pedida", a.length === 6);
chequear("sin repetidos", new Set(a).size === a.length, a);
chequear("todos existen de verdad", a.every(id => ids(P(30)).includes(id)), a);
chequear("con menos productos que lugares no se cuelga",
  productosDeLaVitrina(P(2), 6, { modo: "azar", hoy: HOY }).length === 2);

/* El sorteo tiene que llegar a TODOS, que es el motivo por el que existe. Con el
   `sort(() => rand - 0.5)` que uno escribiría primero, los últimos de una lista
   larga casi no aparecen — y la tienda seguiría teniendo productos invisibles,
   que era justo el problema a resolver. */
const vistos = new Set<string>();
for (let d = 1; d <= 28; d++) {
  for (const id of ids(productosDeLaVitrina(P(30), 6, { modo: "azar", hoy: new Date(2026, 1, d) }))) vistos.add(id);
}
chequear("en un mes de sorteos aparecen casi todos los productos", vistos.size >= 27, vistos.size);

console.log("\n4) La semilla es el día local, no la hora ni UTC");

chequear("misma fecha, distinta hora, misma semilla",
  semillaDelDia(new Date(2026, 7, 24, 0, 1)) === semillaDelDia(new Date(2026, 7, 24, 23, 59)));
chequear("días distintos, semillas distintas",
  semillaDelDia(new Date(2026, 7, 24)) !== semillaDelDia(new Date(2026, 7, 25)));
/* 31 de diciembre a las 22: en UTC ya es el año que viene. Con UTC la vitrina
   cambiaría a las 21 de Argentina, no a la medianoche. */
chequear("el corte es a la medianoche de acá",
  semillaDelDia(new Date(2026, 11, 31, 22, 0)) === semillaDelDia(new Date(2026, 11, 31, 3, 0)));

console.log("\n5) Guardar y leer la lista es ida y vuelta exacta");

chequear("ida y vuelta", escribirElegidos(leerElegidos("p1,p2,p3")) === "p1,p2,p3");
chequearIgual("aguanta espacios", leerElegidos(" p1 , p2 ,p3 "), ["p1","p2","p3"]);
chequearIgual("aguanta comas de más", leerElegidos("p1,,p2,"), ["p1","p2"]);
chequear("vacío es lista vacía", leerElegidos("").length === 0);
chequear("sin guardar nada tampoco rompe", leerElegidos(undefined).length === 0);

/* El tope existe por el límite de 500 caracteres del override. Si se pasara, el
   guardado recortaría en silencio y "elegí quince y quedaron nueve" es un error
   imposible de entender desde afuera. */
chequear(`no deja pasar más de ${MAX_ELEGIDOS}`,
  leerElegidos(Array.from({ length: 20 }, (_, i) => `p${i}`).join(",")).length === MAX_ELEGIDOS);
chequear("y al guardar tampoco",
  escribirElegidos(Array.from({ length: 20 }, (_, i) => `p${i}`)).split(",").length === MAX_ELEGIDOS);
chequear("lo guardado entra en el tope del esquema (500)",
  escribirElegidos(Array.from({ length: MAX_ELEGIDOS }, () => "cmsagzz8f00012tg7aeaafreo")).length <= 500);

console.log("\n6) Un modo raro guardado a mano no rompe la portada");

chequear("cualquier cosa cae a recientes", leerModo("cualquiera") === "recientes");
chequear("vacío también", leerModo("") === "recientes");
chequear("sin guardar nada también", leerModo(undefined) === "recientes");
chequear("y los válidos se respetan",
  leerModo("elegidos") === "elegidos" && leerModo("azar") === "azar" && leerModo("recientes") === "recientes");

console.log(
  fallos === 0
    ? "\nTodo bien: la vitrina se llena sola y nunca queda vacía.\n"
    : `\n${fallos} chequeo(s) fallando.\n`
);
process.exit(fallos === 0 ? 0 : 1);
