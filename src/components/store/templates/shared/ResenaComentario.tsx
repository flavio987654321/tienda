"use client";

import { useEffect, useRef, useState } from "react";

/**
 * El comentario de una reseña, recortado a unas líneas con forma de desplegarlo.
 *
 * Estaba escrito adentro de ChicParis. Se movió acá al traer el bloque de reseñas
 * a Urban Pulse: es lógica —medir si el texto se cortó y ofrecer verlo entero—, no
 * diseño, y no tiene por qué existir dos veces.
 *
 * Del diseño no decide NADA por su cuenta: la tipografía entra entera por
 * `estiloTexto`. La versión que vivía en ChicParis traía Playfair en itálica como
 * valor por defecto, y eso hacía que cualquier template que la usara sin pensarlo
 * apareciera escrito con la tipografía de otro. Ahora cada uno pasa la suya.
 */
export function ResenaComentario({
  texto, onVerMas, acento, estiloTexto, comillas = true, lineas = 6, textoBoton,
}: {
  texto: string;
  /** Si viene, el botón lleva a otro lado (la portada abre la ficha del producto).
   *  Si no viene, el botón despliega el texto acá mismo — que es lo que hace falta
   *  adentro de la vista rápida, donde ya estás en la ficha y no hay a dónde ir. */
  onVerMas?: (() => void) | null;
  acento: string;
  estiloTexto?: React.CSSProperties;
  comillas?: boolean;
  /** Cuántas líneas se muestran antes de recortar. */
  lineas?: number;
  /** Para templates que escriben distinto ("Leer todo" en mayúsculas, etc.). */
  textoBoton?: { desplegar: string; irA: string };
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [cortado, setCortado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const ahora = el.scrollHeight > el.clientHeight + 1;
      setCortado(prev => (prev === ahora ? prev : ahora));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [texto]);

  const etiquetas = textoBoton ?? { desplegar: "Leer todo", irA: "Ver reseña completa →" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
      <p ref={ref} style={{
        fontSize: 13, lineHeight: 1.75, margin: 0,
        ...estiloTexto,
        // El recorte va al final para que no se lo pise `estiloTexto`, y se
        // levanta entero al desplegar: dejar el `-webkit-box` con el clamp en
        // "none" también funciona, pero sigue aplicando el modelo de caja raro.
        ...(abierto ? {} : {
          display: "-webkit-box", WebkitLineClamp: lineas, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }),
      }}>{comillas ? <>&ldquo;{texto}&rdquo;</> : texto}</p>
      {cortado && !abierto && (
        // `stopPropagation`: esta tarjeta puede estar adentro de un contenedor
        // clickeable —en Urban Pulse la reseña entera lleva a la ficha del
        // producto— y sin esto el clic se contaría dos veces. Más importante en
        // el caso de "Leer todo": ahí el botón despliega el texto acá mismo, y
        // que además se abriera el modal sería justo lo contrario de lo pedido.
        <button type="button" onClick={e => { e.stopPropagation(); (onVerMas ?? (() => setAbierto(true)))(); }}
          style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, cursor: "pointer",
                   fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: acento }}>
          {onVerMas ? etiquetas.irA : etiquetas.desplegar}
        </button>
      )}
    </div>
  );
}
