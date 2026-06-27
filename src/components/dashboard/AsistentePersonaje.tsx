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

      <motion.rect
        x="24" y={CEJA_Y[estado]} width="14" height="4" rx="2" fill="#7c2d12"
        animate={{ y: CEJA_Y[estado] }}
        transition={{ duration: 0.25 }}
      />
      <motion.rect
        x="50" y={CEJA_Y[estado]} width="14" height="4" rx="2" fill="#7c2d12"
        animate={{ y: CEJA_Y[estado] }}
        transition={{ duration: 0.25 }}
      />

      <motion.ellipse
        cx="31" cy="42" fill="#fff"
        rx={rxBase} ry={ojoIzqCerrado ? 0.6 : ryBase}
        animate={{ rx: rxBase, ry: ojoIzqCerrado ? 0.6 : ryBase }}
        transition={{ duration: 0.12 }}
      />
      {!ojoIzqCerrado && (
        <motion.circle cx={31 + PUPILA_DX[estado]} r="2.5" fill="#1c1917" cy="42" animate={{ cx: 31 + PUPILA_DX[estado] }} transition={{ duration: 0.25 }} />
      )}

      <motion.ellipse
        cx="57" cy="42" fill="#fff"
        rx={rxBase} ry={ojoDerCerrado ? 0.6 : ryBase}
        animate={{ rx: rxBase, ry: ojoDerCerrado ? 0.6 : ryBase }}
        transition={{ duration: 0.12 }}
      />
      {!ojoDerCerrado && (
        <motion.circle cx={57 + PUPILA_DX[estado]} r="2.5" fill="#1c1917" cy="42" animate={{ cx: 57 + PUPILA_DX[estado] }} transition={{ duration: 0.25 }} />
      )}

      <motion.path
        stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" fill="none"
        animate={{ d: BOCA[estado] }}
        transition={{ duration: 0.25 }}
      />
    </svg>
  );
}
