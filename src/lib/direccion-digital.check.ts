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
  /return `\/p\/\$\{producto\}`/.test(mid) && /return `\/tienda\/\$\{slug\}`/.test(mid),
  "el subdominio sabe llevar a una tienda o a un producto");

/* La tienda primero: es lo que ya funcionaba. Los dos no pueden coexistir —lo
   impide el candado— pero si algún día coexistieran, que gane lo viejo. */
check("DIR-R",
  mid.indexOf("if (slug) return") < mid.indexOf("if (producto) return"),
  "ante la duda gana la tienda, que es lo que ya andaba");

/* Y la consulta va con cache: sin ella sería una consulta a la base por visita. */
check("DIR-S", /revalidate: 300/.test(mid),
  "la consulta del subdominio va cacheada");

console.log(fallos === 0
  ? "\nok — un nombre no se lo pueden llevar dos, y las tiendas siguen andando"
  : `\nFALLA — ${fallos} chequeo(s) de la dirección del producto`);
process.exit(fallos === 0 ? 0 : 1);
