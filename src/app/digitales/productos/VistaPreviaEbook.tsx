"use client";

import {
  coloresDelEbook, SOBRE_LA_FOTO, acentoSobreLaFoto,
  type ColoresDeTapa, type ModoDelEbook,
} from "@/lib/ebook-colores";
import {
  COMO_SE_LLAMA_EL_BLOQUE,
  type FotoDelCapitulo, type Seleccion,
} from "@/lib/ebook-texto";
import type { CapituloEscrito } from "@/lib/ebook-ia";
/* La hoja, la tapa, lo que se puede tocar y el hueco de la foto: son las mismas
   en el recetario, así que viven aparte. Ver `previaPiezas`. */
import {
  MarcoDeLaHoja, Tocable, HuecoDeFoto, em, anchoEnLaHoja,
} from "./previaPiezas";
import { columnaDeTexto, anchoUtilDe, type Molde } from "@/lib/ebook-estilos";

/**
 * Cómo va a quedar el ebook, al lado de lo que se está escribiendo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NO ES EL PDF: ES LA MISMA MAQUETA, DIBUJADA EN LA PANTALLA
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El PDF de verdad lo arma `ebook-pdf` con pdfkit, del lado del servidor, y
 * tarda unos segundos: no se puede rehacer con cada tecla. Esto es la misma
 * maqueta escrita en HTML — los mismos tamaños, los mismos colores, la misma
 * hoja A4— para poder ver lo que se está corrigiendo mientras se corrige.
 *
 * ⚠️ **Los colores NO están escritos acá.** Salen de `coloresDelEbook`, que es
 * exactamente la función que usa el PDF (ver `ebook-colores`). Copiarlos habría
 * sido el camino conocido a que la previa muestre un verde y el archivo salga
 * con otro.
 *
 * ── Las medidas son las del PDF, en proporción ─────────────────────────────
 *
 * Una hoja A4 mide 595,28 puntos de ancho y el margen del ebook son 56, o sea
 * el 9,41 %. El cuerpo del texto son 11,5 puntos, el subtítulo 13, el título de
 * un capítulo 25 y su número 72. Acá todo eso se escribe en `em` sobre un
 * cuerpo que vale 11,5 puntos, así que las proporciones son las de verdad
 * aunque la hoja se dibuje del ancho que haya.
 *
 * El cuerpo se ata al ancho del contenedor con `cqw` —1 cqw es el 1 % de ese
 * ancho— así la hoja se agranda y se achica entera, como una hoja. Y hay un
 * `font-size` fijo antes, de red: si el navegador no entendiera `cqw` la
 * declaración se descarta y la hoja se dibuja igual, un poco más chica.
 *
 * ── Lo que esta previa NO puede mostrar ────────────────────────────────────
 *
 * Dónde corta cada hoja. Eso lo decide pdfkit midiendo renglón por renglón, y
 * fingirlo sería peor que no mostrarlo: alguien acomodaría su texto para un
 * corte que después no es. Acá el ebook se ve como una tira continua, y lo que
 * se juzga es lo que de verdad se está corrigiendo — cómo queda escrito.
 */

