// Que los topes de los formularios públicos hagan lo que dicen.
//
// Por qué existe: el formulario de contacto de la tienda validaba el MÍNIMO y no
// tenía ningún máximo. El mensaje se le manda por mail al comerciante tal cual
// llega, así que alguien podía pegar un archivo entero en el campo y mandarlo
// cinco veces por minuto —lo que deja pasar el límite por IP— hasta llenarle la
// casilla. El tope del navegador no alcanza: se saltea mandando el POST directo.

import { NOMBRE_MAX, EMAIL_MAX, ASUNTO_MAX, MENSAJE_MAX, recortar } from "./contacto-limites";

let fallos = 0;
function chequear(titulo: string, ok: boolean, detalle?: unknown) {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
}

console.log("1) Recorta lo que se pasa, en vez de rechazarlo");
chequear("un mensaje larguísimo queda en el tope",
  recortar("a".repeat(50_000), MENSAJE_MAX).length === MENSAJE_MAX);
chequear("un nombre larguísimo queda en el tope",
  recortar("b".repeat(5_000), NOMBRE_MAX).length === NOMBRE_MAX);
chequear("y lo que entra pasa entero",
  recortar("Hola, quería consultar por un talle.", MENSAJE_MAX) === "Hola, quería consultar por un talle.");

console.log("\n2) Limpia los bordes antes de medir");
chequear("saca espacios de los costados", recortar("   Ana   ", NOMBRE_MAX) === "Ana");
/* Sin el trim ANTES del corte, 80 espacios seguidos de un nombre pasaban el
   largo mínimo del servidor y llegaban como un nombre vacío. */
chequear("espacios solos quedan en nada", recortar("          ", NOMBRE_MAX) === "");

console.log("\n3) Lo que no es texto no rompe nada");
for (const veneno of [null, undefined, 123, {}, [], true]) {
  chequear(`${JSON.stringify(veneno) ?? "undefined"} da cadena vacía`, recortar(veneno, MENSAJE_MAX) === "");
}

console.log("\n4) Los topes son los que tienen que ser");
/* El del mail no es un gusto: 254 es el máximo del estándar. Bajarlo dejaría
   afuera direcciones válidas. */
chequear("el mail permite lo que permite el estándar", EMAIL_MAX === 254);
/* El del mensaje tiene que dar lugar a una consulta de verdad —un problema con
   un pedido se explica en más de 500— sin servir para llenar una casilla. */
chequear("el mensaje da lugar a una consulta real", MENSAJE_MAX >= 1000 && MENSAJE_MAX <= 5000, MENSAJE_MAX);
chequear("el nombre es corto", NOMBRE_MAX <= 120, NOMBRE_MAX);
chequear("el asunto es corto", ASUNTO_MAX <= 200, ASUNTO_MAX);

console.log(fallos === 0
  ? "\nTodo bien: nadie puede mandar de más por estos formularios.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
