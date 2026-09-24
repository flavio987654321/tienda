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
import { leerInventario, leerEstadoDeLanding, acomodarEnlace, MAX_FOTOS_DE_LANDING, MAX_ENLACES_DE_LANDING } from "./landing-estado";
import { instruccionesParaClaude, pedidoDeConversion, pedidoDeCambios, HUECOS_EXPLICADOS } from "./landing-instrucciones";
import { EFECTOS_DE_LA_LANDING, ESTILO_DE_LA_CAPSULA } from "./landing-efectos";

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
/* La cuarta es la imagen incrustada (`data:`) que le sacamos: quedaba como
   un <img> sin dirección, o sea rota. Ahora es un lugar donde subir la foto
   de verdad, que es lo que hacía falta. Ver `rescatarFotos`. */
check("INV-B", I.fotos.join() === "portada-del-ebook,donuts,falta,foto-1" && nombreDeFoto("foto:Páginas 1") === "paginas-1",
  "las fotos, por nombre normalizado y en orden; y la incrustada que sacamos queda como lugar para subirla");
check("INV-C", I.linksVacios.join() === "malo,Términos y condiciones,Instagram" && I.imagenesExternas.length === 1 && /shopify/.test(I.imagenesExternas[0]),
  "los links a ninguna parte y las imágenes de afuera, para que el panel pregunte");
/* Los [PRECIO] ya no se avisan: los llenamos nosotros con el precio de
   verdad (`llenarMarcadoresDePrecio`). Se avisa lo que no sabemos qué va. */
