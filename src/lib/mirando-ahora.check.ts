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
 *   - Que el número sea de AHORA: si no se refresca solo, queda congelado en
 *     el momento en que se cargó la pantalla y el cartel miente.
 *   - Que el permiso con el que el panel vuelve a preguntar no sirva para
 *     espiar el contador de un producto ajeno.
 */

import { readFileSync } from "node:fs";

process.env.NEXTAUTH_SECRET ??= "clave-de-prueba-para-los-chequeos-0123456789";

import { claveDeVentana, ventanasVivas, VENTANA_MS, LATIDO_MS, VIDA_SEG, REFRESCO_DEL_PANEL_MS } from "./mirando-ahora";
import { huellaDeVisitante, permisoDelPanel, productosDelPermiso } from "./mirando-ahora-servidor";

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

/* ⚠️ El que se fue tiene que irse del cartelito, y rápido: nadie avisa cuando
   cierra la pestaña, así que irse es dejar de latir y eso se nota recién
   cuando pasan las dos ventanas. Si eso tardara minutos, el cartel diría que
   hay alguien mirando cuando hace rato que no hay nadie. */
check("MIR-B2", VENTANA_MS * 2 + REFRESCO_DEL_PANEL_MS <= 90_000,
  "el que cerró la pestaña desaparece en menos de minuto y medio, contando lo que tarda el panel en preguntar");

/* Preguntar más seguido que el latido no puede enterarse de nada nuevo: nada
   nuevo se escribió. */
check("MIR-B3", REFRESCO_DEL_PANEL_MS >= LATIDO_MS,
  "el panel no pregunta más seguido de lo que la página late");

/* ── Las claves ─────────────────────────────────────────────────────────── */

check("MIR-C", claveDeVentana(ID, AHORA) !== claveDeVentana(OTRO, AHORA)
  && claveDeVentana(ID, AHORA) === claveDeVentana(ID, AHORA + VENTANA_MS - 1)
  && claveDeVentana(ID, AHORA) !== claveDeVentana(ID, AHORA + VENTANA_MS),
  "cada producto tiene su clave, y la ventana cambia al terminarse y no antes");

check("MIR-D", ventanasVivas(ID, AHORA).length === 2
  && ventanasVivas(ID, AHORA)[0] === claveDeVentana(ID, AHORA)
  && ventanasVivas(ID, AHORA)[1] === claveDeVentana(ID, AHORA - VENTANA_MS),
  "se cuentan la ventana que corre y la anterior: sin la anterior el contador caería a cero cada media vuelta");

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

/* ── El permiso del panel ───────────────────────────────────────────────── */

/* El panel vuelve a preguntar cada veinte segundos. Para no pedir la sesión
   —un viaje a Supabase y otro a la base CADA VEZ, por un cartelito— se lleva
   un permiso firmado con sus propios ids. Todo lo que sigue existe para que
   ese atajo no se convierta en una puerta abierta. */

const permiso = permisoDelPanel([ID, OTRO]) ?? "";

check("MIR-Q", (productosDelPermiso(permiso) ?? []).join() === [ID, OTRO].join(),
  "el permiso vuelve con los mismos productos con los que se firmó");

/* ⚠️ EL CHEQUEO QUE SOSTIENE EL ATAJO. Sin firma, cambiar el id del permiso
   sería preguntar por la página de cualquiera: cuánta gente está mirando
   ahora mismo el producto de otro. */
check("MIR-R", productosDelPermiso(permiso.replace(ID, "clx0000000000000000000009")) === null
  && productosDelPermiso(`${permiso}x`) === null
  && productosDelPermiso(permiso.split(".").slice(0, 2).join(".")) === null,
  "un permiso tocado no sirve: no se puede espiar el contador de un producto ajeno");

/* Vencido es no válido. Un permiso que no vence es un permiso para siempre:
   quien se lo lleve una vez sigue preguntando el año que viene. */
check("MIR-S", productosDelPermiso(permiso, Date.now() + 13 * 60 * 60 * 1000) === null
  && productosDelPermiso(permisoDelPanel([ID], AHORA) ?? "", AHORA + 1000) !== null,
  "el permiso vence, y antes de vencer vale");

/* ⚠️ Las dos firmas salen del mismo secreto. Si compartieran el texto, una
   huella de visitante podría pasar por permiso de panel o al revés. */
check("MIR-T", productosDelPermiso(`${Date.now() + 60_000}.${ID}.${huellaDeVisitante(ID, "1.2.3.4", "Chrome")}`) === null,
  "la huella de un visitante no sirve como permiso de panel: son dos firmas distintas");

/* Sin secreto no se firma nada. Devolver un permiso sin firma sería peor que
   no devolver ninguno: andaría, y no protegería nada. */
const conSecreto = process.env.NEXTAUTH_SECRET!;
delete process.env.NEXTAUTH_SECRET;
check("MIR-U", permisoDelPanel([ID]) === null && productosDelPermiso(permiso) === null,
  "sin secreto no hay permiso: antes que uno sin firma, ninguno");
