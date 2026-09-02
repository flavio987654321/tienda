/**
 * Chequeos del embudo de Productos Digitales. Se corre a mano con:
 *
 *   npx tsx src/lib/productos-digitales.check.ts
 *
 * Acá vive la lógica que decide **qué se puede publicar y qué no**, y esa es la
 * decisión más cara de este ecosistema: un producto publicado sin archivo se
 * puede comprar y no se puede entregar. Se cobra la plata y no llega nada.
 *
 * Las tres funciones se prueban de verdad —se ejecutan— porque son puras: no
 * tocan la base ni la red.
 */

import {
  rolDe, topeDe, loQueFalta, validarCampos, imagenValida, PRECIO_MAXIMO, LARGO_TITULO, ROLES,
} from "./productos-digitales";
import { TOPES_DIGITALES, EBOOKS_IA_ARRANQUE } from "./planLimits";
import { TIERS_DIGITALES } from "./planes-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── El rol ───────────────────────────────────────────────────────────────── */

check("ROL-A", rolDe("PRINCIPAL") === "PRINCIPAL" && rolDe("BONO") === "BONO" && rolDe("UPSELL") === "UPSELL",
  "los tres roles que existen se reconocen");

/* El rol llega del navegador y decide dónde se guarda el producto. Con un cast,
   cualquier cadena entraría; con una clave heredada del prototipo, entraría algo
   que ni siquiera es un rol. Mismo criterio que `planDe`. */
check("ROL-B", ["", "principal", "constructor", "__proto__", "toString", "OTRO"].every((v) => rolDe(v) === null),
  "cualquier otra cosa devuelve null, nunca un rol por defecto");
check("ROL-C", [null, undefined, 3, {}, ["BONO"]].every((v) => rolDe(v) === null),
  "lo que no es texto tampoco pasa");

/* ── Los topes ────────────────────────────────────────────────────────────── */

/* ⚠️ El upsell de Free NO puede volver a cero. Estuvo así y era el único tope que
   jugaba en contra nuestra: en Free lo único que cobramos es el 8 % de comisión,
   y un upsell sube el ticket — o sea que sube esa comisión. */
check("TOPE-A", topeDe("FREE", "PRINCIPAL") === 1 && topeDe("FREE", "BONO") === 1 && topeDe("FREE", "UPSELL") === 1,
  "Free: 1 página de venta, 1 bono y 1 upsell — uno de cada cosa");
check("TOPE-B", topeDe("PRO", "PRINCIPAL") === 5 && topeDe("PRO", "BONO") === 5 && topeDe("PRO", "UPSELL") === 3,
  "Pro: 5 páginas, 5 bonos, 3 upsells");

/* ⚠️ El techo de arriba no puede volver a inflarse sin querer. Estuvo en 25, que
   no era generoso sino inerte: un tope que nadie toca no genera ni una mejora de
   plan, y encima dejaba una caída de plan imposible de resolver (20 páginas
   publicadas cayendo a 1). La competencia vende 1/2/3/5 en cuatro planes. */
check("TOPE-B2", topeDe("PRO", "PRINCIPAL") <= 10,
  "el techo de páginas sigue siendo un número que alguien puede alcanzar de verdad");

/* Las páginas de venta y los productos principales son EL MISMO número: cada
   principal tiene su página. Si algún día dejaran de coincidir, la pantalla
   estaría contando una cosa y el tope aplicando otra. */
check("TOPE-C", TIERS_DIGITALES.every((t) => topeDe(t, "PRINCIPAL") === TOPES_DIGITALES[t].paginas),
  "un producto principal es una página de venta, en los tres planes");

check("TOPE-D", TIERS_DIGITALES.every((t) => ROLES.every((r) => Number.isInteger(topeDe(t, r)) && topeDe(t, r) >= 0)),
  "ningún tope es negativo ni fraccionario");

/* ⚠️ La IA no puede tener más generaciones que lugares donde ponerlas: sería
   venderle a alguien algo que no va a poder usar, y pagarlo nosotros.

   El lugar NO son las páginas. **Un bono y un upsell también son ebooks** y
   también se generan —la competencia les pone el mismo botón de "Generar con
   IA"—, así que los lugares son `paginas × (1 principal + bonos + upsells)`.
   Escrito contra `paginas` a secas, este chequeo comparaba contra un número
   nueve veces más chico que el real, y el día que subiera `ebooksIA` iba a fallar
   pidiendo que se levanten las páginas, que es justo lo que no hay que hacer.

   Es una cota de cordura y no una cuenta exacta: `ebooksIA` es POR MES y los
   lugares son absolutos, así que en un año se generan más ebooks que lugares
   hay. Lo que caza es un número absurdo, no un desbalance fino. */
