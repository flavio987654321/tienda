/**
 * Chequeos de los primeros pasos del panel digital.
 *
 *   npx tsx src/lib/primeros-pasos.check.ts
 *
 * ── Qué se cuida ────────────────────────────────────────────────────────────
 *
 * Que la lista **no pueda mentir**. Es lo primero que ve alguien que acaba de
 * registrarse, y una lista que dice "listo" con la cuenta a medias es peor que
 * no tener lista: manda a publicar algo que no se puede entregar.
 *
 * Por eso no hay ninguna bandera guardada — cada paso se pregunta por el dato
 * real — y por eso estos chequeos corren la función de verdad contra fotos
 * armadas a mano, en vez de leer el archivo.
 */

import { readFileSync, existsSync } from "fs";
import {
  primerosPasos, cuantosHechos, elQueSigue, terminado, pasosDeLaPuerta, PASOS_DE_ADENTRO,
  type FotoDeLaCuenta,
} from "./primeros-pasos";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const VACIA: FotoDeLaCuenta = {
  principalId: null,
  tieneArchivo: false,
  paginaArmada: false,
  cobroConectado: false,
  publicado: false,
};
const LISTA: FotoDeLaCuenta = {
  principalId: "cabc",
  tieneArchivo: true,
  paginaArmada: true,
  cobroConectado: true,
  publicado: true,
};

/* ── La cuenta recién creada ─────────────────────────────────────────────── */

const vacia = primerosPasos(VACIA);
check("PAS-A", vacia.length === 5 && cuantosHechos(vacia) === 0,
  "una cuenta recién creada tiene los cinco pasos y ninguno hecho");

/* El primero es armar el producto: sin eso no hay nada que hacer con los otros
   cuatro. Y su acción nombra la IA, que es el camino que resuelve la pantalla en
   blanco — el problema que esa persona tiene en ese momento exacto. */
check("PAS-B",
  vacia[0].clave === "producto" && /IA/.test(vacia[0].accion),
  "el primer paso es armar el producto, y ofrece hacerlo con IA");

/* ⚠️ El orden es el del trabajo. El archivo va segundo porque es el único paso
   que falla DESPUÉS de que alguien pagó: se cobra y no se puede entregar. */
check("PAS-C",
  vacia.map((p) => p.clave).join(",") === "producto,archivo,pagina,cobro,publicar",
  "el orden es producto, archivo, página, cobro, publicar");

/* Conectar Mercado Pago va cuarto y no primero, a propósito: es el paso que más
   gente abandona —saca de la aplicación, pide iniciar sesión— y ponerlo antes es
   perder a quien todavía no vio nada de lo suyo armado. */
check("PAS-D", vacia[3].clave === "cobro",
  "el trámite de Mercado Pago va después de ver lo propio armado");

/* ── El que sigue ────────────────────────────────────────────────────────── */

/* ⚠️ UNO SOLO muestra su botón. Cinco llamados a la acción a la vez no llaman a
   ninguno, y además el orden importa: no se puede subir el archivo de un
   producto que no existe. */
check("PAS-E", elQueSigue(vacia)?.clave === "producto",
  "en una cuenta vacía, el que sigue es el primero");

const conProducto = primerosPasos({ ...VACIA, principalId: "cabc" });
check("PAS-F",
  conProducto[0].hecho && elQueSigue(conProducto)?.clave === "archivo",
  "con el producto hecho, el que sigue es el archivo");

/* ⚠️ Y salta los que ya están, no se traba en el primero pendiente por orden de
   lista: alguien puede conectar Mercado Pago antes de subir el archivo. */
const salteado = primerosPasos({
  ...VACIA, principalId: "cabc", tieneArchivo: true, paginaArmada: true, cobroConectado: true,
});
check("PAS-G", elQueSigue(salteado)?.clave === "publicar",
  "si hizo cosas fuera de orden, el que sigue es el que de verdad falta");

/* ── Cuando está todo ────────────────────────────────────────────────────── */

const lista = primerosPasos(LISTA);
check("PAS-H",
  terminado(lista) && cuantosHechos(lista) === 5 && elQueSigue(lista) === null,
  "con todo hecho no queda ningún paso pendiente");

/* Y la pantalla la esconde, en vez de dibujar cinco tildes que no hacen nada. */
const inicio = readFileSync("src/app/digitales/page.tsx", "utf8");
/* ⚠️ Sin el paréntesis pegado: pedía `!terminado(pasos) && (` escrito tal cual y
   se puso en rojo el día que la lista pasó a dibujarse sin envolver, con un
   `<PrimerosPasos />` a secas. Lo que se cuida es la CONDICIÓN, no cómo esté
   escrito el JSX que cuelga de ella. */
