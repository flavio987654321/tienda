/**
 * Chequeos del precio de bienvenida. Se corre con:
 *
 *   npx tsx src/lib/bienvenida.check.ts
 *
 * Lo que importa: que el plazo sea de verdad (firmado, por producto, con su
 * propio nombre —un token de la oferta de salida no sirve acá ni al
 * revés—, y que el servidor sepa distinguir "vencido" de "tocado"), que el
 * cupón BIENVENIDA-… no valga sin ese plazo vivo en las DOS rutas que
 * cobran —por la MISMA función—, que el navegador se quede siempre con el
 * token que vence antes, que la página y la landing muestren el precio de
 * bienvenida sólo mientras corre, y que en las previas se vea como ejemplo
 * sin guardar nada.
 */

import { readFileSync } from "node:fs";

process.env.NEXTAUTH_SECRET ??= "clave-de-prueba-para-los-chequeos-0123456789";

import {
  validarBienvenida, leerBienvenida, codigoDeBienvenida, esCodigoDeBienvenida, precioDeBienvenida, claveDeBienvenida,
  venceEnDelTokenDeBienvenida, elTokenMasViejo, BIENVENIDA_DE_FABRICA, MINUTOS_DE_BIENVENIDA, MINUTOS_MAXIMOS, PORCENTAJE_MAXIMO_BIENVENIDA, TEXTO_BIENVENIDA_MAX,
} from "./bienvenida";
import { firmarBienvenida, leerTokenDeBienvenida, firmarOferta, leerTokenDeOferta } from "./oferta-salida-firma";
import { porQueNoValeElAutomatico } from "./cupones-automaticos";
import { validarCuponNuevo, PREFIJO_DE_BIENVENIDA, descuentoDe } from "./cupones-digitales";
import { codigoDeLaOferta } from "./oferta-salida";
import { EFECTOS_DE_LA_LANDING } from "./landing-efectos";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

const ID = "clx0000000000000000000001";
const OTRO = "clx0000000000000000000002";
const AHORA = 1_800_000_000_000;

/* ── Lo que se guarda ────────────────────────────────────────────────────── */

const ok = validarBienvenida({ activa: true, porcentaje: "15", minutos: "30", texto: "  Precio de  bienvenida por " });
check("VAL-A", ok.ok && ok.datos.activa && ok.datos.porcentaje === 15 && ok.datos.minutos === 30 && ok.datos.texto === "Precio de bienvenida por",
  "bien armado: los números como números, el texto sin espacios de más");
check("VAL-B", !validarBienvenida({ porcentaje: 4, minutos: 15, texto: "Hola que tal" }).ok && !validarBienvenida({ porcentaje: PORCENTAJE_MAXIMO_BIENVENIDA + 1, minutos: 15, texto: "Hola que tal" }).ok
  && !validarBienvenida({ porcentaje: 15, minutos: 45, texto: "Hola que tal" }).ok && !validarBienvenida({ porcentaje: 15, minutos: 15, texto: "x".repeat(TEXTO_BIENVENIDA_MAX + 1) }).ok
  && !validarBienvenida({ porcentaje: 15, minutos: 15, texto: "" }).ok,
  "fuera de rango, minutos que no existen, texto vacío o larguísimo: no");
check("VAL-C", leerBienvenida(null) === BIENVENIDA_DE_FABRICA && leerBienvenida("{roto").activa === false && leerBienvenida(JSON.stringify(ok.ok ? ok.datos : {})).minutos === 30,
  "sin nada o roto → la de fábrica (apagada); guardado → lo guardado");
check("VAL-D", MINUTOS_DE_BIENVENIDA.every((m) => m <= MINUTOS_MAXIMOS) && (MINUTOS_DE_BIENVENIDA as readonly number[]).includes(15),
  "los plazos son cortos: como mucho una hora, y hay 15 minutos");

/* ── El cupón ────────────────────────────────────────────────────────────── */

