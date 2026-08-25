// Que los dos "cada cuánto pasa" digan lo mismo que el control que los cambia.
//
// Son DOS cosas distintas y conviene no mezclarlas:
//
//   · la BARRA de promoción — la franja de una línea arriba de todo, donde va
//     "Envío gratis en compras mayores a $30.000". Rota entre tres mensajes.
//   · el CARRUSEL de la portada — las fotos grandes que se pasan solas.
//
// Por qué existe esta prueba: las dos ya funcionaban y las dos tenían el mismo
// tipo de agujero, invisible mirando cada pieza por separado.
//
//   1) El carrusel: Aurora, Boho Terra y Urban Pulse LEÍAN el ajuste, pero no
//      estaban en la lista que decidía si el control se dibujaba. La perilla
//      puesta, andando, y escondida: clavados en los 4 segundos de fábrica.
//      Aire ni lo leía, tenía 6000 escrito a mano.
//
//   2) La barra: los 3,5 segundos estaban escritos a mano en NUEVE templates y
//      no había control en ningún lado. El editor te dejaba escribir los tres
//      mensajes y abajo te avisaba "se rotan cada 3.5 seg", como si fuera un
//      hecho de la naturaleza.
//
// Lo que se comprueba NO es que el número sea 6000 ni 3500 —eso es un gusto y
// puede cambiar— sino que las piezas SIGAN DE ACUERDO: que todo valor de fábrica
// se pueda alcanzar con el control que lo cambia. Uno que no caiga en un paso
// del deslizador hace que el editor muestre un número y la tienda haga otro.

import {
  carruselMs, barraMs,
  CARRUSEL_MS_BASE, CARRUSEL_MS_PROPIO, BARRA_MS_BASE,
  CARRUSEL_MS_MIN, CARRUSEL_MS_MAX, CARRUSEL_MS_PASO,
} from "../types/store-config";

let fallos = 0;
function chequear(titulo: string, ok: boolean, detalle?: unknown) {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
}

/** ¿El control puede llegar a este número? Va de a `PASO` entre `MIN` y `MAX`. */
const alcanzable = (ms: number) =>
  ms >= CARRUSEL_MS_MIN && ms <= CARRUSEL_MS_MAX && (ms - CARRUSEL_MS_MIN) % CARRUSEL_MS_PASO === 0;

console.log("1) Lo que la dueña elige, manda");
chequear("carrusel: un valor guardado le gana al de fábrica", carruselMs("aire", 3000) === 3000);
chequear("barra: un valor guardado le gana al de fábrica", barraMs(8000) === 8000);
chequear("carrusel: sin guardar, sale el de fábrica del template",
  carruselMs("aire") === 6000, carruselMs("aire"));
chequear("carrusel: un template sin número propio usa el común",
  carruselMs("chic-paris") === CARRUSEL_MS_BASE, carruselMs("chic-paris"));
chequear("barra: sin guardar, los 3,5s de siempre", barraMs() === BARRA_MS_BASE, barraMs());

console.log("\n2) Nada raro pasa por válido");
/* `0` y los negativos NO pueden ganar: un intervalo de cero milisegundos es un
   `setInterval` disparando sin parar, o sea la portada redibujándose para
   siempre. Llega si la config quedó a medio guardar. */
for (const veneno of [0, -1, -5000, NaN]) {
  chequear(`carrusel: ${veneno} cae al de fábrica`, carruselMs("aire", veneno) === 6000);
  chequear(`barra: ${veneno} cae al de fábrica`, barraMs(veneno) === BARRA_MS_BASE);
}
chequear("carrusel: null cae al de fábrica", carruselMs("aire", null) === 6000);
chequear("barra: null cae al de fábrica", barraMs(null) === BARRA_MS_BASE);
chequear("carrusel: un template desconocido no rompe", carruselMs("todavia-no-existe") === CARRUSEL_MS_BASE);

console.log("\n3) Todo valor de fábrica se puede alcanzar con el control");
chequear(`el común del carrusel (${CARRUSEL_MS_BASE / 1000}s) entra`, alcanzable(CARRUSEL_MS_BASE), CARRUSEL_MS_BASE);
chequear(`el de la barra (${BARRA_MS_BASE / 1000}s) entra`, alcanzable(BARRA_MS_BASE), BARRA_MS_BASE);
/* Éste es el que agarra el error de verdad: si mañana alguien le pone a un
   template 6300 de fábrica, el control —que va de a 500— no puede mostrar ese
   número, así que mostraría uno y la tienda haría otro. */
for (const [template, ms] of Object.entries(CARRUSEL_MS_PROPIO)) {
  chequear(`${template}: sus ${ms! / 1000}s propios entran`, alcanzable(ms!), ms);
}

console.log("\n4) Los dos ajustes no se pisan");
/* Que sean independientes no es un detalle: durante meses el único control que
   existía se llamaba "Carrusel de banner" y movía las FOTOS, mientras la barra
   —que también rota— quedaba fija. Si un día los dos leyeran la misma clave,
   tocar la velocidad de los mensajes cambiaría la de las fotos sin avisar. */
chequear("cambiar el de la barra no mueve el del carrusel",
  carruselMs("aire", null) === 6000 && barraMs(9000) === 9000);
chequear("cambiar el del carrusel no mueve el de la barra",
  carruselMs("aire", 2500) === 2500 && barraMs(null) === BARRA_MS_BASE);

console.log(fallos === 0
  ? "\nTodo bien: el editor y la tienda dicen lo mismo, y las dos velocidades son independientes.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
