/**
 * Chequeos del respaldo en memoria del rate limit. Se corre a mano:
 *
 *   npx tsx src/lib/rate-limit.check.ts
 *
 * Esto existe porque es el freno de la única parte del sistema que cuesta plata
 * por uso (los tokens de Sasha). Antes, si Redis no contestaba, el código dejaba
 * pasar el mensaje — y Upstash corta justo por exceso de consultas, o sea que el
 * freno desaparecía exactamente cuando hacía falta.
 *
 * No hay Redis acá y es a propósito: se fuerza el error para probar el camino de
 * respaldo, que es el que nunca se ejecuta en desarrollo y por eso es el que se
 * puede romper sin que nadie lo note hasta que llega la factura.
 */

import { checkRateLimitConRespaldo, _resetContadoresLocales } from "./rate-limit";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

// Sin KV_REST_API_URL, getRedis() tira y se toma el camino de respaldo. Se borran
// por si el entorno las tiene cargadas (.env.local apunta a producción).
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const OPCIONES = { limiteFallback: 5, limiteFallbackGlobal: 20 };

async function main() {
  /* ── Que efectivamente NO haya Redis ────────────────────────────────────── */
  console.log("\n1) El respaldo se activa cuando Redis no contesta");

  _resetContadoresLocales();
  const primero = await checkRateLimitConRespaldo("u1", 30, 600_000, OPCIONES);
  chequear("avisa que no fue Redis", primero.conRedis === false, primero);
  chequear("el primer pedido pasa", primero.permitido, primero);

  /* ── El tope por usuario ────────────────────────────────────────────────── */
  console.log("\n2) Tope por usuario");

  _resetContadoresLocales();
  const resultados: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const r = await checkRateLimitConRespaldo("u1", 30, 600_000, OPCIONES);
    resultados.push(r.permitido);
  }
  chequear("los primeros 5 pasan", resultados.slice(0, 5).every((p) => p), resultados);
  chequear("el 6º se corta", resultados[5] === false, resultados);
  chequear("el 7º sigue cortado", resultados[6] === false, resultados);

  /* ── Un usuario bloqueado no bloquea a otro ─────────────────────────────── */
  console.log("\n3) El tope es por usuario, no compartido");

  _resetContadoresLocales();
  for (let i = 0; i < 6; i++) await checkRateLimitConRespaldo("u1", 30, 600_000, OPCIONES);
  const otro = await checkRateLimitConRespaldo("u2", 30, 600_000, OPCIONES);
  chequear("otro usuario pasa igual", otro.permitido, otro);

  /* ── El tope global de la instancia ─────────────────────────────────────── */
  console.log("\n4) Tope global por instancia (el que frena los pedidos en paralelo)");

  // Esto es el corazón del arreglo. Un contador por usuario no sirve contra alguien
  // que dispara con muchas cuentas o en paralelo; el global es el único techo real.
  _resetContadoresLocales();
  let pasaron = 0;
  for (let u = 0; u < 20; u++) {
    // Un usuario distinto cada vez, así el tope por usuario NUNCA se activa y lo
    // único que puede cortar es el global.
    const r = await checkRateLimitConRespaldo(`user-${u}`, 30, 600_000, OPCIONES);
    if (r.permitido) pasaron++;
  }
  chequear("con 20 usuarios distintos pasan exactamente 20", pasaron === 20, { pasaron });

  const pasadoElGlobal = await checkRateLimitConRespaldo("user-nuevo", 30, 600_000, OPCIONES);
  chequear("el 21º se corta por el global", pasadoElGlobal.permitido === false, pasadoElGlobal);

  /* ── Los rechazados también gastan del presupuesto global ───────────────── */
  console.log("\n5) Un usuario bloqueado no le deja el presupuesto intacto al resto");

  // Si el global sólo contara los pedidos permitidos, alguien podría quemar el
  // tope de un usuario y seguir teniendo los 20 globales enteros para el ataque.
  _resetContadoresLocales();
  for (let i = 0; i < 20; i++) await checkRateLimitConRespaldo("ruidoso", 30, 600_000, OPCIONES);
  const victima = await checkRateLimitConRespaldo("otro-cualquiera", 30, 600_000, OPCIONES);
  chequear("20 pedidos de un bloqueado agotan el global", victima.permitido === false, victima);

  /* ── La ventana se renueva ──────────────────────────────────────────────── */
  console.log("\n6) La ventana vence y el contador arranca de nuevo");

  _resetContadoresLocales();
  // Ventana de 1ms: al segundo pedido ya venció, así que tiene que dejar pasar.
  const v1 = await checkRateLimitConRespaldo("u-ventana", 30, 1, OPCIONES);
  for (let i = 0; i < 5; i++) await checkRateLimitConRespaldo("u-ventana", 30, 1, OPCIONES);
  await new Promise((r) => setTimeout(r, 20));
  const v2 = await checkRateLimitConRespaldo("u-ventana", 30, 1, OPCIONES);
  chequear("el primero pasa", v1.permitido, v1);
  chequear("después de vencer, vuelve a pasar", v2.permitido, v2);

  /* ── El techo, en números ───────────────────────────────────────────────── */
  console.log("\n7) Cuánto se puede gastar con Redis caído");

  // El punto de todo esto: que el techo sea un número y no "infinito".
  const COSTO_POR_MENSAJE = 0.018; // USD, estimado con el prompt actual
  const porInstanciaPorHora = OPCIONES.limiteFallbackGlobal * 6; // ventana de 10 min
  const gastoPorInstanciaPorHora = porInstanciaPorHora * COSTO_POR_MENSAJE;
  chequear(
    `una instancia no pasa de ~US$${gastoPorInstanciaPorHora.toFixed(2)}/hora`,
    gastoPorInstanciaPorHora < 3,
    { porInstanciaPorHora, gastoPorInstanciaPorHora }
  );

  console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main();
