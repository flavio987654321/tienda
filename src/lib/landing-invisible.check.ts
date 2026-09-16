/**
 * El banco de pruebas de lo invisible. Se corre con:
 *
 *   npx tsx src/lib/landing-invisible.check.ts
 *
 * ── Para qué existe ────────────────────────────────────────────────────────
 *
 * Los arreglos y la revisión salieron mirando DOS archivos: el de una amiga y
 * el nuestro. Eso alcanza para que ande con esos dos, no para que ande en
 * general — y las landings que suba la gente no se van a parecer a ninguno de
 * los dos.
 *
 * Así que acá están las formas en que una landing se rompe cuando le sacás el
 * JavaScript, cada una escrita de cero y con OTROS nombres de clase: pestañas,
 * una ventana emergente, una barra que aparece al bajar, un "ver más", un
 * acordeón hecho con div. Y —más importante— los casos que NO tienen que
 * saltar: lo que se esconde sólo en un tamaño de pantalla, las clases de ayuda
 * para lectores de pantalla, y lo que la persona puede abrir sola.
 *
 * Un aviso que salta de más es peor que ninguno: si el panel le marca cosas
 * que están bien, deja de mirarlo.
 */

import { limpiarLanding } from "./landing-propia";
import { leerReglas } from "./landing-invisible";

let fallos = 0;
const check = (id: string, ok: boolean, desc: string) => {
  if (ok) console.log(`✅ ${id}  ${desc}`);
  else { fallos++; console.log(`❌ ${id}  ${desc}`); }
};

const COMPRAR = '<a data-tienda="comprar" class="cta">Comprar</a><span data-tienda="precio"></span>';

/** El archivo entero, como llega: con su `<head>` y todo. */
function revisar(cuerpo: string) {
  const r = limpiarLanding(`<html><head></head><body>${cuerpo}</body></html>`);
  if (!r.ok) throw new Error(r.problema);
  const h = r.landing.inventario.hallazgos;
  return {
    escondidos: h.filter((x) => /no se puede[n]? ver/.test(x.que)),
    trabas: h.filter((x) => x.nivel === "traba"),
    landing: r.landing,
  };
}

/* ── Lo que SÍ tiene que saltar ──────────────────────────────────────────── */

check("INV-A", (() => {
  /* Pestañas: la activa se ve, las otras dos las mostraba el script. */
  const a = revisar(`<style>.panel{display:none}.panel.activo{display:block}</style>
    <div class="panel activo"><p>Treinta y una recetas probadas de panadería.</p></div>
    <div class="panel"><p>Para quien tiene una airfryer y no la usa nunca.</p></div>
    <div class="panel"><p>Incluye la guía de temperaturas y tiempos.</p></div>${COMPRAR}`);
  return a.escondidos.length === 1 && /2 bloques/.test(a.escondidos[0].que) && !a.trabas.length;
})(), "pestañas: las que no están activas no se ven nunca, y se cuentan las dos");

check("INV-B", (() => {
  /* Una barra que aparecía al bajar. Ojo: la misma regla dice `display:flex`
     (muestra) y `transform:translateY(110%)` (esconde) — pasó en el archivo
     de verdad, y contarla como "muestra" la dejaba pasar. */
  const a = revisar(`<style>.barra{position:fixed;display:flex;transform:translateY(110%)}.barra.se-ve{transform:none}</style>
    <div class="barra"><span>Llevátelo hoy por menos plata</span></div>${COMPRAR}`);
  return a.escondidos.length === 1 && /Llevátelo hoy/.test(a.escondidos[0].que);
})(), "la barra que aparecía al bajar: esconder gana aunque la misma regla también muestre");

check("INV-C", (() => {
  /* "Ver más" con max-height, y una ventana emergente con opacidad. */
  const a = revisar(`<style>.txt{max-height:0;overflow:hidden}.txt.abierto{max-height:900px}</style>
    <div class="txt"><p>El recetario tiene 46 páginas con fotos de cada paso.</p></div>${COMPRAR}`);
  const b = revisar(`<style>.modal{opacity:0;visibility:hidden}.modal.abierta{opacity:1;visibility:visible}</style>
    <div class="modal"><p>Elegí tu plan y pagá con Mercado Pago ahora mismo.</p></div>${COMPRAR}`);
  return a.escondidos.length === 1 && b.escondidos.length === 1;
})(), "un «ver más» con max-height y una ventana emergente con opacidad también se ven venir");

check("INV-D", (() => {
  /* El caso grave: el ÚNICO botón de comprar está adentro de la ventana. */
  const a = revisar(`<style>.modal{display:none}.modal.abierta{display:block}</style>
    <div><h1>Panadería en Airfryer</h1><span data-tienda="precio"></span>
    <div class="modal"><p>Pagá ahora mismo.</p><a data-tienda="comprar">Ir al pago</a></div></div>`);
  /* Y el mismo caso, pero con otro botón a la vista: avisa, no traba. */
  const b = revisar(`<style>.modal{display:none}.modal.abierta{display:block}</style>
    <div><a data-tienda="comprar">Comprar</a><span data-tienda="precio"></span>
    <div class="modal"><p>Pagá ahora mismo.</p><a data-tienda="comprar">Ir al pago</a></div></div>`);
  return a.trabas.length === 1 && /no se puede ver/.test(a.trabas[0].que)
    && b.trabas.length === 0 && b.escondidos.length === 1;
})(), "si el único botón de comprar está escondido, traba; si hay otro a la vista, sólo avisa");

