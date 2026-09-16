/**
 * Chequeos de la oferta de salida. Se corre con:
 *
 *   npx tsx src/lib/oferta-salida.check.ts
 *
 * Lo que importa: que el plazo sea de verdad (firmado, por producto, vence
 * y no se puede adelantar), que el cupón SALIDA-… no valga sin ese plazo
 * en las DOS rutas que cobran, que el descuento sea un cupón real creado
 * en la misma transacción que guarda la oferta, que el cartel del checkout
 * y el de la vista previa sean el mismo componente, y que no haya cupos ni
 * relojes falsos.
 */

import { readFileSync } from "node:fs";

process.env.NEXTAUTH_SECRET ??= "clave-de-prueba-para-los-chequeos-0123456789";

import {
  validarOfertaSalida, leerOfertaSalida, codigoDeLaOferta, esCodigoDeOferta, venceEnDelToken, venceEnTexto,
  cuentaRegresiva, mostrarReloj, textoDeHoras, esPlazoCorto, HORAS_DE_OFERTA, HORAS_MINIMAS_DEL_MAIL,
  OFERTA_DE_FABRICA, PORCENTAJE_MAXIMO_SALIDA, TEXTO_MAX,
} from "./oferta-salida";
import { firmarOferta, leerTokenDeOferta } from "./oferta-salida-firma";
import { validarCuponNuevo } from "./cupones-digitales";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

const ID = "clx0000000000000000000001";
const OTRO = "clx0000000000000000000002";

/* ── Lo que se guarda ────────────────────────────────────────────────────── */

const ok = validarOfertaSalida({ activa: true, tipo: "DESCUENTO", porcentaje: "25", horas: "24", titulo: "  Antes de  irte ", texto: "Te dejo un descuento que vale un día.", boton: "Lo quiero" });
check("VAL-A", ok.ok && ok.datos.activa && ok.datos.porcentaje === 25 && ok.datos.horas === 24 && ok.datos.titulo === "Antes de irte" && ok.datos.productoId === null,
  "una oferta bien armada: los números como números, el título sin espacios de más");
check("VAL-B", !validarOfertaSalida({ tipo: "DESCUENTO", porcentaje: 4, horas: 24, titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }).ok
  && !validarOfertaSalida({ tipo: "DESCUENTO", porcentaje: PORCENTAJE_MAXIMO_SALIDA + 1, horas: 24, titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }).ok,
  `el descuento va de 5 a ${PORCENTAJE_MAXIMO_SALIDA}: más es otro precio, no una oferta`);
check("VAL-C", !validarOfertaSalida({ tipo: "DESCUENTO", porcentaje: 20, horas: 5, titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }).ok
  && validarOfertaSalida({ tipo: "DESCUENTO", porcentaje: 20, horas: "0.25", titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }).ok,
  "sólo los plazos de la lista; los 15 minutos llegan como \"0.25\" desde el select");
check("VAL-C2", textoDeHoras(0.25) === "15 minutos" && textoDeHoras(1) === "1 hora" && textoDeHoras(24) === "24 horas" && esPlazoCorto(1) && !esPlazoCorto(6) && HORAS_DE_OFERTA[0] === 0.25 && HORAS_MINIMAS_DEL_MAIL === 24,
  "los plazos se dicen en castellano; 15 minutos y 1 hora son los cortos");
check("VAL-D", !validarOfertaSalida({ tipo: "PRODUCTO", horas: 24, titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }).ok
  && validarOfertaSalida({ tipo: "PRODUCTO", productoId: OTRO, horas: 24, titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }).ok,
  "con producto más barato hace falta el producto");
check("VAL-E", !validarOfertaSalida({ tipo: "DESCUENTO", porcentaje: 20, horas: 24, titulo: "Hola", texto: "x".repeat(TEXTO_MAX + 1), boton: "Sí" }).ok, "el texto tiene techo: es un cartel");
check("VAL-F", leerOfertaSalida(null) === OFERTA_DE_FABRICA && leerOfertaSalida("{rota") === OFERTA_DE_FABRICA && !leerOfertaSalida(null).activa && leerOfertaSalida(JSON.stringify(ok.ok ? ok.datos : {})).activa,
  "sin nada o roto, la de fábrica (apagada); guardada, se lee");
check("VAL-G", validarOfertaSalida({ activa: "true", tipo: "DESCUENTO", porcentaje: 20, horas: 24, titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }).ok
  && !(validarOfertaSalida({ activa: "true", tipo: "DESCUENTO", porcentaje: 20, horas: 24, titulo: "Hola", texto: "x".repeat(20), boton: "Sí" }) as { ok: true; datos: { activa: boolean } }).datos.activa,
  "prendida sólo con `true` de verdad");

/* ── El cupón ────────────────────────────────────────────────────────────── */

check("CUP-A", codigoDeLaOferta(ID) === "SALIDA-00000001" && esCodigoDeOferta(codigoDeLaOferta(ID)) && !esCodigoDeOferta("PROMO20"), "el código es fijo por producto y se reconoce");
check("CUP-B", validarCuponNuevo({ codigo: codigoDeLaOferta(ID), tipo: "PORCENTAJE", valor: 20 }).ok, "el código de la oferta es un código de cupón válido");

