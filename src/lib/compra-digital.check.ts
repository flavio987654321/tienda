/**
 * Chequeos de la cuenta de una compra digital. Se corre con:
 *
 *   npx tsx src/lib/compra-digital.check.ts
 *
 * Esto decide **cuánta plata se cobra y cuánta se retiene**. Un error acá no
 * rompe nada ni tira ningún error: se cobra mal, y se descubre cuando alguien
 * revisa su liquidación — o nunca.
 */

import { readFileSync } from "fs";
import {
  totalDeLaCompra, totalDelAgregado, comisionDeLaVenta, armarItems, itemsDelAgregado, upsellsQueValen,
  MAX_UPSELLS_POR_COMPRA, type ItemDeCompra,
} from "./compra-digital";
import { COMISION_DIGITAL } from "./planLimits";
import { TIERS_DIGITALES } from "./planes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const prod = (id: string, price: number, rol: string, padreId: string | null = "P") =>
  ({ id, name: id, price, rolDigital: rol, padreId });

const PRINCIPAL: ItemDeCompra = { id: "P", name: "Ebook", price: 15000, rolDigital: "PRINCIPAL" };

/* ── Lo que se cobra ──────────────────────────────────────────────────────── */

check("TOT-A", totalDeLaCompra(PRINCIPAL, []) === 15000,
  "sin agregados se cobra el precio del producto");
check("TOT-B", totalDeLaCompra(PRINCIPAL, [
  { id: "U1", name: "u", price: 4900, rolDigital: "UPSELL" },
  { id: "U2", name: "u", price: 2000, rolDigital: "UPSELL" },
]) === 21900, "cada upsell elegido suma");

/* ⚠️ Un precio negativo en la base —por un error de carga o de migración— no
   puede DESCONTAR del total. Sin el piso, un upsell a -20000 deja la compra en
   negativo y Mercado Pago le paga al comprador. */
check("TOT-C", totalDeLaCompra(PRINCIPAL, [
  { id: "U1", name: "u", price: -20000, rolDigital: "UPSELL" },
]) === 15000, "un precio negativo suma cero, nunca resta");
check("TOT-D", totalDeLaCompra({ ...PRINCIPAL, price: -5 }, []) === 0,
  "y el del principal tampoco puede ser negativo");

/* ⚠️ Éste destapó un bug de verdad. El filtro era `> 0`, y `Infinity > 0` da
   `true`: un precio infinito pasaba entero y salía una comisión infinita rumbo a
   Mercado Pago. `price` es un `Float`, y una columna de doble precisión de
   Postgres guarda `Infinity` y `NaN` sin quejarse. */
check("TOT-E", [Infinity, -Infinity, NaN].every((v) =>
  totalDeLaCompra({ ...PRINCIPAL, price: v }, []) === 0 &&
  totalDeLaCompra(PRINCIPAL, [{ id: "U", name: "u", price: v, rolDigital: "UPSELL" }]) === 15000),
  "un precio infinito o NaN vale cero, no rompe la cuenta");

/* ── La comisión ──────────────────────────────────────────────────────────── */

/* Los tres porcentajes salen del registro de planes, no escritos acá: si algún
   día cambian, este chequeo tiene que seguir pasando sin tocarlo. */
check("COM-A", TIERS_DIGITALES.every((t) =>
  comisionDeLaVenta(10000, t) === Math.round((10000 * COMISION_DIGITAL[t]) / 100)),
  "cada plan retiene su porcentaje, y sale del registro de planes");

check("COM-B", comisionDeLaVenta(17000, "FREE") === 1360, "Free sobre $17.000 retiene $1.360");
check("COM-C", comisionDeLaVenta(17000, "PRO") === 340, "y Pro, $340");

/* ⚠️ La comisión entra sobre el TOTAL, upsells incluidos. Es lo que explica que
   Free tenga un upsell habilitado: sube el ticket y con él la única comisión que
   Free paga. Si entrara sólo sobre el principal, el upsell sería gratis para
   nosotros y la decisión de dárselo a Free no se sostendría. */
