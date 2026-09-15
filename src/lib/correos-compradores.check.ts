/**
 * Chequeos del mail a compradores. Se corre con:
 *
 *   npx tsx src/lib/correos-compradores.check.ts
 *
 * Lo que importa: que sólo reciba quien PAGÓ y no se dio de baja, que la
 * baja no se pueda falsificar ni ejecutar por un GET, que el envío se pueda
 * retomar sin repetir a nadie, que sólo mande Pro al día y con tope por día,
 * y que el HTML de la vendedora nunca salga como HTML.
 */

import { readFileSync } from "node:fs";

process.env.NEXTAUTH_SECRET ??= "clave-de-prueba-para-los-chequeos-0123456789";

import {
  validarCorreoNuevo, saludo, destinatarios, tokenDeBaja, leerTokenDeBaja, enlaceDelBoton, resumenDelEnvio,
  urlBajaCorreo, urlBajaCorreoUnClic, ASUNTO_MAX, CUERPO_MAX, MAX_CORREOS_POR_DIA,
} from "./correos-compradores";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};
const leer = (f: string) => readFileSync(f, "utf8").replace(/\r\n/g, "\n");

/* ── Lo que se manda ─────────────────────────────────────────────────────── */

const bien = validarCorreoNuevo({ asunto: "  Salió la  segunda parte ", cuerpo: "Hola a todos,\r\nya está la segunda parte del curso.", productId: "clx0000000000000000000001", enlaceProductId: "x" });
check("VAL-A", bien.ok && bien.datos.asunto === "Salió la segunda parte" && bien.datos.cuerpo === "Hola a todos,\nya está la segunda parte del curso."
  && bien.datos.productId === "clx0000000000000000000001" && bien.datos.enlaceProductId === null,
  "asunto sin espacios de más, cuerpo con saltos normalizados, un id raro se ignora (la ruta lo vuelve a mirar)");
check("VAL-B", !validarCorreoNuevo({ asunto: "ab", cuerpo: "x".repeat(50) }).ok && !validarCorreoNuevo({ asunto: "a".repeat(ASUNTO_MAX + 1), cuerpo: "x".repeat(50) }).ok,
  "un asunto corto o largo se rechaza");
check("VAL-C", !validarCorreoNuevo({ asunto: "Hola", cuerpo: "corto" }).ok && !validarCorreoNuevo({ asunto: "Hola", cuerpo: "x".repeat(CUERPO_MAX + 1) }).ok && !validarCorreoNuevo(null).ok,
  "un cuerpo corto, largo o nada se rechaza");
check("SAL-A", saludo("Ana María Pérez") === "Hola Ana," && saludo("  ") === "Hola," && saludo(null) === "Hola,", "el saludo con el primer nombre, y sin coma colgando si no hay");
check("BOT-A", enlaceDelBoton("https://curso.tiendaapps.com", "Salió la Segunda Parte") === "https://curso.tiendaapps.com/?utm_source=email&utm_medium=mail&utm_campaign=salio-la-segunda-parte",
  "el botón lleva la etiqueta de mail y el asunto como campaña: la venta se ve en Campañas");

/* ── La lista ────────────────────────────────────────────────────────────── */

const compradores = [
  { email: "Zoe@x.com", nombre: null },
  { email: "ana@x.com", nombre: "Ana" },
  { email: "ANA@x.com", nombre: "Ana P" },
  { email: "luis@x.com", nombre: "Luis" },
  { email: "baja@x.com", nombre: "Se fue" },
  { email: "  ", nombre: "nadie" },
];
const lista = destinatarios(compradores, ["BAJA@x.com"]);
check("LIS-A", lista.map((c) => c.email).join(",") === "ana@x.com,luis@x.com,zoe@x.com", "uno por correo, en minúsculas, sin bajas ni vacíos, ordenados por correo");
check("LIS-B", lista[0].nombre === "Ana" && lista[2].nombre === null, "el nombre es el primero que se vio; sin nombre queda null");
check("LIS-C", destinatarios(compradores, [], "ana@x.com").map((c) => c.email).join(",") === "baja@x.com,luis@x.com,zoe@x.com", "retomar desde un correo trae sólo los que vienen después: nadie lo recibe dos veces");
check("LIS-D", destinatarios([], []).length === 0 && destinatarios(compradores, compradores.map((c) => c.email)).length === 0, "sin compradores, o todos de baja, no hay a quién");

/* ── El token de baja ────────────────────────────────────────────────────── */

