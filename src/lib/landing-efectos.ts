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
/** Lo que le ponemos nosotros cuando entra en pantalla: es para su CSS. */
export const MARCA_VISTO = "data-tienda-visto";

/**
 * El CSS nuestro, adentro de la cápsula y antes que el suyo.
 *
 * `:host` se resetea porque la página de afuera le presta lo que se hereda
 * —la letra, el color, el interlineado— y eso le cambiaría el diseño que
 * aprobó. Un documento suelto, que es donde ella lo miró, arranca con los
 * valores del navegador; acá también.
 */
export const ESTILO_DE_LA_CAPSULA = `<style>
:host{all:initial;display:block;-webkit-text-size-adjust:100%;text-size-adjust:100%}
:host(:not([data-tienda-efectos])) [${MARCA_APARECE}]{opacity:1!important;transform:none!important;visibility:visible!important}
</style>`;

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
raiz.addEventListener("click",function(e){
var a=e.target&&e.target.closest?e.target.closest('a[href^="#"]'):null;
if(!a)return;
var id=a.getAttribute("href").slice(1);
if(!id)return;
var destino=raiz.getElementById(id);
if(!destino)return;
e.preventDefault();
destino.scrollIntoView({behavior:quieto?"auto":"smooth",block:"start"});
});
var marcados=raiz.querySelectorAll("[${MARCA_APARECE}]");
if(!marcados.length)return;
if(!("IntersectionObserver" in window)){for(var i=0;i<marcados.length;i++)marcados[i].setAttribute("${MARCA_VISTO}","");return;}
var ojo=new IntersectionObserver(function(filas){filas.forEach(function(f){
if(f.isIntersecting){f.target.setAttribute("${MARCA_VISTO}","");ojo.unobserve(f.target);}
});},{rootMargin:"0px 0px -12% 0px"});
for(var j=0;j<marcados.length;j++)ojo.observe(marcados[j]);
}catch(e){}})();`;
