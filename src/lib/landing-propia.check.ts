/**
 * Chequeos de la landing propia. Se corre con:
 *
 *   npx tsx src/lib/landing-propia.check.ts
 *
 * Lo que importa: que NADA ejecutable pase (scripts, eventos, javascript:,
 * iframes, formularios, @import), que los huecos se llenen con los datos
 * del producto y no con lo que traiga escrito el archivo, que lo que no
 * tiene con qué llenarse desaparezca en vez de mostrar "[PRECIO]", y que
 * las instrucciones para Claude pidan exactamente los huecos que leemos.
 */

import { readFileSync } from "node:fs";
import {
  limpiarLanding, limpiarCss, limpiarDeclaraciones, armarLanding, nombreDeFoto, claveDeLink, primerElemento,
  LANDING_MAX_BYTES,
} from "./landing-propia";
import { instruccionesParaClaude, HUECOS_EXPLICADOS } from "./landing-instrucciones";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

/* ── Un archivo como los que baja Claude, con de todo adentro ────────────── */

const CRUDO = `<!doctype html><html><head><meta charset="utf-8"><title>Mi ebook</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree&display=swap">
<link rel="stylesheet" href="https://malo.example.com/x.css">
<style>
@import url("https://malo.example.com/y.css");
.l{color:#333;background:url(data:image/png;base64,AAAA)}
.l h1{font-family:Figtree;behavior:url(x.htc)}
.l .b{background:url("https://cdn.example.com/f.png")}
</style>
<script>alert(1)</script>
</head><body>
<div class="l" onclick="alert(2)" style="color:red;background:url(javascript:alert(3))">
  <h1 data-tienda="nombre">NOMBRE VIEJO</h1>
  <p>$<span data-tienda="precio">[PRECIO]</span> <s data-tienda="precio-anterior">[PRECIO ANTERIOR]</s></p>
  <a data-tienda="comprar" href="https://checkout.ajeno.com/x" target="_blank">Comprar</a>
  <button data-tienda="comprar" onclick="go()">Lo quiero</button>
  <button type="button" class="faq">¿Pregunta?</button>
  <a href="javascript:alert(4)">malo</a>
  <a href="https://afuera.com">afuera</a>
  <a href="#">Términos y condiciones</a>
  <a href="#">Instagram</a>
  <div data-tienda="foto:Portada del ebook" class="cover"></div>
  <img data-tienda="foto:donuts" alt="Donuts" src="">
  <figure data-tienda="foto:falta"></figure>
  <img src="data:image/png;base64,AAAA">
  <img src="https://cdn.shopify.com/s/files/x.png">
  <iframe src="https://youtube.com/embed/x"></iframe>
  <form action="https://x.com"><input type="text" name="email"><input type="checkbox" id="c1"><label for="c1">Marcá</label></form>
  <details><summary>¿Qué recibo?</summary><p>El PDF.</p></details>
  <svg viewBox="0 0 24 24"><use href="#i-check"/><use href="https://afuera.com/x.svg#y"/><path d="M5 12l5 5L20 7"/></svg>
  <span data-afl-timer>15:00</span>
  <div data-tienda="reloj"></div>
  <div data-tienda="opiniones"></div>
  <div data-tienda="aviso-ventas"></div>
</div>
<script src="https://x.com/t.js"></script>
</body></html>`;

const r = limpiarLanding(CRUDO);
if (!r.ok) throw new Error(`no limpió: ${r.problema}`);
const L = r.landing;

/* ── Nada ejecutable ─────────────────────────────────────────────────────── */

check("SEG-A", !/<script|onclick|javascript:|<iframe|<form|<object|<embed/i.test(L.html), "scripts, eventos, javascript:, iframes y formularios: afuera");
check("SEG-B", L.quitado.scripts === 2 && L.quitado.eventos === 2 && L.quitado.marcos === 1 && L.quitado.formularios === 1 && L.quitado.imagenesIncrustadas === 2 && L.quitado.contadores === 1,
  "y el recibo dice cuántos se fueron");
check("SEG-C", !/@import|behavior|data:image|malo\.example/i.test(L.html) && /cdn\.example\.com\/f\.png/.test(L.html) && /color:#333/.test(L.html),
  "el CSS pierde @import, behavior y data:, y conserva el resto del diseño");
