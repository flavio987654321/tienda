/**
 * Los efectos de la landing propia: el movimiento que ella vio en la previa
 * de Claude y que se perdía al sacarle el JavaScript.
 *
 * ── Por qué hay un script nuestro, si sacamos el suyo ──────────────────────
 *
 * El de ella no puede correr: un script ajeno en nuestro dominio es la puerta
 * a robar sesiones, y viene con los contadores falsos de fábrica. Pero
 * mirando el archivo de verdad, su programa hacía sólo tres cosas:
 *
 *   1. bajar suave al apretar un botón que apunta a otra sección,
 *   2. mostrar la barra fija de comprar al pasar la portada,
 *   3. abrir las preguntas frecuentes.
 *
 * La tercera ya no necesita nada (`landing-arreglos` la pasa a `<details>`).
 * Las otras dos son movimiento, y el movimiento vende: sin ellas la página se
 * siente rota aunque esté entera.
 *
 * La barra es la que más duele: en celular es EL botón de comprar, el que te
 * sigue por la página. Escondida arriba y visible al bajar es lo que hacen
 * todas, así que el disparador puede ser uno solo y genérico: una pantalla
 * de scroll.
 *
 * Así que ponemos las dos nosotros, con código nuestro: veinte líneas, sin
 * `eval`, sin traer nada de afuera, y que no sale de la cápsula (el Shadow
 * DOM) más que para leer si la persona pidió menos movimiento.
 *
 * ── La página NO depende de esto ───────────────────────────────────────────
 *
 * La landing se dibuja en el servidor y se ve entera sin JavaScript. Esto
 * sólo agrega movimiento. Y por las dudas al revés: lo que la autora quiera
 * que "aparezca" arranca VISIBLE y se esconde sólo cuando este script pudo
 * correr (`:host([data-tienda-efectos])` en el CSS de abajo). Si alguien
 * navega sin JavaScript, ve todo; nunca al revés, que sería un botón de
 * comprar invisible.
 *
 * Probado en `landing-propia.check.ts`.
 */

/** Lo que la autora puede marcar para que aparezca al bajar. */
export const MARCA_APARECE = "data-tienda-aparece";
/**
 * La barra de comprar pegada abajo que rescatamos nosotros: se esconde
 * arriba de todo y aparece cuando la persona baja una pantalla. La ponemos
 * en `landing-arreglos`, nunca la autora — por eso se saca del archivo si
 * viene escrita.
 */
export const MARCA_BARRA = "data-tienda-barra";
/** Lo que le ponemos nosotros cuando hay que mostrarlo: es para el CSS. */
export const MARCA_VISTO = "data-tienda-visto";
/**
 * Una flecha de carrusel rescatada: `"antes"` o `"despues"`.
 *
 * La tira de fotos que se desliza no necesita programa —es `overflow-x` y
 * `scroll-snap`, y arrastrando anda sola—, pero las flechitas de al lado sí:
 * eran botones y sin el script no hacen nada. Se marcan en
 * `landing-arreglos` y las mueve el script de acá.
 */
export const MARCA_FLECHA = "data-tienda-flecha";
/**
 * En la previa, el nombre del hueco de foto. Sirve para que al subir una, la
 * previa se recargue MIRANDO esa foto y no volviendo arriba de todo: con
 * catorce fotos, volver arriba catorce veces es un castigo.
 */
export const MARCA_HUECO = "data-tienda-hueco";
/**
 * Con qué clase se viste la foto que ponemos en un hueco, cuando el archivo
 * lo dice (`data-afl-class="afl-cover"`). Viaja desde el saneado hasta
 * `ponerFoto`, que es donde se crea la imagen.
 */
export const CLASE_DE_LA_FOTO = "data-tienda-clase";
/** Y la marca de "esta imagen la pusimos nosotros", para el CSS de abajo. */
export const MARCA_FOTO = "data-tienda-foto";

/**
 * El CSS nuestro, adentro de la cápsula y antes que el suyo.
 *
 * `:host` se resetea porque la página de afuera le presta lo que se hereda
 * —la letra, el color, el interlineado— y eso le cambiaría el diseño que
 * aprobó. Un documento suelto, que es donde ella lo miró, arranca con los
 * valores del navegador; acá también.
 *
 * La regla de `img[data-tienda-foto]` es el piso de las fotos que ponemos
 * nosotros, y va PRIMERA a propósito: lo que diga el diseño de ella después
 * le gana, porque su CSS viene abajo. Es lo mínimo para que una foto no se
 * salga de su caja en un archivo que no dice nada sobre sus imágenes.
 *
 * Y `[data-tienda-falta]` marca, SÓLO EN LA PREVIA, cada lugar donde va una
 * foto que todavía no subió, con el nombre que le pide el panel: sin eso la
 * lista dice "foto1, foto2, pagina3" y no hay forma de saber cuál es cuál.
 * En la página publicada ese atributo no existe —lo pone `armarLanding` con
 * `mostrarHuecos`—, así que estas dos reglas no alcanzan a nadie.
 */
