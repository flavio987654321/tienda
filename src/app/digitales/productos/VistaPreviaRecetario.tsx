"use client";

import { coloresDelEbook, type ColoresDeTapa, type ModoDelEbook } from "@/lib/ebook-colores";
import type { Receta } from "@/lib/ebook-ia";
import type { FotoDelCapitulo, Seleccion } from "@/lib/ebook-texto";
import { MarcoDeLaHoja, Tocable, HuecoDeFoto, em, MARGEN } from "./previaPiezas";

/**
 * Cómo va a quedar el recetario, al lado de lo que se está corrigiendo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES LA MISMA HOJA QUE EL EBOOK DE TEXTO, CON OTRA COSA ADENTRO
 * ══════════════════════════════════════════════════════════════════════════
 *
 * El marco, el zoom, la tapa, los colores y la forma de tocar algo para ir a
 * corregirlo son exactamente los mismos —viven en `previaPiezas`— porque la
 * hoja es la misma A4 con el mismo margen. Lo único distinto es lo que va
 * adentro: **una receta no es prosa, son campos.**
 *
 * ── ⚠️ Lo que esta previa NO puede mostrar ─────────────────────────────────
 *
 * El PDF acomoda cada receta a su hoja: mide los ingredientes, los pasos, las
 * fichas y el tip, y con eso elige entre tres densidades y decide si la foto va
 * de banda ancha o cuadrada al lado del título (ver `hojaDeReceta`). Eso no se
 * puede repetir acá sin medir renglón por renglón, y **fingirlo sería peor que
 * no mostrarlo**: alguien acortaría una receta para un acomodo que después no
 * es el que sale.
 *
 * Así que se dibuja siempre la versión holgada —foto de banda arriba—, que es
 * la que sale en la mayoría, y lo que se juzga acá es lo que de verdad se está
 * corrigiendo: qué dice cada campo y si algo quedó largo de más.
 */