const conUpsell = totalDeLaCompra(PRINCIPAL, [{ id: "U", name: "u", price: 5000, rolDigital: "UPSELL" }]);
check("COM-D", comisionDeLaVenta(conUpsell, "FREE") > comisionDeLaVenta(15000, "FREE"),
  "el upsell también paga comisión: entra sobre el total");

check("COM-E", [0, -1, NaN, Infinity].every((t) => comisionDeLaVenta(t, "FREE") === 0),
  "un total que no es un número no genera comisión");

/* ⚠️ Este número se le manda a Mercado Pago como `marketplace_fee`. Una comisión
   mayor que el importe hace fallar la preferencia o —peor— deja al vendedor
   cobrando negativo. */
check("COM-F", TIERS_DIGITALES.every((t) => comisionDeLaVenta(100, t) <= 100),
  "la comisión nunca puede ser mayor que lo que se cobra");

/* Entero: MP no acepta centavos partidos en el fee y la liquidación tiene que
   cerrar contra un número redondo. */
check("COM-G", Number.isInteger(comisionDeLaVenta(16999, "STARTER")),
  "siempre da un entero de pesos");

/* ── Las líneas de la orden ───────────────────────────────────────────────── */

const bonos: ItemDeCompra[] = [
  { id: "B1", name: "bono", price: 0, rolDigital: "BONO" },
  { id: "B2", name: "bono", price: 0, rolDigital: "BONO" },
];
const ups: ItemDeCompra[] = [{ id: "U1", name: "u", price: 4900, rolDigital: "UPSELL" }];
const lineas = armarItems(PRINCIPAL, bonos, ups);

/* ⚠️ EL chequeo de este archivo. El permiso de descarga (`DigitalDownload`)
   cuelga de `OrderItem`, uno por línea. Un bono sin línea no tiene de dónde
   colgar su permiso: se cobra la compra y ese bono no se entrega NUNCA. */
check("LIN-A", lineas.length === 4,
  "hay una línea por cosa entregable: principal, los dos bonos y el upsell");
check("LIN-B", bonos.every((b) => lineas.some((l) => l.productId === b.id)),
  "y ningún bono se queda afuera: sin línea no hay permiso de descarga");

check("LIN-C", lineas.filter((l) => l.price === 0).length === 2,
  "los bonos van a precio cero: van incluidos, es su definición");
check("LIN-D", lineas[0].productId === "P" && lineas[0].price === 15000,
  "el principal va primero y con su precio");

/* La suma de las líneas coincide con el total. No se usa para cobrar —a MP se le
   manda un solo ítem con el total— pero si no cerrara, el desglose del mail le
   diría al comprador una cosa y el cobro otra. */
check("LIN-E", lineas.reduce((s, l) => s + l.price, 0) === totalDeLaCompra(PRINCIPAL, ups),
  "las líneas suman exactamente el total que se cobra");

/* ── Qué upsells se aceptan ───────────────────────────────────────────────── */

const hijos = [
  prod("U1", 4900, "UPSELL"),
  prod("U2", 2000, "UPSELL"),
  prod("B1", 0, "BONO"),
  prod("AJENO", 9999, "UPSELL", "OTRO_PADRE"),
  prod("GRATIS", 0, "UPSELL"),
];

check("UPS-A", upsellsQueValen(["U1", "U2"], hijos, "P").map((u) => u.id).join() === "U1,U2",
  "los upsells de este producto entran");

/* ⚠️ LO MÁS SERIO DE ESTA FUNCIÓN. El navegador manda identificadores. Sin este
   filtro, alguien manda el id de un producto de OTRO embudo —o de otro
   vendedor— y se lo lleva adentro de su compra: entra a la orden, genera su
   permiso de descarga y baja un ebook ajeno pagando el precio del suyo. */
check("UPS-B", upsellsQueValen(["AJENO"], hijos, "P").length === 0,
  "un upsell de OTRO producto no entra, aunque exista");
check("UPS-C", upsellsQueValen(["B1"], hijos, "P").length === 0,
  "un bono no se puede colar como upsell: ya va incluido y gratis");