check("CUP-A", codigoDeBienvenida(ID) === "BIENVENIDA-00000001" && esCodigoDeBienvenida(codigoDeBienvenida(ID)) && !esCodigoDeBienvenida(codigoDeLaOferta(ID)) && codigoDeBienvenida(ID) !== codigoDeLaOferta(ID),
  "el código es fijo por producto, se reconoce por el prefijo y no se confunde con el de la oferta de salida");
check("CUP-B", !validarCuponNuevo({ codigo: `${PREFIJO_DE_BIENVENIDA}ALGO`, tipo: "PORCENTAJE", valor: 10 }).ok, "un cupón escrito a mano no puede empezar con BIENVENIDA-");
check("CUP-C", precioDeBienvenida(10_000, 15) === 10_000 - descuentoDe({ tipo: "PORCENTAJE", valor: 15 }, 10_000) && precioDeBienvenida(9_900, 20) === 7_920,
  "el precio de bienvenida sale de la MISMA cuenta que cobra la ruta");

/* ── La firma ────────────────────────────────────────────────────────────── */

const vivo = firmarBienvenida(ID, AHORA + 15 * 60_000);
const vencido = firmarBienvenida(ID, AHORA - 60_000);
check("FIR-A", /^\d{13}\.[A-Za-z0-9_-]{24}$/.test(vivo) && leerTokenDeBienvenida(vivo, ID, AHORA)?.vivo === true && leerTokenDeBienvenida(vivo, ID, AHORA)?.venceEn === AHORA + 15 * 60_000,
  "el token lleva la hora en que vence, firmada, y se lee vivo antes de esa hora");
check("FIR-B", leerTokenDeBienvenida(vencido, ID, AHORA)?.vivo === false && leerTokenDeBienvenida(vencido, ID, AHORA) !== null,
  "vencido se lee como VENCIDO, no como inválido: la página tiene que saber que esta persona ya tuvo su plazo");
check("FIR-C", leerTokenDeBienvenida(vivo, OTRO, AHORA) === null && leerTokenDeBienvenida(`${vivo}x`, ID, AHORA) === null && leerTokenDeBienvenida(vivo.replace(/^\d/, "9"), ID, AHORA) === null && leerTokenDeBienvenida(42, ID, AHORA) === null,
  "de otro producto, con la firma tocada, con la hora tocada, o que no es texto: no");
check("FIR-D", leerTokenDeBienvenida(firmarBienvenida(ID, AHORA + (MINUTOS_MAXIMOS + 10) * 60_000), ID, AHORA) === null,
  "una firma que promete más que el plazo más largo no vale, aunque sea nuestra");
check("FIR-E", leerTokenDeBienvenida(firmarOferta(ID, AHORA + 15 * 60_000), ID, AHORA) === null && leerTokenDeOferta(vivo, ID, AHORA) === null,
  "un token de la oferta de salida no sirve como precio de bienvenida, ni al revés: cada uno firma con su nombre");

/* ── El navegador ────────────────────────────────────────────────────────── */

const t1 = firmarBienvenida(ID, AHORA + 5 * 60_000), t2 = firmarBienvenida(ID, AHORA + 15 * 60_000);
check("NAV-A", elTokenMasViejo([t2, null, "basura", t1, undefined]) === t1 && elTokenMasViejo([t2]) === t2 && elTokenMasViejo(["x", null]) === null,
  "de todos los tokens a mano, el navegador se queda con el que vence ANTES: recargar nunca estira el plazo");
check("NAV-B", venceEnDelTokenDeBienvenida(t1) === AHORA + 5 * 60_000 && venceEnDelTokenDeBienvenida("no") === null && claveDeBienvenida(ID) === `pv_bienvenida_${ID}`,
  "la hora en que vence se lee sin verificar la firma (eso lo hace el servidor), y la clave es una por producto");

/* ── La regla compartida de los cupones automáticos ──────────────────────── */

