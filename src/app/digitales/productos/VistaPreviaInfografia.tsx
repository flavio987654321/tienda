"use client";

import { coloresDelEbook, type ColoresDeTapa, type ModoDelEbook } from "@/lib/ebook-colores";
import type { Lamina } from "@/lib/ebook-ia";
import type { FotoDelCapitulo, Seleccion } from "@/lib/ebook-texto";
import { MarcoDeLaHoja, Tocable, HuecoDeFoto, em, anchoEnLaHoja } from "./previaPiezas";
import { HOJA_DE_LAMINA, ANCHO_DE_HOJA, ALTO_DE_HOJA, type Molde } from "@/lib/ebook-estilos";

/**
 * Cómo va a quedar la infografía, al lado de lo que se está corrigiendo.
 *
 * El marco, la tapa, los colores y la forma de tocar algo para ir a corregirlo
 * son los mismos que en las otras dos previas —viven en `previaPiezas`—. Lo
 * que va adentro es una lámina: la foto grande, la idea, el texto y los datos,
 * acomodados como dice el molde. Ver `hojaDeLamina` en `ebook-pdf`.
 *
 * ⚠️ A diferencia de la receta, acá NO hay medición que la previa no pueda
 * repetir: la lámina no tiene nada elástico. Lo único que el archivo decide
 * mirando el texto es cuánto cede la foto en `banda` y `ficha`, y eso acá se
 * muestra con la foto en su máximo: la diferencia es de unos milímetros y no
 * cambia dónde va nada.
 */
