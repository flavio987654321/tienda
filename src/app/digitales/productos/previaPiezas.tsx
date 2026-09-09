"use client";

import type { coloresDelEbook } from "@/lib/ebook-colores";
import { mismoPedazo, type FotoDelCapitulo, type Seleccion } from "@/lib/ebook-texto";

/**
 * Las piezas que comparten las dos vistas previas.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTÁN ACÁ Y NO ADENTRO DE UNA DE LAS DOS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un ebook de texto y un recetario se dibujan distinto adentro —párrafos contra
 * fichas, ingredientes y pasos numerados— pero **la hoja es la misma**: la misma
 * A4, el mismo margen, la misma tipografía con serifas, los mismos colores, la
 * misma tapa y la misma forma de tocar algo para ir a corregirlo.
 *
 * Copiado en los dos archivos, eso se separa solo: se arregla el zoom en uno y
 * el otro se queda con el zoom viejo. Y ya pasó una vez con este mismo código
 * —ver el comentario de `MarcoDeLaHoja`—, así que la copia no es hipotética.
 */

/** El cuerpo del texto en el PDF. Todas las demás medidas van en `em` sobre esto. */
export const CUERPO_PT = 11.5;
/** Una hoja A4, en puntos, y el margen del ebook. */
export const HOJA_PT = 595.28;
export const ALTO_HOJA_PT = 841.89;
export const MARGEN_PT = 56;

/** De puntos del PDF a `em` de acá. */
export const em = (pt: number) => `${(pt / CUERPO_PT).toFixed(3)}em`;

/** El margen de la hoja, en porcentaje de su ancho. */
export const MARGEN = `${((MARGEN_PT / HOJA_PT) * 100).toFixed(2)}%`;
/**
 * La hoja: el marco, sus estilos y la tapa. Adentro va lo que cambia.
 *
 * ⚠️ Lo dibujan las DOS vistas previas —la del ebook de texto y la del
 * recetario— y por eso vive acá. Lo que sigue abajo es el zoom, que ya se
 * rompió una vez y no se puede volver a romper en dos lugares distintos.
 */
