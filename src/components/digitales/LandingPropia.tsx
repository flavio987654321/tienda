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
      {/* ⚠️ El <template> va adentro de un `dangerouslySetInnerHTML` DEL DIV, y
          no como hijo de React. Parece lo mismo y no lo es.
          ═════════════════════════════════════════════════════════════════════
          EL TEMPLATE DESAPARECE ANTES DE QUE REACT LO BUSQUE
          ═════════════════════════════════════════════════════════════════════

          Un `<template shadowrootmode>` lo consume el PARSER: al leerlo, el
          navegador arma la sombra y **saca el template del DOM**. Para cuando
          React hidrata, ese elemento ya no existe.

          Escrito como hijo de React, la hidratación buscaba el template, no lo
          encontraba, y tiraba el error #418 —"el HTML del servidor no coincide
          con el del cliente"—. React entonces hace lo que corresponde ante un
          desajuste: descarta el HTML del servidor y vuelve a dibujar el árbol
          entero en el cliente. Y ahí está el problema: un `<template>` creado
          por JavaScript **ya no se convierte en sombra** —eso sólo pasa al
          parsear—, así que quedaba un template inerte, invisible, y la landing
          entera no se dibujaba. Lo que se veía era el `<body>` del sitio, azul
          casi negro.

          Con `dangerouslySetInnerHTML` en el div, React trata el contenido como
          opaco: no lo compara al hidratar ni lo vuelve a escribir. La sombra que
          armó el parser queda intacta.

          Síntoma para reconocerlo si vuelve: React #418 en la consola y la
          página en negro. Verificado con `haySombra` en un build de producción
          —en desarrollo React se recupera distinto y no se nota—. */}
      <div
        data-landing-propia
        dangerouslySetInnerHTML={{
          __html: `<template shadowrootmode="open">${ESTILO_DE_LA_CAPSULA}${html}</template>`,
        }}
      />
      {/* Veinte líneas nuestras que reemplazan el programa que le sacamos:
          bajar suave y aparecer al bajar. Nada más. */}
      <script dangerouslySetInnerHTML={{ __html: EFECTOS_DE_LA_LANDING }} />
    </>
  );
}
