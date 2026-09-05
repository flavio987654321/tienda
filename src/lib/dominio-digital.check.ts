/**
 * Chequeos del dominio propio de cada producto digital.
 *
 *   npx tsx src/lib/dominio-digital.check.ts
 *
 * ── Qué se cuida acá ────────────────────────────────────────────────────────
 *
 * **Que nadie se lleve el dominio de otro.** Ni el nuestro, ni el apex de una
 * cuenta ajena. Un dominio anotado acá queda bloqueado para su dueño legítimo.
 *
 * **Que conectar sea de Pro y soltar sea de cualquiera.** Un candado que también
 * traba la salida no protege a nadie: el dominio lo compró y lo paga la persona.
 *
 * **Que las tres puntas se deshagan.** Base, Vercel y el captcha. Del lado de
 * tiendas Vercel se olvidaba, y cada dominio olvidado ocupa un lugar del techo
 * de 50 por proyecto del plan gratuito.
 */

import { readFileSync } from "fs";
import {
  validarDominio, normalizarDominio, esDominioPelado, dominioDeLaPlataforma,
} from "./configuracion-digital";
import { instruccionesDNS, A_DE_RESPALDO, CNAME_DE_RESPALDO } from "./dominio-digital";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const lib = readFileSync("src/lib/dominio-digital.ts", "utf8");
const ruta = readFileSync("src/app/api/digitales/productos/[id]/dominio/route.ts", "utf8");
const pantalla = readFileSync("src/app/digitales/productos/[id]/direccion/DominioPropio.tsx", "utf8");
const borrar = readFileSync("src/app/api/digitales/productos/[id]/route.ts", "utf8");
const mid = readFileSync("src/middleware.ts", "utf8");

/* ══════════════════════════════════════════════════════════════════════════
   LO QUE SE ACEPTA Y LO QUE NO
   ══════════════════════════════════════════════════════════════════════════ */

check("DOM-A",
  validarDominio("mecanicafacil.com") === null &&
  validarDominio("www.mecanicafacil.com") === null &&
  validarDominio("mi-tienda.com.ar") === null &&
  validarDominio("tortas.mecanicafacil.com") === null,
  "un dominio normal entra, con o sin www y con o sin subdominio");

/* La gente copia y pega de la barra del navegador. Retarla por eso es pedirle
   que entienda una diferencia que nunca le explicamos. */
check("DOM-B",
  normalizarDominio("  HTTPS://Mecanicafacil.com/gracias?x=1  ") === "mecanicafacil.com" &&
  normalizarDominio("http://mitienda.com.ar:3000/") === "mitienda.com.ar" &&
  normalizarDominio("mitienda.com.") === "mitienda.com",
  "se limpia el protocolo, la barra, el puerto y el punto final");

/* ⚠️ EL NUESTRO NO. Sería dejar que alguien se apropie de un pedazo de la
   plataforma, y encima con nuestro certificado dándole respaldo. */
const nuestro = dominioDeLaPlataforma();
check("DOM-C",
  validarDominio(nuestro) !== null &&
  validarDominio(`www.${nuestro}`) !== null &&
  validarDominio(`loquesea.${nuestro}`) !== null,
  "no se puede conectar nuestro propio dominio ni un subdominio nuestro");

/* Y el mensaje no dice "prohibido": dice que eso ya lo tiene. */
check("DOM-D",
  (validarDominio(`algo.${nuestro}`) ?? "").includes("ya la tenés"),
  "el motivo explica que esa dirección ya la tiene, no reta");

check("DOM-E",
  validarDominio("") !== null &&
  validarDominio("localhost") !== null &&
  validarDominio("sinpunto") !== null &&
  validarDominio("192.168.0.1") !== null &&
  validarDominio("mitienda.local") !== null &&
  validarDominio("*.mitienda.com") !== null,
  "se rechazan el vacío, el sin punto, la IP, los que no salen a internet y los comodines");

