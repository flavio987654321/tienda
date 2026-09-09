"use client";

import {
  MOLDES, columnaDeTexto, anchoDeColumna,
  type EstiloDeEbook, type Molde,
} from "@/lib/ebook-estilos";

/**
 * Cómo se ve un estilo, en chiquito.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SE DIBUJA DEL MOLDE, NO A MANO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Cuatro dibujitos hechos a mano habrían salido más lindos y habrían mentido a
 * la primera: alguien cambia `franja` de 132 a 90 en `ebook-estilos`, el PDF
 * sale distinto y **la miniatura sigue mostrando la de antes**. Y una miniatura
 * es exactamente lo que alguien mira para elegir: si miente, se elige mal y se
 * descubre recién con el archivo armado.
 *
 * Así que acá no hay ni un número propio. El `viewBox` es una hoja A4 en puntos
 * —los mismos que usa `ebook-pdf`— y todo lo que se dibuja sale de `MOLDES`.
 *
 * ── Lo que NO muestra ──────────────────────────────────────────────────────
 *
 * No dice qué tipografía es ni cómo queda un párrafo justificado: a 44 píxeles
 * de ancho eso no se ve, y fingirlo con letras ilegibles ensucia el único dato
 * que sí se lee de un vistazo — dónde está el texto y dónde la foto.
 */
export function MiniaturaDeEstilo({
  estilo,
  acento,
  tinta,
  papel,
  muestra = "hoja",
}: {
  estilo: EstiloDeEbook;
  acento: string;
  tinta: string;
  papel: string;
  /**
   * Qué se dibuja: una hoja de adentro o la tapa.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ EN UN RECETARIO HAY QUE MOSTRAR LA TAPA, Y NO ES UNA PREFERENCIA
   * ══════════════════════════════════════════════════════════════════════════
   *
   * El estilo cambia la hoja de adentro sólo cuando adentro hay **prosa**:
   * columnas, subtítulos, portadilla de capítulo. La hoja de una receta tiene su
   * propio molde —mide ingredientes, pasos y fichas para elegir entre tres
   * densidades— y hoy no escucha al estilo, así que las cuatro salen iguales.
   *
   * Dibujar la hoja de adentro en el selector de un recetario mostraría dos
   * columnas de texto corrido que ese archivo **nunca** va a tener: se elegiría
   * mirando algo que no existe. Así que ahí se muestra la tapa, que es lo que sí
   * cambia. Cuando la receta aprenda los moldes, esto vuelve a `hoja`.
   */
  muestra?: "hoja" | "tapa";
}) {
  const m = MOLDES[estilo];
  const ANCHO = 595.28;
  const ALTO = 841.89;

  if (muestra === "tapa") {
    return <LaTapa molde={m} acento={acento} tinta={tinta} papel={papel} />;
  }

  const texto = columnaDeTexto(m, ANCHO);
  const anchoCol = anchoDeColumna(m, ANCHO);

  /* Dónde termina lo de arriba y empieza el texto. Cada portadilla apoya el
     cuerpo en un lugar distinto, que es justamente lo que hay que ver. */
  const fotoDeFicha = m.portadilla === "ficha";
  const altoDeArriba = fotoDeFicha ? 150 + m.altoFoto + 24 : m.altoFoto + 26;
  const pie = ALTO - m.abajo;

  /* Los renglones. El paso sale del cuerpo y la interlínea del molde, por tres:
     dibujar los renglones de verdad a esta escala sería una mancha gris. */
  const paso = (m.cuerpo + m.interlinea) * 3;
  const grosor = Math.max(m.cuerpo * 0.9, 6);

  const renglones: { x: number; y: number; ancho: number; fuerte: boolean }[] = [];
  const columnas = m.columnas === 2 ? [0, 1] : [0];

  for (const c of columnas) {
    const x = texto.x + c * (anchoCol + m.calle);
    let y = altoDeArriba;
    let cuenta = 0;
    while (y + grosor <= pie) {
      /* Uno de cada cinco es un subtítulo, para que se vea cómo los marca cada
         molde: resaltado ocupa el ancho entero y en color; los otros dos son un
         renglón más corto y más oscuro. */
      const esSubtitulo = cuenta > 0 && cuenta % 5 === 0;
      renglones.push({
        x,
        y,
        /* El último de cada tanda queda corto, como termina un párrafo. */
        ancho: esSubtitulo ? anchoCol * 0.62 : (cuenta % 4 === 3 ? anchoCol * 0.72 : anchoCol),
        fuerte: esSubtitulo,
      });
      y += esSubtitulo ? paso * 1.4 : paso;
      cuenta += 1;
    }
  }

  /* Y en los moldes con franja, las marcas del costado: son los subtítulos
     sacados afuera del texto, que es lo que define a ese estilo. */
  const marcasDeFranja: { y: number }[] = [];
  if (m.franja > 0) {
    for (let y = altoDeArriba + paso * 2; y + grosor <= pie; y += paso * 5) {
      marcasDeFranja.push({ y });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={ANCHO} height={ALTO} fill={papel} />

      {/* ── Lo de arriba de la hoja ──────────────────────────────────────── */}
      {m.portadilla === "ficha" ? (
        <>
          {/* El número en la franja y el título al lado. */}
          <rect x={m.margen} y={90} width={m.franja * 0.5} height={m.numero} fill={acento} />
          <rect x={texto.x} y={96} width={texto.ancho * 0.8} height={26} fill={tinta} />
          <rect x={texto.x} y={150} width={texto.ancho} height={m.altoFoto} fill={acento} opacity={0.22} />
        </>
      ) : (
        <>
          <rect
            x={0} y={0} width={ANCHO} height={m.altoFoto}
            fill={acento}
            opacity={m.portadilla === "sangre" ? 0.55 : 0.22}
          />
          {/* El número del capítulo: en `banda` cuelga sobre el papel, en
              `sangre` va encima de la foto. */}
          <rect
            x={m.margen}
            y={m.altoFoto - m.numero * (m.portadilla === "sangre" ? 2.1 : 1.22)}
            width={m.numero * 1.1}
            height={m.numero}
            fill={m.portadilla === "sangre" ? papel : acento}
          />
        </>
      )}

      {/* ── El cuerpo ────────────────────────────────────────────────────── */}
      {renglones.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.ancho}
          height={r.fuerte && m.subtitulo === "resaltado" ? grosor * 1.8 : grosor}
          fill={r.fuerte ? acento : tinta}
          opacity={r.fuerte ? 1 : 0.32}
        />
      ))}

      {marcasDeFranja.map((mm, i) => (
        <rect
          key={`f${i}`}
          x={m.margen}
          y={mm.y}
          width={m.franja * 0.72}
          height={grosor}
          fill={acento}
        />
      ))}

      {/* La franja del pie, que todos los moldes tienen. */}
      <rect x={0} y={ALTO - 34} width={ANCHO} height={34} fill={acento} />
    </svg>
  );
}