process.env.NEXTAUTH_SECRET = conSecreto;

/* ⚠️ EL QUE EVITA UNA RECARGA ATRÁS DE OTRA. El panel, cuando le rechazan el
   permiso, recarga la pantalla para pedir otro. Si se pudiera firmar uno que
   del otro lado se rechaza siempre —la lista vacía, un id con otro formato—,
   el otro sería igual de malo y la pantalla se recargaría para siempre. Que
   no se dibuje el cartelito es infinitamente mejor. */
check("MIR-U2", permisoDelPanel([]) === null
  && permisoDelPanel(["no-es-un-id"]) === null
  && permisoDelPanel([ID, "no-es-un-id"]) === null,
  "no se firma un permiso que no se va a poder leer: sin eso, el panel se recargaría en círculo");

/* Y del lado del navegador, el cinturón: aunque un 401 no se arregle nunca
   —una clave que cambió en el medio—, se recarga como mucho una vez cada
   tanto. El reloj vive AFUERA del componente porque la recarga lo vuelve a
   armar de cero y uno guardado adentro se perdería en cada vuelta. */
check("MIR-U3", /^let ultimaRecarga = 0;$/m.test(leer("src/app/digitales/MirandoAhora.tsx"))
  && /cuando - ultimaRecarga > ESPERA_ENTRE_RECARGAS_MS/.test(leer("src/app/digitales/MirandoAhora.tsx")),
  "el permiso rechazado no puede encadenar recargas: como mucho una cada cinco minutos");

/* Un permiso inventado con mil productos nos haría pedirle a Redis dos mil
   claves de una sola vez. */
check("MIR-V", productosDelPermiso(`${Date.now() + 60_000}.${Array(200).fill(ID).join("~")}.x`) === null
  && productosDelPermiso(`${Date.now() + 60_000}..${"x".repeat(32)}`) === null,
  "ni una lista enorme ni una vacía: el permiso tiene tope y tiene piso");

/* ── Lo que no se puede leer de una función ─────────────────────────────── */

const puro = leer("src/lib/mirando-ahora.ts");
const servidor = leer("src/lib/mirando-ahora-servidor.ts");
const ruta = leer("src/app/api/digitales/mirando/[id]/route.ts");
const rutaPanel = leer("src/app/api/digitales/mirando/route.ts");
const componente = leer("src/app/p/[id]/VisitaDigital.tsx");
const panel = leer("src/app/digitales/page.tsx");
const cartel = leer("src/app/digitales/MirandoAhora.tsx");

/* ⚠️ EL CHEQUEO QUE SOSTIENE LA PROMESA. Esto no guarda nada: si algún día
   alguien le agrega una tabla, que falle acá y no en la política de
   privacidad. */
check("MIR-H", !/prisma/.test(servidor) && !/prisma/.test(ruta) && !/prisma/.test(puro)
  /* Y la ruta que pregunta tampoco: se la llama cada veinte segundos mientras
     el panel esté abierto. Con la base adentro, un cartelito se convertiría
     en la consulta más repetida del proyecto. */
  && !/prisma/.test(rutaPanel) && !/getCurrentUser/.test(rutaPanel),
  "no toca la base en ningún lado: ni tabla, ni fila por visita, ni la hora de nadie");

