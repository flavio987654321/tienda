"use client";
import { createContext, useContext, useState } from "react";
import type { TextOverride, ImageOverride } from "@/types/store-config";
import { colorRepresentativo } from "@/lib/section-bg";

type EditContextType = {
  editMode: boolean;
  activeField: string | null;
  /* ── Cómo se titula el panel ───────────────────────────────────────────────
     Lo pone la zona al abrirse, no un mapa del editor.
     Antes el panel buscaba el título en `TEXT_FIELD_LABELS`, un Record fijo por
     nombre de campo que vivía en `configuracion/page.tsx`. El problema no era la
     duplicación —`EditableZone` ya recibe su `label` para el globito del hover—
     sino que el mapa se podía olvidar: el fallback era el nombre crudo del campo,
     así que un campo nuevo sin entrada titulaba el panel "aboutStatLabel3" en la
     pantalla de alguien que vende ropa. Un template que no compila avisa; un mapa
     incompleto no.
     Viaja pegado a `activeField` y no por registro global —que es lo que
     `EditableImageButton` explica más abajo que hay que evitar— porque el clic YA
     hace un setState: mandar el título con él no cuesta ningún render de más.
     Sigue siendo `null` cuando el campo se abre desde otro lado (el carrusel de
     ChicParis, por ejemplo, que abre campos de imagen a mano). */
  activeLabel: string | null;
  setActiveField: (field: string | null, label?: string) => void;
  overrides: Record<string, TextOverride>;
  setOverride: (field: string, partial: Partial<TextOverride>) => void;
  resetOverride: (field: string) => void;
  imageOverrides: Record<string, ImageOverride>;
  setImageOverride: (field: string, partial: Partial<ImageOverride>) => void;
  sectionColors: Record<string, string>;
  setSectionColor: (field: string, color: string) => void;
  imageLoading: Record<string, boolean>;
  hiddenSections: string[];
  toggleHiddenSection: (id: string) => void;
  sectionOrder: string[];
  moveSection: (id: string, defaultOrder: string[], direction: "up" | "down") => void;
};

export const EditContext = createContext<EditContextType>({
  editMode: false,
  activeField: null,
  activeLabel: null,
  setActiveField: () => {},
  overrides: {},
  setOverride: () => {},
  resetOverride: () => {},
  imageOverrides: {},
  setImageOverride: () => {},
  sectionColors: {},
  setSectionColor: () => {},
  imageLoading: {},
  hiddenSections: [],
  toggleHiddenSection: () => {},
  sectionOrder: [],
  moveSection: () => {},
});