check("SEG-D", !/url\(javascript/i.test(L.html) && /style="color:red;?"/.test(L.html), "el style en línea pasa por el mismo filtro");
check("SEG-E", !/afuera\.com\/x\.svg/.test(L.html) && /href="#i-check"/.test(L.html), "un <use> sólo hacia un símbolo del mismo archivo");
check("SEG-F", L.inventario.fuentes.length === 1 && /fonts\.googleapis\.com/.test(L.inventario.fuentes[0]) && !/<link/.test(L.html),
  "las fuentes de Google se anotan aparte (van arriba, afuera del Shadow DOM); otra hoja externa no entra");
check("SEG-G", /<input type="checkbox" id="c1"/.test(L.html) && !/type="text"|name="email"/.test(L.html), "el checkbox de CSS queda; el input de texto no");
check("SEG-H", /<a data-tienda="comprar" href="#">Lo quiero<\/a>/.test(L.html) && /<span class="faq" role="text">¿Pregunta\?<\/span>/.test(L.html),
  "un botón de comprar pasa a link; cualquier otro botón queda como texto, sin perder lo que decía");
check("SEG-I", /<a href="https:\/\/afuera\.com" target="_blank" rel="noopener noreferrer">/.test(L.html), "los links de afuera abren aparte y sin referrer");
check("SEG-J", !limpiarLanding("x".repeat(LANDING_MAX_BYTES + 1)).ok && !limpiarLanding("   ").ok && !limpiarLanding("<script>1</script>").ok, "vacío, sólo script o demasiado pesado: no entra");
check("SEG-K", limpiarCss(`a{expression(alert(1));color:red}`) === "a{color:red}" && limpiarDeclaraciones("color:red;-moz-binding:url(x)") === "color:red;" && limpiarCss(`.l{color:#333;background:url(data:image/png;base64,AAAA)}`) === ".l{color:#333;}", "expression y -moz-binding se van, la declaración de al lado queda");

/* ── El inventario ───────────────────────────────────────────────────────── */

const I = L.inventario;
check("INV-A", I.precio === 1 && I.precioAnterior === 1 && I.comprar === 2 && I.nombre === 1 && I.reloj && I.opiniones && I.avisoVentas, "cuenta cada hueco");
check("INV-B", I.fotos.join() === "portada-del-ebook,donuts,falta" && nombreDeFoto("foto:Páginas 1") === "paginas-1", "las fotos, por nombre normalizado y en orden");
check("INV-C", I.linksVacios.join() === "malo,Términos y condiciones,Instagram" && I.imagenesExternas.length === 1 && /shopify/.test(I.imagenesExternas[0]),
  "los links a ninguna parte y las imágenes de afuera, para que el panel pregunte");
check("INV-D", I.avisos.some((a) => /contador escrito/.test(a) && /15:00/.test(a)) && I.avisos.some((a) => /\[PRECIO ANTERIOR\]/.test(a)) && L.titulo === "Mi ebook",
  "avisa el contador que quedó escrito y los [PRECIO] sin llenar; lee el título");

/* ── Armar ───────────────────────────────────────────────────────────────── */

const FOTO = "https://cdn.tiendaapps.com/f/portada.jpg";
const armada = armarLanding(L.html, {
  nombre: "Panadería en Airfryer", precio: 9900, precioAnterior: 19900, hrefComprar: "/pagar?utm=x",
  fotos: { "portada-del-ebook": FOTO, donuts: "https://cdn.tiendaapps.com/f/donuts.jpg" },
  enlaces: { "terminos-y-condiciones": "https://queantojo.com/terminos", instagram: "javascript:alert(1)" },
  bloques: { reloj: `<p class="reloj">14:59</p>` },
});
const el = (sel: (e: { name: string; attribs: Record<string, string> }) => boolean) => primerElemento(armada, sel);

check("ARM-A", /<h1 data-tienda="nombre">Panadería en Airfryer<\/h1>/.test(armada) && !/NOMBRE VIEJO|\[PRECIO/.test(armada), "el nombre y el precio salen del producto, no del archivo");
check("ARM-B", /\$<span data-tienda="precio">9\.900<\/span>/.test(armada) && /<s data-tienda="precio-anterior">\$\s?19\.900<\/s>/.test(armada),
  "si el archivo ya escribió el $ al lado, no se repite; si no, va con el signo");
check("ARM-C", armada.split(`href="/pagar?utm=x"`).length === 3 && !/checkout\.ajeno|target="_blank" rel="noopener noreferrer">Comprar/.test(armada),
  "los dos botones de comprar van al pago nuestro, sin target ni destino ajeno");
check("ARM-D", /<div data-tienda="foto:Portada del ebook" class="cover"><img src="https:\/\/cdn\.tiendaapps\.com\/f\/portada\.jpg" alt="" loading="lazy" decoding="async"><\/div>/.test(armada),
  "un contenedor de foto recibe la <img> adentro y conserva su caja y su clase");
check("ARM-E", /<img data-tienda="foto:donuts" alt="Donuts" src="https:\/\/cdn\.tiendaapps\.com\/f\/donuts\.jpg" loading="lazy" decoding="async">/.test(armada) && !/foto:falta/.test(armada),
  "una <img> de foto recibe el src; la foto que no se subió desaparece");
check("ARM-F", /<div data-tienda="reloj"><p class="reloj">14:59<\/p><\/div>/.test(armada) && !/data-tienda="opiniones"|data-tienda="aviso-ventas"/.test(armada),
  "un bloque vivo con HTML se pone adentro; sin HTML, el hueco se saca");
check("ARM-G", /<a href="https:\/\/queantojo\.com\/terminos" target="_blank" rel="noopener noreferrer">Términos y condiciones<\/a>/.test(armada) && /<a href="#">Instagram<\/a>/.test(armada),
  "los links vacíos se llenan por su texto; un destino que no es http/mailto/tel no entra");
check("ARM-H", (() => {
  const sinAnterior = armarLanding(L.html, { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {}, mostrarHuecos: true });
  return !/precio-anterior/.test(sinAnterior) && /data-tienda-falta="portada-del-ebook"/.test(sinAnterior);
})(), "sin precio anterior el tachado desaparece; en la previa del panel los huecos de foto se marcan en vez de sacarse");
check("ARM-I", el((e) => e.name === "details") !== null && claveDeLink("  Política de Reembolso ") === "politica-de-reembolso", "el acordeón nativo queda; la clave de un link se normaliza");

/* ── Las instrucciones para Claude ───────────────────────────────────────── */

const inst = instruccionesParaClaude({ nombre: "Panadería en Airfryer", descripcion: "31 recetas.\nCon tiempos.", precio: 9900, precioAnterior: 19900, tipo: "Ebook", vendedor: "¡Qué Antojo!" });
check("INS-A", HUECOS_EXPLICADOS.every((h) => inst.includes(h.hueco.replace("foto:portada", "foto:NOMBRE"))) && /data-tienda="foto:NOMBRE"/.test(inst),
  "las instrucciones nombran cada hueco que leemos");
check("INS-B", /Nada de JavaScript/.test(inst) && /NO pongas contadores/.test(inst) && /No escribas opiniones/.test(inst) && /<details>/.test(inst) && /@import/.test(inst),
  "piden sin scripts, sin contadores, sin opiniones inventadas, acordeón nativo y sin hojas externas");
check("INS-C", /Panadería en Airfryer/.test(inst) && /\$\s?9\.900/.test(inst) && /antes \$\s?19\.900/.test(inst) && /  31 recetas\.\n  Con tiempos\./.test(inst) && /¡Qué Antojo!/.test(inst),
  "van con los datos reales del producto, para que Claude no invente");
check("INS-D", /360 px/.test(inst) && /position: fixed/.test(inst) && /castellano de Argentina/.test(inst) && /MIS INDICACIONES DE DISEÑO/.test(inst),
  "piden celular, sin fijos, en castellano de acá, y dejan el lugar para el pedido de diseño");

/* ── Las dependencias ────────────────────────────────────────────────────── */

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
check("DEP-A", ["sanitize-html", "htmlparser2", "domhandler", "domutils", "dom-serializer"].every((d) => d in pkg.dependencies), "lo que se importa está declarado, no heredado de otro paquete");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