check("DOM-F",
  validarDominio("-mala.com") !== null &&
  validarDominio("mala-.com") !== null &&
  validarDominio("mala..com") !== null &&
  validarDominio("mi tienda.com") !== null &&
  validarDominio("mitienda.c") !== null,
  "se rechazan los guiones colgando, los puntos dobles, los espacios y la terminación corta");

/* Un dominio con acento o en otro alfabeto no entra tal cual: el DNS no lo
   acepta. Se rechaza con un motivo entendible en vez de guardarlo roto. */
check("DOM-G",
  validarDominio("mecánica.com") !== null &&
  (validarDominio("mecánica.com") ?? "").includes("sin acento"),
  "un dominio con acento se rechaza diciendo por qué");

/* Y la forma que sí acepta el DNS —el punycode— entra. */
check("DOM-H", validarDominio("xn--mecnica-8za.com") === null,
  "la forma convertida de un dominio con acento sí entra");

check("DOM-I", typeof validarDominio(undefined) === "string" && typeof validarDominio(42) === "string",
  "lo que no es texto se rechaza sin explotar");

/* ⚠️ El largo se mide sobre lo ESCRITO, no sobre lo normalizado: el normalizador
   recorta a 253, así que medirlo después nunca da largo y se conectaría un
   dominio recortado que la persona nunca escribió. */
check("DOM-I2",
  validarDominio("a".repeat(300) + ".com") !== null &&
  (validarDominio("a".repeat(300) + ".com") ?? "").includes("largo"),
  "un texto larguísimo se rechaza en vez de recortarse y conectarse");

/* ══════════════════════════════════════════════════════════════════════════
   QUÉ HAY QUE CARGAR EN EL DNS
   ══════════════════════════════════════════════════════════════════════════ */

check("DOM-J",
  esDominioPelado("mitienda.com") && esDominioPelado("mitienda.com.ar") &&
  !esDominioPelado("www.mitienda.com") && !esDominioPelado("blog.mitienda.com.ar"),
  "se distingue el dominio pelado del subdominio, también en .com.ar");

/* El pelado va con una A —un CNAME en la raíz lo prohíbe el DNS— y el subdominio
   con un CNAME. Al revés no levanta nunca. */
check("DOM-K",
  instruccionesDNS("mitienda.com").tipo === "A" &&
  instruccionesDNS("www.mitienda.com").tipo === "CNAME",
  "el dominio pelado va con A y el subdominio con CNAME");

/* ⚠️ El nombre del registro es sólo la parte de adelante. Cargarlo entero es el
   error más común y deja el registro apuntando a `www.x.com.x.com`. */
check("DOM-L",
  instruccionesDNS("mitienda.com").nombre === "@" &&
  instruccionesDNS("www.mitienda.com").nombre === "www" &&
  instruccionesDNS("blog.mitienda.com.ar").nombre === "blog",
  "el nombre del registro es sólo la parte de adelante, no el dominio entero");

/* Los valores propios del proyecto ganan sobre los genéricos: Vercel le da a
   cada proyecto su propio CNAME. */
check("DOM-M",
  instruccionesDNS("mitienda.com", { a: "1.2.3.4" }).valor === "1.2.3.4" &&
  instruccionesDNS("www.mitienda.com", { cname: "abc.vercel-dns-017.com" }).valor === "abc.vercel-dns-017.com",
  "si Vercel contesta, mandan sus valores y no los de respaldo");

check("DOM-N",
  instruccionesDNS("mitienda.com").valor === A_DE_RESPALDO &&
  instruccionesDNS("www.mitienda.com").valor === CNAME_DE_RESPALDO &&
  instruccionesDNS("mitienda.com", { a: null }).valor === A_DE_RESPALDO &&
  instruccionesDNS("mitienda.com", { a: "" }).valor === A_DE_RESPALDO,
  "sin respuesta de Vercel van los de respaldo, y un valor vacío no pasa como bueno");

/* ══════════════════════════════════════════════════════════════════════════
   QUE NADIE SE LLEVE EL DE OTRO
   ══════════════════════════════════════════════════════════════════════════ */

const reservar = lib.slice(lib.indexOf("export async function conectarDominio"));

