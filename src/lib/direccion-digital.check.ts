/**
 * Chequeos de la dirección propia de cada producto digital.
 *
 *   npx tsx src/lib/direccion-digital.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * **Un nombre no se lo pueden llevar dos.** `mecanica.tiendaapps.com` puede ser
 * una tienda o un producto, y viven en tablas distintas — así que ningún índice
 * único los ve a los dos. Lo garantiza un candado, y el orden importa: mirar
 * antes de tomarlo es no tener candado.
 *
 * **Y una tienda que ya andaba no se puede romper.** El subdominio antes no
 * preguntaba nada. Ahora pregunta, y si la consulta falla tiene que seguir
 * haciendo exactamente lo de antes.
 */

import { readFileSync } from "fs";
import {
  proponerSlug, direccionDelProducto, dominioDeLaPlataforma,
} from "./direccion-digital";
import { SLUGS_RESERVADOS, validarSlug } from "./configuracion-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const lib = readFileSync("src/lib/direccion-digital.ts", "utf8");
const api = readFileSync("src/app/api/public/dominio/route.ts", "utf8");
const mid = readFileSync("src/middleware.ts", "utf8");
const esquema = readFileSync("prisma/schema.prisma", "utf8");

/* ── Las reglas del nombre ──────────────────────────────────────────────── */

/* ⚠️ LAS MISMAS REGLAS QUE LAS TIENDAS, leídas del mismo archivo. Si acá
   hubiera una segunda copia, se desincronizan de a una — y la que queda vieja
   es la que deja pasar un nombre reservado. */
