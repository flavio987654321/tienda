"use client";

import {
  MOLDES, columnaDeTexto, anchoDeColumna, HOJA_DE_RECETA,
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
   * Qué hoja se dibuja: una de prosa o una de receta.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * ⚠️ EN UN RECETARIO SE DIBUJA UNA RECETA, Y NO ES UNA PREFERENCIA
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Adentro de un recetario no hay párrafos: hay fichas, ingredientes y pasos.
   * Dibujar acá dos columnas de texto corrido sería elegir mirando una hoja que
   * ese archivo nunca va a tener — es exactamente lo que pasaba hasta el
   * 09/09/26, cuando la hoja de la receta todavía no leía el molde y el
   * selector de un recetario prometía subtítulos al costado.
   *
   * Ahora sí lo lee (ver `receta` en `ebook-estilos` y `hojaDeReceta`), así que
   * esto dibuja **la misma receta que va a salir**: dónde cae la foto y dónde
   * caen las tres fichas, que es lo que cambia entre los cuatro.
   */
  muestra?: "hoja" | "receta";
}) {
  const m = MOLDES[estilo];
  const ANCHO = 595.28;
  const ALTO = 841.89;

  if (muestra === "receta") {
    return <LaReceta molde={m} acento={acento} tinta={tinta} papel={papel} />;
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
 * Las cuatro hojas de receta, en chiquito.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UNA RECETA NO ES PROSA, Y ACÁ SE TIENE QUE VER
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lo de arriba dibuja renglones porque adentro de un ebook de texto hay
 * párrafos. Adentro de un recetario hay una ficha: la foto, las tres medidas,
 * los ingredientes de un lado y los pasos del otro. Si acá se dibujaran
 * renglones, se elegiría mirando una hoja que ese archivo no tiene.
 *
 * Lo que cambia entre los cuatro —y es lo único que hay que ver a este tamaño—
 * es **dónde cae la foto** y **dónde caen las tres fichas**. Las dos columnas
 * de abajo son iguales en los cuatro, igual que en `hojaDeReceta`.
 *
 * ⚠️ Las medidas de la foto salen de `HOJA_DE_RECETA`, que es la misma tabla
 * que lee el PDF. A este tamaño la diferencia entre 148 y 160 no se ve, pero el
 * día que alguien agrande la banda en el archivo, la miniatura la agranda sola.
 */
function LaReceta({
  molde, acento, tinta, papel,
}: {
  molde: Molde;
  acento: string;
  tinta: string;
  papel: string;
}) {
  const ANCHO = 595.28;
  const ALTO = 841.89;
  const m = molde;
  const util = ANCHO - m.margen * 2;
  const foto = { fill: acento, opacity: 0.28 };

  const R = HOJA_DE_RECETA;
  const X_DER = m.margen + R.ingredientes + R.calle;
  const ANCHO_DER = util - R.ingredientes - R.calle;

  const aSangre = m.receta === "sangre";
  const cuadrada = m.receta === "ficha";
  const enLaFranja = m.receta === "franja";

  /* Dónde termina lo de arriba. Cada acomodo apoya las columnas en un lugar
     distinto, que es justamente lo que hay que ver: `compacto` arranca mucho
     más arriba porque la foto se le fue al costado del título. */
  const ALTO_TITULO = 30;
  const yFoto = m.arriba + ALTO_TITULO + 18;
  /* ⚠️ Con la franja de título, la foto cuadrada arranca donde arranca la
     franja y no seis puntos arriba del título: es lo mismo que hace el archivo
     para que no quede el escaloncito. Ver `yCuadrada` en `hojaDeReceta`. */
  const yCuadrada = m.arriba - 12;
  const yArriba = aSangre
    ? R.sangreMax + 24
    : cuadrada
      ? yCuadrada + R.ladoMax + 18
      : yFoto + R.bandaMax + 16;

  /* Las tres fichas: en fila a todo el ancho, o apiladas al costado. */
  const ALTO_FILA = 52;
  const ALTO_FRANJA = 130;
  const yColumnas = enLaFranja ? yArriba : yArriba + ALTO_FILA + 22;
  const yEtiquetaIzq = enLaFranja ? yColumnas + ALTO_FRANJA + 18 : yColumnas;

  const pie = ALTO - m.abajo;
  const ALTO_TIP = 70;
  const yTip = pie - ALTO_TIP;

  /* Los ingredientes: un renglón corto y la cantidad pegada a la derecha. */
  const ingredientes: { y: number; ancho: number }[] = [];
  for (let y = yEtiquetaIzq + 20; y + 6 <= yTip - 16; y += 18) {
    ingredientes.push({
      y,
      ancho: R.ingredientes * (ingredientes.length % 3 === 1 ? 0.52 : 0.68),
    });
  }

  /* Los pasos: el número redondo y dos o tres renglones al lado. */
  const pasos: { y: number; renglones: number }[] = [];
  for (let y = yColumnas + 20; y + 30 <= yTip - 16; ) {
    const renglones = pasos.length % 3 === 1 ? 2 : 3;
    pasos.push({ y, renglones });
    y += renglones * 13 + 16;
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

      {/* ── La foto y el título ──────────────────────────────────────────── */}
      {aSangre ? (
        <>
          <rect x={0} y={0} width={ANCHO} height={R.sangreMax} fill={acento} opacity={0.55} />
          {/* El título va ENCIMA de la foto, en claro sobre el velo. */}
          <rect x={m.margen} y={R.sangreMax - 96} width={util * 0.72} height={ALTO_TITULO} fill={papel} />
          <rect x={m.margen} y={R.sangreMax - 52} width={util * 0.5} height={9} fill={papel} opacity={0.7} />
        </>
      ) : (
        <>
          {/* ⚠️ `compacto` mete el título adentro de una franja de acento que
              arranca en el BORDE de la hoja y se corta antes de la foto. Es lo
              que lo hace ver de diario, y sin dibujarlo acá la miniatura
              mostraba la misma cabeza que `libro` — que es exactamente el
              problema que la franja vino a resolver. */}
          {cuadrada && (
            <rect
              x={0} y={yCuadrada}
              width={ANCHO - m.margen - R.ladoMax - 16}
              height={ALTO_TITULO + 28}
              fill={acento}
            />
          )}
          <rect
            x={m.margen} y={m.arriba}
            width={(cuadrada ? util - R.ladoMax - 20 : util - 60) * 0.9}
            height={ALTO_TITULO}
            fill={cuadrada ? papel : tinta}
            opacity={cuadrada ? 1 : 0.75}
          />
          {cuadrada ? (
            <rect
              x={ANCHO - m.margen - R.ladoMax} y={yCuadrada}
              width={R.ladoMax} height={R.ladoMax} {...foto}
            />
          ) : (
            <rect x={m.margen} y={yFoto} width={util} height={R.bandaMax} {...foto} />
          )}
        </>
      )}

      {/* ── Las tres fichas ──────────────────────────────────────────────── */}
      {enLaFranja ? (
        <>
          <rect
            x={m.margen} y={yColumnas} width={R.ingredientes} height={ALTO_FRANJA}
            rx={m.esquina} fill={acento} opacity={0.16}
          />
          <rect x={m.margen} y={yColumnas} width={3} height={ALTO_FRANJA} fill={acento} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={m.margen + 12} y={yColumnas + 16 + i * 40} width={40} height={6} fill={acento} />
              <rect
                x={m.margen + 12} y={yColumnas + 28 + i * 40}
                width={R.ingredientes - 40} height={8}
                fill={tinta} opacity={0.45}
              />
            </g>
          ))}
        </>
      ) : (
        <>
          <rect x={m.margen} y={yArriba} width={util} height={ALTO_FILA} rx={8} fill={acento} opacity={0.16} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={m.margen + 20 + i * (util / 3)} y={yArriba + 14} width={36} height={6} fill={acento} />
              <rect
                x={m.margen + 20 + i * (util / 3)} y={yArriba + 27}
                width={util / 3 - 46} height={8}
                fill={tinta} opacity={0.45}
              />
            </g>
          ))}
        </>
      )}

      {/* ── Las dos columnas ─────────────────────────────────────────────── */}
      <rect x={m.margen} y={yEtiquetaIzq} width={78} height={7} fill={acento} />
      <rect x={X_DER} y={yColumnas} width={78} height={7} fill={acento} />

      {ingredientes.map((ing, i) => (
        <g key={`i${i}`}>
          <rect x={m.margen} y={ing.y} width={ing.ancho} height={6} fill={tinta} opacity={0.32} />
          <rect
            x={m.margen + R.ingredientes - 26} y={ing.y}
            width={26} height={6} fill={tinta} opacity={0.5}
          />
        </g>
      ))}

      {pasos.map((p, i) => (
        <g key={`p${i}`}>
          <circle cx={X_DER + 7} cy={p.y + 5} r={7.5} fill={acento} />
          {Array.from({ length: p.renglones }, (_, k) => (
            <rect
              key={k}
              x={X_DER + 22} y={p.y + k * 13}
              width={(ANCHO_DER - 26) * (k === p.renglones - 1 ? 0.66 : 1)}
              height={6}
              fill={tinta} opacity={0.32}
            />
          ))}
        </g>
      ))}

      {/* El consejo, abajo de todo y cruzando las dos columnas. */}
      <rect
        x={m.margen} y={yTip} width={util} height={ALTO_TIP}
        rx={m.esquina} fill={acento} opacity={0.16}
      />
      <rect x={m.margen} y={yTip} width={3} height={ALTO_TIP} fill={acento} />

      {/* La franja del pie, que todos los moldes tienen. */}
      <rect x={0} y={ALTO - 34} width={ANCHO} height={34} fill={acento} />
    </svg>
  );
}