/* ── El plazo firmado ────────────────────────────────────────────────────── */

const ahora = 1_800_000_000_000;
const vence = ahora + 24 * 3_600_000;
const token = firmarOferta(ID, vence);
check("TOK-A", leerTokenDeOferta(token, ID, ahora + 60_000)?.venceEn.getTime() === vence && venceEnDelToken(token) === vence, "el token dice hasta cuándo vale, y vale hasta entonces");
check("TOK-B", leerTokenDeOferta(token, ID, vence + 1) === null && leerTokenDeOferta(firmarOferta(ID, ahora + 15 * 60_000), ID, ahora + 15 * 60_000 + 1) === null,
  "pasado el plazo, no vale: el reloj es de verdad, también el de 15 minutos");
check("TOK-C", leerTokenDeOferta(token, OTRO, ahora) === null, "el token de un producto no vale para otro");
check("TOK-D", leerTokenDeOferta(`${vence + 3_600_000}.${token.split(".")[1]}`, ID, ahora) === null && leerTokenDeOferta(firmarOferta(ID, ahora + 49 * 3_600_000), ID, ahora) === null
  && leerTokenDeOferta(firmarOferta(ID, ahora + 48 * 3_600_000), ID, ahora) !== null,
  "no se puede correr la hora para alargar el plazo: ni cambiándola, ni con una firma que prometa más de 48 horas");
check("TOK-E", leerTokenDeOferta(token.slice(0, -1) + "x", ID, ahora) === null && leerTokenDeOferta(null, ID) === null && leerTokenDeOferta("a.b", ID) === null, "firma tocada o basura, no vale");
check("TOK-G", cuentaRegresiva(ahora + 14 * 60_000 + 59_000, ahora) === "14:59" && cuentaRegresiva(ahora + 3_600_000, ahora) === "1:00:00" && cuentaRegresiva(ahora, ahora) === null
  && mostrarReloj(ahora + 3_600_000, ahora) && !mostrarReloj(ahora + 3_600_001, ahora),
  "la cuenta regresiva: mm:ss, h:mm:ss, y nada cuando ya pasó; se muestra con una hora o menos por delante");
check("TOK-F", venceEnTexto(new Date("2026-09-15T21:23:00Z"), new Date("2026-09-15T12:00:00Z")) === "hasta hoy a las 18:23"
  && venceEnTexto(new Date("2026-09-16T21:23:00Z"), new Date("2026-09-15T12:00:00Z")) === "hasta mañana a las 18:23"
  && venceEnTexto(new Date("2026-09-18T12:00:00Z"), new Date("2026-09-15T12:00:00Z")) === "hasta el 18/09 a las 09:00",
  "el plazo se dice en hora argentina: hoy, mañana, o la fecha");

/* ── Las rutas y las pantallas ───────────────────────────────────────────── */

const lib = leer("src/lib/oferta-salida.ts");
const comprar = leer("src/app/api/digitales/comprar/route.ts");
const publica = leer("src/app/api/digitales/cupon/route.ts");
const guardar = leer("src/app/api/digitales/productos/[id]/salida/route.ts");
const pagina = leer("src/app/p/[id]/pagar/page.tsx");
const checkout = leer("src/app/p/[id]/pagar/CheckoutClient.tsx");
const cartel = leer("src/components/digitales/CartelDeSalida.tsx");
const editor = leer("src/app/digitales/marketing/salida/SalidaClient.tsx");
const editorPage = leer("src/app/digitales/marketing/salida/page.tsx");
const cron = leer("src/app/api/cron/daily/route.ts");
const resend = leer("src/lib/resend.ts");
const cupones = leer("src/app/digitales/marketing/cupones/CuponesClient.tsx");
const marketing = leer("src/app/digitales/marketing/page.tsx");
const planes = leer("src/lib/planes-digitales.ts");
const schema = leer("prisma/schema.prisma");
const migracion = leer("prisma/migrations/20260915230000_oferta_de_salida/migration.sql");

check("LIB-A", !/node:crypto/.test(lib) && /node:crypto/.test(leer("src/lib/oferta-salida-firma.ts")), "lo que importa el navegador no trae crypto: la firma vive aparte");
check("RUTA-A", /esCodigoDeOferta\(cupon\.codigo\)[\s\S]*?leerTokenDeOferta\(cuerpo\.oferta, producto\.id\)[\s\S]*?motivo = "Esa oferta ya venció\."/.test(comprar),
  "la compra: el cupón SALIDA-… no vale sin el plazo firmado y vivo");
check("RUTA-B", /esCodigoDeOferta\(cupon\.codigo\)[\s\S]*?leerTokenDeOferta\(cuerpo\?\.oferta, producto\.id\)[\s\S]*?"Esa oferta ya venció\."/.test(publica),
  "la ruta pública del cupón: la misma regla");
check("RUTA-C", /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)/.test(guardar) && /store: \{ ownerId: user\.id \}/.test(guardar) && /rolDigital: "PRINCIPAL", storeId: producto\.storeId/.test(guardar),
  "guardar: Starter y Pro al día, producto propio, y el más barato también propio");
