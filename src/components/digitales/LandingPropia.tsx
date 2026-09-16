/**
 * La landing propia, dibujada.
 *
 * ── Por qué Shadow DOM, y por qué declarativo ──────────────────────────────
 *
 * El HTML es de ella y su CSS es ancho: `h1{...}`, `p{margin:0}`, a veces
 * `*{box-sizing:border-box}`. Puesto derecho en la página, eso pisa lo que
 * dibujamos alrededor —y al revés, lo nuestro le rompe su diseño. Adentro de
 * un Shadow DOM cada uno queda en su mundo.
 *
 * Y declarativo (`<template shadowrootmode="open">`) porque esta página se
 * dibuja en el servidor: el navegador arma la sombra al parsear el HTML, sin
 * esperar JavaScript. Si hiciera falta un script, la landing aparecería en
 * blanco hasta que cargue, que es justo lo que no puede pasar en la primera
 * pantalla de una venta. El script de los efectos va después y es de adorno:
 * la página ya está entera cuando llega. Ver `lib/landing-efectos`.
 *
 * ── Lo que queda AFUERA de la sombra ───────────────────────────────────────
 *
 * Los `<link>` de Google Fonts: un `@font-face` declarado adentro de una
 * sombra no registra la fuente para lo de adentro (las fuentes son del
 * documento). Se levantan al limpiar (`inventario.fuentes`) y se ponen acá.
 *
 * ── Y lo que entra ANTES que su CSS ────────────────────────────────────────
 *
 * `ESTILO_DE_LA_CAPSULA`: el reseteo del `:host`, para que la página no le
 * preste la letra ni el color a su diseño, y la red de seguridad de lo que
 * "aparece al bajar". Va acá y no guardado con la versión a propósito: si
 * mañana lo mejoramos, las landings viejas lo reciben igual.
 *
 * El HTML que entra ya está limpio desde que se guardó (`limpiarLanding` en
 * la ruta de subida), así que acá no hay nada que sanear: se dibuja lo que
 * hay en la base. Ver `lib/landing-propia`.
 */

import { ESTILO_DE_LA_CAPSULA, EFECTOS_DE_LA_LANDING } from "@/lib/landing-efectos";

export default function LandingPropia({ html, fuentes }: { html: string; fuentes: string[] }) {
  return (
    <>
      {fuentes.map((f) => (
        <link key={f} rel="stylesheet" href={f} />
      ))}
      <div data-landing-propia>
        {/* `shadowrootmode` lo arma el parser del navegador; React sólo
            escribe el <template> con el HTML adentro. */}
        <template
          // @ts-expect-error -- atributo del parser, todavía no está en los tipos de React
          shadowrootmode="open"
          dangerouslySetInnerHTML={{ __html: ESTILO_DE_LA_CAPSULA + html }}
        />
      </div>
      {/* Veinte líneas nuestras que reemplazan el programa que le sacamos:
          bajar suave y aparecer al bajar. Nada más. */}
      <script dangerouslySetInnerHTML={{ __html: EFECTOS_DE_LA_LANDING }} />
    </>
  );
}