check("TOPE-E", TIERS_DIGITALES.every((t) => {
  const x = TOPES_DIGITALES[t];
  return x.ebooksIA <= x.paginas * (1 + x.bonos + x.upsells);
}), "la IA no tiene más generaciones que lugares donde ponerlas");

/* ── El lote de arranque ──────────────────────────────────────────────────── */

/* ⚠️ Free no lleva arranque, y no puede llevarlo por accidente: no cobra abono,
   así que ahí no hay ningún "primer cobro" con el cual entregarlo. Un arranque en
   Free sería el regalo de bienvenida de una cuenta que no da ni un dato. */
check("ARR-A", EBOOKS_IA_ARRANQUE.FREE === 0 && TOPES_DIGITALES.FREE.ebooksIA === 0,
  "Free no lleva arranque ni cupo mensual de ebooks: la IA le arma la cáscara");

/* El arranque es UN PRODUCTO ENTERO: el principal más sus bonos. De ahí salen el
   3 de Starter y el 6 de Pro, y no de un número redondo. */
for (const t of ["STARTER", "PRO"] as const) {
  const x = TOPES_DIGITALES[t];
  check(`ARR-B-${t}`, EBOOKS_IA_ARRANQUE[t] === 1 + x.bonos,
    `${t}: el arranque (${EBOOKS_IA_ARRANQUE[t]}) es un producto entero — el principal más sus ${x.bonos} bonos`);
}

/* Y nunca puede quedar por debajo del cupo mensual: un "lote de bienvenida" que
   da menos que un mes cualquiera no es un lote de bienvenida. */
check("ARR-C", (["STARTER", "PRO"] as const).every((t) => EBOOKS_IA_ARRANQUE[t] >= TOPES_DIGITALES[t].ebooksIA),
  "el arranque nunca da menos que un mes normal");

/* Pagar más nunca puede dar menos. Es el argumento de venta de toda la pantalla
   de planes: si alguna vez se invirtiera, estaríamos cobrando por quitar. */
check("TOPE-F", ROLES.every((r) => topeDe("FREE", r) <= topeDe("STARTER", r) && topeDe("STARTER", r) <= topeDe("PRO", r)),
  "los topes suben de Free a Starter a Pro, nunca bajan");

/* ── Qué falta para publicar ──────────────────────────────────────────────── */

const listo = { rolDigital: "PRINCIPAL", archivoPath: "supabase://x/y.pdf", price: 100, name: "Guía" };

check("PUB-A", loQueFalta(listo) === null, "con título, archivo y precio se puede publicar");

/* EL chequeo que justifica todo el archivo. Sin archivo no hay nada que
   entregar, y publicarlo igual es cobrar por nada. */
check("PUB-B", loQueFalta({ ...listo, archivoPath: null }) !== null,
  "sin archivo NO se puede publicar");
check("PUB-C", (loQueFalta({ ...listo, archivoPath: null }) ?? "").toLowerCase().includes("archivo"),
  "y el motivo nombra el archivo, para que se sepa qué hacer");

check("PUB-D", loQueFalta({ ...listo, price: 0 }) !== null, "un producto principal sin precio tampoco");
check("PUB-E", loQueFalta({ ...listo, name: "   " }) !== null, "ni uno sin título");

/* Un bono va gratis por definición: pedirle precio lo dejaría sin poder
   publicarse nunca. Pero el archivo se le exige igual —también se entrega—. */
check("PUB-F", loQueFalta({ ...listo, rolDigital: "BONO", price: 0 }) === null,
  "un bono SÍ se publica con precio 0: es un regalo");
check("PUB-G", loQueFalta({ rolDigital: "BONO", archivoPath: null, price: 0, name: "Checklist" }) !== null,
  "pero un bono sin archivo tampoco se publica: también hay que entregarlo");

/* El orden importa: lo primero que se nombra es lo que hace imposible la venta,
   no lo que la hace incobrable. */
check("PUB-H", (loQueFalta({ ...listo, archivoPath: null, price: 0 }) ?? "").toLowerCase().includes("archivo"),
  "faltando las dos cosas, primero se nombra el archivo");