export default function VistaPreviaEbook({
  titulo,
  promesa,
  autor,
  capitulos,
  fotos,
  tapa,
  paleta,
  molde,
  modo,
  seleccion = null,
  onTocar,
}: {
  titulo: string;
  promesa: string;
  autor: string;
  capitulos: CapituloEscrito[];
  /**
   * Con qué se busca la foto de cada capítulo, en el mismo orden.
   *
   * ⚠️ Están acá porque **el PDF lleva fotos y esta previa no las tenía**: la
   * tapa se lleva la mitad de la hoja y cada capítulo abre con una banda de 350
   * puntos. Dibujando sólo color, la previa mostraba un ebook que no es el que
   * sale — y encima escondía el dato que más le sirve a quien corrige: que la
   * foto se busca **con una frase**, y que esa frase se puede cambiar en el
   * temario. Ver `CapituloPlaneado.foto`.
   *
   * Puede venir vacía —los ebooks guardados antes del 07/09/26 no la tienen— y
   * ahí la búsqueda cae al título, igual que en el armado.
   */
  fotos: FotoDelCapitulo[];
  /** La de la tapa, que no es un capítulo. */
  tapa: FotoDelCapitulo;
  paleta: ColoresDeTapa;
  modo: ModoDelEbook;
  /**
   * Cómo está armada la hoja. Ver `ebook-estilos`.
   *
   * ⚠️ Todo lo de acá abajo sale de él: el margen, el ancho del renglón, si hay
   * una columna o dos, cómo abre el capítulo y cómo se marca un subtítulo.
   * Estaban escritos como números fijos —56, 350, 72, 13— porque había un solo
   * molde. Con cuatro, esos números son los de UNO, y dejarlos ahí sería
   * mostrarle a alguien la hoja de un estilo que no eligió.
   */
  molde: Molde;
  /**
   * Qué pedazo está marcado, para dibujarlo marcado.
   *
   * ⚠️ Viene de arriba y no se decide acá: el mismo dato lo usa la columna de
   * la izquierda para abrir ese capítulo y llevar el cursor a ese campo. Si
   * cada columna guardara el suyo, tocar en una no movería la otra — que es
   * exactamente lo que pasaba antes. Ver `Seleccion`.
   */
  seleccion?: Seleccion | null;
  /** Qué se tocó. Sin esto la previa es de sólo mirar, como era hasta hoy. */
  onTocar?: (s: Seleccion) => void;
}) {
  const t = coloresDelEbook(paleta, modo);
  const margen = anchoEnLaHoja(molde.margen);

  /* Dónde arranca el cuerpo y cuánto mide. Con franja al costado no es el
     margen: el texto se corre a la derecha y los subtítulos quedan afuera. La
     cuenta es la misma que hace el PDF — vive en `ebook-estilos`. */
  const columna = columnaDeTexto(molde);
  const util = anchoUtilDe(molde);

  /* La foto del capítulo, como fracción de la banda: los tres números del
     degradado están en puntos y la banda cambia de alto según el molde. */
  const alturaDeLaFoto = molde.altoFoto;

  return (
    /* El marco, los estilos y la tapa son de la HOJA y no de los capítulos:
       viven en `previaPiezas` porque el recetario dibuja exactamente lo mismo. */
    <MarcoDeLaHoja t={t} molde={molde} titulo={titulo} promesa={promesa} autor={autor}
      tapa={tapa} seleccion={seleccion} onTocar={onTocar}>
        {/* ── Los capítulos ────────────────────────────────────────────────── */}
        {capitulos.map((c, i) => (
          <div key={i}>
            {/* La portadilla. Son tres, y las tres están del otro lado en
                `portadilla`, `portadillaASangre` y `portadillaDeFicha`: si allá
                cambian, acá también. */}
            <Tocable
              que={{ que: "foto", capitulo: i }}
              seleccion={seleccion}
              onTocar={onTocar}
              nombre={`Cambiar la foto del capítulo ${i + 1}`}
              estilo={{
                position: "relative",
                marginTop: i === 0 ? 0 : em(26),
                /* La de ficha no va a sangre: la foto entra en la columna de
                   texto, como una figura de un libro de estudio. */
                paddingLeft: molde.portadilla === "ficha" ? anchoEnLaHoja(columna.x) : 0,
                paddingRight: molde.portadilla === "ficha" ? margen : 0,
                paddingTop: molde.portadilla === "ficha" ? em(30) : 0,
              }}
            >
              <HuecoDeFoto
                foto={fotos[i]}
                respaldo={c.titulo}
                t={t}
                proporcion={
                  molde.portadilla === "ficha"
                    ? `${columna.ancho} / ${alturaDeLaFoto}`
                    : `595.28 / ${alturaDeLaFoto}`
                }
              />

              {/* ⚠️ EL MISMO DEGRADADO QUE EL PDF, y no es decoración: el número
                  va arriba de la foto, y una foto puede ser de cualquier color.
                  Sin esto, sobre una foto clara con un acento claro el número
                  desaparece. El archivo lo resuelve disolviendo la foto en el
                  papel antes de donde empieza el número; acá se dibuja igual,
                  con los mismos 190 y 96 puntos —que ahora salen del alto del
                  número, porque `cartel` lo manda a 110—. Ver `portadilla`.

                  Sólo en `banda`: la de sangre apoya el texto ENCIMA de la foto,
                  con velo, y la de ficha no tiene nada apoyado. */}
              {molde.portadilla === "banda" && (
                <>
                  <div
                    style={{
                      position: "absolute", left: 0, right: 0,
                      bottom: `${((molde.numero * (96 / 72)) / alturaDeLaFoto * 100).toFixed(2)}%`,
                      height: `${(((190 - molde.numero * (96 / 72)) / alturaDeLaFoto) * 100).toFixed(2)}%`,
                      background: `linear-gradient(to bottom, transparent, ${t.fondo})`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute", left: 0, right: 0, bottom: 0,
                      height: `${((molde.numero * (96 / 72)) / alturaDeLaFoto * 100).toFixed(2)}%`,
                      background: t.fondo,
                    }}
                  />
                </>
              )}

              {/* En la de sangre, el velo que hace legible el texto blanco. */}
              {molde.portadilla === "sangre" && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0"
                  style={{
                    height: "78%",
                    background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.92) 100%)",
                  }}
                />
              )}

              {molde.portadilla !== "ficha" && (
                <p
                  style={{
                    position: "absolute", left: margen,
                    bottom: molde.portadilla === "sangre"
                      ? `${((molde.numero * 1.15 + 42) / alturaDeLaFoto * 100).toFixed(2)}%`
                      : em(6),
                    fontSize: em(molde.numero), lineHeight: 0.9, fontWeight: 700,
                    color: molde.portadilla === "sangre" ? SOBRE_LA_FOTO.titulo : t.acento,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </p>
              )}

              {/* En la de sangre el TÍTULO también va sobre la foto. */}
              {molde.portadilla === "sangre" && (
                <p
                  style={{
                    position: "absolute", left: margen, right: margen,
                    bottom: `${(42 / alturaDeLaFoto * 100).toFixed(2)}%`,
                    fontSize: em(27), lineHeight: 1.15, fontWeight: 700, color: SOBRE_LA_FOTO.titulo,
                  }}
                >
                  {c.titulo || "Sin título"}
                </p>
              )}

              {/* La rayita apoyada en el borde de abajo de la foto, igual que en
                  `portadillaASangre`. Va con el acento corrido contra el velo:
                  ver `acentoSobreLaFoto`. */}
              {molde.portadilla === "sangre" && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: margen, bottom: `${(26 / alturaDeLaFoto * 100).toFixed(2)}%`,
                    width: em(48), height: em(3), background: acentoSobreLaFoto(t),
                  }}
                />
              )}
            </Tocable>

            <div
              style={{
                paddingLeft: anchoEnLaHoja(columna.x),
                paddingRight: margen,
                paddingTop: em(18),
              }}
            >
              {/* El título ya salió sobre la foto en la de sangre: repetirlo acá
                  sería mostrarlo dos veces en una hoja que sólo lo tiene una. */}
              {molde.portadilla !== "sangre" && (
                <>
                  <Tocable
                    que={{ que: "titulo", capitulo: i }}
                    seleccion={seleccion}
                    onTocar={onTocar}
                    nombre={`Corregir el título del capítulo ${i + 1}`}
                  >
                    <p style={{ fontSize: em(molde.portadilla === "ficha" ? 24 : 25), lineHeight: 1.15, fontWeight: 700, color: t.tinta }}>
                      {c.titulo || "Sin título"}
                    </p>
                  </Tocable>
                  <div style={{ width: em(48), height: em(3), background: t.acento, marginTop: em(14) }} />
                </>
              )}

              <div
                style={{
                  marginTop: em(20), paddingBottom: em(30),
                  /* Las dos columnas de `compacto`. ⚠️ Acá las balancea el
                     navegador sobre el capítulo entero, y en el archivo se
                     llenan hoja por hoja: no es el mismo corte. Lo que esto
                     muestra —y es lo que se necesita para elegir— es el ANCHO
                     del renglón, que es lo que de verdad cambia cómo se lee. */
                  ...(molde.columnas === 2
                    ? { columnCount: 2, columnGap: em(molde.calle) }
                    : {}),
                }}
              >
                {c.bloques.map((b, j) => (
                  /* ⚠️ Un pedazo vacío no lleva botón. `Pedazo` no dibuja nada
                     —en el PDF tampoco sale— y un botón sin adentro es un
                     recuadro invisible al que igual se llega con el tabulador.

                     ⚠️ El `j` es la posición REAL en la lista, no la del que se
                     dibujó: un pedazo vacío no se dibuja —`Pedazo` devuelve
                     nada— y contando los dibujados, tocar el tercero llevaría
                     al cuarto campo. */
                  !b.texto.trim() ? null : (
                  <Tocable
                    key={j}
                    que={{ que: "bloque", capitulo: i, bloque: j }}
                    seleccion={seleccion}
                    onTocar={onTocar}
                    nombre={`Corregir el ${COMO_SE_LLAMA_EL_BLOQUE[b.tipo].nombre.toLowerCase()} ${j + 1} del capítulo ${i + 1}`}
                  >
                    <Pedazo
                      bloque={b}
                      t={t}
                      molde={molde}
                      util={util}
                      /* El primero que no es subtítulo abre el capítulo: los
                         moldes con entrada lo escriben más grande, igual que en
                         el archivo. Ver `capitulo` en `ebook-pdf`. */
                      deEntrada={j === c.bloques.findIndex(
                        (x) => x.tipo !== "subtitulo" && !!x.texto.trim(),
                      )}
                    />
                  </Tocable>
                  )
                ))}
              </div>
            </div>
          </div>
        ))}
    </MarcoDeLaHoja>
  );
}