export function MarcoDeLaHoja({
  t, titulo, promesa, autor, tapa, seleccion = null, onTocar, children,
}: {
  t: ReturnType<typeof coloresDelEbook>;
  titulo: string;
  promesa: string;
  autor: string;
  tapa: FotoDelCapitulo;
  seleccion?: Seleccion | null;
  onTocar?: (s: Seleccion) => void;
  children: React.ReactNode;
}) {
  const margen = MARGEN;

  return (
    /* ⚠️ DOS CAJAS, Y NO ES DECORACIÓN: la de afuera declara el contenedor y la
       de adentro es la que mide contra él. Estaban en una sola y la previa salía
       con un zoom enorme — `1cqw` adentro del PROPIO contenedor no puede
       medirse contra sí mismo (sería circular), así que el navegador lo mide
       contra el ancestro que haya, y si no hay ninguno, contra la ventana. En
       una pantalla de 1920 px eso daba una letra de 37 px donde tenían que ser
       9. La regla es: quien declara `container-type` nunca puede usar `cqw`. */
    <div className="pv-marco overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
      {/* El cuerpo atado al ancho de la hoja. La regla fija va primero: si el
          navegador no entiende `cqw`, se queda con ella y no con nada. */}
      <style>{`
        .pv-hoja { font-size: 13px; }
        @supports (container-type: inline-size) {
          .pv-marco { container-type: inline-size; }
          .pv-hoja { font-size: ${((CUERPO_PT / HOJA_PT) * 100).toFixed(3)}cqw; }
        }
        /* El texto del ebook va en serif, igual que el archivo: el PDF usa Lora
           para leer y Playfair para los títulos. Acá no se cargan esas dos
           —serían dos tipografías más para bajar, en una previa— pero la
           familia sí es la que corresponde: con la del panel, que es sin serif,
           la previa se veía como un formulario y no como un libro. */
        .pv-hoja, .pv-hoja * { font-family: Georgia, "Times New Roman", serif; }

        /* ⚠️ Lo que se puede tocar se tiene que NOTAR que se puede tocar, y
           sin ensuciar la hoja: el punto de esta columna es ver cómo queda el
           archivo. Así que en reposo no se dibuja nada —la hoja se ve limpia—
           y el recuadro aparece al pasar por encima. El marcado sí queda
           dibujado, porque es la respuesta a lo que se acaba de tocar.

           ⚠️ Y ojo con las comillas invertidas ACÁ ADENTRO: esto es un
           template literal, así que una sola parte el bloque al medio y el
           error aparece cincuenta renglones más abajo. Ya pasó.

           Se usa outline y no border: un borde correría el texto un píxel cada vez
           que el mouse pasa por arriba, y la hoja entera temblaría. */
        .pv-tocable {
          display: block; width: 100%; text-align: inherit;
          font: inherit; color: inherit; background: none; border: 0; padding: 0;
          cursor: pointer; outline-offset: -1px;
        }
        .pv-tocable:hover { outline: 1px dashed ${t.acento}; }
        .pv-tocable:focus-visible { outline: 2px solid ${t.acento}; }
        .pv-marcado, .pv-marcado:hover { outline: 2px solid ${t.acento}; }
      `}</style>

      <div className="pv-hoja" style={{ background: t.fondo, color: t.tinta }}>
        {/* ── La tapa ──────────────────────────────────────────────────────
            Una hoja entera, con la proporción de una A4: es lo primero que ve
            quien compra, así que es lo primero que tiene que poder mirar quien
            vende. */}
        <div
          className="flex flex-col"
          style={{ aspectRatio: "595.28 / 841.89", background: t.fondo }}
        >
          {/* La foto se lleva el 52 % de arriba, igual que en el archivo: ver
              `tapa` en `ebook-pdf`. Con el tema oscuro va a sangre, tapando la
              hoja entera; acá se dibuja el corte del tema claro, que es el que
              usa casi todo el mundo. */}
          {/* La foto de la tapa se toca para cambiarla. El texto de al lado no:
              el título y la promesa no se editan en esta pantalla —salen del
              temario— así que un recuadro ahí prometería algo que no pasa. */}
          <Tocable
            que={{ que: "tapa" }}
            seleccion={seleccion}
            onTocar={onTocar}
            nombre="Cambiar la foto de la tapa"
          >
            <HuecoDeFoto foto={tapa} respaldo={titulo} t={t} alto="52%" />
          </Tocable>

          <div
            className="flex flex-1 flex-col justify-between"
            style={{ padding: margen }}
          >
            <div>
              <div style={{ width: em(48), height: em(3.5), background: t.acento }} />
              <p
                style={{
                  marginTop: em(18), fontSize: em(34), lineHeight: 1.12,
                  fontWeight: 700, color: t.tinta,
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
        </div>

        {children}
      </div>
    </div>
  );
}
/**
 * Un pedazo de la hoja que se puede tocar para ir a corregirlo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ES UN BOTÓN DE VERDAD, Y NO UN `div` CON `onClick`
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Porque se llega con el tabulador, se aprieta con la barra espaciadora y un
 * lector de pantalla lo anuncia. Un `div` que reacciona al clic no hace ninguna
 * de las tres, y acá adentro está la única forma de encontrar rápido el párrafo
 * que se quiere corregir.
 *
 * Por eso lleva `nombre`: sin él, el lector de pantalla anuncia el texto del
 * párrafo entero como si fuera el nombre del botón. Con él dice qué hace.
 *
 * ── Y si nadie escucha, no es un botón ────────────────────────────────────
 *
 * Sin `onTocar` devuelve un `div` pelado. La previa se usa en un solo lugar hoy,
 * pero una hoja llena de botones que no hacen nada es peor que una hoja.
 */
export function Tocable({
  que, seleccion, onTocar, nombre, estilo, children,
}: {
  que: Seleccion;
  seleccion: Seleccion | null;
  onTocar?: (s: Seleccion) => void;
  nombre: string;
  estilo?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (!onTocar) return <div style={estilo}>{children}</div>;
  return (
    <button
      type="button"
      onClick={() => onTocar(que)}
      aria-label={nombre}
      title={nombre}
      className={`pv-tocable${mismoPedazo(seleccion, que) ? " pv-marcado" : ""}`}
      style={estilo}
    >
      {children}
    </button>
  );
}

/**
 * Dónde va una foto, y con qué se busca.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ES UN HUECO A PROPÓSITO, NO UNA FOTO SIN CARGAR
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Las fotos las busca el ARMADO en el banco de imágenes, con la frase que se ve
 * acá adentro, y las trae recién cuando hace el archivo. Traerlas también acá
 * sería pedirle al banco una foto por capítulo **cada vez que alguien abre el
 * editor** —y varias veces, porque la frase se puede cambiar—: un montón de
 * pedidos para adornar una previa.
 *
 * Y mostrar el hueco con la frase adentro dice algo que la foto no diría: que
 * **la foto se elige con esas palabras**, y que esas palabras se cambian en el
 * temario. Alguien que ve una foto que no le gusta y no sabe de dónde salió, no
 * puede hacer nada; leyendo "manos amasando harina" sabe exactamente qué tocar.
 */
export function HuecoDeFoto({
  foto,
  respaldo,
  t,
  alto,
  proporcion,
}: {
  foto: FotoDelCapitulo | undefined;
  /** Con qué se busca si no hay frase: el título del capítulo, o el del ebook. */
  respaldo: string;
  t: ReturnType<typeof coloresDelEbook>;
  alto?: string;
  proporcion?: string;
}) {
  const caja = {
    height: alto,
    aspectRatio: proporcion,
    background: t.caja,
  };

  /* ⚠️ Elegida, se muestra DE VERDAD. Es la mitad de para qué sirve poder
     elegirla: apretar una miniatura y ver la tapa cambiar en el momento, en vez
     de armar el PDF entero para enterarse. */
  if (foto?.elegida) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={foto.elegida.url}
        alt=""
        style={{ ...caja, width: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }

  const busca = foto?.frase || respaldo;

  return (
    <div
      className="flex items-center justify-center"
      style={{ ...caja, padding: `${em(14)} ${em(28)}` }}
    >
      <p
        style={{
          fontSize: em(9), lineHeight: 1.5, textAlign: "center",
          letterSpacing: "0.06em", color: t.suave,
        }}
      >
        <span style={{ fontWeight: 700 }}>FOTO</span>
        {busca ? ` · se busca “${busca}”` : ""}
      </p>
    </div>
  );
}