check("PAS-I", /!terminado\(pasos\) &&/.test(inicio),
  "la lista desaparece sola cuando están los cinco");

/* ── Que no pueda mentir ─────────────────────────────────────────────────── */

/* ⚠️ EL CHEQUEO IMPORTANTE. Ninguna bandera guardada: una se desincroniza el día
   que alguien borra su producto o desconecta Mercado Pago, y la lista diría
   "listo" con la cuenta rota. Calculado del estado real, si algo se rompe el
   paso vuelve a aparecer solo — que es justo lo que hay que ver. */
/* Mira el CÓDIGO y no los comentarios. Es la cuarta vez en este proyecto que un
   chequeo falla por culpa del comentario que explica el error que evita: los de
   `primeros-pasos` nombran "onboarding" y "descartar" justamente para decir que
   NO se usan. */
const soloCodigo = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const logica = soloCodigo(readFileSync("src/lib/primeros-pasos.ts", "utf8"));
const componente = soloCodigo(readFileSync("src/app/digitales/PrimerosPasos.tsx", "utf8"));
check("PAS-J",
  !/onboarding|localStorage|dismiss|descartar|ocultarPasos/i.test(logica) &&
  !/localStorage|dismiss|onboarding/i.test(componente),
  "no hay bandera guardada ni forma de cerrar la lista: se calcula de la realidad");

/* Y eso se verifica de verdad: deshacer un paso lo devuelve a pendiente. */
const seRompio = primerosPasos({ ...LISTA, cobroConectado: false });
check("PAS-K",
  !terminado(seRompio) && elQueSigue(seRompio)?.clave === "cobro",
  "si se desconecta Mercado Pago, el paso vuelve a aparecer");

/* ── Los enlaces ─────────────────────────────────────────────────────────── */

/* El paso de la página lleva al editor de ESE producto, no a la lista: mandar a
   la lista para que lo busque es hacerle dar una vuelta de más. */
check("PAS-L",
  conProducto[2].href === "/digitales/productos/cabc/pagina",
  "el paso de la página lleva al editor de ese producto");

/* Y sin producto no puede llevar a un editor que no existe. */
check("PAS-M", vacia[2].href === "/digitales/productos",
  "sin producto, ese paso lleva a la lista y no a una dirección rota");

/* ⚠️ El de cobro abre la solapa de Pagos, y esa solapa TIENE que existir del
   otro lado: un `?tab=` que nadie lee deja a la persona en General buscando. */
const configCliente = readFileSync("src/app/digitales/configuracion/ConfiguracionClient.tsx", "utf8");
const configPagina = readFileSync("src/app/digitales/configuracion/page.tsx", "utf8");
check("PAS-N",
  vacia[3].href === "/digitales/configuracion?tab=pagos" &&
  /abrirEn/.test(configPagina) && /p\.abrirEn \?\? "general"/.test(configCliente),
  "el paso de cobro abre la solapa de Pagos, y del otro lado se lee");

/* Y la solapa pedida se compara contra la lista nuestra: una inventada dibujaría
   una pantalla vacía. */
check("PAS-O",
  /SOLAPAS\.find\(\(s\) => s === tab\) \?\? null/.test(configPagina),
  "la solapa pedida sale de una lista nuestra, nunca del texto crudo");

check("PAS-P", existsSync("src/app/digitales/PrimerosPasos.tsx"),
  "la lista tiene su componente");

/* ── La puerta del panel ──────────────────────────────────────────────────────
 *
 * Los cinco impiden vender, pero para ENTRAR alcanzan DOS: el producto y la
 * página. Publicar se decide mirando; el archivo tiene dos caminos —subir un PDF
 * o que la IA escriba el ebook— de los cuales uno vive adentro del panel; y
 * Mercado Pago se conecta desde Configuración, que también está adentro.
 * Pedirlos en la puerta escondía justo la pantalla donde se arreglan.
 * Ver `PASOS_DE_ADENTRO`. */

const puerta = pasosDeLaPuerta(primerosPasos(VACIA));

check("PAS-Q",
  puerta.length === 2 && !puerta.some((p) => PASOS_DE_ADENTRO.includes(p.clave)),
  "la puerta son dos pasos, y ni el archivo, ni el cobro, ni publicar están entre ellos");