check("MIR-I", /\.pfadd\(/.test(servidor) && /\.pfcount\(/.test(servidor)
  && !/sadd|smembers|zadd|zrange/i.test(servidor),
  "usa un HyperLogLog, que NO almacena lo que se le suma: aunque alguien lea la clave, no hay nadie adentro");

check("MIR-J", /\.pfadd\(clave, huella\)\.expire\(clave, VIDA_SEG\)/.test(servidor),
  "la clave se borra sola —nadie tiene que salir a limpiar nada— y el latido entero sale en un solo viaje");

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

/* La ruta que pregunta tiene su propio tope, aparte del latido: son dos
   caudales distintos y uno no puede dejar sin cupo al otro. Y verifica el
   permiso ANTES de hablar con Redis. */
check("MIR-M2", /checkRateLimit\(`mirando-panel:\$\{ip\}`/.test(rutaPanel)
  && rutaPanel.indexOf("productosDelPermiso(") < rutaPanel.indexOf("checkRateLimit("),
  "preguntar tiene su propio tope por IP, y sin permiso válido no se llega ni a Redis");

/* ⚠️ EL TOPE POR IP TIENE QUE SEGUIR AL LATIDO. En el celular media ciudad
   comparte IP por CGNAT: si el tope no alcanza, la persona número catorce
   deja de contarse y nadie se entera. Cuando el latido se hizo más rápido,
   el mismo tope pasó a dar para menos gente —y eso fue un error de verdad—.
   Que falle acá la próxima vez. */
const topePorIp = Number(/const LATIDOS_POR_MINUTO = (\d+)/.exec(ruta)?.[1]);
check("MIR-M3", topePorIp / (60_000 / LATIDO_MS) >= 30,
  "el tope por IP deja lugar a por lo menos 30 personas mirando detrás de la misma IP");

/* El permiso viaja en una cabecera, no en la dirección: en la dirección
   quedaría escrito en los registros del servidor, y una cabecera inventada
   obliga al navegador a pedir permiso antes de mandarla desde otro sitio. */
check("MIR-M4", /req\.headers\.get\("x-mirando"\)/.test(rutaPanel)
  && !/searchParams/.test(rutaPanel)
  && /"x-mirando": permiso/.test(cartel),
  "el permiso va en una cabecera y no en la dirección: no queda en los registros ni lo manda otro sitio");

check("MIR-N", /veVisitas && foto \? await mirandoAhora\(/.test(panel),
  "el puntito lleva el MISMO candado que las visitas: en Free no se pregunta");

/* ⚠️ `null` es "no se pudo averiguar" y cero es "no hay nadie". Cero SÍ se
   dibuja —gris y quieto, "nadie mirando ahora"—; "no sé" no se dibuja. */
check("MIR-O", /mirando !== null && permisoDeMirando !== null &&/.test(panel)
  /* Del otro lado: cuando Redis no contesta, la función devuelve `null` y no
     un cero de consuelo. Las dos mitades tienen que estar. */
  && /if \(!r\) return null;/.test(servidor)
  && /\} catch \{\n    return null;\n  \}/.test(servidor)
  /* Y en el navegador, un `null` que llega no pisa el último número que sí
     supimos con un cero inventado. */
  && /if \(typeof mirando !== "number" \|\| !Number\.isFinite\(mirando\)\) return;/.test(cartel),
  "no se dibuja con «no sé»: un cero inventado diría «no hay nadie», que es otra afirmación");

/* ── Que el cartelito sea de AHORA ──────────────────────────────────────── */

/* ⚠️ ESTO ES LO QUE LO HACE UN CARTEL DE AHORA Y NO UNA FOTO. Dibujado en el
   servidor y nada más, el número queda congelado en el momento en que se
   cargó la pantalla: el que se fue sigue contado hasta que alguien recargue.
   Pasó, y se ve como si el contador se hubiera tildado. */
check("MIR-W", /setInterval\(\(\) => void preguntar\(\), REFRESCO_DEL_PANEL_MS\)/.test(cartel)
  && /document\.visibilityState !== "visible"/.test(cartel)
  && /visibilitychange/.test(cartel),
  "el panel vuelve a preguntar solo, y no pregunta con la pestaña escondida");

/* Cero se dibuja gris y quieto. Que el cartelito desaparezca cuando no hay
   nadie se lee como una falla, y además "no hay nadie" es algo verdadero que
   se puede decir. */
check("MIR-X", /nadie mirando ahora/.test(cartel) && /bg-gray-400/.test(cartel)
  && /motion-safe:animate-ping/.test(cartel),
  "sin gente, gris y quieto; con gente, el puntito late —y no late para quien pidió menos movimiento—");

/* ── El detalle por producto ────────────────────────────────────────────── */

/* ⚠️ Con cinco páginas de venta, "12 mirando ahora" no dice CUÁL de las
   cinco, que es justo lo que se quiere saber después de publicar un anuncio.
   El total es la suma de los renglones a propósito: un total que no cierra
   con su detalle parece un error aunque no lo sea. */
check("MIR-Y", /porProducto\.reduce\(\(suma, x\) => suma \+ x\.n, 0\)/.test(servidor)
  && /productos\.length > 1/.test(cartel),
  "el total es la suma del detalle, y el detalle sólo aparece cuando hay más de un producto");

/* ⚠️ En el celular el navegador finge un mouse: con `onMouseEnter` el toque
   abría el detalle y el clic que venía atrás lo cerraba, así que tocarlo no
   hacía NADA. Éste es un panel que se mira desde el teléfono. */
/* (El `=\{` es para no chocar con el comentario que explica por qué no se usa
   `onMouseEnter`: se busca el atributo de verdad, no la palabra.) */
check("MIR-Z", /pointerType === "mouse"/.test(cartel) && !/onMouseEnter=\{/.test(cartel)
  /* Y una vez abierto de un toque, se cierra tocando afuera o con Escape: en
     el celular no existe "sacar el mouse de encima". */
  && /pointerdown/.test(cartel) && /"Escape"/.test(cartel),
  "en el celular se abre tocándolo y se cierra tocando afuera: el toque no es un mouse");

/* El panel pregunta sólo por SUS productos: el elegido, o los de la cuenta. */
check("MIR-P", /\(foto\.elegido \? \[foto\.elegido\] : foto\.productos\)\.map\(\(x\) => x\.id\)/.test(panel),
  "se cuenta lo que mira esta cuenta y nada más: el producto elegido, o los suyos");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
