"use client";
import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// La grilla que llega desde el fondo.
//
// Las piezas no aparecen ni suben: vienen desde LEJOS. Entran giradas hacia
// atrás, desenfocadas y transparentes, y se enderezan al apoyarse. Es el mismo
// espacio 3D del coverflow del hero, aplicado al catálogo — que es lo que evita
// que la página sea "un bloque espectacular y después una tienda cualquiera".
//
// Cuesta lo mismo que un fade: es un `transform` y una `opacity`, las dos cosas
// que el navegador anima en la placa de video sin tocar el layout.
//
// TRES COSAS QUE NO PUEDEN PASAR
//
//   · Que una pieza quede invisible. Si el observador nunca dispara —porque el
//     navegador es viejo, o porque la pieza ya estaba en pantalla al cargar— se
//     muestra igual. Es preferible perder el efecto a perder el producto.
//   · Que se anime cada vez que pasás. Se dispara UNA vez y se deja de observar:
//     un catálogo que se rearma cada vez que scrolleás para arriba es mareante.
//   · Que quede un filtro puesto para siempre. Al terminar, el `blur` y el
//     `transform` se sacan del todo — si no, cada tarjeta se queda con una capa
//     de composición propia y con cuarenta en pantalla el scroll se arrastra.
// ─────────────────────────────────────────────────────────────────────────────

export function GrillaProfunda({
  children,
  min = 240,
  hueco = 26,
}: {
  children: React.ReactNode;
  /** Ancho mínimo de cada columna. Debajo de eso, la grilla se reacomoda sola. */
  min?: number;
  hueco?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
        gap: hueco,
        // La perspectiva va en la grilla y no en cada pieza: así todas comparten
        // el mismo punto de fuga y el conjunto se lee como una sola escena. Con
        // una perspectiva por pieza, cada una fugaría hacia su propio centro y
        // el efecto se deshace.
        perspective: "1200px",
      }}
    >
      {children}
    </div>
  );
}

export function PiezaQueLlega({
  indice,
  children,
}: {
  indice: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [llego, setLlego] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (quieto || typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de matchMedia y de si el navegador tiene IntersectionObserver: las dos cosas sólo se saben después de montar, y calcularlas durante el render rompería la hidratación
      setLlego(true);
      return;
    }

    /* Llega CADA VEZ que entra, no una sola. Antes se desconectaba después de
       la primera llegada, y Flavio lo notó (03/10/26): la primera vez que se
       pasa por la grilla las piezas vienen desde lejos; se sube, se vuelve a
       bajar, y ya están quietas — el efecto parece haberse roto.

       Ahora, cuando la pieza sale de la pantalla del TODO vuelve a quedar
       "lejos", sin que se vea (está afuera), y la próxima vez que entra vuelve
       a llegar. Se espera a que salga entera para no cortar la llegada de una
       pieza que apenas asoma por el borde. */
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.08) setLlego(true);
        else if (!e.isIntersecting) setLlego(false);
      },
      // Un poco antes de entrar del todo, para que el movimiento termine cuando
      // la pieza ya está bien a la vista y no justo al aparecer.
      { threshold: [0, 0.08], rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // El escalonado va por posición en la fila, no por índice absoluto: con
  // cuarenta productos, `indice * 60ms` haría que el último entrara dos segundos
  // y medio tarde.
  //
  // Y la demora va DENTRO de la abreviada `transition`, no aparte en
  // `transitionDelay`. Mezclarlas hace que React avise —"don't mix shorthand and
  // non-shorthand properties"— y no es un aviso vacío: al cambiar la individual
  // en un rerender, React no puede saber qué parte de la abreviada pisar, y
  // quedan estilos mal aplicados.
  const demora = llego ? (indice % 4) * 70 : 0;
  const transicion = [
    `transform .72s cubic-bezier(.16,.84,.32,1) ${demora}ms`,
    `opacity .6s ease ${demora}ms`,
    `filter .6s ease ${demora}ms`,
  ].join(", ");

  return (
    <div
      ref={ref}
      style={{
        // Al llegar se sacan el transform y el filtro del todo (`none`), no se
        // dejan en su valor neutro: un `transform` o un `filter` presentes crean
        // una capa de composición permanente por tarjeta.
        transform: llego ? "none" : "translateY(38px) translateZ(-240px) rotateX(9deg)",
        filter: llego ? "none" : "blur(6px)",
        opacity: llego ? 1 : 0,
        transition: transicion,
        willChange: llego ? "auto" : "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}