check("INV-D", I.avisos.some((a) => /contador escrito/.test(a) && /15:00/.test(a)) && !I.avisos.some((a) => /\[PRECIO/.test(a)) && L.titulo === "Mi ebook",
  "avisa el contador que quedó escrito, ya no los [PRECIO] (ésos se llenan solos); lee el título");

/* ── Armar ───────────────────────────────────────────────────────────────── */

const FOTO = "https://cdn.tiendaapps.com/f/portada.jpg";
const armada = armarLanding(L.html, {
  nombre: "Panadería en Airfryer", precio: 9900, precioAnterior: 19900, hrefComprar: "/pagar?utm=x",
  fotos: { "portada-del-ebook": FOTO, donuts: "https://cdn.tiendaapps.com/f/donuts.jpg" },
  enlaces: { "terminos-y-condiciones": "https://queantojo.com/terminos", instagram: "javascript:alert(1)" },
  bloques: {},
  /* El precio de bienvenida corriendo: 9.900 es el de bienvenida, 19.900 el
     normal (tachado), y al vencer vuelve 12.000 con el 19.900 de siempre. */
  bienvenida: { productId: "clx0000000000000000000009", token: "1800000000000.abcdefghijklmnopqrstuvwx", venceEn: 1_800_000_000_000, texto: "Precio de bienvenida reservado por", despues: { precio: 12000, precioAnterior: 19900 } },
});
const el = (sel: (e: { name: string; attribs: Record<string, string> }) => boolean) => primerElemento(armada, sel);

check("ARM-A", /<h1 data-tienda="nombre">Panadería en Airfryer<\/h1>/.test(armada) && !/NOMBRE VIEJO|\[PRECIO/.test(armada), "el nombre y el precio salen del producto, no del archivo");
check("ARM-B", /\$<span data-tienda="precio" data-tienda-despues="12\.000">9\.900<\/span>/.test(armada) && /<s data-tienda="precio-anterior" data-tienda-despues="\$\s?19\.900">\$\s?19\.900<\/s>/.test(armada),
  "si el archivo ya escribió el $ al lado, no se repite; si no, va con el signo. Y cada precio lleva escrito lo que dice cuando vence el reloj");
check("ARM-C", armada.split(`href="/pagar?utm=x"`).length === 3 && !/checkout\.ajeno|target="_blank" rel="noopener noreferrer">Comprar/.test(armada),
  "los dos botones de comprar van al pago nuestro, sin target ni destino ajeno");
check("ARM-D", /<div data-tienda="foto:Portada del ebook" class="cover"><img src="https:\/\/cdn\.tiendaapps\.com\/f\/portada\.jpg" alt="" loading="lazy" decoding="async" data-tienda-foto=""><\/div>/.test(armada),
  "un contenedor de foto recibe la <img> adentro y conserva su caja y su clase");
check("ARM-E", /<img data-tienda="foto:donuts" alt="Donuts" src="https:\/\/cdn\.tiendaapps\.com\/f\/donuts\.jpg" data-tienda-foto="" loading="lazy" decoding="async">/.test(armada) && !/foto:falta/.test(armada),
  "una <img> de foto recibe el src; la foto que no se subió desaparece");
check("ARM-F", /<div data-tienda="reloj" data-tienda-reloj="" data-tienda-vence="1800000000000" data-tienda-token="1800000000000\.abcdefghijklmnopqrstuvwx" data-tienda-clave="pv_bienvenida_clx0000000000000000000009">Precio de bienvenida reservado por <b data-tienda-cuenta="">[0-9:]+<\/b><\/div>/.test(armada)
  && !/data-tienda="opiniones"|data-tienda="aviso-ventas"|data-tienda-barra-propia|Ejemplo/.test(armada),
  "el hueco del reloj recibe el reloj de verdad (texto, cuenta, hora en que vence, token y clave); sin HTML, los otros huecos se sacan; con hueco no hay barra nuestra");
check("ARM-F2", (() => {
  const b = { productId: "clx0000000000000000000009", token: "1800000000000.abcdefghijklmnopqrstuvwx", venceEn: 1_800_000_000_000, texto: "Reservado por", despues: { precio: 12000, precioAnterior: null } };
  const sinHueco = armarLanding(L.html.replace(/<div data-tienda="reloj"><\/div>/, ""), { nombre: "x", precio: 9900, precioAnterior: 12000, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {}, bienvenida: b });
  const demo = armarLanding(L.html, { nombre: "x", precio: 9900, precioAnterior: 19900, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {}, bienvenida: { ...b, token: "", venceEn: 0, demo: true } });
  const apagada = armarLanding(L.html, { nombre: "x", precio: 9900, precioAnterior: 19900, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {} });
  return /^<div data-tienda-barra-propia="" data-tienda-reloj=""/.test(sinHueco) && /data-tienda-despues=""/.test(sinHueco)
    && /data-tienda-demo=""/.test(demo) && /<b data-tienda-cuenta="">14:59<\/b><small data-tienda-ejemplo="">Ejemplo<\/small>/.test(demo) && !/data-tienda-despues/.test(demo)
    && !/data-tienda="reloj"|data-tienda-reloj|data-tienda-despues/.test(apagada);
})(), "sin hueco el reloj va en una barra nuestra arriba de todo; un tachado que no vuelve se marca para sacarse; la previa lo muestra quieto y marcado Ejemplo; apagado, ni hueco ni marcas");
/* El "reservado por 15:00" escrito pasa a ser el hueco del reloj, con su
   pastilla como lugar de la cuenta; "a las 18:00" no es un contador. Y lo
   guardado antes del rescate se rescata al dibujar, si el reloj está prendido. */
check("ARM-F3", (() => {
  const crudo = `<html><body><div class="afl-bar"><span>🔥 Precio promocional reservado por:</span><span class="afl-bar__time">15:00</span></div><p>Clase en vivo a las <b>18:00</b></p><p class="aviso">La clase termina a las <b>18:00</b> hs</p><p>$<span data-tienda="precio"></span></p><a data-tienda="comprar" href="#">Comprar</a></body></html>`;
  const r = limpiarLanding(crudo);
  if (!r.ok) return false;
  const L2 = r.landing;
  const b = { productId: "clx0000000000000000000009", token: "1800000000000.abcdefghijklmnopqrstuvwx", venceEn: 1_800_000_000_000, texto: "Reservado por", despues: { precio: 12000, precioAnterior: null } };
  const prendida = armarLanding(L2.html, { nombre: "x", precio: 9900, precioAnterior: 12000, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {}, bienvenida: b });
  const apagada = armarLanding(L2.html, { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {} });
  /* Una versión guardada SIN el rescate (limpieza vieja): se rescata al dibujar. */
  const vieja = `<div class="afl-bar"><span>🔥 Reservado por:</span><span class="afl-bar__time">15:00</span></div><p>$<span data-tienda="precio"></span></p>`;
  const rescatadaAlDibujar = armarLanding(vieja, { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {}, bienvenida: b });
  const viejaApagada = armarLanding(vieja, { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {} });
  /* Sin contador, sólo un horario que dice "termina": no es un reloj y no se
     toca, ni prendido (va la barra nuestra) ni apagado. */
  const horario = `<p class="aviso">La clase termina a las <b>18:00</b> hs</p><p>$<span data-tienda="precio"></span></p>`;
  const horarioPrendido = armarLanding(horario, { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {}, bienvenida: b });
  const horarioApagado = armarLanding(horario, { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {} });
  return /<div class="afl-bar" data-tienda="reloj"><span>🔥 Precio promocional reservado por:<\/span><span class="afl-bar__time" data-tienda-cuenta="">15:00<\/span><\/div>/.test(L2.html) && /<b>18:00<\/b>/.test(L2.html)
    && L2.inventario.reloj && L2.inventario.arreglos.some((a) => /contador escrito .*pasó a ser el hueco del reloj/.test(a)) && !L2.inventario.avisos.some((a) => /contador escrito/.test(a))
    && /<div class="afl-bar" data-tienda="reloj" data-tienda-reloj=""[^>]*>Reservado por <span class="afl-bar__time" data-tienda-cuenta="">[0-9:]+<\/span><\/div>/.test(prendida) && !/Precio promocional|data-tienda-barra-propia/.test(prendida)
    && !/afl-bar|15:00|data-tienda-reloj/.test(apagada) && /<b>18:00<\/b>/.test(apagada) && /La clase termina a las <b>18:00<\/b> hs/.test(apagada)
    && /<div class="afl-bar" data-tienda="reloj" data-tienda-reloj=""[^>]*>Reservado por <span class="afl-bar__time" data-tienda-cuenta="">/.test(rescatadaAlDibujar) && !/data-tienda-barra-propia/.test(rescatadaAlDibujar)
    && !/afl-bar|15:00|data-tienda-reloj/.test(viejaApagada) && /9\.900/.test(viejaApagada)
    && /La clase termina a las <b>18:00<\/b> hs/.test(horarioPrendido) && /data-tienda-barra-propia/.test(horarioPrendido) && /La clase termina a las <b>18:00<\/b> hs/.test(horarioApagado);
})(), "el contador escrito se rescata como hueco del reloj (la pastilla conserva su CSS), es un arreglo y no un aviso, apagado desaparece entero, 'a las 18:00' no se toca, lo guardado viejo se rescata al dibujar, prendido o apagado, y un horario del día no es un reloj");
/* La lista de tildar de la landing real: casillas de verdad, tilde pintado
   por una clase que ponía su script. Se reescribe SU CSS a `:has`. Un
   `.tab.active` sin casilla no se toca. Y lo guardado viejo, al dibujar. */
check("ARM-F4", (() => {
  const crudo = `<html><head><style>.l .pain.is-checked{background:red}.l .pain.is-checked .box{opacity:1}.l .tab.active{color:red}.l .pain input:focus-visible ~ .box{outline:1px}</style></head><body><div class="l"><label class="pain"><input type="checkbox"><span>Texto</span><span class="box"></span></label><div class="tab active">Pestaña</div><p>$<span data-tienda="precio"></span></p><a data-tienda="comprar" href="#">Comprar</a></div><script>document.querySelectorAll(".pain").forEach(l=>l.onchange=()=>l.classList.toggle("is-checked"))</script></body></html>`;
  const r = limpiarLanding(crudo);
  if (!r.ok) return false;
  const L = r.landing;
  const base = { nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/pagar", fotos: {}, enlaces: {}, bloques: {} };
  const vieja = `<style>\n.l .pain.is-checked{background:red}\n</style>\n<div class="l"><label class="pain"><input type="checkbox"><span class="box"></span></label></div>`;
  return /\.l \.pain:has\(input:checked\)\{background:red\}/.test(L.html) && /\.l \.pain:has\(input:checked\) \.box\{opacity:1\}/.test(L.html)
    && !/is-checked/.test(L.html) && /\.l \.tab\.active\{color:red\}/.test(L.html) && /<input type="checkbox"/.test(L.html)
    && L.inventario.arreglos.some((a) => /lista para tildar/.test(a))
    && /\.l \.pain:has\(input:checked\)\{background:red\}/.test(armarLanding(vieja, base));
})(), "la lista de tildar se pinta sola: `.clase.is-checked` pasa a `:has(input:checked)` sólo si la clase envuelve una casilla; lo guardado viejo se arregla al dibujar");
check("ARM-G",/<a href="https:\/\/queantojo\.com\/terminos" target="_blank" rel="noopener noreferrer">Términos y condiciones<\/a>/.test(armada) && /<a href="#">Instagram<\/a>/.test(armada),
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
/* "Ya tengo una página": las MISMAS reglas (una sola copia), la consigna es
   adaptar y no rediseñar, y lo que hacía con código se rehace sin código. */
check("INS-F", (() => {
  const conv = pedidoDeConversion({ nombre: "Panadería en Airfryer", descripcion: null, precio: 9900, precioAnterior: null, tipo: "Ebook", vendedor: null }, " Cambiá el titular. ");
  const reglasDe = (t: string) => t.slice(t.indexOf("REGLAS TÉCNICAS"), t.indexOf("\n10. "));
  return reglasDe(conv) === reglasDe(inst) && reglasDe(conv).length > 2000
    && /te la adjunto como archivo \.html/.test(conv) && /la dejes IGUAL/.test(conv) && /sin rediseñarla/.test(conv)
    && /rehacelo sin código/.test(conv) && /Panadería en Airfryer/.test(conv) && conv.trimEnd().endsWith("Cambiá el titular.")
    && !/MIS INDICACIONES DE DISEÑO/.test(conv) && /qué cambiaste/.test(conv);
})(), "el pedido de conversión lleva las mismas reglas que el de cero (una sola copia), pide dejarla igual y rehacer sin código lo que traía con JavaScript");
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

/* El ejemplo era una flecha («Página siguiente»), y desde que las flechas se
   rescatan (ver FLE-A) ésa ya no es de las que no se pueden arreglar. Ahora
   es un botón de compartir: no hay nada que enchufarle sin adivinar. */
check("ARR-F", (() => {
  const a = limpio('<div><button type="button" aria-label="Compartir en redes"><span>↗</span></button></div>');
  return /necesitaba un programa/.test(a.inventario.sueltos.join(" ")) && /Compartir en redes/.test(a.inventario.sueltos.join(" "))
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
/* Traía código: UN punto que pide rehacer sin código, y tapa al de los
   botones sueltos (que sin programas se sigue pidiendo solo). */
check("ARR-J", (() => {
  const base = { hallazgos: [], avisos: [], fotos: ["portada"], sueltos: ["2 botones que necesitaban un programa"] };
  const conCodigo = pedidoDeCambios({ ...base, quitado: { scripts: 2, eventos: 0 } });
  const soloEventos = pedidoDeCambios({ ...base, sueltos: [], quitado: { scripts: 0, eventos: 3 } });
  const sinCodigo = pedidoDeCambios({ ...base, quitado: { scripts: 0, eventos: 0 } });
  return /1\. La página traía JavaScript/.test(conCodigo) && /tildar/.test(conCodigo) && /<details>/.test(conCodigo) && !/2\. /.test(conCodigo)
    && /traía JavaScript/.test(soloEventos)
    && /1\. Sacá los botones que necesitan JavaScript/.test(sinCodigo) && !/traía JavaScript/.test(sinCodigo);
})(), "si el archivo traía programas, el pedido de cambios pide rehacer todo sin código, en un solo punto");

/* ── Los "[PRECIO]" que llenaba el script ───────────────────────────────── */

check("PRE-A", (() => {
  /* El caso de verdad, tal como viene: el signo de pesos afuera y el
     marcador adentro de un span. El hueco tiene que ser ESE span, no uno
     nuevo adentro, para que el signo de al lado no se escriba dos veces. */
  const a = limpio(String.raw`<div><p class="p">$<span class="n">[PRECIO]</span></p><a data-tienda="comprar">x</a></div>`);
  const hueco = primerElemento(a.html, (e) => e.attribs["data-tienda"] === "precio");
  const armado = armarLanding(a.html, {
    nombre: "x", precio: 9900, precioAnterior: null, hrefComprar: "/x", fotos: {}, enlaces: {}, bloques: {},
  });
  return hueco?.attribs.class === "n" && a.inventario.precio === 1
    && /9\.900/.test(armado) && !/\$\s*\$/.test(armado)
    && /Llenamos 1 lugar del precio/.test(a.inventario.arreglos.join(" "));
})(), "el «[PRECIO]» que llenaba el script pasa a ser el hueco del precio, sin repetir el signo $");

check("PRE-B", (() => {
  /* El tachado, y un marcador en el medio de una frase: ahí sí se parte el
     texto y el hueco va en el medio. */
  const a = limpio(String.raw`<div><p>Antes [PRECIO ANTERIOR] ahora</p><a data-tienda="comprar">x</a></div>`);
  const armado = armarLanding(a.html, {
    nombre: "x", precio: 9900, precioAnterior: 19900, hrefComprar: "/x", fotos: {}, enlaces: {}, bloques: {},
  });
  return a.inventario.precioAnterior === 1 && /Antes <span data-tienda="precio-anterior">\$ 19\.900<\/span> ahora/.test(armado);
})(), "«[PRECIO ANTERIOR]» en el medio de una frase parte el texto y queda el tachado en su lugar");

check("PRE-C", (() => {
  /* Lo que no sabemos qué va, no se toca: se avisa. */
  const a = limpio(String.raw`<div><p>Hola [MARCA], llevate [NOMBRE DEL EBOOK] hoy mismo</p><a data-tienda="comprar">x</a></div>`);
  return a.inventario.precio === 0 && /\[MARCA\]/.test(a.html)
    && a.inventario.avisos.some((x) => x.includes("[MARCA]"))
    && a.inventario.arreglos.length === 0;
})(), "los marcadores que no son de precio no se tocan: no sabemos qué van, así que se avisan");

/* ── Los efectos: el movimiento que reemplaza al script de ella ─────────── */

check("EFE-A", (() => {
  /* Un link a una sección que existe se deja vivo (el script lo hace bajar);
     el que apunta a la nada se normaliza para poder completarlo, y el que
     está ADENTRO de su propio destino no tiene a dónde bajar: ése cobra. */
  const a = limpio(String.raw`<div><a class="x" href="#oferta">Ver la oferta</a><a href="#nada">Perdido</a>
    <section id="oferta"><a href="#oferta">QUIERO EL EBOOK</a></section><span data-tienda="precio"></span></div>`);
  const vivo = primerElemento(a.html, (e) => e.attribs.class === "x");
  return vivo?.attribs.href === "#oferta" && a.inventario.comprar === 1
    && a.inventario.linksVacios.includes("Perdido")
    && /baja a otra parte de tu página/.test(a.inventario.arreglos.join(" "));
})(), "el link que baja a una sección se deja vivo; el que apunta a la nada se completa, y el que está adentro de su destino cobra");

check("EFE-B", EFECTOS_DE_LA_LANDING.includes("scrollIntoView") && EFECTOS_DE_LA_LANDING.includes("prefers-reduced-motion")
  && !/\beval\b|new Function|innerHTML|document\.write|fetch\(|XMLHttpRequest/.test(EFECTOS_DE_LA_LANDING)
  && EFECTOS_DE_LA_LANDING.includes("shadowRoot"),
  "el script nuestro baja suave, respeta a quien pidió menos movimiento, y no ejecuta ni trae nada de afuera");

check("EFE-C", ESTILO_DE_LA_CAPSULA.includes(":host{all:initial")
  && ESTILO_DE_LA_CAPSULA.includes(":host(:not([data-tienda-efectos]))")
  && /opacity:1!important/.test(ESTILO_DE_LA_CAPSULA),
  "la cápsula no hereda la letra de la página, y sin nuestro script lo que «aparece» se ve igual: nunca un botón invisible");

check("EFE-D", (() => {
  /* La marca de la autora entra; la que ponemos nosotros al ver el
     elemento, no: si la escribe ella, arrancaría mostrado. */
  const a = limpio(String.raw`<div data-tienda-aparece data-tienda-visto="" class="c"><a data-tienda="comprar">x</a></div>`);
  return /data-tienda-aparece/.test(a.html) && !/data-tienda-visto/.test(a.html);
})(), "data-tienda-aparece sobrevive a la limpieza y data-tienda-visto no, porque ése lo ponemos nosotros");

check("EFE-E", inst.includes("data-tienda-aparece")
  && inst.includes("[data-tienda-visto]")
  && /Los links internos a otra sección .* funcionan/.test(inst),
  "las instrucciones le enseñan a Claude las dos únicas formas de animar que andan acá");

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
check("RUTA-B", /rolDigital: "PRINCIPAL", store: \{ ownerId: userId \}/.test(ruta) && ruta.split("elProducto(user.id, id)").length === 4,
  "el dueño va adentro del where, en las tres rutas: un id ajeno no encuentra nada");
check("RUTA-C", /sub\.tier === "FREE" \|\| !isSubscriptionActive\(sub\)/.test(ruta) && /checkRateLimit\([^)]*clave[^)]*userId[^)]*, 60,/.test(ruta),
  "Starter y Pro al día, y con tope de intentos por hora");
check("RUTA-D", /const crudo = await req\.text\(\)[\s\S]*?crudo\.length > CUERPO_MAX/.test(ruta),
  "el cuerpo se mide como texto antes de parsearlo: un archivo enorme no se convierte en objeto");
check("RUTA-E", /skip: LANDING_VERSIONES[\s\S]*?deleteMany/.test(ruta), "se guardan las últimas versiones y las viejas se borran");
check("RUTA-F", /\.\.\.estado, versionId: creada\.id/.test(ruta) && !/fotos: \{\}/.test(ruta),
  "subir una versión nueva NO borra las fotos ni los links: se guardan por nombre de hueco");
check("RUTA-G", /b\.activa && !nuevo\.versionId/.test(ruta) && /\^https:\\\/\\\//.test(ruta)
  && /const r = acomodarEnlace\(url \?\? ""\);/.test(ruta) && /if \(!r\.error && r\.url\.length <= 600\)/.test(ruta),
  "no se prende sin nada subido; una foto sólo por https, y el link pasa por el mismo acomodo que la pantalla");

const reglaLanding = leer("src/lib/landing-del-producto.ts");
check("PUB-A", /if \(\(!estado\.activa && !previa\) \|\| !estado\.versionId\) return null;/.test(publica)
  && /elPlanMuestraDisenos\(fila\.store\.owner\.subscription\)/.test(publica)
  && /return estado\.activa && !!estado\.versionId && elPlanMuestraDisenos\(sub\);/.test(reglaLanding),
  "la landing se muestra sólo si está prendida y el plan la incluye; si vence, vuelve la página de secciones");
/* El link del pago lo mira PAGO-B, que es donde se explica por qué. */
check("PUB-B", /nombre: fila\.name,[\s\S]{0,400}?precio: viva \? viva\.precio : fila\.price,\n\s+precioAnterior: viva \? viva\.precioNormal : fila\.comparePrice,/.test(publica)
  && /despues: \{ precio: fila\.price, precioAnterior: fila\.comparePrice \}/.test(publica),
  "el precio y el nombre salen del producto: cambiar el precio en Productos cambia la landing. Con el reloj corriendo, el de bienvenida; al vencer, el del producto");
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
/* El marco deja correr JavaScript —el nuestro, el de los efectos— pero sin
   `allow-same-origin`: adentro no hay cookies ni sesión. Si se le diera el
   origen, un archivo ajeno estaría corriendo con nuestra sesión. */
check("PAN-B", /landing=previa/.test(panel) && /sandbox="allow-scripts"/.test(panel) && !/allow-same-origin/.test(panel) && /pantalla === "celular"/.test(panel),
  "la previa es la página de verdad, en un marco que puede moverse pero no tiene nuestro origen, en computadora y celular");
check("PAN-C", /No pudimos conectarnos/.test(panel) && /Starter y Pro/.test(panel) && /instruccionesParaClaude\(producto, indicaciones\)/.test(panel) && /producto=\{\{/.test(panelPage) && /usePedidoGuardado/.test(panel) && !/useEffect/.test(panel),
  "la pantalla dice los errores, el plan, y arma el pedido con los datos del producto más lo que ella escribió del diseño (guardado en su navegador)");
check("PAN-C2", /pedidoDeConversion\(producto, indicaciones\)/.test(panel) && /Ya tengo una página/.test(panel) && /role="tablist"/.test(panel)
  && /pedidoDeCambios\(\{ \.\.\.inv, quitado: version\.quitado \}\)/.test(panel) && /quedó quieto; abajo está el pedido/.test(panel),
  "el paso 1 tiene el camino 'ya tengo una página' con el pedido de conversión, y el pedido de cambios sabe qué código se sacó");
/* Prender es lo que ve el público: el interruptor abre un repaso (fotos,
   links guardados y completos, legales cargados, avisos, publicado) y recién
   "Sí, prenderla" pide al servidor. Con links sin guardar no se puede.
   Apagar sigue siendo inmediato: vuelve nuestra página. */
check("PAN-E", panel.includes("if (estado.activa) void pedir({ activa: false }); else setVaAPrender(true)")
  && /Antes de prenderla, así está:/.test(panel) && /Sí, prenderla/.test(panel) && /Todavía no/.test(panel)
  && /onClick=\{\(\) => \{ setVaAPrender\(false\); void pedir\(\{ activa: true \}\); \}\}\s+disabled=\{sinGuardar\}/.test(panel)
  && /esos lugares se sacan de la página/.test(panel) && /Te falta cargar/.test(panel) && panel.includes("!enlaces[claveDeLink(t)] && !legalDelLink(t)"),
  "prender pide confirmación con el repaso de lo que falta y no deja prender con links sin guardar; apagar es inmediato; los legales no cuentan como links sin dirección");
const editorClient = leer("src/app/digitales/productos/[id]/pagina/EditorClient.tsx");
check("PAN-D", /leerEstadoDeLanding\(fila\.landingPropia\)\.activa \?/.test(editorPagina) && /edites acá no se ve/.test(editorPagina)
  && /landingPrendida=\{leerEstadoDeLanding\(fila\.landingPropia\)\.activa\}/.test(editorPagina)
  && /Apagada: tu dirección está mostrando tu propio diseño\./.test(editorClient) && /Así se vería · apagada/.test(editorClient)
  && editorClient.includes("landingPrendida ? `/p/${productoId}?previa=1` : `/p/${productoId}`") && /landingPrendida \? "Ver esta página" : "Abrirla"/.test(editorClient),
  "con la landing prendida, el editor de secciones lo avisa arriba, encima de la previa (sin desteñirla), y 'Abrirla' abre esta página y no la landing");
/* Escribir con IA gasta una generación: con la landing prendida no se
   ofrece (botón apagado con el motivo) y la API lo rechaza aunque el pedido
   venga de otro lado. Editar a mano sigue: es gratis y se guarda. */
const apiPagina = leer("src/app/api/digitales/ia/pagina/route.ts");
check("PAN-F", /landingPrendida \? \(\s*<button\s+type="button"\s+disabled/.test(editorClient) && /apagá tu propio diseño para escribirla con IA/.test(editorClient)
  && apiPagina.includes("leerEstadoDeLanding(producto.landingPropia).activa") && /status: 409/.test(apiPagina)
  && apiPagina.indexOf("leerEstadoDeLanding(producto.landingPropia).activa") < apiPagina.indexOf("consumirDelCupo(user.id, tier)"),
  "con la landing prendida, escribir con IA está apagado en el panel y rechazado por la API antes de gastar cupo");

check("BASE-A", /landingPropia String\?/.test(schema) && /model LandingDigital \{/.test(schema)
  && /ADD COLUMN IF NOT EXISTS "landingPropia" TEXT/.test(migracion) && /CREATE TABLE IF NOT EXISTS "LandingDigital"/.test(migracion),
  "la columna, la tabla de versiones y la migración idempotente");

/* ── Salir del <style>: lo que encontró la auditoría ─────────────────────── */

/* ⚠️ EL AGUJERO GRANDE. El CSS de ella se guarda adentro de un <style>
   NUESTRO, y el navegador cierra esa etiqueta con `</style >` —con un
   espacio, un tab, un salto o una barra— igual que con `</style>`. Quien la
   cierre sale de la hoja, sale del <template> del Shadow DOM y escribe HTML
   suyo en NUESTRA página; con `unsafe-inline` en el CSP, un `onerror` ahí
   corre. Probado en Chromium antes de arreglarlo: ejecutaba. */
const SALIDAS = [
  `<style>a{}</style >EVIL</style><div>x</div>`,
  `<style>a{}</style\t>EVIL</style><div>x</div>`,
  `<style>a{}</style\n>EVIL</style><div>x</div>`,
  `<style>a{}</style/>EVIL</style><div>x</div>`,
  `<style>a{content:"</style><img src=x onerror=alert(1)>"}</style><div>x</div>`,
];
check("XSS-A", SALIDAS.every((s) => {
  const x = limpiarLanding(s);
  return x.ok && !/<\//.test(x.landing.html.slice(0, x.landing.html.indexOf("\n</style>\n")));
}), "no queda ningún «</» adentro del <style> que ponemos nosotros: por ahí se salía a la página");
check("XSS-B", limpiarCss(`a{color:red}</style><img src=x onerror=alert(1)>`).indexOf("</") === -1
  && limpiarCss(`a{content:"</b>"}`).indexOf("</") === -1,
  "y el «</» se saca en el CSS, que es de donde venía");
/* La segunda red: lo guardado NO se vuelve a limpiar al dibujarlo, así que
   una versión guardada por una limpieza vieja tiene que morir acá también. */
/* Se mira el ÁRBOL, no el texto: adentro del <style> las mismas letras son
   texto inerte, y lo que importa es que no lleguen a ser una etiqueta. */
const vieja = armarLanding(`<style>\na{}</style ><img src=x onerror="alert(1)">\n</style>\n<p>hola</p>`, {
  nombre: "x", precio: 1, precioAnterior: null, hrefComprar: "/p/a/pagar", fotos: {}, enlaces: {}, bloques: {},
});
check("XSS-C", primerElemento(vieja, (e) => e.name === "img") === null && /<p>hola<\/p>/.test(vieja),
  "y lo YA guardado se blinda al dibujarlo: una versión vieja no puede volverse peligrosa hoy");

/* ── Lo que tarda: ningún archivo puede clavar el servidor ───────────────── */

/* ⚠️ `limpiarCss` empezaba con un `[^{};]*` y el costo crecía al cuadrado:
   500 KB de CSS sin un `;` eran CUATRO MINUTOS de procesador. */
const CSS_LARGO = `a{color:red}${"z".repeat(60_000)}`;
const t0 = Date.now();
limpiarCss(CSS_LARGO);
check("LENTO-A", Date.now() - t0 < 500, `60 KB de CSS sin cortes se limpian rápido (tardó ${Date.now() - t0} ms; antes, 3.400)`);

/* Y mirar qué quedó invisible cuesta reglas × elementos: con un archivo
   enorme se prefiere avisar que no se pudo antes que dejarla esperando. */
const GRANDE = `<style>${Array.from({ length: 2000 }, (_, i) => `.c${i} .d${i} > span{display:none}`).join("")}</style>`
  + `<a data-tienda="comprar" href="#">Comprar</a>`
  + Array.from({ length: 2000 }, (_, i) => `<div class="c${i}"><div class="d${i}"><span>hola ${i}</span></div></div>`).join("");
const t1 = Date.now();
const gr = limpiarLanding(GRANDE);
const tardo = Date.now() - t1;
check("LENTO-B", gr.ok && tardo < 3000 && gr.landing.inventario.avisos.some((a) => /muy grande/i.test(a)),
  `2.000 reglas sobre 2.000 elementos no cuelgan la subida y se avisa (tardó ${tardo} ms; antes, 7.100)`);

/* ── El botón que cobra ──────────────────────────────────────────────────── */

const enUnDiv = limpiarLanding(`<div data-tienda="comprar">Comprar ahora</div>`);
check("PAGO-A", enUnDiv.ok && /<a[^>]+data-tienda="comprar"[^>]*href="\/p\/abc\/pagar"/.test(
  armarLanding(enUnDiv.landing.html, { nombre: "x", precio: 1, precioAnterior: null, hrefComprar: "/p/abc/pagar", fotos: {}, enlaces: {}, bloques: {} }),
), "el hueco de comprar marcado en un <div> pasa a ser un link: un href en un div no se puede tocar");
check("PAGO-B", /hrefComprar: `\/p\/\$\{fila\.id\}\/pagar`/.test(publica) && !/hrefComprar: "\/pagar"/.test(publica),
  "y el link del pago es el mismo que pone la página de secciones: un «/pagar» pelado es 404 en tiendaapps.com/p/<id>");

/* ── Los lugares de foto de un archivo que no es nuestro ─────────────────── */

/* Un archivo hecho en otra plataforma marca sus fotos a su manera y el
   filtro se lleva ese atributo, así que la vendedora se quedaba mirando un
   cuadro que decía "cargá la URL acá" sin ningún lugar donde cargarla.
   Medido sobre uno de verdad: catorce lugares y ninguno se reconocía. */
const CON_FOTOS = limpiarLanding(`
<div data-afl-img="portada" data-afl-alt="La portada del ebook"><div class="ph">Cargá la URL en imagenes.portada</div></div>
<div data-image="hero"></div>
<figure data-foto="bonus"></figure>
<img src="URL_DE_TU_LOGO" alt="Mi marca">
<img src="{{imagen}}">
<div data-afl-img="portada"></div>
<img src="https://cdn.example.com/real.png" alt="ésta sí es una foto">
<div class="imagen-hero" id="foto"><p>esto NO es un hueco: así se llama la clase</p></div>
<div data-image-src="https://cdn.example.com/x.png">tampoco: eso es una dirección</div>
<a data-tienda="comprar" href="#">Comprar</a>`);
if (!CON_FOTOS.ok) throw new Error("no limpió el de las fotos");
const F = CON_FOTOS.landing.inventario;

check("FOTO-A", F.fotos.join() === "portada,hero,bonus,mi-marca,foto-1",
  `los lugares de foto se reconocen por la forma de marcarlos, no por la plataforma (salió: ${F.fotos.join()})`);
check("FOTO-B", !F.fotos.includes("imagen-hero") && !F.fotos.includes("x-png") && F.imagenesExternas.length === 1,
  "una clase que se llama «imagen», un atributo con una dirección adentro y una foto de verdad NO son huecos");
check("FOTO-C", F.arreglos.some((a) => /6 lugares donde va una foto/.test(a) && /5 fotos, algunas repetidas/.test(a)),
  "y se cuenta lo que va a subir: seis lugares, cinco fotos, porque la portada va dos veces");

const CON_UNA = armarLanding(CON_FOTOS.landing.html, {
  nombre: "x", precio: 1, precioAnterior: null, hrefComprar: "/p/a/pagar",
  fotos: { portada: "https://cdn.tiendaapps.com/f/p.jpg" }, enlaces: {}, bloques: {},
});
check("FOTO-D", (CON_UNA.match(/cdn\.tiendaapps\.com\/f\/p\.jpg/g) ?? []).length === 2 && !/Cargá la URL/.test(CON_UNA),
  "la foto entra en los dos lugares que se llaman igual, y el cartel de «cargá la URL acá» desaparece");
check("FOTO-E", /alt="La portada del ebook"/.test(CON_UNA) && !/aria-label="La portada del ebook"/.test(CON_UNA),
  "con la descripción que el archivo traía al lado, y sin repetirla en el contenedor");
check("FOTO-F", !/data-image="hero"|data-foto="bonus"|\{\{imagen\}\}|URL_DE_TU_LOGO/.test(CON_UNA),
  "y los lugares que quedaron sin foto se sacan: mejor nada que un cuadro vacío o una imagen rota");

/* ⚠️ Con qué FORMA entra la foto. El archivo lo dice al lado del hueco
   (`data-afl-class="afl-cover"`): es la clase que lleva la imagen, y en el
   archivo de verdad es la que le da el tamaño de libro, la inclinación y el
   `position:relative` que la pone ADELANTE del redondel de fondo. Sin
   copiarla, la foto entraba sin tamaño y aparecía ATRÁS del adorno — que es
   exactamente lo que se vio al subir la primera. */
const CON_FORMA = limpiarLanding(`<div data-afl-img="tapa" data-afl-class="afl-cover afl-cover--lg"><div class="ph">x</div></div><a data-tienda="comprar" href="#">Comprar</a>`);
const ARMADA_CON_FORMA = CON_FORMA.ok ? armarLanding(CON_FORMA.landing.html, {
  nombre: "x", precio: 1, precioAnterior: null, hrefComprar: "/p/a/pagar",
  fotos: { tapa: "https://cdn.tiendaapps.com/t.jpg" }, enlaces: {}, bloques: {},
}) : "";
check("FOTO-I", /<img[^>]+class="afl-cover afl-cover--lg"/.test(ARMADA_CON_FORMA) && !/data-tienda-clase/.test(ARMADA_CON_FORMA),
  "la foto entra con la clase que el archivo pide para ella: si no, queda sin tamaño y atrás del adorno del diseño");
check("FOTO-J", /<img[^>]+data-tienda-foto=""/.test(ARMADA_CON_FORMA)
  && /img\[data-tienda-foto\]\{display:block;max-width:100%;height:auto;object-fit:cover\}/.test(ESTILO_DE_LA_CAPSULA)
  && ESTILO_DE_LA_CAPSULA.indexOf("data-tienda-foto") < ESTILO_DE_LA_CAPSULA.indexOf("data-tienda-falta"),
  "y hay un piso para las fotos que ponemos, primero en la hoja: lo que diga su diseño después le gana");

const EN_LA_PREVIA = armarLanding(CON_FOTOS.landing.html, {
  nombre: "x", precio: 1, precioAnterior: null, hrefComprar: "/p/a/pagar",
  fotos: {}, enlaces: {}, bloques: {}, mostrarHuecos: true,
});
/* La sección de fotos se muestra SIEMPRE, también sin ningún lugar de foto:
   desaparecida entera, quien abría la pantalla no tenía forma de saber si las
   fotos se cargaban en otro lado o si su archivo no las marcaba. Y el tope es
   el mismo que acepta /api/upload (4 MB): con 5 acá, una foto de 4,5 pasaba
   nuestro control y la rebotaba el servidor sin explicar nada. */
check("FOTO-H", /4\. Tus fotos/.test(panel) && /no encontramos ningún lugar donde vaya una foto/.test(panel)
  && /Volvé a subir el mismo \.html/.test(panel) && !/\{inv\.fotos\.length > 0 && \(\n\s+<section/.test(panel)
  && /const MAX_FOTO_MB = 4;/.test(panel),
  "el paso de las fotos se ve aunque no haya ninguna, y dice por qué; y el tope es el que acepta el servidor");
check("FOTO-G", (EN_LA_PREVIA.match(/data-tienda-falta="/g) ?? []).length === 6
  && /\[data-tienda-falta\]::after\{content:"Falta: " attr\(data-tienda-falta\)/.test(ESTILO_DE_LA_CAPSULA),
  "en la previa cada lugar vacío se marca con su nombre: si no, la lista dice «foto1, pagina3» y no se sabe cuál es cuál");

/* ⚠️ Una ruta relativa parece una dirección pero no lo es: apunta a un
   archivo de la computadora de ella que nunca subió a ningún lado, así que en
   nuestra dirección da 404 y se ve rota. Es un lugar de foto, no una foto. */
const RELATIVAS = limpiarLanding(`<img src="fotos/tapa.jpg" alt="Tapa"><img src="/img/b.png" alt="Bono"><img src="https://cdn.example.com/ok.png" alt="Ésta anda"><a data-tienda="comprar" href="#">c</a>`);
check("FOTO-K", RELATIVAS.ok && RELATIVAS.landing.inventario.fotos.join() === "tapa,bono"
  && RELATIVAS.landing.inventario.imagenesExternas.length === 1,
  "una imagen con ruta relativa es un lugar de foto —en nuestra dirección daría 404—, y una con dirección completa se deja");

/* ⚠️ El inventario va con el MISMO tope que guarda el servidor. Sin esto, un
   archivo con ochocientos lugares de foto le dibujaba ochocientos botones de
   subir y recién en el 31 le decía que no entraban más. */
const DEMASIADOS = limpiarLanding(
  Array.from({ length: 60 }, (_, i) => `<div data-afl-img="h${i}">x</div>`).join("")
  + Array.from({ length: 40 }, (_, i) => `<a href="#">Link ${i}</a>`).join("")
  + `<a data-tienda="comprar" href="#">c</a>`,
);
check("TOPE-A", DEMASIADOS.ok && DEMASIADOS.landing.inventario.fotos.length === MAX_FOTOS_DE_LANDING
  && DEMASIADOS.landing.inventario.linksVacios.length === MAX_ENLACES_DE_LANDING
  && DEMASIADOS.landing.inventario.avisos.some((a) => /60 lugares de foto/.test(a))
  && DEMASIADOS.landing.inventario.avisos.some((a) => /40 links sueltos/.test(a)),
  "el inventario no pide más de lo que el servidor puede guardar, y avisa cuántos quedaron afuera");

/* ── Las flechas del carrusel ────────────────────────────────────────────── */

/* La tira que se desliza no necesita programa (es `overflow-x` con
   `scroll-snap` y arrastrando anda sola), pero las flechitas de al lado sí:
   eran botones y quedaban dos redondeles lindos que no hacen nada. Peor que
   no tenerlos, porque se tocan. */
const CARRUSEL = limpiarLanding(`
<div class="gal">
  <ul class="track"><li>1</li><li>2</li><li>3</li></ul>
  <button class="arrow arrow--prev" type="button" aria-label="Página anterior"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
  <button class="arrow" type="button" aria-label="Página siguiente"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
  <button type="button">Ver el temario completo</button>
</div>
<a data-tienda="comprar" href="#">Comprar</a>`);
if (!CARRUSEL.ok) throw new Error("no limpió el del carrusel");

check("FLE-A", /data-tienda-flecha="antes"/.test(CARRUSEL.landing.html) && /data-tienda-flecha="despues"/.test(CARRUSEL.landing.html),
  "las flechas de pasar fotos se reconocen por lo que dicen de sí mismas, no por dónde están");
/* ⚠️ En el archivo de verdad la flecha de la derecha NO dice "next" en
   ninguna clase: lo único que la nombra es el `aria-label`. Por eso se miran
   el nombre accesible, la clase, el title y el texto, y no una sola cosa. */
check("FLE-B", /<span[^>]+role="button"[^>]+data-tienda-flecha="antes"[^>]+tabindex="0"/.test(CARRUSEL.landing.html)
  && CARRUSEL.landing.inventario.arreglos.some((a) => /2 flechas de pasar fotos/.test(a))
  && CARRUSEL.landing.inventario.sueltos.some((s) => /Ver el temario completo/.test(s)),
  "quedan tocables y con el tabulador, se cuentan en el recibo, y un botón que no es flecha sigue siendo texto");
check("FLE-C", /\[data-tienda-flecha\]\{cursor:pointer/.test(CARRUSEL.landing.html)
  && EFECTOS_DE_LA_LANDING.includes('closest("[data-tienda-flecha]")')
  && /overflowX==="auto"\|\|s\.overflowX==="scroll"/.test(EFECTOS_DE_LA_LANDING)
  && /scrollWidth>c\[k\]\.clientWidth\+8/.test(EFECTOS_DE_LA_LANDING)
  && EFECTOS_DE_LA_LANDING.includes('e.key!=="Enter"&&e.key!==" "'),
  "y el script las mueve sólo si encuentra algo que DE VERDAD se pueda deslizar, con el mouse y con el teclado");

/* Un botón que apunta para los dos lados a la vez no es una flecha: es un
   texto que las nombra («anterior o siguiente»). */
const NO_ES_FLECHA = limpiarLanding(`<button type="button" aria-label="Ir al anterior o al siguiente">x</button><a data-tienda="comprar" href="#">c</a>`);
check("FLE-D", NO_ES_FLECHA.ok && !/data-tienda-flecha/.test(NO_ES_FLECHA.landing.html),
  "y lo que apunta para los dos lados a la vez no se toca");

/* ── Volver a la foto que acaba de subir ─────────────────────────────────── */

check("HUE-A", (EN_LA_PREVIA.match(/data-tienda-hueco="/g) ?? []).length === 6
  && !/data-tienda-hueco/.test(CON_UNA)
  && /\^#hueco=\(\[a-z0-9-\]\{1,40\}\)\$/.test(EFECTOS_DE_LA_LANDING)
  && /scrollIntoView\(\{behavior:"auto",block:"center"\}\)/.test(EFECTOS_DE_LA_LANDING),
  "en la previa cada hueco lleva su nombre y el script vuelve a él: subir catorce fotos no puede ser volver arriba catorce veces");
check("HUE-B", /setMirando\(clave\);/.test(panel) && /#hueco=\$\{mirando\}/.test(panel) && /setMirando\(null\)/.test(panel),
  "el panel le dice a qué foto volver, y una versión nueva arranca de arriba");

/* ── Los links del pie: lo que ella escribe, acomodado ───────────────────── */

const link = (s: string) => acomodarEnlace(s);

check("LNK-A", link("instagram.com/lacocinade").url === "https://instagram.com/lacocinade" && link("instagram.com/lacocinade").error === null,
  "un dominio pelado se guarda con https:// puesto: nadie escribe el https://");
check("LNK-B", link("  www.mitienda.com.ar/terminos  ").url === "https://www.mitienda.com.ar/terminos",
  "los espacios de más no rompen nada, y el www. anda igual");
check("LNK-C", link("hola@lacocina.com").url === "mailto:hola@lacocina.com" && link("Hola@Lacocina.com").error === null,
  "un correo se guarda como mailto:, que es lo que hace que el link abra el correo");
check("LNK-D", link("+54 9 11 2345-6789").url === "tel:+5491123456789" && link("(011) 4567-8901").url === "tel:01145678901",
  "un teléfono se guarda como tel:, con los espacios y los guiones sacados");
check("LNK-E", link("javascript:alert(1)").error !== null && link("data:text/html,<b>x</b>").error !== null && link("vbscript:x").error !== null,
  "nada que no sea http, https, mailto o tel: eso es un programa, no una dirección");
check("LNK-F", /usuario/i.test(link("@lacocinade").error ?? ""), "un @usuario no es un link, y el error explica de dónde sacar el de verdad");
check("LNK-G", link("").url === "" && link("   ").error === null, "vacío es vacío: borra el destino y no es un error");
check("LNK-H", link("no tengo").error !== null && link("todavia-no").error !== null && link("...").error !== null,
  "lo que no es una dirección se rebota con un error en castellano, no se guarda a medias");
check("LNK-I", link("https://mitienda.com.ar/privacidad").url === "https://mitienda.com.ar/privacidad" && link("http://viejo.com.ar/x").error === null,
  "lo que ya venía bien escrito pasa tal cual");
check("LNK-J", link("mailto:").error !== null && link("https://sinpunto").error !== null,
  "un mailto vacío y un dominio sin punto no pasan");
/* Lo guardado se vuelve a leer con `leerEstadoDeLanding`, que filtra por su
   cuenta: si el acomodo devolviera algo que ese filtro rechaza, el link se
   guardaría y desaparecería al recargar. */
check("LNK-K", ["instagram.com/x", "hola@x.com", "11 2345-6789", "https://x.com.ar"].every((s) => {
  const u = acomodarEnlace(s).url;
  return leerEstadoDeLanding(JSON.stringify({ enlaces: { contacto: u } })).enlaces.contacto === u;
}), "todo lo que el acomodo deja pasar sobrevive a la lectura de la base");

/* ── El diseño de la página entera, adentro de la cápsula ────────────────── */

/* ⚠️ Un Shadow DOM no tiene `<html>` ni `<body>`: su raíz es el `:host`. Así que
   TODA regla escrita para la página entera no le aplicaba a nada — y ahí es
   donde Claude pone casi todo lo importante de un diseño. El síntoma con el que
   apareció: la landing se veía NEGRA, porque sin fondo propio la cápsula queda
   transparente y atrás está el `<body>` de nuestro sitio, que arranca en tema
   oscuro (`.dark body{background:#0f172a}`). */
const conCapsula = (css: string) => limpiarCss(css);

check("CAP-A", conCapsula(":root{--crema:#FDF8F0}") === ":host{--crema:#FDF8F0}",
  "las variables del diseño pasan a :host, o cada var() de abajo cae en vacío");
check("CAP-B", conCapsula("body{background:#FDF8F0}") === ":host{background:#FDF8F0}",
  "y el fondo de la página también: sin esto se veía el azul oscuro de nuestro sitio");
/* `html,body{margin:0}` daría `:host,:host`, que es válido pero engorda. */
check("CAP-C", conCapsula("html,body{margin:0}") === ":host{margin:0}",
  "html y body juntos no dejan el selector repetido");
check("CAP-D", conCapsula("body .hero{padding:40px}") === ":host .hero{padding:40px}",
  "y como parte de un selector más largo, también");
check("CAP-E", conCapsula("@media (max-width:600px){body{font-size:14px}}") === "@media (max-width:600px){:host{font-size:14px}}",
  "adentro de un @media igual, y el encabezado del @media no se toca");

/* Lo que NO se puede tocar: buscar "body" por todo el texto pisaría el nombre
   de una tipografía o un `content`. Por eso se hace en el único punto del
   recorrido donde se sabe que lo que se está mirando es un selector. */
check("CAP-F", [
  [".body{a:1}", ".body{a:1}"],
  ["#body{a:1}", "#body{a:1}"],
  ["[data-body]{a:1}", "[data-body]{a:1}"],
  ["somebody{a:1}", "somebody{a:1}"],
  ["body-grande{a:1}", "body-grande{a:1}"],
  [`p{font-family:"Body Grotesque"}`, `p{font-family:"Body Grotesque"}`],
  [`p::after{content:"body"}`, `p::after{content:"body"}`],
  [`a[href="body"]{a:1}`, `a[href="body"]{a:1}`],
].every(([entra, sale]) => conCapsula(entra) === sale),
  "y no se toca una clase, un id, un atributo, un nombre de tipografía ni un content");

/* La red de seguridad, para el diseño que nunca declaró fondo y para el espacio
   de abajo cuando la página es más corta que la pantalla. Va ANTES que su CSS,
   así que su propio fondo le gana. */
check("CAP-G", /:host\{all:initial;[^}]*background:#fff;[^}]*min-height:100vh/.test(ESTILO_DE_LA_CAPSULA),
  "la cápsula arranca con fondo blanco y cubriendo la pantalla");
/* Y le gana la de ella, porque su CSS entra después: `LandingPropia` dibuja
   `ESTILO_DE_LA_CAPSULA + html`, en ese orden. Si un día se diera vuelta, cada
   landing con fondo propio pasaría a blanca sin que nada fallara. */
const conFondoPropio = limpiarLanding(`<style>body{background:#111}</style><p>x</p>`);
check("CAP-H", conFondoPropio.ok && conFondoPropio.landing.html.includes(":host{background:#111}") &&
  ESTILO_DE_LA_CAPSULA.indexOf("background:#fff") < (ESTILO_DE_LA_CAPSULA + conFondoPropio.landing.html).indexOf("background:#111"),
  "y un diseño con fondo propio lo conserva: su regla entra después y le gana");

/* ── La sombra tiene que sobrevivir a la hidratación ─────────────────────── */

/* ⚠️ Un `<template shadowrootmode>` lo consume el PARSER: al leerlo, el
   navegador arma la sombra y saca el template del DOM. Para cuando React
   hidrata, ese elemento ya no existe.

   Escrito como hijo de React, la hidratación no lo encontraba y tiraba el error
   #418. React entonces descarta el HTML del servidor y vuelve a dibujar todo en
   el cliente — y un `<template>` creado por JavaScript **ya no se convierte en
   sombra**. Quedaba inerte y la landing no se dibujaba: lo que se veía era el
   `<body>` del sitio, azul casi negro.

   Con `dangerouslySetInnerHTML` en el div, React trata el contenido como opaco:
   no lo compara ni lo reescribe, y la sombra del parser queda intacta.

   Es de texto porque el defecto no se ve en el árbol ni en el HTML que sale del
   servidor —los dos son idénticos en las dos versiones—: se ve recién en el
   navegador, y sólo en un build de producción. */
const capsula = leer("src/components/digitales/LandingPropia.tsx");

check("SOM-A", /dangerouslySetInnerHTML[\s\S]{0,200}<template shadowrootmode="open">/.test(capsula),
  "el template se escribe con innerHTML del div, no como hijo de React");
check("SOM-B", !/<template\s*\r?\n?\s*\/\/ @ts-expect-error|<template$|<template\s+shadowrootmode=\{/m.test(capsula) &&
  !/^\s*<template\b/m.test(capsula),
  "y no volvió a quedar un <template> como elemento de React, que rompe la hidratación");

/* ── La salida, y el guardado que se ve ──────────────────────────────────── */

/* `ruta` y `panel` ya están leídos más arriba, con el resto de los archivos. */

/* Se podía apagar pero no deshacer: el archivo, las versiones, las fotos y los
   links quedaban guardados para siempre y la pantalla seguía mostrando todo
   como si el diseño propio siguiera siendo el plan. */
check("SAL-A", /export async function DELETE/.test(ruta),
  "la landing se puede borrar, no sólo apagar");
check("SAL-B", /landingDigital\.deleteMany[\s\S]{0,300}landingPropia: null/.test(ruta),
  "y se van las dos cosas juntas: las versiones y el estado");
/* Si se borraran las versiones y fallara el update, el estado quedaría
   apuntando a una fila que ya no existe — y esa página no se dibuja ni se
   puede arreglar desde la pantalla, porque la lista estaría vacía. */
check("SAL-C", /\$transaction\(\[\s*\r?\n?\s*prisma\.landingDigital\.deleteMany/.test(ruta),
  "en una transacción, o el estado queda apuntando a una versión borrada");

/* ⚠️ EL caso importante de este bloque. Con el plan vencido la landing ya no se
   muestra, así que lo único que le queda por hacer es limpiar. Pedirle plan al
   día para borrar sus propias cosas sería tenerla de rehén. Subir y prender sí
   siguen siendo de los planes pagos, y por eso se mira que el DELETE use el
   tope de intentos y NO la puerta que mira el plan. */
const elDelete = ruta.slice(ruta.indexOf("export async function DELETE"));
check("SAL-D", /topeDeIntentos\(user\.id, "landing-borrar"\)/.test(elDelete) && !/await puertaDeEntrada/.test(elDelete),
  "y borrar no pide plan al día: con el plan vencido igual puede limpiar");

/* El guardado de los links es con botón. Antes guardaba al salir de cada campo:
   andaba, pero no se veía, y la pregunta "¿esto se guardó?" no tenía respuesta
   en ningún lado de la pantalla. Las fotos siguen guardándose solas, que es lo
   correcto para ellas: elegir el archivo ya es una acción con final propio. */
check("SAL-E", /Guardar los links/.test(panel) && /guardarLosLinks/.test(panel),
  "los links se guardan con un botón, no al salir del campo");
check("SAL-F", !/onBlur=\{\(\) => void guardar/.test(panel),
  "y no quedó además el guardado automático, que volvería a dejarlo invisible");
/* Todos en un pedido: de a uno, cada guardado tenía que esperar su turno
   —cada uno manda el mapa entero— y pasar rápido de campo en campo hacía
   esperar 100 ms por vez. */
check("SAL-G", /pedir\(\{ enlaces: acomodados \}\)/.test(panel) && /b\.enlaces !== undefined/.test(ruta),
  "y van los cuatro en un solo pedido, no uno por campo");

/* ── Las dependencias ────────────────────────────────────────────────────── */

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
check("DEP-A", ["sanitize-html", "htmlparser2", "domhandler", "domutils", "dom-serializer"].every((d) => d in pkg.dependencies), "lo que se importa está declarado, no heredado de otro paquete");

console.log(fallos === 0 ? "\nTodo bien." : `\n${fallos} fallo(s).`);