/* ── Lo que NO tiene que saltar ──────────────────────────────────────────── */

check("INV-E", (() => {
  /* Esconder por tamaño de pantalla es diseño, no una rotura. */
  const a = revisar(`<style>.solo-cel{display:block}@media(min-width:900px){.solo-cel{display:none}}
    @media(max-width:899px){.solo-pc{display:none}}</style>
    <div class="solo-cel"><p>Comprá desde el celular en dos toques.</p></div>
    <div class="solo-pc"><p>Comprá desde la computadora en dos clics.</p></div>${COMPRAR}`);
  return a.escondidos.length === 0;
})(), "lo que se esconde sólo en un tamaño de pantalla no es un bloque perdido: se ve en el otro");

check("INV-F", (() => {
  /* Una clase de ayuda que nadie muestra nunca es a propósito. */
  const a = revisar(`<style>.oculto{position:absolute;height:0;overflow:hidden}</style>
    <div><span class="oculto">Panadería en airfryer, recetario digital</span><h1>Recetario</h1>${COMPRAR}</div>`);
  return a.escondidos.length === 0;
})(), "lo que está escondido y nada muestra en ningún lado es una clase de ayuda, no un bloque perdido");

check("INV-G", (() => {
  /* Lo que la persona puede abrir sola: mouse encima, tilde, <details>. */
  const a = revisar(`<style>.tip{display:none}.caja:hover .tip{display:block}
    .larga{display:none}.chk:checked ~ .larga{display:block}</style>
    <div><div class="caja"><span>Precio</span><div class="tip"><p>Incluye los dos archivos PDF.</p></div></div>
    <input type="checkbox" class="chk"><div class="larga"><p>Acá va toda la letra chica del recetario.</p></div>${COMPRAR}</div>`);
  return a.escondidos.length === 0;
})(), "lo que se abre al pasar el mouse o al tildar una casilla no está perdido: la persona puede");

check("INV-H", (() => {
  /* Un acordeón escrito con div en vez de button: lo arregla `landing-arreglos`
     y por eso deja de estar escondido. Es la prueba de que las dos partes se
     hablan. */
  const a = revisar(`<style>.resp{display:none}.item.abierto .resp{display:block}</style>
    <div class="item"><div class="preg" aria-expanded="false">¿Cómo lo recibo?</div>
    <div class="resp"><p>Te llega por mail apenas se confirma el pago.</p></div></div>${COMPRAR}`);
  return a.escondidos.length === 0 && /<details/.test(a.landing.html) && a.landing.inventario.arreglos.length === 1;
})(), "el acordeón escrito con div se arregla, y una vez arreglado ya no cuenta como escondido");

check("INV-I", (() => {
  /* Lo marcado para aparecer al bajar lo muestra nuestro script. */
  const a = revisar(`<style>[data-tienda-aparece]{opacity:0}[data-tienda-visto]{opacity:1}</style>
    <div data-tienda-aparece><p>Esto aparece cuando bajás hasta acá del todo.</p></div>${COMPRAR}`);
  return a.escondidos.length === 0;
})(), "lo marcado con data-tienda-aparece no está perdido: lo muestra nuestro script al bajar");

/* ── El lector de CSS ────────────────────────────────────────────────────── */

check("INV-J", (() => {
  const r = leerReglas(`@font-face{font-family:X;src:url(a.woff2)}
    .a{color:red}
    @media (max-width:600px){ .b{display:none} .c{opacity:0} }
    @keyframes late{from{opacity:0}to{opacity:1}}
    .d{display:none}`);
  const sel = r.map((x) => x.selector);
  return sel.includes(".a") && sel.includes(".b") && sel.includes(".d")
    && r.find((x) => x.selector === ".b")?.enMedia === true
    && r.find((x) => x.selector === ".d")?.enMedia === false
    && !sel.includes("from") && !sel.includes("@font-face");
})(), "el lector entra a los @media, marca que vienen de ahí, y saltea keyframes y font-face");

/* ── Una landing bien hecha no dice nada ─────────────────────────────────── */

check("INV-K", (() => {
  /* La que baja de nuestras instrucciones: sin escondidos, sin avisos y sin
     arreglos, porque entra derecha. Si algún día un aviso salta acá, es que
     una regla se puso demasiado sensible. */
  const a = revisar(`<style>.l{font-family:system-ui}.tarjeta{border-radius:16px}
    .cta{display:inline-block;background:#8E1226;color:#fff}</style>
    <div class="l"><h1 data-tienda="nombre"></h1>
    <p>Treinta y una recetas de panadería probadas en airfryer, con tiempos y temperaturas.</p>
    <div class="tarjeta" data-tienda="foto:portada"></div>
    <details><summary>¿Cómo lo recibo?</summary><p>Por mail, apenas se confirma el pago.</p></details>
    ${COMPRAR}<a href="#">Términos y condiciones</a></div>`);
  return a.escondidos.length === 0 && a.trabas.length === 0
    && a.landing.inventario.hallazgos.length === 0 && a.landing.inventario.arreglos.length === 0;
})(), "una landing hecha con nuestras instrucciones no dispara ningún aviso ni necesita arreglos");

if (fallos) { console.log(`\n${fallos} fallo(s).`); process.exit(1); }
console.log("\nTodo bien.");