check("RUTA-D", /\$transaction[\s\S]*?ofertaSalida: JSON\.stringify\(oferta\)[\s\S]*?cuponDigital\.upsert[\s\S]*?activo: oferta\.activa/.test(guardar) && /updateMany\(\{ where: \{ storeId: producto\.storeId, codigo \}, data: \{ activo: false \} \}\)/.test(guardar),
  "el cupón se crea o actualiza en la misma transacción que guarda la oferta, prendido o apagado con ella");
check("PAG-A", /if \(!seLePuedeVender \|\| !guardada\.activa\) return null;/.test(pagina) && /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)\) return null/.test(pagina),
  "el checkout arma la oferta sólo si se puede vender, está prendida y el plan la incluye");
check("PAG-B", /leerTokenDeOferta\(tokenPedido, fila\.id\) \? \(tokenPedido as string\) : firmarOferta\(fila\.id, Date\.now\(\) \+ guardada\.horas \* 3_600_000\)/.test(pagina),
  "el plazo lo firma el servidor, y si el link ya traía uno vivo (el del mail) se respeta ése");
check("PAG-C", /if \(!cupon \|\| !cupon\.activo \|\| cupon\.tipo !== "PORCENTAJE"\) return null;/.test(pagina) && /isActive: true/.test(pagina.slice(pagina.indexOf("async function armarOferta"))),
  "sin el cupón vivo, o con el otro producto sin publicar, no se promete nada");
check("CHK-A", /e\.clientY <= 0\) mostrar\(\)/.test(checkout) && /addEventListener\("popstate", alVolver\)/.test(checkout) && /localStorage\.getItem\(claveVista\)\) return/.test(checkout),
  "aparece al sacar el mouse o al apretar atrás, una sola vez por persona");
check("CHK-B", /venceGuardado > Date\.now\(\)\) token = guardado/.test(checkout) && /oferta: tokenDeOferta \?\? undefined/.test(checkout),
  "recargar no reinicia el plazo (se guarda el primer token) y el token viaja al pagar");
check("CHK-C", /verificarCupon\(oferta\.codigo, tokenDeOferta\)/.test(checkout) && /import CartelDeSalida from "@\/components\/digitales\/CartelDeSalida"/.test(checkout) && /import CartelDeSalida, \{ type ParteDelCartel \} from "@\/components\/digitales\/CartelDeSalida"/.test(editor) && /alTocar=\{esPago \? irA : undefined\}/.test(editor),
  "aceptar aplica el cupón por la ruta pública con el token; el cartel del checkout y el de la vista previa son el mismo componente");
check("CHK-D", !/cupos|reservad/i.test(cartel) && /cuentaRegresiva\(c\.venceEn, ahora\)/.test(cartel) && /vencida \? \(\s*<button type="button" disabled/.test(cartel) && /useSyncExternalStore/.test(cartel) && !/useEffect/.test(cartel),
  "el cartel no tiene cupos; el reloj cuenta la hora firmada, y al llegar a cero el botón se apaga");
check("MAIL-C", /Math\.max\(o\.horas, HORAS_MINIMAS_DEL_MAIL\)/.test(leer("src/lib/oferta-salida-db.ts")) && /firmarOferta\(principal\.id, venceEn\)/.test(leer("src/lib/oferta-salida-db.ts")),
  "en el mail el plazo es de al menos un día, y el token firma esa misma hora");
check("EDIT-A", /validarOfertaSalida\(o\)/.test(editor) && /key=\{elegido\?\.id/.test(editorPage) && /variablesDePagina\(pagina\)/.test(editorPage),
  "el editor valida con la misma función que la ruta, arranca de cero por producto y la vista previa lleva el estilo de SU página");
check("MAIL-A", /ofertaParaElMail\(principal, enlace, now\)/.test(cron) && /oferta,\n\s+\}\)/.test(cron) && /oferta \? `/.test(resend.slice(resend.indexOf("sendCarritoAbandonadoDigitalEmail"))),
  "el mail de carrito lleva la oferta, con el plazo firmado desde el envío");
check("MAIL-B", /pagar\?oferta=\$\{encodeURIComponent\(token\)\}/.test(leer("src/lib/oferta-salida-db.ts")), "el link del mail lleva el token al checkout");
check("LIST-A", /esCodigoDeOferta\(c\.codigo\)/.test(cupones) && /de la oferta de salida/.test(cupones) && /\{!esCodigoDeOferta\(c\.codigo\) && <button/.test(cupones),
  "en Cupones el de la oferta se marca y no se borra desde ahí");
check("HUB-A", /href: "\/digitales\/marketing\/salida"/.test(marketing) && /"Oferta de salida a quien se va sin pagar", on: pago/.test(planes), "la tarjeta en Marketing y la fila en los planes");
check("BASE-A", /ofertaSalida  String\?/.test(schema) && /ADD COLUMN IF NOT EXISTS "ofertaSalida" TEXT/.test(migracion), "la columna y la migración idempotente");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