export default function VistaPreviaRecetario({
  titulo,
  promesa,
  autor,
  recetas,
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
  /** Todas seguidas, en el orden en que van a salir. Una receta es una hoja. */
  recetas: Receta[];
  /** La foto de cada receta, en el mismo orden: con qué se busca y cuál se eligió. */
  fotos: FotoDelCapitulo[];
  tapa: FotoDelCapitulo;
  paleta: ColoresDeTapa;
  modo: ModoDelEbook;
  seleccion?: Seleccion | null;
  onTocar?: (s: Seleccion) => void;
}) {
  const t = coloresDelEbook(paleta, modo);

  return (
    <MarcoDeLaHoja
      t={t}
      titulo={titulo}
      promesa={promesa}
      autor={autor}
      tapa={tapa}
      seleccion={seleccion}
      onTocar={onTocar}
    >
      {recetas.map((r, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 0 : em(26) }}>
          {/* La foto de banda, arriba de todo. En el archivo mide hasta 168
              puntos de una hoja de 841,89. Ver `ALTO_BANDA_MAX`. */}
          <Tocable
            que={{ que: "foto", capitulo: i }}
            seleccion={seleccion}
            onTocar={onTocar}
            nombre={`Cambiar la foto de la receta ${i + 1}`}
          >
            <HuecoDeFoto foto={fotos[i]} respaldo={r.titulo} t={t} proporcion="595.28 / 168" />
          </Tocable>

          <div style={{ paddingLeft: MARGEN, paddingRight: MARGEN, paddingTop: em(18), paddingBottom: em(30) }}>
            {/* El número de receta, en versalita arriba del título: es lo que
                el archivo pone en el encabezado de la hoja. */}
            <p style={{ fontSize: em(8.5), letterSpacing: "0.1em", fontWeight: 700, color: t.acento }}>
              RECETA {String(i + 1).padStart(2, "0")}
            </p>

            <Tocable
              que={{ que: "titulo", capitulo: i }}
              seleccion={seleccion}
              onTocar={onTocar}
              nombre={`Corregir la receta ${i + 1}`}
            >
              <p style={{ marginTop: em(6), fontSize: em(22), lineHeight: 1.15, fontWeight: 700, color: t.tinta }}>
                {r.titulo || "Sin título"}
              </p>
              {r.descripcion && (
                <p style={{ marginTop: em(6), fontSize: em(11), lineHeight: 1.5, fontStyle: "italic", color: t.suave }}>
                  {r.descripcion}
                </p>
              )}
            </Tocable>

            {/* ── Las tres fichas ────────────────────────────────────────
                Sólo las que tienen algo: una ficha vacía que dice "TIEMPO" y
                nada abajo se lee como un dato que falta. En el archivo pasa lo
                mismo — ver `tieneFichas`. */}
            {(r.rinde || r.tiempo || r.coccion) && (
              <div style={{ display: "flex", gap: em(10), marginTop: em(14), flexWrap: "wrap" }}>
                {([["RINDE", r.rinde], ["TIEMPO", r.tiempo], ["COCCIÓN", r.coccion]] as const)
                  .filter(([, valor]) => !!valor)
                  .map(([nombre, valor]) => (
                    <div
                      key={nombre}
                      style={{
                        background: t.caja, borderRadius: em(6),
                        padding: `${em(7)} ${em(12)}`, minWidth: em(84),
                      }}
                    >
                      <p style={{ fontSize: em(7), letterSpacing: "0.1em", fontWeight: 700, color: t.acento }}>
                        {nombre}
                      </p>
                      <p style={{ marginTop: em(2), fontSize: em(10), fontWeight: 700, color: t.tinta }}>
                        {valor}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {/* ── Las dos columnas ───────────────────────────────────────
                Ingredientes a la izquierda y pasos a la derecha, como en el
                archivo: los ingredientes se leen de arriba abajo mientras se
                juntan las cosas, y los pasos después. */}
            <div style={{ display: "flex", gap: em(26), marginTop: em(18), alignItems: "flex-start" }}>
              <div style={{ width: "38%", flexShrink: 0 }}>
                <p style={{ fontSize: em(8.5), letterSpacing: "0.1em", fontWeight: 700, color: t.acento }}>
                  INGREDIENTES
                </p>
                <div style={{ width: em(30), height: em(2), background: t.acento, marginTop: em(6) }} />
                <ul style={{ marginTop: em(10), listStyle: "none", padding: 0 }}>
                  {r.ingredientes.map((ing, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex", justifyContent: "space-between", gap: em(8),
                        fontSize: em(9.5), lineHeight: 1.5, color: t.tinta, marginBottom: em(4),
                      }}
                    >
                      <span>{ing.nombre}</span>
                      {/* La cantidad va a la derecha, alineada: es lo que hace
                          que la lista se pueda leer de un vistazo mientras se
                          junta todo. Puede faltar —"sal a gusto"—. */}
                      {ing.cantidad && (
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: t.suave }}>
                          {ing.cantidad}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: em(8.5), letterSpacing: "0.1em", fontWeight: 700, color: t.acento }}>
                  PREPARACIÓN
                </p>
                <div style={{ width: em(30), height: em(2), background: t.acento, marginTop: em(6) }} />
                <ol style={{ marginTop: em(10), listStyle: "none", padding: 0 }}>
                  {r.pasos.map((paso, j) => (
                    <li key={j} style={{ display: "flex", gap: em(9), marginBottom: em(9) }}>
                      <span
                        style={{
                          flexShrink: 0, fontSize: em(9), fontWeight: 700, color: t.acento,
                          lineHeight: 1.55, minWidth: em(14),
                        }}
                      >
                        {String(j + 1).padStart(2, "0")}
                      </span>
                      <span>
                        {paso.titulo && (
                          <span style={{ display: "block", fontSize: em(9.5), fontWeight: 700, color: t.tinta }}>
                            {paso.titulo}
                          </span>
                        )}
                        <span style={{ display: "block", fontSize: em(9.5), lineHeight: 1.55, color: t.tinta }}>
                          {paso.texto}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* El consejo, abajo de todo y en su recuadro. */}
            {r.tip && (
              <div
                style={{
                  background: t.caja, borderRadius: em(9),
                  padding: `${em(14)} ${em(18)}`, marginTop: em(16),
                }}
              >
                <p style={{ fontSize: em(8), letterSpacing: "0.1em", fontWeight: 700, color: t.acento }}>
                  EL CONSEJO
                </p>
                <p style={{ marginTop: em(5), fontSize: em(9.5), lineHeight: 1.5, color: t.tinta }}>
                  {r.tip}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </MarcoDeLaHoja>
  );
}