const activa = JSON.stringify({ activa: true, porcentaje: 15, minutos: 15, texto: "Reservado por" });
const producto = { id: ID, ofertaSalida: null, bienvenida: activa };
check("REG-A", porQueNoValeElAutomatico(codigoDeBienvenida(ID), producto, { bienvenida: vivo }, AHORA) === null,
  "con el plazo vivo, el cupón BIENVENIDA-… aplica");
check("REG-B", porQueNoValeElAutomatico(codigoDeBienvenida(ID), producto, { bienvenida: vencido }, AHORA) !== null
  && porQueNoValeElAutomatico(codigoDeBienvenida(ID), producto, {}, AHORA) !== null
  && porQueNoValeElAutomatico(codigoDeBienvenida(ID), producto, { oferta: vivo }, AHORA) !== null
  && porQueNoValeElAutomatico(codigoDeBienvenida(ID), { ...producto, bienvenida: null }, { bienvenida: vivo }, AHORA) !== null,
  "vencido, sin token, con el token en el campo de la otra oferta, o con el precio de bienvenida apagado: no aplica");
check("REG-C", porQueNoValeElAutomatico("PROMO20", producto, {}, AHORA) === null,
  "un cupón común no pasa por acá: de ése decide `porQueNoAplica`");

/* ── Lo escrito ──────────────────────────────────────────────────────────── */

const comprar = leer("src/app/api/digitales/comprar/route.ts");
const publica = leer("src/app/api/digitales/cupon/route.ts");
const guardar = leer("src/app/api/digitales/productos/[id]/bienvenida/route.ts");
const servidor = leer("src/lib/bienvenida-servidor.ts");
const pagina = leer("src/app/p/[id]/page.tsx");
const pago = leer("src/app/p/[id]/pagar/page.tsx");
const checkout = leer("src/app/p/[id]/pagar/CheckoutClient.tsx");
const barra = leer("src/components/digitales/BarraDeBienvenida.tsx");
/* La cocina de guardar el plazo se comparte con la oferta del upsell: vive
   en `plazo-en-el-navegador`, y estos chequeos la miran ahí. */
const plazo = leer("src/lib/plazo-en-el-navegador.ts");
const dibujante = leer("src/components/digitales/PaginaDeVenta.tsx");
const landing = leer("src/lib/landing-propia.ts");
const efectos = leer("src/lib/landing-efectos.ts");
const editor = leer("src/app/digitales/marketing/bienvenida/BienvenidaClient.tsx");
const editorPage = leer("src/app/digitales/marketing/bienvenida/page.tsx");
const cupones = leer("src/app/digitales/marketing/cupones/CuponesClient.tsx");
const unoRuta = leer("src/app/api/digitales/cupones/[id]/route.ts");
const marketing = leer("src/app/digitales/marketing/page.tsx");
const planes = leer("src/lib/planes-digitales.ts");
const schema = leer("prisma/schema.prisma");
const migracion = leer("prisma/migrations/20260921120000_precio_de_bienvenida/migration.sql");
const instrucciones = leer("src/lib/landing-instrucciones.ts");

const firma = leer("src/lib/oferta-salida-firma.ts");
check("LIB-A", !/node:crypto/.test(leer("src/lib/bienvenida.ts")) && /type Clase = "oferta-salida" \| "bienvenida" \| "upsell";/.test(firma) && /update\(`\$\{clase\}:\$\{productId\}:\$\{ts\}`\)/.test(firma),
  "lo que importa el navegador no trae crypto; las tres firmas llevan su nombre adentro del HMAC");
check("RUTA-A", /porQueNoValeElAutomatico\(cupon\.codigo, producto, \{ oferta: cuerpo\.oferta, bienvenida: cuerpo\.bienvenida \}\)/.test(comprar) && /bienvenida: true/.test(comprar),
  "la compra pasa el token del precio de bienvenida por la regla compartida");
check("RUTA-B", /porQueNoValeElAutomatico\(cupon\.codigo, producto, \{ oferta: cuerpo\?\.oferta, bienvenida: cuerpo\?\.bienvenida \}\)/.test(publica) && /bienvenida: true/.test(publica),
  "la ruta pública del cupón: la misma");
