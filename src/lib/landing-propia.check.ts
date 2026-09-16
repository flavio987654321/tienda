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
import { revisarLanding, tieneTraba } from "./landing-revision";
import { leerInventario } from "./landing-estado";
import { instruccionesParaClaude, pedidoDeCambios, HUECOS_EXPLICADOS } from "./landing-instrucciones";

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
check("INS-E", instruccionesParaClaude({ nombre: "x", descripcion: null, precio: 1, precioAnterior: null, tipo: null, vendedor: null }, "  En bordó y crema.  ").trimEnd().endsWith("En bordó y crema.")
  && instruccionesParaClaude({ nombre: "x", descripcion: null, precio: 1, precioAnterior: null, tipo: null, vendedor: null }).includes("(escribí acá cómo la querés"),
  "lo que escribe sobre el diseño va adentro del mismo texto; sin nada, queda la ayuda");
check("INS-D", /360 px/.test(inst) && /position: fixed/.test(inst) && /castellano de Argentina/.test(inst) && /MIS INDICACIONES DE DISEÑO/.test(inst),
  "piden celular, sin fijos, en castellano de acá, y dejan el lugar para el pedido de diseño");

/* ── Los arreglos: lo que se acomoda solo al subir ───────────────────────── */

const limpio = (h: string) => {
  const x = limpiarLanding(h);
  if (!x.ok) throw new Error(x.problema);
  return x.landing;
};
const FAQ = '<div class="faq__item"><button class="faq__q" type="button" aria-expanded="false">¿Cómo lo recibo?</button><div class="faq__a"><p>Por mail, al instante.</p></div></div>';

check("ARR-A", (() => {
  /* El caso peor: una página que se ve bien y no cobra. */
  const a = limpio('<div><button class="cta">Comprar ahora</button><span data-tienda="precio"></span></div>');
  const el = primerElemento(a.html, (e) => e.attribs["data-tienda"] === "comprar");
  return el?.name === "a" && el.attribs.class === "cta" && a.inventario.comprar === 1 && !tieneTraba(a.inventario.hallazgos)
    && /Conectamos 1 botón/.test(a.inventario.arreglos[0] ?? "");
})(), "un botón suelto que dice «Comprar ahora» se conecta al pago: sin eso se vería bien y no cobraría");

check("ARR-B", (() => {
  /* Adentro de la cápsula el salto por ancla no funciona: probado en el
     navegador. Los que son de compra van al pago; el resto, a completar. */
  const a = limpio('<div><a class="b" href="#oferta">QUIERO EL EBOOK</a><a href="#temario">Ver el temario</a><span data-tienda="precio"></span></div>');
  const comprar = primerElemento(a.html, (e) => e.attribs["data-tienda"] === "comprar");
  return a.inventario.comprar === 1 && comprar?.attribs.class === "b"
    && a.inventario.linksVacios.includes("Ver el temario") && !a.inventario.linksVacios.includes("QUIERO EL EBOOK");
})(), "un link a #seccion que dice comprar va al pago; el que no, queda para completar en el panel");

check("ARR-C", (() => {
  const a = limpio('<div><span data-tienda="comprar"></span><p>¿Cuándo me conviene comprar?</p>' + FAQ + "</div>");
  const b = limpio('<div><a data-tienda="comprar">x</a><button class="btn">Quiero saber más</button></div>');
  return a.inventario.comprar === 1 && b.inventario.comprar === 1;
})(), "una pregunta con la palabra comprar y un «quiero saber más» NO se conectan al pago");

check("ARR-D", (() => {
  const a = limpio('<section>' + FAQ + '</section>');
  const det = primerElemento(a.html, (e) => e.name === "details");
  const sum = primerElemento(a.html, (e) => e.name === "summary");
  return det?.attribs["data-tienda-acordeon"] === "" && sum?.attribs.class === "faq__q"
    && /Cómo lo recibo/.test(a.html) && /Por mail, al instante/.test(a.html)
    && /data-tienda-acordeon\]\[open\]/.test(a.html)
    && /Rescatamos 1 pregunta/.test(a.inventario.arreglos.join(" "));
})(), "una pregunta que abría con un programa pasa a <details> con su clase, y el CSS que la deja ver");