export const ESTILO_DE_LA_CAPSULA = `<style>
:host{all:initial;display:block;-webkit-text-size-adjust:100%;text-size-adjust:100%}
:host(:not([data-tienda-efectos])) [${MARCA_APARECE}],
:host(:not([data-tienda-efectos])) [${MARCA_BARRA}]{opacity:1!important;transform:none!important;visibility:visible!important;pointer-events:auto!important}
img[${"data-tienda-foto"}]{display:block;max-width:100%;height:auto;object-fit:cover}
[data-tienda-falta]{position:relative;min-height:48px;outline:2px dashed #f97316;outline-offset:-2px}
[data-tienda-falta]::after{content:"Falta: " attr(data-tienda-falta);position:absolute;left:0;top:0;z-index:9;background:#f97316;color:#fff;font:600 11px/1.4 system-ui,sans-serif;padding:3px 7px;border-radius:0 0 6px 0;letter-spacing:.01em}
</style>`;

/**
 * El CSS de la barra rescatada. Va con la versión (lo agrega
 * `landing-arreglos` cuando rescata una), no acá, porque sólo hace falta si
 * hubo algo que rescatar.
 *
 * Lo que fuerza es lo mínimo para que se vea: la posición y el tamaño los
 * puso ella. `display` NO se toca, para no romperle el "esta barra sólo en
 * celular" que casi siempre traen.
 */
export const CSS_DE_LA_BARRA = `
[${MARCA_BARRA}]{transition:transform .25s ease,opacity .25s ease}
[${MARCA_BARRA}][${MARCA_VISTO}]{transform:none!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
`.trim();

/**
 * El CSS de las flechas rescatadas. Eran `<button>` y ahora son `<span>`:
 * un botón trae la manito y el foco de fábrica, un span no. Nada más que
 * eso — el redondel, el borde y el ícono son de su diseño.
 */
export const CSS_DE_LAS_FLECHAS = `
[${MARCA_FLECHA}]{cursor:pointer;-webkit-user-select:none;user-select:none}
`.trim();

/**
 * El script, tal cual va a la página. Es un texto a propósito: lo escribimos
 * nosotros y se lee entero de una sentada.
 */
export const EFECTOS_DE_LA_LANDING = `(function(){try{
var caja=document.querySelector("[data-landing-propia]");
var raiz=caja&&caja.shadowRoot;
if(!raiz)return;
caja.setAttribute("data-tienda-efectos","");
var quieto=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var alHueco=location.hash.match(/^#hueco=([a-z0-9-]{1,40})$/i);
if(alHueco){var elHueco=raiz.querySelector('[${MARCA_HUECO}="'+alHueco[1]+'"]');if(elHueco)elHueco.scrollIntoView({behavior:"auto",block:"center"});}
/* La tira que se desliza al lado de una flecha: se busca subiendo, y se
   pregunta si DE VERDAD se puede deslizar. Así una flecha marcada de más no
   mueve nada en vez de mover cualquier cosa. */
function pistaDe(el){
for(var n=el.parentElement,i=0;n&&i<5;n=n.parentElement,i++){
var c=n.querySelectorAll("*");
for(var k=0;k<c.length&&k<400;k++){
var s=getComputedStyle(c[k]);
if((s.overflowX==="auto"||s.overflowX==="scroll")&&c[k].scrollWidth>c[k].clientWidth+8)return c[k];
}}
return null;
}
function moverLaPista(flecha){
var pista=pistaDe(flecha);
if(!pista)return false;
var primero=pista.firstElementChild;
var paso=primero?primero.getBoundingClientRect().width+14:pista.clientWidth*0.8;
if(paso<40)paso=pista.clientWidth*0.8;
pista.scrollBy({left:(flecha.getAttribute("${MARCA_FLECHA}")==="antes"?-1:1)*paso,behavior:quieto?"auto":"smooth"});
return true;
}
raiz.addEventListener("click",function(e){
var f=e.target&&e.target.closest?e.target.closest("[${MARCA_FLECHA}]"):null;
if(f){if(moverLaPista(f))e.preventDefault();return;}
var a=e.target&&e.target.closest?e.target.closest('a[href^="#"]'):null;
if(!a)return;
var id=a.getAttribute("href").slice(1);
if(!id){e.preventDefault();return;}
var destino=raiz.getElementById(id);
if(!destino)return;
e.preventDefault();
destino.scrollIntoView({behavior:quieto?"auto":"smooth",block:"start"});
});
/* Con el teclado también: son botones, aunque ya no sean <button>. */
raiz.addEventListener("keydown",function(e){
if(e.key!=="Enter"&&e.key!==" ")return;
var f=e.target&&e.target.closest?e.target.closest("[${MARCA_FLECHA}]"):null;
if(f&&moverLaPista(f))e.preventDefault();
});
var barras=raiz.querySelectorAll("[${MARCA_BARRA}]");
if(barras.length){
var mirar=function(){
var abajo=window.scrollY>window.innerHeight*0.9;
for(var k=0;k<barras.length;k++){if(abajo)barras[k].setAttribute("${MARCA_VISTO}","");else barras[k].removeAttribute("${MARCA_VISTO}");}
};
window.addEventListener("scroll",mirar,{passive:true});
mirar();
}
var marcados=raiz.querySelectorAll("[${MARCA_APARECE}]");
if(!marcados.length)return;
if(!("IntersectionObserver" in window)){for(var i=0;i<marcados.length;i++)marcados[i].setAttribute("${MARCA_VISTO}","");return;}
var ojo=new IntersectionObserver(function(filas){filas.forEach(function(f){
if(f.isIntersecting){f.target.setAttribute("${MARCA_VISTO}","");ojo.unobserve(f.target);}
});},{rootMargin:"0px 0px -12% 0px"});
for(var j=0;j<marcados.length;j++)ojo.observe(marcados[j]);
}catch(e){}})();`;
