/**
 * Chequeos del turnero de interrupciones. Se corre a mano:
 *
 *   npx tsx src/lib/interrupcion-tienda.check.ts
 *
 * Igual que con el clasificador de origen, acá el error no se ve: si el turnero
 * queda trabado no explota nada ni sale un log — simplemente el flyer o el cartel
 * de instalar dejan de aparecer, y eso pasa por "no había nada para mostrar".
 * Que es exactamente el bug que este módulo vino a arreglar, así que conviene que
 * no vuelva por la puerta de atrás.
 */

import { pedirTurno, reiniciarTurnero } from "./interrupcion-tienda";

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── Uno por vez ──────────────────────────────────────────────────────────── */
console.log("\n1) Nunca hay dos a la vez");
reiniciarTurnero();
{
  const vistos: string[] = [];
  pedirTurno("flyer", () => vistos.push("flyer"));
  pedirTurno("instalar-app", () => vistos.push("instalar-app"));
  pedirTurno("activar-push", () => vistos.push("activar-push"));
  // El flyer llegó primero y se queda con la pantalla; los otros dos esperan.
  chequear("solo se muestra el primero", vistos.length === 1 && vistos[0] === "flyer", vistos);
}

/* ── El de atrás pasa cuando el de adelante libera ────────────────────────── */
console.log("\n2) El turno se pasa al liberar");
reiniciarTurnero();
{
  const vistos: string[] = [];
  const soltarFlyer = pedirTurno("flyer", () => vistos.push("flyer"));
  pedirTurno("instalar-app", () => vistos.push("instalar-app"));
  soltarFlyer();
  // Este es el caso real: el cartel de instalar quedaba abajo del velo del flyer.
  chequear("al cerrarse el flyer aparece el cartel de instalar",
    vistos.join(",") === "flyer,instalar-app", vistos);
}

/* ── La prioridad manda, no el orden de llegada ───────────────────────────── */
console.log("\n3) Manda la prioridad");
reiniciarTurnero();
{
  const vistos: string[] = [];
  const soltar = pedirTurno("flyer", () => vistos.push("flyer"));
  // Pide primero el de MENOR prioridad.
  pedirTurno("activar-push", () => vistos.push("activar-push"));
  pedirTurno("instalar-app", () => vistos.push("instalar-app"));
  soltar();
  chequear("gana instalar-app aunque pidio despues",
    vistos[1] === "instalar-app", vistos);
}

/* ── La cola no se puede trabar ───────────────────────────────────────────── */
console.log("\n4) La cola no se traba");
reiniciarTurnero();
{
  const vistos: string[] = [];
  const soltar = pedirTurno("flyer", () => vistos.push("flyer"));
  pedirTurno("instalar-app", () => vistos.push("instalar-app"));
  // Cerrar y desmontar suelen llegar los dos. Sin la guarda de idempotencia, el
  // segundo le pasaria el turno a alguien que ya lo tenia y se saltearia uno.
  soltar();
  soltar();
  soltar();
  chequear("liberar de mas no saltea a nadie",
    vistos.join(",") === "flyer,instalar-app", vistos);
}

reiniciarTurnero();
{
  const vistos: string[] = [];
  const soltarFlyer = pedirTurno("flyer", () => vistos.push("flyer"));
  const soltarInstalar = pedirTurno("instalar-app", () => vistos.push("instalar-app"));
  // El cartel de instalar se desmonta ANTES de que le toque (el visitante navego
  // a otra pantalla). Tiene que salir de la cola sin llevarse el turno puesto.
  soltarInstalar();
  soltarFlyer();
  const despues: string[] = [];
  pedirTurno("activar-push", () => despues.push("activar-push"));
  chequear("el que se va antes de su turno no traba la cola",
    vistos.join(",") === "flyer" && despues.join(",") === "activar-push", { vistos, despues });
}

/* ── Con la pantalla libre se muestra en el acto ──────────────────────────── */
console.log("\n5) Sin nadie adelante, entra directo");
reiniciarTurnero();
{
  let mostrado = false;
  pedirTurno("instalar-app", () => { mostrado = true; });
  // Una tienda sin flyer: el cartel no tiene por que esperar nada.
  chequear("una tienda sin flyer muestra el cartel enseguida", mostrado);
}

