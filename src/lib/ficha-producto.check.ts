/**
 * Chequeo de la ficha de producto. Se corre a mano:
 *
 *   npx tsx src/lib/ficha-producto.check.ts
 *
 * Cuida dos cosas que se rompieron juntas y que nadie ve hasta que ya pasó,
 * porque las dos salen bien en una tienda SIN promociones puestas — que es como
 * se prueba casi siempre.
 *
 * ── 1. Las cuotas se sacan del precio que se cobra ───────────────────────────
 * El precio grande usaba el precio con la promo y el renglón de las cuotas
 * dividía el de lista. Con un 20% puesto, la ficha decía:
 *
 *     $ 190.000  20%OFF
 *     $ 152.000                         ← lo que se cobra
 *     3 cuotas sin interés de $ 63.333  ← × 3 = 190.000, el precio VIEJO
 *
 * Las cuotas sumaban más que el precio, dos renglones abajo del precio. Estaba
 * así en los ocho templates de una sola vez, porque el cuerpo de la ficha es
 * compartido.
 *
 * Y encima el número salía `$ 63.333,333`: `toLocaleString` sin opciones trae
 * TRES decimales de fábrica. Casi nada llega con decimales acá —`pricing.ts`
 * redondea a peso entero en `roundMoney`— pero la cuota se divide en el mismo
 * renglón que se dibuja, y ninguna división cae redonda.
 *
 * ── 2. El link que se comparte es una dirección de verdad ────────────────────
 * Cuatro templates copiaban `<la pantalla donde estoy>?p=<id>`. Esa dirección la
 * entiende el navegador, no el servidor: pegada en WhatsApp, la vista previa la
 * arma el chat pidiéndole la página al servidor, y ahí el servidor contesta la
 * PORTADA. El link de un vestido salía con la foto y el nombre de la tienda.
 *
 * Los dos son estáticos —miran el código, no lo corren— porque lo que hay que
 * atar vive adentro de componentes de React que no se pueden llamar sueltos. Si
 * alguien mueve estas líneas de lugar el chequeo va a fallar sin que haya un
 * bug: leer el mensaje y actualizar el patrón es parte del trabajo, y es
 * barato al lado de que la cuenta se separe otra vez en silencio.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { urlParaCompartirProducto } from "../components/store/templates/shared/useVistaTemplate";

const RAIZ = join(__dirname, "..", "..");
const leer = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");

let fallos = 0;
const chequear = (titulo: string, condicion: boolean, detalle?: unknown) => {
  if (condicion) console.log(`  ok    ${titulo}`);
  else { fallos++; console.log(`  FALLA ${titulo}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};

/* ── 1. El cuerpo compartido de la ficha ─────────────────────────────────────*/

console.log("1) Las cuotas salen del precio que el comprador paga");

const CUERPO = "src/components/store/templates/productDetail/shared.tsx";
const cuerpo = leer(CUERPO);

/* El precio unitario con la promo aplicada tiene que estar UNA vez y con nombre.
   Estaba escrito dos veces —el total del botón y las cuotas— y una de las dos se
   quedó vieja. */
chequear(
  "hay un solo precio unitario con la promo aplicada, y tiene nombre",
  /const precioUnitarioReal = promo\.hasPriceDrop \? promo\.effectivePrice : displayPrice;/.test(cuerpo),
  "no encontré `const precioUnitarioReal = promo.hasPriceDrop ? promo.effectivePrice : displayPrice`",
);