// Luminancia relativa del color (0 = negro, 1 = blanco), o `null` si no se pudo
// leer. El fondo de una sección puede ser un degradado, no solo un color: cuando
// lo es, se decide con el punto medio. Los diez templates pasan por acá para
// saber si el texto va claro u oscuro, así que resolverlo en este único lugar
// alcanza para todos —y para los que vengan— en vez de enseñarle a cada uno a
// leer degradados.
function luminancia(color: string): number | null {
  if (!color) return null;
  const hex = colorRepresentativo(color);
  if (!hex) return null;
  let full = hex.startsWith("#") ? hex : "#" + hex;
  // Expand shorthand #RGB → #RRGGBB
  if (full.length === 4) {
    full = "#" + full[1] + full[1] + full[2] + full[2] + full[3] + full[3];
  }
  if (full.length < 7) return null;
  const r = parseInt(full.slice(1, 3), 16) / 255;
  const g = parseInt(full.slice(3, 5), 16) / 255;
  const b = parseInt(full.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastColor(color: string): "light" | "dark" {
  const lum = luminancia(color);
  if (lum == null) return "dark";
  return lum > 0.5 ? "dark" : "light";
}

// ── Texto ARRIBA de una superficie pintada ───────────────────────────────────
// Devuelve el que MÁS contraste da, medido con el ratio de WCAG, en vez de
// decidirlo por un umbral de luminosidad como getContrastColor.
//
// `luminancia` de acá arriba promedia los canales tal cual vienen, sin deshacer
// la curva gamma del sRGB. Para grises alcanza, pero en colores saturados se
// desvía feo: el naranja #ea580c da 0.445 —o sea "poné texto blanco"— cuando su
// luminancia real es 0.245 y el blanco encima le da 3.56 de contraste contra los
// 5.90 del negro. El texto quedaba en el color equivocado justo en los acentos
// más elegidos: naranjas, dorados, amarillos, verdes fuertes.
//
// Ojo: NO cambiar getContrastColor por esto. Esa función también se usa para
// preguntar "¿estos dos colores están en veredas opuestas?" (getReadableAccentText),
// que es otra pregunta y ahí el corte en el medio es el que corresponde.
export function textoSobre(fondo: string): "#fff" | "#111" {
  return contrasteWCAG(fondo, "#ffffff") >= contrasteWCAG(fondo, "#111111") ? "#fff" : "#111";
}

/** Ratio de contraste WCAG entre dos colores: (L1 + 0.05) / (L2 + 0.05). */
export function contrasteWCAG(a: string, b: string): number {
  const la = luminanciaReal(a);
  const lb = luminanciaReal(b);
  if (la == null || lb == null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Luminancia relativa de WCAG: la de verdad, deshaciendo la curva del sRGB. */
function luminanciaReal(color: string): number | null {
  const hex = colorRepresentativo(color);
  if (!hex) return null;
  let full = hex.startsWith("#") ? hex : "#" + hex;
  if (full.length === 4) full = "#" + full[1] + full[1] + full[2] + full[2] + full[3] + full[3];
  if (full.length < 7) return null;
  const canal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(parseInt(full.slice(1, 3), 16))
       + 0.7152 * canal(parseInt(full.slice(3, 5), 16))
       + 0.0722 * canal(parseInt(full.slice(5, 7), 16));
}

// Para usar el acento como color de TEXTO sobre un fondo (precio, nombre de
// marca, etc.) — no como fondo de botón, eso ya lo resuelve getContrastColor
// del otro lado. Si el acento elegido casi no se distingue de ese fondo (ej.
// blanco sobre una página clara, o negro sobre un footer oscuro), usarlo tal
// cual como texto lo volvería casi invisible, así que caemos al color de
// texto "seguro" del propio tema en vez del acento.
export function getReadableAccentText(accent: string, bg: string, fallback: string): string {
  return getContrastColor(accent) !== getContrastColor(bg) ? accent : fallback;
}

// Para usar el acento como RELLENO (el chip del talle elegido, un badge), no como
// texto. Es una pregunta distinta de la de arriba: ahí importa si el color se LEE
// sobre el fondo; acá, si se DISTINGUE del fondo como superficie.
//
// Con la regla de texto alcanzaba para el precio pero descartaba acentos que como
// relleno andan perfecto: un naranja sobre blanco se lee mal escrito, pero pintado
// de fondo se ve clarísimo —y el texto de adentro se resuelve aparte con
// getContrastColor, así que nunca queda ilegible—. Usar una sola regla para las
// dos cosas mandaba a negro naranjas, dorados y amarillos sin motivo.
//
// Se mide con el ratio de contraste de WCAG ((L1+0.05)/(L2+0.05)): 1.0 es el mismo
// color y 21 es blanco contra negro. Debajo de 1.25 el relleno se confunde con el
// fondo (beige, crema, marfil, blanco); de ahí para arriba se recorta solo.
const RATIO_MINIMO_RELLENO = 1.25;

export function getReadableAccentFill(accent: string, bg: string, fallback: string): string {
  const a = luminancia(accent);
  const b = luminancia(bg);
  if (a == null || b == null) return fallback;
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return ratio >= RATIO_MINIMO_RELLENO ? accent : fallback;
}

export function useEditContext() { return useContext(EditContext); }

/* ── EditableZone ─────────────────────────────────────────────
   Wrap any text element. In edit mode shows hover outline +
   pencil badge. Applies textOverrides (color, font, size, B/I/U)
   both in edit mode and in live preview.
──────────────────────────────────────────────────────────────── */
export function EditableZone({
  field, label, children, block = false, noBadge = false,
}: {
  field: string;
  label: string;
  children: React.ReactNode;
  block?: boolean;
  noBadge?: boolean;
}) {
  const { editMode, activeField, setActiveField, overrides } = useEditContext();
  const [hovered, setHovered] = useState(false);

  const isActive = activeField === field;
  const ov = overrides[field] ?? {};

  // ── El ÚNICO lugar donde los ajustes se vuelven CSS ────────────────────────
  // Todos los templates envuelven sus textos en <EditableZone>, así que lo que se
  // agregue acá lo heredan los diez de una vez — y también cualquier template
  // futuro, sin tocarle nada. Por eso no se aplican estilos dentro de cada
  // template: sería la misma lógica repetida diez veces, desincronizándose.
  //
  // Cada línea es condicional a propósito: si el ajuste no está definido, la
  // propiedad ni se escribe y manda el estilo original del diseño. Poner un valor
  // por defecto acá pisaría el diseño de todos los templates.
  const overrideStyle: React.CSSProperties = {
    ...(ov.color      && { color: ov.color }),
    ...(ov.fontFamily && { fontFamily: ov.fontFamily }),
    ...(ov.fontSize   && { fontSize: ov.fontSize }),
    ...(ov.bold       !== undefined && { fontWeight: ov.bold ? 700 : "normal" }),
    ...(ov.italic     !== undefined && { fontStyle: ov.italic ? "italic" : "normal" }),
    ...(ov.underline  !== undefined && { textDecoration: ov.underline ? "underline" : "none" }),
    // `textAlign` no tiene ningún efecto sobre un elemento en línea, y esta zona
    // se dibuja como <span> salvo que se le pase `block`. Sin el display forzado,
    // el control se vería andar en el panel y el texto no se movería nunca.
    // Con `block` la zona pasa a ocupar el ancho de su contenedor —el <h1> o el
    // <p> que la envuelve— que es contra el que uno espera alinear.
    ...(ov.align      && { textAlign: ov.align, display: "block", width: "100%" }),
    ...(ov.uppercase  !== undefined && { textTransform: ov.uppercase ? "uppercase" : "none" }),
    ...(ov.lineHeight && { lineHeight: ov.lineHeight }),
    // 0 es un espaciado válido (junta las letras al máximo normal), así que se
    // pregunta por `undefined` y no por si el número es "verdadero".
    ...(ov.letterSpacing !== undefined && { letterSpacing: `${ov.letterSpacing}px` }),
  };

  const displayContent = ov.text !== undefined ? ov.text : children;
  const hasStyle = Object.keys(overrideStyle).length > 0;
  const isHidden = !!ov.hidden;

  if (!editMode) {
    if (isHidden) return null;
    if (!hasStyle && ov.text === undefined) return <>{children}</>;
    const Tag = block ? "div" : ("span" as React.ElementType);
    return <Tag style={overrideStyle}>{displayContent}</Tag>;
  }

  const Tag = block ? "div" : ("span" as React.ElementType);

  if (isHidden) {
    return (
      <Tag
        // También cuando está oculto, y no sólo en la rama de abajo: el panel sube
        // por el DOM desde este elemento para leer el fondo real que tiene detrás y
        // avisar si el color elegido no se lee. Sin la marca, ese aviso se apagaba
        // justo en el campo que más lo necesita — el que estás por volver a mostrar
        // y todavía no viste sobre su fondo.
        data-edit-field={field}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveField(field, label); }}
        style={{
          position: "relative",
          display: block ? "block" : "inline",
          cursor: "pointer",
          opacity: 0.35,
          outline: isActive
            ? "2px solid #ef4444"
            : hovered ? "2px dashed rgba(239,68,68,0.6)"
            : "2px dashed rgba(239,68,68,0.35)",
          outlineOffset: 4,
          boxShadow: isActive
            ? "0 0 0 7px rgba(255,255,255,0.9)"
            : hovered ? "0 0 0 7px rgba(255,255,255,0.6)"
            : "0 0 0 7px rgba(255,255,255,0.25)",
          borderRadius: 3,
          transition: "outline-color 0.15s, box-shadow 0.15s",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          maxWidth: "100%",
        } as React.CSSProperties}
      >
        {displayContent}
        {(hovered || isActive) && (
          <span style={{
            position: "absolute", top: 0, left: 0,
            transform: "translateY(-100%)",
            background: "#ef4444", color: "white",
            fontSize: 10, fontWeight: 700, lineHeight: 1.5,
            padding: "3px 8px", borderRadius: "4px 4px 4px 0",
            display: "inline-flex", alignItems: "center", gap: 4,
            zIndex: 99999, whiteSpace: "nowrap", pointerEvents: "none",
            boxShadow: "0 2px 10px rgba(239,68,68,0.35)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: 0,
          }}>
            👁 OCULTO · clic para editar
          </span>
        )}
      </Tag>
    );
  }

  return (
    <Tag
      // Marca para poder encontrar este texto en la pantalla desde el panel de
      // edición. Se usa para leer el fondo REAL que tiene detrás —subiendo por sus
      // contenedores hasta dar con uno que tenga color— y avisar si el color
      // elegido no se lee. Adivinar el fondo desde la configuración no serviría:
      // cada template pinta sus secciones a su manera.
      data-edit-field={field}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setActiveField(field, label); }}
      style={{
        position: "relative",
        display: block ? "block" : "inline",
        cursor: "pointer",
        outline: isActive
          ? "2px solid #6366f1"
          : hovered ? "1.5px dashed rgba(99,102,241,0.7)"
          : "1.5px dashed transparent",
        outlineOffset: 3,
        boxShadow: isActive
          ? "0 0 0 4px rgba(99,102,241,0.35)"
          : hovered ? "0 0 0 3px rgba(99,102,241,0.18)"
          : "none",
        borderRadius: 3,
        transition: "outline-color 0.15s, box-shadow 0.15s",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        maxWidth: "100%",
        ...overrideStyle,
      } as React.CSSProperties}
    >
      {displayContent}
      {hovered && !isActive && !noBadge && (
        <span style={{
          position: "absolute", top: 0, left: 0,
          transform: "translateY(-100%)",
          background: "#6366f1", color: "white",
          fontSize: 10, fontWeight: 700, lineHeight: 1.5,
          padding: "3px 8px", borderRadius: "4px 4px 4px 0",
          display: "inline-flex", alignItems: "center", gap: 4,
          zIndex: 99999, whiteSpace: "nowrap", pointerEvents: "none",
          boxShadow: "0 2px 10px rgba(99,102,241,0.45)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          letterSpacing: 0,
        }}>
          ✏ {label}
        </span>
      )}
    </Tag>
  );
}