/* ── Los campos ───────────────────────────────────────────────────────────── */

check("CAMPO-A", validarCampos({ name: "Guía de mecánica", price: 100 }, "PRINCIPAL") === null,
  "un producto normal pasa");

check("CAMPO-B", validarCampos({ name: "a" }, "PRINCIPAL") !== null, "un título de una letra no");
check("CAMPO-C", validarCampos({ name: "x".repeat(LARGO_TITULO + 1) }, "PRINCIPAL") !== null,
  "ni uno más largo que el tope");

/* Los tres valores que rompen una comparación sin que nadie se entere. `NaN` es
   el peor: pasa cualquier `>` y `<`, y aparece recién en el total del pedido. */
check("CAMPO-D", validarCampos({ price: Number.NaN }, "PRINCIPAL") !== null, "NaN no es un precio");
check("CAMPO-E", validarCampos({ price: Number.POSITIVE_INFINITY }, "PRINCIPAL") !== null, "infinito tampoco");
check("CAMPO-F", validarCampos({ price: -1 }, "PRINCIPAL") !== null, "ni un precio negativo");
check("CAMPO-G", validarCampos({ price: PRECIO_MAXIMO + 1 }, "PRINCIPAL") !== null,
  "ni uno por arriba del tope (un cero de más al escribir)");
check("CAMPO-H", validarCampos({ price: PRECIO_MAXIMO }, "PRINCIPAL") === null,
  "el borde exacto del tope sí entra");

check("CAMPO-I", validarCampos({ price: 1 }, "BONO") !== null, "un bono con precio se rechaza");
check("CAMPO-J", validarCampos({ price: 0 }, "BONO") === null, "un bono en 0 pasa");

/* Un "antes" más barato que el "ahora" deja en pantalla un número tachado más
   chico que el que se cobra. No es un error de dibujo: es publicidad engañosa. */
check("CAMPO-K", validarCampos({ price: 1000, comparePrice: 900 }, "PRINCIPAL") !== null,
  "el precio original no puede ser MENOR que el de venta");
check("CAMPO-L", validarCampos({ price: 1000, comparePrice: 1000 }, "PRINCIPAL") !== null,
  "ni igual: un descuento de cero no es un descuento");
check("CAMPO-M", validarCampos({ price: 1000, comparePrice: 2000 }, "PRINCIPAL") === null,
  "mayor sí");
check("CAMPO-N", validarCampos({ price: 1000, comparePrice: null }, "PRINCIPAL") === null,
  "y es opcional: sin precio original también pasa");

/* Un campo que NO vino no se valida: la edición manda sólo lo que cambió, y
   exigirlo todo obligaría a reenviar el producto entero en cada toque. */
check("CAMPO-Ñ", validarCampos({ description: "hola" }, "PRINCIPAL") === null,
  "los campos que no vinieron no se exigen");

check("CAMPO-O", (validarCampos({ name: "a" }, "PRINCIPAL") ?? "").length > 10,
  "los errores vuelven explicados en castellano, no como un código");

/* ── La portada ───────────────────────────────────────────────────────────── */

/* La dirección de la imagen llega del navegador y termina adentro de un `<img>`
   en la página de venta, que abre cualquiera. Si se aceptara una url ajena,
   cada visita le avisaría a un servidor de un tercero quién entró y cuándo: un
   rastreador puesto por otro adentro de nuestra página. */
check("IMG-A", imagenValida("/uploads/abc123.png"), "lo que guarda /api/upload en local entra");
check("IMG-B", !imagenValida("https://rastreador.example.com/pixel.png"),
  "una dirección de otro servidor NO entra");
check("IMG-C", !imagenValida("//rastreador.example.com/x.png"),
  "ni una que arranca con dos barras, que el navegador resuelve como externa");
check("IMG-D", !imagenValida("javascript:alert(1)"), "ni algo que no es una dirección");
check("IMG-E", [null, undefined, 5, {}, ""].every((v) => !imagenValida(v)),
  "ni lo que directamente no es texto");
check("IMG-F", !imagenValida("/uploads/" + "x".repeat(600)),
  "ni una dirección absurdamente larga");

console.log(fallos === 0
  ? "\nok — el embudo de Productos Digitales se sostiene"
  : `\nFALLA — ${fallos} chequeo(s) del embudo`);
process.exit(fallos === 0 ? 0 : 1);