chequear(
  "la cuota divide ese precio y no el de lista",
  /cuotas sin interés de \{fmtPrice\(precioUnitarioReal \/ product\.cuotas/.test(cuerpo),
  "el renglón de las cuotas no está dividiendo `precioUnitarioReal`",
);

/* La forma que tenía el bug: dividir `displayPrice`, que es el precio SIN promo. */
chequear(
  "no quedó ninguna cuenta dividiendo `displayPrice` por las cuotas",
  !/displayPrice \/ product\.cuotas/.test(cuerpo),
  "volvió `displayPrice / product.cuotas`: eso ignora la promo",
);

console.log("\n2) La plata no se escribe con decimales");

chequear(
  "`fmtPrice` corta los decimales",
  /toLocaleString\("es-AR", \{ maximumFractionDigits: 0 \}\)/.test(cuerpo),
  "`fmtPrice` volvió a `toLocaleString(\"es-AR\")` a secas: eso imprime TRES decimales",
);

/* Y la prueba de que hacía falta, con el número real que salía en amaranta. */
const conDecimales = (190000 / 3).toLocaleString("es-AR");
const sinDecimales = (190000 / 3).toLocaleString("es-AR", { maximumFractionDigits: 0 });
chequear(
  `sin la opción sale "${conDecimales}" y con ella "${sinDecimales}"`,
  conDecimales.includes(",") && !sinDecimales.includes(","),
  { conDecimales, sinDecimales },
);

/* ── 2. El link para compartir ───────────────────────────────────────────────*/

console.log("\n3) Ningún template reparte un link `?p=`");

/* Los cuatro que lo tenían escrito a mano. Se listan por nombre y no se buscan
   por patrón: si mañana aparece un quinto template con el mismo error, que este
   chequeo no lo encuentre es esperable; que deje de mirar a estos cuatro
   porque alguien renombró un archivo, no. */
const TEMPLATES = ["Aurora", "BohoTerra", "ChicParis", "UrbanPulse"];

for (const t of TEMPLATES) {
  const rel = `src/components/store/templates/${t}.tsx`;
  const src = leer(rel);

  /* Lo que se prohíbe es ARMAR el link, que es lo que se copia al portapapeles.
     LEER el `?p=` sigue estando bien y tiene que seguir: los links viejos que ya
     andan dando vueltas tienen que abrir el producto igual. */
  const arma = /`\$\{window\.location\.origin\}\$\{window\.location\.pathname\}\?p=\$\{product\.id\}`/.test(src);
  chequear(`${t}: no arma un link \`?p=\` para compartir`, !arma,
    arma ? "volvió el `?p=` en `shareProduct`" : undefined);

  chequear(`${t}: comparte con \`urlParaCompartirProducto\``,
    /navigator\.clipboard\.writeText\(urlParaCompartirProducto\(/.test(src));

  /* La otra mitad: que siga entendiendo los links viejos. */
  chequear(`${t}: sigue abriendo los \`?p=\` que ya existen`,
    /URLSearchParams\(window\.location\.search\)\.get\("p"\)/.test(src));
}

console.log("\n4) El helper arma la dirección que contesta el servidor");

/* `urlParaCompartirProducto` lee `window.location`, así que hay que ponerle uno.
   Es lo único que necesita: no toca el DOM. */
(globalThis as { window?: unknown }).window = {
  location: { origin: "https://www.tiendaapps.com", pathname: "/tienda/amaranta/productos" },
};


const conSlug = urlParaCompartirProducto("amaranta", "cmqn25z7j00013jy8x1voyl0i");
chequear("con slug, la dirección es la de la ficha",
  conSlug === "https://www.tiendaapps.com/tienda/amaranta/producto/cmqn25z7j00013jy8x1voyl0i", conSlug);

/* Y no arrastra la pantalla donde estaba parada la visitante: desde el catálogo
   salía `/tienda/amaranta/productos?p=id`. */
chequear("no arrastra el `/productos` de donde se tocó compartir",
  !conSlug.includes("/productos"), conSlug);

/* Sin slug —la galería suelta `/preview/<template>`, sin tienda detrás— no hay
   dirección que armar y queda el `?p=`, que ahí adentro abre lo que corresponde. */
const sinSlug = urlParaCompartirProducto(null, "abc123");
chequear("sin slug cae al `?p=`, que adentro de la previa sí sirve",
  sinSlug === "https://www.tiendaapps.com/tienda/amaranta/productos?p=abc123", sinSlug);

console.log(fallos === 0
  ? "\nTodo bien: las cuotas siguen al precio y el link compartido es una dirección de verdad.\n"
  : `\n${fallos} chequeo(s) fallando.\n`);
process.exit(fallos === 0 ? 0 : 1);
