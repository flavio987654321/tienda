"use client";

import { coloresDelEbook, type ColoresDeTapa, type ModoDelEbook } from "@/lib/ebook-colores";
import type { Receta } from "@/lib/ebook-ia";
import type { FotoDelCapitulo, Seleccion } from "@/lib/ebook-texto";
import { MarcoDeLaHoja, Tocable, HuecoDeFoto, em, anchoEnLaHoja } from "./previaPiezas";
import { HOJA_DE_RECETA, type Molde } from "@/lib/ebook-estilos";

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
 * ── ⚠️ Lo que sí muestra y lo que NO ───────────────────────────────────────
 *
 * Desde el 09/09/26 la hoja de la receta lee el molde, así que acá se dibuja
 * **lo que el molde decide**: dónde cae la foto —banda ancha, cuadrada al lado
 * del título, o a sangre con el título encima— y dónde caen rinde, tiempo y
 * cocción. Eso no depende de lo que escribió el modelo, así que se puede
 * mostrar sin mentir.
 *
 * Lo que NO se dibuja es lo que decide la MEDICIÓN: el archivo mide los
 * ingredientes, los pasos y el tip para elegir entre tres densidades, y cuando
 * la banda no entra la cambia por un cuadrado (ver `hojaDeReceta`). Repetir esa
 * cuenta acá pediría medir renglón por renglón con las tipografías del PDF, y
 * **fingirla sería peor que no mostrarla**: alguien acortaría una receta para
 * un acomodo que después no es el que sale. Así que la previa dibuja siempre la
 * versión holgada del molde elegido.
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
  molde,
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
  /** El molde del estilo elegido: la hoja, el margen, la tapa y el acomodo de
      cada receta salen de él. */
  molde: Molde;
  seleccion?: Seleccion | null;
  onTocar?: (s: Seleccion) => void;
}) {
  const t = coloresDelEbook(paleta, modo);

  /* Las mismas medidas que dibuja el archivo. Ver `HOJA_DE_RECETA`. */
  const R = HOJA_DE_RECETA;
  const acomodo = molde.receta;
  const margen = anchoEnLaHoja(molde.margen);

  /* Cuánto de la hoja se lleva la columna de los ingredientes, en porcentaje
     del ancho útil: el archivo la tiene en 168 puntos y acá tiene que caer en
     el mismo lugar, no en un 38 % puesto a ojo. */
  const util = 595.28 - molde.margen * 2;
  const anchoIngredientes = `${((R.ingredientes / util) * 100).toFixed(2)}%`;
  /* Lo mismo con el cuadrado de `compacto`: va adentro de los márgenes, así que
     se mide contra el ancho útil y no contra la hoja entera. */
  const anchoCuadrada = `${((R.ladoMax / util) * 100).toFixed(2)}%`;


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
      {recetas.map((r, i) => {
        const laFoto = (
          <Tocable
            que={{ que: "foto", capitulo: i }}
            seleccion={seleccion}
            onTocar={onTocar}
            nombre={`Cambiar la foto de la receta ${i + 1}`}
          >
            <HuecoDeFoto
              foto={fotos[i]}
              respaldo={r.titulo}
              t={t}
              proporcion={acomodo === "sangre" ? `595.28 / ${R.sangreMax}` : `595.28 / ${R.bandaMax}`}
            />
          </Tocable>
        );

        const elNumero = (claro: boolean) => (
          <p style={{
            fontSize: em(8.5), letterSpacing: "0.1em", fontWeight: 700,
            color: claro ? t.sobreAcento : t.acento,
          }}>
            RECETA {String(i + 1).padStart(2, "0")}
          </p>
        );

        /* ⚠️ Los colores viajan como parámetro y no como un "claro sí o no":
           encima de una FOTO el título va blanco puro (el velo puede tener
           cualquier color abajo), y encima de la franja de acento va el color
           que la paleta declaró para ir sobre su acento. Son dos cosas
           distintas y con un booleano terminaban siendo la misma. */
        const elTitulo = (tinta: string, suave: string) => (
          <Tocable
            que={{ que: "titulo", capitulo: i }}
            seleccion={seleccion}
            onTocar={onTocar}
            nombre={`Corregir la receta ${i + 1}`}
          >
            <p style={{
              marginTop: em(6), fontSize: em(22), lineHeight: 1.15, fontWeight: 700,
              color: tinta,
            }}>
              {r.titulo || "Sin título"}
            </p>
            {r.descripcion && (
              <p style={{
                marginTop: em(6), fontSize: em(11), lineHeight: 1.5, fontStyle: "italic",
                color: suave,
              }}>
                {r.descripcion}
              </p>
            )}
          </Tocable>
        );

        return (
          <div key={i} style={{ marginTop: i === 0 ? 0 : em(26) }}>
            {/* ── Lo de arriba: la foto y el título, como los pone el molde ── */}
            {acomodo === "sangre" ? (
              /* La foto tapa lo alto de la hoja y el título va encima. El velo
                 no es adorno: el título va en blanco sobre una foto que puede
                 salir de cualquier color. Igual que en el archivo. */
              <div style={{ position: "relative" }}>
                {laFoto}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to bottom, rgba(0,0,0,0) 22%, rgba(0,0,0,0.6) 62%, rgba(0,0,0,0.88) 100%)",
                    /* ⚠️ Sin esto el velo se come los clics y la foto de abajo
                       deja de poder tocarse para cambiarla. */
                    pointerEvents: "none",
                  }}
                />
                <div style={{
                  position: "absolute", left: margen, right: margen, bottom: em(22),
                }}>
                  <p style={{ fontSize: em(8.5), letterSpacing: "0.1em", fontWeight: 700, color: "#ffffff" }}>
                    RECETA {String(i + 1).padStart(2, "0")}
                  </p>
                  {elTitulo("#ffffff", "rgba(255,255,255,0.86)")}
                </div>
              </div>
            ) : acomodo === "ficha" ? (
              /* La foto cuadrada al lado del título, y el título adentro de una
                 franja de acento que arranca en el BORDE de la hoja y se corta
                 antes de la foto. Sin la franja esta cabeza es la misma que la
                 de `libro` —el archivo también cambia la banda por el cuadrado
                 cuando la receta es larga— y elegir uno u otro no cambiaría
                 nada de lo que se ve. Ver `hojaDeReceta`.

                 ⚠️ El relleno de la izquierda va adentro de la franja y no en
                 el contenedor: si fuera del contenedor, la franja arrancaría en
                 el margen y no en el borde, que es justo lo que la hace ver de
                 diario. */
              <div style={{
                display: "flex", gap: em(16), alignItems: "flex-start",
                paddingRight: margen, paddingTop: em(18),
              }}>
                <div style={{
                  flex: 1, minWidth: 0, background: t.acento,
                  paddingLeft: margen, paddingRight: em(16),
                  paddingTop: em(12), paddingBottom: em(14),
                }}>
                  {elNumero(true)}
                  {elTitulo(t.sobreAcento, t.sobreAcento)}
                </div>
                <div style={{ width: anchoCuadrada, flexShrink: 0 }}>
                  <Tocable
                    que={{ que: "foto", capitulo: i }}
                    seleccion={seleccion}
                    onTocar={onTocar}
                    nombre={`Cambiar la foto de la receta ${i + 1}`}
                  >
                    <HuecoDeFoto foto={fotos[i]} respaldo={r.titulo} t={t} proporcion="1 / 1" />
                  </Tocable>
                </div>
              </div>
            ) : (
              laFoto
            )}

            <div style={{
              paddingLeft: margen, paddingRight: margen,
              paddingTop: acomodo === "ficha" ? em(14) : em(18),
              paddingBottom: em(30),
            }}>
              {/* En los dos acomodos de arriba el título ya se dibujó. */}
              {acomodo !== "sangre" && acomodo !== "ficha" && (
                <>
                  {elNumero(false)}
                  {elTitulo(t.tinta, t.suave)}
                </>
              )}

              {/* Las tres fichas en fila, salvo que el molde las mande a la
                  franja del costado: ahí van adentro de la columna de los
                  ingredientes, arriba de la lista. */}
              {acomodo !== "franja" && <Fichas r={r} apiladas={false} t={t} molde={molde} />}

              {/* ── Las dos columnas ───────────────────────────────────────
                  Ingredientes a la izquierda y pasos a la derecha, como en el
                  archivo: los ingredientes se leen de arriba abajo mientras se
                  juntan las cosas, y los pasos después. */}
              <div style={{ display: "flex", gap: em(R.calle), marginTop: em(18), alignItems: "flex-start" }}>
                <div style={{ width: anchoIngredientes, flexShrink: 0 }}>
                  {acomodo === "franja" && <Fichas r={r} apiladas t={t} molde={molde} />}

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
                    background: t.caja,
                    /* El recuadro del tip lo redondea el molde, como en el
                       archivo — ver `dibujarAviso`. */
                    borderRadius: em(molde.esquina),
                    borderLeft: `${em(3)} solid ${t.acento}`,
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
        );
      })}
    </MarcoDeLaHoja>
  );
}