/** Un pedazo, dibujado como lo dibuja `dibujarBloque` en el PDF. */
function Pedazo({
  bloque,
  t,
  molde,
  util,
  deEntrada,
}: {
  bloque: { tipo: string; texto: string };
  t: ReturnType<typeof coloresDelEbook>;
  molde: Molde;
  /** El ancho útil de la hoja, para sacar el subtítulo a la franja. */
  util: number;
  deEntrada: boolean;
}) {
  const texto = bloque.texto.trim();
  /* Un pedazo vacío no se dibuja: en el PDF tampoco, `soloLoQueEntra` lo saca.
     Y mientras se escribe uno nuevo, un renglón fantasma en la previa haría
     pensar que el ebook va a salir con un hueco. */
  if (!texto) return null;

  /* La interlínea del molde, dicha como múltiplo del cuerpo: en el PDF es un
     hueco en puntos entre renglones, y en CSS es la altura del renglón entero. */
  const renglon = (molde.cuerpo + molde.interlinea) / molde.cuerpo + 0.16;

  if (bloque.tipo === "subtitulo") {
    /* ── En la franja del costado ──────────────────────────────────────────
       El subtítulo sale del texto y se apoya en el margen izquierdo, y el
       cuerpo sigue a su altura. Se hace con `float` y un margen negativo: es
       exactamente lo que el PDF logra dibujándolo en `t.margen` y devolviendo
       el cursor a la misma `y`. Ver `dibujarSubtitulo`. */
    if (molde.franja > 0) {
      return (
        <div
          style={{
            float: "left", clear: "left",
            width: `${((molde.franja / (util - molde.franja - molde.calle)) * 100).toFixed(2)}%`,
            marginLeft: `${(-((molde.franja + molde.calle) / (util - molde.franja - molde.calle)) * 100).toFixed(2)}%`,
            marginTop: em(14), marginBottom: em(6), paddingRight: em(molde.calle),
          }}
        >
          <p
            style={{
              fontSize: em(molde.subtituloPt), lineHeight: 1.25,
              fontWeight: 700, color: t.acento,
            }}
          >
            {texto}
          </p>
        </div>
      );
    }

    if (molde.subtitulo === "resaltado") {
      return (
        <div
          style={{
            background: t.acento, marginTop: em(20), marginBottom: em(10),
            padding: `${em(9)} ${em(12)}`,
          }}
        >
          <p
            style={{
              fontSize: em(molde.subtituloPt), lineHeight: 1.25,
              fontWeight: 700, color: t.sobreAcento,
            }}
          >
            {texto}
          </p>
        </div>
      );
    }

    if (molde.subtitulo === "linea") {
      return (
        <div style={{ marginTop: em(18), marginBottom: em(6) }}>
          <div style={{ height: em(0.8), background: t.acento, marginBottom: em(8) }} />
          <p
            style={{
              fontSize: em(molde.subtituloPt), lineHeight: 1.3,
              fontWeight: 700, color: t.tinta,
            }}
          >
            {texto}
          </p>
        </div>
      );
    }

    return (
      <div style={{ marginTop: em(18), marginBottom: em(6), position: "relative" }}>
        {/* La rayita del margen, que es lo que hace que un subtítulo se vea
            como parte del libro y no como un renglón en negrita más. */}
        <div
          style={{
            position: "absolute", left: em(-14), top: em(3),
            width: em(3), height: em(13), background: t.acento,
          }}
        />
        <p
          style={{
            fontSize: em(molde.subtituloPt), lineHeight: 1.3,
            fontWeight: 700, color: t.tinta,
          }}
        >
          {texto}
        </p>
      </div>
    );
  }

  if (bloque.tipo === "aviso") {
    return (
      <div
        style={{
          background: t.caja, borderRadius: em(molde.esquina),
          borderLeft: `${em(3)} solid ${t.acento}`,
          padding: `${em(16)} ${em(22)}`, marginTop: em(14), marginBottom: em(14),
        }}
      >
        <p
          style={{
            fontSize: em(8.5), letterSpacing: "0.1em", fontWeight: 700,
            color: t.acento, marginBottom: em(6),
          }}
        >
          OJO CON ESTO
        </p>
        <p style={{ fontSize: em(10.5), lineHeight: 1.5, color: t.tinta }}>{texto}</p>
      </div>
    );
  }

  if (bloque.tipo === "vineta") {
    return (
      <div style={{ display: "flex", gap: em(9), marginBottom: em(6) }}>
        <span style={{ fontSize: em(molde.cuerpo), lineHeight: renglon, color: t.tinta }}>•</span>
        <p style={{ fontSize: em(molde.cuerpo), lineHeight: renglon, color: t.tinta }}>{texto}</p>
      </div>
    );
  }

  /* La entrada: el primer párrafo del capítulo, más grande y en el color de
     segunda. Sólo en los moldes que la tienen. Ver `entrada` en `ebook-estilos`. */
  if (deEntrada && molde.entrada) {
    return (
      <p
        style={{
          fontSize: em(molde.cuerpo + 2.5), lineHeight: renglon,
          fontStyle: "italic", color: t.suave, marginBottom: em(12),
        }}
      >
        {texto}
      </p>
    );
  }

  /* El párrafo, con la alineación del molde: justificado en los de renglón
     largo y a la izquierda en los angostos, igual que en el PDF. */
  return (
    <p
      style={{
        fontSize: em(molde.cuerpo), lineHeight: renglon, textAlign: molde.alineado,
        color: t.tinta, marginBottom: em(9),
      }}
    >
      {texto}
    </p>
  );
}