check("DIR-A",
  /from "@\/lib\/configuracion-digital"/.test(lib) &&
  !/SLUGS_RESERVADOS = \[/.test(lib),
  "las reglas del nombre se leen de un solo lado, no se copian");

check("DIR-B", proponerSlug("Mis Guías de Mecánica") === "mis-guias-de-mecanica",
  "el nombre propuesto sale del título, normalizado");

check("DIR-C", SLUGS_RESERVADOS.every((r) => validarSlug(r) !== null),
  "las palabras reservadas siguen rechazándose");

check("DIR-D", direccionDelProducto("mecanica").startsWith("https://mecanica."),
  "la dirección que se muestra es el subdominio del producto");

/* Sin `www` adentro de la dirección de un producto: `mecanica.www.tiendaapps.com`
   no existe. */
check("DIR-E", !dominioDeLaPlataforma().startsWith("www."),
  "el dominio de la plataforma va sin www");

/* ── El candado ─────────────────────────────────────────────────────────── */

/* ⚠️ EL ORDEN: primero el candado, después mirar si está libre, y recién ahí
   guardar. Mirar antes de tomarlo es no tener candado. */
check("DIR-F",
  lib.indexOf("pg_advisory_xact_lock") < lib.indexOf("tx.store.findFirst") &&
  lib.indexOf("tx.store.findFirst") < lib.indexOf("tx.product.update"),
  "se toma el candado, después se mira, y recién después se guarda");

/* El candado va sobre EL NOMBRE y no sobre la cuenta: dos personas peleando por
   el mismo nombre se hacen una después de la otra, y dos que piden nombres
   distintos no se estorban. */
check("DIR-G", /pg_advisory_xact_lock\(hashtext\(\$\{slug\}\)\)/.test(lib),
  "el candado se toma sobre el nombre, no sobre la cuenta");

/* Y mira LAS DOS tablas: el nombre lo pueden estar usando una tienda o un
   producto, porque el subdominio los traduce a los dos. */
check("DIR-H",
  /tx\.store\.findFirst/.test(lib) && /tx\.product\.findFirst/.test(lib),
  "se busca el nombre en las tiendas y en los productos");

/* El índice único es la última red por si dos transacciones se cruzaran igual. */
check("DIR-I", /P2002/.test(lib),
  "si el índice único salta igual, se contesta 'ya está en uso' y no un error crudo");

/* ⚠️ NO se busca un nombre alternativo al reservar. Cuando la persona escribió
   una dirección, darle otra parecida sin avisar es peor que decirle que pruebe
   con otra: se entera cuando ya la repartió. */
check("DIR-J",
  !/buscarSlugLibre/.test(lib.slice(lib.indexOf("export async function reservarSlug"))),
  "reservar no cambia por su cuenta la dirección que la persona escribió");

/* ── Las dos columnas ───────────────────────────────────────────────────── */

const producto = esquema.slice(esquema.indexOf("model Product "), esquema.indexOf("model ProductVariant"));
check("DIR-K",
  /slugDigital String\? @unique/.test(producto) && /dominioPropio String\? @unique/.test(producto),
  "el producto tiene su dirección y su dominio, los dos únicos");

/* ⚠️ El dominio NO se queda en `Store.customDomain`: esa columna es única por
   cuenta, o sea UNO. Pro tiene cinco productos y cada uno lleva el suyo. */
check("DIR-L", /uno por cuenta|@unique por cuenta/.test(producto),
  "queda escrito por qué el dominio cuelga del producto y no de la cuenta");

/* ── Quién contesta por una dirección ───────────────────────────────────── */

/* ⚠️ Sólo un PRINCIPAL PUBLICADO. Un bono no es una página que alguien visite
   —se entrega con la compra—, y despublicar tiene que apagar la puerta, no sólo
   sacar el producto de una lista. */
check("DIR-M",
  /rolDigital: "PRINCIPAL"/.test(api) && /isActive: true/.test(api) && /deletedAt: null/.test(api),
  "sólo contesta un producto principal, publicado y sin borrar");

check("DIR-N",
  (api.match(/rolDigital: "PRINCIPAL"/g) ?? []).length >= 2,
  "vale para el subdominio y también para el dominio propio");

/* El subdominio es una sola etiqueta: sin puntos y acotada. Sin esto, cualquier
   texto entra al `where` y a la respuesta cacheada. */
check("DIR-O",
  /sub\.length > 63/.test(api) && /\^\[a-z0-9-\]\+\$/.test(api),
  "el subdominio se valida antes de consultar");

/* ── El middleware ──────────────────────────────────────────────────────── */

/* ⚠️ UNA TIENDA QUE YA ANDABA NO SE PUEDE ROMPER. El subdominio antes no
   preguntaba nada; ahora pregunta, y si la consulta falla tiene que hacer
   exactamente lo de antes. */
check("DIR-P",
  /if \(destino\) \{/.test(mid) &&
  mid.indexOf("if (destino) {") < mid.indexOf("url.pathname = `/tienda/${slug}${pathname"),
  "si la consulta no contesta, el subdominio sigue yendo a la tienda como antes");

check("DIR-Q",
  /destino: `\/p\/\$\{producto\}`/.test(mid) && /destino: `\/tienda\/\$\{slug\}`/.test(mid),
  "el subdominio sabe llevar a una tienda o a un producto");

/* La tienda primero: es lo que ya funcionaba. Los dos no pueden coexistir —lo
   impide el candado— pero si algún día coexistieran, que gane lo viejo. */
check("DIR-R",
  mid.indexOf("if (slug) return") < mid.indexOf("if (producto) return"),
  "ante la duda gana la tienda, que es lo que ya andaba");

/* Y la consulta va con cache: sin ella sería una consulta a la base por visita. */
check("DIR-S", /revalidate: 300/.test(mid),
  "la consulta del subdominio va cacheada");

/* ── Las reglas de seguridad cuando se entra por el subdominio ──────────── */

/* ⚠️ ESTE CHEQUEO ES UN PASADOR, y vale la pena entender qué cuida.
 *
 * Las reglas de seguridad del navegador se eligen POR LA DIRECCIÓN: hay un juego
 * para `/tienda/…`, otro para `/p/…`, otro para `/dashboard`. Cuando alguien
 * entra por un subdominio, la dirección que ve esa regla es `/` a secas — así
 * que cae en el juego base, el más estricto, y NO en el de `/p/`.
 *
 * Hoy eso no rompe nada, y es por un motivo concreto: **el checkout digital no
 * carga el SDK de Mercado Pago, manda a Mercado Pago.** La persona se va del
 * sitio, paga allá y vuelve. Sin SDK en la página, no hace falta `unsafe-eval`,
 * que es lo único que el juego estricto no da.
 *
 * El día que ese checkout pase a cobrar EN la página —con el SDK embebido— la
 * página va a andar por `/p/<id>` y va a fallar por el subdominio, que es la
 * dirección que de verdad reparte la gente. Y va a fallar en producción, porque
 * en desarrollo `unsafe-eval` viene puesto igual.
 *
 * Si este chequeo se pone en rojo, lo que falta es una regla por HOST en
 * `next.config`, no sacar el chequeo. */
const checkout = readFileSync("src/app/p/[id]/pagar/CheckoutClient.tsx", "utf8");
check("DIR-T",
  /window\.location\.replace\(datos\.initPoint\)/.test(checkout),
  "el checkout digital manda a Mercado Pago en vez de cobrar en la página");

check("DIR-U",
  !/sdk\.mercadopago\.com/.test(checkout),
  "y no trae el SDK, que es lo que necesitaría reglas más flojas en el subdominio");

/* Y la contracara: la página de venta se deja enmarcar por nosotros para la
   previa del editor, pero eso pasa por `/p/<id>` adentro del panel. Por el
   subdominio llega el juego estricto, que no se deja enmarcar por nadie — más
   cerrado, no menos. Ahí no hay nada que aflojar. */
check("DIR-V",
  /frame-ancestors 'self'/.test(readFileSync("next.config.ts", "utf8")),
  "la página de venta se deja enmarcar sólo por nosotros, y sólo por su ruta");

/* ── La ruta y la pantalla ──────────────────────────────────────────────── */

const ruta = readFileSync("src/app/api/digitales/productos/[id]/direccion/route.ts", "utf8");
const pantalla = readFileSync("src/app/digitales/productos/[id]/direccion/DireccionClient.tsx", "utf8");
const crear = readFileSync("src/app/api/digitales/productos/route.ts", "utf8");

/* El dueño adentro del where, y sólo un PRINCIPAL: un bono no tiene dirección
   porque no es una página que alguien visite. */
check("DIR-W",
  /store: \{ ownerId: userId \}/.test(ruta) && /rolDigital: "PRINCIPAL"/.test(ruta),
  "la ruta pide dueño y sólo atiende al producto principal");

/* ⚠️ MIRAR NO RESERVA. El GET dice si está libre; el que se lo queda es el POST,
   con el candado adentro. Si el GET reservara, escribir en el campo iría
   dejando nombres tomados por cada tecla. */
check("DIR-X",
  !/reservarSlug/.test(ruta.slice(ruta.indexOf("export async function GET"), ruta.indexOf("export async function POST"))),
  "mirar si está libre no reserva nada");

/* El GET también pide dueño: sin eso sería una ventanilla abierta para
   preguntar por cualquier nombre de la plataforma. */
check("DIR-Y",
  (ruta.match(/user\.role !== "DIGITAL"/g) ?? []).length >= 2,
  "el GET y el POST piden los dos una cuenta digital");

/* Escribe y toma un candado de la base: va con freno aunque no cueste plata. */
check("DIR-Z", /checkRateLimit/.test(ruta),
  "guardar la dirección tiene freno");

/* ⚠️ LO QUE ESTA PANTALLA TIENE QUE DECIR: cambiar la dirección rompe los links
   ya repartidos. Es de lo poco acá que no se puede deshacer. */
check("DIR-AA",
  /la dirección de antes deja de funcionar/.test(pantalla),
  "se avisa que cambiar la dirección rompe los links repartidos");

/* Y el aviso aparece SÓLO cuando ya hay una puesta, que es cuando es verdad.
   Ponerla por primera vez no rompe nada, y el que avisa siempre no avisa nunca. */
check("DIR-AB",
  /\{guardado && \(/.test(pantalla),
  "el aviso aparece recién cuando ya hay una dirección puesta");

/* Doble clic con un ref: el estado se ve recién en el siguiente dibujo. */
check("DIR-AC",
  /enVuelo = useRef\(false\)/.test(pantalla),
  "el doble clic al guardar se frena con un ref");

/* Se espera a que pare de escribir: sin esto sale una consulta por tecla. */
check("DIR-AD",
  /setTimeout\(/.test(pantalla) && /clearTimeout\(t\)/.test(pantalla),
  "no se consulta una vez por tecla, se espera a que pare de escribir");

/* "Mis Guías" se guarda como "mis-guias", y eso hay que verlo ANTES de guardar. */
check("DIR-AE",
  /Se va a guardar como/.test(pantalla),
  "si lo escrito se normaliza, se muestra cómo va a quedar");

/* ⚠️ UNA PANTALLA NO PUEDE IMPORTAR EL ARCHIVO QUE TRAE PRISMA. Pasó al
   escribir esto: la lista de productos importó `direccion-digital` para dibujar
   el dominio y se llevaba Prisma al navegador. El dominio vive en
   `configuracion-digital`, que es puro. */
const lista = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
check("DIR-AF",
  !/from "@\/lib\/direccion-digital"/.test(lista) && !/from "@\/lib\/direccion-digital"/.test(pantalla),
  "ninguna pantalla importa el archivo que trae Prisma");

/* ── La dirección al crear el producto ──────────────────────────────────── */

/* Tiene que existir desde que el producto nace: una dirección que aparece más
   tarde es una dirección que cambia. */
check("DIR-AG",
  /if \(rol === "PRINCIPAL"\) \{/.test(crear) && /buscarSlugLibre/.test(crear),
  "un producto principal nace con su dirección");

/* ⚠️ AFUERA de la transacción que crea. Reservar el nombre toma su propio
   candado —sobre el nombre, no sobre la cuenta— y dos candados anidados que se
   piden en distinto orden son un abrazo mortal esperando. */
check("DIR-AH",
  /* Con "await": sin eso, indexOf encuentra el import del renglón 2 y la
     comparación da siempre "primero" sin haber mirado nada. Es la misma trampa
     que ya se corrigió en otros cinco chequeos el 04/09/26. */
  crear.indexOf("await prisma.$transaction") < crear.indexOf("await buscarSlugLibre") &&
  crear.indexOf("if (!creado)") < crear.indexOf("await buscarSlugLibre"),
  "la dirección se reserva después de cerrar la transacción que crea");

/* Y si falla no corta el pedido: el producto ya existe y está bien. Quedarse
   sin dirección no lo rompe — la tarjeta lo dice y hay un botón para elegirla. */
check("DIR-AI",
  /no se pudo reservar la dirección/.test(crear),
  "si la dirección falla, el producto igual se creó y se anota");

/* La tarjeta dice cuando falta, y con un botón que se ve. */
check("DIR-AJ",
  /Elegí tu dirección/.test(lista),
  "la tarjeta avisa cuando al producto le falta la dirección");

console.log(fallos === 0
  ? "\nok — un nombre no se lo pueden llevar dos, y las tiendas siguen andando"
  : `\nFALLA — ${fallos} chequeo(s) de la dirección del producto`);
process.exit(fallos === 0 ? 0 : 1);