export default function VistaPreviaInfografia({
  titulo,
  promesa,
  autor,
  laminas,
  fotos,
  tapa,
  paleta,
  modo,
  molde,
  seleccion = null,
  onTocar,
}: {
  titulo: string;
  promesa: string;
  autor: string;
  /** Todas seguidas, en el orden en que van a salir. Una lámina es una hoja. */
  laminas: Lamina[];
  fotos: FotoDelCapitulo[];
  tapa: FotoDelCapitulo;
  paleta: ColoresDeTapa;
  modo: ModoDelEbook;
  molde: Molde;
  seleccion?: Seleccion | null;
  onTocar?: (s: Seleccion) => void;
}) {
  const t = coloresDelEbook(paleta, modo);
  const L = HOJA_DE_LAMINA;
  /* `ficha` necesita la franja del costado; sin ella cae a `banda`, igual que
     en el archivo. */
  const acomodo = molde.lamina === "ficha" && molde.franja <= 0 ? "banda" : molde.lamina;
  const margen = anchoEnLaHoja(molde.margen);
  const total = laminas.length;

  /* Las proporciones de la foto, con las mismas fracciones que el archivo. */
  const altoUtil = ALTO_DE_HOJA - 34;
  const proporcionBanda = `${ANCHO_DE_HOJA} / ${(altoUtil * L.bandaMax).toFixed(0)}`;
  const proporcionFicha = `${ANCHO_DE_HOJA} / ${(altoUtil * L.fichaMax).toFixed(0)}`;
  const anchoLado = `${(L.ladoAncho * 100).toFixed(1)}%`;
  const anchoFranja = anchoEnLaHoja(molde.franja);

  return (
    <MarcoDeLaHoja
      molde={molde}
      t={t}
      titulo={titulo}
      promesa={promesa}
      autor={autor}
      tapa={tapa}
      seleccion={seleccion}
      onTocar={onTocar}
    >
      {laminas.map((l, i) => {
        const numero = String(i + 1).padStart(2, "0");

        const laFoto = (proporcion: string) => (
          <Tocable
            que={{ que: "foto", capitulo: i }}
            seleccion={seleccion}
            onTocar={onTocar}
            nombre={`Cambiar la foto de la lámina ${i + 1}`}
          >
            <HuecoDeFoto foto={fotos[i]} respaldo={l.titulo} t={t} proporcion={proporcion} />
          </Tocable>
        );

        /* El bloque de texto: rótulo, idea, raya, texto y datos. Los colores
           viajan como parámetro por lo mismo que en la receta: sobre la foto va
           blanco puro, sobre el papel va la tinta. */
        const elBloque = (
          rotulo: string,
          colores: { rotulo: string; titulo: string; texto: string; acento: string },
          angosto: boolean,
        ) => (
          <>
            <p style={{ fontSize: em(8), letterSpacing: "0.12em", fontWeight: 700, color: colores.rotulo }}>
              {rotulo}
            </p>
            <Tocable
              que={{ que: "titulo", capitulo: i }}
              seleccion={seleccion}
              onTocar={onTocar}
              nombre={`Corregir la lámina ${i + 1}`}
            >
              <p style={{
                marginTop: em(10), fontSize: em(angosto ? 22 : 27), lineHeight: 1.12, fontWeight: 700,
                color: colores.titulo,
              }}>
                {l.titulo || "Sin título"}
              </p>
            </Tocable>
            <div style={{ width: em(44), height: em(3), background: colores.acento, marginTop: em(12) }} />
            <Tocable
              que={{ que: "bloque", capitulo: i, bloque: 0 }}
              seleccion={seleccion}
              onTocar={onTocar}
              nombre={`Corregir el texto de la lámina ${i + 1}`}
            >
              <p style={{ marginTop: em(16), fontSize: em(12.5), lineHeight: 1.6, color: colores.texto }}>
                {l.texto}
              </p>
            </Tocable>
            {l.puntos.length > 0 && (
              <ul style={{ marginTop: em(16), listStyle: "none", padding: 0 }}>
                {l.puntos.map((p, k) => (
                  <li key={k} style={{ display: "flex", gap: em(10), alignItems: "flex-start", marginBottom: em(7) }}>
                    <span style={{
                      flexShrink: 0, width: em(6), height: em(6), borderRadius: "50%",
                      background: colores.acento, marginTop: em(5),
                    }} />
                    <span style={{ fontSize: em(10.5), lineHeight: 1.45, fontWeight: 700, color: colores.texto }}>
                      {p}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        );

        const enElPapel = { rotulo: t.acento, titulo: t.tinta, texto: t.tinta, acento: t.acento };
        const rotulo = `LÁMINA ${numero}  ·  ${total}`;

        /* ── Foto a la izquierda, texto a la derecha ────────────────────── */
        if (acomodo === "lado") {
          return (
            /* ⚠️ La foto lleva la proporción de la hoja entera, no `height:
               100%`: adentro del botón tocable ese porcentaje no tiene contra
               qué medirse y la foto quedaba como un cuadradito arriba. Se vio
               dibujando la previa, no leyendo el código. */
            <div key={i} style={{ display: "flex", alignItems: "stretch", marginTop: i === 0 ? 0 : em(26) }}>
              <div style={{ width: anchoLado, flexShrink: 0 }}>
                {laFoto(`${(ANCHO_DE_HOJA * L.ladoAncho).toFixed(0)} / ${altoUtil.toFixed(0)}`)}
              </div>
              <div style={{
                flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center",
                paddingLeft: em(34), paddingRight: margen, paddingTop: em(40), paddingBottom: em(40),
              }}>
                <div>{elBloque(rotulo, enElPapel, true)}</div>
              </div>
            </div>
          );
        }

        /* ── La foto tapa la hoja y el texto va encima, abajo ───────────── */
        if (acomodo === "sangre") {
          const desde = `${(L.sangreVeloDesde * 100).toFixed(0)}%`;
          return (
            <div key={i} style={{ position: "relative", marginTop: i === 0 ? 0 : em(26) }}>
              {laFoto(`${ANCHO_DE_HOJA} / ${altoUtil.toFixed(0)}`)}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute", inset: 0,
                  background: `linear-gradient(to bottom, rgba(0,0,0,0) ${desde}, rgba(0,0,0,0.78) 58%, rgba(0,0,0,0.95) 100%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "absolute", left: margen, right: margen, bottom: em(44) }}>
                {elBloque(
                  rotulo,
                  { rotulo: "rgba(255,255,255,0.86)", titulo: "#ffffff", texto: "rgba(255,255,255,0.9)", acento: t.acento },
                  false,
                )}
              </div>
            </div>
          );
        }

        /* ── El número en la franja, la foto baja y el texto en la columna ── */
        if (acomodo === "ficha") {
          return (
            <div key={i} style={{ marginTop: i === 0 ? 0 : em(26) }}>
              {laFoto(proporcionFicha)}
              <div style={{ display: "flex", gap: em(molde.calle), paddingLeft: margen, paddingRight: margen, paddingTop: em(36), paddingBottom: em(40) }}>
                <div style={{ width: anchoFranja, flexShrink: 0 }}>
                  <p style={{ fontSize: em(60), lineHeight: 1, fontWeight: 700, color: t.acento, marginTop: em(14) }}>
                    {numero}
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {elBloque(`DE ${total} LÁMINAS`, enElPapel, true)}
                </div>
              </div>
            </div>
          );
        }

        /* ── La foto arriba y todo lo demás abajo, en el papel ───────────── */
        return (
          <div key={i} style={{ marginTop: i === 0 ? 0 : em(26) }}>
            {laFoto(proporcionBanda)}
            <div style={{ paddingLeft: margen, paddingRight: margen, paddingTop: em(40), paddingBottom: em(40) }}>
              {elBloque(rotulo, enElPapel, false)}
            </div>
          </div>
        );
      })}
    </MarcoDeLaHoja>
  );
}