reiniciarTurnero();
{
  const vistos: string[] = [];
  const soltar = pedirTurno("flyer", () => vistos.push("flyer"));
  soltar();
  pedirTurno("instalar-app", () => vistos.push("instalar-app"));
  chequear("y despues de que todos liberan, tambien",
    vistos.join(",") === "flyer,instalar-app", vistos);
}

/* ── Pedir dos veces lo mismo ─────────────────────────────────────────────── */
console.log("\n6) El mismo pide dos veces");
reiniciarTurnero();
{
  let veces = 0;
  pedirTurno("flyer", () => veces++);
  pedirTurno("flyer", () => veces++);
  // Un doble render en desarrollo (StrictMode monta los efectos dos veces) no
  // tiene que dibujar el flyer dos veces ni anotarlo en su propia cola.
  chequear("no se muestra dos veces ni se encola a si mismo", veces === 1, veces);
}

/* ── El liberar llega por parametro ───────────────────────────────────────── */
console.log("\n7) El liberar llega por parametro");
reiniciarTurnero();
{
  // Cuando la pantalla esta libre, `mostrar` corre SINCRONICAMENTE, o sea antes
  // de que el `const` de afuera se asigne. Si alguien intentara leer esa variable
  // adentro del callback se comeria un ReferenceError — paso de verdad, en el
  // globo de notificaciones, y en el camino mas comun (tienda sin flyer).
  let recibio = null;
  let exploto = false;
  try {
    pedirTurno("flyer", (soltar) => { recibio = typeof soltar; });
  } catch { exploto = true; }
  chequear("no explota al mostrar sincronicamente", !exploto);
  chequear("y el callback recibe una funcion para liberar", recibio === "function", recibio);
}

reiniciarTurnero();
{
  // El liberar que llega por parametro tiene que servir de verdad.
  const vistos: string[] = [];
  let soltarFlyer: (() => void) | null = null;
  pedirTurno("flyer", (soltar) => { vistos.push("flyer"); soltarFlyer = soltar; });
  pedirTurno("instalar-app", () => vistos.push("instalar-app"));
  soltarFlyer!();
  chequear("el liberar del parametro pasa el turno", vistos.join(",") === "flyer,instalar-app", vistos);
}

/* ── Expropiacion por prioridad ───────────────────────────────────────────── */
console.log("\n8) El importante le saca la pantalla al que no lo es");
reiniciarTurnero();
{
  const eventos: string[] = [];
  // El globo de notificaciones pide al montarse; el flyer recien a los 400ms.
  // Sin expropiacion, el de MENOR prioridad se quedaba la pantalla 7 segundos y
  // atrasaba la oferta del comerciante hasta despues.
  pedirTurno("activar-push", () => eventos.push("push:muestra"), () => eventos.push("push:oculta"));
  pedirTurno("flyer", () => eventos.push("flyer:muestra"));
  chequear("el flyer desaloja al globo",
    eventos.join(",") === "push:muestra,push:oculta,flyer:muestra", eventos);
}

reiniciarTurnero();
{
  const eventos: string[] = [];
  let soltarFlyer: (() => void) | null = null;
  pedirTurno("activar-push", () => eventos.push("push:muestra"), () => eventos.push("push:oculta"));
  pedirTurno("flyer", (s) => { eventos.push("flyer:muestra"); soltarFlyer = s; });
  soltarFlyer!();
  // Al desalojado no se lo pierde: vuelve a la cola y se muestra despues.
  chequear("el desalojado vuelve cuando el otro termina",
    eventos.join(",") === "push:muestra,push:oculta,flyer:muestra,push:muestra", eventos);
}

reiniciarTurnero();
{
  const eventos: string[] = [];
  // Sin `ocultar`, nadie lo saca: avisa que no se lo puede interrumpir.
  pedirTurno("activar-push", () => eventos.push("push:muestra"));
  pedirTurno("flyer", () => eventos.push("flyer:muestra"));
  chequear("al que no deja `ocultar` no se lo desaloja",
    eventos.join(",") === "push:muestra", eventos);
}

console.log(fallos === 0 ? "\nTodo bien.\n" : `\n${fallos} fallas.\n`);
process.exit(fallos === 0 ? 0 : 1);
