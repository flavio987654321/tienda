import { Unbounded, Sora } from "next/font/google";

/* ══════════════════════════════════════════════════════════════════════════
   LA LETRA DE AURORA
   ══════════════════════════════════════════════════════════════════════════

   Hasta el 03/10/26 Aurora usaba Georgia en los títulos y Helvetica en el
   texto: la letra de un diario en un template futurista, y la misma que
   usaban casi todos los demás — se parecían también por la letra.

     · Unbounded, títulos: geométrica y ancha, futurista sin ser de juguete.
     · Sora, texto: limpia, técnica y muy legible en chico.

   Las dos son variables (un solo archivo con todo el rango de pesos) y salen
   de nuestro dominio con `next/font`, sin pegarle a Google.

   ⚠️ `preload: false` a propósito. El renderizador de la tienda importa los
   once templates, así que este archivo viaja con TODAS las tiendas. Con
   precarga, cada tienda bajaría las dos letras de Aurora aunque use Aire. Sin
   precarga, el navegador baja una letra recién cuando algo en pantalla la usa
   — o sea, sólo en las tiendas con Aurora.

   Se usan por variable CSS: la raíz de Aurora pone las dos clases y cada
   pieza pide `var(--au-titulo)` o `var(--au-texto)`. Así el catálogo, la ficha
   y el carrito, que están adentro de la raíz, la heredan sin importar nada. */

export const letraTitulo = Unbounded({
  subsets: ["latin"], variable: "--au-titulo", display: "swap", preload: false,
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

export const letraTexto = Sora({
  subsets: ["latin"], variable: "--au-texto", display: "swap", preload: false,
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

/** Las dos clases juntas, para la raíz de Aurora. */
export const CLASES_LETRA = `${letraTitulo.variable} ${letraTexto.variable}`;

export const TITULO = "var(--au-titulo)";
export const TEXTO  = "var(--au-texto)";