check("ARR-E", (() => {
  /* Dos botones seguidos son pestañas, y ahí estaríamos adivinando. */
  const a = limpio('<div class="tabs"><button aria-expanded="true">Uno</button><button aria-expanded="false">Dos</button><div>Contenido</div></div>');
  /* Y un botón seguido de un link tampoco: no es una respuesta. */
  const b = limpio('<div><button class="x" type="button">¿Pregunta?</button><a href="https://a.com">un link</a></div>');
  return !/<details/.test(a.html) && !/<details/.test(b.html);
})(), "no se inventan acordeones: ni con dos botones seguidos ni cuando al lado hay un link");

check("ARR-F", (() => {
  const a = limpio('<div><button type="button" aria-label="Página siguiente"><span>›</span></button></div>');
  return /necesitaba un programa/.test(a.inventario.sueltos.join(" ")) && /Página siguiente/.test(a.inventario.sueltos.join(" "))
    && !/data-tienda-era/.test(a.html);
})(), "el botón que no se puede arreglar se cuenta por su nombre, y la marca interna no queda en la página");

check("ARR-I", (() => {
  /* La marca de "esto era un botón" la ponemos nosotros: si la trae el
     archivo, no vale. Si no, cualquiera escribiría un div y saldría de
     acordeón. */
  const a = limpio(String.raw`<div><div data-tienda-era="boton">Comprar ahora</div><div><p>Respuesta.</p></div><a data-tienda="comprar">Comprar</a></div>`);
  return a.inventario.comprar === 1 && !/<details/.test(a.html) && !/data-tienda-era/.test(a.html);
})(), "la marca interna que venga escrita en el archivo se ignora");

check("ARR-G", (() => {
  const a = limpio('<div><button class="cta">Lo quiero</button></div>');
  const armado = armarLanding(a.html, {
    nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/p/1/pagar", fotos: {}, enlaces: {}, bloques: {},
  });
  return /href="\/p\/1\/pagar"/.test(armado);
})(), "el botón adoptado termina con la dirección de pago de verdad, como cualquier otro");

check("ARR-H", (() => {
  const a = limpio(CRUDO);
  const vuelto = leerInventario(JSON.stringify(a.inventario));
  const texto = pedidoDeCambios(a.inventario);
  return vuelto.arreglos.length === a.inventario.arreglos.length && vuelto.sueltos.length === a.inventario.sueltos.length
    && leerInventario('{"arreglos":["x",2],"sueltos":"no"}').arreglos.length === 1
    && texto.includes("1. ") && texto.includes("Devolveme el archivo")
    && pedidoDeCambios({ hallazgos: [], avisos: [], sueltos: [], fotos: ["portada"] }) === "";
})(), "los arreglos se guardan y vuelven de la base, y el pedido de cambios se arma numerado (o vacío si no hay nada)");

/* ── La revisión: qué DICE la página ─────────────────────────────────────── */

const nada = { comprar: 1, precio: 1, opiniones: false, css: "" };
const revisar = (t: string, x: Partial<typeof nada> = {}) => revisarLanding(t, { ...nada, ...x });
const dice = (t: string, x: Partial<typeof nada> = {}) => revisar(t, x).map((h) => h.que).join(" | ");

check("REV-A", revisar("Comprá el ebook", { comprar: 0 })[0]?.nivel === "traba" && tieneTraba(revisar("x", { comprar: 0 }))
  && !tieneTraba(revisar("Quedan 3 cupos y mirá los testimonios")),
  "lo único que traba es no tener botón de compra: lo demás avisa, porque el texto es de ella");
check("REV-B", /pocos lugares o cupos/.test(dice("Apurate: quedan solo 3 cupos disponibles.")) && /pocos lugares o cupos/.test(dice("Cupos limitados para esta camada."))
  && !/pocos lugares/.test(dice("Quedan muchas recetas por probar.")),
  "la escasez inventada se marca, y una frase inocente con «quedan» no");
check("REV-C", /reloj o una cuenta regresiva/.test(dice("La oferta termina en 14:59")) && /reloj o una cuenta regresiva/.test(dice("Precio reservado por 10 minutos")),
  "un reloj escrito a mano se marca: sin su programa queda clavado y sigue siendo mentira");
check("REV-D", /opiniones o testimonios/.test(dice('"Me cambió la vida, lo recomiendo a todos los que dudan" Ana P. "Excelente material, muy completo y claro" Jorge R.'))
  && !/opiniones o testimonios/.test(dice('"Me cambió la vida, lo recomiendo a todos los que dudan" Ana P.', { opiniones: true })),
  "los testimonios escritos adentro se marcan; con el hueco de opiniones verificadas, no");