/* ⚠️ El que de verdad importa: con los dos hechos se entra, aunque falten el
   archivo, el cobro y publicar. Si esto falla, alguien queda encerrado afuera
   del panel —y el panel es donde está el botón que le escribe el ebook, y la
   pantalla donde se conecta Mercado Pago—. */
const soloLosDos = primerosPasos({
  ...LISTA, tieneArchivo: false, cobroConectado: false, publicado: false,
});
check("PAS-R",
  terminado(pasosDeLaPuerta(soloLosDos)) && !terminado(soloLosDos),
  "sin archivo, sin cobro y sin publicar se entra igual, y la lista de adentro los sigue pidiendo");

/* Y al revés: que falte cualquiera de los dos cierra la puerta. Se prueban los
   dos y no uno de muestra — el que no se prueba es el que se olvida el día que
   alguien toca `pasosDeLaPuerta`. */
const cierran: Array<[string, FotoDeLaCuenta]> = [
  ["producto", { ...LISTA, principalId: null }],
  ["pagina", { ...LISTA, paginaArmada: false }],
];
check("PAS-S",
  cierran.every(([, foto]) => !terminado(pasosDeLaPuerta(primerosPasos(foto)))),
  "si falta cualquiera de los dos, el panel no se abre");

/* ⚠️ EL QUE PAGA EL CAMBIO DEL 08/09/26. Sacar el cobro de la puerta sólo es
   seguro porque `loQueFalta` no deja publicar sin él: si no, alguien pone a la
   vista una página con dirección propia, la mete en un anuncio, y el botón de
   comprar contesta "probá más tarde". La plata del anuncio se va contra una
   página que no puede cobrar.

   Si este chequeo cae, hay que volver a poner el cobro en la puerta. */
const libProductos = readFileSync("src/lib/productos-digitales.ts", "utf8");
check("PAS-X",
  /cobroConectado: boolean/.test(libProductos) && /!p\.cobroConectado/.test(libProductos) &&
  /cobroConectado:/.test(readFileSync("src/app/api/digitales/productos/[id]/route.ts", "utf8")),
  "sin Mercado Pago no se puede publicar, que es la red que reemplaza al paso de la puerta");

/* ⚠️ Y sacar el archivo de la puerta NO puede haber abierto el agujero que ese
   paso tapaba. Lo que de verdad lo tapa es `loQueFalta`, dos veces más abajo:
   publicar sin archivo se rechaza, y comprar lo vuelve a mirar. Si alguno de los
   dos deja de mirarlo, esto avisa. */
const rutaProducto = readFileSync("src/app/api/digitales/productos/[id]/route.ts", "utf8");
const rutaComprar = readFileSync("src/app/api/digitales/comprar/route.ts", "utf8");
check("PAS-V",
  /loQueFalta\(/.test(rutaProducto) && /loQueFalta\(/.test(rutaComprar) &&
  /!p\.archivoPath/.test(readFileSync("src/lib/productos-digitales.ts", "utf8")),
  "sin archivo sigue sin poderse publicar ni comprar, que es lo que hacía bloqueante al paso 2");

/* La compuerta es quien filtra, no el componente. */
const compuerta = readFileSync("src/lib/recibimiento.ts", "utf8");
check("PAS-T", /const pasos = pasosDeLaPuerta\(/.test(compuerta),
  "la compuerta le pasa a la pantalla sólo los pasos de la puerta");

/* `soloCodigo` saca los comentarios: adentro se los NOMBRA para explicar por qué
   no están, y eso no es dibujarlos. */
const recibimiento = soloCodigo(readFileSync("src/app/digitales/Recibimiento.tsx", "utf8"));
check("PAS-U",
  !/sigue\.clave === "publicar"/.test(recibimiento) && !/sigue\.clave === "archivo"/.test(recibimiento),
  "el recibimiento ya no dibuja ni el archivo ni publicar");

/* Y los dos caminos del archivo tienen que estar JUNTOS del otro lado: si el
   botón de la IA desaparece de Productos, sacarlo de la puerta deja a Starter y
   Pro sin ninguna forma de que se lo escriban. */
const productos = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
check("PAS-W",
  /abrirEbook/.test(productos) && /subirPdfDigital|subir/i.test(productos),
  "en Productos conviven los dos caminos del archivo: subir el PDF y escribirlo con IA");

console.log(fallos === 0
  ? "\nok — los primeros pasos dicen lo que de verdad falta, y no se pueden apagar"
  : `\nFALLA — ${fallos} chequeo(s) de los primeros pasos`);
process.exit(fallos === 0 ? 0 : 1);
