"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/* ────────────────────────────────────────────────────────────────────────────
   La descripción del producto, plegada cuando es larga.

   En el celular la descripción es lo más largo de la ficha: una de cuatro
   párrafos empuja el precio, los talles y el botón de comprar tan abajo que hay
   que scrollear varias pantallas para volver a encontrarlos. Plegada, la ficha
   entra de una sola mirada y el que quiere leer todo abre.

   Dos decisiones que parecen detalles y no lo son:

   · El botón aparece SOLO si el texto de verdad no entra. Un "Ver más" debajo de
     una descripción de dos renglones no agrega nada y encima hace dudar de si
     falta algo. Por eso se MIDE el elemento (`scrollHeight` contra
     `clientHeight`) en vez de contar caracteres, que depende del ancho de la
     pantalla, del tamaño de letra y de si la dueña escribió listas o negritas.

   · Se pliega por LÍNEAS y no por altura fija: con una altura en píxeles, el
     recorte cae en cualquier parte y a veces parte un renglón por la mitad.

   En escritorio no se pliega nada: ahí el panel ya scrollea por dentro y el
   problema no existe.
──────────────────────────────────────────────────────────────────────────────── */

export function DescripcionPlegable({
  html, style, lineas = 8, plegar, boton, fundido,
}: {
  /** El HTML del editor de texto enriquecido, tal cual viene. */
  html: string;
  /** El estilo del texto, que lo pone cada template. */
  style?: CSSProperties;
  /** Cuántas líneas se ven cuando está plegada. */
  lineas?: number;
  /** Con `false` se dibuja entera y sin botón (escritorio). */
  plegar: boolean;
  /** El botón lo viste cada template: acá sólo se decide cuándo aparece. */
  boton?: CSSProperties;
  /** Color de la superficie de atrás. Con esto se dibuja un difuminado en el
   *  corte, que es la señal de que el texto sigue. Sin esto, el recorte se lee
   *  como si el párrafo terminara ahí. */
  fundido?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [desborda, setDesborda] = useState(false);

  // Al pasar de un producto a otro vuelve a plegarse: si no, la ficha siguiente
  // abre desplegada porque alguien abrió la anterior.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de una interacción (abrir otra ficha), no se puede calcular durante el render
    setAbierto(false);
  }, [html]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !plegar) { return; }
    // Sólo se puede medir con el recorte PUESTO: abierto, `scrollHeight` y
    // `clientHeight` son iguales y el texto más largo del mundo parecería entrar.
    // Por eso, una vez que sabemos que desborda, no se vuelve a preguntar.
    if (abierto) return;
    const medir = () => {
      // 4px de tolerancia: los navegadores devuelven fracciones al hacer zoom, y
      // sin margen aparece un "Ver más" que no despliega nada visible.
      setDesborda(el.scrollHeight > el.clientHeight + 4);
    };
    // En un frame aparte: medir acá mismo sería un setState sincrónico dentro
    // del efecto. Y con ResizeObserver porque el alto cambia cuando cargan las
    // fuentes o si el texto trae una imagen.
    const raf = requestAnimationFrame(medir);
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [html, plegar, lineas, abierto]);

  const recortado = plegar && !abierto && desborda;
  // El recorte se aplica mientras esté plegado aunque todavía no sepamos si
  // desborda: si se pusiera recién al saberlo, la ficha abriría con el texto
  // entero y se achicaría de golpe en el primer frame.
  const clamp: CSSProperties = plegar && !abierto
    ? { display:"-webkit-box", WebkitLineClamp: lineas, WebkitBoxOrient:"vertical", overflow:"hidden" }
    : {};

  return (
    <>
      <div style={{ position:"relative" }}>
        <div ref={ref} className="product-rte" dangerouslySetInnerHTML={{ __html: html }} style={{ ...style, ...clamp }} />
        {recortado && fundido && (
          <div style={{ position:"absolute", left:0, right:0, bottom:0, height:44, pointerEvents:"none",
                        background:`linear-gradient(to bottom, transparent, ${fundido})` }} />
        )}
      </div>
      {plegar && desborda && (
        <button type="button" onClick={() => setAbierto(a => !a)}
          aria-expanded={abierto}
          style={{ marginTop:10, background:"none", cursor:"pointer", ...boton }}>
          {abierto ? "Ver menos" : "Ver más"}
        </button>
      )}
    </>
  );
}
