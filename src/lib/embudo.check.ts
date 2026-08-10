/**
 * Chequeos del embudo. Se corre a mano:
 *
 *   npx tsx src/lib/embudo.check.ts
 *
 * Los dos que importan son el recorte —que un escalón nunca muestre más que el
 * de arriba— y a quién señala como la peor caída. El segundo es el que decide
 * dónde va a mirar la dueña, y equivocarse ahí la manda a arreglar algo que no
 * está roto mientras el problema de verdad sigue.
 */

import {
  armarEmbudo, esPasoRegistrado, PASOS_REGISTRADOS,
  MINIMO_PARA_SENALAR, UMBRAL_RETENCION_PCT,
  type DatosEmbudo,
} from "./embudo";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

const datos = (p: Partial<DatosEmbudo>): DatosEmbudo => ({
  entro: 0, carrito: 0, checkout: 0, datos: 0, pedido: 0, pago: 0, ...p,
});

/* ── El recorte ───────────────────────────────────────────────────────────── */
console.log("\n1) Un escalon nunca muestra mas que el de arriba");

// LA trampa. Los seis escalones se cuentan distinto: los tres de arriba por
// navegador por dia, "datos" por email, y los dos de abajo por pedido. En los
// bordes del periodo eso da vuelta el orden —alguien que entro el lunes y
// compro el miercoles suma al "entro" del lunes y al "pedido" del miercoles— y
// un embudo que se ensancha en el medio no se lee como "aca el conteo es
// aproximado": se lee como que el panel esta roto.
const invertido = armarEmbudo(datos({ entro: 100, carrito: 40, checkout: 60, datos: 30, pedido: 80, pago: 10 }), false);
const cantidades = invertido.escalones.map((e) => e.cantidad);
// El esperado cambio al arreglar lo de 1b): `datos` primero sube a 80 —nadie
// compra sin escribir su email— y recien despues entra el recorte, que los deja
// a todos en los 40 del carrito. El resultado viejo era 100,40,40,30,30,10, y
// esos 30 eran justamente el techo de mas que tapaba los pedidos.
chequear("recorta el que se ensancha", cantidades.join(",") === "100,40,40,40,40,10", cantidades);
chequear("y nunca sube", cantidades.every((c, i) => i === 0 || c <= cantidades[i - 1]), cantidades);

const normal = armarEmbudo(datos({ entro: 1000, carrito: 100, checkout: 50, datos: 30, pedido: 20, pago: 18 }), false);
chequear("un embudo sano no se toca",
  normal.escalones.map((e) => e.cantidad).join(",") === "1000,100,50,30,20,18",
  normal.escalones.map((e) => e.cantidad));

/* ── Los pedidos no los puede tapar el escalon de arriba ──────────────────── */
console.log("\n1b) 'Escribieron sus datos' no le pone techo a los pedidos");

// Lo destapo cargar la tienda de prueba con datos de verdad, no un chequeo: con
// la base vacia los seis escalones daban cero y el recorte no tenia de que
// agarrarse.
//
// "Escribieron sus datos" sale de AbandonedCart, que solo se escribe si el
// rastreador llego a dispararse antes de que la persona apretara comprar. O sea
// que mide MENOS de lo que realmente paso, y como el recorte va de arriba hacia
// abajo, le ponia techo a los dos escalones de abajo: salia "Hicieron el pedido:
// 16" mientras los KPI de la MISMA pantalla decian 30.
const datosCortos = armarEmbudo(datos({ entro: 2403, carrito: 372, checkout: 200, datos: 16, pedido: 33, pago: 30 }), false);
const porClave = (c: string) => datosCortos.escalones.find((e) => e.clave === c)!.cantidad;

chequear("los pedidos NO se recortan a los datos medidos", porClave("pedido") === 33, porClave("pedido"));
chequear("ni los pagos", porClave("pago") === 30, porClave("pago"));
// Nadie compra sin escribir su email: el checkout no deja. Asi que subir este
// escalon hasta los pedidos no es maquillaje, es un hecho.
chequear("y 'datos' sube hasta los pedidos, porque no se puede comprar sin email",
  porClave("datos") === 33, porClave("datos"));
chequear("el embudo sigue sin ensancharse",
  datosCortos.escalones.every((e, i, a) => i === 0 || e.cantidad <= a[i - 1].cantidad),
  datosCortos.escalones.map((e) => e.cantidad));

// Cuando AbandonedCart mide MAS que los pedidos —lo normal: mucha gente deja el
// mail y no compra— no se toca nada.
const datosSanos = armarEmbudo(datos({ entro: 2000, carrito: 300, checkout: 150, datos: 80, pedido: 30, pago: 28 }), false);
chequear("si los datos miden mas que los pedidos, quedan como estan",
  datosSanos.escalones.find((e) => e.clave === "datos")!.cantidad === 80,
  datosSanos.escalones.find((e) => e.clave === "datos")!.cantidad);

/* ── Los porcentajes ──────────────────────────────────────────────────────── */
console.log("\n2) Los porcentajes");