check("REV-E", /cantidad de gente o de ventas/.test(dice("Más de 3.500 alumnos ya lo hicieron")) && !/cantidad de gente/.test(dice("31 recetas probadas")),
  "un número de ventas que nadie puede comprobar se marca; la cantidad de recetas no");
check("REV-F", /precio escrito adentro del texto/.test(dice("Llevátelo por $ 12.900")) && /En ningún lado se ve el precio/.test(dice("Comprá ahora", { precio: 0 }))
  && !/precio/.test(dice("Comprá ahora")),
  "el precio a mano se marca (queda viejo al cambiarlo en Productos), y la página sin precio también");
check("REV-G", /Nombra a Shopify/.test(dice("El pago se procesa por el checkout de Shopify")) && /garantía con plazo/.test(dice("Garantía de 30 días o te devolvemos tu dinero"))
  && /Habla de envíos/.test(dice("Envío gratis a todo el país")),
  "otra plataforma nombrada, una garantía con plazo y un envío en un producto digital");
check("REV-H", /pegado a la pantalla/.test(dice("Hola", { css: ".barra{position:fixed;top:0}" })) && revisar("Hola").length === 0,
  "una barra fija se avisa (tapa el botón en celulares chicos); un texto limpio no dice nada");
check("REV-I", (() => {
  /* El texto de dos bloques NO se pega: "<h1>Curso</h1><p>Quedan…" daría
     "CursoQuedan" y la revisión dejaría de ver la frase. */
  const r = limpiarLanding('<div><h1>Curso</h1><p>Quedan solo 3 cupos.</p><a data-tienda="comprar">Comprar</a><span data-tienda="precio"></span></div>');
  return r.ok && r.landing.inventario.hallazgos.some((h) => /pocos lugares o cupos/.test(h.que));
})(), "la revisión corre sobre el texto con los bloques separados por espacios");
check("REV-J", (() => {
  const r = limpiarLanding(CRUDO);
  const g = r.ok ? r.landing.inventario.hallazgos : [];
  const vuelto = leerInventario(JSON.stringify(r.ok ? r.landing.inventario : {})).hallazgos;
  return g.length > 0 && vuelto.length === g.length && vuelto[0].nivel === g[0].nivel
    && leerInventario('{"hallazgos":[{"nivel":"traba"},{"que":"x","nivel":"otro"},"x"]}').hallazgos.length === 1;
})(), "los hallazgos se guardan con la versión y vuelven de la base sin confiar en su forma");

/* ── La ruta, la página pública y el panel ───────────────────────────────── */

const leer = (ruta: string) => readFileSync(ruta, "utf8").replace(/\r\n/g, "\n");
const ruta = leer("src/app/api/digitales/productos/[id]/landing/route.ts");
const publica = leer("src/app/p/[id]/page.tsx");
const componente = leer("src/components/digitales/LandingPropia.tsx");
const panel = leer("src/app/digitales/productos/[id]/landing/LandingClient.tsx");
const panelPage = leer("src/app/digitales/productos/[id]/landing/page.tsx");
const editorPagina = leer("src/app/digitales/productos/[id]/pagina/page.tsx");
const schema = leer("prisma/schema.prisma");
const migracion = leer("prisma/migrations/20260916020000_landing_propia/migration.sql");

check("RUTA-A", /const r = limpiarLanding\(html\);/.test(ruta) && /html: L\.html,/.test(ruta) && !/data: \{[^}]*html: html\b/.test(ruta),
  "lo que se guarda es lo LIMPIO: el archivo crudo no llega nunca a la base");
check("RUTA-B", /rolDigital: "PRINCIPAL", store: \{ ownerId: userId \}/.test(ruta) && ruta.split("elProducto(user.id, id)").length === 3,
  "el dueño va adentro del where, en las dos rutas: un id ajeno no encuentra nada");
check("RUTA-C", /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)/.test(ruta) && /checkRateLimit\([^)]*clave[^)]*userId[^)]*, 60,/.test(ruta),
  "Starter y Pro al día, y con tope de intentos por hora");
check("RUTA-D", /const crudo = await req\.text\(\)[\s\S]*?crudo\.length > CUERPO_MAX/.test(ruta),
  "el cuerpo se mide como texto antes de parsearlo: un archivo enorme no se convierte en objeto");
