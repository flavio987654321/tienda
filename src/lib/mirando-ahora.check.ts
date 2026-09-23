/**
 * Chequeos del "mirando ahora", el puntito verde del panel. Se corre con:
 *
 *   npx tsx src/lib/mirando-ahora.check.ts
 *
 * Lo que importa acá no es el número —es un cartelito— sino **que no se
 * convierta en otra cosa**:
 *
 *   - Que no guarde nada: ni tabla, ni fila por visita, ni la hora de nadie.
 *     Sólo dos contadores en Redis que se borran solos.
 *   - Que la huella no se pueda revertir ni cruzar entre páginas.
 *   - Que el latido no lata con la pestaña escondida, o el cartelito pasaría
 *     a ser uno de esos números inventados que este proyecto no tiene.
 *   - Que "no sé" no se dibuje como "no hay nadie".
 *   - Que lleve el mismo candado que las visitas.
 */

import { readFileSync } from "node:fs";

process.env.NEXTAUTH_SECRET ??= "clave-de-prueba-para-los-chequeos-0123456789";

import { claveDeVentana, ventanasVivas, VENTANA_MS, LATIDO_MS, VIDA_SEG } from "./mirando-ahora";
import { huellaDeVisitante } from "./mirando-ahora-servidor";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

const ID = "clx0000000000000000000001";
const OTRO = "clx0000000000000000000002";
const AHORA = 1_800_000_000_000;

/* ── Los plazos ─────────────────────────────────────────────────────────── */

/* ⚠️ El latido tiene que caber HOLGADO adentro de la ventana. Si latiera cada
   60 s justos, quien entra en el segundo 59 no vuelve a avisar hasta la
   ventana siguiente y desaparece del contador en el medio. */
check("MIR-A", LATIDO_MS < VENTANA_MS && LATIDO_MS <= VENTANA_MS * 0.8,
  "el latido entra holgado en la ventana: nadie parpadea entre un latido y el siguiente");

/* La clave tiene que sobrevivir a las dos ventanas que se cuentan, o la
   anterior se borraría justo cuando todavía se la está sumando. */
check("MIR-B", VIDA_SEG * 1000 >= VENTANA_MS * 2,
  "la clave vive más que las dos ventanas que se cuentan");

/* ── Las claves ─────────────────────────────────────────────────────────── */

check("MIR-C", claveDeVentana(ID, AHORA) !== claveDeVentana(OTRO, AHORA)
  && claveDeVentana(ID, AHORA) === claveDeVentana(ID, AHORA + VENTANA_MS - 1)
  && claveDeVentana(ID, AHORA) !== claveDeVentana(ID, AHORA + VENTANA_MS),
  "cada producto tiene su clave, y la ventana cambia al pasar el minuto y no antes");

check("MIR-D", ventanasVivas(ID, AHORA).length === 2
  && ventanasVivas(ID, AHORA)[0] === claveDeVentana(ID, AHORA)
  && ventanasVivas(ID, AHORA)[1] === claveDeVentana(ID, AHORA - VENTANA_MS),
  "se cuentan la ventana que corre y la anterior: sin la anterior el contador caería a cero cada minuto");

/* ── La huella ──────────────────────────────────────────────────────────── */

const h = (p: string, ip: string, ua = "Chrome") => huellaDeVisitante(p, ip, ua);

check("MIR-E", h(ID, "1.2.3.4") === h(ID, "1.2.3.4")
  && h(ID, "1.2.3.4") !== h(ID, "1.2.3.5")
  && h(ID, "1.2.3.4", "Chrome") !== h(ID, "1.2.3.4", "Firefox"),
  "la misma persona da la misma huella —recargar no cuenta dos veces— y otra da otra");

/* ⚠️ El producto va ADENTRO del HMAC. Sin eso, la misma huella aparecería en
   las claves de dos productos y cualquiera que tuviera las dos podría decir
   "esta persona miró las dos páginas". */