/**
 * Las tres fichas: en fila arriba, o apiladas al costado.
 *
 * ⚠️ Vive afuera del componente de arriba y no adentro: un componente declarado
 * adentro de otro es un componente NUEVO en cada dibujado, así que React
 * desmonta y vuelve a montar lo que hay abajo en cada tecla que se toca en el
 * editor. Acá no se nota porque no guarda nada, pero es la clase de cosa que se
 * copia al de al lado y ahí sí pierde el foco de un campo.
 */
function Fichas({
  r, apiladas, t, molde,
}: {
  r: Receta;
  apiladas: boolean;
  t: ReturnType<typeof coloresDelEbook>;
  molde: Molde;
}) {
  const puestas = ([["RINDE", r.rinde], ["TIEMPO", r.tiempo], ["COCCIÓN", r.coccion]] as const)
    .filter(([, valor]) => !!valor);
  /* Una ficha vacía que dice "TIEMPO" y nada abajo se lee como un dato que
     falta. En el archivo pasa lo mismo — ver `fichasDe`. */
  if (puestas.length === 0) return null;

  return (
    <div
      style={apiladas
        ? {
          background: t.caja, borderRadius: em(molde.esquina),
          borderLeft: `${em(3)} solid ${t.acento}`,
          padding: `${em(12)} ${em(12)}`, marginBottom: em(18),
        }
        : { display: "flex", gap: em(10), marginTop: em(14), flexWrap: "wrap" }}
    >
      {puestas.map(([nombre, valor], i) => (
        <div
          key={nombre}
          style={apiladas
            ? { marginTop: i === 0 ? 0 : em(12) }
            : {
              background: t.caja,
              /* ⚠️ El redondeo lo decide el molde, igual que en el archivo: el 8
                 es el que `libro` tenía escrito adentro desde antes de los
                 moldes y no se toca; los otros leen su estilo, y por eso
                 `compacto` y `cartel` salen con las esquinas rectas. */
              borderRadius: em(molde.receta === "banda" ? 6 : molde.esquina),
              padding: `${em(7)} ${em(12)}`, minWidth: em(84),
            }}
        >
          <p style={{ fontSize: em(7), letterSpacing: "0.1em", fontWeight: 700, color: t.acento }}>
            {nombre}
          </p>
          <p style={{ marginTop: em(2), fontSize: em(10), fontWeight: 700, color: t.tinta, lineHeight: 1.35 }}>
            {valor}
          </p>
        </div>
      ))}
    </div>
  );
}