check("RUTA-C", /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)/.test(guardar) && /store: \{ ownerId: user\.id \}/.test(guardar) && /validarBienvenida\(await req\.json/.test(guardar)
  && /\$transaction[\s\S]*?bienvenida: JSON\.stringify\(bienvenida\)[\s\S]*?guardarCuponAutomatico\(tx, \{[\s\S]*?codigo: codigoDeBienvenida\(producto\.id\)[\s\S]*?activo: bienvenida\.activa/.test(guardar),
  "guardar: Starter y Pro al día, producto propio, validado con la misma función, y el cupón en la misma transacción");
check("RUTA-D", /startsWith: PREFIJO_DE_BIENVENIDA/.test(unoRuta), "el cupón BIENVENIDA-… no se borra desde Cupones");

check("SRV-A", /if \(!cupon \|\| !cupon\.activo \|\| cupon\.tipo !== "PORCENTAJE"\) return null;/.test(servidor) && /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)\) return null/.test(servidor)
  && /if \(!leido\.vivo\) return \{ estado: "vencida" \};/.test(servidor) && /firmarBienvenida\(fila\.id, venceEn\)/.test(servidor) && /porcentaje: cupon\.valor/.test(servidor),
  "el servidor: sin cupón vivo o sin plan no hay nada; vencido es vencido (no otro token); nuevo sólo la primera vez; y el porcentaje es el del cupón, que es el que se cobra");
