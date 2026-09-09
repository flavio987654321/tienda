"use client";

import { coloresDelEbook, type ColoresDeTapa, type ModoDelEbook } from "@/lib/ebook-colores";
import type { CapituloEscrito } from "@/lib/ebook-ia";

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

/** El cuerpo del texto en el PDF. Todas las demás medidas van en `em` sobre esto. */
const CUERPO_PT = 11.5;
/** Una hoja A4 de ancho, en puntos, y el margen del ebook. */
const HOJA_PT = 595.28;
const MARGEN_PT = 56;

/** De puntos del PDF a `em` de acá. */
const em = (pt: number) => `${(pt / CUERPO_PT).toFixed(3)}em`;

export default function VistaPreviaEbook({
  titulo,
  promesa,
  autor,
  capitulos,
  paleta,
  modo,
}: {
  titulo: string;
  promesa: string;
  autor: string;
  capitulos: CapituloEscrito[];
  paleta: ColoresDeTapa;
  modo: ModoDelEbook;
}) {
  const t = coloresDelEbook(paleta, modo);
  const margen = `${((MARGEN_PT / HOJA_PT) * 100).toFixed(2)}%`;

  return (
    <div className="pv-caja overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
      {/* El cuerpo atado al ancho de la hoja. La regla fija va primero: si el
          navegador no entiende `cqw`, se queda con ella y no con nada. */}
      <style>{`
        .pv-caja { font-size: 13px; }
        @supports (container-type: inline-size) {
          .pv-caja { container-type: inline-size; font-size: ${((CUERPO_PT / HOJA_PT) * 100).toFixed(3)}cqw; }
        }
        /* El texto del ebook va en serif, igual que el archivo: el PDF usa Lora
           para leer y Playfair para los títulos. Acá no se cargan esas dos
           —serían dos tipografías más para bajar, en una previa— pero la
           familia sí es la que corresponde: con la del panel, que es sin serif,
           la previa se veía como un formulario y no como un libro. */
        .pv-caja, .pv-caja * { font-family: Georgia, "Times New Roman", serif; }
      `}</style>

      <div style={{ background: t.fondo, color: t.tinta }}>
        {/* ── La tapa ──────────────────────────────────────────────────────
            Una hoja entera, con la proporción de una A4: es lo primero que ve
            quien compra, así que es lo primero que tiene que poder mirar quien
            vende. */}
        <div
          className="flex flex-col justify-between"
          style={{
            aspectRatio: "595.28 / 841.89",
            padding: margen,
            background: t.caja,
          }}
        >
          <div style={{ width: em(48), height: em(3.5), background: t.acento }} />

          <div>
            <p
              style={{
                fontSize: em(34), lineHeight: 1.12, fontWeight: 700, color: t.tinta,
              }}
            >
              {titulo || "Sin título"}
            </p>
            {promesa && (
              <p
                style={{
                  marginTop: em(14), fontSize: em(12.5), lineHeight: 1.45, color: t.suave,
                }}
              >
                {promesa}
              </p>
            )}
          </div>

          <p style={{ fontSize: em(10), letterSpacing: "0.08em", color: t.suave }}>
            {autor ? autor.toUpperCase() : ""}
          </p>
        </div>

        {/* ── Los capítulos ────────────────────────────────────────────────── */}
        {capitulos.map((c, i) => (
          <div key={i}>
            {/* La portadilla: la franja, el número grande y el título con su
                rayita. Es lo que hace que se lea como un libro. */}
            <div
              style={{
                background: t.caja,
                paddingLeft: margen, paddingRight: margen,
                paddingTop: em(28), paddingBottom: em(6),
                marginTop: i === 0 ? 0 : em(26),
              }}
            >
              <p style={{ fontSize: em(72), lineHeight: 0.9, fontWeight: 700, color: t.acento }}>
                {String(i + 1).padStart(2, "0")}
              </p>
            </div>

            <div style={{ paddingLeft: margen, paddingRight: margen, paddingTop: em(18) }}>
              <p style={{ fontSize: em(25), lineHeight: 1.15, fontWeight: 700, color: t.tinta }}>
                {c.titulo || "Sin título"}
              </p>
              <div style={{ width: em(48), height: em(3), background: t.acento, marginTop: em(14) }} />

              <div style={{ marginTop: em(20), paddingBottom: em(30) }}>
                {c.bloques.map((b, j) => (
                  <Pedazo key={j} bloque={b} t={t} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
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