check("MIR-F", h(ID, "1.2.3.4") !== h(OTRO, "1.2.3.4"),
  "la misma persona en dos páginas son dos huellas distintas: no se pueden cruzar");

check("MIR-G", (h(ID, "1.2.3.4") ?? "").length === 16
  && !(h(ID, "1.2.3.4") ?? "").includes("1.2.3.4"),
  "la huella es corta y no lleva la IP adentro: no se puede volver de ella a una persona");

/* ── Lo que no se puede leer de una función ─────────────────────────────── */

const puro = leer("src/lib/mirando-ahora.ts");
const servidor = leer("src/lib/mirando-ahora-servidor.ts");
const ruta = leer("src/app/api/digitales/mirando/[id]/route.ts");
const componente = leer("src/app/p/[id]/VisitaDigital.tsx");
const panel = leer("src/app/digitales/page.tsx");

/* ⚠️ EL CHEQUEO QUE SOSTIENE LA PROMESA. Esto no guarda nada: si algún día
   alguien le agrega una tabla, que falle acá y no en la política de
   privacidad. */
check("MIR-H", !/prisma/.test(servidor) && !/prisma/.test(ruta) && !/prisma/.test(puro),
  "no toca la base en ningún lado: ni tabla, ni fila por visita, ni la hora de nadie");

check("MIR-I", /r\.pfadd\(/.test(servidor) && /r\.pfcount\(/.test(servidor)
  && !/sadd|smembers|zadd|zrange/i.test(servidor),
  "usa un HyperLogLog, que NO almacena lo que se le suma: aunque alguien lea la clave, no hay nadie adentro");

check("MIR-J", /await r\.expire\(clave, VIDA_SEG\)/.test(servidor),
  "la clave se borra sola: nadie tiene que salir a limpiar nada");

/* ⚠️ Sin esto, una pestaña olvidada en el fondo late toda la tarde y el panel
   dice que hay diez personas mirando cuando no hay ninguna. */
check("MIR-K", /document\.visibilityState !== "visible"/.test(componente)
  && /visibilitychange/.test(componente) && /paso !== "pagina"/.test(componente),
  "sólo late con la pestaña a la vista, y sólo en la página de venta");

check("MIR-L", /keepalive: true/.test(componente) && /\.catch\(\(\) => \{\}\)/.test(componente),
  "el latido no puede ensuciar la consola de la página donde entra la plata");

/* ⚠️ Va por su propia ruta y no por la de visitas: aquélla escribe en la base
   y su tope por IP está pensado para UNA visita por día. Un latido cada 45
   segundos se lo comería y dejaría de contarse la visita de verdad. */
check("MIR-M", !/digitalVisita/.test(ruta) && /checkRateLimit\(`mirando:\$\{ip\}`/.test(ruta)
  && /status: 204/.test(ruta),
  "el latido tiene su propia ruta y su propio tope: no le come el cupo a la visita que sí se guarda");

check("MIR-N", /veVisitas && foto/.test(panel) && /cuantosMirando\(/.test(panel),
  "el puntito lleva el MISMO candado que las visitas: en Free no se pregunta");

/* ⚠️ `null` es "no se pudo averiguar" y cero es "no hay nadie". No son lo
   mismo, y ninguno de los dos se dibuja. */
check("MIR-O", /mirando !== null && mirando > 0 &&/.test(panel)
  /* Y del otro lado: cuando Redis no contesta, la función devuelve `null` y
     no un cero de consuelo. Las dos mitades tienen que estar. */
  && /if \(!r\) return null;/.test(servidor)
  && /\} catch \{\n    return null;\n  \}/.test(servidor),
  "no se dibuja con cero ni con «no sé»: un cero inventado diría «no hay nadie», que es otra afirmación");

/* El panel pregunta sólo por SUS productos: el elegido, o los de la cuenta. */
check("MIR-P", /\(foto\.elegido \? \[foto\.elegido\] : foto\.productos\)\.map\(\(x\) => x\.id\)/.test(panel),
  "se cuenta lo que mira esta cuenta y nada más: el producto elegido, o los suyos");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