const e = normal.escalones;
chequear("el primero no tiene 'del anterior'", e[0].pctDelAnterior === null, e[0].pctDelAnterior);
chequear("carrito es 10% del anterior", e[1].pctDelAnterior === 10, e[1].pctDelAnterior);
chequear("checkout es 50% del anterior", e[2].pctDelAnterior === 50, e[2].pctDelAnterior);
chequear("pago es 1.8% del total → 2%", e[5].pctDelTotal === 2, e[5].pctDelTotal);
chequear("cuenta los perdidos", e[1].perdidos === 900, e[1].perdidos);

const vacio = armarEmbudo(datos({}), false);
chequear("todo en cero no divide por cero",
  vacio.escalones.every((x) => x.cantidad === 0) && vacio.peorCaida === null);

/* ── A quién señala ───────────────────────────────────────────────────────── */
console.log("\n3) La peor caida");

// En TODAS las tiendas la caida mas grande en porcentaje crudo es entrar →
// carrito: la mayoria entra, mira y se va. Si se midiera asi, el panel señalaria
// lo mismo todos los meses y no serviria de nada. Este embudo es completamente
// normal y no tiene que señalar nada.
const tipico = armarEmbudo(datos({ entro: 1000, carrito: 100, checkout: 50, datos: 33, pedido: 23, pago: 19 }), false);
chequear("un embudo normal no señala nada", tipico.peorCaida === null, tipico.peorCaida?.clave);

// Pero si en el ultimo escalon —donde ya eligieron todo y apretaron comprar— se
// cae la mitad, eso SI es un problema, y encima el mas caro.
const cobroRoto = armarEmbudo(datos({ entro: 1000, carrito: 100, checkout: 50, datos: 33, pedido: 30, pago: 12 }), false);
chequear("un cobro que falla si se señala", cobroRoto.peorCaida?.clave === "pago", cobroRoto.peorCaida?.clave);

// Y si la caida rara esta arriba, tambien. ESTE es el caso que obligo a medir
// por proporcion y no por resta: 1000 → 5 es perder el 99,5%, apenas nueve
// puntos y medio peor que el 90% normal. Restando quedaba por debajo del umbral
// y el catalogo mas inservible del mundo pasaba como "todo en orden". Por
// proporcion da 5% de lo normal, que es lo que realmente pasó.
const catalogoMalo = armarEmbudo(datos({ entro: 1000, carrito: 5, checkout: 4, datos: 3, pedido: 3, pago: 3 }), false);
chequear("un catalogo que no engancha a nadie si se señala",
  catalogoMalo.peorCaida?.clave === "carrito", catalogoMalo.peorCaida?.clave);

// Elige el que MAS se despega de lo normal, no el primero que pasa el umbral.
const dosProblemas = armarEmbudo(datos({ entro: 1000, carrito: 60, checkout: 30, datos: 20, pedido: 15, pago: 2 }), false);
chequear("elige el que mas se despega", dosProblemas.peorCaida?.clave === "pago", {
  elegido: dosProblemas.peorCaida?.clave,
  retenciones: dosProblemas.escalones.map((x) => [x.clave, x.retencionVsNormalPct]),
});

/* ── Cuándo callarse ──────────────────────────────────────────────────────── */
console.log("\n4) Cuando NO señalar");

// Con pocas visitas cualquier diferencia es enorme en porcentaje y no quiere
// decir nada. Un problema inventado manda a la dueña a tocar algo que funciona.
const poquito = armarEmbudo(datos({ entro: 20, carrito: 1, checkout: 1, datos: 0, pedido: 0, pago: 0 }), false);
chequear(`con menos de ${MINIMO_PARA_SENALAR} visitas no se señala nada`,
  poquito.peorCaida === null, poquito.peorCaida?.clave);

// Y aunque haya volumen arriba, un escalon que perdio dos personas no es un
// problema por mas que el porcentaje diga 66%.
const dosPersonas = armarEmbudo(datos({ entro: 500, carrito: 50, checkout: 25, datos: 16, pedido: 3, pago: 1 }), false);
chequear("una caida de 2 personas no se señala",
  dosPersonas.peorCaida?.clave !== "pago", dosPersonas.peorCaida?.clave);

chequear(`el umbral de retencion es ${UMBRAL_RETENCION_PCT}`, UMBRAL_RETENCION_PCT === 60);

/* ── Los pasos que manda el navegador ─────────────────────────────────────── */
console.log("\n5) Los pasos");

chequear("carrito es un paso valido", esPasoRegistrado("carrito"));
chequear("checkout es un paso valido", esPasoRegistrado("checkout"));
// `step` es parte de la clave de la tabla: lo que pase de aca se escribe en la
// base y se compara con lo ya escrito.
chequear("cualquier otra cosa no", !esPasoRegistrado("pago"), true);
chequear("ni un numero", !esPasoRegistrado(3));
chequear("ni null", !esPasoRegistrado(null));
chequear("ni un objeto", !esPasoRegistrado({ step: "carrito" }));
chequear("son dos", PASOS_REGISTRADOS.length === 2, PASOS_REGISTRADOS);

/* ── El aviso de los agujeros ─────────────────────────────────────────────── */
console.log("\n6) El aviso");

chequear("pasa la bandera de pasos faltantes",
  armarEmbudo(datos({ entro: 10 }), true).faltanPasosNuevos === true);

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
