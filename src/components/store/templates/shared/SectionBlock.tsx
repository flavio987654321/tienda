"use client";
import { useMemo, useState } from "react";
import { useEditContext } from "@/contexts/EditContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { CAPAS } from "@/lib/capas-tienda";
import { ChapitaBloque, LINEA_EDITOR, HALO_EDITOR } from "@/components/store/templates/shared/ChapitaBloque";

export function SectionBlock({
  id,
  label,
  isPreview = false,
  defaultOrder,
  avisoAlOcultar,
  children,
}: {
  id: string;
  label: string;
  isPreview?: boolean;
  /**
   * Qué se APAGA además de la sección, para los bloques donde esconder el
   * contenido apaga también una función.
   *
   * No lleva ninguno por defecto, y es a propósito: ocultar es reversible, el
   * bloque se queda a la vista en el editor con el cartel de "bloque oculto" y el
   * botón se pone rojo. Preguntar "¿estás seguro?" en cada uno de los ocho
   * bloques de cada uno de los diez templates sería ruido, y el ruido se aprende
   * a ignorar — el día que el aviso importe, ya nadie lo lee.
   *
   * El de reseñas sí lo necesita: el botón para dejar una opinión vive ADENTRO
   * del bloque, así que ocultarlo no esconde contenido, corta la entrada de
   * reseñas nuevas. Eso no se deduce mirando la pantalla.
   */
  avisoAlOcultar?: string;
  /** Lista fija de ids del template, en su orden original de JSX. Misma
   *  referencia para todos los SectionBlock de un mismo template — se usa
   *  para calcular la posición CSS `order` de este bloque y la de sus
   *  hermanos, sin tener que mover el JSX de lugar en el archivo fuente. */
  defaultOrder: string[];
  children: React.ReactNode;
}) {
  const { editMode, hiddenSections, toggleHiddenSection, sectionOrder, moveSection } = useEditContext();
  /** Sólo para resaltar ESTE bloque cuando el mouse está encima, en edición. */
  const [encima, setEncima] = useState(false);
  const config = useStoreConfig();
  const isHidden = (config?.hiddenSections ?? hiddenSections).includes(id);

  const effectiveOrder = useMemo(() => {
    const persisted = config?.sectionOrder ?? sectionOrder;
    return [...persisted.filter(i => defaultOrder.includes(i)), ...defaultOrder.filter(i => !persisted.includes(i))];
  }, [config?.sectionOrder, sectionOrder, defaultOrder]);
  const myIndex = effectiveOrder.indexOf(id);
  const cssOrder = myIndex === -1 ? defaultOrder.indexOf(id) : myIndex;
  const isFirst = myIndex <= 0;
  const isLast = myIndex === -1 || myIndex === effectiveOrder.length - 1;

  // Real store (not preview, not editor): ocultar completamente
  if (!editMode && !isPreview && isHidden) return null;

  // Sin modo edición: renderizar normal, pero respetando el orden guardado
  if (!editMode) return <div style={{ order: cssOrder }}>{children}</div>;

  /* ── Modo edición: el bloque tiene que VERSE como un bloque ─────────────────
   *
   * Antes no se veía nada: los controles —"Fondo", "Ocultar bloque", las
   * flechas— flotaban sueltos sobre la tienda, y no había forma de saber a qué
   * bloque pertenecía cada uno. Con dos secciones seguidas del mismo color de
   * fondo era peor todavía: se leían como una sola, así que el botón de arriba
   * parecía ser el de la de abajo. La dueña tocaba "Ocultar" y desaparecía otra
   * cosa.
   *
   * Se resuelve con tres cosas, las tres sólo en edición:
   *
   *   · UNA LÍNEA llena arriba, de lado a lado. Es la que DIVIDE: el filo de
   *     arriba de cada bloque es el filo de abajo del anterior, así que una línea
   *     por bloque alcanza para separarlos todos. Va siempre visible, porque la
   *     división tiene que leerse sin tener que ir a buscarla con el mouse — un
   *     contorno punteado y flojito no alcanzaba: se confundía con el diseño.
   *   · EL NOMBRE del bloque, apoyado sobre esa línea — el mismo `label` que ya
   *     usan los avisos ("Reseñas", "Franja de categorías"). Sin el nombre, la
   *     línea dice que ahí empieza otro bloque pero no cuál.
   *   · EL CONTORNO entero, que aparece al pasar el mouse. La línea dice dónde
   *     EMPIEZA; el contorno, hasta dónde LLEGA — que es lo que hace falta para
   *     entender de quién son los botones de abajo.
   *
   * Todo con `outline` y con capas absolutas, NUNCA con `border`: un borde ocupa
   * lugar y correría toda la tienda unos píxeles por bloque, o sea que el editor
   * mostraría un diseño que no es el que se publica. */
  /* El color de la línea NO puede ser uno solo, y ese es el punto.
   *
   * La dueña elige el fondo de cada sección: cualquier color que se elija para la
   * línea se le puede pegar justo. Una línea negra desaparece sobre el fondo negro
   * que ella acaba de poner, y la división se pierde justo mientras la está
   * editando — que es el único momento en que esta línea existe.
   *
   * Medir el fondo tampoco sirve del todo: la sección puede tener una FOTO, con
   * zonas claras y oscuras a la vez, así que no hay un color que gane en toda la
   * franja (es el mismo problema que resuelve `tintaSobreFoto`).
   *
   * Entonces no se elige: se dibujan las DOS. Una línea del violeta del editor con
   * un pelito blanco arriba y abajo. Sobre fondo claro se lee el violeta; sobre
   * negro o sobre una foto oscura, se leen los pelitos blancos. Nunca puede pasar
   * que los tres desaparezcan, porque no hay ningún color que sea a la vez igual
   * al violeta y al blanco. */
  const LINEA = LINEA_EDITOR;
  const HALO = HALO_EDITOR;
  return (
    <div
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      style={{
        position: "relative", order: cssOrder,
        outline: encima ? `1px dashed ${LINEA}` : "none",
        outlineOffset: -1,
        // El mismo truco para el contorno del hover: el `outline` sólo admite un
        // color, así que el blanco lo pone una sombra pegada al filo de adentro.
        boxShadow: encima ? "inset 0 0 0 2px rgba(255,255,255,0.45)" : "none",
      }}>
      {/* La línea divisoria. Es una capa absoluta y no un `borderTop` para no
          empujar el contenido ni un pixel. */}
      <div style={{
        position: "absolute", top: 1, left: 0, right: 0, height: 2,
        background: LINEA, boxShadow: HALO,
        zIndex: CAPAS.nav, pointerEvents: "none",
      }} />

      {/* El nombre del bloque, colgado de la línea. Adentro y no arriba de ella:
          arriba cae en el territorio del bloque ANTERIOR y se lee como si fuera
          el nombre de ése — un cartel en el lugar equivocado dice algo, y dice
          algo falso. Ver `ChapitaBloque`, que lo comparte con el botón "Fondo"
          de las superficies que no son bloques (el pie, contacto, catálogo). */}
      <ChapitaBloque nombre={label} />

      {/* El último bloque no tiene ninguno abajo que le ponga su línea de arriba,
          así que se cierra solo. Sin esto, el editor termina en un filo que no se
          ve y el pie parece parte del bloque anterior. */}
      {isLast && (
        <div style={{
          position: "absolute", bottom: 1, left: 0, right: 0, height: 2,
          background: LINEA, boxShadow: HALO,
          zIndex: CAPAS.nav, pointerEvents: "none",
        }} />
      )}

      {/* Contenido, dimmeado si oculto */}
      <div style={isHidden ? { opacity: 0.25, filter: "grayscale(1) brightness(0.5)", pointerEvents: "none", userSelect: "none" } : undefined}>
        {children}
      </div>

      {/* Overlay "TV apagada" cuando está oculto */}
      {isHidden && (
        <div style={{
          position: "absolute", inset: 0, zIndex: CAPAS.seccionOculta,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 8, pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)",
            borderRadius: 12, padding: "14px 24px", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>⊘</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Bloque oculto</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>No aparece en la tienda</span>
            {/* El aviso se repite acá, y no sólo antes de ocultar: al que abre el
                editor una semana después, el cartel le tiene que explicar por qué
                no le entran reseñas. Preguntarlo una vez y no decirlo más deja esa
                consecuencia sin ninguna huella en pantalla. */}
            {avisoAlOcultar && (
              <span style={{ color: "#fca5a5", fontSize: 11, maxWidth: 320, textAlign: "center", lineHeight: 1.5 }}>
                {avisoAlOcultar}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toggle en esquina inferior derecha — la superior ya la usan los controles
          propios del editor (cambiar imagen, fondo de sección, etc.) */}
      <div style={{ position: "absolute", bottom: 10, right: 10, zIndex: CAPAS.nav }}>
        <button
          onClick={() => {
            // Sólo al OCULTAR: volver a mostrarlo no rompe nada, así que preguntar
            // ahí sería puro trámite.
            if (!isHidden && avisoAlOcultar && !confirm(`${avisoAlOcultar}\n\n¿Ocultar "${label}" igual?`)) return;
            toggleHiddenSection(id);
          }}
          title={isHidden ? `Mostrar "${label}"` : `Ocultar "${label}"`}
          style={{
            background: isHidden ? "rgba(239,68,68,0.92)" : "rgba(0,0,0,0.72)",
            color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 7,
            padding: "5px 12px", fontSize: 11, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            backdropFilter: "blur(8px)", letterSpacing: 0.3,
            boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
          }}
        >
          {isHidden ? "👁 Mostrar bloque" : "👁 Ocultar bloque"}
        </button>
      </div>

      {/* ── Flechas de orden ──────────────────────────────────────────────────
          Una sola pastilla con las dos flechas adentro, centrada abajo y pegada
          al filo del bloque.
          Eran dos botones cuadrados de 26×26 separados, flotando a 10px del
          borde. En una sección alta no molestaban, pero en una franja de
          garantías —80px de alto y el contenido repartido a lo ancho— caían justo
          encima del texto. No es un problema de un template: le pasa a cualquier
          sección baja de los diez.
          Juntas en una pastilla ocupan casi la mitad de alto (20 contra 26) y
          apoyadas en el filo se corren del medio de la franja, que es donde vive
          el contenido. El filo entre dos secciones es además donde estos botones
          significan algo: mueven el bloque respecto del de al lado.
          Las dos van siempre, aunque una esté deshabilitada: si desapareciera la
          que no se puede usar, la pastilla cambiaría de ancho al mover un bloque y
          la otra flecha se correría de abajo del mouse. */}
      <div style={{
        position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", zIndex: CAPAS.nav,
        display: "flex", alignItems: "stretch", overflow: "hidden",
        background: "rgba(0,0,0,0.78)", border: "1px solid rgba(255,255,255,0.32)", borderRadius: 999,
        backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
      }}>
        <button
          onClick={() => moveSection(id, defaultOrder, "up")}
          disabled={isFirst}
          title={isFirst ? "Ya es el primer bloque" : `Subir "${label}"`}
          style={{
            background: "none", color: "#fff", border: "none", padding: 0,
            width: 30, height: 20, fontSize: 10, fontWeight: 700, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: isFirst ? "default" : "pointer", opacity: isFirst ? 0.3 : 1,
          }}
        >
          ▲
        </button>
        {/* El separador va acá y no como borde de los botones: así no se ve en las
            puntas de la pastilla, solo entre las dos flechas. */}
        <span style={{ width: 1, background: "rgba(255,255,255,0.28)" }} />
        <button
          onClick={() => moveSection(id, defaultOrder, "down")}
          disabled={isLast}
          title={isLast ? "Ya es el último bloque" : `Bajar "${label}"`}
          style={{
            background: "none", color: "#fff", border: "none", padding: 0,
            width: 30, height: 20, fontSize: 10, fontWeight: 700, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: isLast ? "default" : "pointer", opacity: isLast ? 0.3 : 1,
          }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