check("SRV-B", /export async function bienvenidaDeLaVisita\(fila: FilaConBienvenida, candidatos: Array<string \| undefined>/.test(servidor) && /leido\.venceEn < elegido\.venceEn/.test(servidor),
  "con varios tokens a mano (cookie, link) manda el que vence antes");
check("SRV-C", /if \(!hayClaveDeFirma\("el precio de bienvenida"\)\) return null;/.test(servidor) && /if \(!hayClaveDeFirma\("la oferta de salida"\)\) return null;/.test(pago)
  && /export function hayClaveDeFirma\(donde: string\): boolean \{\n\s+if \(process\.env\.NEXTAUTH_SECRET\) return true;\n\s+console\.error/.test(firma),
  "sin NEXTAUTH_SECRET la página y el checkout salen sin oferta y con el error en el log, nunca con un 500");

check("PAG-A", /bienvenidaDeLaVisita\(fila, \[await tokenDeBienvenidaDeLaCookie\(fila\.id\)\]\)/.test(pagina) && /previa \|\| previaDeLanding \? null :/.test(pagina)
  && /price: viva\.precio, comparePrice: viva\.precioNormal/.test(pagina) && /demo: true/.test(pagina),
  "la página lee la cookie, con el reloj corriendo muestra el precio de bienvenida y el normal tachado, y en las previas lo muestra como ejemplo sin firmar nada");
check("PAG-B", /bienvenidaDeLaVisita\(fila, \[await tokenDeBienvenidaDeLaCookie\(fila\.id\), tokenDeBienvenidaPedido\]\)/.test(pago) && /const oferta = bienvenida \? null : await armarOferta/.test(pago),
  "el checkout lee la cookie y el link, y mientras corre el precio de bienvenida no muestra la oferta de salida");

check("CHK-A", /const cuponVigente = useMemo\(\(\) => cupon \?\? \(bienvenidaViva && bienvenida\n\s+\? \{ codigo: bienvenida\.codigo, tipo: "PORCENTAJE" as const, valor: bienvenida\.porcentaje/.test(checkout)
  && /bienvenida: esElDeBienvenida && bienvenidaViva \? bienvenida\.token : undefined/.test(checkout) && /cupon: cuponVigente\?\.codigo/.test(checkout),
  "en el checkout el cupón de bienvenida se pone desde los datos de la página (sin llamar a /cupon), deja de contar solo al vencer, y el token viaja al pagar sólo si sigue vivo");
/* ⚠️ Sin llamada a `/api/digitales/cupon` para el de bienvenida: esa ruta tiene
   tope por IP (30 por hora) y cientos de celulares comparten IP. */
check("CHK-B", /if \(guardarTokenDeBienvenida\(bienvenida\.productId, bienvenida\.token\)\.pedirDeNuevo\) router\.refresh\(\);/.test(checkout)
  && !/verificarCupon\(bienvenida\.codigo/.test(checkout) && /El precio de bienvenida venció: se cobra el precio normal\./.test(checkout)
  && /if \(datos\.cuponRechazado\) \{\n\s+setCupon\(null\);\n\s+setCodigo\(""\);\n\s+if \(esElDeBienvenida\) setBienvenidaRechazada\(true\);/.test(checkout)
  && /return NextResponse\.json\(\{ error: motivo \?\? "Ese cupón no existe\.", cuponRechazado: true \}, \{ status: 400 \}\);/.test(comprar),
  "si el navegador tenía un plazo más viejo se vuelve a pedir la pantalla; el de bienvenida no gasta el tope de /cupon; y si /comprar rechaza el cupón, la pantalla lo saca y lo dice");
check("CHK-C", /useAhora\(bienvenidaVenceEn\)/.test(checkout) && !/setInterval/.test(checkout),
  "el reloj del checkout es el compartido, sin intervalos propios");

check("BAR-A", /masViejo\(\[enLaCookie, deLocal, tokenDeLaPagina\]\)/.test(plazo) && /document\.cookie = `\$\{clave\}=\$\{t\}; Max-Age=2592000; Path=\$\{caminoDeLaCookie\(\)\}; SameSite=Lax/.test(plazo) && /localStorage\.setItem\(clave, t\)/.test(plazo)
  && /location\.pathname\.match\(\/\^\\\/p\\\/\[A-Za-z0-9_-\]\{1,64\}\/\)\?\.\[0\] \?\? "\/"/.test(plazo)
  && /return guardarPlazo\(claveDeBienvenida\(productId\), tokenDeLaPagina, elTokenMasViejo\);/.test(barra),
  "el token más viejo se guarda en la cookie Y en localStorage, y la cookie va sólo al camino de ESTE producto (con Path=/ se acumulan hasta romper la cabecera); la barra pone su clave y su lector");
check("BAR-B", /if \(guardarTokenDeBienvenida\(productId, token\)\.pedirDeNuevo\) router\.refresh\(\);/.test(barra) && /if \(vencida\) router\.refresh\(\);/.test(barra) && !/useState|setInterval/.test(barra)
  && /pedirDeNuevo: elegido !== tokenDeLaPagina && leerCookie\(\) === elegido/.test(plazo)
  && /if \(elegido !== tokenDeLaPagina && enLaCookie === elegido\) \{\n\s+guardar\(tokenDeLaPagina\);\n\s+return \{ token: tokenDeLaPagina, pedirDeNuevo: false \};/.test(plazo),
  "con un plazo más viejo o vencido, la barra le pide la página al servidor (ningún precio se cambia desde el navegador); sólo si la cookie quedó escrita; y si el servidor ya vio esa cookie y eligió otra cosa, manda el servidor: sin bucles");
check("BAR-D", /useAhora\(venceEn: number \| null\)/.test(leer("src/lib/reloj-compartido.ts")) && /const venceEn = demo \? null :/.test(barra) && /\? venceEnDelTokenDeBienvenida\(bienvenida\.token\) \?\? 0 : null;/.test(checkout),
  "sin oferta (o en demo) el reloj no late: el checkout y la barra no se redibujan cada segundo por nada");
check("BAR-C", /if \(demo\) return;/.test(barra) && /Ejemplo/.test(barra), "en demo no guarda nada y se ve marcada");
check("DIB-A", /\{datos\.bienvenida && <BarraDeBienvenida \{\.\.\.datos\.bienvenida\} \/>\}/.test(dibujante) && /const vencida = !\(datos\.bienvenida && !datos\.bienvenida\.demo\) && ofertaVencida/.test(dibujante),
  "la página de secciones lleva la barra arriba, y con el reloj corriendo el tachado vale aunque una oferta con fecha vieja haya vencido");

check("LAN-A", /if \(d\.bienvenida && !hayReloj\) \{ hayReloj = true; ponerReloj\(el, d\.bienvenida\); \}/.test(landing) && /data-tienda-barra-propia/.test(landing)
  && /const despues = d\.bienvenida && !d\.bienvenida\.demo \? d\.bienvenida\.despues : null;/.test(landing),
  "la landing llena el hueco del reloj (uno solo), pone una barra propia si no hay, y escribe lo que dice cada precio al vencer");
/* Se mira el script YA ARMADO (las marcas van por variables en el archivo). */
const script = EFECTOS_DE_LA_LANDING;
check("LAN-B", /var reloj=raiz\.querySelector\("\[data-tienda-reloj\]"\);/.test(script) && /if\(reloj&&!reloj\.hasAttribute\("data-tienda-demo"\)\)/.test(script)
  && /if\(!token\|\|v<vence\)\{token=t;vence=v;\}/.test(script) && /document\.cookie=clave\+"="\+token\+"; Max-Age=2592000; Path="\+camino\+"; SameSite=Lax"/.test(script)
  && /var camino=\(location\.pathname\.match\(\/\^\\\/p\\\/\[A-Za-z0-9_-\]\{1,64\}\/\)\|\|\["\/"\]\)\[0\];/.test(script) && /replace\(\/\[\^A-Za-z0-9_\]\/g,""\)/.test(script)
  && /if\(v===""\)precios\[k\]\.remove\(\);else precios\[k\]\.textContent=v;/.test(script) && !/eval\(|new Function/.test(script) && !/eval\(|new Function/.test(efectos)
  && /\/\^\\d\{10,16\}\\\.\[A-Za-z0-9_-\]\{24\}\$\//.test(script),
  "el script de la landing se queda con el token más viejo (sólo con la forma de un token nuestro), lo guarda, cuenta, y al vencer cambia los precios en el lugar; en demo no hace nada");
check("LAN-C", /"data-tienda", "data-tienda-era", "data-tienda-aparece", CLASE_DE_LA_FOTO/.test(landing) && !/data-tienda-reloj|data-tienda-despues|data-tienda-token/.test(landing.slice(landing.indexOf("allowedAttributes"), landing.indexOf("allowedAttributes") + 400)),
  "las marcas del reloj no están en la lista blanca del saneado: no pueden venir escritas en el archivo");
check("LAN-D", /precio de bienvenida/i.test(instrucciones) && /data-tienda="reloj"/.test(instrucciones), "las instrucciones para Claude nombran el hueco del reloj y qué va adentro");

check("EDIT-A", /validarBienvenida\(b\)/.test(editor) && /BarraDeBienvenida productId=\{elegido\.id\} token="" texto=\{texto\} demo/.test(editor) && /precioDeBienvenida\(elegido\.price, porcentaje\)/.test(editor)
  && /key=\{elegido\?\.id/.test(editorPage) && /variablesDePagina\(pagina\)/.test(editorPage),
  "el editor valida con la misma función que la ruta, la previa es la misma barra en demo con el precio de verdad, y arranca de cero por producto");
check("LIST-A", /esCodigoDeBienvenida\(c\.codigo\)/.test(cupones) && /del precio de bienvenida/.test(cupones), "en Cupones el de bienvenida se marca y lleva a su pantalla");
check("HUB-A", /href: "\/digitales\/marketing\/bienvenida"/.test(marketing) && /"Precio de bienvenida con reloj de verdad", on: pago/.test(planes), "la tarjeta en Marketing y la fila en los planes");
check("BASE-A", /bienvenida    String\?/.test(schema) && /ADD COLUMN IF NOT EXISTS "bienvenida" TEXT/.test(migracion), "la columna y la migración idempotente");

console.log(fallos ? `\n${fallos} fallo(s).` : "\nTodo bien.");
process.exit(fallos ? 1 : 0);