const storeId = "clx0000000000000000000001";
const token = tokenDeBaja(storeId, " Ana@X.com ");
const leido = leerTokenDeBaja(token);
check("TOK-A", leido !== null && leido.storeId === storeId && leido.email === "ana@x.com", "el token dice de qué cuenta y qué correo, en minúsculas");
check("TOK-B", token === tokenDeBaja(storeId, "ana@x.com"), "el mismo correo escrito distinto da el mismo token");
check("TOK-C", leerTokenDeBaja(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")) === null, "un token con la firma tocada no vale");
const partes = token.split(".");
const otroCorreo = `${partes[0]}.${Buffer.from("otra@x.com").toString("base64url")}.${partes[2]}`;
check("TOK-D", leerTokenDeBaja(otroCorreo) === null, "cambiar el correo con la firma de otro no vale: no se puede dar de baja a un tercero");
check("TOK-E", leerTokenDeBaja(null) === null && leerTokenDeBaja("") === null && leerTokenDeBaja("a.b") === null && leerTokenDeBaja("x".repeat(500)) === null, "basura no vale");
check("TOK-F", tokenDeBaja("clx0000000000000000000002", "ana@x.com") !== token, "el mismo correo en otra cuenta es otro token: la baja es de la relación");
check("TOK-G", urlBajaCorreo("https://www.tiendaapps.com/", "a.b.c") === "https://www.tiendaapps.com/correo/baja?t=a.b.c"
  && urlBajaCorreoUnClic("https://www.tiendaapps.com", "a.b.c") === "https://www.tiendaapps.com/api/digitales/baja?t=a.b.c",
  "la página para la persona y la ruta para el click de Gmail son dos direcciones distintas");

check("RES-A", resumenDelEnvio({ destinatarios: 40, enviados: 16, fallidos: 0, estado: "ENVIANDO" }) === "16 de 40 enviados, quedan más"
  && resumenDelEnvio({ destinatarios: 40, enviados: 38, fallidos: 2, estado: "LISTO" }) === "38 enviados · 2 no llegaron"
  && resumenDelEnvio({ destinatarios: 1, enviados: 1, fallidos: 0, estado: "LISTO" }) === "1 enviado",
  "el resumen del historial");

/* ── Las rutas, el mail y las pantallas ──────────────────────────────────── */

const db = leer("src/lib/correos-compradores-db.ts");
const crear = leer("src/app/api/digitales/correos/route.ts");
const seguir = leer("src/app/api/digitales/correos/[id]/seguir/route.ts");
const baja = leer("src/app/api/digitales/baja/route.ts");
const paginaBaja = leer("src/app/correo/baja/page.tsx");
const resend = leer("src/lib/resend.ts");
const pantalla = leer("src/app/digitales/marketing/compradores/page.tsx");
const cliente = leer("src/app/digitales/marketing/compradores/CompradoresClient.tsx");
const marketing = leer("src/app/digitales/marketing/page.tsx");
const planes = leer("src/lib/planes-digitales.ts");
const schema = leer("prisma/schema.prisma");
const migracion = leer("prisma/migrations/20260915210000_correos_a_compradores/migration.sql");

check("DB-A", /status: "CONFIRMED",\n\s+\.\.\.\(productId \? \{ items: \{ some: \{ productId \} \} \} : \{\}\)/.test(db), "recibe quien PAGÓ ese producto (o cualquiera de la cuenta): ni pendientes ni canceladas");
check("DB-B", /destinatarios\(pagina, bajas, cursor\)/.test(db) && /buyer: \{ email: \{ gt: despuesDe \} \}/.test(db) && /distinct: \["buyerId"\]/.test(db) && /orderBy: \{ buyer: \{ email: "asc" \} \}/.test(db)
  && /data: \{ cursor, enviados: \{ increment: bien \}, fallidos: \{ increment: mal \} \}/.test(db),
  "se lee de a páginas por correo desde el cursor, sin las bajas; los contadores suman, no pisan");
check("DB-C", db.indexOf("Promise.allSettled") < db.indexOf("cursor = pagina[pagina.length - 1].email") && /if \(pagina\.length === 0\)/.test(db),
  "el cursor pasa al final de la PÁGINA y se guarda DESPUÉS de mandar; termina cuando no queda página");
check("RUTA-F", /cuantosRecibirian\(store\.id, publico \? \[publico\.id\] : \[\]\)/.test(crear), "la ruta cuenta con la misma función que la pantalla: el número que confirmó es el que se guarda");
check("DB-D", /if \(!correo \|\| correo\.estado !== "ENVIANDO"\) return/.test(db), "un envío terminado no se vuelve a mandar");
check("DB-E", /NODE_ENV !== "production" && process\.env\.NEXT_PUBLIC_APP_URL/.test(db) && !/req\.headers/.test(db), "la base de los links es la del sitio, nunca el Host del pedido");

check("RUTA-A", /sub\?\.tier !== "PRO" \|\| !isSubscriptionActive\(sub\)/.test(crear), "manda sólo Pro AL DÍA: con la tarjeta rebotada, no");
check("RUTA-B", /MAX_CORREOS_POR_DIA/.test(crear) && /createdAt: \{ gte: hace24h \}/.test(crear) && MAX_CORREOS_POR_DIA <= 3, "tope de envíos por día: el dominio lo comparten todas las cuentas");
check("RUTA-C", /rolDigital: "PRINCIPAL", storeId: store\.id/.test(crear) && /\(r\.datos\.productId && !publico\) \|\| \(r\.datos\.enlaceProductId && !enlazado\)/.test(crear),
  "el producto del público y el del botón tienen que ser principales PROPIOS: un id ajeno no manda nada");
check("RUTA-D", /if \(cuantos === 0\) return/.test(crear), "sin destinatarios no se crea nada");
check("RUTA-E", /where: \{ id, estado: "ENVIANDO", store: \{ ownerId: user\.id \} \}/.test(seguir), "seguir: sólo el dueño, y sólo un envío a medias");

check("BAJA-A", /export async function GET[\s\S]*?NextResponse\.redirect/.test(baja) && !/export async function GET[\s\S]*?upsert[\s\S]*?export async function POST/.test(baja),
  "el GET redirige y NO da de baja: los escáneres de Gmail abren los links solos");
check("BAJA-B", /application\/x-www-form-urlencoded/.test(baja) && /bajaCorreoDigital\.upsert/.test(baja), "el POST acepta el click de Gmail y el botón, y guarda por (cuenta, correo)");
check("BAJA-C", /if \(!datos\) return NextResponse\.json\(\{ ok: true \}\)/.test(baja) && /if \(!datos \|\| !store\)/.test(paginaBaja), "un token que no sirve se contesta OK: quien se quiere ir no puede quedar sin salida");
check("BAJA-D", /leerTokenDeBaja/.test(paginaBaja) && /endpoint="\/api\/digitales\/baja"/.test(paginaBaja) && !/prisma\.bajaCorreoDigital/.test(paginaBaja), "la página muestra y el botón hace: la página no da de baja a nadie");

const mail = resend.slice(resend.indexOf("export async function sendCorreoACompradoresEmail"));
check("MAIL-A", /"List-Unsubscribe": `<\$\{bajaPostUrl\}>`/.test(mail) && /"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"/.test(mail) && /href="\$\{escapeHtml\(bajaUrl\)\}"/.test(mail),
  "las cabeceras de un clic y el link del pie: la salida más a mano que el botón de spam");
check("MAIL-B", /\$\{escapeHtml\(cuerpo\)\}/.test(mail) && /\$\{escapeHtml\(asunto\)\}|subject: asunto/.test(mail) && /white-space:pre-wrap/.test(mail), "el texto de la vendedora sale escapado, con sus saltos; nunca como HTML");
check("MAIL-C", /replyTo \? \{ replyTo \} : \{\}/.test(mail) && /const direccion = FROM\.match/.test(mail) && /replace\(\/\["<>\\r\\n\]\/g, ""\)/.test(mail),
  "sale de nuestra dirección con su nombre limpio adelante, y las respuestas van a ella");
check("MAIL-D", /Recibís este mail porque/.test(mail), "el pie dice por qué le llega");

check("PANT-A", /esPro = sub\?\.tier === "PRO" && !!sub && isSubscriptionActive\(sub\)/.test(pantalla) && /cuantosRecibirian\(store\.id/.test(pantalla), "la pantalla mira el plan al día y cuenta a quién le escribiría");
check("PANT-B", /window\.confirm\(`Se va a mandar a/.test(cliente) && /validarCorreoNuevo\(borrador\)/.test(cliente) && /while \(total\.falta\)/.test(cliente),
  "confirma con el número antes de mandar, valida con la misma función que la ruta y sigue sola hasta terminar");
check("PANT-C", /Así les llega/.test(cliente) && /No quiero recibir más mails/.test(cliente), "la vista previa muestra el saludo, el cuerpo, el botón y el pie con la baja");
check("PANT-D", /\{!esPro && \(/.test(cliente) && /\{esPro && \(/.test(cliente) && /href="\/digitales\/mi-cuenta"/.test(cliente), "sin Pro se explica y se lleva al plan; el formulario no está");
check("HUB-A", /href: "\/digitales\/marketing\/compradores"/.test(marketing) && /Mail a tus compradores/.test(marketing), "la tarjeta en Marketing");
check("HUB-B", /titulo: "Upsells",/.test(marketing) && /antes de pagar/.test(marketing) && !/Upsells post-compra/.test(marketing), "la tarjeta de upsells dice que se ofrece antes Y después de pagar: no es sólo post-compra");
check("PLAN-A", /\{ text: "Mail a tus compradores", on: tier === "PRO" \}/.test(planes), "en la lista de planes, sólo Pro");
check("BASE-A", /^model CorreoDigital \{/m.test(schema) && /^model BajaCorreoDigital \{/m.test(schema) && /@@unique\(\[storeId, email\]\)/.test(schema.slice(schema.indexOf("model BajaCorreoDigital")))
  && /CREATE TABLE IF NOT EXISTS "CorreoDigital"/.test(migracion) && /CREATE TABLE IF NOT EXISTS "BajaCorreoDigital"/.test(migracion) && /"botonTexto"    TEXT/.test(migracion),
  "los dos modelos, la baja única por (cuenta, correo) y la migración idempotente");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
process.exit(fallos === 0 ? 0 : 1);