/**
 * Las cuatro tapas, en chiquito.
 *
 * Los cortes son los mismos que dibujan `tapa` en `ebook-pdf` y
 * `TapaDeLaPrevia` en `previaPiezas`: 52 % la clásica, 44 % la de titular,
 * 46 % de ancho la de ficha, y la de sangre entera. Si allá cambian, acá
 * también — es lo mismo que se mira para elegir.
 *
 * ⚠️ La foto se dibuja como un bloque de acento apagado y NO como un hueco con
 * la palabra "foto": a este tamaño un rótulo no se lee, y lo que hay que ver es
 * **dónde cae** la foto, no que haya una.
 */
function LaTapa({
  molde, acento, tinta, papel,
}: {
  molde: Molde;
  acento: string;
  tinta: string;
  papel: string;
}) {
  const ANCHO = 595.28;
  const ALTO = 841.89;
  const foto = { fill: acento, opacity: 0.28 };

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={ANCHO} height={ALTO} fill={papel} />

      {molde.tapa === "sangre" && (
        <>
          <rect x={0} y={0} width={ANCHO} height={ALTO} {...foto} />
          {/* El velo, que es lo que hace legible el título encima. */}
          <rect x={0} y={ALTO * 0.5} width={ANCHO} height={ALTO * 0.5} fill={tinta} opacity={0.55} />
          <rect x={molde.margen} y={ALTO * 0.66} width={ANCHO - molde.margen * 2} height={molde.tituloTapa} fill={papel} />
          <rect x={molde.margen} y={ALTO * 0.66 + molde.tituloTapa + 14} width={62} height={8} fill={acento} />
        </>
      )}

      {molde.tapa === "titular" && (
        <>
          <rect x={0} y={0} width={ANCHO} height={ALTO * 0.44} {...foto} />
          <rect x={0} y={ALTO * 0.44} width={ANCHO} height={molde.tituloTapa + 76} fill={acento} />
          <rect
            x={molde.margen} y={ALTO * 0.44 + 44}
            width={ANCHO - molde.margen * 2 - 60} height={molde.tituloTapa}
            fill={papel}
          />
        </>
      )}

      {molde.tapa === "ficha" && (
        <>
          <rect x={ANCHO * 0.54} y={0} width={ANCHO * 0.46} height={ALTO - 96} {...foto} />
          <rect x={molde.margen} y={118} width={44} height={8} fill={acento} />
          <rect x={molde.margen} y={148} width={ANCHO * 0.54 - molde.margen * 2} height={molde.tituloTapa * 2.4} fill={tinta} opacity={0.75} />
          <rect x={0} y={ALTO - 96} width={ANCHO} height={96} fill={acento} />
        </>
      )}

      {molde.tapa === "clasica" && (
        <>
          <rect x={0} y={0} width={ANCHO} height={ALTO * 0.52} {...foto} />
          <rect x={molde.margen} y={ALTO * 0.52 + 44} width={62} height={8} fill={acento} />
          <rect
            x={molde.margen} y={ALTO * 0.52 + 72}
            width={ANCHO - molde.margen * 2} height={molde.tituloTapa * 2.2}
            fill={tinta} opacity={0.75}
          />
          <rect x={0} y={ALTO - 44} width={ANCHO} height={44} fill={acento} />
        </>
      )}
    </svg>
  );
}