/* El candado va sobre el DOMINIO, y ANTES de mirar. Mirar antes del candado es
   no tener candado. */
check("DOM-O",
  /pg_advisory_xact_lock\(hashtext\(/.test(reservar) &&
  reservar.indexOf("pg_advisory_xact_lock") < reservar.indexOf("tx.store.findFirst"),
  "primero se toma el candado y después se mira, no al revés");

/* Las DOS tablas: una tienda y un producto comparten el espacio de dominios. */
check("DOM-P",
  /tx\.store\.findFirst\(\{ where: \{ customDomain: dominio \}/.test(reservar) &&
  /tx\.product\.findFirst\(\{\s*where: \{ dominioPropio: dominio/.test(reservar),
  "se mira la tabla de tiendas y la de productos, no una sola");

/* ⚠️ Y el APEX tampoco puede ser de otro: si alguien tiene `mitienda.com`, un
   tercero no puede anotar `blog.mitienda.com` y dejárselo bloqueado. */
check("DOM-Q",
  /bajoElApex\("customDomain", apex\)/.test(reservar) &&
  /bajoElApex\("dominioPropio", apex\)/.test(reservar) &&
  /NOT: \{ ownerId: antes\.store\.ownerId \}/.test(reservar),
  "el apex de otra cuenta queda bloqueado, y el propio no");

/* ⚠️ Y "termina en mitienda.com" NO alcanza: `evilmitienda.com` también termina
   así. Sin el punto, a esa persona se le rechazaría un dominio que es suyo. */
check("DOM-Q2",
  /\{ \[campo\]: apex \}/.test(lib) && /endsWith: `\.\$\{apex\}`/.test(lib),
  "un dominio que apenas se parece a otro no cuenta como subdominio suyo");

/* Del MISMO dueño sí: `mecanica.com` y `tortas.mecanica.com` en dos productos es
   exactamente el caso que Pro compra. */
check("DOM-R",
  /NOT: \{ store: \{ ownerId: antes\.store\.ownerId \} \}/.test(reservar),
  "un dueño puede repartir subdominios de su propio dominio entre sus productos");

/* El índice único es la última red por si dos transacciones se cruzaran igual. */
check("DOM-S", /=== "P2002"/.test(lib),
  "si el índice único salta igual, se contesta que está ocupado y no un error crudo");

/* ══════════════════════════════════════════════════════════════════════════
   LAS TRES PUNTAS
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ Si Vercel no lo acepta, se DESHACE la reserva. Un dominio anotado que nunca
   va a levantar es peor que ninguno: deja a la persona esperando y encima se lo
   bloquea a su dueño legítimo. */
check("DOM-T",
  /if \(!enVercel\.ok\) \{/.test(reservar) &&
  /data: \{ dominioPropio: antes\.dominioPropio \}/.test(reservar),
  "si Vercel rechaza el alta, la reserva se deshace");

/* El captcha SÍ es fail-soft: si Cloudflare no contesta, el dominio anda igual y
   lo único flojo es el captcha de esa página. */
check("DOM-U",
  reservar.indexOf("agregarDominioAVercel") < reservar.indexOf('syncTurnstileHostname(dominio, "add")'),
  "el captcha se sincroniza después de Vercel, y no bloquea");

/* ⚠️ Y al soltar se deshacen las tres. Del lado de tiendas Vercel se olvidaba y
   el dominio quedaba pegado al proyecto para siempre. */
const soltar = lib.slice(lib.indexOf("export async function desconectarDominio"));
check("DOM-V",
  /data: \{ dominioPropio: null \}/.test(soltar) &&
  /await quitarDominioDeVercel/.test(soltar) &&
  /syncTurnstileHostname\(antes\.dominioPropio, "remove"\)/.test(soltar),
  "desconectar lo saca de la base, de Vercel y del captcha");

/* ⚠️ El apex del captcha cubre TODOS sus subdominios, así que sacarlo cuando
   todavía hay otro colgando le apaga los formularios a un tercero. */
check("DOM-W",
  /if \(!\(await apexSigueEnUso\(/.test(soltar) &&
  /await apexSigueEnUso/.test(reservar),
  "no se saca el apex del captcha si todavía queda alguien usándolo");

/* ⚠️ El corte va hasta la función SIGUIENTE, no hasta el final del archivo. Con
   el resto adentro, el chequeo pasaba mirando código de otra función — el mismo
   error de recorte que ya se corrigió en otros seis chequeos. */
const apexEnUso = lib.slice(
  lib.indexOf("async function apexSigueEnUso"),
  lib.indexOf("function bajoElApex"),
);
check("DOM-X",
  /prisma\.store\.findFirst/.test(apexEnUso) && /prisma\.product\.findFirst/.test(apexEnUso),
  "para saber si el apex sigue en uso se miran las dos tablas");

/* Un producto borrado suelta su dominio: ocupa un lugar del techo de Vercel y la
   persona no lo puede apuntar a ningún otro lado mientras siga anotado. */
check("DOM-Y",
  /await desconectarDominio\(id\)/.test(borrar) &&
  borrar.indexOf("deletedAt: ahora") < borrar.indexOf("await desconectarDominio(id)"),
  "borrar un producto suelta su dominio, después de borrarlo");

/* Y no corta el borrado si falla: el producto ya está borrado y eso es lo que
   se pidió. */
check("DOM-Z",
  /no se pudo soltar el dominio al borrar/.test(borrar),
  "si el dominio no se puede soltar, el borrado igual se hizo y queda anotado");

/* ══════════════════════════════════════════════════════════════════════════
   QUIÉN PUEDE
   ══════════════════════════════════════════════════════════════════════════ */

const post = ruta.slice(ruta.indexOf("export async function POST"), ruta.indexOf("export async function DELETE"));
const del = ruta.slice(ruta.indexOf("export async function DELETE"));

check("DOM-AA",
  /store: \{ ownerId: userId \}/.test(ruta) && /rolDigital: "PRINCIPAL"/.test(ruta),
  "la ruta pide dueño y sólo atiende al producto principal");

check("DOM-AB",
  (ruta.match(/user\.role !== "DIGITAL"/g) ?? []).length >= 3,
  "los tres verbos piden una cuenta digital");

/* Conectar pide Pro Y AL DÍA. Sin lo segundo, una suscripción vencida seguía
   conectando dominios — el mismo agujero que ya se tapó del lado de tiendas. */
check("DOM-AC",
  /sub\.tier !== "PRO"/.test(ruta) && /!isSubscriptionActive\(sub\)/.test(ruta),
  "conectar pide plan Pro y con el pago al día");

check("DOM-AD",
  /await elPlanDeja\(user\.id\)/.test(post) && !/elPlanDeja/.test(del),
  "conectar pide plan; soltar no pide nada, porque el dominio es de la persona");

/* ⚠️ El freno va ANTES de todo: cada alta le pega a la API de Vercel, que tiene
   un tope de 100 por hora PARA TODO EL EQUIPO. Uno martillando el botón deja sin
   altas a todos los demás. */
check("DOM-AE",
  /checkRateLimit\(`dominio-digital:/.test(post) &&
  post.indexOf("checkRateLimit") < post.indexOf("await elPlanDeja"),
  "el freno va antes del plan y antes de tocar la base");

check("DOM-AF", /checkRateLimit\(`dominio-digital-baja:/.test(del),
  "soltar también tiene freno");

/* El motivo de "no sos Pro" dice qué SÍ tiene, no sólo qué no. */
check("DOM-AG",
  /sigue funcionando igual/.test(ruta),
  "al que no es Pro se le dice que su dirección de tiendaapps sigue andando");

/* ══════════════════════════════════════════════════════════════════════════
   EL MIDDLEWARE
   ══════════════════════════════════════════════════════════════════════════ */

/* Un dominio propio ahora puede ser de una tienda O de un producto. */
check("DOM-AH",
  /await donde\("host", host, request\)/.test(mid) && /await donde\("sub", slug, request\)/.test(mid),
  "el dominio propio y el subdominio pasan los dos por la misma consulta");

/* ⚠️ UNA TIENDA QUE YA ANDABA NO SE PUEDE ROMPER: si la consulta no contesta, se
   deja pasar igual que antes y la 404 de Next lo maneja. */
const hostBranch = mid.slice(mid.indexOf('await donde("host"'));
check("DOM-AI",
  hostBranch.indexOf("return NextResponse.next()") > hostBranch.indexOf("NextResponse.rewrite"),
  "si el dominio no resuelve, se deja pasar en vez de romper");

/* ══════════════════════════════════════════════════════════════════════════
   LA PANTALLA
   ══════════════════════════════════════════════════════════════════════════ */

/* ⚠️ LO QUE ESTA PANTALLA TIENE QUE DECIR: que tarda, y que no es culpa de
   nadie. Sin esto la persona carga el registro, ve un error, cree que lo hizo
   mal y lo vuelve a hacer — y lo rompe. */
check("DOM-AJ",
  /puede tardar un rato largo/.test(pantalla) && /No hace\s+falta que lo cargues de nuevo/.test(pantalla),
  "se avisa que el DNS tarda y que no hay que volver a cargarlo");

/* Y que la dirección de abajo no se apaga: el dominio se suma, no reemplaza. */
check("DOM-AK",
  (pantalla.match(/se suma, no la\s+reemplaza|se suma, no\s+reemplaza/g) ?? []).length >= 2,
  "se dice que el dominio se suma y no reemplaza a la dirección de siempre");

/* Doble clic con un ref: acá cada clic de más es un alta contra Vercel. */
check("DOM-AL", /enVuelo = useRef\(false\)/.test(pantalla),
  "el doble clic se frena con un ref");

/* Desconectar pregunta antes, y dice qué pasa. */
check("DOM-AM",
  /confirmando/.test(pantalla) && /deja de abrir tu página/.test(pantalla),
  "desconectar pregunta antes y explica qué se pierde");

/* "Todavía no preguntamos" no es lo mismo que "no pudimos": uno gira, el otro
   avisa. Con un solo booleano la pantalla mentía apenas cargaba. */
check("DOM-AN",
  /Fijándonos cómo va/.test(pantalla) && /No pudimos consultarlo ahora/.test(pantalla),
  "se distingue estar consultando de no haber podido consultar");

/* La pantalla no puede importar el archivo que trae Prisma. */
check("DOM-AO",
  !/from "@\/lib\/dominio-digital"/.test(pantalla),
  "la pantalla no importa el archivo que trae Prisma");

/* Sin Pro se dibuja el hueco, no se esconde: dice que la dirección tiene dos
   escalones y cuál es el de arriba. */
check("DOM-AP",
  /if \(!esPro\)/.test(pantalla) && /viene con el plan Pro/.test(pantalla),
  "sin Pro el lugar se dibuja apagado con el motivo escrito");

/* ⚠️ Y el plan de la pantalla es sólo para la vista: el que decide es la ruta.
   Una pantalla no es un permiso. */
const paginaDir = readFileSync("src/app/digitales/productos/[id]/direccion/page.tsx", "utf8");
check("DOM-AQ",
  /una pantalla no es un permiso|Una pantalla no es un permiso/.test(paginaDir) &&
  /sub\.tier === "PRO"/.test(paginaDir),
  "queda escrito que el plan de la pantalla no reemplaza al de la ruta");

/* La tarjeta muestra las DOS direcciones cuando hay dos: mostrar sólo el dominio
   haría pensar que la otra se apagó. */
const lista = readFileSync("src/app/digitales/productos/ProductosClient.tsx", "utf8");
check("DOM-AR",
  /p\.dominioPropio \|\| p\.slugDigital/.test(lista) && /\{p\.dominioPropio\}/.test(lista),
  "la tarjeta muestra el dominio y la dirección de siempre, no una sola");

console.log(fallos === 0
  ? "\nok — nadie se lleva el dominio de otro, y soltarlo deshace las tres puntas"
  : `\nFALLA — ${fallos} chequeo(s) del dominio propio`);
process.exit(fallos === 0 ? 0 : 1);
