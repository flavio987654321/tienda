// Que el carrusel de la portada y su control en el editor digan lo mismo.
//
// Por qué existe: el ajuste "cada cuántos segundos pasa la foto"
// (`bannerInterval`) ya estaba guardado, validado y funcionando, y aun así había
// dos agujeros que nadie veía porque cada pieza sola parecía correcta:
//
//   1) Aurora, Boho Terra y Urban Pulse LEÍAN el ajuste, pero no estaban en la
//      lista que decide si el control se dibuja. O sea: la dueña tenía la
//      perilla puesta, andando, y escondida — su portada quedaba clavada en los
//      4 segundos de fábrica para siempre.
//
//   2) Aire ni lo leía: tenía 6000 escrito a mano. En cuanto se le mostrara el
//      control, iba a decir "4s" para una portada que pasaba cada 6.
//
// Los dos son la misma clase de error: dos lados que opinan por separado sobre
// una cosa sola. Por eso lo que se prueba acá no es "el número es 6000" —eso es
// un gusto y puede cambiar— sino que las piezas SIGAN DE ACUERDO.

import {
  TEMPLATES_WITH_CAROUSEL, carruselMs,
  CARRUSEL_MS_BASE, CARRUSEL_MS_MIN, CARRUSEL_MS_MAX, CARRUSEL_MS_PASO,
} from "../types/store-config";

let fallos = 0;
function chequear(titulo: string, ok: boolean, detalle?: unknown) {
  if (ok) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
}

console.log("1) Lo que la dueña elige, manda");
chequear("un valor guardado le gana al de fábrica",
  carruselMs("aire", 3000) === 3000);
chequear("sin guardar, sale el de fábrica del template",
  carruselMs("aire") === 6000, carruselMs("aire"));
chequear("un template sin número propio usa el común",
  carruselMs("chic-paris") === CARRUSEL_MS_BASE, carruselMs("chic-paris"));

console.log("\n2) Nada raro pasa por válido");
/* `0` y los negativos NO pueden ganar: un intervalo de cero milisegundos es un
   `setInterval` disparando sin parar, o sea la portada redibujándose para
   siempre. Llega si la config quedó a medio guardar. */
for (const veneno of [0, -1, -5000, NaN]) {
  chequear(`${veneno} cae al de fábrica`, carruselMs("aire", veneno) === 6000, carruselMs("aire", veneno));
}
chequear("null cae al de fábrica", carruselMs("aire", null) === 6000);
chequear("un template desconocido no rompe", carruselMs("todavia-no-existe") === CARRUSEL_MS_BASE);

console.log("\n3) Todo valor de fábrica se puede alcanzar con el control");
/* Éste es el que agarra el error de verdad: si mañana alguien le pone a un
   template 6300 de fábrica, el control —que va de a 500— no puede mostrar ese
   número, así que mostraría uno y la tienda haría otro. */
for (const t of TEMPLATES_WITH_CAROUSEL) {
  const ms = carruselMs(t);
  const dentro = ms >= CARRUSEL_MS_MIN && ms <= CARRUSEL_MS_MAX;
  const enPaso = (ms - CARRUSEL_MS_MIN) % CARRUSEL_MS_PASO === 0;
  chequear(`${t}: ${ms / 1000}s entra en el control`, dentro && enPaso, { ms, dentro, enPaso });
}

console.log("\n4) El que rota, tiene control");
/* La lista no es decorativa: de ella sale si el control se dibuja. Un template
   que rota y no está acá rota igual, pero sin manera de cambiarlo — que es
   exactamente lo que les pasaba a Aurora, Boho Terra y Urban Pulse. */
for (const t of ["aire", "aurora", "boho-terra", "urban-pulse", "chic-paris"] as const) {
  chequear(`${t} está en la lista de los que muestran el control`,
    TEMPLATES_WITH_CAROUSEL.includes(t));
}
/* Y los que NO rotan no tienen que mostrarlo: un control que no hace nada es
   peor que ninguno. Las dos tiendas de autos no tienen portada con carrusel. */
for (const t of ["auto-motor", "auto-drive"] as const) {
  chequear(`${t} NO lo muestra (no tiene carrusel)`, !TEMPLATES_WITH_CAROUSEL.includes(t));
}

console.log(fallos === 0
  ? "\nTodo bien: el editor y la portada dicen lo mismo.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
