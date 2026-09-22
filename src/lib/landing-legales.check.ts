/* Los links legales del pie de la landing propia: se reconocen por el
   texto, van a nuestra página de legales, y el de arrepentimiento es
   siempre el nuestro. Correr: npx tsx src/lib/landing-legales.check.ts */

import { readFileSync } from "node:fs";
import { legalDelLink, urlDeLegal, faltaElDocumento, TEXTO_DE_LEGAL } from "./landing-legales";
import { armarLanding } from "./landing-propia";

let fallas = 0;
function check(id: string, ok: boolean, que: string) {
  console.log(`${ok ? "✅" : "❌"} ${id}  ${que}`);
  if (!ok) fallas++;
}

check("LEG-A", legalDelLink("Términos y condiciones") === "terminos" && legalDelLink("Condiciones de compra") === "terminos"
  && legalDelLink("Política de privacidad") === "privacidad" && legalDelLink("Privacidad") === "privacidad"
  && legalDelLink("Política de reembolso") === "devoluciones" && legalDelLink("Devoluciones y garantía") === "devoluciones"
  && legalDelLink("Botón de arrepentimiento") === "arrepentimiento" && legalDelLink("ARREPENTIMIENTO") === "arrepentimiento"
  && legalDelLink("Instagram") === null && legalDelLink("Contacto") === null && legalDelLink("") === null,
  "reconoce los cuatro legales por lo que dice el link, con o sin acentos; Instagram y Contacto no son legales");

check("LEG-B", urlDeLegal("clx1", "terminos") === "/p/clx1/legales?tipo=terminos" && urlDeLegal("a b", "privacidad") === "/p/a%20b/legales?tipo=privacidad"
  && faltaElDocumento("terminos", ["privacidad"]) && !faltaElDocumento("terminos", ["terminos"]) && !faltaElDocumento("arrepentimiento", []),
  "la dirección es la página de legales de ESE producto; el arrepentimiento nunca falta");

const base = { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, bloques: {} };
const pie = `<footer><a href="#">Términos y condiciones</a><a href="#">Política de privacidad</a><a href="#">Política de reembolso</a><a href="https://malo.com" target="_blank">Botón de arrepentimiento</a><a href="#">Instagram</a><a href="mailto:a@b.co">Contacto</a></footer>`;
const conId = armarLanding(pie, { ...base, enlaces: { "politica-de-privacidad": "https://mia.com/priv", instagram: "https://instagram.com/yo" }, productId: "clx1", legalesCargados: ["terminos", "privacidad", "devoluciones"] });
check("LEG-C", /<a href="\/p\/clx1\/legales\?tipo=terminos">Términos y condiciones<\/a>/.test(conId)
  && /<a href="https:\/\/mia\.com\/priv" target="_blank" rel="noopener noreferrer">Política de privacidad<\/a>/.test(conId)
  && /<a href="\/p\/clx1\/legales\?tipo=devoluciones">Política de reembolso<\/a>/.test(conId)
  && /<a href="\/p\/clx1\/legales\?tipo=arrepentimiento">Botón de arrepentimiento<\/a>/.test(conId) && !/malo\.com/.test(conId)
  && /<a href="https:\/\/instagram\.com\/yo" target="_blank" rel="noopener noreferrer">Instagram<\/a>/.test(conId)
  && /<a href="mailto:a@b\.co">Contacto<\/a>/.test(conId)
  && !/data-tienda-legales/.test(conId) && (conId.match(/legales[?]tipo=/g) ?? []).length === 3,
  "los legales sin dirección van a nuestra página; con la suya, gana la suya; el arrepentimiento es el nuestro aunque traiga otra; y si el archivo lo trae no se agrega otro");

/* Lo que falta se agrega: los cargados sin link, y el arrepentimiento
   siempre. Al lado del último legal del pie con su clase, en orden; sin
   ningún legal, un renglón al final. Un documento NO cargado no se agrega. */
