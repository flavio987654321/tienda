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
  rolDe, topeDe, loQueFalta, validarCampos, imagenValida, porQueNoSePublica, lasQueSobran,
  PRECIO_MAXIMO, LARGO_TITULO, ROLES,
} from "./productos-digitales";
import { readFileSync } from "node:fs";
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

/* ⚠️ El arranque son DOS PRODUCTOS ENTEROS: el principal más sus bonos, por dos.
   De ahí salen el 6 de Starter y el 12 de Pro, y no de un número redondo.

   Era uno solo hasta el 08/09/26, y se duplicó por lo que este mismo archivo ya
   decía y no se estaba aplicando: **el embudo se arma una vez y después se
   vende**. El mes 1 se necesita todo y el mes 6 no se necesita nada, así que la
   generosidad va acá y no en el cupo mensual — que fue la primera idea y estaba
   mal: un tope mensual que nadie alcanza es inerte, y el que sí lo alcanza no
   está armando un negocio, está cosechando ebooks para vender afuera. */
for (const t of ["STARTER", "PRO"] as const) {
  const x = TOPES_DIGITALES[t];
  check(`ARR-B-${t}`, EBOOKS_IA_ARRANQUE[t] === 2 * (1 + x.bonos),
    `${t}: el arranque (${EBOOKS_IA_ARRANQUE[t]}) son dos productos enteros — el principal más sus ${x.bonos} bonos, por dos`);
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

const listo = {
  rolDigital: "PRINCIPAL", archivoPath: "supabase://x/y.pdf", price: 100, name: "Guía",
  cobroConectado: true,
};

check("PUB-A", loQueFalta(listo) === null, "con título, archivo, precio y cobro se puede publicar");

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
check("PUB-G", loQueFalta({ rolDigital: "BONO", archivoPath: null, price: 0, name: "Checklist", cobroConectado: true }) !== null,
  "pero un bono sin archivo tampoco se publica: también hay que entregarlo");

/* El orden importa: lo primero que se nombra es lo que hace imposible la venta,
   no lo que la hace incobrable. */
check("PUB-H", (loQueFalta({ ...listo, archivoPath: null, price: 0 }) ?? "").toLowerCase().includes("archivo"),
  "faltando las dos cosas, primero se nombra el archivo");

/* ── Sin Mercado Pago no se publica (08/09/26) ─────────────────────────────
 *
 * ⚠️ ESTA ES LA RED QUE PERMITE SACAR EL COBRO DE LA PUERTA DEL PANEL.
 *
 * Ese día Mercado Pago dejó de pedirse para ENTRAR —la pantalla donde se
 * conecta vive adentro del panel, así que la puerta escondía el lugar donde se
 * arregla, y el reloj de los siete días de prueba corría igual—. A cambio, la
 * red se movió acá: se puede armar todo, pero **no poner a la vista una página
 * que no puede cobrar**. Sin esto, alguien mete esa página en un anuncio y la
 * plata de la publicidad se va contra un botón que contesta "probá más tarde".
 *
 * Si estos chequeos caen, el cambio de la puerta quedó sin su red. Ver
 * `PASOS_DE_ADENTRO` en `primeros-pasos`. */
check("PUB-I", loQueFalta({ ...listo, cobroConectado: false }) !== null,
  "sin Mercado Pago conectado NO se puede publicar");

/* El motivo tiene que decir DÓNDE se arregla: es el único de los cuatro que no
   se resuelve en la pantalla donde aparece el cartel. */
const sinCobro = loQueFalta({ ...listo, cobroConectado: false }) ?? "";
check("PUB-J",
  /mercado pago/i.test(sinCobro) && /configuraci/i.test(sinCobro) && /pagos/i.test(sinCobro),
  "y el motivo nombra Mercado Pago y en qué pantalla se conecta");

/* Un bono también: va adentro de la misma compra, así que si esa compra no se
   puede cobrar, el bono tampoco se publica. */
check("PUB-K", loQueFalta({ ...listo, rolDigital: "BONO", price: 0, cobroConectado: false }) !== null,
  "un bono sin cobro conectado tampoco se publica");

/* Y es el ÚLTIMO de los cuatro, no el primero: sin archivo se cobra y no se
   entrega —eso lastima a alguien—; sin cobro, simplemente no entra un peso. */
check("PUB-L",
  (loQueFalta({ ...listo, archivoPath: null, cobroConectado: false }) ?? "").toLowerCase().includes("archivo"),
  "faltando el archivo y el cobro, primero se nombra el archivo");

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

/* ── La segunda puerta del tope: lo publicado ────────────────────────────── */

/* Crear ya cuenta contra el plan, pero una cuenta que CAYÓ de plan tiene más
   productos que los que le tocan, y lo único que la mantiene dentro del plan es
   que no pueda publicar uno más si ya hay tantos publicados como permite. Sin
   esto, el cron despublica de noche y ella vuelve a publicar de día. */
check("PUB-A", porQueNoSePublica("PRINCIPAL", 0, "FREE") === null,
  "con lugar, se publica");
check("PUB-B", porQueNoSePublica("PRINCIPAL", TOPES_DIGITALES.FREE.paginas, "FREE") !== null,
  "con tantos publicados como permite el plan, no");
check("PUB-C", porQueNoSePublica("PRINCIPAL", TOPES_DIGITALES.FREE.paginas + 3, "FREE") !== null,
  "y con más todavía —la cuenta que cayó— tampoco");
check("PUB-D", porQueNoSePublica("PRINCIPAL", TOPES_DIGITALES.PRO.paginas - 1, "PRO") === null
  && porQueNoSePublica("PRINCIPAL", TOPES_DIGITALES.PRO.paginas, "PRO") !== null,
  "mira el tope del plan que se le pasa, no siempre el de Free");
check("PUB-E", porQueNoSePublica("BONO", TOPES_DIGITALES.FREE.bonos, "FREE") !== null
  && porQueNoSePublica("UPSELL", TOPES_DIGITALES.FREE.upsells, "FREE") !== null,
  "los bonos y los upsells tienen su propio tope, por producto");
/* El texto dice qué hacer y no sólo qué pasó: se muestra tal cual en el botón
   apagado, y "llegaste al tope" a secas deja a la persona sin saber que
   despublicar otro es la salida. */
const textoTope = porQueNoSePublica("PRINCIPAL", 5, "FREE") ?? "";
check("PUB-F", /Despublic/.test(textoTope) && /Free/.test(textoTope),
  "el motivo dice qué hacer y nombra el plan");
check("PUB-G", /permite 1 página de venta publicada/.test(textoTope),
  "y cuenta en singular cuando el tope es uno");

/* ── Cuáles se apagan cuando hay de más ──────────────────────────────────── */

const dia = (n: number) => new Date(2026, 0, n);
const publicadas = [
  { id: "b", createdAt: dia(2), ventas: 0 },
  { id: "a", createdAt: dia(1), ventas: 0 },
  { id: "c", createdAt: dia(3), ventas: 7 },
  { id: "d", createdAt: dia(4), ventas: 2 },
];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join(",");

check("SOBRA-A", ids(lasQueSobran(publicadas, 1)) === "d,a,b",
  "con tope 1 queda la que más vendió y sobran las demás");
check("SOBRA-B", ids(lasQueSobran(publicadas, 2)) === "a,b",
  "con tope 2 quedan las dos que vendieron");
/* A igual venta, la más vieja se queda: entre las que no vendieron nada, la
   primera que armó es la principal casi siempre. */
check("SOBRA-C", ids(lasQueSobran(publicadas, 3)) === "b",
  "a igual venta se queda la más antigua");
check("SOBRA-D", lasQueSobran(publicadas, 4).length === 0 && lasQueSobran(publicadas, 10).length === 0,
  "con lugar para todas no sobra ninguna");
check("SOBRA-E", ids(lasQueSobran(publicadas, 0)) === "c,d,a,b",
  "con tope cero sobran todas, ordenadas de la que más vendió a la que menos");
/* Dos corridas con los mismos datos apagan las mismas: el `id` desempata al
   final, y no el orden en que llegaron de la base. */
const alReves = [...publicadas].reverse();
check("SOBRA-F", ids(lasQueSobran(alReves, 1)) === ids(lasQueSobran(publicadas, 1)),
  "no depende del orden en que llegan");
const empatadas = [
  { id: "y", createdAt: dia(1), ventas: 0 },
  { id: "x", createdAt: dia(1), ventas: 0 },
];
check("SOBRA-G", ids(lasQueSobran(empatadas, 1)) === "y",
  "y a igual fecha desempata el id");
check("SOBRA-H", ids(publicadas) === "b,a,c,d",
  "no reordena la lista que recibe");

/* ── Y las dos puertas están puestas ─────────────────────────────────────── */

/* La ruta que publica cuenta los publicados del grupo EN LA BASE y le pregunta
   a la misma función. Y lo hace sólo al pasar de borrador a publicado: guardar
   un precio en uno que ya está publicado no se corta por el tope. */
const rutaEditar = readFileSync("src/app/api/digitales/productos/[id]/route.ts", "utf8");
check("PUB-H",
  /if \(publicado === true && !actual\.isActive\) \{[\s\S]{0,900}isActive: true,[\s\S]{0,300}porQueNoSePublica\(rol, publicados, tier\)/.test(rutaEditar)
  && /if \(sinLugar\) return NextResponse\.json\(\{ error: sinLugar \}, \{ status: 409 \}\)/.test(rutaEditar),
  "la ruta de publicar cuenta los publicados en la base y corta con 409");
check("PUB-I",
  /\.\.\.\(rol === "PRINCIPAL" \? \{\} : \{ padreId: actual\.padreId \}\)/.test(rutaEditar),
  "y para un bono o un upsell cuenta sólo los hermanos de su producto");

/* El cron, en la misma vuelta que escribe la caída, apaga las de más y manda el
   mail. Y si apagar falla, el estado ya cayó y el aviso sale igual. */
const cron = readFileSync("src/app/api/cron/daily/route.ts", "utf8");
check("CAIDA-A",
  /data: caidaAFree\(now\),[\s\S]{0,1500}despublicarLasDeMas\(storeId, "FREE"\)/.test(cron),
  "el cron apaga las páginas de más justo después de escribir la caída");
check("CAIDA-B",
  /try \{\s*const r = await despublicarLasDeMas\([\s\S]{0,300}\} catch \(e\) \{[\s\S]{0,400}console\.error\("\[cron\] no se pudieron despublicar/.test(cron),
  "si apagar falla, queda escrito y el aviso sale igual");
check("CAIDA-C",
  /sendCaidaAFreeEmail\(\{[\s\S]{0,600}despublicadas: apagado\?\.despublicadas/.test(cron),
  "el mail lleva lo que se apagó");
check("CAIDA-D",
  /body: `Tu cuenta sigue abierta[\s\S]{0,400}\$\{cuales\}/.test(cron),
  "y el aviso de adentro del panel también nombra lo que se apagó");

/* La pantalla apaga el botón con el MISMO motivo que devuelve el servidor, y
   el ejemplo (`deMentira`) no lo dispara nunca. */
const panel = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
check("PUB-J",
  /sinLugarPara = \(p: ProductoEnPantalla\) => \{[\s\S]{0,400}porQueNoSePublica\(p\.rol, publicados, tier\)/.test(panel)
  && /h\.publicado && h\.id !== p\.id/.test(panel),
  "la pantalla cuenta los publicados del grupo sin contar al que se quiere publicar");
check("PUB-K",
  /disabled=\{apagado \|\| \(!p\.publicado && \(falta !== null \|\| sinLugar !== null\)\)\}/.test(panel),
  "y el botón de publicar se apaga por el tope igual que por lo que falta");

console.log(fallos === 0
  ? "\nok — el embudo de Productos Digitales se sostiene"
  : `\nFALLA — ${fallos} chequeo(s) del embudo`);
process.exit(fallos === 0 ? 0 : 1);
