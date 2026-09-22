/**
 * Chequeos de las opiniones verificadas.
 *
 *   npx tsx src/lib/opiniones-digitales.check.ts
 *
 * Lo que se cuida: que sólo pueda opinar quien pagó (link firmado con la
 * compra, una por compra); que lo publicado sea lo que escribió (nunca se
 * edita); que la página las dibuje con la marca y se prenda sola con ellas;
 * y que la vendedora decida, desde el panel, qué se ve.
 */

import { readFileSync } from "node:fs";
import { validarOpinion, nombrePublico, unirOpiniones, urlParaOpinar, mensajeParaPedirOpinion, esEstadoDeOpinion, OPINION_MAX, MAX_OPINIONES_EN_PAGINA } from "./opiniones-digitales";
import { porQueNoSeDibuja } from "./pagina-venta";
import { htmlDeOpiniones } from "./opiniones-digitales-db";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string, detalle?: unknown) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`, detalle !== undefined ? JSON.stringify(detalle) : ""); }
};
const leer = (p: string) => readFileSync(p, "utf8");

/* ── Lo puro ───────────────────────────────────────────────────────────── */
const bien = validarOpinion({ texto: "  Me sirvió un montón,\r\nlo leí en dos días.  ", nombre: "" }, "Ana María Pérez");
check("OPI-A", bien.ok && bien.datos.texto === "Me sirvió un montón,\nlo leí en dos días." && bien.datos.nombre === "Ana",
  "el texto se limpia (CRLF, espacios) y sin nombre escrito va el nombre de pila del comprador");
const corta = validarOpinion({ texto: "Genial", nombre: "Ana" }, null);
const conLink = validarOpinion({ texto: "Muy bueno, miren esto https://otro.com que es mejor", nombre: "Ana" }, null);
const larga = validarOpinion({ texto: "x".repeat(OPINION_MAX + 1), nombre: "Ana" }, null);
const sinNombre = validarOpinion({ texto: "x".repeat(30), nombre: "" }, null);
check("OPI-B", !corta.ok && !conLink.ok && /link/i.test(conLink.ok ? "" : conLink.problema) && !larga.ok && !sinNombre.ok,
  "muy corta, con link, muy larga o sin cómo aparecer: se rechaza con el motivo");
check("OPI-C", nombrePublico("  Juan Carlos ") === "Juan" && nombrePublico(null) === ""
  && urlParaOpinar("https://www.tiendaapps.com/", "clx1", "a.b") === "https://www.tiendaapps.com/p/clx1/opinar?t=a.b",
  "el nombre público es el de pila; la dirección para opinar es la del producto con el token");
const unidas = unirOpiniones(
  Array.from({ length: MAX_OPINIONES_EN_PAGINA + 2 }, (_, i) => ({ nombre: `V${i}`, texto: "t", fecha: "f" })),
  [{ nombre: "M", texto: "manual" }, { nombre: "vacía", texto: "" }],
);
check("OPI-D", unidas.length === MAX_OPINIONES_EN_PAGINA + 1 && unidas[0].verificada && unidas[unidas.length - 1].nombre === "M" && !unidas[unidas.length - 1].verificada,
  "verificadas primero (con tope), después las manuales con texto; cada una sabe si es verificada");
const m = mensajeParaPedirOpinion({ nombre: "Ana Pérez", producto: "Guía", enlace: "https://x/p/1/opinar?t=z" });
check("OPI-E", /Hola Ana,/.test(m.cuerpo) && /https:\/\/x\/p\/1\/opinar\?t=z/.test(m.cuerpo) && /Sólo vos podés escribir ahí/.test(m.cuerpo) && m.asunto === "¿Cómo te fue con Guía?",
  "el mensaje para pedirla lleva el link firmado y dice que es sólo suyo");
check("OPI-F", esEstadoDeOpinion("PUBLICADA") && !esEstadoDeOpinion("BORRADA") && !esEstadoDeOpinion(1), "sólo los tres estados");

/* ── La regla de dibujo ────────────────────────────────────────────────── */
const apagada = { clave: "opiniones", visible: false, campos: { items: [] } } as unknown as Parameters<typeof porQueNoSeDibuja>[0];
check("OPI-G", porQueNoSeDibuja(apagada, { hayBonos: false }) === "Está apagada"
  && porQueNoSeDibuja(apagada, { hayBonos: false, hayOpinionesVerificadas: true }) === null
  && porQueNoSeDibuja({ ...apagada, clave: "beneficios" }, { hayBonos: false, hayOpinionesVerificadas: true }) === "Está apagada",
  "con verificadas publicadas la sección de opiniones se dibuja aunque esté apagada; ninguna otra sección se prende así");
const html = htmlDeOpiniones([{ nombre: "Ana <b>", texto: "Bien & \"bien\"", fecha: "septiembre de 2026" }]);
check("OPI-H", !!html && /Ana &lt;b&gt;/.test(html) && /Bien &amp; &quot;bien&quot;/.test(html) && /Compra verificada/.test(html) && htmlDeOpiniones([]) === undefined
  && /white-space:pre-line;overflow-wrap:anywhere/.test(html),
  "el bloque para la landing propia escapa lo que escribió la gente, respeta sus renglones y corta una palabra sin espacios, y lleva la marca; sin opiniones no hay bloque");
const panelOpiniones = leer("src/app/digitales/clientes/opiniones/OpinionesClient.tsx");
const dibujanteOpiniones = leer("src/components/digitales/PaginaDeVenta.tsx");
check("OPI-H2", /whitespace-pre-line break-words[^"]*">\{o\.texto\}/.test(panelOpiniones) && /whitespace-pre-line break-words[^"]*">\s*\{i\.texto\}/.test(dibujanteOpiniones),
  "en el panel y en la página, lo que escribió la gente respeta sus renglones y no se va para el costado");

/* ── Las rutas y las pantallas ─────────────────────────────────────────── */
const firma = leer("src/lib/opinion-firma.ts");
const publica = leer("src/app/api/digitales/opinion/route.ts");
const modera = leer("src/app/api/digitales/opiniones/[id]/route.ts");
const paginaOpinar = leer("src/app/p/[id]/opinar/page.tsx");
const paginaVenta = leer("src/app/p/[id]/page.tsx");
const dibujante = leer("src/components/digitales/PaginaDeVenta.tsx");
const editor = leer("src/app/digitales/productos/[id]/pagina/EditorClient.tsx");
const panel = leer("src/app/digitales/clientes/opiniones/OpinionesClient.tsx");
const clientesDb = leer("src/lib/clientes-digitales-db.ts");
const clientesUi = leer("src/app/digitales/clientes/ClientesClient.tsx");
const esquema = leer("prisma/schema.prisma");
const migracion = leer("prisma/migrations/20260922000000_opiniones_digitales/migration.sql");
const campanita = leer("src/components/NotificationBell.tsx");

check("OPI-I", /createHmac\("sha256", secreto\)\.update\(`opinion:\$\{orderId\}`\)/.test(firma) && /timingSafeEqual/.test(firma)
  && /orderId   String   @unique/.test(esquema) && /CREATE UNIQUE INDEX IF NOT EXISTS "OpinionDigital_orderId_key"/.test(migracion) && /CREATE TABLE IF NOT EXISTS "OpinionDigital"/.test(migracion),
  "el link va firmado con la compra, se compara en tiempo constante, y hay una opinión por compra (orderId único, migración idempotente)");
check("OPI-J", /checkRateLimit\(`digital-opinion:\$\{ip\}`/.test(publica) && /leerTokenDeOpinion\(token\)/.test(publica)
  && /status: "CONFIRMED", store: \{ owner: \{ role: "DIGITAL" \} \}/.test(publica) && /validarOpinion\(body, orden\.buyer\.name\)/.test(publica)
  && /update: \{ nombre: r\.datos\.nombre, texto: r\.datos\.texto, estado: "PENDIENTE" \}/.test(publica) && /type: "DIGITAL_OPINION"/.test(publica) && /DIGITAL_OPINION: "/.test(campanita)
  && /despues\(/.test(publica),
  "la ruta pública tiene tope por IP, exige el token y una compra COBRADA de una cuenta digital, valida con la misma función, cambiarla vuelve a PENDIENTE, y avisa en la campanita sin frenar");
check("OPI-K", /user\.role !== "DIGITAL"/.test(modera) && /esEstadoDeOpinion\(estado\)/.test(modera)
  && /updateMany\(\{ where: \{ id, store: \{ ownerId: user\.id \} \}, data: \{ estado \} \}\)/.test(modera) && !/texto/.test(modera.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").replace("el texto no se toca", "")),
  "moderar es sólo de la dueña, sólo el estado de una opinión de SU cuenta, y nunca el texto");
check("OPI-L", /leerTokenDeOpinion\(t\)/.test(paginaOpinar) && /status: "CONFIRMED", items: \{ some: \{ productId: fila\.id \} \}/.test(paginaOpinar)
  && /Este link no sirve/.test(paginaOpinar) && /robots: \{ index: false/.test(paginaOpinar),
  "la página pública sólo muestra el formulario con un token de una compra cobrada de ESE producto; si no, lo explica; y no se indexa");
check("OPI-M", /const opiniones = await opinionesPublicadasDe\(fila\.id\);/.test(paginaVenta) && /bloques: \{ opiniones: htmlDeOpiniones\(opiniones\) \}/.test(paginaVenta)
  && /opiniones,\s*\};/.test(paginaVenta) && /unirOpiniones\(datos\.opiniones \?\? \[\], lista\(campos, "items"\)\)/.test(dibujante) && /Compra verificada/.test(dibujante)
  && /hayOpinionesVerificadas: \(datos\.opiniones\?\.length \?\? 0\) > 0/.test(dibujante) && /hayOpinionesVerificadas: opinionesVerificadas > 0/.test(editor),
  "la página de secciones y la landing propia dibujan las mismas publicadas, con la marca; y el editor sabe que la sección se prende con ellas");
check("OPI-N", /Publicar en la página/.test(panel) && /Sacar de la página/.test(panel) && /Guardar sin publicar/.test(panel) && !/<textarea|<input/.test(panel)
  && /tokenParaOpinar\(ultima\.id\)/.test(clientesDb) && /c\.status !== "CONFIRMED" \|\| ultimaCobradaDe\.has\(c\.buyerId\)/.test(clientesDb)
  && /Pedirle una opinión/.test(clientesUi) && /pedido && \(c\.sinBajar === 0\)/.test(clientesUi) && /mensajeParaPedirOpinion\(/.test(clientesUi),
  "en el panel se publica o se esconde, sin editar; en Clientes se pide con el link de su última compra cobrada, y sólo a quien ya bajó lo suyo");

console.log(fallos === 0 ? "\nok — sólo opina quien pagó, y lo publicado es lo que escribió" : `\nFALLA — ${fallos} chequeo(s) de las opiniones verificadas`);
process.exit(fallos === 0 ? 0 : 1);
