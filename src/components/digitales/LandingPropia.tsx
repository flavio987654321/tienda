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
 * pantalla de una venta. Como nada de adentro es interactivo por JS —el
 * acordeón es `<details>`, los tildes son checkboxes— no hace falta nada más.
 *
 * ── Lo que queda AFUERA de la sombra ───────────────────────────────────────
 *
 * Los `<link>` de Google Fonts: un `@font-face` declarado adentro de una
 * sombra no registra la fuente para lo de adentro (las fuentes son del
 * documento). Se levantan al limpiar (`inventario.fuentes`) y se ponen acá.
 *
 * El HTML que entra ya está limpio desde que se guardó (`limpiarLanding` en
 * la ruta de subida), así que acá no hay nada que sanear: se dibuja lo que
 * hay en la base. Ver `lib/landing-propia`.
 */

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
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  );
}
