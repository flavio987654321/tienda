"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export type EstadoSasha = "reposo" | "pensando" | "sorprendido" | "guiño" | "sonriente";

const BOCA: Record<EstadoSasha, string> = {
  reposo: "M 34 58 Q 44 58 54 58",
  pensando: "M 36 60 Q 44 56 52 60",
  sorprendido: "M 40 56 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0",
  "guiño": "M 32 55 Q 44 66 58 53",
  sonriente: "M 30 54 Q 44 70 58 54",
};

const CEJA_Y: Record<EstadoSasha, number> = {
  reposo: 28,
  pensando: 26,
  sorprendido: 23,
  "guiño": 27,
  sonriente: 27,
};

/**
 * La altura con la que se dibujan las cejas en el SVG. Las de arriba se siguen
 * escribiendo como altura absoluta —que es como se piensan— y el movimiento sale
 * de restar: `CEJA_Y[estado] - CEJA_Y_BASE`.
 *
 * Hace falta una base fija porque las cejas se mueven con `translateY` en vez de
 * animar el atributo `y`. Ver el comentario de los ojos: framer-motion 12 escribe
 * `undefined` en los atributos de SVG en el primer frame de cada montaje.
 */
const CEJA_Y_BASE = CEJA_Y.reposo;

const PUPILA_DX: Record<EstadoSasha, number> = {
  reposo: 0,
  pensando: 3,
  sorprendido: 0,
  "guiño": 0,
  sonriente: 0,
};

export default function AsistentePersonaje({
  estado = "reposo",
  size = 40,
}: {
  estado?: EstadoSasha;
  size?: number;
}) {
  const [parpadeando, setParpadeando] = useState(false);

  useEffect(() => {
    if (estado !== "reposo" && estado !== "sonriente") return;
    const programarParpadeo = () => {
      const delay = 4000 + Math.random() * 2000;
      return setTimeout(() => {
        setParpadeando(true);
        setTimeout(() => setParpadeando(false), 150);
        timeoutRef = programarParpadeo();
      }, delay);
    };
    let timeoutRef = programarParpadeo();
    return () => clearTimeout(timeoutRef);
  }, [estado]);

  const ojoIzqCerrado = estado === "guiño" || parpadeando;
  const ojoDerCerrado = parpadeando;
  const ryBase = estado === "sorprendido" ? 8 : 6;
  const rxBase = estado === "sorprendido" ? 7 : 6;

  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sashaGradient" x1="0" y1="0" x2="88" y2="88">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="80" height="80" rx="28" fill="url(#sashaGradient)" />

      {/* Las cejas también se mueven con transform y no animando `y`.
          Hoy no rompían nada: el bug de framer-motion salta al MONTAR, y estas dos
          están siempre puestas, así que montan una sola vez y en ese momento el `y`
          estático ya tiene un valor bueno. Pero es la misma trampa que las pupilas
          —que sí viven adentro de un condicional— y basta con que algún día alguien
          las meta en un `{estado !== "x" && ...}` para que vuelva a aparecer, sin
          ninguna pista de por qué. Con transform el problema no puede pasar. */}
      <rect
        x="24" y={CEJA_Y_BASE} width="14" height="4" rx="2" fill="#7c2d12"
        style={{ transform: `translateY(${CEJA_Y[estado] - CEJA_Y_BASE}px)`, transition: "transform 0.25s ease" }}
      />
      <rect
        x="50" y={CEJA_Y_BASE} width="14" height="4" rx="2" fill="#7c2d12"
        style={{ transform: `translateY(${CEJA_Y[estado] - CEJA_Y_BASE}px)`, transition: "transform 0.25s ease" }}
      />

      {/* El parpadeo va por `transform: scaleY`, no animando `rx`/`ry`. En
          framer-motion 12 animar `rx`/`ry` de un SVG tira "Expected length,
          undefined" en cada parpadeo: no lee bien el valor actual y escribe
          undefined un instante. `scaleY` (con transform-box: fill-box para que
          el origen sea el centro del ojo, no el del SVG) tiene el mismo efecto de
          achicar el ojo, está soportado en todos los navegadores, y `rx`/`ry`
          quedan como números fijos que nunca se rompen. */}
      <ellipse
        cx="31" cy="42" fill="#fff" rx={rxBase} ry={ryBase}
        style={{ transformBox: "fill-box", transformOrigin: "center", transform: ojoIzqCerrado ? "scaleY(0.1)" : "scaleY(1)", transition: "transform 0.12s ease" }}
      />
      {/* La pupila se corre con `translateX` y no animando `cx`, por lo mismo que
          los ojos de acá arriba usan `scaleY`: framer-motion 12 escribe `undefined`
          en el atributo durante el primer frame de cada montaje, y la consola se
          llenaba de "attribute cx: Expected length, undefined".
          Acá pegaba en cada parpadeo, no una sola vez: la pupila vive adentro de un
          `{!ojoCerrado && ...}`, así que se desmonta y se vuelve a montar cada vez
          que Sasha cierra el ojo — cada 4 a 6 segundos, para siempre.
          `translateX` en un SVG se mide en unidades del viewBox, así que los píxeles
          de PUPILA_DX significan lo mismo que cuando se sumaban a `cx`. */}
      {!ojoIzqCerrado && (
        <circle cx="31" cy="42" r="2.5" fill="#1c1917"
          style={{ transform: `translateX(${PUPILA_DX[estado]}px)`, transition: "transform 0.25s ease" }} />
      )}

      <ellipse
        cx="57" cy="42" fill="#fff" rx={rxBase} ry={ryBase}
        style={{ transformBox: "fill-box", transformOrigin: "center", transform: ojoDerCerrado ? "scaleY(0.1)" : "scaleY(1)", transition: "transform 0.12s ease" }}
      />
      {!ojoDerCerrado && (
        <circle cx="57" cy="42" r="2.5" fill="#1c1917"
          style={{ transform: `translateX(${PUPILA_DX[estado]}px)`, transition: "transform 0.25s ease" }} />
      )}

      {/* La boca sí se anima con framer-motion: es lo único que cambia de FORMA
          entre un gesto y otro, y eso no se puede hacer con un transform.
          Pero le hacían falta las dos cosas de abajo. El `d` suelto porque no tenía
          ninguno: sólo el de `animate`, así que en el primer dibujo el atributo
          salía en `undefined` y el navegador se quejaba de que un path tiene que
          empezar con 'M'. Y `initial={false}` para que framer-motion arranque
          directamente en la forma que corresponde en vez de animar hacia ella desde
          un valor que todavía no conoce. */}
      <motion.path
        d={BOCA[estado]}
        stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" fill="none"
        initial={false}
        animate={{ d: BOCA[estado] }}
        transition={{ duration: 0.25 }}
      />
    </svg>
  );
}