const sinBoton = armarLanding(`<footer><nav><a class="pie" href="#">Términos y condiciones</a><a class="pie" href="#">Instagram</a></nav><p>© 2026</p></footer>`, { ...base, enlaces: {}, productId: "clx1", legalesCargados: ["terminos", "privacidad"] });
const sinPie = armarLanding(`<h1>Hola</h1>`, { ...base, enlaces: {}, productId: "clx1", legalesCargados: ["devoluciones"] });
const sinCargados = armarLanding(`<h1>Hola</h1>`, { ...base, enlaces: {}, productId: "clx1" });
check("LEG-D", /<a class="pie" href="\/p\/clx1\/legales\?tipo=terminos">Términos y condiciones<\/a><a href="\/p\/clx1\/legales\?tipo=privacidad" class="pie">Política de privacidad<\/a><a href="\/p\/clx1\/legales\?tipo=arrepentimiento" class="pie">Botón de arrepentimiento<\/a><a class="pie" href="#">Instagram<\/a>/.test(sinBoton)
  && !/devoluciones|data-tienda-legales/.test(sinBoton)
  && new RegExp(`<p data-tienda-legales=""><a href="/p/clx1/legales\\?tipo=devoluciones">${TEXTO_DE_LEGAL.devoluciones}</a> · <a href="/p/clx1/legales\\?tipo=arrepentimiento">${TEXTO_DE_LEGAL.arrepentimiento}</a></p>$`).test(sinPie)
  && /<p data-tienda-legales=""><a href="\/p\/clx1\/legales\?tipo=arrepentimiento">Botón de arrepentimiento<\/a><\/p>$/.test(sinCargados),
  "los legales cargados que faltan y el arrepentimiento se agregan al lado del último legal del pie, con su clase y en orden; sin ningún legal, un renglón al final; un documento no cargado no se agrega");

/* ⚠️ 21/09/26, auditoría: el botón de comprar decía "garantía de 7 días" y
   contaba como el link de devoluciones (no se agregaba nunca), y un ancla
   "Garantía" (#garantia) de la barra de navegación quedaba como "último
   legal": términos y arrepentimiento se metían ahí arriba, no en el pie. */
const conBoton = armarLanding(`<a data-tienda="comprar" href="#">Quiero mi guía — garantía de 7 días</a><nav><a href="#garantia">Garantía</a><a href="#">Instagram</a></nav>`, { ...base, enlaces: {}, productId: "clx1", legalesCargados: ["devoluciones", "terminos"] });
check("LEG-G", conBoton.endsWith(`<a data-tienda="comprar" href="/pagar">Quiero mi guía — garantía de 7 días</a><nav><a href="#garantia">Garantía</a><a href="#">Instagram</a></nav><p data-tienda-legales=""><a href="/p/clx1/legales?tipo=terminos">Términos y condiciones</a> · <a href="/p/clx1/legales?tipo=devoluciones">Política de devoluciones</a> · <a href="/p/clx1/legales?tipo=arrepentimiento">Botón de arrepentimiento</a></p>`),
  "un botón de comprar que dice «garantía» y un ancla a la sección de la garantía no son links legales: devoluciones se agrega igual, y al final, no en la barra de navegación");

const sinId = armarLanding(pie, { ...base, enlaces: {} });
check("LEG-E", /<a href="#">Términos y condiciones<\/a>/.test(sinId) && !/data-tienda-legales|legales[?]tipo=/.test(sinId),
  "sin productId (chequeos viejos, previa sin producto) no se inventa ninguna dirección");

const panel = readFileSync("src/app/digitales/productos/[id]/landing/LandingClient.tsx", "utf8");
const panelPage = readFileSync("src/app/digitales/productos/[id]/landing/page.tsx", "utf8");
const pagina = readFileSync("src/app/p/[id]/page.tsx", "utf8");
const pedido = readFileSync("src/lib/landing-instrucciones.ts", "utf8");
check("LEG-F", /legalDelLink\(texto\)/.test(panel) && /Tu página de legales \(recomendado\)/.test(panel) && /Otra dirección/.test(panel)
  && /lo exige la ley/.test(panel) && /configuracion\?tab=legales/.test(panel) && /documentosPublicados\(fila\.store\)/.test(panelPage)
  && /productId: fila\.id,/.test(pagina) && /"Botón de arrepentimiento" \(es obligatorio por ley/.test(pedido),
  "el paso 5 tiene el selector para los legales, avisa si falta el documento, el arrepentimiento no se elige, la página pública pasa el producto y el pedido a Claude pide el botón");

if (fallas) { console.log(`\n${fallas} fallaron.`); process.exit(1); }
console.log("\nTodo bien.");
