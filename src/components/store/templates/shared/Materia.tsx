"use client";
import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Materia: vidrio, profundidad e inclinación.
//
// Son las piezas que hacen que Aurora y Lumen se sientan "caros" sin pesar nada.
// Lo caro no es la cantidad de efectos: es que la luz se comporte igual en toda
// la pantalla. Por eso las sombras y los bordes salen de acá y no de cada
// template — si cada uno inventa su sombra, la escena deja de ser una sola.
// ─────────────────────────────────────────────────────────────────────────────

export type Modo = "oscuro" | "claro";

/**
 * Sombras en capas.
 *
 * Una sombra sola —`0 4px 12px rgba(0,0,0,.2)`— se lee como pegatina. En la
 * realidad un objeto proyecta varias: un contacto duro y corto pegado al borde,
 * y una difusa y larga. Tres capas con opacidad decreciente es lo que separa
 * "tiene sombra" de "está apoyado sobre algo".
 */
export function sombra(modo: Modo, nivel: 1 | 2 | 3 = 2): string {
  const c = modo === "oscuro" ? "0,0,0" : "23,23,32";
  const f = modo === "oscuro" ? 1 : 0.55; // sobre claro, la misma sombra tapa
  const capas: Record<number, string> = {
    1: `0 1px 2px rgba(${c},${0.10 * f}), 0 3px 8px rgba(${c},${0.07 * f})`,
    2: `0 1px 2px rgba(${c},${0.12 * f}), 0 6px 16px rgba(${c},${0.10 * f}), 0 18px 40px rgba(${c},${0.10 * f})`,
    3: `0 2px 4px rgba(${c},${0.14 * f}), 0 12px 28px rgba(${c},${0.14 * f}), 0 36px 80px rgba(${c},${0.16 * f})`,
  };
  return capas[nivel];
}

/**
 * El borde que agarra la luz.
 *
 * Dos sombras internas: una clara arriba y una oscura abajo. Es cómo se ve un
 * canto biselado cuando la luz viene de arriba, y es lo que hace que una
 * superficie parezca tener espesor en vez de ser un rectángulo pintado.
 */
export function canto(modo: Modo): string {
  return modo === "oscuro"
    ? "inset 0 1px 0 rgba(255,255,255,.10), inset 0 -1px 0 rgba(0,0,0,.35)"
    : "inset 0 1px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(23,23,32,.07)";
}

/** El fondo y el borde de una superficie de vidrio. */
export function vidrio(modo: Modo, opacidad = 1): React.CSSProperties {
  const oscuro = modo === "oscuro";
  return {
    background: oscuro
      ? `rgba(255,255,255,${0.05 * opacidad})`
      : `rgba(255,255,255,${0.62 * opacidad})`,
    // `saturate` además del blur: sin él, lo que se ve detrás del vidrio queda
    // lavado. Con él, el vidrio parece tener cuerpo.
    backdropFilter: "blur(18px) saturate(150%)",
    WebkitBackdropFilter: "blur(18px) saturate(150%)",
    border: `1px solid ${oscuro ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.75)"}`,
    boxShadow: `${sombra(modo, 2)}, ${canto(modo)}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inclinable
//
// La tarjeta se inclina siguiendo el cursor, con un brillo que se mueve por
// encima. Es un efecto de ESCRITORIO y hay que decirlo: en un celular no hay
// cursor, así que no pasa nada — y está bien que no pase, no es una carencia.
//
// Dos cosas que importan más que el efecto:
//
//   · No se usa estado de React. Mover el mouse dispara decenas de eventos por
//     segundo; con `useState` eso es un re-render por evento, y con doce tarjetas
//     en pantalla la página se arrastra. Se escribe directo al nodo por ref.
//   · Sólo se activa con puntero fino (`pointer: fine`). En una tablet con dedo
//     y sin mouse, el efecto quedaría trabado en la última posición tocada.
// ─────────────────────────────────────────────────────────────────────────────

export function Inclinable({
  children,
  grados = 6,
  brillo = true,
  className,
  style,
}: {
  children: React.ReactNode;
  /** Cuánto se inclina en el borde. Más de ~8 se ve caricaturesco. */
  grados?: number;
  brillo?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const brilloRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fino = window.matchMedia?.("(pointer: fine)").matches ?? false;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!fino || quieto) return;

    let raf = 0;
    let px = 0, py = 0;

    const aplicar = () => {
      raf = 0;
      const rx = (0.5 - py) * grados * 2;
      const ry = (px - 0.5) * grados * 2;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      const b = brilloRef.current;
      if (b) {
        b.style.background = `radial-gradient(320px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,.16), transparent 60%)`;
        b.style.opacity = "1";
      }
    };

    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      // Un solo cálculo por cuadro, sin importar cuántos eventos lleguen.
      if (!raf) raf = requestAnimationFrame(aplicar);
    };

    const salir = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      if (brilloRef.current) brilloRef.current.style.opacity = "0";
    };

    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", salir);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", salir);
    };
  }, [grados, brillo]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transformStyle: "preserve-3d",
        // Sólo la vuelta al reposo va con transición. Si la inclinación también
        // la tuviera, la tarjeta iría siempre atrasada respecto del cursor y se
        // sentiría pegajosa en vez de precisa.
        transition: "transform .5s cubic-bezier(.2,.8,.2,1)",
        position: "relative",
        ...style,
      }}
    >
      {children}
      {brillo && (
        // El brillo va ARRIBA de todo y sin capturar el mouse: si lo capturara,
        // se comería los clicks del producto que envuelve.
        //
        // Lo prende y lo apaga el mismo handler que mueve la tarjeta, no una
        // regla CSS de hover. Antes esto inyectaba un <style> por instancia —doce
        // tarjetas, doce tags idénticos— con un selector `*:hover` que además
        // pisaba cualquier otro elemento de la página que tuviera esta clase.
        <span
          ref={brilloRef}
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit",
            opacity: 0, transition: "opacity .35s ease",
          }}
        />
      )}
    </div>
  );
}