check("RUTA-E", /skip: LANDING_VERSIONES[\s\S]*?deleteMany/.test(ruta), "se guardan las últimas versiones y las viejas se borran");
check("RUTA-F", /\.\.\.estado, versionId: creada\.id/.test(ruta) && !/fotos: \{\}/.test(ruta),
  "subir una versión nueva NO borra las fotos ni los links: se guardan por nombre de hueco");
check("RUTA-G", /b\.activa && !nuevo\.versionId/.test(ruta) && /\^https:\\\/\\\//.test(ruta) && /\^\(https\?:\\\/\\\/\|mailto:\|tel:\)/.test(ruta),
  "no se prende sin nada subido; una foto sólo por https y un link sólo http/mailto/tel");

check("PUB-A", /if \(\(!estado\.activa && !previa\) \|\| !estado\.versionId\) return null;/.test(publica) && /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)\) return null/.test(publica),
  "la landing se muestra sólo si está prendida y el plan la incluye; si vence, vuelve la página de secciones");
check("PUB-B", /nombre: fila\.name,\n\s+precio: fila\.price,\n\s+precioAnterior: fila\.comparePrice,/.test(publica) && /hrefComprar: "\/pagar"/.test(publica),
  "el precio, el nombre y el botón salen del producto: cambiar el precio en Productos cambia la landing");
check("PUB-C", /apagado=\{!fila\.isActive \|\| previaDeLanding\}/.test(publica) && /\{fila\.isActive && !previaDeLanding && \(\(\) =>/.test(publica),
  "la visita y el píxel siguen afuera de la landing, y la previa de la dueña no cuenta ni mide");
check("PUB-D", /landing \? <LandingPropia html=\{landing\.html\} fuentes=\{landing\.fuentes\} \/> : <PaginaDeVenta/.test(publica),
  "reemplaza SÓLO el cuerpo de la página: lo de alrededor no se entera");
check("PUB-E", /const previaDeLanding = quiereLaPrevia && \(await getCurrentUser\(\)\)\?\.id === fila\.store\.ownerId;/.test(publica),
  "la previa con la landing apagada la ve sólo su dueña");
check("PUB-F", /shadowrootmode="open"/.test(componente) && /dangerouslySetInnerHTML/.test(componente) && /rel="stylesheet" href=\{f\}/.test(componente),
  "se dibuja adentro de un Shadow DOM declarativo, con las fuentes afuera");

check("PAN-A", /accept="\.html,text\/html"/.test(panel) && /file\.size > LANDING_MAX_BYTES/.test(panel) && /await file\.text\(\)/.test(panel),
  "el panel sube el .html leyéndolo en el navegador, con el mismo tope que el servidor");
check("PAN-B", /landing=previa/.test(panel) && /sandbox=""/.test(panel) && /pantalla === "celular"/.test(panel),
  "la previa es la página de verdad, en un marco sin permisos, en computadora y celular");
check("PAN-C", /No pudimos conectarnos/.test(panel) && /Starter y Pro/.test(panel) && /instruccionesParaClaude\(producto, indicaciones\)/.test(panel) && /producto=\{\{/.test(panelPage) && /usePedidoGuardado/.test(panel) && !/useEffect/.test(panel),
  "la pantalla dice los errores, el plan, y arma el pedido con los datos del producto más lo que ella escribió del diseño (guardado en su navegador)");
check("PAN-D", /leerEstadoDeLanding\(fila\.landingPropia\)\.activa \?/.test(editorPagina) && /edites acá no se ve/.test(editorPagina),
  "con la landing prendida, el editor de secciones avisa que lo que se edita ahí no se muestra");

check("BASE-A", /landingPropia String\?/.test(schema) && /model LandingDigital \{/.test(schema)
  && /ADD COLUMN IF NOT EXISTS "landingPropia" TEXT/.test(migracion) && /CREATE TABLE IF NOT EXISTS "LandingDigital"/.test(migracion),
  "la columna, la tabla de versiones y la migración idempotente");

/* ── Las dependencias ────────────────────────────────────────────────────── */

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
check("DEP-A", ["sanitize-html", "htmlparser2", "domhandler", "domutils", "dom-serializer"].every((d) => d in pkg.dependencies), "lo que se importa está declarado, no heredado de otro paquete");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