/* ── EditableImageButton ──────────────────────────────────────
   Drop this inside any section that has position:relative.
   Shows a floating camera button in edit mode to change the
   background image of that section.
──────────────────────────────────────────────────────────────── */
export function EditableImageButton({
  field,
  label,
  compact = false,
  panelLabel,
  panelNote,
}: {
  field: string;
  label: string;
  /** Solo el ícono de cámara, sin el texto — para tarjetas chicas donde el
   *  botón completo choca con otros controles (ej: el selector de categoría). */
  compact?: boolean;
  /* ── Título y aviso del panel ─────────────────────────────────────────────────
     Los dos son opcionales: sin ellos el panel se titula con `label` (el texto del
     botón) y no muestra ayuda. Se pasan cuando el botón no nombra el hueco, o
     cuando hay algo que avisar que no se deduce mirando la pantalla.

     Van por atributo en el DOM y NO por el contexto, que es por donde viaja el
     título de `EditableZone` (ver `activeLabel`). La diferencia no es el árbol
     —`FloatingEditor` y `<TemplateComponent/>` cuelgan del mismo provider— sino que
     acá el valor puede cambiar CON EL PANEL ABIERTO: en las baldosas de categoría de
     Urban Pulse las ranuras se llaman `catMujer`/`catHombre`/`catAccesorios` por
     historia (hay tiendas con fotos guardadas ahí) pero la categoría que muestran la
     elige el dueño, y puede cambiarla sin cerrar el panel. Un título mandado en el
     clic se quedaría hablando de la categoría anterior; el atributo lo sigue con un
     `MutationObserver`. Lo mismo vale para el carrusel de banner, que mueve el campo
     activo de slide sin que nadie toque un botón.

     Por contexto además habría que REGISTRARLOS, y registrar desde un componente que
     se dibuja muchas veces significa un `setState` en un efecto por cada botón de
     imagen de la página — la clase de problema que el propio lint del repo marca
     como error (`react-hooks/set-state-in-effect`). Un atributo es pasivo: no
     dispara nada, y lo lee sólo el único panel que está abierto. Además el panel YA
     lee este mismo elemento por `data-edit-image` para medir el hueco. */
  /** Reemplaza el título del panel, que por defecto es el texto del botón. */
  panelLabel?: string;
  /** Reemplaza el texto de ayuda del panel. Para explicar algo que depende del
   *  estado — ej: que la foto se está tomando sola de un producto. */
  panelNote?: string;
}) {
  const { editMode, activeField, setActiveField, imageLoading } = useEditContext();
  const [hovered, setHovered] = useState(false);
  const imageKey = `img:${field}`;
  const isActive = activeField === imageKey;
  const isLoading = !!imageLoading[field];

  if (!editMode) return null;

  return (
    <>
      {isLoading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 9997,
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "rgba(30,41,59,0.95)", color: "#e2e8f0",
            fontSize: 12, fontWeight: 700, padding: "10px 18px", borderRadius: 10,
            border: "1px solid rgba(99,102,241,0.5)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: "50%",
              border: "2.5px solid rgba(129,140,248,0.3)", borderTopColor: "#818cf8",
              animation: "imgSpin 0.75s linear infinite", flexShrink: 0,
            }} />
            Cargando imagen...
          </div>
          <style>{`@keyframes imgSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); setActiveField(isActive ? null : imageKey); }}
        title={compact ? label : undefined}
        // Le deja al panel una forma de encontrar el hueco real donde va la foto y
        // medirlo. Sin esto, el panel dibujaba la muestra apaisada siempre y
        // recomendaba medidas fijas — y en las secciones verticales le estaba
        // diciendo al dueño justo lo contrario de lo que le convenía.
        data-edit-image={field}
        // Sin `panelLabel`, el panel se titula con el texto del botón. Alcanza en
        // casi todos —"Imagen del hero", "Imagen sección Nosotros"— porque nombran
        // el hueco. Cuando el botón dice una acción y no un lugar ("Cambiar
        // imagen", en el hero de Fashion Noir), el template pasa `panelLabel`.
        data-edit-label={panelLabel ?? label}
        data-edit-note={panelNote}
        style={compact ? {
          position: "absolute", top: 8, right: 8, zIndex: 9998,
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
          background: isActive ? "#6366f1" : hovered ? "rgba(20,20,20,0.9)" : "rgba(20,20,20,0.65)",
          color: "white",
          border: isActive ? "2px solid #6366f1" : "1.5px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(6px)",
          transition: "all 0.15s",
        } : {
          position: "absolute", top: 16, right: 16, zIndex: 9998,
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 9, cursor: "pointer",
          fontSize: 12, fontWeight: 700,
          background: isActive ? "#6366f1" : hovered ? "rgba(20,20,20,0.9)" : "rgba(20,20,20,0.65)",
          color: "white",
          border: isActive ? "2px solid #6366f1" : "1.5px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(6px)",
          transition: "all 0.15s",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <svg width={compact ? 13 : 14} height={compact ? 13 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
        </svg>
        {!compact && label}
      </button>
    </>
  );
}

/* ── EditableSectionBg ────────────────────────────────────────
   Drop inside any section with position:relative to allow the
   owner to change the section background color. Smart contrast
   is computed automatically when bg changes.
──────────────────────────────────────────────────────────────── */
export function EditableSectionBg({ field, label }: { field: string; label: string }) {
  const { editMode, activeField, setActiveField, sectionColors } = useEditContext();
  const [hovered, setHovered] = useState(false);
  const bgKey = `bg:${field}`;
  const isActive = activeField === bgKey;
  const currentColor = sectionColors[field];

  if (!editMode) return null;

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setActiveField(isActive ? null : bgKey); }}
      title={`Editar fondo: ${label}`}
      // Le deja al panel una forma de encontrar la sección y leer el fondo que
      // tiene puesto AHORA. Sin esto, el panel no sabe el color que trae el
      // template de fábrica: asume negro, y prender un difuminado sobre una
      // sección que nunca se tocó la pintaba de negro de golpe.
      data-edit-bg={field}
      style={{
        /* Pegado al vértice y CHICO, para caber en el margen de la sección.
         *
         * A 16px del filo y con 28px de alto, este botón terminaba a 44px del
         * borde de arriba — y los templates arrancan su contenido a 40px, o a 28
         * en pantalla angosta. O sea que se montaba sobre el título, y no por un
         * caso raro: por cómo están hechas TODAS las secciones. En la tarjeta de
         * suscripción se veía de una; en las demás, aparecía al achicar la
         * ventana, que es lo que hace cualquiera que revisa cómo le queda.
         *
         * Antes se intentó al revés —bajarlo para esquivar la chapita del nombre—
         * y fue peor: correr un control para esquivar a otro lo termina apoyando
         * sobre el contenido, y dónde aterriza depende de cada sección de cada
         * template. La única salida que vale para los diez es que ocupe MENOS y
         * viva en el margen: a 8px del vértice y con 22px de alto, termina a 30 y
         * entra hasta en el margen angosto.
         *
         * Se lee igual: es un botón oscuro sobre el papel del template, y el
         * texto "Fondo" queda. Lo que se recorta es aire. */
        /* JUSTO DEBAJO de la chapita con el nombre del bloque.
         *
         * Los dos apilados arriba a la izquierda, que es donde se los busca, y con
         * la cuenta hecha para que entren en el margen del bloque en vez de caer
         * sobre el contenido:
         *
         *     chapita   0 → 15    (arranca en el filo)
         *     este     17 → 38
         *     el contenido de las secciones arranca a 40
         *
         * Dos píxeles de aire. No es casualidad ni holgura de sobra: es la razón
         * por la que los dos son chicos. Si alguno crece —más padding, letra más
         * grande— vuelven a caer sobre el título, así que los tamaños de acá y los
         * de la chapita (en `SectionBlock`) se tocan juntos.
         *
         * Se probó al costado, y funcionaba, pero se lee peor: dos cosas del mismo
         * bloque en fila parecen dos controles distintos de dos cosas distintas.
         * Apilados se leen como lo que son — el nombre, y abajo lo que se puede
         * hacerle. */
        position: "absolute", top: 17, left: 8, zIndex: 9998,
        display: "flex", alignItems: "center", gap: 4,
        padding: "4px 9px", borderRadius: 8, cursor: "pointer",
        fontSize: 10.5, fontWeight: 700, lineHeight: 1.2,
        background: isActive ? "#6366f1" : hovered ? "rgba(20,20,20,0.9)" : "rgba(20,20,20,0.65)",
        color: "white",
        border: isActive ? "2px solid #6366f1" : "1.5px solid rgba(255,255,255,0.25)",
        backdropFilter: "blur(6px)",
        transition: "all 0.15s",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="2.5"/><path d="M17 13H7a5 5 0 0 0 0 10h10a5 5 0 0 0 0-10z"/><line x1="9" y1="18" x2="15" y2="18"/>
      </svg>
      {currentColor && (
        <span style={{ width: 10, height: 10, borderRadius: 2, background: currentColor, border: "1px solid rgba(255,255,255,0.4)", flexShrink: 0 }} />
      )}
      Fondo
    </button>
  );
}

/* ── EditableFixed ────────────────────────────────────────────
   For fixed/absolute elements like the WhatsApp button.
──────────────────────────────────────────────────────────────── */
export function EditableFixed({
  field, label, bottom, right, size = 52, children,
}: {
  field: string; label: string;
  bottom: number; right: number; size?: number;
  children: React.ReactNode;
}) {
  const { editMode, activeField, setActiveField } = useEditContext();
  const [hovered, setHovered] = useState(false);
  const isActive = activeField === field;

  return (
    <>
      {children}
      {editMode && (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setActiveField(field, label)}
          style={{
            position: "fixed", bottom, right,
            width: size, height: size, borderRadius: "50%",
            zIndex: 99999, cursor: "pointer",
            outline: isActive
              ? "3px solid #6366f1"
              : hovered ? "3px dashed rgba(99,102,241,0.8)"
              : "3px dashed transparent",
            outlineOffset: 3,
            boxShadow: isActive
              ? "0 0 0 7px rgba(255,255,255,0.9)"
              : hovered ? "0 0 0 7px rgba(255,255,255,0.6)"
              : "none",
            transition: "outline-color 0.15s, box-shadow 0.15s",
          }}
        >
          {(hovered || isActive) && (
            <span style={{
              position: "absolute", bottom: "100%", right: 0, marginBottom: 6,
              background: "#6366f1", color: "white",
              fontSize: 10, fontWeight: 700, lineHeight: 1.5,
              padding: "3px 8px", borderRadius: "4px 4px 0 4px",
              whiteSpace: "nowrap", pointerEvents: "none",
              boxShadow: "0 2px 10px rgba(99,102,241,0.45)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}>
              ✏ {label}
            </span>
          )}
        </div>
      )}
    </>
  );
}


/* ── BgDragHandle ─────────────────────────────────────────────
   Ya no hace nada, y esa es la corrección.

   Era una capa invisible arriba de la foto que dejaba arrastrarla ahí mismo,
   con un cartel abajo que decía "✋ Arrastrá para reposicionar". El encuadre
   se mudó al panel de la derecha (sección ENCUADRE), y esta capa quedó de
   antes — pero no quedó sólo de adorno: quedó mintiendo.

   1) Escribía SIEMPRE `posX`/`posY`, que son los valores de la vista de PC.
      El panel encuadra PC y celular por separado (`posXMobile`/`posYMobile`).
      Entonces con el panel en "📱 Celular" uno arrastraba la foto grande
      creyendo que acomodaba el celular, y en realidad estaba corriendo el
      encuadre de PC. Sin ningún aviso, y desarmando lo que ya estaba bien.
      El lienzo ni se entera de que existe el modo celular: `modoMobil` es
      estado interno del panel y no sale de ahí.

   2) No sabía qué eje se puede mover. El panel calcula si la foto entra justa
      de ancho o de alto y apaga la barra que no tiene nada que correr —en la
      captura, "De izquierda a derecha no hay nada que mover"—. Acá se
      arrastraba para los cuatro lados igual: en el eje trabado no pasaba nada
      y parecía que el editor estaba colgado.

   El panel hace todo esto bien y además muestra la forma exacta del hueco y
   tiene "Volver al centro". No hay nada que rescatar de esta capa.

   Sigue exportada y devolviendo null a propósito: la usan once plantillas y
   así ninguna se rompe. Las llamadas quedan para barrer en una sola pasada
   cuando FashionNoir esté cerrado — hoy tocarlas sería meterse en trabajo que
   está a medio hacer.
──────────────────────────────────────────────────────────────── */
export function BgDragHandle(_: { imgKey: string }) {
  return null;
}