check("UPS-D", upsellsQueValen(["NO_EXISTE"], hijos, "P").length === 0,
  "un id inventado no entra");

/* Un upsell a precio cero es un error de carga, no un regalo: para eso está el
   bono. Cobrarlo a cero ensucia la orden sin darle nada a nadie. */
check("UPS-E", upsellsQueValen(["GRATIS"], hijos, "P").length === 0,
  "un upsell sin precio no entra");

check("UPS-F", upsellsQueValen(["U1", "U1", "U1"], hijos, "P").length === 1,
  "el mismo id repetido se compra una sola vez");

check("UPS-G", [null, undefined, "U1", 5, {}].every((v) => upsellsQueValen(v, hijos, "P").length === 0),
  "lo que no es una lista no agrega nada");

check("UPS-H", upsellsQueValen([1, null, {}, "U1"], hijos, "P").length === 1,
  "y adentro de la lista, lo que no es texto se descarta sin romper");

/* Techo absoluto contra un pedido que mande mil identificadores. */
check("UPS-I", upsellsQueValen(new Array(500).fill("U1"), hijos, "P").length <= MAX_UPSELLS_POR_COMPRA,
  "hay un techo de cuántos se miran, aunque manden quinientos");

/* ── La ruta: lo que no se puede probar con números ───────────────────────── */

const ruta = readFileSync("src/app/api/digitales/comprar/route.ts", "utf8");

/* ⚠️ Es la PRIMERA ruta pública de digitales: las otras siete piden sesión y rol.
   A ésta le pega cualquiera desde internet, y cada pedido que pasa le escribe
   una orden a la base y le pide una preferencia a Mercado Pago con el token del
   vendedor. */
check("RUT-A", ruta.includes("checkRateLimit"),
  "la ruta pública tiene límite por IP");

/* ⚠️ Ningún precio llega del navegador. Si el cuerpo del pedido pudiera traer un
   importe, cualquiera compra un ebook a un peso desde la consola. */
check("RUT-B", !/cuerpo\.(precio|price|total|monto|importe)/.test(ruta),
  "ningún precio se lee del pedido: todos salen de la base");

/* No se le vende a un producto borrado, ni despublicado, ni sin archivo. */
check("RUT-C", ruta.includes("deletedAt: null") && ruta.includes("isActive: true") &&
  ruta.includes("loQueFalta"),
  "no se cobra por algo borrado, despublicado o sin archivo que entregar");

/* ⚠️ Las URLs de retorno se arman con datos NUESTROS. Es a donde vuelve alguien
   que acaba de pagar: dejar que la elija quien llama a la ruta es regalarle a
   dónde mandar a un comprador con la plata ya puesta. */
check("RUT-D", !/backUrls[\s\S]{0,400}cuerpo\./.test(ruta),
  "las URLs de retorno no llevan nada que haya mandado el navegador");

/* SIEMPRE un solo ítem con el total exacto. Reconstruirlo sumando líneas ya
   cobró un peso de más en el otro ecosistema. */
check("RUT-E", /unit_price: total/.test(ruta),
  "a Mercado Pago se le manda un solo ítem con el total exacto");

/* ⚠️ Volver atrás desde Mercado Pago y apretar Pagar otra vez dejaba una orden
   PENDING por intento: el panel de ventas se llena de compras que nunca fueron. */
check("RUT-F", ruta.includes('status: "PENDING"') && ruta.includes("createdAt: { gte: desde }"),
  "una orden pendiente reciente se reusa: el doble click no deja dos");

/* Nunca se actualiza una cuenta existente desde el checkout: si el correo es de
   alguien que vende, se le colgaría la orden encima de sus datos. */
/* Se mira la INTENCIÓN y no el nombre de la variable: buscar la cuenta, y crearla
   sólo si no estaba. Lo que no puede aparecer nunca es un `update`. */
