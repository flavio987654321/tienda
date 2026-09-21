/* Los links legales del pie de la landing propia: se reconocen por el
   texto, van a nuestra página de legales, y el de arrepentimiento es
   siempre el nuestro. Correr: npx tsx src/lib/landing-legales.check.ts */

import { readFileSync } from "node:fs";
import { legalDelLink, urlDeLegal, faltaElDocumento, TEXTO_DE_ARREPENTIMIENTO } from "./landing-legales";
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
const conId = armarLanding(pie, { ...base, enlaces: { "politica-de-privacidad": "https://mia.com/priv", instagram: "https://instagram.com/yo" }, productId: "clx1" });
check("LEG-C", /<a href="\/p\/clx1\/legales\?tipo=terminos">Términos y condiciones<\/a>/.test(conId)
  && /<a href="https:\/\/mia\.com\/priv" target="_blank" rel="noopener noreferrer">Política de privacidad<\/a>/.test(conId)
  && /<a href="\/p\/clx1\/legales\?tipo=devoluciones">Política de reembolso<\/a>/.test(conId)
  && /<a href="\/p\/clx1\/legales\?tipo=arrepentimiento">Botón de arrepentimiento<\/a>/.test(conId) && !/malo\.com/.test(conId)
  && /<a href="https:\/\/instagram\.com\/yo" target="_blank" rel="noopener noreferrer">Instagram<\/a>/.test(conId)
  && /<a href="mailto:a@b\.co">Contacto<\/a>/.test(conId)
  && !/data-tienda-arrepentimiento/.test(conId),
  "los legales sin dirección van a nuestra página; con la suya, gana la suya; el arrepentimiento es el nuestro aunque traiga otra; y si el archivo lo trae no se agrega otro");

const sinBoton = armarLanding(`<footer><nav><a class="pie" href="#">Términos y condiciones</a><a class="pie" href="#">Instagram</a></nav><p>© 2026</p></footer>`, { ...base, enlaces: {}, productId: "clx1" });
const sinPie = armarLanding(`<h1>Hola</h1>`, { ...base, enlaces: {}, productId: "clx1" });
check("LEG-D", /<a class="pie" href="\/p\/clx1\/legales\?tipo=terminos">Términos y condiciones<\/a><a href="\/p\/clx1\/legales\?tipo=arrepentimiento" class="pie">Botón de arrepentimiento<\/a><a class="pie" href="#">Instagram<\/a>/.test(sinBoton)
  && !/data-tienda-arrepentimiento/.test(sinBoton)
  && new RegExp(`<p data-tienda-arrepentimiento=""><a href="/p/clx1/legales\\?tipo=arrepentimiento">${TEXTO_DE_ARREPENTIMIENTO}</a></p>$`).test(sinPie),
  "sin link de arrepentimiento en el archivo, se agrega el nuestro al lado del último legal del pie, con su clase; sin ningún legal, un párrafo al final");

const sinId = armarLanding(pie, { ...base, enlaces: {} });
check("LEG-E", /<a href="#">Términos y condiciones<\/a>/.test(sinId) && !/data-tienda-arrepentimiento/.test(sinId),
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
