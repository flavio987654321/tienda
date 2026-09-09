"use client";

import { coloresDelEbook, type ColoresDeTapa, type ModoDelEbook } from "@/lib/ebook-colores";
import {
  COMO_SE_LLAMA_EL_BLOQUE,
  type FotoDelCapitulo, type Seleccion,
} from "@/lib/ebook-texto";
import type { CapituloEscrito } from "@/lib/ebook-ia";
/* La hoja, la tapa, lo que se puede tocar y el hueco de la foto: son las mismas
   en el recetario, así que viven aparte. Ver `previaPiezas`. */
import { MarcoDeLaHoja, Tocable, HuecoDeFoto, em, MARGEN } from "./previaPiezas";

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
  const margen = MARGEN;

  return (
    /* El marco, los estilos y la tapa son de la HOJA y no de los capítulos:
       viven en `previaPiezas` porque el recetario dibuja exactamente lo mismo. */
    <MarcoDeLaHoja t={t} titulo={titulo} promesa={promesa} autor={autor}
      tapa={tapa} seleccion={seleccion} onTocar={onTocar}>
        {/* ── Los capítulos ────────────────────────────────────────────────── */}
        {capitulos.map((c, i) => (
          <div key={i}>
            {/* La portadilla: la foto, el número grande encima, y abajo el
                título con su rayita. En el archivo la banda mide 350 puntos de
                una hoja de 841,89 — el 41,6 % — y el número se apoya en el
                borde de abajo. Ver `portadilla` en `ebook-pdf`. */}
            <Tocable
              que={{ que: "foto", capitulo: i }}
              seleccion={seleccion}
              onTocar={onTocar}
              nombre={`Cambiar la foto del capítulo ${i + 1}`}
              estilo={{ position: "relative", marginTop: i === 0 ? 0 : em(26) }}
            >
              <HuecoDeFoto foto={fotos[i]} respaldo={c.titulo} t={t} proporcion="595.28 / 350" />

              {/* ⚠️ EL MISMO DEGRADADO QUE EL PDF, y no es decoración: el número
                  va arriba de la foto, y una foto puede ser de cualquier color.
                  Sin esto, sobre una foto clara con un acento claro el número
                  desaparece. El archivo lo resuelve disolviendo la foto en el
                  papel antes de donde empieza el número; acá se dibuja igual,
                  con los mismos 190 y 96 puntos. Ver `portadilla` en
                  `ebook-pdf`: si allá cambian, acá también. */}
              <div
                style={{
                  position: "absolute", left: 0, right: 0, bottom: `${((96 / 350) * 100).toFixed(2)}%`,
                  height: `${(((190 - 96) / 350) * 100).toFixed(2)}%`,
                  background: `linear-gradient(to bottom, transparent, ${t.fondo})`,
                }}
              />
              <div
                style={{
                  position: "absolute", left: 0, right: 0, bottom: 0,
                  height: `${((96 / 350) * 100).toFixed(2)}%`,
                  background: t.fondo,
                }}
              />

              <p
                style={{
                  position: "absolute", left: margen, bottom: em(6),
                  fontSize: em(72), lineHeight: 0.9, fontWeight: 700, color: t.acento,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </p>
            </Tocable>

            <div style={{ paddingLeft: margen, paddingRight: margen, paddingTop: em(18) }}>
              <Tocable
                que={{ que: "titulo", capitulo: i }}
                seleccion={seleccion}
                onTocar={onTocar}
                nombre={`Corregir el título del capítulo ${i + 1}`}
              >
                <p style={{ fontSize: em(25), lineHeight: 1.15, fontWeight: 700, color: t.tinta }}>
                  {c.titulo || "Sin título"}
                </p>
              </Tocable>
              <div style={{ width: em(48), height: em(3), background: t.acento, marginTop: em(14) }} />

              <div style={{ marginTop: em(20), paddingBottom: em(30) }}>
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
                    <Pedazo bloque={b} t={t} />
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
}: {
  bloque: { tipo: string; texto: string };
  t: ReturnType<typeof coloresDelEbook>;
}) {
  const texto = bloque.texto.trim();
  /* Un pedazo vacío no se dibuja: en el PDF tampoco, `soloLoQueEntra` lo saca.
     Y mientras se escribe uno nuevo, un renglón fantasma en la previa haría
     pensar que el ebook va a salir con un hueco. */
  if (!texto) return null;

  if (bloque.tipo === "subtitulo") {
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
        <p style={{ fontSize: em(13), lineHeight: 1.3, fontWeight: 700, color: t.tinta }}>
          {texto}
        </p>
      </div>
    );
  }

  if (bloque.tipo === "aviso") {
    return (
      <div
        style={{
          background: t.caja, borderRadius: em(9),
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
        <span style={{ fontSize: em(11.5), lineHeight: 1.55, color: t.tinta }}>•</span>
        <p style={{ fontSize: em(11.5), lineHeight: 1.55, color: t.tinta }}>{texto}</p>
      </div>
    );
  }

  /* El párrafo va justificado, igual que en el PDF: es lo que más cambia cómo
     se ve una hoja de texto corrido. */
  return (
    <p
      style={{
        fontSize: em(11.5), lineHeight: 1.6, textAlign: "justify",
        color: t.tinta, marginBottom: em(9),
      }}
    >
      {texto}
    </p>
  );
}