check("RUT-G", /user\.findUnique\([\s\S]{0,160}\?\?[\s\S]{0,200}user\.create/.test(ruta) &&
  !ruta.includes("user.update"),
  "un correo que ya tiene cuenta se reusa y NO se toca");

/* ── La pantalla de pago ──────────────────────────────────────────────────── */

const pantalla = readFileSync("src/app/p/[id]/pagar/page.tsx", "utf8");
const formulario = readFileSync("src/app/p/[id]/pagar/CheckoutClient.tsx", "utf8");
const dibujante = readFileSync("src/components/digitales/PaginaDeVenta.tsx", "utf8");

/* ⚠️ TODA la apuesta del diseño: el checkout no se configura, HEREDA. Las dos
   pantallas piden los colores y la letra a la misma función. Con el armado
   escrito en cada una, alcanza con tocar una para que la página de venta sea
   Violeta Nocturno y el checkout un formulario blanco genérico — justo donde se
   pone la tarjeta. */
check("PAN-A", pantalla.includes("variablesDePagina") && dibujante.includes("variablesDePagina"),
  "el checkout y la página piden el diseño a la MISMA función: no se pueden separar");

/* Y que nadie vuelva a armarlas a mano en la pantalla de pago. */
check("PAN-B", !/--pv-acento":/.test(pantalla) && !/--pv-acento":/.test(formulario),
  "ninguna de las dos arma las variables por su cuenta");

/* El botón de comprar dejó de no llevar a ningún lado. */
check("PAN-C", dibujante.includes("/pagar"),
  "el botón de comprar lleva al checkout");

/* En la previa del panel sigue sin arrancar un pago. */
check("PAN-D", /if \(esPrevia\)[\s\S]{0,200}disabled/.test(dibujante),
  "pero en la previa del editor sigue apagado: no arranca un pago de mentira");

/* ⚠️ Un solo campo obligatorio. La competencia pide cuatro y para entregar un
   PDF hace falta uno: cada campo de más entre el botón y el pago es gente que se
   va, y ninguno de los otros tres entrega nada. */
/* Se cuentan los campos donde hay que ESCRIBIR, no todos los `<input>`: la
   casilla del consentimiento es un `checkbox` y no es un campo que se llena.
   Contando todo, PAN-E se disparaba solo el día que se sumó la casilla. */
const paraEscribir = (formulario.match(/<input\b(?![^>]*type="checkbox")/g) ?? []).length;
check("PAN-E", paraEscribir === 2 && formulario.includes("Opcional"),
  "hay dos casillas para escribir y sólo una es obligatoria: el mail");

/* ⚠️ Ningún precio viaja del navegador al servidor. Lo único que sube son
   identificadores; los importes los vuelve a buscar la ruta en la base. */
/* Sin comentarios: el de adentro del `body` dice "ningún precio viaja desde acá"
   y contiene la palabra que el chequeo busca. Cuarta vez en el proyecto. */
const cuerpoDelPedido = formulario
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .match(/body: JSON\.stringify\(\{[\s\S]{0,300}?\}\)/)?.[0] ?? "";
check("PAN-F", cuerpoDelPedido.length > 0 && !/precio|price|total|monto|importe/i.test(cuerpoDelPedido),
  "al servidor sólo se le mandan identificadores, ningún importe");

/* El doble click con `useRef` y no con estado: dos clics seguidos leen el mismo
   `false` antes de que React vuelva a dibujar, y salen los dos. */
check("PAN-G", formulario.includes("enVuelo.current"),
  "el doble click en Pagar no abre dos pagos");

/* Sin Mercado Pago conectado se dice ANTES, no después de llenar el mail. */
check("PAN-H", pantalla.includes("puedeCobrar") && formulario.includes("!p.puedeCobrar"),
  "si el vendedor no configuró cobros, se avisa antes de pedir nada");

/* Los días de garantía salen de SU página, no de un número escrito en el
   checkout: la pantalla de pago no puede prometer algo distinto de la que trajo
   a la persona. */
/* ⚠️ Y sale de la función COMPARTIDA, no de una cuenta hecha en la pantalla:
   el mismo número lo leen el sello, el texto que se acepta y la ruta que lo
   guarda como prueba. Copiado en tres lados, el sello promete 30 días y la
   prueba guardada dice que no hay devolución. */
check("PAN-I", pantalla.includes("diasDeGarantia(pagina)") &&
  !pantalla.includes('s.clave === "garantia"'),
  "la garantía que promete el checkout es la que dice su propia página de venta");

/* Una pantalla de pago en un buscador sólo consigue que alguien entre por el
   medio del embudo, sin haber leído lo que está por comprar. */
check("PAN-J", /robots: \{ index: false/.test(pantalla),
  "la pantalla de pago no se indexa");

/* ⚠️ Encontrado a mano el 03/09/26, probando el link. Era un `notFound()` seco:
   sin publicar o sin archivo, 404 para todo el mundo — incluida la dueña, que
   sólo quería ver cómo le quedó su propio checkout. Y la página de venta SÍ se
   le muestra a su dueña sin publicar, así que era una función a medias. */
check("PAN-K", pantalla.includes("getCurrentUser") && pantalla.includes("fila.store.ownerId"),
  "la dueña puede ver su checkout antes de publicarlo, igual que su página de venta");

/* Y se le dice QUÉ falta: un 404 la dejaba adivinando entre tres cosas. */
check("PAN-L", pantalla.includes("avisoDePrevia") && formulario.includes("p.avisoDePrevia"),
  "y se le dice qué le falta para poder vender, no un error mudo");

/* ⚠️ Pero SÓLO a ella. Quien no es la dueña ve exactamente lo mismo que antes. */
check("PAN-M", /user\.id !== fila\.store\.ownerId\) notFound\(\)/.test(pantalla),
  "para cualquier otro sigue siendo 404: un borrador no se muestra");

/* Y en esa previa no se puede pagar: el producto todavía no se puede entregar. */
check("PAN-N", pantalla.includes("puedeCobrar={seLePuedeVender}"),
  "en la previa el botón de pagar está apagado");

/* ── El agregado: la oferta de después de pagar ───────────────────────────── */

const gracias = readFileSync("src/app/p/[id]/gracias/GraciasClient.tsx", "utf8");
const paginaGracias = readFileSync("src/app/p/[id]/gracias/page.tsx", "utf8");
const estadoRuta = readFileSync("src/app/api/digitales/estado-compra/[orden]/route.ts", "utf8");

/* ⚠️ EL error que hay que hacer imposible: cobrarle el ebook dos veces a alguien
   en la pantalla que aparece JUSTO DESPUÉS de que lo pagó. */
check("AGR-A", totalDelAgregado([
  { id: "U1", name: "u", price: 4900, rolDigital: "UPSELL" },
]) === 4900, "un agregado cobra sólo el upsell, no el producto principal");

check("AGR-B", itemsDelAgregado([
  { id: "U1", name: "u", price: 4900, rolDigital: "UPSELL" },
]).length === 1, "y su orden lleva una sola línea: la del upsell");

check("AGR-C", totalDelAgregado([]) === 0, "sin upsells no hay nada que cobrar");
check("AGR-D", totalDelAgregado([
  { id: "U", name: "u", price: Infinity, rolDigital: "UPSELL" },
]) === 0, "y un precio roto vale cero, igual que en la compra normal");

/* ⚠️ Lo más serio del agregado. El correo sale de la ORDEN ANTERIOR y nunca del
   pedido: con el mail viniendo del navegador, alguien con un identificador de
   orden ajeno podría colgarle una compra al correo de otra persona. */
check("AGR-E", !/ordenPrevia[\s\S]{0,600}email: cuerpo\.email/.test(ruta) &&
  ruta.includes("compradorPrevio = previa.buyer"),
  "en un agregado el comprador sale de la orden anterior, no del pedido");

/* Y esa orden tiene que ser de ESTA tienda y estar YA PAGADA. Sin lo primero, el
   identificador de una orden de otro vendedor sirve para colgarle un upsell
   nuestro; sin lo segundo, se pueden encadenar compras sin pagar ninguna. */
check("AGR-F", /ordenPrevia[\s\S]{0,500}storeId: producto\.store\.id/.test(ruta) &&
  /ordenPrevia[\s\S]{0,600}status: "CONFIRMED"/.test(ruta),
  "la compra anterior tiene que ser de esta tienda y estar pagada");

check("AGR-G", gracias.includes("ordenPrevia: p.ordenId") && !/email:/.test(gracias),
  "la pantalla manda el identificador de la compra, nunca un correo");

/* No ofrecerle de nuevo algo que acaba de pagar. */
check("AGR-H", paginaGracias.includes("yaComprados"),
  "no se ofrece un upsell que ya está en esa compra");

/* ⚠️ El freno del doble click NO agarraba en un agregado. Buscaba una orden
   pendiente con `productId: producto.id` —el principal— y un agregado no lo
   lleva: sólo lleva el upsell. O sea que en la oferta de después de pagar cada
   clic dejaba una orden pendiente nueva, y el panel de ventas se llenaba de
   compras que nunca fueron. Encontrado releyendo el 03/09/26. */
check("AGR-I", ruta.includes("loQueVaEnLaOrden") &&
  ruta.includes("productId: { in: loQueVaEnLaOrden }"),
  "el freno del doble click mira lo que ESTA orden va a tener, no el principal");

/* ── La pantalla de gracias ───────────────────────────────────────────────── */

/* ⚠️ Mercado Pago devuelve acá apenas aprueba, y los permisos los emite el aviso
   de pago unos segundos después. Sin la espera, quien acaba de pagar ve
   "confirmando" y tiene que recargar a mano para enterarse de que ya está. */
check("GRA-A", gracias.includes("estado-compra") && gracias.includes("setTimeout(preguntar"),
  "la pantalla espera al aviso de pago sola, sin pedir que se recargue");

/* Y no gira para siempre: pasado el rato explica qué hacer. */
check("GRA-B", gracias.includes("HASTA_MS") && gracias.includes('"demorado"'),
  "si tarda demasiado deja de preguntar y dice que el mail llega igual");

/* ⚠️ Abrir la dirección de descarga GASTA una de las cinco. Si la pantalla las
   disparara sola al cargar, una recarga costaría una descarga de cada archivo. */
check("GRA-C", !/window\.location[\s\S]{0,80}descargar/.test(gracias) &&
  gracias.includes('href={`/api/digitales/descargar/'),
  "los archivos se bajan tocando un botón, nunca solos al cargar");

/* Primero se cumple lo que la persona pagó; recién después se le ofrece algo
   más. Al revés parece que el archivo está atrás de otra compra. */
check("GRA-D", gracias.indexOf("Descargar") < gracias.indexOf("Una cosa más"),
  "la oferta va DESPUÉS de los archivos, nunca antes");

/* La ruta de estado es pública y no puede filtrar datos de la persona. */
check("GRA-E", !/email|customerName|buyer: \{ select: \{ email/.test(estadoRuta),
  "el estado de la compra no devuelve ni el correo ni el nombre de quien compró");

check("GRA-F", estadoRuta.includes("checkRateLimit") && estadoRuta.includes('owner.role !== "DIGITAL"'),
  "y tiene límite por IP, y no contesta por órdenes que no son digitales");

/* ── El consentimiento del art. 1116 ────────────────────────────────────────
 *
 * Es la única defensa contra "compré, bajé el PDF y a los dos días pedí la plata
 * de vuelta". Todo lo de acá abajo protege que la prueba EXISTA y que la escriba
 * el servidor: una prueba que redacta el navegador no prueba nada.
 */
const consentimiento = readFileSync("src/lib/consentimiento-digital.ts", "utf8");
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/* El texto tiene que NOMBRAR el artículo. "No hay devoluciones" a secas es una
   cláusula abusiva; lo que la sostiene es la excepción de la ley. */
check("CON-A", /1116/.test(consentimiento) && /arrepentimiento|devoluci/i.test(consentimiento),
  "el texto que se acepta cita el art. 1116, no dice sólo 'no hay devoluciones'");

/* ⚠️ Y no puede prometer que el arrepentimiento no existe: si todavía no lo
   descargó, corre completo. Decir lo contrario es lo que vuelve abusiva la
   cláusula entera. */
check("CON-B", /10 d[ií]as/.test(consentimiento),
  "y aclara que sin descargar sí se puede arrepentir dentro de los 10 días");

/* La casilla arranca apagada. Una casilla premarcada no es consentimiento. */
check("CON-C", /useState\(false\)/.test(formulario) && /type="checkbox"/.test(formulario),
  "la casilla del checkout existe y arranca apagada");

/* El botón no se prende sin ella, Y la función lo vuelve a mirar: un `disabled`
   se saca desde la consola en dos segundos. */
check("CON-D", /disabled=\{yendo \|\| !p\.puedeCobrar \|\| !acepto\}/.test(formulario) &&
  /if \(!acepto\)/.test(formulario),
  "el botón de pagar está apagado sin la casilla, y `pagar` la mira de nuevo");

/* ⚠️ EL FRENO DE VERDAD ESTÁ EN LA RUTA. Quien pega derecho contra la API no
   pasa por ninguna pantalla, y son justo esas compras las que después se
   discuten. Y compara contra `true` exacto: `"false"` y `1` son verdaderos. */
check("CON-E", /cuerpo\.acepto !== true/.test(sinComentarios(ruta)),
  "la ruta rechaza la compra sin consentimiento, comparando contra `true` exacto");

/* El texto lo elige el SERVIDOR. Si viajara en el cuerpo, la prueba sería un
   campo que cualquiera reescribe antes de mandarlo. */
const cuerpoAgregado = sinComentarios(gracias)
  .match(/body: JSON\.stringify\(\{[\s\S]{0,300}?\}\)/)?.[0] ?? "";
check("CON-F",
  /textoQueAcepto\(/.test(sinComentarios(ruta)) &&
  !/TEXTO_CONSENTIMIENTO/.test(cuerpoDelPedido) &&
  !/TEXTO_CONSENTIMIENTO/.test(cuerpoAgregado),
  "el texto que se guarda lo pone el servidor: el navegador sólo manda que aceptó");

/* Se guarda con la orden, y con las tres cosas: cuándo, desde dónde y qué. */
check("CON-G",
  /digitalConsentAt/.test(ruta) && /digitalConsentIp/.test(ruta) && /digitalConsentTexto/.test(ruta),
  "la orden guarda cuándo, desde qué IP y qué texto se aceptó");

/* El agregado tiene su PROPIO texto: lo que se acepta ahí es otra cosa —una
   segunda compra— y guardar el del checkout sería guardar una prueba de algo
   que esa persona no leyó. Por eso `textoQueAcepto(true, …)`. */
check("CON-H",
  /textoQueAcepto\(true,/.test(gracias) && /acepto: true/.test(cuerpoAgregado),
  "la oferta de después de pagar muestra su propio texto y lo manda aceptado");

/* ══════════════════════════════════════════════════════════════════════════
   LA GARANTÍA DEL VENDEDOR LE GANA AL ART. 1116, Y HAY QUE DECIRLO
   ══════════════════════════════════════════════════════════════════════════

   La página puede prometer "30 días o te devolvemos la plata", y el checkout lo
   muestra como sello. Con la casilla arriba, la misma pantalla decía las dos
   cosas. Y no es sólo feo: el art. 1116 arranca con "excepto pacto en
   contrario", así que prometer 30 días ES el pacto en contrario. */
check("CON-I",
  /export function textoQueAcepto\(esAgregado: boolean, diasDeGarantia: number \| null\)/.test(consentimiento) &&
  /garant[ií]a de \$\{dias\}/.test(consentimiento),
  "el texto que se acepta nombra la garantía del vendedor en vez de negarla");

/* Y el número sale de la MISMA función en los tres lugares. */
check("CON-J",
  /diasDeGarantia\(normalizarContenido\(producto\.paginaVenta\)\)/.test(ruta) &&
  /diasDeGarantia\(pagina\)/.test(pantalla),
  "el sello, el texto aceptado y la prueba guardada leen la misma función");

console.log(fallos === 0
  ? "\nok — la compra digital cobra lo que dice y no entrega lo que no se pagó"
  : `\nFALLA — ${fallos} chequeo(s) de la compra digital`);
process.exit(fallos === 0 ? 0 : 1);
